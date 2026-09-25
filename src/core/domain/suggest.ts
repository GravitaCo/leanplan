/**
 * "What can I make?": rank the user's recipes by what's in their kitchen. Pure TS, offline,
 * deterministic (no AI). Staples (salt, pepper, oil, dried herbs and spices, stock) are
 * assumed, so the kitchen snapshot never has to be complete. Meals are never hidden for a
 * diet: conflicting ingredients come back with a swap (see diet.ts).
 */
import type { DietPattern, Food, Recipe } from '@/core/types'
import { recipePerServing } from './nutrition'
import { swapsFor, type Swap } from './diet'
import { isMenuSource } from '@/core/data/sources'

/** Made foods, eaten as they come: ready meals, fast food and chain menu items. They're never
 *  offered as "I have…" ingredients, and rank after ingredients when building a recipe. */
export function isMadeFood(f: Pick<Food, 'cat' | 'src'> | undefined): boolean {
  return !!f && (f.cat === 'ready' || f.cat === 'fastfood' || isMenuSource(f.src))
}

/** Ingredients first, made foods after, each group keeping its order (e.g. search rank). */
export function ingredientsFirst<T>(items: T[], foodOf: (x: T) => Pick<Food, 'cat' | 'src'> | undefined): T[] {
  return [...items.filter((x) => !isMadeFood(foodOf(x))), ...items.filter((x) => isMadeFood(foodOf(x)))]
}

/** Cupboard basics most kitchens have: assumed present unless the user says otherwise.
 *  Named basics, plus dried or ground herbs and spices (not "Pasta, dried" or dried fruit). */
export function isStaple(name: string, cat?: Food['cat']): boolean {
  if (/\b(salt|black pepper|white pepper|vinegar|stock|stock cubes?|gravy granules|soy sauce|sugar(?! snap))\b/i.test(name)) return true
  if (/\boil\b/i.test(name) && cat === 'fats') return true
  return cat === 'sauces' && /\b(dried|ground|powder|garam masala)\b/i.test(name)
}

export interface Suggestion {
  recipeIndex: number
  recipe: Recipe
  /** ingredients the user has, or staples */
  have: number
  total: number
  missing: string[]
  swaps: Swap[]
  perServing: { k: number; p: number }
}

/**
 * Recipes ranked for the kitchen: fewest missing ingredients first, then the most protein per
 * serving (useful for most goals and never a calorie judgement), then most-used order.
 */
export function suggestRecipes(recipes: Recipe[], order: number[], have: string[], diet: DietPattern | undefined, foods: Food[]): Suggestion[] {
  const got = new Set(have)
  const byName = new Map(foods.map((f) => [f.n, f]))
  const cat = new Map(foods.map((f) => [f.n, f.cat]))
  const rank = new Map(order.map((ri, i) => [ri, i]))
  return recipes
    .map((recipe, recipeIndex) => {
      // with a diet swap, the swapped-in food is what they need (a vegetarian needs Quorn, not beef)
      const swaps = swapsFor(recipe.items, diet, byName)
      const use = new Map(swaps.filter((w) => w.to).map((w) => [w.from, w.to!.n]))
      // a conflicting ingredient with no swap is "leave it out", so it isn't missing
      const leaveOut = new Set(swaps.filter((w) => !w.to).map((w) => w.from))
      const missing = [...new Set(recipe.items.filter((it) => !leaveOut.has(it.n)).map((it) => use.get(it.n) ?? it.n))].filter((n) => !got.has(n) && !isStaple(n, cat.get(n)))
      const per = recipePerServing(recipe)
      return {
        recipeIndex, recipe, missing,
        have: recipe.items.length - missing.length, total: recipe.items.length,
        swaps,
        perServing: { k: per.k, p: per.p },
      }
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => a.missing.length - b.missing.length || b.perServing.p - a.perServing.p || (rank.get(a.recipeIndex) ?? 0) - (rank.get(b.recipeIndex) ?? 0))
}

/** Ingredient names worth offering as "I have…" chips: from the user's recipes and recent logs.
 *  Never ready meals or chain menu items: those aren't something you cook with. */
export function kitchenCandidates(recipes: Recipe[], recentNames: string[], foods: Food[]): string[] {
  const byName = new Map(foods.map((f) => [f.n, f]))
  const out: string[] = []
  const seen = new Set<string>()
  const add = (n: string) => {
    const f = byName.get(n)
    if (!seen.has(n) && !isStaple(n, f?.cat) && !isMadeFood(f)) { seen.add(n); out.push(n) }
  }
  recipes.forEach((r) => r.items.forEach((it) => add(it.n)))
  recentNames.forEach(add)
  return out
}
