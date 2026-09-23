import type { DayLog, Food, FoodUnit, Recipe, Profile, ActivityLevel, Goal, TargetRate } from '@/core/types'
import { ACTIVITY } from '@/core/data/constants'

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
  if (unit !== 'item') return `${Math.round(amount * 10) / 10} ${unit}`
  const w = Math.floor(amount), r = amount - w
  const f = r >= 0.74 ? '¾' : r >= 0.49 ? '½' : r >= 0.24 ? '¼' : ''
  return `${(w || !f ? String(w) : '') + f} item${amount > 1 ? 's' : ''}`
}

/** Round an amount to what its unit can sensibly hold: 0.1 g/ml (chains publish portions
 *  like 119.5 g, and rounding those to whole grams shifts calories), quarter items. */
export function roundAmount(amount: number, unit: FoodUnit): number {
  return unit === 'item' ? Math.round(amount * 4) / 4 : Math.round(amount * 10) / 10
}

/** Scale a food to an amount in its unit (grams, ml or items), producing an absolute macro entry. */
export function scaleFood(f: Food, amount: number): MacroTotals & { g: number } {
  const m = amount / basisOf(f)
  return { g: amount, k: f.k * m, p: f.p * m, c: f.c * m, f: f.f * m }
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
  /** true when the safe-minimum floor (max of BMR and 1200 kcal) capped the target */
  floored: boolean
  /** true when body-fat % was absent and the 15% fallback was assumed */
  bodyFatAssumed: boolean
}

/**
 * Metrics are complete but no goal is set. The engine refuses to pick a direction on the
 * user's behalf — silently prescribing a deficit is the one thing it must never do.
 */
export interface GoalNeeded {
  goalNeeded: true
  maint: number
}

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
function goalAdjustPct(goal: Goal, bf: number, activity: ActivityLevel, rate: TargetRate): number {
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
  }
}

/** Protein anchor in g/kg bodyweight — highest in a deficit, to preserve lean mass. */
const PROTEIN_PER_KG: Record<Goal, number> = {
  'lose-fat': 2.0,
  'build-muscle': 1.8,
  'increase-strength': 1.8,
  'increase-endurance': 1.6,
}

/**
 * Goal-aware suggested daily target.
 *
 * The chain: Mifflin–St Jeor BMR × activity = maintenance → goal picks direction + band →
 * body fat / activity / pace pick the exact % within the band → safety floors →
 * protein-first macro split. Every input traces to a captured profile answer; when `goal`
 * is unset the engine returns `GoalNeeded` rather than assuming fat loss.
 */
export function suggestedTargets(profile: Profile, weight: number | null): SuggestedTargets | GoalNeeded | null {
  if (!profile.age || !profile.height || !weight) return null

  // Step 1 — TDEE: Mifflin–St Jeor BMR × activity multiplier (unchanged basis).
  const bmr =
    profile.sex === 'F'
      ? 10 * weight + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * weight + 6.25 * profile.height - 5 * profile.age + 5
  const activity: ActivityLevel = ACTIVITY[profile.activityLevel as ActivityLevel] ? profile.activityLevel : 'light'
  const maint = Math.round(bmr * ACTIVITY[activity].mult)

  // Step 2 — goal decides direction. No goal → no direction; never deficit-by-assumption.
  if (!profile.goal) return { goalNeeded: true, maint }

  // Step 3 — exact % within the band. Body-fat % absent → assume 15%: a moderate,
  // non-lean value that lands mid-band — conservative enough not to over-cut a lean
  // user who skipped the question, useful for an average one.
  const bodyFatAssumed = profile.bodyFat == null
  const bf = profile.bodyFat ?? 15
  const rate: TargetRate = profile.targetRate ?? 'standard'
  let adjustPct = goalAdjustPct(profile.goal, bf, activity, rate)
  let kcal = Math.round(maint * (1 + adjustPct / 100))

  // Step 4 — safety floors: never below resting metabolic rate (a target under BMR is
  // unsafe and unsustainable), with a hard 1200 kcal backstop for very small users.
  const floor = Math.round(Math.max(bmr, 1200))
  const floored = kcal < floor
  if (floored) {
    kcal = floor
    // Report the adjustment actually applied, not the one the band asked for — the UI
    // shows this % next to the kcal, and the two must agree.
    adjustPct = (kcal / maint - 1) * 100
  }

  // Step 5 — macros, protein first (the evidence-based lever, anchored to bodyweight),
  // fat as an essential/hormonal floor, carbs fill the remainder to fuel training.
  const f = Math.round(Math.max(0.8 * weight, (kcal * 0.25) / 9))
  let p = Math.round(weight * PROTEIN_PER_KG[profile.goal])
  // Reconciliation: for very heavy users on a low calorie target, bodyweight-anchored
  // protein plus the fat floor can exceed the whole budget on their own — an impossible
  // prescription that a carbs-≥-0 clamp would only mask. Keep the fat floor (it is the
  // essential/hormonal health minimum) and scale protein down to what the budget allows;
  // protein is prescribed generously, so it is the anchor with headroom to give.
  if (p * 4 + f * 9 > kcal) p = Math.max(0, Math.floor((kcal - f * 9) / 4))
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4))

  return { maint, kcal, p, c, f, goal: profile.goal, adjustPct: Math.round(adjustPct), floored, bodyFatAssumed }
}

export function macroPct(value: number, goal: number): number {
  return Math.min(100, goal ? (value / goal) * 100 : 0)
}
