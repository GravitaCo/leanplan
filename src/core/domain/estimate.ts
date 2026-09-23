/**
 * Honest logging: every entry carries a typical relative error based on how its amount
 * was captured, and the app spends the user's attention only where an answer would
 * move the total ("effort proportional to uncertainty"). Pure TS, no framework.
 */
import type {
  AccuracyMode,
  CaptureMethod,
  FatChoice,
  Food,
  FoodCategory,
  HandPortion,
  LoggedFood,
  MealSlot,
  Profile,
} from '@/core/types'
import { amountText, roundAmount, scaleFood, unitOf } from './nutrition'
import { sourceErr } from '@/core/data/sources'

/** Extra relative error when the cooking-fat question is skipped: we don't add fat we
 *  weren't told about, we just say we're less sure. */
const SKIPPED_FAT_ERR = 0.1

/** Typical relative error by capture method. */
export const CAPTURE_ERR: Record<CaptureMethod, number> = {
  g: 0.08,
  serv: 0.12,
  usual: 0.1,
  recipe: 0.12,
  hand: 0.2,
  quick: 0.25,
  fat: 0.3,
}

export const CAPTURE_LABEL: Record<CaptureMethod, string> = {
  g: 'Weighed',
  serv: 'Serving',
  usual: 'Your usual',
  recipe: 'Recipe',
  hand: 'Hand estimate',
  quick: 'Quick estimate',
  fat: 'Cooking fat',
}

/** Entries logged before capture metadata existed get a middling default. */
const LEGACY_ERR = 0.12

/**
 * Accuracy mode sets how much the app asks. An entry is surfaced for a quick check when
 * its error class is at least `minErr` (a guess the user can improve) and its own
 * uncertainty is at least `flag` kcal.
 */
export const ACCURACY: Record<AccuracyMode, { label: string; flag: number; minErr: number; askFat: boolean; desc: string }> = {
  relaxed: { label: 'Relaxed', flag: Infinity, minErr: 1, askFat: false, desc: 'Fewest questions. Estimates carry a wider margin.' },
  balanced: { label: 'Balanced', flag: 45, minErr: 0.2, askFat: true, desc: 'Asks only when an answer would move your total.' },
  precise: { label: 'Precise', flag: 20, minErr: 0.12, askFat: true, desc: 'Tighter numbers, with a few more quick checks.' },
}

/** Hand portions: zero-equipment estimates that scale with the person, calibratable. */
export const HANDS: Record<HandPortion, { label: string; hint: string; g: number }> = {
  palm: { label: 'Palm', hint: 'Meat, fish, tofu', g: 100 },
  cupped: { label: 'Cupped hand', hint: 'Rice, pasta, oats', g: 90 },
  fist: { label: 'Fist', hint: 'Veg, fruit, cereal', g: 80 },
  thumb: { label: 'Thumb', hint: 'Oil, butter, nut butter', g: 12 },
}

const HAND_FOR_CAT: Partial<Record<FoodCategory, HandPortion>> = {
  meat: 'palm', fish: 'palm', eggs: 'palm',
  grains: 'cupped', potato: 'cupped', ready: 'cupped', snacks: 'cupped', dairy: 'cupped',
  veg: 'fist', fruit: 'fist',
  fats: 'thumb', sauces: 'thumb',
}

/* Cooking fat is the biggest systematic miss in food logging, so for plain foods usually
   cooked in fat (flagged `cook` in the database) we ask one question. Portions this small
   are garnish; the question wouldn't be worth the tap. */
const MIN_COOK_GRAMS = 30

