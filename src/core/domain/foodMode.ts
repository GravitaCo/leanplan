import type { DayLog, FoodOptIn, LoggedFood, MealSlot, Profile, SexAnswer } from '@/core/types'
import { shiftDay } from './date'
import { calorieFloor, proteinMinimumG } from './nutrition'
import { PROTEIN_RANGE_PER_KG, RANGE_MARGIN } from './targets'
import { setHealthAnswerIn } from './onboarding'

/**
 * Onboarding 9, "Food: less emphasis to start, never hidden" (boards ob9-1 to ob9-5, note s-ob9).
 * The food rules that follow the wellbeing answer. Logging always works in full in every mode;
 * what changes is what Tali shows back. Pure: no React, no clock (dates are passed in).
 *
 * - Sometimes: a maintenance range only, never a single number (±15% around the best estimate,
 *   to the nearest 50). Never a deficit, whatever the goal (the goal applies to training): not in
 *   the first 90 days, and not after them either unless the person clears the answer in Profile
 *   (routeSafety's maintenanceOnly and noDeficit clamps, applied in energyTarget).
 *   No weight trend (weigh-ins still work). Protein as a range. For 14 days Today shows words and
 *   the range is on Food; then one in-app ask (never a push) whether to show it on Today too.
 * - Yes: no calorie or protein target, no weight trend and no deficit, ever. Totals in words. At
 *   the week-4 look-back, one ask whether a calorie range would help; "Not now" rests it for 12
 *   weeks, "Show a range" puts a maintenance range on Food (never on Today, never a deficit).
 * - Both: nothing unlocks because time passes; each step up is the person's own yes, and one tap
 *   in Profile undoes it. A restriction signal moves the person to the Yes rules (the hook below).
 * The 14-day, week-4 and 90-day timings are judgement calls, to review with the first users (s-ob9).
 */

export type FoodMode = 'standard' | 'sometimes' | 'yes'

/** The mode from the stored wellbeing outcome ('flagged' is the stored Yes). */
export function foodModeOf(p: Pick<Profile, 'outcomes'>): FoodMode {
  const w = p.outcomes?.wellbeing
  return w === 'flagged' ? 'yes' : w === 'sometimes' ? 'sometimes' : 'standard'
}

/** Sometimes: no deficit in the first 90 days after onboarding (s-ob9), and none after unless cleared. */
export const SOMETIMES_NO_DEFICIT_DAYS = 90
/** Sometimes: the day-14 ask (ob9-3) */
export const TODAY_ASK_DAYS = 14
/** Yes: the week-4 look-back ask (ob9-4) */
export const RANGE_ASK_DAYS = 28
/** Yes: after "Not now" (or turning the range off) it isn't asked again for 12 weeks */
export const RANGE_SNOOZE_DAYS = 12 * 7
/** a meal "with protein" has at least this much (judgement, for nutrition-accuracy review) */
export const PROTEIN_MEAL_G = 15

export interface FoodView {
  mode: FoodMode
  /** Today's Food card may show calorie numbers (else words) */
  todayNumbers: boolean
  /** the Food tab shows a calorie range */
  rangeOnFood: boolean
  /** the range is ±15% around the maintenance estimate (Sometimes, and Yes after its yes) */
  wideRange: boolean
  /** weight numbers and their trend are shown back (weigh-ins work in every mode) */
  weightBack: boolean
  /** protein against a target, as a range, or in words only */
  protein: 'target' | 'range' | 'words'
}

/** What the person's food mode shows. Other quiet-number reasons (gentle mode, pregnancy, no consent) still apply on top. */
export function foodView(p: Pick<Profile, 'outcomes' | 'foodOptIn'> & Partial<Pick<Profile, 'pregnancy'>>): FoodView {
  const mode = foodModeOf(p)
  if (mode === 'sometimes') {
    return { mode, todayNumbers: p.foodOptIn?.today === 'today', rangeOnFood: true, wideRange: true, weightBack: false, protein: 'range' }
  }
  if (mode === 'yes') {
    // pregnant or breastfeeding: no calorie number at all, so a range chosen at week 4 waits
    const shown = p.foodOptIn?.range === 'shown' && !p.pregnancy?.flagged
    return { mode, todayNumbers: false, rangeOnFood: shown, wideRange: shown, weightBack: false, protein: 'words' }
  }
  return { mode, todayNumbers: true, rangeOnFood: true, wideRange: false, weightBack: true, protein: 'target' }
}

const r50 = (x: number) => Math.round(x / 50) * 50
const ceil50 = (x: number) => Math.ceil(x / 50) * 50

/**
 * ±15% (RANGE_MARGIN) around the best estimate, each end to the nearest 50: "roughly 1,650–2,200
 * a day". With `floor` (the person's BMR and sex answer) the low end is never below the calorie
 * floor, rounded up to 50, and the high end never below the low.
 */
export function maintenanceRange(estimate: number, floor?: { bmr: number; sex: SexAnswer }): { lo: number; hi: number } {
  let lo = r50(estimate * (1 - RANGE_MARGIN)), hi = r50(estimate * (1 + RANGE_MARGIN))
  if (floor) { lo = Math.max(lo, ceil50(calorieFloor(floor.bmr, floor.sex))); hi = Math.max(hi, lo) }
  return { lo, hi }
}

