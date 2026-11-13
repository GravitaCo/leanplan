/**
 * Studio's text classes as components (theme.css): `.lbl` (a list's label above it), `.grp-h` (a
 * group heading, with an optional small note), `.foot` (the note under a list), `.sub` (secondary
 * 15 pt) and `.prose` (reading text: paragraphs, bullets and small headings). Words only; spacing
 * is the web's own padding, so a screen stacks them as the web does.
 */
import type { ReactNode } from 'react'
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { tx, useTokens } from '../theme'

/** `.lbl`: 13 pt medium, --label2, padding 18 4 8. `style` for a screen's own padding (`.mind-lbl-first`). */
export function Lbl({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const text = <Text style={[tx(13, 500), { color: t.label2 }]}>{children}</Text>
  return (
    <View style={[{ paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, style]}>
      {text}{right}
    </View>
  )
}

/** `.grp-h`: a 20 pt section heading; on the right an optional `small` note at 14 pt, or a `link`. */
export function GrpH({ children, small, link }: { children: ReactNode; small?: ReactNode; link?: { title: string; onPress: () => void; label?: string } }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 22, paddingHorizontal: 4, paddingBottom: 8 }}>
      <Text style={[tx(20, 600, 1.3, -0.01), { color: t.label }]}>{children}</Text>
      {small != null && <Text style={[tx(14, 400, 1.3, 0), { color: t.label2 }]}>{small}</Text>}
      {link && <TextLink onPress={link.onPress} label={link.label} style={tx(15, 400, 1.3, 0)}>{link.title}</TextLink>}
    </View>
  )
}

/** `.foot`: 13 pt --label2 at 1.38, padding 7 16 0. */
export function Foot({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[tx(13, 400, 1.38), { color: t.label2, paddingTop: 7, paddingHorizontal: 16 }, style]}>{children}</Text>
}

/** `.sub`: 15 pt --label2. */
export function Sub({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens()
  return <Text style={[tx(15), { color: t.label2 }, style]}>{children}</Text>
}

/** A block of `.prose`: a paragraph (`p`), a bullet list (`ul`) or a small heading (`h3`). */
export type ProseBlock = { p: ReactNode } | { ul: ReactNode[] } | { h3: string }

/** `.prose`: 15 pt at 1.45; paragraphs and lists 10 apart, bullets 5 apart and 18 in, h3 17 pt. */
export function Prose({ blocks }: { blocks: ProseBlock[] }) {
  const t = useTokens()
  const body = [tx(15, 400, 1.45), { color: t.label }]
  // CSS margins collapse: a heading's 16 above meets the block before's 10 (so 6 more), and a
  // list's last bullet's 5 sits inside the list's own 10
  return (
    <View>
      {blocks.map((b, i) => {
        if ('h3' in b) return <Text key={i} accessibilityRole="header" style={[tx(17, 700, 1.45), { color: t.label, marginTop: i === 0 ? 0 : 6, marginBottom: 6 }]}>{b.h3}</Text>
        if ('ul' in b) return (
          <View key={i} role="list" style={{ marginBottom: 10 }}>
            {b.ul.map((li, j) => (
              <View key={j} role="listitem" style={{ flexDirection: 'row', marginBottom: j === b.ul.length - 1 ? 0 : 5 }}>
                {/* the list's disc marker, drawn rather than typed so it isn't read or copied as text */}
                <View style={{ width: 18, height: 15 * 1.45, justifyContent: 'center' }}><View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.label, marginLeft: 1, marginTop: -1 }} /></View>
                <Text style={[body, { flex: 1 }]}>{li}</Text>
              </View>
            ))}
          </View>
        )
        return <Text key={i} style={[body, { marginBottom: 10 }]}>{b.p}</Text>
      })}
    </View>
  )
}

/** `.empty`: a centred 15 pt --label2 line where a list has nothing yet (padding 22 16, 1.4). */
export function Empty({ children, status }: { children: ReactNode; status?: boolean }) {
  const t = useTokens()
  return <Text accessibilityLiveRegion={status ? 'polite' : undefined} style={[tx(15, 400, 1.4), { color: t.label2, textAlign: 'center', paddingVertical: 22, paddingHorizontal: 16 }]}>{children}</Text>
}

/**
 * `.linkbtn.inl`: a tinted link inside a sentence, taking the sentence's size (nest it in a Text).
 * A web `<button>`, so a button for VoiceOver, with the web's aria-label and expanded state when
 * it opens something in place.
 */
export function TextLink({ children, onPress, label, expanded, style }: {
  children: ReactNode; onPress: () => void; label?: string; expanded?: boolean; style?: StyleProp<TextStyle>
}) {
  const t = useTokens()
  return (
    <Text accessibilityRole="button" accessibilityLabel={label} accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress} suppressHighlighting={false} style={[{ color: t.tint }, style]}>{children}</Text>
  )
}

