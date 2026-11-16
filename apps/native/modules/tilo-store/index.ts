import TiloStore from './src/TiloStoreModule'

/** A synchronous key-value store: the part of a store the shared code's adapters need. */
export interface KV {
  getString(key: string): string | undefined
  set(key: string, value: string): void
  remove(key: string): void
  getAllKeys(): string[]
  clearAll(): void
}

/** In memory, for the web render and for a build without the module (nothing persists). */
function memoryKV(): KV {
  const m = new Map<string, string>()
  return {
    getString: (k) => m.get(k),
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
    getAllKeys: () => [...m.keys()],
    clearAll: () => m.clear(),
  }
}

/**
 * A namespace of the phone's store: 'session' is the Keychain (this device only), any other name
 * ([a-z0-9-]) is files under iOS Data Protection. Calls throw if the store can't be read; callers
 * decide (storage.ts lists each namespace on its own, so one failing never hides the other).
 */
export function openStore(ns: string): KV {
  const S = TiloStore
  if (!S) return memoryKV()
  return {
    getString: (k) => S.get(ns, k) ?? undefined,
    set: (k, v) => S.set(ns, k, v),
    remove: (k) => S.remove(ns, k),
    getAllKeys: () => S.keys(ns),
    clearAll: () => S.clear(ns),
  }
}

/** Whether the real store is built in (false on the web render). */
export const storeAvailable = (): boolean => !!TiloStore
