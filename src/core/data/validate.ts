/**
 * Food data validation: the gate every food passes before it ships, whether it's in the
 * bundled database or (later) a downloaded food pack. Pure TS, so the same rules run in
 * `npm run check:foods` and on device.
 */
import type { Food } from '@/core/types'
import { checkPer100 } from '@/core/domain/checks'
import { SOURCES } from './sources'

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
      if (!SOURCES[f.src.split(':')[0]]) errors.push(`${id}: unknown source "${f.src}"`)
    } else unsourced.push(id)
    for (const c of checkPer100(f, { k: true, macros: true }, !!f.each)) {
      ;(c.level === 'warn' ? errors : warnings).push(`${id}: ${c.msg}`)
    }
  }
  return { errors, warnings, unsourced }
}
