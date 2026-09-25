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
export const OFF_FIELDS = [
  'product_name', 'brands', 'quantity', 'product_quantity', 'product_quantity_unit', 'serving_size', 'serving_quantity',
  // top-level fields only: naming a nutrient here (e.g. energy-kcal_serving) makes the API
  // return an empty nutriments. nutriments already carries the _100g and _serving lines.
  'nutriments', 'categories_tags', 'countries_tags', 'nutrition_data_per', 'last_modified_t',
].join(',')

/** The subset of an OFF v2 product we read. Everything is optional: products are crowdsourced. */
export interface OffProduct {
  product_name?: string
  brands?: string
  quantity?: string
  product_quantity?: number | string
  /** 'g' or 'ml': the unit of product_quantity */
  product_quantity_unit?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
  categories_tags?: string[]
  countries_tags?: string[]
  nutrition_data_per?: string
  /** unix seconds */
  last_modified_t?: number
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
  /** alcohol as OFF stores it: % vol (ABV), not grams */
  alcohol?: number
  salt?: number
}
export type LabelField = keyof LabelValues
export const REQUIRED_FIELDS: LabelField[] = ['k', 'p', 'c', 'f']

/** "For cooking" (an ingredient) or "Eat as it is" (ready meals, snacks, drinks, desserts). */
export type FoodKind = 'cook' | 'eat'

/** What the confirm view starts from. */
export interface ScanDraft {
  barcode: string
  name: string
  values: LabelValues
  /** kcal worked out from kJ (OFF had no kcal) */
  kcalFromKj: boolean
  ml: boolean
  kind: FoodKind
  /** OFF files it as a meal (ready meal, sandwich, soup …): saved with cat 'ready' when eaten as is */
  meal: boolean
  /** best-guess category otherwise */
  cat?: FoodCategory
  /** default serving for each reading, in g or ml; undefined = the user has to type it */
  serving: Record<FoodKind, number | undefined>
  /** the whole pack, in g or ml, when OFF knows it */
  pack?: number
  /** OFF lists the whole pack as one serving (a 150 g bag of crisps): don't trust it */
  wholePack: boolean
  /** a liquid, so per 100 ml is offered up front */
  liquid: boolean
  /** product name too vague to tell varieties apart ("Sensations"): ask for the flavour */
  vague: boolean
  /** the name before de-duplication, to link an existing food of the same name */
  baseName: string
  /** problems with the product as OFF holds it (per-serving values in the per-100 fields) */
  notes: LabelProblem[]
  /** a US label: carbs include fibre, so fibre isn't counted on top */
  usLabel: boolean
  /** the year OFF last saw an edit, when that's more than three years ago */
  staleYear?: number
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

/** Ice cream is sold by volume but labelled per 100 g. */
const FROZEN_DESSERTS = ['ice-creams', 'ice-cream-tubs', 'ice-cream-bars', 'ice-creams-and-sorbets', 'sorbets', 'frozen-desserts']

/** Liquids are labelled per 100 ml: OFF's pack unit says ml, or (without one) OFF says per 100 ml,
 *  or the pack size is in ml, cl or litres. Never ice cream and other frozen desserts. */
export function isPer100ml(p: Pick<OffProduct, 'nutrition_data_per' | 'quantity' | 'product_quantity_unit' | 'categories_tags'>): boolean {
  const s = slugs(p.categories_tags)
  if (FROZEN_DESSERTS.some((t) => s.has(t))) return false
  const unit = (p.product_quantity_unit || '').trim().toLowerCase()
  if (unit === 'ml') return true
  if (unit === 'g') return false
  if (/100\s*ml/i.test(p.nutrition_data_per || '')) return true
  return /\d\s*(ml|cl|dl|l|litres?|liters?)\b/i.test(p.quantity || '')
}

/** "4 x 250g" / "250 g x 4": a multipack. The weight of one unit (g or ml), when it says. */
export function multipackUnit(quantity: string | undefined): { multi: boolean; unit?: number } {
  const q = quantity || ''
  const toBase = (n: string, u: string) => { const x = parseFloat(n.replace(',', '.')); const m = /^k|^l/i.test(u) ? 1000 : /^cl/i.test(u) ? 10 : 1; return Math.round(x * m) }
  const a = q.match(/\b\d+\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b/i)
  if (a) return { multi: true, unit: toBase(a[1], a[2]) }
  const b = q.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\s*[x×]\s*\d+\b/i)
  if (b) return { multi: true, unit: toBase(b[1], b[2]) }
  return { multi: /\b\d+\s*[x×](?=\s|\d)/i.test(q) }
}

