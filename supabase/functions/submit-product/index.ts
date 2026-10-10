/**
 * submit-product: add one signed label read to Tali's shared product list
 * (docs/migrations/2026-10-10-shared-products.sql). Anonymous by design: the database never
 * learns who sent it.
 *
 * - Signed-in users only. verify_jwt is off at the gateway (supabase/config.toml), as for
 *   ai-read-label: a missing or malformed Authorization is refused here with 401, and
 *   shared_products_allowed(), called with the caller's own JWT, verifies it (PostgREST checks
 *   the signature and expiry) and answers whether their latest health and shared-products
 *   answers are both a yes. No yes, no write (403 consent).
 * - In-memory limit per caller (`sub`, read only after that call verified the token): a few
 *   submissions a minute and a cap an hour, per function instance. The sub is held in memory for
 *   at most an hour and never logged or stored.
 * - The body is { barcode, values, iat, sig } exactly as ai-read-label signed it (HMAC over the
 *   barcode, the parsed values and the time, no user id; PRODUCT_SIGNING_KEY). Anything else, a
 *   changed value or name, a read older than 30 days: refused. So typed figures and names never
 *   reach the list.
 * - Open Food Facts is asked once more: a barcode it has is never added (ODbL). If OFF can't be
 *   reached the app keeps the read and tries again later (503).
 * - Then submit_product() runs with the service role key, with the barcode, the values and the
 *   signature's SHA-256 (so one read counts once). The service role key never leaves the function.
 * - Logs hold the outcome and timings only: never the sub, the barcode, the name or a value.
 *
 * Secrets: PRODUCT_SIGNING_KEY (the same as ai-read-label). SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and the publishable key are provided by the platform.
 */
import { jwtPayload } from '../_shared/account.ts'
import { cleanToken, gtin14 } from '../_shared/shared-product.ts'
import { MIN_KEY_LENGTH, sigHash, verifyShare } from '../_shared/product-sig.ts'

const ORIGINS = [
  /^https:\/\/app\.tali\.fit$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // local preview on a phone through a tunnel (docs/local-preview.md)
  /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
]

/** A submission is a few hundred bytes. */
const MAX_BODY = 4_096
const OFF_TIMEOUT_MS = 4_000
const OFF_API = 'https://world.openfoodfacts.org/api/v2/product/'

/** Per caller, per function instance. */
const PER_MINUTE = 5
const PER_HOUR = 30

type ErrorCode = 'bad_request' | 'forbidden' | 'too_large' | 'unauthorized' | 'consent' | 'limit' | 'signature' | 'refused' | 'off' | 'retry' | 'config'
const STATUS: Record<ErrorCode, number> = {
  bad_request: 400, forbidden: 403, too_large: 413, unauthorized: 401, consent: 403, limit: 429, signature: 422, refused: 422, off: 409, retry: 503, config: 500,
}

const corsFor = (origin: string | null): Record<string, string> | null =>
  origin && ORIGINS.some((re) => re.test(origin))
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : null

const json = (body: unknown, status: number, cors: Record<string, string> | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(cors ?? {}) } })

/** Outcome and timings only. */
function log(outcome: string, extra: Record<string, number | string> = {}) {
  console.log(JSON.stringify({ fn: 'submit-product', outcome, ...extra }))
}

/* ---------------- per-caller limit (memory only) ---------------- */

const seen = new Map<string, number[]>()
/** Take one submission for this caller, or false when they're over the limit. */
function take(sub: string, now = Date.now()): boolean {
  const hour = now - 3_600_000
  const times = (seen.get(sub) || []).filter((t) => t > hour)
  if (times.length >= PER_HOUR || times.filter((t) => t > now - 60_000).length >= PER_MINUTE) {
    seen.set(sub, times)
    return false
  }
  times.push(now)
  seen.set(sub, times)
  // keep the map small: forget callers with nothing in the last hour
  if (seen.size > 5_000) for (const [k, v] of seen) if (!v.some((t) => t > hour)) seen.delete(k)
  return true
}

/* ---------------- helpers ---------------- */

async function readLimited(req: Request, max: number): Promise<string | null> {
  if (!req.body) return ''
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) { await reader.cancel().catch(() => {}); return null }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) { all.set(c, at); at += c.byteLength }
  return new TextDecoder().decode(all)
}

/** The project's publishable key: the new-style `default` entry, else the legacy anon key. */
function publishableKey(): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}')
    if (typeof keys?.default === 'string' && keys.default) return keys.default
  } catch { /* not JSON: fall back */ }
  return Deno.env.get('SUPABASE_ANON_KEY') || undefined
}

