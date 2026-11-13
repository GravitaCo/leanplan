/**
 * The reminder delivery log (./notifyStore) on the phone's MMKV, opened on first use. What
 * src/data/platform.native.ts hands the shared code, and what the notification handler (N12)
 * records into.
 */
import { createMMKV, type MMKV } from 'react-native-mmkv'
import { clearEvents, NOTIFY_STORE_ID, recordNotifyEvent as record, takeEvents, type KV } from './notifyStore'

let kv: MMKV | null = null
const store = (): MMKV | null => {
  try { return (kv ??= createMMKV({ id: NOTIFY_STORE_ID })) } catch { return null }
}

/** Read every event and empty the log (notifyLog.takeNotifyEvents on native). */
export const takeNativeNotifyEvents = (): Promise<unknown[]> => Promise.resolve(takeEvents(store()))

/** Delete the log (deviceOnly.clearNotifyStore on native). */
export const clearNativeNotifyLog = (): void => clearEvents(store())

/** The same store for N12's list of reminders seen in Notification Centre (./notifications.ts), so
 *  clearNativeNotifyLog removes it too. */
export const notifyKV = (): KV | null => store()

/** A Mind reminder was shown, opened or swiped away (N12's notification handler). */
export function recordNotifyEvent(kind: string, ev: 'shown' | 'opened' | 'closed'): void {
  const s = store()
  if (s) record(s, kind, ev)
}
