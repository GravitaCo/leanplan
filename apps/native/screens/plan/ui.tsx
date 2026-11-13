/**
 * Local stand-ins for the N1 primitives the Plan screens need, drawn from theme.css so they look
 * as the web's classes do (`.list`/`.li`, `.sheet`, `.navbtn`, `.chip`, `.toggle`, `.dash-add`,
 * `.plan-note`, `.btn`, `.foot`, `.grp-h`, `.lbl`, `.ltitle`, the toast). Each is swapped for N1's
 * component when native/n1-design-system lands (the lead was told). Nothing here is a new design.
 */
import { Children, createContext, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { Modal, Pressable, useColorScheme, ScrollView, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import { useStore } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { initials } from '../../lib/ui/kit'
import { openLab } from '../../lib/labSheet'
import { font, num, useTokens, type Tokens } from '../../lib/theme'

export { font, num, useTokens, type Tokens }

/**
 * `--hero` (#1d1d1f light, #2c2c2e dark): theme.css sets it in a later :root block that
 * scripts/tokens.mjs doesn't read yet, so it is missing from tokens.generated.ts (told the lead; N1).
 */
export function useHero(): string {
  return useColorScheme() === 'dark' ? '#2c2c2e' : '#1d1d1f'
}

/** Inside a sheet, lists, cards and fields sit on `--elev` (`.sheet .list, .sheet .card…`). */
const InSheet = createContext(false)
export const useInSheet = () => useContext(InSheet)

/* ---------------- icons (src/ui/icons.tsx geometry) ---------------- */

const P = (d: string) => <Path d={d} />
const PATHS = {
  chevL: P('M15 5l-7 7 7 7'),
  chevR: P('M9 5l7 7-7 7'),
  plus: P('M12 5v14M5 12h14'),
  x: P('M6 6l12 12M18 6L6 18'),
  check: P('M5 12.5l4.2 4.2L19 7'),
  dumbbell: P('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'),
  search: <><Circle cx="11" cy="11" r="6.5" /><Path d="M20 20l-4.3-4.3" /></>,
  sliders: <><Path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><Circle cx="16" cy="7" r="2" /><Circle cx="10" cy="17" r="2" /></>,
  info: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 11v5M12 8h.01" /></>,
} satisfies Record<string, ReactNode>
export type PIcon = keyof typeof PATHS

export function Icon({ name, size = 20, stroke = 2, color }: { name: PIcon; size?: number; stroke?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  )
}

/** `svg.chev`: 14 px, label3 */
export function Chevron() {
  const t = useTokens()
  return <Icon name="chevR" size={14} stroke={2.6} color={t.label3} />
}

/* ---------------- text ---------------- */

type TS = StyleProp<TextStyle>
export function T({ children, style, lines }: { children: ReactNode; style?: TS; lines?: number }) {
  const t = useTokens()
  return <Text numberOfLines={lines} style={[font(400), { fontSize: 17, lineHeight: 22, color: t.label, letterSpacing: -0.17 }, style]}>{children}</Text>
}
/** `.foot` (with the web's default 7/16 padding unless `style` changes it) */
export function Foot({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, paddingTop: 7, paddingHorizontal: 16 }, style]}>{children}</Text>
}
/** `.sub` */
export function Sub({ children, style }: { children: ReactNode; style?: TS }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 15, lineHeight: 20, color: t.label2 }, style]}>{children}</Text>
}
/** `.grp-h` (20 pt section title) or `.grp-h.sm` (13 pt label) */
export function GrpH({ children, sm, style }: { children: ReactNode; sm?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return sm
    ? <View style={[{ paddingHorizontal: 4, marginTop: 4, marginBottom: 8 }, style]}><Text accessibilityRole="header" style={[font(500), { fontSize: 13, color: t.label2 }]}>{children}</Text></View>
    : <View style={[{ paddingTop: 22, paddingBottom: 8, paddingHorizontal: 4 }, style]}><Text accessibilityRole="header" style={[font(600), { fontSize: 20, letterSpacing: -0.2, color: t.label }]}>{children}</Text></View>
}
/** `.lbl` */
export function Lbl({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return <View style={[{ paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4 }, style]}><Text style={[font(500), { fontSize: 13, color: t.label2 }]}>{children}</Text></View>
}

/* ---------------- lists ---------------- */

/** `.list`: an inset group; rows get the web's 1 px separator from 16 px (58 with icons). */
export function List({ children, style, inset = 16, radius }: { children: ReactNode; style?: StyleProp<ViewStyle>; inset?: number; radius?: number }) {
  const t = useTokens()
  const sheet = useInSheet()
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <View style={[{ backgroundColor: sheet ? t.elev : t.card, borderRadius: radius ?? t.radiusSm, overflow: 'hidden', marginBottom: 8 }, style]}>
      {rows.map((c, i) => (
        <View key={c.key ?? i}>
          {c}
          {i > 0 && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: inset, right: 0, height: 1, backgroundColor: t.sep }} />}
        </View>
      ))}
    </View>
  )
}

