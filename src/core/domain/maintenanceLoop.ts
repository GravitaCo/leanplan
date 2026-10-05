import type { AppState, Goal } from '@/core/types'
import { shiftDay } from './date'
import { avg } from './insights'
import { calorieFloor, KCAL_PER_KG_LOST, MAX_LOSS_PCT_PER_WEEK, NEAR_MAINTENANCE_PCT } from './nutrition'
import { maintenanceEstimate } from './targets'
import { foodView } from './foodMode'
import { profileRouting, sexOf } from './onboarding'
import { dayPictures, patternLine, weekPicture, type MindContext, type PatternResult, type WeekPicture } from './weekPicture'
import { LOOP_THRESHOLDS, type LoopThresholds } from './loopThresholds'

/**
 * The maintenance loop's logic (docs/plans/maintenance-loop.md, step 1): the weekly review model,
 * the weigh-in check (`suggestRateAdjustment`), an adaptive maintenance estimate and the
 * maintenance band check. All read the shared weekly picture (weekPicture.ts), all are pure (the
 * clock is passed in), none stores anything, and none changes a target: they suggest, the person
 * decides. No UI yet: the boards come first (Design II, Benn's approval).
 *
 * Safety, always: gentle mode and the quiet food modes hide every number; nothing goes below the
 * calorie floors; no "eat less" with wellbeing flagged, pregnancy, under 18, or any routing clamp;
 * weigh-ins are never asked for; no streaks.
 */

/** Decided rules (first-run-onboarding §5, maintenance-loop.md), not placeholders. */
export const RATE_MIN_HISTORY_DAYS = 21
export const RATE_MIN_WEIGH_INS = 6
export const RATE_EVERY_DAYS = 7
export const DRIFT_WEEKS = 2
/** maintenance mode reads this many recent weeks for a drift */
const BAND_WEEKS = 4

const r10 = (x: number) => Math.round(x / 10) * 10
const r50 = (x: number) => Math.round(x / 50) * 50
const ceil50 = (x: number) => Math.ceil(x / 50) * 50
const r1 = (x: number) => Math.round(x * 10) / 10

/* ---------------- safety ---------------- */

export interface LoopSafety {
  /** no numbers at all: gentle mode, a quiet food mode, pregnancy, under 18, no health consent */
  quiet: boolean
  /** never suggest eating less */
  noLess: boolean
  /** at most the shallowest deficit (poor sleep or stress at setup) */
  nearMaintenance: boolean
}

export function loopSafety(s: AppState, kg: number | null, healthConsent: boolean): LoopSafety {
  const p = s.profile
  const r = profileRouting(p, kg, healthConsent)
  // the loop reads weight, intake and mood together: without the health-data yes it says nothing
  // (profileRouting treats a profile from before onboarding as consented, so this is checked here too)
  const quiet = !healthConsent || !!p.gentle || r.hideCalories || r.gentle || foodView(p).mode !== 'standard' || !!p.pregnancy?.flagged || !!r.stop
  return { quiet, noLess: quiet || r.noDeficit || r.maintenanceOnly, nearMaintenance: r.nearMaintenance }
}

/* ---------------- the weight trend ---------------- */

export interface WeighIn { d: string; kg: number }

export function weighIns(s: AppState, from: string, to: string): WeighIn[] {
  return Object.keys(s.days).filter((d) => d >= from && d <= to && s.days[d]?.weight).sort().map((d) => ({ d, kg: s.days[d].weight as number }))
}

const dayIndex = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5

/**
 * The trend through every weigh-in (least squares), so no single morning decides anything: kg a
 * day, its standard error, and the average weight. Needs 3 readings on 2 different days.
 * PLACEHOLDER method: how the loop smooths weight is nutrition-accuracy's call (Benn, 5 Oct,
 * decision 3). A plain fit gives the newest and oldest readings the most pull, so a big swing on
 * the last morning moves it more than one mid-window.
 */
