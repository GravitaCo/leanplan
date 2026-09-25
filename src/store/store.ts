/**
 * Central app store (Zustand + Immer). Holds the synced domain state plus lightweight
 * UI/navigation state, and owns persistence + the debounced sync loop. Screens read
 * slices from here; the data/sync layer underneath is framework-agnostic.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type {
  CheckIn,
  DayLog,
  Food,
  IfThenPlan,
  LoggedFood,
  MealSlot,
  Recipe,
  Workout,
  WorkoutType,
  Supplement,
  MacroTarget,
  Profile,
  Session as TrainingSession,
  Effort,
  Schedule,
} from '@/core/types'
import { WORKOUTS } from '@/core/data/workouts'
import { mirrorOf, sessionsOf } from '@/core/domain/sessions'
import { todayStr, shiftDay, r1 } from '@/core/domain/date'
import { recipePerServing } from '@/core/domain/nutrition'
import { CAPTURE_ERR, scaleEntry } from '@/core/domain/estimate'
import { relog } from '@/core/domain/insights'
import { loadState, stateFromBackup, ownerCheck, keepForAccount, freshForAccount, freshForDevice, sameAccount, saveState, ensureMeta, loadMode, saveMode, loadKitchen, saveKitchen, requestPersistentStorage, type PersistedState, type SyncMeta } from '@/data/persistence'
import { pushDirty, pullAll, accountRows, type SyncStatus } from '@/data/sync'
import { supabase, setSession, uuid, nowIso, getUid } from '@/data/supabase'
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { subscribePush, unsubscribePush } from '@/data/push'

enableMapSet()

export type Tab = 'today' | 'food' | 'train' | 'plan' | 'profile'

interface StoreState {
  data: PersistedState
  cur: string
  tab: Tab
  /** one-shot: the Profile section to open on arrival (UI only, never persisted) */
  profileOpen: string | null
  sync: SyncStatus
  email: string | null
  authReady: boolean
  signedIn: boolean
  /** true only when a real Supabase session exists (not offline-paused or while asking whose data) */
  authed: boolean
  /** signed-in account opened without a live session (offline): data saves locally, sync waits */
  syncPaused: boolean
  /** why the sign-in screen is showing, when it wasn't the user's choice */
  authNotice: string | null
  /** signed in, but this device's data may belong to another account: nothing shows or syncs
   *  until the user picks keep or start fresh (see ownerCheck) */
  ownerAsk: { uid: string; email: string | null; checking?: boolean } | null
  /** "I have…" snapshot for meal suggestions (device-only) */
  kitchen: string[]
  setKitchen: (have: string[]) => void
  toast: string | null
  /** an action on the current toast ("Undo"); cleared with the toast */
  toastAction: { label: string; run: () => void } | null
  /** one-shot hand-offs between tabs (UI only, never persisted): Plan's "Do this today" opens
   *  Train's preview for a workout; Train's "Edit in Plan" opens Plan's workout view */
  trainOpen: WorkoutType | null
  planOpen: WorkoutType | null
  openTrain: (w: WorkoutType) => void
  openPlan: (w: WorkoutType) => void
  clearOpen: () => void

  // navigation
  setTab: (t: Tab) => void
  openProfile: (section: string) => void
  clearProfileOpen: () => void
  setDate: (d: string) => void
  shiftDate: (n: number) => void
  showToast: (msg: string, action?: { label: string; run: () => void }) => void

  // food
  /** log one or more entries on the current day (e.g. a food plus its cooking fat) */
  logEntries: (entries: LoggedFood[], toast?: string) => void
  /** correct an entry's portion by a multiplier and/or move it to another meal */
  updateEntry: (index: number, mult: number, meal: MealSlot | undefined) => void
  /** mark an estimate as confirmed so it isn't surfaced for a check again */
  confirmEntry: (index: number) => void
  removeFood: (index: number) => void
  /** copy yesterday's entries for a meal onto the current day */
  repeatYesterday: (meal: MealSlot) => void
  /** save (or update by name) a custom food definition; returns the saved food */
  saveCustomFood: (def: Omit<Food, 'id'>) => Food
  removeCustomFood: (index: number) => void
  saveRecipe: (r: { id?: string; name: string; servings: number; items: Recipe['items'] }) => void
  deleteRecipe: (index: number) => void
  logRecipe: (recipe: Recipe, servings: number, meal: MealSlot) => void

  // wellbeing & plans
  setCheckin: (c: CheckIn | null) => void
  savePlan: (p: { id?: string; when: string; then: string; cope?: string }) => void
  deletePlan: (id: string) => void
  reviewPlans: (outcomes: Record<string, IfThenPlan['reviews'][number]['r']>) => void

  // supplements / weight / workout
  toggleSupp: (id: string) => void
  setWeight: (kg: number) => void
  /** save a built-in lift (again = an edit). `extra`: the guided player's per-set quiet saves and
   *  its finish sheet (effort, note, minutes); what isn't given keeps the earlier save's value */
  saveWorkout: (type: WorkoutType, ex: NonNullable<Workout['ex']>, option?: Workout['option'], extra?: { quiet?: boolean; effort?: Effort | null; note?: string; mins?: number; toast?: string; open?: boolean }) => void
  saveCardio: (cardioType: string, mins: string, option?: Workout['option']) => void
  /** add a session (any modality) to the current day, alongside any others */
  addSession: (x: Omit<TrainingSession, 'id' | 'at'>) => void
  removeSession: (id: string) => void
  /** put back a session removed a moment ago (Undo), on the day it came from */
  restoreSession: (date: string, x: TrainingSession) => void

  // plan / settings
  setScheduleDay: (idx: number, value: WorkoutType | 'Rest', quiet?: boolean) => void
  /** replace the whole weekly schedule (swap two days, undo) */
  setSchedule: (s: Schedule, quiet?: boolean) => void
  saveTargets: (t: MacroTarget, rangeWidth?: number) => void
  saveProfileMetrics: (patch: Partial<Profile>) => void
  /** quiet profile update for preferences (accuracy, display, hands…) */
  setPrefs: (patch: Partial<Profile>) => void
  addSupplement: (name: string, time: string) => void
  updateSupplement: (id: string, name: string, time: string) => void
  removeSupplement: (id: string) => void
  updateEmail: (email: string) => Promise<string | null>
  setNotifications: (enabled: boolean) => Promise<boolean>
  importBackup: (state: PersistedState) => void

  // sync / auth
  initAuth: () => Promise<void>
  runSync: () => Promise<void>
  scheduleSync: () => void
  /** `remove`: also remove this device's log (shared phones), leaving an empty state. */
  signOut: (opts?: { remove?: boolean }) => Promise<void>
  /** Call before a sign-in or sign-up attempt from the sign-in screen. */
  beginSignIn: () => void
  /** Answer ownerAsk: keep this device's data in the account, start fresh, or sign out. */
  resolveOwner: (choice: 'keep' | 'fresh' | 'cancel') => Promise<void>
}

