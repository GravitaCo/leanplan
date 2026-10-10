/* WP16 and WP17: reminder rules shared with the server function, the generalised function and its
   migration (written, not applied), the service worker's fixed copy and delivery log, the app's
   read-and-empty of that log, Profile's reminder toggles (setMindReminder) and the back-off notice.
   Run from scripts/test-wellbeing.ts; returns the number of failures. */
import { readFileSync } from 'node:fs'
import type { IfThenPlan } from '@/core/types'
import { useStore, mindRemindersOn, remindersOn } from '@/store/store'
import { freshForAccount, loadStateFrom } from '@/data/persistence'
import { backoffDismissed, cleanDeviceOnly, NOTIFY_DB } from '@/data/deviceOnly'
import { NOTIFY_STORE, takeNotifyEvents, takeNotifyParam } from '@/data/notifyLog'
import { plansDue } from '@/core/domain/insights'
import { NOTIFY_KINDS } from '@/core/domain/checkin'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { todayStr } from '@/core/domain/date'
import { LOCAL_USER } from '@/data/supabase'
import { cookiePolicy } from '@/core/legal/cookies'
import { privacyPolicy } from '@/core/legal/privacy'
import { NOTIFY_COPY, backoffLine, notifyStrings } from '@/screens/profile/notifyCopy'
import {
  CAPPED_KINDS, CHECKIN_AFTER_WAKE_MIN, DEFAULT_WAKE, DEFAULT_WIND_DOWN, MIND_KINDS, REMINDER_COPY, dueKinds, isCapped, halvedAllows, inQuietHours,
  kindTimes, localNow, payloadFor, planDue, PLAN_GAP_DAYS, suppPayload, suppsDue,
} from '../../supabase/functions/_shared/reminders'
import { USER_TABLES } from '../../supabase/functions/_shared/account'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k) },
    setItem: (k, v) => { m.set(k, String(v)) },
  }
}

/** Just enough IndexedDB for takeNotifyEvents: open (existing or not), getAll, clear. */
function fakeIdb(stores: Record<string, Record<string, unknown[]>>): IDBFactory & { created: string[] } {
  const created: string[] = []
  const later = (f: () => void) => setTimeout(f, 0)
  const f = {
    created,
    open(name: string) {
      const req: any = {}
      later(() => {
        if (!stores[name]) {
          // a new database: the upgrade runs; takeNotifyEvents aborts it, so nothing is created
          let aborted = false
          req.transaction = { abort: () => { aborted = true } }
          req.onupgradeneeded?.()
          if (aborted) { req.onerror?.(); return }
          stores[name] = {}
          created.push(name)
        }
        const db = stores[name]
        req.result = {
          objectStoreNames: { contains: (s: string) => s in db },
          close() {},
          transaction(s: string) {
            const tx: any = {}
            tx.objectStore = () => ({
              getAll() { const r: any = {}; later(() => { r.result = [...db[s]]; r.onsuccess?.(); later(() => tx.oncomplete?.()) }); return r },
              clear() { db[s] = [] },
            })
            return tx
          },
        }
        req.onsuccess?.()
      })
      return req
    },
  }
  return f as unknown as IDBFactory & { created: string[] }
}

