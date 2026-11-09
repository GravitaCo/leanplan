/**
 * The web's `localStorage`, on the phone (native-app-plan §2, native-build-plan N0).
 *
 * The shared data layer (src/data/persistence.ts and friends) reads and writes `localStorage`
 * synchronously. MMKV is synchronous too, so the web's code runs unchanged: the same keys
 * (`leanplan.v1` and the rest), the same JSON, so a backup or a sync moves between web and native
 * as it is.
 *
 * Two stores:
 * - `tali-local`: the app's data, as on the web. Not encrypted by MMKV: it sits in the app's own
 *   container under iOS Data Protection, and it must survive a restore to a new phone (an
 *   encryption key kept "this device only" would not, and unsynced days would be lost).
 * - `tali-session`: Supabase's saved sign-in (`sb-*` keys), encrypted with a key held in the
 *   Keychain, this device only. A restored phone simply signs in again. For `security-data`.
 */
import { createMMKV, deleteMMKV, type MMKV } from 'react-native-mmkv'
import * as SecureStore from 'expo-secure-store'
import { getRandomValues } from 'expo-crypto'

const SESSION_KEY_NAME = 'tali.session.key'

/**
 * The session store's key from the Keychain. A new key is made only when the item is really missing
 * (getItem returns null); a Keychain error throws instead of overwriting the old key. With a new key,
 * any old session file (from a restored backup, whose this-device-only key didn't come along) is
 * deleted first, so it is never opened with the wrong key: that phone simply signs in again.
 */
function sessionKey(): { key: string; fresh: boolean } {
  const opts = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
  const k = SecureStore.getItem(SESSION_KEY_NAME, opts)
  if (k) return { key: k, fresh: false }
  // 32 characters for AES-256 (128 bits of randomness, as security-data accepted)
  const key = Array.from(getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, '0')).join('')
  SecureStore.setItem(SESSION_KEY_NAME, key, opts)
  return { key, fresh: true }
}

function openSession(): MMKV {
  const { key, fresh } = sessionKey()
  if (fresh) { try { deleteMMKV('tali-session') } catch { /* nothing to delete */ } }
  return createMMKV({ id: 'tali-session', encryptionKey: key, encryptionType: 'AES-256' })
}

let local: MMKV | null = null
let session: MMKV | null = null
const localStore = () => (local ??= createMMKV({ id: 'tali-local' }))
const sessionStore = () => (session ??= openSession())
const storeFor = (key: string) => (key.startsWith('sb-') ? sessionStore() : localStore())

/** Every key, each store listed on its own: a Keychain failure on the session store must never stop
 *  the app's data from being listed, so a wipe (delete account, the 18+ stop) still clears it. */
const keysOf = (store: () => MMKV) => { try { return store().getAllKeys() } catch { return [] } }
const allKeys = () => [...keysOf(localStore), ...keysOf(sessionStore)]

const api = {
  getItem(key: string): string | null {
    return storeFor(String(key)).getString(String(key)) ?? null
  },
  setItem(key: string, value: string): void {
    storeFor(String(key)).set(String(key), String(value))
  },
  removeItem(key: string): void {
    storeFor(String(key)).remove(String(key))
  },
  clear(): void {
    localStore().clearAll()
    try { sessionStore().clearAll() } catch { /* Keychain unavailable: the local data is still cleared */ }
  },
  key(i: number): string | null {
    return allKeys()[i] ?? null
  },
  get length(): number {
    return allKeys().length
  },
}

/**
 * A `Storage` object. A Proxy so `Object.keys(localStorage)` lists the stored keys, as the store's
 * sign-out does on web (store.ts clearSavedSession).
 */
export const nativeLocalStorage: Storage = new Proxy(api as unknown as Storage, {
  ownKeys: () => allKeys(),
  getOwnPropertyDescriptor: (_t, p) =>
    typeof p === 'string' && allKeys().includes(p) ? { enumerable: true, configurable: true, value: api.getItem(p) } : undefined,
  get: (t, p) => (p in api ? (t as unknown as Record<string | symbol, unknown>)[p] : typeof p === 'string' ? api.getItem(p) ?? undefined : undefined),
})

/** A plain in-memory `Storage` (the web's sessionStorage: gone when the app closes). */
export function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(String(k)) ?? null,
    setItem: (k, v) => void m.set(String(k), String(v)),
    removeItem: (k) => void m.delete(String(k)),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}
