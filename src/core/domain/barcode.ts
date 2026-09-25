/**
 * Barcode scanning, the pure part: check digits, turning an Open Food Facts product into a food
 * draft, the accuracy checks for crowdsourced label values, and "ingredient or ready meal?".
 * No DOM, no network (that's data/products.ts), so a native build can reuse it unchanged.
 *
 * Open Food Facts is crowdsourced and has known errors (kJ typed as kcal, per-serving values in
 * the per-100 g column, misread digits), so nothing from it is saved without the user checking
 * it against their pack: checkLabel() says which fields to look at, never blocks.
 */
import type { Food, FoodCategory } from '@/core/types'
import { checkPer100 } from './checks'

/* ---------------- barcodes ---------------- */

/** The retail formats a food pack carries. Names as the Barcode Detection API spells them. */
export const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const
export type ScanFormat = (typeof SCAN_FORMATS)[number]

/** GS1 mod-10 check digit for EAN-8, UPC-A (12), EAN-13 and GTIN-14. */
export function checkDigitOk(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false
  const d = code.split('').map(Number)
  const check = d.pop()!
  // weights run 3, 1, 3, … from the digit next to the check digit
  const sum = d.reverse().reduce((a, x, i) => a + x * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

/** UPC-E (8 digits: number system 0/1, six data digits, check) to its 12-digit UPC-A. */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null
  const ns = code[0], x = code.slice(1, 7), check = code[7]
  const last = x[5]
  let body: string
  if (last <= '2') body = x.slice(0, 2) + last + '0000' + x.slice(2, 5)
  else if (last === '3') body = x.slice(0, 3) + '00000' + x.slice(3, 5)
  else if (last === '4') body = x.slice(0, 4) + '00000' + x[4]
  else body = x.slice(0, 5) + '0000' + last
  const upcA = ns + body + check
  return checkDigitOk(upcA) ? upcA : null
}

/**
 * A scanned or typed code, validated and in the form Open Food Facts stores: EAN-13 (a UPC-A
 * gets its leading 0), or EAN-8. `alt` is a second spelling worth looking up when the first
 * isn't found (the 8-digit UPC-E itself, or a UPC-A without the leading 0). Null when the check
 * digit is wrong: a misread, so don't look it up.
 */
export function normalizeBarcode(raw: string, format?: string): { code: string; alt?: string } | null {
  const s = raw.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(s)) return null
  if (s.length === 8) {
    // a typed 8-digit code could be either: EAN-8 first (the UK's short code), then UPC-E
    const a = format === 'ean_8' ? null : expandUpcE(s)
    if (format !== 'upc_e' && checkDigitOk(s)) return { code: s, alt: a ? '0' + a : undefined }
    return a ? { code: '0' + a, alt: s } : null
  }
  if (s.length === 12) return checkDigitOk(s) ? { code: '0' + s, alt: s } : null
  if (s.length === 13) return checkDigitOk(s) ? { code: s, alt: s[0] === '0' ? s.slice(1) : undefined } : null
  if (s.length === 14) return checkDigitOk(s) ? (s[0] === '0' ? { code: s.slice(1) } : { code: s }) : null
  return null
}

/** A food the user already has for this barcode: a saved scan, or a built-in food cited to OFF. */
export function findByBarcode(foods: Food[], code: string): Food | undefined {
  return foods.find((f) => f.barcode === code) ?? foods.find((f) => f.src === 'off:' + code)
}

/* ---------------- Open Food Facts → draft ---------------- */

/** The fields we ask Open Food Facts for (keep in step with data/products.ts). */
export const OFF_FIELDS = 'product_name,brands,quantity,product_quantity,serving_size,serving_quantity,nutriments,categories_tags,countries_tags,nutrition_data_per'

/** The subset of an OFF v2 product we read. Everything is optional: products are crowdsourced. */
export interface OffProduct {
  product_name?: string
  brands?: string
  quantity?: string
  product_quantity?: number | string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
  categories_tags?: string[]
  countries_tags?: string[]
  nutrition_data_per?: string
}

