/**
 * The device-only store (wellbeing Phase 1, security-data H1): what Tali keeps on this phone and
 * never syncs. It lives inside `leanplan.v1` as `PersistedState.deviceOnly`, a sibling of `_meta`
 * and `consents`, never in `profile` or `days`, so no sync path can carry it: sync sends listed
 * fields only (src/data/sync.ts), and a unit test checks a sentinel note never reaches a payload.
 *
 * - `unload`: Unload notes, stamped with the account that owns this device's data (`_meta.owner`).
 *   Health data by nature (9(2)(a)): cleared on a health withdrawal (clearDeviceHealth), counted in
 *   healthDataSummary, never sent anywhere (no sync, AI, push, service worker or console).
 * - `lowMoodShown`: the day the low-mood signpost last showed (once per 30 days). Health data by
 *   inference: cleared on withdrawal. Device only, so it can show once per phone (build plan C12).
 * - `notify`: the reminder delivery log the app reads from the service worker's IndexedDB
 *   (`tali-notify`, security-data H3). Not health data; cleared with the device's log.
 * - `ui.sleepMore`: whether "More about sleep" was left open in the check-in. Not health data.
 *
 * Only this file, persistence.ts, backup.ts and screens/mind/UnloadSheet.tsx may use the notes
 * accessors (NOTE_ACCESSORS; scripts/wellbeing/data-device.ts checks the import graph). Everything
 * else uses the count, the clear and the non-note helpers. No React, no DOM beyond IndexedDB.
 */
import type { PersistedState } from './persistence'
import { nowIso, uuid } from './supabase'

export interface UnloadPair { mind: string; next?: string }
/** One Unload note (B8): "On my mind" and "Next step" pairs, and the optional "went OK" line. */
export interface UnloadNote { id: string; at: string; pairs: UnloadPair[]; ok?: string }
export type NotifyEv = 'shown' | 'opened' | 'closed'
export interface NotifyEvent { kind: string; at: string; ev: NotifyEv }

export interface DeviceOnly {
  /** `owner`: the `_meta.owner` the notes were written under; any other owner's notes are dropped */
  unload?: { owner: string; notes: UnloadNote[] }
  /** YYYY-MM-DD, the day the low-mood signpost last showed */
  lowMoodShown?: string
  notify?: NotifyEvent[]
  /** `backoffSeen`: per reminder type, the back-off (profile.mind.halved) whose notice was closed */
  ui?: { sleepMore?: boolean; backoffSeen?: Record<string, string> }
}

/** A note's text, all its pairs and the "went OK" line together, in characters. */
export const UNLOAD_NOTE_MAX_CHARS = 2000
/** Notes kept on a phone. Past it Tali refuses a new note (with a message); it never prunes. */
export const UNLOAD_MAX_NOTES = 200
/** Pairs in one note ("Add another"). */
export const UNLOAD_MAX_PAIRS = 20
/** Reminder delivery events kept (newest); only the last few decide the back-off. */
export const NOTIFY_LOG_MAX = 60
/** The service worker's IndexedDB for reminder delivery events (security-data H3). */
export const NOTIFY_DB = 'tali-notify'

/** The functions that read or write note text: only the files in NOTES_IMPORTERS may import them. */
export const NOTE_ACCESSORS = ['unloadNotes', 'addUnloadNote', 'deleteUnloadNote'] as const
/** load and restore helpers that see every note: only persistence.ts may import them (same check) */
export const PERSISTENCE_ONLY = ['mergeUnloadForImport', 'cleanDeviceOnly'] as const

/** Who's asking: the store's session facts. Notes show and save only on a signed-in device
 *  (online, or offline with sync paused: `authed` is false offline, and Unload must work offline)
 *  with no "whose data is this?" question pending, and only under the device's recorded owner. */
export interface NotesContext {
  signedIn: boolean
  ownerAsk: boolean
  /** healthLoggingAllowed (consent.ts): no new note while health consent is withdrawn */
  healthAllowed: boolean
}

export type AddNoteResult =
  | { ok: true; note: UnloadNote }
  /** `empty`: nothing written; `too-long`: over UNLOAD_NOTE_MAX_CHARS; `full`: UNLOAD_MAX_NOTES
   *  already kept (delete some first); `too-many-pairs`; `not-now`: signed out, owner question
   *  pending, no owner recorded, or health consent withdrawn. The screen chooses the words. */
  | { ok: false; reason: 'empty' | 'too-long' | 'full' | 'too-many-pairs' | 'not-now' }