export interface FatOption {
  id: FatChoice
  label: string
  /** logged entry — absent for "none" */
  entry?: { n: string; g: number; k: number; f: number; p?: number; err?: number }
}
export const FAT_OPTIONS: FatOption[] = [
  { id: 'none', label: 'Dry or grilled' },
  { id: 'spray', label: 'Spray oil', entry: { n: 'Oil spray', g: 1, k: 9, f: 1 } },
  { id: 'tsp', label: '1 tsp oil', entry: { n: 'Oil', g: 5, k: 44, f: 5 } },
  { id: 'tbsp', label: '1 tbsp oil', entry: { n: 'Oil', g: 14, k: 124, f: 14 } },
  { id: 'butter', label: 'Butter', entry: { n: 'Butter', g: 10, k: 74, f: 8.2, p: 0.1 } },
  { id: 'unsure', label: 'Not sure', entry: { n: 'Oil (estimate)', g: 5, k: 44, f: 5, err: 0.6 } },
]

export function accuracyOf(p: Profile) {
  return ACCURACY[p.accuracy ?? 'balanced'] ?? ACCURACY.balanced
}
export function entryErr(x: LoggedFood): number {
  return typeof x.err === 'number' ? x.err : LEGACY_ERR
}
/** Shown with ≈ in lists. */
export function isEstimate(x: LoggedFood): boolean {
  return entryErr(x) >= 0.2
}
/** Day uncertainty: root-sum-square of per-entry kcal error, rounded to 10. */
export function dayMargin(foods: LoggedFood[]): number {
  const ss = foods.reduce((a, x) => a + Math.pow(x.k * entryErr(x), 2), 0)
  return Math.round(Math.sqrt(ss) / 10) * 10
}
export function isFlagged(x: LoggedFood, p: Profile): boolean {
  const a = accuracyOf(p)
  return !x.ok && entryErr(x) >= a.minErr && x.k * entryErr(x) >= a.flag
}
/** Guesses with the biggest kcal margin, not yet confirmed — biggest first. */
export function flaggedEntries(foods: LoggedFood[], p: Profile): { x: LoggedFood; i: number }[] {
  return foods
    .map((x, i) => ({ x, i }))
    .filter((o) => isFlagged(o.x, p))
    .sort((a, b) => b.x.k * entryErr(b.x) - a.x.k * entryErr(a.x))
}
/** The biggest contributor to today's margin, by capture method. */
export function biggestMarginSource(foods: LoggedFood[]): CaptureMethod | null {
  const by: Partial<Record<CaptureMethod, number>> = {}
  for (const x of foods) {
    const h = x.how ?? 'serv'
    by[h] = (by[h] ?? 0) + Math.pow(x.k * entryErr(x), 2)
  }
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0]
  return top ? (top[0] as CaptureMethod) : null
}

export function handGrams(p: Profile, type: HandPortion): number {
  return p.hands?.[type] || HANDS[type].g
}
export function handFor(f: Food): HandPortion {
  return (f.cat && HAND_FOR_CAT[f.cat]) || 'cupped'
}
export function isCookable(f: Food, grams: number): boolean {
  return !!f.cook && grams >= MIN_COOK_GRAMS
}


/** Stored values keep one decimal: finer than anything shown, and no float noise
 *  (0.30000000000000004) bloating device storage and sync. */
const d1 = (x: number) => Math.round(x * 10) / 10

/** Portion as chosen in the add-food flow. */
export type Portion =
  | { mode: 'serv'; serv: number }
  | { mode: 'g'; grams: number; learned: number | null }
  | { mode: 'hand'; type: HandPortion; count: number }

