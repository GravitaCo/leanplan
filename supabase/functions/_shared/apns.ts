/**
 * Reminders to the iPhone app through Apple's push service (APNs; native-build-plan N12), for the
 * reminder function (send-supplement-reminders/index.ts). Web Push is unchanged.
 *
 * On the web, public/sw.js decides what a reminder shows, whatever the payload says. A phone has no
 * service worker: Apple shows the alert as sent. So `shownCopy` here applies the worker's rules
 * before anything leaves the server, and npm test checks the two give the same words for every
 * reminder. Fixed copy only (../_shared/reminders.ts): never a mood or sleep word, nothing from the
 * log; a supplement name only for someone who turned names on (B11b).
 *
 * The phone's row in push_subscriptions (docs/migrations/2026-11-13-native-push.sql): `endpoint` is
 * the device token, `platform` 'apns' (TestFlight and store builds) or 'apns-sandbox' (development
 * builds). Unlike Web Push, the alert isn't end-to-end encrypted: Apple carries it over TLS and can
 * read it. So a supplement reminder never names the supplement through APNs (`forApns`) until DPIA
 * 8.8's APNs addendum is signed and the function's APNS_SUPP_NAMES secret is set to "on"
 * (compliance, 13 Nov 2026); the privacy policy's iPhone text is gated on its `native` option.
 *
 * Pure TS with no imports beyond reminders.ts, using WebCrypto only, so Deno and Node both load it.
 */
import { REMINDER_COPY, SUPP_NAMED } from './reminders.ts'

export const APNS_HOSTS = { apns: 'https://api.push.apple.com', 'apns-sandbox': 'https://api.sandbox.push.apple.com' } as const
export type ApnsPlatform = keyof typeof APNS_HOSTS
export const isApns = (p: unknown): p is ApnsPlatform => p === 'apns' || p === 'apns-sandbox'

/** The bundle identifier: APNs's topic for an alert (apps/native/app.json ios.bundleIdentifier). */
export const APNS_TOPIC = 'fit.tilo.app'

/** A device token as the phone saves it: lower-case hex, 32 to 100 bytes. */
export const isApnsToken = (t: unknown): t is string => typeof t === 'string' && /^[0-9a-f]{64,200}$/.test(t) && t.length % 2 === 0

const MIND_BY_TAG: Record<string, 'checkin' | 'wind-down' | 'plan'> = {
  [REMINDER_COPY.checkin.tag]: 'checkin',
  [REMINDER_COPY['wind-down'].tag]: 'wind-down',
  [REMINDER_COPY.plan.tag]: 'plan',
}
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

export interface Shown { title: string; body: string; tag: string; kind: 'checkin' | 'wind-down' | 'plan' | 'supp' | 'review' | 'other' }

/**
 * What public/sw.js would show for this payload (its 'push' handler), and which reminder it is:
 * - a Mind tag: that type's fixed copy;
 * - `tali-supp-named` with a body: "Supplement reminder" and the names (cut to 400 characters);
 * - no tag, `tali-supp…` or `supp-…`: the generic supplement text, under `tali-supp`;
 * - anything else (the weekly review reminder): its own title (else "Tilo") and body.
 */
export function shownCopy(payload: unknown): Shown {
  const d = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const tag = typeof d.tag === 'string' ? d.tag : ''
  if (tag && own(MIND_BY_TAG, tag)) {
    const kind = MIND_BY_TAG[tag]
    const c = REMINDER_COPY[kind]
    return { title: c.title, body: c.body, tag: c.tag, kind }
  }
  const named = tag === SUPP_NAMED.tag && typeof d.body === 'string' && d.body.trim() !== ''
  const supp = named || !tag || tag === 'tali-supp' || tag.startsWith('tali-supp') || tag.startsWith('supp-')
  if (named) return { title: SUPP_NAMED.title, body: (d.body as string).slice(0, 400), tag: 'tali-supp', kind: 'supp' }
  if (supp) return { title: REMINDER_COPY.supp.title, body: REMINDER_COPY.supp.body, tag: 'tali-supp', kind: 'supp' }
  return {
    title: typeof d.title === 'string' && d.title ? d.title : 'Tilo',
    body: typeof d.body === 'string' ? d.body : '',
    tag,
    kind: tag === 'tali-review' ? 'review' : 'other',
  }
}

