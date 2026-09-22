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
} from '@/core/types'
import { todayStr, shiftDay } from '@/core/domain/date'
import { recipePerServing } from '@/core/domain/nutrition'
import { CAPTURE_ERR, scaleEntry } from '@/core/domain/estimate'
import { relog } from '@/core/domain/insights'
import { loadState, loadStateFrom, saveState, ensureMeta, type PersistedState, type SyncMeta } from '@/data/persistence'
import { pushDirty, pullAll, type SyncStatus } from '@/data/sync'
import { supabase, setSession, uuid, nowIso } from '@/data/supabase'
import { subscribePush, unsubscribePush } from '@/data/push'

enableMapSet()

export type Tab = 'today' | 'food' | 'train' | 'plan' | 'profile'

interface StoreState {
  data: PersistedState
  cur: string
  tab: Tab
  sync: SyncStatus
  email: string | null
  authReady: boolean
  signedIn: boolean
  /** true only when a real Supabase session exists (not guest/local-only mode) */
  authed: boolean
  toast: string | null

  // navigation
  setTab: (t: Tab) => void
  setDate: (d: string) => void
  shiftDate: (n: number) => void
  showToast: (msg: string) => void

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
  saveWorkout: (type: WorkoutType, ex: NonNullable<Workout['ex']>) => void
  saveCardio: (cardioType: string, mins: string) => void

  // plan / settings
  setScheduleDay: (idx: number, value: WorkoutType | 'Rest') => void
  saveTargets: (t: MacroTarget, rangeWidth?: number) => void
  saveProfileMetrics: (patch: Partial<Profile>) => void
  /** quiet profile update for preferences (accuracy, display, theme, hands…) */
  setPrefs: (patch: Partial<Profile>) => void
  addSupplement: (name: string, time: string) => void
  updateSupplement: (id: string, name: string, time: string) => void
  removeSupplement: (id: string) => void
  updateEmail: (email: string) => Promise<string | null>
  setNotifications: (enabled: boolean) => Promise<boolean>
  importBackup: (state: PersistedState) => void

  // sync / auth
  initAuth: () => Promise<void>
  continueAsGuest: () => void
  runSync: () => Promise<void>
  scheduleSync: () => void
  signOut: () => Promise<void>
}

function ensureDay(s: PersistedState, d: string): DayLog {
  if (!s.days[d]) s.days[d] = { foods: [], supps: {}, weight: null, workout: null }
  return s.days[d]
}

/** Lowest calorie target the app will set without medical support. */
const KCAL_FLOOR = 1200

function meta(s: PersistedState): SyncMeta {
  return ensureMeta(s, false)
}

let toastTimer: ReturnType<typeof setTimeout> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false

