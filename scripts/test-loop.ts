/* The maintenance loop (docs/plans/maintenance-loop.md, boards ml-a1 to ml-d2): the 28-day weight
   trend, the steady range and drift, the weigh-in check, adaptive maintenance, pattern lines, the
   weekly review model and its words. Run from scripts/test-core.ts (npm test); returns the number of
   failures. Thresholds are the signed-off values in loopThresholds.ts. */
import type { AppState, CheckIn, Profile, Session } from '@/core/types'
import { DEFAULT_PROFILE, DEFAULT_TARGET } from '@/core/data/constants'
import { shiftDay } from '@/core/domain/date'
import { LOOP_THRESHOLDS } from '@/core/domain/loopThresholds'
import { mindContext, dayPictures, patternLine, strengthProgress, weekPicture, GENTLE_PATTERNS } from '@/core/domain/weekPicture'
import { levelWord, weightTrend } from '@/core/domain/weightTrend'
import {
  adaptiveMaintenance, allowLess, driftCheck, learnedTarget, easeOffFields, loopSafety, maintenanceDrift, optionsFor, rangeStep, reviewDayOn, steadyRange,
  suggestRateAdjustment, weeklyReview, weightRow,
} from '@/core/domain/maintenanceLoop'
import {
  CHOICE_TEXT, ENCOURAGE, LOOP_BANNED, changeOneLead, checkinSub, foodSub, hungerWords, moodWords, optionText, patternText,
  progressLine, reviewRows, sleepWords, stressWords, weightSub,
} from '@/core/domain/loopCopy'
import { suggestedTargets } from '@/core/domain/nutrition'
import { asksMedical, profileRouting } from '@/core/domain/onboarding'
import { GOAL_OPTIONS } from '@/core/domain/wizard'
import { PROTEIN_RANGE_PER_KG } from '@/core/domain/targets'

let bad = 0
const report = (area: string, checks: [string, boolean, unknown?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `loop: ${area}: ${n}`, !ok && detail !== undefined ? JSON.stringify(detail) : '') }
}

const TODAY = '2026-10-11' // a Sunday
const ago = (n: number) => shiftDay(TODAY, -n)
const REST = { 0: 'Rest', 1: 'Rest', 2: 'Rest', 3: 'Rest', 4: 'Rest', 5: 'Rest', 6: 'Rest' } as AppState['schedule']

function state(p: Partial<Profile> = {}, kcal = 2200): AppState {
  return {
    target: { ...DEFAULT_TARGET, kcal },
    schedule: { ...REST },
    profile: { ...DEFAULT_PROFILE, sex: 'M', sexAnswer: 'male', age: 35, height: 175, activityMult: 1.5, goal: 'lose-fat', targetRate: 'standard', burnSwitch: '2026-01-01', reviewWeight: true, ...p },
    days: {}, customFoods: [], recipes: [], routines: [], trainingPlans: [],
  }
}
const day = (s: AppState, d: string) => (s.days[d] ??= { foods: [], supps: {}, weight: null, workout: null, checkin: null })
/** a day's food as `meals` main meals sharing `k` kcal and `p` protein */
const food = (s: AppState, d: string, k: number, p = 120, meals = 3) => {
  const slots = ['breakfast', 'lunch', 'dinner'] as const
  for (let i = 0; i < meals; i++) day(s, d).foods.push({ n: 'Test meal', grams: 100, k: k / meals, p: p / meals, c: 0, f: 0, err: 0.1, meal: slots[i % 3] })
}
const weigh = (s: AppState, d: string, kg: number) => { day(s, d).weight = Math.round(kg * 100) / 100 }
const check = (s: AppState, d: string, c: Partial<CheckIn>) => { day(s, d).checkin = { mood: 0, hunger: 0, ...c } }
const sess = (s: AppState, d: string, x: Partial<Session>) => { (day(s, d).sessions ??= []).push({ id: 's' + d + Math.random(), modality: 'cardio', title: 'Brisk walk', cardio: { key: 'Brisk walk' }, mins: 30, ...x } as Session) }
/** a weigh-in every `every` days from `from` days ago to yesterday, moving `perWeek` kg a week */
function series(s: AppState, startKg: number, perWeek: number, from = 34, every = 1, wobble = 0.3) {
  for (let i = from; i >= 1; i -= every) weigh(s, ago(i), startKg + (perWeek / 7) * (from - i) + (i % 3 === 0 ? wobble : i % 3 === 1 ? -wobble : 0))
}
const XofY = /\b\d+\s+of\s+(your\s+)?\d+\b/i
const clean = (t: string) => !XofY.test(t) && !t.includes('—') && !t.includes('!') && !LOOP_BANNED.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))

