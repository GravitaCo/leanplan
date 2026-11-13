/** Pure helpers for ./authRefresh (no React Native, so scripts/test-platform.mjs runs them). */

/** What the refresh should do on an app state change: start (with a check straight away) when the
 *  app comes to the foreground, stop when it leaves; nothing for a state iOS or Android doesn't name.
 *  At launch supabase-js starts the timer itself (it does wherever it sees no browser). */
export function refreshFor(state: string): 'start' | 'stop' | null {
  return state === 'active' ? 'start' : state === 'background' || state === 'inactive' ? 'stop' : null
}
