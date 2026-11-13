/* N12 (native-build-plan): reminders to the iPhone app through Apple's push service. The phone has
   no service worker, so the server applies public/sw.js's display rules itself
   (supabase/functions/_shared/apns.ts shownCopy): this runs the real sw.js push handler in a
   sandbox and checks the phone would show the same words for every reminder the function sends.
   Also the provider token (ES256, verified with WebCrypto), the request shape, the migration
   (written, not applied) and the function's dispatch (written, not deployed).
   Run from scripts/test-wellbeing.ts; returns the number of failures. */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { MIND_KINDS, payloadFor, REMINDER_COPY, suppPayload } from '../../supabase/functions/_shared/reminders'
import {
  APNS_EXPIRY_S, APNS_HOSTS, APNS_JWT_WINDOW_S, APNS_THREAD, APNS_TOPIC, apnsBody, apnsGone, apnsHeaders, apnsIat, apnsJwt, apnsKey, apnsTokenRefused, forApns, isApns, isApnsToken, shownCopy,
} from '../../supabase/functions/_shared/apns'
import { USER_TABLES } from '../../supabase/functions/_shared/account'

/** public/sw.js's push handler, run as the browser would: what showNotification receives. */
function swShows(payload: unknown): { title: string; body: string; tag: string } {
  const handlers: Record<string, (e: unknown) => void> = {}
  const shown: { title: string; body: string; tag: string }[] = []
  const self = {
    addEventListener: (t: string, f: (e: unknown) => void) => { handlers[t] = f },
    registration: { showNotification: (title: string, o: { body: string; tag: string }) => { shown.push({ title, body: o.body, tag: o.tag }); return Promise.resolve() } },
    location: { href: 'https://app.tilo.fit/sw.js', origin: 'https://app.tilo.fit' },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  }
  const ctx = vm.createContext({ self, caches: {}, clients: self.clients, indexedDB: undefined, URL, Promise, console, Response, Request, fetch: () => Promise.reject(new Error('offline')) })
  vm.runInContext(readFileSync('public/sw.js', 'utf8'), ctx)
  handlers.push({ data: { json: () => payload }, waitUntil: () => undefined })
  return shown[0]
}