function trend(): void {
  const s = state()
  series(s, 90, 0, 34)
  const flat = weightTrend(s, ago(1))!
  const t2 = state(); series(t2, 90, -0.5, 34)
  const down = weightTrend(t2, ago(1))!
  const o = state(); series(o, 90, 0, 34); weigh(o, ago(3), 96) // 6.7% off the median
  const out = weightTrend(o, ago(1))!
  const w = state(); for (let i = 49; i >= 1; i -= 7) weigh(w, ago(i), 80) // weekly: 7 weigh-ins over 42 days
  const weekly = weightTrend(w, ago(1))!
  const young = state(); for (let i = 20; i >= 1; i -= 2) weigh(young, ago(i), 80)
  const y = weightTrend(young, ago(1))!
  const few = state(); weigh(few, ago(9), 80); weigh(few, ago(5), 80); weigh(few, ago(2), 80)
  report('trend', [
    ['a flat month reads level, its fitted level near the weight', !!flat && Math.abs(flat.level - 90) < 0.3 && levelWord(flat) === 'level', flat],
    ['half a kilo a week down is found within 0.1 kg a week', Math.abs(down.slope * 7 + 0.5) < 0.1, down.slope * 7],
    ['half a kilo a week down reads "down"', levelWord(down) === 'down'],
    ['a reading over 3% from the median is dropped', out.n === flat.n - 1 && Math.abs(out.level - flat.level) < 0.05, out],
    ['weekly weighers: the window grows to 42 days for 6 weigh-ins', weekly.windowDays === 42 && weekly.n === 6 && weekly.wordsReady, weekly],
    ['trend words wait for 4 weeks of history', !y.wordsReady && y.levelReady, y],
    ['a level after 3 weigh-ins over 7 days, no words yet', weightTrend(few, ago(1))!.levelReady && !weightTrend(few, ago(1))!.wordsReady],
    ['two weigh-ins are not a trend', weightTrend((() => { const x = state(); weigh(x, ago(5), 80); weigh(x, ago(2), 80); return x })(), ago(1)) === null],
    ['SE is inflated for correlated noise', down.se > 0],
  ])
}

function steady(): void {
  const s = state({ goal: 'maintain', maintainFrom: ago(60) })
  for (let i = 60; i >= 1; i--) weigh(s, ago(i), 80 + (i % 2 ? 0.2 : -0.2))
  const early = steadyRange(s, ago(30))!, late = steadyRange(s, ago(1))!
  const f = state({ goal: 'maintain', maintainFrom: ago(40) }); for (const i of [40, 30, 20, 15]) weigh(f, ago(i), 80)
  const sparse = state({ goal: 'maintain', maintainFrom: ago(40) }); for (const i of [40, 30, 2]) weigh(sparse, ago(i), 80)
  const reset = state({ goal: 'maintain', maintainFrom: ago(200), steadyRef: { kg: 85, from: ago(10) } })
  report('steady range', [
    ['reference is the first 14 days’ mean', Math.abs(early.ref - 80) < 0.1, early],
    ['±3% in the first 6 weeks', early.pct === 3 && Math.abs(early.hi - 82.4) < 0.1],
    ['±2% after 6 weeks', late.pct === 2],
    ['fewer than 4 in 14 days: the first 4 within 28 days', steadyRange(f, ago(1))?.ref === 80],
    ['no reference with fewer than 4 weigh-ins in 28 days', steadyRange(sparse, ago(1)) === null],
    ['"make this my new starting point" resets the reference and the 6 weeks', steadyRange(reset, ago(1))?.ref === 85 && steadyRange(reset, ago(1))?.pct === 3],
    ['only for maintain', steadyRange(state({ maintainFrom: ago(60) }), ago(1)) === null],
  ])
}

