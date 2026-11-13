/**
 * Minimal local stand-ins for the N1 primitives Profile needs (grouped list rows, Disclosure,
 * Toggle, Seg, fields, sheets, option lists, the toast), drawn from the web's theme.css values.
 * N1 (native/n1-design-system) replaces them with the shared kit; the props mirror src/ui/primitives
 * so the swap is a change of import.
 */
import { Children, createContext, Fragment, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { font, num, useTokens, type Tokens } from '../theme'

/** Inside a sheet, lists, option rows and text areas sit on `--elev` (theme.css `.sheet .list…`). */
const InSheet = createContext(false)
/** The surface a list or card uses here: `--card`, or `--elev` inside a sheet. */
export function useSurface(): string {
  const t = useTokens()
  return useContext(InSheet) ? t.elev : t.card
}

/* ---------------- icons (src/ui/icons.tsx geometry) ---------------- */

const P = (d: string) => <Path d={d} />
const PATHS = {
  heart: P('M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z'),
  fork: P('M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7v4h3'),
  dumbbell: P('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'),
  person: <><Circle cx="12" cy="8.5" r="3.8" /><Path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8" /></>,
  scale: <><Rect x="3.5" y="3.5" width="17" height="17" rx="4" /><Path d="M8.2 10a5.2 5.2 0 0 1 7.6 0L12 13.5z" /></>,
  pill: <><Path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7z" /><Path d="M8.5 10.5l5 5" /></>,
  smile: <><Circle cx="12" cy="12" r="8.5" /><Path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01" /></>,
  check: P('M5 12.5l4.2 4.2L19 7'),
  chevR: P('M9 5l7 7-7 7'),
  chevL: P('M15 5l-7 7 7 7'),
  x: P('M6 6l12 12M18 6L6 18'),
  target: <><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="4.5" /><Circle cx="12" cy="12" r=".8" /></>,
  weight: <><Path d="M5 20h14l-2-12H7z" /><Path d="M9.5 8a2.5 2.5 0 0 1 5 0" /></>,
  review: <><Path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><Path d="M3.5 4.5v4h4" /><Path d="M12 8v4.5l3 1.8" /></>,
  hand: P('M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.9-2.5L2.8 15a1.6 1.6 0 0 1 2.5-2L8 15.5'),
  leaf: <><Path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><Path d="M5 19l7-7" /></>,
  bell: <><Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><Path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  key: <><Circle cx="8" cy="15" r="4" /><Path d="M11 12l8-8M16 7l2 2" /></>,
  cloud: P('M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6 3.8 3.8 0 0 1-.3 7.4z'),
  info: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 11v5M12 8h.01" /></>,
  mail: <><Rect x="3.5" y="5.5" width="17" height="13" rx="3" /><Path d="M4.5 7.5l7.5 5.5 7.5-5.5" /></>,
  moon: P('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'),
  list: P('M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'),
  bulb: P('M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'),
}
export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, stroke = 2, color }: { name: IconName; size?: number; stroke?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  )
}

/** `svg.chev`: 14 px, label3 */
export function Chevron({ rotate = 0 }: { rotate?: number }) {
  const t = useTokens()
  return <View style={{ transform: [{ rotate: `${rotate}deg` }] }} accessibilityElementsHidden importantForAccessibility="no"><Icon name="chevR" size={14} stroke={2.6} color={t.label3} /></View>
}

/* ---------------- text ---------------- */

/** `.lbl`: the group heading above a list */
export function Lbl({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text accessibilityRole="header" style={[font(500), { fontSize: 13, color: t.label2, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 }, style]}>{children}</Text>
}
/** `.foot`: the small print under a list */
export function Foot({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(), { fontSize: 13, color: t.label2, lineHeight: 18, paddingTop: 7, paddingHorizontal: 16 }, style]}>{children}</Text>
}
/** `.sub` */
export function Sub({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(), { fontSize: 15, color: t.label2, lineHeight: 21 }, style]}>{children}</Text>
}
/** inline link (`.linkbtn`) */
export function Link({ title, onPress, style }: { title: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text accessibilityRole="button" onPress={onPress} style={[font(), { color: t.tint }, style]}>{title}</Text>
}

/* ---------------- lists ---------------- */

/** `.list` (and `.list.icons` with `icons`): a card of rows with hairlines between them. */
export function List({ children, icons, style }: { children: ReactNode; icons?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const surface = useSurface()
  // flatten fragments and drop empty slots, so a hairline sits only between rows that render
  const flat: ReactNode[] = []
  const walk = (c: ReactNode) => Children.forEach(c, (x) => {
    if (isValidElement(x) && x.type === Fragment) walk((x.props as { children?: ReactNode }).children)
    else if (x !== null && x !== undefined && x !== false && x !== '') flat.push(x)
  })
  walk(children)
  return (
    <View style={[{ backgroundColor: surface, borderRadius: t.radiusSm, overflow: 'hidden', marginBottom: 8 }, style]}>
      {flat.map((c, i) => (
        <View key={i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: t.sep, marginLeft: icons ? 58 : 16 }} />}
          {c}
        </View>
      ))}
    </View>
  )
}

