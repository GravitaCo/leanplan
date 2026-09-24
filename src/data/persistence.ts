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

/** "I have…" kitchen snapshot: device-only on purpose (short-lived; syncing it would push the
 *  whole settings row on every tap and could overwrite newer targets from another device). */
const KITCHEN_KEY = 'tali.kitchen'
export function loadKitchen(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KITCHEN_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [] } catch { return [] }
}
export function saveKitchen(have: string[]): void {
  try { localStorage.setItem(KITCHEN_KEY, JSON.stringify(have)) } catch { /* blocked */ }
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Turn a backup file into the state to restore. A backup is the user's intended current data,
 * so its own sync flags (exported with it, usually all clean) are discarded and every day,
 * the settings, custom foods and recipes are marked dirty with fresh stamps: the next sync
 * uploads them before it pulls, so the pull can't overwrite or drop them. Queued deletes from
 * the backup and from this device are kept, except for ids the backup restores and ids that
 * aren't UUIDs (the server rejects those, which would stall every later sync). This device
 * keeps its reminders setting (it follows its own push subscription) and the earliest D5
 * switch date either side has.
 */
export function stateFromBackup(incoming: PersistedState, current?: PersistedState): PersistedState {
  const old = incoming._meta
  delete incoming._meta
  const switches = [incoming.profile?.burnSwitch, current?.profile?.burnSwitch].filter((x): x is string => !!x)
  const s = loadStateFrom(incoming)
  if (switches.length) s.profile.burnSwitch = switches.sort()[0]
  if (current?.profile) s.profile.notificationsEnabled = !!current.profile.notificationsEnabled
  const meta = ensureMeta(s, true)
  const pending = current?._meta
  const ids = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
  const keep = (lists: unknown[], live: Set<unknown>) =>
    [...new Set(lists.flatMap(ids))].filter((id): id is string => typeof id === 'string' && UUID_RE.test(id) && !live.has(id))
  meta.foodDeletes = keep([old?.foodDeletes, pending?.foodDeletes], new Set(s.customFoods.map((f) => f.id)))
  meta.recipeDeletes = keep([old?.recipeDeletes, pending?.recipeDeletes], new Set(s.recipes.map((r) => r.id)))
  return s
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
