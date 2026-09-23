/**
 * Read-only views over the log: target ranges, neutral day status, learned habits
 * (usual portions and meals) and weekly trends. Pure TS, no framework.
 *
 * Framing rules (from the product's psychological-safety principles): targets are a
 * range not a limit, wording is neutral, consistency is days logged (never a streak to
 * lose), and weight is shown as a weekly trend rather than the daily bounce.
 */
import type { AppState, DayLog, FatChoice, Food, IfThenPlan, LoggedFood, MealSlot, Profile, Recipe, RecipeItem } from '@/core/types'
import { parseYmd, shiftDay, todayStr, ymd } from './date'
import { dayTotals, roundAmount, scaleFood, unitOf, type MacroTotals } from './nutrition'
import { workoutBurn, workoutNetBurn } from './workout'
import { FOODS } from '@/core/data/foods'

const FOOD_BY_NAME = new Map(FOODS.map((f) => [f.n, f]))
const d1 = (x: number) => Math.round(x * 10) / 10

export const MEALS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']
export const MEAL_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }

export const MOODS = ['Rough', 'Low', 'Okay', 'Good', 'Great']
export const HUNGER = ['Starving', 'Hungry', 'Satisfied', 'Full', 'Stuffed']

const DEFAULT_RANGE = 100
const EMPTY_DAY: DayLog = { foods: [], supps: {}, weight: null, workout: null, checkin: null }

export function dayOf(s: AppState, d: string): DayLog {
  return s.days[d] || EMPTY_DAY
}
export function rangeWidth(p: Profile): number {
  return p.rangeWidth != null && p.rangeWidth >= 0 ? p.rangeWidth : DEFAULT_RANGE
}
export function mealNow(): MealSlot {
  const h = new Date().getHours()
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 20 ? 'dinner' : 'snack'
}

/** Most recent logged bodyweight on or before `d` (falls back to the profile). */
export function latestWeight(s: AppState, d: string): number | null {
  if (s.days[d]?.weight) return s.days[d].weight
  for (const k of Object.keys(s.days).sort().reverse()) if (k <= d && s.days[k]?.weight) return s.days[k].weight
  return s.profile.weight ?? null
}

export interface Range { mid: number; lo: number; hi: number }
/**
 * Calories a logged workout adds to the day's range. From `profile.burnSwitch` on, nothing for
 * most people, because their activity level already counts their training (it was counted
 * twice); sedentary users, whose level counts none, get the net burn. Days before the switch keep
 * the old gross figure so history never moves.
 */
export function rangeExtra(s: AppState, d: string): number {
  const wk = dayOf(s, d).workout
  const kg = latestWeight(s, d)
  const sw = s.profile.burnSwitch
  if (!sw || d < sw) return workoutBurn(wk, kg)
  return s.profile.activityLevel === 'sedentary' ? workoutNetBurn(wk, kg) : 0
}

/** Whether to show the one-time note about the change: only to people it affected. */
export function showBurnNote(s: AppState): boolean {
  const sw = s.profile.burnSwitch
  if (!sw || s.profile.burnNoteSeen) return false
  return Object.keys(s.days).some((d) => d < sw && !!s.days[d]?.workout)
}

/** The day's target (plus any workout allowance, see rangeExtra) ± the user's range width. */
export function rangeFor(s: AppState, d: string): Range {
  const mid = s.target.kcal + rangeExtra(s, d)
  const w = rangeWidth(s.profile)
  return { mid, lo: mid - w, hi: mid + w }
}

