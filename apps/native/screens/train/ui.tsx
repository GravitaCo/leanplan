/**
 * The Studio pieces Train's screens need, drawn as the web's classes are (`.list`/`.li`, `.foot`,
 * `.lbl`, `.chip`, `.seg`, `.btn` and its kinds, `.frow`, the bottom `Sheet` and `BareSheet`).
 * N1 (design system) hasn't landed its shared primitives yet; these stay local to the Train stream
 * and are swapped for N1's when they arrive. Values are the web's (src/styles/theme.css).
 */
import { Children, createContext, isValidElement, useContext, useEffect, useRef, type ReactNode } from 'react'
import { ActionSheetIOS, Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions, type ScrollViewInstance, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { useStore } from '@/store/store'
import { initials } from '../../lib/ui/kit'
import { font, num, useTokens, type Tokens } from '../../lib/theme'

export { font, num, useTokens, type Tokens }

/* ---------------- icons (src/ui/icons.tsx geometry) ---------------- */

const P = (d: string) => <Path d={d} />
const PATHS = {
  x: P('M6 6l12 12M18 6L6 18'),
  check: P('M5 12.5l4.2 4.2L19 7'),
  chevL: P('M15 5l-7 7 7 7'),
  chevR: P('M9 5l7 7-7 7'),
  play: P('M8 5.5v13l10.5-6.5z'),
  pause: P('M8.5 5.5v13M15.5 5.5v13'),
  plus: P('M12 5v14M5 12h14'),
  leaf: <><Path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><Path d="M5 19l7-7" /></>,
  dumbbell: P('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'),
  search: <><Circle cx="11" cy="11" r="6.5" /><Path d="M20 20l-4.3-4.3" /></>,
  book: <><Path d="M5 5.5a2 2 0 0 1 2-2h11.5v14H7a2 2 0 0 0-2 2z" /><Path d="M5 19.5a2 2 0 0 0 2 2h11.5v-4" /></>,
  thumbUp: P('M7.5 10.5v9.5M7.5 10.5l3.6-6.3a1.9 1.9 0 0 1 3.5 1.3l-.8 4.1h4.6a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.6H7.5M7.5 10.5h-3v9.5h3'),
  thumbDown: P('M16.5 13.5V4M16.5 13.5l-3.6 6.3a1.9 1.9 0 0 1-3.5-1.3l.8-4.1H5.6a2 2 0 0 1-2-2.4l1.3-6.4a2 2 0 0 1 2-1.6h9.6M16.5 13.5h3V4h-3'),
  calendar: <><Rect x="3.5" y="5" width="17" height="15.5" rx="3" /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>,
}
export type IconName = keyof typeof PATHS
/** `fill` for the solid glyphs the web fills with currentColor (play in `.demo-play`, `.thumb-play`) */
export function Icon({ name, size = 20, stroke = 2, color, fill }: { name: IconName; size?: number; stroke?: number; color: string; fill?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  )
}
/** `<Chevron rotate>`: the row chevron (label3), turned for open/closed */
export function Chevron({ rotate = 0, color }: { rotate?: number; color?: string }) {
  const t = useTokens()
  return <View style={{ transform: [{ rotate: `${rotate}deg` }] }}><Icon name="chevR" size={14} stroke={2.4} color={color ?? t.label3} /></View>
}
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

/* ---------------- text ---------------- */

/** `.foot`: 13 px label2, line-height 1.38 (pass the web's padding as style) */
export function Foot({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, paddingTop: 7, paddingHorizontal: 16 }, style]}>{children}</Text>
}
/** `.lbl`: 13 px medium label2 over a group */
export function Lbl({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(500), { fontSize: 13, color: t.label2, paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4 }, style]}>{children}</Text>
}
/** `.grp-h`: a 20 px group title */
export function GrpH({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text accessibilityRole="header" style={[font(600), { fontSize: 20, letterSpacing: -0.2, color: t.label, paddingTop: 22, paddingBottom: 8, paddingHorizontal: 4 }]}>{children}</Text>
}
/** `.sub`: 15 px label2 */
export function Sub({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 15, lineHeight: 20, color: t.label2 }, style]}>{children}</Text>
}
/** `.ltitle`: a pushed screen's 34 px title; with WELLBEING_ENABLED the Profile avatar sits beside it (TitleRow) */
export function TitleRow({ title }: { title: string }) {
  const t = useTokens()
  const name = useStore((s) => s.data.profile.name)
  const onProfile = useContext(TrainNav).onProfile
  const h = <Text accessibilityRole="header" style={[font(600), { flex: 1, fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: t.label, marginTop: 2 }]}>{title}</Text>
  if (!WELLBEING_ENABLED) return h
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      {h}
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onProfile} hitSlop={2}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[font(600), { fontSize: 16, color: t.tint }]}>{initials(name) || '·'}</Text>
      </Pressable>
    </View>
  )
}

