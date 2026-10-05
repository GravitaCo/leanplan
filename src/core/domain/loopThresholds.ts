import type { TargetRate } from '@/core/types'

/**
 * Thresholds for the maintenance loop (docs/plans/maintenance-loop.md). Every number here is a
 * PLACEHOLDER until its owner signs it off: `nutrition-accuracy` owns the energy and weight
 * figures, `mental-performance` owns the mind thresholds, the pattern lines and whether a line
 * shows at all (Benn, 5 Oct 2026: "nothing is built against guessed thresholds").
 *
 * - `value: null` means not set. Whatever depends on it answers "awaiting a threshold" and does
 *   nothing, so an unset number can never reach a person.
 * - A value is only filled in where an earlier spec already gave one (`seed` names it). Those are
 *   still placeholders: the owner confirms or replaces them.
 * - Every loop function takes the thresholds as a parameter (default `LOOP_THRESHOLDS`) so tests
 *   can run the logic with explicit values without touching these.
 *
 * The fixed rules decided by Benn are not here, because they're not open: the weigh-in check waits
 * for 3 weeks and 6 weigh-ins and runs at most weekly; a drift counts after 2 weeks (see
 * `maintenanceLoop.ts`).
 */
export type ThresholdOwner = 'nutrition-accuracy' | 'mental-performance'

export interface Placeholder<T> {
  value: T | null
  owner: ThresholdOwner
  /** where a filled-in value came from; absent when the value is null */
  seed?: string
  /** what it controls */
  note: string
}

export interface LoopThresholds {
  /** intended weekly loss, % of body weight, by pace */
  lossRatePct: Placeholder<Record<TargetRate, number>>
  /** intended weekly gain for build-muscle, % of body weight, by pace */
  gainRatePct: Placeholder<Record<TargetRate, number>>
  /** how far from the intended rate still counts as on track, % of body weight a week */
  rateTolerancePct: Placeholder<number>
  /** one suggested change, % of maintenance */
  stepPctOfMaint: Placeholder<number>
  /** a suggested target is never more than this % below maintenance */
  maxDeficitPct: Placeholder<number>
  /** energy per kg of body-weight change, kcal */
  kcalPerKg: Placeholder<number>
  /** days of weigh-ins (and food logs) the trend is read over */
  trendWindowDays: Placeholder<number>
  /** fewest weigh-ins in a 7-day block for its average to count */
  minWeighInsPerWeek: Placeholder<number>
  /** a week-on-week change of the weekly average up to this many kg reads as "steady" */
  steadyWeeklyKg: Placeholder<number>
  /** fewest food-logged days in the window for an adaptive maintenance estimate */
  minLoggedDays: Placeholder<number>
  /** how much logging tends to miss, % of logged intake (widens the upper end of the estimate) */
  underLoggingPct: Placeholder<number>
  /** maintenance mode: the hold-steady band either side of the starting weight, % of it */
  maintenanceBandPct: Placeholder<number>
  /** a week counts as a strained one with at least this many low days (two or more low signals) */
  strainedLowDays: Placeholder<number>
  /** pattern lines: days of check-ins they're read over */
  patternWindowDays: Placeholder<number>
  /** pattern lines: fewest days in each group compared */
  patternMinDays: Placeholder<number>
  /** pattern lines: the smallest gap between the groups' averages, in steps of the 1–5 or 1–3 scale */
  patternMinDiff: Placeholder<number>
  /** pattern lines show at all */
  patternLinesOn: Placeholder<boolean>
}

export const LOOP_THRESHOLDS: LoopThresholds = {
  lossRatePct: { value: { steady: 0.5, standard: 0.75, aggressive: 1.0 }, owner: 'nutrition-accuracy', seed: 'personalized-nutrition-targets.md §3.2', note: 'intended weekly loss by pace' },
  gainRatePct: { value: null, owner: 'nutrition-accuracy', note: 'intended weekly gain by pace (the spec says "mirror" with no numbers)' },
  rateTolerancePct: { value: 0.2, owner: 'nutrition-accuracy', seed: 'personalized-nutrition-targets.md §3.4', note: 'on-track tolerance around the intended rate' },
  stepPctOfMaint: { value: 5, owner: 'nutrition-accuracy', seed: 'personalized-nutrition-targets.md §3.4', note: 'size of one suggested change' },
  maxDeficitPct: { value: 25, owner: 'nutrition-accuracy', seed: 'personalized-nutrition-targets.md §3.4', note: 'deepest suggested deficit' },
  kcalPerKg: { value: 7700, owner: 'nutrition-accuracy', seed: 'KCAL_PER_KG_LOST in nutrition.ts (an upper-bound rule of thumb)', note: 'energy per kg of weight change' },
  trendWindowDays: { value: 21, owner: 'nutrition-accuracy', seed: 'first-run-onboarding.md §5 (the 3-week minimum)', note: 'how many days the trend is read over' },
  minWeighInsPerWeek: { value: 2, owner: 'nutrition-accuracy', seed: 'personalized-nutrition-targets.md §3.3 (about 4 across two weeks)', note: 'weigh-ins a weekly average needs' },
  steadyWeeklyKg: { value: null, owner: 'nutrition-accuracy', note: 'week-on-week change that still reads as steady' },
  minLoggedDays: { value: null, owner: 'nutrition-accuracy', note: 'logged days an adaptive maintenance estimate needs' },
  underLoggingPct: { value: null, owner: 'nutrition-accuracy', note: 'typical under-logging, added to the top of the estimate' },
  maintenanceBandPct: { value: null, owner: 'nutrition-accuracy', note: 'hold-steady band width' },
  strainedLowDays: { value: null, owner: 'mental-performance', note: 'low days that make a week a strained one' },
  patternWindowDays: { value: null, owner: 'mental-performance', note: 'days a pattern line is read over' },
  patternMinDays: { value: null, owner: 'mental-performance', note: 'days per group before a pattern line can show' },
  patternMinDiff: { value: null, owner: 'mental-performance', note: 'smallest difference worth a pattern line' },
  patternLinesOn: { value: null, owner: 'mental-performance', note: 'whether pattern lines show at all' },
}

/** Every threshold with its owner, for the reviews: which are seeded from a spec, which are unset. */
export function placeholderList(t: LoopThresholds = LOOP_THRESHOLDS): { key: keyof LoopThresholds; owner: ThresholdOwner; set: boolean; seed?: string }[] {
  return (Object.keys(t) as (keyof LoopThresholds)[]).map((key) => ({ key, owner: t[key].owner, set: t[key].value !== null, ...(t[key].seed ? { seed: t[key].seed } : {}) }))
}
