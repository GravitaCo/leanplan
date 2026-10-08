import type { AppState, Goal } from '@/core/types'
import { parseYmd, shiftDay } from './date'
import { avg, baseRange, latestWeight, rangeWidth } from './insights'
import { calorieFloor, MAX_LOSS_PCT_PER_WEEK, NEAR_MAINTENANCE_PCT } from './nutrition'
import { maintenanceEstimate } from './targets'
import { foodView, proteinRangeFor } from './foodMode'
import { profileRouting, sexOf } from './onboarding'
import { dayPictures, GENTLE_PATTERNS, patternLine, weekPicture, type MindContext, type PatternCode, type PatternResult, type WeekPicture } from './weekPicture'
import { daysBetween, levelWord, pctWeek, weighIns, weightTrend, type LevelWord, type WeightTrend } from './weightTrend'
import { LOOP_THRESHOLDS, type LoopThresholds } from './loopThresholds'

/**
 * The maintenance loop (docs/plans/maintenance-loop.md; boards ml-a1 to ml-d2, approved by Benn on
 * 8 Oct 2026): the weekly review model, the weigh-in check (`suggestRateAdjustment`), adaptive
 * maintenance, the steady range and its drift check. All read the shared weekly picture
 * (weekPicture.ts) and the 28-day trend (weightTrend.ts); all are pure (the clock is passed in);
 * none stores anything or changes a target: they suggest, the person decides.
 *
 * Safety, always: gentle mode hides every number; nothing goes below the calorie floors; no
 * "eat less" with wellbeing flagged, in pregnancy, under 18, after a hard week or behind any
 * routing clamp; weight only for people who chose to include it, never in gentle mode or with
 * wellbeing flagged; no "x of y", no streaks, no week-to-week weight number.
 */

const r50 = (x: number) => Math.round(x / 50) * 50
const ceil50 = (x: number) => Math.ceil(x / 50) * 50
const floor50 = (x: number) => Math.floor(x / 50) * 50

/* ---------------- safety ---------------- */

export interface LoopSafety {
  /** no numbers at all: gentle mode, a quiet food mode, pregnancy, under 18, no health consent */
  quiet: boolean
  /** gentle mode (the person's own setting or wellbeing Yes): the review is in words */
  gentle: boolean
  /** weight may appear: the person chose it (ml-c4), numbers aren't quiet and wellbeing isn't flagged */
  weight: boolean
  /** never suggest eating less (before the week's mind context, which `allowLess` adds) */
  noLess: boolean
  /** at most the shallowest deficit (poor sleep or stress at setup) */
  nearMaintenance: boolean
}

export function loopSafety(s: AppState, kg: number | null, healthConsent: boolean): LoopSafety {
  const p = s.profile
  const r = profileRouting(p, kg, healthConsent)
  const fv = foodView(p)
  // the loop reads weight, intake and mood together: without the health-data yes it says nothing
  // (profileRouting treats a profile from before onboarding as consented, so this is checked here too)
  const gentle = !!p.gentle || r.gentle
  const quiet = !healthConsent || gentle || r.hideCalories || fv.mode !== 'standard' || !!p.pregnancy?.flagged || !!r.stop
  return {
    quiet, gentle,
    weight: p.reviewWeight === true && !quiet && fv.weightBack && !r.hideWeight,
    noLess: quiet || r.noDeficit || r.maintenanceOnly,
    nearMaintenance: r.nearMaintenance,
  }
}

/** Eating less may be offered this week: never after a hard week (mental-performance 8 Oct, rule 7). */
export const allowLess = (safety: LoopSafety, mind: MindContext) => !safety.noLess && !mind.hard && !careWeek(mind)

/**
 * A care week (mental-performance 8 Oct): mood Rough or Low on 4+ days, or Starving on 3+ days (a
 * restriction signal). It reads like a hard week, with no weight, no lower range, no pattern line
 * and none of the follow-up sheets. Thresholds pending clinical review; no support pointer yet.
 */
export const careWeek = (m: Pick<MindContext, 'careMood' | 'starvingDays'>) => m.careMood || m.starvingDays >= 3

/* ---------------- options from every pillar ---------------- */

/**
 * What a suggestion can offer, as codes (loopCopy.ts words them; boards ml-a2, ml-a5, ml-b1,
 * ml-b2, ml-c3). "Keep as is" is always there and comes first (or as its own button); a range
 * change is one option among several, never the only one.
 */
export type LoopOption =
  | 'earlier-night' | 'hungry-days-plan' | 'hungry-evenings-plan' | 'strength-session' | 'protein-meals'
  | 'range-less' | 'range-more' | 'rest-day' | 'walk' | 'new-start'
export type OptionContext = 'calm' | 'hard' | 'gentle' | 'drift'

