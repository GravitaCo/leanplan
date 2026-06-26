/**
 * Central app store (Zustand + Immer). Holds the synced domain state plus lightweight
 * UI/navigation state, and owns persistence + the debounced sync loop. Screens read
 * slices from here; the data/sync layer underneath is framework-agnostic.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type {
  DayLog,
  Food,
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
import { scaleFood, recipePerServing } from '@/core/domain/nutrition'
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
  toast: string | null

  // navigation
  setTab: (t: Tab) => void
  setDate: (d: string) => void
  shiftDate: (n: number) => void
  showToast: (msg: string) => void

  // food
  logFood: (food: Food, grams: number, meal: MealSlot) => void
  removeFood: (index: number) => void
  addCustomFood: (def: Omit<Food, 'id'>, grams: number) => void
  removeCustomFood: (index: number) => void
  saveRecipe: (r: { id?: string; name: string; servings: number; items: Recipe['items'] }) => void
  deleteRecipe: (index: number) => void
  logRecipe: (recipe: Recipe, servings: number) => void

  // supplements / weight / workout
  toggleSupp: (id: string) => void
  setWeight: (kg: number) => void
  saveWorkout: (type: WorkoutType, ex: NonNullable<Workout['ex']>) => void
  saveCardio: (cardioType: string, mins: string) => void

  // plan / settings
  setScheduleDay: (idx: number, value: WorkoutType | 'Rest') => void
  saveTargets: (t: MacroTarget) => void
  saveProfileMetrics: (patch: Partial<Profile>) => void
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
      toast: null,

      setTab: (t) => set((st) => { st.tab = t }),
      setDate: (d) => set((st) => { st.cur = d }),
      shiftDate: (n) => set((st) => { st.cur = shiftDay(st.cur, n) }),

      showToast: (msg) => {
        set((st) => { st.toast = msg })
        if (toastTimer) clearTimeout(toastTimer)
        toastTimer = setTimeout(() => set((st) => { st.toast = null }), 1600)
      },

      logFood: (food, grams, mealSlot) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          const scaled = scaleFood(food, grams)
          const entry: LoggedFood = {
            n: food.n,
            grams: Math.round(grams),
            k: scaled.k,
            p: scaled.p,
            c: scaled.c,
            f: scaled.f,
            meal: mealSlot,
          }
          if (food.ml) entry.unit = 'ml'
          d.foods.push(entry)
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast(food.n + ' added')
      },

      removeFood: (index) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          d.foods.splice(index, 1)
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync()
      },

      addCustomFood: (def, grams) => {
        set((st) => {
          if (!Array.isArray(st.data.customFoods)) st.data.customFoods = []
          const existing = st.data.customFoods.find((x) => x.n.toLowerCase() === def.n.toLowerCase())
          if (existing) {
            Object.assign(existing, def, { g: Math.round(grams) })
            existing._dirty = true; existing._u = nowIso()
          } else {
            const food: Food = { ...def, g: Math.round(grams), id: uuid('f'), _dirty: true, _u: nowIso() }
            st.data.customFoods.push(food)
          }
          const d = ensureDay(st.data, st.cur)
          const scaled = scaleFood({ ...def, g: grams } as Food, grams)
          d.foods.push({ n: def.n, grams: Math.round(grams), k: scaled.k, p: scaled.p, c: scaled.c, f: scaled.f })
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast('Saved & added')
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

      logRecipe: (recipe, servings) => {
        set((st) => {
          const per = recipePerServing(recipe)
          const name = recipe.name + (servings !== 1 ? ' (' + +servings.toFixed(2) + '×)' : '')
          const d = ensureDay(st.data, st.cur)
          d.foods.push({
            n: name, grams: Math.round(per.g * servings),
            k: per.k * servings, p: per.p * servings, c: per.c * servings, f: per.f * servings,
          })
          markDayDirty(st.data, st.cur)
        })
        persist(); get().scheduleSync(); get().showToast(recipe.name + ' added')
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

      saveTargets: (t) => {
        set((st) => { st.data.target = t; markSettingsDirty(st.data) })
        persist(); get().scheduleSync(); get().showToast('Targets saved')
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
          set((st) => { st.signedIn = true; st.email = session.user.email ?? null })
        }
        set((st) => { st.authReady = true })

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            setSession(session.access_token, session.user.id)
            set((st) => { st.signedIn = true; st.email = session.user.email ?? null })
            get().runSync()
          } else {
            setSession(null, null)
            set((st) => { st.signedIn = false; st.email = null })
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
        // Local-only mode: no account, data lives on this device (and syncs under the
        // shared local user id, mirroring LeanPlan's offline fallback).
        set((st) => { st.signedIn = true; st.email = null })
      },

      runSync: async () => {
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
