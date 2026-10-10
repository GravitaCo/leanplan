/**
 * Tali's shared product list on the device (docs/migrations/2026-10-10-shared-products.sql):
 *
 * - lookupShared(): asked before Open Food Facts when a barcode isn't on the device, with the same
 *   timeout and offline handling. A POST RPC, so the barcode never sits in a URL. Found products
 *   are kept in a small device cache (`tali.products`), so a product looked up before still opens
 *   offline.
 * - The outbox (`tali.productOutbox`): signed label reads the user agreed to share, waiting to be
 *   sent to the `submit-product` Edge Function. It records on this device only which account
 *   queued it, never sends anyone's id, and is sent only when signed in, online and consented,
 *   after a small random delay: never on launch or on a save path (the store schedules it).
 *   It's dropped when a different account signs in or the consent is withdrawn.
 * - reportShared(): the sp-6 report, anonymous.
 *
 * No React, no DOM beyond fetch, localStorage and timers.
 */
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { cleanLookupRow, type SharedProduct } from '@/core/domain/sharedProduct'
import { cleanToken, gtin14, tokenFresh, type ShareToken } from '../../supabase/functions/_shared/shared-product'
import { LABEL_SCAN_ENABLED } from './labelReader'
import { OFF_TIMEOUT_MS } from './products'
import { getToken, hasSession, sbFetch, supabase } from './supabase'

/** The list grows only from label photos, so it's on exactly when label scanning is. */
export const SHARED_PRODUCTS_ENABLED: boolean = LABEL_SCAN_ENABLED

export const CACHE_KEY = 'tali.products'
export const OUTBOX_KEY = 'tali.productOutbox'
/** products kept on the device (least recently looked up go first) */
export const CACHE_MAX = 200
/** reads waiting to be sent (oldest go first) */
export const OUTBOX_MAX = 50
export const SUBMIT_FUNCTION = 'submit-product'
export const SUBMIT_TIMEOUT_MS = 15_000

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const local = (): Store | null => { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function readJson(st: Store | null, key: string): unknown {
  try { const raw = st?.getItem(key); return raw ? JSON.parse(raw) : null } catch { return null }
}
function writeJson(st: Store | null, key: string, v: unknown): void {
  try { st?.setItem(key, JSON.stringify(v)) } catch { /* storage full or blocked: the cache is optional */ }
}

/* ---------------- device cache ---------------- */

interface CacheEntry { p: SharedProduct; at: number }
type Cache = Record<string, CacheEntry>

function readCache(st: Store | null): Cache {
  const x = readJson(st, CACHE_KEY) as { v?: number; items?: Record<string, { p?: unknown; at?: unknown }> } | null
  const out: Cache = {}
  if (!x || x.v !== 1 || !x.items || typeof x.items !== 'object') return out
  for (const [code, e] of Object.entries(x.items)) {
    const p = e && typeof e.at === 'number' && /^\d{14}$/.test(code) ? cleanLookupRow(toRow(e.p)) : null
    if (p) out[code] = { p, at: e.at as number }
  }
  return out
}
/** A cached product back in the lookup row's shape, so one cleaner checks both. */
function toRow(p: unknown): unknown {
  if (!p || typeof p !== 'object') return null
  const s = p as SharedProduct
  return { ...s.values, version: s.version, status: s.status, label_reads: s.reads, ...(s.audited ? { audited_on: s.audited + '-01' } : {}) }
}

/** Keep a found product on the device; the least recently looked up go past CACHE_MAX. */
export function cachePut(st: Store | null, code: string, p: SharedProduct, now = Date.now()): void {
  const c = readCache(st)
  c[code] = { p, at: now }
  const keep = Object.entries(c).sort((a, b) => b[1].at - a[1].at).slice(0, CACHE_MAX)
  writeJson(st, CACHE_KEY, { v: 1, items: Object.fromEntries(keep) })
}
export function cacheGet(st: Store | null, code: string): SharedProduct | null {
  return readCache(st)[code]?.p ?? null
}
function cacheDrop(st: Store | null, code: string): void {
  const c = readCache(st)
  if (!c[code]) return
  delete c[code]
  writeJson(st, CACHE_KEY, { v: 1, items: c })
}

/* ---------------- lookup ---------------- */

export type SharedLookup =
  | { status: 'found'; product: SharedProduct }
  | { status: 'not-found' }
  /** no connection, or too slow (and nothing cached): Open Food Facts would fail the same way */
  | { status: 'offline' }
  /** the server answered with an error: go on to Open Food Facts */
  | { status: 'error' }

/**
 * Look a barcode up on the shared list. Offline, a product looked up before comes from the
 * device cache. Not signed in (or a restricted in-store code): not found, so Open Food Facts runs.
 */
export async function lookupShared(codes: { code: string; alt?: string }, opts: { timeoutMs?: number; signal?: AbortSignal; storage?: Store | null; fetcher?: typeof sbFetch } = {}): Promise<SharedLookup> {
  const st = opts.storage === undefined ? local() : opts.storage
  const gtin = gtin14(codes.code) ?? (codes.alt ? gtin14(codes.alt) : null)
  if (!gtin) return { status: 'not-found' }
  const cached = cacheGet(st, gtin)
  if (offline()) return cached ? { status: 'found', product: cached } : { status: 'offline' }
  if (!hasSession()) return cached ? { status: 'found', product: cached } : { status: 'not-found' }
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? OFF_TIMEOUT_MS)
  const stop = () => ctl.abort()
  opts.signal?.addEventListener('abort', stop)
  try {
    const res = await (opts.fetcher ?? sbFetch)('/rpc/lookup_product', {
      method: 'POST', body: JSON.stringify({ p_barcode: gtin }), headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
    })
    // the RPC isn't there yet (migration not applied): carry on to Open Food Facts
    if (res.status === 404) return cached ? { status: 'found', product: cached } : { status: 'not-found' }
    if (!res.ok) return cached ? { status: 'found', product: cached } : { status: 'error' }
    const rows = await res.json().catch(() => null)
    const p = Array.isArray(rows) ? rows.map(cleanLookupRow).find((x): x is SharedProduct => !!x) : undefined
    if (!p) { cacheDrop(st, gtin); return { status: 'not-found' } }
    cachePut(st, gtin, p)
    return { status: 'found', product: p }
  } catch {
    if (cached) return { status: 'found', product: cached }
    return ctl.signal.aborted || offline() ? { status: 'offline' } : { status: 'error' }
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', stop)
  }
}