/**
 * The order (boards and mental-performance 8 Oct): a calm week leads with protein, strength,
 * range, then sleep; a hard week with sleep and hunger; gentle mode only rest, sleep, a plan or a
 * walk, never a range; a drift (ml-c3) adds "make this my new starting point" last.
 */
export function optionsFor(ctx: OptionContext, range: 'less' | 'more' | null, mind: Pick<MindContext, 'eveningHunger'>): LoopOption[] {
  const plan: LoopOption = mind.eveningHunger ? 'hungry-evenings-plan' : 'hungry-days-plan'
  const r: LoopOption[] = range === 'less' ? ['range-less'] : range === 'more' ? ['range-more'] : []
  switch (ctx) {
    case 'gentle': return ['earlier-night', 'rest-day', plan, 'walk']
    case 'hard': return ['earlier-night', plan, 'strength-session', 'protein-meals', ...r]
    case 'drift': return ['protein-meals', 'strength-session', plan, ...r, 'earlier-night', 'new-start']
    case 'calm': return ['protein-meals', 'strength-session', ...r, 'earlier-night']
  }
}

/* ---------------- the target and its steps ---------------- */

export interface RangeChange { from: { lo: number; hi: number }; to: { lo: number; hi: number }; kcal: number; suggested: number }

/**
 * One step on the calorie target, moved at both ends of the range (boards: "From 2,050–2,450 to
 * 1,950–2,350 kcal"). Eating less never goes below the calorie floor, 25% under maintenance, the
 * 1%-a-week cap (at 7,000 kcal/kg, the safe side), the shallowest band after low sleep or stress at
 * setup, or (maintain) 150 kcal under maintenance. Null when there's no room.
 */
export function rangeStep(s: AppState, dir: 'less' | 'more', kg: number, safety: LoopSafety, today: string, t: LoopThresholds = LOOP_THRESHOLDS, anchor?: number): RangeChange | null {
  const p = s.profile
  const kcal = s.target?.kcal
  if (!kcal || kcal <= 0) return null
  const est = maintenanceEstimate(p, null, kg)
  if (!est) return null // no floor without age and height: never guess one
  const maint = est.maint
  // maintain: steps never stack past ±150 of the best estimate (the learned one when there is one)
  const centre = anchor ?? maint
  let suggested: number
  if (dir === 'more') {
    suggested = kcal + t.stepKcal
    // a loss goal stops at maintenance
    if (p.goal === 'lose-fat') suggested = Math.min(suggested, Math.max(kcal, r50(maint)))
    if (p.goal === 'maintain') suggested = Math.min(suggested, floor50(centre + t.maintainMaxCutKcal))
    if (suggested <= kcal) return null
  } else {
    const lowest = Math.max(
      ceil50(calorieFloor(est.bmr, sexOf(p))),
      ceil50(maint * (1 - t.maxDeficitPct / 100)),
      ceil50(maint - (kg * (MAX_LOSS_PCT_PER_WEEK / 100) * t.kcalPerKg) / 7),
      safety.nearMaintenance ? ceil50(maint * (1 + NEAR_MAINTENANCE_PCT / 100)) : 0,
      p.goal === 'maintain' ? ceil50(centre - t.maintainMaxCutKcal) : 0,
    )
    suggested = Math.max(kcal - t.stepKcal, lowest)
    if (suggested >= kcal) return null
  }
  const w = rangeWidth(p)
  const cur = baseRange(s, today)
  return { from: { lo: cur.lo, hi: cur.hi }, to: { lo: suggested - w, hi: suggested + w }, kcal, suggested }
}

/* ---------------- the steady range (maintain) ---------------- */

export interface SteadyRange {
  /** the reference weight and the range around it, kg (never shown as numbers in the loop's words) */
  ref: number
  lo: number
  hi: number
  pct: number
  /** the date the range's clock started: maintain's start, or the last "new starting point" */
  from: string
}

/** When the steady range's clock started: a reset wins over maintain's start. */
export function steadyStart(s: AppState): string | null {
  const p = s.profile
  if (p.goal !== 'maintain') return null
  return p.steadyRef?.from ?? p.maintainFrom ?? null
}

/**
 * The steady range on `on` (nutrition-accuracy rule 2 and its 8 Oct answers): the mean of the
 * weigh-ins in the first 14 days after maintain starts (4 or more), else the first 4 within 28
 * days; ±3% for the first 6 weeks after the start, then ±2%. A "new starting point" sets the
 * reference to the trend level and restarts the 6 weeks. Null until there's a reference.
 */
