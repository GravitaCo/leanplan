/**
 * "What can I make?": rank the user's recipes by what's in their kitchen. Pure TS, offline,
 * deterministic (no AI). Staples (salt, pepper, oil, dried herbs and spices, stock) are
 * assumed, so the kitchen snapshot never has to be complete. Meals are never hidden for a
 * diet: conflicting ingredients come back with a swap (see diet.ts).
 */
import type { DietPattern, Food, Recipe } from '@/core/types'
import { recipePerServing } from './nutrition'
import { swapsFor, type Swap } from './diet'

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
  const cat = new Map(foods.map((f) => [f.n, f.cat]))
  const rank = new Map(order.map((ri, i) => [ri, i]))
  return recipes
    .map((recipe, recipeIndex) => {
      // with a diet swap, the swapped-in food is what they need (a vegetarian needs Quorn, not beef)
      const swaps = swapsFor(recipe.items, diet, foods)
      const use = new Map(swaps.filter((w) => w.to).map((w) => [w.from, w.to!.n]))
      const missing = recipe.items.map((it) => use.get(it.n) ?? it.n).filter((n) => !got.has(n) && !isStaple(n, cat.get(n)))
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

/** Ingredient names worth offering as "I have…" chips: from the user's recipes and recent logs. */
export function kitchenCandidates(recipes: Recipe[], recentNames: string[], foods: Food[]): string[] {
  const cat = new Map(foods.map((f) => [f.n, f.cat]))
  const out: string[] = []
  const seen = new Set<string>()
  const add = (n: string) => { if (!seen.has(n) && !isStaple(n, cat.get(n))) { seen.add(n); out.push(n) } }
  recipes.forEach((r) => r.items.forEach((it) => add(it.n)))
  recentNames.forEach(add)
  return out
}
