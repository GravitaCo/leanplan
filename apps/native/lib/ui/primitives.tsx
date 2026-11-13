/**
 * Native ports of src/ui/primitives.tsx, ProfileButton.tsx and ConnectionPill.tsx: the same
 * props, words and accessibility labels, sizes and colours read from theme.css. Sheets are the
 * web's own bottom sheet (grabber, Cancel · title · action), not the system's: native sheets and
 * swipe-back are an improvement candidate that needs a board first (native-build-brief §4).
 *
 * Scroll lock: a sheet is a Modal, which already stops the screen behind it from scrolling, so
 * native needs no `useScrollLock`; the keyboard is handled by KeyboardAvoidingView inside the sheet.
 */
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeIn, SlideInDown, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { useConnection } from '@/store/hooks'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import type { ConnectionKind, ConnectionState } from '@/core/domain/connection'
import { connectionLine } from '@/ui/ConnectionPill'
import { Chevron, Icon, type IconName } from './icons'
import { InIconList, InSheet, initials, slop, useSurface } from './kit'
import { num, tx, useTokens, type Tokens } from '../theme'

/** Category colour keys, as on the web: each maps to a base and an -ink token. */
export type Category = 'energy' | 'activity' | 'body' | 'mind'
const INK: Record<Category, keyof Tokens> = { energy: 'energyInk', activity: 'activityInk', body: 'bodyInk', mind: 'mindInk' }

/* ---------------------------------------------------------------- connection pill */

const CONN_ICON: Record<ConnectionKind, IconName> = {
  'up-to-date': 'check', pending: 'cloudUp', offline: 'cloudOff', 'sign-in': 'person', problem: 'alert', 'phone-only': 'cloudOff',
}

/** `.cpill`: the pill's look for one state (the gallery draws every state). */
export function ConnectionPillView({ kind, label, open, onPress }: { kind: ConnectionKind; label: string; open?: boolean; onPress?: () => void }) {
  const t = useTokens()
  const bg = useSurface(t)
  const color = kind === 'up-to-date' ? t.label2 : t.label
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={onPress ? { expanded: !!open } : undefined}
      onPress={onPress} hitSlop={slop(0, 25)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 13, backgroundColor: bg, flexShrink: 1, minWidth: 0 }}>
      <Icon name={CONN_ICON[kind]} size={15} color={color} />
      <Text numberOfLines={1} style={[tx(12, 500, 15), num, { color, flexShrink: 1 }]}>{label}</Text>
    </Pressable>
  )
}

/** The one connection indicator: the pill in every tab header. On "Sync problem" a tap also tries again. */
export function ConnectionPill({ open, onToggle }: { open?: boolean; onToggle?: () => void }) {
  const c = useConnection()
  const runSync = useStore((s) => s.runSync)
  return <ConnectionPillView kind={c.kind} label={c.label} open={open} onPress={() => { if (c.kind === 'problem') runSync(); onToggle?.() }} />
}

/** `.cline`: the line under the pill, the state's name in bold, then what it means. */
export function ConnectionLineView({ state }: { state: ConnectionState }) {
  const t = useTokens()
  const l = connectionLine(state)
  return (
    <Text accessibilityLiveRegion="polite" style={[tx(13, 400, 1.4), { color: t.label2, paddingTop: 8, paddingHorizontal: 4 }]}>
      <Text style={[tx(13, 600, 1.4), { color: t.label }]}>{l.head}</Text> {l.body}
    </Text>
  )
}

export function ConnectionLine() {
  return <ConnectionLineView state={useConnection()} />
}

/* ---------------------------------------------------------------- headers */

/** `.pfl` + `.avatar.soft`: the way into Profile beside every title, 40 pt in a 44 pt tap area. */
export function ProfileButton({ onPress }: { onPress?: () => void }) {
  const t = useTokens()
  const name = useStore((s) => s.data.profile.name)
  const ini = initials(name || '')
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onPress}
      style={{ width: 44, height: 44, marginRight: -2, marginBottom: -2, padding: 2, alignItems: 'center', justifyContent: 'flex-start' }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
        {ini ? <Text style={[tx(16, 600), { color: t.tint }]}>{ini}</Text> : <Icon name="person" color={t.tint} />}
      </View>
    </Pressable>
  )
}

const ltitle = (t: Tokens) => [tx(34, 600, 40, -0.025), { color: t.label, marginTop: 2 }]

/**
 * A tab's large-title header (`.hdr`): the eyebrow with the connection pill across from it (tap for
 * the line underneath), the 34 pt title, and with WELLBEING_ENABLED the Profile avatar beside it,
 * top-aligned to its first line. Screens other than the five tabs pass `pill={false}`.
 * `top` is the space above (the web's safe area plus 18).
 */