export function steadyRange(s: AppState, on: string, t: LoopThresholds = LOOP_THRESHOLDS): SteadyRange | null {
  const from = steadyStart(s)
  if (!from || on < from) return null
  const k = t.steady
  let ref: number | null = s.profile.steadyRef?.kg ?? null
  if (ref === null) {
    const first = weighIns(s, from, shiftDay(from, k.refDays - 1))
    const fallback = weighIns(s, from, shiftDay(from, k.refFallbackDays - 1)).slice(0, k.refMin)
    const pts = first.length >= k.refMin ? first : fallback.length >= k.refMin ? fallback : null
    // the reference only counts once its readings are in the past
    if (!pts || pts[pts.length - 1].d > on) return null
    ref = avg(pts.map((x) => x.kg))
  }
  const pct = daysBetween(from, on) < k.earlyDays ? k.earlyPct : k.latePct
  return { ref, lo: ref * (1 - pct / 100), hi: ref * (1 + pct / 100), pct, from }
}

export type SteadyWord = 'steady' | 'above' | 'below'
export interface DriftCheck {
  word: SteadyWord
  /** outside on the same side at 2 weekly checks in a row: the drift sheet (ml-c3) may show */
  drift: boolean
  range: SteadyRange
  trend: WeightTrend
}

/**
 * The weekly drift check, statelessly: the trend level with data to yesterday and to 8 days ago,
 * each with 6+ weigh-ins and its own range width, both outside on the same side (after the
 * reference exists). Until then the words say "steady" ("about level"; one week doesn't move it).
 */
export function driftCheck(s: AppState, today: string, t: LoopThresholds = LOOP_THRESHOLDS): DriftCheck | null {
  const k = t.steady
  const start = steadyStart(s)
  if (!start) return null
  const side = (on: string): { word: SteadyWord; range: SteadyRange; trend: WeightTrend } | null => {
    const range = steadyRange(s, on, t)
    const trend = range ? weightTrend(s, on, { notBefore: s.profile.steadyRef?.from ?? s.profile.maintainFrom, t }) : null
    if (!range || !trend || trend.n < k.minWeighIns) return null
    return { word: trend.level > range.hi ? 'above' : trend.level < range.lo ? 'below' : 'steady', range, trend }
  }
  const now = side(shiftDay(today, -1))
  if (!now) return null
  let drift = now.word !== 'steady'
  for (let i = 1; drift && i < k.driftChecks; i++) {
    const prev = side(shiftDay(today, -1 - 7 * i))
    drift = !!prev && prev.word === now.word
  }
  return { word: drift ? now.word : 'steady', drift, range: now.range, trend: now.trend }
}

/* ---------------- the weight row ---------------- */

/** The weight in words for the review and the checks (mental-performance 8 Oct). */
export type WeightWords =
  | { kind: 'too-soon' }
  | { kind: 'steady' | 'above' | 'below' }
  | { kind: 'pace'; pace: 'in-line' | 'slower' | 'faster' }
  | { kind: 'level'; word: LevelWord; aLittle: boolean }

export interface WeightRow { weighIns: number; words: WeightWords; /** the trend's window in weeks (4, 6 or 8) */ weeks: number }

/** The rate check's pace: in line unless beyond the tolerance and beyond 2 SE. */
export function paceOf(tr: WeightTrend, goal: Goal, rate: AppState['profile']['targetRate'], t: LoopThresholds = LOOP_THRESHOLDS): 'in-line' | 'slower' | 'faster' | null {
  const intended = goal === 'lose-fat' ? -t.rate.lossPct[rate ?? 'standard'] : goal === 'build-muscle' && t.rate.gainPct ? t.rate.gainPct[rate ?? 'standard'] : null
  if (intended === null) return null
  const diff = tr.weeklyPct - intended
  const se = Math.abs(pctWeek(tr.se, tr.level))
  if (Math.abs(diff) <= t.rate.tolerancePct || Math.abs(diff) <= 2 * se) return 'in-line'
  // for a loss, a more negative change is faster; for a gain, a more positive one
  const faster = intended < 0 ? diff < 0 : diff > 0
  return faster ? 'faster' : 'slower'
}

/**
 * How often the person weighed in, and after 4 weeks the trend in words: maintain against the
 * steady range (a side only once a drift is confirmed), lose-fat against the chosen pace, other
 * goals level, up or down ("a little" within 0.5% a week). Null when weight is left out.
 */
export function weightRow(s: AppState, today: string, weighInsThisWeek: number, safety: LoopSafety, t: LoopThresholds = LOOP_THRESHOLDS): WeightRow | null {
  if (!safety.weight) return null
  const goal = s.profile.goal
  const to = shiftDay(today, -1)
  const paced = goal === 'lose-fat' || (goal === 'build-muscle' && !!t.rate.gainPct)
  // a pace is judged like the check: from 14 days after the last target change, with 28 days of data
  const notBefore = paced && s.profile.targetSetAt ? shiftDay(s.profile.targetSetAt, t.rate.skipAfterChangeDays) : undefined
  const tr = weightTrend(s, to, { notBefore, t })
  const row = (words: WeightWords): WeightRow => ({ weighIns: weighInsThisWeek, words, weeks: tr ? Math.round(tr.windowDays / 7) : 4 })
  if (!tr?.wordsReady) return row({ kind: 'too-soon' })
  if (goal === 'maintain') {
    // no reference yet, or too few weigh-ins since a reset: no check ran, so nothing is claimed
    const d = driftCheck(s, today, t)
    return row(d ? { kind: d.word } : { kind: 'too-soon' })
  }
  if (paced) {
    if (daysBetween(tr.from, to) < t.rate.minDataDays - 1) return row({ kind: 'too-soon' })
    const pace = paceOf(tr, goal!, s.profile.targetRate, t)
    if (pace) return row({ kind: 'pace', pace })
  }
  return row({ kind: 'level', word: levelWord(tr, t), aLittle: Math.abs(tr.weeklyPct) <= t.trend.aLittlePctWeek })
}