/* ---------------- outbox ---------------- */

export interface Outbox {
  v: 1
  /** the account that queued these, on this device only: never sent anywhere */
  owner: string
  items: ShareToken[]
}

export function readOutbox(st: Store | null = local()): Outbox | null {
  const x = readJson(st, OUTBOX_KEY) as Partial<Outbox> | null
  if (!x || x.v !== 1 || typeof x.owner !== 'string' || !x.owner || !Array.isArray(x.items)) return null
  const items = x.items.map(cleanToken).filter((t): t is ShareToken => !!t)
  return { v: 1, owner: x.owner, items }
}
function writeOutbox(st: Store | null, o: Outbox): void {
  if (!o.items.length) { dropOutbox(st); return }
  writeJson(st, OUTBOX_KEY, o)
}
export function dropOutbox(st: Store | null = local()): void {
  try { st?.removeItem(OUTBOX_KEY) } catch { /* nothing to drop */ }
}
export const outboxSize = (st: Store | null = local()): number => readOutbox(st)?.items.length ?? 0

/**
 * Queue a signed read for `owner` (the signed-in account's id, kept on the device only). Another
 * account's queue is dropped first; a read already queued isn't queued twice; stale reads go.
 */
export function queueShare(t: ShareToken, owner: string, st: Store | null = local(), nowS = Math.floor(Date.now() / 1000)): void {
  const cur = readOutbox(st)
  const items = (cur && cur.owner === owner ? cur.items : []).filter((x) => x.sig !== t.sig && tokenFresh(x.iat, nowS))
  items.push(t)
  writeOutbox(st, { v: 1, owner, items: items.slice(-OUTBOX_MAX) })
}

/** Drop the queue when it isn't this account's, or sharing isn't (or is no longer) agreed. */
export function reconcileOutbox(uid: string | null, consented: boolean, st: Store | null = local()): boolean {
  const o = readOutbox(st)
  if (!o) return false
  if (!consented || !uid || o.owner !== uid) { dropOutbox(st); return true }
  return false
}