export async function apnsSuite(): Promise<number> {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'native push:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- the same words as the service worker ---------- */
  const review = { title: 'Your week is ready', body: 'Take a look whenever suits you.', tag: 'tali-review', url: './?review=1', icon: '/icon-192.png' }
  const named = suppPayload({ lockNames: true }, [{ name: 'Vitamin D', time: '08:00' }, { name: 'Magnesium', time: '08:00' }], '08:00', { 'mind.lockNames': '2026-10-10T00:00:00Z' })
  const payloads: [string, unknown][] = [
    ...MIND_KINDS.map((k) => [k, payloadFor(k)] as [string, unknown]),
    ['supplement (generic)', suppPayload({}, [{ name: 'Vitamin D', time: '08:00' }], '08:00')],
    ['supplement (names on)', named],
    ['weekly review', review],
    // what an older server or a forged payload might send: the worker's rules still decide
    ['a Mind tag with other words', { title: 'You slept badly', body: 'Mood 1/5', tag: 'tali-checkin' }],
    ['a supplement name without the named tag', { title: 'Vitamin D', body: 'Vitamin D', tag: 'tali-supp' }],
    ['no tag at all', { title: 'Sertraline', body: 'Sertraline 50mg' }],
    ['an old supp- tag', { title: 'x', body: 'Iron', tag: 'supp-0800' }],
    ['the named tag with an empty body', { title: 'Supplement reminder', body: '  ', tag: 'tali-supp-named' }],
    ['a long named body', { title: 'x', body: 'Iron, '.repeat(100), tag: 'tali-supp-named' }],
    ['an empty payload', {}],
  ]
  for (const [name, p] of payloads) {
    const w = swShows(p)
    const s = shownCopy(p)
    ok(`same words as sw.js: ${name}`, !!w && w.title === s.title && w.body === s.body && w.tag === s.tag, { sw: w, phone: s })
  }
  ok('which reminder it is: the three Mind types, supplements, the review',
    MIND_KINDS.every((k) => shownCopy(payloadFor(k)).kind === k) && shownCopy(named).kind === 'supp'
    && shownCopy(suppPayload({}, [], '08:00')).kind === 'supp' && shownCopy(review).kind === 'review')
  ok('a forged Mind payload still shows only the fixed copy', shownCopy({ title: 'x', body: 'Mood 1/5', tag: 'tali-plan' }).body === REMINDER_COPY.plan.body)
  ok('no prototype tag is mistaken for a Mind type', shownCopy({ tag: 'constructor', body: 'b' }).kind === 'other' && shownCopy({ tag: 'toString', body: 'b' }).body === 'b')

  /* ---------- the request ---------- */
  const s = shownCopy(payloadFor('checkin'))
  const body = JSON.parse(apnsBody(s))
  ok('body: alert with the fixed copy, a sound, one lock-screen group for every reminder (as web push), no badge',
    body.aps.alert.title === 'Tilo' && body.aps.alert.body === REMINDER_COPY.checkin.body && body.aps.sound === 'default'
    && body.aps['thread-id'] === APNS_THREAD && JSON.parse(apnsBody(shownCopy(review))).aps['thread-id'] === APNS_THREAD && !('badge' in body.aps) && !('content-available' in body.aps) && !('mutable-content' in body.aps))
  ok('body: the app gets the type and tag (for the delivery log and the tap), nothing else',
    JSON.stringify(body.body) === JSON.stringify({ kind: 'checkin', tag: 'tali-checkin' }) && Object.keys(body).join() === 'aps,body')
  const h = apnsHeaders(s, 'JWT', Date.parse('2026-11-13T08:30:00Z'))
  ok('headers: an alert for fit.tilo.app, sent now, kept by Apple for an hour at most, replacing an unread one with the same tag',
    h['apns-expiration'] === String(Date.parse('2026-11-13T08:30:00Z') / 1000 + 3600) && APNS_EXPIRY_S === 3600 && h.authorization === 'bearer JWT' && h['apns-push-type'] === 'alert' && h['apns-priority'] === '10' && h['apns-topic'] === APNS_TOPIC
    && APNS_TOPIC === JSON.parse(readFileSync('apps/native/app.json', 'utf8')).expo.ios.bundleIdentifier && h['apns-collapse-id'] === 'tali-checkin')
  ok('hosts: production and sandbox gateways', APNS_HOSTS.apns === 'https://api.push.apple.com' && APNS_HOSTS['apns-sandbox'] === 'https://api.sandbox.push.apple.com'
    && isApns('apns') && isApns('apns-sandbox') && !isApns('web') && !isApns(undefined) && !isApns('__proto__'))
  ok('tokens: lower-case hex only', isApnsToken('ab'.repeat(32)) && !isApnsToken('AB'.repeat(32)) && !isApnsToken('ab'.repeat(31)) && !isApnsToken('https://x/y') && !isApnsToken('../'.repeat(30)))
  ok('a dead token\'s row goes (410 only: a 400 can be our own setup, which would delete every phone\'s row)',
    apnsGone(410, 'Unregistered') && !apnsGone(400, 'BadDeviceToken') && !apnsGone(400, 'DeviceTokenNotForTopic')
    && !apnsGone(400, 'PayloadTooLarge') && !apnsGone(403, 'ExpiredProviderToken') && !apnsGone(429, 'TooManyRequests') && !apnsGone(500, null))
  ok('supplement names never go to a phone unless names over APNs are switched on (DPIA 8.8 addendum)',
    forApns(named).body === REMINDER_COPY.supp.body && forApns(named).title === REMINDER_COPY.supp.title && forApns(named).tag === 'tali-supp'
    && forApns(named, true).body === 'Vitamin D, Magnesium' && forApns(payloadFor('checkin')).body === REMINDER_COPY.checkin.body && forApns(review).body === review.body)
  ok('a refused provider token is dropped (expired or invalid), nothing else drops it',
    apnsTokenRefused(403, 'ExpiredProviderToken') && apnsTokenRefused(403, 'InvalidProviderToken') && !apnsTokenRefused(403, 'Forbidden') && !apnsTokenRefused(410, 'Unregistered'))
  ok('the largest payload fits APNs\'s 4 KB', apnsBody(shownCopy({ tag: 'tali-supp-named', body: 'x'.repeat(5000) })).length < 4096)

  /* ---------- the provider token ---------- */
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n') + '\n-----END PRIVATE KEY-----\n'
  const iat = apnsIat(Date.parse('2026-11-13T09:47:12Z'))
  const jwt = await apnsJwt(await apnsKey(pem), 'KEY123', 'M8R77TCYF8', iat)
  const [h64, c64, sig64] = jwt.split('.')
  const dec = (x: string) => JSON.parse(Buffer.from(x, 'base64url').toString())
  const verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, Buffer.from(sig64, 'base64url'), new TextEncoder().encode(h64 + '.' + c64))
  ok('JWT: ES256 with the key id, the team as issuer, a valid signature',
    JSON.stringify(dec(h64)) === JSON.stringify({ alg: 'ES256', kid: 'KEY123' }) && JSON.stringify(dec(c64)) === JSON.stringify({ iss: 'M8R77TCYF8', iat })
    && Buffer.from(sig64, 'base64url').length === 64 && verified && !/[+/=]/.test(jwt))
  ok('JWT: the issue time holds for 30 minutes (Apple refuses refreshes more often than every 20, accepts a token for 60)',
    APNS_JWT_WINDOW_S === 1800 && iat === Date.parse('2026-11-13T09:30:00Z') / 1000
    && apnsIat(Date.parse('2026-11-13T09:59:59Z')) === iat && apnsIat(Date.parse('2026-11-13T10:00:00Z')) === iat + 1800)

  /* ---------- the function (written, not deployed) ---------- */
  const fn = readFileSync('supabase/functions/send-supplement-reminders/index.ts', 'utf8')
  ok('function: a phone row goes through APNs, every other row through Web Push as before',
    /if \(isApns\(sub\.platform\)\) return sendApns\(sub, payload\);/.test(fn) && /webpush as any\)\.sendNotification\(/.test(fn)
    && fn.indexOf('return sendApns(sub, payload)') < fn.indexOf('.sendNotification('))
  ok('function: the phone gets the service worker\'s words (shownCopy), sent to its own token and gateway',
    /const shown = forApns\(payload, APNS_SUPP_NAMES\);/.test(fn) && /const APNS_SUPP_NAMES = Deno\.env\.get\("APNS_SUPP_NAMES"\) === "on";/.test(fn) && /fetch\(`\$\{APNS_HOSTS\[sub\.platform\]\}\/3\/device\/\$\{sub\.endpoint\}`/.test(fn)
    && /headers: apnsHeaders\(shown, jwt, Date\.now\(\)\)/.test(fn) && /if \(apnsTokenRefused\(res\.status, reason\)\) apnsToken = null;/.test(fn) && /body: apnsBody\(shown\)/.test(fn) && /!isApnsToken\(sub\.endpoint\)/.test(fn))
  ok('function: a dead token\'s row is deleted by id, as Web Push 404/410', /if \(apnsGone\(res\.status, reason\)\) \{\s*await supabase\.from\("push_subscriptions"\)\.delete\(\)\.eq\("id", sub\.id\);/.test(fn))
  ok('function: the key and token are kept for the window, secrets from the environment only',
    /Deno\.env\.get\("APNS_KEY_P8"\)/.test(fn) && /apnsToken\.iat === iat/.test(fn) && !/BEGIN PRIVATE KEY/.test(fn))
  ok('function: works before the migration (no platform column: every row is Web Push)', /error\?\.code === "42703"/.test(fn))
  ok('function: the budget is unchanged (same claims, same order, one send() for both kinds of row)',
    (fn.match(/await send\(sub, /g) || []).length === 3 && !/sendApns\(sub, payloadFor/.test(fn))

  /* ---------- the migration (written, not applied) ---------- */
  const sql = readFileSync('docs/migrations/2026-11-13-native-push.sql', 'utf8')
  const code = sql.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n')
  ok('migration: a platform column, web by default, only the three values',
    /add column if not exists platform text not null default 'web'/.test(code) && /check \(platform in \('web', 'apns', 'apns-sandbox'\)\)/.test(code))
  ok('migration: Web Push rows keep their keys; phone rows are a hex token with no keys',
    /alter column p256dh drop not null/.test(code) && /alter column auth_key drop not null/.test(code)
    && /platform = 'web' and p256dh is not null and auth_key is not null/.test(code)
    && /platform in \('apns', 'apns-sandbox'\) and p256dh is null and auth_key is null and endpoint ~ '\^\[0-9a-f\]\{64,200\}\$'/.test(code))
  ok('migration: grants written out, nothing for anon, no loosening of RLS',
    /revoke all on public\.push_subscriptions from anon;/.test(code) && /grant select, insert, update, delete on public\.push_subscriptions to authenticated, service_role;/.test(code)
    && !/create policy|alter policy|drop policy/i.test(code) && !/disable row level security/i.test(code) && !/grant[^;]*to anon/i.test(code))
  ok('migration: one token, one account (a phone row replaces another account\'s row for the same token), definer with an empty search path, no one can call it',
    /create or replace function public\.push_token_one_account\(\)\s*returns trigger\s*language plpgsql\s*security definer\s*set search_path = ''/.test(code)
    && /delete from public\.push_subscriptions p\s*where p\.endpoint = new\.endpoint\s*and p\.platform in \('apns', 'apns-sandbox'\)\s*and p\.user_id <> new\.user_id;/.test(code)
    && /if new\.platform in \('apns', 'apns-sandbox'\) then/.test(code)
    && /revoke all on function public\.push_token_one_account\(\) from public, anon, authenticated;/.test(code)
    && /create trigger push_token_one_account before insert or update of endpoint, platform, user_id on public\.push_subscriptions/.test(code))
  ok('the same table: consent trigger, withdrawal clear, purge and account deletion already cover phone rows',
    (USER_TABLES as readonly string[]).includes('push_subscriptions') && !/create table/i.test(code))
  return bad
}
