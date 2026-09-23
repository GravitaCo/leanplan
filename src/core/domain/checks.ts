/**
 * Accuracy checks for numbers people type in: custom foods from a packet, and recipe
 * ingredients. Pure TS so native can reuse it. The checks catch the mistakes that cause
 * big errors (kJ typed as kcal, per-serving typed as per-100 g, missing calories,
 * calories that the macros can't explain) and say so plainly. They never block a save:
 * the user has the packet, we don't.
 */
import type { RecipeItem } from '@/core/types'

export interface Per100 { k: number; p: number; c: number; f: number }

export interface Check {
  /** 'warn' = likely a mistake worth fixing; 'info' = worth knowing, probably fine */
  level: 'warn' | 'info'
  msg: string
  /** a one-tap correction, when we can compute one */
  fix?: { label: string; k: number }
}

/** kcal the macros account for, using the general Atwater factors UK labels use (4/4/9). */
export function macroKcal(v: Pick<Per100, 'p' | 'c' | 'f'>): number {
  return 4 * v.p + 4 * v.c + 9 * v.f
}

const KJ_PER_KCAL = 4.184
/** Pure fat is ~900 kcal per 100 g; nothing sensible is higher. */
const MAX_KCAL_100 = 900
/** How far kcal may sit from the macros before we ask. Labels round, and fibre (2 kcal/g),
 *  alcohol (7) and polyols (2.4) aren't in P/C/F, so a small gap is normal. */
const TOLERANCE = 0.15
const MIN_GAP_KCAL = 20
const MAX_MACROS_100 = 110
/** Below this, the macros are too small to say anything about kJ (drinks with alcohol can sit
 *  near a 4:1 ratio by coincidence). */
const MIN_KJ_CHECK_KCAL = 40

/**
 * Checks a food's per-100 g (or ml) values. Empty result = the numbers add up.
 * `given` says which fields the user actually filled in, so an untouched field isn't
 * treated as a typed zero.
 */
export function checkPer100(v: Per100, given: { k: boolean; macros: boolean }, each = false): Check[] {
  const out: Check[] = []
  const mk = macroKcal(v)
  const r = (n: number) => Math.round(n)

  if ([v.k, v.p, v.c, v.f].some((x) => x < 0)) return [{ level: 'warn', msg: 'Values can’t be negative.' }]

  // per-item values (a whole burger) can legitimately exceed these per-100 g limits. CoFID
  // counts carbs as monosaccharide equivalents, so pure sugar reads 105 g: allow headroom.
  if (!each && v.p + v.c + v.f > MAX_MACROS_100) {
    out.push({ level: 'warn', msg: 'That’s more than 100 g of protein, carbs and fat in 100 g. These look like per-serving numbers. Use the “per 100 g” column.' })
  }

  if (!each && given.k && v.k > MAX_KCAL_100) {
    out.push({ level: 'warn', msg: 'Nothing has more than about 900 kcal per 100 g. This may be the kJ figure.', fix: { label: `Use ${r(v.k / KJ_PER_KCAL)} kcal`, k: r(v.k / KJ_PER_KCAL) } })
    return out
  }

  if (!given.macros || mk < MIN_GAP_KCAL) return out

  if (!given.k || v.k === 0) {
    out.push({ level: 'warn', msg: `Calories are missing. From the macros it’s about ${r(mk)} kcal.`, fix: { label: `Use ${r(mk)} kcal`, k: r(mk) } })
    return out
  }

  const gap = v.k - mk
  if (Math.abs(gap) <= Math.max(MIN_GAP_KCAL, TOLERANCE * Math.max(v.k, mk))) return out

  // kJ typed into the kcal field: kcal comes out ~4.2× what the macros explain. Ratio only
  // (not an absolute gap) so low-macro drinks like beer and wine, where alcohol explains the
  // difference, aren't mistaken for kJ.
  const ratio = v.k / mk
  if (mk >= MIN_KJ_CHECK_KCAL && ratio >= KJ_PER_KCAL * (1 - TOLERANCE) && ratio <= KJ_PER_KCAL * (1 + TOLERANCE)) {
    out.push({ level: 'warn', msg: 'This looks like the kJ figure. Labels show kJ first; kcal is the smaller number.', fix: { label: `Use ${r(v.k / KJ_PER_KCAL)} kcal`, k: r(v.k / KJ_PER_KCAL) } })
  } else if (gap > 0) {
    out.push({ level: 'info', msg: `Calories are higher than protein, carbs and fat explain (about ${r(mk)} kcal). Alcohol or fibre can account for this; otherwise check the packet.` })
  } else {
    out.push({ level: 'info', msg: `Calories are lower than protein, carbs and fat explain (about ${r(mk)} kcal). Sweeteners or fibre on some labels can account for this; otherwise check the packet.` })
  }
  return out
}

/** Does this food's name say it's already cooked (so its values are per cooked weight)? */
export function isCookedState(name: string): boolean {
  return /\b(cooked|boiled|baked|grilled|roast(ed)?|fried|steamed|poached)\b/i.test(name)
}

/**
 * Checks a recipe as built. Flags ingredients with no amount, ingredients whose own values
 * don't add up, and reminds that "cooked" foods need cooked weights, the most common large
 * error in home recipes.
 */
export function checkRecipe(items: RecipeItem[]): Check[] {
  const out: Check[] = []
  const empty = items.filter((i) => !(i.grams > 0))
  if (empty.length) out.push({ level: 'warn', msg: `No amount for ${empty.map((i) => i.n).join(', ')}.` })
  const odd = items.filter((i) => checkPer100(i, { k: true, macros: true }, !!i.each).some((c) => c.level === 'warn'))
  if (odd.length) out.push({ level: 'warn', msg: `The values for ${odd.map((i) => i.n).join(', ')} don’t add up. Check that food.` })
  const cooked = items.filter((i) => isCookedState(i.n))
  if (cooked.length) {
    out.push({ level: 'info', msg: `${cooked.map((i) => i.n.split(',')[0]).join(', ')}: enter the cooked weight. Raw weight is heavier for meat and fish and lighter for rice and pasta.` })
  }
  return out
}