/* ---------------- the weigh-in check ---------------- */

export type RateNone = 'goal' | 'weight-off' | 'quiet' | 'too-soon' | 'not-enough-data' | 'no-target'
export type RateSuggestion =
  | { kind: 'none'; reason: RateNone }
  /** `week`: the last 7 days (the mind rows read "last week"); `span`: the trend's window, for move and food */
  | { kind: 'on-pace'; trend: WeightTrend; week: WeekPicture; span: WeekPicture }
  /** off pace: options from every pillar, "keep as is" always; a range change only where allowed */
  | { kind: 'options'; pace: 'slower' | 'faster'; ctx: 'calm' | 'hard'; options: LoopOption[]; range: RangeChange | null; trend: WeightTrend; week: WeekPicture; span: WeekPicture }

export interface RateOptions {
  healthConsent: boolean
  /** when a check last showed (YYYY-MM-DD); a new one waits a week. Not stored yet. */
  lastAt?: string
  t?: LoopThresholds
}

/**
 * `suggestRateAdjustment` (boards ml-b1 to ml-b3; nutrition-accuracy rules, replacing
 * personalized-nutrition-targets §3.3 to §3.4): lose-fat only for now (build-muscle waits for its
 * gain rates). At most weekly; 28 days of data starting 14 days after the last target change (so
 * 42 days after it); the 28-day trend against the chosen pace, off pace only beyond ±0.35% a
 * week and 2 SE. It suggests, never applies. A hard week leads with mind options and offers no
 * range cut. People who left weight out never get it: it is a weight check.
 */
export function suggestRateAdjustment(s: AppState, today: string, o: RateOptions): RateSuggestion {
  const t = o.t ?? LOOP_THRESHOLDS
  const p = s.profile
  const goal = p.goal
  if (goal !== 'lose-fat' && !(goal === 'build-muscle' && t.rate.gainPct)) return { kind: 'none', reason: 'goal' }
  if (o.lastAt && o.lastAt > shiftDay(today, -t.rate.everyDays)) return { kind: 'none', reason: 'too-soon' }
  const kg = latestWeight(s, today)
  const safety = loopSafety(s, kg, o.healthConsent)
  if (safety.quiet) return { kind: 'none', reason: 'quiet' }
  if (!safety.weight) return { kind: 'none', reason: 'weight-off' }
  if (!s.target?.kcal) return { kind: 'none', reason: 'no-target' }

  const to = shiftDay(today, -1)
  const notBefore = p.targetSetAt ? shiftDay(p.targetSetAt, t.rate.skipAfterChangeDays) : undefined
  const tr = weightTrend(s, to, { notBefore, t })
  if (!tr || !tr.wordsReady || daysBetween(tr.from, to) < t.rate.minDataDays - 1) return { kind: 'none', reason: 'not-enough-data' }

  const week = weekPicture(s, shiftDay(today, -7), to, today, t)
  const span = weekPicture(s, tr.from, to, today, t)
  const pace = paceOf(tr, goal, p.targetRate, t)
  if (!pace || pace === 'in-line') return { kind: 'on-pace', trend: tr, week, span }
  const ctx = week.mind.hard ? 'hard' : 'calm'
  const dir = pace === 'slower' ? (goal === 'lose-fat' ? 'less' : 'more') : (goal === 'lose-fat' ? 'more' : 'less')
  const range = dir === 'less' && !allowLess(safety, week.mind) ? null : rangeStep(s, dir, tr.level, safety, today, t)
  return { kind: 'options', pace, ctx, options: optionsFor(ctx, range ? dir : null, week.mind), range, trend: tr, week, span }
}

/* ---------------- adaptive maintenance ---------------- */

export type AdaptiveMaintenance =
  | { kind: 'none'; reason: 'quiet' | 'weight-off' | 'not-enough-data' | 'tapering' | 'not-narrower' }
  | {
      kind: 'estimate'
      /** best estimate and its range, nearest 50 kcal */
      maint: number; lo: number; hi: number
      /** the starting estimate from the person's answers and its ±15% range, nearest 50 */
      start: { maint: number; lo: number; hi: number }
      /** qualifying days, their mean intake, and weigh-ins */
      loggedDays: number; avgKcal: number; weighIns: number
      /** the window, in days, and its first day */
      days: number; from: string
    }

