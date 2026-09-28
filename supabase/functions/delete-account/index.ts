/**
 * delete-account: delete the calling account's data and login (onboarding plan §8; launch blocker).
 *
 * - The caller's own session only. verify_jwt is off at the gateway (supabase/config.toml), as for
 *   ai-read-label: this function refuses a missing or malformed Authorization with 401, then asks
 *   Auth who the token belongs to (auth.getUser(jwt): checks the signature, expiry and that the
 *   user exists). The user id comes only from that answer, never from the request body, so a
 *   caller can only ever delete their own account.
 * - Re-confirmed identity: the session must come from a sign-in in the last 5 minutes (password
 *   re-entered, or a fresh Google sign-in). Checked here from the verified token's `amr` sign-in
 *   time, not `iat` (a background token refresh renews iat hourly without anyone signing in), and
 *   not auth.users.last_sign_in_at (a recent sign-in on another device would let an older, stolen
 *   token through). Otherwise 403 { error: 'reauth' } and nothing is deleted.
 * - Then every session of the account is revoked (global sign-out) before any row is deleted.
 *   A retry after that finds the session gone (401): the app asks the person to sign in again,
 *   which is also the fresh sign-in the check above needs.
 * - The body must be { confirm: "delete my account" } (src/data/account.ts), so a stray POST
 *   can't delete anything.
 * - Under-age (onboarding §14; reviewed by security-data: SAFE; deployed as delete-account v2,
 *   28 Sept 2026): with { reason: "under-age" } the
 *   re-auth check is waived only for an account created under 24 hours ago, read from Auth's own
 *   answer (user.created_at), so the app's automatic deletion after the age stop still works when
 *   it retries later offline. Any other account, or no reason, needs the recent sign-in as before
 *   (for an under-age request the app then stops retrying, wipes the device and asks for a fresh
 *   sign-in, which passes this check: underAgeNext in src/data/onboardingDraft.ts).
 * - Deletes the account's rows from every table the app writes (USER_TABLES in ../_shared/account.ts), then the login. Rows go
 *   first: if any delete fails the login stays, the function answers 500, and a retry picks up
 *   where it stopped. A table that doesn't exist yet (a migration not applied) is skipped.
 * - Idempotent: deleting rows that are gone is a no-op, and a validly signed token whose user no
 *   longer exists means an earlier call already finished (rows are deleted before the login), so
 *   it answers { ok: true, already: true } and the app can finish wiping the device.
 * - The service role key is read from the environment here and nowhere else; it never leaves the
 *   function. Logs hold the outcome and counts only: no user id, no email, no content.
 *
 * Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import { DELETE_CONFIRM as CONFIRM, UNDER_AGE_REASON, USER_TABLES as TABLES, jwtPayload, newAccount, signedInRecently } from '../_shared/account.ts'

const ORIGINS = [
  /^https:\/\/app\.tali\.fit$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // local preview on a phone through a tunnel (docs/local-preview.md)
  /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
]

type ErrorCode = 'bad_request' | 'forbidden' | 'unauthorized' | 'reauth' | 'failed' | 'config'
const STATUS: Record<ErrorCode, number> = { bad_request: 400, forbidden: 403, unauthorized: 401, reauth: 403, failed: 500, config: 500 }

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

function log(outcome: string, extra: Record<string, number | string> = {}) {
  console.log(JSON.stringify({ fn: 'delete-account', outcome, ...extra }))
}

/** PostgREST's answer for a table it doesn't know (the migration isn't applied yet). */
const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /does not exist|could not find the table/i.test(e.message || ''))

Deno.serve(async (req) => {
  const started = Date.now()
  const origin = req.headers.get('Origin')
  const cors = corsFor(origin)
  const fail = (code: ErrorCode, extra: Record<string, number | string> = {}) => { log(code, { ms: Date.now() - started, ...extra }); return json({ ok: false, error: code }, STATUS[code], cors) }

  if (req.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} })
  if (origin && !cors) return fail('forbidden')
  if (req.method !== 'POST') return fail('bad_request')

  const auth = req.headers.get('Authorization') || ''
  const m = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(auth)
  if (!m) return fail('unauthorized')
  const jwt = m[1]

  let body: { confirm?: unknown; reason?: unknown }
  if (Number(req.headers.get('Content-Length') || 0) > 1000) return fail('bad_request')
  try {
    const raw = await req.text()
    if (raw.length > 1000) return fail('bad_request')
    body = JSON.parse(raw)
  } catch {
    return fail('bad_request')
  }
  if (!body || typeof body !== 'object' || body.confirm !== CONFIRM) return fail('bad_request')
  if (body.reason !== undefined && body.reason !== UNDER_AGE_REASON) return fail('bad_request')

  const url = Deno.env.get('SUPABASE_URL'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !service) return fail('config')
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })

  // who is asking: Auth verifies the token; the id comes from its answer only
  const who = await admin.auth.getUser(jwt)
  if (who.error || !who.data.user) {
    // a correctly signed token for a user that no longer exists: an earlier call finished
    if (who.error?.code === 'user_not_found') { log('already', { ms: Date.now() - started }); return json({ ok: true, already: true }, 200, cors) }
    return fail('unauthorized')
  }
  const uid = who.data.user.id
  // Auth has verified this token, so its payload can be read: the sign-in behind it must be recent
  const nowS = Math.floor(Date.now() / 1000)
  // under age: a brand-new account (Auth's created_at, never the request's word) needs no re-auth
  const underAge = body.reason === UNDER_AGE_REASON && newAccount(who.data.user.created_at, nowS)
  if (!underAge && !signedInRecently(jwtPayload(jwt), nowS)) return fail('reauth')

  // End every session of this account (all devices) before touching data, so no other device's
  // refresh token can mint a new token and write rows back while they're deleted. Access tokens
  // already issued stay valid until they expire; the owner FKs (2026-09-owner-fks.sql) make any
  // row written with one after the login is gone fail. A session already gone is fine (a retry).
  const out = await admin.auth.admin.signOut(jwt, 'global')
  if (out.error && out.error.status !== 404 && out.error.code !== 'session_not_found' && out.error.code !== 'user_not_found') return fail('failed', { step: 'sessions' })

  let skipped = 0
  for (const t of TABLES) {
    const { error } = await admin.from(t).delete().eq('user_id', uid)
    if (!error) continue
    if (missingTable(error)) { skipped++; continue }
    return fail('failed', { step: t })
  }

  const del = await admin.auth.admin.deleteUser(uid, false)
  if (del.error && del.error.status !== 404 && del.error.code !== 'user_not_found') return fail('failed', { step: 'auth' })

  log('ok', { ms: Date.now() - started, tables: TABLES.length, skipped, ...(underAge ? { path: 'under-age' } : {}) })
  return json({ ok: true }, 200, cors)
})