/** `.li` (button.li when `onPress`): a row, 44 pt high at least. */
export function Li({ children, onPress, style, label, selected, role }: {
  children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; selected?: boolean; role?: 'button' | 'radio'
}) {
  const t = useTokens()
  const s: StyleProp<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }, style]
  if (!onPress) return <View style={s} accessibilityLabel={label}>{children}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole={role ?? 'button'} accessibilityLabel={label} accessibilityState={selected != null ? { checked: selected } : undefined}
      style={({ pressed }) => [s, pressed && { backgroundColor: t.fill }]}>
      {children}
    </Pressable>
  )
}

/** A row's `.m` column: `.t` and `.s` (one line each unless `wrap`). */
export function M({ t: title, s, s2, wrap, tStyle }: { t: ReactNode; s?: ReactNode; s2?: ReactNode; wrap?: boolean; tStyle?: TS }) {
  const k = useTokens()
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={wrap ? undefined : 1} style={[font(400), { fontSize: 17, lineHeight: 22, color: k.label, letterSpacing: -0.17 }, tStyle]}>{title}</Text>
      {s != null && s !== '' && <Text numberOfLines={wrap ? undefined : 1} style={[font(400), { fontSize: 13, lineHeight: wrap ? 17.5 : 17, color: k.label2, marginTop: 2 }]}>{s}</Text>}
      {s2 != null && s2 !== '' && <Text numberOfLines={wrap ? undefined : 1} style={[font(400), { fontSize: 13, lineHeight: 17, color: k.label2, marginTop: 2 }]}>{s2}</Text>}
    </View>
  )
}

/** `.li.act`: "+ New plan" */
export function ActRow({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTokens()
  return (
    <Li onPress={onPress}>
      <Icon name="plus" size={17} color={t.label} />
      <Text style={[font(500), { fontSize: 16, color: t.label }]}>{label}</Text>
    </Li>
  )
}

/* ---------------- controls ---------------- */

/** `.navbtn` (tint, 17 pt), `.navbtn.b` bold; with `back` the chevron of BackButton. */
export function NavBtn({ title, onPress, bold, back, disabled }: { title: string; onPress: () => void; bold?: boolean; back?: boolean; disabled?: boolean }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={8}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginLeft: back ? -6 : 0, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
      {back && <Icon name="chevL" size={20} stroke={2.6} color={t.tint} />}
      <Text style={[font(bold ? 600 : 400), { fontSize: 17, color: t.tint }]}>{title}</Text>
    </Pressable>
  )
}
export const BackButton = ({ label = 'Back', onPress }: { label?: string; onPress: () => void }) => <NavBtn back title={label} onPress={onPress} />

/** `.linkbtn` */
export function LinkBtn({ title, onPress, style, label, muted }: { title: string; onPress: () => void; style?: StyleProp<ViewStyle>; label?: string; muted?: boolean }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [{ paddingVertical: 6, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 }, style]}>
      <Text style={[font(400), { fontSize: 15, color: muted ? t.label2 : t.tint }]}>{title}</Text>
    </Pressable>
  )
}

