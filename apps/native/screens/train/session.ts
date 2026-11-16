/**
 * The guided session's reach outside the player (native only).
 * - `guidedSessionOpen()` / `onGuidedSession()`: whether the guided player is on screen (player
 *   state, not store state), for anything that must not navigate away from a session in progress.
 * - The rest that keeps running in the background (Benn, 13 Nov): when the app goes to the
 *   background during rest, one notification is scheduled for the moment rest ends, through N12's
 *   lib/platform/restTimer (one at a time, outside the reminder budget and quiet hours, never asks
 *   for permission, a tap opens Train); it's cancelled, and removed from the tray if it already
 *   arrived, when the app comes back, rest ends or is skipped, or the player closes. The words are
 *   REST_ALERT in src/copy/train.ts (mental-performance approved, 13 Nov).
 */
import { REST_ALERT } from '@/copy/train'
import { cancelRestEnd, scheduleRestEnd } from '../../lib/platform/restTimer'

let open = false
const listeners = new Set<(open: boolean) => void>()
export const guidedSessionOpen = (): boolean => open
export function onGuidedSession(f: (open: boolean) => void): () => void { listeners.add(f); return () => { listeners.delete(f) } }
export function setGuidedSessionOpen(v: boolean): void { if (open !== v) { open = v; listeners.forEach((f) => f(v)) } }

/** N12's scheduler, as an object so the unit tests can stand in for the platform. */
export const restTimer = { schedule: scheduleRestEnd, cancel: cancelRestEnd }

/**
 * `endsAt` in ms; `next` is the line the web announces ("Set 2 of 3, Barbell squat"). `sound` is the
 * player's Sound choice. TODO(N12): restTimer always plays the default sound; mental-performance asks
 * for a silent banner when Sound is off (asked of the lead, 13 Nov).
 */
export async function scheduleRestAlert(endsAt: number, next: string, sound: boolean): Promise<void> {
  void sound
  const seconds = Math.round((endsAt - Date.now()) / 1000)
  if (seconds < 2) { await cancelRestAlert(); return }
  await restTimer.schedule(seconds, { title: REST_ALERT.title, body: REST_ALERT.body(next) }).catch(() => false)
}

export async function cancelRestAlert(): Promise<void> {
  await restTimer.cancel().catch(() => undefined)
}
