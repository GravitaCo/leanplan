const stores = new Map<string, Map<string, string>>()
export type MMKV = ReturnType<typeof createMMKV>
export function createMMKV(o: { id: string }) {
  const m = stores.get(o.id) ?? new Map<string, string>(); stores.set(o.id, m)
  return { getString: (k: string) => m.get(k), set: (k: string, v: string) => { m.set(k, v) }, remove: (k: string) => m.delete(k), clearAll: () => m.clear() }
}
