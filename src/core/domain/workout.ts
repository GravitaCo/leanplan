import type { Workout } from '@/core/types'
import { CARDIO_MET } from '@/core/data/constants'

/** MET and hours for a logged workout (Compendium MET × time; see constants.ts). */
function metHours(wk: Workout): { met: number; hours: number } {
  if (wk.type === 'Cardio') {
    const mins = parseFloat(wk.mins || '') || 25
    return { met: CARDIO_MET[wk.cardioType || ''] || 4.0, hours: mins / 60 }
  }
  // ~45 min strength session
  return { met: 3.5, hours: 0.75 }
}

/** Estimated gross calories burned for a logged workout (MET × kg × hours). */
export function workoutBurn(wk: Workout | null | undefined, bodyKg: number | null): number {
  if (!wk || !wk.type) return 0
  const { met, hours } = metHours(wk)
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
