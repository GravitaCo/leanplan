// browser stand-ins the shared code expects, before it loads (as lib/platform/install.ts does)
const g = globalThis as any
const m = new Map<string, string>()
g.localStorage = { get length() { return m.size }, clear: () => m.clear(), getItem: (k: string) => m.get(k) ?? null, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => { m.delete(k) }, setItem: (k: string, v: string) => { m.set(k, String(v)) } }
g.sessionStorage = g.localStorage
g.window = g
g.addEventListener ??= () => {}
g.removeEventListener ??= () => {}
g.document ??= { addEventListener() {}, hidden: false }
if (!('onLine' in (g.navigator ?? {}))) Object.defineProperty(g.navigator ?? (g.navigator = {}), 'onLine', { value: true, configurable: true })