function drift(): void {
  const flat = state({ goal: 'maintain', maintainFrom: ago(90) }); series(flat, 80, 0, 90)
  const up = state({ goal: 'maintain', maintainFrom: ago(90) }); series(up, 80, 0, 90, 1, 0.2); for (let i = 30; i >= 1; i--) weigh(up, ago(i), 80 + (30 - i) * 0.12)
  const bump = state({ goal: 'maintain', maintainFrom: ago(90) }); series(bump, 80, 0, 90); for (let i = 7; i >= 1; i--) weigh(bump, ago(i), 81.1)
  const d = driftCheck(up, TODAY)
  const f = driftCheck(flat, TODAY)
  report('drift', [
    ['a flat line stays steady', f?.word === 'steady' && !f.drift, f && { w: f.word, lvl: f.trend.level }],
    ['a steady climb past +2% at two weekly checks is a drift above', d?.drift === true && d.word === 'above', d && { w: d.word, lvl: d.trend.level, hi: d.range.hi }],
    ['a one-week bump inside the range is not a drift', driftCheck(bump, TODAY)?.drift === false],
    ['the drift sheet offers every pillar and a new starting point', (() => { const x = maintenanceDrift(up, TODAY, { healthConsent: true }); return x.kind === 'drift' && x.options[0] === 'protein-meals' && x.options.includes('earlier-night') && x.options[x.options.length - 1] === 'new-start' })()],
    ['the drift range step stays within 150 kcal of maintenance', (() => { const x = maintenanceDrift(up, TODAY, { healthConsent: true }); return x.kind === 'drift' && (!x.range || x.range.kcal - x.range.suggested <= 100) })()],
    ['no drift sheet with weight left out', maintenanceDrift({ ...up, profile: { ...up.profile, reviewWeight: false } }, TODAY, { healthConsent: true }).kind === 'none'],
  ])
}

function safetyAndWeight(): void {
  const s = state({ goal: 'maintain', maintainFrom: ago(60) }); series(s, 80, 0, 40)
  const sf = (p: Partial<Profile>, consent = true) => loopSafety({ ...s, profile: { ...s.profile, ...p } }, 80, consent)
  const lose = state(); series(lose, 90, -0.68, 40)
  const slow = state(); series(slow, 90, 0, 40)
  const young = state(); for (let i = 20; i >= 1; i -= 2) weigh(young, ago(i), 80)
  report('weight opt-in', [
    ['weight shows only for people who chose it', sf({}).weight && !sf({ reviewWeight: false }).weight && !sf({ reviewWeight: undefined }).weight],
    ['never in gentle mode', !sf({ gentle: true }).weight && sf({ gentle: true }).quiet],
    ['never with wellbeing flagged or Sometimes', !sf({ outcomes: { wellbeing: 'flagged' } }).weight && !sf({ outcomes: { wellbeing: 'sometimes' } }).weight],
    ['never without health consent', !sf({}, false).weight],
    ['never in pregnancy', !sf({ pregnancy: { flagged: true, askedAt: ago(10) } }).weight],
    ['the weight row is absent when left out', weightRow({ ...s, profile: { ...s.profile, reviewWeight: false } }, TODAY, 3, sf({ reviewWeight: false })) === null],
    ['maintain, inside the range: steady', weightRow(s, TODAY, 3, sf({}))?.words.kind === 'steady'],
    ['lose-fat on pace: in line', (() => { const w = weightRow(lose, TODAY, 3, loopSafety(lose, 88, true)); return w?.words.kind === 'pace' && w.words.pace === 'in-line' })()],
    ['lose-fat not losing: slower', (() => { const w = weightRow(slow, TODAY, 3, loopSafety(slow, 90, true)); return w?.words.kind === 'pace' && w.words.pace === 'slower' })()],
    ['before 4 weeks: "your trend shows after 4 weeks"', weightRow(young, TODAY, 3, loopSafety(young, 80, true))?.words.kind === 'too-soon'],
    ['maintain with no reference yet: too soon, never "steady"', (() => { const x = state({ goal: 'maintain', maintainFrom: ago(3) }); series(x, 80, 0, 40); return weightRow(x, TODAY, 3, loopSafety(x, 80, true))?.words.kind === 'too-soon' })()],
    ['lose-fat just after a target change: too soon, no pace words', (() => { const x = state({ targetSetAt: ago(10) }); series(x, 90, 0, 40); return weightRow(x, TODAY, 3, loopSafety(x, 90, true))?.words.kind === 'too-soon' })()],
    ['the rows say how often, never a kilo figure', weightSub({ weighIns: 4, words: { kind: 'steady' }, weeks: 4 }, false) === 'Steady over the last 4 weeks.' && !/kg/.test(weightSub({ weighIns: 4, words: { kind: 'above' }, weeks: 4 }, false))],
  ])
}

