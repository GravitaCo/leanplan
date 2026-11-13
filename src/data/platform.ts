/**
 * Platform adapter: the few places the shared store and data layer touch the browser directly.
 * This file is the web's; the native app's Metro picks `platform.native.ts` instead (same names),
 * so the shared code runs unchanged on both (native-build-plan N0). Web behaviour is exactly as
 * before: no auth options (supabase-js keeps its own browser defaults), and the page's
 * visibilitychange for "came back to the app".
 */

/** Extra supabase-js client options for this platform (none on web). */
export const AUTH_OPTIONS: undefined | { auth: { storage: Storage; persistSession: boolean; autoRefreshToken: boolean; detectSessionInUrl: boolean } } = undefined

/** Runs `fn` each time the person comes back to the app (the tab shows again on web). */
export function onForeground(fn: () => void): void {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fn() })
}

/** The reminder delivery log's store where there is no IndexedDB (the phone's own store). The web's
 *  log is the service worker's IndexedDB (notifyLog.ts, deviceOnly.ts), so these do nothing here. */
export function takeNativeNotifyEvents(): Promise<unknown[]> { return Promise.resolve([]) }
export function clearNativeNotifyLog(): void { /* web: the IndexedDB is cleared by clearNotifyStore */ }

/** Keep the (synced) reminder setting when this device can't take pushes at all, rather than turn
 *  it off for every device (core/domain/age.ts restoreTurnsOff). Web: no, as before. */
export const KEEP_REMINDERS_WITHOUT_PUSH = false

/** What starting a Google sign-in did: on web the page leaves for Google ('redirecting'); in the app
 *  the system's sign-in sheet returns here with the session applied ('ok'), or the person closed it. */
export type GoogleOAuthResult = 'redirecting' | 'ok' | 'cancelled' | 'error'

/** A Google sign-in back to this page (Supabase's redirect allow-list holds the origin). */
export async function googleOAuth(
  auth: { signInWithOAuth: (c: { provider: 'google'; options: { redirectTo: string; queryParams?: Record<string, string> } }) => Promise<{ error: unknown }> },
  queryParams?: Record<string, string>,
): Promise<GoogleOAuthResult> {
  const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname, queryParams } })
  return error ? 'error' : 'redirecting'
}