/** Sold only in the US (not the UK): US labels count fibre inside carbs. */
export function isUsLabel(countries: string[] | undefined): boolean {
  const s = slugs(countries)
  return s.has('united-states') && !s.has('united-kingdom')
}

/** The year OFF last saw an edit, when it's more than three years ago (recipes change). */
export function staleYear(lastModified: unknown, now = Date.now()): number | undefined {
  if (typeof lastModified !== 'number' || !Number.isFinite(lastModified) || lastModified <= 0) return undefined
  const ms = lastModified * 1000
  return now - ms > 3 * 365.25 * 86400e3 ? new Date(ms).getUTCFullYear() : undefined
}

/**
 * Signs OFF's per-100 values are really per serving: OFF says it worked them out from a
 * per-serving label, or the per-100 and per-serving lines are the same for a serving that isn't
 * about 100 g.
 */
export function servingNotes(p: Pick<OffProduct, 'nutrition_data_per' | 'serving_quantity' | 'nutriments'>, ml = false): LabelProblem[] {
  const u = ml ? 'ml' : 'g'
  if ((p.nutrition_data_per || '').trim().toLowerCase() === 'serving') {
    return [{ field: 'k', kind: 'odd', msg: `Open Food Facts worked these per 100 ${u} numbers out from a per-serving label. Check them against the per 100 ${u} column on your pack.` }]
  }
  const sq = num(p.serving_quantity)
  const n = p.nutriments || {}
  const per100 = num(n['energy-kcal_100g']), perServ = num(n['energy-kcal_serving'])
  if (sq === undefined || (sq >= 90 && sq <= 110) || per100 === undefined || perServ === undefined || per100 <= 0) return []
  const same = (a: number | undefined, b: number | undefined) => a === undefined || b === undefined || Math.abs(a - b) <= Math.max(0.5, 0.02 * Math.max(a, b))
  if (same(per100, perServ) && (['proteins', 'carbohydrates', 'fat'] as const).every((k) => same(num(n[k + '_100g']), num(n[k + '_serving'])))) {
    return [{ field: 'k', kind: 'odd', msg: `The per 100 ${u} numbers match the per-serving ones (a ${Math.round(sq)} ${u} serving), so they may be per serving. Check the per 100 ${u} column on your pack.` }]
  }
  return []
}

/**
 * Meals, eaten as they come (saved with cat 'ready'). OFF category slugs (language prefix
 * dropped), matched exactly so "pizza-sauces" or "soup-mixes" don't count.
 */
export const MEAL_CATEGORIES: ReadonlySet<string> = new Set([
  'meals', 'prepared-meals', 'ready-meals', 'microwave-meals', 'frozen-ready-meals', 'frozen-meals', 'refrigerated-meals',
  'meal-kits', 'sandwiches', 'wraps', 'filled-wraps', 'burritos', 'pizzas', 'frozen-pizzas', 'quiches',
  'prepared-salads', 'mixed-salads', 'pasta-salads', 'soups', 'fresh-soups', 'canned-soups',
  'pasta-dishes', 'rice-dishes', 'noodle-dishes', 'lasagnas', 'curries', 'sushi', 'meat-pies',
])

/** Also eaten as they come, but not meals: snacks, sweets, drinks and desserts (they keep their
 *  own category, e.g. 'snacks'). */
export const EAT_AS_IS_CATEGORIES: ReadonlySet<string> = new Set([
  'snacks', 'sweet-snacks', 'salty-snacks', 'appetizers', 'crisps', 'potato-crisps', 'chips', 'popcorn', 'pretzels',
  'biscuits', 'biscuits-and-cakes', 'cakes', 'chocolates', 'chocolate-bars', 'confectioneries', 'candies', 'sweets',
  'cereal-bars', 'bars', 'protein-bars', 'energy-bars',
  'beverages', 'drinks', 'sodas', 'carbonated-drinks', 'soft-drinks', 'energy-drinks', 'fruit-juices', 'juices', 'smoothies',
  'waters', 'alcoholic-beverages', 'beers', 'wines', 'spirits',
  'desserts', 'dairy-desserts', 'frozen-desserts', 'ice-creams', 'puddings', 'sorbets',
])

/** Bought to cook or mix with even when OFF also files them as drinks or snacks (milk, cream,
 *  baking chocolate, nuts): these win over the eat-as-is list. */
