/**
 * Where Today hands over to other streams. The store records the intent exactly as on web
 * (openTrain, openMind, openProfile set its fields), then the tab is shown. Screens that belong to
 * a stream not built yet open a plain "not here yet" note until the owner swaps in the real one
 * (native-build-plan §2, "owners agree a stub").
 */
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '@/store/store'
import { openLab } from '../../lib/labSheet'

export type TabName = 'food' | 'train' | 'mind' | 'plan'

export function goTab(tab: TabName): void {
  useStore.getState().setTab(tab)
  router.navigate(`/${tab}`)
}

/** Profile (N10) isn't built: the avatar's lab sheet stands in, as on the spike. */
export function goProfile(section: string): void {
  useStore.getState().openProfile(section)
  openLab()
}

/** A sheet another stream owns (named for the swap), shown as a note until it lands. */
export function notYet(what: string, stream: string): void {
  Alert.alert(what, `Not in the native app yet: it arrives with the ${stream} stream.`)
}
