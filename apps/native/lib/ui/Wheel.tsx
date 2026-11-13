/**
 * Native port of src/ui/Wheel.tsx (board r2-age): a vertical column of numbers, the chosen one
 * large on a card, the rest smaller and fainter. Drag with snapping or tap a row; for VoiceOver and
 * TalkBack it is an adjustable control with the web's aria label and value text.
 *
 * `value` undefined means nothing is picked yet: the wheel rests on `initial` but says "Not set",
 * so an untouched wheel never answers for the person. Numbers settle over 0.18 s, at once with
 * Reduce Motion on.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Text, View } from 'react-native'
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import { GEIST, num, useTokens } from '../theme'

const SIZE = [44, 30, 26, 22]
const FADE = [1, 0.55, 0.32, 0.18]

function Row({ i, pos, half, rowH, color, bold }: { i: number; pos: SharedValue<number>; half: number; rowH: number; color: string; bold: boolean }) {
  const style = useAnimatedStyle(() => {
    const d = Math.min(Math.abs(i - pos.value), 3)
    return {
      transform: [{ translateY: (i - pos.value + half) * rowH }],
      fontSize: interpolate(d, [0, 1, 2, 3], SIZE),
      opacity: interpolate(d, [0, 1, 2, 3], FADE),
    }
  })
  return (
    <Animated.Text style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: rowH, lineHeight: rowH, textAlign: 'center', color, fontFamily: GEIST[bold ? 600 : 400], letterSpacing: 0 }, num, style]}>
      {i}
    </Animated.Text>
  )
}

export function Wheel({ min, max, value, initial, onChange, label, unit, valueText, rows = 7, rowH = 48 }: {
  min: number; max: number; value: number | undefined; initial: number; onChange: (v: number) => void
  label: string; unit?: string; valueText?: (v: number) => string; rows?: number; rowH?: number
}) {
  const t = useTokens()
  const reduce = useReducedMotion()
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const base = clamp(value ?? initial)
  const [drag, setDrag] = useState<number | null>(null)
  const pos = drag ?? base
  const half = Math.floor(rows / 2)

  const p = useSharedValue(base)
  useEffect(() => {
    p.value = drag != null || reduce ? pos : withTiming(pos, { duration: 180, easing: Easing.out(Easing.ease) })
  }, [pos, drag, reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  const live = useRef({ base, onChange, clamp })
  live.current = { base, onChange, clamp }
  const start = useRef({ pos: 0, moved: false })
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = { pos: live.current.base, moved: false } },
    onPanResponderMove: (_, g) => {
      if (Math.abs(g.dy) > 4) start.current.moved = true
      if (start.current.moved) setDrag(Math.min(max + 0.4, Math.max(min - 0.4, start.current.pos - g.dy / rowH)))
    },
    onPanResponderRelease: (e, g) => {
      const { clamp: c, onChange: done, base: b } = live.current
      setDrag(null)
      if (start.current.moved) return done(c(Math.round(start.current.pos - g.dy / rowH)))
      // a tap: the row under the finger (the middle row picks what's shown)
      done(c(b + Math.floor(e.nativeEvent.locationY / rowH) - half))
    },
    onPanResponderTerminate: () => setDrag(null),
  }), [min, max, rowH, half])

  const from = Math.max(min, Math.floor(pos) - half - 1)
  const to = Math.min(max, Math.ceil(pos) + half + 1)
  const items: number[] = []
  for (let i = from; i <= to; i++) if (Math.abs(i - pos) <= half + 0.5) items.push(i)
  const text = value === undefined ? 'Not set' : valueText ? valueText(value) : `${value}${unit ? ' ' + unit : ''}`
  const color = value === undefined ? t.label3 : t.label

  return (
    <View style={{ position: 'relative', height: rows * rowH }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: half * rowH, height: rowH, borderRadius: 14, backgroundColor: t.card }} />
      <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={label}
        accessibilityValue={{ min, max, now: base, text }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(clamp(base + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 14 }}>
        {/* the rows never take the touch, so a tap's locationY is measured from the column's top */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {items.map((i) => <Row key={i} i={i} pos={p} half={half} rowH={rowH} color={color} bold={Math.abs(i - pos) < 0.5} />)}
        </View>
      </View>
      {unit && (
        <View pointerEvents="none" style={{ position: 'absolute', left: '50%', marginLeft: 38, top: half * rowH, height: rowH, justifyContent: 'center' }}>
          <Text style={{ fontFamily: GEIST[400], fontSize: 17, letterSpacing: -0.17, color: t.label2 }}>{unit}</Text>
        </View>
      )}
    </View>
  )
}
