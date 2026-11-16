/* Cycle (docs/plans/cycle.md): the shared core (gate, periods, "Day N", the check-in row, Train's
   signal, the provisional safety prompts), the `cycle` consent, the device-only log, and the §6
   must-have tests (remove, keep for another account, guest move, health withdrawal, backup round
   trip, no cycle field in any sync payload or the weekly picture). Run from scripts/test-core.ts
   (npm test); returns the number of failures. Thresholds are the PROVISIONAL alpha values. */
import { readFileSync } from 'node:fs'
import type { CheckIn } from '@/core/types'
import { MIN_AGE } from '@/core/legal'
import {
  CYCLE_THRESHOLDS, cleanCycle, currentPeriod, cycleOffered, cycleSignal, emptyCycle, holdsDeficit, logDay, markShown, markUsual, periodDay,
  periodStarted, periodsOf, promptsDue, rowShows, setSetup, bledBetween, type CycleDay, type CycleStore,
} from '@/core/domain/cycle'
import { shiftDay } from '@/core/domain/date'
import { offerLighter } from '@/core/domain/dayOptions'
import { CYCLE_ENABLED } from '@/data/cycleFlag'
import type { PersistedState } from '@/data/persistence'
import { cycleImportSkipped, ensureMeta, freshForAccount, freshForDevice, keepForAccount, loadStateFrom, stateFromBackup } from '@/data/persistence'
import { applyCycleWithdrawal, applyHealthWithdrawal, pushConsents, CONSENT_TYPES, CONSENT_VERSIONS, cycleAllowed, grantCycle, hasConsent, HEALTH_FIELDS, healthDataSummary, recordConsent, withdraw } from '@/data/consent'
import { cycleDayCount, cycleLog, deleteCycle, saveCycle, type CycleContext } from '@/data/deviceOnly'
import { pushDirty, toServerDay } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

let bad = 0
const report = (area: string, checks: [string, boolean, unknown?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `cycle: ${area}: ${n}`, !ok && detail !== undefined ? JSON.stringify(detail) : '') }
}

const TODAY = '2026-11-16'
const ago = (n: number) => shiftDay(TODAY, -n)
/** a period of `len` days starting `start`, flow by day */
function bleed(days: Record<string, CycleDay>, start: string, len: number, extra: Partial<CycleDay> = {}, flow: CycleDay['flow'] = 'medium') {
  for (let i = 0; i < len; i++) days[shiftDay(start, i)] = { flow, ...extra }
}
const store = (setup: CycleStore['setup'], days: Record<string, CycleDay> = {}): CycleStore => ({ setup, days })
const SENTINEL_CHIP = 'breast-tenderness'

