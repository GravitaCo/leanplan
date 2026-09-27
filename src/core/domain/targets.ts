import type { DailyMovement, Goal, JobType, Profile, StepsBand } from '@/core/types'
import { MIFFLIN_SEX_HALF_GAP, energyTarget, mifflinBmr, nearestLevel, proteinMinimumG, type FloorApplied } from './nutrition'
export { HELD_AT_MAINTENANCE_NOTE, ABSOLUTE_FLOOR, SEX_FLOOR, KCAL_PER_KG_LOST, MAX_LOSS_PCT_PER_WEEK, NEAR_MAINTENANCE_PCT, PROTEIN_RNI_PER_KG, type FloorApplied } from './nutrition'
import { sexOf, type DefaultField, type HiddenReason, type SafetyRouting } from './onboarding'

/**
 * Starting nutrition targets for the onboarding summary (first-run-onboarding §5, engine in
 * personalized-nutrition-targets.md §2). The chain:
 *   Mifflin–St Jeor BMR × daily movement (no exercise in it) + planned training, averaged per day
 *   = likely maintenance, shown as a range (±15%, wider when sex isn't given)
 *   → the goal band (shared with `suggestedTargets`) → safety routing → ≤1% body weight a week
 *   → floors max(BMR, 1,500 men / 1,200 women and unspecified), never below 800
 *   → rounded to the nearest 50 kcal, checked against weigh-ins after 3–4 weeks.
 * No weight or height → no numbers at all (§2.1): without them there's no honest range.
 */

/**
 * Daily-movement multipliers (× BMR), for movement OUTSIDE training. Training is added from the
 * plan's sessions, so these stop at 1.55: daily life alone never reaches "very active".
 * Anchors: 1.2 is the Mifflin convention for "little or no exercise" and 1.375 / 1.55 are the
 * existing ACTIVITY light / moderate values; steps bands are Tudor-Locke & Bassett 2004
 * (doi:10.2165/00007256-200434010-00001). The in-between steps are a judgement mapping (about
 * +0.08 per 2,500 steps, in line with the IOM 2005 PAL walking equivalents), unvalidated and
 * flagged for nutrition-accuracy review. A skipped answer takes the lowest (§2.1: errs low).
 */
export const STEPS_MULT: Record<StepsBand, number> = {
  'under-5k': 1.2,
  '5k-7.5k': 1.3,
  '7.5k-10k': 1.375,
  '10k-12.5k': 1.45,
  'over-12.5k': 1.55,
}
/** Job type → the same scale: desk ≈ under 5k steps; manual work ≈ the top band. Judgement, as above. */
export const JOB_MULT: Record<JobType, number> = {
  desk: 1.2,
  standing: 1.3,
  'on-feet': 1.45,
  manual: 1.55,
}
export const LOWEST_MOVEMENT_MULT = 1.2

/**
 * Draft copy for the daily-movement screen (the approved option lists live on board ob1; UI build
 * to reconcile the wording). It must say "not counting workouts": training is added separately,
 * and steps that include workouts would count them twice.
 */
export const STEPS_QUESTION = 'On a typical day, about how many steps do you take, not counting workouts?'
export const JOB_QUESTION = 'Or, what is a typical working day like for you, not counting workouts?'

export function movementMultiplier(m: DailyMovement | undefined): number {
  if (!m) return LOWEST_MOVEMENT_MULT
  return (m.kind === 'steps' ? STEPS_MULT[m.band] : JOB_MULT[m.job]) ?? LOWEST_MOVEMENT_MULT
}

/** Planned training, from the engine's plan (or the Starter week). */
export interface TrainingLoad {
  daysPerWeek: number
  /** minutes a session */
  minutes: number
  /** average session MET; default 3.5 (strength, 2024 Compendium 02054, as in workout.ts) */
  met?: number
  /** endurance-focused training: turns on the energy-availability check */
  endurance?: boolean
}
export const STRENGTH_MET = 3.5
/** §2.1: no training details → 3 days full body, 30 minutes */
export const STARTER_WEEK_LOAD: TrainingLoad = { daysPerWeek: 3, minutes: 30 }

