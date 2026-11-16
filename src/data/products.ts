/**
 * Open Food Facts product lookup by barcode. Never on a launch or save path: the scanner asks,
 * and anything but a found product (offline, slow, not found, an error) sends the user to enter
 * the label themselves. No React, no DOM beyond fetch.
 */
import { OFF_FIELDS } from '@/core/domain/barcode'

export const OFF_TIMEOUT_MS = 6000
const OFF_API = 'https://world.openfoodfacts.org/api/v2/product/'

export type ProductLookup =
  /** the product as OFF sent it: sanitise it (draftFromOff does) before reading any field */
  | { status: 'found'; code: string; product: unknown }
  | { status: 'not-found' }
  /** no connection, or too slow: the lookup never got an answer */
  | { status: 'offline' }
  /** Open Food Facts answered with an error, or something in between blocked the reply */
  | { status: 'error' }

class ServerError extends Error { constructor(readonly status: number) { super('off ' + status) } }

async function once(code: string, signal: AbortSignal): Promise<{ nutriments?: unknown } | null> {
  const res = await fetch(OFF_API + encodeURIComponent(code) + '.json?fields=' + OFF_FIELDS, { signal, headers: { Accept: 'application/json' } })
  // OFF answers an unknown code with 404 and { status: 0 }
  if (res.status === 404) return null
  if (!res.ok) throw new ServerError(res.status)
  const body = await res.json().catch(() => { throw new ServerError(res.status) })
  return body && body.status === 1 && body.product && typeof body.product === 'object' ? body.product : null
}

/**
 * Look a code up, trying its alternative spelling (UPC-A without the 0, the 8-digit UPC-E) when
 * the first isn't there. One timeout covers both tries. A product with no nutrition at all
 * counts as not found: there's nothing to check against the pack.
 */
export async function lookupProduct(codes: { code: string; alt?: string }, opts: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<ProductLookup> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' }
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? OFF_TIMEOUT_MS)
  const stop = () => ctl.abort()
  opts.signal?.addEventListener('abort', stop)
  try {
    for (const code of [codes.code, codes.alt].filter((c): c is string => !!c)) {
      const p = await once(code, ctl.signal)
      if (p && p.nutriments && typeof p.nutriments === 'object' && Object.keys(p.nutriments).some((k) => k.endsWith('_100g'))) return { status: 'found', code: codes.code, product: p }
    }
    return { status: 'not-found' }
  } catch (e) {
    // either way the user enters it themselves; only the copy differs. A fetch that never got a
    // response (no connection, timeout, closed) is offline; an answer we can't use is an error.
    if (e instanceof ServerError) return { status: 'error' }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' }
    const name = (e as { name?: string })?.name
    return name === 'AbortError' || name === 'TypeError' ? { status: 'offline' } : { status: 'error' }
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', stop)
  }
}
