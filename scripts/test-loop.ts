/* The maintenance loop, step 1 (docs/plans/maintenance-loop.md): the shared weekly picture, the weekly
   review model, suggestRateAdjustment, adaptive maintenance and the maintenance band check. Run from
   scripts/test-core.ts (npm test); returns the number of failures. Placeholder thresholds are passed
   in explicitly where a test needs a number, so nothing here signs a threshold off. */
import type { AppState, CheckIn, Profile } from '@/core/types'
import { DEFAULT_PROFILE, DEFAULT_TARGET } from '@/core/data/constants'
import { shiftDay } from '@/core/domain/date'
import { LOOP_THRESHOLDS, placeholderList, type LoopThresholds } from '@/core/domain/loopThresholds'
import { patternLine, weekPicture, dayPictures } from '@/core/domain/weekPicture'
import { adaptiveMaintenance, maintenanceBandCheck, suggestRateAdjustment, weeklyReview, weightTrend, REVIEW_CHOICES } from '@/core/domain/maintenanceLoop'

let bad = 0
const report = (area: string, checks: [string, boolean, unknown?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `loop: ${area}: ${n}`, !ok && detail !== undefined ? JSON.stringify(detail) : '') }
}

const TODAY = '2026-10-05'
const ago = (n: number) => shiftDay(TODAY, -n)
const REST = { 0: 'Rest', 1: 'Rest', 2: 'Rest', 3: 'Rest', 4: 'Rest', 5: 'Rest', 6: 'Rest' } as AppState['schedule']

function state(p: Partial<Profile> = {}, kcal = 2200): AppState {
  return {
    target: { ...DEFAULT_TARGET, kcal },
    schedule: { ...REST },
    profile: { ...DEFAULT_PROFILE, sex: 'M', sexAnswer: 'male', age: 35, height: 175, activityMult: 1.5, goal: 'lose-fat', targetRate: 'standard', burnSwitch: '2026-01-01', ...p },
    days: {}, customFoods: [], recipes: [], routines: [], trainingPlans: [],
  }
}
const day = (s: AppState, d: string) => (s.days[d] ??= { foods: [], supps: {}, weight: null, workout: null, checkin: null })
const food = (s: AppState, d: string, k: number, p = 120) => { day(s, d).foods.push({ n: 'Test meal', grams: 100, k, p, c: 0, f: 0, err: 0.1 }) }
const weigh = (s: AppState, d: string, kg: number) => { day(s, d).weight = Math.round(kg * 100) / 100 }
const check = (s: AppState, d: string, c: Partial<CheckIn>) => { day(s, d).checkin = { mood: 0, hunger: 0, ...c } }
const walk = (s: AppState, d: string) => { day(s, d).sessions = [{ id: 'w' + d, modality: 'cardio', title: 'Brisk walk', cardio: { key: 'walk' }, mins: 30 }] }
/** a weigh-in every other day from `from` days ago to today, moving `perWeek` kg a week */
function series(s: AppState, startKg: number, perWeek: number, from = 26) {
  for (let i = from; i >= 0; i -= 2) weigh(s, ago(i), startKg + (perWeek / 7) * (from - i))
}
/** thresholds for a test: the defaults with the named values set */
function T(over: Partial<{ [K in keyof LoopThresholds]: LoopThresholds[K]['value'] }>): LoopThresholds {
  const t = structuredClone(LOOP_THRESHOLDS)
  for (const [k, v] of Object.entries(over)) (t as any)[k].value = v
  return t
}
const MIND_SET = T({ strainedLowDays: 3 })
const BAD_DAY: Partial<CheckIn> = { mood: 2, hunger: 2, sleep: 1, stress: 3 }

