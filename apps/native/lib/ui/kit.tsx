/**
 * Studio's shared classes on native (theme.css): `.card` and `.card.pcard`, `.tile`, `.btn` and its
 * variants, `.linkbtn`, `.list` with its rows, `.banner` and `.toast`. Sizes and colours are read
 * from the CSS; every tappable thing has at least a 44 pt touch area (hitSlop where the web's box is
 * smaller), and the pressed state is the web's `:active` one.
 */
import { createContext, useContext, useEffect, useState, Children, Fragment, isValidElement, type ReactNode } from 'react'
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { create } from 'zustand'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { Icon, type IconName } from './icons'
import { BTN, tx, useTokens, type Tokens } from '../theme'

/** Inside a sheet, lists, cards and the pill sit on --elev (`.sheet .list, .sheet .card…`). */
export const InSheet = createContext(false)
/** Inside a `.list.icons`, where a row's label keeps its width and its value takes the rest. */
export const InIconList = createContext(false)
/** Inside a `.list.nf-rows`: subs wrap, the label takes the row and the value never truncates. */
export const InWrapList = createContext(false)
/** Inside a pillar card (`.pcard`), where some components drop their outer margins (`.pcard svg.bars`). */
export const InPCard = createContext(false)
export function useSurface(t: Tokens) {
  return useContext(InSheet) ? t.elev : t.card
}

/** A touch area padded out to 44 pt around a box of `w` × `h`. */
export function slop(w: number, h: number) {
  const x = Math.max(0, Math.ceil((44 - w) / 2)), y = Math.max(0, Math.ceil((44 - h) / 2))
  return { top: y, bottom: y, left: x, right: x }
}

/** `.card` (padding 14 16), or with `pcard` a pillar card (padding 16, rows 14 apart). */
export function Card({ children, style, plain = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; plain?: boolean }) {
  const t = useTokens()
  const bg = useSurface(t)
  return (
    <InPCard.Provider value={!plain}>
      <View style={[{ backgroundColor: bg, borderRadius: t.radius }, plain ? { paddingVertical: 14, paddingHorizontal: 16 } : { padding: 16, gap: 14 }, style]}>{children}</View>
    </InPCard.Provider>
  )
}

/** `.tile.st` (padding 16, rows 4 apart); tappable when given `onPress`. */
export function Tile({ children, onPress, label, style }: { children: ReactNode; onPress?: () => void; label?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const s: StyleProp<ViewStyle> = [{ minWidth: 0, backgroundColor: useSurface(t), borderRadius: t.radius, padding: 16, gap: 4 }, style]
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.7 }]}>{children}</Pressable>
    : <View style={s}>{children}</View>
}

/** A button's drawn height for its touch padding: a number from its style, or its default. */
function touchHeight(style: StyleProp<ViewStyle>, fallback: number): number {
  const f = StyleSheet.flatten(style)
  const h = typeof f?.height === 'number' ? f.height : typeof f?.minHeight === 'number' ? f.minHeight : fallback
  return h
}

export type BtnKind = 'ink' | 'tinted' | 'gray' | 'danger' | 'signout'

/** `.btn` (the ink pill, 50 high), `.tinted`, `.gray`, `.danger`, `.signout` (Profile's: a card-coloured
 *  block, radius 16, red 16 pt, 24 above), and `.sm` (36 high, as wide as its words). */
export function Btn({ title, onPress, kind = 'ink', small, icon, disabled, style, textStyle, label }: {
  title: string; onPress: () => void; kind?: BtnKind; small?: boolean; icon?: IconName | ReactNode; disabled?: boolean
  /** a context's own size (`.pcard .btn.gray` 48, `.mv .btn.sm` 40): the web's per-screen rules */
  style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; label?: string
}) {
  const t = useTokens()
  const bg = kind === 'ink' ? t.btn : kind === 'gray' ? t.fill : kind === 'tinted' ? t.tintSoft : kind === 'signout' ? t.card : 'transparent'
  const fg = kind === 'ink' ? t.btnInk : kind === 'gray' ? t.label : kind === 'tinted' ? t.tint : t.red
  const so = kind === 'signout'
  const h = small ? 36 : 50
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      hitSlop={slop(0, touchHeight(style, h))}
      style={({ pressed }) => [{
        minHeight: h, borderRadius: so ? 16 : h / 2, marginTop: so ? 24 : 0, paddingHorizontal: small ? 16 : 0, alignSelf: small ? 'flex-start' : 'stretch', backgroundColor: bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }, style]}>
      {typeof icon === 'string' ? <Icon name={icon as IconName} color={fg} /> : icon}
      <Text style={[tx(small ? 15 : so ? 16 : 17, kind === 'danger' ? 400 : so ? 500 : 600, 1.3, BTN), { color: fg }, textStyle]}>{title}</Text>
    </Pressable>
  )
}

