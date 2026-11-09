/**
 * Installs what the shared web code expects from a browser, before any of it loads (index.ts
 * imports this first). Spike approach (native-build-plan §3): the shared store and data layer
 * run unchanged on top of these; N0 replaces the globals with named adapters behind the same
 * function names, in small web-tested steps (src/data/platform.ts is the first).
 *
 * - localStorage → MMKV (./storage), sessionStorage → memory
 * - crypto.getRandomValues → expo-crypto (uuid() in src/data/supabase.ts)
 * - navigator.onLine and window 'online'/'offline' events → NetInfo
 * - URL, structuredClone and AbortSignal.timeout where the engine lacks them
 *
 * A web render of this app (only for side-by-side checks against the web app) keeps the
 * browser's own storage, events and connection state.
 */
import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'
import { getRandomValues } from 'expo-crypto'
import NetInfo from '@react-native-community/netinfo'
import { memoryStorage, nativeLocalStorage } from './storage'

type Listener = (e: { type: string }) => void
const g = globalThis as unknown as Record<string, any>
const native = Platform.OS !== 'web'

// ---- crypto ----
if (!g.crypto) g.crypto = {}
if (!g.crypto.getRandomValues) g.crypto.getRandomValues = getRandomValues

// ---- structuredClone (the shared code clones plain JSON-shaped state) ----
if (typeof g.structuredClone !== 'function') {
  const clone = (v: any): any => {
    if (v === null || typeof v !== 'object') return v
    if (v instanceof Date) return new Date(v.getTime())
    if (v instanceof Map) return new Map([...v].map(([k, x]) => [clone(k), clone(x)]))
    if (v instanceof Set) return new Set([...v].map(clone))
    if (Array.isArray(v)) return v.map(clone)
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v)) out[k] = clone(v[k])
    return out
  }
  g.structuredClone = clone
}

// ---- AbortSignal.timeout ----
if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout !== 'function') {
  ;(AbortSignal as any).timeout = (ms: number) => {
    const c = new AbortController()
    setTimeout(() => c.abort(), ms)
    return c.signal
  }
}

if (native) {
  // ---- storage ----
  g.localStorage = nativeLocalStorage
  g.sessionStorage = memoryStorage()

  // ---- window events (the store listens for 'online' and 'offline') ----
  const listeners = new Map<string, Set<Listener>>()
  const win = g.window ?? (g.window = g)
  win.addEventListener = (type: string, fn: Listener, opts?: { once?: boolean } | boolean) => {
    const once = typeof opts === 'object' && !!opts?.once
    const set = listeners.get(type) ?? new Set<Listener>()
    const wrapped: Listener = once ? (e) => { set.delete(wrapped); fn(e) } : fn
    ;(wrapped as any).__orig = fn
    set.add(wrapped)
    listeners.set(type, set)
  }
  win.removeEventListener = (type: string, fn: Listener) => {
    const set = listeners.get(type)
    if (set) for (const l of set) if (l === fn || (l as any).__orig === fn) set.delete(l)
  }
  win.dispatchEvent = (e: { type: string }) => {
    for (const l of [...(listeners.get(e.type) ?? [])]) l(e)
    return true
  }

  // ---- navigator.onLine from NetInfo ----
  let online = true
  try {
    Object.defineProperty(g.navigator, 'onLine', { configurable: true, get: () => online })
  } catch {
    g.navigator = { ...(g.navigator || {}), get onLine() { return online } }
  }
  NetInfo.addEventListener((s) => {
    // isInternetReachable is null while unknown: count it as online, as a browser would
    const next = !!s.isConnected && s.isInternetReachable !== false
    if (next === online) return
    online = next
    win.dispatchEvent({ type: next ? 'online' : 'offline' })
  })
}
