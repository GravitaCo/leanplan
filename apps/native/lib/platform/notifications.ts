/**
 * Reminders arriving on the phone (native-build-plan N12): what public/sw.js and App.tsx do on the
 * web, for Apple's notifications.
 *
 * - Shown while the app is open, as a browser shows a push with the tab open (no badge).
 * - A tap opens the app at Today, and the weekly review reminder opens the review: the web's
 *   ./?n=<kind>, ./ and ./?review=1. Through the store (setTab, openReview), never the router.
 * - The reminder delivery log (security-data H3) records Mind reminders only, into the same
 *   device-only store the service worker's twin uses (./notifyStore, `tali-notify`), with the
 *   rules in ./notifyReconcile. It's read and emptied by the shared takeNotifyEvents (MMKV on a
 *   phone, src/data/platform.native.ts) and handed to the store (ingestNotifyLog) at
 *   launch and each time the app comes back to the front, except while the owner question shows,
 *   exactly as App.tsx does; two ignored in a row start that type's back-off.
 * - A registered phone checks its token at launch and when Apple replaces it.
 *
 * The words on the lock screen come from the reminder function (supabase/functions/_shared/
 * reminders.ts): fixed copy, the same as the web's.
 */
import { useEffect } from 'react'
import { AppState } from 'react-native'
import * as Notifications from 'expo-notifications'
import { createMMKV, type MMKV } from 'react-native-mmkv'
import { useStore } from '@/store/store'
import { checkPushToken, pushSupported, pushTokenChanged } from './push'
import { takeNotifyEvents } from '@/data/notifyLog'
import { NOTIFY_STORE_ID, recordNotifyEvent } from './notifyStore'
import { deliveryKey, mindKindOf, noteOpened, noteShown, parseSeen, reconcile, routeFor, type NotifyEv, type Presented, type Seen } from './notifyReconcile'

// ---- the log: the same MMKV store as ./notifyMMKV, so its clear removes the seen list too ----
let kv: MMKV | null = null
const store = (): MMKV | null => {
  try { return (kv ??= createMMKV({ id: NOTIFY_STORE_ID })) } catch { return null }
}
const SEEN = 'seen'
const readSeen = (): Seen => { try { return parseSeen(store()?.getString(SEEN)) } catch { return {} } }

function apply(r: { seen: Seen; events: NotifyEv[] }): void {
  const s = store()
  if (!s) return
  try { s.set(SEEN, JSON.stringify(r.seen)) } catch { /* unavailable */ }
  for (const e of r.events) recordNotifyEvent(s, e.kind, e.ev, e.at)
}

/** What a reminder's data says (the function puts it under `body`, which expo-notifications hands
 *  over as content.data on iOS; the raw payload as a fallback). */
const dataOf = (n: Notifications.Notification): unknown => {
  const d = n.request.content.data
  if (d && typeof d === 'object' && Object.keys(d).length) return d
  const t = n.request.trigger as { type?: string; payload?: Record<string, unknown> } | null
  return t?.type === 'push' ? t.payload?.body : undefined
}

const presentedOf = (n: Notifications.Notification): Presented | null => {
  const kind = mindKindOf(dataOf(n))
  return kind ? { key: deliveryKey(n.request.identifier, n.date), kind, at: Number.isFinite(n.date) ? n.date : Date.now() } : null
}

// ---- arriving while the app is open ----
if (pushSupported()) {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const p = presentedOf(n)
      if (p) apply(noteShown(readSeen(), p))
      return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }
    },
  })
}

// ---- a tap ----
let lastHandled = ''
function handleTap(r: Notifications.NotificationResponse | null): void {
  if (!r || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
  const n = r.notification
  const key = deliveryKey(n.request.identifier, n.date)
  if (key === lastHandled) return
  lastHandled = key
  const p = presentedOf(n)
  if (p) apply(noteOpened(readSeen(), p, new Date()))
  try { Notifications.clearLastNotificationResponse() } catch { /* nothing to clear */ }
  // through the store, as on the web (lib/navBridge.ts moves the router to store.tab)
  if (routeFor(dataOf(n)) === 'review') useStore.getState().openReview()
  else useStore.getState().setTab('today')
}

// ---- back to the front: Notification Centre, then the log into the store ----
async function settleLog(): Promise<void> {
  if (!pushSupported()) return
  // a tap that brought the app forward is recorded first, so the reminder it opened is never taken
  // for one swiped away (ship-critic, 13 Nov 2026); handleTap records each delivery's tap once
  try { handleTap(Notifications.getLastNotificationResponse()) } catch { /* none */ }
  try {
    const presented = (await Notifications.getPresentedNotificationsAsync()).map(presentedOf).filter((p): p is Presented => !!p)
    apply(reconcile(readSeen(), presented, new Date()))
  } catch { /* unavailable: nothing new recorded */ }
  if (useStore.getState().ownerAsk) return
  const ev = await takeNotifyEvents()
  if (ev.length && !useStore.getState().ownerAsk) useStore.getState().ingestNotifyLog(ev)
}

/** Mounted once, in the root layout. */
export function useNotifications(): void {
  const authed = useStore((s) => s.authed)
  useEffect(() => {
    if (!pushSupported()) return
    handleTap(Notifications.getLastNotificationResponse())
    const taps = Notifications.addNotificationResponseReceivedListener(handleTap)
    const tokens = Notifications.addPushTokenListener((t) => { void pushTokenChanged(t.data) })
    void settleLog()
    const front = AppState.addEventListener('change', (s) => { if (s === 'active') void settleLog() })
    return () => { taps.remove(); tokens.remove(); front.remove() }
  }, [])
  useEffect(() => {
    if (authed) void checkPushToken()
  }, [authed])
}