export function weightTrend(points: WeighIn[]): { slope: number; se: number; mean: number } | null {
  const n = points.length
  if (n < 3) return null
  const xs = points.map((p) => dayIndex(p.d)), ys = points.map((p) => p.kg)
  const mx = avg(xs), my = avg(ys)
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  if (!sxx) return null
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx
  const rss = ys.reduce((a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2, 0)
  return { slope, se: Math.sqrt(rss / (n - 2) / sxx), mean: my }
}

/* ---------------- options from every pillar ---------------- */

/**
 * What a suggestion can offer, as codes (the wording is mental-performance's). Mind first when
 * the week shows it, then food, then movement; a calorie change is one option among several,
 * never the only one, and "eat less" only where it's allowed.
 */
export type LoopOption = 'earlier-night' | 'stress-plan' | 'hungry-days-plan' | 'protein-range' | 'strength-session' | 'walk' | 'kcal-less' | 'kcal-more' | 'keep'

export function optionsFor(direction: 'less' | 'more' | 'hold', mind: MindContext, week: Pick<WeekPicture, 'move'>, allowLess: boolean): LoopOption[] {
  const o: LoopOption[] = []
  if (mind.poorSleepDays > 0) o.push('earlier-night')
  if (mind.highStressDays > 0) o.push('stress-plan')
  if (mind.hungryDays > 0) o.push('hungry-days-plan')
  o.push('protein-range')
  if (week.move.hard === 0) o.push('strength-session')
  o.push('walk')
  if (direction === 'less' && allowLess) o.push('kcal-less')
  if (direction === 'more') o.push('kcal-more')
  o.push('keep')
  return o
}

/* ---------------- the weigh-in check ---------------- */

export type RateNone = 'goal' | 'quiet' | 'too-soon' | 'not-enough-data' | 'awaiting-threshold' | 'no-target'
export type RateSuggestion =
  | { kind: 'none'; reason: RateNone }
  | { kind: 'on-track'; weeklyPct: number; intendedPct: number }
  /** the trend says eat less, but it isn't offered: the mind context or safety comes first */
  | { kind: 'held'; reason: 'mind' | 'awaiting-mind-threshold' | 'safety' | 'at-floor'; weeklyPct: number; intendedPct: number; mind: MindContext; options: LoopOption[] }
  | { kind: 'suggest'; direction: 'less' | 'more'; current: number; suggested: number; weeklyPct: number; intendedPct: number; mind: MindContext; options: LoopOption[] }

export interface RateOptions {
  healthConsent: boolean
  /** when a suggestion was last shown (YYYY-MM-DD); a new one waits a week. Not stored yet. */
  lastAt?: string
  t?: LoopThresholds
}

const RATE_GOALS: Goal[] = ['lose-fat', 'build-muscle']

/**
 * `suggestRateAdjustment` (personalized-nutrition-targets §3, first-run-onboarding §5): after 3
 * weeks and 6 weigh-ins, at most weekly, compare the weight trend with the pace the person chose
 * and suggest one small change, never apply it. Loss runs for lose-fat; the gain check for
 * build-muscle waits for its numbers. `weeklyPct` is signed (% body weight a week, minus = loss).
 * A change towards eating less is checked against the week's mind context first.
 */
export function suggestRateAdjustment(s: AppState, today: string, o: RateOptions): RateSuggestion {
  const t = o.t ?? LOOP_THRESHOLDS
  const p = s.profile
  const goal = p.goal
  if (!goal || !RATE_GOALS.includes(goal)) return { kind: 'none', reason: 'goal' }
  if (o.lastAt && o.lastAt > shiftDay(today, -RATE_EVERY_DAYS)) return { kind: 'none', reason: 'too-soon' }

  const window = t.trendWindowDays.value
  const band = (goal === 'lose-fat' ? t.lossRatePct : t.gainRatePct).value
  const tol = t.rateTolerancePct.value, step = t.stepPctOfMaint.value, maxDef = t.maxDeficitPct.value
  if (window === null || band === null || tol === null || step === null || maxDef === null) return { kind: 'none', reason: 'awaiting-threshold' }

  const all = weighIns(s, '0000-00-00', today)
  if (!all.length || all[0].d > shiftDay(today, -RATE_MIN_HISTORY_DAYS)) return { kind: 'none', reason: 'not-enough-data' }
  const pts = weighIns(s, shiftDay(today, -(Math.max(window, RATE_MIN_HISTORY_DAYS) - 1)), today)
  const trend = pts.length >= RATE_MIN_WEIGH_INS ? weightTrend(pts) : null
  if (!trend) return { kind: 'none', reason: 'not-enough-data' }

  const safety = loopSafety(s, trend.mean, o.healthConsent)
  if (safety.quiet) return { kind: 'none', reason: 'quiet' }
  const current = s.target?.kcal
  if (!current || current <= 0) return { kind: 'none', reason: 'no-target' }

  const weeklyPct = Math.round(((trend.slope * 7) / trend.mean) * 100 * 100) / 100
  const intendedPct = band[p.targetRate ?? 'standard']
  // the change towards the chosen pace, in the goal's own direction
  const pace = goal === 'lose-fat' ? -weeklyPct : weeklyPct
  let direction: 'less' | 'more' | null = null
  if (goal === 'lose-fat') {
    if (pace > intendedPct + tol || pace > MAX_LOSS_PCT_PER_WEEK) direction = 'more'
    else if (pace < intendedPct - tol) direction = 'less'
  } else {
    if (pace > intendedPct + tol) direction = 'less'
    else if (pace < intendedPct - tol) direction = 'more'
  }
  if (!direction) return { kind: 'on-track', weeklyPct, intendedPct }

  const est = maintenanceEstimate(p, null, trend.mean)
  const maint = est?.maint ?? current
  const delta = Math.max(50, r50((maint * step) / 100))
  const week = weekPicture(s, shiftDay(today, -1), today, t)
  const mind = week.mind

  if (direction === 'more') {
    // eating more is always allowed; a loss goal stops at maintenance
    const suggested = goal === 'lose-fat' ? Math.min(current + delta, Math.max(current, r50(maint))) : current + delta
    if (suggested <= current) return { kind: 'on-track', weeklyPct, intendedPct }
    return { kind: 'suggest', direction, current, suggested, weeklyPct, intendedPct, mind, options: optionsFor('more', mind, week, false) }
  }

  const held = (reason: 'mind' | 'awaiting-mind-threshold' | 'safety' | 'at-floor'): RateSuggestion =>
    ({ kind: 'held', reason, weeklyPct, intendedPct, mind, options: optionsFor('hold', mind, week, false) })
  if (safety.noLess) return held('safety')
  if (!est) return held('safety') // no floor without age and height: never guess one
  if (mind.strained === null) return held('awaiting-mind-threshold')
  if (mind.strained) return held('mind')

  // never below the floor, the deepest deficit, the 1%-a-week cap or (after poor sleep or stress at setup) the shallowest band
  const kpk = t.kcalPerKg.value ?? KCAL_PER_KG_LOST
  const lowest = Math.max(
    ceil50(calorieFloor(est.bmr, sexOf(p))),
    ceil50(maint * (1 - maxDef / 100)),
    ceil50(maint - (trend.mean * (MAX_LOSS_PCT_PER_WEEK / 100) * kpk) / 7),
    safety.nearMaintenance ? ceil50(maint * (1 + NEAR_MAINTENANCE_PCT / 100)) : 0,
  )
  const suggested = Math.max(current - delta, lowest)
  if (suggested >= current) return held('at-floor')
  return { kind: 'suggest', direction, current, suggested, weeklyPct, intendedPct, mind, options: optionsFor('less', mind, week, true) }
}

/* ---------------- adaptive maintenance ---------------- */

export type AdaptiveMaintenance =
  | { kind: 'none'; reason: 'quiet' | 'awaiting-threshold' | 'not-enough-data' }
  | {
      kind: 'estimate'
      /** best estimate and its range, nearest 50 kcal */
      maint: number; lo: number; hi: number
      /** the ± from logging and from the weight trend, nearest 10 */
      marginKcal: number
      /** the starting estimate from the person's answers (nearest 50), to compare */
      start: number | null
      loggedDays: number; weighIns: number
    }

/**
 * What the person seems to burn, from what they logged and how their weight moved over the
 * window: average intake minus the trend's energy (losing means they burn more than they log).
 * Only with enough logged days and weigh-ins; always a range. The ± combines each day's logging
 * margin (estimate.ts) and the trend's uncertainty; under-logging widens the top end, since logs
 * miss food far more often than they add it.
 */
export function adaptiveMaintenance(s: AppState, today: string, o: { healthConsent: boolean; t?: LoopThresholds }): AdaptiveMaintenance {
  const t = o.t ?? LOOP_THRESHOLDS
  const window = t.trendWindowDays.value, minLogged = t.minLoggedDays.value, under = t.underLoggingPct.value, kpk = t.kcalPerKg.value
  if (window === null || minLogged === null || under === null || kpk === null) return { kind: 'none', reason: 'awaiting-threshold' }
  const from = shiftDay(today, -window)
  const to = shiftDay(today, -1)
  const days = dayPictures(s, from, to, today).filter((x) => x.food.logged)
  const pts = weighIns(s, from, to)
  const trend = pts.length >= RATE_MIN_WEIGH_INS ? weightTrend(pts) : null
  if (days.length < minLogged || !trend) return { kind: 'none', reason: 'not-enough-data' }
  if (loopSafety(s, trend.mean, o.healthConsent).quiet) return { kind: 'none', reason: 'quiet' }

  const intake = avg(days.map((x) => x.food.kcal))
  const maint = intake - trend.slope * kpk
  const logErr = Math.sqrt(days.reduce((a, x) => a + x.food.margin ** 2, 0)) / days.length
  const trendErr = trend.se * kpk
  const m = Math.sqrt(logErr ** 2 + trendErr ** 2)
  const est = maintenanceEstimate(s.profile, null, trend.mean)
  return {
    kind: 'estimate',
    maint: r50(maint), lo: r50(maint - m), hi: r50(maint + m + (intake * under) / 100),
    marginKcal: r10(m), start: est ? r50(est.maint) : null,
    loggedDays: days.length, weighIns: pts.length,
  }
}

/* ---------------- maintenance mode: the band check ---------------- */

export type BandCheck =
  | { kind: 'none'; reason: 'awaiting-threshold' | 'not-enough-data' }
  | {
      kind: 'steady' | 'drift'
      /** which side of the band the recent weeks are on (drift only) */
      side: 'above' | 'below' | null
      /** recent weeks in a row outside the band, on the same side */
      weeks: number
      /** the band and weekly averages in kg; null when numbers are quiet */
      band: { lo: number; hi: number } | null
      weekly: (number | null)[] | null
      mind: MindContext
      options: LoopOption[]
    }

/**
 * Maintenance mode's hold-steady check: each recent week's average weight against a band around
 * the starting point (`anchorKg`, the person's maintenance start: not stored yet, so the caller
 * passes it). Two weeks in a row past the band on one side is a drift, which offers options from
 * every pillar; above the band, a calorie option only where eating less is allowed.
 */
export function maintenanceBandCheck(s: AppState, today: string, anchorKg: number, o: { healthConsent: boolean; t?: LoopThresholds }): BandCheck {
  const t = o.t ?? LOOP_THRESHOLDS
  const pct = t.maintenanceBandPct.value, minPerWeek = t.minWeighInsPerWeek.value
  if (pct === null || minPerWeek === null) return { kind: 'none', reason: 'awaiting-threshold' }
  const band = { lo: anchorKg * (1 - pct / 100), hi: anchorKg * (1 + pct / 100) }
  // newest week first: the 7 days ending yesterday, then the 7 before …
  const weekly: (number | null)[] = []
  for (let i = 0; i < BAND_WEEKS; i++) {
    const to = shiftDay(today, -1 - 7 * i)
    const w = weighIns(s, shiftDay(to, -6), to)
    weekly.push(w.length >= minPerWeek ? avg(w.map((x) => x.kg)) : null)
  }
  if (weekly[0] === null) return { kind: 'none', reason: 'not-enough-data' }
  const sideOf = (x: number | null) => (x === null ? null : x > band.hi ? 'above' : x < band.lo ? 'below' : 'in')
  const first = sideOf(weekly[0])
  let weeks = 0
  if (first === 'above' || first === 'below') while (weeks < weekly.length && sideOf(weekly[weeks]) === first) weeks++
  const week = weekPicture(s, shiftDay(today, -1), today, t)
  const safety = loopSafety(s, weekly[0], o.healthConsent)
  const drift = weeks >= DRIFT_WEEKS
  const side = drift ? (first as 'above' | 'below') : null
  return {
    kind: drift ? 'drift' : 'steady',
    side, weeks: drift ? weeks : 0,
    band: safety.quiet ? null : { lo: r1(band.lo), hi: r1(band.hi) },
    weekly: safety.quiet ? null : weekly.map((x) => (x === null ? null : r1(x))),
    mind: week.mind,
    options: drift ? optionsFor(side === 'above' ? 'less' : 'more', week.mind, week, !safety.noLess && week.mind.strained === false) : ['keep'],
  }
}

/* ---------------- the weekly review ---------------- */

export type ReviewChoice = 'keep' | 'ease-off' | 'adjust'
export const REVIEW_CHOICES: ReviewChoice[] = ['keep', 'ease-off', 'adjust']

export interface WeeklyReview {
  week: WeekPicture
  /** nothing logged all week: "welcome back", nothing to catch up, nothing else shown */
  welcomeBack: boolean
  /** numbers are hidden (gentle mode, a quiet food mode, pregnancy…): the review is in words */
  quiet: boolean
  food: { loggedDays: number; inRangeDays: number | null; avgKcal: number | null; avgProtein: number | null }
  move: WeekPicture['move']
  mind: WeekPicture['mind']
  /** the weight as a band of this week's weigh-ins, never a single reading; none when quiet */
  weight: { band: { lo: number; hi: number } | null; direction: 'down' | 'steady' | 'up' | null; reason?: 'quiet' | 'not-enough-data' | 'awaiting-threshold' }
  pattern: PatternResult | null
  /** the person's own "why", shown back */
  why: string[]
  choices: ReviewChoice[]
  rate: RateSuggestion | null
  maintenance: BandCheck | null
}

export interface ReviewOptions {
  healthConsent: boolean
  /** when the weigh-in check last showed a suggestion */
  lastRateAt?: string
  /** maintenance mode's starting weight, while there's no stored field for it */
  maintenanceAnchorKg?: number
  t?: LoopThresholds
}

/**
 * The weekly review on the day the person picks: the 7 finished days before `today` across all
 * four pillars, the weight as a band (none when quiet), at most one pattern line, their own why,
 * if-then plans due, and one choice for next week. A week with nothing logged is "welcome back".
 */
export function weeklyReview(s: AppState, today: string, o: ReviewOptions): WeeklyReview {
  const t = o.t ?? LOOP_THRESHOLDS
  const week = weekPicture(s, shiftDay(today, -1), today, t)
  const prev = weekPicture(s, shiftDay(today, -8), today, t)
  const safety = loopSafety(s, week.body.avg, o.healthConsent)
  const quiet = safety.quiet
  const why = week.mind.motivations
  const base = { week, quiet, move: week.move, mind: week.mind, why, choices: REVIEW_CHOICES }
  if (week.empty) {
    return { ...base, welcomeBack: true, food: { loggedDays: 0, inRangeDays: null, avgKcal: null, avgProtein: null }, weight: { band: null, direction: null }, pattern: null, rate: null, maintenance: null }
  }

  // weight: hidden in every quiet mode and where the food mode doesn't show it back
  let weight: WeeklyReview['weight']
  const minW = t.minWeighInsPerWeek.value, steady = t.steadyWeeklyKg.value
  if (quiet || !foodView(s.profile).weightBack) weight = { band: null, direction: null, reason: 'quiet' }
  else if (minW === null) weight = { band: null, direction: null, reason: 'awaiting-threshold' }
  else if (week.body.weighIns < minW) weight = { band: null, direction: null, reason: 'not-enough-data' }
  else {
    const bandKg = { lo: r1(week.body.lo!), hi: r1(week.body.hi!) }
    if (steady === null) weight = { band: bandKg, direction: null, reason: 'awaiting-threshold' }
    else if (prev.body.weighIns < minW) weight = { band: bandKg, direction: null, reason: 'not-enough-data' }
    else {
      const delta = week.body.avg! - prev.body.avg!
      weight = { band: bandKg, direction: Math.abs(delta) <= steady ? 'steady' : delta < 0 ? 'down' : 'up' }
    }
  }

  const pw = t.patternWindowDays.value
  const pattern: PatternResult = pw === null ? { line: null, reason: 'awaiting-threshold' } : patternLine(dayPictures(s, shiftDay(today, -pw), shiftDay(today, -1), today), t)
  const noTarget = foodView(s.profile).mode === 'yes'
  return {
    ...base,
    welcomeBack: false,
    food: {
      loggedDays: week.food.loggedDays,
      inRangeDays: quiet || noTarget ? null : week.food.inRangeDays,
      avgKcal: quiet ? null : week.food.avgKcal === null ? null : r10(week.food.avgKcal),
      avgProtein: quiet ? null : week.food.avgProtein === null ? null : Math.round(week.food.avgProtein),
    },
    weight,
    pattern,
    rate: suggestRateAdjustment(s, today, { healthConsent: o.healthConsent, lastAt: o.lastRateAt, t }),
    maintenance: o.maintenanceAnchorKg ? maintenanceBandCheck(s, today, o.maintenanceAnchorKg, { healthConsent: o.healthConsent, t }) : null,
  }
}

