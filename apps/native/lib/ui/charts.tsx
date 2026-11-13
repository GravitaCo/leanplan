/**
 * Native ports of src/ui/charts.tsx (same maths, same sizes). The KcalBar
 * fill moves over 0.3 s like the web's `transition: width 0.3s`, on the UI thread (Reanimated), and
 * holds still with the system's Reduce Motion on: the spike's micro animation.
 */
import { useContext, useEffect, useState } from 'react'
import { Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import type { DayStat } from '@/core/domain/insights'
import { DOW } from '@/core/domain/date'
import { BODY_TRACK, num, tx, useTokens, GEIST } from '../theme'
import { InPCard } from './kit'

/** Concentric rings, outermost first. Progress caps at a full ring: never an "over" state. */
export function Rings({ items, size, stroke }: { items: { pct: number; color: string }[]; size: number; stroke?: number }) {
  const sw = stroke ?? Math.round(size * 0.105)
  const c = size / 2
  const gap = Math.max(1.5, sw * 0.2)
  let r = c - sw / 2
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G rotation={-90} origin={`${c}, ${c}`}>
        {items.map((it, i) => {
          const rr = r
          r -= sw + gap
          const C = 2 * Math.PI * rr
          const p = Math.max(0, Math.min(1, it.pct || 0))
          return (
            <G key={i}>
              <Circle cx={c} cy={c} r={rr} fill="none" stroke={it.color} strokeOpacity={0.22} strokeWidth={sw} />
              {p > 0.005 && (
                <Circle cx={c} cy={c} r={rr} fill="none" stroke={it.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - p)} />
              )}
            </G>
          )
        })}
      </G>
    </Svg>
  )
}

/** Thin progress bar (0 to 1), capped at full. */
export function Meter({ pct }: { pct: number }) {
  const t = useTokens()
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 4, borderRadius: 2, backgroundColor: t.fill, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, (pct || 0) * 100))}%`, height: 4, backgroundColor: t.food, borderRadius: 2 }} />
    </View>
  )
}

/** The day's energy against its range: fill, with the range as a soft band behind it. */
export function KcalBar({ k, lo, hi }: { k: number; lo: number; hi: number }) {
  const t = useTokens()
  const reduce = useReducedMotion()
  const max = hi * 1.1 || 1
  const P = (v: number) => Math.max(0, Math.min(100, (v / max) * 100))
  const [w, setW] = useState(0)
  const fill = useSharedValue(0)
  useEffect(() => {
    const to = (P(k) / 100) * w
    fill.value = reduce || !w ? to : withTiming(to, { duration: 300, easing: Easing.inOut(Easing.ease) })
  }, [k, w, reduce]) // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ width: fill.value }))
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ position: 'relative', height: 10, borderRadius: 5, backgroundColor: t.fill, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${P(lo)}%`, width: `${P(hi) - P(lo)}%`, backgroundColor: t.band }} />
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5, backgroundColor: t.food }, style]} />
    </View>
  )
}

/** Protein, carbs and fat against their targets (Studio: value, bar, "of N g"). */
export function MacroTrio({ p, c, f, tp, tc, tf }: { p: number; c: number; f: number; tp: number; tc: number; tf: number }) {
  const t = useTokens()
  const col = (label: string, v: number, goal: number) => (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <Text style={[tx(13), { color: t.label2 }]}>{label}</Text>
      <Text style={[tx(20, 600, 1.1), num, { color: t.label }]}>
        {Math.round(v)}<Text style={[tx(13, 500, 1.1), { color: t.label2 }]}> g</Text>
      </Text>
      <Meter pct={goal ? v / goal : 0} />
      <Text style={[tx(12), num, { color: t.label2 }]}>of {goal} g</Text>
    </View>
  )
  return (
    <View style={{ flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: t.sep, paddingTop: 14 }}>
      {col('Protein', p, tp)}{col('Carbs', c, tc)}{col('Fat', f, tf)}
    </View>
  )
}