/**
 * What goes to a phone: shownCopy, except that a named supplement reminder becomes the generic one
 * unless names over APNs are allowed (`names`, from the APNS_SUPP_NAMES secret). `lockNames` is set
 * per account, so one tap on the web would otherwise send names readable by Apple to every iPhone.
 */
export function forApns(payload: unknown, names = false): Shown {
  const s = shownCopy(payload)
  if (s.kind === 'supp' && !names) return { title: REMINDER_COPY.supp.title, body: REMINDER_COPY.supp.body, tag: 'tali-supp', kind: 'supp' }
  return s
}

/** One lock-screen group for every Tilo reminder, as web push shows them under the app
 *  (mental-performance, 13 Nov 2026: separate groups would be a visible difference). */
export const APNS_THREAD = 'tali'

/** How long Apple keeps a reminder for a phone that's offline: a late reminder is no use, and Apple
 *  holds the readable text meanwhile (compliance, 13 Nov 2026). An hour also keeps a wind-down
 *  reminder from arriving deep into quiet hours. */
export const APNS_EXPIRY_S = 60 * 60

/**
 * The APNs request body: the alert, one lock-screen group, and under `body` (which the app's
 * notifications library hands over as the notification's data) the type and tag, so the app can
 * record a Mind reminder in the delivery log and send a tap on the review reminder to the review.
 * No badge (the web shows none).
 */
export function apnsBody(s: Shown): string {
  return JSON.stringify({
    aps: { alert: { title: s.title, body: s.body }, sound: 'default', 'thread-id': APNS_THREAD },
    body: { kind: s.kind, tag: s.tag },
  })
}

/** The request headers. A later reminder with the same tag replaces an unread one, as `tag` does on
 *  the web (apns-collapse-id). */
export function apnsHeaders(s: Shown, jwt: string, nowMs: number, topic = APNS_TOPIC): Record<string, string> {
  const h: Record<string, string> = {
    'apns-expiration': String(Math.floor(nowMs / 1000) + APNS_EXPIRY_S),
    authorization: 'bearer ' + jwt,
    'apns-push-type': 'alert',
    'apns-priority': '10',
    'apns-topic': topic,
    'content-type': 'application/json',
  }
  if (s.tag) h['apns-collapse-id'] = s.tag.slice(0, 64)
  return h
}

/** Whether Apple's answer means the token is dead, so its row goes (as Web Push 404 and 410): only
 *  410 Unregistered. A 400 BadDeviceToken or DeviceTokenNotForTopic can also come from our own
 *  setup (a wrong topic or gateway) and would then delete every phone's row, so those rows stay
 *  (counted as failed); the phone saves its row again at each launch (security-data, 13 Nov 2026). */
export function apnsGone(status: number, _reason?: unknown): boolean {
  return status === 410
}

/** Apple refused the provider token itself: drop the cached one so the next send signs afresh (the
 *  30-minute window keeps that within Apple's 20-minute rule). */
export const apnsTokenRefused = (status: number, reason: unknown): boolean =>
  status === 403 && (reason === 'ExpiredProviderToken' || reason === 'InvalidProviderToken')

// ---- the provider token (JWT, ES256) ----

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlJson = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)))

/** The .p8 key Apple issues (PKCS#8 PEM, P-256) as a WebCrypto signing key. */
export async function apnsKey(p8: string): Promise<CryptoKey> {
  const b64 = p8.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** Apple accepts a provider token for an hour and refuses one refreshed more often than every 20
 *  minutes: the issue time is rounded down to this window, and the function keeps the token for it. */
export const APNS_JWT_WINDOW_S = 30 * 60

export const apnsIat = (nowMs: number): number => Math.floor(nowMs / 1000 / APNS_JWT_WINDOW_S) * APNS_JWT_WINDOW_S

/** A signed provider token: header {alg ES256, kid}, claims {iss team, iat}. */
export async function apnsJwt(key: CryptoKey, keyId: string, teamId: string, iat: number): Promise<string> {
  const head = b64urlJson({ alg: 'ES256', kid: keyId }) + '.' + b64urlJson({ iss: teamId, iat })
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head)))
  return head + '.' + b64url(sig)
}