function rate(): void {
  const off = state(); series(off, 90, 0, 50) // not losing at all
  const calm = suggestRateAdjustment(off, TODAY, { healthConsent: true })
  const hard = state(); series(hard, 90, 0, 50); for (let i = 7; i >= 1; i--) check(hard, ago(i), { mood: 3, hunger: 3, sleep: 1, stress: 3 })
  const h = suggestRateAdjustment(hard, TODAY, { healthConsent: true })
  const fast = state(); series(fast, 90, -1.6, 50)
  const fs = suggestRateAdjustment(fast, TODAY, { healthConsent: true })
  const floor = state({}, 1500); series(floor, 90, 0, 50)
  const changed = state({ targetSetAt: ago(30) }); series(changed, 90, 0, 50)
  report('weigh-in check', [
    ['not for maintain or other goals', suggestRateAdjustment(state({ goal: 'maintain' }), TODAY, { healthConsent: true }).kind === 'none' && suggestRateAdjustment(state({ goal: 'increase-strength' }), TODAY, { healthConsent: true }).kind === 'none'],
    ['build-muscle waits for its rates', suggestRateAdjustment(state({ goal: 'build-muscle' }), TODAY, { healthConsent: true }).kind === 'none'],
    ['at most weekly', suggestRateAdjustment(off, TODAY, { healthConsent: true, lastAt: ago(3) }).kind === 'none'],
    ['weight left out: no check', suggestRateAdjustment({ ...off, profile: { ...off.profile, reviewWeight: false } }, TODAY, { healthConsent: true }).kind === 'none'],
    ['quiet in gentle mode', (() => { const r = suggestRateAdjustment({ ...off, profile: { ...off.profile, gentle: true } }, TODAY, { healthConsent: true }); return r.kind === 'none' && r.reason === 'quiet' })()],
    ['skips the 14 days after a target change: 30 days after is too soon', suggestRateAdjustment(changed, TODAY, { healthConsent: true }).kind === 'none'],
    ['on pace: no change needed', (() => { const x = state(); series(x, 90, -0.68, 50); return suggestRateAdjustment(x, TODAY, { healthConsent: true }).kind === 'on-pace' })()],
    ['slower, calm week: protein, strength, range, sleep (ml-b1)', calm.kind === 'options' && JSON.stringify(calm.options) === JSON.stringify(['protein-meals', 'strength-session', 'range-less', 'earlier-night']), calm.kind === 'options' && calm.options],
    ['the step is 100 kcal at both ends', calm.kind === 'options' && calm.range?.kcal === 2200 && calm.range.suggested === 2100 && calm.range.to.hi - calm.range.from.hi === -100],
    ['a hard week leads with mind options and offers no cut', h.kind === 'options' && h.ctx === 'hard' && h.options[0] === 'earlier-night' && !h.options.includes('range-less') && h.range === null, h.kind === 'options' && h.options],
    ['faster than planned offers more food, capped at maintenance', fs.kind === 'options' && fs.pace === 'faster' && fs.options.includes('range-more') && !!fs.range && fs.range.suggested > fs.range.kcal],
    ['never below the floors: no cut offered at the floor', (() => { const r = suggestRateAdjustment(floor, TODAY, { healthConsent: true }); return r.kind === 'options' && r.range === null && !r.options.includes('range-less') })()],
    ['no cut with wellbeing Sometimes', (() => { const x = { ...off, profile: { ...off.profile, outcomes: { wellbeing: 'sometimes' as const } } }; return suggestRateAdjustment(x, TODAY, { healthConsent: true }).kind === 'none' })()],
    ['no cut with the medical flag', (() => { const x = { ...off, profile: { ...off.profile, outcomes: { medical: 'flagged' as const } } }; const r = suggestRateAdjustment(x, TODAY, { healthConsent: true }); return r.kind === 'options' && r.range === null })()],
  ])
}

