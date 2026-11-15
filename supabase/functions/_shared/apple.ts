/**
 * Revoking Tilo's Sign in with Apple when an account is deleted (docs/plans/native-sign-in-with-apple.md,
 * increment (a); Apple asks apps that offer account deletion to revoke the user's tokens).
 *
 * No Apple token is stored anywhere. Deleting an account with an Apple identity asks the person to sign
 * in with Apple again (apps/native/lib/account/Delete.tsx), which gives the app a fresh one-time
 * `authorizationCode`. The app sends it with the delete request; delete-account then:
 * 1. makes a client secret (an ES256 JWT signed with the Sign in with Apple key);
 * 2. exchanges the code at Apple's /auth/token for a refresh token;
 * 3. checks that the `sub` of the id_token in that reply is this account's own Apple identity (a code
 *    from another Apple ID is never used to revoke that person's sign-in);
 * 4. revokes the refresh token at /auth/revoke.
 * Any failure gives 'failed' and the deletion goes ahead (erasure comes first); the app then tells
 * the person they can remove Tilo in their Apple Account settings. The code, the tokens and the
 * Apple user id are never logged or returned.
 *
 * Pure TS with no imports, using WebCrypto and an injected fetch, so Deno and Node both load it
 * (scripts/wellbeing/apple.ts tests it against a stand-in for Apple).
 */

export const APPLE_AUTH = 'https://appleid.apple.com'

/** How long each call to Apple may take: the deletion waits for it, so it's short. */
export const APPLE_TIMEOUT_MS = 5000

/** An authorization code as the app sends it: printable ASCII, no spaces, bounded (Apple's are ~64). */
export const isAppleCode = (c: unknown): c is string => typeof c === 'string' && /^[\x21-\x7e]{10,300}$/.test(c)

export interface AppleConfig { teamId: string; keyId: string; privateKey: string; clientId: string }

/** The four Edge Function secrets (plan, "What Benn does" step 3), or null when any is missing. */
export function appleConfig(env: (k: string) => string | undefined): AppleConfig | null {
  const teamId = env('APPLE_TEAM_ID'), keyId = env('APPLE_KEY_ID'), privateKey = env('APPLE_PRIVATE_KEY'), clientId = env('APPLE_CLIENT_ID')
  return teamId && keyId && privateKey && clientId ? { teamId, keyId, privateKey, clientId } : null
}

/** An account's Apple user id (Supabase's identity for provider 'apple'), or null when it has none. */
export function appleSub(user: { identities?: { provider?: string; id?: string; provider_id?: string; identity_data?: Record<string, unknown> | null }[] | null } | null | undefined): string | null {
  const i = user?.identities?.find((x) => x?.provider === 'apple')
  if (!i) return null
  const s = i.identity_data?.sub ?? i.provider_id ?? i.id
  return typeof s === 'string' && s ? s : null
}

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlJson = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)))

/** The JWT payload of an id_token, unverified: only ever read from Apple's own TLS reply. */
function payloadOf(jwt: unknown): Record<string, unknown> | null {
  if (typeof jwt !== 'string') return null
  const p = jwt.split('.')
  if (p.length !== 3) return null
  try {
    const s = atob(p[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((p[1].length + 3) % 4))
    const o = JSON.parse(s)
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

/** The client secret Apple's token and revoke endpoints ask for: ES256, {iss team, iat, exp, aud, sub client}. */
export async function appleClientSecret(cfg: AppleConfig, nowS: number): Promise<string> {
  const b64 = cfg.privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const head = b64urlJson({ alg: 'ES256', kid: cfg.keyId }) + '.' +
    b64urlJson({ iss: cfg.teamId, iat: nowS, exp: nowS + 300, aud: APPLE_AUTH, sub: cfg.clientId })
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head)))
  return head + '.' + b64url(sig)
}

export type AppleRevoke = 'revoked' | 'failed'
/** Why it failed, for the function's log: a step name only, never a value. */
export type AppleStep = 'config' | 'secret' | 'token' | 'mismatch' | 'revoke' | 'no_code'

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ status: number; json: () => Promise<unknown> }>

/**
 * Exchange the code, check it belongs to `expectSub`, revoke. Never throws; never waits more than
 * twice APPLE_TIMEOUT_MS.
 */
export async function revokeApple(code: string, expectSub: string, cfg: AppleConfig | null, nowS: number, fetchFn: Fetch, timeoutMs = APPLE_TIMEOUT_MS): Promise<{ result: AppleRevoke; step?: AppleStep }> {
  if (!cfg) return { result: 'failed', step: 'config' }
  let secret: string
  try { secret = await appleClientSecret(cfg, nowS) } catch { return { result: 'failed', step: 'secret' } }
  const form = (o: Record<string, string>) => new URLSearchParams(o).toString()
  const post = (path: string, body: string) => fetchFn(APPLE_AUTH + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  })

  let refresh: unknown, idToken: unknown
  try {
    const r = await post('/auth/token', form({ client_id: cfg.clientId, client_secret: secret, code, grant_type: 'authorization_code' }))
    if (r.status !== 200) return { result: 'failed', step: 'token' }
    const j = (await r.json().catch(() => null)) as { refresh_token?: unknown; id_token?: unknown } | null
    refresh = j?.refresh_token; idToken = j?.id_token
  } catch {
    return { result: 'failed', step: 'token' }
  }
  if (typeof refresh !== 'string' || !refresh) return { result: 'failed', step: 'token' }
  const claims = payloadOf(idToken)
  // the code must be this account's Apple ID, issued to this app
  if (!claims || claims.sub !== expectSub || claims.aud !== cfg.clientId) return { result: 'failed', step: 'mismatch' }

  try {
    const r = await post('/auth/revoke', form({ client_id: cfg.clientId, client_secret: secret, token: refresh, token_type_hint: 'refresh_token' }))
    return r.status === 200 ? { result: 'revoked' } : { result: 'failed', step: 'revoke' }
  } catch {
    return { result: 'failed', step: 'revoke' }
  }
}