/** Per-100 label values. Undefined = not on the label (or not in OFF), which is not zero. */
export interface LabelValues {
  k?: number
  p?: number
  c?: number
  f?: number
  kj?: number
  sugars?: number
  sat?: number
  fibre?: number
  alcohol?: number
  salt?: number
}
export type LabelField = keyof LabelValues
export const REQUIRED_FIELDS: LabelField[] = ['k', 'p', 'c', 'f']

export type FoodKind = 'ingredient' | 'meal'

/** What the confirm view starts from. */
export interface ScanDraft {
  barcode: string
  name: string
  values: LabelValues
  /** kcal worked out from kJ (OFF had no kcal) */
  kcalFromKj: boolean
  ml: boolean
  kind: FoodKind
  /** best-guess category for the ingredient reading; a ready meal is always 'ready' */
  cat?: FoodCategory
  /** default serving for each reading, in g or ml */
  serving: Record<FoodKind, number>
}

const KJ_PER_KCAL = 4.184

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
const r1 = (n: number) => Math.round(n * 10) / 10

/** OFF per-100 g (per 100 ml for liquids) values. kcal from kJ when OFF has only kJ. */
export function offValues(n: OffProduct['nutriments']): { values: LabelValues; kcalFromKj: boolean } {
  const x = n || {}
  const v: LabelValues = {
    k: num(x['energy-kcal_100g']),
    p: num(x['proteins_100g']),
    c: num(x['carbohydrates_100g']),
    f: num(x['fat_100g']),
    kj: num(x['energy-kj_100g']),
    sugars: num(x['sugars_100g']),
    sat: num(x['saturated-fat_100g']),
    fibre: num(x['fiber_100g']),
    alcohol: num(x['alcohol_100g']),
    salt: num(x['salt_100g']),
  }
  let kcalFromKj = false
  if (v.k === undefined && v.kj !== undefined) { v.k = r1(v.kj / KJ_PER_KCAL); kcalFromKj = true }
  for (const key of Object.keys(v) as LabelField[]) if (v[key] === undefined) delete v[key]
  return { values: v, kcalFromKj }
}

/** Liquids are labelled per 100 ml: OFF says so, or the pack size is in ml, cl or litres. */
export function isPer100ml(p: Pick<OffProduct, 'nutrition_data_per' | 'quantity'>): boolean {
  if (/100\s*ml/i.test(p.nutrition_data_per || '')) return true
  return /\d\s*(ml|cl|dl|l|litres?|liters?)\b/i.test(p.quantity || '')
}

/**
 * Made foods, eaten as they come: not ingredients you cook with. OFF category slugs (language
 * prefix dropped), matched exactly so "pizza-sauces" or "soup-mixes" don't count. Snack bars stay
 * ingredients-side (cat 'snacks'): they're not meals, and a bar's serving is its own weight anyway.
 */
export const MEAL_CATEGORIES: ReadonlySet<string> = new Set([
  'meals', 'prepared-meals', 'ready-meals', 'microwave-meals', 'frozen-ready-meals', 'frozen-meals', 'refrigerated-meals',
  'meal-kits', 'sandwiches', 'wraps', 'filled-wraps', 'burritos', 'pizzas', 'frozen-pizzas', 'quiches',
  'prepared-salads', 'mixed-salads', 'pasta-salads', 'soups', 'fresh-soups', 'canned-soups',
  'pasta-dishes', 'rice-dishes', 'noodle-dishes', 'lasagnas', 'curries', 'sushi', 'meat-pies',
])

/** Ingredient categories, most specific first; the first that matches wins. */
const CATEGORY_TAGS: [FoodCategory, string[]][] = [
  ['fats', ['fats', 'vegetable-oils', 'olive-oils', 'oils', 'butters', 'margarines']],
  ['eggs', ['eggs', 'chicken-eggs']],
  ['fish', ['fishes', 'seafood', 'fish-and-seafood', 'canned-fishes', 'smoked-fishes']],
  ['meat', ['meats', 'poultries', 'chickens', 'beef', 'pork', 'hams', 'sausages', 'bacon', 'prepared-meats']],
  ['dairy', ['dairies', 'milks', 'cheeses', 'yogurts', 'creams', 'fermented-milk-products']],
  ['potato', ['potatoes']],
  ['fruit', ['fruits', 'fresh-fruits', 'dried-fruits', 'canned-fruits', 'frozen-fruits']],
  ['veg', ['vegetables', 'fresh-vegetables', 'canned-vegetables', 'frozen-vegetables', 'legumes', 'pulses', 'beans', 'tomatoes']],
  ['grains', ['cereals-and-their-products', 'breads', 'pastas', 'rices', 'breakfast-cereals', 'flours', 'oats', 'cereal-grains', 'noodles']],
  ['sauces', ['sauces', 'condiments', 'spices', 'herbs', 'stocks', 'broths', 'dressings']],
  ['drinks', ['beverages', 'drinks', 'waters', 'sodas', 'fruit-juices', 'teas', 'coffees']],
  ['snacks', ['snacks', 'sweet-snacks', 'salty-snacks', 'biscuits', 'chocolates', 'confectioneries', 'crisps', 'cereal-bars', 'nuts']],
]