function adaptive(): void {
  const s = state({ goal: 'maintain', maintainFrom: ago(80) })
  series(s, 80, 0, 34, 2, 0.2)
  for (let i = 30; i >= 1; i--) if (i % 4) food(s, ago(i), 2400 + (i % 5) * 60 - 120)
  const a = adaptiveMaintenance(s, TODAY, { healthConsent: true })
  const one = state({ goal: 'maintain', maintainFrom: ago(80) }); series(one, 80, 0, 34, 2)
  for (let i = 30; i >= 1; i--) food(one, ago(i), 2400, 120, 1)
  const taper = state({ goal: 'maintain', maintainFrom: ago(80) }); series(taper, 80, 0, 34, 2)
  for (let i = 28; i >= 1; i--) food(taper, ago(i), i > 14 ? 2800 : 2000)
  const fresh = state({ goal: 'maintain', maintainFrom: ago(20) }); series(fresh, 80, 0, 34, 2); for (let i = 30; i >= 1; i--) food(fresh, ago(i), 2400)
  report('adaptive maintenance', [
    ['a flat trend: maintenance is what was logged', a.kind === 'estimate' && Math.abs(a.maint - 2400) <= 50, a],
    ['a range, nearest 50, at least ±150', a.kind === 'estimate' && a.lo % 50 === 0 && a.hi % 50 === 0 && a.hi - a.maint >= 150 && a.maint - a.lo === a.hi - a.maint],
    ['narrower than the starting ±15%', a.kind === 'estimate' && a.hi - a.lo < a.start.hi - a.start.lo],
    ['single-meal days don’t qualify', adaptiveMaintenance(one, TODAY, { healthConsent: true }).kind === 'none'],
    ['withheld while intake is tapering', (() => { const r = adaptiveMaintenance(taper, TODAY, { healthConsent: true }); return r.kind === 'none' && r.reason === 'tapering' })()],
    ['waits 14 days after maintain starts, then 28 days of data', adaptiveMaintenance(fresh, TODAY, { healthConsent: true }).kind === 'none'],
    ['weight left out: none', adaptiveMaintenance({ ...s, profile: { ...s.profile, reviewWeight: false } }, TODAY, { healthConsent: true }).kind === 'none'],
    ['no health consent: none', adaptiveMaintenance(s, TODAY, { healthConsent: false }).kind === 'none'],
    ['the window grows to the longest that qualifies', (() => { const x = state({ goal: 'maintain', maintainFrom: ago(120) }); series(x, 80, 0, 60, 2, 0.2); for (let i = 56; i >= 1; i--) if (i % 4) food(x, ago(i), 2400 + (i % 5) * 60 - 120); const r = adaptiveMaintenance(x, TODAY, { healthConsent: true }); return r.kind === 'estimate' && r.days === 56 })()],
    ['"Use this range" only for maintain, and never below the floors', (() => { if (a.kind !== 'estimate') return false; const lose = { ...s, profile: { ...s.profile, goal: 'lose-fat' as const } }; const low = learnedTarget(s, { ...a, maint: 900 }, 80); return learnedTarget(lose, a, 80) === null && !!low && low.floored && low.target.kcal >= 1200 })()],
  ])
}

function mind(): void {
  const s = state()
  for (let i = 7; i >= 1; i--) check(s, ago(i), { mood: 4, hunger: 3, sleep: 3, stress: 1, energy: 3 })
  const calm = mindContext(s, dayPictures(s, ago(7), ago(1), TODAY))
  const h = state()
  for (let i = 7; i >= 1; i--) check(h, ago(i), { mood: 3, hunger: 2, sleep: i <= 4 ? 1 : 3, stress: i <= 3 && i >= 2 ? 3 : 1 })
  const hard = mindContext(h, dayPictures(h, ago(7), ago(1), TODAY))
  report('mind', [
    ['a calm week is not hard', !calm.hard && calm.checkins === 7],
    ['short nights on 4 days make a hard week', hard.hard && hard.poorSleepDays === 4],
    ['sleep words', sleepWords(calm) === 'Good on most nights' && sleepWords(hard) === 'Short nights on 4 days'],
    ['stress words', stressWords(calm) === 'Mostly low'],
    ['mood words', moodWords(calm) === 'Good most days'],
    ['hunger words', hungerWords(calm, false) === 'Mostly satisfied' && hungerWords(hard, true) === 'Higher on the short-sleep days'],
    ['check-in sub, calm', checkinSub(calm) === 'Good nights most of the week, and stress stayed low.', checkinSub(calm)],
    ['check-in sub, mixed: two sentences', checkinSub(hard) === 'Short nights. Stress stayed low.', checkinSub(hard)],
    ['check-in sub, both not good: one sentence', checkinSub({ ...hard, highStressDays: 3, lowStressDays: 0, calmerWeekend: false }) === 'Short nights and a busy few days.' && checkinSub({ ...hard, highStressDays: 3, lowStressDays: 0, calmerWeekend: true }) === 'Short nights and a busy few days. The weekend was calmer.'],
    ['check-in sub, a mix of nights and low stress', checkinSub({ ...hard, poorSleepDays: 1, goodSleepDays: 2 }) === 'A mix of nights. Stress stayed low.'],
    ['check-in sub, good nights and a busy few days', checkinSub({ ...calm, highStressDays: 3, lowStressDays: 1 }) === 'Good nights most of the week. A busy few days.'],
    ['a care week allows no cut', !allowLess(loopSafety(state(), 80, true), { ...calm, careMood: true }) && !allowLess(loopSafety(state(), 80, true), { ...calm, starvingDays: 3 }) && allowLess(loopSafety(state(), 80, true), calm)],
    ['no row with fewer than 3 answers', sleepWords({ ...calm, sleepAnswers: 2 }) === null],
    ['starving on 3+ days is never a row', hungerWords({ ...calm, starvingDays: 3 }, false) === null],
  ])
}

