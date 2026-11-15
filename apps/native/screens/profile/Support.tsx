/**
 * Support and helplines in the Mind context (mind/SupportSheet.tsx, wellbeing board B6 frame 1),
 * opened from Profile's pillars hint ("support is here", B1.16): Samaritans and Shout first, the
 * not-a-crisis line and the Mind foot. Profile's own Support sheet (the Health data sheet's row) is
 * N2's (lib/account/AccountData.tsx). Pure UI: no store action, no persisted field, no network; the
 * nation is this sheet's own state, forgotten on close.
 * The two could be one sheet with a `context` option; that's for the lead to place (N2's file or N1).
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

export function MindSupportSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  const list = supportList(nation, { context: 'mind' })
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
        <Text style={small}>{SUPPORT_MIND.notCrisis}</Text>
        <Text style={small}>{SUPPORT_MIND.foot}</Text>
      </View>
    </Sheet>
  )
}