const slugs = (tags: string[] | undefined) => new Set((tags || []).map((t) => t.replace(/^[a-z]{2,3}:/, '').toLowerCase()))

/** 'meal' for ready meals and other made foods, else 'ingredient'. */
export function classifyProduct(tags: string[] | undefined): FoodKind {
  const s = slugs(tags)
  for (const t of s) if (MEAL_CATEGORIES.has(t)) return 'meal'
  return 'ingredient'
}

/** A best-guess ingredient category from OFF categories, or undefined. */
export function guessCategory(tags: string[] | undefined): FoodCategory | undefined {
  const s = slugs(tags)
  return CATEGORY_TAGS.find(([, ts]) => ts.some((t) => s.has(t)))?.[0]
}

/** "Brand Product name", trimmed, with pack sizes ("415g", "4 x 25 g", "1.5L") taken out. */
export function productName(p: Pick<OffProduct, 'product_name' | 'brands'>): string {
  const size = /\b\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b|\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b/gi
  const tidy = (x: string) => x.replace(size, ' ').replace(/[\s,–-]+$/, '').replace(/^[\s,–-]+/, '').replace(/\s{2,}/g, ' ').trim()
  const name = tidy(p.product_name || '')
  const brand = tidy((p.brands || '').split(',')[0] || '')
  if (!name) return brand
  if (!brand || name.toLowerCase().startsWith(brand.toLowerCase())) return name
  return `${brand} ${name}`
}

/** `name`, or "name (2)", "name (3)" … when another food already has it (names are ids here). */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const set = new Set([...taken].map((n) => n.toLowerCase()))
  if (!set.has(name.toLowerCase())) return name
  for (let i = 2; ; i++) if (!set.has(`${name} (${i})`.toLowerCase())) return `${name} (${i})`
}

/** A sensible default serving in g or ml: 0 < x ≤ 5 kg, else undefined. */
const serving = (v: unknown) => { const n = num(v); return n && n > 0 && n <= 5000 ? Math.round(n) : undefined }

/** The confirm view's starting point for an OFF product. `taken` = every food name the user can see. */
export function draftFromOff(barcode: string, p: OffProduct, taken: Iterable<string>): ScanDraft {
  const { values, kcalFromKj } = offValues(p.nutriments)
  const name = productName(p)
  const serv = serving(p.serving_quantity)
  return {
    barcode,
    name: name ? uniqueName(name, taken) : '',
    values,
    kcalFromKj,
    ml: isPer100ml(p),
    kind: classifyProduct(p.categories_tags),
    cat: guessCategory(p.categories_tags),
    serving: { meal: serv ?? serving(p.product_quantity) ?? 100, ingredient: serv ?? 100 },
  }
}

/** The food to save once the user has confirmed the values (per-100 values kept exactly). */
export function foodFromConfirmed(d: { barcode: string; name: string; values: LabelValues; ml: boolean; kind: FoodKind; cat?: FoodCategory; g: number }): Omit<Food, 'id'> {
  const v = d.values
  const food: Omit<Food, 'id'> = {
    n: d.name.trim(), k: v.k ?? 0, p: v.p ?? 0, c: v.c ?? 0, f: v.f ?? 0,
    g: d.g > 0 ? d.g : 100, ml: d.ml, src: 'off:' + d.barcode, barcode: d.barcode,
  }
  const cat = d.kind === 'meal' ? 'ready' : d.cat
  if (cat) food.cat = cat
  return food
}