function coreChecks() {
  /* gate (§3) */
  report('gate', [
    ['female + health yes + adult', cycleOffered({ sexAnswer: 'female', healthYes: true, age: 30 })],
    ['never on prefer-not-to-say (stored as legacy F)', !cycleOffered({ sexAnswer: 'unspecified', healthYes: true, age: 30 })],
    ['never without an onboarding answer', !cycleOffered({ healthYes: true, age: 30 })],
    ['never without a current health yes (a withdrawal clears sexAnswer too)', !cycleOffered({ sexAnswer: 'female', healthYes: false, age: 30 }) && !cycleOffered({ sexAnswer: undefined, healthYes: false, age: 30 })],
    ['never below MIN_AGE, or with no age', !cycleOffered({ sexAnswer: 'female', healthYes: true, age: MIN_AGE - 1 }) && !cycleOffered({ sexAnswer: 'female', healthYes: true, age: null }) && cycleOffered({ sexAnswer: 'female', healthYes: true, age: MIN_AGE })],
    ['the flag is off in a production build', CYCLE_ENABLED === false],
  ])

  /* periods (§4) */
  {
    const d: Record<string, CycleDay> = {}
    bleed(d, ago(40), 5)
    bleed(d, ago(12), 2); d[ago(10)] = { flow: 'stopped' }; d[ago(9)] = { flow: 'light' } // a dry day in the middle
    d[ago(20)] = { flow: 'spotting' } // spotting on its own doesn't start a period
    const ps = periodsOf(d)
    const d2: Record<string, CycleDay> = {}
    bleed(d2, ago(10), 2); bleed(d2, ago(5), 1) // 2 silent days between: a new period
    const d3: Record<string, CycleDay> = {}
    bleed(d3, ago(10), 2); d3[ago(8)] = { flow: 'stopped' }; bleed(d3, ago(6), 1) // within 2 days of Stopped
    report('periods', [
      ['two periods; spotting alone is not a start', ps.length === 2, ps],
      ['flow within 2 days of Stopped carries on the same period', ps[1].start === ago(12) && ps[1].last === ago(9) && ps[1].length === 4],
      ['flow after 2 silent days starts a new one', periodsOf(d2).length === 2],
      ['flow 2 days after Stopped carries on', periodsOf(d3).length === 1],
      ['a Stopped tapped weeks after a period never joins the next one onto it (ship-critic)', (() => {
        const x = store('irregular'); bleed(x.days, '2026-10-01', 3); x.days['2026-10-25'] = { flow: 'stopped' }; bleed(x.days, '2026-10-26', 2)
        return periodsOf(x.days).length === 2 && !promptsDue(x, '2026-10-27').includes('long-bleed') && periodDay(x.days, '2026-10-27') === 2
      })()],
    ])
    const live: Record<string, CycleDay> = {}
    bleed(live, ago(2), 3)
    const ended: Record<string, CycleDay> = {}
    bleed(ended, ago(3), 2); ended[ago(1)] = { flow: 'stopped' }
    const silent: Record<string, CycleDay> = {}
    bleed(silent, ago(5), 2)
    report('Day N', [
      ['"Day 3" on the third flow day', periodDay(live, TODAY) === 3],
      ['ends at the first Stopped', periodDay(ended, TODAY) === null && currentPeriod(ended, TODAY) === null],
      ['ends after 2 days with no flow answer', periodDay(silent, TODAY) === null],
      ['future days are refused', !logDay(emptyCycle(), shiftDay(TODAY, 1), { flow: 'light' }, TODAY)],
      ['"Period started" logs flow without a check-in', (() => { const s = emptyCycle(); return periodStarted(s, ago(1), TODAY) && periodDay(s.days, TODAY) === 2 })()],
    ])
  }

  /* the check-in row (§4, Sara 4 Nov) */
  {
    const reg = store('regular')
    bleed(reg.days, ago(60), 5); bleed(reg.days, ago(32), 5) // usual gap 28; last start 32 days ago
    const between = store('regular'); bleed(between.days, ago(40), 5); bleed(between.days, ago(12), 5) // last start 12 days ago
    const one = store('regular'); bleed(one.days, ago(12), 5)
    const irr = store('irregular'); bleed(irr.days, ago(40), 5); bleed(irr.days, ago(12), 5)
    const after = store('regular'); bleed(after.days, ago(40), 5); bleed(after.days, ago(8), 5) // last flow 4 days ago
    report('row', [
      ['regular, 2+ starts: hidden between periods', !rowShows(between, TODAY)],
      ['back from 7 days before the usual start until a period is logged', rowShows(reg, TODAY) && rowShows(between, shiftDay(ago(12), 21)) && !rowShows(between, shiftDay(ago(12), 20))],
      ['shows for 3 days after a period', rowShows(after, ago(1)) && !rowShows(after, TODAY)],
      ['one start only: every check-in', rowShows(one, TODAY)],
      ['any other answer: every check-in', rowShows(irr, TODAY) && rowShows(store('unsaid'), TODAY)],
      ['an odd gap (missed log) falls back to every check-in', (() => { const x = store('regular'); bleed(x.days, ago(150), 3); bleed(x.days, ago(20), 3); return rowShows(x, TODAY) })()],
      ['paused (pregnancy) or "I don\'t have periods": hidden', !rowShows(irr, TODAY, { paused: true }) && !rowShows(store('none'), TODAY)],
    ])
  }

  /* Train's lighter offer (§5): one absolute signal, Train and Today only */
  {
    const lowSleep = { sleep: 1, stress: 1, energy: 3, sore: 1 } as CheckIn
    const s = store('regular'); s.days[TODAY] = { flow: 'heavy', pain: 3 }
    const heavyOnly = store('regular'); heavyOnly.days[TODAY] = { flow: 'heavy', pain: 2 }
    const src = (f: string) => readFileSync(f, 'utf8')
    report('lighter offer', [
      ['pain "A lot" plus one low signal offers it', offerLighter(lowSleep, [], cycleSignal(s, TODAY)) && !offerLighter(lowSleep, [])],
      ['pain alone does not', !offerLighter({ sleep: 3, stress: 1, energy: 3, sore: 1 } as CheckIn, [], cycleSignal(s, TODAY))],
      ['heavy flow alone is no signal', !cycleSignal(heavyOnly, TODAY)],
      ['weekPicture and hardDay never pass it and never import cycle', !/offerLighter\([^)]*,[^)]*,/.test(src('src/core/domain/weekPicture.ts')) && !src('src/core/domain/weekPicture.ts').includes('cycle') && !src('src/core/domain/mind.ts').includes('cycle') && !src('src/core/domain/dayOptions.ts').includes("from './cycle'")],
    ])
  }

  /* weigh-in note (§5 Body) */
  {
    const s = store('regular'); bleed(s.days, ago(3), 2)
    report('weigh-in', [['bled in the week', bledBetween(s, ago(6), TODAY) && !bledBetween(s, ago(20), ago(10)) && !bledBetween(undefined, ago(6), TODAY)]])
  }

  /* safety prompts (§5.1), provisional */
  {
    const T = CYCLE_THRESHOLDS
    const long = store('regular'); bleed(long.days, ago(T.longBleedDays), T.longBleedDays + 1)
    const short = store('regular'); bleed(short.days, ago(T.longBleedDays - 1), T.longBleedDays)
    const heavy1 = store('regular'); bleed(heavy1.days, ago(3), 4, {}, 'heavy')
    const heavy2 = store('regular'); bleed(heavy2.days, ago(31), 4, {}, 'heavy'); bleed(heavy2.days, ago(3), 4, {}, 'heavy')
    const pain2 = store('irregular'); bleed(pain2.days, ago(31), 4, { pain: 3 }); bleed(pain2.days, ago(3), 4, { pain: 3 })
    const checkins = Array.from({ length: 120 }, (_, i) => ago(i))
    const gap = (setup: CycleStore['setup']) => { const x = store(setup); bleed(x.days, ago(T.noPeriodDays + 5), 4); return x }
    report('prompts', [
      ['the thresholds are marked provisional', T.provisional === true],
      ['bleeding past a week fires long-bleed; a week does not', promptsDue(long, TODAY).includes('long-bleed') && !promptsDue(short, TODAY).includes('long-bleed')],
      ['one heavy period does not fire heavy; two do', !promptsDue(heavy1, TODAY).includes('heavy') && promptsDue(heavy2, TODAY).includes('heavy')],
      ['pain "A lot" across two periods fires pain', promptsDue(pain2, TODAY).includes('pain')],
      ['no logged period for the long stretch fires no-period, only while they kept checking in', promptsDue(gap('regular'), TODAY, { checkinDays: checkins }).includes('no-period') && !promptsDue(gap('regular'), TODAY, { checkinDays: checkins.slice(0, 20) }).includes('no-period')],
      ['not for "often stop or skip" or perimenopause', !promptsDue(gap('stop-skip'), TODAY, { checkinDays: checkins }).includes('no-period') && !promptsDue(gap('perimenopause'), TODAY, { checkinDays: checkins }).includes('no-period')],
      ['paused (pregnancy) or no setup: none', !promptsDue(heavy2, TODAY, { paused: true }).length && !promptsDue({ days: heavy2.days }, TODAY).length],
      ['holdsDeficit follows no-period; never for stop-skip', holdsDeficit(gap('regular'), TODAY, { checkinDays: checkins }) && !holdsDeficit(gap('stop-skip'), TODAY, { checkinDays: checkins }) && !holdsDeficit(heavy2, TODAY, { checkinDays: checkins })],
    ])
    // shown once per episode, at most once per gap
    const shown = JSON.parse(JSON.stringify(heavy2)) as CycleStore
    markShown(shown, ['heavy'], TODAY)
    // "This is usual for me": stops it until the pattern changes
    const usual = JSON.parse(JSON.stringify(heavy2)) as CycleStore
    markUsual(usual, 'heavy', TODAY)
    const later = shiftDay(TODAY, 28)
    const same = JSON.parse(JSON.stringify(usual)) as CycleStore; bleed(same.days, shiftDay(later, -3), 4, {}, 'heavy')
    const more = JSON.parse(JSON.stringify(usual)) as CycleStore; bleed(more.days, shiftDay(later, -5), 6, {}, 'heavy')
    const rearmed = JSON.parse(JSON.stringify(same)) as CycleStore; setSetup(rearmed, 'irregular', shiftDay(TODAY, 1))
    const lapsed = JSON.parse(JSON.stringify(same)) as CycleStore; bleed(lapsed.days, shiftDay(TODAY, T.usualLapseDays), 4, {}, 'heavy')
    // mental-performance fixes (16 Nov)
    const midTap = store('regular'); bleed(midTap.days, ago(31), 4, {}, 'heavy'); bleed(midTap.days, ago(1), 2, {}, 'heavy')
    markUsual(midTap, 'heavy', ago(1)); bleed(midTap.days, TODAY, 1, {}, 'heavy') // one more Heavy day in the same period
    const stale = store('regular'); bleed(stale.days, ago(60), 4, {}, 'heavy'); bleed(stale.days, ago(30), 4, {}, 'heavy')
    const paused = gap('regular'); paused.resumedAt = ago(10)
    const switched = gap('stop-skip'); setSetup(switched, 'regular', ago(5))
    const irr = gap('irregular')
    const spotStart: Record<string, CycleDay> = { [ago(3)]: { flow: 'spotting' }, [ago(2)]: { flow: 'medium' }, [ago(1)]: { flow: 'medium' } }
    const spotOnly = gap('regular'); spotOnly.days[ago(5)] = { flow: 'spotting' }
    const onceGap = gap('regular'); markShown(onceGap, ['no-period'], ago(T.promptGapDays))
    report('prompts: mental-performance fixes', [
      ['a mid-period "usual" tap is not undone by the same period', !promptsDue(midTap, TODAY).includes('heavy')],
      ['heavy and pain never show weeks after the period', !promptsDue(stale, TODAY).includes('heavy')],
      ['no-period never fires the day a pause ends or a setup changes', !promptsDue(paused, TODAY, { checkinDays: checkins }).includes('no-period') && !promptsDue(switched, TODAY, { checkinDays: checkins }).includes('no-period')],
      ['"irregular" waits longer (provisional)', !promptsDue(irr, TODAY, { checkinDays: checkins }).includes('no-period') && T.noPeriodDaysIrregular > T.noPeriodDays],
      ['spotting then flow backdates the start; spotting counts as not a gap', periodsOf(spotStart)[0]?.start === ago(3) && !promptsDue(spotOnly, TODAY, { checkinDays: checkins }).includes('no-period')],
      ['no-period shows once per gap, not every 3 months', !promptsDue(onceGap, TODAY, { checkinDays: checkins }).includes('no-period')],
      ['one check-in per block is not enough', !promptsDue(gap('regular'), TODAY, { checkinDays: Array.from({ length: 4 }, (_, i) => ago(i * 30)) }).includes('no-period')],
    ])
    report('prompts: once and usual', [
      ['once shown, not again within the gap', !promptsDue(shown, shiftDay(TODAY, 1)).includes('heavy')],
      ['"usual" stops it for a period like the usual', !promptsDue(same, later).includes('heavy')],
      ['more Heavy days than their most re-arms it', promptsDue(more, later).includes('heavy')],
      ['a setup change re-arms it', promptsDue(rearmed, later).includes('heavy')],
      ['12 months after the tap re-arms it', promptsDue(lapsed, shiftDay(TODAY, T.usualLapseDays + 3)).includes('heavy')],
    ])
  }

  /* validation */
  {
    const c = cleanCycle({ setup: 'regular', days: { [TODAY]: { flow: 'heavy', pain: 3, chips: ['cramps', 'nope'], note: 'x' }, 'bad-key': { flow: 'light' }, [ago(1)]: { flow: 'pms' } }, usual: { heavy: { at: TODAY, base: 2 }, nope: {} }, extra: 1 })
    report('validation', [
      ['keeps valid values only', JSON.stringify(c) === JSON.stringify({ days: { [TODAY]: { flow: 'heavy', pain: 3, chips: ['cramps'] } }, setup: 'regular', usual: { heavy: { at: TODAY, base: 2 } } }) || (c?.setup === 'regular' && Object.keys(c.days).length === 1 && c.days[TODAY].chips?.length === 1 && !('note' in c.days[TODAY]) && !('extra' in c)), c],
      ['empty is undefined', cleanCycle({ days: {} }) === undefined && cleanCycle(null) === undefined],
    ])
  }
}

