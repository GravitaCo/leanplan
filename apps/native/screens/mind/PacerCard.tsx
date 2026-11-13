/**
 * The P6 Glow pacer card (board B7, canvas 8c), Mind-only, ported from src/screens/mind/Pacer.tsx
 * and reset.css `.card.reset-glow`. The count is driven from code (usePacerClock: the shared pacerAt
 * at each whole second); the sphere and rings move on the UI thread with Reanimated, one segment per
 * phase whose Easing.inOut(Easing.sin) equals pacerAt's ease, and the ring sizes read from the
 * board's keyframes in the shared glow.ts, as glowAt does. With Reduce Motion the card draws the
 * still middle frame (pacerGlow) and ignores segments; the word and count still step.
 */
import { useEffect } from 'react'
import { AccessibilityInfo, Platform, Text, View } from 'react-native'
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withTiming, ReduceMotion, type SharedValue } from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import type { PacerPattern } from '@/core/domain/pacer'
import { BORDER, DIAM, KNOTS, OPAC, S_MIN } from '@/screens/mind/glow'
import { Card } from '../../lib/ui/kit'
import { num, tx, useTokens } from '../../lib/theme'
import { pacerGlow } from './model'
import { usePacerClock } from './usePacerClock'

/** `.reset-glow .sph`: 260 pt */
const SPHERE = 260
const EASE = Easing.inOut(Easing.sin)

function MovingRing({ i, full, color }: { i: number; full: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const d = interpolate(full.value, KNOTS, [DIAM[0][i], DIAM[1][i], DIAM[2][i]])
    return {
      width: d, height: d, borderRadius: d / 2, marginLeft: -d / 2, marginTop: -d / 2,
      opacity: interpolate(full.value, KNOTS, [OPAC[0][i], OPAC[1][i], OPAC[2][i]]),
      borderWidth: interpolate(full.value, KNOTS, BORDER),
    }
  })
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: '50%', borderColor: color }, style]} />
}

/** The sphere: --card to 58%, --mind-fill at 88%, --mind at the rim, with a crisp 2 pt --mind edge. */
function Sphere() {
  const t = useTokens()
  const r = SPHERE / 2
  return (
    <Svg width={SPHERE} height={SPHERE}>
      <Defs>
        <RadialGradient id="resetGlow" cx={r} cy={r} r={r} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={t.card} />
          <Stop offset="0.58" stopColor={t.card} />
          <Stop offset="0.88" stopColor={t.mindFill} />
          <Stop offset="1" stopColor={t.mind} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#resetGlow)" />
      <Circle cx={r} cy={r} r={r - 1} fill="none" stroke={t.mind} strokeWidth={2} />
    </Svg>
  )
}

/**
 * `run` is null before a start (the sphere at rest, no count) and changes for each new run.
 * `onLeft` hears the "m:ss" left whenever it changes; `onDone` fires once, at the end of the last
 * breath out. Unmounting or a null `run` stops the clock and reports nothing.
 */
export function PacerCard({ pattern, minutes, run, reduced, onLeft, onDone }: {
  pattern: PacerPattern; minutes: number; run: number | null; reduced: boolean
  onLeft?: (left: string) => void; onDone?: () => void
}) {
  const t = useTokens()
  const full = useSharedValue(0)
  const st = usePacerClock(pattern, minutes, run, {
    onLeft, onDone,
    onSegment: (seg) => {
      if (reduced) return
      full.value = seg.from
      full.value = withTiming(seg.to, { duration: seg.durationMs, easing: EASE, reduceMotion: ReduceMotion.Never })
    },
  })
  // a new run (or none) starts the sphere at rest
  useEffect(() => { cancelAnimation(full); full.value = 0 }, [run, full])
  // iOS has no live regions: VoiceOver hears each new word (never the count) as an announcement
  const word = st && !st.done ? st.word : ''
  useEffect(() => { if (word && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(word) }, [word, st?.breath])
  const sphere = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(full.value, [0, 1], [S_MIN, 1]) }] }))
  const still = reduced ? pacerGlow(true, 0) : null

  return (
    <Card plain style={{ height: 400, padding: 0, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {still
        ? still.rings.map((r, i) => (
          <View key={i} pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', width: r.d, height: r.d, borderRadius: r.d / 2, marginLeft: -r.d / 2, marginTop: -r.d / 2, opacity: r.o, borderWidth: r.w, borderColor: t.mind }} />
        ))
        : [0, 1, 2, 3].map((i) => <MovingRing key={i} i={i} full={full} color={t.mind} />)}
      <Animated.View testID="reset-sphere" pointerEvents="none"
        style={[{ position: 'absolute', left: '50%', top: '50%', width: SPHERE, height: SPHERE, marginLeft: -SPHERE / 2, marginTop: -SPHERE / 2 },
          still ? { transform: [{ scale: still.sphere }] } : sphere]}>
        <Sphere />
      </Animated.View>
      {st && !st.done && (
        <View pointerEvents="none" style={{ alignItems: 'center' }}>
          {/* the guided player's count: 112, weight 200, tabular, --label; hidden from screen readers,
              which hear the word only (web: count aria-hidden, word aria-live polite) */}
          <Text testID="reset-count" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[tx(112, 200, 1, -0.05), num, { letterSpacing: -5.6, color: t.label }]}>{st.count}</Text>
          <Text testID="reset-word" accessibilityLiveRegion="polite" style={[tx(17, 500), { marginTop: 4, color: t.mindInk }]}>{st.word}</Text>
        </View>
      )}
    </Card>
  )
}