/** Net energy of one session: (MET − 1) × kg × hours; the resting 1 MET is already in BMR. */
export function sessionNetKcal(t: TrainingLoad, kg: number): number {
  return Math.max((t.met ?? STRENGTH_MET) - 1, 0) * kg * (Math.max(t.minutes, 0) / 60)
}

/** Planned training averaged over the week, kcal/day. */
export function trainingKcalPerDay(t: TrainingLoad | null | undefined, kg: number): number {
  if (!t || !(t.daysPerWeek > 0)) return 0
  return (sessionNetKcal(t, kg) * Math.min(t.daysPerWeek, 7)) / 7
}

/** The legacy activity level nearest an effective multiplier, for `profile.activityLevel` (display only). */
export const activityLevelFor = nearestLevel

/** ±15%: Mifflin is within ±10% for about 70–80% of adults and the multiplier adds the rest (§5). */
export const RANGE_MARGIN = 0.15
/**
 * Energy availability warning line, kcal per kg fat-free mass a day (§5; Loucks et al. 2011,
 * doi:10.1080/02640414.2011.588958). Fat-free mass uses the body-fat %, or the engine's 15%
 * fallback (which overstates it for most women, so it warns sooner: the safe side).
 */
export const EA_WARN = 30
export const REVIEW_AFTER = '3–4 weeks' as const

/**
 * Protein ranges, g/kg body weight. Training goals: the resistance-training meta-analysis range
 * 1.6–2.2 (Morton et al. 2018, doi:10.1136/bjsports-2017-097608). Endurance: 1.2–1.6, the lower
 * part of the ACSM/AND/DC 1.2–2.0 (Thomas et al. 2016, doi:10.1016/j.jand.2015.12.006).
 * Feel better: 1.0–1.2 (PROT-AGE, Bauer et al. 2013, doi:10.1016/j.jamda.2013.05.021). Each
 * contains the `PROTEIN_PER_KG` anchor. No high-protein anchor (medical flag): a minimum only,
 * `proteinMinimumG` (0.75 g/kg, 1.0 from 65).
 */
export const PROTEIN_RANGE_PER_KG: Record<Goal, { low: number; high: number }> = {
  'lose-fat': { low: 1.6, high: 2.2 },
  'build-muscle': { low: 1.6, high: 2.2 },
  'increase-strength': { low: 1.6, high: 2.2 },
  'increase-endurance': { low: 1.2, high: 1.6 },
  'feel-better': { low: 1.0, high: 1.2 },
}


export interface StartingTargets {
  /** why no numbers are shown, or null; when set, every number below is null */
  hidden: HiddenReason | null
  /** the starting target, nearest 50 kcal */
  kcal: number | null
  /** likely maintenance, nearest 10 kcal */
  maintenance: { low: number; high: number } | null
  /**
   * grams a day, nearest 5 g. `anchor` false (medical flag): `high` is null and `low` is a
   * minimum, shown as "at least {low} g"
   */
  protein: { low: number; high: number | null; anchor: boolean } | null
  /** signed % actually applied to maintenance, after routing, caps and floors */
  adjustPct: number | null
  /** what capped the target; empty when nothing did */
  floorsApplied: FloorApplied[]
  /** a safety clamp held a deficit goal at maintenance: show HELD_AT_MAINTENANCE_NOTE (never with a floor) */
  heldAtMaintenance: boolean
  /** under ~30 kcal/kg fat-free mass on a training day, for endurance */
  lowEnergyAvailability: boolean
  /** maintenance ÷ BMR, unrounded: store it as `profile.activityMult` (and `activityLevelFor` it for display) */
  effectiveMultiplier: number | null
  /** skipped fields that fell back to a default, for "You haven't told us…" */
  defaults: DefaultField[]
  reviewAfter: typeof REVIEW_AFTER
}

export interface MaintenanceEstimate { bmr: number; maint: number; mult: number }

