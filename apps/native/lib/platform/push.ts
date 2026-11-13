/**
 * Reminders on a phone: the native side of src/data/push.ts (the shared store reaches it through
 * src/data/push.native.ts, under the same four names, so its rules run unchanged: the health yes
 * first, the 18+ stop ends this phone's registration, deletion does too).
 *
 * iPhone only for now: Apple's push service (APNs) with this phone's device token, saved in
 * push_subscriptions (./pushRules.ts). Android (Firebase Cloud Messaging) is a later step: there,
 * pushSupported() is false and Profile says reminders aren't available on this device, as it does
 * in a browser without push.
 *
 * Matching the web's behaviour:
 * - subscribePush asks for permission (no prompt once the person has answered), registers and
 *   saves the row; resubscribePush never asks.
 * - unsubscribePush ends this phone's registration first (so reminders stop even if the delete
 *   can't reach the server: Apple then answers 410 and the reminder function removes the row),
 *   then deletes its row.
 */
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { getIosPushNotificationServiceEnvironmentAsync } from 'expo-application'
import { createMMKV, type MMKV } from 'react-native-mmkv'
import { sbFetch, getUid, hasSession } from '@/data/supabase'
import { apnsPlatform, apnsToken, ASK, deletePath, parseSaved, permFrom, tokenRow, type Perm, type SavedToken } from './pushRules'

/** The browser's PushManager check: true on iPhone. */
export function pushSupported(): boolean {
  return Platform.OS === 'ios'
}

// ---- what this phone registered (device-only, not health data: a token and an account id) ----
let kv: MMKV | null = null
const store = (): MMKV | null => {
  try { return (kv ??= createMMKV({ id: 'tali-push' })) } catch { return null }
}
const KEY = 'token'
export const savedToken = (): SavedToken | null => {
  try { return parseSaved(store()?.getString(KEY)) } catch { return null }
}
const saveToken = (t: SavedToken | null) => {
  try { if (t) store()?.set(KEY, JSON.stringify(t)); else store()?.remove(KEY) } catch { /* unavailable */ }
}

// ---- permission ----
/** The phone's notification permission as the browser names it. */
export async function pushPermission(): Promise<Perm> {
  if (!pushSupported()) return 'denied'
  try { return permFrom(await Notifications.getPermissionsAsync()) } catch { return 'default' }
}

/** Ask (the system shows its prompt only while the person hasn't answered). */
export async function askPushPermission(): Promise<Perm> {
  if (!pushSupported()) return 'denied'
  try { return permFrom(await Notifications.requestPermissionsAsync(ASK)) } catch { return 'denied' }
}

// ---- registration ----
async function saveRow(token: string, platform: 'apns' | 'apns-sandbox'): Promise<boolean> {
  if (!hasSession()) return false
  const uid = getUid()
  // on_conflict names the (user_id, endpoint) key, so registering again updates the row
  const r = await sbFetch('/push_subscriptions?on_conflict=user_id,endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(tokenRow(uid, token, platform)),
  })
  if (!r.ok) throw new Error('push_subscriptions -> ' + r.status)
  // a token Apple has since replaced: its row goes (another account's row can't be reached from
  // this session; sign-out and deletion already removed it through unsubscribePush)
  const before = savedToken()
  saveToken({ token, uid, platform })
  if (before && before.uid === uid && before.token !== token) {
    await sbFetch(deletePath(before.token, before.uid), { method: 'DELETE' }).catch(() => undefined)
  }
  return true
}

async function register(): Promise<boolean> {
  try {
    const t = await Notifications.getDevicePushTokenAsync()
    const token = t.type === 'ios' ? apnsToken(t.data) : null
    if (!token) throw new Error('no APNs token')
    const env = await getIosPushNotificationServiceEnvironmentAsync().catch(() => null)
    return await saveRow(token, apnsPlatform(env))
  } catch (e) {
    console.error('Push subscribe failed:', e instanceof Error ? e.message : 'error')
    return false
  }
}

/** Register this phone again without asking (only where reminders are already allowed). */
export async function resubscribePush(): Promise<boolean> {
  if (!pushSupported() || (await pushPermission()) !== 'granted') return false
  return register()
}

export async function subscribePush(): Promise<boolean> {
  if (!pushSupported()) return false
  if ((await askPushPermission()) !== 'granted') return false
  return register()
}

/** End this phone's registration and delete its row (the row only goes while a session is still
 *  set; without one, ending the registration still stops the reminders arriving). */
export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return
  const saved = savedToken()
  if (!saved) return
  try {
    saveToken(null)
    await Notifications.unregisterForNotificationsAsync().catch(() => undefined)
    // a failed delete is ignored: the registration is already ended, so reminders stop anyway
    if (hasSession()) await sbFetch(deletePath(saved.token, getUid()), { method: 'DELETE' })
  } catch (e) {
    console.error('Push unsubscribe failed:', e instanceof Error ? e.message : 'error')
  }
}

/** At launch (Apple asks apps to register on every launch, as a token can change while the app is
 *  closed): a registered phone checks its token, without asking. */
export async function checkPushToken(): Promise<void> {
  if (!pushSupported() || !savedToken() || (await pushPermission()) !== 'granted') return
  try {
    const t = await Promise.race([Notifications.getDevicePushTokenAsync(), new Promise<null>((r) => setTimeout(() => r(null), 10000))])
    if (t) await pushTokenChanged(t.data)
  } catch { /* offline: next launch */ }
}

/** Apple replaced this phone's token: save the new one if this phone is registered (the old row is
 *  deleted), never asking and never registering a phone that isn't. */
export async function pushTokenChanged(data: unknown): Promise<void> {
  const saved = savedToken()
  const token = apnsToken(data)
  if (!pushSupported() || !saved || !token || token === saved.token || !hasSession() || getUid() !== saved.uid) return
  try { await saveRow(token, saved.platform) } catch { /* the next launch's resubscribe tries again */ }
}