/**
 * `.chip`: a soft pill (15 pt, 7 × 13 padding), tinted when chosen; `sub` is its small second line.
 * `on` given makes it a toggle for VoiceOver (selected state); without it the chip is a plain button.
 * Put chips in `Chips` (as the web always puts `.chip` in `.chips`): a row stretches them to one height.
 */
export function Chip({ title, sub, on, onPress }: { title: string; sub?: string; on?: boolean; onPress: () => void }) {
  const t = useTokens()
  const fg = on ? t.onTint : t.label
  return (
    <Pressable accessibilityRole="button" accessibilityState={on === undefined ? undefined : { selected: on }} onPress={onPress} hitSlop={slop(0, 32)}
      style={({ pressed }) => ({ backgroundColor: on ? t.tint : t.fill, borderRadius: 18, justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 13, opacity: pressed ? 0.7 : 1 })}>
      <Text style={[tx(15, 400, 1.2, BTN), { color: fg }]}>{title}</Text>
      {sub != null && <Text style={[tx(12, 400, 1.2, BTN), { color: on ? t.onTint : t.label2, opacity: on ? 0.8 : 1 }]}>{sub}</Text>}
    </Pressable>
  )
}

/** `.chips`: chips in a wrapping row, 8 apart. */
export function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
}

/** `.linkbtn`: tinted words, 15 pt, padding 6 4 (`muted` in --label2). */
export function LinkBtn({ title, onPress, style, muted }: { title: string; onPress: () => void; style?: StyleProp<TextStyle>; muted?: boolean }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Text style={[tx(15, 500, 1.3, BTN), { color: muted ? t.label2 : t.tint, paddingVertical: 6, paddingHorizontal: 4 }, style]}>{title}</Text>
    </Pressable>
  )
}

/** "Mo"… initials as the web's ProfileButton computes them. */
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

/**
 * `.list`: an inset grouped list (radius 18) whose rows are split by 1 px --sep lines starting 16 pt
 * in, or 58 pt in with `icons` (rows that start with a settings icon).
 */
export function List({ children, icons = false, wrap = false, style }: {
  children: ReactNode; icons?: boolean
  /** `.nf-rows` (Profile's notification rows): a row's sub wraps and its value is never cut */
  wrap?: boolean; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  const bg = useSurface(t)
  const rows = flat(children)
  return (
    <InIconList.Provider value={icons}>
    <InWrapList.Provider value={wrap}>
    <View style={[{ backgroundColor: bg, borderRadius: t.radiusSm, overflow: 'hidden' }, style]}>
      {rows.map((c, i) => (
        <View key={i}>
          {i > 0 && rows[i - 1] && !(isValidElement(c) && (c.props as { noSep?: boolean }).noSep) && (
            <View style={{ position: 'absolute', top: 0, left: icons ? 58 : 16, right: 0, height: 1, backgroundColor: t.sep, zIndex: 1 }} />
          )}
          {c}
        </View>
      ))}
    </View>
    </InWrapList.Provider>
    </InIconList.Provider>
  )
}
/** Children without fragments or empty slots, so separators fall only between real rows. */
function flat(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  Children.forEach(children, (c) => {
    if (c == null || c === false || c === true) return
    if (isValidElement(c) && c.type === Fragment) out.push(...flat((c.props as { children?: ReactNode }).children))
    else out.push(c)
  })
  return out
}

/**
 * `.banner`: an icon in a pillar ink, a bold line and a muted line, and an optional dismiss (the
 * 24 pt `.x` circle, in a 44 pt touch area). Tappable as a whole when given `onPress`.
 */
export function Banner({ icon, iconColor, title, body, onPress, onDismiss, children }: {
  icon: IconName; iconColor: string; title: string; body?: ReactNode; onPress?: () => void; onDismiss?: () => void; children?: ReactNode
}) {
  const t = useTokens()
  // a tappable banner is a <button> on the web, whose text the browser doesn't track
  const track = onPress ? BTN : undefined
  const inner = (
    <>
      <Icon name={icon} color={iconColor} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tx(15, 700, 1.35, track), { color: t.label }]}>{title}</Text>
        {body != null && <Text style={[tx(15, 400, 1.35, track), { color: t.label2 }]}>{body}</Text>}
        {children}
      </View>
      {onDismiss && (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={slop(24, 24)}
          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} stroke={3} color={t.label2} />
        </Pressable>
      )}
    </>
  )
  const s: ViewStyle = { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14 }
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.7 }]}>{inner}</Pressable>
    : <View style={s}>{inner}</View>
}

