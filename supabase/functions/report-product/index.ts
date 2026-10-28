/**
 * report-product: the sp-6 report on a version of Tali's shared product list
 * (docs/migrations/2026-10-10-shared-products.sql). Anonymous: the database never learns who
 * reported.
 *
 * - Signed-in users only. verify_jwt is off at the gateway (supabase/config.toml), as for
 *   submit-product: a missing or malformed Authorization is refused here with 401, then Auth
 *   checks the token (/auth/v1/user) and the caller's id comes only from its answer.
 * - In-memory limit per caller, the same pattern as submit-product: 5 reports a minute and 20 an
 *   hour per function instance. The id is held in memory for at most an hour, never logged or
 *   stored, so one person can't hide a product alone by sending reports in a burst.
 * - The body is { barcode, version, reason } exactly. report_product() then runs with the service
 *   role key (it's executable by service_role only) and takes no identity.
 * - Logs hold the outcome and timings only: never the id, the barcode or the reason.
 *
 * Secrets: none of its own. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the publishable key are
 * provided by the platform.
 */
import { gtin14 } from '../_shared/shared-product.ts'
import { BEARER_RE, corsFor, json, publishableKey, rateLimiter, readLimited, verifyCaller } from '../_shared/product-fn.ts'

const MAX_BODY = 512
const REASONS = ['figures', 'wrong', 'name', 'other']

/** Per caller, per function instance: 5 a minute, 20 an hour (memory only). */
const take = rateLimiter(5, 20)

type ErrorCode = 'bad_request' | 'forbidden' | 'too_large' | 'unauthorized' | 'limit' | 'retry' | 'config'
const STATUS: Record<ErrorCode, number> = { bad_request: 400, forbidden: 403, too_large: 413, unauthorized: 401, limit: 429, retry: 503, config: 500 }

/** Outcome and timings only. */
function log(outcome: string, extra: Record<string, number | string> = {}) {
  console.log(JSON.stringify({ fn: 'report-product', outcome, ...extra }))
}

/** Untrusted JSON → a report, or null. */
function cleanReport(x: unknown): { barcode: string; version: number; reason: string } | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  if (Object.keys(o).some((k) => !['barcode', 'version', 'reason'].includes(k))) return null
  if (typeof o.barcode !== 'string' || !gtin14(o.barcode)) return null
  if (typeof o.version !== 'number' || !Number.isInteger(o.version) || o.version < 1 || o.version > 5) return null
  if (typeof o.reason !== 'string' || !REASONS.includes(o.reason)) return null
  return { barcode: gtin14(o.barcode)!, version: o.version, reason: o.reason }
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
  const report = cleanReport(body)
  if (!report) return fail('bad_request')

  const who = await verifyCaller(url, anon, auth)
  if (typeof who === 'string') return fail(who)
  if (!take(who.sub)) return fail('limit')

  let res: Response
  try {
    res = await fetch(`${url}/rest/v1/rpc/report_product`, {
      method: 'POST',
      headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_barcode: report.barcode, p_version: report.version, p_reason: report.reason }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    return fail('retry')
  }
  if (!res.ok) return fail(res.status >= 500 ? 'retry' : 'config')
  // true: taken; false: an unknown version, or today's global cap reached. Either way it's done
  // as far as the person is concerned (they can't do anything about it).
  const taken = (await res.json().catch(() => null)) === true
  log('ok', { ms: Date.now() - started, taken: taken ? 1 : 0 })
  return json({ ok: true }, 200, cors)
})
