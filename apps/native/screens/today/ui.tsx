/**
 * Today's local stand-ins for N1's primitives (Sheet, BareSheet, scale, chips, banner, list rows,
 * icons, toast), ported from src/ui/primitives.tsx, src/ui/icons.tsx and theme.css with the same
 * sizes and tokens. Kept in this folder only until N1 lands its set, then swapped for it (told to
 * the lead). Nothing here is a new design: each piece names the web class it copies.
 */
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, useColorScheme, Platform, Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { useStore } from '@/store/store'
import { font, useTokens } from '../../lib/theme'

/* ---------------- icons (src/ui/icons.tsx geometry) ---------------- */

const P = (d: string) => <Path d={d} />
const PATHS = {
  heart: P('M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z'),
  fork: P('M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7v4h3'),
  dumbbell: P('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'),
  person: <><Circle cx="12" cy="8.5" r="3.8" /><Path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8" /></>,
  smile: <><Circle cx="12" cy="12" r="8.5" /><Path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01" /></>,
  mind: <><Circle cx="12" cy="12" r="9" /><Path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" /></>,
  check: P('M5 12.5l4.2 4.2L19 7'),
  checkc: <><Circle cx="12" cy="12" r="8.5" /><Path d="M8 12.3l2.7 2.7L16 9.6" /></>,
  plus: P('M12 5v14M5 12h14'),
  chevR: P('M9 5l7 7-7 7'),
  chevL: P('M15 5l-7 7 7 7'),
  x: P('M6 6l12 12M18 6L6 18'),
  target: <><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="4.5" /><Circle cx="12" cy="12" r=".8" /></>,
  weight: <><Path d="M5 20h14l-2-12H7z" /><Path d="M9.5 8a2.5 2.5 0 0 1 5 0" /></>,
  trend: P('M4 18l5-6 4 3 7-9'),
  review: <><Path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><Path d="M3.5 4.5v4h4" /><Path d="M12 8v4.5l3 1.8" /></>,
  leaf: <><Path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><Path d="M5 19l7-7" /></>,
  bulb: P('M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'),
  bell: <><Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><Path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  info: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 11v5M12 8h.01" /></>,
  calendar: <><Rect x="3.5" y="5" width="17" height="15.5" rx="3" /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>,
}
export type TIconName = keyof typeof PATHS

export function TIcon({ name, size = 20, stroke = 2, color }: { name: TIconName; size?: number; stroke?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  )
}

/** `svg.chev`: the trailing disclosure chevron (14 px, --label3). */
export function Chevron({ rotate = 0 }: { rotate?: number }) {
  const t = useTokens()
  return <View style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}><TIcon name="chevR" size={14} stroke={2.6} color={t.label3} /></View>
}

/* ---------------- text helpers ---------------- */

export function T({ w = 400, s, c, style, children, lines }: { w?: 400 | 500 | 600 | 700; s: number; c?: string; style?: StyleProp<TextStyle>; children: ReactNode; lines?: number }) {
  const t = useTokens()
  return <Text numberOfLines={lines} style={[font(w), { fontSize: s, color: c ?? t.label }, style]}>{children}</Text>
}

/* ---------------- sheets (.sheet, .sheet-hd, .sheet-bd; BareSheet) ---------------- */

function SheetFrame({ label, onClose, tall, bg, children }: { label: string; onClose: () => void; tall?: boolean; bg?: string; children: ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* .sheet-bg */}
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View accessibilityViewIsModal accessibilityLabel={label}
          style={[{ backgroundColor: bg ?? t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '100%', marginTop: insets.top + 12, paddingBottom: insets.bottom }, tall && { flex: 1 }]}>
          {/* .grabber */}
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, alignSelf: 'center', marginTop: 6 }} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** `.navbtn` (and `.navbtn.b`) */
export function NavBtn({ title, onPress, bold }: { title: string; onPress: () => void; bold?: boolean }) {
  const t = useTokens()
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}><Text style={[font(bold ? 600 : 400), { fontSize: 17, color: t.tint, paddingVertical: 4 }]}>{title}</Text></Pressable>
}

/** primitives.tsx Sheet: a header with Cancel, the title and a right action, then a scrolling body. */
export function Sheet({ title, onClose, right, tall, children }: { title: string; onClose: () => void; right?: ReactNode; tall?: boolean; children: ReactNode }) {
  return (
    <SheetFrame label={title} onClose={onClose} tall={tall}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}><NavBtn title="Cancel" onPress={onClose} /></View>
        <T w={600} s={17} lines={1} style={{ maxWidth: 210, textAlign: 'center' }}>{title}</T>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={tall ? { flex: 1 } : { flexGrow: 0 }} contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 24 }}>{children}</ScrollView>
    </SheetFrame>
  )
}

/** primitives.tsx BareSheet: no header, `.sheet.bare .sheet-bd` (10 px top). `gap`: `.sheet.consent`'s 14 px column. */
export function BareSheet({ label, onClose, bg, children }: { label: string; onClose: () => void; bg?: string; children: ReactNode }) {
  return (
    <SheetFrame label={label} onClose={onClose} bg={bg}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}>{children}</ScrollView>
    </SheetFrame>
  )
}

/* ---------------- controls ---------------- */

