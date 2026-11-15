/**
 * The top of a pushed Mind screen (Reset, Wind down, Get outside), as the web's `.pv-back` and
 * TitleRow: the back button (safe area + 16 above, 6 below), then the large title with the Profile
 * avatar. A composition of lib/ui's BackButton and TitleRow, shared by the three screens.
 */
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, TitleRow } from '../../lib/ui/primitives'

export function PushedTop({ back, onBack, title }: { back: string; onBack: () => void; title: string }) {
  const insets = useSafeAreaInsets()
  return (
    <>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 6, marginLeft: -6 }}><BackButton label={back} onPress={onBack} /></View>
      <TitleRow title={title} />
    </>
  )
}