/** What the Train screens hand back to the app shell (the lead wires these in app/(tabs)/train.tsx). */
export const TrainNav = createContext<{ onProfile?: () => void }>({})

/* ---------------- buttons ---------------- */

type BtnKind = 'ink' | 'tinted' | 'gray' | 'danger'
/** `.btn` and its kinds: 50 px ink pill, `.tinted`, `.gray`, `.danger` (red text, no fill); `sm` is `.btn.sm` */
export function Button({ title, onPress, kind = 'ink', sm, disabled, style, label }: { title: string; onPress: () => void; kind?: BtnKind; sm?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; label?: string }) {
  const t = useTokens()
  const bg = kind === 'ink' ? t.btn : kind === 'tinted' ? t.tintSoft : kind === 'gray' ? t.fill : 'transparent'
  const fg = kind === 'ink' ? t.btnInk : kind === 'tinted' ? t.tint : kind === 'gray' ? t.label : t.red
  const h = sm ? 36 : 50
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ height: h, borderRadius: h / 2, paddingHorizontal: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', alignSelf: sm ? 'flex-start' : 'stretch', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}>
      <Text style={[font(kind === 'danger' ? 400 : 600), { color: fg, fontSize: sm ? 15 : 17 }]}>{title}</Text>
    </Pressable>
  )
}
/** `.stack`: buttons in a column, 8 apart, 16 above */
export function Stack({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: 8, marginTop: 16 }, style]}>{children}</View>
}
/** `.linkbtn` (15 px tint, 6×4 padding); `muted` is `.linkbtn.muted`; `inl` is the inline one (no padding, inherits size) */
export function LinkBtn({ title, onPress, muted, inl, color, style, label, size }: { title: string; onPress: () => void; muted?: boolean; inl?: boolean; color?: string; style?: StyleProp<TextStyle>; label?: string; size?: number }) {
  const t = useTokens()
  const s: TextStyle = { color: color ?? (muted ? t.label2 : t.tint), fontSize: size ?? 15 }
  if (inl) return <Text accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[s, style]}>{title}</Text>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
      <Text style={[font(400), s, style]}>{title}</Text>
    </Pressable>
  )
}
/** `.navbtn` (17 px tint; `.b` bold) */
export function NavBtn({ title, onPress, bold, disabled }: { title: string; onPress: () => void; bold?: boolean; disabled?: boolean }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={8} style={{ paddingVertical: 4 }}>
      <Text style={[font(bold ? 600 : 400), { fontSize: 17, color: disabled ? t.label3 : t.tint }]}>{title}</Text>
    </Pressable>
  )
}
/** `BackButton`: a chevron and the label, `.navbtn` */
export function BackButton({ label = 'Back', onPress }: { label?: string; onPress: () => void }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginLeft: -6 }}>
      <Icon name="chevL" size={20} stroke={2.6} color={t.tint} />
      <Text style={[font(400), { fontSize: 17, color: t.tint }]}>{label}</Text>
    </Pressable>
  )
}
/** `.x-btn`: the 30 px round remove button */
export function XBtn({ label, onPress, icon = 'x', disabled, rotate = 0 }: { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; rotate?: number }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={7}
      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1, transform: [{ rotate: `${rotate}deg` }] }}>
      <Icon name={icon} size={14} stroke={2.6} color={t.label2} />
    </Pressable>
  )
}

/* ---------------- lists ---------------- */

/** `.card`: radius 22, padding 14×16, 10 below (`elev` inside a sheet) */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const inSheet = useContext(InSheet)
  return <View style={[{ backgroundColor: inSheet ? t.elev : t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 }, style]}>{children}</View>
}

/**
 * `.list`: rows on the card colour (`elev` in a sheet), radius 18, a 1 px separator between rows
 * from `inset` px in (16, or 58 for `.list.icons`).
 */
export function List({ children, inset = 16, style, radius }: { children: ReactNode; inset?: number; style?: StyleProp<ViewStyle>; radius?: number }) {
  const t = useTokens()
  const inSheet = useContext(InSheet)
  const rows = Children.toArray(children).filter((c) => isValidElement(c))
  return (
    <View style={[{ backgroundColor: inSheet ? t.elev : t.card, borderRadius: radius ?? t.radiusSm, overflow: 'hidden', marginBottom: 8 }, style]}>
      {rows.map((c, i) => (
        <View key={i}>
          {i > 0 && <View style={{ position: 'absolute', top: 0, left: inset, right: 0, height: 1, backgroundColor: t.sep }} />}
          {c}
        </View>
      ))}
    </View>
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
      <Text numberOfLines={wrap ? undefined : 1} style={[font(400), { fontSize: 17, color: t.label }, tStyle]}>{title}</Text>
      {s != null && s !== '' && <Text numberOfLines={wrap ? undefined : 1} style={[font(400), { fontSize: 13, color: t.label2, marginTop: 2 }, sStyle]}>{s}</Text>}
      {children}
    </View>
  )
}
/** `.ico`: a 30 px rounded square with a white glyph */
export function Ico({ icon, bg }: { icon: IconName; bg: string }) {
  const t = useTokens()
  return <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={t.onCat} /></View>
}