/** Whether the caller may share, asked as the caller (this also verifies their JWT). */
async function allowed(url: string, anon: string, auth: string): Promise<'yes' | 'consent' | 'unauthorized' | 'config'> {
  let res: Response
  try {
    res = await fetch(`${url}/rest/v1/rpc/shared_products_allowed`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    return 'config'
  }
  if (res.status === 401 || res.status === 403) return 'unauthorized'
  if (!res.ok) return 'config' // fail closed
  return (await res.json().catch(() => null)) === true ? 'yes' : 'consent'
}

/** Whether Open Food Facts has this product, with nutrition (the app's own test, products.ts). */
async function inOpenFoodFacts(gtin: string): Promise<boolean | null> {
  // OFF files EAN-13 and EAN-8 codes, and some UPC-A codes without the leading 0
  const s = gtin.replace(/^0+/, '')
  const codes = (s.length <= 8 ? [s.padStart(8, '0'), s.padStart(13, '0')] : [s.padStart(13, '0'), ...(s.length <= 12 ? [s.padStart(12, '0')] : [])])
    .filter((c, i, a) => a.indexOf(c) === i)
  try {
    for (const code of codes) {
      const res = await fetch(OFF_API + code + '.json?fields=code,nutriments', {
        headers: { Accept: 'application/json', 'User-Agent': 'Tali/1.0 (app.tali.fit)' },
        signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
      })
      if (res.status === 404) continue
      if (!res.ok) return null
      const body = await res.json().catch(() => null)
      const n = body?.status === 1 ? body.product?.nutriments : null
      if (n && typeof n === 'object' && Object.keys(n).some((k) => k.endsWith('_100g'))) return true
    }
    return false
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  const started = Date.now()
  const origin = req.headers.get('Origin')
  const cors = corsFor(origin)
  const fail = (code: ErrorCode) => { log(code, { ms: Date.now() - started }); return json({ ok: false, error: code }, STATUS[code], cors) }

  if (req.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} })
  if (origin && !cors) return fail('forbidden')
  if (req.method !== 'POST') return fail('bad_request')

  const auth = req.headers.get('Authorization') || ''
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth)) return fail('unauthorized')
  const key = Deno.env.get('PRODUCT_SIGNING_KEY') || ''
  const url = Deno.env.get('SUPABASE_URL'), anon = publishableKey(), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (key.length < MIN_KEY_LENGTH || !url || !anon || !service) return fail('config')
  if (Number(req.headers.get('Content-Length') || 0) > MAX_BODY) return fail('too_large')

  let raw: string | null
  try { raw = await readLimited(req, MAX_BODY) } catch { return fail('bad_request') }
  if (raw === null) return fail('too_large')
  let body: unknown
  try { body = JSON.parse(raw) } catch { return fail('bad_request') }
  const token = cleanToken(body)
  if (!token) return fail('bad_request')

  // the caller: a valid session whose latest health and shared-products answers are a yes
  const who = await allowed(url, anon, auth)
  if (who !== 'yes') return fail(who)
  const sub = (jwtPayload(auth.slice(7)) as { sub?: unknown } | null)?.sub
  if (typeof sub !== 'string' || !sub) return fail('unauthorized')
  if (!take(sub)) return fail('limit')

  // only what the label reader produced, unchanged, and recent
  if (!(await verifyShare(key, token, Math.floor(Date.now() / 1000)))) return fail('signature')
  const gtin = gtin14(token.barcode)
  if (!gtin) return fail('bad_request')

  const off = await inOpenFoodFacts(gtin)
  if (off === null) return fail('retry')
  if (off) return fail('off')

  let res: Response
  try {
    res = await fetch(`${url}/rest/v1/rpc/submit_product`, {
      method: 'POST',
      headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_barcode: gtin, p_values: token.values, p_sig_hash: await sigHash(token.sig) }),
      signal: AbortSignal.timeout(6000),
    })
  } catch {
    return fail('retry')
  }
  if (!res.ok) return fail(res.status >= 500 ? 'retry' : 'config')
  const out = await res.json().catch(() => null) as { ok?: boolean; error?: string; counted?: boolean } | null
  if (out?.ok) {
    log('ok', { ms: Date.now() - started, counted: out.counted ? 1 : 0 })
    return json({ ok: true }, 200, cors)
  }
  // a replay of a read already counted is done, as far as the app is concerned
  if (out?.error === 'replay') { log('replay', { ms: Date.now() - started }); return json({ ok: true }, 200, cors) }
  // today's global cap: try again another day
  if (out?.error === 'busy') return fail('retry')
  log('refused', { ms: Date.now() - started, why: String(out?.error || 'unknown').slice(0, 16) })
  return json({ ok: false, error: 'refused' }, STATUS.refused, cors)
})
