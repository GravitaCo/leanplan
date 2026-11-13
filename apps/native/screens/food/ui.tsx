/**
 * The Studio pieces the Food screens need, ported from src/ui/primitives.tsx and the matching rules
 * in src/styles/theme.css (same sizes, same tokens). Local to the Food stream until N1's primitive
 * set lands in lib/ui; then these imports switch over and this file goes.
 */
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { SlideInDown, useReducedMotion } from 'react-native-reanimated'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { useStore } from '@/store/store'
import { useConnection } from '@/store/hooks'
import type { ConnectionKind } from '@/core/domain/connection'
import type { Check } from '@/core/domain/checks'
import { font, num, useTokens, type Tokens } from '../../lib/theme'

// ───────────────────────── text ─────────────────────────

/** body text: 17 px, -0.01em, `--label` (the web's `body`) */
export function Txt({ size = 17, w = 400, color, n, lines, style, children, ...rest }: {
  size?: number; w?: 400 | 500 | 600 | 700; color?: string; n?: boolean; lines?: number; style?: StyleProp<TextStyle>; children?: ReactNode
  accessibilityRole?: 'header' | 'text' | 'button' | 'link'; accessibilityLabel?: string; onPress?: () => void; testID?: string
}) {
  const t = useTokens()
  return (
    <Text numberOfLines={lines} {...rest}
      style={[font(w), { fontSize: size, letterSpacing: -0.01 * size, color: color ?? t.label }, n && num, style]}>
      {children}
    </Text>
  )
}

// ───────────────────────── icons (src/ui/icons.tsx geometry) ─────────────────────────

const P = (d: string) => <Path d={d} />
const PATHS = {
  plus: P('M12 5v14M5 12h14'),
  check: P('M5 12.5l4.2 4.2L19 7'),
  checkc: <><Circle cx="12" cy="12" r="8.5" /><Path d="M8 12.3l2.7 2.7L16 9.6" /></>,
  chevR: P('M9 5l7 7-7 7'),
  chevL: P('M15 5l-7 7 7 7'),
  search: <><Circle cx="11" cy="11" r="6.5" /><Path d="M20 20l-4.3-4.3" /></>,
  x: P('M6 6l12 12M18 6L6 18'),
  bolt: P('M13 3L5 13.5h6L10 21l8-10.5h-6z'),
  info: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 11v5M12 8h.01" /></>,
  barcode: <><Path d="M3.5 7.5v-2a2 2 0 0 1 2-2h2M16.5 3.5h2a2 2 0 0 1 2 2v2M20.5 16.5v2a2 2 0 0 1-2 2h-2M7.5 20.5h-2a2 2 0 0 1-2-2v-2" /><Path d="M8 8v8M11 8v8M13.5 8v8M16 8v8" /></>,
  camera: <><Path d="M3.5 9a2 2 0 0 1 2-2h2.2l1.6-2.5h5.4L16.3 7h2.2a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><Circle cx="12" cy="13" r="3.6" /></>,
  refresh: <><Path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" /><Path d="M20 4v4.5h-4.5" /><Path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" /><Path d="M4 20v-4.5h4.5" /></>,
  copy: <><Rect x="8" y="8" width="12" height="12" rx="3" /><Path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></>,
  person: <><Circle cx="12" cy="8.5" r="3.8" /><Path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8" /></>,
  alert: <><Circle cx="12" cy="12" r="9" /><Path d="M12 7.5v5.5M12 16.5v.5" /></>,
  cloudUp: <><Path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.4 4.3 4.3 0 0 0 7 18z" /><Path d="M12 15v-5M9.5 12.5 12 10l2.5 2.5" /></>,
  cloudOff: <><Path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.4 4.3 4.3 0 0 0 7 18z" /><Path d="M4 4l16 16" /></>,
} satisfies Record<string, ReactNode>
export type FIconName = keyof typeof PATHS

export function FIcon({ name, size = 20, stroke = 2, color, style }: { name: FIconName; size?: number; stroke?: number; color: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {PATHS[name]}
      </Svg>
    </View>
  )
}

/** the trailing disclosure chevron: 14 px, `--label3` */
export function Chevron() {
  const t = useTokens()
  return <FIcon name="chevR" size={14} stroke={2.6} color={t.label3} />
}