/**
 * BMR and likely maintenance (unrounded), or null without age, height and weight. A stored
 * `activityMult` wins (training is already in it, so `training` is ignored); clear it before
 * re-running onboarding so new answers are used.
 */
export function maintenanceEstimate(p: Profile, training: TrainingLoad | null | undefined, kg: number | null | undefined): MaintenanceEstimate | null {
  if (!p.age || !p.height || !kg) return null
  const bmr = mifflinBmr(kg, p.height, p.age, sexOf(p))
  const maint = p.activityMult ? bmr * p.activityMult : bmr * movementMultiplier(p.movement) + trainingKcalPerDay(training, kg)
  return { bmr, maint, mult: maint / bmr }
}

const r10 = (x: number) => Math.round(x / 10) * 10
const r5 = (x: number) => Math.round(x / 5) * 5

export interface StartingOptions {
  /** the person changed the pre-selected maintenance start (wellbeing undisclosed) to their goal; defaults to `profile.deficitChosen` */
  acceptDeficit?: boolean
}

/**
 * The summary's numbers. `kg` defaults to the profile weight; pass the current weight
 * (`latestWeight`) when there is one. `training` is the plan's load (null = none planned).
 */
export function startingTargets(
  p: Profile,
  training: TrainingLoad | null | undefined,
  routing: SafetyRouting,
  kg: number | null | undefined = p.weight,
  opts: StartingOptions = {},
): StartingTargets {
  const sex = sexOf(p)
  const defaults: DefaultField[] = [...routing.defaults]
  if (p.sexAnswer === 'unspecified') defaults.push('sex')
  if (!p.movement) defaults.push('movement')
  if (!kg) defaults.push('weight')
  if (!p.height) defaults.push('height')
  const none = (hidden: HiddenReason): StartingTargets => ({
    hidden, kcal: null, maintenance: null, protein: null, adjustPct: null, floorsApplied: [], heldAtMaintenance: false,
    lowEnergyAvailability: false, effectiveMultiplier: null, defaults, reviewAfter: REVIEW_AFTER,
  })
  if (routing.stop) return none('under16')
  if (routing.hideCalories) return none(routing.hiddenReason ?? 'gentle')
  if (!kg) return none('no-weight')
  if (!p.height) return none('no-height')
  const est = maintenanceEstimate(p, training, kg)
  if (!est) return none('no-age')
  const { bmr, maint, mult } = est

  // the one kcal pipeline, shared with suggestedTargets: band, routing, 1%/week cap, floors, 50s
  const goal = p.goal
  const e = energyTarget(bmr, maint, kg, sex, p, routing, opts.acceptDeficit ?? !!p.deficitChosen)
  const shown = e.kcal

  // "Prefer not to say": the sex constant's ±83 kcal carries through the whole multiplier
  const margin = RANGE_MARGIN * maint + (sex === 'unspecified' ? MIFFLIN_SEX_HALF_GAP * mult : 0)

  const band = PROTEIN_RANGE_PER_KG[goal ?? 'feel-better']
  const protein = routing.noProteinAnchor
    ? { low: proteinMinimumG(kg, p.age), high: null, anchor: false }
    : { low: r5(kg * band.low), high: r5(kg * band.high), anchor: true }

  let lowEA = false
  if (training && training.daysPerWeek > 0 && (goal === 'increase-endurance' || training.endurance)) {
    const ffm = kg * (1 - (p.bodyFat ?? 15) / 100)
    lowEA = (shown - sessionNetKcal(training, kg)) / ffm < EA_WARN
  }

  return {
    hidden: null,
    kcal: shown,
    maintenance: { low: r10(maint - margin), high: r10(maint + margin) },
    protein,
    adjustPct: e.adjustPct,
    floorsApplied: e.floorsApplied,
    heldAtMaintenance: e.heldAtMaintenance && !e.floorsApplied.some((x) => x !== 'weekly-loss-cap'),
    lowEnergyAvailability: lowEA,
    effectiveMultiplier: mult,
    defaults,
    reviewAfter: REVIEW_AFTER,
  }
}