export interface DayStatus { word: string; short: string; gentle: string }
export function energyStatus(k: number, r: Range): DayStatus {
  const fmt = (x: number) => Math.round(x).toLocaleString('en-GB')
  if (k <= 0) return { word: 'Nothing logged yet', short: 'Not started', gentle: 'Nothing logged yet' }
  if (k < r.lo) {
    const lots = k < r.lo - 500
    return { word: `About ${fmt(r.mid - k)} kcal to go`, short: lots ? 'Plenty of room' : 'Some room', gentle: lots ? 'Plenty of room left' : 'Some room left' }
  }
  if (k <= r.hi) return { word: 'In your range', short: 'In range', gentle: 'In your range' }
  return { word: `${fmt(k - r.hi)} kcal above your range`, short: 'Above range', gentle: 'Above your range, and that’s okay' }
}

/** The most recent time this food was logged — drives "your usual" portions. */
export function lastUse(s: AppState, name: string): LoggedFood | null {
  for (const d of Object.keys(s.days).sort().reverse()) {
    const fs = s.days[d].foods || []
    for (let i = fs.length - 1; i >= 0; i--) if (fs[i].n === name && fs[i].src !== 'fat') return fs[i]
  }
  return null
}

/**
 * How this food was cooked last time it was logged with a cooking-fat answer — remembered
 * per food, so "1 tbsp oil" for chicken never becomes the default for a salad.
 */
export function lastFatFor(s: AppState, name: string): FatChoice | null {
  return lastUse(s, name)?.fatChoice ?? null
}
/** A usual food plus the cooking fat it was logged with, ready to re-log. */
export function usualEntries(s: AppState, name: string, meal: MealSlot): LoggedFood[] {
  for (const d of Object.keys(s.days).sort().reverse()) {
    const fs = s.days[d].foods || []
    for (let i = fs.length - 1; i >= 0; i--) {
      if (fs[i].n !== name || fs[i].src === 'fat') continue
      // a cooking-fat entry is logged straight after its food
      const next = fs[i + 1]
      const fat = next?.src === 'fat' && next.fatFor === name ? [relog(next, meal)] : []
      return [relog(fs[i], meal), ...fat]
    }
  }
  return []
}

/* ---- recipes: the user's own meals come first ----
   Home-cooked meals are where the user holds the ground truth, so once a meal is a
   recipe, logging it again should take one tap (or, later, just saying its name). */

/** Date a recipe was last logged, or '' if never. */
function recipeLastLogged(s: AppState, name: string): string {
  for (const d of Object.keys(s.days).sort().reverse()) {
    if ((s.days[d].foods || []).some((x) => x.src === 'recipe' && x.n === name)) return d
  }
  return ''
}
/** Recipe indexes, most recently logged first, then alphabetical. */
export function recipesByUse(s: AppState): number[] {
  const last = s.recipes.map((r) => recipeLastLogged(s, r.name))
  return s.recipes.map((_, i) => i).sort((a, b) => last[b].localeCompare(last[a]) || s.recipes[a].name.localeCompare(s.recipes[b].name))
}
/** How many servings the user usually has of this recipe (last time), default 1. */
export function recipeServing(s: AppState, name: string): number {
  for (const d of Object.keys(s.days).sort().reverse()) {
    const hit = (s.days[d].foods || []).filter((x) => x.src === 'recipe' && x.n === name).pop()
    if (hit) return hit.serv ?? 1
  }
  return 1
}
/** Words that carry no meaning in a food query ("my curry", "a bowl of the chilli"). */
const FILLER = new Set(['my', 'the', 'a', 'an', 'some', 'of', 'bowl', 'plate', 'usual', 'i', 'had'])
/** Split a free-text food query into meaningful words. */
export function queryWords(text: string): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter((w) => w && !FILLER.has(w))
}
/**
 * Resolve free text ("my curry", "chicken curry") to a saved recipe: exact name, then all
 * words present, most recently used first. This is the hook a conversational or voice
 * logger uses so a repeat meal needs only its name.
 */
