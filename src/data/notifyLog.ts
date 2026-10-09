/**
 * The service worker's reminder delivery log (security-data H3): public/sw.js records each Mind
 * reminder that was shown, opened or swiped away in IndexedDB `tali-notify` (store `events`), as
 * {kind, at, ev}. The app reads it and empties it, then hands the events to the store
 * (ingestNotifyLog), which keeps them in the device-only store and starts a back-off after two
 * ignored in a row. No text, nothing from the log; never synced. Deleted on wipe, sign-out and
 * remove, and when the device changes hands (deviceOnly.clearNotifyStore).
 * No React; IndexedDB only, injectable for tests.
 */
import { NOTIFY_DB } from './deviceOnly'

export const NOTIFY_STORE = 'events'

/** Read every event and empty the store, in one transaction. Never throws: no IndexedDB, a
 *  blocked or missing database, or any error reads as no events. Doesn't create the database. */
export function takeNotifyEvents(idb: IDBFactory | null = typeof indexedDB === 'undefined' ? null : indexedDB): Promise<unknown[]> {
  if (!idb) return Promise.resolve([])
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try { req = idb.open(NOTIFY_DB) } catch { resolve([]); return }
    // no database yet: the worker hasn't recorded anything. Abort, so this doesn't create one
    req.onupgradeneeded = () => { try { req.transaction?.abort() } catch { /* ignore */ } }
    req.onerror = () => resolve([])
    req.onblocked = () => resolve([])
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(NOTIFY_STORE)) { db.close(); resolve([]); return }
      try {
        const tx = db.transaction(NOTIFY_STORE, 'readwrite')
        const st = tx.objectStore(NOTIFY_STORE)
        const all = st.getAll()
        let events: unknown[] = []
        all.onsuccess = () => { events = Array.isArray(all.result) ? all.result : []; st.clear() }
        tx.oncomplete = () => { db.close(); resolve(events) }
        tx.onerror = tx.onabort = () => { db.close(); resolve([]) }
      } catch {
        db.close()
        resolve([])
      }
    }
  })
}

/** The Mind reminder a tap opened the app from (`./?n=<kind>`), removed from the address so a
 *  reload doesn't count it again. The worker has already recorded the open. */
export function takeNotifyParam(loc: Pick<Location, 'search' | 'pathname' | 'hash'> = location, hist: Pick<History, 'replaceState'> = history): string | null {
  const q = new URLSearchParams(loc.search)
  const n = q.get('n')
  if (n == null) return null
  q.delete('n')
  try { hist.replaceState(null, '', loc.pathname + (q.toString() ? '?' + q : '') + loc.hash) } catch { /* ignore */ }
  return /^[a-z-]{1,32}$/.test(n) ? n : null
}
