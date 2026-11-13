/**
 * Keeps the Supabase session fresh the way the web does. In a browser, supabase-js refreshes the
 * token while the tab shows and checks it the moment the tab comes back (visibilitychange). On a
 * phone it sees no browser, so its refresh timer runs all the time and, after a while in the
 * background, only checks the token on its next tick (up to 30 s later), while the store's sync on
 * return goes straight away with the expired one and shows a sync problem. Supabase's own
 * React Native pattern: refresh while the app is in the foreground, stop when it leaves.
 * index.ts imports this right after ./install, once.
 */
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { supabase } from '@/data/supabase'
import { refreshFor } from './lifecycle'

const apply = (state: AppStateStatus) => {
  const a = refreshFor(state)
  if (!a) return
  const p = a === 'start' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()
  p.catch(() => { /* a failed refresh shows up as a sync problem; the next return tries again */ })
}

// the web render of this app (side-by-side checks only) keeps the browser's own behaviour
if (Platform.OS !== 'web') AppState.addEventListener('change', apply)
