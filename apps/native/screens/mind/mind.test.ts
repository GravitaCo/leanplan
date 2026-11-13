/**
 * Unit tests for the native Mind view models and the Reset pacer clock. Pure Node: run with
 * `npm run test:mind` from apps/native (bundled by the repo's esbuild with @ → src, as the web's
 * npm test). Expected values come from the web's own sources and e2e cases (scripts/e2e-wellbeing.cjs
 * wp6, wp11, wp12, wp13), never retyped timings.
 */
import { RESET_PATTERN } from '@/core/data/skills'
import { breathMs, pacerAt, runMs } from '@/core/domain/pacer'
import { glowAt } from '@/screens/mind/glow'
import { MIND, SHARED } from '@/screens/mind/copy'
import { RESET } from '@/screens/mind/resetCopy'
import type { WeekReflection } from '@/core/domain/mind'
import { pacerEase, pacerTick, phaseEnd, startPacerRun, type ClockEnv, type PacerSegment } from './pacerClock'
import {
  flipPick, mindPageModel, popView, pushView, reflectionView, resetInitial, resetReducer, resetView, routineStart,
  saveRoutine, stackOnArrival, stackView, supportModel, unloadInitial, unloadReducer, windDownModel, finishReset, openMindCheckin,
} from './model'

let bad = 0
const ok = (name: string, pass: boolean, detail?: unknown) => {
  if (!pass) bad++
  console.log(pass ? 'PASS' : 'FAIL', 'native mind:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/* ---------- the pacer clock ---------- */
{
  // the ease the UI thread uses equals pacerAt's: check pacerAt's scale inside each phase against it
  let worst = 0
  const b = breathMs(RESET_PATTERN)
  for (let t = 0; t < b; t += 37) {
    const s = pacerAt(RESET_PATTERN, t, 1)
    const k = pacerTick(RESET_PATTERN, 1, t, '')
    const seg = k.segment!
    // where the segment animation would be at t, from the phase start
    const phStart = RESET_PATTERN.phases.slice(0, s.phase).reduce((a, x) => a + x.s * 1000, 0)
    const len = RESET_PATTERN.phases[s.phase].s * 1000
    const from = pacerAt(RESET_PATTERN, phStart, 1).scale
    const at = from + (seg.to - from) * pacerEase((t - phStart) / len)
    worst = Math.max(worst, Math.abs(at - s.scale))
  }
  ok('a segment started at its phase start follows pacerAt exactly (in-out sine)', worst < 1e-9, worst)
  ok('phase ends: full breath in, then full, then empty', phaseEnd(RESET_PATTERN, 0) > 0.7 && phaseEnd(RESET_PATTERN, 0) < 0.8 && Math.abs(phaseEnd(RESET_PATTERN, 1) - 1) < 1e-6 && phaseEnd(RESET_PATTERN, 2) < 1e-6)

  // a run under a fake clock: states, segments, time left, done
  let now = 0
  const timers: { at: number; fn: () => void; id: number }[] = []
  let id = 0
  const env: ClockEnv = {
    now: () => now,
    setTimeout: (fn, ms) => { timers.push({ at: now + ms, fn, id: ++id }); return id },
    clearTimeout: (h) => { const i = timers.findIndex((x) => x.id === h); if (i >= 0) timers.splice(i, 1) },
  }
  const advance = (ms: number) => {
    const end = now + ms
    for (;;) {
      timers.sort((a, z) => a.at - z.at)
      const next = timers[0]
      if (!next || next.at > end) break
      timers.shift(); now = next.at; next.fn()
    }
    now = end
  }
  const words: string[] = []
  const counts: [string, number][] = []
  const segs: PacerSegment[] = []
  const lefts: string[] = []
  let done = 0
  startPacerRun(RESET_PATTERN, 1, {
    onState: (s) => { if (s.done) return; if (words[words.length - 1] !== s.word) words.push(s.word); counts.push([s.word, s.count]) },
    onSegment: (s) => segs.push(s),
    onLeft: (l) => lefts.push(l),
    onDone: () => { done++ },
  }, env)
  advance(runMs(RESET_PATTERN, 1) + 5000)
  const breaths = runMs(RESET_PATTERN, 1) / breathMs(RESET_PATTERN)
  ok('words step in order each breath (from skills.ts)', eq(words.slice(0, 3), RESET_PATTERN.phases.map((p) => p.word)) && words.length === breaths * 3, words)
  const badCount = counts.findIndex(([w, c], i) => ((i === 0 || counts[i - 1][0] !== w) ? c !== 1 : c !== counts[i - 1][1] + 1))
  ok('counts start at 1 and go up by one within each phase', badCount < 0, counts.slice(Math.max(0, badCount - 3), badCount + 2))
  ok('one segment per phase, lasting the phase (ticks land 1 ms after each second)', segs.length === breaths * 3 && segs.slice(0, 3).every((s, i) => Math.abs(s.durationMs - RESET_PATTERN.phases[i].s * 1000) <= 2), segs.slice(0, 3))
  ok('time left starts at the run length and steps down to 0:00', lefts[0] === '1:00' && lefts[lefts.length - 1] === '0:00', [lefts[0], lefts[lefts.length - 1]])
  ok('done fires once, at the end', done === 1 && timers.length === 0)

  // a stopped run reports nothing more
  now = 0; timers.length = 0
  let after = 0, doneStopped = 0
  const stop = startPacerRun(RESET_PATTERN, 1, { onState: () => { after++ }, onDone: () => { doneStopped++ } }, env)
  advance(2500)
  const seen = after
  stop()
  advance(120000)
  ok('stop: no more states, never done', after === seen && doneStopped === 0 && timers.length === 0)

  // resumed mid-phase (a late tick): the segment runs from where the sphere is, for what's left
  const mid = pacerTick(RESET_PATTERN, 1, 1500, '')
  ok('mid-phase segment from the current fullness for the rest of the phase', !!mid.segment && Math.abs(mid.segment.from - pacerAt(RESET_PATTERN, 1500, 1).scale) < 1e-12 && mid.segment.durationMs === 1500 && mid.nextInMs === 500)
  ok('mid breath in: "Breathe in", count 2 (wp12-reset)', mid.state.word === 'Breathe in' && mid.state.count === 2)
  ok('glow shared with the web: rest 0.8, full 1', glowAt(0).sphere === 0.8 && glowAt(1).sphere === 1)
}

/* ---------- the Mind page ---------- */
{
  const ci = { mood: 2, hunger: 3, sleep: 2, stress: 2, energy: 2, sore: 0, note: '', t: '2026-10-08T08:30:00.000Z' }
  const m = mindPageModel('2026-10-08', ci as never, false)
  ok('eyebrow "Thursday 8 October" (wp6-mind)', m.eyebrow === 'Thursday 8 October', m.eyebrow)
  ok('pairs Mood, Sleep, Stress, Energy, with Update (gray)', eq(m.pairs.map(([k]) => k), [MIND.mood, MIND.sleep, MIND.stress, MIND.energy]) && m.checkinButton.title === 'Update' && m.checkinButton.kind === 'gray')
  ok('no skills with MIND_REVIEWED off', m.skills.length === 0)
  const r = mindPageModel('2026-10-08', null, true)
  ok('before a check-in: Check in (ink)', r.pairs.length === 0 && r.checkinButton.title === 'Check in' && r.checkinButton.kind === 'ink')
  ok('skills Reset, Wind down, Unload, Get outside (wp6-mind-reviewed)', eq(r.skills.map((s) => s.name), ['Reset', 'Wind down', 'Unload', 'Get outside']), r.skills.map((s) => s.name))

  const calls: string[] = []
  const st = (declined: boolean, cur: string) => ({
    data: { consents: { records: declined ? [{ id: 'x', type: 'health', version: '2026-09-v1', granted: false, at: '2026-09-20T08:00:00.000Z' }] : [{ id: 'x', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] } } as never,
    cur, setDate: (d: string) => { calls.push('date ' + d) }, openProfile: (s: string) => { calls.push('profile ' + s) },
  })
  ok('check-in: moves the day to today, then the sheet', openMindCheckin(st(false, '2026-10-07'), '2026-10-08') === 'sheet' && calls.pop() === 'date 2026-10-08')
  ok('check-in with health declined: Profile health', openMindCheckin(st(true, '2026-10-08'), '2026-10-08') === 'health' && calls.pop() === 'profile health')
}

/* ---------- the stack ---------- */
{
  let s = pushView([], 'wind-down')
  s = pushView(s, 'reset')
  ok('Reset from Wind down: Back reads "Wind down", no tab bar', stackView(s).screen === 'reset' && stackView(s).resetBack === 'Wind down' && stackView(s).hideTabBar)
  ok('Reset from the page: Back reads "Mind"', stackView(['reset']).resetBack === 'Mind')
  const u = stackView(['wind-down', 'unload'])
  ok('Unload over Wind down keeps Wind down under it', u.screen === 'wind-down' && u.unload)
  ok('Unload over the page keeps the tab bar', !stackView(['unload']).hideTabBar && stackView(['unload']).unload)
  ok('pop returns to Wind down', stackView(popView(s)).screen === 'wind-down')
  ok('openMind opens a view only once the skills are reviewed', eq(stackOnArrival('reset', true), ['reset']) && stackOnArrival('reset', false) === null && stackOnArrival(null, true) === null)
}

/* ---------- Reset ---------- */
{
  let s = resetInitial
  ok('starts ready at 2 min', s.stage === 'ready' && s.len === 2)
  const v0 = resetView(s, false, '')
  ok('ready: intro, pacer, Start, 1/2/5 min', v0.intro && v0.pacer && v0.button.title === RESET.start && eq(v0.lengths.map(([, l]) => l), ['1 min', '2 min', '5 min']) && !v0.left && !v0.end)
  s = resetReducer(s, { type: 'start' })
  const v1 = resetView(s, false, '1:58')
  ok('running: no intro, time left, Stop (gray)', !v1.intro && v1.left === '1:58 left' && v1.button.title === RESET.stop && v1.button.kind === 'gray' && v1.reducedLine === null)
  ok('running with Reduce Motion: B7.10', resetView(s, true, '1:58').reducedLine === RESET.reduced)
  ok('length is fixed while running', resetReducer(s, { type: 'length', len: 5 }).len === 2)
  const stopped = resetReducer(s, { type: 'stop' })
  const vs = resetView(stopped, false, '1:40')
  ok('stopped: B7.15 only, no time, no pacer, Done', vs.end?.title === null && vs.end?.line === RESET.comeBack && !vs.left && !vs.pacer && vs.button.title === RESET.done)
  const fin = resetReducer(resetReducer(resetReducer(resetInitial, { type: 'length', len: 1 }), { type: 'start' }), { type: 'finish' })
  ok('finished: "That\'s 1 minute."', resetView(fin, false, '').end?.title === "That's 1 minute.")
  ok('a length after a run goes back to ready', resetReducer(fin, { type: 'length', len: 5 }).stage === 'ready')
  ok('finish after stop does nothing', resetReducer(stopped, { type: 'finish' }).stage === 'stopped')

  const log: string[] = []
  const store = (thing?: { key: string }) => ({ data: { days: { '2026-10-08': { checkin: { thing } } } } as never, logSkill: () => { log.push('log'); return true }, doneThing: () => { log.push('done'); return true } })
  finishReset(store({ key: 'reset-2' }), '2026-10-08')
  const withThing = log.splice(0)
  finishReset(store({ key: 'outside-10' }), '2026-10-08')
  ok('a finished run is logged; a Reset thing is ticked, another thing is not', withThing.includes('log') && log.includes('log') && !log.includes('done'), { withThing, log })
}

/* ---------- Support (wp6-mind) ---------- */
{
  const names = (n: Parameters<typeof supportModel>[0]) => supportModel(n).rows.map((r) => r.name)
  const uk = supportModel(null)
  ok('whole UK: Samaritans, Shout, Your GP, Beat, Emergency services', eq(names(null), ['Samaritans', 'Shout', 'Your GP', 'Beat', 'Emergency services']), names(null))
  ok('whole UK: "Showing services for the whole UK", Choose, the footnote', uk.showing === 'Showing services for the whole UK' && uk.pick === 'Choose' && uk.foots[0] === 'Choose your nation above to see your local NHS services.')
  ok('no 111 before a nation', !JSON.stringify(uk.rows).includes('111'))
  ok('999 and Beat UK-wide as tel links', uk.rows.some((r) => r.href === 'tel:999') && uk.rows.some((r) => r.href === 'tel:08088010677'))
  const shout = uk.rows.find((r) => r.name === 'Shout')!
  ok('Shout texts', shout.href === 'sms:85258?&body=SHOUT' && shout.desc === 'Text SHOUT to 85258 · 24 hours, every day' && shout.a11y === 'Shout: text 85258')
  ok('the GP row has no number', !uk.rows.find((r) => r.name === 'Your GP')!.num)
  ok('the two feet verbatim, last', uk.foots.slice(-2)[0].startsWith('Tilo isn’t a crisis service') && uk.foots.slice(-1)[0].startsWith('Opening this page is private.'))
  const en = supportModel('england')
  ok('England rows and Change', eq(names('england'), ['Samaritans', 'Shout', 'NHS 111, option 2', 'NHS 111', 'Beat', 'Emergency services']) && en.pick === 'Change' && en.showing === 'Showing services for England' && en.foots.length === 2)
  ok('Scotland rows', eq(names('scotland'), ['Samaritans', 'Shout', 'NHS 24 (111), mental health option', 'NHS 24 (111)', 'Beat', 'Emergency services']), names('scotland'))
  const ni = supportModel('northern-ireland')
  ok('Northern Ireland rows, Lifeline calls, no 111', eq(names('northern-ireland'), ['Samaritans', 'Shout', 'Lifeline', 'Your GP', 'Beat', 'Emergency services']) && ni.rows.find((r) => r.name === 'Lifeline')!.href === 'tel:08088088000' && !JSON.stringify(ni.rows).includes('111'))
  ok('Northern Ireland GP: out-of-hours words', ni.rows.find((r) => r.name === 'Your GP')!.desc === 'Medical help when it isn’t an emergency. Evenings and weekends, call your area’s GP out-of-hours service.')
  ok('Wales rows', names('wales').length === 6, names('wales'))
  ok('the rows with a web link keep the number as its own target', supportModel('england').rows.filter((r) => r.web).every((r) => r.numOnly))
}

/* ---------- Unload form ---------- */
{
  let s = unloadInitial()
  s = unloadReducer(s, { type: 'pair', i: 0, patch: { mind: 'x' } })
  for (let i = 0; i < 20; i++) s = unloadReducer(s, { type: 'add' })
  ok('Add another stops at the cap', s.pairs.length > 1 && s.pairs.length === unloadReducer(s, { type: 'add' }).pairs.length)
  ok('pair edits only that pair', s.pairs[0].mind === 'x' && s.pairs[1].mind === '')
  const e = unloadReducer(s, { type: 'earlier' })
  ok('Earlier notes and back swap in place (no slide)', e.view === 'earlier' && e.moved && unloadReducer(e, { type: 'form' }).view === 'form')
  ok('went OK starts closed and toggles', !s.okOpen && unloadReducer(s, { type: 'toggleOk' }).okOpen)
}

/* ---------- Wind down ---------- */
{
  const w = windDownModel(undefined, false)
  ok('default routine, no time line, the sheet', w.steps.length > 0 && w.from === null && w.change === 'sheet' && w.title === 'Wind down')
  ok('Unload and Reset steps open their screens', w.steps.filter((s) => s.opens).map((s) => s.opens).sort().join() === 'reset,unload')
  ok('a set time shows "From 22:30"', windDownModel({ windDownAt: '22:30' }, false).from === 'From 22:30')
  ok('a bad time shows nothing', windDownModel({ windDownAt: '25:99' }, false).from === null)
  ok('health declined: Change goes to Profile', windDownModel(undefined, true).change === 'health')
  const saved: unknown[] = []
  const st = { setMindPrefs: (p: unknown) => { saved.push(p); return true } }
  ok('Done unchanged saves nothing', !saveRoutine(st, routineStart(undefined), undefined) && saved.length === 0)
  ok('Done changed saves keys only', saveRoutine(st, flipPick(routineStart(undefined), 'reset'), undefined) && saved.length === 1)
}

/* ---------- Your week ---------- */
{
  const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
  const a: WeekReflection = { days, checkins: 4, sleep: 'not-enough', skills: {}, plansReviewed: 0, observation: null }
  const va = reflectionView(a, true)
  ok('state A (wp11-reflection-a): span, count, not enough, later line, the link', va.span === '5–11 Oct' && va.count === '4 check-ins this week' && va.lines.length === 1 && va.lines[0].value === 'Not enough answers yet' && va.lines[0].bands === null && !!va.later && va.link === 'See your whole week', va)
  const b: WeekReflection = { days, checkins: 5, sleep: '6-7', skills: { reset: 2, unload: 1 }, plansReviewed: 1, observation: { heading: 'Something in your answers', text: 't', sub: 's' } as never }
  const vb = reflectionView(b, false)
  ok('state B (wp11-reflection-b): bands with 6-7 on, skills, plans, no later line, no link', vb.lines.map((l) => l.value).join('|') === 'Mostly 6 to 7 hours|Reset twice, Unload once|1 plan reviewed'
    && vb.lines[0].bands!.length === 5 && vb.lines[0].bands!.filter((x) => x.on).length === 1 && vb.lines[0].bands![2].on && vb.later === null && vb.link === null, vb)
}

ok('shared words are the web\'s', SHARED.support === 'Need support now?')
console.log(bad ? `${bad} failed` : 'all passed')
process.exit(bad ? 1 : 0)
