import type { Workout } from '@/core/types'
import { CARDIO_MET } from '@/core/data/constants'

/** Estimated calories burned for a logged workout, used to extend the daily budget. */
export function workoutBurn(wk: Workout | null | undefined, bodyKg: number | null): number {
  if (!wk || !wk.type) return 0
  const kg = bodyKg || 75
  if (wk.type === 'Cardio') {
    const mins = parseFloat(wk.mins || '') || 25
    const met = CARDIO_MET[wk.cardioType || ''] || 4.0
    return Math.round(met * kg * (mins / 60))
  }
  // ~45 min strength session
  return Math.round(3.5 * kg * 0.75)
}

/** YouTube search link for an exercise's technique. */
export function howToLink(name: string): string {
  return (
    'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(name + ' exercise proper form technique')
  )
}
