/**
 * The video screens' controls (web theme.css `.gp-*`): white on the footage, the same in light and
 * dark. Shared by the guided player and the warm-up player.
 */
import type { ReactNode } from 'react'
import { Platform, Pressable, Text, Vibration, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { font, num, tx } from '../../lib/theme'

const BRAND = '#cd7fae' // --brand, the same in both modes

/**
 * The web's `navigator.vibrate(ms)`: Android only, as on the web (iOS Safari has no vibrate), so the
 * phone does what the web app does. A haptic on iOS is an improvement candidate (brief §4, N1).
 */
export const vibrate = (ms: number) => { if (Platform.OS === 'android') Vibration.vibrate(ms) }

/** `.gp-shade` (and `.gp.holding .gp-shade`, deeper under the hold timer) */
export function GpShade({ holding }: { holding?: boolean }) {
  return holding
    ? <Shade stops={[[0, 0.32], [0.15, 0], [0.38, 0], [0.66, 0.82], [1, 0.82]]} />
    : <Shade stops={[[0, 0.32], [0.15, 0], [0.58, 0], [0.88, 0.72], [1, 0.72]]} />
}

/** `.gp-top`: the row of round buttons and the pill, 14 below the safe area */
export function GpTop({ children }: { children: ReactNode; plain?: boolean }) {
  const insets = useSafeAreaInsets()
  return <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{children}</View>
}
/** `.gp-bot`: the controls block, 34 above the safe area */
export function GpBot({ children, label, style }: { children: ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets()
  return <View accessibilityLabel={label} style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 34, gap: 12 }, style]}>{children}</View>
}
/** `.gp-rb`: a 40 px round button (`.plain`: a lighter fill on the dark background) */
export function GpRound({ children, label, onPress, plain }: { children: ReactNode; label: string; onPress: () => void; plain?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: plain ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
      {children}
    </Pressable>
  )
}
/** `.gp-pill` */
export function GpPill({ children, plain }: { children: ReactNode; plain?: boolean }) {
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: plain ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.28)' }}>
      <Text style={[tx(13, 500), num, { color: '#fff' }]}>{children}</Text>
    </View>
  )
}
/** `.gp-clock`: 64 px light figures and a smaller line beside them */
/** `light`: the web's 300 (200 in the warm-up), Geist Light and ExtraLight */
export function GpClock({ big, small, label, size = 64, light = 300 }: { big: string; small?: string; label: string; size?: number; light?: 200 | 300 }) {
  return (
    <View accessible accessibilityRole="timer" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
      <Text style={[font(light), num, { fontSize: size, lineHeight: size, letterSpacing: -1.9, color: '#fff' }]}>{big}</Text>
      {!!small && <Text style={[font(400), num, { flexShrink: 1, fontSize: 15, color: 'rgba(255,255,255,0.85)' }]}>{small}</Text>}
    </View>
  )
}
/** `.gp-bar`: a 4 px track filling in the brand colour */
export function GpBar({ value }: { value: number }) {
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: BRAND }} />
    </View>
  )
}
/** `.gp-main`: the white 56 px pill */
export function GpMain({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.75 : 1 })}>
      <Text style={[tx(17, 600), { color: '#1d1d1f' }]}>{title}</Text>
    </Pressable>
  )
}
/** `.gp-sec`: the 96 px translucent button beside it */
export function GpSec({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ width: 96, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
      <Text style={[tx(17, 500), { color: '#fff' }]}>{title}</Text>
    </Pressable>
  )
}
/** `.gp-adj`: a centred text button */
export function GpTextBtn({ title, onPress, regular }: { title: string; onPress: () => void; regular?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={{ alignSelf: 'center', height: 32, justifyContent: 'center' }}>
      <Text style={[font(regular ? 400 : 500), { fontSize: 15, color: '#fff' }]}>{title}</Text>
    </Pressable>
  )
}
export const BRAND_COLOR = BRAND

/** the three dots of the player's menu button */
export function Dots({ color }: { color: string }) {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}><Circle cx="5" cy="12" r="2" /><Circle cx="12" cy="12" r="2" /><Circle cx="19" cy="12" r="2" /></Svg>
}

/**
 * A vertical shade (the web's `linear-gradient` on the video screens), behind its parent's content:
 * stops as [offset 0–1, black opacity].
 */
export function Shade({ stops }: { stops: [number, number][] }) {
  const id = 'g' + stops.map((x) => x.join('_')).join('-').replace(/\./g, '')
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, a], i) => <Stop key={i} offset={o} stopColor="#000" stopOpacity={a} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  )
}