/** `.btn` (ink), `.btn.gray`, `.btn.danger`; `tall` is the 54 pt CTA of `.pl-cta`/`.pp-cta`. */
export function Btn({ title, onPress, kind = 'ink', tall, disabled, style }: {
  title: string; onPress: () => void; kind?: 'ink' | 'gray' | 'danger'; tall?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  const h = tall ? 54 : 50
  const bg = kind === 'ink' ? t.btn : kind === 'gray' ? t.fill : 'transparent'
  const fg = kind === 'ink' ? t.btnInk : kind === 'gray' ? t.label : t.red
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{ height: h, borderRadius: h / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}>
      <Text style={[font(kind === 'danger' ? 400 : 600), { fontSize: 17, color: fg }]}>{title}</Text>
    </Pressable>
  )
}

/** `.chip` with its variants: `on` (tint), `ink`, `plain` (card), `sm`. */
export function Chip({ title, onPress, on, ink, plain, sm, size, label, role = 'button', pad, elev }: {
  title: string; onPress: () => void; on?: boolean; ink?: boolean; plain?: boolean; sm?: boolean; size?: number; label?: string
  role?: 'button' | 'radio' | 'tab'; pad?: [number, number]; elev?: boolean
}) {
  const t = useTokens()
  const bg = on ? t.tint : ink ? t.btn : plain ? (elev ? t.elev : t.card) : elev ? t.elev : t.fill
  const fg = on ? t.onTint : ink ? t.btnInk : t.label
  const [py, px] = pad ?? (sm ? [5, 10] : [7, 13])
  return (
    <Pressable onPress={onPress} accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ selected: !!(on || ink) }}
      style={({ pressed }) => ({ backgroundColor: bg, borderRadius: sm ? 12 : 18, paddingVertical: py, paddingHorizontal: px, opacity: pressed ? 0.7 : 1 })}>
      <Text style={[font(ink ? 600 : sm ? 500 : 400), { fontSize: size ?? (sm ? 12 : 15), lineHeight: (size ?? (sm ? 12 : 15)) * 1.2, color: fg }]}>{title}</Text>
    </Pressable>
  )
}
export const Chips = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>

/** `.toggle` */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onChange}
      style={{ width: 51, height: 31, borderRadius: 31, backgroundColor: on ? t.tint : t.fill2, justifyContent: 'center' }}>
      <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#fff', marginLeft: on ? 22 : 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } }} />
    </Pressable>
  )
}

/** `.dash-add` */
export function DashAdd({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ height: 56, marginTop: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.dash, borderRadius: t.radiusSm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? t.fill : 'transparent' })}>
      <Icon name="plus" size={18} stroke={2.4} color={t.tint} />
      <Text style={[font(600), { fontSize: 16, color: t.tint }]}>{title}</Text>
    </Pressable>
  )
}

/** `.card` (radius 22, 14/16 padding) */
export function Card({ children, style, onPress, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const t = useTokens()
  const elev = useInSheet()
  const s: StyleProp<ViewStyle> = [{ backgroundColor: elev ? t.elev : t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 }, style]
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>{children}</Pressable>
    : <View style={s}>{children}</View>
}

/** `.card.plan-note`: 14 pt, radius 16, 8 pt above */
export function PlanNote({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const elev = useInSheet()
  return (
    <View style={[{ backgroundColor: elev ? t.elev : t.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 8, marginBottom: 10 }, style]}>
      {typeof children === 'string' ? <Text style={[font(400), { fontSize: 14, lineHeight: 19.6, color: t.label }]}>{children}</Text> : children}
    </View>
  )
}

/** `.sheet-input` / `input` */
export function Field({ style, ...p }: TextInputProps) {
  const t = useTokens()
  const elev = useInSheet()
  return (
    <TextInput placeholderTextColor={t.label3} {...p}
      style={[font(400), { fontSize: 17, color: t.label, backgroundColor: elev ? t.elev : t.fill, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }, style]} />
  )
}

/* ---------------- screens ---------------- */

/** `.screen` in a scroll view; `top` adds the safe area (screens without a hero). `footer` is a fixed CTA (`.pl-cta`). */
export function Screen({ children, top = true, footer, pad = 12 }: { children: ReactNode; top?: boolean; footer?: ReactNode; pad?: number }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: top ? insets.top : 0, paddingBottom: pad }}>{children}</ScrollView>
      {footer && <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 }}>{footer}</View>}
    </View>
  )
}

