/**
 * Native twin of platform.ts (picked by Metro for iOS and Android; the web build never sees it).
 * `localStorage` here is the store apps/native installs before anything loads, with
 * Supabase's `sb-*` session keys in its encrypted part (apps/native/lib/platform/storage.ts).
 */
import { AppState } from 'react-native'

/** The reminder delivery log in the phone's store `tali-notify` (the service worker's IndexedDB on web). */
export { takeNativeNotifyEvents, clearNativeNotifyLog } from '../../apps/native/lib/platform/notifyKV'

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

/** Where this phone can't take pushes (Android until it has its own reminders; iPhone has them
 *  since N12, so there pushSupported() is true and the web's rule applies), a reminder setting made
 *  on the web stays on rather than switching off for every device. */
export const KEEP_REMINDERS_WITHOUT_PUSH = true

/** Google sign-in in the system's sign-in sheet, back at tilo://auth-callback, the code exchanged on
 *  this phone; the session reaches the store as any sign-in. The app registers it at startup
 *  (apps/native/lib/account/oauth.ts calls setGoogleOAuth), so shared code never imports the native
 *  module (and the shared-code tests that bundle this file need no fake for it). */
export type GoogleOAuthResult = 'redirecting' | 'ok' | 'cancelled' | 'error'
type GoogleOAuthFn = (queryParams?: Record<string, string>) => Promise<GoogleOAuthResult>
let googleImpl: GoogleOAuthFn | null = null
export function setGoogleOAuth(fn: GoogleOAuthFn): void { googleImpl = fn }
export async function googleOAuth(_auth: unknown, queryParams?: Record<string, string>): Promise<GoogleOAuthResult> {
  return googleImpl ? googleImpl(queryParams) : 'error'
}
