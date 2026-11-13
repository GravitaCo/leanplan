/**
 * Keeps the Supabase session fresh the way the web does. In a browser, supabase-js refreshes the
 * token while the tab shows and checks it the moment the tab comes back (visibilitychange). On a
 * phone it sees no browser, so this follows Supabase's React Native pattern: refresh while the app
 * is in the foreground, stop when it leaves, and start straight away on a cold launch, which is
 * already active so no change fires for it (security-data finding 3). Moved here from
 * app/_layout.tsx unchanged; index.ts imports it once, right after ./install.
 */
import { AppState } from 'react-native'
import { supabase } from '@/data/supabase'

AppState.addEventListener('change', (s) => {
  if (s === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh()
