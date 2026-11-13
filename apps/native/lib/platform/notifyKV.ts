/**
 * The reminder delivery log (./notifyStore) in the phone's own store (modules/tilo-store,
 * namespace `tali-notify`, named like the web's database), opened on first use. What
 * src/data/platform.native.ts hands the shared code, and what the notification handler (N12)
 * records into.
 */
import { openStore, type KV } from '../../modules/tilo-store'
import { clearEvents, NOTIFY_STORE_ID, recordNotifyEvent as record, takeEvents } from './notifyStore'

let kv: KV | null = null
const store = (): KV | null => {
  try { return (kv ??= openStore(NOTIFY_STORE_ID)) } catch { return null }
}

/** Read every event and empty the log (notifyLog.takeNotifyEvents on native). */
export const takeNativeNotifyEvents = (): Promise<unknown[]> => Promise.resolve(takeEvents(store()))

/** Delete the log (deviceOnly.clearNotifyStore on native). */
export const clearNativeNotifyLog = (): void => clearEvents(store())

/** A Mind reminder was shown, opened or swiped away (N12's notification handler). */
export function recordNotifyEvent(kind: string, ev: 'shown' | 'opened' | 'closed'): void {
  const s = store()
  if (s) record(s, kind, ev)
}
