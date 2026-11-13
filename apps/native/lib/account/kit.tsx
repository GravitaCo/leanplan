/**
 * The few Studio pieces the account, consent and legal screens need (N2), drawn to the web's
 * classes named beside each. N1 (native/n1-design-system) builds the full primitive set; when it
 * lands, these switch over to its `Sheet`, `BareSheet`, `BackButton`, `TaliMark` and icons, and
 * this file goes. Every piece keeps the web's accessible name and role, so the parity checks find
 * them the same way on both.
 */
import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Text } from './Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect } from 'react-native-svg'
import { font, useTokens } from '../theme'
import { dark } from '../tokens.generated'

/* ---------------- icons (src/ui/icons.tsx geometry) ---------------- */

const PATHS = {
  check: <Path d="M5 12.5l4.2 4.2L19 7" />,
  chevR: <Path d="M9 5l7 7-7 7" />,
  chevL: <Path d="M15 5l-7 7 7 7" />,
  mail: <><Rect x="3.5" y="5.5" width="17" height="13" rx="3" /><Path d="M4.5 7.5l7.5 5.5 7.5-5.5" /></>,
  arrow: <Path d="M5 12h14M13 6l6 6-6 6" />,
}
export function Ico({ name, size = 20, stroke = 2, color }: { name: keyof typeof PATHS; size?: number; stroke?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </Svg>
  )
}

/** The trailing disclosure chevron (`svg.i.chev`). */
export function Chevron() {
  const t = useTokens()
  return <Ico name="chevR" size={16} stroke={2.6} color={t.label3} />
}

/** The Tilo mark (src/ui/brand.tsx TaliMark), in `color` (the web's --mark, or white on the photo). */
const MARK = 'M123.57.33c-17.27,0-31.27,14-31.27,31.27s14,31.27,31.27,31.27,31.27-14,31.27-31.27S140.85.33,123.57.33ZM123.57,45.88c-7.87,0-14.27-6.4-14.27-14.27s6.4-14.27,14.27-14.27,14.27,6.4,14.27,14.27-6.4,14.27-14.27,14.27ZM65.63,28.52V.33h-17v28.19c0,18.59,15.13,33.72,33.72,33.72h9.95v-17h-9.95c-9.22,0-16.72-7.5-16.72-16.72ZM9.95,0H0v17h9.95c9.22,0,16.72,7.5,16.72,16.72v28.19h17v-28.19C43.67,15.13,28.54,0,9.95,0Z'
export function Mark({ width = 120, color }: { width?: number; color: string }) {
  return (
    <Svg width={width} height={(width * 62.88) / 154.85} viewBox="0 0 154.85 62.88" role="img" aria-label="Tilo">
      <Path fill={color} d={MARK} />
    </Svg>
  )
}

/** Google's multicolour "G", as its sign-in branding guidelines ask for on its button. */
export function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" aria-hidden>
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  )
}

/* ---------------- text ---------------- */

