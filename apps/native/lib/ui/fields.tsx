/**
 * Studio's form fields on native (theme.css "inputs"): the filled input and textarea, `.field` (a
 * 13 pt label above), `.frow` (label left, value right, in a List), `.sheet-input`, the borderless
 * `.pb-name` card field and `.searchbar`. The focus ring is the web's: 2 pt of the tint at 50%,
 * drawn as an outline so nothing moves. The label is the input's accessibility label, as the web's
 * `<label for>` makes it.
 */
import { useContext, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { Icon } from './icons'
import { InSheet, slop, useSurface } from './kit'
import { tx, useTokens } from '../theme'

type InputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'>

/**
 * The placeholder colour, --placeholder in both apps (Benn, 13 Nov: the colour that passes
 * accessibility): the lightest grey with at least 4.5:1 against every field fill, light and dark
 * (#646469 / #aaaaaf). The web's theme.css sets the same token for every input::placeholder.
 */
const placeholder = (t: ReturnType<typeof useTokens>) => t.placeholder

/** Focus handlers that keep the caller's own; `focused` is returned beside them, never spread. */
function useFocus(props: InputProps): [boolean, Pick<TextInputProps, 'onFocus' | 'onBlur'>] {
  const [focused, setFocused] = useState(false)
  return [focused, {
    onFocus: (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => { setFocused(true); props.onFocus?.(e) },
    onBlur: (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => { setFocused(false); props.onBlur?.(e) },
  }]
}

/** A tint with alpha, from a #rrggbb token. */
const alpha = (hex: string, a: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + a : hex)

/**
 * The filled input (`input`, 17 pt on --fill, radius 10, padding 11 12). `sheetInput` is
 * `.sheet-input` (on --elev inside a sheet); `multiline` is a textarea (on --elev inside a sheet).
 */
export function Input({ label, sheetInput, style, ...props }: InputProps & { label: string; sheetInput?: boolean; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  const inSheet = useContext(InSheet)
  const [focused, f] = useFocus(props)
  const bg = inSheet && (sheetInput || props.multiline) ? t.elev : t.fill
  return (
    <TextInput {...props} {...f} accessibilityLabel={label} placeholderTextColor={placeholder(t)}
      style={[tx(17, 400, 1.3, 0), { color: t.label, backgroundColor: bg, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 },
        props.multiline && { textAlignVertical: 'top' }, focused && { outlineColor: alpha(t.tint, '80'), outlineWidth: 2, outlineStyle: 'solid' } as TextStyle, style]} />
  )
}

/** `.field`: a 13 pt --label2 label 5 above its input, 10 below the field. */
export function Field({ label, children, hideLabel }: { label: string; children: ReactNode; hideLabel?: boolean }) {
  const t = useTokens()
  return (
    <View style={{ marginBottom: 10 }}>
      {!hideLabel && <Text style={[tx(13), { color: t.label2, marginBottom: 5 }]} importantForAccessibility="no" accessibilityElementsHidden>{label}</Text>}
      {children}
    </View>
  )
}

/**
 * `.frow`: a form row in a List: the 17 pt label (at least 96 wide) on the left, a borderless
 * right-aligned input, and an optional unit. `need` tints the placeholder (a value still needed);
 * `flag` marks a value worth checking against the pack with a tint bar on the left and a 13 pt
 * tinted note under it (never an alarm colour).
 */
export function FRow({ label, unit, need, flag, right, ...props }: InputProps & {
  label: string; unit?: string; need?: boolean; flag?: ReactNode; right?: ReactNode
}) {
  const t = useTokens()
  const [, f] = useFocus(props)
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  return (
    // a tap on the label focuses the field, as a web <label for> does
    <Pressable accessible={false} onPress={() => input.current?.focus()} style={[{ flexDirection: 'row', flexWrap: flag ? 'wrap' : 'nowrap', alignItems: 'center', columnGap: 12, minHeight: 44, paddingHorizontal: 16 },
      flag != null && { boxShadow: `inset 3px 0 0 ${t.tint}` }]}>
      <Text style={[tx(17), { color: t.label, minWidth: 96 }]} importantForAccessibility="no" accessibilityElementsHidden>{label}</Text>
      {right ?? (
        <TextInput ref={input} {...props} {...f} accessibilityLabel={label} placeholderTextColor={need ? t.tint : placeholder(t)}
          style={[tx(17, 400, 1.3, 0), { flex: 1, minWidth: 0, color: t.label, paddingVertical: 11, paddingHorizontal: 0, textAlign: 'right' }]} />
      )}
      {unit != null && <Text style={[tx(17), { color: t.label2 }]}>{unit}</Text>}
      {flag != null && <Text style={[tx(13), { color: t.tint, width: '100%', marginTop: -6, marginBottom: 9 }]}>{flag}</Text>}
    </Pressable>
  )
}

/**
 * `.card.pb-name`: a card holding a 13 pt label and a borderless field (17 pt; 16 pt multiline),
 * padding 14 16, 16 below. The card sits on --elev inside a sheet.
 */
export function NameField({ label, style, ...props }: InputProps & { label: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const bg = useSurface(t)
  const [, f] = useFocus(props)
  return (
    <View style={[{ backgroundColor: bg, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 4, marginBottom: 16 }, style]}>
      <Text style={[tx(13), { color: t.label2 }]} importantForAccessibility="no" accessibilityElementsHidden>{label}</Text>
      <TextInput {...props} {...f} accessibilityLabel={label} placeholderTextColor={placeholder(t)}
        style={[tx(props.multiline ? 16 : 17, 400, 1.3, 0), { color: t.label, padding: 0 }, props.multiline && { textAlignVertical: 'top' }]} />
    </View>
  )
}

/**
 * `.searchbar`: a 38 pt --fill bar (radius 10, padding 0 8), the search icon in --label2, the field,
 * and an optional trailing button (the scan button).
 */
export function SearchBar({ label, right, style, ...props }: InputProps & { label: string; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const [, f] = useFocus(props)
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  return (
    // the whole 38 pt bar focuses the field, and its touch area reaches 44 pt
    <Pressable accessible={false} onPress={() => input.current?.focus()} hitSlop={slop(0, 38)}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.fill, borderRadius: 10, paddingHorizontal: 8, height: 38 }, style]}>
      <Icon name="search" color={t.label2} />
      <TextInput ref={input} {...props} {...f} accessibilityLabel={label} placeholderTextColor={placeholder(t)} returnKeyType={props.returnKeyType ?? 'search'}
        style={[tx(17, 400, 1.3, 0), { flex: 1, minWidth: 0, height: 38, color: t.label, padding: 0 }]} />
      {right}
    </Pressable>
  )
}