/** A small trend line, 2.2 wide with round ends; nothing with fewer than two values. */
export function Sparkline({ values, w, h, color }: { values: number[]; w: number; h: number; color: string }) {
  if (values.length < 2) return null
  const mn = Math.min(...values), mx = Math.max(...values), rg = mx - mn || 1
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - mn) / rg) * (h - 6)).toFixed(1)}`).join(' ')
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Week bars on 1 px rows at round kcal values (the web's WeekBars, same geometry). */
export function WeekBars({ rows, lo, hi, cur, numbers = true }: { rows: DayStat[]; lo: number; hi: number; cur: string; numbers?: boolean }) {
  const t = useTokens()
  const inCard = useContext(InPCard)
  const W = 320, H = 138, base = H - 20, top0 = 18, bw = 24
  const PW = numbers ? W - 34 : W
  const max = Math.max(...rows.map((x) => Math.max(x.t.k, x.r.hi)), hi) * 1.04 || 1
  const y = (v: number) => base - (v / max) * (base - top0)
  const step = PW / 7
  const gstep = Math.max(1, Math.ceil(max / 3000)) * 1000
  const grid = Array.from({ length: Math.floor(max / gstep) + 1 }, (_, i) => i * gstep)
  const gy = (v: number) => (v ? Math.round(y(v)) : base) + 0.5
  const label = `Energy this week${numbers ? `, range ${Math.round(lo)} to ${Math.round(hi)} kcal${rows.some((x) => x.r.hi !== hi) ? ', higher on workout days' : ''}` : ''}: ` +
    (rows.filter((x) => x.logged).map((x) => `${new Date(x.d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' })} ${numbers ? Math.round(x.t.k) + ' kcal' : 'logged'}`).join(', ') || 'nothing logged yet')
  const lift = (ly: number) => {
    for (const v of grid) {
      const g = gy(v)
      if (v && ly - 9 < g + 2.5 && ly + 1 > g - 2.5) return g - 3.5
    }
    return ly
  }
  const txt = (w: 500 | 600) => ({ fontFamily: GEIST[w], fontSize: 11 })
  // The figures are `.num` on the web (tabular, no tracking). SVG text can't be relied on for
  // tabular figures (react-native-svg drops the feature on the web and it is unproven on iOS), so
  // they are React Native Text laid over the chart at the SVG's scale: with a line height of 1.3 em
  // (Geist's ascent plus descent) the baseline sits 1.005 em below the line's top on every platform.
  const [cw, setCw] = useState(0)
  const k = cw / W
  const figs: { x: number; y: number; size: number; anchor: 'end' | 'middle'; color: string; text: string }[] = []
  if (numbers) {
    for (const v of grid) figs.push({ x: W, y: gy(v) + 3.5, size: 10, anchor: 'end', color: t.label2, text: v.toLocaleString('en-GB') })
    rows.forEach((x, i) => {
      if (!x.logged) return
      figs.push({ x: step * i + step / 2, y: lift(y(x.t.k) - 5), size: 11, anchor: 'middle', color: x.d === cur ? t.label : t.label2, text: Math.round(x.t.k).toLocaleString('en-GB') })
    })
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} onLayout={(e: LayoutChangeEvent) => setCw(e.nativeEvent.layout.width)}
      style={{ width: '100%', aspectRatio: W / H, marginTop: inCard ? 0 : 6, marginBottom: inCard ? 0 : 2 }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {grid.map((v) => (
          <G key={'g' + v}>
            <Line x1={0} x2={PW} y1={gy(v)} y2={gy(v)} stroke={t.grid} strokeWidth={1} />
          </G>
        ))}
        {rows.map((x, i) => {
          const cx = step * i + step / 2
          const top = y(x.t.k)
          const on = x.d === cur
          return (
            <G key={x.d}>
              {x.logged ? (
                <>
                  <Rect x={cx - bw / 2} y={top} width={bw} height={Math.max(4, base - top)} rx={6} fill={on ? t.energyInk : t.energy} />
                </>
              ) : !x.future ? (
                <Rect x={cx - bw / 2} y={base - 3} width={bw} height={3} rx={1.5} fill={t.fill3} />
              ) : null}
              <SvgText x={cx} y={H - 4} textAnchor="middle" fill={on ? t.label : t.label2} {...txt(600)} letterSpacing={BODY_TRACK}>{DOW[i]}</SvgText>
            </G>
          )
        })}
      </Svg>
      {k > 0 && figs.map((f, i) => {
        const fs = f.size * k, lh = fs * 1.3, top = (f.y - f.size * 1.005) * k
        const box = f.anchor === 'end' ? { left: 0, width: f.x * k } : { left: (f.x - 40) * k, width: 80 * k }
        return (
          <Text key={i} numberOfLines={1} style={[{ position: 'absolute', top, ...box, textAlign: f.anchor === 'end' ? 'right' : 'center', fontFamily: GEIST[500], fontSize: fs, lineHeight: lh, color: f.color }, num]}>
            {f.text}
          </Text>
        )
      })}
    </View>
  )
}