// ───────────────────────── surfaces ─────────────────────────

/** Inside a sheet, lists and cards sit on `--elev` (`.sheet .list, .sheet .card`). */
const InSheet = createContext(false)
export function useSurface(): string {
  const t = useTokens()
  return useContext(InSheet) ? t.elev : t.card
}

/** `.card` (inside a sheet, `--elev`) */
export function Card({ children, style, center }: { children: ReactNode; style?: StyleProp<ViewStyle>; center?: boolean }) {
  const t = useTokens()
  const bg = useSurface()
  return <View style={[{ backgroundColor: bg, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 }, center && { alignItems: 'center' }, style]}>{children}</View>
}

/** `.list`: rows separated by a 1 px `--sep` line inset 16 (58 with icons) */
export function List({ children, icons, style }: { children: ReactNode; icons?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const bg = useSurface()
  const rows = flat(children)
  return (
    <View style={[{ backgroundColor: bg, borderRadius: t.radiusSm, overflow: 'hidden', marginBottom: 8 }, style]}>
      {rows.map((c, i) => (
        <View key={i}>
          {i > 0 && <View style={{ position: 'absolute', top: 0, left: icons ? 58 : 16, right: 0, height: 1, backgroundColor: t.sep, zIndex: 1 }} />}
          {c}
        </View>
      ))}
    </View>
  )
}
function flat(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  const walk = (c: ReactNode) => {
    if (c == null || c === false || c === true) return
    if (Array.isArray(c)) c.forEach(walk)
    else out.push(c)
  }
  walk(children)
  return out
}

/** `.li`: a 44 pt row; pressable when `onPress` is given (pressed: `--fill`) */
export function Li({ children, onPress, style, label, disabled, minHeight = 44 }: {
  children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; disabled?: boolean; minHeight?: number
}) {
  const t = useTokens()
  const base: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight, paddingVertical: 10, paddingHorizontal: 16 }
  if (!onPress) return <View style={[base, style]} accessibilityLabel={label}>{children}</View>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [base, pressed && { backgroundColor: t.fill }, style]}>
      {children}
    </Pressable>
  )
}

/** `.li .m` with `.t` and `.s` (one line each, ellipsised) */
export function RowText({ title, sub, sub2, titleColor, tag, n }: { title: ReactNode; sub?: ReactNode; sub2?: ReactNode; titleColor?: string; tag?: string; n?: boolean }) {
  const t = useTokens()
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Txt lines={1} color={titleColor} testID="row-title">{title}</Txt>
      {sub != null && sub !== '' && (
        <Txt size={13} color={t.label2} lines={1} n={n} style={{ marginTop: 2 }}>
          {sub}{tag ? <Text> </Text> : null}{tag ? <Tag text={tag} /> : null}
        </Txt>
      )}
      {sub2 != null && sub2 !== '' && <Txt size={13} color={t.label2} lines={1} style={{ marginTop: 2 }}>{sub2}</Txt>}
    </View>
  )
}

