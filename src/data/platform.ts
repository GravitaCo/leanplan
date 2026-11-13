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

/** The reminder delivery log's store where there is no IndexedDB (the phone: MMKV). The web's
 *  log is the service worker's IndexedDB (notifyLog.ts, deviceOnly.ts), so these do nothing here. */
export function takeNativeNotifyEvents(): Promise<unknown[]> { return Promise.resolve([]) }
export function clearNativeNotifyLog(): void { /* web: the IndexedDB is cleared by clearNotifyStore */ }

/** Keep the (synced) reminder setting when this device can't take pushes at all, rather than turn
 *  it off for every device (core/domain/age.ts restoreTurnsOff). Web: no, as before. */
export const KEEP_REMINDERS_WITHOUT_PUSH = false
