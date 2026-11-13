/**
 * Body weight, ported from src/screens/body/WeightSheet.tsx: log today's weight and, when weight is
 * shown back, the trend over the last 30 entries, the change against last week and the last 14
 * entries. With the weight hidden (Onboarding 9) only the input shows.
 */
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { useStore } from '@/store/store'
import { fmtDate, r1 } from '@/core/domain/date'
import { weightWeekDelta } from '@/core/domain/insights'
import { foodView } from '@/core/domain/foodMode'
import { font, num, useTokens } from '../../lib/theme'
import { Foot, Li, List, NavBtn, Sheet, T } from './ui'

interface Point { d: string; w: number }

/** The web's buildPath, unchanged. */
function buildPath(points: Point[], w: number, h: number, pad: number) {
  if (points.length < 2) return { line: '', area: '', dots: [] as { x: number; y: number }[] }
  const weights = points.map((p) => p.w)
  const min = Math.min(...weights)
  const range = Math.max(...weights) - min || 1
  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (w - pad * 2),
    y: pad + (1 - (p.w - min) / range) * (h - pad * 2),
  }))
  const line = coords.map((c, i) => (i === 0 ? `M${c.x},${c.y}` : `L${c.x},${c.y}`)).join(' ')
  const area = `${line} L${coords[coords.length - 1].x},${h} L${coords[0].x},${h} Z`
  return { line, area, dots: coords }
}

export function WeightSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const setWeight = useStore((s) => s.setWeight)
  const back = foodView(data.profile).weightBack
  const today = back ? data.days[cur]?.weight : null
  const [bw, setBw] = useState(today ? String(today) : '')

  const points: Point[] = Object.keys(data.days).filter((d) => data.days[d].weight != null).sort().slice(-30)
    .map((d) => ({ d, w: data.days[d].weight as number }))
  const W = 320, H = 130
  const { line, area, dots } = buildPath(points, W, H, 12)
  const delta = weightWeekDelta(data, cur)
  // only a plain number saves, as with the web's number field; a decimal comma (iOS decimal pad in
  // comma locales) reads as a point
  const save = () => { const x = bw.trim(); const v = /^\d*([.,]\d*)?$/.test(x) ? parseFloat(x.replace(',', '.')) : NaN; if (v) { setWeight(v); onClose() } }

  return (
    <Sheet title="Body weight" tall onClose={onClose} right={<NavBtn title="Save" bold onPress={save} />}>
      <View style={{ backgroundColor: t.elev, borderRadius: t.radius, padding: 16 }}>
        {/* .gram */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 6, marginBottom: 4 }}>
          <TextInput autoFocus keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={t.label3} value={bw} onChangeText={setBw}
            accessibilityLabel={`Weight for ${fmtDate(cur).dow} in kg`} onSubmitEditing={save}
            style={[font(600), num, { fontSize: 40, color: t.label, textAlign: 'right', minWidth: 112, padding: 0 }]} />
          <Text style={[font(600), { fontSize: 20, color: t.label2 }]}>kg</Text>
        </View>
      </View>
      {back && (
        <>
          <Foot style={{ paddingBottom: 8 }}>Weight swings 1–2 kg day to day with water, salt and sleep. The weekly average is the number to watch.</Foot>
          {points.length >= 2 && (
            <View style={{ backgroundColor: t.elev, borderRadius: t.radius, padding: 16, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <T w={600} s={15} c={t.bodyInk}>Last {points.length} entries</T>
                {delta != null && <T s={15} c={t.label2} style={num}>{delta > 0 ? '+' : delta < 0 ? '−' : ''}{Math.abs(delta)} kg vs last week</T>}
              </View>
              <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" accessibilityLabel="Weight trend">
                <Defs>
                  <LinearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={t.body} stopOpacity={0.28} />
                    <Stop offset="1" stopColor={t.body} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Path d={area} fill="url(#wfill)" />
                <Path d={line} fill="none" stroke={t.bodyInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {dots.length > 0 && <Circle cx={dots[dots.length - 1].x} cy={dots[dots.length - 1].y} r={4.5} fill={t.bodyInk} />}
              </Svg>
            </View>
          )}
          {points.length > 0 && (
            <List bg={t.elev}>
              {points.slice().reverse().slice(0, 14).map((p, i) => (
                <Li key={p.d} first={i === 0}>
                  <T s={17} style={{ flex: 1 }} lines={1}>{fmtDate(p.d).full}</T>
                  <T s={17} c={t.label2} style={num}>{r1(p.w)} kg</T>
                </Li>
              ))}
            </List>
          )}
        </>
      )}
    </Sheet>
  )
}
