/**
 * Unit tests for the native platform adapters that need no phone (apps/native/lib/platform):
 * connection events, the reminder delivery log, and reminders on the phone (which reminder, where
 * a tap goes, the delivery log without a service worker, push tokens).
 *   (apps/native) npm run test:platform
 * Node runs the TypeScript directly (type stripping), so these modules import nothing from React
 * Native.
 */
import { connectionEvents, onlineFrom } from '../lib/platform/connection.ts'
import { readFileSync } from 'node:fs'
import { clearEvents, NOTIFY_KINDS, NOTIFY_MAX, recordNotifyEvent, takeEvents } from '../lib/platform/notifyStore.ts'
import { deliveryKey, mindKindOf, noteOpened, noteShown, parseSeen, reconcile, routeFor, SEEN_MAX } from '../lib/platform/notifyReconcile.ts'
import { apnsPlatform, apnsToken, deletePath, parseSaved, permFrom, tokenRow } from '../lib/platform/pushRules.ts'
import { REMINDER_COPY, SUPP_NAMED } from '../../../supabase/functions/_shared/reminders.ts'

let failed = 0
let passed = 0
const check = (name, ok) => { if (ok) passed++; else { failed++; console.error('FAIL', name) } }
const tick = () => new Promise((r) => setTimeout(r, 0))

/* ---------- connection ---------- */
check('onlineFrom: connected', onlineFrom({ isConnected: true }) === true)
check('onlineFrom: not connected', onlineFrom({ isConnected: false }) === false)
check('onlineFrom: unknown counts as online, as a browser', onlineFrom({ isConnected: null }) === true)
// reachability is never asked for, so an unreachable report (iOS with the test off) still reads by isConnected
check('onlineFrom: ignores isInternetReachable', onlineFrom({ isConnected: true, isInternetReachable: false }) === true)

{
  const ev = connectionEvents()
  const got = []
  ev.addEventListener('offline', (e) => got.push(e.type))
  ev.setOnline(false)
  ev.setOnline(false)
  check('events: offline sent once, and onLine follows', got.join() === 'offline' && ev.online() === false)
  ev.setOnline(true)
  check('events: no offline listener call for online', got.join() === 'offline' && ev.online() === true)
}

await (async () => {
  // launch with no connection: the network module reports before the store listens
  const ev = connectionEvents()
  ev.setOnline(false)
  const got = []
  ev.addEventListener('offline', (e) => got.push(e.type))
  check('missed offline: not delivered synchronously', got.length === 0)
  await tick()
  check('missed offline: handed to the first late listener', got.join() === 'offline')
  const later = []
  ev.addEventListener('offline', (e) => later.push(e.type))
  await tick()
  check('missed offline: also handed to a second late listener (each knows the state)', later.join() === 'offline' && got.join() === 'offline')
  ev.setOnline(true)
  ev.setOnline(false)
  check('after a real change, each listener hears it once', got.join() === 'offline,offline' && later.join() === 'offline,offline')
  const afterChange = []
  ev.addEventListener('offline', (e) => afterChange.push(e.type))
  await tick()
  check('missed offline: nothing replayed once a real change was heard', afterChange.length === 0)
})()

await (async () => {
  // offline then back online, both before anyone listens: only online is handed over
  const ev = connectionEvents()
  ev.setOnline(false)
  ev.setOnline(true)
  const off = []
  const on = []
  ev.addEventListener('offline', (e) => off.push(e.type))
  ev.addEventListener('online', (e) => on.push(e.type))
  await tick()
  check('missed both: offline not replayed once online again', off.length === 0)
  check('missed both: online replayed', on.join() === 'online')
})()

await (async () => {
  // missed offline, but the connection came back before the listener was added: nothing replayed
  const ev = connectionEvents()
  ev.setOnline(false)
  const off = []
  ev.dispatchEvent({ type: 'other' })
  ev.addEventListener('online', () => {}) // a listener for online exists now
  ev.setOnline(true)
  ev.addEventListener('offline', (e) => off.push(e.type))
  await tick()
  check('stale missed offline is dropped', off.length === 0)
})()

await (async () => {
  // the state changes between the late listener being added and the replay: no replay
  const ev = connectionEvents()
  ev.setOnline(false)
  const off = []
  ev.addEventListener('offline', (e) => off.push(e.type))
  ev.addEventListener('online', () => {})
  ev.setOnline(true)
  await tick()
  check('replay skipped when the connection changed meanwhile', off.length === 0)
})()

