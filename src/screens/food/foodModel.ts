/**
 * What the Food screens show, worked out without any UI: the day card, the meal groups, the quick
 * shortcuts, search and the browse lists, a portion's defaults and preview, edit-entry amounts,
 * recipes and "What can I make?". The web screens (FoodScreen.tsx and food/*) and the native ones
 * read the same functions, so the two apps can't drift. Domain rules stay in src/core; this file
 * only puts them together the way the screens do.
 */
import type { AppState, FatChoice, Food, HandPortion, LoggedFood, MealSlot, Profile, Recipe, RecipeItem } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { shiftDay } from '@/core/domain/date'
import { dayTotals, recipeTotals, roundAmount, unitOf } from '@/core/domain/nutrition'
import { accuracyOf, buildEntry, combinedMargin, dayMargin, handFor, handsAllowed, isCookable, type Portion } from '@/core/domain/estimate'
import { foodView, mealWords, proteinRangeFor } from '@/core/domain/foodMode'
import { quietNumbers } from '@/data/consent'
import {
  MEALS, dayOf, energyStatus, entryAmount, lastFatFor, lastUse, latestWeight, mealEntries, queryWords, rangeFor, recentFoods, recipesByUse, usuals,
} from '@/core/domain/insights'
import { rankByName } from '@/core/domain/search'
import { likelyPairs } from '@/core/domain/duplicates'
import { ingredientsFirst, isMadeFood, kitchenCandidates } from '@/core/domain/suggest'
import { dietFit, type Swap } from '@/core/domain/diet'

/** The built-in foods followed by the user's own, in that order: search and "Mine" rely on it. */
export function allFoods(customFoods: Food[] | undefined): Food[] {
  return FOODS.concat(customFoods || [])
}

/** A food at this index of `allFoods` is one of the user's own. */
export const isMine = (index: number): boolean => index >= FOODS.length
/** The `allFoods` index of the user's own food at this place in their list. */
export const mineIndex = (i: number): number => FOODS.length + i

// ───────────────────────── the Food tab ─────────────────────────

export type LoggedRow = LoggedFood & { _i: number }
export type MealGroups = Record<MealSlot | 'other', LoggedRow[]>

/** Today's entries by meal, each with its index in the day (edit and delete use it). */
export function mealGroups(foods: LoggedFood[]): MealGroups {
  const groups: MealGroups = { breakfast: [], lunch: [], dinner: [], snack: [], other: [] }
  foods.forEach((x, i) => { (x.meal ? groups[x.meal] : groups.other).push({ ...x, _i: i }) })
  return groups
}

/** "Porridge, Banana, Toast…": the first three names. */
export const mealNames = (xs: { n: string }[]): string => xs.slice(0, 3).map((x) => x.n).join(', ') + (xs.length > 3 ? '…' : '')

/**
 * The day card and the meal list. `card` is the food view: Yes (words; a range only after "Show
 * a range", ob9-4), Sometimes (a range, never a single number) or the numbers (gentle hides them).
 */
export function foodDay(data: AppState, cur: string) {
  const gentle = quietNumbers(data)
  // Onboarding 9: Sometimes has its range here from day one; Yes only after its own yes, and no target
  const fv = foodView(data.profile)
  const card: 'yes' | 'sometimes' | 'numbers' = fv.mode === 'yes' ? 'yes' : fv.mode === 'sometimes' && !gentle ? 'sometimes' : 'numbers'
  const day = dayOf(data, cur)
  const totals = dayTotals(day)
  const range = rangeFor(data, cur)
  const groups = mealGroups(day.foods)
  const yesterday = shiftDay(cur, -1)
  return {
    gentle,
    fv,
    card,
    /** Yes: no kcal on rows or meal headings whatever the Display setting (ob9-2); portions still show */
    noKcal: gentle || card === 'yes',
    day,
    totals,
    target: data.target,
    range,
    status: energyStatus(totals.k, range),
    margin: dayMargin(day.foods),
    words: mealWords(day.foods),
    proteinRange: card === 'sometimes' ? proteinRangeFor(data.profile, latestWeight(data, cur)) : null,
    groups,
    /** meals empty today that yesterday had: "Same as yesterday" offers them */
    sameAsYesterday: MEALS.filter((m) => !groups[m].length).map((m) => ({ m, yd: mealEntries(data, yesterday, m) })).filter((x) => x.yd.length),
    /** meals with more than one item: "Save as recipe" offers them */
    saveable: MEALS.filter((m) => groups[m].length > 1),
  }
}
export type FoodDay = ReturnType<typeof foodDay>

/** The kcal of one meal's rows. */
export const mealKcal = (rows: LoggedFood[]): number => rows.reduce((s, x) => s + x.k, 0)

