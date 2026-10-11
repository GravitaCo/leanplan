/**
 * Duplicate saved foods (Design canvas boards dup-1 to dup-4). Pure functions, no framework:
 *
 * - same barcode = same food (dup-1): saving a product whose barcode is already among the user's
 *   saved foods updates that food, never a copy; `foodChanges` lists what would change.
 * - likely the same (dup-2, dup-3): a very similar name and per-100 figures within tolerance.
 * - merging (dup-4): logs and usuals of the other food move to the kept one, calories as logged.
 *
 * Logs refer to foods by name (LoggedFood.n), and usuals and "Same as yesterday" match by name, so
 * "moving" a food's logs renames its entries; their logged numbers never change.
 * Only the user's own foods (customFoods) are ever compared, never the built-in database.
 */
import type { DayLog, Food } from '../types'

/** The match rule, signed off by nutrition-accuracy (Oct 2026). */
export const DUP_RULES = {
  /** kcal per 100 (or per item): |diff| ≤ max(kcalAbs, kcalRel × the larger) */
  kcalAbs: 5,
  kcalRel: 0.03,
  /** protein, carbs and fat, each: |diff| ≤ max(macroAbs g, macroRel × the larger) */
  macroAbs: 1,
  macroRel: 0.05,
  /** word-set Jaccard similarity of the normalised names */
  jaccard: 0.75,
  /** words that never tell two products apart */
  dropWords: ['and', 'with', 'the', 'a', 'of', 'in', 'flavour', 'flavor', 'flavoured', 'flavored', 'king', 'size', 'kingsize', 'large', 'small', 'mini', 'pot'],
  /** pack sizes ("114g", "500ml") are dropped; percentages are kept */
  sizeToken: /^\d+(\.\d+)?(g|kg|ml|l|cl)$/,
} as const
// Variant words (light, lite, diet, zero, low, free, reduced, cooked, raw, dried, prepared) are
// never dropped: they stay in the word set, so "Coke" and "Diet Coke" differ.

const DROP = new Set<string>(DUP_RULES.dropWords)

