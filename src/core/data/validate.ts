/**
 * Food data validation: the gate every food passes before it ships, whether it's in the
 * bundled database or (later) a downloaded food pack. Pure TS, so the same rules run in
 * `npm run check:foods` and on device.
 */
import type { Food } from '@/core/types'
import { checkPer100 } from '@/core/domain/checks'
import { scaleFood } from '@/core/domain/nutrition'
import { SOURCES } from './sources'

/** Published macros are rounded to 0.1 g (small values to whole grams), so allow that much. */
const MACRO_TOL = 0.15

/**
 * The guardrail against "stored values right, screen wrong": when a source publishes its own
 * figure for an amount, scaling the stored values to that amount must reproduce it (kcal to
 * the unit, macros to 0.1 g). Returns the problems, or [] if the food reproduces its source.
 */
export function refMismatches(f: Food): string[] {
  if (!f.ref) return []
  const s = scaleFood(f, f.ref.g)
  const out: string[] = []
  // the default serving is what users tap: it must be the published amount itself, unless the
  // name states a pack size ("…500ml") and the serving is that size. A rounded portion
  // (119.5 g stored as 120 g) is exactly the bacon-roll bug.
  // (A per-100 reference, like a pack label's column, doesn't constrain the serving.)
  const pack = f.n.match(/(\d+(?:\.\d+)?)\s*(ml|g)$/)
  const perBasis = f.ref.g === (f.each ? 1 : 100)
  if (!perBasis && f.g !== f.ref.g && !(pack && +pack[1] === f.g)) out.push(`default serving ${f.g} differs from the published amount ${f.ref.g}`)
  if (Math.round(s.k) !== Math.round(f.ref.k)) out.push(`${f.ref.g} ${f.each ? 'item' : f.ml ? 'ml' : 'g'} shows ${Math.round(s.k)} kcal, source says ${f.ref.k}`)
  for (const m of ['p', 'c', 'f'] as const) {
    const want = f.ref[m]
    if (want !== undefined && Math.abs(s[m] - want) > MACRO_TOL) out.push(`${m} ${Math.round(s[m] * 10) / 10} g vs source ${want} g`)
  }
  return out
}

export interface FoodReport {
  errors: string[]
  /** real but explainable issues, e.g. alcohol calories the macros don't cover */
  warnings: string[]
  /** foods with no cited source yet (shown in the app as "Source not yet checked") */
  unsourced: string[]
}

export function validateFoods(foods: Food[]): FoodReport {
  const errors: string[] = [], warnings: string[] = [], unsourced: string[] = []
  const seen = new Set<string>()
  for (const f of foods) {
    const id = f.n || '(no name)'
    if (!f.n?.trim()) errors.push(`${id}: missing name`)
    const key = f.n?.trim().toLowerCase()
    if (key && seen.has(key)) errors.push(`${id}: duplicate name`)
    if (key) seen.add(key)
    if (![f.k, f.p, f.c, f.f, f.g].every((x) => typeof x === 'number' && Number.isFinite(x))) { errors.push(`${id}: non-numeric value`); continue }
    if (!(f.g > 0)) errors.push(`${id}: serving must be > 0`)
    if (f.each && f.ml) errors.push(`${id}: can't be both per item and per ml`)
    if (f.src) {
      const s = SOURCES[f.src.split(':')[0]]
      if (!s) errors.push(`${id}: unknown source "${f.src}"`)
      // menu-label sources publish per-portion or per-item figures: those must be recorded
      else if (s.err && !f.ref) errors.push(`${id}: ${s.label} food has no published figure (ref) to check against`)
    } else unsourced.push(id)
    for (const m of refMismatches(f)) errors.push(`${id}: doesn't match its source: ${m}`)
    for (const c of checkPer100(f, { k: true, macros: true }, !!f.each)) {
      ;(c.level === 'warn' ? errors : warnings).push(`${id}: ${c.msg}`)
    }
  }
  return { errors, warnings, unsourced }
}
