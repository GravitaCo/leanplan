/**
 * "Your week" on the Mind page (boards B4 and B5.16), ported from
 * src/screens/mind/ReflectionCard.tsx. What it shows is reflectionModel (model.ts: the shared
 * reflectionFor and reflectionLines); "See your whole week" goes to Summary, today.
 */
import { Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useStore } from '@/store/store'
import { Card, LinkBtn } from '../../lib/ui/kit'
import { Lbl } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { openWholeWeek, useReflection, type ReflectionView } from './model'

export function ReflectionCard() {
  const v = useReflection()
  const setDate = useStore((s) => s.setDate)
  const setTab = useStore((s) => s.setTab)
  if (!v) return null
  return <ReflectionCardView v={v} onWeek={() => openWholeWeek({ setDate, setTab })} />
}

/** The observation's square: a rising line in --mind-ink on --mind-fill (Mind-only, as the web draws it inline). */
function TrendSquare() {
  const t = useTokens()
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.mindFill, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={t.mindInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 18l5-6 4 3 7-9" />
      </Svg>
    </View>
  )
}

export function ReflectionCardView({ v, onWeek }: { v: ReflectionView; onWeek: () => void }) {
  const t = useTokens()
  return (
    <>
      <Lbl right={v.span}>{v.title}</Lbl>
      <Card plain style={{ padding: 16, paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}>
        <View testID="mind-week" accessibilityLabel={v.title} style={{ gap: 12 }}>
          {v.count && <Text style={[tx(17, 600), num, { color: t.label }]}>{v.count}</Text>}
          {v.lines.map((l) => (
            <View key={l.label}>
              <Text style={[tx(13, 600), { color: t.label2 }]}>{l.label}</Text>
              <Text style={[tx(17), { color: t.label, marginTop: 1 }]}>{l.value}</Text>
              {l.bands && (
                <View testID="mind-bands" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {l.bands.map((b) => <View key={b.label} testID={b.on ? 'mind-band-on' : 'mind-band'} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: b.on ? t.band : t.fill }} />)}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {l.bands.map((b) => <Text key={b.label} style={[tx(11), num, { flex: 1, color: t.label2, textAlign: 'center' }]}>{b.label}</Text>)}
                  </View>
                </View>
              )}
            </View>
          ))}
          {v.later && <Text style={[tx(15, 400, 1.4), { color: t.label2 }]}>{v.later}</Text>}
          {v.link && <LinkBtn title={v.link} onPress={onWeek} style={{ paddingHorizontal: 0, paddingVertical: 12 }} />}
          {v.observation && (
            <View style={{ flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: t.sep, paddingTop: 14 }}>
              <TrendSquare />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text accessibilityRole="header" style={[tx(13, 600), { color: t.mindInk }]}>{v.observation.heading}</Text>
                <Text style={[tx(15, 400, 1.45), { color: t.label, marginTop: 2 }]}>{v.observation.text}</Text>
                <Text style={[tx(13), { color: t.label2, marginTop: 4 }]}>{v.observation.sub}</Text>
              </View>
            </View>
          )}
        </View>
      </Card>
    </>
  )
}