/** The toast's look (`.toast.show`, or `.toast.act` with an action such as Undo). */
export function ToastView({ text, action }: { text: string; action?: { label: string; run: () => void } | null }) {
  const t = useTokens()
  if (action) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%', maxWidth: 488, backgroundColor: t.hero, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)' }}>
      <Text style={[tx(15, 500), { color: t.heroInk, flexShrink: 1 }]}>{text}</Text>
      <Pressable accessibilityRole="button" onPress={action.run} hitSlop={slop(0, 26)}>
        <Text style={[tx(16, 600, 21, BTN), { color: t.brand, paddingVertical: 4 }]}>{action.label}</Text>
      </Pressable>
    </View>
  )
  return (
    <View style={{ backgroundColor: t.elev, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)' }}>
      <Text style={[tx(15, 500), { color: t.label, textAlign: 'center' }]}>{text}</Text>
    </View>
  )
}

/**
 * How many sheets are open. The toast sits above sheets, as on the web (`.toast` z-index 70 over
 * `.sheet-root` 60); a sheet is a Modal, which covers everything under it, so while one is open the
 * topmost sheet draws the toast inside its own Modal and the shell's host stands down.
 */
export const useOpenSheets = create<{ ids: number[] }>(() => ({ ids: [] }))
let nextSheet = 1
/**
 * Registers an open sheet for as long as it is mounted; returns its id. Ids are taken in render
 * order, so a sheet opened over another (or replacing it) always has the larger id, even when both
 * mount in one commit (effects run child-first, render runs parent-first): the topmost sheet is
 * the open one with the largest id.
 */
export function useSheetId(): number {
  const [id] = useState(() => nextSheet++)
  useEffect(() => {
    useOpenSheets.setState((s) => ({ ids: [...s.ids, id] }))
    return () => useOpenSheets.setState((s) => ({ ids: s.ids.filter((x) => x !== id) }))
  }, [id])
  return id
}

/**
 * The app's one toast (App.tsx's `.toast`), from the store's `toast` and `toastAction`: 72 pt above
 * the bottom safe area, fading and rising 10 pt over 0.25 s (no movement with Reduce Motion on).
 * Announced politely, as the web's role=status (VoiceOver through announceForAccessibility; TalkBack
 * through the live region). The shell mounts it once with no `sheet`; each sheet mounts one with its
 * id, and only the host of the topmost open sheet (or the shell's, with none open) draws.
 */
export function ToastHost({ sheet }: { sheet?: number } = {}) {
  const insets = useSafeAreaInsets()
  const top = useOpenSheets((s) => (s.ids.length ? Math.max(...s.ids) === sheet : sheet === undefined))
  const toast = useStore((s) => s.toast)
  const action = useStore((s) => s.toastAction)
  // once a toast has shown, its pill stays mounted and fades out empty when the toast clears, as
  // the web's `.toast` does (its words and any action go at once, so nothing stale is reachable)
  const [used, setUsed] = useState(false)
  useEffect(() => { if (toast) setUsed(true) }, [toast])
  const reduce = useReducedMotion()
  const shown = useSharedValue(0)
  useEffect(() => { shown.value = withTiming(toast ? 1 : 0, { duration: 250 }) }, [toast]) // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: reduce ? 0 : (1 - shown.value) * 10 }] }))
  useEffect(() => { if (top && toast && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(toast) }, [toast, top])
  if (!top) return null
  return (
    <Animated.View pointerEvents={toast && action ? 'box-none' : 'none'} accessibilityLiveRegion="polite"
      accessibilityElementsHidden={!toast} importantForAccessibility={toast ? 'auto' : 'no-hide-descendants'}
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 72 + insets.bottom, alignItems: 'center' }, style]}>
      {toast && action
        ? <View style={{ alignSelf: 'stretch', marginHorizontal: 16, alignItems: 'center' }}><ToastView text={toast} action={{ label: action.label, run: () => { action.run(); useStore.setState({ toast: null, toastAction: null }) } }} /></View>
        : (toast || used) && <View style={{ maxWidth: '88%' }}><ToastView text={toast ?? ''} /></View>}
    </Animated.View>
  )
}