function RowIcon({ icon, color }: { icon: IconName; color: string }) {
  const t = useTokens()
  // `.ico.soft`: pastel fill, icon in label
  return <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={t.label} /></View>
}

const rowStyle = (pressed: boolean, t: Tokens, minHeight = 48): ViewStyle => ({
  flexDirection: 'row', alignItems: 'center', gap: 12, minHeight, paddingVertical: 10, paddingHorizontal: 16,
  backgroundColor: pressed ? t.fill : 'transparent',
})

/** `SettingRow`: icon · label (and sub) · value · chevron or a control */
export function SettingRow({ icon, color, label, sub, value, onPress, right, testID }: {
  icon: IconName; color: string; label: string; sub?: ReactNode; value?: ReactNode; onPress?: () => void; right?: ReactNode; testID?: string
}) {
  const t = useTokens()
  const body = (
    <>
      <RowIcon icon={icon} color={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[font(), { fontSize: 17, color: t.label }]}>{label}</Text>
        {sub != null && <Text numberOfLines={1} style={[font(), { fontSize: 13, color: t.label2, marginTop: 2 }]}>{sub}</Text>}
      </View>
      {value != null && <Text numberOfLines={1} style={[font(), num, { fontSize: 17, color: t.label2 }]}>{value}</Text>}
      {right ?? (onPress && <Chevron />)}
    </>
  )
  return onPress
    ? <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => rowStyle(pressed, t)}>{body}</Pressable>
    : <View testID={testID} style={rowStyle(false, t)}>{body}</View>
}

/** `Disclosure`: a row that expands in place (`.acc-bd` below it). */
export function Disclosure({ icon, color, label, value, open, onToggle, children }: {
  icon: IconName; color: string; label: string; value?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode
}) {
  const t = useTokens()
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => rowStyle(pressed, t)}>
        <RowIcon icon={icon} color={color} />
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[font(), { fontSize: 17, color: t.label }]}>{label}</Text></View>
        {value != null && value !== '' && !open && <Text numberOfLines={1} style={[font(), num, { fontSize: 17, color: t.label2, flexShrink: 1 }]}>{value}</Text>}
        <Chevron rotate={open ? 90 : 0} />
      </Pressable>
      {open && <View style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View>}
    </>
  )
}

/** A plain `.li` row: title (and sub), then a control or a chevron. */
export function PlainRow({ title, sub, right, onPress, tint, testID }: { title: string; sub?: string; right?: ReactNode; onPress?: () => void; tint?: boolean; testID?: string }) {
  const t = useTokens()
  const body = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[font(), { fontSize: 17, color: tint ? t.tint : t.label }]}>{title}</Text>
        {sub != null && <Text style={[font(), { fontSize: 13, color: t.label2, marginTop: 2 }]}>{sub}</Text>}
      </View>
      {right ?? (onPress && <Chevron />)}
    </>
  )
  return onPress
    ? <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => rowStyle(pressed, t, 44)}>{body}</Pressable>
    : <View testID={testID} style={rowStyle(false, t, 44)}>{body}</View>
}

/* ---------------- controls ---------------- */

/** `.toggle`: the system switch in Tilo mauve (51 by 31, as the web draws it). */
export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  const t = useTokens()
  return <Switch accessibilityLabel={label} value={on} disabled={disabled} onValueChange={onChange}
    trackColor={{ true: t.tint, false: t.fill2 }} ios_backgroundColor={t.fill2} thumbColor="#ffffff" style={disabled ? { opacity: 0.5 } : undefined} />
}