function patterns(): void {
  const s = state()
  // 42 days: poor sleep every third day with hunger at Hungry, otherwise Good sleep and Satisfied
  for (let i = 42; i >= 1; i--) check(s, ago(i), i % 3 === 0 ? { mood: 3, hunger: 2, sleep: 1, stress: 2, energy: 2 } : { mood: 4, hunger: 3 + (i % 2) * 0, sleep: 3, stress: 2, energy: 2 })
  const r = patternLine(s, ago(1), TODAY)
  const firstOnly = state()
  for (let i = 42; i >= 1; i--) check(firstOnly, ago(i), i > 21 && i % 3 === 0 ? { mood: 3, hunger: 1, sleep: 1, stress: 2 } : { mood: 4, hunger: 3, sleep: i % 3 === 0 ? 1 : 3, stress: 2 })
  report('pattern lines', [
    ['hungrier on short-sleep days, across both halves', r.line?.code === 'hunger-poor-sleep', r],
    ['a pattern in one half only doesn’t show', patternLine(firstOnly, ago(1), TODAY).line?.code !== 'hunger-poor-sleep'],
    ['gentle mode: never a hunger line', patternLine(s, ago(1), TODAY, { allowed: GENTLE_PATTERNS }).line === null],
    ['the same pair at most once in 4 weeks', patternLine(s, ago(1), TODAY, { recent: { 'hunger-poor-sleep': ago(10) } }).line?.code !== 'hunger-poor-sleep'],
    ['too little data: nothing', patternLine(state(), ago(1), TODAY).line === null],
    ['every line is worded without a cause', (['hunger-poor-sleep', 'hunger-high-stress', 'energy-good-sleep', 'sessions-good-energy', 'sessions-calm'] as const).every((c) => clean(patternText(c, false)) && clean(patternText(c, true)))],
  ])
}

function strength(): void {
  const s = state()
  const ex = (w: string, reps: string) => [{ name: 'Goblet squat', exId: 'goblet-squat', log: 'weight-reps' as const, sets: [{ w: '8', reps: '10', warmup: true }, { w, reps }, { w, reps }] }]
  sess(s, ago(12), { modality: 'strength', title: 'Legs', ex: ex('14', '10') })
  sess(s, ago(4), { modality: 'strength', title: 'Legs', ex: ex('16', '10') })
  const p = strengthProgress(s, dayPictures(s, ago(7), ago(1), TODAY))
  const r = state()
  sess(r, ago(12), { modality: 'strength', title: 'Legs', ex: [{ name: 'Sit to stand', exId: 'sit-to-stand', log: 'reps', sets: [{ w: '', reps: '10' }] }] })
  sess(r, ago(3), { modality: 'strength', title: 'Legs', ex: [{ name: 'Sit to stand', exId: 'sit-to-stand', log: 'reps', sets: [{ w: '', reps: '12' }] }] })
  const pr = strengthProgress(r, dayPictures(r, ago(7), ago(1), TODAY))
  const first = state(); sess(first, ago(3), { modality: 'strength', title: 'Legs', ex: ex('20', '10') })
  report('strength progress', [
    ['a load increase, warm-ups left out', p?.kind === 'load' && p.value === 16, p],
    ['"Goblet squat went up to 16 kg on Wednesday."', !!p && progressLine(p) === 'Goblet squat went up to 16 kg on Wednesday.', p && progressLine(p)],
    ['more reps: "Sit to stand went up to 12 reps on Thursday."', !!pr && progressLine(pr) === 'Sit to stand went up to 12 reps on Thursday.', pr && progressLine(pr)],
    ['a first-ever log is not progress', strengthProgress(first, dayPictures(first, ago(7), ago(1), TODAY)) === null],
  ])
}

/** A steady maintain week like ml-a1: check-ins on 6 days, 3 strength and 3 walks, food on 6 days. */
function steadyWeek(p: Partial<Profile> = {}): AppState {
  const s = state({ goal: 'maintain', maintainFrom: ago(42), motivations: ['Keep up with my kids at the weekend'], ...p }, 2250)
  series(s, 80, 0, 50, 2, 0.15)
  for (let i = 7; i >= 1; i--) {
    if (i !== 3) check(s, ago(i), { mood: 4, hunger: 3, sleep: 3, stress: 1, energy: 3 })
    if (i !== 5) food(s, ago(i), i === 2 ? 2700 : 2250, 120)
    if (i === 6 || i === 4 || i === 2) sess(s, ago(i), { modality: 'strength', title: 'Full body', ex: [] })
    else if (i !== 3) sess(s, ago(i), {})
  }
  weigh(s, ago(7), 80) // 4 weigh-ins this week
  return s
}