/** Whether the queue may be sent now: signed in as its owner, online, and both consents a yes. */
export function canSendOutbox(s: { authed: boolean; online: boolean; uid: string | null; health: boolean; shared: boolean; underAge?: boolean }, o: Outbox | null): boolean {
  return !!o && o.items.length > 0 && s.authed && s.online && !!s.uid && s.uid === o.owner && s.health && s.shared && !s.underAge
}

export type SendResult = 'sent' | 'keep' | 'drop'

/** One read to the submit-product function. Keep it on anything worth retrying. */
export async function submitShare(t: ShareToken): Promise<SendResult> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), SUBMIT_TIMEOUT_MS)
  try {
    const { data, error } = await supabase.functions.invoke(SUBMIT_FUNCTION, {
      body: t, headers: { Authorization: 'Bearer ' + getToken() }, signal: ctl.signal,
    })
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const status = (error.context as Response | undefined)?.status ?? 0
        // refused for good: malformed, a bad or stale signature, a name or figures the list
        // refuses, or Open Food Facts has it
        return [400, 409, 413, 422].includes(status) ? 'drop' : 'keep'
      }
      if (error instanceof FunctionsFetchError) return 'keep'
      return 'keep'
    }
    return data && typeof data === 'object' && (data as { ok?: unknown }).ok === true ? 'sent' : 'keep'
  } catch {
    return 'keep'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Send the queue, one read at a time, as `uid`. Another account's queue is dropped unsent.
 * Returns how many went, stayed and were dropped.
 */
export async function sendOutbox(uid: string, deps: { storage?: Store | null; submit?: (t: ShareToken) => Promise<SendResult>; nowS?: number; still?: () => boolean } = {}): Promise<{ sent: number; kept: number; dropped: number }> {
  const st = deps.storage === undefined ? local() : deps.storage
  const o = readOutbox(st)
  const out = { sent: 0, kept: 0, dropped: 0 }
  if (!o) return out
  if (o.owner !== uid) { out.dropped = o.items.length; dropOutbox(st); return out }
  const nowS = deps.nowS ?? Math.floor(Date.now() / 1000)
  const done = new Set<string>()
  for (const t of o.items) {
    if (!tokenFresh(t.iat, nowS)) { done.add(t.sig); out.dropped++; continue }
    // signed out, consent withdrawn or gone offline meanwhile: stop, keep the rest
    if (deps.still && !deps.still()) break
    const r = await (deps.submit ?? submitShare)(t)
    if (r === 'keep') { out.kept++; break } // the server's busy or unreachable: try later
    done.add(t.sig)
    if (r === 'sent') out.sent++
    else out.dropped++
  }
  // re-read: a read queued while sending stays; a queue dropped meanwhile stays dropped
  const now = readOutbox(st)
  if (now && now.owner === uid) writeOutbox(st, { ...now, items: now.items.filter((t) => !done.has(t.sig)) })
  out.kept = (readOutbox(st)?.items.length ?? 0)
  return out
}

/** The small random wait before a send, so a send never lines up with a save or a launch. */
export const sendDelayMs = (rand: () => number = Math.random): number => 20_000 + Math.floor(rand() * 70_000)

let pending: ReturnType<typeof setTimeout> | null = null
/** Run `send` once after a random delay; a second call while one is waiting does nothing. */
export function scheduleSend(send: () => void, rand: () => number = Math.random): void {
  if (pending) return
  pending = setTimeout(() => { pending = null; send() }, sendDelayMs(rand))
}
export function cancelScheduledSend(): void {
  if (pending) clearTimeout(pending)
  pending = null
}

/* ---------------- reports ---------------- */

export type ReportReason = 'figures' | 'wrong' | 'name' | 'other'

/** The sp-6 report: anonymous (the server keeps a count, never who). */
export async function reportShared(barcode: string, version: number, reason: ReportReason, opts: { fetcher?: typeof sbFetch; timeoutMs?: number } = {}): Promise<'sent' | 'offline' | 'error'> {
  const gtin = gtin14(barcode)
  if (!gtin) return 'error'
  if (offline() || !hasSession()) return 'offline'
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? OFF_TIMEOUT_MS)
  try {
    const res = await (opts.fetcher ?? sbFetch)('/rpc/report_product', {
      method: 'POST', body: JSON.stringify({ p_barcode: gtin, p_version: version, p_reason: reason }), headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
    })
    return res.ok ? 'sent' : 'error'
  } catch {
    return ctl.signal.aborted || offline() ? 'offline' : 'error'
  } finally {
    clearTimeout(timer)
  }
}