const chars = (x: string) => [...x].length
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const isIso = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !isNaN(Date.parse(v))
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))
const NOTIFY_EVS: NotifyEv[] = ['shown', 'opened', 'closed']

function noteChars(n: Pick<UnloadNote, 'pairs' | 'ok'>): number {
  return n.pairs.reduce((t, p) => t + chars(p.mind) + chars(p.next ?? ''), 0) + chars(n.ok ?? '')
}

/** The pairs and the "went OK" line, trimmed; pairs with nothing in them dropped. */
function cleanBody(x: { pairs?: unknown; ok?: unknown }): Pick<UnloadNote, 'pairs' | 'ok'> {
  const pairs: UnloadPair[] = []
  for (const p of Array.isArray(x.pairs) ? x.pairs : []) {
    if (!p || typeof p !== 'object') continue
    const mind = text((p as UnloadPair).mind), next = text((p as UnloadPair).next)
    if (mind || next) pairs.push(next ? { mind, next } : { mind })
  }
  const ok = text(x.ok)
  return ok ? { pairs, ok } : { pairs }
}

/** A stored note made valid, or null if it's malformed or over a cap (only a hand-edited file can
 *  hold one: the app refuses them when written). */
function cleanNote(x: unknown): UnloadNote | null {
  if (!x || typeof x !== 'object') return null
  const n = x as Record<string, unknown>
  if (typeof n.id !== 'string' || !n.id || n.id.length > 64 || !isIso(n.at)) return null
  const body = cleanBody(n)
  if ((!body.pairs.length && !body.ok) || body.pairs.length > UNLOAD_MAX_PAIRS || noteChars(body) > UNLOAD_NOTE_MAX_CHARS) return null
  return { id: n.id, at: n.at, ...body }
}

function cleanNotes(x: unknown): UnloadNote[] {
  const seen = new Set<string>(), out: UnloadNote[] = []
  for (const n of Array.isArray(x) ? x : []) {
    const c = cleanNote(n)
    if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c) }
  }
  return out
}

/** Newest first, the order the "Earlier notes" list shows. */
const newestFirst = (a: UnloadNote, b: UnloadNote) => Date.parse(b.at) - Date.parse(a.at)

function cleanNotify(x: unknown): NotifyEvent[] {
  const out: NotifyEvent[] = []
  for (const e of Array.isArray(x) ? x : []) {
    if (!e || typeof e !== 'object') continue
    const { kind, at, ev } = e as Record<string, unknown>
    if (typeof kind === 'string' && /^[a-z-]{1,32}$/.test(kind) && isIso(at) && NOTIFY_EVS.includes(ev as NotifyEv)) out.push({ kind, at, ev: ev as NotifyEv })
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-NOTIFY_LOG_MAX)
}

/**
 * The device-only store made valid on load (persistence.loadStateFrom). Notes stamped with any
 * account but `owner` (this device's `_meta.owner`) are dropped, as are all notes when no owner is
 * recorded; unknown keys and bad values go. Past UNLOAD_MAX_NOTES (a hand-edited file) the newest
 * are kept. Returns undefined when nothing is left.
 */
export function cleanDeviceOnly(x: unknown, owner: string | undefined): DeviceOnly | undefined {
  if (!x || typeof x !== 'object') return undefined
  const d = x as Record<string, unknown>
  const out: DeviceOnly = {}
  const u = d.unload as Record<string, unknown> | undefined
  if (owner && u && typeof u === 'object' && u.owner === owner) {
    const notes = cleanNotes(u.notes).sort(newestFirst).slice(0, UNLOAD_MAX_NOTES)
    if (notes.length) out.unload = { owner, notes }
  }
  if (isDay(d.lowMoodShown)) out.lowMoodShown = d.lowMoodShown
  const notify = cleanNotify(d.notify)
  if (notify.length) out.notify = notify
  const ui = d.ui as Record<string, unknown> | undefined
  if (ui && typeof ui === 'object') {
    const o: NonNullable<DeviceOnly['ui']> = {}
    if (ui.sleepMore === true) o.sleepMore = true
    const seen: Record<string, string> = {}
    const bs = ui.backoffSeen
    if (bs && typeof bs === 'object') for (const [k, v] of Object.entries(bs)) if (/^[a-z-]{1,32}$/.test(k) && isIso(v)) seen[k] = v
    if (Object.keys(seen).length) o.backoffSeen = seen
    if (Object.keys(o).length) out.ui = o
  }
  return Object.keys(out).length ? out : undefined
}