function review(): void {
  const s = steadyWeek()
  const rv = weeklyReview(s, TODAY, { healthConsent: true })
  const rows = reviewRows(rv)
  const g = weeklyReview(steadyWeek({ gentle: true }), TODAY, { healthConsent: true })
  const grows = reviewRows(g)
  const off = weeklyReview(steadyWeek({ reviewWeight: false }), TODAY, { healthConsent: true })
  const empty = weeklyReview(state(), TODAY, { healthConsent: true })
  const missed = weeklyReview(s, TODAY, { healthConsent: true, reviewDay: 0, lastReviewAt: ago(21) })
  const hardS = steadyWeek(); for (let i = 7; i >= 1; i--) check(hardS, ago(i), { mood: 3, hunger: 2, sleep: i <= 4 ? 1 : 3, stress: 3 })
  const hard = weeklyReview(hardS, TODAY, { healthConsent: true })
  const all = [rv, g, off, empty, missed, hard].flatMap((x) => reviewRows(x).flatMap((r) => [r.title, r.sub ?? '']))
  report('weekly review', [
    ['leads with "What you did": mind, move, food, then weight', JSON.stringify(rows.map((r) => r.pillar)) === JSON.stringify(['mind', 'move', 'food', 'weight']), rows],
    ['"Checked in 6 days"', rows[0].title === 'Checked in 6 days', rows[0]],
    ['"3 strength sessions and 3 walks"', rows[1].title === '3 strength sessions and 3 walks', rows[1]],
    ['"Logged food on 6 days" with days in range and protein', rows[2].title === 'Logged food on 6 days' && rows[2].sub === '5 days in your range, and protein at the heart of most meals.', rows[2]],
    ['weight in words: "Weighed in 4 times" and steady', rows[3]?.title === 'Weighed in 4 times' && rows[3].sub === 'Steady over the last 4 weeks.', rows[3]],
    ['encouragement first: a steady week', rv.encouragement === 'steady' && ENCOURAGE.steady === 'A steady week. This is what a habit looks like.'],
    ['the person’s why comes back', rv.why[0] === 'Keep up with my kids at the weekend'],
    ['choices: keep, ease off, change one', JSON.stringify(rv.choices) === JSON.stringify(['keep', 'ease-off', 'change-one'])],
    ['weight left out: no weight row', !reviewRows(off).some((r) => r.pillar === 'weight')],
    ['gentle: words only, no numbers, no weight', g.encouragement === 'gentle' && grows.every((r) => !/\d/.test(r.title + (r.sub ?? ''))) && !grows.some((r) => r.pillar === 'weight'), grows],
    ['gentle: options never lower a target', g.changeOne.ctx === 'gentle' && !g.changeOne.options.some((o) => o.startsWith('range'))],
    ['a hard week: "A full-on week, and you still showed up."', hard.encouragement === 'hard' && ENCOURAGE.hard === 'A full-on week, and you still showed up.'],
    ['a hard week: no pattern line, mind options first, no cut', hard.pattern === null && hard.changeOne.options[0] === 'earlier-night' && !hard.changeOne.options.includes('range-less')],
    ['an empty week is "welcome back" with nothing to catch up', empty.welcomeBack && JSON.stringify(empty.choices) === JSON.stringify(['pick-up', 'ease-back']) && reviewRows(empty).length === 0],
    ['a missed review is "welcome back", no weight across the gap', missed.welcomeBack && missed.weight === null],
    ['a care week reads as a hard one: no weight, no pattern line, mind first', (() => { const c = steadyWeek(); for (let i = 7; i >= 1; i--) check(c, ago(i), { mood: 2, hunger: 3, sleep: 3, stress: 1 }); const r = weeklyReview(c, TODAY, { healthConsent: true }); return r.encouragement === 'hard' && r.weight === null && r.pattern === null && r.changeOne.ctx === 'hard' })()],
    ['starving on 3+ days: no weight, no cut', (() => { const c = steadyWeek(); for (let i = 3; i >= 1; i--) check(c, ago(i), { mood: 4, hunger: 1, sleep: 3, stress: 1 }); const r = weeklyReview(c, TODAY, { healthConsent: true }); return r.weight === null && !r.changeOne.options.includes('range-less') })()],
    ['no "x of y", banned words, exclamation marks or em dashes anywhere', all.every(clean), all.filter((t) => !clean(t))],
  ])
}