/* ---------------- accuracy checks ---------------- */

export interface LabelProblem {
  field: LabelField | 'name'
  /** 'missing' blocks Save (required field empty); 'odd' is a nudge to check the pack */
  kind: 'missing' | 'odd'
  msg: string
}

/** Rounding slack for "part ≤ whole" checks (labels round to 0.1 g). */
const SLACK = 0.2
/** More than this in 100 ml is denser than any common liquid (honey and syrups are ~1.4 g/ml). */
const MAX_G_PER_100ML = 140

/**
 * Problems with a set of per-100 label values, each naming the field to look at. Empty = the
 * numbers hang together. Never blocks except for missing required fields.
 */
export function checkLabel(v: LabelValues, ml = false, name?: string): LabelProblem[] {
  const out: LabelProblem[] = []
  const has = (x: number | undefined): x is number => x !== undefined && Number.isFinite(x)
  if (name !== undefined && !name.trim()) out.push({ field: 'name', kind: 'missing', msg: 'Give it a name.' })
  const labels: Record<LabelField, string> = { k: 'Calories', p: 'Protein', c: 'Carbs', f: 'Fat', kj: 'Energy (kJ)', sugars: 'Sugars', sat: 'Saturates', fibre: 'Fibre', alcohol: 'Alcohol', salt: 'Salt' }
  for (const f of REQUIRED_FIELDS) if (!has(v[f])) out.push({ field: f, kind: 'missing', msg: `${labels[f]} is missing. Copy it from the pack.` })
  for (const f of Object.keys(labels) as LabelField[]) if (has(v[f]) && v[f]! < 0) out.push({ field: f, kind: 'odd', msg: `${labels[f]} can’t be negative.` })

  // kJ vs kcal: the two lines on a label always agree (1 kcal = 4.184 kJ)
  if (has(v.k) && has(v.kj) && v.k >= 0 && v.kj >= 0) {
    const fromKj = v.kj / KJ_PER_KCAL
    if (Math.abs(fromKj - v.k) > Math.max(5, 0.05 * Math.max(v.k, fromKj))) {
      const msg = `Calories and kJ don’t match: ${Math.round(v.kj)} kJ is about ${Math.round(fromKj)} kcal.`
      out.push({ field: 'k', kind: 'odd', msg }, { field: 'kj', kind: 'odd', msg })
    }
  }

  // energy vs macros: 4P + 4C + 9F, plus fibre (2) and alcohol (7) when the label lists them
  if (REQUIRED_FIELDS.every((f) => has(v[f]))) {
    const extra = 2 * (v.fibre ?? 0) + 7 * (v.alcohol ?? 0)
    const macros = { k: v.k!, p: v.p!, c: v.c!, f: v.f! }
    for (const c of checkPer100(macros, { k: true, macros: true }, false, extra)) {
      // the per-serving (>110 g) check is covered by the sum check below, negatives above
      if (/more than 100 g|negative/.test(c.msg)) continue
      out.push({ field: 'k', kind: 'odd', msg: c.msg })
    }
  }

  if (has(v.sugars) && has(v.c) && v.sugars > v.c + SLACK) out.push({ field: 'sugars', kind: 'odd', msg: 'Sugars are part of carbs, so they can’t be more than carbs.' })
  if (has(v.sat) && has(v.f) && v.sat > v.f + SLACK) out.push({ field: 'sat', kind: 'odd', msg: 'Saturates are part of fat, so they can’t be more than fat.' })

  const parts: [LabelField, number][] = (['p', 'c', 'f', 'fibre', 'salt'] as LabelField[]).map((f) => [f, Math.max(0, v[f] ?? 0)])
  const total = parts.reduce((a, [, x]) => a + x, 0)
  if (total > (ml ? MAX_G_PER_100ML : 100) + SLACK) {
    const biggest = parts.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    out.push({ field: biggest, kind: 'odd', msg: `Protein, carbs, fat, fibre and salt add up to ${Math.round(total)} g in 100 ${ml ? 'ml' : 'g'}. These may be per-serving numbers: use the per 100 ${ml ? 'ml' : 'g'} column.` })
  }
  return out
}
