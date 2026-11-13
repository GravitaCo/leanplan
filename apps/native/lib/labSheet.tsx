/**
 * The avatar's sheet, Profile's place until N10 builds it: the account rows (lib/account, N2) and
 * the spike's test screen. A plain React Native Modal rather than a pushed route: build 2 on Benn's
 * iPhone didn't open the pushed /lab route from the avatar, and a sheet needs no navigation at all.
 */
import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { create } from 'zustand'
import { Lab } from './Lab'
import { AccountSection } from './account/AccountData'
import { font, useTokens } from './theme'

const useLab = create<{ open: boolean }>(() => ({ open: false }))
export const openLab = () => useLab.setState({ open: true })
const closeLab = () => useLab.setState({ open: false })

export function LabSheet() {
  const t = useTokens()
  const open = useLab((s) => s.open)
  const [pane, setPane] = useState<'account' | 'lab'>('account')
  const tab = (p: typeof pane, title: string) => (
    <Pressable role="tab" aria-selected={pane === p} onPress={() => setPane(p)} hitSlop={8}>
      <Text style={[font(pane === p ? 600 : 400), { fontSize: 17, color: pane === p ? t.label : t.tint }]}>{title}</Text>
    </Pressable>
  )
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeLab}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, paddingTop: 14 }}>
          {tab('account', 'Profile')}
          {tab('lab', 'Lab')}
          <View style={{ flex: 1 }} />
          <Pressable role="button" aria-label="Done" onPress={closeLab} hitSlop={12}>
            <Text style={[font(600), { fontSize: 17, color: t.tint }]}>Done</Text>
          </Pressable>
        </View>
        {pane === 'lab' ? <Lab inSheet /> : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}><AccountSection /></ScrollView>
        )}
      </View>
    </Modal>
  )
}
