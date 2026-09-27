import type { DayLog, Food, FoodUnit, Recipe, Profile, ActivityLevel, Goal, TargetRate, SexAnswer } from '@/core/types'
import { ACTIVITY } from '@/core/data/constants'
import { sexOf, type HiddenReason, type SafetyRouting } from './onboarding'

export interface MacroTotals {
  k: number
  p: number
  c: number
  f: number
}

export function dayTotals(day: DayLog | undefined): MacroTotals {
  const t: MacroTotals = { k: 0, p: 0, c: 0, f: 0 }
  if (!day) return t
  for (const x of day.foods) {
    t.k += x.k
    t.p += x.p
    t.c += x.c
    t.f += x.f
  }
  return t
}

/** The unit a food is logged in: items for per-item foods, millilitres for liquids, else grams. */
export function unitOf(f: Pick<Food, 'ml' | 'each'>): FoodUnit {
  return f.each ? 'item' : f.ml ? 'ml' : 'g'
}

/** How many units the stored values are for: 1 item, or 100 g/ml. */
export function basisOf(f: Pick<Food, 'each'>): number {
  return f.each ? 1 : 100
}

/** "per item", "per 100 g", "per 100 ml". */
export function perText(f: Pick<Food, 'ml' | 'each'>): string {
  return f.each ? 'per item' : `per 100 ${f.ml ? 'ml' : 'g'}`
}

/** An amount in the food's unit: "150 g", "250 ml", "1 item", "½ item". */
export function amountText(amount: number, unit: FoodUnit): string {
  if (unit !== 'item') return `${Math.round(amount * 100) / 100} ${unit}`
  const w = Math.floor(amount), r = amount - w
  const f = r >= 0.74 ? '¾' : r >= 0.49 ? '½' : r >= 0.24 ? '¼' : ''
  return `${(w || !f ? String(w) : '') + f} item${amount > 1 ? 's' : ''}`
}

/** Tidy an amount without losing real precision: chains publish portions like 206.76 g, and
 *  rounding those (to 207 g, or even 206.8 g) shifts the calories users compare against. So
 *  g/ml only drop float noise (3 decimals); screens round for display. Items go to quarters. */
export function roundAmount(amount: number, unit: FoodUnit): number {
  return unit === 'item' ? Math.round(amount * 4) / 4 : Math.round(amount * 1000) / 1000
}

/**
 * What to show for a food: the source's own published line when it's per portion or per item
 * (what users compare against, e.g. Greggs' spreadsheet), otherwise the stored per-100 values.
 */
export function headline(f: Food): MacroTotals & { per: string } {
  const r = f.ref
  if (r && r.g !== basisOf(f)) {
    const s = scaleFood(f, r.g)
    return { k: r.k, p: r.p ?? s.p, c: r.c ?? s.c, f: r.f ?? s.f, per: f.each ? 'per item' : `per portion (${amountText(r.g, unitOf(f))})` }
  }
  return { k: f.k, p: f.p, c: f.c, f: f.f, per: perText(f) }
}

/** The stored per-100 (or per-item) values scaled to an amount, ignoring any published figure. */
export function scaleStored(f: Food, amount: number): MacroTotals & { g: number } {
  const m = amount / basisOf(f)
  return { g: amount, k: f.k * m, p: f.p * m, c: f.c * m, f: f.f * m }
}

/**
 * Scale a food to an amount in its unit (grams, ml or items), producing an absolute macro entry.
 * Exactly the published amount (`ref`: a chain's portion, a pack's per-serving line) gives the
 * published figures themselves, so one serving shows what the source prints.
 */
export function scaleFood(f: Food, amount: number): MacroTotals & { g: number } {
  const s = scaleStored(f, amount)
  const r = f.ref
  if (!r || r.g === basisOf(f) || Math.abs(amount - r.g) > 0.0005) return s
  return { g: amount, k: r.k, p: r.p ?? s.p, c: r.c ?? s.c, f: r.f ?? s.f }
}

export function recipeTotals(r: Recipe): MacroTotals & { g: number } {
  const t = { k: 0, p: 0, c: 0, f: 0, g: 0 }
  for (const i of r.items || []) {
    const m = (i.grams || 0) / basisOf(i)
    t.k += (i.k || 0) * m
    t.p += (i.p || 0) * m
    t.c += (i.c || 0) * m
    t.f += (i.f || 0) * m
    if (!i.each) t.g += i.grams || 0
  }
  return t
}

