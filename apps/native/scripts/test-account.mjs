/**
 * Unit tests for N2's pure account logic (apps/native/lib/account): the gate's order, the backup
 * check, the delete confirm word, the tilo://auth-callback code, the sign-in photo's size and crop. The flows
 * themselves are checked against the web in scripts/e2e-account-parity.cjs.
 *   (apps/native) npm run test:account
 */
import { readFileSync } from 'node:fs'
import { GoTrueClient } from '@supabase/auth-js'
import { readBackup } from '../../../src/data/backup.native.ts'
import { appleAlways, codeFrom, coverFrame, failureOf, isNetworkError, photoHeight, reauthMatches, reauthWays, typedOk } from '../lib/account/rules.ts'
import { gateStep, pendingFor } from '../lib/account/gateModel.ts'
import { exchangeOnceMore, verifierKey, RETRY_PAUSE_MS } from '../lib/account/exchange.ts'

let failed = 0
let passed = 0
const check = (name, ok) => { if (ok) passed++; else { failed++; console.error('FAIL', name) } }
const file = (text) => ({ text: async () => text })
const rejects = async (p, msg) => { try { await p; return false } catch (e) { return e.message === msg } }

/* ---------- backups: the web's readBackup check ---------- */
check('backup: a state with days', (await readBackup(file('{"days":{"2026-11-01":{}},"profile":{}}'))).days['2026-11-01'] !== undefined)
check('backup: empty days is still a backup', !!(await readBackup(file('{"days":{}}'))))
check('backup: no days is not', await rejects(readBackup(file('{"hello":1}')), 'invalid'))
check('backup: days that are not an object', await rejects(readBackup(file('{"days":3}')), 'invalid'))
check('backup: null', await rejects(readBackup(file('null')), 'invalid'))
check('backup: not JSON', await rejects(readBackup(file('not json')), 'unreadable'))
check('backup: a file that can’t be read', await rejects(readBackup({ text: async () => { throw new Error('x') } }), 'unreadable'))

/* ---------- delete confirm (board ob6-6) ---------- */
for (const ok of ['DELETE', 'delete', ' Delete ']) check(`typed: ${JSON.stringify(ok)} confirms`, typedOk(ok))
for (const no of ['', 'DELET', 'delete it', 'REMOVE', 'DELETE!']) check(`typed: ${JSON.stringify(no)} doesn't`, !typedOk(no))

/* ---------- tilo://auth-callback ---------- */
check('callback: the code', codeFrom('tilo://auth-callback?code=abc').code === 'abc')
check('callback: an error in the query', codeFrom('tilo://auth-callback?error=access_denied&error_description=Denied').why === 'Denied')
check('callback: an error after #', codeFrom('tilo://auth-callback#error_description=Link%20expired').why === 'Link expired')
check('callback: the short error code for the log, never the description (it can hold the provider\'s code)', codeFrom('tilo://auth-callback?error=server_error&error_code=unexpected_failure&error_description=Unable%20to%20exchange%20external%20code%3A%20abc123').errCode === 'unexpected_failure' && codeFrom('tilo://auth-callback?error=access_denied').errCode === 'access_denied' && codeFrom('tilo://auth-callback?code=x').errCode === null)
check('callback: neither', (() => { const r = codeFrom('tilo://auth-callback'); return r.code === null && r.why === null })())

/* ---------- the sign-in photo (.auth2-photo) ---------- */
check('photo: sign-in is 48% of the screen', photoHeight('signin', 844) === 844 * 0.48)
check('photo: create account 36%, at least 200', photoHeight('signup', 844) === 844 * 0.36 && photoHeight('signup', 400) === 200)
check('photo: email steps 52%, at least 260', photoHeight('forgot', 844) === 844 * 0.52 && photoHeight('check-email', 300) === 260)
const f = coverFrame(928, 1152, 390, 405)
check('crop: fills the width', Math.abs(f.width - 390) < 1e-9 && f.left === 0)
check('crop: 30% of the overflow cut from the top', Math.abs(f.top + (f.height - 405) * 0.3) < 1e-9 && f.height > 405)
const g = coverFrame(928, 1152, 390, 600)
check('crop: a tall box fills the height, centred', Math.abs(g.height - 600) < 1e-9 && g.left < 0 && Math.abs(g.top) < 1e-9)

