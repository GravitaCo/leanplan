/**
 * Pure rules for the phone's push registration (./push.ts), so scripts/test-platform.mjs runs them
 * in Node: what counts as permission, what an APNs device token looks like, and the
 * push_subscriptions row a phone writes.
 *
 * The row (docs/migrations/2026-11-13-native-push.sql): `endpoint` holds the device token (hex,
 * lower case) and `platform` says which Apple gateway takes it ('apns' for TestFlight and store
 * builds, 'apns-sandbox' for development builds), with no Web Push keys. Same table as the
 * browser's, so the owner-only RLS, the health-consent trigger, the withdrawal clear, the 30-day
 * purge and account deletion all cover it.
 */

/** What the store expects from the browser's Notification.permission. */
export type Perm = 'default' | 'granted' | 'denied'

/** The parts of expo-notifications' NotificationPermissionsStatus this reads. */
export interface PermStatus {
  granted?: boolean
  status?: string
  canAskAgain?: boolean
  ios?: { status?: number } | null
}

/** What a reminder asks the system for: an alert and a sound, no badge (the web shows no badge). */
export const ASK = { ios: { allowAlert: true, allowSound: true, allowBadge: false } }

/** iOS authorisation states that let a reminder show (expo-notifications IosAuthorizationStatus:
 *  2 authorised, 3 provisional, 4 ephemeral). Provisional ones arrive quietly in Notification Centre. */
const IOS_ALLOWED = [2, 3, 4]
const IOS_DENIED = 1

/** The browser's three-way permission from the phone's answer. */
export function permFrom(s: PermStatus | null | undefined): Perm {
  if (!s) return 'default'
  const ios = s.ios?.status
  if (typeof ios === 'number') return IOS_ALLOWED.includes(ios) ? 'granted' : ios === IOS_DENIED ? 'denied' : 'default'
  if (s.granted === true || s.status === 'granted') return 'granted'
  return s.status === 'denied' ? 'denied' : 'default'
}

/** An APNs device token as expo-notifications gives it (hex). Apple's tokens are 32 bytes today and
 *  Apple says they can grow, so anything from 32 to 100 bytes of hex is taken. */
export function apnsToken(data: unknown): string | null {
  return typeof data === 'string' && /^[0-9a-fA-F]{64,200}$/.test(data) && data.length % 2 === 0 ? data.toLowerCase() : null
}

/** Which Apple gateway a build's token belongs to (expo-application's
 *  getIosPushNotificationServiceEnvironmentAsync): only 'production' (TestFlight, App Store, ad hoc)
 *  uses the production gateway. A development build says 'development'; a simulator, with no
 *  provisioning profile, says nothing, and its token is a sandbox one too. */
export const apnsPlatform = (env: string | null | undefined): 'apns' | 'apns-sandbox' => (env === 'production' ? 'apns' : 'apns-sandbox')

/** The push_subscriptions row for this phone. */
export function tokenRow(uid: string, token: string, platform: 'apns' | 'apns-sandbox') {
  return { user_id: uid, endpoint: token, platform, p256dh: null, auth_key: null }
}

/** The REST path that deletes this phone's row (the token and the signed-in account). */
export const deletePath = (token: string, uid: string): string =>
  '/push_subscriptions?endpoint=eq.' + encodeURIComponent(token) + '&user_id=eq.' + encodeURIComponent(uid)

/** What the phone keeps about its registration: the token and the account it was saved for. */
export interface SavedToken { token: string; uid: string; platform: 'apns' | 'apns-sandbox' }

export function parseSaved(raw: string | undefined | null): SavedToken | null {
  try {
    const v = JSON.parse(raw ?? 'null')
    const token = apnsToken(v?.token)
    if (!token || typeof v.uid !== 'string' || !v.uid || (v.platform !== 'apns' && v.platform !== 'apns-sandbox')) return null
    return { token, uid: v.uid, platform: v.platform }
  } catch { return null }
}

/** The rest timer's notification data (./restTimer): not a reminder type. */
export const REST_KIND = 'rest'

/** A rest length iOS can schedule: whole seconds, at least 1, at most an hour; else null. */
export function restSeconds(seconds: unknown): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null
  const s = Math.round(seconds)
  return s >= 1 && s <= 3600 ? s : null
}
