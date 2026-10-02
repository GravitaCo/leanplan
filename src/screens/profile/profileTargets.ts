import type { AppState } from '@/core/types'
import { foodModeOf } from '@/core/domain/foodMode'
import { baseRange, rangeWidth } from '@/core/domain/insights'

/**
 * The calories Profile shows, by food mode (Onboarding 9). Pure, so the tests read it too.
 * - standard: the target ± the range width, editable (as main)
 * - Sometimes: the same maintenance range as Food (baseRange: Food's own maths without the
 *   workout allowance), never a target ± width and nothing to edit; none while pregnant or
 *   breastfeeding, as Food
 * - Yes: no kcal at all, whatever the Display setting and with or without "Show a range"
 */
export type ProfileKcal =
  | { kind: 'target'; lo: number; hi: number }
  | { kind: 'range'; lo: number; hi: number }
  | { kind: 'none' }

export function profileKcal(s: AppState, today: string): ProfileKcal {
  const p = s.profile
  const mode = foodModeOf(p)
  if (mode === 'yes') return { kind: 'none' }
  if (mode === 'sometimes') {
    if (p.pregnancy?.flagged) return { kind: 'none' }
    const r = baseRange(s, today)
    return { kind: 'range', lo: r.lo, hi: r.hi }
  }
  const w = rangeWidth(p)
  return { kind: 'target', lo: s.target.kcal - w, hi: s.target.kcal + w }
}

/**
 * The weight behind Profile's suggestion: the field when filled in, else, where the field starts
 * empty because weight isn't shown back (Sometimes and Yes), the stored weight. So a flagged
 * person sees "suggestions are off" again, and nobody is asked for a weight already stored.
 */
export function suggestionWeight(field: string, stored: number | null, weightBack: boolean): number | null {
  return parseFloat(field) || (weightBack ? null : stored)
}

/** Body and goal's save: an empty weight field leaves the stored weight alone (no weight key at all). */
export function weightPatch(field: string): { weight?: number } {
  const w = parseFloat(field)
  return w ? { weight: w } : {}
}
