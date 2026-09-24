import type { AppState } from '@/core/types'
import { DEFAULT_TARGET, DEFAULT_PROFILE } from '@/core/data/constants'
import { DEFAULT_SCHEDULE } from '@/core/data/workouts'
import { todayStr } from '@/core/domain/date'
import { ensureBurnSwitch } from '@/core/domain/insights'
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

/** Apply defaults/migrations to an arbitrary (possibly partial/legacy) state object. */
export function loadStateFrom(input: PersistedState | null): PersistedState {
  let s = input
  if (!s || !s.days) s = emptyState()
  if (!s.target) s.target = { ...DEFAULT_TARGET }
  if (!s.schedule) s.schedule = { ...DEFAULT_SCHEDULE }
  if (!s.profile) s.profile = { ...DEFAULT_PROFILE }
  if (!Array.isArray(s.profile.supplements)) s.profile.supplements = []
  if (s.profile.notificationsEnabled === undefined) s.profile.notificationsEnabled = false
  if (!Array.isArray(s.customFoods)) s.customFoods = []
  if (!Array.isArray(s.recipes)) s.recipes = []
  // workout plan D5: logged workouts stop widening the food range from today; earlier days
  // keep the old maths (see insights.rangeExtra)
  ensureBurnSwitch(s.profile, todayStr())
  // sessions (workout plan P2): anything that isn't an array is treated as absent; old days are
  // read through sessionsOf without being rewritten
  for (const d of Object.keys(s.days)) {
    const day = s.days[d]
    if (day && day.sessions !== undefined && !Array.isArray(day.sessions)) delete day.sessions
  }
  return s
}

/** Load persisted state from localStorage. */
export function loadState(): PersistedState {
  let s: PersistedState | null = null
  try {
    s = JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    /* ignore corrupt storage */
  }
  return loadStateFrom(s)
}

/** Save to the device. Returns false if the browser refused (storage full or blocked), so
 *  the caller can tell the user rather than lose their data silently. */
export function saveState(s: PersistedState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    return true
  } catch {
    return false
  }
}

/** Ask the browser to keep Tali's storage rather than clear it under pressure (Safari clears
 *  site data it thinks is unused). Harmless if unsupported or refused. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch { /* unsupported */ }
}

/** How this device last used Tali, so launch never needs the network to decide: 'guest'
 *  (local-only) or 'account' (signed in; works offline, syncs when back online). */
export type SessionMode = 'guest' | 'account'
const MODE_KEY = 'tali.mode'
export function loadMode(): SessionMode | null {
  try { const m = localStorage.getItem(MODE_KEY); return m === 'guest' || m === 'account' ? m : null } catch { return null }
}
export function saveMode(m: SessionMode | null): void {
  try { if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY) } catch { /* blocked */ }
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