/** `.seg` */
export function Seg<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T | undefined; onChange: (v: T) => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: 9, padding: 2 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={() => onChange(v)}
            style={[{ flex: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' }, on && { backgroundColor: t.segon, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }]}>
            <Text numberOfLines={1} style={[font(600), { fontSize: 13, color: t.label }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.chips` / `.chip` (and `.chip.on`) */
export function Chips<T extends string>({ options, value, onPick }: { options: readonly { value: T; label: string }[]; value: T | undefined; onPick: (v: T) => void }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(o.value)}
            style={{ backgroundColor: on ? t.tint : t.fill, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13 }}>
            <Text style={[font(), { fontSize: 15, lineHeight: 18, color: on ? t.onTint : t.label }]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.field`: a small label above a filled input */
export function Field({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      <Text style={[font(), { fontSize: 13, color: t.label2, marginBottom: 5 }]}>{label}</Text>
      {children}
    </View>
  )
}

export function Input({ value, onChangeText, placeholder, keyboardType, label, editable = true, secure, autoCap, multiline, rows, style, testID }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions; label: string; editable?: boolean
  secure?: boolean; autoCap?: 'none' | 'characters' | 'words' | 'sentences'; multiline?: boolean; rows?: number; style?: StyleProp<TextStyle>; testID?: string
}) {
  const t = useTokens()
  return <TextInput testID={testID} accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.label3}
    keyboardType={keyboardType} editable={editable} secureTextEntry={secure} autoCapitalize={autoCap ?? 'none'} autoCorrect={false}
    multiline={multiline} numberOfLines={rows} textAlignVertical={multiline ? 'top' : 'center'}
    style={[font(), { fontSize: 17, color: t.label, backgroundColor: t.fill, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, opacity: editable ? 1 : 0.5 }, multiline && { minHeight: (rows ?? 3) * 22 + 22 }, style]} />
}

/** A `<select>` stand-in: the chosen label in a field; tapping it lists the options in a sheet. */
export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  const t = useTokens()
  const [open, setOpen] = useState(false)
  const cur = options.find(([k]) => k === value)?.[1] ?? ''
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${cur}`} onPress={() => setOpen(true)}
        style={{ backgroundColor: t.fill, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={[font(), { fontSize: 17, color: t.label, flex: 1 }]}>{cur}</Text>
        <Chevron rotate={90} />
      </Pressable>
      {open && (
        <BareSheet label={label} onClose={() => setOpen(false)}>
          <Text style={[font(600), { fontSize: 22, color: t.label, marginBottom: 12 }]}>{label}</Text>
          <Opts label={label} opts={options} value={value} onPick={(v) => { onChange(v); setOpen(false) }} />
        </BareSheet>
      )}
    </>
  )
}

/* ---------------- buttons ---------------- */

/** `.btn` and its kinds: ink, gray, tinted, danger, the Profile sign-out pill, `.sm` */
export function Btn({ title, onPress, kind = 'ink', disabled, small, style, testID }: {
  title: string; onPress: () => void; kind?: 'ink' | 'gray' | 'tinted' | 'danger' | 'signout'; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; testID?: string
}) {
  const t = useTokens()
  const bg = { ink: t.btn, gray: t.fill, tinted: t.tintSoft, danger: 'transparent', signout: t.card }[kind]
  const fg = { ink: t.btnInk, gray: t.label, tinted: t.tint, danger: t.red, signout: t.red }[kind]
  const w = kind === 'danger' ? 400 : kind === 'signout' ? 500 : 600
  const h = small ? 36 : 50
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ height: h, borderRadius: kind === 'signout' ? 16 : h / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, alignSelf: small ? 'flex-start' : 'stretch', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}>
      <Text style={[font(w), { fontSize: small ? 15 : kind === 'signout' ? 16 : 17, color: fg }]}>{title}</Text>
    </Pressable>
  )
}

/** `.navbtn` (and `.b` bold) */
export function NavBtn({ title, onPress, bold, back, disabled }: { title: string; onPress: () => void; bold?: boolean; back?: boolean; disabled?: boolean }) {
  const t = useTokens()
  const c = disabled ? t.label3 : t.tint
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      {back && <Icon name="chevL" size={20} stroke={2.6} color={c} />}
      <Text style={[font(bold ? 600 : 400), { fontSize: 17, color: c }]}>{title}</Text>
    </Pressable>
  )
}

/* ---------------- sheets ---------------- */

function SheetFrame({ label, onClose, tall, children }: { label: string; onClose: () => void; tall?: boolean; children: ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View accessibilityViewIsModal accessibilityLabel={label}
          style={{ backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '92%', ...(tall ? { height: '92%' } : {}), paddingBottom: insets.bottom }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, alignSelf: 'center', marginTop: 6 }} />
          <InSheet.Provider value>{children}</InSheet.Provider>
        </View>
      </View>
    </Modal>
  )
}

/** `Sheet`: the navigation header (left · title · right), Cancel on the left unless given. */
export function Sheet({ title, onClose, left, right, tall, scrollKey, children }: {
  title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; tall?: boolean
  /** a new value starts the sheet's scroll at the top again (a step-by-step sheet) */
  scrollKey?: string | number
  children: ReactNode
}) {
  const t = useTokens()
  return (
    <SheetFrame label={title} onClose={onClose} tall={tall}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <NavBtn title="Cancel" onPress={onClose} /> : left}</View>
        <Text accessibilityRole="header" numberOfLines={1} style={[font(600), { fontSize: 17, color: t.label, maxWidth: 210, textAlign: 'center' }]}>{title}</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
      </View>
      <ScrollView key={scrollKey} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 24 }}>{children}</ScrollView>
    </SheetFrame>
  )
}

/** `BareSheet`: no header; the content starts with its own title. */
export function BareSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <SheetFrame label={label} onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>{children}</ScrollView>
    </SheetFrame>
  )
}

/** `.cs-t` and `.cs-lead`: a bare sheet's title and lead */
export function SheetTitle({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text accessibilityRole="header" style={[font(600), { fontSize: 22, lineHeight: 28, color: t.label }]}>{children}</Text>
}
export function SheetLead({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text style={[font(), { fontSize: 16, lineHeight: 23, color: t.label2 }]}>{children}</Text>
}

/** `Opts` (onboarding/Opts.tsx): radio or tick rows */
export function Opts<T extends string>({ opts, value, onPick, label, multi }: { opts: readonly (readonly [T, string, string?])[]; value: T | T[] | undefined; onPick: (v: T) => void; label: string; multi?: boolean }) {
  const t = useTokens()
  const surface = useSurface()
  const on = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k)
  return (
    <View accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={label} style={{ backgroundColor: surface, borderRadius: t.radius, overflow: 'hidden' }}>
      {opts.map(([k, txt, s], i) => (
        <Pressable key={k} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: on(k) }} onPress={() => onPick(k)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: on(k) ? t.tintSoft : 'transparent', borderTopWidth: i ? 1 : 0, borderTopColor: t.sep }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[font(on(k) ? 500 : 400), { fontSize: 17, color: t.label }]}>{txt}</Text>
            {s && <Text style={[font(), { fontSize: 13, color: t.label2, marginTop: 1 }]}>{s}</Text>}
          </View>
          <View style={{ width: multi ? 22 : 24, height: multi ? 22 : 24, borderRadius: multi ? 6 : 12, alignItems: 'center', justifyContent: 'center', ...(on(k) ? { backgroundColor: t.label } : { borderWidth: 1.5, borderColor: t.dash }) }}>
            {on(k) && <Icon name="check" size={14} stroke={2.6} color={t.card} />}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

/** `Ticks` (onboarding/Consent.tsx) */
export function Ticks({ items }: { items: string[] }) {
  const t = useTokens()
  return (
    <View style={{ gap: 10, paddingVertical: 4 }}>
      {items.map((x) => (
        <View key={x} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ paddingTop: 2 }}><Icon name="check" size={16} stroke={2.6} color={t.tint} /></View>
          <Text style={[font(), { flex: 1, fontSize: 15, lineHeight: 21, color: t.label }]}>{x}</Text>
        </View>
      ))}
    </View>
  )
}

/* ---------------- toast ---------------- */

/** `.toast`: the store's toast, cleared after a few seconds (N1 builds the app-wide one). */
export function Toast() {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const msg = useStore((s) => s.toast)
  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => useStore.setState({ toast: null, toastAction: null }), 2600)
    return () => clearTimeout(id)
  }, [msg])
  if (!msg) return null
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 24, alignItems: 'center' }}>
      <Text style={[font(500), { backgroundColor: t.btn, color: t.btnInk, fontSize: 15, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, overflow: 'hidden' }]}>{msg}</Text>
    </View>
  )
}

