/**
 * Duplicate saved foods (Design canvas boards dup-1 to dup-4). Pure functions, no framework:
 *
 * - same barcode = same food (dup-1): saving a product whose barcode is already among the user's
 *   saved foods updates that food, never a copy; `foodChanges` lists what would change.
 * - likely the same (dup-2, dup-3): a very similar name and per-100 figures within tolerance.
 * - merging (dup-4): logs and usuals of the other food move to the kept one, calories as logged.
 *
 * Logs refer to foods by name (LoggedFood.n), and usuals and "Same as yesterday" match by name. A
 * merged or renamed food keeps its earlier names as aliases (`alias`, synced in custom_foods.meta),
 * and name matching goes through `aliasNames`, so logs follow the food without any day being
 * rewritten (sync uploads whole days, so rewriting old ones could overwrite another device's).
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
  return jaccardOk(nameWords(a), nameWords(b))
}
function jaccardOk(A: Set<string>, B: Set<string>): boolean {
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

/** Each saved food's name words, worked out once per list (lists are immutable store snapshots). */
const pairsMemo = new WeakMap<Food[], [Food, Food][]>()

/** Saved foods that look the same and haven't been told apart, in saved order (dup-3). Memoised
 *  per list, with each name's words computed once. */
export function likelyPairs(saved: Food[]): [Food, Food][] {
  const hit = pairsMemo.get(saved)
  if (hit) return hit
  const words = saved.map((f) => nameWords(f.n))
  const out: [Food, Food][] = []
  for (let i = 0; i < saved.length; i++) {
    for (let j = i + 1; j < saved.length; j++) {
      const a = saved[i], b = saved[j]
      if (a.id && b.id && !dismissed(a, b) && jaccardOk(words[i], words[j]) && figuresMatch(a, b)) out.push([a, b])
    }
  }
  pairsMemo.set(saved, out)
  return out
}

/** The most foods one food remembers as different, so `meta` stays well under its size cap. */
export const NOT_SAME_MAX = 20

/** Remember that `a` and `b` are different foods (on both, so either device's copy knows). */
export function markDifferent(a: Food, b: Food): void {
  if (!a.id || !b.id) return
  a.notSame = [...(a.notSame || []).filter((x) => x !== b.id), b.id].slice(-NOT_SAME_MAX)
  b.notSame = [...(b.notSame || []).filter((x) => x !== a.id), a.id].slice(-NOT_SAME_MAX)
  fitMeta(a); fitMeta(b)
}

/* ---- names a food used to have (merges and renames) ---- */

/**
 * The Food fields that travel in `custom_foods.meta` (data/sync.ts), kept here so the size cap can
 * be checked in core. The server caps meta at 2048 bytes (docs/migrations/2026-09-custom-foods-meta.sql).
 */
export const FOOD_META_KEYS = ['each', 'src', 'ref', 'cat', 'cook', 'barcode', 'eat', 'notSame', 'alias'] as const
/** Room left under the server's cap for jsonb's own overhead. */
export const META_BUDGET = 1700
/** The most earlier names one food keeps, and their longest length. */
export const ALIAS_MAX = 10
export const ALIAS_LEN = 120

const metaSize = (f: Food) => {
  const m: Record<string, unknown> = {}
  for (const k of FOOD_META_KEYS) if (f[k] !== undefined && f[k] !== false) m[k] = f[k]
  return new TextEncoder().encode(JSON.stringify(m)).length
}
/** Keep a food's meta under the cap: the oldest earlier names go first, then the oldest "different". */
export function fitMeta(f: Food): void {
  while (metaSize(f) > META_BUDGET) {
    if (f.alias?.length) { f.alias = f.alias.slice(1); if (!f.alias.length) delete f.alias }
    else if (f.notSame?.length) { f.notSame = f.notSame.slice(1); if (!f.notSame.length) delete f.notSame }
    else break
  }
}

/** Clean a stored alias list: strings only, trimmed, not the food's own name, newest kept. */
export function cleanAlias(f: Food): void {
  if (f.alias === undefined) return
  // exact, as log matching is: a rename that only changes capitals keeps the old spelling
  const own = f.n || ''
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of (Array.isArray(f.alias) ? f.alias : []).slice().reverse()) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, ALIAS_LEN)
    if (!t || t === own || seen.has(t)) continue
    seen.add(t)
    out.unshift(t)
    if (out.length >= ALIAS_MAX) break
  }
  if (out.length) f.alias = out; else delete f.alias
}

/** Add earlier names to a food (its logs under those names now count as this food). */
export function addAliases(f: Food, names: (string | undefined)[]): void {
  f.alias = [...(f.alias || []), ...names.filter((x): x is string => !!x)]
  cleanAlias(f)
  fitMeta(f)
}