export async function notifySuite(): Promise<number> {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing notify:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- the shared rules (supabase/functions/_shared/reminders.ts) ---------- */
  const mind = (x: object = {}) => ({ notify: { checkin: true, 'wind-down': true, plan: true }, wakeAt: '07:00', windDownAt: '22:30', ...x })
  ok('the check-in comes 90 minutes after the usual wake time; wind-down at its start; plan shares the morning slot',
    kindTimes(mind()).checkin === '08:30' && kindTimes(mind())['wind-down'] === '22:30' && kindTimes(mind()).plan === '08:30' && CHECKIN_AFTER_WAKE_MIN === 90)
  ok('unset times use 07:00 and 22:30', kindTimes({}).checkin === '08:30' && kindTimes({})['wind-down'] === '22:30' && DEFAULT_WAKE === '07:00' && DEFAULT_WIND_DOWN === '22:30')
  ok('quiet hours: after the wind-down time and before the usual wake time, not at the wind-down minute itself',
    inQuietHours('23:00', '22:30', '07:00') && inQuietHours('06:59', '22:30', '07:00') && !inQuietHours('22:30', '22:30', '07:00') && !inQuietHours('07:00', '22:30', '07:00') && !inQuietHours('12:00', '22:30', '07:00'))
  ok('quiet hours work for a day sleeper (wind down 05:00, up 13:00)', inQuietHours('09:00', '05:00', '13:00') && !inQuietHours('20:00', '05:00', '13:00'))
  const day = '2026-10-09'
  ok('a type that is on is due at its time', dueKinds({ mind: mind(), day, time: '08:30' }).join() === 'checkin' && dueKinds({ mind: mind(), day, time: '22:30' }).join() === 'wind-down')
  ok('a type with no opt-in is never due (off, missing or not exactly true)',
    !dueKinds({ mind: { notify: { checkin: false } }, day, time: '08:30' }).length && !dueKinds({ mind: {}, day, time: '08:30' }).length
    && !dueKinds({ mind: { notify: { checkin: 'yes' } }, day, time: '08:30' }).length && !dueKinds({ mind: null, day, time: '08:30' }).length)
  ok('at most one check-in or plan reminder a day: nothing capped once the day is claimed', !dueKinds({ mind: mind(), day, time: '08:30', lastOn: day }).length
    && dueKinds({ mind: mind(), day, time: '08:30', lastOn: '2026-10-08' }).join() === 'checkin' && !dueKinds({ mind: mind(), plans: [{ id: 'p', when: 'w', then: 't', created: '2026-10-01', reviews: [] }], day, time: '08:30', lastOn: day }).length)
  // Benn, 10 Oct 2026: the wind-down reminder sits outside the cap, still once a day, halved, never in quiet hours
  ok('wind-down is outside the cap: due after the day\'s check-in went', CAPPED_KINDS.join() === 'checkin,plan' && !isCapped('wind-down')
    && dueKinds({ mind: mind(), day, time: '22:30', lastOn: day, byKind: { checkin: day } }).join() === 'wind-down')
  ok('wind-down still at most once a day', !dueKinds({ mind: mind(), day, time: '22:30', byKind: { 'wind-down': day } }).length
    && dueKinds({ mind: mind(), day, time: '22:30', byKind: { 'wind-down': '2026-10-08' } }).join() === 'wind-down')
  ok('wind-down still halves', !dueKinds({ mind: mind({ halved: { 'wind-down': 'x' } }), day, time: '22:30', byKind: { 'wind-down': '2026-10-08' } }).length
    && dueKinds({ mind: mind({ halved: { 'wind-down': 'x' } }), day, time: '22:30', byKind: { 'wind-down': '2026-10-07' } }).join() === 'wind-down')
  ok('a wind-down sent today doesn\'t use up the check-in', dueKinds({ mind: mind(), day, time: '08:30', byKind: { 'wind-down': day } }).join() === 'checkin')
  ok('wind-down and the check-in can both go on one day when their times meet (up 07:00, winding down 08:30)',
    dueKinds({ mind: mind({ windDownAt: '08:30' }), day, time: '08:30' }).join() === 'checkin,wind-down')
  ok('wind-down never in quiet hours (a wind-down time inside quiet hours can\'t happen; the check-in in quiet hours waits)',
    !dueKinds({ mind: mind({ windDownAt: '08:00' }), day, time: '08:30' }).length)
  ok('a check-in time that falls in quiet hours is never sent (up at 07:00, winding down from 08:00: the 08:30 check-in waits)',
    !dueKinds({ mind: mind({ wakeAt: '07:00', windDownAt: '08:00' }), day, time: '08:30' }).length)
  const plans = (d: string): IfThenPlan[] => [{ id: 'p', when: 'w', then: 't', created: d, reviews: [] }]
  ok('the plan check-in only when a plan is due for its weekly look, and it goes first', dueKinds({ mind: mind(), plans: plans('2026-10-01'), day, time: '08:30' }).join() === 'plan,checkin'
    && dueKinds({ mind: mind(), plans: plans('2026-10-05'), day, time: '08:30' }).join() === 'checkin')
  // close-out change 3: at most once every PLAN_GAP_DAYS while the plan stays unreviewed
  {
    const p8 = plans('2026-10-01') // made on 1 Oct: day 8 is 9 Oct, day 9 is 10 Oct, still unreviewed on both
    const d8 = dueKinds({ mind: mind(), plans: p8, day: '2026-10-09', time: '08:30', lastOn: '2026-10-08', byKind: { checkin: '2026-10-08' } })
    const d9 = dueKinds({ mind: mind(), plans: p8, day: '2026-10-10', time: '08:30', lastOn: '2026-10-09', byKind: { plan: '2026-10-09', checkin: '2026-10-08' } })
    const d15 = dueKinds({ mind: mind(), plans: p8, day: '2026-10-15', time: '08:30', lastOn: '2026-10-14', byKind: { plan: '2026-10-09', checkin: '2026-10-14' } })
    const d16 = dueKinds({ mind: mind(), plans: p8, day: '2026-10-16', time: '08:30', lastOn: '2026-10-15', byKind: { plan: '2026-10-09', checkin: '2026-10-15' } })
    ok('a plan still unreviewed on days 8 and 9 sends the plan check-in on day 8 only (day 9 goes to the check-in)',
      PLAN_GAP_DAYS === 7 && d8[0] === 'plan' && !d9.includes('plan') && d9.join() === 'checkin', { d8, d9 })
    ok('the plan check-in comes back 7 days after the last one, not 6', !d15.includes('plan') && d16[0] === 'plan', { d15, d16 })
  }
  ok('halving: a halved type goes only when its last one is at least 2 days old',
    !halvedAllows(mind({ halved: { checkin: 'x' } }), 'checkin', { checkin: '2026-10-08' }, day) && halvedAllows(mind({ halved: { checkin: 'x' } }), 'checkin', { checkin: '2026-10-07' }, day)
    && halvedAllows(mind({ halved: { checkin: 'x' } }), 'checkin', null, day) && halvedAllows(mind(), 'checkin', { checkin: '2026-10-08' }, day)
    && !dueKinds({ mind: mind({ halved: { checkin: 'x' } }), day, time: '08:30', lastOn: '2026-10-08', byKind: { checkin: '2026-10-08' } }).length)
  // parity with the app's plansDue
  const fixtures = ['2026-10-09', '2026-10-03', '2026-10-02', '2026-09-01']
  ok('planDue matches the app (plansDue) on fixtures', fixtures.every((d) => planDue(plans(d), day) === plansDue({ plans: plans(d) } as never, day).length > 0)
    && planDue([{ ...plans('2026-09-01')[0], lastReview: '2026-10-08' }], day) === false && !planDue(null, day))
  // time zones
  const t = new Date('2026-10-09T12:30:00Z')
  const ny = localNow('America/New_York', t), lon = localNow('Europe/London', t)
  ok('time zone: 08:30 in New York is not 08:30 in London', ny.time === '08:30' && lon.time === '13:30'
    && dueKinds({ mind: mind(), day: ny.day, time: ny.time }).join() === 'checkin' && !dueKinds({ mind: mind(), day: lon.day, time: lon.time }).length)
  ok('an unknown zone reads as UK time', localNow('Not/AZone', t).tz === 'Europe/London' && localNow(undefined, t).time === '13:30')
  ok('the local day follows the zone (Auckland is already tomorrow)', localNow('Pacific/Auckland', new Date('2026-10-09T13:00:00Z')).day === '2026-10-10')
  // payloads
  const bannedPayload = /mood|sleep|slept|tired|stress|low|missed|haven'?t|streak|\d/i
  ok('payloads: fixed copy, one tag per type, a tap opens ./?n=<kind>, no mood, sleep, number or guilt words',
    MIND_KINDS.every((k) => payloadFor(k).tag === 'tali-' + k && payloadFor(k).url === './?n=' + k && !bannedPayload.test(payloadFor(k).title + ' ' + payloadFor(k).body))
    && new Set(MIND_KINDS.map((k) => payloadFor(k).tag)).size === 3)
  ok('B11.17 to B11.19 verbatim', payloadFor('checkin').body === 'How are you today? A quick check-in, if you have a moment.'
    && payloadFor('wind-down').body === "Your wind-down starts now, if you'd like it." && payloadFor('plan').body === 'How are your plans going?')
  ok('the supplement payload is generic: no name (main\'s lock-screen fix), tag tali-supp', suppPayload().body === 'Time for your supplements' && suppPayload().title === 'Time for your supplements' && suppPayload().tag === 'tali-supp')
  ok('supplements due at their own times', suppsDue([{ name: 'X', time: '08:00' }, { name: 'Y', time: '09:00' }], '08:00') === 1 && suppsDue(null, '08:00') === 0)
  ok('every reminder string passes the Mind copy lint', Object.values(REMINDER_COPY).every((c) => !mindCopyIssues(c.body).length))
  ok('the app and server agree on the Mind kinds', MIND_KINDS.join() === NOTIFY_KINDS.join())

  /* ---------- the service worker ---------- */
  const sw = readFileSync('public/sw.js', 'utf8')
  ok('sw.js shows the same fixed copy and tags as the server rules', MIND_KINDS.every((k) => {
    const c = REMINDER_COPY[k]
    return sw.includes(JSON.stringify(c.body).slice(1, -1)) || sw.includes(c.body) ? sw.includes(`tag: '${c.tag}'`) : false
  }) && sw.includes("'Time for your supplements'"))
  ok('sw.js records shown, opened and closed in the tali-notify IndexedDB, Mind kinds only, and opens ./?n=<kind>',
    sw.includes(`const NOTIFY_DB = '${NOTIFY_DB}'`) && sw.includes(`const NOTIFY_STORE = '${NOTIFY_STORE}'`) && /notifyRecord\(kind, 'shown'\)/.test(sw)
    && /notifyRecord\(mindOf\(e\.notification\), 'opened'\)/.test(sw) && /addEventListener\('notificationclose'/.test(sw) && sw.includes("url: './?n=' + kind")
    && /function notifyRecord\(kind, ev\) \{\s*if \(!kind/.test(sw))
  ok('sw.js keeps main\'s supplement behaviour (generic text, tali-supp, renotify)', /renotify: supp/.test(sw) && /tag: supp \? 'tali-supp' : data\.tag/.test(sw))
  const cache = sw.match(/const CACHE = 'tali-v(\d+)'/)
  ok('the service-worker CACHE is bumped past main\'s v101', !!cache && +cache[1] >= 102)

  /* ---------- the app's read-and-empty (src/data/notifyLog.ts) ---------- */
  const ev = (kind: string, ev: string) => ({ kind, at: new Date().toISOString(), ev })
  const idb = fakeIdb({ [NOTIFY_DB]: { [NOTIFY_STORE]: [ev('checkin', 'shown'), ev('checkin', 'closed')] } })
  const got = await takeNotifyEvents(idb)
  const again = await takeNotifyEvents(idb)
  ok('takeNotifyEvents reads every event and empties the store', got.length === 2 && again.length === 0)
  const none = fakeIdb({})
  ok('no database yet: no events, and none is created', (await takeNotifyEvents(none)).length === 0 && none.created.length === 0)
  ok('no IndexedDB at all: no events', (await takeNotifyEvents(null)).length === 0)
  const replaced: string[] = []
  const hist = { replaceState: (_a: unknown, _b: string, u: string) => { replaced.push(u) } } as unknown as History
  ok('?n=<kind> is read once and removed from the address, other parameters kept',
    takeNotifyParam({ search: '?n=checkin&x=1', pathname: '/', hash: '' }, hist) === 'checkin' && replaced[0] === '/?x=1'
    && takeNotifyParam({ search: '', pathname: '/', hash: '' }, hist) === null && takeNotifyParam({ search: '?n=%3Cb%3E', pathname: '/', hash: '' }, hist) === null)
  const app = readFileSync('src/App.tsx', 'utf8')
  ok('App ingests the log on launch and when it comes back to the front, never while the owner question shows',
    /takeNotifyParam\(\)/.test(app) && /takeNotifyEvents\(\)\.then/.test(app) && /ingestNotifyLog\(ev\)/.test(app) && /visibilitychange', onShow/.test(app) && /ownerAsk\) return/.test(app))
  const storeSrc = readFileSync('src/store/store.ts', 'utf8'), acct = readFileSync('src/data/account.ts', 'utf8')
  ok('the wipe paths delete tali-notify (owner choice, under-age wipe, sign out and remove, account deletion)',
    (storeSrc.match(/clearNotifyStore\(\)/g) || []).length >= 3 && /clearNotifyStore\(\)/.test(acct))

  /* ---------- the store: toggles, time zone, back-off ---------- */
  const g = globalThis as any
  const saved = { localStorage: g.localStorage, window: g.window, Notification: g.Notification, PushManager: g.PushManager }
  const swDesc = Object.getOwnPropertyDescriptor(globalThis.navigator ?? {}, 'serviceWorker')
  g.localStorage = memoryStorage()
  let asked = 0
  const perm = { value: 'default' as NotificationPermission }
  g.window = globalThis
  g.Notification = { get permission() { return perm.value }, requestPermission: async () => { asked++; perm.value = 'granted'; return 'granted' } }
  g.PushManager = function PushManager() {}
  let hadNav = true
  if (!g.navigator) { hadNav = false; g.navigator = {} }
  Object.defineProperty(g.navigator, 'serviceWorker', { value: { getRegistration: async () => undefined, ready: new Promise(() => {}) }, configurable: true })
  const st = () => useStore.getState()
  const reset = (health: 'yes' | 'none' | 'no' = 'yes') => {
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: todayStr(), signedIn: true, authed: false, ownerAsk: null, tab: 'today' })
    if (health !== 'none') st().grantConsent('health')
    if (health === 'no') st().withdrawConsent('health')
  }
  try {
    reset()
    ok('new reminder types are off by default', NOTIFY_KINDS.every((k) => st().data.profile.mind?.notify?.[k] !== true) && !mindRemindersOn(st().data.profile))
    reset('none')
    ok('no current health yes: refused, nothing saved, no permission asked', (await st().setMindReminder('checkin', true)) === 'consent' && !st().data.profile.mind?.notify && asked === 0)
    reset('no')
    ok('after a withdrawal: refused too', (await st().setMindReminder('checkin', true)) === 'consent')
    reset()
    perm.value = 'denied'
    ok('permission blocked: refused, nothing saved', (await st().setMindReminder('checkin', true)) === 'denied' && !st().data.profile.mind?.notify)
    perm.value = 'default'
    const r = await st().setMindReminder('checkin', true)
    const p = st().data.profile
    ok('turning one on asks permission in the tap, saves on the device and records the time zone', r === true && asked === 1 && p.mind?.notify?.checkin === true
      && typeof p.mind?.tz === 'string' && !!p.answeredAt?.['mind.notify'] && !!p.answeredAt?.['mind.tz'] && !!st().data._meta?.settings?.dirty)
    ok('offline or signed out: the subscription waits for the next connection (pushPending)', st().data._meta?.pushPending === true)
    useStore.setState((s) => { s.data.profile.mind!.tz = 'Etc/Old' })
    ok('saving a time while a reminder is on records the time zone again', st().setMindPrefs({ windDownAt: '23:00' }) && st().data.profile.mind?.tz !== 'Etc/Old' && st().data.profile.mind?.windDownAt === '23:00')
    useStore.setState((s) => { s.data.profile.notificationsEnabled = true })
    ok('turning it off saves false; the subscription stays while supplement reminders use it', (await st().setMindReminder('checkin', false)) === true
      && st().data.profile.mind?.notify?.checkin === false && remindersOn(st().data.profile) && st().data._meta?.pushPending === true)
    useStore.setState((s) => { s.data.profile.notificationsEnabled = false })
    await st().setMindReminder('wind-down', true)
    await st().setMindReminder('wind-down', false)
    ok('with no reminder left on, the pending subscription is dropped', !remindersOn(st().data.profile) && !st().data._meta?.pushPending)
    // the back-off notice
    await st().setMindReminder('checkin', true)
    const evs = (n: number) => Array.from({ length: n }, (_, i) => ({ kind: 'checkin', at: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(), ev: 'shown' }))
    ok('two ignored check-ins in a row halve it', st().ingestNotifyLog(evs(3)).join() === 'checkin' && !!st().data.profile.mind?.halved?.checkin)
    const at = st().data.profile.mind!.halved!.checkin!
    st().dismissBackoff('checkin')
    ok('closing the notice hides it on this device for that back-off only', backoffDismissed(st().data, 'checkin', at) && !backoffDismissed(st().data, 'checkin', 'other'))
    const re = loadStateFrom(JSON.parse(JSON.stringify(st().data)))
    ok('the closed notice survives a reload (cleanDeviceOnly keeps ui.backoffSeen, drops junk)', backoffDismissed(re, 'checkin', at)
      && !cleanDeviceOnly({ ui: { backoffSeen: { 'Bad Key': at, checkin: 'not a time' } } }, LOCAL_USER))
    st().backToUsual('checkin')
    ok('Back to usual ends the back-off', !st().data.profile.mind?.halved?.checkin)
    ok('an open in between resets the run', !st().ingestNotifyLog([evs(1)[0], { ...evs(2)[1], ev: 'opened' }, { kind: 'checkin', at: new Date(Date.UTC(2026, 9, 5)).toISOString(), ev: 'shown' }]).length)
    ok('supplement events never halve anything', !st().ingestNotifyLog([1, 2, 3, 4].map((i) => ({ kind: 'supp', at: new Date(Date.UTC(2026, 9, 10 + i)).toISOString(), ev: 'shown' }))).length)
  } finally {
    g.localStorage = saved.localStorage
    g.window = saved.window
    g.Notification = saved.Notification
    g.PushManager = saved.PushManager
    if (swDesc) Object.defineProperty(g.navigator, 'serviceWorker', swDesc); else if (g.navigator) delete g.navigator.serviceWorker
    if (!hadNav) delete g.navigator
  }

  /* ---------- copy ---------- */
  const issues = notifyStrings().map((s) => [s, mindCopyIssues(s)] as const).filter(([, i]) => i.length)
  ok('every B11 string passes mindCopyIssues', issues.length === 0, issues)
  ok('no em dashes in any B11 or reminder string', ![...notifyStrings(), ...Object.values(REMINDER_COPY).map((c) => c.body)].some((s) => s.includes('—')))
  ok('B11.14 verbatim for check-in', backoffLine('checkin') === 'The last 2 check-in reminders went unopened, so Tali now sends them half as often. Nothing you need to do.')
  ok('B11.12 verbatim', NOTIFY_COPY.foot === "Tali sends at most one check-in or plan reminder a day, and nothing after your wind-down time or before you're usually up. Wind-down and supplement reminders come at the times you set.")
  const ui = readFileSync('src/screens/profile/NotificationsSettings.tsx', 'utf8') + readFileSync('src/screens/profile/notifyCopy.ts', 'utf8')
  ok('no lock-screen names setting is built (B11b not approved)', !/lockNames|Show supplement names|lock screen/i.test(ui.replace(/\/\*\*[\s\S]*?\*\//g, '')))
  const prof = readFileSync('src/screens/ProfileScreen.tsx', 'utf8')
  ok('Profile mounts the B11 parts only with the wellbeing flag', /WELLBEING_ENABLED && <BackoffNotices \/>/.test(prof) && /WELLBEING_ENABLED && <MindReminderRows \/>/.test(prof) && /WELLBEING_ENABLED && <YourTimes \/>/.test(prof))

  /* ---------- the server files (WP16: written, not applied) ---------- */
  const fn = readFileSync('supabase/functions/send-supplement-reminders/index.next.ts', 'utf8')
  const live = readFileSync('supabase/functions/send-supplement-reminders/index.ts', 'utf8')
  ok('the generalised function is a separate, clearly marked file; index.ts (deployed, lock-screen fix) is unchanged in shape',
    /NOT DEPLOYED/.test(fn.slice(0, 200)) && /from "\.\.\/_shared\/reminders\.ts"/.test(fn) && !/_shared\/reminders/.test(live) && /tag: "tali-supp"/.test(live))
  const consoleLines = fn.split('\n').filter((l) => /console\.(log|warn|error|info)/.test(l))
  ok('the function never logs a supplement name, a profile or a kind', consoleLines.length > 0 && consoleLines.every((l) => !/name|profile|kind|supplement|mind/i.test(l.replace(/console\.\w+\(`[^`$]*/, ''))))
  ok('no supplement name ever reaches a payload', !/\.name\b/.test(fn) && /suppPayload\(\)/.test(fn))
  ok('the function keeps the consent gate, claims before sending and leaves supplements outside the cap',
    /health_consent_current/.test(fn) && /rpc\("notify_claim"/.test(fn) && fn.indexOf('rpc("notify_claim"') < fn.indexOf('payloadFor(kind)') && fn.indexOf('send(sub, suppPayload())') < fn.indexOf('rpc("notify_claim"'))
  ok('the function reads times in the person\'s zone, the review reminder in UK time', /localNow\(profile\?\.mind\?\.tz, now\)/.test(fn) && /reviewDue\(profile, london\.day, london\.dow, london\.time\)/.test(fn))
  const sql = readFileSync('docs/migrations/2026-10-09-notify-sent.sql', 'utf8')
  ok('migration: notify_sent with RLS on, owner-only SELECT and DELETE (for the withdrawal clear), no owner INSERT or UPDATE', /create table if not exists public\.notify_sent/.test(sql) && /references auth\.users \(id\) on delete cascade/.test(sql)
    && /enable row level security/.test(sql) && /for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\);/.test(sql)
    && /create policy notify_sent_delete_own on public\.notify_sent for delete to authenticated using \(user_id = \(select auth\.uid\(\)\)\);/.test(sql)
    && !/using \(user_id = auth\.uid\(\)\)/.test(sql)
    && /revoke all on public\.notify_sent from anon, authenticated;/.test(sql) && /grant select, delete on public\.notify_sent to authenticated;/.test(sql)
    && !/create policy[^;]*for (insert|update|all)/i.test(sql) && !/grant[^;]*(insert|update)[^;]*on public\.notify_sent/i.test(sql))
  ok('migration: notify_claim takes the per-person log lock and needs a current health yes', /kind not in[\s\S]*?end if;\s*(--[^\n]*\n\s*)*perform pg_advisory_xact_lock_shared\(hashtextextended\('tali-log:' \|\| uid::text, 0\)\);\s*if not public\.health_consent_current\(uid\) then return false; end if;\s*if kind = 'wind-down' then\s*(--[^\n]*\n\s*)*insert into public\.notify_sent/.test(sql))
  ok('migration: notify_claim is atomic and service-role only', /on conflict \(user_id\) do update/.test(sql) && /where n\.last_on is null or n\.last_on < excluded\.last_on/.test(sql)
    && /revoke execute on function public\.notify_claim\(uuid, date, text\) from public, anon, authenticated/.test(sql) && /grant execute on function public\.notify_claim\(uuid, date, text\) to service_role/.test(sql))
  ok('migration: the wind-down claim is its own day in by_kind and leaves last_on alone', /last_on date,\n/.test(sql) && /alter column last_on drop not null/.test(sql)
    && /if kind = 'wind-down' then[\s\S]*?values \(uid, null, jsonb_build_object\(kind, day\)\)[\s\S]*?set by_kind = n\.by_kind \|\| excluded\.by_kind,[\s\S]*?where n\.by_kind ->> 'wind-down' is null or \(n\.by_kind ->> 'wind-down'\)::date < day[\s\S]*?end if;/.test(sql)
    && !/set last_on/.test((sql.match(/if kind = 'wind-down' then([\s\S]*?)end if;/) || ['', 'set last_on'])[1]))
  const verify = sql.slice(sql.indexOf('-- Verify'))
  const claimEx = (verify.match(/--\s+begin;\n((?:--[^\n]*\n)*?)--\s+rollback;/) || ['', ''])[1]
  const claims = [...claimEx.matchAll(/notify_claim\('<uid>', '2026-10-09', '([a-z-]+)'\);\s*-- (true|false)/g)].map((m) => `${m[1]}:${m[2]}`)
  ok('migration Verify: the notify_claim example runs inside begin; ... rollback; and writes nothing',
    claimEx.length > 0 && !/notify_claim\(/.test(verify.replace(/--\s+begin;\n(?:--[^\n]*\n)*?--\s+rollback;/g, '')))
  ok('migration Verify: describes the cap and the wind-down branch (check-in true then false; wind-down true once, apart from the check-in, then false)',
    claims.join(',') === 'checkin:true,plan:false,wind-down:true,wind-down:false' && /'2026-10-10', 'plan'\);\s*-- true \(next day\)/.test(claimEx)
    && /wind-down records only by_kind\['wind-down'\],\s*\n--\s*leaves last_on alone/.test(verify) && /without the rollback it writes a real notify_sent row/.test(verify)
    && !/'wind-down'\);\s*-- false \(the cap\)/.test(verify), claims)
  ok('the function checks health consent per person before reading the profile or claiming', fn.indexOf('rpc("health_consent_current", { uid })') > 0
    && fn.indexOf('rpc("health_consent_current", { uid })') < fn.indexOf('from("settings")') && /for \(const uid of consenting\)/.test(fn))
  ok('each Mind reminder (wind-down too) is claimed once per person before any subscription is sent to',
    /for \(const kind of toSend\) \{[\s\S]*?rpc\("notify_claim", \{ uid, day: local\.day, kind \}\);[\s\S]*?if \(claimed !== true\) \{ if \(isCapped\(kind\)\) capped\+\+; continue; \}[\s\S]*?for \(const sub of subs\) if \(\(await send\(sub, payloadFor\(kind\)\)\)/.test(fn))
  ok('the function claims wind-down apart from the capped types', /due\.find\(isCapped\), due\.find\(\(k\) => !isCapped\(k\)\)/.test(fn))
  ok('migration: the consent trigger, the withdrawal clear and the 30-day purge cover notify_sent',
    /create trigger require_health_consent before insert or update on public\.notify_sent/.test(sql)
    && /function public\.clear_log_after_withdrawal\(\)[\s\S]*delete from public\.notify_sent/.test(sql)
    && /function public\.purge_unconsented_logs\(\)[\s\S]*exists \(select 1 from public\.notify_sent[\s\S]*delete from public\.notify_sent/.test(sql)
    && !/^select cron\.schedule/m.test(sql))
  ok('USER_TABLES lists notify_sent (the delete function skips a table that isn\'t there yet)', (USER_TABLES as readonly string[]).includes('notify_sent')
    && /missingTable\(error\)\) \{ skipped\+\+; continue \}/.test(readFileSync('supabase/functions/delete-account/index.ts', 'utf8')))
  ok('docs/security-rls.sql §6 lists notify_sent', /--\s+notify_sent \(docs\/migrations\/2026-10-09-notify-sent\.sql/.test(readFileSync('docs/security-rls.sql', 'utf8')))

  /* ---------- legal ---------- */
  const flat = (d: ReturnType<typeof cookiePolicy>) => d.sections.flatMap((s) => [...(s.p ?? []), ...(s.ul ?? [])]).join('\n')
  ok('cookie policy: tali-notify only in the Mind version', flat(cookiePolicy({ mind: true })).includes('tali-notify') && !flat(cookiePolicy({ mind: false })).includes('tali-notify'))
  const pm = flat(privacyPolicy({ mind: true })), p0 = flat(privacyPolicy({ mind: false }))
  ok('privacy: the Mind reminders, the one-a-day record and the time zone only in the Mind version',
    /check-in reminder/.test(pm) && /reminder service keeps the last day/.test(pm) && /time zone/.test(pm) && !/check-in reminder/.test(p0) && !/reminder service keeps the last day/.test(p0))
  ok('privacy: no lock-screen names setting described while it isn\'t built', !/lock screen|lock-screen/i.test(pm))
  return bad
}
