/**
 * The spike's test screen opens as a sheet from the avatar (Profile's place until N10 builds it).
 * A plain React Native Modal rather than a pushed route: build 2 on Benn's iPhone didn't open the
 * pushed /lab route from the avatar, and a sheet needs no navigation at all.
 */
import { Modal, Pressable, Text, View } from 'react-native'
import { create } from 'zustand'
import { Lab } from './Lab'
import { font, useTokens } from './theme'

const useLab = create<{ open: boolean }>(() => ({ open: false }))
export const openLab = () => useLab.setState({ open: true })
const closeLab = () => useLab.setState({ open: false })

export function LabSheet() {
  const t = useTokens()
  const open = useLab((s) => s.open)
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeLab}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 14 }}>
          <Pressable accessibilityRole="button" onPress={closeLab} hitSlop={12}>
            <Text style={[font(600), { fontSize: 17, color: t.tint }]}>Done</Text>
          </Pressable>
        </View>
        <Lab inSheet />
      </View>
    </Modal>
  )
}