export function recipePerServing(r: Recipe): MacroTotals & { g: number } {
  const t = recipeTotals(r)
  const s = +r.servings || 1
  return { k: t.k / s, p: t.p / s, c: t.c / s, f: t.f / s, g: t.g / s }
}

export interface SuggestedTargets {
  maint: number
  kcal: number
  p: number
  c: number
  f: number
  /** the goal this suggestion was computed for */
  goal: Goal
  /** signed % applied to maintenance: negative = deficit, positive = surplus, 0 = maintenance */
  adjustPct: number
  /** true when the safe-minimum floor (max of BMR, 1,500 men / 1,200 women and unspecified, 800) capped the target */
  floored: boolean
  /** true when body-fat % was absent and the 15% fallback was assumed */
  bodyFatAssumed: boolean
  /** what capped the target, as in startingTargets */
  floorsApplied: FloorApplied[]
  /** protein is a minimum (the medical flag's reference intake), not a goal anchor */
  proteinMinimum: boolean
  /** a safety clamp turned the goal's deficit into maintenance (show HELD_AT_MAINTENANCE_NOTE) */
  heldAtMaintenance: boolean
}

/** Safety routing hides calorie numbers (gentle mode, pregnancy, no consent…): show none. */
export interface TargetsHidden {
  hidden: HiddenReason
}

/**
 * Metrics are complete but no goal is set. The engine refuses to pick a direction on the
 * user's behalf — silently prescribing a deficit is the one thing it must never do.
 */
export interface GoalNeeded {
  goalNeeded: true
  maint: number
}

/**
 * Mifflin–St Jeor sex constants (Mifflin et al. 1990, doi:10.1093/ajcn/51.2.241): +5 men, −161
 * women. "Prefer not to say" takes the midpoint, −78, with a wider range around it
 * (first-run-onboarding §5); half the gap between the two, 83 kcal, is the extra uncertainty.
 */
export const MIFFLIN_SEX_CONSTANT: Record<SexAnswer, number> = { male: 5, female: -161, unspecified: -78 }
export const MIFFLIN_SEX_HALF_GAP = (MIFFLIN_SEX_CONSTANT.male - MIFFLIN_SEX_CONSTANT.female) / 2

/** Resting energy (kcal/day), Mifflin–St Jeor: 10·kg + 6.25·cm − 5·age + sex constant. */
export function mifflinBmr(kg: number, cm: number, age: number, sex: SexAnswer): number {
  return 10 * kg + 6.25 * cm - 5 * age + MIFFLIN_SEX_CONSTANT[sex]
}

/**
 * §9 floors (first-run-onboarding): 1,500 men, 1,200 women and "Prefer not to say". The lower
 * floor goes to 'unspecified' because a floor is a minimum: using 1,500 for someone who may be a
 * smaller woman would push the target up by assumption, while 1,200 is still a safe minimum for a
 * man, and the BMR floor (on the midpoint constant) still applies on top.
 */
export const SEX_FLOOR: Record<SexAnswer, number> = { male: 1500, female: 1200, unspecified: 1200 }
export const ABSOLUTE_FLOOR = 800

/** The lowest target Tali suggests: max(BMR, the sex floor), never below 800. Shared by both engines. */
export function calorieFloor(bmr: number, sex: SexAnswer): number {
  return Math.max(ABSOLUTE_FLOOR, bmr, SEX_FLOOR[sex])
}

/** weight loss at most 1% of body weight a week (first-run-onboarding §5) */
export const MAX_LOSS_PCT_PER_WEEK = 1
/** the usual ~7,700 kcal per kg of body weight lost (≈3,500 kcal/lb); an upper-bound rule of thumb */
export const KCAL_PER_KG_LOST = 7700
/** poor sleep or stress: no deeper than the shallowest lose-fat band, −10% (§4, §2.1) */
export const NEAR_MAINTENANCE_PCT = -10

export type FloorApplied = 'bmr' | 'sex-minimum' | 'absolute' | 'weekly-loss-cap'

/** The routing clamps the energy pipeline applies (a SafetyRouting has them all). */
export type EnergyClamps = Pick<SafetyRouting, 'maintenanceOnly' | 'noDeficit' | 'startAtMaintenance' | 'nearMaintenance'>
export const NO_CLAMPS: EnergyClamps = { maintenanceOnly: false, noDeficit: false, startAtMaintenance: false, nearMaintenance: false }

