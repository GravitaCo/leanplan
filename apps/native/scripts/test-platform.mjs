/**
 * Unit tests for the native platform adapters that need no phone (apps/native/lib/platform):
 * connection events, the reminder delivery log, the session refresh rule.
 *   (apps/native) npm run test:platform
 * Node runs the TypeScript directly (type stripping), so these modules import nothing from React
 * Native.
 */
import { connectionEvents, onlineFrom } from '../lib/platform/connection.ts'
import { clearEvents, NOTIFY_MAX, recordNotifyEvent, takeEvents } from '../lib/platform/notifyStore.ts'
import { refreshFor } from '../lib/platform/lifecycle.ts'

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
  // launch with no connection: NetInfo reports before the store listens
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
  check('missed offline: only once', later.length === 0)
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
  recordNotifyEvent(kv, 'checkin', 'opened', at)
  recordNotifyEvent(kv, 'plan', 'nonsense', at)
  recordNotifyEvent(kv, '', 'shown', at)
  const ev = takeEvents(kv)
  check('log: records {kind, at, ev} like the service worker, malformed dropped',
    JSON.stringify(ev) === JSON.stringify([{ kind: 'checkin', at: at.toISOString(), ev: 'shown' }, { kind: 'checkin', at: at.toISOString(), ev: 'opened' }]))
  check('log: take empties it', takeEvents(kv).length === 0)
  for (let i = 0; i < NOTIFY_MAX + 5; i++) recordNotifyEvent(kv, 'k' + i, 'shown', at)
  const kept = takeEvents(kv)
  check('log: newest 60 kept', NOTIFY_MAX === 60 && kept.length === 60 && kept[0].kind === 'k5' && kept[59].kind === 'k64')
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

/* ---------- session refresh ---------- */
check('refresh: starts when active', refreshFor('active') === 'start')
check('refresh: stops in the background', refreshFor('background') === 'stop' && refreshFor('inactive') === 'stop')
check('refresh: leaves other states alone', refreshFor('unknown') === null && refreshFor('extension') === null)

console.log(`platform adapters: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
