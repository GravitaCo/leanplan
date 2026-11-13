/**
 * Support and helplines (board ob9-7, note s-ob10), from src/screens/profile/AccountData.tsx
 * SupportSheet; `context="mind"` is mind/SupportSheet.tsx (board B6 frame 1). Pure UI: no store
 * action, no persisted field, no network (its foot says opening it is private). The nation is this
 * sheet's own state, forgotten on close; the list is supportRows.ts's, bundled with the app.
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import { SUPPORT } from '@/copy/onboardingApp'
import { SUPPORT_MIND } from '@/copy/mind'
import { supportList } from '@/screens/profile/supportRows'
import { tx, useTokens } from '../../lib/theme'
import { LinkBtn } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { Opts, Signposts } from '../../lib/ui/choices'

export function SupportSheet({ onClose, context = 'profile' }: { onClose: () => void; context?: 'profile' | 'mind' }) {
  const t = useTokens()
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  const list = supportList(nation, { context })
  const small = [tx(12, 400, 1.4), { color: t.label2, paddingHorizontal: 4 }]
  return (
    <Sheet title={SUPPORT.title} onClose={onClose} left={null} right={<NavBtn title="Done" bold onPress={onClose} />}>
      <View style={{ gap: 14 }}>
        <Text style={[tx(16, 400, 1.5), { color: t.label, paddingHorizontal: 4 }]}>{SUPPORT.lead}</Text>
        {picking
          ? <Opts label="Nation" opts={NATIONS} value={nation ?? undefined} onPick={(k) => { setNation(k); setPicking(false) }} />
          : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
              <Text style={[tx(13), { color: t.label2, flexShrink: 1 }]}>{SUPPORT.showing(name)}</Text>
              <LinkBtn title={nation ? SUPPORT.change : SUPPORT.choose} onPress={() => setPicking(true)} style={[tx(13, 600), { paddingVertical: 0, paddingHorizontal: 0 }]} />
            </View>
          )}
        <Signposts support list={list} />
        {!nation && <Text style={small}>{SUPPORT.chooseNation}</Text>}
        {context === 'mind' && <Text style={small}>{SUPPORT_MIND.notCrisis}</Text>}
        <Text style={small}>{context === 'mind' ? SUPPORT_MIND.foot : SUPPORT.foot}</Text>
      </View>
    </Sheet>
  )
}
