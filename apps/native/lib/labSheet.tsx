/**
 * The spike's test screen opens as a sheet from the avatar (Profile's place until N10 builds it).
 * Its "Gallery" opens the design system's component gallery (lib/Gallery.tsx) over it.
 * A plain React Native Modal rather than a pushed route: build 2 on Benn's iPhone didn't open the
 * pushed /lab route from the avatar, and a sheet needs no navigation at all.
 */
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { create } from 'zustand'
import { Lab } from './Lab'
import { AccountSection } from './account/AccountData'
import { Gallery } from './Gallery'
import { font, useTokens } from './theme'

const useLab = create<{ open: boolean; gallery: boolean; account: boolean }>(() => ({ open: false, gallery: false, account: false }))
export const openLab = () => useLab.setState({ open: true })
const closeLab = () => useLab.setState({ open: false, gallery: false, account: false })

export function LabSheet() {
  const t = useTokens()
  const open = useLab((s) => s.open)
  const gallery = useLab((s) => s.gallery)
  const account = useLab((s) => s.account)
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeLab}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Pressable accessibilityRole="button" onPress={() => useLab.setState({ account: true })} hitSlop={12}>
              <Text style={[font(400), { fontSize: 17, color: t.tint }]}>Account</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => useLab.setState({ gallery: true })} hitSlop={12}>
              <Text style={[font(400), { fontSize: 17, color: t.tint }]}>Gallery</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={closeLab} hitSlop={12}>
            <Text style={[font(600), { fontSize: 17, color: t.tint }]}>Done</Text>
          </Pressable>
        </View>
        <Lab inSheet />
      </View>
      {/* N2: Profile's account rows, until N10 builds Profile (lib/account/AccountData.tsx) */}
      <Modal visible={account} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => useLab.setState({ account: false })}>
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 14 }}>
            <Pressable accessibilityRole="button" onPress={() => useLab.setState({ account: false })} hitSlop={12}>
              <Text style={[font(600), { fontSize: 17, color: t.tint }]}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}><AccountSection /></ScrollView>
        </View>
      </Modal>
      <Modal visible={gallery} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => useLab.setState({ gallery: false })}>
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 14 }}>
            <Pressable accessibilityRole="button" onPress={() => useLab.setState({ gallery: false })} hitSlop={12}>
              <Text style={[font(600), { fontSize: 17, color: t.tint }]}>Done</Text>
            </Pressable>
          </View>
          <Gallery top={4} />
        </View>
      </Modal>
    </Modal>
  )
}
