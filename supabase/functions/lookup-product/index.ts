/**
 * lookup-product: a barcode's visible versions on Tali's shared product list
 * (docs/migrations/2026-10-10-shared-products.sql), for signed-in users. The only way to read the
 * list: lookup_product() is executable by service_role only, so the per-caller limit here can't
 * be stepped around, and nobody can walk the barcode space at database speed.
 *
 * - verify_jwt is off at the gateway (supabase/config.toml), as for submit-product: a missing or
 *   malformed Authorization is refused here with 401, then Auth checks the token (/auth/v1/user)
 *   and the caller's id comes only from its answer.
 * - In-memory limit per caller, the same pattern as submit-product: 20 lookups a minute and 200
 *   an hour per function instance (a big shop scanned item by item fits). The id is held in memory
 *   for at most an hour, never logged or stored.
 * - The barcode travels in the POST body, never in a URL, and isn't logged.
 * - The reply is lookup_product()'s rows as they are (the app checks each one).
 *
 * Secrets: none of its own. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the publishable key are
 * provided by the platform.
 */
import { gtin14 } from '../_shared/shared-product.ts'
import { BEARER_RE, corsFor, json, publishableKey, rateLimiter, readLimited, verifyCaller } from '../_shared/product-fn.ts'

const MAX_BODY = 256

/** Per caller, per function instance: 20 a minute, 200 an hour (memory only). */
const take = rateLimiter(20, 200)

type ErrorCode = 'bad_request' | 'forbidden' | 'too_large' | 'unauthorized' | 'limit' | 'retry' | 'config'
const STATUS: Record<ErrorCode, number> = { bad_request: 400, forbidden: 403, too_large: 413, unauthorized: 401, limit: 429, retry: 503, config: 500 }

/** Outcome and timings only. */
function log(outcome: string, extra: Record<string, number | string> = {}) {
  console.log(JSON.stringify({ fn: 'lookup-product', outcome, ...extra }))
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
  if (!BEARER_RE.test(auth)) return fail('unauthorized')
  const url = Deno.env.get('SUPABASE_URL'), anon = publishableKey(), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !service) return fail('config')
  if (Number(req.headers.get('Content-Length') || 0) > MAX_BODY) return fail('too_large')

  let raw: string | null
  try { raw = await readLimited(req, MAX_BODY) } catch { return fail('bad_request') }
  if (raw === null) return fail('too_large')
  let body: unknown
  try { body = JSON.parse(raw) } catch { return fail('bad_request') }
  const o = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
  if (!o || Object.keys(o).some((k) => k !== 'barcode') || typeof o.barcode !== 'string') return fail('bad_request')
  const gtin = gtin14(o.barcode)
  // a restricted or malformed code is never on the list
  if (!gtin) { log('none', { ms: Date.now() - started }); return json([], 200, cors) }

  const who = await verifyCaller(url, anon, auth)
  if (typeof who === 'string') return fail(who)
  if (!take(who.sub)) return fail('limit')

  let res: Response
  try {
    res = await fetch(`${url}/rest/v1/rpc/lookup_product`, {
      method: 'POST',
      headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_barcode: gtin }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    return fail('retry')
  }
  if (!res.ok) return fail(res.status >= 500 ? 'retry' : 'config')
  const rows = await res.json().catch(() => null)
  if (!Array.isArray(rows)) return fail('retry')
  log('ok', { ms: Date.now() - started, n: rows.length })
  return json(rows, 200, cors)
})