function ensureDay(s: PersistedState, d: string): DayLog {
  if (!s.days[d]) s.days[d] = { foods: [], supps: {}, weight: null, workout: null }
  return s.days[d]
}

/** Write a day's sessions and the single-workout mirror older installs read (plan §2.5). */
function setSessions(day: DayLog, list: TrainingSession[]): void {
  day.sessions = list
  day.workout = mirrorOf(list)
}

/**
 * Save a built-in session (Legs/Push/Pull or the Cardio card): it replaces an earlier save from
 * the same card that day, since saving again is an edit; other sessions stay.
 */
function putBuiltin(day: DayLog, date: string, x: Omit<TrainingSession, 'id' | 'at'>, keep: ('effort' | 'note' | 'mins')[] = []): void {
  const list = sessionsOf(day, date)
  const i = list.findIndex((y) => y.routineId === x.routineId)
  const prev = i >= 0 ? list[i] : null
  // fields the caller didn't set carry over from the earlier save (a later edit keeps the effort)
  const kept: Partial<TrainingSession> = {}
  for (const k of keep) if (prev?.[k] !== undefined && (x as Partial<TrainingSession>)[k] === undefined) (kept as Record<string, unknown>)[k] = prev[k]
  const next: TrainingSession = { ...kept, ...x, id: prev?.id && !prev.id.startsWith('legacy') ? prev.id : uuid(), at: prev?.at || nowIso() }
  setSessions(day, i >= 0 ? list.map((y, j) => (j === i ? next : y)) : [...list, next])
}

