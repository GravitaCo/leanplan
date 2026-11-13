import { MIN_AGE } from '@/core/legal'

/**
 * Tilo is strictly 18+ (Benn, Sept 2026). The one rule for every path an age can come in by:
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

/**
 * After 'restore' couldn't register this device again: whether the reminder setting turns off.
 * It does, so Profile says what's true, except where this device can't take pushes at all and its
 * platform keeps the setting (`keepWithoutPush`: the native app on Android, which has no push yet;
 * iPhone has push since N12, so it follows the web's rule). The setting is the account's and syncs, so turning it off there would switch reminders off
 * on every device. Never during the stop itself.
 */
export function restoreTurnsOff(o: { registered: boolean; stopped: boolean; pushSupported: boolean; keepWithoutPush: boolean }): boolean {
  return !o.registered && !o.stopped && (o.pushSupported || !o.keepWithoutPush)
}