const FOR_COOKING_CATEGORIES = ['milks', 'plant-based-milks', 'dairy-substitutes', 'creams', 'cooking-chocolates', 'baking-chocolate', 'nuts', 'plain-nuts', 'flours', 'sauces', 'cooking-helpers']

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

/** OFF files it as a meal (ready meal, sandwich, pizza, soup …). */
export function isMealProduct(tags: string[] | undefined): boolean {
  const s = slugs(tags)
  for (const t of s) if (MEAL_CATEGORIES.has(t)) return true
  return false
}

/** 'eat' for meals, snacks, sweets, drinks and desserts; 'cook' for everything else. */
export function classifyProduct(tags: string[] | undefined): FoodKind {
  if (isMealProduct(tags)) return 'eat'
  const s = slugs(tags)
  if (FOR_COOKING_CATEGORIES.some((t) => s.has(t))) return 'cook'
  for (const t of s) if (EAT_AS_IS_CATEGORIES.has(t)) return 'eat'
  return 'cook'
}

/** A name that can't tell one variety from another: one word, or just a brand or range name
 *  ("Sensations", "Walkers"). */
export function isVagueName(p: Pick<OffProduct, 'product_name' | 'brands'>): boolean {
  const name = (p.product_name || '').replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b/gi, ' ').trim().toLowerCase()
  if (!name) return false
  if (name.split(/\s+/).length <= 1) return true
  return (p.brands || '').split(',').map((b) => b.trim().toLowerCase()).some((b) => b && b === name)
}

/** A single pack size from the quantity text ("150", "150 g", "1.5 kg", "33cl"); not multipacks. */
export function packFromQuantity(q: string | undefined): number | undefined {
  const m = (q || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)?$/i)
  if (!m) return undefined
  const x = parseFloat(m[1].replace(',', '.')) * (/^(kg|l)$/i.test(m[2] || '') ? 1000 : /^cl$/i.test(m[2] || '') ? 10 : 1)
  return x > 0 && x <= 5000 ? Math.round(x) : undefined
}

/** OFF's serving is the whole pack (within 2%), for a pack of 100 g or more that isn't a meal or a
 *  drink: a sharing bag of crisps, where the pack's own serving is smaller. */
export function servingIsWholePack(serving: number | undefined, pack: number | undefined, mealOrDrink: boolean): boolean {
  return !mealOrDrink && !!serving && !!pack && pack >= 100 && Math.abs(serving - pack) <= 0.02 * pack
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

export const MAX_NAME = 120

/** An OFF product with every field we read type-checked: anything of the wrong type is dropped. */
export function sanitizeOff(raw: unknown): OffProduct {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const numOrStr = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? v : undefined)
  const tags = (v: unknown) => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : undefined)
  const n = p.nutriments && typeof p.nutriments === 'object' && !Array.isArray(p.nutriments) ? (p.nutriments as Record<string, unknown>) : {}
  const nutriments: Record<string, number | string> = {}
  for (const [k, v] of Object.entries(n)) if (typeof v === 'number' || typeof v === 'string') nutriments[k] = v
  return {
    product_name: str(p.product_name), brands: str(p.brands), quantity: str(p.quantity),
    product_quantity: numOrStr(p.product_quantity), product_quantity_unit: str(p.product_quantity_unit),
    serving_size: str(p.serving_size), serving_quantity: numOrStr(p.serving_quantity),
    nutriments, categories_tags: tags(p.categories_tags), countries_tags: tags(p.countries_tags),
    nutrition_data_per: str(p.nutrition_data_per),
    last_modified_t: typeof p.last_modified_t === 'number' ? p.last_modified_t : undefined,
  }
}

/** The confirm view's starting point for an OFF product. `taken` = every food name the user can see. */
export function draftFromOff(barcode: string, raw: unknown, taken: Iterable<string>, now = Date.now()): ScanDraft {
  const p = sanitizeOff(raw)
  const { values, kcalFromKj } = offValues(p.nutriments)
  const baseName = productName(p).slice(0, MAX_NAME).trim()
  const multi = multipackUnit(p.quantity)
  const ml = isPer100ml(p)
  const meal = isMealProduct(p.categories_tags)
  const cat = guessCategory(p.categories_tags)
  const liquid = ml || cat === 'drinks'
  const pack = serving(p.product_quantity) ?? packFromQuantity(p.quantity)
  const wholePack = servingIsWholePack(serving(p.serving_quantity), pack, meal || liquid)
  const serv = wholePack ? undefined : serving(p.serving_quantity)
  const notes = servingNotes(p, ml)
  if (wholePack) notes.push({ field: 'serving', kind: 'odd', msg: 'Open Food Facts lists the whole pack as one serving. Check the serving size on the pack.' })
  return {
    barcode,
    name: baseName ? uniqueName(baseName, taken) : '',
    baseName,
    values,
    kcalFromKj,
    ml,
    kind: classifyProduct(p.categories_tags),
    meal,
    cat,
    // eaten as is: the pack's serving; else one unit of a multipack; else a small pack whole (or a
    // meal's pack). A sharing bag with no believable serving is left for the user to type.
    serving: {
      eat: serv ?? (multi.multi ? serving(multi.unit) ?? (meal ? 100 : undefined) : wholePack ? undefined : pack !== undefined && (meal || liquid || pack < 100) ? pack : meal ? 100 : undefined),
      cook: serv ?? (wholePack ? undefined : 100),
    },
    pack,
    wholePack,
    liquid,
    vague: isVagueName(p),
    notes,
    usLabel: isUsLabel(p.countries_tags),
    staleYear: staleYear(p.last_modified_t, now),
  }
}