// ───────────────────────── Add food: search and browse ─────────────────────────

/** A typed search: recipes whose names hold every word, then foods ranked by name (top 50). */
export function searchFoods(data: AppState, all: Food[], q: string) {
  const query = q.trim().toLowerCase()
  const meaningful = queryWords(query)
  const words = meaningful.length ? meaningful : [query]
  const recipes = recipesByUse(data).map((ri) => ({ r: data.recipes[ri], ri }))
    .filter((o) => words.every((w) => o.r.name.toLowerCase().includes(w)))
  const foods = rankByName(all.map((f, i) => ({ f, i })), (o) => o.f.n, words, (o) => o.f.aka).slice(0, 50)
  return { recipes, foods }
}

/** Nothing typed: your recipes, your usual for the meal, recent, my foods (with one likely pair), else Common. */
export function browseFoods(data: AppState, all: Food[], cur: string, meal: MealSlot) {
  const recent = recentFoods(data, all)
  const mine = data.customFoods || []
  return {
    recipes: recipesByUse(data),
    usuals: usuals(data, cur, meal),
    /** with each food's index in `all` */
    recent: recent.map((f) => ({ f, i: all.indexOf(f) })),
    mine,
    /** one quiet row while two saved foods look the same (board dup-3) */
    pair: likelyPairs(mine)[0] as [Food, Food] | undefined,
    common: !recent.length && !mine.length ? FOODS.slice(0, 8) : [],
  }
}

// ───────────────────────── portion ─────────────────────────

export const SERV_STEPS = [0.5, 1, 1.5, 2, 3]

/** The ways to say how much: per-item foods are counted only; hands only where they make sense. */
export function portionModes(food: Food): [Portion['mode'], string][] | null {
  const u = unitOf(food)
  if (u === 'item') return null
  if (u === 'ml') return [['serv', 'Servings'], ['g', 'Millilitres']]
  return handsAllowed(food) ? [['serv', 'Servings'], ['g', 'Grams'], ['hand', 'Hands']] : [['serv', 'Servings'], ['g', 'Grams']]
}

/**
 * Where the portion view opens: what the user had last time (learned portion), in the way they
 * gave it; a food last logged as servings opens in servings at the same count.
 */
export function portionStart(data: AppState, food: Food) {
  const u = unitOf(food)
  const last = lastUse(data, food.n)
  // what the last entry meant in today's data (a live-era 120 g roll is today's 119.5 g serving)
  const learned = last ? entryAmount(last, food) : null
  const each = u === 'item'
  const lastServ = last?.serv != null && (last.how === 'serv' || last.how === 'usual') && learned === roundAmount(food.g * last.serv, u) && SERV_STEPS.includes(last.serv) ? last.serv : null
  const mode: Portion['mode'] = each || lastServ != null ? 'serv' : last ? (last.how === 'hand' && handsAllowed(food) ? 'hand' : 'g') : data.profile.accuracy === 'precise' ? 'g' : 'serv'
  return {
    unit: u,
    each,
    learned,
    mode,
    serv: lastServ ?? 1,
    grams: learned ?? food.g,
    hand: (last?.hand ? { ...last.hand } : { type: handFor(food), count: 1 }) as { type: HandPortion; count: number },
    /** remembered per food: last time's answer for this food, never another food's */
    fat: lastFatFor(data, food.n),
  }
}

/** The entry (and its cooking fat) the current choice would log, with the kcal and ± to show. */
export function portionPreview(food: Food, portion: Portion, meal: MealSlot, profile: Profile, custom: boolean, fat: FatChoice | null) {
  const sized = buildEntry(food, portion, meal, profile, { custom, fat: null, askFat: false }).entry.grams
  const askFat = accuracyOf(profile).askFat && isCookable(food, sized)
  const { entry, fat: fatEntry } = buildEntry(food, portion, meal, profile, { custom, fat, askFat })
  return {
    entry,
    fatEntry,
    askFat,
    kcal: entry.k + (fatEntry?.k ?? 0),
    margin: combinedMargin(entry, fatEntry),
    /** what Add logs; nothing when the amount is 0 */
    toLog: entry.grams ? (fatEntry ? [entry, fatEntry] : [entry]) : null,
  }
}

/** The grams slider's top: four servings, at least 50. */
export const gramsMax = (food: Food): number => Math.max(50, Math.round(food.g * 4))

// ───────────────────────── edit entry ─────────────────────────

export const EDIT_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** Items snap to quarters, and the multiplier follows the snapped count so kcal and count agree. */
export function editAmount(x: LoggedFood, mult: number) {
  const u = x.unit ?? 'g'
  const amount = roundAmount((x.grams || 0) * mult, u)
  return { unit: u, amount, mult: u === 'item' && x.grams ? amount / x.grams : mult }
}

