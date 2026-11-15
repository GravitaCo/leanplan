/**
 * The store decides which tab shows, as on the web (store.tab, set by setTab, openTrain, openMind,
 * openProfile, openReview): screens move between tabs only through the store, never through the
 * router directly. This hook follows store.tab and moves the router to match. Profile is the avatar
 * beside every title: a tab route the bar doesn't list, as on the web.
 * With the Mind pillar off, anything landing on Mind shows Summary instead (App.tsx).
 */
import { useEffect } from 'react'
import { router, usePathname } from 'expo-router'
import { useStore, type Tab } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'

export const ROUTE_OF: Record<Tab, string> = {
  today: '/',
  profile: '/profile',
  mind: '/mind',
  food: '/food',
  train: '/train',
  plan: '/plan',
}

const TAB_OF: Record<string, Tab> = Object.fromEntries(Object.entries(ROUTE_OF).map(([t, r]) => [r, t as Tab]))

export function useNavBridge(): void {
  const tab = useStore((s) => s.tab)
  const mindOff = useStore((s) => WELLBEING_ENABLED && !!s.data.profile.mind?.off?.includes('mind'))
  const target = tab === 'mind' && (mindOff || !WELLBEING_ENABLED) ? 'today' : tab
  useEffect(() => { router.navigate(ROUTE_OF[target] as never) }, [target])
  // The other way, for moves the store didn't make (Android's back button returns to the first tab):
  // the store follows the router, so the next setTab is a change again (the avatar works after back).
  const path = usePathname()
  useEffect(() => {
    const at = TAB_OF[path]
    if (at && at !== target) useStore.getState().setTab(at)
    // only when the route changes; a store change moves the route first
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
}
