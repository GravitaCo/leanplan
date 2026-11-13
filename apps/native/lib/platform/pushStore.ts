/**
 * What this phone registered for reminders (./push.ts): the device token, the account it was saved
 * for, and rows still to delete. Device-only, not health data. The one place push touches storage:
 * the phone's own store (modules/tilo-store), namespace `tali-push`.
 */
import { openStore, type KV } from '../../modules/tilo-store'

export const PUSH_STORE_ID = 'tali-push'

let kv: KV | null = null
/** The store, opened on first use; null where storage is unavailable. */
export const pushKV = (): KV | null => {
  try { return (kv ??= openStore(PUSH_STORE_ID)) } catch { return null }
}