/** A name as a set of meaningful words (nutrition-accuracy's normalisation, in order). */
export function nameWords(name: string): Set<string> {
  const plain = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  // `&`, `+` and all other punctuation become spaces (a % stays with its number)
  // (a decimal point inside a number stays, so "1.5g" is still a pack size)
  const words = plain.split(/[^a-z0-9%.]+/).map((w) => w.replace(/^\.+|\.+$/g, '')).flatMap((w) => (/^[\d.]+[a-z%]*$/.test(w) ? [w] : w.split('.'))).filter(Boolean)
  const out = new Set<string>()
  for (const w of words) {
    if (DUP_RULES.sizeToken.test(w) || DROP.has(w)) continue
    out.add(w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
  }
  return out
}

export function namesMatch(a: string, b: string): boolean {
  const A = nameWords(a), B = nameWords(b)
  if (!A.size || !B.size) return false
  let both = 0
  for (const w of A) if (B.has(w)) both++
  return both / (A.size + B.size - both) >= DUP_RULES.jaccard
}

const within = (x: number, y: number, abs: number, rel: number) => Math.abs((+x || 0) - (+y || 0)) <= Math.max(abs, rel * Math.max(Math.abs(+x || 0), Math.abs(+y || 0)))

/** Per-100 (or per-item) figures within tolerance, on the same basis. Serving size is ignored. */
export function figuresMatch(a: Pick<Food, 'k' | 'p' | 'c' | 'f' | 'ml' | 'each'>, b: Pick<Food, 'k' | 'p' | 'c' | 'f' | 'ml' | 'each'>): boolean {
  if (!!a.ml !== !!b.ml || !!a.each !== !!b.each) return false
  const { kcalAbs, kcalRel, macroAbs, macroRel } = DUP_RULES
  return within(a.k, b.k, kcalAbs, kcalRel) && within(a.p, b.p, macroAbs, macroRel) && within(a.c, b.c, macroAbs, macroRel) && within(a.f, b.f, macroAbs, macroRel)
}

export function likelySame(a: Food, b: Food): boolean {
  return namesMatch(a.n, b.n) && figuresMatch(a, b)
}

/** EAN-13 with a leading 0 and its 12-digit UPC-A are the same code. */
const sameCode = (a?: string, b?: string) => !!a && !!b && (a === b || a.replace(/^0+/, '') === b.replace(/^0+/, ''))

/** The saved food (customFoods) that already carries this barcode: dup-1. */
export function savedWithBarcode(saved: Food[], barcode: string | undefined): Food | undefined {
  return barcode ? saved.find((f) => !!f.id && sameCode(f.barcode, barcode)) : undefined
}

/** A saved food that looks like the one about to be saved (no barcode match): dup-2. */
export function likelySaved(saved: Food[], food: Food): Food | undefined {
  return saved.find((f) => !!f.id && f.id !== food.id && !(f.barcode && food.barcode && sameCode(f.barcode, food.barcode)) && likelySame(f, food))
}

/** The user said these two are different ("They're different", dup-4): never hinted again. */
export function dismissed(a: Food, b: Food): boolean {
  return (!!b.id && !!a.notSame?.includes(b.id)) || (!!a.id && !!b.notSame?.includes(a.id))
}

/** Saved foods that look the same and haven't been told apart, in saved order (dup-3). */
export function likelyPairs(saved: Food[]): [Food, Food][] {
  const out: [Food, Food][] = []
  for (let i = 0; i < saved.length; i++) {
    for (let j = i + 1; j < saved.length; j++) {
      const a = saved[i], b = saved[j]
      if (a.id && b.id && !dismissed(a, b) && likelySame(a, b)) out.push([a, b])
    }
  }
  return out
}

/** The most foods one food remembers as different, so `meta` stays well under its size cap. */
export const NOT_SAME_MAX = 20

/** Remember that `a` and `b` are different foods (on both, so either device's copy knows). */
export function markDifferent(a: Food, b: Food): void {
  if (!a.id || !b.id) return
  a.notSame = [...(a.notSame || []).filter((x) => x !== b.id), b.id].slice(-NOT_SAME_MAX)
  b.notSame = [...(b.notSame || []).filter((x) => x !== a.id), a.id].slice(-NOT_SAME_MAX)
}

/* ---- what would change (dup-1) ---- */

export type ChangeField = 'g' | 'k' | 'p' | 'f' | 'c'
export interface FoodChanges {
  /** [was, now] when the name changes */
  name?: [string, string]
  /** changed figures in board order, [was, now] */
  figures: { field: ChangeField; was: number; now: number }[]
  /** fields that stay as they are, in board order */
  same: ChangeField[]
}
/** Board order: Energy first, then serving, protein, fat, carbs (as the "No change" row lists them). */
const CHANGE_ORDER: ChangeField[] = ['k', 'g', 'p', 'f', 'c']

/** What saving `next` over the saved food `old` would change. Figures compare at 0.1 precision. */
export function foodChanges(old: Food, next: Pick<Food, 'n' | 'g' | 'k' | 'p' | 'c' | 'f'>): FoodChanges {
  const r = (v: number) => Math.round((+v || 0) * 10) / 10
  const out: FoodChanges = { figures: [], same: [] }
  if (old.n.trim() !== next.n.trim()) out.name = [old.n, next.n.trim()]
  for (const field of CHANGE_ORDER) {
    const was = r(old[field]), now = r(next[field])
    if (was !== now) out.figures.push({ field, was, now })
    else out.same.push(field)
  }
  return out
}
export const hasChanges = (c: FoodChanges) => !!c.name || c.figures.length > 0

/**
 * The saved food after taking `next`'s figures (dup-1 "Update it", dup-2 "Use the scanned one").
 * The id always stays, so it syncs as an update; `keepName` keeps the saved name (dup-2).
 */
export function updatedFood(old: Food, next: Omit<Food, 'id'>, keepName = false): Food {
  const { id, notSame, _u, _dirty } = old
  const out: Food = { ...next, id, n: keepName ? old.n : next.n.trim(), g: Math.round(next.g) }
  if (!out.barcode && old.barcode) out.barcode = old.barcode
  if (notSame?.length) out.notSame = notSame
  if (_u) out._u = _u
  if (_dirty) out._dirty = _dirty
  return out
}

/* ---- logs follow the food ---- */

/**
 * Point every log entry of the food named `from` at `to` (and the cooking fat logged with it).
 * Logged calories and macros never change. Returns the dates that changed, to sync.
 */
export function moveLogs(days: Record<string, DayLog>, from: string, to: string): string[] {
  if (!from || from === to) return []
  const changed: string[] = []
  for (const d of Object.keys(days)) {
    let hit = false
    for (const x of days[d].foods || []) {
      if (x.n === from && x.src !== 'db' && x.src !== 'recipe' && x.src !== 'fat') { x.n = to; hit = true }
      if (x.src === 'fat' && x.fatFor === from) { x.fatFor = to; hit = true }
    }
    if (hit) changed.push(d)
  }
  return changed.sort()
}

/** How many times a food was logged (cooking fat not counted). */
export function timesLogged(days: Record<string, DayLog>, name: string): number {
  let n = 0
  for (const d of Object.keys(days)) for (const x of days[d].foods || []) if (x.n === name && x.src !== 'fat' && x.src !== 'db' && x.src !== 'recipe') n++
  return n
}

/**
 * Merge `drop` into `keep` (dup-4): logs move, `drop` goes, and with `takeBarcode` the kept food
 * takes the other's barcode. Mutates `foods` and `days`; returns the changed dates and the
 * removed food's id (for the delete to sync).
 */
export function mergeFoods(state: { customFoods: Food[]; days: Record<string, DayLog> }, keepId: string, dropId: string, takeBarcode: boolean): { days: string[]; removed: string } | null {
  const keep = state.customFoods.find((f) => f.id === keepId)
  const drop = state.customFoods.find((f) => f.id === dropId)
  if (!keep || !drop || keep === drop) return null
  const days = moveLogs(state.days, drop.n, keep.n)
  if (takeBarcode && drop.barcode) keep.barcode = drop.barcode
  const others = (drop.notSame || []).filter((x) => x !== keep.id)
  if (others.length) keep.notSame = [...new Set([...(keep.notSame || []), ...others])].slice(-NOT_SAME_MAX)
  if (keep.notSame) { keep.notSame = keep.notSame.filter((x) => x !== drop.id); if (!keep.notSame.length) delete keep.notSame }
  state.customFoods.splice(state.customFoods.indexOf(drop), 1)
  return { days, removed: dropId }
}