/* ---------------- choices ---------------- */

/** `.chips` and `.chip` (`.on`: mauve with white text) */
export function Chips({ children, style, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; label?: string }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>
}
export function Chip({ title, on, onPress }: { title: string; on?: boolean; onPress: () => void }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: !!on }} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: on ? t.tint : t.fill, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13, opacity: pressed ? 0.7 : 1 })}>
      <Text style={[font(400), { fontSize: 15, lineHeight: 18, color: on ? t.onTint : t.label }]}>{title}</Text>
    </Pressable>
  )
}
/** `.seg`: the segmented control */
export function Seg<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T | undefined; onChange: (v: T) => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: 9, padding: 2 }}>
      {options.map(([v, label]) => (
        <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: v === value }} onPress={() => onChange(v)}
          style={[{ flex: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' }, v === value && { backgroundColor: t.segon, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }]}>
          <Text numberOfLines={1} style={[font(600), { fontSize: 13, color: t.label }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  )
}
/** `.toggle`: the platform switch in the tint colour */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  const t = useTokens()
  return <Switch accessibilityLabel={label} value={on} onValueChange={onChange} disabled={disabled} trackColor={{ true: t.tint, false: t.fill2 }} ios_backgroundColor={t.fill2} />
}

/* ---------------- forms ---------------- */

/** `.frow`: label left, the value right-aligned */
export function FRow({ label, children }: { label: string; children: ReactNode }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 }}>
      <Text style={[font(400), { fontSize: 17, minWidth: 96, color: t.label }]}>{label}</Text>
      {children}
    </View>
  )
}
/** an input as `.frow input`: right-aligned, no box */
export function FInput(p: TextInputProps & { numeric?: boolean; decimal?: boolean }) {
  const t = useTokens()
  const { numeric, decimal, style, ...rest } = p
  return <TextInput placeholderTextColor={t.label3} keyboardType={decimal ? 'decimal-pad' : numeric ? 'number-pad' : 'default'}
    style={[font(400), { flex: 1, fontSize: 17, color: t.label, textAlign: 'right', paddingVertical: 11 }, (numeric || decimal) && num, style]} {...rest} />
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
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${value}`} onPress={open} style={{ flex: 1, alignItems: 'flex-end', paddingVertical: 11 }}>
      <Text style={[font(400), { fontSize: 17, color: t.label2 }]}>{value}</Text>
    </Pressable>
  )
}

/* ---------------- sheets ---------------- */

/** Inside a sheet, lists and cards take `--elev` (`.sheet .list`). */
export const InSheet = createContext(false)

function SheetFrame({ onClose, tall, label, children }: { onClose: () => void; tall?: boolean; label: string; children: ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const y = useRef(new Animated.Value(height)).current
  const fade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start()
  }, [fade, y])
  const max = height - insets.top - 12
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: fade }}>
          <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View accessibilityViewIsModal accessibilityLabel={label}
          style={{ backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: max, height: tall ? max : undefined, paddingBottom: insets.bottom, transform: [{ translateY: y }] }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, marginTop: 6, alignSelf: 'center' }} />
          <InSheet.Provider value={true}>{children}</InSheet.Provider>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** `Sheet`: a bottom sheet with the iOS header (left action · title · right action); `left` defaults to Cancel, null for nothing. */
export function Sheet({ title, onClose, left, right, tall, scrollKey, children }: { title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; tall?: boolean; scrollKey?: string; children: ReactNode }) {
  const t = useTokens()
  // views swapped inside one sheet (the library's entries) open at their top
  const sv = useRef<ScrollViewInstance>(null)
  useEffect(() => { sv.current?.scrollTo({ y: 0, animated: false }) }, [scrollKey])
  return (
    <SheetFrame onClose={onClose} tall={tall} label={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 10, paddingHorizontal: 16 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <NavBtn title="Cancel" onPress={onClose} /> : left}</View>
        <Text numberOfLines={1} accessibilityRole="header" style={[font(600), { fontSize: 17, maxWidth: 210, color: t.label, textAlign: 'center' }]}>{title}</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
      </View>
      <ScrollView ref={sv} style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SheetFrame>
  )
}

/** `BareSheet`: no header; its first line is its own large title (Adjust, Finish, How was that set?). */
export function BareSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <SheetFrame onClose={onClose} label={label}>
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SheetFrame>
  )
}