/** A saved food of the user's with exactly this name and no barcode yet: link the scan to it
 *  instead of saving a "(2)" copy. */
export function linkableFood(foods: Food[], name: string): Food | undefined {
  const key = name.trim().toLowerCase()
  return key ? foods.find((f) => !!f.id && !f.barcode && f.n.trim().toLowerCase() === key) : undefined
}

/** The food to save once the user has confirmed the values (per-100 values kept exactly). */
export function foodFromConfirmed(d: { barcode: string; name: string; values: LabelValues; ml: boolean; kind: FoodKind; meal?: boolean; cat?: FoodCategory; g: number }): Omit<Food, 'id'> {
  const v = d.values
  const food: Omit<Food, 'id'> = {
    n: d.name.trim(), k: v.k ?? 0, p: v.p ?? 0, c: v.c ?? 0, f: v.f ?? 0,
    g: d.g > 0 ? d.g : 100, ml: d.ml, src: 'off:' + d.barcode, barcode: d.barcode,
  }
  if (d.kind === 'eat') food.eat = true
  // only a true meal eaten as is becomes 'ready'; crisps stay 'snacks', a drink 'drinks'
  const cat = d.kind === 'eat' && d.meal ? 'ready' : d.cat
  if (cat) food.cat = cat
  return food
}

/* ---------------- accuracy checks ---------------- */

export interface LabelProblem {
  field: LabelField | 'name' | 'serving'
  /** 'missing' blocks Save (required field empty); 'odd' is a nudge to check the pack */
  kind: 'missing' | 'odd'
  msg: string
}

/** Rounding slack for "part ≤ whole" checks (labels round to 0.1 g). */
const SLACK = 0.2
/** More than this in 100 ml is denser than any common liquid (honey and syrups are ~1.4 g/ml). */
const MAX_G_PER_100ML = 140
/** g of alcohol per 100 ml at 1% vol (ethanol density 0.789 g/ml). */
const ALCOHOL_G_PER_ABV = 0.789

/**
 * Problems with a set of per-100 label values, each naming the field to look at. Empty = the
 * numbers hang together. Never blocks except for missing required fields.
 */
export function checkLabel(v: LabelValues, opts: { ml?: boolean; name?: string; usLabel?: boolean; serving?: number } = {}): LabelProblem[] {
  const { ml = false, name, usLabel = false } = opts
  const out: LabelProblem[] = []
  const has = (x: number | undefined): x is number => x !== undefined && Number.isFinite(x)
  if (name !== undefined && !name.trim()) out.push({ field: 'name', kind: 'missing', msg: 'Give it a name.' })
  if ('serving' in opts && !(opts.serving! > 0)) out.push({ field: 'serving', kind: 'missing', msg: 'Add the serving size from the pack.' })
  const labels: Record<LabelField, string> = { k: 'Calories', p: 'Protein', c: 'Carbs', f: 'Fat', kj: 'Energy (kJ)', sugars: 'Sugars', sat: 'Saturates', fibre: 'Fibre', alcohol: 'Alcohol (% vol)', salt: 'Salt' }
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

  // energy vs macros: 4P + 4C + 9F, plus fibre (2 kcal/g; a US label already counts it in carbs)
  // and alcohol (7 kcal/g, from % vol) when the label lists them
  if (REQUIRED_FIELDS.every((f) => has(v[f]))) {
    const extra = (usLabel ? 0 : 2 * Math.max(0, v.fibre ?? 0)) + 7 * ALCOHOL_G_PER_ABV * Math.max(0, v.alcohol ?? 0)
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
