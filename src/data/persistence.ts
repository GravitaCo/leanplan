import type { AppState } from '@/core/types'
import { DEFAULT_TARGET, DEFAULT_PROFILE } from '@/core/data/constants'
import { DEFAULT_SCHEDULE } from '@/core/data/workouts'
import { todayStr } from '@/core/domain/date'
import { ensureBurnSwitch } from '@/core/domain/insights'
import { nowIso, uuid, UUID_RE } from './supabase'

const KEY = 'leanplan.v1'

/** Per-record sync bookkeeping, persisted alongside the app state. */
export interface SyncMeta {
  settings: { u: string; dirty: boolean }
  days: Record<string, { u: string; dirty: boolean }>
  foodDeletes: string[]
  recipeDeletes: string[]
  lastPull: string | null
  /** Supabase user id this device's data belongs to; unset for guest data never synced (and
   *  for data synced by a version before this was recorded). */
  owner?: string
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

/** What a backup holds, for the confirm step before importing it. */
export function backupSummary(b: PersistedState): { days: number; first: string | null; last: string | null; foods: number; recipes: number } {
  const days = Object.keys(b.days || {}).sort()
  return {
    days: days.length,
    first: days[0] ?? null,
    last: days[days.length - 1] ?? null,
    foods: Array.isArray(b.customFoods) ? b.customFoods.length : 0,
    recipes: Array.isArray(b.recipes) ? b.recipes.length : 0,
  }
}

/**
 * Turn a backup file into the state to restore. A backup is the user's intended current data,
 * so its own sync flags (exported with it, usually all clean) are discarded and every day,
 * the settings, custom foods and recipes are marked dirty with fresh stamps: the next sync
 * uploads them before it pulls, so the pull can't overwrite or drop them.
 *
 * Pass this device's `current` state and whatever the backup doesn't hold stays: its days,
 * custom foods and recipes (a food or recipe with the same id or name as one in the backup is
 * replaced by the backup's), with their own sync flags, so unsynced edits still upload and
 * synced ones don't upload again. Queued deletes from both are kept, except for ids that still
 * exist after the import and ids that aren't UUIDs (the server rejects those, which would stall
 * sync). This device keeps its reminders setting (it follows its own push subscription) and the
 * earliest D5 switch date either side has.
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
  // a backup never changes whose device this is (its own _meta was discarded above)
  if (pending?.owner) meta.owner = pending.owner
  // and never makes data this device synced look never-synced (ownerCheck reads lastPull)
  meta.lastPull = pending?.lastPull ?? null
  if (current) {
    for (const d of Object.keys(current.days || {})) {
      if (s.days[d]) continue
      s.days[d] = current.days[d]
      const m = pending?.days?.[d]
      if (m) meta.days[d] = { ...m }
    }
    const taken = <T,>(list: T[], id: (x: T) => string | undefined, name: (x: T) => string) => {
      const ids = new Set(list.map(id)), names = new Set(list.map((x) => (name(x) || '').toLowerCase()))
      return (x: T) => ids.has(id(x)) || names.has((name(x) || '').toLowerCase())
    }
    const foodTaken = taken(s.customFoods, (f) => f.id, (f) => f.n)
    s.customFoods.push(...(current.customFoods || []).filter((f) => !foodTaken(f)))
    const recipeTaken = taken(s.recipes, (r) => r.id, (r) => r.name)
    s.recipes.push(...(current.recipes || []).filter((r) => !recipeTaken(r)))
  }
  const ids = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
  const keep = (lists: unknown[], live: Set<unknown>) =>
    [...new Set(lists.flatMap(ids))].filter((id): id is string => typeof id === 'string' && UUID_RE.test(id) && !live.has(id))
  meta.foodDeletes = keep([old?.foodDeletes, pending?.foodDeletes], new Set(s.customFoods.map((f) => f.id)))
  meta.recipeDeletes = keep([old?.recipeDeletes, pending?.recipeDeletes], new Set(s.recipes.map((r) => r.id)))
  return s
}

/**
 * What a sign-in as `uid` means for the data on this device. 'same' or 'claim' (record `uid` as
 * the owner) carry on as before; 'ask' means the data may be someone else's, so the user chooses
 * between keeping it in this account and starting fresh. Never merge that silently: a shared
 * phone would show one person's log to the next and upload it into their account.
 * `stayedSignedIn`: this device was still signed in to an account (not a fresh sign-in).
 */
export function ownerCheck(s: PersistedState, uid: string, stayedSignedIn: boolean): 'same' | 'claim' | 'ask' {
  const owner = s._meta?.owner
  if (owner) return owner === uid ? 'same' : 'ask'
  // Never synced (guest data, a first sign-in): it moves into the account, as it always has.
  if (!s._meta?.lastPull) return 'claim'
  // Synced by an older version that didn't record the owner: still the signed-in account's if
  // the device never signed out; after a sign-out we can't tell whose it is.
  return stayedSignedIn ? 'claim' : 'ask'
}

/** "Keep this device's data in this account": everything on the device uploads to `uid`. The
 *  queued deletes named the other account's rows, so they go. */
export function keepForAccount(s: PersistedState, uid: string): PersistedState {
  delete s._meta
  ensureMeta(s, true).owner = uid
  return s
}

/** "Start fresh with this account": an empty device state that the next sync fills from `uid`'s
 *  cloud data. */
export function freshForAccount(uid: string): PersistedState {
  const s = loadStateFrom(null)
  ensureMeta(s, false).owner = uid
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
  // Backfill ids on custom foods / recipes; an id the server can't store (the old non-UUID
  // fallback) was never uploaded, so it gets a real one and uploads
  ;(s.customFoods || []).forEach((f) => {
    if (!f.id || !UUID_RE.test(f.id)) { f.id = uuid(); f._dirty = true; f._u = nowIso() }
    if (migrate) {
      f._dirty = true
      f._u = nowIso()
    }
  })
  ;(s.recipes || []).forEach((r) => {
    if (!r.id || !UUID_RE.test(r.id)) { r.id = uuid(); r._dirty = true; r._u = nowIso() }
    if (migrate) {
      r._dirty = true
      r._u = nowIso()
    }
  })
  return s._meta
}