function thresholds(): void {
  const list = placeholderList()
  const unset = list.filter((x) => !x.set).map((x) => x.key).sort()
  report('thresholds', [
    ['every threshold names its owner', list.every((x) => x.owner === 'nutrition-accuracy' || x.owner === 'mental-performance')],
    ['the mind and pattern thresholds belong to mental-performance', list.filter((x) => /^(strained|pattern)/.test(x.key)).every((x) => x.owner === 'mental-performance')],
    ['a filled-in value always names the spec it came from', list.filter((x) => x.set).every((x) => !!x.seed)],
    ['nothing without a spec is guessed', JSON.stringify(unset) === JSON.stringify(['gainRatePct', 'maintenanceBandPct', 'minLoggedDays', 'patternLinesOn', 'patternMinDays', 'patternMinDiff', 'patternWindowDays', 'steadyWeeklyKg', 'strainedLowDays', 'underLoggingPct']), unset],
  ])
}

function picture(): void {
  const s = state({}, 2050)
  s.schedule[1] = 'Push' // Mondays
  for (let i = 1; i <= 7; i++) food(s, ago(i), 2000 + i * 10, 100)
  food(s, TODAY, 5000) // today is unfinished
  check(s, ago(1), BAD_DAY)
  check(s, ago(2), { mood: 4, hunger: 3, sleep: 3, stress: 1 })
  walk(s, ago(3))
  weigh(s, ago(2), 80.4); weigh(s, ago(5), 80.9); weigh(s, TODAY, 70)
  s.profile.motivations = ['more-energy', 'keep it off']
  s.profile.plans = [{ id: 'p1', when: 'I get home hungry', then: 'have yoghurt', created: ago(10), reviews: [] }]
  const w = weekPicture(s, ago(1), TODAY)
  const day1 = w.days.find((x) => x.d === ago(1))!
  report('picture', [
    ['7 days ending the given day', w.days.length === 7 && w.from === ago(7) && w.to === ago(1)],
    ['food: finished days only, so today can’t read as a miss or a feast', w.food.loggedDays === 7 && Math.round(w.food.avgKcal!) === 2040, w.food],
    ['food: in range and the typical ± margin', w.food.inRangeDays === 7 && w.food.avgMargin! >= 200 && w.food.avgMargin! <= 210, w.food],
    ['mind: counts poor sleep, high stress and hungry days', w.mind.checkins === 2 && w.mind.poorSleepDays === 1 && w.mind.highStressDays === 1 && w.mind.hungryDays === 1, w.mind],
    ['mind: a day with two worst-step signals is a low day (dayOptions)', day1.mind?.low === true && w.mind.lowDays === 1],
    ['mind: strained waits for mental-performance’s threshold', w.mind.strained === null && mindStrained(s) === false],
    ['mind: the person’s own why and if-then plans due', w.mind.motivations.join('|') === 'more-energy|keep it off' && w.mind.plansDue.length === 1],
    ['move: sessions, minutes and planned days', w.move.sessions === 1 && w.move.minutes === 30 && w.move.plannedDays === 1 && w.move.plannedDone === 0, w.move],
    ['body: the band of this week’s weigh-ins, today’s left out', w.body.weighIns === 2 && w.body.lo === 80.4 && w.body.hi === 80.9, w.body],
    ['not empty', !w.empty],
  ])
  const quietWeek = state()
  weigh(quietWeek, ago(3), 80)
  report('picture', [
    ['an empty week is empty', weekPicture(state(), ago(1), TODAY).empty],
    ['a weigh-in alone isn’t an empty week', !weekPicture(quietWeek, ago(1), TODAY).empty],
  ])
}
const mindStrained = (s: AppState) => weekPicture(s, ago(1), TODAY, MIND_SET).mind.strained

