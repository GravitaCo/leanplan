/**
 * The store decides which tab shows, as on the web (store.tab, set by setTab, openTrain, openMind,
 * openProfile, openReview): screens move between tabs only through the store, never through the
 * router directly. This hook follows store.tab and moves the router to match. Profile is the avatar
 * beside every title: a tab route the bar doesn't list, as on the web.
 * With the Mind pillar off, anything landing on Mind shows Summary instead (App.tsx).
 */
import { useEffect, useRef } from 'react'
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
  const path = usePathname()
  // the route the bridge last asked for, until the router reaches it
  const pending = useRef<string | null>(null)
  // store → router
  useEffect(() => {
    const route = ROUTE_OF[target]
    if (route === path && !pending.current) return
    pending.current = route
    router.navigate(route as never)
    // only when the store's target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  // router → store, only for moves the store didn't ask for (Android's back button returns to the
  // first tab): the store follows, so the next setTab is a change again and the avatar works after
  // back. While a requested move is still arriving, paths on the way are ignored.
  useEffect(() => {
    if (pending.current) {
      if (path === pending.current) pending.current = null
      return
    }
    const at = TAB_OF[path]
    if (at && ROUTE_OF[target] !== path) useStore.getState().setTab(at)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
}
