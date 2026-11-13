/**
 * The video screens' controls (web theme.css `.gp-*`): white on the footage, the same in light and
 * dark. Shared by the guided player and the warm-up player.
 */
import type { ReactNode } from 'react'
import { Platform, Pressable, Text, Vibration, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Shade, font, num } from './ui'

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
      <Text style={[font(500), num, { fontSize: 13, color: '#fff' }]}>{children}</Text>
    </View>
  )
}
/** `.gp-clock`: 64 px light figures and a smaller line beside them */
export function GpClock({ big, small, label }: { big: string; small?: string; label: string }) {
  return (
    <View accessibilityRole="timer" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
      <Text style={[font(400), num, { fontSize: 64, lineHeight: 68, fontWeight: '300', letterSpacing: -1.9, color: '#fff' }]}>{big}</Text>
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
      <Text style={[font(600), { fontSize: 17, color: '#1d1d1f' }]}>{title}</Text>
    </Pressable>
  )
}
/** `.gp-sec`: the 96 px translucent button beside it */
export function GpSec({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ width: 96, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
      <Text style={[font(500), { fontSize: 17, color: '#fff' }]}>{title}</Text>
    </Pressable>
  )
}
/** `.gp-adj`: a centred text button */
export function GpTextBtn({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={{ alignSelf: 'center', height: 32, justifyContent: 'center' }}>
      <Text style={[font(500), { fontSize: 15, color: '#fff' }]}>{title}</Text>
    </Pressable>
  )
}
export const BRAND_COLOR = BRAND