/* ---------------- Unload notes (NOTE_ACCESSORS) ---------------- */

const mayUse = (s: PersistedState, ctx: NotesContext): s is PersistedState & { _meta: { owner: string } } =>
  ctx.signedIn && !ctx.ownerAsk && !!s._meta?.owner

/** This device's notes, newest first; none while signed out or while an owner question is pending. */
export function unloadNotes(s: PersistedState, ctx: Pick<NotesContext, 'signedIn' | 'ownerAsk'>): UnloadNote[] {
  if (!ctx.signedIn || ctx.ownerAsk) return []
  const u = s.deviceOnly?.unload
  if (!u || !s._meta?.owner || u.owner !== s._meta.owner) return []
  return [...u.notes].sort(newestFirst)
}

/** Save a new note, stamped with this device's owner. Refuses (never prunes) past a cap. */
export function addUnloadNote(s: PersistedState, input: { pairs: UnloadPair[]; ok?: string }, ctx: NotesContext, at = nowIso()): AddNoteResult {
  if (!mayUse(s, ctx) || !ctx.healthAllowed) return { ok: false, reason: 'not-now' }
  const body = cleanBody(input)
  if (!body.pairs.length && !body.ok) return { ok: false, reason: 'empty' }
  if (body.pairs.length > UNLOAD_MAX_PAIRS) return { ok: false, reason: 'too-many-pairs' }
  if (noteChars(body) > UNLOAD_NOTE_MAX_CHARS) return { ok: false, reason: 'too-long' }
  const owner = s._meta.owner
  const d = (s.deviceOnly ??= {})
  if (!d.unload || d.unload.owner !== owner) d.unload = { owner, notes: [] }
  if (d.unload.notes.length >= UNLOAD_MAX_NOTES) return { ok: false, reason: 'full' }
  const note: UnloadNote = { id: uuid(), at, ...body }
  d.unload.notes.push(note)
  return { ok: true, note }
}

/** Delete one note (B8.16). Returns whether it was there. */
export function deleteUnloadNote(s: PersistedState, id: string, ctx: Pick<NotesContext, 'signedIn' | 'ownerAsk'>): boolean {
  const u = s.deviceOnly?.unload
  if (!ctx.signedIn || ctx.ownerAsk || !u || u.owner !== s._meta?.owner) return false
  const before = u.notes.length
  u.notes = u.notes.filter((n) => n.id !== id)
  if (!u.notes.length) delete s.deviceOnly!.unload
  return u.notes.length !== before
}

/** How many of a backup's Unload notes a restore leaves out, and why: 'not-now' (no owner
 *  recorded, or health logging isn't allowed here, so none load) or 'full' (past the cap). */
export interface UnloadImport { skipped: number; reason?: 'not-now' | 'full' }

/**
 * The notes a backup restore leaves on this device (persistence.stateFromBackup): this device's
 * own notes, plus the backup's merged by id (this device's copy wins), re-stamped with `owner`.
 * None without an owner or while health logging isn't allowed: then every one of the backup's
 * notes is `skipped`, with reason 'not-now'. Over UNLOAD_MAX_NOTES, this device's notes stay and
 * the backup's newest fill the rest: `skipped` says how many didn't fit ('full'). Either way the
 * import can say so (never silent).
 */
export function mergeUnloadForImport(incoming: unknown, current: PersistedState | undefined, owner: string | undefined, healthAllowed: boolean): UnloadImport & { unload?: DeviceOnly['unload'] } {
  const theirs = cleanNotes((incoming as DeviceOnly | undefined)?.unload?.notes)
  if (!owner || !healthAllowed) return theirs.length ? { skipped: theirs.length, reason: 'not-now' } : { skipped: 0 }
  const mine = current ? cleanDeviceOnly(current.deviceOnly, current._meta?.owner)?.unload?.notes ?? [] : []
  const ids = new Set(mine.map((n) => n.id))
  const extra = theirs.filter((n) => !ids.has(n.id)).sort(newestFirst)
  const room = Math.max(0, UNLOAD_MAX_NOTES - mine.length)
  const notes = [...mine, ...extra.slice(0, room)]
  const skipped = Math.max(0, extra.length - room)
  return { ...(notes.length ? { unload: { owner, notes } } : {}), skipped, ...(skipped ? { reason: 'full' as const } : {}) }
}

