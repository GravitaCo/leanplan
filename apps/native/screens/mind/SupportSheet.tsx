/**
 * Support and helplines in the Mind context (board B6 frame 1), ported from
 * src/screens/mind/SupportSheet.tsx: lib/ui's Opts for the nation and Signposts for the rows (the
 * web's `.wz-sp`, from the same supportList with context 'mind'); the lead, the "Showing services
 * for…" line, Choose/Change and the feet from supportModel (model.ts, tested against the web's wp6
 * cases). Pure UI: no store, nothing persisted or sent; the nation is this sheet's own state,
 * forgotten on close. Exported for Today (N4) and Profile (N10) to open as well.
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { MIND_UI } from '@/copy/mind'
import type { UkNation } from '@/core/data/signposts'
import { supportList } from '@/screens/profile/supportRows'
import { Opts, Signposts } from '../../lib/ui/choices'
import { LinkBtn } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { Foot } from '../../lib/ui/text'
import { tx, useTokens } from '../../lib/theme'
import { supportModel } from './model'

export function SupportSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const m = supportModel(nation)
  // `.sp-foot`: 12 pt at 1.4, padding 0 4
  const foot = [tx(12, 400, 1.4), { paddingTop: 0, paddingHorizontal: 4 }]
  return (
    <Sheet title={m.title} onClose={onClose} left={null} right={<NavBtn title={MIND_UI.done} bold onPress={onClose} />}>
      {/* .sp-sheet: a column 14 apart */}
      <View style={{ gap: 14 }}>
        <Text style={[tx(16, 400, 1.5), { color: t.label, paddingHorizontal: 4 }]}>{m.lead}</Text>
        {picking
          ? <Opts label={MIND_UI.nation} opts={m.nations} value={nation ?? undefined} onPick={(k) => { setNation(k); setPicking(false) }} />
          : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
              <Text style={[tx(13), { color: t.label2, flexShrink: 1 }]}>{m.showing}</Text>
              <LinkBtn title={m.pick} onPress={() => setPicking(true)} style={[tx(13, 600), { paddingHorizontal: 0, paddingVertical: 0 }]} />
            </View>
          )}
        <View testID="support-rows"><Signposts list={supportList(nation, { context: 'mind' })} support /></View>
        {m.foots.map((f) => <Foot key={f} style={foot}>{f}</Foot>)}
      </View>
    </Sheet>
  )
}
