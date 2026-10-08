import type { TargetRate } from '@/core/types'

/**
 * Thresholds for the maintenance loop (docs/plans/maintenance-loop.md), each with its owner and
 * source. `nutrition-accuracy` owns the energy and weight figures
 * (docs/research/maintenance-numbers-2026-10.md, its answers to Engineering II on 8 Oct 2026);
 * `mental-performance` owns the mind thresholds and the pattern lines
 * (docs/research/maintenance-psychology-2026-10.md and its 8 Oct answers). Labels: [E] evidence,
 * [I] inference, [G] judgement call.
 *
 * A `null` value means not set: whatever depends on it answers "awaiting a threshold" and does
 * nothing, so an unset number can never reach a person. Every loop function takes the thresholds
 * as a parameter (default `LOOP_THRESHOLDS`) so tests can run the logic with other values.
 */
export interface LoopThresholds {
  trend: {
    /** windows tried in turn until one holds `wordsMinWeighIns` (rule 1) */
    windowDays: number[]
    /** readings more than this % from the window median are dropped once (rule 1, untested [I]) */
    outlierPct: number
    /** plain least-squares SE times this: day-to-day noise is correlated, phi about 0.4 [I] */
    seInflation: number
    /** a level ("about 84 kg") after this many weigh-ins over this many days (rule 1) */
    levelMinWeighIns: number
    levelMinSpanDays: number
    /** trend words after this many weigh-ins over this many days, the first this many days back (rule 1; Benn 8 Oct "after 4 weeks") */
    wordsMinWeighIns: number
    wordsMinSpanDays: number
    wordsMinHistoryDays: number
    /** goals with no pace or range: "about level" up to this % of body weight a week [G] */
    levelPctWeek: number
    /** "a little" up or down within this % a week, "going up/down" beyond (mental-performance 8 Oct) */
    aLittlePctWeek: number
  }
  rate: {
    /** intended weekly loss for lose-fat, % of body weight, by pace (personalized-nutrition-targets §3.2) */
    lossPct: Record<TargetRate, number>
    /** build-muscle waits: intended gain rates are the size of the tolerance and unsourced (nutrition-accuracy 8 Oct) */
    gainPct: Record<TargetRate, number> | null
    /** off pace only beyond this % a week AND beyond 2 SE (rule "Problems" 1) */
    tolerancePct: number
    /** data the check needs, and the days after a target change it skips (14 + 28 = 42) */
    minDataDays: number
    skipAfterChangeDays: number
    /** at most one suggestion this often */
    everyDays: number
  }
  /** one suggested change, kcal a day, to both ends of the range (boards; under the 150 cap) */
  stepKcal: number
  /** maintain: any eat-less stays within this of estimated maintenance, so steps never stack (rule 5) */
  maintainMaxCutKcal: number
  /** a suggested target is never more than this % below maintenance */
  maxDeficitPct: number
  /** energy per kg for trend maths (rule 4) */
  kcalPerKg: number
  adaptive: {
    windowDays: number[]
    minDays: number
    /** qualifying days (2+ meal slots logged) */
    minLoggedDays: number
    minMeals: number
    minWeighIns: number
    /** skip this many days after maintain starts or any target change */
    skipAfterChangeDays: number
    /** ±z × SE, nearest 50, never narrower than ±minHalfKcal */
    z: number
    minHalfKcal: number
    /** shown only once the half-width is under this share of the starting estimate */
    startMarginPct: number
    /** withheld if mean intake in the two halves differs by more than this % (tapering) */
    taperPct: number
  }
  steady: {
    /** reference = mean of weigh-ins in the first `refDays` (at least `refMin`), else the first `refMin` within `refFallbackDays` */
    refDays: number
    refMin: number
    refFallbackDays: number
    /** ±% for the first `earlyDays` after the start (or a reset), then ±latePct (Stevens 2006 [G]) */
    earlyPct: number
    earlyDays: number
    latePct: number
    /** drift = outside at this many weekly checks in a row, each with `minWeighIns` */
    driftChecks: number
    minWeighIns: number
  }
  mind: {
    /** a check-in row needs this many answers */
    minAnswers: number
    /** a hard week: at least `hardCheckins` check-ins and any of these counts (mental-performance 8 Oct, pending clinical review) */
    hardCheckins: number
    hardPoorSleep: number
    hardHighStress: number
    hardLowDays: number
  }
  pattern: {
    /** read over this many days, split in two halves that must agree */
    windowDays: number
    minDays: number
    minHalfDays: number
    /** the difference must be beyond this many standard errors */
    minSE: number
    /** the same pair at most once in this many days */
    repeatDays: number
  }
}

export const LOOP_THRESHOLDS: LoopThresholds = {
  trend: {
    windowDays: [28, 42, 56], outlierPct: 3, seInflation: 1.5,
    levelMinWeighIns: 3, levelMinSpanDays: 7,
    wordsMinWeighIns: 6, wordsMinSpanDays: 21, wordsMinHistoryDays: 28,
    levelPctWeek: 0.25, aLittlePctWeek: 0.5,
  },
  rate: {
    lossPct: { steady: 0.5, standard: 0.75, aggressive: 1.0 },
    gainPct: null,
    tolerancePct: 0.35,
    minDataDays: 28, skipAfterChangeDays: 14, everyDays: 7,
  },
  stepKcal: 100,
  maintainMaxCutKcal: 150,
  maxDeficitPct: 25,
  kcalPerKg: 7000,
  adaptive: {
    windowDays: [28, 42, 56], minDays: 28, minLoggedDays: 20, minMeals: 2, minWeighIns: 6,
    skipAfterChangeDays: 14, z: 1.645, minHalfKcal: 150, startMarginPct: 15, taperPct: 15,
  },
  steady: {
    refDays: 14, refMin: 4, refFallbackDays: 28,
    earlyPct: 3, earlyDays: 42, latePct: 2,
    driftChecks: 2, minWeighIns: 6,
  },
  mind: { minAnswers: 3, hardCheckins: 3, hardPoorSleep: 3, hardHighStress: 3, hardLowDays: 2 },
  pattern: { windowDays: 42, minDays: 6, minHalfDays: 3, minSE: 2, repeatDays: 28 },
}
