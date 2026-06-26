import type { DayLog, Food, Recipe, Profile, ActivityLevel } from '@/core/types'
import { ACTIVITY } from '@/core/data/constants'

export interface MacroTotals {
  k: number
  p: number
  c: number
  f: number
}

export function dayTotals(day: DayLog | undefined): MacroTotals {
  const t: MacroTotals = { k: 0, p: 0, c: 0, f: 0 }
  if (!day) return t
  for (const x of day.foods) {
    t.k += x.k
    t.p += x.p
    t.c += x.c
    t.f += x.f
  }
  return t
}

/** Scale a per-100g food to a portion in grams, producing an absolute macro entry. */
export function scaleFood(f: Food, grams: number): MacroTotals & { g: number } {
  const m = grams / 100
  return { g: grams, k: f.k * m, p: f.p * m, c: f.c * m, f: f.f * m }
}

export function recipeTotals(r: Recipe): MacroTotals & { g: number } {
  const t = { k: 0, p: 0, c: 0, f: 0, g: 0 }
  for (const i of r.items || []) {
    const m = (i.grams || 0) / 100
    t.k += (i.k || 0) * m
    t.p += (i.p || 0) * m
    t.c += (i.c || 0) * m
    t.f += (i.f || 0) * m
    t.g += i.grams || 0
  }
  return t
}

export function recipePerServing(r: Recipe): MacroTotals & { g: number } {
  const t = recipeTotals(r)
  const s = +r.servings || 1
  return { k: t.k / s, p: t.p / s, c: t.c / s, f: t.f / s, g: t.g / s }
}

export interface SuggestedTargets {
  maint: number
  kcal: number
  p: number
  c: number
  f: number
}

/** Mifflin–St Jeor maintenance + a 500 kcal fat-loss deficit, with macro split. */
export function suggestedTargets(profile: Profile, weight: number | null): SuggestedTargets | null {
  if (!profile.age || !profile.height || !weight) return null
  const bmr =
    profile.sex === 'F'
      ? 10 * weight + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * weight + 6.25 * profile.height - 5 * profile.age + 5
  const mult = (ACTIVITY[profile.activityLevel as ActivityLevel] || ACTIVITY.light).mult
  const maint = Math.round(bmr * mult)
  const kcal = Math.max(1200, maint - 500)
  const protein = Math.round(weight * 1.8)
  const carbs = Math.round((kcal * 0.4) / 4)
  const fat = Math.round((kcal - protein * 4 - carbs * 4) / 9)
  return { maint, kcal, p: protein, c: Math.max(carbs, 0), f: Math.max(fat, 0) }
}

/** Progress class for a calorie bar: '' under, 'warn' near, 'over' past budget. */
export function budgetClass(eaten: number, budget: number): '' | 'warn' | 'over' {
  const pct = budget ? (eaten / budget) * 100 : 0
  if (pct > 100) return 'over'
  if (pct >= 90) return 'warn'
  return ''
}

export function macroPct(value: number, goal: number): number {
  return Math.min(100, goal ? (value / goal) * 100 : 0)
}
