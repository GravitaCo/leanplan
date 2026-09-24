/**
 * Diet patterns, and swaps rather than exclusions. Pure TS (native reuses it).
 *
 * Tags come from a food's name and category with conservative rules: 'fits', 'conflict'
 * (clearly contains something the diet excludes) or 'check' (varies by brand or recipe, e.g.
 * rennet in cheese, fining agents in wine, milk in naan, or a made-up dish we can't see
 * inside). Meals are never hidden for a diet: a plain conflicting ingredient gets a sourced
 * swap with its calorie and protein change shown; anything else is "leave out or use a plant
 * version". Halal and kosher depend on how meat is sourced, which the data can't tell us, so
 * they're not offered yet. Allergens come later, with professional sign-off.
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
  ['meat', /\b(chicken|beef|pork|lamb|mutton|turkey|duck|goose|venison|veal|bacon|ham|gammon|sausages?|chorizo|salami|pepperoni|prosciutto|pancetta|mince|steak|burger|meatballs?|kebab|doner|liver|kidney(?! beans?)|black pudding|lard|suet|dripping|gelatine|corned beef|pâté|pate|lorne|hot dog|nuggets?|goujons?|mcnuggets)\b/i],
  ['fish', /\b(fish|salmon|tuna|cod|haddock|mackerel|sardines?|anchov\w*|prawns?|shrimp|mussels?|squid|crab|lobster|scallops?|sea bass|trout|plaice|pollock|kipper|seafood|sushi|worcestershire)\b/i],
  ['dairy', /\b(milk|cheese|cheddar|mozzarella|parmesan|feta|halloumi|paneer|butter|ghee|cream(?! crackers?)|yogh?urt|skyr|kefir|whey|crème|custard|latte|cappuccino|flat white|mocha|milkshake|ice cream|béchamel|rice pudding|pesto|nutella|pizza|horseradish sauce|mash(ed)?|pancakes?|croissants?|pain au chocolat|waffles?|coleslaw|white (coffee|tea)|hot chocolate|iced (caramel )?chocolate)\b/i],
  ['egg', /\b(eggs?|omelette|mayonnaise|mayo|quiche|meringue|frittata|quorn|coleslaw|pancakes?|waffles?)\b/i],
  ['honey', /\b(honey)\b/i],
]

/** Made with animal rennet by definition (protected recipes): not vegetarian. */
const RENNET = /\b(parmesan|parmigiano|grana padano|pecorino|gorgonzola)\b/i
/** Varies by brand or recipe: we can't vouch either way from the name. */
const CHECK_VEGETARIAN = /\b(cheese|cheddar|brie|feta|mozzarella|halloumi|camembert|stilton|babybel|refried|pesto|wine|prosecco|champagne|lager|beer|ale|cider|stout|fruit yogh?urt|jelly|marshmallows?)\b/i
const CHECK_VEGAN = /\b(naan|granola|muesli|refried|pilau|gnocchi|instant noodles|muffins?|margarine|spread|wine|prosecco|champagne|lager|beer|ale|cider|stout|biscuits?|cakes?)\b/i
const PLAIN_SAUCE = /\b(soy sauce|ketchup|sriracha|mustard|vinegar|mint sauce|chilli sauce|sweet chilli)\b/i
// dishes whose full ingredients we can't know from the name (chains, ready meals, snacks)
const COMPOSITE = new Set(['ready', 'fastfood', 'snacks'])

export type DietFit = 'fits' | 'conflict' | 'check'

/** "Tea, no milk" doesn't contain milk. */
function clean(name: string): string {
  return name.replace(/\b(no|without)\s+[a-z]+/gi, ' ')
}

/** What animal parts a food's name says it contains. */
export function partsOf(rawName: string, cat?: Food['cat']): Part[] {
  const name = clean(rawName)
  if (/\bvegan\b/i.test(name)) return []
  const out = new Set<Part>()
  const plant = PLANT.test(name)
  for (const [part, re] of RULES) {
    if (!re.test(name)) continue
    // "Oat milk", "Peanut butter", "Quorn mince": the plant word wins for that part
    if (plant && (part === 'dairy' || part === 'meat')) continue
    out.add(part)
  }
  // a plant name overrides the category (Quorn and tofu are filed with meat and eggs)
  if (cat === 'meat' && !plant) out.add('meat')
  if (cat === 'fish' && !plant) out.add('fish')
  // "Tuna steak" is fish, not meat
  if (out.has('fish') && cat !== 'meat') out.delete('meat')
  // spreads and margarine are mostly plant-based but vary: 'check' (below), not dairy
  if (cat === 'dairy' && !plant && !/\b(margarine|spread)\b/i.test(name)) out.add('dairy')
  return [...out]
}