/**
 * What keeps the person steady going by what they log (board ml-b4; nutrition-accuracy rule 3):
 * mean intake on qualifying days (2+ meals logged) minus 7,000 × the trend's kg a day. Needs 28
 * days (growing to 42 or 56), 20 qualifying days and 6 weigh-ins, all from 14 days after maintain
 * started or the target last changed. The range is ±1.645 SE (intake and trend), nearest 50,
 * never narrower than ±150, shown only once narrower than the starting ±15%; withheld when intake
 * in the two halves differs by more than 15%. Unlogged days are never filled in.
 */
export function adaptiveMaintenance(s: AppState, today: string, o: { healthConsent: boolean; t?: LoopThresholds }): AdaptiveMaintenance {
  const t = o.t ?? LOOP_THRESHOLDS
  const k = t.adaptive
  const p = s.profile
  const kg = latestWeight(s, today)
  const safety = loopSafety(s, kg, o.healthConsent)
  if (safety.quiet) return { kind: 'none', reason: 'quiet' }
  if (!safety.weight) return { kind: 'none', reason: 'weight-off' }
  const to = shiftDay(today, -1)
  const changes = [p.maintainFrom, p.targetSetAt].filter((x): x is string => !!x).sort()
  const notBefore = changes.length ? shiftDay(changes[changes.length - 1], k.skipAfterChangeDays) : undefined
  // the longest window (28, 42 or 56 days, never before `notBefore`) that qualifies and is
  // narrower than the start (nutrition-accuracy 8 Oct: the range narrows as data grows)
  let best: Extract<AdaptiveMaintenance, { kind: 'estimate' }> | null = null
  let why: 'not-enough-data' | 'not-narrower' = 'not-enough-data'
  let lastFrom = ''
  for (const w of k.windowDays) {
    let from = shiftDay(to, -(w - 1))
    if (notBefore && from < notBefore) from = notBefore
    if (from === lastFrom) break // clipped: a longer window adds nothing
    lastFrom = from
    if (daysBetween(from, to) < k.minDays - 1) break
    // a qualifying day: 2+ meal slots, at least one of them lunch or dinner (a breakfast and a snack isn't a day's eating)
    const days = dayPictures(s, from, to, today).filter((x) => x.food.meals >= k.minMeals && x.food.mainMeal)
    const tr = weightTrend(s, to, { notBefore: from, t: { ...t, trend: { ...t.trend, windowDays: [w] } } })
    if (days.length < k.minLoggedDays || !tr || tr.n < k.minWeighIns) continue
    const intake = days.map((x) => x.food.kcal)
    const mean = avg(intake)
    // tapering: the two halves of the window by date, not by count of days
    const mid = shiftDay(from, Math.floor((daysBetween(from, to) + 1) / 2))
    const h1 = days.filter((x) => x.d < mid).map((x) => x.food.kcal), h2 = days.filter((x) => x.d >= mid).map((x) => x.food.kcal)
    if (h1.length && h2.length && Math.abs(avg(h1) - avg(h2)) / Math.min(avg(h1), avg(h2)) > k.taperPct / 100) return { kind: 'none', reason: 'tapering' } // a recent taper withholds it, whatever a longer window says
    const sd = Math.sqrt(intake.reduce((x, v) => x + (v - mean) ** 2, 0) / (intake.length - 1))
    const se = Math.sqrt((sd / Math.sqrt(intake.length)) ** 2 + (t.kcalPerKg * tr.se) ** 2)
    const maint = mean - t.kcalPerKg * tr.slope
    const halfW = Math.max(k.minHalfKcal, r50(k.z * se))
    const est = maintenanceEstimate(p, null, tr.level)
    if (!est) break
    if (halfW >= (est.maint * k.startMarginPct) / 100) { why = 'not-narrower'; continue }
    const m = r50(maint)
    const sw = (est.maint * k.startMarginPct) / 100
    best = {
      kind: 'estimate', maint: m, lo: m - halfW, hi: m + halfW,
      start: { maint: r50(est.maint), lo: r50(est.maint - sw), hi: r50(est.maint + sw) },
      loggedDays: days.length, avgKcal: r50(mean), weighIns: tr.n, days: daysBetween(from, to) + 1, from,
    }
  }
  return best ?? { kind: 'none', reason: why }
}

/* ---------------- maintain: the drift sheet ---------------- */

export type DriftSuggestion =
  | { kind: 'none'; reason: 'goal' | 'quiet' | 'weight-off' | 'steady' }
  | { kind: 'drift'; side: 'above' | 'below'; options: LoopOption[]; range: RangeChange | null; check: DriftCheck; week: WeekPicture; weighIns: number }

/**
 * The drift sheet (ml-c3): options from every pillar once the trend has sat outside the steady
 * range at 2 weekly checks. Above it, "adjust my range a little" only where eating less is allowed
 * (never after a hard week); below it, a range up. The mind rows read the last 2 weeks.
 */
