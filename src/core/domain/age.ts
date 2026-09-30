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

/**
 * Supplement reminders while the 18+ stop shows (Benn, Sept 2026): this device's push
 * subscription ends, best-effort, and comes back when the stop goes without a deletion.
 * `stopped`: the stop is showing; `enabled`: the person's reminder setting; `held`: reminders
 * were paused for the stop on this device. 'hold' marks them held and unsubscribes; 'retry'
 * unsubscribes again (a failed attempt, or a new launch); 'restore' re-registers them, or turns
 * the setting off when that can't happen without asking.
 */
export type ReminderAction = 'hold' | 'retry' | 'restore' | null
export function reminderAction(o: { stopped: boolean; enabled: boolean; held: boolean }): ReminderAction {
  if (o.stopped) return o.held ? 'retry' : o.enabled ? 'hold' : null
  return o.held ? 'restore' : null
}
