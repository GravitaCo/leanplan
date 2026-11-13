/**
 * What this phone registered for reminders (./push.ts): the device token, the account it was saved
 * for, and rows still to delete. Device-only, not health data. The one place push touches storage,
 * on the same small interface as the reminder log (./notifyStore KV), so a change of storage engine
 * changes this file only.
 */
import { createMMKV } from 'react-native-mmkv'
import type { KV } from './notifyStore'

export const PUSH_STORE_ID = 'tali-push'

let kv: KV | null = null
/** The store, opened on first use; null where storage is unavailable. */
export const pushKV = (): KV | null => {
  try { return (kv ??= createMMKV({ id: PUSH_STORE_ID })) } catch { return null }
}
