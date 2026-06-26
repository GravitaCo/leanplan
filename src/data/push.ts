/** Web Push subscription handling for supplement reminders (ported from LeanPlan). */
import { SB_REST, SB_KEY, getToken, getUid } from './supabase'

const VAPID_PUBLIC_KEY =
  'BOvtsDXhc-q8UtjBcaCY7iydSF_-xKRHoIR8YsOqdGXvYl4HUMlaeWsCsNf5ZTNMAh-9wQwEfmu4Kgcg6_WnGlU'

export function pushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function subscribePush(): Promise<boolean> {
  if (!pushSupported()) return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const j = sub.toJSON()
    await fetch(SB_REST + '/push_subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
        apikey: SB_KEY,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: getUid(),
        endpoint: j.endpoint,
        p256dh: j.keys?.p256dh,
        auth_key: j.keys?.auth,
      }),
    })
    return true
  } catch (e) {
    console.error('Push subscribe failed:', e)
    return false
  }
}

export async function unsubscribePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await fetch(
        SB_REST +
          '/push_subscriptions?endpoint=eq.' +
          encodeURIComponent(endpoint) +
          '&user_id=eq.' +
          getUid(),
        { method: 'DELETE', headers: { Authorization: 'Bearer ' + getToken(), apikey: SB_KEY } },
      )
    }
  } catch (e) {
    console.error('Push unsubscribe failed:', e)
  }
}