function patterns(): void {
  const s = state()
  for (let i = 1; i <= 28; i++) check(s, ago(i), i % 3 === 0 ? { mood: 3, hunger: 2, sleep: 1 } : { mood: 3, hunger: 4, sleep: 3 })
  const days = dayPictures(s, ago(28), ago(1), TODAY)
  const on = T({ patternLinesOn: true, patternMinDays: 5, patternMinDiff: 1 })
  const r = patternLine(days, on)
  report('pattern', [
    ['waits for mental-performance’s thresholds', patternLine(days).line === null && (patternLine(days) as any).reason === 'awaiting-threshold'],
    ['hungrier on poor-sleep days, as a code with its data', r.line?.code === 'hunger-poor-sleep' && r.line.diff === -2 && r.line.days[0] === 9 && r.line.days[1] === 19, r],
    ['too few days in a group: no line', (patternLine(days, T({ patternLinesOn: true, patternMinDays: 10, patternMinDiff: 1 })) as any).reason === 'not-enough-data'],
    ['a small difference: no line', patternLine(days, T({ patternLinesOn: true, patternMinDays: 5, patternMinDiff: 3 })).line === null],
    ['switched off: no line', (patternLine(days, T({ patternLinesOn: false, patternMinDays: 5, patternMinDiff: 1 })) as any).reason === 'off'],
  ])
}

function rate(): void {
  const run = (s: AppState, t: LoopThresholds = MIND_SET, lastAt?: string) => suggestRateAdjustment(s, TODAY, { healthConsent: true, lastAt, t })
  const stalled = () => { const s = state(); series(s, 80, 0); return s }
  const r = run(stalled())
  const fast = state(); series(fast, 80, -1.2)
  const track = state(); series(track, 80, -0.6)
  const short = state(); series(short, 80, 0, 20)
  const few = state(); for (const i of [26, 20, 14, 8, 2]) weigh(few, ago(i), 80)
  const kept = stalled(); const before = JSON.stringify(kept.target)
  run(kept)
  report('weigh-in check', [
    ['only lose-fat and build-muscle', (run(state({ goal: 'feel-better' })) as any).reason === 'goal' && (run(state({ goal: undefined })) as any).reason === 'goal'],
    ['never before 3 weeks of weigh-ins', (run(short) as any).reason === 'not-enough-data'],
    ['never before 6 weigh-ins', (run(few) as any).reason === 'not-enough-data'],
    ['at most weekly', (run(stalled(), MIND_SET, ago(3)) as any).reason === 'too-soon' && run(stalled(), MIND_SET, ago(7)).kind === 'suggest'],
    ['a stall: a small step down, all pillars offered', r.kind === 'suggest' && r.direction === 'less' && r.current === 2200 && r.suggested === 2050 && r.options[0] !== 'kcal-less' && r.options.includes('kcal-less') && r.options.includes('protein-range') && r.options.includes('walk'), r],
    ['losing too fast: eat a little more, never past maintenance', (() => { const x = run(fast); return x.kind === 'suggest' && x.direction === 'more' && x.suggested === 2350 && x.weeklyPct < -1 })(), run(fast)],
    ['on pace: no change', run(track).kind === 'on-track', run(track)],
    ['suggests, never applies', JSON.stringify(kept.target) === before],
  ])
  // a typical water swing: 1 kg over the trend on the newest morning
  const spike = state(); series(spike, 80, -0.6); weigh(spike, TODAY, 80 - (0.6 / 7) * 26 + 1)
  report('weigh-in check', [
    ['one heavy morning doesn’t flip an on-pace trend', run(spike).kind === 'on-track', run(spike)],
  ])

  // safety: quiet modes say nothing; clamps never offer eating less
  const gentle = stalled(); gentle.profile.gentle = true
  const sometimes = stalled(); sometimes.profile.outcomes = { wellbeing: 'sometimes' }
  const pregnant = stalled(); pregnant.profile.pregnancy = { flagged: true, askedAt: ago(30) }
  const medical = stalled(); medical.profile.outcomes = { medical: 'flagged' }
  const strained = stalled(); for (const i of [1, 2, 3]) check(strained, ago(i), BAD_DAY)
  const floor = state({}, 1950); series(floor, 80, 0)
  const noHeight = stalled(); noHeight.profile.height = null
  const noConsent = suggestRateAdjustment(stalled(), TODAY, { healthConsent: false, t: MIND_SET })
  const m = run(medical), st = run(strained)
  report('weigh-in check', [
    ['gentle mode: nothing', (run(gentle) as any).reason === 'quiet'],
    ['wellbeing Sometimes: nothing', (run(sometimes) as any).reason === 'quiet'],
    ['pregnancy: nothing', (run(pregnant) as any).reason === 'quiet'],
    ['no health consent: nothing', (noConsent as any).reason === 'quiet', noConsent],
    ['a no-deficit clamp (medical): held, no calorie option', m.kind === 'held' && m.reason === 'safety' && !m.options.includes('kcal-less'), m],
    ['a strained week: mind first, no calorie option', st.kind === 'held' && st.reason === 'mind' && st.options[0] === 'earlier-night' && st.options[1] === 'stress-plan' && !st.options.includes('kcal-less'), st],
    ['the mind check waits for its threshold', (run(stalled(), LOOP_THRESHOLDS) as any).reason === 'awaiting-mind-threshold'],
    ['never below the floor or the deepest deficit', (run(floor) as any).reason === 'at-floor', run(floor)],
    ['no floor without age and height: held', (run(noHeight) as any).reason === 'safety'],
    ['build-muscle waits for its gain numbers', (run(state({ goal: 'build-muscle' })) as any).reason === 'awaiting-threshold'],
  ])
}

