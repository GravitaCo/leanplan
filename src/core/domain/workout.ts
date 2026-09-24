import type { Workout } from '@/core/types'
import { CARDIO_MET, LEGACY_CARDIO_MET } from '@/core/data/constants'

/**
 * MET and hours for a logged workout (Compendium MET × time; see constants.ts). A blank or
 * unknown cardio type counts as 'Other'. `legacy` reproduces the pre-audit values exactly, for
 * days before the switch.
 */
function metHours(wk: Workout, legacy = false): { met: number; hours: number } {
  if (wk.type === 'Cardio') {
    // blank means the default 25; a typed 0 means 0 (legacy days keep the old "0 → 25" exactly)
    const typed = parseFloat(wk.mins || '')
    const mins = legacy ? typed || 25 : Number.isFinite(typed) ? typed : 25
    const t = wk.cardioType || ''
    // legacy: the old table for old keys; a type added since (only possible on a past day logged
    // after the update) takes its cited value; blank or unknown kept the old 4.0
    const met = legacy ? LEGACY_CARDIO_MET[t] ?? (t ? CARDIO_MET[t] : undefined) ?? 4.0 : CARDIO_MET[t] ?? CARDIO_MET.Other
    return { met, hours: mins / 60 }
  }
  // ~45 min strength session
  return { met: 3.5, hours: 0.75 }
}

/**
 * Whether a logged workout counts as a training session for the activity-level suggestion
 * (workout plan P1.5): 20+ minutes at 3.0+ MET. Strength counts (45 min at 3.5); a 10-minute
 * mobility swap or easy walk doesn't.
 */
export function isTrainingSession(wk: Workout | null | undefined): boolean {
  if (!wk || !wk.type) return false
  const { met, hours } = metHours(wk)
  return met >= 3.0 && hours * 60 >= 20
}

/** Estimated gross calories burned for a logged workout (MET × kg × hours). */
export function workoutBurn(wk: Workout | null | undefined, bodyKg: number | null, legacy = false): number {
  if (!wk || !wk.type) return 0
  const { met, hours } = metHours(wk, legacy)
  return Math.round(met * (bodyKg || 75) * hours)
}

/**
 * Net calories: the gross burn minus the resting energy (1 MET) that maintenance already covers
 * for that time. Only used for sedentary users, whose activity level counts no training.
 */
export function workoutNetBurn(wk: Workout | null | undefined, bodyKg: number | null): number {
  if (!wk || !wk.type) return 0
  const { met, hours } = metHours(wk)
  return Math.round(Math.max(met - 1, 0) * (bodyKg || 75) * hours)
}

/** YouTube search link for an exercise's technique. */
export function howToLink(name: string): string {
  return (
    'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(name + ' exercise proper form technique')
  )
}