export function findRecipe(s: AppState, text: string): Recipe | null {
  const words = queryWords(text)
  if (!words.length) return null
  const order = recipesByUse(s).map((i) => s.recipes[i])
  const exact = order.find((r) => r.name.toLowerCase() === text.trim().toLowerCase())
  return exact ?? order.find((r) => words.every((w) => r.name.toLowerCase().includes(w))) ?? null
}
/**
 * Turn logged entries (e.g. tonight's dinner, oil included) into recipe ingredients so a
 * meal already logged never has to be typed in again. Quick estimates without a weight
 * become a 100 g item whose per-100 values are the whole estimate.
 */
export function recipeItemsFrom(entries: LoggedFood[]): RecipeItem[] {
  return entries.map((x) => {
    if (!x.grams) return { n: x.n, grams: 100, k: x.k, p: x.p, c: x.c, f: x.f }
    const each = x.unit === 'item'
    const m = (each ? 1 : 100) / x.grams
    const item: RecipeItem = { n: x.n, grams: x.grams, k: +(x.k * m).toFixed(1), p: +(x.p * m).toFixed(1), c: +(x.c * m).toFixed(1), f: +(x.f * m).toFixed(1) }
    if (x.unit === 'ml') item.ml = true
    if (each) item.each = true
    return item
  })
}

export interface Usual { n: string; count: number; last: LoggedFood }
/** Foods eaten in this meal slot on 2+ of the 21 days before `cur`, not yet logged on `cur`. */
export function usuals(s: AppState, cur: string, meal: MealSlot): Usual[] {
  const days = Object.keys(s.days).filter((d) => d < cur).sort().reverse().slice(0, 21)
  const counts: Record<string, Usual> = {}
  for (const d of days) {
    const seen = new Set<string>()
    for (const x of s.days[d].foods || []) {
      if (x.meal !== meal || x.src === 'fat' || seen.has(x.n)) continue
      seen.add(x.n)
      if (!counts[x.n]) counts[x.n] = { n: x.n, count: 0, last: x }
      counts[x.n].count++
    }
  }
  const logged = new Set(dayOf(s, cur).foods.filter((x) => x.meal === meal).map((x) => x.n))
  return Object.values(counts).filter((c) => c.count >= 2 && !logged.has(c.n)).sort((a, b) => b.count - a.count).slice(0, 4)
}
/**
 * The amount an earlier entry really meant, in today's data. Logged as servings, it's today's
 * exact serving: older builds stored servings rounded to whole grams (a 119.5 g bacon roll as
 * 120 g), so a stored amount that equals the old rounded serving (or the exact one) is rebuilt.
 * Anything else (weighed, hand, edited) keeps its stored amount.
 */
export function entryAmount(x: LoggedFood, food: Food): number {
  if (x.serv != null) {
    const s = x.serv, exact = food.g * s
    // older builds stored the serving itself as whole grams (either way on a .5), then rounded
    // serving × count again: 119.5 g stored as 120, so 2 rolls were saved as 240 g
    const oldServing = [Math.floor(food.g), Math.ceil(food.g)]
    if (Math.abs(x.grams - exact) < 0.0005 || x.grams === Math.round(exact) || oldServing.some((G) => Math.round(G * s) === x.grams)) {
      return roundAmount(exact, unitOf(food))
    }
  }
  return x.grams
}

/**
 * Re-log an earlier entry (one-tap usuals, "same as yesterday"). A database food is re-scaled
 * from today's data, so a corrected value (e.g. a chain's published figure) is never re-served
 * from an old snapshot. Same amount and unit; anything else keeps its logged numbers.
 */