export interface EnergyTarget {
  /** nearest 50 kcal, never across a floor or the weekly cap */
  kcal: number
  /** signed % applied, from the unrounded target */
  adjustPct: number
  floorsApplied: FloorApplied[]
  /** the goal asked for a deficit and a routing clamp (16–17, BMI gate, medical, wellbeing…) held it at maintenance */
  heldAtMaintenance: boolean
}

/**
 * Benn's approved line under the number when `heldAtMaintenance` (not shown when the floor note
 * is). It never says why: age, BMI and screener answers are never shown back.
 */
export const HELD_AT_MAINTENANCE_NOTE = 'Tali keeps this at maintenance for now, to keep things safe.'

const r50 = (x: number) => Math.round(x / 50) * 50
const ceil50 = (x: number) => Math.ceil(x / 50) * 50

/**
 * The one kcal pipeline, shared by the Profile suggestion and the onboarding summary so they
 * can never disagree: goal band -> routing (safer, never deeper) -> at most 1% body weight a week
 * -> floors max(BMR, sex floor, 800) -> nearest 50.
 * `acceptDeficit`: the person chose their goal's deficit over the pre-selected maintenance start.
 */
export function energyTarget(
  bmr: number, maint: number, kg: number, sex: SexAnswer,
  p: Pick<Profile, 'goal' | 'bodyFat' | 'targetRate' | 'deficitChosen'>,
  clamps: EnergyClamps = NO_CLAMPS, acceptDeficit = !!p.deficitChosen,
): EnergyTarget {
  const band = p.goal ? goalAdjustPct(p.goal, p.bodyFat ?? 15, nearestLevel(maint / bmr), p.targetRate ?? 'standard') : 0
  let pct = band
  if (clamps.maintenanceOnly) pct = 0
  if (clamps.noDeficit || (clamps.startAtMaintenance && !acceptDeficit)) pct = Math.max(0, pct)
  if (clamps.nearMaintenance) pct = Math.max(NEAR_MAINTENANCE_PCT, pct)
  const asked = pct

  const floorsApplied: FloorApplied[] = []
  let kcal = maint * (1 + pct / 100)
  const maxDeficit = (kg * (MAX_LOSS_PCT_PER_WEEK / 100) * KCAL_PER_KG_LOST) / 7
  const capped = maint - kcal > maxDeficit
  if (capped) { kcal = maint - maxDeficit; floorsApplied.push('weekly-loss-cap') }
  const floor = calorieFloor(bmr, sex)
  if (kcal < floor) {
    kcal = floor
    floorsApplied.push(floor === bmr ? 'bmr' : floor === ABSOLUTE_FLOOR ? 'absolute' : 'sex-minimum')
  }
  // round, but never let rounding cross a floor or the weekly cap
  let shown = r50(kcal)
  if (shown < floor) shown = ceil50(floor)
  if (capped && maint - shown > maxDeficit) shown = ceil50(maint - maxDeficit)
  // adjustPct from the unrounded target, so maintenance rounded to 50 doesn't read as a 1% deficit
  return { kcal: shown, adjustPct: Math.round((kcal / maint - 1) * 100) || 0, floorsApplied, heldAtMaintenance: band < 0 && asked >= 0 }
}

/** The legacy activity level nearest a multiplier (maintenance / BMR). */
export function nearestLevel(mult: number): ActivityLevel {
  let best: ActivityLevel = 'sedentary'
  for (const k of Object.keys(ACTIVITY) as ActivityLevel[]) {
    if (Math.abs(ACTIVITY[k].mult - mult) < Math.abs(ACTIVITY[best].mult - mult)) best = k
  }
  return best
}

/**
 * Protein minimum when the high-protein anchor is off (medical flag), g/kg: the UK reference
 * nutrient intake, 0.75 (COMA, DH 1991); from 65, 1.0 (PROT-AGE, Bauer et al. 2013,
 * doi:10.1016/j.jamda.2013.05.021). Shown as "at least", never as a target to hit.
 */
export const PROTEIN_RNI_PER_KG = 0.75
export const PROTEIN_MIN_65_PER_KG = 1.0
export const proteinMinimumPerKg = (age: number | null): number => (age != null && age >= 65 ? PROTEIN_MIN_65_PER_KG : PROTEIN_RNI_PER_KG)
/** grams, rounded up to 5 so it stays a minimum */
export const proteinMinimumG = (kg: number, age: number | null): number => Math.ceil((kg * proteinMinimumPerKg(age)) / 5) * 5

