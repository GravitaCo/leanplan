import type { AppState } from '@/core/types'
import { DEFAULT_TARGET, DEFAULT_PROFILE } from '@/core/data/constants'
import { DEFAULT_SCHEDULE } from '@/core/data/workouts'
import { nowIso, uuid } from './supabase'

const KEY = 'leanplan.v1'

/** Per-record sync bookkeeping, persisted alongside the app state. */
export interface SyncMeta {
  settings: { u: string; dirty: boolean }
  days: Record<string, { u: string; dirty: boolean }>
  foodDeletes: string[]
  recipeDeletes: string[]
  lastPull: string | null
}

export interface PersistedState extends AppState {
  _meta?: SyncMeta
}

function emptyState(): AppState {
  return {
    target: { ...DEFAULT_TARGET },
    schedule: { ...DEFAULT_SCHEDULE },
    profile: { ...DEFAULT_PROFILE },
    days: {},
    customFoods: [],
    recipes: [],
  }
}

/** Load persisted state, applying defaults/migrations for older or partial saves. */
export function loadState(): PersistedState {
  let s: PersistedState | null = null
  try {
    s = JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    /* ignore corrupt storage */
  }
  if (!s || !s.days) s = emptyState()
  if (!s.target) s.target = { ...DEFAULT_TARGET }
  if (!s.schedule) s.schedule = { ...DEFAULT_SCHEDULE }
  if (!s.profile) s.profile = { ...DEFAULT_PROFILE }
  if (!Array.isArray(s.profile.supplements)) s.profile.supplements = []
  if (s.profile.notificationsEnabled === undefined) s.profile.notificationsEnabled = false
  if (!Array.isArray(s.customFoods)) s.customFoods = []
  if (!Array.isArray(s.recipes)) s.recipes = []
  return s
}

export function saveState(s: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* quota / private mode — stay in memory */
  }
}

/** Ensure sync metadata exists, optionally flagging all existing data dirty for first upload. */
export function ensureMeta(s: PersistedState, migrate: boolean): SyncMeta {
  if (!s._meta) {
    s._meta = {
      settings: { u: nowIso(), dirty: false },
      days: {},
      foodDeletes: [],
      recipeDeletes: [],
      lastPull: null,
    }
    if (migrate) {
      s._meta.settings.dirty = true
      Object.keys(s.days || {}).forEach((d) => {
        s._meta!.days[d] = { u: nowIso(), dirty: true }
      })
    }
  }
  if (!s._meta.days) s._meta.days = {}
  if (!Array.isArray(s._meta.foodDeletes)) s._meta.foodDeletes = []
  if (!Array.isArray(s._meta.recipeDeletes)) s._meta.recipeDeletes = []
  // Backfill ids on custom foods / recipes
  ;(s.customFoods || []).forEach((f) => {
    if (!f.id) f.id = uuid('f')
    if (migrate) {
      f._dirty = true
      f._u = nowIso()
    }
  })
  ;(s.recipes || []).forEach((r) => {
    if (!r.id) r.id = uuid('r')
    if (migrate) {
      r._dirty = true
      r._u = nowIso()
    }
  })
  return s._meta
}