await (async () => {
  // a listener removed before the replay runs gets nothing
  const ev = connectionEvents()
  ev.setOnline(false)
  const off = []
  const fn = (e) => off.push(e.type)
  ev.addEventListener('offline', fn)
  ev.removeEventListener('offline', fn)
  await tick()
  check('replay skipped for a removed listener', off.length === 0)
})()

{
  const ev = connectionEvents()
  const got = []
  ev.addEventListener('online', (e) => got.push(e.type), { once: true })
  ev.setOnline(false)
  ev.setOnline(true)
  ev.setOnline(false)
  ev.setOnline(true)
  check('once: a once listener runs once', got.length === 1)
  const n = []
  const fn = (e) => n.push(e)
  ev.addEventListener('offline', fn, { once: true })
  ev.removeEventListener('offline', fn)
  ev.setOnline(false)
  check('once: removable by the original function', n.length === 0)
}

/* ---------- reminder delivery log ---------- */
const memKV = () => {
  const m = new Map()
  return { m, getString: (k) => m.get(k), set: (k, v) => void m.set(k, v), remove: (k) => m.delete(k), clearAll: () => m.clear() }
}
{
  const kv = memKV()
  const at = new Date('2026-11-13T08:00:00.000Z')
  recordNotifyEvent(kv, 'checkin', 'shown', at)
  recordNotifyEvent(kv, 'supp', 'shown', at)
  recordNotifyEvent(kv, 'review', 'shown', at)
  recordNotifyEvent(kv, 'checkin', 'opened', at)
  recordNotifyEvent(kv, 'plan', 'nonsense', at)
  recordNotifyEvent(kv, '', 'shown', at)
  const ev = takeEvents(kv)
  check('log: records {kind, at, ev} like the service worker; supplement, review and malformed dropped',
    JSON.stringify(ev) === JSON.stringify([{ kind: 'checkin', at: at.toISOString(), ev: 'shown' }, { kind: 'checkin', at: at.toISOString(), ev: 'opened' }]))
  check('log: take empties it', takeEvents(kv).length === 0)
  for (let i = 0; i < NOTIFY_MAX + 5; i++) recordNotifyEvent(kv, NOTIFY_KINDS[i % 3], 'shown', new Date(at.getTime() + i * 1000))
  const kept = takeEvents(kv)
  check('log: newest 60 kept', NOTIFY_MAX === 60 && kept.length === 60 && kept[0].at === new Date(at.getTime() + 5000).toISOString() && kept[59].at === new Date(at.getTime() + 64000).toISOString())
  // the web's list: MIND_COPY's keys in the service worker
  const sw = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
  const block = sw.slice(sw.indexOf('const MIND_COPY = {'), sw.indexOf('\n}', sw.indexOf('const MIND_COPY = {')))
  const swKinds = [...block.matchAll(/^\s+'?([a-z-]+)'?: \{/gm)].map((m) => m[1])
  check('log: the same reminder types as the service worker (' + swKinds.join() + ')', swKinds.length === 3 && swKinds.join() === NOTIFY_KINDS.join())
  recordNotifyEvent(kv, 'checkin', 'closed', at)
  clearEvents(kv)
  check('log: clear deletes it', kv.m.size === 0 && takeEvents(kv).length === 0)
  check('log: no store reads as no events', takeEvents(null).length === 0)
  clearEvents(null)
  kv.set('events', '{not json')
  check('log: a damaged value reads as no events', takeEvents(kv).length === 0)
  const broken = { getString: () => { throw new Error('x') }, set: () => { throw new Error('x') }, remove: () => { throw new Error('x') }, clearAll: () => { throw new Error('x') } }
  recordNotifyEvent(broken, 'checkin', 'shown')
  clearEvents(broken)
  check('log: never throws', takeEvents(broken).length === 0)
}

/* ---------- reminders on the phone (N12): which reminder, where a tap goes ---------- */
check('kind: from data.kind', mindKindOf({ kind: 'checkin' }) === 'checkin' && mindKindOf({ kind: 'wind-down' }) === 'wind-down')
check('kind: from the tag', mindKindOf({ tag: 'tali-plan' }) === 'plan')
check('kind: the tags are reminders.ts REMINDER_COPY', ['checkin', 'wind-down', 'plan'].every((k) => mindKindOf({ tag: REMINDER_COPY[k].tag }) === k))
check('kind: supplement and review reminders are not recorded',
  mindKindOf({ kind: 'supp', tag: REMINDER_COPY.supp.tag }) === null && mindKindOf({ tag: SUPP_NAMED.tag }) === null && mindKindOf({ kind: 'review', tag: 'tali-review' }) === null)
check('kind: anything else is nothing', mindKindOf(null) === null && mindKindOf('checkin') === null && mindKindOf({ kind: 'toString' }) === null && mindKindOf({ tag: 'constructor' }) === null)
check('route: the review reminder opens the review', routeFor({ kind: 'review' }) === 'review' && routeFor({ tag: 'tali-review' }) === 'review')
check('route: everything else opens Today', routeFor({ kind: 'checkin' }) === 'today' && routeFor({ kind: 'supp' }) === 'today' && routeFor(undefined) === 'today')

/* ---------- the delivery log without a service worker ---------- */
// the store's rule (src/store/store.ts ignoredInARow), to check the phone's events give the web's counts
const ignored = (log, kind) => {
  let run = 0, open = false
  for (const e of [...log].filter((x) => x.kind === kind).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (e.ev === 'opened') { run = 0; open = false }
    else if (e.ev === 'closed') { if (open) run++; open = false }
    else { if (open) run++; open = true }
  }
  return run
}
{
  const t0 = Date.parse('2026-11-10T08:30:00Z'), day = 864e5
  const p = (i, kind = 'checkin') => ({ key: deliveryKey('tali-' + kind, t0 + i * day), kind, at: t0 + i * day })
  const log = []
  const take = (r) => { for (const e of r.events) log.push({ kind: e.kind, ev: e.ev, at: e.at.toISOString() }); return r.seen }
  let seen = {}
  // day 0: in Notification Centre at the next look
  seen = take(reconcile(seen, [p(0)], new Date(t0 + 3600e3)))
  check('reconcile: a new one is shown, at its delivery time', log.length === 1 && log[0].ev === 'shown' && log[0].at === new Date(t0).toISOString())
  seen = take(reconcile(seen, [p(0)], new Date(t0 + 7200e3)))
  check('reconcile: seen once only', log.length === 1)
  // day 1 replaces day 0 under the same tag: day 0 gone unopened, day 1 new
  seen = take(reconcile(seen, [p(1)], new Date(t0 + day + 3600e3)))
  check('reconcile: replaced under the same tag records no close (as the web), the new one shown', log.slice(1).map((e) => e.ev).join() === 'shown')
  check('back-off: two ignored in a row, as on the web', ignored(log, 'checkin') === 1)
  seen = take(reconcile(seen, [], new Date(t0 + 2 * day)))
  check('back-off: swiped away unopened counts', ignored(log, 'checkin') === 2)
  // day 3: tapped
  seen = take(noteOpened(seen, p(3), new Date(t0 + 3 * day + 60e3)))
  check('tap: an unseen one is shown then opened', log.slice(-2).map((e) => e.ev).join() === 'shown,opened')
  check('back-off: an open ends the run', ignored(log, 'checkin') === 0)
  const n = log.length
  seen = take(noteOpened(seen, p(3), new Date(t0 + 3 * day + 120e3)))
  check('tap: the same tap twice records once', log.length === n)
  seen = take(reconcile(seen, [], new Date(t0 + 3 * day + 180e3)))
  check('reconcile: an opened one that is gone is just forgotten', log.length === n && Object.keys(seen).length === 0)
  // arriving with the app open, then seen in Notification Centre
  seen = take(noteShown(seen, p(4, 'plan')))
  seen = take(reconcile(seen, [p(4, 'plan')], new Date(t0 + 4 * day + 60e3)))
  check('foreground: shown once, not again at the next look', log.filter((e) => e.kind === 'plan').length === 1)
  check('per type: one type never counts for another', ignored(log, 'checkin') === 0 && ignored(log, 'wind-down') === 0)
  // the seen list stays small
  let big = {}
  for (let i = 0; i < SEEN_MAX + 10; i++) big = noteShown(big, p(i)).seen
  check('seen: newest 60 kept', Object.keys(big).length === SEEN_MAX && !!big[p(SEEN_MAX + 9).key] && !big[p(0).key])
  check('seen: round-trips, malformed dropped', JSON.stringify(parseSeen(JSON.stringify({ a: { kind: 'plan' }, b: { kind: 'plan', opened: true }, c: { kind: 'x' }, d: 3 }))) === JSON.stringify({ a: { kind: 'plan' }, b: { kind: 'plan', opened: true } }))
  check('seen: damaged reads as empty', Object.keys(parseSeen('{oops')).length === 0 && Object.keys(parseSeen(undefined)).length === 0)
  // with the extension, every delivery is seen as it arrives: a replaced one is never also closed
  {
    const elog = []
    const etake = (r) => { for (const e of r.events) elog.push({ kind: e.kind, ev: e.ev, at: e.at.toISOString() }); return r.seen }
    const q = (i) => ({ key: 'id:' + String(i).padStart(8, '0'), kind: 'checkin', at: t0 + i * day })
    let es = {}
    es = etake(noteShown(es, q(0)))           // day 0 arrives (extension)
    es = etake(noteShown(es, q(1)))           // day 1 replaces it (extension)
    es = etake(reconcile(es, [q(1)], new Date(t0 + day + 3600e3)))
    check('extension: a replaced delivery records no close (the newer one already counts it), as the web', elog.map((e) => e.ev).join() === 'shown,shown' && ignored(elog, 'checkin') === 1)
    es = etake(reconcile(es, [], new Date(t0 + 2 * day)))
    check('extension: the newest swiped away unopened counts, as the web', elog.map((e) => e.ev).join() === 'shown,shown,closed' && ignored(elog, 'checkin') === 2)
    check('extension: the seen list keeps arrival times', JSON.stringify(parseSeen(JSON.stringify({ a: { kind: 'plan', at: 5 } }))) === JSON.stringify({ a: { kind: 'plan', at: 5 } }))
  }
  check('key: tells deliveries apart', deliveryKey('x', 1) !== deliveryKey('x', 2) && deliveryKey('x', NaN) === 'x|0')
}

/* ---------- push registration rules ---------- */
check('perm: iOS authorised, provisional, ephemeral are granted', [2, 3, 4].every((s) => permFrom({ ios: { status: s } }) === 'granted'))
check('perm: iOS denied', permFrom({ ios: { status: 1 }, status: 'denied' }) === 'denied')
check('perm: iOS not asked yet', permFrom({ ios: { status: 0 }, status: 'undetermined' }) === 'default')
check('perm: Android style', permFrom({ granted: true, status: 'granted' }) === 'granted' && permFrom({ status: 'denied' }) === 'denied' && permFrom({ status: 'undetermined' }) === 'default')
check('perm: nothing is default', permFrom(null) === 'default')
const tok = 'AB'.repeat(32)
check('token: hex, lower-cased', apnsToken(tok) === 'ab'.repeat(32))
check('token: refuses anything else', apnsToken('xyz') === null && apnsToken('ab'.repeat(31)) === null && apnsToken('a'.repeat(65)) === null && apnsToken(42) === null && apnsToken('ab'.repeat(101)) === null)
check('gateway: production builds use production; development builds and simulators (no profile) the sandbox', apnsPlatform('development') === 'apns-sandbox' && apnsPlatform('production') === 'apns' && apnsPlatform(null) === 'apns-sandbox' && apnsPlatform(undefined) === 'apns-sandbox')
check('row: token in endpoint, no Web Push keys',
  JSON.stringify(tokenRow('u1', 'ab'.repeat(32), 'apns')) === JSON.stringify({ user_id: 'u1', endpoint: 'ab'.repeat(32), platform: 'apns', p256dh: null, auth_key: null }))
check('delete: this token and this account only', deletePath('ab'.repeat(32), 'u-1') === '/push_subscriptions?endpoint=eq.' + 'ab'.repeat(32) + '&user_id=eq.u-1')
check('saved: round-trips', JSON.stringify(parseSaved(JSON.stringify({ token: tok, uid: 'u1', platform: 'apns-sandbox' }))) === JSON.stringify({ token: 'ab'.repeat(32), uid: 'u1', platform: 'apns-sandbox' }))
check('saved: malformed is nothing', parseSaved('{') === null && parseSaved(null) === null && parseSaved(JSON.stringify({ token: tok, uid: '', platform: 'apns' })) === null && parseSaved(JSON.stringify({ token: tok, uid: 'u', platform: 'web' })) === null)

console.log(`platform adapters: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
