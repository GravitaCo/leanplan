/**
 * Train's background rest timer (Benn approved, 13 Nov 2026; N7 owns the screen and the words):
 * one local notification when rest ends while the app is in the background. Not a reminder: it's
 * outside the one-a-day budget and quiet hours, never recorded in the delivery log (its data has no
 * Mind type), and goes to no server. One at a time: scheduling again replaces it.
 *
 * It never asks for permission (when to ask is N7's call, through askPushPermission in ./push);
 * without permission it schedules nothing and says so. While the app is open it isn't shown
 * (./notifications.ts): the player's own timer is on screen. A tap opens Train.
 *
 * N7's contract (screens/train/session.ts, mental-performance 13 Nov 2026): one alert, no repeats,
 * no badge; iOS interruption level `active` (Focus and Do Not Disturb always win); sound follows the
 * player's Sound toggle (`sound: false` is a silent banner); cancel also clears it from the tray.
 */
import * as Notifications from 'expo-notifications'
import { pushPermission, pushSupported } from './push'
import { restContent, restSeconds } from './pushRules'

/** The one rest notification's identifier (a new one replaces it). */
export const REST_ID = 'tali-rest-end'

/** Schedule "rest is over" in `seconds` with N7's words. False when nothing was scheduled. */
export async function scheduleRestEnd(seconds: number, copy: { title: string; body: string; sound?: boolean }): Promise<boolean> {
  const s = restSeconds(seconds)
  if (!pushSupported() || s === null || pushPermission() !== 'granted' || !copy.title.trim()) return false
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_ID).catch(() => undefined)
    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: restContent(copy),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: s },
    })
    return true
  } catch {
    return false
  }
}

/** Cancel it (rest skipped, ended early or the session closed), and remove it if it already showed. */
export async function cancelRestEnd(): Promise<void> {
  if (!pushSupported()) return
  await Notifications.cancelScheduledNotificationAsync(REST_ID).catch(() => undefined)
  await Notifications.dismissNotificationAsync(REST_ID).catch(() => undefined)
}
