/**
 * The wizard's option list (src/screens/onboarding/Opts.tsx, board ob1): radio or tick rows,
 * shared with Profile's Health check answers (N10) and the 12-week check-in (N4).
 * TODO(N1-followup): a lib/ui piece, since three streams use it.
 */
import { Pressable, Text, View } from 'react-native'
import { BTN, tx, useTokens } from '../../lib/theme'
import { Icon } from '../../lib/ui/icons'

export function Opts<T extends string>({ opts, value, onPick, label, multi, onElev }: {
  opts: readonly (readonly [T, string, string?])[]; value: T | T[] | undefined; onPick: (v: T) => void; label: string; multi?: boolean; onElev?: boolean
}) {
  const t = useTokens()
  const on = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k)
  return (
    <View accessibilityRole={multi ? undefined : 'radiogroup'} role={multi ? 'group' : undefined} accessibilityLabel={label} style={{ backgroundColor: onElev ? t.elev : t.card, borderRadius: t.radius, overflow: 'hidden' }}>
      {opts.map(([k, tt, s], i) => (
        <Pressable key={k} accessibilityRole={multi ? 'checkbox' : 'radio'} aria-checked={on(k)} onPress={() => onPick(k)}
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
            i < opts.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.sep }, on(k) && { backgroundColor: t.tintSoft }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[tx(17, on(k) ? 500 : 400, 1.3, BTN), { color: t.label }]}>{tt}</Text>
            {s && <Text style={[tx(13, 400, 1.3, BTN), { color: t.label2, marginTop: 1 }]}>{s}</Text>}
          </View>
          <View style={[{ width: multi ? 22 : 24, height: multi ? 22 : 24, borderRadius: multi ? 6 : 12, alignItems: 'center', justifyContent: 'center' },
            on(k) ? { backgroundColor: t.label } : { borderWidth: 1.5, borderColor: t.dash }]}>
            {on(k) && <Icon name="check" size={14} stroke={2.6} color={t.card} />}
          </View>
        </Pressable>
      ))}
    </View>
  )
}
