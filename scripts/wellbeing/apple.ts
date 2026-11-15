/* Sign in with Apple revocation on account deletion (docs/plans/native-sign-in-with-apple.md,
   increment (a)): supabase/functions/_shared/apple.ts against a stand-in for Apple's /auth/token and
   /auth/revoke (never the real Apple or the real Supabase), the client secret verified with
   WebCrypto, delete-account's wiring read from its source (written, not deployed), and the app's
   side in src/data/account.ts (the code sent, a failed revocation reported).
   Run from scripts/test-wellbeing.ts; returns the number of failures. */
import { readFileSync } from 'node:fs'
import { APPLE_AUTH, appleClientSecret, appleConfig, appleSub, isAppleCode, revokeApple, type AppleConfig } from '../../supabase/functions/_shared/apple'
import { deleteAccount, type DeleteDeps } from '../../src/data/account'

const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64')
const b64urlDecode = (s: string) => new Uint8Array(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
const fakeJwt = (claims: object) => 'e30.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.sig'

export async function appleRevokeSuite(): Promise<number> {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'apple revoke:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const pem = '-----BEGIN PRIVATE KEY-----\n' + b64(pkcs8).replace(/(.{64})/g, '$1\n') + '\n-----END PRIVATE KEY-----\n'
  const cfg: AppleConfig = { teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: pem, clientId: 'fit.tilo.app' }
  const SUB = '001234.abcdef0123456789.1234'
  const CODE = 'c0ffee1234567890abcdef.0.rstu.AbCdEfGhIjKlMn'
  const now = 1_800_000_000

  /* ---------- the client secret ---------- */
  const secret = await appleClientSecret(cfg, now)
  const [h, p, s] = secret.split('.')
  const head = JSON.parse(Buffer.from(h, 'base64url').toString())
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString())
  const verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, b64urlDecode(s), new TextEncoder().encode(h + '.' + p))
  ok('client secret: ES256 with the key id', head.alg === 'ES256' && head.kid === cfg.keyId, head)
  ok('client secret: iss team, sub client, aud Apple, 5 minutes', claims.iss === cfg.teamId && claims.sub === cfg.clientId && claims.aud === APPLE_AUTH && claims.iat === now && claims.exp === now + 300, claims)
  ok('client secret: the signature verifies with the public key', verified)

  /* ---------- a stand-in for Apple ---------- */
  type Call = { url: string; body: URLSearchParams }
  const apple = (o: { tokenStatus?: number; sub?: string; aud?: string; refresh?: string | null; revokeStatus?: number; throwOn?: 'token' | 'revoke' } = {}) => {
    const calls: Call[] = []
    const fetchFn = async (url: string, init: { body: string }) => {
      const body = new URLSearchParams(init.body)
      calls.push({ url, body })
      if (url.endsWith('/auth/token')) {
        if (o.throwOn === 'token') throw new Error('timeout')
        return { status: o.tokenStatus ?? 200, json: async () => ({ access_token: 'a', token_type: 'Bearer', expires_in: 3600, ...(o.refresh === null ? {} : { refresh_token: o.refresh ?? 'r-token' }), id_token: fakeJwt({ iss: APPLE_AUTH, sub: o.sub ?? SUB, aud: o.aud ?? cfg.clientId }) }) }
      }
      if (url.endsWith('/auth/revoke')) {
        if (o.throwOn === 'revoke') throw new Error('timeout')
        return { status: o.revokeStatus ?? 200, json: async () => ({}) }
      }
      return { status: 404, json: async () => null }
    }
    return { calls, fetchFn }
  }

  const a = apple()
  const r = await revokeApple(CODE, SUB, cfg, now, a.fetchFn)
  ok('revoked: the code exchanged, then the refresh token revoked', r.result === 'revoked' && a.calls.length === 2 && a.calls[0].url === APPLE_AUTH + '/auth/token' && a.calls[1].url === APPLE_AUTH + '/auth/revoke', { r, calls: a.calls.map((c) => c.url) })
  ok('token request: client id, a secret, the code, authorization_code', a.calls[0].body.get('client_id') === cfg.clientId && a.calls[0].body.get('code') === CODE && a.calls[0].body.get('grant_type') === 'authorization_code' && (a.calls[0].body.get('client_secret') ?? '').split('.').length === 3)
  ok('revoke request: the refresh token, hinted', a.calls[1].body.get('token') === 'r-token' && a.calls[1].body.get('token_type_hint') === 'refresh_token' && a.calls[1].body.get('client_id') === cfg.clientId)

  const other = apple({ sub: '009999.other.0001' })
  const rOther = await revokeApple(CODE, SUB, cfg, now, other.fetchFn)
  ok('another Apple ID: not revoked (mismatch), nothing sent to /auth/revoke', rOther.result === 'failed' && rOther.step === 'mismatch' && other.calls.length === 1, { rOther, n: other.calls.length })
  const aud = apple({ aud: 'com.someone.else' })
  const rAud = await revokeApple(CODE, SUB, cfg, now, aud.fetchFn)
  ok('a code issued to another app: mismatch, not revoked', rAud.result === 'failed' && rAud.step === 'mismatch' && aud.calls.length === 1)

  const cases: [string, Parameters<typeof apple>[0], string][] = [
    ['Apple refuses the code (400 invalid_grant)', { tokenStatus: 400 }, 'token'],
    ['no refresh token in the reply', { refresh: null }, 'token'],
    ['Apple unreachable at /auth/token', { throwOn: 'token' }, 'token'],
    ['revoke refused', { revokeStatus: 400 }, 'revoke'],
    ['Apple unreachable at /auth/revoke', { throwOn: 'revoke' }, 'revoke'],
  ]
  for (const [name, o, step] of cases) {
    const x = apple(o)
    const rx = await revokeApple(CODE, SUB, cfg, now, x.fetchFn)
    ok(`${name}: 'failed' at ${step}, never throws`, rx.result === 'failed' && rx.step === step, rx)
  }
  const none = apple()
  const rNone = await revokeApple(CODE, SUB, null, now, none.fetchFn)
  ok('secrets missing: failed at config, Apple not called', rNone.result === 'failed' && rNone.step === 'config' && none.calls.length === 0)
  const rKey = await revokeApple(CODE, SUB, { ...cfg, privateKey: 'not a key' }, now, apple().fetchFn)
  ok('a broken key: failed at secret', rKey.result === 'failed' && rKey.step === 'secret', rKey)

  /* ---------- small helpers ---------- */
  ok('config: all four secrets, else null', !!appleConfig((k) => ({ APPLE_TEAM_ID: 't', APPLE_KEY_ID: 'k', APPLE_PRIVATE_KEY: 'p', APPLE_CLIENT_ID: 'c' } as Record<string, string>)[k]) && appleConfig((k) => (k === 'APPLE_KEY_ID' ? undefined : 'x')) === null)
  ok('code shape: printable, 10 to 300, no spaces', isAppleCode(CODE) && !isAppleCode('short') && !isAppleCode('has a space here') && !isAppleCode('x'.repeat(301)) && !isAppleCode(42))
  ok('Apple identity read from Auth (identity_data.sub, else provider_id)', appleSub({ identities: [{ provider: 'email', id: 'e' }, { provider: 'apple', identity_data: { sub: SUB } }] }) === SUB &&
    appleSub({ identities: [{ provider: 'apple', provider_id: 'pid' }] }) === 'pid' && appleSub({ identities: [{ provider: 'google', id: 'g' }] }) === null && appleSub(null) === null)

  /* ---------- delete-account wiring (written, not deployed) ---------- */
  const fn = readFileSync('supabase/functions/delete-account/index.ts', 'utf8')
  const iRows = fn.indexOf('for (const t of TABLES)'), iApple = fn.indexOf('revokeApple('), iUser = fn.indexOf('deleteUser(uid')
  ok('function: revokes after the rows, before the login', iRows > 0 && iApple > iRows && iUser > iApple, { iRows, iApple, iUser })
  ok('function: a malformed apple_code is a bad request', /body\.apple_code !== undefined && !isAppleCode\(body\.apple_code\)\) return fail\('bad_request'\)/.test(fn))
  ok('function: the Apple id comes from Auth\'s answer, not the request', /appleSub\(who\.data\.user\)/.test(fn))
  const logs = fn.match(/log\([^)]*\)/g) ?? []
  ok('function: nothing Apple-specific is logged but the step and the outcome', logs.every((l) => !/apple_code|appleId|body\.|refresh|id_token/.test(l)), logs)
  ok('function: answers apple only for an Apple account', /json\(\{ ok: true, \.\.\.\(apple \? \{ apple \} : \{\}\) \}/.test(fn))

  /* ---------- the app (src/data/account.ts) ---------- */
  let sent: unknown[] = []
  const deps = (body: unknown): DeleteDeps => ({
    online: () => true, hasSession: () => true, fresh: () => true, accountMatches: () => true,
    call: async (...args) => { sent = args; return { status: 200, body } }, wipe: () => {}, signOut: async () => {},
  })
  const d1 = await deleteAccount(deps({ ok: true, apple: 'failed' }), undefined, CODE)
  ok('app: the code goes with the delete', sent[1] === CODE, sent)
  ok('app: a failed revocation is reported (appleKept)', d1.status === 'ok' && 'appleKept' in d1 && d1.appleKept === true, d1)
  const d2 = await deleteAccount(deps({ ok: true, apple: 'revoked' }), undefined, CODE)
  ok('app: revoked, nothing more to say', d2.status === 'ok' && !('appleKept' in d2), d2)
  const d3 = await deleteAccount(deps({ ok: true }))
  ok('app: no Apple, no code sent and nothing reported', sent[1] === undefined && d3.status === 'ok' && !('appleKept' in d3))
  const src = readFileSync('src/data/account.ts', 'utf8')
  ok('app: the request body names it apple_code', /apple_code: appleCode/.test(src))

  return bad
}