export function PageHeader({ eyebrow, title, right, pill = true, profile = true, onProfile, top }: {
  eyebrow?: ReactNode; title: string; right?: ReactNode; pill?: boolean; profile?: boolean; onProfile?: () => void; top?: number
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const [line, setLine] = useState(false)
  const av = WELLBEING_ENABLED && profile
  return (
    <View style={{ paddingTop: top ?? insets.top + 18, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 20, minWidth: 0, flexShrink: 1 }}>
          {typeof eyebrow === 'string' ? <Text style={[tx(13, 500, 1.3, 0), { color: t.label2 }]}>{eyebrow}</Text> : eyebrow}
        </View>
        {pill && <ConnectionPill open={line} onToggle={() => setLine((x) => !x)} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: av ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <Text accessibilityRole="header" style={[ltitle(t), { flexShrink: 1, minWidth: 0 }]}>{title}</Text>
        {av
          ? right ? <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>{right}<ProfileButton onPress={onProfile} /></View> : <ProfileButton onPress={onProfile} />
          : right}
      </View>
      {pill && line && <ConnectionLine />}
    </View>
  )
}

/** A pushed screen's large title (under its back button), with the avatar beside it when WELLBEING_ENABLED. */
export function TitleRow({ title, onProfile }: { title: ReactNode; onProfile?: () => void }) {
  const t = useTokens()
  const h = <Text accessibilityRole="header" style={[ltitle(t), { flexShrink: 1, minWidth: 0 }]}>{title}</Text>
  if (!WELLBEING_ENABLED) return h
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>{h}<ProfileButton onPress={onProfile} /></View>
}

/** `.hk-h`: a card heading, the category icon and label in the category's ink. */
export function CatHead({ color, icon, label }: { color: Category; icon: IconName; label: string }) {
  const t = useTokens()
  const ink = t[INK[color]] as string
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} color={ink} />
        <Text style={[tx(15, 600), { color: ink }]}>{label}</Text>
      </View>
    </View>
  )
}

/** `.navbtn` with a back chevron: tinted, 17 pt. */
export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={slop(0, 30)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}>
      <Icon name="chevL" size={20} stroke={2.6} color={t.tint} />
      <Text style={[tx(17), { color: t.tint }]}>{label}</Text>
    </Pressable>
  )
}