/** Interpolate x from [x0,x1] onto [y0,y1], clamped to the segment ends. */
function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)))
  return y0 + t * (y1 - y0)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

/**
 * Signed % adjustment to maintenance, chosen inside the goal's evidence band by
 * body-fat %, activity level and desired pace.
 *
 * Why a percentage of TDEE rather than a fixed 500 kcal: a percentage scales with the
 * person — it protects small or lean users from an over-deep cut while still moving
 * larger users at a useful pace, aiming at the safe 0.5–1% of bodyweight per week range.
 */
export function goalAdjustPct(goal: Goal, bf: number, activity: ActivityLevel, rate: TargetRate): number {
  switch (goal) {
    case 'lose-fat': {
      // Deficit band −10…−25% of maintenance. Higher body fat → a deeper cut is well
      // tolerated (more reserve to draw on, less muscle-loss risk); leaner → conservative
      // to spare lean mass. More activity → slightly deeper allowed (bigger absolute burn).
      const base =
        bf <= 12 ? 10
        : bf <= 20 ? lerp(bf, 12, 20, 12, 16)
        : bf <= 28 ? lerp(bf, 20, 28, 16, 20)
        : lerp(bf, 28, 36, 20, 25)
      const bump: Record<ActivityLevel, number> = { sedentary: -1, light: 0, moderate: 1, active: 2 }
      const shift: Record<TargetRate, number> = { steady: -3, standard: 0, aggressive: 4 }
      return -clamp(base + bump[activity] + shift[rate], 10, 25)
    }
    case 'build-muscle': {
      // Lean surplus +5…+10%: enough energy to build muscle; bigger surpluses mostly add
      // fat. Leaner users skew to the top of the band, higher body-fat users to the bottom.
      const base = lerp(bf, 12, 28, 10, 5)
      const bump: Record<ActivityLevel, number> = { sedentary: -1, light: 0, moderate: 0, active: 1 }
      const shift: Record<TargetRate, number> = { steady: -2, standard: 0, aggressive: 2 }
      return clamp(base + bump[activity] + shift[rate], 5, 10)
    }
    case 'increase-strength': {
      // Strength is largely neural + skill work — it does not require a surplus. Hold
      // ~maintenance (−5…+5%): lean users sit slightly over (size support), higher
      // body-fat users slightly under.
      const base = lerp(bf, 12, 28, 3, -3)
      const shift: Record<TargetRate, number> = { steady: -2, standard: 0, aggressive: 2 }
      return clamp(base + shift[rate], -5, 5)
    }
    case 'increase-endurance': {
      // Endurance work has a high energy turnover — fuelling the training matters more
      // than cutting. Hold maintenance by default; allow a small deficit (−10…0%) only
      // as body fat rises. Never a surplus by default.
      const base = lerp(bf, 15, 30, 0, -8)
      const bump: Record<ActivityLevel, number> = { sedentary: -2, light: -1, moderate: 0, active: 1 }
      const shift: Record<TargetRate, number> = { steady: 2, standard: 0, aggressive: -3 }
      return clamp(base + bump[activity] + shift[rate], -10, 0)
    }
    case 'feel-better':
      // "Feel better and move more" (workout plan D6): no body-change aim, so energy stays at
      // maintenance whatever the pace setting.
      return 0
  }
}

/**
 * Protein anchor in g/kg bodyweight — highest in a deficit, to preserve lean mass.
 * Sources (checked by nutrition-accuracy, September 2026): the training goals sit inside the ISSN
 * range for exercising people, 1.4–2.0 (Jäger et al. 2017, doi:10.1186/s12970-017-0177-8), and
 * the resistance-training meta-analysis range 1.6–2.2 (Morton et al. 2018,
 * doi:10.1136/bjsports-2017-097608). 'feel-better' has no hypertrophy or deficit aim, so it takes
 * the floor of the 1.2–2.0 range the ACSM/AND/DC 2016 position gives for athletes (Thomas et al.,
 * doi:10.1016/j.jand.2015.12.006), which also meets the 1.0–1.2 advised for older adults (PROT-AGE,
 * Bauer et al. 2013, doi:10.1016/j.jamda.2013.05.021).
 */