const aliasMemo = new WeakMap<Food[], Map<string, string>>()
/**
 * Earlier name → the saved food's current name, for matching logs (usuals, "Same as yesterday",
 * last time, times logged). A name that is some saved food's current name is never an alias, and
 * the first food to claim an alias keeps it. Memoised per list.
 */
export function aliasNames(foods: Food[] | undefined): Map<string, string> {
  if (!foods) return new Map()
  const hit = aliasMemo.get(foods)
  if (hit) return hit
  const current = new Set(foods.map((f) => f.n))
  const out = new Map<string, string>()
  for (const f of foods) for (const a of f.alias || []) if (!current.has(a) && !out.has(a)) out.set(a, f.n)
  aliasMemo.set(foods, out)
  return out
}

/** The name a log entry counts under today: a saved food's current name for an earlier one. */
export function currentName(names: Map<string, string>, x: { n: string; src?: string }): string {
  return x.src === 'db' || x.src === 'recipe' ? x.n : names.get(x.n) ?? x.n
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
 * The name a saved food ends up with when it takes `next` (dup-1 "Update it", dup-2 "Use the scanned
 * one"): the saved name when asked to keep it, or when another saved food already has the new one
 * (the server holds one food per name).
 */
export function nameAfterUpdate(foods: Food[], old: Food, next: Pick<Food, 'n'>, keepName = false): string {
  const n = next.n.trim()
  if (keepName || !n) return old.n
  return foods.some((x) => x.id !== old.id && x.n.toLowerCase() === n.toLowerCase()) ? old.n : n
}

/**
 * The saved food after taking `next`'s figures under the name `name` (see nameAfterUpdate). The id
 * always stays, so it syncs as an update. A changed name keeps the old one as an alias, so the
 * logs under it still count; what `next` doesn't say (barcode, category, cook, eat) stays.
 */
export function updatedFood(old: Food, next: Omit<Food, 'id'>, name: string = old.n): Food {
  const { id, notSame, alias, _u, _dirty } = old
  const out: Food = { ...next, id, n: name, g: Math.round(next.g) }
  for (const k of ['barcode', 'cat', 'cook', 'eat', 'shareDone'] as const) if (out[k] === undefined && old[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = old[k]
  if (notSame?.length) out.notSame = notSame
  if (alias?.length) out.alias = alias
  if (name !== old.n) addAliases(out, [old.n])
  else fitMeta(out)
  if (_u) out._u = _u
  if (_dirty) out._dirty = _dirty
  return out
}

/* ---- logs follow the food (without rewriting a single day) ---- */

/** How many times a food was logged under its name or an earlier one (cooking fat not counted). */
export function timesLogged(days: Record<string, DayLog>, f: Pick<Food, 'n' | 'alias'>): number {
  const names = new Set([f.n, ...(f.alias || [])])
  let n = 0
  for (const d of Object.keys(days)) for (const x of days[d].foods || []) if (names.has(x.n) && x.src !== 'fat' && x.src !== 'db' && x.src !== 'recipe') n++
  return n
}

/**
 * Merge `drop` into `keep` (dup-4): `drop` goes and its names become `keep`'s aliases, so its logs
 * count as `keep` from now on. Days are never rewritten (another device may hold newer ones), so
 * logged numbers can't change. With `takeBarcode` the kept food takes the other's barcode.
 * Mutates `customFoods`; returns the removed food's id (for the delete to sync).
 */
export function mergeFoods(state: { customFoods: Food[] }, keepId: string, dropId: string, takeBarcode: boolean): { removed: string } | null {
  const keep = state.customFoods.find((f) => f.id === keepId)
  const drop = state.customFoods.find((f) => f.id === dropId)
  if (!keep || !drop || keep === drop) return null
  // "shared" belongs to the barcode: it moves with it
  if (takeBarcode && drop.barcode) { keep.barcode = drop.barcode; if (drop.shareDone) keep.shareDone = drop.shareDone; else delete keep.shareDone }
  const others = (drop.notSame || []).filter((x) => x !== keep.id)
  if (others.length) keep.notSame = [...new Set([...(keep.notSame || []), ...others])].slice(-NOT_SAME_MAX)
  if (keep.notSame) { keep.notSame = keep.notSame.filter((x) => x !== drop.id); if (!keep.notSame.length) delete keep.notSame }
  state.customFoods.splice(state.customFoods.indexOf(drop), 1)
  addAliases(keep, [...(drop.alias || []), drop.n])
  return { removed: dropId }
}