/** Protein as a range (Sometimes), grams a day to the nearest 5; with the medical flag a minimum only (high null). */
export function proteinRangeFor(p: Pick<Profile, 'goal' | 'age' | 'outcomes'>, kg: number | null): { low: number; high: number | null } | null {
  if (!kg) return null
  if (p.outcomes?.medical === 'flagged') return { low: proteinMinimumG(kg, p.age), high: null }
  const b = PROTEIN_RANGE_PER_KG[p.goal ?? 'feel-better']
  return { low: Math.round((kg * b.low) / 5) * 5, high: Math.round((kg * b.high) / 5) * 5 }
}

/** When the wellbeing answer took effect: the later of onboarding and the answer's own stamp (local date). */
function answerStart(p: Pick<Profile, 'onboardedAt' | 'answeredAt'>): string | null {
  const a = p.answeredAt?.['outcomes.wellbeing'], o = p.onboardedAt
  const at = a && o ? (a > o ? a : o) : a ?? o
  return at ? at.slice(0, 10) : null
}

/** What the asks read. Neither is asked while pregnant or breastfeeding: no calorie number shows then. */
type AskProfile = Pick<Profile, 'outcomes' | 'foodOptIn' | 'onboardedAt' | 'answeredAt'> & Partial<Pick<Profile, 'pregnancy'>>

/** Sometimes: "Would you like your food range on Today?" is due (14 days in, never answered). Asked once. */
export function todayAskDue(p: AskProfile, today: string): boolean {
  if (foodModeOf(p) !== 'sometimes' || p.foodOptIn?.today || p.pregnancy?.flagged) return false
  const start = answerStart(p)
  return !!start && start <= shiftDay(today, -TODAY_ASK_DAYS)
}

/** Yes: "Would a calorie range help?" is due (week 4, never answered or 12 weeks after "Not now"). */
export function rangeAskDue(p: AskProfile, today: string): boolean {
  if (foodModeOf(p) !== 'yes' || p.pregnancy?.flagged) return false
  const o = p.foodOptIn
  if (o?.range === 'shown') return false
  if (o?.range === 'not-now') return !!o.rangeAt && o.rangeAt <= shiftDay(today, -RANGE_SNOOZE_DAYS)
  const start = answerStart(p)
  return !!start && start <= shiftDay(today, -RANGE_ASK_DAYS)
}

/**
 * The one ask due today, if any. Never without a current health yes (register item 34c): the
 * answers behind it are health data, and so is the answer to the ask.
 */
export function foodAskDue(p: AskProfile, today: string, healthYes: boolean): 'today' | 'range' | null {
  if (!healthYes) return null
  return todayAskDue(p, today) ? 'today' : rangeAskDue(p, today) ? 'range' : null
}

export type FoodOptInAnswer =
  | { ask: 'today'; value: 'today' | 'food' }
  | { ask: 'range'; value: 'shown' | 'not-now' }

/**
 * Store an answer to one of the asks, or a Profile undo (the same values: 'food' takes the range
 * off Today for good, 'not-now' takes it off Food and rests the ask 12 weeks). Stamped for the
 * per-field merge. Returns whether anything changed.
 */
export function answerFoodOptInIn(p: Profile, a: FoodOptInAnswer, today: string, at: string): boolean {
  const cur: FoodOptIn = p.foodOptIn ?? {}
  const next: FoodOptIn = a.ask === 'today' ? { ...cur, today: a.value } : { ...cur, range: a.value, rangeAt: today }
  if (JSON.stringify(next) === JSON.stringify(cur)) return false
  p.foodOptIn = next
  p.answeredAt = { ...p.answeredAt, foodOptIn: at }
  return true
}

/* ─── Totals in words (ob9-2) ─── */

export interface MealWords {
  /** the meal slots with something logged, in day order ('other' = no slot) */
  slots: (MealSlot | 'other')[]
  /** how many of them reached PROTEIN_MEAL_G */
  withProtein: number
}

const SLOT_ORDER: (MealSlot | 'other')[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other']

export function mealWords(foods: LoggedFood[]): MealWords {
  const p = new Map<MealSlot | 'other', number>()
  for (const f of foods) { const k = f.meal ?? 'other'; p.set(k, (p.get(k) ?? 0) + (f.p || 0)) }
  const slots = SLOT_ORDER.filter((k) => p.has(k))
  return { slots, withProtein: slots.filter((k) => (p.get(k) ?? 0) >= PROTEIN_MEAL_G).length }
}

/* ─── Restriction signal (s-ob9 "Safety") ─── */

/**
 * HOOK, not built: a check-in sign of restriction, purging or compulsive exercise would move the
 * person to the Yes rules and show the support screen. No check-in asks anything that signals
 * this today (mood, hunger, sleep, stress, energy and soreness only), so this never fires and
 * Tali infers nothing. Wire a real signal here only with mental-performance and Benn's approval.
 */
export function restrictionSignal(_day: DayLog | undefined): boolean {
  return false
}

/** Apply a restriction signal: the Yes rules (gentle mode on, no numbers) from now. Returns whether it changed. */
export function applyRestrictionSignalIn(p: Profile, at: string): boolean {
  return setHealthAnswerIn(p, { kind: 'wellbeing', value: 'flagged' }, at)
}
