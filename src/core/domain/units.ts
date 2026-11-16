import type { HeightUnit, WeightUnit } from '@/core/types'

/**
 * Unit conversions for onboarding and Profile entry (first-run-onboarding §5). Values are always
 * stored in kg and cm; these only convert what the person types or sees. The factors are exact by
 * definition (Weights and Measures Act 1985, the international yard and pound of 1959):
 * 1 lb = 0.45359237 kg, 1 st = 14 lb, 1 in = 2.54 cm, 1 ft = 12 in.
 */
export const KG_PER_LB = 0.45359237
export const LB_PER_ST = 14
export const CM_PER_IN = 2.54
export const IN_PER_FT = 12

const roundTo = (x: number, step: number) => Math.round(x / step) * step
/** trims float noise (0.1 + 0.2) without hiding real precision */
const tidy = (x: number) => Math.round(x * 1e6) / 1e6

export const kgFromLb = (lb: number): number => lb * KG_PER_LB
export const lbFromKg = (kg: number): number => kg / KG_PER_LB
export const kgFromStLb = (st: number, lb = 0): number => (st * LB_PER_ST + lb) * KG_PER_LB
export const cmFromIn = (inches: number): number => inches * CM_PER_IN
export const cmFromFtIn = (ft: number, inches = 0): number => (ft * IN_PER_FT + inches) * CM_PER_IN

/**
 * Stone and pounds for a weight, pounds rounded to `lbStep` (default ½ lb). A value that rounds up
 * to 14 lb carries into the next stone, so 10 st 13.9 lb shows as 11 st 0 lb, never 10 st 14 lb.
 */
export function stLbFromKg(kg: number, lbStep = 0.5): { st: number; lb: number } {
  const total = tidy(roundTo(lbFromKg(kg), lbStep))
  const st = Math.floor(total / LB_PER_ST)
  return { st, lb: tidy(total - st * LB_PER_ST) }
}

/** Feet and inches for a height, inches rounded to `inStep` (default ½ in), carrying 12 in into a foot. */
export function ftInFromCm(cm: number, inStep = 0.5): { ft: number; in: number } {
  const total = tidy(roundTo(cm / CM_PER_IN, inStep))
  const ft = Math.floor(total / IN_PER_FT)
  return { ft, in: tidy(total - ft * IN_PER_FT) }
}

/** A weight in the person's unit: "72.5 kg", "11 st 6 lb", "159.5 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'kg') return `${Math.round(kg * 10) / 10} kg`
  if (unit === 'lb') return `${tidy(roundTo(lbFromKg(kg), 0.5))} lb`
  const { st, lb } = stLbFromKg(kg)
  return `${st} st ${lb} lb`
}

/** A height in the person's unit: "170 cm", "5 ft 7 in". */
export function formatHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`
  const { ft, in: i } = ftInFromCm(cm)
  return `${ft} ft ${i} in`
}