export function maintenanceDrift(s: AppState, today: string, o: { healthConsent: boolean; t?: LoopThresholds }): DriftSuggestion {
  const t = o.t ?? LOOP_THRESHOLDS
  if (s.profile.goal !== 'maintain') return { kind: 'none', reason: 'goal' }
  const safety = loopSafety(s, latestWeight(s, today), o.healthConsent)
  if (safety.quiet) return { kind: 'none', reason: 'quiet' }
  if (!safety.weight) return { kind: 'none', reason: 'weight-off' }
  const check = driftCheck(s, today, t)
  if (!check?.drift || check.word === 'steady') return { kind: 'none', reason: 'steady' }
  const to = shiftDay(today, -1), from = shiftDay(today, -14)
  const week = weekPicture(s, from, to, today, t)
  const dir = check.word === 'above' ? 'less' : 'more'
  // the 28-day trend lags a change: no second step until it has had 28 days to show
  const settling = !!s.profile.targetSetAt && s.profile.targetSetAt > shiftDay(today, -28)
  const learned = adaptiveMaintenance(s, today, o)
  const anchor = learned.kind === 'estimate' ? learned.maint : undefined
  const range = settling || (dir === 'less' && !allowLess(safety, week.mind)) ? null : rangeStep(s, dir, check.trend.level, safety, today, t, anchor)
  return { kind: 'drift', side: check.word, options: optionsFor('drift', range ? dir : null, week.mind), range, check, week, weighIns: weighIns(s, from, to).length }
}

/* ---------------- the weekly review ---------------- */

export type ReviewChoice = 'keep' | 'ease-off' | 'change-one' | 'pick-up' | 'ease-back'
export type Encouragement = 'steady' | 'gentle' | 'hard' | 'welcome' | 'lighter'
export type ProteinWords = { kind: 'meals' } | { kind: 'grams'; g: number }

export interface WeeklyReview {
  week: WeekPicture
  /** a missed review (or a week with nothing in it): "Welcome back", only the days since, nothing to catch up */
  welcomeBack: boolean
  /** welcome back: the first day counted ("What you did since Friday"), when there's anything */
  since: string | null
  encouragement: Encouragement
  gentle: boolean
  /** numbers are hidden (gentle mode, a quiet food mode, pregnancy…) */
  quiet: boolean
  food: { loggedDays: number; inRangeDays: number | null; protein: ProteinWords | null }
  move: WeekPicture['move']
  mind: WeekPicture['mind']
  /** opt-in only: how often they weighed in and, after 4 weeks, the trend in words */
  weight: WeightRow | null
  pattern: PatternResult | null
  /** the person's own "why", shown back */
  why: string[]
  choices: ReviewChoice[]
  /** "Change one thing" (ml-a5): what it offers this week */
  changeOne: { ctx: OptionContext; options: LoopOption[]; range: RangeChange | null }
}

export interface ReviewOptions {
  healthConsent: boolean
  /** the last review the person opened (YYYY-MM-DD), and the weekday they picked (0 = Sunday); not stored yet */
  lastReviewAt?: string
  reviewDay?: number
  /** when each pattern line last showed */
  patternShown?: Partial<Record<PatternCode, string>>
  t?: LoopThresholds
}

/** The review day before `today` (or today itself) on the person's weekday. */
export function reviewDayOn(today: string, weekday: number): string {
  const back = (parseYmd(today).getDay() - weekday + 7) % 7
  return shiftDay(today, -back)
}

/**
 * Welcome back (ml-a4): the review before this one was missed. After a missed review only the
 * current stretch shows: from the first active day after the last 3+ quiet days, never more than
 * 7 days back, so nothing is compared across the gap.
 */
function missedReview(today: string, o: ReviewOptions): boolean {
  if (o.reviewDay === undefined || !o.lastReviewAt) return false
  const thisOne = reviewDayOn(today, o.reviewDay)
  return o.lastReviewAt < shiftDay(thisOne, -7)
}

function sinceGap(s: AppState, today: string): string | null {
  const days = dayPictures(s, shiftDay(today, -7), shiftDay(today, -1), today)
  const active = (i: number) => { const x = days[i]; return x.food.logged || !!x.mind || x.move.sessions.length > 0 || x.weight !== null }
  let first: number | null = null
  for (let i = days.length - 1; i >= 0; i--) {
    if (active(i)) first = i
    else if (first !== null && i >= 2 && !active(i - 1) && !active(i - 2)) break
  }
  return first === null ? null : days[first].d
}

/**
 * The weekly review (boards ml-a1 to ml-a5), on the day the person picks: the 7 finished days
 * before `today`. "What you did" first, with one line of encouragement, then the pattern line,
 * their why, their if-then plans and one choice for next week. Weight only for people who chose
 * it, in words. Counts, never "x of y".
 */
