/**
 * The frame every onboarding screen shares (src/styles/onboarding.css `.wz`, theme.css `.ob-cta`):
 * a full-screen scroll with the foot pinned to the bottom, and the screen heading that VoiceOver
 * (and a web render's keyboard focus) starts from when the step changes (screenHeading.ts).
 * Onboarding's own markup, built from tokens and tx(); TODO(N1-followup): move to lib/ui if another
 * stream needs a full-screen question page.
 */
import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react'
import { AccessibilityInfo, findNodeHandle, Platform, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WIZ } from '@/copy/onboarding'
import { tx, useTokens } from '../../lib/theme'
import { NavBtn } from '../../lib/ui/primitives'

/** Set by the wizard: false only for the first screen it shows, which keeps the system's own start. */
export const focusOnMount = { on: false }

/** `.wz-h`: 34/40, 700, -0.03em; focused when its screen opens. */
export function ScreenH({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  const ref = useRef<ComponentRef<typeof Text>>(null)
  useEffect(() => {
    if (!focusOnMount.on) return
    if (Platform.OS === 'web') { (ref.current as unknown as { focus?: () => void } | null)?.focus?.(); return }
    const tag = findNodeHandle(ref.current)
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag)
  }, [])
  return (
    <Text ref={ref} accessibilityRole="header" aria-level={1} {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})}
      style={[tx(34, 700, 40, -0.03), { color: t.label, marginTop: 28 }, style]}>{children}</Text>
  )
}

/** `.wz`: 20 pt sides, an 18 pt gap, the top below the status bar (54, or `top`), and `.ob-cta` on --bg. */
export function Page({ children, cta, top = 54, gap = 18, pad = 20 }: { children: ReactNode; cta?: ReactNode; top?: number; gap?: number; pad?: number }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + top, paddingHorizontal: pad, paddingBottom: 40, gap, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        {children}
      </ScrollView>
      {cta && <Foot>{cta}</Foot>}
    </View>
  )
}

/** `.ob-cta`: the foot, 12 above, 16 sides, the home indicator + 34 below. */
export function Foot({ children }: { children: ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 34, backgroundColor: t.bg, gap: 10, width: '100%', maxWidth: 520, alignSelf: 'center' }}>{children}</View>
}

/** `.btn.ob-btn`: the foot's ink pill, 54 high. */
export const OB_BTN: ViewStyle = { minHeight: 54, borderRadius: 27 }

/** `.wz-card` (`quiet`: 15 pt label2, `ink`: label). */
export function WzCard({ children, quiet, ink, style }: { children: ReactNode; quiet?: boolean; ink?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  return (
    <View style={[{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16 }, style]}>
      {typeof children === 'string'
        ? <Text style={[quiet ? tx(15, 400, 1.45) : tx(16, 400, 1.45), { color: quiet && !ink ? t.label2 : t.label }]}>{children}</Text>
        : children}
    </View>
  )
}

/** `.wz-lead`: 17 pt, 1.45, label2, 4 up. */
export function Lead({ children, ink, body }: { children: ReactNode; ink?: boolean; body?: boolean }) {
  const t = useTokens()
  return <Text style={[tx(17, 400, body ? 1.5 : 1.45), { color: ink ? t.label : t.label2, marginTop: body ? 0 : -4 }]}>{children}</Text>
}

/** `.wz-note`: 12 pt, label2. */
export function Note({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text style={[tx(12, 400, 1.4), { color: t.label2, paddingHorizontal: 4 }]}>{children}</Text>
}

/** `.feel-hd`: a sheet's 22 pt title and its Done. */
export function SheetHead({ title, onDone, done = WIZ.done }: { title: string; onDone: () => void; done?: string }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <Text accessibilityRole="header" style={[tx(22, 600), { color: t.label, flex: 1 }]}>{title}</Text>
      <NavBtn title={done} bold onPress={onDone} />
    </View>
  )
}
