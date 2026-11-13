/**
 * The guided session's reach outside the player (native only).
 * - `guidedSessionOpen()` / `onGuidedSession()`: whether the guided player is on screen, for N12's
 *   notification tap handler, which must not navigate away from a session in progress. Player
 *   state, not store state.
 * - The rest that keeps running in the background (Benn, 13 Nov): when the app goes to the
 *   background during rest, Train asks for one alert at the moment rest ends and cancels it when
 *   the app comes back or rest is over. Notifications are N12's (its handler, permission, budget),
 *   so N12 registers the scheduler with `setRestAlerter`; until it does, nothing is scheduled.
 *   Train never asks for permission. The words are REST_ALERT in src/copy/train.ts.
 */
import { REST_ALERT } from '@/copy/train'

let open = false
const listeners = new Set<(open: boolean) => void>()
export const guidedSessionOpen = (): boolean => open
export function onGuidedSession(f: (open: boolean) => void): () => void { listeners.add(f); return () => { listeners.delete(f) } }
export function setGuidedSessionOpen(v: boolean): void { if (open !== v) { open = v; listeners.forEach((f) => f(v)) } }

/**
 * What the rest-end alert carries. `kind` lets N12 keep it out of the reminder budget and leave the
 * session on a tap; `sound` is the player's own Sound choice (false: a silent banner).
 */
export interface RestAlert { title: string; body: string; seconds: number; sound: boolean; kind: 'tilo-rest' }
/**
 * N12's side (mental-performance, 13 Nov): `schedule` resolves to an id, or null when not allowed
 * (no permission: never ask). `cancel(id)` must both unschedule it and remove it from the tray if it
 * already arrived, so nothing is left behind after the person has come back, finished or stopped.
 * One alert per background stretch, no repeats or follow-ups, no badge, never counted as engagement
 * or disengagement; iOS interruption level `active`, Android its own "Rest timer" channel at default
 * importance (Do Not Disturb and Focus always win); exempt from Tilo's quiet hours by decision.
 */
export interface RestAlerter { schedule: (a: RestAlert) => Promise<string | null>; cancel: (id: string) => Promise<void> }

let alerter: RestAlerter | null = null
let scheduled: string | null = null
export function setRestAlerter(a: RestAlerter | null): void { alerter = a }

/** `endsAt` in ms; `next` is the line the web announces ("Set 2 of 3, Barbell squat"). */
export async function scheduleRestAlert(endsAt: number, next: string, sound: boolean): Promise<void> {
  await cancelRestAlert()
  const seconds = Math.round((endsAt - Date.now()) / 1000)
  if (!alerter || seconds < 2) return
  try {
    scheduled = await alerter.schedule({ title: REST_ALERT.title, body: REST_ALERT.body(next), seconds, sound, kind: 'tilo-rest' })
  } catch { scheduled = null }
}

export async function cancelRestAlert(): Promise<void> {
  const id = scheduled
  scheduled = null
  if (id && alerter) await alerter.cancel(id).catch(() => {})
}