export function dietFit(food: Pick<Food, 'n' | 'cat'>, diet: DietPattern | undefined): DietFit {
  if (!diet || diet === 'none') return 'fits'
  const name = clean(food.n)
  const parts = partsOf(food.n, food.cat)
  if (parts.some((p) => EXCLUDES[diet].includes(p))) return 'conflict'
  if (diet !== 'pescatarian' && RENNET.test(name)) return 'conflict'
  // a label only vouches for what it says: "veggie" is vegetarian, not vegan
  const labelled = diet === 'vegan' ? /\bvegan\b/i : /\b(vegan|vegetarian|veggie)\b/i
  if (labelled.test(name)) return 'fits'
  if (food.cat && COMPOSITE.has(food.cat)) return 'check'
  if (diet !== 'pescatarian' && CHECK_VEGETARIAN.test(name)) return 'check'
  if (diet === 'vegan' && CHECK_VEGAN.test(name)) return 'check'
  // made-up sauces, gravies and pastes often hide stock, fish, cream or egg
  if (food.cat === 'sauces' && /\b(sauce|paste|gravy|dressing|stock)\b/i.test(name) && !PLAIN_SAUCE.test(name)) return 'check'
  return 'fits'
}

/**
 * Swaps for plain ingredients only (a raw cut, a fillet, milk, butter), always to a sourced
 * database food. Dishes, stocks, fats and sauces have no like-for-like swap: "leave out or use
 * a plant version". `factor` scales the weight (oil for butter at equal fat).
 */
const SWAPS: { when: Part; match: RegExp; to: string; diets: DietPattern[]; factor?: number }[] = [
  { when: 'meat', match: /./, to: 'Quorn pieces', diets: ['pescatarian', 'vegetarian'] },
  { when: 'meat', match: /./, to: 'Tofu, firm', diets: ['vegan'] },
  { when: 'fish', match: /./, to: 'Tofu, firm', diets: ['vegetarian', 'vegan'] },
  { when: 'dairy', match: /^milk\b/i, to: 'Soya milk', diets: ['vegan'] },
  { when: 'dairy', match: /^butter\b/i, to: 'Olive oil (tbsp ~14g)', diets: ['vegan'], factor: 0.82 },
]
// processed or composite (egg, pastry, crumb, fat), or weighed with bone (the bone would become
// Quorn or tofu): no like-for-like swap at the same weight
const NOT_SWAPPABLE = /\b(stock|lard|dripping|suet|gelatine|anchov\w*|worcestershire|gravy|scotch egg|black pudding|chorizo|salami|pepperoni|breaded|fingers|nuggets|goujons|pâté|pate|rolls?|pies?|pasty|pasties|bakes?|weighed with bone|on the bone|bone-in)\b/i
const SWAP_CATS = new Set(['meat', 'fish', 'dairy', 'fats'])

export interface Swap {
  from: string
  /** the sourced food to use instead, or null: leave it out or use a plant version */
  to: Food | null
  /** grams of `to` per gram of `from` */
  factor: number
  /** change for this recipe's amount of the ingredient */
  delta: { k: number; p: number } | null
  reason: string
}

/** For each ingredient that conflicts with the diet: what to use instead, or leave it out. */
export function swapsFor(items: RecipeItem[], diet: DietPattern | undefined, byName: Map<string, Food>): Swap[] {
  if (!diet || diet === 'none') return []
  const out: Swap[] = []
  for (const it of items) {
    const f = byName.get(it.n)
    const parts = partsOf(it.n, f?.cat).filter((p) => EXCLUDES[diet].includes(p))
    if (!parts.length) continue
    // only plain, sourced ingredients have a like-for-like swap
    const plain = !!f && !!f.src && !f.each && SWAP_CATS.has(f.cat ?? '') && !NOT_SWAPPABLE.test(it.n)
    const s = plain ? SWAPS.find((x) => parts.includes(x.when) && x.diets.includes(diet) && x.match.test(it.n)) : undefined
    const cand = s ? byName.get(s.to) : undefined
    const to = cand && cand.src && dietFit(cand, diet) === 'fits' ? cand : null
    const factor = to ? s!.factor ?? 1 : 1
    const basis = it.each ? 1 : 100
    const delta = to ? {
      k: (to.k * it.grams * factor) / 100 - (it.k * it.grams) / basis,
      p: (to.p * it.grams * factor) / 100 - (it.p * it.grams) / basis,
    } : null
    out.push({ from: it.n, to, factor, delta, reason: parts.join(', ') })
  }
  return out
}
