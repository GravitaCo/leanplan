/**
 * TODO(N1-followup): what Train still needs that lib/ui doesn't have yet, each a direct port of a
 * web class: `Li`/`LiText` for rows lib/ui's Row can't hold (a thumbnail, a control, a wrapped sub),
 * `.x-btn` (`XBtn`), `.stack` (`Stack`), the inline, flat and labelled `.linkbtn` (`TextLink`),
 * `.list`'s 8 pt below (`LIST_GAP`) and the form rows (`.frow`, its input and select: N1's
 * "fields", P2). Train-only: nothing else imports this file. Emptied and deleted before the
 * screens merge.
 */
import type { ReactNode } from 'react'
import { toPoint } from './nav'
import { ActionSheetIOS, Alert, Platform, Pressable, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { Icon, type IconName } from '../../lib/ui/icons'
import { font, num, tx, useTokens } from '../../lib/theme'


/** What the Train screens hand back to the app shell (the lead wires these in app/(tabs)/train.tsx). */


/** `.list`'s 8 pt below (theme.css .list); lib/ui List has no bottom margin yet. TODO(N1-followup) */
export const LIST_GAP: ViewStyle = { marginBottom: 8 }

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


/** `.li`: a 44 px row, 10×16 padding, 12 gap; pressable when `onPress` is set */
export function Li({ children, onPress, style, label, disabled }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; disabled?: boolean }) {
  const base: StyleProp<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }, style]
  if (!onPress) return <View style={base}>{children}</View>
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.6 }]}>{children}</Pressable>
}
/** `.li .m` with `.t` and `.s`; `wrap` lets them wrap (`.s.wrap`, `.pv-row .t`) */
export function LiText({ t: title, s, tStyle, sStyle, wrap, children }: { t: ReactNode; s?: ReactNode; tStyle?: StyleProp<TextStyle>; sStyle?: StyleProp<TextStyle>; wrap?: boolean; children?: ReactNode }) {
  const t = useTokens()
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={wrap ? undefined : 1} style={[tx(17, 400), { color: t.label }, tStyle]}>{title}</Text>
      {s != null && s !== '' && <Text numberOfLines={wrap ? undefined : 1} style={[tx(13, 400), { color: t.label2, marginTop: 2 }, sStyle]}>{s}</Text>}
      {children}
    </View>
  )
}


/** `.frow`: label left, the value right-aligned */
export function FRow({ label, children }: { label: string; children: ReactNode }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 }}>
      <Text style={[tx(17, 400), { minWidth: 96, flexShrink: 0, color: t.label }]}>{label}</Text>
      {children}
    </View>
  )
}

/** an input as `.frow input`: right-aligned, no box */
export function FInput(p: TextInputProps & { numeric?: boolean; decimal?: boolean }) {
  const t = useTokens()
  const { numeric, decimal, style, onChangeText, ...rest } = p
  return <TextInput onChangeText={onChangeText && ((v) => onChangeText(decimal ? toPoint(v) : v))} placeholderTextColor={t.label3} keyboardType={decimal ? 'decimal-pad' : numeric ? 'number-pad' : 'default'}
    style={[font(400), { flex: 1, minWidth: 0, fontSize: 17, color: t.label, textAlign: 'right', paddingVertical: 11 }, (numeric || decimal) && num, style]} {...rest} />
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