/** Lowest calorie target the app will set without medical support. */
const KCAL_FLOOR = 1200

function meta(s: PersistedState): SyncMeta {
  return ensureMeta(s, false)
}

/** Remove Supabase's saved session (\`sb-<project>-auth-token\`) from this device. */
function clearSavedSession() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token')).forEach((k) => localStorage.removeItem(k))
  } catch { /* storage blocked */ }
}

/** Set by an explicit sign-out; cleared when the user starts signing in again. */
let signingOut = false
const GUEST_GONE_MSG = 'Tali now needs an account. When you’re online, sign in or create one: the log on this phone moves into it.'
const SIGNED_OUT_MSG = 'You’ve been signed out. Sign in to sync: your log is still on this phone.'

let toastTimer: ReturnType<typeof setTimeout> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false
/** Set by initAuth: make a Supabase session this device's live session. */
let applySession: ((s: Session) => void) | null = null

export const useStore = create<StoreState>()(
  immer((set, get) => {
    // helper to persist after any mutation
    // Tell the user once if the device refuses to save, instead of losing data silently.
    let storageWarned = false
    const persist = () => {
      if (saveState(get().data)) { storageWarned = false; return }
      if (!storageWarned) { storageWarned = true; get().showToast('Couldn’t save on this device. Storage may be full: export a backup in Profile.') }
    }

    const markSettingsDirty = (s: PersistedState) => {
      meta(s).settings = { u: nowIso(), dirty: true }
    }
    const markDayDirty = (s: PersistedState, d: string) => {
      meta(s).days[d] = { u: nowIso(), dirty: true }
    }

    return {
      data: loadState(),
      cur: todayStr(),
      tab: 'today',
      profileOpen: null,
      sync: 'idle',
      email: null,
      authReady: false,
      signedIn: false,
      authed: false,
      syncPaused: false,
      authNotice: null,
      ownerAsk: null,
      kitchen: loadKitchen(),
      setKitchen: (have) => { saveKitchen(have); set((st) => { st.kitchen = have }) },
      toast: null,
      toastAction: null,
      trainOpen: null,
      planOpen: null,
      openTrain: (w) => set((st) => { st.tab = 'train'; st.trainOpen = w }),
      openPlan: (w) => set((st) => { st.tab = 'plan'; st.planOpen = w }),
      clearOpen: () => set((st) => { st.trainOpen = null; st.planOpen = null }),

      setTab: (t) => set((st) => { st.tab = t }),
      openProfile: (section) => set((st) => { st.tab = 'profile'; st.profileOpen = section }),
      clearProfileOpen: () => set((st) => { st.profileOpen = null }),
      setDate: (d) => set((st) => { st.cur = d }),
      shiftDate: (n) => set((st) => { st.cur = shiftDay(st.cur, n) }),

      showToast: (msg, action) => {
        set((st) => { st.toast = msg; st.toastAction = action ?? null })
        if (toastTimer) clearTimeout(toastTimer)
        // an Undo needs time to be read and reached
        toastTimer = setTimeout(() => set((st) => { st.toast = null; st.toastAction = null }), action ? 5000 : 1600)
      },

      logEntries: (entries, toast) => {
        if (!entries.length) return
        set((st) => {
          ensureDay(st.data, st.cur).foods.push(...entries)
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast(toast ?? entries[0].n + ' added')
      },

      updateEntry: (index, mult, meal) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          const x = d.foods[index]
          if (!x) return
          d.foods[index] = { ...scaleEntry(x, mult), meal: meal ?? x.meal }
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync()
      },

      confirmEntry: (index) => {
        set((st) => {
          const x = ensureDay(st.data, st.cur).foods[index]
          if (!x) return
          x.ok = true
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Thanks, noted')
      },

      removeFood: (index) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          d.foods.splice(index, 1)
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync()
      },

      repeatYesterday: (meal) => {
        const { data, cur } = get()
        const prev = (data.days[shiftDay(cur, -1)]?.foods || []).filter((x) => x.meal === meal)
        if (!prev.length) return
        get().logEntries(prev.map((x) => ({ ...relog(x, meal), how: x.how })), 'Copied from yesterday')
      },

      saveCustomFood: (def) => {
        const existing = get().data.customFoods.find((x) => x.n.toLowerCase() === def.n.toLowerCase())
        const id = existing?.id ?? uuid()
        const food: Food = { ...def, g: Math.round(def.g), id }
        set((st) => {
          if (!Array.isArray(st.data.customFoods)) st.data.customFoods = []
          const cur = st.data.customFoods.find((x) => x.id === id)
          if (cur) Object.assign(cur, food, { _dirty: true, _u: nowIso() })
          else st.data.customFoods.push({ ...food, _dirty: true, _u: nowIso() })
        })
        persist(); get().scheduleSync(); get().showToast('Food saved')
        return food
      },

      removeCustomFood: (index) => {
        set((st) => {
          const gone = st.data.customFoods.splice(index, 1)[0]
          if (gone?.id) meta(st.data).foodDeletes.push(gone.id)
        })
        persist(); get().scheduleSync(); get().showToast('Removed from saved')
      },

      saveRecipe: (input) => {
        set((st) => {
          if (!Array.isArray(st.data.recipes)) st.data.recipes = []
          let r: Recipe | undefined
          if (input.id) r = st.data.recipes.find((x) => x.id === input.id)
          // renaming onto another recipe's name would leave two with one name (the server allows one)
          if (r && st.data.recipes.some((x) => x !== r && x.name.toLowerCase() === input.name.toLowerCase())) return
          if (!r) r = st.data.recipes.find((x) => x.name.toLowerCase() === input.name.toLowerCase())
          if (r) {
            r.name = input.name; r.servings = input.servings; r.items = input.items
            r._dirty = true; r._u = nowIso()
          } else {
            st.data.recipes.push({ id: uuid(), name: input.name, servings: input.servings, items: input.items, _dirty: true, _u: nowIso() })
          }
        })
        persist(); get().scheduleSync(); get().showToast('Recipe saved')
      },

      deleteRecipe: (index) => {
        set((st) => {
          const r = st.data.recipes[index]
          if (!r) return
          st.data.recipes.splice(index, 1)
          if (r.id) meta(st.data).recipeDeletes.push(r.id)
        })
        persist(); get().scheduleSync(); get().showToast('Recipe deleted')
      },

      logRecipe: (recipe, servings, meal) => {
        const per = recipePerServing(recipe)
        get().logEntries([{
          n: recipe.name, grams: Math.round(per.g * servings),
          k: r1(per.k * servings), p: r1(per.p * servings), c: r1(per.c * servings), f: r1(per.f * servings),
          meal, src: 'recipe', how: 'recipe', err: CAPTURE_ERR.recipe, serv: servings,
        }], recipe.name + ' added')
      },

      setCheckin: (c) => {
        set((st) => {
          ensureDay(st.data, st.cur).checkin = c
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Check-in saved')
      },

      savePlan: ({ id, when, then, cope }) => {
        set((st) => {
          const plans = (st.data.profile.plans ??= [])
          const existing = id ? plans.find((p) => p.id === id) : undefined
          if (existing) Object.assign(existing, { when, then, cope })
          else plans.push({ id: uuid(), when, then, cope, created: todayStr(), reviews: [] })
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); get().showToast('Plan saved')
      },

      deletePlan: (id) => {
        set((st) => {
          st.data.profile.plans = (st.data.profile.plans ?? []).filter((p) => p.id !== id)
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync()
      },

      reviewPlans: (outcomes) => {
        const t = todayStr()
        set((st) => {
          for (const pl of st.data.profile.plans ?? []) {
            const r = outcomes[pl.id]
            if (!r) continue
            pl.reviews.push({ d: t, r })
            pl.lastReview = t
          }
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); get().showToast('Thanks for checking in')
      },

      toggleSupp: (id) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          d.supps[id] = !d.supps[id]
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync()
      },

      setWeight: (kg) => {
        set((st) => {
          ensureDay(st.data, st.cur).weight = kg
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Weight saved')
      },

      saveWorkout: (type, ex, option, extra) => {
        set((st) => {
          const more: Partial<TrainingSession> = {}
          if (extra?.effort) more.effort = extra.effort
          if (extra?.note) more.note = extra.note
          if (extra?.mins != null && Number.isFinite(extra.mins)) more.mins = Math.max(1, Math.round(extra.mins))
          if (extra?.open) more.open = true
          putBuiltin(ensureDay(st.data, st.cur), st.cur, { modality: 'strength', title: WORKOUTS[type].title, routineId: 'builtin-' + type, ex, ...(option ? { option } : {}), ...more },
            // the finish sheet clears effort / note it was given as empty; other saves keep them
            extra?.effort === null ? ['mins'] : ['effort', 'note', 'mins'])
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync()
        if (!extra?.quiet) get().showToast(extra?.toast ?? type + ' session saved')
      },

      saveCardio: (cardioType, mins, option) => {
        set((st) => {
          const typed = parseFloat(mins)
          putBuiltin(ensureDay(st.data, st.cur), st.cur, {
            modality: cardioType === 'Mobility' ? 'mobility' : 'cardio', title: cardioType, routineId: 'builtin-Cardio',
            // blank minutes mean the Cardio card's default of 25, for Mobility too (as the box shows)
            ...(Number.isFinite(typed) ? { mins: typed } : cardioType === 'Mobility' ? { mins: 25 } : {}), cardio: { key: cardioType }, ...(option ? { option } : {}),
          })
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Cardio saved')
      },

      addSession: (x) => {
        set((st) => {
          const day = ensureDay(st.data, st.cur)
          setSessions(day, [...sessionsOf(day, st.cur), { ...x, id: uuid(), at: nowIso() }])
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast(x.title + ' saved')
      },

      restoreSession: (date, x) => {
        set((st) => {
          const day = ensureDay(st.data, date)
          const list = sessionsOf(day, date).filter((y) => y.id !== x.id)
          setSessions(day, [...list, x].sort((a, b) => (a.at || '').localeCompare(b.at || '')))
          markDayDirty(st.data, date)
        })
        persist(); get().scheduleSync()
      },

      removeSession: (id) => {
        set((st) => {
          const day = ensureDay(st.data, st.cur)
          setSessions(day, sessionsOf(day, st.cur).filter((y) => y.id !== id))
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Session removed')
      },

      setScheduleDay: (idx, value, quiet) => {
        set((st) => {
          st.data.schedule[idx] = value
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); if (!quiet) get().showToast('Schedule updated')
      },

      setSchedule: (sch, quiet) => {
        set((st) => {
          for (let d = 0; d < 7; d++) st.data.schedule[d] = sch[d] || 'Rest'
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); if (!quiet) get().showToast('Schedule updated')
      },

      saveTargets: (t, rangeWidth) => {
        const floored = t.kcal < KCAL_FLOOR
        // when the floor lifts calories, top up carbs so the macros still add up to it
        const macroKcal = t.p * 4 + t.c * 4 + t.f * 9
        const c = floored && macroKcal < KCAL_FLOOR ? t.c + Math.round((KCAL_FLOOR - macroKcal) / 4) : t.c
        set((st) => {
          st.data.target = { ...t, c, kcal: Math.max(KCAL_FLOOR, t.kcal) }
          if (rangeWidth != null && rangeWidth >= 0) st.data.profile.rangeWidth = Math.min(400, Math.round(rangeWidth))
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync()
        get().showToast(floored ? `Kept at 1,200 kcal${c !== t.c ? ', with carbs raised to match' : ''}. Going lower needs medical support.` : 'Targets saved')
      },

      saveProfileMetrics: (patch) => {
        set((st) => {
          Object.assign(st.data.profile, patch)
          if (patch.weight) ensureDay(st.data, st.cur).weight = patch.weight
          markSettingsDirty(st.data)
          if (patch.weight) markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Saved')
      },

      setPrefs: (patch) => {
        set((st) => { Object.assign(st.data.profile, patch); markSettingsDirty(st.data) })
        persist(); get().scheduleSync()
      },

      addSupplement: (name, time) => {
        set((st) => {
          if (!Array.isArray(st.data.profile.supplements)) st.data.profile.supplements = []
          st.data.profile.supplements.push({ id: uuid(), name, time })
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); get().showToast('Saved')
      },

      updateSupplement: (id, name, time) => {
        set((st) => {
          const s = (st.data.profile.supplements || []).find((x: Supplement) => x.id === id)
          if (s) { s.name = name; s.time = time }
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); get().showToast('Saved')
      },

      removeSupplement: (id) => {
        set((st) => {
          st.data.profile.supplements = (st.data.profile.supplements || []).filter((x: Supplement) => x.id !== id)
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync()
      },

      updateEmail: async (email) => {
        const { error } = await supabase.auth.updateUser({ email })
        return error ? error.message : null
      },

      setNotifications: async (enabled) => {
        if (enabled) {
          const ok = await subscribePush()
          if (!ok) return false
        } else {
          await unsubscribePush()
        }
        set((st) => {
          st.data.profile.notificationsEnabled = enabled
          meta(st.data).settings = { u: nowIso(), dirty: true }
        })
        saveState(get().data)
        get().scheduleSync()
        return true
      },

      importBackup: (incoming) => {
        const fresh = stateFromBackup(structuredClone(incoming), structuredClone(get().data))
        set((st) => { st.data = fresh })
        saveState(get().data)
        set((st) => { st.cur = todayStr() })
        get().showToast('Backup loaded')
        get().scheduleSync()
      },

      initAuth: async () => {
        requestPersistentStorage()
        const mode = loadMode()
        // Migration: flag local-only data dirty on first run so it uploads once signed in. Runs
        // first, before any session is applied (which records the owner and so creates _meta).
        set((st) => {
          const d = st.data
          const migrate =
            !d._meta &&
            (Object.keys(d.days || {}).length > 0 ||
              (d.customFoods || []).length > 0 ||
              (d.recipes || []).length > 0)
          ensureMeta(d, migrate)
        })
        saveState(get().data)

        const live = (s: Session) => {
          const uid = s.user.id
          if (get().ownerAsk?.uid === uid) return // still waiting on the user's choice (a token refresh)
          // A different account's data must not show or sync until the user chooses. Until then
          // the session isn't applied and the mode isn't saved, so a reload asks again.
          const check = ownerCheck(get().data, uid, loadMode() === 'account')
          if (check === 'ask' || check === 'verify') {
            setSession(null, null)
            // not 'account' until the user chooses, so an offline reload can't open this data
            // as a signed-in account
            saveMode(null)
            const checking = check === 'verify'
            set((st) => { st.ownerAsk = { uid, email: s.user.email ?? null, checking }; st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null })
            if (checking) {
              // Data an older version synced without recording whose it was: if it matches this
              // account's rows it's theirs, so carry on without a question (and without marking
              // it all to upload over newer server data). Any doubt, including no connection: ask.
              Promise.race([accountRows(uid, s.access_token), new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 6000))])
                .then((rows) => sameAccount(get().data, rows))
                .catch(() => false)
                .then(async (same) => {
                  const still = () => !signingOut && get().ownerAsk?.uid === uid && !!get().ownerAsk?.checking
                  if (!still()) return // answered, cancelled or signed out meanwhile
                  if (!same) { set((st) => { if (st.ownerAsk) st.ownerAsk.checking = false }); return }
                  // the token may have been refreshed while this ran: apply the current session
                  const r = await Promise.race([supabase.auth.getSession().catch(() => null), new Promise<null>((z) => setTimeout(() => z(null), 4000))])
                  const now = r?.data.session
                  if (!still()) return
                  if (!now || now.user.id !== uid) { set((st) => { if (st.ownerAsk) st.ownerAsk.checking = false }); return }
                  set((st) => { ensureMeta(st.data, false).owner = uid; st.ownerAsk = null })
                  saveState(get().data)
                  live(now)
                  get().runSync()
                })
            }
            return
          }
          if (check === 'claim') {
            set((st) => { ensureMeta(st.data, false).owner = uid })
            saveState(get().data)
          }
          setSession(s.access_token, uid)
          saveMode('account')
          set((st) => { st.signedIn = true; st.authed = true; st.syncPaused = false; st.authNotice = null; st.ownerAsk = null; st.email = s.user.email ?? null })
        }
        applySession = live
        const toSignIn = (msg?: string) => {
          setSession(null, null)
          saveMode(null)
          set((st) => { st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.ownerAsk = null; st.authNotice = msg ?? null })
        }

        // Listen before restoring, so a sign-out the server forces during startup (password
        // changed, "sign out everywhere", expired refresh token) is never missed.
        let serverSignedOut = false
        supabase.auth.onAuthStateChange((event, session) => {
          // after a sign-out, ignore late events (e.g. a refresh that was mid-retry) until the
          // user signs in again from the sign-in screen
          if (signingOut) return
          if (session) {
            live(session)
            if (get().authReady) get().runSync()
          } else if (event === 'SIGNED_OUT') {
            serverSignedOut = true
            if (get().authReady) toSignIn(SIGNED_OUT_MSG)
          }
        })

        // Launch must never depend on the network: restoring a session can stall offline while
        // it retries a token refresh, so give it a few seconds, then open with local data.
        // `definite` = the server answered (no session), as opposed to no connection.
        const r = await Promise.race([
          supabase.auth.getSession()
            .then((x) => ({ session: x.data.session, definite: !x.error || !isAuthRetryableFetchError(x.error) }))
            .catch(() => ({ session: null, definite: false })),
          new Promise<{ session: null; definite: false }>((z) => setTimeout(() => z({ session: null, definite: false }), 4000)),
        ])
        const session = r.session
        if (session) live(session)
        // mode 'guest' (the old "continue without an account"): there is no guest mode any more, so
        // it opens the sign-in screen; the log stays and moves into the account on first sign-in
        else if (mode === 'guest') { saveMode(null); set((st) => { st.authNotice = GUEST_GONE_MSG }) }
        else if (mode === 'account') {
          if ((r.definite || serverSignedOut) && navigator.onLine) {
            // signed out on the server: say so and ask to sign in, rather than quietly not syncing
            toSignIn(SIGNED_OUT_MSG)
          } else {
            // offline or a weak signal: open the account's local data now; sync resumes when the
            // session does. Only an explicit sign-out leads back to the sign-in screen.
            set((st) => { st.signedIn = true; st.authed = false; st.syncPaused = true })
          }
        }
        set((st) => { st.authReady = true })

        if (session) get().runSync()
        window.addEventListener('online', async () => {
          if (get().syncPaused) {
            const res = await supabase.auth.getSession().catch(() => null)
            if (res?.data.session) live(res.data.session)
            else {
              // only a definite answer from the server means signed out; a flaky reconnect stays paused
              if (res && (!res.error || !isAuthRetryableFetchError(res.error))) toSignIn(SIGNED_OUT_MSG)
              return
            } // local data stays and uploads after sign-in
          }
          get().runSync()
        })
        document.addEventListener('visibilitychange', () => { if (!document.hidden) get().runSync() })
      },

      runSync: async () => {
        // Only sync with a real authenticated session (none while offline or while asking whose
        // data this is); the database rejects anything without a JWT matching the row's user_id.
        if (!get().authed) return
        if (syncing) return
        if (!navigator.onLine) { set((st) => { st.sync = 'offline' }); return }
        syncing = true
        let rerun = false
        set((st) => { st.sync = 'syncing' })
        try {
          // Work on a plain mutable clone — the store's live data is frozen by Immer,
          // and the sync engine mutates records in place.
          const src = get().data
          const uid0 = getUid()
          const d = structuredClone(src) as PersistedState
          const m = ensureMeta(d, false)
          const failed = await pushDirty(d, m)
          await pullAll(d, m)
          // Data changed while we were on the network (an edit, a backup import): writing this
          // copy back would lose that change. Drop it; live records are still dirty, so the
          // next run pushes them again and pulls afresh.
          if (get().data !== src) { rerun = true; return }
          // signed out, or another account's session held back, while this ran: its requests may
          // have gone out without this account's token (an anon read returns no rows), so drop it
          if (!get().authed || getUid() !== uid0) return
          saveState(d)
          // Rejected records stay dirty on the device and retry next time; the rest synced.
          if (failed.length) console.warn('sync: some records were rejected:', failed)
          // Replace data wholesale so selectors see fresh references and re-render.
          set((st) => { st.data = d; st.sync = failed.length ? 'error' : 'synced' })
        } catch (e) {
          console.warn('sync failed:', e)
          set((st) => { st.sync = 'error' })
        } finally {
          syncing = false
          if (rerun) get().scheduleSync()
        }
      },

      scheduleSync: () => {
        if (syncTimer) clearTimeout(syncTimer)
        syncTimer = setTimeout(() => get().runSync(), 800)
      },

      /** Call before a sign-in attempt: ends the post-sign-out wait for late session events. */
      beginSignIn: () => {
        signingOut = false
      },

      resolveOwner: async (choice) => {
        const ask = get().ownerAsk
        if (!ask) return
        if (choice === 'cancel') { await get().signOut(); return }
        const next = choice === 'keep' ? keepForAccount(structuredClone(get().data) as PersistedState, ask.uid) : freshForAccount(ask.uid)
        if (choice === 'fresh') get().setKitchen([])
        // the browser's push subscription still belongs to the previous account: end it
        await Promise.race([unsubscribePush(), new Promise((r) => setTimeout(r, 2000))])
        saveState(next)
        set((st) => { st.data = next; st.cur = todayStr(); st.ownerAsk = null })
        // the session was held back while asking; it comes from local storage, so this works offline
        // raced like at launch: getSession can stall offline while it retries a token refresh
        const r = await Promise.race([supabase.auth.getSession().catch(() => null), new Promise<null>((z) => setTimeout(() => z(null), 4000))])
        const session = r?.data.session
        if (session && session.user.id === ask.uid && applySession) {
          applySession(session)
          get().runSync()
        } else {
          set((st) => { st.signedIn = false; st.authNotice = SIGNED_OUT_MSG })
        }
      },

      signOut: async (opts) => {
        // Supabase keeps the saved session if its sign-out call can't reach the server
        // (offline), which would sign the user straight back in: clear it locally as well, and
        // ignore late session events (see onAuthStateChange). A refresh already in flight can
        // re-save the session, so clear again once the sign-out call settles.
        signingOut = true
        // Stop this device's reminders for this account while its token can still delete the row;
        // otherwise they keep arriving for the next person on a shared phone. Never waits long.
        await Promise.race([unsubscribePush(), new Promise((r) => setTimeout(r, 2000))])
        const out = supabase.auth.signOut().catch(() => {}).finally(() => { if (signingOut) clearSavedSession() })
        await Promise.race([out, new Promise((r) => setTimeout(r, 3000))])
        clearSavedSession()
        get().setKitchen([]) // shared phones: the next person doesn't see this kitchen
        setSession(null, null)
        saveMode(null)
        if (opts?.remove) {
          // shared phones: the next person finds an empty device, not this log
          const next = freshForDevice()
          saveState(next)
          set((st) => { st.data = next; st.cur = todayStr() })
        }
        set((st) => { st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.authNotice = null; st.ownerAsk = null })
      },
    }
  }),
)