/** Body copy in a size and colour; `lh` is the web's unitless line-height. */
export function T({ children, size = 17, w = 400, color, lh, center, style, role }: {
  children: ReactNode; size?: number; w?: 400 | 500 | 600 | 700; color?: string; lh?: number; center?: boolean; style?: StyleProp<TextStyle>; role?: 'heading' | 'alert' | 'status'
}) {
  const t = useTokens()
  return (
    <Text role={role} aria-live={role === 'status' || role === 'alert' ? 'polite' : undefined}
      style={[font(w), { fontSize: size, color: color ?? t.label }, lh ? { lineHeight: Math.round(size * lh) } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  )
}

/** An inline link inside a sentence (`a`, `.linkbtn.inl`): the tint colour, its own tap. */
export function InlineLink({ children, onPress, underline }: { children: ReactNode; onPress: () => void; underline?: boolean }) {
  const t = useTokens()
  return <Text role="link" onPress={onPress} suppressHighlighting style={[{ color: t.tint }, underline && { textDecorationLine: 'underline' }]}>{children}</Text>
}

/* ---------------- buttons ---------------- */

type BtnKind = 'ink' | 'gray' | 'tinted' | 'danger' | 'red' | 'card' | 'google' | 'cardRed'
/** `.btn` and its variants: ink pill, `.gray`, `.tinted`, `.danger` (red words, no fill), `red`
 *  (`.delall`), `cardRed` (`.delbtn`, `.signout`), `google` (`.auth2-google`). */
export function Button({ title, onPress, kind = 'ink', disabled, height = 50, radius, children, after, size, style }: {
  title: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; height?: number; radius?: number; children?: ReactNode; after?: ReactNode; size?: number; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  const bg = { ink: t.btn, gray: t.fill, tinted: t.tintSoft, danger: 'transparent', red: t.red, card: t.card, google: t.card, cardRed: t.card }[kind]
  // .btn.delall: white on red in light, black on the lighter dark-mode red (contrast, theme.css)
  const fg = { ink: t.btnInk, gray: t.label, tinted: t.tint, danger: t.red, red: t === dark ? '#000000' : '#ffffff', card: t.label, google: t.label, cardRed: t.red }[kind]
  return (
    <Pressable role="button" aria-label={title} aria-disabled={disabled || undefined} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{
        height, borderRadius: radius ?? height / 2, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: kind === 'google' ? 10 : 6, paddingHorizontal: 16, opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }, kind === 'google' && { borderWidth: 1, borderColor: t.sep }, style]}>
      {children}
      <Text style={[font(kind === 'danger' ? 400 : kind === 'cardRed' ? 500 : 600), { color: fg, fontSize: size ?? (kind === 'google' || kind === 'cardRed' ? 16 : 17) }]}>{title}</Text>
      {after}
    </Pressable>
  )
}

/** `.linkbtn` (and `.muted`, `.ob-alt`): words in the tint colour, a 44 pt tap area. */
export function LinkButton({ title, onPress, muted, size = 15, w = 400, disabled, style }: { title: string; onPress: () => void; muted?: boolean; size?: number; w?: 400 | 500 | 600; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return (
    <Pressable role="button" aria-label={title} aria-disabled={disabled || undefined} disabled={disabled} onPress={onPress} hitSlop={10}
      style={({ pressed }) => [{ paddingVertical: 6, paddingHorizontal: 4, alignSelf: 'center', opacity: pressed ? 0.6 : 1 }, style]}>
      <Text style={[font(w), { fontSize: size, color: muted ? t.label2 : t.tint }]}>{title}</Text>
    </Pressable>
  )
}

/** `.navbtn` (and `BackButton`: a chevron and its label). */
export function NavButton({ title, onPress, bold, back, size = 17 }: { title: string; onPress: () => void; bold?: boolean; back?: boolean; size?: number }) {
  const t = useTokens()
  return (
    <Pressable role="button" aria-label={title} onPress={onPress} hitSlop={10} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}>
      {back && <Ico name="chevL" size={20} stroke={2.6} color={t.tint} />}
      <Text style={[font(bold ? 600 : back && size === 16 ? 500 : 400), { fontSize: size, color: t.tint }]}>{title}</Text>
    </Pressable>
  )
}

/* ---------------- lists ---------------- */

/** `.list`: inset grouped rows on a card. `bg` is `--elev` inside a sheet. */
export function List({ children, bg, style }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return <View style={[{ backgroundColor: bg ?? t.card, borderRadius: t.radiusSm, overflow: 'hidden' }, style]}>{children}</View>
}

/** `.li`: a row (`first` hides the separator above it). With `onPress` it's a button. */
export function Row({ title, sub, right, onPress, first, tint, wrap, label }: {
  title: string; sub?: string; right?: ReactNode; onPress?: () => void; first?: boolean; tint?: boolean; wrap?: boolean; label?: string
}) {
  const t = useTokens()
  const body = (
    <>
      {!first && <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, backgroundColor: t.sep }} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={wrap ? undefined : 1} style={[font(tint ? 500 : 400), { fontSize: tint ? 16 : 17, color: tint ? t.tint : t.label }]}>{title}</Text>
        {sub ? <Text numberOfLines={wrap ? undefined : 1} style={[font(400), { fontSize: 13, color: t.label2, marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      {right}
    </>
  )
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }
  return onPress
    ? <Pressable role="button" aria-label={label ?? title} onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: t.fill }]}>{body}</Pressable>
    : <View style={style}>{body}</View>
}

/** A consent statement with its own unticked box (`.li.consent-row`): never pre-ticked. */
export function CheckRow({ on, onChange, id, children, first }: { on: boolean; onChange: (v: boolean) => void; id: string; children: ReactNode; first?: boolean }) {
  const t = useTokens()
  return (
    <Pressable role="checkbox" aria-checked={on} testID={id} onPress={() => onChange(!on)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
      {!first && <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, backgroundColor: t.sep }} />}
      <View style={{ width: 22, height: 22, marginTop: 1, marginLeft: 4, marginRight: 3, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: t.label3 }}>
        {on && <Ico name="check" size={16} stroke={2.8} color={t.onTint} />}
      </View>
      <Text style={[font(400), { flex: 1, fontSize: 15, lineHeight: 21, color: t.label }]}>{children}</Text>
    </Pressable>
  )
}

/** `.ticks`: the card of ticked lines on the consent sheets. */
export function Ticks({ items, bg }: { items: readonly string[]; bg?: string }) {
  const t = useTokens()
  return (
    <View style={{ backgroundColor: bg ?? t.card, borderRadius: t.radius, padding: 16, gap: 10 }}>
      {items.map((x) => (
        <View key={x} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ marginTop: 2 }}><Ico name="check" size={16} stroke={2.6} color={t.tint} /></View>
          <Text style={[font(400), { flex: 1, fontSize: 15, lineHeight: 22, color: t.label }]}>{x}</Text>
        </View>
      ))}
    </View>
  )
}

/** `.foot`: a 13 pt note. */
export function Foot({ children, center, style }: { children: ReactNode; center?: boolean; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, paddingTop: 7, paddingHorizontal: 16 }, center && { textAlign: 'center' }, style]}>{children}</Text>
}

/* ---------------- sheets ---------------- */

/**
 * `Sheet` (src/ui/primitives.tsx): a bottom sheet with the grabber, a header (Cancel or `left`,
 * the title, `right`) and its body. `BareSheet` is `header={false}`: no header, its first line is its
 * own large title. The backdrop and the system back gesture close it.
 */
export function Sheet({ title, onClose, left, right, header = true, children, gap = 0 }: {
  title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; header?: boolean; children: ReactNode; gap?: number
}) {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable aria-label="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View role="dialog" aria-modal aria-label={title}
          style={{ backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: '100%', marginTop: ins.top + 12, paddingBottom: ins.bottom }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, alignSelf: 'center', marginTop: 6 }} />
          {header && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 10, paddingHorizontal: 16, gap: 8 }}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <NavButton title="Cancel" onPress={onClose} /> : left}</View>
              <Text role="heading" numberOfLines={1} style={[font(600), { fontSize: 17, color: t.label, maxWidth: 210, textAlign: 'center' }]}>{title}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
            </View>
          )}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: header ? 2 : 10, paddingHorizontal: 16, paddingBottom: 24, gap }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