function adaptive(): void {
  const t = T({ minLoggedDays: 14, underLoggingPct: 10 })
  const s = state()
  for (let i = 1; i <= 21; i++) food(s, ago(i), 2000)
  series(s, 80, -0.5)
  const a = adaptiveMaintenance(s, TODAY, { healthConsent: true, t })
  const few = state(); for (let i = 1; i <= 10; i++) food(few, ago(i), 2000); series(few, 80, -0.5)
  const quiet = structuredClone(s); quiet.profile.gentle = true
  report('adaptive maintenance', [
    ['waits for nutrition-accuracy’s numbers', (adaptiveMaintenance(s, TODAY, { healthConsent: true }) as any).reason === 'awaiting-threshold'],
    ['intake plus the trend’s energy, as a range', a.kind === 'estimate' && a.maint === 2550 && a.lo === 2500 && a.hi === 2800, a],
    ['under-logging widens only the top', a.kind === 'estimate' && a.hi - a.maint > a.maint - a.lo],
    ['shown next to the starting estimate', a.kind === 'estimate' && a.start === 2550, a],
    ['too few logged days: nothing', (adaptiveMaintenance(few, TODAY, { healthConsent: true, t }) as any).reason === 'not-enough-data'],
    ['gentle mode: nothing', (adaptiveMaintenance(quiet, TODAY, { healthConsent: true, t }) as any).reason === 'quiet'],
  ])
  const line = weightTrend([{ d: ago(14), kg: 80 }, { d: ago(7), kg: 79.5 }, { d: TODAY, kg: 79 }])
  report('adaptive maintenance', [['the trend: kg a day through every reading', !!line && Math.abs(line.slope * 7 + 0.5) < 1e-9 && line.se < 1e-9, line]])
}

