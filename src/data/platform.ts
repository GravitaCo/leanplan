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
