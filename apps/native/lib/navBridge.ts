/**
 * The store decides which tab shows, as on the web (store.tab, set by setTab, openTrain, openMind,
 * openProfile, openReview): screens move between tabs only through the store, never through the
 * router directly. This hook follows store.tab and moves the router to match. Profile has no tab
 * (it's the avatar beside every title): until N10's screen lands it opens the avatar sheet.
 * With the Mind pillar off, anything landing on Mind shows Summary instead (App.tsx).
 */
import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useStore, type Tab } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { openLab } from './labSheet'

export const ROUTE_OF: Record<Exclude<Tab, 'profile'>, string> = {
  today: '/',
  mind: '/mind',
  food: '/food',
  train: '/train',
  plan: '/plan',
}

export function useNavBridge(): void {
  const tab = useStore((s) => s.tab)
  const mindOff = useStore((s) => WELLBEING_ENABLED && !!s.data.profile.mind?.off?.includes('mind'))
  const last = useRef<Exclude<Tab, 'profile'>>('today')
  useEffect(() => {
    if (tab === 'profile') {
      // the sheet opens over the current tab, and store.tab goes back to it, so the next
      // openProfile() is a change again and reopens the sheet
      openLab()
      useStore.getState().setTab(last.current)
      return
    }
    last.current = tab
    const target = tab === 'mind' && (mindOff || !WELLBEING_ENABLED) ? 'today' : tab
    router.navigate(ROUTE_OF[target] as never)
  }, [tab, mindOff])
}