/** `.navbtn`: a sheet header's Cancel or Done (`bold` is `.navbtn.b`). */
export function NavBtn({ title, onPress, bold, disabled }: { title: string; onPress: () => void; bold?: boolean; disabled?: boolean }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} accessibilityState={{ disabled: !!disabled }} hitSlop={slop(0, 30)}
      style={({ pressed }) => ({ paddingVertical: 4, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
      <Text style={[tx(17, bold ? 600 : 400), { color: t.tint }]}>{title}</Text>
    </Pressable>
  )
}

/* ---------------------------------------------------------------- controls */

/** `.seg`: a segmented control (a radio group), the chosen segment raised on --segon. */
export function Seg<T extends string>({ options, value, onChange, label }: { options: [T, string][]; value: T | undefined; onChange: (v: T) => void; label?: string }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: 9, padding: 2 }}>
      {options.map(([v, l]) => {
        const on = v === value
        return (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(v)} hitSlop={{ top: 6, bottom: 6 }}
            style={{ flex: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', backgroundColor: on ? t.segon : 'transparent',
              boxShadow: on ? '0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04)' : undefined }}>
            <Text numberOfLines={1} style={[tx(13, 600), { color: t.label }]}>{l}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.toggle`: a 51 × 31 switch, the knob sliding 20 pt over 0.2 s (at once with Reduce Motion on). */
export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  const t = useTokens()
  const reduce = useReducedMotion()
  const x = useSharedValue(on ? 1 : 0)
  useEffect(() => { x.value = reduce ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 200 }) }, [on, reduce]) // eslint-disable-line react-hooks/exhaustive-deps
  const off = t.fill2, tint = t.tint
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(x.value, [0, 1], [off, tint]) }))
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }))
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on, disabled: !!disabled }} disabled={disabled} onPress={onChange}
      hitSlop={slop(51, 31)} style={{ opacity: disabled ? 0.4 : 1 }}>
      <Animated.View style={[{ width: 51, height: 31, borderRadius: 15.5 }, track]}>
        <Animated.View style={[{ position: 'absolute', width: 27, height: 27, left: 2, top: 2, borderRadius: 13.5, backgroundColor: '#fff', boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)' }, knob]} />
      </Animated.View>
    </Pressable>
  )
}

/* ---------------------------------------------------------------- grouped rows */

/** `.ico`: a settings-row icon, a 30 pt rounded square; `soft` is the pastel Profile square. */
function RowIcon({ icon, color, soft }: { icon: IconName; color: string; soft?: boolean }) {
  const t = useTokens()
  return (
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={soft ? t.label : t.onCat} />
    </View>
  )
}

const LI: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }

/**
 * A row's label and value. In a `.list.icons` the label keeps its width (at most 72%) and a value
 * takes the rest, 15 pt, right-aligned and truncating; with no value the label fills the row.
 */
function LabelValue({ label, sub, value }: { label: string; sub?: ReactNode; value?: ReactNode }) {
  const t = useTokens()
  const icons = useContext(InIconList)
  const hasValue = value != null
  return (
    <>
      <View style={icons && hasValue ? { flexShrink: 0, maxWidth: '72%' } : { flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[tx(17), { color: t.label }]}>{label}</Text>
        {sub != null && <Text numberOfLines={1} style={[tx(13), { color: t.label2, marginTop: 2 }]}>{sub}</Text>}
      </View>
      {hasValue && (
        <Text numberOfLines={1} style={[tx(icons ? 15 : 17), num, { color: t.label2 }, icons && { flex: 1, minWidth: 0, textAlign: 'right' }]}>{value}</Text>
      )}
    </>
  )
}

/** A grouped-list row that opens something (icon · label · value · chevron); put it in a `List icons`. */
export function SettingRow({ icon, color, soft, label, sub, value, onPress, right }: {
  icon: IconName; color: string; soft?: boolean; label: string; sub?: ReactNode; value?: ReactNode; onPress?: () => void; right?: ReactNode
}) {
  const t = useTokens()
  const body = (
    <>
      <RowIcon icon={icon} color={color} soft={soft} />
      <LabelValue label={label} sub={sub} value={value} />
      {right ?? (onPress && <Chevron color={t.label3} />)}
    </>
  )
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [LI, pressed && { backgroundColor: t.fill }]}>{body}</Pressable>
    : <View style={LI}>{body}</View>
}

/** A grouped-list row that expands in place; the chevron turns 90° over 0.2 s. */
export function Disclosure({ icon, color, soft, label, value, open, onToggle, children }: {
  icon: IconName; color: string; soft?: boolean; label: string; value?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode
}) {
  const t = useTokens()
  const reduce = useReducedMotion()
  const r = useSharedValue(open ? 90 : 0)
  useEffect(() => { r.value = reduce ? (open ? 90 : 0) : withTiming(open ? 90 : 0, { duration: 200 }) }, [open, reduce]) // eslint-disable-line react-hooks/exhaustive-deps
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }))
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}
        style={({ pressed }) => [LI, pressed && { backgroundColor: t.fill }]}>
        <RowIcon icon={icon} color={color} soft={soft} />
        <LabelValue label={label} value={open ? undefined : value} />
        <Animated.View style={turn}><Chevron color={t.label3} /></Animated.View>
      </Pressable>
      {open && <View style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View>}
    </View>
  )
}

/* ---------------------------------------------------------------- sheets */

const SHEET_IN = SlideInDown.duration(340).easing(Easing.bezier(0.2, 0.9, 0.25, 1).factory())
const FADE_IN = FadeIn.duration(250)

function useKeyboardUp() {
  const [up, setUp] = useState(false)
  useEffect(() => {
    const a = Keyboard.addListener('keyboardWillShow', () => setUp(true))
    const b = Keyboard.addListener('keyboardWillHide', () => setUp(false))
    const c = Keyboard.addListener('keyboardDidShow', () => setUp(true))
    const d = Keyboard.addListener('keyboardDidHide', () => setUp(false))
    return () => { a.remove(); b.remove(); c.remove(); d.remove() }
  }, [])
  return up
}

/** The frame both sheets share: backdrop, the sheet sliding up, the grabber, Escape/back to close. */
function SheetFrame({ label, onClose, tall, animate = true, header, children }: {
  label: string; onClose: () => void; tall?: boolean; animate?: boolean; header?: ReactNode; children: ReactNode
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const reduce = useReducedMotion()
  const kb = useKeyboardUp()
  const max = height - insets.top - 12
  const anim = animate && !reduce
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View entering={anim ? FADE_IN : undefined} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessible={false} importantForAccessibility="no" />
        </Animated.View>
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }} pointerEvents="box-none">
          <Animated.View entering={anim ? SHEET_IN : undefined} accessibilityViewIsModal accessibilityLabel={label} onAccessibilityEscape={onClose}
            style={{ width: '100%', maxWidth: 520, backgroundColor: t.sheet, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: max, height: tall ? max : undefined, paddingBottom: kb ? 0 : insets.bottom }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill3, marginTop: 6, alignSelf: 'center' }} />
            {header}
            <InSheet.Provider value>
              <ScrollView style={{ flexGrow: tall ? 1 : 0, flexShrink: 1 }} contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            </InSheet.Provider>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/**
 * A bottom sheet with a navigation header (left action · title · right action). `left` defaults to
 * Cancel; pass null for nothing. `animate={false}` when swapping views inside an open sheet.
 */
export function Sheet({ title, onClose, left, right, tall, animate = true, children }: {
  title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; tall?: boolean; animate?: boolean; children: ReactNode
}) {
  const t = useTokens()
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>{left === undefined ? <NavBtn title="Cancel" onPress={onClose} /> : left}</View>
      <Text accessibilityRole="header" numberOfLines={1} style={[tx(17, 600), { color: t.label, textAlign: 'center', maxWidth: 210 }]}>{title}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
    </View>
  )
  return <SheetFrame label={title} onClose={onClose} tall={tall} animate={animate} header={header}>{children}</SheetFrame>
}

/** A bottom sheet without the navigation header, for sheets whose first line is their own large title. */
export function BareSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return <SheetFrame label={label} onClose={onClose}>{children}</SheetFrame>
}