export const useStore = create<StoreState>()(
  immer((set, get) => {
    // helper to persist after any mutation
    const persist = () => saveState(get().data)

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
      sync: 'idle',
      email: null,
      authReady: false,
      signedIn: false,
      authed: false,
      toast: null,

      setTab: (t) => set((st) => { st.tab = t }),
      setDate: (d) => set((st) => { st.cur = d }),
      shiftDate: (n) => set((st) => { st.cur = shiftDay(st.cur, n) }),

      showToast: (msg) => {
        set((st) => { st.toast = msg })
        if (toastTimer) clearTimeout(toastTimer)
        toastTimer = setTimeout(() => set((st) => { st.toast = null }), 1600)
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
        const id = existing?.id ?? uuid('f')
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
          if (!r) r = st.data.recipes.find((x) => x.name.toLowerCase() === input.name.toLowerCase())
          if (r) {
            r.name = input.name; r.servings = input.servings; r.items = input.items
            r._dirty = true; r._u = nowIso()
          } else {
            st.data.recipes.push({ id: uuid('r'), name: input.name, servings: input.servings, items: input.items, _dirty: true, _u: nowIso() })
          }
        })
        persist(); get().scheduleSync(); get().showToast('Meal saved')
      },

      deleteRecipe: (index) => {
        set((st) => {
          const r = st.data.recipes[index]
          if (!r) return
          st.data.recipes.splice(index, 1)
          if (r.id) meta(st.data).recipeDeletes.push(r.id)
        })
        persist(); get().scheduleSync(); get().showToast('Meal deleted')
      },

      logRecipe: (recipe, servings, meal) => {
        const per = recipePerServing(recipe)
        get().logEntries([{
          n: recipe.name, grams: Math.round(per.g * servings),
          k: per.k * servings, p: per.p * servings, c: per.c * servings, f: per.f * servings,
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
          else plans.push({ id: uuid('p'), when, then, cope, created: todayStr(), reviews: [] })
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

      saveWorkout: (type, ex) => {
        set((st) => {
          ensureDay(st.data, st.cur).workout = { type, ex }
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast(type + ' session saved')
      },

      saveCardio: (cardioType, mins) => {
        set((st) => {
          ensureDay(st.data, st.cur).workout = { type: 'Cardio', cardioType, mins }
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Cardio saved')
      },

      setScheduleDay: (idx, value) => {
        set((st) => {
          st.data.schedule[idx] = value
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync(); get().showToast('Schedule updated')
      },

      saveTargets: (t, rangeWidth) => {
        const floored = t.kcal < KCAL_FLOOR
        set((st) => {
          st.data.target = { ...t, kcal: Math.max(KCAL_FLOOR, t.kcal) }
          if (rangeWidth != null && rangeWidth >= 0) st.data.profile.rangeWidth = Math.min(400, Math.round(rangeWidth))
          markSettingsDirty(st.data)
        })
        persist(); get().scheduleSync()
        get().showToast(floored ? 'Kept at 1,200 kcal. Going lower needs medical support.' : 'Targets saved')
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
          st.data.profile.supplements.push({ id: uuid('s'), name, time })
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
        const fresh = loadStateFrom(incoming)
        ensureMeta(fresh, true)
        set((st) => { st.data = fresh })
        saveState(get().data)
        set((st) => { st.cur = todayStr() })
        get().showToast('Backup loaded')
        get().scheduleSync()
      },

      initAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSession(session.access_token, session.user.id)
          set((st) => { st.signedIn = true; st.authed = true; st.email = session.user.email ?? null })
        }
        set((st) => { st.authReady = true })

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            setSession(session.access_token, session.user.id)
            set((st) => { st.signedIn = true; st.authed = true; st.email = session.user.email ?? null })
            get().runSync()
          } else {
            setSession(null, null)
            set((st) => { st.signedIn = false; st.authed = false; st.email = null })
          }
        })

        // Migration: flag local-only data dirty on first run so it uploads once signed in.
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

        if (session) get().runSync()
        window.addEventListener('online', () => get().runSync())
        document.addEventListener('visibilitychange', () => { if (!document.hidden) get().runSync() })
      },

      continueAsGuest: () => {
        // Local-only mode: no account, data stays on this device only. Cloud sync is
        // disabled (authed stays false) so we never touch the database without a real
        // authenticated session — the database is locked to auth.uid() by RLS.
        set((st) => { st.signedIn = true; st.authed = false; st.email = null })
      },

      runSync: async () => {
        // Only sync with a real authenticated session. Guests are local-only; the
        // database rejects anything without a JWT matching the row's user_id.
        if (!get().authed) return
        if (syncing) return
        if (!navigator.onLine) { set((st) => { st.sync = 'offline' }); return }
        syncing = true
        set((st) => { st.sync = 'syncing' })
        try {
          // Work on a plain mutable clone — the store's live data is frozen by Immer,
          // and the sync engine mutates records in place.
          const d = structuredClone(get().data) as PersistedState
          const m = ensureMeta(d, false)
          await pushDirty(d, m)
          await pullAll(d, m)
          saveState(d)
          // Replace data wholesale so selectors see fresh references and re-render.
          set((st) => { st.data = d; st.sync = 'synced' })
        } catch (e) {
          console.warn('sync failed:', e)
          set((st) => { st.sync = 'error' })
        } finally {
          syncing = false
        }
      },

      scheduleSync: () => {
        if (syncTimer) clearTimeout(syncTimer)
        syncTimer = setTimeout(() => get().runSync(), 800)
      },

      signOut: async () => {
        await supabase.auth.signOut()
      },
    }
  }),
)