function words(): void {
  const r = { from: { lo: 2050, hi: 2450 }, to: { lo: 1950, hi: 2350 }, kcal: 2250, suggested: 2150 }
  const opts = (['earlier-night', 'hungry-days-plan', 'hungry-evenings-plan', 'strength-session', 'protein-meals', 'range-less', 'range-more', 'rest-day', 'walk', 'new-start'] as const)
  const texts = opts.flatMap((o) => [optionText(o, r, { long: true }), optionText(o, r, { drift: true })]).flatMap((x) => [x.title, x.sub ?? ''])
  const m = mindContext(state(), [])
  report('words', [
    ['the range line matches the boards', optionText('range-less', r).sub === 'From 2,050–2,450 to 1,950–2,350 kcal'],
    ['option words are clean', texts.every(clean), texts.filter((t) => !clean(t))],
    ['choice words are clean', Object.values(CHOICE_TEXT).every((c) => clean(c.title + ' ' + c.sub))],
    ['food sub without a range: protein only', foodSub(null, { kind: 'grams', g: 100 }, false) === 'Protein held up at about 100 g a day.'],
    ['change one, calm', changeOneLead('calm', m) === 'Pick one small thing to try.'],
    ['options in gentle mode: rest, sleep, a plan, a walk', JSON.stringify(optionsFor('gentle', 'less', { eveningHunger: false })) === JSON.stringify(['earlier-night', 'rest-day', 'hungry-days-plan', 'walk'])],
    ['ease off: shorter sessions for the next 7 days', JSON.stringify(easeOffFields(TODAY)) === JSON.stringify({ easyFrom: TODAY, easyUntil: shiftDay(TODAY, 6) })],
    ['review day: the Sunday on or before today', reviewDayOn('2026-10-14', 0) === '2026-10-11' && reviewDayOn(TODAY, 0) === TODAY],
  ])
}

function goal(): void {
  const p = { ...DEFAULT_PROFILE, sex: 'M' as const, sexAnswer: 'male' as const, age: 40, height: 175, activityMult: 1.5, goal: 'maintain' as const }
  const t = suggestedTargets(p, 80, profileRouting(p, 80, true))
  const ok = !!t && 'kcal' in t
  report('maintain goal', [
    ['maintain is a goal in onboarding (ml-c1)', GOAL_OPTIONS.some(([g, t]) => g === 'maintain' && t === 'Keep it steady')],
    ['energy at maintenance', ok && (t as any).adjustPct === 0 && Math.abs((t as any).kcal - (t as any).maint) <= 50, t],
    ['protein 1.4 g/kg inside 1.2 to 1.6', ok && (t as any).p === 112 && PROTEIN_RANGE_PER_KG.maintain.low === 1.2 && PROTEIN_RANGE_PER_KG.maintain.high === 1.6],
    ['the medical question is asked for maintain', asksMedical('maintain') && asksMedical('lose-fat') && !asksMedical('build-muscle')],
    ['rangeStep for maintain never cuts more than 150', (() => { const s = state({ goal: 'maintain' }, 2900); const x = rangeStep(s, 'less', 80, loopSafety(s, 80, true), TODAY); return !x || x.kcal - x.suggested <= 150 })()],
    ['maintain steps never stack past ±150 of the anchor, either way', (() => { const s = state({ goal: 'maintain' }, 2500); const sf = loopSafety(s, 80, true); const up = rangeStep(s, 'more', 80, sf, TODAY, undefined, 2400); const dn = rangeStep({ ...s, target: { ...s.target, kcal: 2300 } }, 'less', 80, sf, TODAY, undefined, 2400); return up?.suggested === 2550 && dn?.suggested === 2250 && rangeStep({ ...s, target: { ...s.target, kcal: 2550 } }, 'more', 80, sf, TODAY, undefined, 2400) === null })()],
  ])
}

function picture(): void {
  const s = steadyWeek()
  const w = weekPicture(s, ago(7), ago(1), TODAY)
  check(s, TODAY, { mood: 1, hunger: 1, sleep: 1, stress: 3 })
  const w2 = weekPicture(s, ago(7), TODAY, TODAY)
  report('weekly picture', [
    ['counts strength, walks and other sessions apart', w.move.strength === 3 && w.move.walks === 3 && w.move.other === 0, w.move],
    ['today never counts', w2.mind.checkins === w.mind.checkins],
    ['days logged and in range are counts', w.food.loggedDays === 6 && w.food.inRangeDays === 5, w.food],
    ['thresholds match the numbers rules', LOOP_THRESHOLDS.kcalPerKg === 7000 && LOOP_THRESHOLDS.trend.windowDays[0] === 28 && LOOP_THRESHOLDS.rate.tolerancePct === 0.35 && LOOP_THRESHOLDS.adaptive.minLoggedDays === 20],
  ])
}

export function loopSuite(): number {
  bad = 0
  trend(); steady(); drift(); safetyAndWeight(); rate(); adaptive(); mind(); patterns(); strength(); review(); words(); goal(); picture()
  return bad
}