/* ---------- consent and the device-only log (§6) ---------- */

const OTHER = '00000000-0000-0000-0000-0000000000bb'
const ON: CycleContext = { signedIn: true, ownerAsk: false, cycleYes: true }

function owned(owner = LOCAL_USER): PersistedState {
  const s = loadStateFrom(null)
  ensureMeta(s, false).owner = owner
  return s
}
function withCycle(): PersistedState {
  const s = owned()
  recordConsent(s, 'health', true)
  grantCycle(s)
  const log = store('regular'); bleed(log.days, ago(2), 3, { chips: [SENTINEL_CHIP] }, 'heavy'); setSetup(log, 'regular', TODAY)
  saveCycle(s, log, ON)
  return s
}

async function withFetch<T>(f: typeof fetch, run: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch
  globalThis.fetch = f
  try { return await run() } finally { globalThis.fetch = real }
}

async function dataChecks(fakeServer: FakeServer) {
  {
    const s = owned()
    const before = grantCycle(s)
    recordConsent(s, 'health', true)
    const yes = grantCycle(s)
    report('consent', [
      ['a consent type of its own, versioned', (CONSENT_TYPES as readonly string[]).includes('cycle') && CONSENT_VERSIONS.cycle === '2026-11-v1'],
      ['needs a current health yes', before === null && !!yes && cycleAllowed(s)],
      ['the health wording and version are unchanged', CONSENT_VERSIONS.health === '2026-09-v1'],
      ['the device cycle log is a health field', (HEALTH_FIELDS as readonly string[]).includes('device.cycle')],
    ])
  }
  {
    const s = withCycle()
    const ok = cycleDayCount(s) === 3 && !!cycleLog(s, ON)
    report('log', [
      ['saved under the owner, read back', ok && s.deviceOnly?.cycle?.owner === LOCAL_USER],
      ['not readable signed out, while an owner question is pending, or without a cycle yes', !cycleLog(s, { ...ON, signedIn: false }) && !cycleLog(s, { ...ON, ownerAsk: true }) && !cycleLog(s, { ...ON, cycleYes: false })],
      ['not writable without a cycle yes', !saveCycle(owned(), emptyCycle(), { ...ON, cycleYes: false })],
      ['"Delete all cycle data" works with no consent and no connection', deleteCycle(s) && cycleDayCount(s) === 0 && !deleteCycle(s)],
    ])
  }
  {
    const s = withCycle(); const meta = ensureMeta(s, false)
    withdraw(s, meta, 'cycle')
    const h = withCycle(); withdraw(h, ensureMeta(h, false), 'health')
    const other = withCycle()
    // a health withdrawal made on another device arrives in a pull
    recordConsent(other, 'health', false)
    applyHealthWithdrawal(other, ensureMeta(other, false))
    report('withdrawal', [
      ['turning Cycle off records a withdrawal and deletes the log', !hasConsent(s, 'cycle') && cycleDayCount(s) === 0],
      ['a health withdrawal deletes it and records a cycle withdrawal', cycleDayCount(h) === 0 && !hasConsent(h, 'cycle') && h.consents!.records.filter((r) => r.type === 'cycle').length === 2],
      ['…also when it comes from another device', cycleDayCount(other) === 0 && !hasConsent(other, 'cycle')],
      ['healthDataSummary counts the days, never their contents', healthDataSummary(withCycle()).cycleDays === 3 && !JSON.stringify(healthDataSummary(withCycle())).includes(SENTINEL_CHIP)],
    ])
  }
  {
    const s = withCycle()
    const kept = keepForAccount(JSON.parse(JSON.stringify(s)), OTHER)
    const reloaded = loadStateFrom(JSON.parse(JSON.stringify(s)))
    const otherOwner = JSON.parse(JSON.stringify(s)) as PersistedState; otherOwner._meta!.owner = OTHER
    const guest = JSON.parse(JSON.stringify(s)) as PersistedState; delete guest._meta!.owner
    report('owners', [
      ['a plain sign-out keeps it (reload under the same owner)', cycleDayCount(reloaded) === 3],
      ['"remove from this device" leaves none', !freshForDevice().deviceOnly && !freshForAccount(LOCAL_USER).deviceOnly],
      ['a different account keeping this device\'s data never carries it', !kept.deviceOnly?.cycle],
      ['another owner\'s log is dropped on load', cycleDayCount(loadStateFrom(otherOwner)) === 0],
      ['the old guest log (no owner) never carries it', cycleDayCount(loadStateFrom(guest)) === 0],
    ])
  }
  {
    const src = withCycle()
    const file = JSON.parse(JSON.stringify(src)) as PersistedState
    const yes = owned(); recordConsent(yes, 'health', true); grantCycle(yes)
    const no = owned(); recordConsent(no, 'health', true)
    const into = stateFromBackup(JSON.parse(JSON.stringify(file)), yes)
    const refused = stateFromBackup(JSON.parse(JSON.stringify(file)), no)
    const mine = withCycle(); mine.deviceOnly!.cycle!.log.days = { [TODAY]: { flow: 'light' } }
    const keepsMine = stateFromBackup(JSON.parse(JSON.stringify(file)), mine)
    report('backup', [
      ['the export holds the log (JSON backup = the device state)', JSON.stringify(file).includes(SENTINEL_CHIP)],
      ['a round trip with a current cycle yes keeps it', cycleDayCount(into) === 3 && into.deviceOnly?.cycle?.owner === LOCAL_USER],
      ['import needs a current cycle yes, and says so', cycleDayCount(refused) === 0 && cycleImportSkipped(file, no)],
      ['a restore never overwrites this device\'s own log', cycleDayCount(keepsMine) === 1],
    ])
  }
  /* before the migration: a refused cycle row stays unsynced but never fails the sync (security-data) */
  {
    const s = withCycle(); withdraw(s, ensureMeta(s, false), 'ai')
    const stub = (async (_url: string, o: RequestInit = {}) => {
      const body = String(o.body ?? '')
      return body.includes('"cycle"') ? new Response(JSON.stringify({ code: '23514' }), { status: 400 }) : new Response(null, { status: 201 })
    }) as typeof fetch
    let threw = false
    await withFetch(stub, () => pushConsents(s)).catch(() => { threw = true })
    const left = s.consents!.records.filter((r) => r._dirty)
    const other = withCycle(); recordConsent(other, 'cycle', false)
    report('sync before the migration', [
      ['the refused cycle row does not throw', !threw],
      ['the other rows upload; only cycle rows stay unsynced', left.length > 0 && left.every((r) => r.type === 'cycle')],
      ['a cycle "no" from another device deletes the log here', applyCycleWithdrawal(other) && cycleDayCount(other) === 0],
    ])
  }
  /* sentinel: no cycle field in any sync payload */
  {
    const s = withCycle()
    s.days[TODAY] = { foods: [], supps: {}, weight: 60, workout: null, checkin: { mood: 2, t: '2026-11-16T07:00:00.000Z' } as never } as never
    delete s._meta; ensureMeta(s, true).owner = LOCAL_USER
    const rows: Record<string, any[]> = { settings: [], day_logs: [], custom_foods: [], recipes: [], routines: [], training_plans: [], consents: [] }
    const srv = fakeServer(rows)
    const bodies: string[] = []
    const spy = (async (url: string, o: RequestInit = {}) => { bodies.push(String(url) + ' ' + (o.body == null ? '' : String(o.body))); return srv.fetchFn(url as never, o) }) as typeof fetch
    await withFetch(spy, () => pushDirty(s, s._meta!))
    const all = bodies.join('\n') + JSON.stringify(rows) + JSON.stringify(toServerDay(s, TODAY, LOCAL_USER)) + JSON.stringify({ target: s.target, schedule: s.schedule, profile: s.profile })
    const consentRows = (rows.consents || []).filter((r: { type: string }) => r.type === 'cycle')
    report('sentinel', [
      ['the push ran', srv.calls.some((c) => c.startsWith('POST day_logs')) && srv.calls.some((c) => c.startsWith('POST settings'))],
      ['no upload or stored row holds the log', !all.includes(SENTINEL_CHIP) && !all.includes('"flow"') && !all.includes('"cycle":{') && !all.includes('"setup"')],
      ['only the consent record reaches the server', consentRows.length === 1 && Object.keys(consentRows[0]).every((k) => ['id', 'user_id', 'type', 'version', 'granted', 'recorded_at', 'created_at', 'updated_at'].includes(k))],
    ])
  }
}

export async function cycleSuite(fakeServer: FakeServer): Promise<number> {
  bad = 0
  coreChecks()
  await dataChecks(fakeServer)
  return bad
}