/* ---------- the gate, in App.tsx's order ---------- */
const base = { ready: true, ownerAsk: false, signedIn: true, pendingDeletion: false, underAge: false, consentOpen: false, consentDue: false }
const all = { ready: false, ownerAsk: true, signedIn: false, pendingDeletion: true, underAge: true, consentOpen: true, consentDue: true }
check('gate: the app when nothing is due', gateStep(base) === null)
check('gate: loading before anything', gateStep(all) === 'loading')
check('gate: the owner question before sign-in', gateStep({ ...all, ready: true }) === 'owner')
check('gate: sign-in next', gateStep({ ...all, ready: true, ownerAsk: false }) === 'sign-in')
check('gate: a pending under-18 deletion before the stop', gateStep({ ...base, pendingDeletion: true, underAge: true, consentDue: true }) === 'deleting')
check('gate: the 18+ stop before consent', gateStep({ ...base, underAge: true, consentDue: true, consentOpen: true }) === 'under-age')
check('gate: consent from Profile', gateStep({ ...base, consentOpen: true, consentDue: true }) === 'consent-profile')
check('gate: consent until answered', gateStep({ ...base, consentDue: true }) === 'consent')
check('gate: signed out never reaches consent or the app', gateStep({ ...base, signedIn: false }) === 'sign-in')
check('pending: none', !pendingFor(null, { authed: true, sessionUid: 'a', owner: 'a' }))
check('pending: the live session’s account', pendingFor('a', { authed: true, sessionUid: 'a', owner: 'b' }))
check('pending: not another session’s', !pendingFor('a', { authed: true, sessionUid: 'b', owner: 'a' }))
check('pending: offline, this phone’s owner', pendingFor('a', { authed: false, sessionUid: null, owner: 'a' }))
check('pending: offline, not another owner’s', !pendingFor('a', { authed: false, sessionUid: null, owner: 'b' }))

/* ---------- re-sign-in before deleting: the same account ---------- */
check('reauth: the same account', reauthMatches('a', 'a'))
check('reauth: another account is refused', !reauthMatches('a', 'b'))
check('reauth: no recorded owner (the deletion checks it again)', reauthMatches(undefined, 'b'))
check('reauth: compared with the owner, not the signed-out fallback', reauthMatches('a', 'a') && !reauthMatches('00000000-0000-0000-0000-000000000001', 'a'))

/* ---------- how to re-confirm before deleting ---------- */
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
check('ways: email', eq(reauthWays(['email'], true), ['password']))
check('ways: Google', eq(reauthWays(['google'], true), ['google']))
check('ways: Apple on iOS', eq(reauthWays(['apple'], true), ['apple']))
check('ways: Google that linked Apple offers both', eq(reauthWays(['google', 'apple'], true), ['apple', 'google']))
check('ways: Apple where Apple isn’t offered falls back to the password', eq(reauthWays(['apple'], false), ['password']))
check('ways: no provider known: the password', eq(reauthWays([], true), ['password']))
check('apple always: an Apple account on iOS', appleAlways(['email', 'apple'], true) && !appleAlways(['email'], true) && !appleAlways(['apple'], false))

// sign-in errors: the connection or the sign-in itself (no raw native errors on screen; lead, 15 Nov)
const net = [
  { name: 'AuthRetryableFetchError', message: 'anything', status: 0 },
  { message: 'fetch failed: Could not connect to the server.' },
  { message: 'Network request failed' },
  { message: 'Failed to fetch' },
  { message: 'The Internet connection appears to be offline.' },
  { message: 'The network connection was lost.' },
  { message: 'The request timed out.' },
]
check('network: what Expo, iOS, React Native and supabase-js say for no connection', net.every(isNetworkError))
const notNet = [
  { name: 'AuthApiError', message: 'Invalid login credentials', status: 400 },
  { message: 'Unsupported provider: provider is not enabled' },
  { name: 'AppleSignInFailed', message: 'Sign in with Apple failed (com.apple.AuthenticationServices.AuthorizationError 1000)' },
  { message: 'invalid flow state, no valid flow state found' },
  null, undefined, {},
]
check('not network: account answers, Apple 1000, a provider off, nothing', notNet.every((e) => !isNetworkError(e)))
check('failure kind', failureOf(net[1]) === 'network' && failureOf(notNet[2]) === 'failed' && failureOf(null) === 'failed')

const authSrc = readFileSync(new URL('../lib/account/Auth.tsx', import.meta.url), 'utf8')
check('sign-in screen: no raw error on screen (Google, Apple and server errors go through the words)', !/setErr\((r|error|e)\.message\)/.test(authSrc) && /AUTH\.errGoogle/.test(authSrc) && /AUTH\.errApple/.test(authSrc) && /AUTH\.errOffline/.test(authSrc))