function band(): void {
  const t = T({ maintenanceBandPct: 2, strainedLowDays: 3 })
  const up = state({ goal: 'feel-better' }); for (let i = 1; i <= 14; i++) if (i % 2) weigh(up, ago(i), 82.5)
  const once = state({ goal: 'feel-better' }); for (let i = 1; i <= 14; i++) if (i % 2) weigh(once, ago(i), i <= 7 ? 82.5 : 80)
  const down = state({ goal: 'feel-better' }); for (let i = 1; i <= 14; i++) if (i % 2) weigh(down, ago(i), 77.5)
  const quiet = structuredClone(up); quiet.profile.gentle = true
  const bu = maintenanceBandCheck(up, TODAY, 80, { healthConsent: true, t })
  const bd = maintenanceBandCheck(down, TODAY, 80, { healthConsent: true, t })
  const bq = maintenanceBandCheck(quiet, TODAY, 80, { healthConsent: true, t })
  report('band check', [
    ['waits for nutrition-accuracy’s band', (maintenanceBandCheck(up, TODAY, 80, { healthConsent: true }) as any).reason === 'awaiting-threshold'],
    ['two weeks above the band: a drift, options from every pillar', bu.kind === 'drift' && bu.side === 'above' && bu.weeks === 2 && bu.options.includes('kcal-less') && bu.options.includes('walk') && bu.options.includes('protein-range'), bu],
    ['one week above: still steady', maintenanceBandCheck(once, TODAY, 80, { healthConsent: true, t }).kind === 'steady'],
    ['below the band: eat a little more, never less', bd.kind === 'drift' && bd.side === 'below' && bd.options.includes('kcal-more') && !bd.options.includes('kcal-less'), bd],
    ['quiet: the check runs, no kg and no calorie option', bq.kind === 'drift' && bq.band === null && bq.weekly === null && !bq.options.includes('kcal-less'), bq],
    ['no weigh-ins last week: nothing', (maintenanceBandCheck(state(), TODAY, 80, { healthConsent: true, t }) as any).reason === 'not-enough-data'],
  ])
}

function review(): void {
  const empty = state(); empty.profile.motivations = ['feel stronger']
  const e = weeklyReview(empty, TODAY, { healthConsent: true })
  const s = state()
  for (let i = 1; i <= 14; i++) { food(s, ago(i), 2100); if (i % 2) weigh(s, ago(i), i <= 7 ? 79.6 + i / 10 : 80.6) }
  const r = weeklyReview(s, TODAY, { healthConsent: true })
  const r2 = weeklyReview(s, TODAY, { healthConsent: true, t: T({ steadyWeeklyKg: 0.3 }) })
  const g = structuredClone(s); g.profile.gentle = true
  const rg = weeklyReview(g, TODAY, { healthConsent: true })
  const y = structuredClone(s); y.profile.outcomes = { wellbeing: 'flagged' }
  const ry = weeklyReview(y, TODAY, { healthConsent: true })
  const withAnchor = weeklyReview(s, TODAY, { healthConsent: true, maintenanceAnchorKg: 80 })
  report('weekly review', [
    ['a week with nothing: welcome back, nothing to catch up', e.welcomeBack && e.rate === null && e.pattern === null && e.maintenance === null && e.weight.band === null],
    ['welcome back still shows their why and the three choices', e.why[0] === 'feel stronger' && JSON.stringify(e.choices) === JSON.stringify(REVIEW_CHOICES)],
    ['the weight as a band, not a reading', !r.welcomeBack && r.weight.band?.lo === 79.7 && r.weight.band?.hi === 80.3, r.weight],
    ['direction waits for the steady threshold', r.weight.direction === null && r.weight.reason === 'awaiting-threshold'],
    ['with it: down against last week', r2.weight.direction === 'down', r2.weight],
    ['food in numbers when they’re shown', r.food.avgKcal === 2100 && r.food.loggedDays === 7 && r.food.inRangeDays === 7, r.food],
    ['gentle: quiet, no weight, no calories', rg.quiet && rg.weight.band === null && rg.weight.reason === 'quiet' && rg.food.avgKcal === null && rg.food.avgProtein === null],
    ['wellbeing Yes: no in-range count (there’s no target)', ry.food.inRangeDays === null && ry.quiet],
    ['the pattern line waits for its thresholds', r.pattern?.line === null],
    ['the weigh-in check rides along', r.rate !== null],
    ['maintenance only with a starting point', r.maintenance === null && withAnchor.maintenance !== null],
  ])
}

export function loopSuite(): number {
  bad = 0
  thresholds(); picture(); patterns(); rate(); adaptive(); band(); review()
  return bad
}