export function weeklyReview(s: AppState, today: string, o: ReviewOptions): WeeklyReview {
  const t = o.t ?? LOOP_THRESHOLDS
  const to = shiftDay(today, -1)
  const full = weekPicture(s, shiftDay(today, -7), to, today, t)
  const welcomeBack = full.empty || missedReview(today, o)
  const since = welcomeBack ? sinceGap(s, today) : null
  const week = welcomeBack && since ? weekPicture(s, since, to, today, t) : full
  const kg = latestWeight(s, today)
  const safety = loopSafety(s, kg, o.healthConsent)
  const quiet = safety.quiet
  const wellbeingRouted = week.mind.wellbeing === 'flagged' || week.mind.wellbeing === 'sometimes'
  const care = careWeek(week.mind)
  const hardish = week.mind.hard || care
  // a lighter week (1 to 3 active days): no praise for a habit on that little, and no range change
  // from a few logged days (mental-performance, 8 Oct; 4 days a judgement call)
  const activeDays = week.days.filter((x) => x.finished && (x.food.logged || x.mind || x.move.sessions.length || x.weight !== null)).length
  const lighter = !welcomeBack && activeDays < 4
  const encouragement: Encouragement = welcomeBack ? 'welcome' : safety.gentle ? 'gentle' : hardish ? 'hard' : lighter ? 'lighter' : 'steady'

  // protein (mental-performance 8 Oct): most main meals with 15 g, else the daily average when it reaches the range's low end
  const fv = foodView(s.profile)
  const mealsRule = week.food.mainMeals > 0 && week.food.proteinMeals * 2 > week.food.mainMeals
  let protein: ProteinWords | null = null
  const pr = proteinRangeFor(s.profile, kg)
  if (mealsRule) protein = { kind: 'meals' }
  else if (!quiet && week.food.avgProtein !== null && pr && week.food.avgProtein >= pr.low) protein = { kind: 'grams', g: Math.round(week.food.avgProtein / 5) * 5 }

  // pattern lines: none on welcome back, with wellbeing flagged, or in a hard or care week; gentle mode only mind and movement
  const pattern = welcomeBack || wellbeingRouted || week.mind.hard || care
    ? null
    : patternLine(s, to, today, { allowed: safety.gentle ? GENTLE_PATTERNS : undefined, recent: o.patternShown, t })

  const ctx: OptionContext = safety.gentle || quiet ? 'gentle' : hardish ? 'hard' : 'calm'
  // a range change in "Change one thing" (ml-a5) only where the weigh-in check or the drift check
  // points one way (eat-less only after a drift or a slower pace, never after a hard week)
  let range: RangeChange | null = null, dir: 'less' | 'more' | null = null
  if (ctx !== 'gentle' && !welcomeBack && !care && !lighter) {
    const rate = suggestRateAdjustment(s, today, { healthConsent: o.healthConsent, t })
    const drift = rate.kind === 'none' ? maintenanceDrift(s, today, { healthConsent: o.healthConsent, t }) : null
    const r = rate.kind === 'options' ? rate.range : drift?.kind === 'drift' ? drift.range : null
    if (r) { range = r; dir = r.suggested < r.kcal ? 'less' : 'more' }
  }
  return {
    week, welcomeBack, since, encouragement, gentle: safety.gentle, quiet,
    food: {
      loggedDays: week.food.loggedDays,
      inRangeDays: quiet || !fv.rangeOnFood || fv.mode === 'yes' ? null : week.food.inRangeDays,
      protein: safety.gentle && protein?.kind === 'grams' ? null : protein,
    },
    move: week.move,
    mind: week.mind,
    // never compared across a gap on welcome back
    weight: welcomeBack || wellbeingRouted || care ? null : weightRow(s, today, week.body.weighIns, safety, t),
    pattern,
    why: week.mind.motivations,
    choices: welcomeBack ? ['pick-up', 'ease-back'] : ['keep', 'ease-off', 'change-one'],
    changeOne: { ctx, options: optionsFor(ctx, dir, week.mind), range },
  }
}

/* ---------------- choices ---------------- */

/**
 * "Ease off" and "Ease back in" (mental-performance 8 Oct): the shorter sessions pre-selected for
 * the coming 7 days, starting today (the review looks back on the 7 days before it). Food stays as
 * it is: nothing widens the range today. Returns the profile fields to set.
 */
export function easeOffFields(today: string): { easyFrom: string; easyUntil: string } {
  return { easyFrom: today, easyUntil: shiftDay(today, 6) }
}

/** The target after a chosen range change: kcal moves by the step, carbs take the difference (protein and fat stay). */
export function targetAfter(t: AppState['target'], rc: RangeChange): AppState['target'] {
  const d = rc.suggested - t.kcal
  return { ...t, kcal: rc.suggested, c: Math.max(0, Math.round(t.c + d / 4)) }
}

