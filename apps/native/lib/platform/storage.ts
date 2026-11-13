/**
 * The web's `localStorage`, on the phone (native-app-plan §2, native-build-plan N0).
 *
 * The shared data layer (src/data/persistence.ts and friends) reads and writes `localStorage`
 * synchronously. Our own store module (modules/tilo-store, Apple's frameworks: dependency policy
 * rule 1) is synchronous too, so the web's code runs unchanged: the same keys (`leanplan.v1` and the
 * rest), the same JSON, so a backup or a sync moves between web and native as it is.
 *
 * Two stores:
 * - `tali-local`: the app's data, as on the web: files in the app's own container under iOS Data
 *   Protection, included in the phone's backups so a restored phone keeps unsynced days.
 * - `session`: Supabase's saved sign-in (`sb-*` keys) in the Keychain, this device only. A restored
 *   phone simply signs in again. (Reviewed by security-data with the earlier MMKV version; the
 *   protection is the same or stronger: the Keychain itself instead of an encrypted file.)
 */
import { openStore, type KV } from '../../modules/tilo-store'

let local: KV | null = null
let session: KV | null = null
const localStore = () => (local ??= openStore('tali-local'))
const sessionStore = () => (session ??= openStore('session'))
const storeFor = (key: string) => (key.startsWith('sb-') ? sessionStore() : localStore())

/** Every key, each store listed on its own: a Keychain failure must never stop the app's data
 *  from being listed, so a wipe (delete account, the 18+ stop) still clears it (security-data). */
const keysOf = (store: () => KV) => { try { return store().getAllKeys() } catch { return [] } }
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