/** `.pv-back`: the back row under the status bar */
export const PvBack = ({ children }: { children: ReactNode }) => <View style={{ paddingTop: 16, paddingBottom: 6, alignItems: 'flex-start' }}>{children}</View>

/** The Profile avatar (`.avatar.soft`); in the spike it opens the lab, as the other tabs do. */
export function Avatar() {
  const t = useTokens()
  const name = useStore((s) => s.data.profile.name)
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={openLab} hitSlop={2}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[font(600), { fontSize: 16, color: t.tint }]}>{initials(name) || '·'}</Text>
    </Pressable>
  )
}

/** `.ltitle` with the avatar beside it when the wellbeing flag is on (TitleRow) */
export function TitleRow({ title }: { title: string }) {
  const t = useTokens()
  const h = <Text accessibilityRole="header" style={[font(600), { flex: 1, minWidth: 0, fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: t.label, marginTop: 2 }]}>{title}</Text>
  if (!WELLBEING_ENABLED) return h
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>{h}<Avatar /></View>
}

/** The Plan tab's `.hdr` with no eyebrow (the web passes none). */
export function PageHeader({ title }: { title: string }) {
  return <View style={{ paddingTop: 18, paddingBottom: 12 }}><View style={{ minHeight: 20 }} /><TitleRow title={title} /></View>
}

/* ---------------- sheets ---------------- */

/** `.sheet`: grabber, a Cancel | title | action header, a scrolling body; `tall` fills the screen. */
export function Sheet({ title, onClose, left, right, tall, children, footer }: {
  title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; tall?: boolean; children: ReactNode; footer?: ReactNode
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View accessibilityViewIsModal accessibilityLabel={title}
          style={{ backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '94%', height: tall ? '94%' : undefined, paddingBottom: insets.bottom }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, marginTop: 6, alignSelf: 'center' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 10, paddingHorizontal: 16, gap: 8 }}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <NavBtn title="Cancel" onPress={onClose} /> : left}</View>
            <Text numberOfLines={1} style={[font(600), { fontSize: 17, color: t.label, maxWidth: 210, textAlign: 'center' }]}>{title}</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
          </View>
          <InSheet.Provider value>
            <ScrollView style={tall ? { flex: 1 } : undefined} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 24 }}>{children}</ScrollView>
            {footer && <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: t.sheet }}>{footer}</View>}
          </InSheet.Provider>
        </View>
      </View>
    </Modal>
  )
}

/** `.sheet.bare`: no header, the body starts with its own title. */
export function BareSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View accessibilityViewIsModal accessibilityLabel={label} style={{ backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '94%', paddingBottom: insets.bottom }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, marginTop: 6, alignSelf: 'center' }} />
          <InSheet.Provider value>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 24 }}>{children}</ScrollView>
          </InSheet.Provider>
        </View>
      </View>
    </Modal>
  )
}

/* ---------------- toast ---------------- */

/**
 * The store's toast (`.toast`, and `.toast.act` with Undo). The web draws it once in App; on native
 * the app shell owns it, so this host lives in the Plan tab until the lead's shell has one.
 */
export function ToastHost() {
  const t = useTokens()
  const msg = useStore((s) => s.toast)
  const act = useStore((s) => s.toastAction)
  const hero = useHero()
  const [shown, setShown] = useState<string | null>(null)
  useEffect(() => { setShown(msg) }, [msg])
  if (!shown) return null
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' }}>
      {act ? (
        <View accessibilityLiveRegion="polite" style={{ width: '92%', maxWidth: 488, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, backgroundColor: hero, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16 }}>
          <Text style={[font(500), { flex: 1, fontSize: 15, color: '#fff' }]}>{shown}</Text>
          <Pressable accessibilityRole="button" onPress={() => { act.run(); setShown(null) }} hitSlop={8}>
            <Text style={[font(600), { fontSize: 16, color: t.brand }]}>{act.label}</Text>
          </Pressable>
        </View>
      ) : (
        <View accessibilityLiveRegion="polite" style={{ maxWidth: '88%', backgroundColor: t.elev, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } }}>
          <Text style={[font(500), { fontSize: 15, color: t.label, textAlign: 'center' }]}>{shown}</Text>
        </View>
      )}
    </View>
  )
}