/** `.btn` (ink), `.btn.gray`, `.btn.sm`; heights per the web's per-use overrides. */
export function Button({ title, onPress, kind = 'ink', h = 50, size = 17, disabled, icon, align = 'stretch', label, style }: {
  title: string; onPress: () => void; kind?: 'ink' | 'gray' | 'raised'; h?: number; size?: number; disabled?: boolean; icon?: ReactNode
  align?: 'stretch' | 'flex-start'; label?: string; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  const bg = kind === 'ink' ? t.btn : kind === 'gray' ? t.fill : undefined
  const fg = kind === 'ink' ? t.btnInk : t.label
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ height: h, borderRadius: h / 2, paddingHorizontal: 18, alignSelf: align, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}>
      {icon}
      <Text style={[font(600), { color: fg, fontSize: size }]}>{title}</Text>
    </Pressable>
  )
}

/** `.linkbtn` */
export function Link({ title, onPress, size = 15, w = 400, style, label }: { title: string; onPress: () => void; size?: number; w?: 400 | 500 | 600; style?: StyleProp<TextStyle>; label?: string }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
      <Text style={[font(w), { fontSize: size, color: t.tint }, style]}>{title}</Text>
    </Pressable>
  )
}

/** `.chip` (`.chips` wraps them, gap 8) */
export function Chip({ children, onPress, on, style }: { children: ReactNode; onPress: () => void; on?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={({ pressed }) => [{ backgroundColor: on ? t.tint : t.fill, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 }, style]}>
      {typeof children === 'string' ? <Text style={[font(400), { fontSize: 15, lineHeight: 18, color: on ? t.onTint : t.label }]}>{children}</Text> : children}
    </Pressable>
  )
}

/** `.scale`: five equal buttons, `.on` in the tint; inside a sheet they sit on --elev. */
export function Scale({ labels, value, onChange, renderLabel, onStyle }: {
  labels: readonly string[]; value: number; onChange: (v: number) => void
  renderLabel?: (l: string, on: boolean) => ReactNode; onStyle?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {labels.map((l, i) => {
        const on = value === i + 1
        return (
          <Pressable key={l} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(on ? 0 : i + 1)}
            style={[{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on && !onStyle ? t.tint : t.elev }, on && onStyle]}>
            {renderLabel ? renderLabel(l, on) : <Text style={[font(400), { fontSize: 13, lineHeight: 16, textAlign: 'center', color: on ? t.onTint : t.label }]}>{l}</Text>}
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.lbl`: a group label */
export function Lbl({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(500), { fontSize: 13, color: t.label2, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 }, style]}>{children}</Text>
}

/** `.foot` */
export function Foot({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, paddingTop: 7, paddingHorizontal: 16 }, style]}>{children}</Text>
}

/* ---------------- list rows (.list, .li) ---------------- */

export function List({ children, bg, style }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return <View style={[{ backgroundColor: bg ?? t.card, borderRadius: t.radiusSm, overflow: 'hidden' }, style]}>{children}</View>
}

/** `.li`, with the 16 px inset separator above every row but the first (`first`). */
export function Li({ children, onPress, first, label, style }: { children: ReactNode; onPress?: () => void; first?: boolean; label?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const inner = (
    <>
      {!first && <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, backgroundColor: t.sep }} />}
      {children}
    </>
  )
  const s: StyleProp<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }, style]
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && { backgroundColor: t.fill }]}>{inner}</Pressable>
    : <View style={s}>{inner}</View>
}

/* ---------------- banner (.banner, .banner .x) ---------------- */

export function Banner({ icon, children, onDismiss, onPress, dismissLabel = 'Dismiss' }: {
  icon: ReactNode; children: ReactNode; onDismiss?: () => void; onPress?: () => void; dismissLabel?: string
}) {
  const t = useTokens()
  const body = (
    <>
      <View style={{ paddingTop: 1 }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {onDismiss && (
        <Pressable accessibilityRole="button" accessibilityLabel={dismissLabel} onPress={onDismiss} hitSlop={10}
          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
          <TIcon name="x" size={12} stroke={3} color={t.label2} />
        </Pressable>
      )}
    </>
  )
  const s: ViewStyle = { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14 }
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.7 }]}>{body}</Pressable>
    : <View style={s}>{body}</View>
}

/** Banner text: a bold first line, then the muted rest (`<b>…</b><br/><span class="muted">…</span>`). */
export function BannerText({ title, body }: { title: string; body: ReactNode }) {
  const t = useTokens()
  return (
    <Text style={[font(400), { fontSize: 15, lineHeight: 20, color: t.label }]}>
      <Text style={font(700)}>{title}</Text>{'\n'}<Text style={{ color: t.label2 }}>{body}</Text>
    </Text>
  )
}

/* ---------------- toast (the store's toast; the web's .toast and .toast.act) ---------------- */

export function ToastHost() {
  const t = useTokens()
  const dark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const msg = useStore((s) => s.toast)
  const action = useStore((s) => s.toastAction)
  if (!msg) return null
  // .toast.act sits on --hero (#1d1d1f light, #2c2c2e dark) with --hero-ink and a --brand action
  const bg = action ? (dark ? '#2c2c2e' : '#1d1d1f') : t.elev
  const fg = action ? '#ffffff' : t.label
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert"
        style={[{ backgroundColor: bg, borderRadius: action ? 16 : 20, paddingVertical: action ? 12 : 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, maxWidth: action ? 488 : '88%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, action && { alignSelf: 'stretch' }]}>
        <Text style={[font(500), { fontSize: 15, color: fg, flexShrink: 1, textAlign: action ? 'left' : 'center' }]}>{msg}</Text>
        {action && <Pressable accessibilityRole="button" onPress={() => { action.run(); useStore.setState({ toast: null, toastAction: null }) }} hitSlop={8}>
          <Text style={[font(600), { fontSize: 16, color: t.brand }]}>{action.label}</Text>
        </Pressable>}
      </View>
    </View>
  )
}
