/**
 * The few Studio pieces the spike's Summary needs (card, tile, buttons, page header). N1 builds the
 * full primitive set (Sheet, Seg, Toggle, Disclosure, SettingRow…) with `design` review.
 */
import type { ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { font, useTokens } from '../theme'

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  // .card.pcard: radius 22, padding 16, a 14 px gap between rows
  return <View style={[{ backgroundColor: t.card, borderRadius: t.radius, padding: 16, gap: 14 }, style]}>{children}</View>
}

export function Tile({ children, onPress, label, style }: { children: ReactNode; onPress?: () => void; label?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  // .tile.st
  const s: StyleProp<ViewStyle> = [{ minWidth: 0, backgroundColor: t.card, borderRadius: t.radius, padding: 16, gap: 4 }, style]
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.7 }]}>{children}</Pressable>
    : <View style={s}>{children}</View>
}

/** `.btn` (ink pill), `.btn.gray`, `.btn.sm` */
export function Btn({ title, onPress, kind = 'ink', small, icon, disabled }: { title: string; onPress: () => void; kind?: 'ink' | 'gray' | 'tinted'; small?: boolean; icon?: ReactNode; disabled?: boolean }) {
  const t = useTokens()
  const bg = kind === 'ink' ? t.btn : kind === 'gray' ? t.fill : t.tintSoft
  const fg = kind === 'ink' ? t.btnInk : kind === 'gray' ? t.label : t.tint
  const h = small ? 32 : kind === 'gray' ? 48 : 50
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ height: h, borderRadius: h / 2, paddingHorizontal: small ? 14 : 16, alignSelf: small ? 'flex-start' : 'stretch', backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
      {icon}
      <Text style={[font(600), { color: fg, fontSize: small ? 14 : kind === 'gray' ? 16 : 17 }]}>{title}</Text>
    </Pressable>
  )
}

export function LinkBtn({ title, onPress, style }: { title: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={[font(500), { fontSize: 15, color: t.tint }, style]}>{title}</Text>
    </Pressable>
  )
}

/** "Mo"… initials as the web's ProfileButton computes them. */
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

/** `.hdr`: eyebrow, 34 pt title, the Profile avatar beside it (`.avatar.soft`: soft mauve, mauve
 *  letters; Benn, 10 Oct 2026), in a 44 pt tap area. */
export function PageHeader({ eyebrow, title, name, onAvatar }: { eyebrow: string; title: string; name: string; onAvatar?: () => void }) {
  const t = useTokens()
  return (
    <View style={{ paddingTop: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[font(500), { fontSize: 13, color: t.label2, minHeight: 20 }]}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={[font(600), { fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: t.label, marginTop: 2 }]}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onAvatar} hitSlop={2}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[font(600), { fontSize: 16, color: t.tint }]}>{initials(name) || '·'}</Text>
      </Pressable>
    </View>
  )
}
