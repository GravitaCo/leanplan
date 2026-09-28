/**
 * Shared by the `delete-account` Edge Function (Deno), the app (src/data/account.ts) and the
 * tests: pure TS, no imports.
 *
 * Every table holding a user's rows, keyed by user_id. Add a table here in the same change that
 * creates it: `npm test` fails when a table in docs/security-rls.sql or docs/migrations/ is missing.
 * Only push_subscriptions, routines and training_plans cascade from auth.users (live DB, 27 Sept
 * 2026), so the explicit deletes are what remove settings, day_logs, custom_foods and recipes.
 */
export const USER_TABLES = ['consents', 'ai_usage', 'push_subscriptions', 'training_plans', 'routines', 'recipes', 'custom_foods', 'day_logs', 'settings'] as const

/** The body the function requires (src/data/account.ts sends it), so a stray POST deletes nothing. */
export const DELETE_CONFIRM = 'delete my account'

/** How recent the sign-in behind the session must be to delete the account (seconds). */
export const REAUTH_MAX_AGE_S = 300
/** Clock skew tolerated for a sign-in time slightly ahead of the server's clock. */
const SKEW_S = 60

/**
 * When the person last proved who they are in this session: the latest `amr` timestamp (Unix
 * seconds) in a Supabase access token, or null when there is none. Not `iat`: a token refresh
 * issues a new token with a new iat every hour without anyone signing in, while `amr` keeps the
 * time of the sign-in (password, OAuth, OTP) that started the session.
 */
export function authTime(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const amr = (payload as { amr?: unknown }).amr
  if (!Array.isArray(amr)) return null
  let best: number | null = null
  for (const x of amr) {
    const t = x && typeof x === 'object' ? (x as { timestamp?: unknown }).timestamp : undefined
    if (typeof t === 'number' && Number.isFinite(t) && (best === null || t > best)) best = t
  }
  return best
}

/** Whether a (verified) token's session was signed in within the last REAUTH_MAX_AGE_S. Fails
 *  closed: no sign-in time, or one too far in the future, is not fresh. */
export function signedInRecently(payload: unknown, nowS: number, maxAgeS = REAUTH_MAX_AGE_S): boolean {
  const t = authTime(payload)
  return t !== null && t <= nowS + SKEW_S && nowS - t <= maxAgeS
}

/**
 * Under-age deletion (first-run-onboarding §14; reviewed by security-data: SAFE; deployed in
 * delete-account v2, 28 Sept 2026): after
 * the age stop, the app deletes the new account by itself, and offline it retries on the next
 * connection, often after the 5-minute re-auth window. A request that says `reason: 'under-age'`
 * may skip the re-auth check only while the account itself is new: created (auth.users.created_at,
 * read server-side by the function, never taken from the request) under 24 hours ago.
 */
export const UNDER_AGE_REASON = 'under-age'
export const UNDER_AGE_WINDOW_S = 24 * 3600

/** Whether an account created at `createdAt` (ISO) is still inside the under-age window. Fails closed. */
export function newAccount(createdAt: unknown, nowS: number, windowS = UNDER_AGE_WINDOW_S): boolean {
  const t = typeof createdAt === 'string' ? Date.parse(createdAt) / 1000 : NaN
  return Number.isFinite(t) && t <= nowS + SKEW_S && nowS - t < windowS
}

/** The payload of a JWT, decoded without checking it. The function only reads it after Auth
 *  has verified the token; the app only uses it to skip a call that would be refused. */
export function jwtPayload(jwt: string): unknown {
  const part = jwt.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4)
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))))
  } catch {
    return null
  }
}
