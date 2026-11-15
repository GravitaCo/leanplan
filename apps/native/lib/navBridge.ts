/**
 * The store decides which tab shows, as on the web (store.tab, set by setTab, openTrain, openMind,
 * openProfile, openReview): screens move between tabs only through the store, never through the
 * router directly. This hook follows store.tab and moves the router to match. Profile is the avatar
 * beside every title: a tab route the bar doesn't list, as on the web.
 * With the Mind pillar off, anything landing on Mind shows Summary instead (App.tsx).
 */
import { useEffect } from 'react'
import { router } from 'expo-router'
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

export function useNavBridge(): void {
  const tab = useStore((s) => s.tab)
  const mindOff = useStore((s) => WELLBEING_ENABLED && !!s.data.profile.mind?.off?.includes('mind'))
  useEffect(() => {
    const target = tab === 'mind' && (mindOff || !WELLBEING_ENABLED) ? 'today' : tab
    router.navigate(ROUTE_OF[target] as never)
  }, [tab, mindOff])
}
