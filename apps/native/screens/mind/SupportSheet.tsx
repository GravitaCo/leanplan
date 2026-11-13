/**
 * Support and helplines in the Mind context (board B6 frame 1), ported from
 * src/screens/mind/SupportSheet.tsx. What it shows for each nation (rows, order, words, links,
 * accessibility labels, feet) is supportModel (model.ts, tested against the web's wp6 cases). Pure
 * UI: no store, nothing persisted or sent; the nation is this sheet's own state, forgotten on close.
 *
 * TODO(N1-followup): N1's P3 brings the web's `.wz-sp` support rows (number in --tint on the right,
 * the web link under the description) and `Opts` (radio rows with the dot) for the nation picker.
 * Until then the rows and the picker are composed from lib/ui's List and Row; the words, order,
 * links and labels are already the web's. Not mounted until Row's sub wraps (N1 P1b): the
 * helplines' descriptions and web links must never be cut off.
 */
import { useState } from 'react'
import { Linking, Text, View } from 'react-native'
import { MIND_UI } from '@/copy/mind'
import type { UkNation } from '@/core/data/signposts'
import { LinkBtn, List } from '../../lib/ui/kit'
import { NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { Icon } from '../../lib/ui/icons'
import { Foot } from '../../lib/ui/text'
import { tx, useTokens } from '../../lib/theme'
import { supportModel, type SupportRowModel } from './model'

const open = (href: string) => { Linking.openURL(href).catch(() => {}) }

export function SupportSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const m = supportModel(nation)
  const foot = { paddingTop: 0, paddingHorizontal: 4, fontSize: 12, lineHeight: 16.8 }
  return (
    <Sheet title={m.title} onClose={onClose} left={null} right={<NavBtn title={MIND_UI.done} bold onPress={onClose} />}>
      {/* .sp-sheet: a column 14 apart */}
      <View style={{ gap: 14 }}>
        <Text style={[tx(16, 400, 1.5), { color: t.label, paddingHorizontal: 4 }]}>{m.lead}</Text>
        {picking
          ? (
            <View accessibilityRole="radiogroup" accessibilityLabel={MIND_UI.nation}>
              <List>
                {m.nations.map(([k, name]) => (
                  <Row key={k} title={name} onPress={() => { setNation(k); setPicking(false) }} chevron={false}
                    right={nation === k ? <Icon name="check" size={14} stroke={2.6} color={t.label} /> : undefined} />
                ))}
              </List>
            </View>
          )
          : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
              <Text style={[tx(13), { color: t.label2, flexShrink: 1 }]}>{m.showing}</Text>
              <LinkBtn title={m.pick} onPress={() => setPicking(true)} style={tx(13, 600)} />
            </View>
          )}
        <List>
          {m.rows.map((r) => <SupportRow key={r.name} r={r} />)}
        </List>
        {m.foots.map((f) => <Foot key={f} style={foot}>{f}</Foot>)}
      </View>
    </Sheet>
  )
}

/** One service: the whole row calls or texts, except a row with a web link, whose number is its own target. */
function SupportRow({ r }: { r: SupportRowModel }) {
  const t = useTokens()
  const num = r.num ? <Text style={[tx(16, 600), { color: t.tint }]}>{r.num}</Text> : undefined
  const sub = (
    <>
      {r.desc}
      {r.web && <Text accessibilityRole="link" onPress={() => open(r.web!.href)} style={[tx(13, 500), { color: t.tint }]}>{'\n' + r.web.label}</Text>}
    </>
  )
  if (r.href && !r.numOnly) return <Row title={r.name} sub={sub} label={r.a11y} onPress={() => open(r.href!)} chevron={false} right={num} />
  if (r.href && r.numOnly) {
    return <Row title={r.name} sub={sub} right={<Text accessibilityRole="link" accessibilityLabel={r.a11y} onPress={() => open(r.href!)} style={[tx(16, 600), { color: t.tint }]}>{r.num}</Text>} />
  }
  return <Row title={r.name} sub={sub} right={num} />
}
