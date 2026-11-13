/**
 * TODO(N1-followup): `.note` and `.empty` come in N1's P1b. Until then the scan screens compose them
 * from lib/ui pieces here, in one place, so swapping to N1's is a change to imports only. The web's
 * markup is the spec: `.note` = an info icon (label2) and 15 pt text on the card surface, radius 22,
 * padding 10 14, 10 above; `.note.ok` = no surface, a green-ink tick and 13 pt muted text;
 * `.empty` = centred 15 pt muted text, padding 22 16.
 */
import type { ReactNode } from 'react'
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { tx, useTokens } from '../../lib/theme'
import { Icon } from '../../lib/ui/icons'
import { useSurface } from '../../lib/ui/kit'

export function Note({ children, ok, alert, style }: { children: ReactNode; ok?: boolean; alert?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const bg = useSurface(t)
  return (
    <View accessibilityRole={alert ? 'alert' : undefined} accessibilityLiveRegion="polite"
      style={[{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
        ok ? { paddingTop: 8, paddingHorizontal: 4 } : { paddingVertical: 10, paddingHorizontal: 14, marginTop: 10, borderRadius: t.radius, backgroundColor: bg }, style]}>
      <View style={{ marginTop: 1 }}><Icon name={ok ? 'checkc' : 'info'} size={17} color={ok ? t.energyInk : t.label2} /></View>
      <Text style={[ok ? tx(13) : tx(15, 400, 1.35), { flex: 1, color: ok ? t.label2 : t.label }]}>{children}</Text>
    </View>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text accessibilityLiveRegion="polite" style={[tx(15, 400, 1.4), { textAlign: 'center', color: t.label2, paddingVertical: 22, paddingHorizontal: 16 }]}>{children}</Text>
}

/**
 * TODO(N1-followup): `.frow` comes in N1's P2. The web's markup is the spec: a 17 pt label at
 * least 96 wide, a right-aligned input, an optional unit in label2, min height 44, padding 0 16;
 * `.need` turns the placeholder tint; `.flag` adds the 3 pt tint bar and the `.flagnote` under it.
 */
export function FRow({ label, value, onChange, placeholder, unit, need, flag, note, inputProps }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string; need?: boolean; flag?: boolean; note?: ReactNode
  inputProps?: TextInputProps
}) {
  const t = useTokens()
  return (
    <View>
      {flag && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: t.tint }} />}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <Text style={[tx(17), { color: t.label, minWidth: 96 }]}>{label}</Text>
          <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={need ? t.tint : t.label3}
            style={[tx(17), { flex: 1, textAlign: 'right', color: t.label, paddingVertical: 11 }]} {...inputProps} />
          {unit ? <Text style={[tx(17), { color: t.label2 }]}>{unit}</Text> : null}
        </View>
        {note ? <Text style={[tx(13), { color: t.tint, marginTop: -6, marginBottom: 9 }]}>{note}</Text> : null}
      </View>
    </View>
  )
}
