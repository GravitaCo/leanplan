import { MIN_AGE } from '@/core/legal'

/**
 * Tali is strictly 18+ (Benn, Sept 2026). The one rule for every path an age can come in by:
 * the wizard, Profile, a restored backup, cloud sync and the launch check. A missing age is not
 * under age (it takes the safe defaults instead). A numeric string (a hand-edited backup) counts
 * as its number; anything else that isn't a finite number is ignored.
 */
export function isUnderAge(age: number | string | null | undefined): boolean {
  const n = typeof age === 'string' && age.trim() !== '' ? Number(age) : age
  return typeof n === 'number' && Number.isFinite(n) && n < MIN_AGE
}

export { MIN_AGE }