/* ---------------- counts and clearing (any file) ---------------- */

/** How many Unload notes this device holds (healthDataSummary, backupSummary). No text. */
export function unloadCount(s: Pick<PersistedState, 'deviceOnly'>): number {
  const n = s.deviceOnly?.unload?.notes
  return Array.isArray(n) ? n.length : 0
}

/** Health withdrawal (consent.clearHealthData): the notes and the low-mood marker go. Returns
 *  whether anything changed. "Not now" never calls this. */
export function clearDeviceHealth(s: PersistedState): boolean {
  const d = s.deviceOnly
  if (!d || (!d.unload && d.lowMoodShown === undefined)) return false
  delete d.unload
  delete d.lowMoodShown
  if (!Object.keys(d).length) delete s.deviceOnly
  return true
}

/** "Keep this device's data in this account" (persistence.keepForAccount): the notes, the
 *  low-mood marker and the reminder log were another account's, so only UI state stays. */
export function deviceOnlyForKeep(d: DeviceOnly | undefined): DeviceOnly | undefined {
  return d?.ui?.sleepMore ? { ui: { sleepMore: true } } : undefined
}

/* ---------------- low-mood marker, sleep disclosure, reminder log ---------------- */

/** The day the low-mood signpost last showed (YYYY-MM-DD), if it has. */
export function lowMoodShownOn(s: PersistedState): string | undefined {
  return s.deviceOnly?.lowMoodShown
}

/** The signpost showed today (`day`: YYYY-MM-DD). */
export function markLowMoodShown(s: PersistedState, day: string): void {
  if (!isDay(day)) return
  ;(s.deviceOnly ??= {}).lowMoodShown = day
}

/** Whether "More about sleep" was left open. */
export function sleepMoreOpen(s: PersistedState): boolean {
  return s.deviceOnly?.ui?.sleepMore === true
}

export function setSleepMoreOpen(s: PersistedState, open: boolean): void {
  if (open) { const d = (s.deviceOnly ??= {}); d.ui = { ...d.ui, sleepMore: true }; return }
  const d = s.deviceOnly
  if (!d?.ui) return
  delete d.ui.sleepMore
  if (!Object.keys(d.ui).length) delete d.ui
  if (!Object.keys(d).length) delete s.deviceOnly
}

/** The back-off notice for `kind` (B11.14) was closed while that back-off (started `at`) ran: it
 *  stays hidden on this device until the type backs off again (a new `at`). Not health data. */
export function dismissBackoff(s: PersistedState, kind: string, at: string): void {
  const d = (s.deviceOnly ??= {})
  d.ui = { ...d.ui, backoffSeen: { ...d.ui?.backoffSeen, [kind]: at } }
}

/** Whether the back-off notice for `kind`, started `at`, was closed on this device. */
export function backoffDismissed(s: PersistedState, kind: string, at: string | undefined): boolean {
  return !!at && s.deviceOnly?.ui?.backoffSeen?.[kind] === at
}

/** The reminder delivery events this device has seen, oldest first. */
export function notifyLog(s: PersistedState): NotifyEvent[] {
  return s.deviceOnly?.notify ?? []
}

/** Add events read from the service worker's store; malformed ones dropped, the newest
 *  NOTIFY_LOG_MAX kept (delivery records, not the person's words). */
export function recordNotifyEvents(s: PersistedState, events: unknown[]): void {
  const all = cleanNotify([...notifyLog(s), ...events])
  if (all.length) (s.deviceOnly ??= {}).notify = all
}

/** Delete the service worker's reminder log (wipe, sign out and remove, start fresh, keep for
 *  this account). Harmless when it doesn't exist or IndexedDB is unavailable. */
export function clearNotifyStore(idb: Pick<IDBFactory, 'deleteDatabase'> | null = typeof indexedDB === 'undefined' ? null : indexedDB): void {
  try { idb?.deleteDatabase(NOTIFY_DB) } catch { /* blocked */ }
}