export const PROTEIN_PER_KG: Record<Goal, number> = {
  'lose-fat': 2.0,
  'build-muscle': 1.8,
  'increase-strength': 1.8,
  'increase-endurance': 1.6,
  'feel-better': 1.2,
}

/**
 * Goal-aware suggested daily target (the Profile screen).
 *
 * The chain: Mifflin-St Jeor BMR x multiplier = maintenance -> `energyTarget` (goal band, safety
 * routing, 1%/week cap, floors, nearest 50: the same pipeline as the onboarding summary) ->
 * protein-first macro split. The multiplier is the one stored at onboarding (`activityMult`,
 * daily movement plus training) when there is one, else the activity level's. When `goal` is
 * unset the engine returns `GoalNeeded` rather than assuming fat loss; when routing hides
 * calories it returns `TargetsHidden`. Pass `profileRouting(...)` as `routing`.
 */
export function suggestedTargets(profile: Profile, weight: number | null, routing?: SafetyRouting): SuggestedTargets | GoalNeeded | TargetsHidden | null {
  if (!profile.age || !profile.height || !weight) return null
  if (routing?.stop) return { hidden: 'under16' }
  if (routing?.hideCalories) return { hidden: routing.hiddenReason ?? 'gentle' }

  // Step 1 - maintenance. Identical BMR to before for 'M' / 'F' profiles; an onboarding
  // "Prefer not to say" takes the midpoint.
  const sex = sexOf(profile)
  const bmr = mifflinBmr(weight, profile.height, profile.age, sex)
  const activity: ActivityLevel = ACTIVITY[profile.activityLevel as ActivityLevel] ? profile.activityLevel : 'light'
  const maintRaw = bmr * (profile.activityMult ?? ACTIVITY[activity].mult)
  // never 1-kcal precision (first-run-onboarding §5)
  const maint = Math.round(maintRaw / 10) * 10

  // Step 2 - goal decides direction. No goal -> no direction; never deficit-by-assumption.
  if (!profile.goal) return { goalNeeded: true, maint }

  // Steps 3-4 - band, routing, cap and floors, shared with startingTargets. Body-fat % absent ->
  // 15%: a moderate, non-lean value that lands mid-band.
  const bodyFatAssumed = profile.bodyFat == null
  const e = energyTarget(bmr, maintRaw, weight, sex, profile, routing ?? NO_CLAMPS)
  const kcal = e.kcal

  // Step 5 - macros, protein first (the evidence-based lever, anchored to bodyweight),
  // fat as an essential/hormonal floor, carbs fill the remainder to fuel training.
  // Feel-better has no training target to fuel and lower protein, so a 25% fat share would leave
  // carbs above the 45-60% range (EFSA 2010); it takes the UK Reference Intake share instead (70 g
  // fat per 2000 kcal, 31.5%; Regulation (EU) 1169/2011 Annex XIII, assimilated law in GB). Where
  // the 0.8 g/kg floor binds (heavier, shorter people), fat is higher and carbs can fall below 45%.
  const fatShare = profile.goal === 'feel-better' ? (70 * 9) / 2000 : 0.25
  const f = Math.round(Math.max(0.8 * weight, (kcal * fatShare) / 9))
  // the medical flag turns the high-protein anchor off: protein is the minimum instead
  const proteinMinimum = !!routing?.noProteinAnchor
  let p = proteinMinimum ? proteinMinimumG(weight, profile.age) : Math.round(weight * PROTEIN_PER_KG[profile.goal])
  // Reconciliation: for very heavy users on a low calorie target, bodyweight-anchored
  // protein plus the fat floor can exceed the whole budget on their own - an impossible
  // prescription that a carbs->=0 clamp would only mask. Keep the fat floor (it is the
  // essential/hormonal health minimum) and scale protein down to what the budget allows;
  // protein is prescribed generously, so it is the anchor with headroom to give.
  if (p * 4 + f * 9 > kcal) p = Math.max(0, Math.floor((kcal - f * 9) / 4))
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4))

  const floored = e.floorsApplied.some((x) => x !== 'weekly-loss-cap')
  return { maint, kcal, p, c, f, goal: profile.goal, adjustPct: e.adjustPct, floored, bodyFatAssumed, floorsApplied: e.floorsApplied, proteinMinimum, heldAtMaintenance: e.heldAtMaintenance && !floored }
}