/** A profile patch picks "Keep it steady" when it wasn't the goal before: the steady range's clock starts. */
export const startsMaintain = (prev: Goal | undefined, patch: { goal?: Goal }): boolean => 'goal' in patch && patch.goal === 'maintain' && prev !== 'maintain'

/**
 * The review is waiting on Summary (ml-e3): from the review day (Sunday unless the person picked
 * another) until it's opened, hidden with the cross, or the next review day. Not before there's a
 * week to look back on, and never without health consent (it reads the log).
 */
export function reviewWaiting(s: AppState, today: string, healthConsent: boolean): boolean {
  if (!healthConsent) return false
  const p = s.profile
  const day = reviewDayOn(today, p.reviewDay ?? 0)
  if ((p.lastReviewAt && p.lastReviewAt >= day) || p.reviewHidden === day) return false
  // a week to look back on: something logged at least 7 days before the review day (a new person
  // waits for their first full week: ship-critic, 8 Oct), and something in the 7 days before it
  const used = (d: string) => { const x = s.days[d]; return !!x && !!(x.foods?.length || x.checkin || x.weight || x.sessions?.length || x.workout) }
  if (!Object.keys(s.days).some((d) => d <= shiftDay(day, -7) && used(d))) return false
  for (let i = 1; i <= 7; i++) if (used(shiftDay(day, -i))) return true
  return false
}

/* ---------------- the review reminder (ml-d1, ml-d2) ---------------- */

/** Reminders stop after this many review days in a row pass unopened, and Tali asks once in the app (ml-d2, Benn 8 Oct). */
export const REMINDER_UNOPENED_STOP = 3
export const REMINDER_TEXT = { title: 'Your week is ready', body: 'Take a look whenever suits you.' } as const

/** Review days since the reminder went on (or was kept) that passed without the review being opened, before `today`. */
export function unopenedReviews(p: Pick<AppState['profile'], 'reviewDay' | 'reviewPushFrom' | 'lastReviewAt' | 'reviewPushSkip'>, today: string): number {
  const from = [p.reviewPushFrom, p.lastReviewAt].filter((x): x is string => !!x).sort().pop()
  if (!from) return 0
  let n = 0
  // a skipped week (no reminder went) never counts towards the pause (mental-performance, 8 Oct)
  for (let d = reviewDayOn(shiftDay(today, -1), p.reviewDay ?? 0); d > from; d = shiftDay(d, -7)) if (d !== p.reviewPushSkip) n++
  return n
}

/**
 * Whether the weekly reminder goes on `today` (the server runs the same rule on the synced
 * profile): only if switched on, on the review day, not once the review is open, not in a week
 * the phone marked to skip, and not after 3 unopened (then the app asks instead).
 */
export function reminderDue(p: AppState['profile'], today: string): boolean {
  if (!p.reviewPush) return false
  if (reviewDayOn(today, p.reviewDay ?? 0) !== today) return false
  if (p.lastReviewAt && p.lastReviewAt >= today) return false
  if (p.reviewPushSkip === today) return false
  return unopenedReviews(p, today) < REMINDER_UNOPENED_STOP
}

/**
 * "Keep the weekly reminder?", asked once (ml-d2): from the pause until the next review day passes.
 * Unanswered by then, the reminder goes off quietly and Tali never asks again (`reminderLapsed`).
 */
export const reminderAskDue = (p: AppState['profile'], today: string) => !!p.reviewPush && unopenedReviews(p, today) === REMINDER_UNOPENED_STOP
export const reminderLapsed = (p: AppState['profile'], today: string) => !!p.reviewPush && unopenedReviews(p, today) > REMINDER_UNOPENED_STOP

/** The next review day on or after `today`: a hard or care week before it skips that reminder. */
export const nextReviewDay = (today: string, weekday: number) => { const d = reviewDayOn(today, weekday); return d === today ? d : shiftDay(d, 7) }

/**
 * "Use this range" (ml-b4), for maintain only: the learned estimate becomes the target, never below
 * the calorie floor or 25% under the formula's maintenance; the person's own range width stays.
 */
export function learnedTarget(s: AppState, r: Extract<AdaptiveMaintenance, { kind: 'estimate' }>, kg: number, t: LoopThresholds = LOOP_THRESHOLDS): { target: AppState['target']; floored: boolean } | null {
  if (s.profile.goal !== 'maintain') return null
  const est = maintenanceEstimate(s.profile, null, kg)
  if (!est) return null
  const lowest = Math.max(ceil50(calorieFloor(est.bmr, sexOf(s.profile))), ceil50(est.maint * (1 - t.maxDeficitPct / 100)))
  const kcal = Math.max(r.maint, lowest)
  const d = kcal - s.target.kcal
  return { target: { ...s.target, kcal, c: Math.max(0, Math.round(s.target.c + d / 4)) }, floored: kcal > r.maint }
}
