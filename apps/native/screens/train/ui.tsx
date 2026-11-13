/**
 * Train's own small pieces that lib/ui doesn't offer: `Stack` (`.stack`), the flat and labelled
 * `.linkbtn` (`TextLink`; lib/ui's TextLink is the inline one inside a sentence), the round button
 * with a chevron for the builder's move up/down (`XBtn`; lib/ui's XBtn is the x only) and the
 * select for a form row (`FSelect`, used as lib/ui FRow's `right`). Rows are lib/ui's Row.
 */
import type { ReactNode } from 'react'
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Icon, type IconName } from '../../lib/ui/icons'
import { font, tx, useTokens } from '../../lib/theme'

/** `.stack`: buttons in a column, 8 apart, 16 above */
export function Stack({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: 8, marginTop: 16 }, style]}>{children}</View>
}
/**
 * `.linkbtn` where lib/ui's LinkBtn can't: `inl` inside running text (it inherits the sentence's font),
 * `flat` on its own in a row with no padding (`.linkbtn.inl`, `.ex .howto`, `.addset`) but a 44 pt
 * touch area, with an aria-label, a colour or an expanded state.
 */
export function TextLink({ title, onPress, muted, inl, flat, color, style, label, size, expanded }: { title: string; onPress: () => void; muted?: boolean; inl?: boolean; flat?: boolean; color?: string; style?: StyleProp<TextStyle>; label?: string; size?: number; expanded?: boolean }) {
  const st = expanded === undefined ? undefined : { expanded }
  const t = useTokens()
  const s: TextStyle = { color: color ?? (muted ? t.label2 : t.tint), fontSize: size ?? 15 }
  if (inl) return <Text accessibilityRole="button" accessibilityState={st} accessibilityLabel={label} onPress={onPress} style={[font(400), s, style]}>{title}</Text>
  if (flat) return (
    <Pressable accessibilityRole="button" accessibilityState={st} accessibilityLabel={label} onPress={onPress} hitSlop={12}>
      <Text style={[tx(size ?? 15, 400), s, style]}>{title}</Text>
    </Pressable>
  )
  return (
    <Pressable accessibilityRole="button" accessibilityState={st} accessibilityLabel={label} onPress={onPress} hitSlop={6} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
      <Text style={[font(400), s, style]}>{title}</Text>
    </Pressable>
  )
}

/** `.x-btn`: the 30 px round remove button */
export function XBtn({ label, onPress, icon = 'x', disabled, rotate = 0 }: { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; rotate?: number }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={7}
      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1, transform: [{ rotate: `${rotate}deg` }] }}>
      <Icon name={icon} size={20} stroke={2.6} color={t.label2} />
    </Pressable>
  )
}

/**
 * `.frow select`: the value in label2; tapping it offers the options the way the platform shows a
 * select (an action sheet on iOS, a list on Android), as the web's select does on a phone.
 */
export function FSelect({ value, options, onChange, title }: { value: string; options: string[]; onChange: (v: string) => void; title: string }) {
  const t = useTokens()
  const open = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options, 'Cancel'], cancelButtonIndex: options.length }, (i) => { if (i < options.length) onChange(options[i]) })
    } else {
      Alert.alert(title, undefined, [...options.map((o) => ({ text: o, onPress: () => onChange(o) })), { text: 'Cancel', style: 'cancel' as const }])
    }
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${value}`} onPress={open} style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', paddingVertical: 11 }}>
      <Text numberOfLines={1} style={[tx(17, 400), { color: t.label }]}>{value}</Text>
    </Pressable>
  )
}

