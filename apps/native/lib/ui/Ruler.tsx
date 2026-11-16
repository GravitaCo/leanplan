/**
 * Native port of src/ui/Ruler.tsx (boards r3-weight, ob1-7-body): ticks slide under a fixed mauve
 * marker, a long labelled tick every `major`, a middle one every `mid`. Drag with snapping; for
 * VoiceOver and TalkBack it is an adjustable control (swipe up or down one tick), with the web's
 * aria label and value text. It works in whole ticks: the caller maps its unit onto them.
 *
 * `value` undefined means nothing is picked yet: the ruler rests on `initial` but says "Not set".
 * The ticks settle over 0.18 s after a change, at once with Reduce Motion on.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { num, tx, useTokens } from '../theme'
import { UI } from '@/copy/ui'

export function Ruler({ min, max, value, initial, onChange, label, valueText, major = 10, mid = 5, px = 9.2, tickLabel }: {
  min: number; max: number; value: number | undefined; initial: number; onChange: (v: number) => void
  label: string; valueText: (v: number) => string
  major?: number; mid?: number; px?: number; tickLabel?: (v: number) => string
}) {
  const t = useTokens()
  const reduce = useReducedMotion()
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const base = clamp(value ?? initial)
  const [drag, setDrag] = useState<number | null>(null)
  const pos = drag ?? base
  const [w, setW] = useState(0)

  const x = useSharedValue(-base * px)
  useEffect(() => {
    const to = -pos * px
    x.value = drag != null || reduce ? to : withTiming(to, { duration: 180, easing: Easing.out(Easing.ease) })
  }, [pos, drag, reduce, px]) // eslint-disable-line react-hooks/exhaustive-deps
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  // the responder is made once and reads every prop through this ref, so a unit switch (kg to lb,
  // cm to ft/in changes min, max and px) is seen by the very next gesture
  const live = useRef({ base, onChange, clamp, min, max, px })
  live.current = { base, onChange, clamp, min, max, px }
  const start = useRef(0)
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = live.current.base },
    onPanResponderMove: (_, g) => { const l = live.current; setDrag(Math.min(l.max + 0.4, Math.max(l.min - 0.4, start.current - g.dx / l.px))) },
    onPanResponderRelease: (_, g) => {
      const v = live.current.clamp(Math.round(start.current - g.dx / live.current.px))
      setDrag(null)
      live.current.onChange(v)
    },
    onPanResponderTerminate: () => setDrag(null),
  }), [])

  const step = (by: number) => onChange(clamp(base + by))

  // only the ticks near the marker are drawn (a phone shows about 45)
  const span = 34
  const ticks: number[] = []
  for (let i = Math.max(min, Math.floor(pos) - span); i <= Math.min(max, Math.ceil(pos) + span); i++) ticks.push(i)

  return (
    <View {...pan.panHandlers} onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min, max, now: base, text: value === undefined ? UI.notSet : valueText(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ position: 'relative', height: 90, marginTop: 10, marginHorizontal: -20, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', left: w / 2, top: 0, height: 80 }, track]}>
        {ticks.map((i) => {
          const k = i % major === 0 ? 'mj' : i % mid === 0 ? 'md' : ''
          return (
            <View key={i} style={{ position: 'absolute', top: 0, left: i * px - 1, width: 2, height: k === 'mj' ? 40 : k === 'md' ? 26 : 16, borderRadius: 1, backgroundColor: k === 'mj' ? t.label : t.dash }}>
              {k === 'mj' && (
                <View style={{ position: 'absolute', top: 50, left: -39, width: 80, alignItems: 'center' }}>
                  <Text numberOfLines={1} style={[tx(13), num, { color: t.label2 }]}>{tickLabel ? tickLabel(i) : i}</Text>
                </View>
              )}
            </View>
          )
        })}
      </Animated.View>
      <View style={{ position: 'absolute', left: w / 2 - 2, top: -4, width: 4, height: 50, borderRadius: 2, backgroundColor: t.tint }} />
    </View>
  )
}