// ───────────────────────── recipes ─────────────────────────

export interface RecipeDraft { id?: string; name: string; servings: string; items: RecipeItem[] }

/** Ingredient search in the builder: ready meals and menu items after the ingredients that match. */
export function ingredientMatches(all: Food[], q: string): Food[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  const words = queryWords(query)
  return ingredientsFirst(rankByName(all, (f) => f.n, words.length ? words : [query], (f) => f.aka), (f) => f).slice(0, 30)
}

/** A food added to a recipe at one serving. */
export const asIngredient = (f: Food): RecipeItem => ({ n: f.n, k: f.k, p: f.p, c: f.c, f: f.f, grams: f.g, ml: f.ml, each: f.each })

/** The draft's totals and servings (an unreadable count is 1). */
export function draftTotals(d: RecipeDraft) {
  const servings = numIn(d.servings) || 1
  return { servings, totals: recipeTotals({ id: '', name: d.name, servings, items: d.items }) }
}

/** Why a draft can't be saved yet, or null. */
export function draftProblem(d: RecipeDraft, recipes: Recipe[]): 'name' | 'items' | 'taken' | null {
  if (!d.name.trim()) return 'name'
  if (!d.items.length) return 'items'
  if (d.id && recipes.some((r) => r.id !== d.id && r.name.toLowerCase() === d.name.trim().toLowerCase())) return 'taken'
  return null
}

/** The serving steps, with a remembered odd count slotted in. */
export const recipeSteps = (q: number): number[] => ([0.5, 1, 1.5, 2, 3].includes(q) ? [0.5, 1, 1.5, 2, 3] : [0.5, 1, 1.5, 2, q].sort((a, b) => a - b))

// ───────────────────────── What can I make? ─────────────────────────

/**
 * The "I have…" chips: candidates from recipes and recent foods, minus anything that conflicts
 * with the diet (a vegetarian isn't offered beef mince), then what's ticked; at most 36.
 */
export function kitchenChips(data: AppState, all: Food[], have: string[]): string[] {
  const candidates = kitchenCandidates(data.recipes, recentFoods(data, all, 20).map((f) => f.n), all)
  const byName = new Map(all.map((f) => [f.n, f]))
  const fits = (n: string) => dietFit(byName.get(n) ?? { n }, data.profile.diet) !== 'conflict'
  return [...new Set([...candidates.filter(fits), ...have])].slice(0, 36)
}

/** "Add something else": up to six foods not already chips, never a made dish. */
export function kitchenAdds(all: Food[], chips: string[], q: string): Food[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  const words = queryWords(query)
  return rankByName(all, (f) => f.n, words.length ? words : [query], (f) => f.aka).filter((f) => !chips.includes(f.n) && !isMadeFood(f)).slice(0, 6)
}

/** "Swap Beef mince → Quorn pieces (−64 kcal, −9 g protein per serving)", or "Contains meat: …". */
export function swapText(w: Swap, gentle: boolean, servings: number): string {
  if (!w.to) return `Contains ${w.reason}: ${w.from} (leave out or use a plant version)`
  const sign = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(Math.round(x / servings))
  // per serving, like the protein figure beside it
  const d = w.delta ? ` (${gentle ? '' : `${sign(w.delta.k)} kcal, `}${sign(w.delta.p)} g protein per serving)` : ''
  return `Swap ${w.from} → ${w.to.n}${d}`
}

// ───────────────────────── quick estimate and create a food ─────────────────────────

/**
 * A typed number; anything unreadable is 0. A phone's decimal pad types a comma in regions that use
 * one ("12,5" is 12.5); a pasted thousands separator ("1,200") is a thousand. The web's number
 * fields never pass a comma, so for them this is plain parseFloat.
 */
export function numIn(v: string): number {
  const s = v.trim()
  // a thousands separator never follows a leading 0 ("0,125" is a decimal). In a comma region "1,250"
  // typed for 1.25 reads as 1250: three decimals are rare on UK labels and amounts, so the paste wins
  const n = /^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '')
    // a pasted European "1.234,5": dots group the thousands, the comma is the decimal
    : /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(',', '.')
  return parseFloat(n) || 0
}

/** The quick estimate as an entry, or null without calories. */
export function quickEntry(f: { n: string; k: string; p: string; c: string; fat: string }, meal: MealSlot, err: number): LoggedFood | null {
  const k = numIn(f.k)
  if (k <= 0) return null
  return { n: f.n.trim() || 'Quick estimate', grams: 0, k, p: numIn(f.p), c: numIn(f.c), f: numIn(f.fat), meal, src: 'quick', how: 'quick', err }
}
