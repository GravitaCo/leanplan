/**
 * Installs what the shared web code expects from a browser, before any of it loads (index.ts
 * imports this first). Spike approach (native-build-plan §3): the shared store and data layer
 * run unchanged on top of these; N0 replaces the globals with named adapters behind the same
 * function names, in small web-tested steps (src/data/platform.ts is the first).
 *
 * - localStorage → MMKV (./storage), sessionStorage → memory
 * - crypto.getRandomValues → expo-crypto (uuid() in src/data/supabase.ts)
 * - navigator.onLine and window 'online'/'offline' events → our Network-framework module (./connection)
 * - URL, structuredClone and AbortSignal.timeout where the engine lacks them
 *
 * A web render of this app (only for side-by-side checks against the web app) keeps the
 * browser's own storage, events and connection state.
 */
import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'
import { getRandomValues, digest, CryptoDigestAlgorithm } from 'expo-crypto'
import { isOnline, onNetworkChange } from '../../modules/tilo-network'
import { memoryStorage, nativeLocalStorage } from './storage'
import { connectionEvents, onlineFrom } from './connection'

const g = globalThis as unknown as Record<string, any>
const native = Platform.OS !== 'web'

// ---- crypto ----
if (!g.crypto) g.crypto = {}
if (!g.crypto.getRandomValues) g.crypto.getRandomValues = getRandomValues
// SHA-256 for supabase-js's PKCE sign-in (Google): without crypto.subtle it falls back to the weaker
// "plain" method (security-data, 9 Nov). Only SHA-256 is offered; anything else fails loudly.
if (!g.crypto.subtle) {
  g.crypto.subtle = {
    digest: (alg: string | { name: string }, data: BufferSource) => {
      const name = typeof alg === 'string' ? alg : alg?.name
      if (name !== 'SHA-256') return Promise.reject(new Error('Only SHA-256 is available'))
      return digest(CryptoDigestAlgorithm.SHA256, data)
    },
  }
}

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
  const win = g.window ?? (g.window = g)
  const ev = connectionEvents()
  win.addEventListener = ev.addEventListener
  win.removeEventListener = ev.removeEventListener
  win.dispatchEvent = ev.dispatchEvent

  // ---- navigator.onLine from Apple's network path (modules/tilo-network) ----
  try {
    Object.defineProperty(g.navigator, 'onLine', { configurable: true, get: () => ev.online() })
  } catch {
    g.navigator = { ...(g.navigator || {}), get onLine() { return ev.online() } }
  }
  // A browser's navigator.onLine means "on a network", with no test request; the module sends none.
  ev.setOnline(onlineFrom({ isConnected: isOnline() }))
  onNetworkChange((online) => ev.setOnline(onlineFrom({ isConnected: online })))
}