// Google's code exchange, once more on a dropped connection (lead, 15 Nov). The fake exchange does
// what supabase-js does: reads the verifier, then removes it whatever happens.
{
  const KEY = 'sb-test-auth-token'
  const VERIFIER = '"v3r1f13r-raw-json"'
  const net = { name: 'AuthRetryableFetchError', message: 'fetch failed: Could not connect to the server.', status: 0 }
  const api = { name: 'AuthApiError', message: 'invalid flow state, no valid flow state found', status: 404 }
  const run = async (answers, opts = {}) => {
    const mem = new Map(opts.noVerifier ? [] : [[verifierKey(KEY), VERIFIER]])
    const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { if (opts.setThrows) throw new Error('locked'); mem.set(k, v) } }
    const seen = [], pauses = []
    const exchange = async () => {
      seen.push(mem.get(verifierKey(KEY)) ?? null)
      mem.delete(verifierKey(KEY))
      const e = answers[seen.length - 1]
      return e ? { data: { session: null }, error: e } : { data: { session: { ok: true } }, error: null }
    }
    const r = await exchangeOnceMore(exchange, store, KEY, async (ms) => { pauses.push(ms); if (opts.newFlow) mem.set(verifierKey(KEY), '"another-flow"') })
    return { r, seen, pauses, left: mem.get(verifierKey(KEY)) }
  }
  const ok1 = await run([null])
  check('exchange: success, one request, no pause', ok1.seen.length === 1 && !ok1.r.error && ok1.r.retried === false && ok1.pauses.length === 0)
  const retry = await run([net, null])
  check('exchange: no answer, then the verifier put back exactly and one more request', retry.seen.length === 2 && retry.seen[1] === VERIFIER && !retry.r.error && retry.r.retried === true)
  check('exchange: a pause before the retry', retry.pauses.length === 1 && retry.pauses[0] === RETRY_PAUSE_MS)
  const twice = await run([net, net, null])
  check('exchange: only once more (two requests at most), the second failure returned', twice.seen.length === 2 && twice.r.error === net && twice.r.retried === true)
  const answered = await run([api])
  check('exchange: an answer from Supabase (used or expired code) is never retried', answered.seen.length === 1 && answered.r.error === api && answered.r.retried === false)
  const none = await run([net], { noVerifier: true })
  check('exchange: no verifier stored, nothing to retry with', none.seen.length === 1 && none.r.retried === false)
  const locked = await run([net], { setThrows: true })
  check('exchange: the verifier can\'t be put back: no retry, the first error', locked.seen.length === 1 && locked.r.error === net && locked.r.retried === false)
  const raced = await run([net], { newFlow: true })
  check('exchange: another sign-in started during the pause: its verifier is left alone, no retry', raced.seen.length === 1 && raced.r.retried === false && raced.left === '"another-flow"')
  check('exchange: the key supabase-js reads on a phone (no flow id)', verifierKey(KEY) === 'sb-test-auth-token-code-verifier')
}

// the same, through the real supabase-js on this app (its PKCE storage, its exchange), with a stand-in
// network whose first request never connects: the retry sends the very same verifier and signs in
{
  const mem = new Map()
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v) }, removeItem: (k) => { mem.delete(k) } }
  const bodies = []
  const fetchFn = async (_url, init) => {
    bodies.push(JSON.parse(init.body))
    if (bodies.length === 1) throw new TypeError('fetch failed: Could not connect to the server.')
    return new Response(JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, refresh_token: 'r', user: { id: 'u1', aud: 'authenticated' } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const client = new GoTrueClient({ url: 'https://stand-in.invalid/auth/v1', storageKey: 'sb-stand-in-auth-token', storage, flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, fetch: fetchFn })
  await client.signInWithOAuth({ provider: 'google', options: { redirectTo: 'tilo://auth-callback', skipBrowserRedirect: true } })
  const r = await exchangeOnceMore(() => client.exchangeCodeForSession('stand-in-code'), storage, 'sb-stand-in-auth-token', async () => {})
  check('exchange (real supabase-js): retried once with the same verifier, and signed in', r.retried && !r.error && !!r.data?.session && bodies.length === 2 && !!bodies[0].code_verifier && bodies[0].code_verifier === bodies[1].code_verifier && bodies[1].auth_code === 'stand-in-code')
}

console.log(failed ? `${failed} failed, ${passed} passed` : `all ${passed} passed`)
process.exit(failed ? 1 : 0)