/** Build the entry (and optional cooking-fat entry) for a food + portion. */
export function buildEntry(
  food: Food,
  portion: Portion,
  meal: MealSlot,
  profile: Profile,
  opts: { custom: boolean; fat: FatChoice | null; askFat: boolean },
): { entry: LoggedFood; fat: LoggedFood | null } {
  let grams: number
  let how: CaptureMethod
  if (portion.mode === 'serv') { grams = food.g * portion.serv; how = 'serv' }
  else if (portion.mode === 'hand') { grams = handGrams(profile, portion.type) * portion.count; how = 'hand' }
  else { grams = portion.grams; how = portion.learned != null && Math.round(grams) === portion.learned ? 'usual' : 'g' }
  const unit = unitOf(food)
  grams = roundAmount(grams, unit)
  const s = scaleFood(food, grams)
  // labels copied by hand are a little less certain than the curated database
  // menu-label sources (restaurant chains) are wider than a weighed portion can make them
  const err = +Math.max(CAPTURE_ERR[how] + (opts.custom ? 0.03 : 0), sourceErr(food)).toFixed(2)
  const entry: LoggedFood = { n: food.n, grams, k: d1(s.k), p: d1(s.p), c: d1(s.c), f: d1(s.f), meal, src: opts.custom ? 'custom' : 'db', how, err }
  if (unit !== 'g') entry.unit = unit
  if (portion.mode === 'hand') entry.hand = { type: portion.type, count: portion.count }
  if (portion.mode === 'serv') entry.serv = portion.serv

  let fat: LoggedFood | null = null
  if (opts.askFat && opts.fat == null) entry.err = +(entry.err! + SKIPPED_FAT_ERR).toFixed(2)
  if (opts.askFat && opts.fat != null) {
    entry.fatChoice = opts.fat
    const o = FAT_OPTIONS.find((x) => x.id === opts.fat)
    if (o?.entry) {
      const e = o.entry
      fat = { n: e.n + ' · cooking', grams: e.g, k: e.k, p: e.p ?? 0, c: 0, f: e.f, meal, src: 'fat', how: 'fat', err: e.err ?? CAPTURE_ERR.fat, fatFor: food.n }
    }
  }
  return { entry, fat }
}

/** Combined ± for an entry plus its cooking fat (for the add-food preview). */
export function combinedMargin(...xs: (LoggedFood | null)[]): number {
  return Math.round(Math.sqrt(xs.reduce((a, x) => a + (x ? Math.pow(x.k * entryErr(x), 2) : 0), 0)))
}

/**
 * Scale an entry by a correction multiplier. The user has looked at it, so it's no longer
 * surfaced for a check, but a slider nudge is still a guess: the error class is unchanged.
 */
export function scaleEntry(x: LoggedFood, mult: number): LoggedFood {
  if (Math.abs(mult - 1) < 0.001) return x
  const out: LoggedFood = { ...x, k: d1(x.k * mult), p: d1(x.p * mult), c: d1(x.c * mult), f: d1(x.f * mult), grams: roundAmount((x.grams || 0) * mult, x.unit ?? 'g'), ok: true }
  if (x.hand) out.hand = { ...x.hand, count: Math.round(x.hand.count * mult * 10) / 10 }
  if (x.serv) out.serv = Math.round(x.serv * mult * 10) / 10
  return out
}

/** "1½", "¾", "2" — friendly fractions for portions. */
export function frac(x: number): string {
  const w = Math.floor(x)
  const f = x - w
  const s = f >= 0.74 ? '¾' : f >= 0.49 ? '½' : f >= 0.24 ? '¼' : ''
  return (w || !s ? String(w || 0) : '') + s
}

/** Human description of an entry's portion. */
export function portionText(x: LoggedFood): string {
  const u = x.unit ?? 'g'
  if (x.how === 'quick') return 'Quick estimate'
  if (x.how === 'hand' && x.hand) {
    const h = HANDS[x.hand.type].label.toLowerCase()
    return `${frac(x.hand.count)} ${h}${x.hand.count > 1 ? 's' : ''} · ≈ ${amountText(x.grams, u)}`
  }
  if (x.how === 'recipe') { const s = x.serv ?? 1; return `${frac(s)} serving${s !== 1 ? 's' : ''}` }
  if (x.src === 'fat') return `${amountText(x.grams, u)} · for ${x.fatFor ?? 'cooking'}`
  return `${amountText(x.grams, u)}${x.how === 'usual' ? ' · your usual' : ''}`
}