/** `.tag`: "MINE" */
function Tag({ text }: { text: string }) {
  const t = useTokens()
  return <Text style={[font(700), { fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase', color: t.label2, backgroundColor: t.fill }]}> {text} </Text>
}

/** `.addc`: the round + on a row */
export function AddC({ onPress, label }: { onPress?: () => void; label?: string }) {
  const t = useTokens()
  const dot = <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}><FIcon name="plus" size={16} stroke={2.8} color={t.tint} /></View>
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>{dot}</Pressable>
    : dot
}

/** `.ico`: a 30 pt rounded square holding an 18 pt icon */
export function Ico({ name, bg, color }: { name: FIconName; bg: string; color: string }) {
  return <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><FIcon name={name} size={18} color={color} /></View>
}

/** `.lbl`: the small grey heading over a group */
export function Lbl({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Txt size={13} w={500} color={t.label2} style={[{ letterSpacing: -0.13, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 }, style]}>{children}</Txt>
}

/** `.foot`: 13 px grey note under a group */
export function Foot({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Txt size={13} color={t.label2} style={[{ lineHeight: 18, paddingTop: 7, paddingHorizontal: 16 }, style]}>{children}</Txt>
}

/** `.sub` */
export function Sub({ children, style, n }: { children: ReactNode; style?: StyleProp<TextStyle>; n?: boolean }) {
  const t = useTokens()
  return <Txt size={15} color={t.label2} n={n} style={style}>{children}</Txt>
}

/** `.empty` */
export function Empty({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Txt size={15} color={t.label2} style={{ textAlign: 'center', paddingVertical: 22, paddingHorizontal: 16, lineHeight: 21 }}>{children}</Txt>
}

/** `.big` 30 px figure with its `small` unit, and an optional `.pm` margin */
export function Big({ value, unit, pm, size = 30 }: { value: ReactNode; unit?: string; pm?: string; size?: number }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Txt size={size} w={600} n style={{ lineHeight: size * 1.1 }}>{value}</Txt>
      {unit && <Txt size={17} w={600} color={t.label2} style={{ marginLeft: 3 }}>{unit}</Txt>}
      {pm && (
        <View style={{ marginLeft: 6, backgroundColor: t.fill, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'center' }}>
          <Txt size={15} w={600} color={t.label2} n>{pm}</Txt>
        </View>
      )}
    </View>
  )
}

// ───────────────────────── buttons ─────────────────────────

/** `.btn` and its `.tinted` / `.gray` / `.danger` / `.sm` forms */
export function Button({ title, onPress, kind = 'ink', small, disabled, icon, style, label }: {
  title: string; onPress: () => void; kind?: 'ink' | 'tinted' | 'gray' | 'danger' | 'link'; small?: boolean; disabled?: boolean; icon?: FIconName
  style?: StyleProp<ViewStyle>; label?: string
}) {
  const t = useTokens()
  const bg = kind === 'ink' ? t.btn : kind === 'tinted' ? t.tintSoft : kind === 'gray' ? t.fill : 'transparent'
  const fg = kind === 'ink' ? t.btnInk : kind === 'tinted' || kind === 'link' ? t.tint : kind === 'gray' ? t.label : t.red
  const h = small ? 36 : 50
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{
        height: h, borderRadius: h / 2, paddingHorizontal: 16, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        alignSelf: small ? 'flex-start' : 'stretch', opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }, style]}>
      {icon && <FIcon name={icon} size={17} color={fg} />}
      <Txt size={small ? 15 : 17} w={kind === 'danger' ? 400 : 600} color={fg}>{title}</Txt>
    </Pressable>
  )
}

/** `.stack`: buttons in a column, 8 apart, 16 below what's above */
export function Stack({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: 8, marginTop: 16 }, style]}>{children}</View>
}

/** `.navbtn` (`.b` bold): the sheet header's text buttons, in the tint */
export function NavBtn({ title, onPress, bold, disabled, color, size = 17, label }: { title: string; onPress: () => void; bold?: boolean; disabled?: boolean; color?: string; size?: number; label?: string }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={8} style={({ pressed }) => ({ paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}>
      <Txt size={size} w={bold ? 600 : 400} color={disabled ? t.label3 : color ?? t.tint}>{title}</Txt>
    </Pressable>
  )
}

/** an icon-only `.navbtn` */
export function IconBtn({ name, onPress, label, color, size = 17 }: { name: FIconName; onPress: () => void; label: string; color?: string; size?: number }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
      <FIcon name={name} size={size} color={color ?? t.tint} />
    </Pressable>
  )
}

export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}>
      <FIcon name="chevL" size={20} stroke={2.6} color={t.tint} />
      <Txt color={t.tint}>{label}</Txt>
    </Pressable>
  )
}

// ───────────────────────── controls ─────────────────────────

