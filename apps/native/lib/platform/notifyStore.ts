/**
 * The reminder delivery log on the phone: the native twin of the service worker's IndexedDB
 * `tali-notify` (public/sw.js notifyRecord; security-data H3). The same rules: only Mind reminder
 * types, each event {kind, at, ev} with ev shown, opened or closed, no text and nothing from the
 * log; the newest 60 kept; the app reads and empties it (src/data/notifyLog.ts takeNotifyEvents)
 * and deletes it on wipe, sign-out-and-remove and when the device changes hands
 * (deviceOnly.clearNotifyStore). Never synced.
 *
 * Its own MMKV store named like the web's database, not inside `leanplan.v1`: the notification
 * handler (N12) records events whether or not the store is loaded, as the service worker does.
 * Not encrypted: delivery records, not health data (deviceOnly.ts). Pure over an injected store,
 * so scripts/test-platform.mjs runs it in Node; ./notifyMMKV.ts gives it the real MMKV.
 */

/** Same name as the web's IndexedDB (NOTIFY_DB in src/data/deviceOnly.ts). */
export const NOTIFY_STORE_ID = 'tali-notify'
const KEY = 'events'
/** As the service worker's NOTIFY_MAX. */
export const NOTIFY_MAX = 60
const EVS = ['shown', 'opened', 'closed']
/** Only the Mind reminder types are recorded, never supplement or review reminders (a supplement
 *  reminder can say what someone takes): MIND_COPY's keys in public/sw.js, which
 *  scripts/test-platform.mjs checks this list against. */
export const NOTIFY_KINDS = ['checkin', 'wind-down', 'plan']

/** The part of MMKV this needs. */
export interface KV {
  getString(key: string): string | undefined
  set(key: string, value: string): void
  remove(key: string): void | boolean
  clearAll(): void
}

const read = (kv: KV): unknown[] => {
  try { const v = JSON.parse(kv.getString(KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

/** Record one delivery event (the native notification handler, N12). Never throws. */
export function recordNotifyEvent(kv: KV, kind: string, ev: 'shown' | 'opened' | 'closed', now = new Date()): void {
  if (!NOTIFY_KINDS.includes(kind) || !EVS.includes(ev)) return
  try {
    const all = [...read(kv), { kind, at: now.toISOString(), ev }]
    kv.set(KEY, JSON.stringify(all.slice(-NOTIFY_MAX)))
  } catch { /* storage unavailable: the event is lost, as on web */ }
}

/** Every event, and the store emptied. Never throws: any problem reads as no events. */
export function takeEvents(kv: KV | null): unknown[] {
  if (!kv) return []
  try {
    const all = read(kv)
    kv.remove(KEY)
    return all
  } catch { return [] }
}

/** Delete the log. Harmless when it's empty or unavailable. */
export function clearEvents(kv: KV | null): void {
  try { kv?.clearAll() } catch { /* unavailable */ }
}
