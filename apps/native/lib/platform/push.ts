/**
 * Reminders on a phone: the native side of src/data/push.ts (the shared store reaches it through
 * src/data/push.native.ts, under the same names, so its rules run unchanged: the health yes
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
 * - unsubscribePush ends this phone's registration and deletes its row.
 *
 * Unlike a browser, which gets a new address each time it subscribes, a phone keeps the same token
 * across sign-outs (security-data, 13 Nov 2026). So a row that can't be deleted now (no session any
 * more, as after an account switch or signing out offline, or no connection) is kept as a pending
 * release and deleted when that account is next signed in here; and on the server a token belongs
 * to one account (docs/migrations/2026-11-13-native-push.sql, push_token_one_account), so the next
 * account to turn reminders on replaces it.
 */
import { AppState, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { getIosPushNotificationServiceEnvironmentAsync } from 'expo-application'
import { sbFetch, getUid, hasSession } from '@/data/supabase'
import { pushKV } from './pushStore'
import { apnsPlatform, apnsToken, ASK, deletePath, parseSaved, permFrom, tokenRow, type Perm, type SavedToken } from './pushRules'

export type { Perm as PushPermission }

/** The browser's PushManager check: true on iPhone. */
export function pushSupported(): boolean {
  return Platform.OS === 'ios'
}

// ---- what this phone registered (device-only, not health data: a token and an account id) ----
const store = pushKV
const KEY = 'token'
export const savedToken = (): SavedToken | null => {
  try { return parseSaved(store()?.getString(KEY)) } catch { return null }
}
const saveToken = (t: SavedToken | null) => {
  try { if (t) store()?.set(KEY, JSON.stringify(t)); else store()?.remove(KEY) } catch { /* unavailable */ }
}
/** Rows this phone still has to delete: {token, uid, platform}, newest last, at most a few. */
const RELEASE = 'release'
const releases = (): SavedToken[] => {
  try {
    const v = JSON.parse(store()?.getString(RELEASE) ?? '[]')
    return Array.isArray(v) ? v.map((x) => parseSaved(JSON.stringify(x))).filter((x): x is SavedToken => !!x) : []
  } catch { return [] }
}
const setReleases = (list: SavedToken[]) => {
  try { if (list.length) store()?.set(RELEASE, JSON.stringify(list.slice(-5))); else store()?.remove(RELEASE) } catch { /* unavailable */ }
}

/** Delete one row while its own account is signed in; true when it's gone (or was never there). */
async function deleteRow(t: SavedToken): Promise<boolean> {
  if (!hasSession() || getUid() !== t.uid) return false
  try { return (await sbFetch(deletePath(t.token, t.uid), { method: 'DELETE' })).ok } catch { return false }
}

/** Delete the rows left from before, for the account now signed in. */
async function settleReleases(): Promise<void> {
  const left: SavedToken[] = []
  for (const t of releases()) if (!(await deleteRow(t))) left.push(t)
  setReleases(left)
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])

// ---- permission ----
// The store reads the permission synchronously (as the browser's Notification.permission), so this
// is a copy, refreshed at launch and each time the app comes back to the front (the person may have
// changed it in Settings meanwhile). A stale copy only leads to a re-ask or a failed registration,
// both of which the store already handles. Paths that register read the live value (livePermission).
let cached: Perm = 'default'
async function livePermission(): Promise<Perm> {
  if (!pushSupported()) return 'denied'
  try { cached = permFrom(await Notifications.getPermissionsAsync()) } catch { /* keep the last known */ }
  return cached
}
if (pushSupported()) {
  void livePermission()
  AppState.addEventListener('change', (s) => { if (s === 'active') void livePermission() })
}

/** The phone's notification permission as the browser names it (the copy above). */
export function pushPermission(): Perm {
  return pushSupported() ? cached : 'denied'
}

/** Ask (the system shows its prompt only while the person hasn't answered). */
export async function askPushPermission(): Promise<Perm> {
  if (!pushSupported()) return 'denied'
  try { cached = permFrom(await Notifications.requestPermissionsAsync(ASK)) } catch { /* keep the last known */ }
  return cached
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
  // wanted again: not to be released; a token Apple has since replaced: its row goes
  const before = savedToken()
  saveToken({ token, uid, platform })
  setReleases(releases().filter((t) => !(t.token === token && t.uid === uid)))
  if (before && before.uid === uid && before.token !== token && !(await deleteRow(before))) setReleases([...releases(), before])
  return true
}

async function register(): Promise<boolean> {
  try {
    const t = await withTimeout(Notifications.getDevicePushTokenAsync(), 10000)
    const token = t?.type === 'ios' ? apnsToken(t.data) : null
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
  if (!pushSupported() || (await livePermission()) !== 'granted') return false
  return register()
}

export async function subscribePush(): Promise<boolean> {
  if (!pushSupported()) return false
  if ((await askPushPermission()) !== 'granted') return false
  return register()
}

/** End this phone's registration and delete its row; if the row can't be deleted now (no session
 *  for its account, or no connection), it's kept as a pending release (see the header). */
export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return
  const saved = savedToken()
  if (!saved) return
  saveToken(null)
  setReleases([...releases().filter((t) => !(t.token === saved.token && t.uid === saved.uid)), saved])
  await Notifications.unregisterForNotificationsAsync().catch(() => undefined)
  await settleReleases()
}

/**
 * Once signed in (at launch and after each sign-in): rows left from before are deleted, and a
 * registered phone saves its row again, without asking. Apple asks apps to register on every launch
 * (a token can change while the app is closed), and saving again also brings back a row the
 * reminder function removed (security-data, 13 Nov 2026). The consent trigger still decides.
 */
export async function checkPushToken(): Promise<void> {
  if (!pushSupported() || !hasSession()) return
  await settleReleases()
  const saved = savedToken()
  if (!saved || saved.uid !== getUid() || (await livePermission()) !== 'granted') return
  try {
    const t = await withTimeout(Notifications.getDevicePushTokenAsync(), 10000)
    const token = t ? apnsToken(t.data) : null
    if (token) await saveRow(token, saved.platform)
  } catch { /* offline: next launch */ }
}

/** Apple replaced this phone's token: save the new one if this phone is registered (the old row is
 *  deleted), never asking and never registering a phone that isn't. */
export async function pushTokenChanged(data: unknown): Promise<void> {
  const saved = savedToken()
  const token = apnsToken(data)
  if (!pushSupported() || !saved || !token || token === saved.token || !hasSession() || getUid() !== saved.uid) return
  try { await saveRow(token, saved.platform) } catch { /* the next launch saves it */ }
}