/** `.seg`: the segmented control (a radio group) */
export function Seg<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T | undefined; onChange: (v: T) => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: 9, padding: 2 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(v)}
            style={[{ flex: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
              on && { backgroundColor: t.segon, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }]}>
            <Txt size={13} w={600} lines={1} style={{ letterSpacing: -0.13 }}>{label}</Txt>
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.toggle`: 51 × 31 switch, the tint when on */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onChange}
      style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: on ? t.tint : t.fill2, justifyContent: 'center' }}>
      <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#fff', marginLeft: on ? 22 : 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }} />
    </Pressable>
  )
}

/** `.chips` / `.chip` (`.on` in the tint), with an optional `small` hint line */
export function Chips({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>
}
export function Chip({ label, hint, on, onPress }: { label: string; hint?: string; on?: boolean; onPress: () => void }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: on ? t.tint : t.fill, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13, opacity: pressed ? 0.8 : 1 })}>
      <Txt size={15} color={on ? t.onTint : t.label} style={{ lineHeight: 18 }}>{label}</Txt>
      {hint && <Txt size={12} color={on ? t.onTint : t.label2} style={on ? { opacity: 0.8 } : undefined}>{hint}</Txt>}
    </Pressable>
  )
}

/** `.scale`: five equal buttons, a bold figure over a small line */
export function Scale({ items }: { items: { key: string | number; big: string; small: string; on: boolean; onPress: () => void }[] }) {
  const t = useTokens()
  const bg = useSurface()
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {items.map((it) => (
        <Pressable key={it.key} accessibilityRole="button" accessibilityState={{ selected: it.on }} onPress={it.onPress}
          style={{ flex: 1, minWidth: 0, backgroundColor: it.on ? t.tint : bg, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
          <Txt size={17} w={700} n color={it.on ? t.onTint : t.label} style={{ lineHeight: 20 }}>{it.big}</Txt>
          <Txt size={13} color={it.on ? t.onTint : t.label} lines={1} style={{ lineHeight: 16, letterSpacing: -0.13 }}>{it.small}</Txt>
        </Pressable>
      ))}
    </View>
  )
}

/** `.stepper`: − value + */
export function Stepper({ value, onLess, onMore }: { value: string; onLess: () => void; onMore: () => void }) {
  const t = useTokens()
  const b = (s: string, on: () => void, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={on} style={{ width: 44, height: 34, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={22}>{s}</Txt>
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.fill, borderRadius: 9 }}>
      {b('−', onLess, 'Fewer')}
      <Txt w={600} n style={{ minWidth: 52, textAlign: 'center' }}>{value}</Txt>
      {b('+', onMore, 'More')}
    </View>
  )
}

/** `input[type=range]` with the tint as its accent: a 4 pt track and a 28 pt thumb */
export function Slider({ min, max, step, value, onChange, label, style }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; label: string; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  const [w, setW] = useState(0)
  const st = useRef({ w: 0, min, max, step, onChange })
  st.current = { w, min, max, step, onChange }
  const at = (x: number) => {
    const s = st.current
    if (!s.w) return
    const raw = s.min + Math.max(0, Math.min(1, x / s.w)) * (s.max - s.min)
    const v = Math.round((raw - s.min) / s.step) * s.step + s.min
    s.onChange(Math.round(Math.min(s.max, Math.max(s.min, v)) * 1000) / 1000)
  }
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => at(e.nativeEvent.locationX),
    onPanResponderMove: (e) => at(e.nativeEvent.locationX),
  })).current
  const pct = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0
  const TH = 28
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      style={[{ height: 28, justifyContent: 'center' }, style]}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers} style={{ height: 28, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: t.fill2 }}>
          <View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: t.tint }} />
        </View>
        <View pointerEvents="none" style={{
          position: 'absolute', left: Math.max(0, pct * w - TH / 2), width: TH, height: TH, borderRadius: TH / 2, backgroundColor: '#fff',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
          ...(w ? { left: Math.min(w - TH, Math.max(0, pct * w - TH / 2)) } : {}),
        }} />
      </View>
    </View>
  )
}

/** `.frow`: a form row in a list: label, field (right-aligned), unit */
export function FormRow({ label, value, onChange, unit, placeholder, numeric, labelId, field }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string; numeric?: boolean; labelId?: string; field?: TextInputProps
}) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 }}>
      <Txt style={{ minWidth: 96 }} accessibilityLabel={labelId}>{label}</Txt>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.label3} accessibilityLabel={label}
        keyboardType={numeric ? 'decimal-pad' : 'default'} autoCorrect={!numeric} {...field}
        style={[font(400), numeric && num, { flex: 1, minWidth: 0, fontSize: 17, color: t.label, textAlign: 'right', paddingVertical: 11 }]} />
      {unit ? <Txt color={t.label2}>{unit}</Txt> : null}
    </View>
  )
}

/** `.searchbar`: the magnifier, a field, and an optional trailing button */
export function SearchBar({ value, onChange, placeholder, label, autoFocus, right, style }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string; autoFocus?: boolean; right?: ReactNode; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.fill, borderRadius: 10, paddingHorizontal: 8, height: 38 }, style]}>
      <FIcon name="search" size={17} color={t.label2} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.label2} accessibilityLabel={label}
        autoFocus={autoFocus} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
        style={[font(400), { flex: 1, minWidth: 0, fontSize: 17, letterSpacing: -0.17, color: t.label, height: 38, padding: 0 }]} />
      {right}
    </View>
  )
}

/** `.note` (`.warn`, `.ok`): a status line with its icon */
export function Note({ children, level, icon = 'info', style }: { children: ReactNode; level?: 'warn' | 'info' | 'ok' | string; icon?: FIconName | null; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const bg = useSurface()
  const ok = level === 'ok'
  const ic = ok ? t.energyInk : level === 'warn' ? t.tint : t.label2
  return (
    <View accessibilityRole="text" style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', marginTop: 10 },
      ok ? { paddingTop: 8, paddingHorizontal: 4 } : { paddingVertical: 10, paddingHorizontal: 14, borderRadius: t.radius, backgroundColor: bg }, style]}>
      {icon && <FIcon name={icon} size={17} color={ic} style={{ marginTop: 1 }} />}
      {children}
    </View>
  )
}

/** Accuracy check results (src/screens/food/common.tsx `Checks`). */
export function Checks({ checks, ok, onFix }: { checks: Check[]; ok?: string; onFix?: (k: number) => void }) {
  const t = useTokens()
  if (!checks.length) {
    return ok ? <Note level="ok" icon="checkc"><Txt size={13} color={t.label2} style={{ flex: 1, minWidth: '60%', lineHeight: 18 }}>{ok}</Txt></Note> : null
  }
  return (
    <View accessibilityLiveRegion="polite">
      {checks.map((c, i) => (
        <Note key={i} level={c.level}>
          <Txt size={15} style={{ flex: 1, minWidth: '60%', lineHeight: 20 }}>{c.msg}</Txt>
          {c.fix && onFix && <Button small kind="tinted" title={c.fix.label} onPress={() => onFix(c.fix!.k)} style={{ marginLeft: 27 }} />}
        </Note>
      ))}
    </View>
  )
}

// ───────────────────────── connection pill (src/ui/ConnectionPill.tsx) ─────────────────────────

const CONN_ICON: Record<ConnectionKind, FIconName> = {
  'up-to-date': 'check', pending: 'cloudUp', offline: 'cloudOff', 'sign-in': 'person', problem: 'alert', 'phone-only': 'cloudOff',
}
export function ConnPill() {
  const t = useTokens()
  const c = useConnection()
  const runSync = useStore((s) => s.runSync)
  const bg = useContext(InSheet) ? t.elev : t.card
  const ok = c.kind === 'up-to-date'
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={c.label} onPress={() => { if (c.kind === 'problem') runSync() }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 13, backgroundColor: bg, alignSelf: 'flex-end', flexShrink: 1 }}>
      <FIcon name={CONN_ICON[c.kind]} size={15} color={ok ? t.label2 : t.label} />
      <Txt size={12} w={500} n lines={1} color={ok ? t.label2 : t.label} style={{ lineHeight: 15 }}>{c.label}</Txt>
    </Pressable>
  )
}

// ───────────────────────── sheets ─────────────────────────

/**
 * Layers: the screen is the base; each open modal pushes one. The toast draws only on the top
 * layer, so it shows over a sheet, as the web's fixed `.toast` does (z-index above sheets).
 */
let layers: number[] = [0]
let nextLayer = 1
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
function useLayer(id: number) {
  useEffect(() => {
    if (!id) return
    layers = [...layers, id]; emit()
    return () => { layers = layers.filter((x) => x !== id); emit() }
  }, [id])
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => layers[layers.length - 1] === id)
}

/** The store's toast (`.toast`), drawn above the tab bar, on whichever layer is on top. */
export function Toast({ layer = 0 }: { layer?: number }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const toast = useStore((s) => s.toast)
  const action = useStore((s) => s.toastAction)
  const top = useLayer(layer)
  if (!toast || !top) return null
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 72 + insets.bottom, alignItems: 'center', zIndex: 70 }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[
        { maxWidth: action ? 488 : '88%', borderRadius: action ? 16 : 20, paddingVertical: action ? 12 : 10, paddingHorizontal: 16,
          backgroundColor: action ? hero(t) : t.elev, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
        action && { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
      ]}>
        <Txt size={15} w={500} color={action ? '#fff' : t.label} style={{ textAlign: action ? 'left' : 'center', flexShrink: 1 }}>{toast}</Txt>
        {action && (
          <Pressable accessibilityRole="button" onPress={() => { action.run(); useStore.setState({ toast: null, toastAction: null }) }}>
            <Txt size={16} w={600} color={t.brand}>{action.label}</Txt>
          </Pressable>
        )}
      </View>
    </View>
  )
}
// `--hero` is #1d1d1f light, #2c2c2e dark (theme.css); the token file doesn't carry it yet
const hero = (t: Tokens) => (t.bg === '#000000' ? '#2c2c2e' : '#1d1d1f')

const HostCtx = createContext<{ onClose: () => void; layer: number } | null>(null)

/**
 * One modal that sheets render into. A flow whose views swap inside one open sheet (Add food,
 * Recipes) wraps them in a host, so a swap doesn't replay the slide-up, as `animate={false}` does
 * on web. A Sheet outside a host makes its own.
 */
export function SheetHost({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const [layer] = useState(() => nextLayer++)
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <HostCtx.Provider value={{ onClose, layer }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          {children}
        </KeyboardAvoidingView>
        <Toast layer={layer} />
      </HostCtx.Provider>
    </Modal>
  )
}

/**
 * Bottom sheet with an iOS navigation header (left · title · right), as src/ui/primitives `Sheet`.
 * `left` defaults to Cancel; null for nothing.
 */
export function Sheet({ title, onClose, left, right, tall, animate = true, children, scroll = true }: {
  title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; tall?: boolean; animate?: boolean; children: ReactNode; scroll?: boolean
}) {
  const host = useContext(HostCtx)
  const frame = (
    <Frame tall={tall} animate={animate} label={title}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <NavBtn title="Cancel" onPress={onClose} /> : left}</View>
          <Txt w={600} lines={1} accessibilityRole="header" style={{ maxWidth: 210, textAlign: 'center' }}>{title}</Txt>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
        </View>
      } scroll={scroll}>
      {children}
    </Frame>
  )
  return host ? frame : <SheetHost onClose={onClose}>{frame}</SheetHost>
}

/** A sheet without the navigation header (src/ui/primitives `BareSheet`); always its own modal. */
export function BareSheet({ label, onClose, children, padTop = 12 }: { label: string; onClose: () => void; children: ReactNode; padTop?: number }) {
  return (
    <SheetHost onClose={onClose}>
      <Frame label={label} animate padTop={padTop}>{children}</Frame>
    </SheetHost>
  )
}

function Frame({ header, children, tall, animate = true, label, scroll = true, padTop = 2 }: {
  header?: ReactNode; children: ReactNode; tall?: boolean; animate?: boolean; label: string; scroll?: boolean; padTop?: number
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const reduce = useReducedMotion()
  const h = height - insets.top - 12
  const body = { paddingTop: padTop, paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }
  return (
    <Animated.View entering={animate && !reduce ? SlideInDown.duration(340) : undefined} accessibilityViewIsModal aria-label={label} testID="sheet"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: h, backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden' },
        tall && { height: h }, { maxWidth: 520, alignSelf: 'center', width: '100%' }]}>
      <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, marginTop: 6, alignSelf: 'center' }} />
      {header}
      <InSheet.Provider value>
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[body, { flexGrow: 1 }]} style={{ flexGrow: 0, flexShrink: 1 }}>{children}</ScrollView>
        ) : <View style={[body, { flex: 1 }]}>{children}</View>}
      </InSheet.Provider>
    </Animated.View>
  )
}
