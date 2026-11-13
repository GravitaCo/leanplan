/**
 * Native twin of platform.ts (picked by Metro for iOS and Android; the web build never sees it).
 * `localStorage` here is the MMKV-backed store apps/native installs before anything loads, with
 * Supabase's `sb-*` session keys in its encrypted part (apps/native/lib/platform/storage.ts).
 */
import { AppState } from 'react-native'

/** The reminder delivery log on MMKV `tali-notify` (the service worker's IndexedDB on web). */
export { takeNativeNotifyEvents, clearNativeNotifyLog } from '../../apps/native/lib/platform/notifyMMKV'

/** supabase-js doesn't save a session outside a browser unless it's given storage. PKCE for the
 *  Google sign-in, whose redirect comes back to the app by its tilo:// link: the one-time code in
 *  that link is useless without the verifier kept on this phone. */
export const AUTH_OPTIONS = {
  auth: { storage: globalThis.localStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' as const },
}

/** Runs `fn` each time the app comes back to the foreground. */
export function onForeground(fn: () => void): void {
  AppState.addEventListener('change', (s) => { if (s === 'active') fn() })
}

/** The native app has no push yet (N12): a reminder setting made on the web stays on. */
export const KEEP_REMINDERS_WITHOUT_PUSH = true