export function relog(x: LoggedFood, meal: MealSlot): LoggedFood {
  const { ok: _ok, ...rest } = x
  const out: LoggedFood = { ...rest, meal, how: x.how === 'hand' || x.how === 'quick' || x.how === 'recipe' || x.src === 'fat' ? x.how : 'usual' }
  const food = x.src === 'db' ? FOOD_BY_NAME.get(x.n) : undefined
  if (food && x.grams && unitOf(food) === (x.unit ?? 'g')) {
    const amount = entryAmount(x, food)
    const s = scaleFood(food, amount)
    Object.assign(out, { grams: amount, k: d1(s.k), p: d1(s.p), c: d1(s.c), f: d1(s.f) })
  }
  return out
}
export function mealEntries(s: AppState, d: string, meal: MealSlot): LoggedFood[] {
  return dayOf(s, d).foods.filter((x) => x.meal === meal)
}
export function recentFoods(s: AppState, all: Food[], limit = 8): Food[] {
  const seen = new Set<string>()
  const out: Food[] = []
  for (const d of Object.keys(s.days).sort().reverse().slice(0, 14)) {
    for (const x of s.days[d].foods || []) {
      if (seen.has(x.n)) continue
      seen.add(x.n)
      const m = all.find((f) => f.n === x.n)
      if (m) out.push(m)
      if (out.length >= limit) return out
    }
  }
  return out
}

/** Monday–Sunday of the week containing `d`. */
export function weekOf(d: string): string[] {
  const b = parseYmd(d)
  const off = (b.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(b); x.setDate(b.getDate() + i - off); return ymd(x) })
}

export interface DayStat { d: string; t: MacroTotals; r: Range; logged: boolean; future: boolean; done: boolean; planned: boolean; inRange: boolean }
export function dayStat(s: AppState, d: string): DayStat {
  const x = dayOf(s, d)
  const t = dayTotals(x)
  const r = rangeFor(s, d)
  return {
    d, t, r,
    logged: x.foods.length > 0,
    future: d > todayStr(),
    done: !!x.workout?.type,
    planned: (s.schedule[parseYmd(d).getDay()] || 'Rest') !== 'Rest',
    inRange: t.k >= r.lo && t.k <= r.hi,
  }
}
export function avg(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}

export interface WeekSummary { avgK: number; avgP: number; logged: number; inRange: number; prevAvgP: number | null; planned: number; done: number }
/** Averages use finished days only — today is still in progress and shouldn't count as a miss. */
export function weekSummary(s: AppState, rows: DayStat[]): WeekSummary {
  const today = todayStr()
  const lg = rows.filter((x) => x.logged && x.d < today)
  const prev = weekOf(shiftDay(rows[0].d, -7)).map((d) => dayStat(s, d)).filter((x) => x.logged && x.d < today)
  return {
    avgK: avg(lg.map((x) => x.t.k)),
    avgP: avg(lg.map((x) => x.t.p)),
    logged: lg.length,
    inRange: lg.filter((x) => x.inRange).length,
    prevAvgP: prev.length >= 2 ? avg(prev.map((x) => x.t.p)) : null,
    planned: rows.filter((x) => x.planned).length,
    // sessions done on planned days, so an extra walk doesn't read as a planned lift
    done: rows.filter((x) => x.planned && x.done).length,
  }
}

export function weightSeries(s: AppState, upTo: string, n: number): number[] {
  return Object.keys(s.days).filter((d) => s.days[d].weight && d <= upTo).sort().slice(-n).map((d) => s.days[d].weight as number)
}
/** Weekly average vs the week before — the trend, not the daily bounce. */
export function weightWeekDelta(s: AppState, cur: string): number | null {
  const pick = (from: number, to: number) => {
    const v: number[] = []
    for (let i = from; i < to; i++) { const w = dayOf(s, shiftDay(cur, -i)).weight; if (w) v.push(w) }
    return v
  }
  const a = pick(0, 7), b = pick(7, 14)
  return a.length && b.length ? Math.round((avg(a) - avg(b)) * 10) / 10 : null
}

/** Plans not reviewed (or created) within the last week. */
export function plansDue(p: Profile, today = todayStr()): IfThenPlan[] {
  const days = (a: string) => Math.round((parseYmd(today).getTime() - parseYmd(a).getTime()) / 864e5)
  return (p.plans ?? []).filter((pl) => days(pl.lastReview || pl.created || today) >= 7)
}
