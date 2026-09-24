/**
 * Diet patterns, and swaps rather than exclusions. Pure TS (native reuses it).
 *
 * Tags are derived from a food's name and category with conservative rules: a food is
 * 'fits', 'conflict' (clearly contains something the diet excludes) or 'check' (a made-up
 * dish whose ingredients we don't know; we say so rather than guess). Meals are never hidden
 * for a diet: conflicting ingredients get a suggested swap, computed from the database.
 * Halal and kosher depend on how meat is sourced, which the data can't tell us, so they're
 * not offered yet. Allergens come later, with professional sign-off (meal-suggestions plan).
 */
import type { DietPattern, Food, RecipeItem } from '@/core/types'

export const DIETS: [DietPattern, string][] = [
  ['none', 'No restrictions'],
  ['pescatarian', 'Pescatarian'],
  ['vegetarian', 'Vegetarian'],
  ['vegan', 'Vegan'],
]

type Part = 'meat' | 'fish' | 'dairy' | 'egg' | 'honey'

const EXCLUDES: Record<DietPattern, Part[]> = {
  none: [],
  pescatarian: ['meat'],
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'dairy', 'egg', 'honey'],
}

// plant versions named like animal foods: never tagged as the animal food
const PLANT = /\b(quorn|vegan|vegetarian|veggie|plant|soya|soy|tofu|tempeh|seitan|oat milk|almond|coconut|peanut butter|butter beans?|cocoa butter)\b/i
const RULES: [Part, RegExp][] = [
  ['meat', /\b(chicken|beef|pork|lamb|mutton|turkey|duck|goose|venison|veal|bacon|ham|gammon|sausages?|chorizo|salami|pepperoni|prosciutto|pancetta|mince|steak|burger|meatballs?|kebab|doner|liver|kidney(?! beans?)|black pudding|lard|suet|gelatine|corned beef|pâté|pate|lorne|hot dog|nuggets?|goujons?|mcnuggets)\b/i],
  ['fish', /\b(fish|salmon|tuna|cod|haddock|mackerel|sardines?|anchov\w*|prawns?|shrimp|mussels?|squid|crab|lobster|scallops?|sea bass|trout|plaice|pollock|kipper|seafood|sushi|worcestershire)\b/i],
  ['dairy', /\b(milk|cheese|pesto|nutella|pizza|horseradish sauce|cheddar|mozzarella|parmesan|feta|halloumi|paneer|butter|ghee|cream|yogh?urt|skyr|kefir|whey|crème|custard|latte|cappuccino|flat white|mocha|milkshake|ice cream|béchamel|rice pudding)\b/i],
  // standard Quorn is made with egg white, so it's vegetarian but not vegan
  ['egg', /\b(eggs?|omelette|mayonnaise|mayo|quiche|meringue|frittata|quorn)\b/i],
  ['honey', /\b(honey)\b/i],
]
const PLAIN_SAUCE = /\b(soy sauce|ketchup|sriracha|mustard|vinegar|mint sauce|chilli sauce|sweet chilli)\b/i
// dishes whose full ingredients we can't know from the name (chains, ready meals, snacks)
const COMPOSITE = new Set(['ready', 'fastfood', 'snacks'])

export type DietFit = 'fits' | 'conflict' | 'check'

/** What animal parts a food's name says it contains. */
export function partsOf(name: string, cat?: Food['cat']): Part[] {
  if (/\bvegan\b/i.test(name)) return []
  const out = new Set<Part>()
  const plant = PLANT.test(name)
  // a plant name overrides the category (Quorn and tofu are filed with meat and eggs)
  if (cat === 'meat' && !plant) out.add('meat')
  if (cat === 'fish' && !plant) out.add('fish')
  for (const [part, re] of RULES) {
    if (!re.test(name)) continue
    // "Oat milk", "Peanut butter", "Quorn mince": the plant word wins for that part
    if (plant && (part === 'dairy' || part === 'meat')) continue
    out.add(part)
  }
  if (cat === 'dairy' && !plant) out.add('dairy')
  return [...out]
}

export function dietFit(food: Pick<Food, 'n' | 'cat'>, diet: DietPattern | undefined): DietFit {
  if (!diet || diet === 'none') return 'fits'
  const parts = partsOf(food.n, food.cat)
  if (parts.some((p) => EXCLUDES[diet].includes(p))) return 'conflict'
  // a label only vouches for what it says: "veggie" is vegetarian, not vegan
  const labelled = diet === 'vegan' ? /\bvegan\b/i : /\b(vegan|vegetarian|veggie)\b/i
  if (labelled.test(food.n)) return 'fits'
  if (food.cat && COMPOSITE.has(food.cat)) return 'check'
  // made-up sauces, gravies and pastes often hide stock, fish, cream or egg
  if (food.cat === 'sauces' && /\b(sauce|paste|gravy|dressing|stock)\b/i.test(food.n) && !PLAIN_SAUCE.test(food.n)) return 'check'
  return 'fits'
}

/** Swap suggestions: database foods only, same weight, so the numbers stay computed. */
const SWAPS: { when: Part; match: RegExp; to: string; diets: DietPattern[] }[] = [
  { when: 'meat', match: /\bmince\b/i, to: 'Quorn mince', diets: ['pescatarian', 'vegetarian'] },
  { when: 'meat', match: /./, to: 'Quorn pieces', diets: ['pescatarian', 'vegetarian'] },
  { when: 'meat', match: /./, to: 'Tofu, firm', diets: ['vegan'] },
  { when: 'fish', match: /./, to: 'Tofu, firm', diets: ['vegetarian', 'vegan'] },
  { when: 'dairy', match: /\bmilk\b/i, to: 'Oat milk', diets: ['vegan'] },
  { when: 'dairy', match: /\bbutter\b/i, to: 'Olive oil (tbsp ~14g)', diets: ['vegan'] },
]

export interface Swap { from: string; to: Food | null; reason: string }

/** For each ingredient that conflicts with the diet: what to use instead (or leave it out). */
export function swapsFor(items: RecipeItem[], diet: DietPattern | undefined, foods: Food[]): Swap[] {
  if (!diet || diet === 'none') return []
  const byName = new Map(foods.map((f) => [f.n, f]))
  const out: Swap[] = []
  for (const it of items) {
    const f = byName.get(it.n)
    const parts = partsOf(it.n, f?.cat).filter((p) => EXCLUDES[diet].includes(p))
    if (!parts.length) continue
    const s = SWAPS.find((x) => parts.includes(x.when) && x.diets.includes(diet) && x.match.test(it.n))
    const to = s ? byName.get(s.to) ?? null : null
    // a Quorn swap isn't vegan-safe (it contains egg), so only offer it where the diet allows
    const ok = to && dietFit(to, diet) !== 'conflict' ? to : null
    out.push({ from: it.n, to: ok, reason: parts.join(', ') })
  }
  return out
}
