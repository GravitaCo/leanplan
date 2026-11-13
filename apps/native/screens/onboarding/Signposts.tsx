/**
 * The signpost list (src/screens/onboarding/Signposts.tsx and AgeStop.tsx's SPS), native (`.wz-sp`
 * rows; TODO(N1-followup) if another stream needs them: Profile's support sheet will). The rows
 * and numbers are the web's, from core/data/signposts; a number is a tel: link, as on web.
 * No store, no network, so every list shows offline.
 */
import { Fragment } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { NATIONS, SIGNPOSTS, beatFor } from '@/core/data/signposts'
import { num, tx, useTokens } from '../../lib/theme'

/** `webLabel`: a row with one number and its own web link (Profile's support sheet) */
export type SP = { name: string; desc: string; num?: string; tel?: string; lines?: [string, string][]; web?: string; webLabel?: string }

/** Beat: every nation's number, labelled (Benn: no nation question), and the webchat. */
const beat = (desc: string): SP => ({
  name: 'Beat', desc: `${desc} ${SIGNPOSTS.beat.hours}. Webchat too.`, web: SIGNPOSTS.beat.web,
  lines: NATIONS.map(([k, l]) => [l, beatFor(k)]),
})
const emergency: SP = { name: 'Emergency', desc: 'If you or someone else is in danger now', num: SIGNPOSTS.emergency.phone, tel: SIGNPOSTS.emergency.phone }
const nhs111: SP = { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time. In Northern Ireland, call your GP.', num: '111', tel: SIGNPOSTS.nhs111.phone }

/** The same lists as the web's AgeStop.tsx SPS (kept equal by scripts/e2e-onboarding-parity.cjs). */
export const SPS: Record<'wellbeing' | 'readiness' | 'pregnancy' | 'medical' | 'medicalNoDeficit' | 'under16', SP[]> = {
  wellbeing: [
    beat('For anyone worried about food, eating or their body.'),
    nhs111,
    { name: 'Samaritans', desc: 'Talk about anything, any time, free', num: '116 123', tel: SIGNPOSTS.samaritans.phone },
    emergency,
  ],
  readiness: [{ name: 'Your GP', desc: 'Before you build up, or if anything changes', num: 'Book' }, nhs111, emergency],
  pregnancy: [{ name: 'Your midwife or GP', desc: 'For anything about you or your baby', num: 'Contact' }, nhs111, emergency],
  medical: [{ name: 'Your GP or care team', desc: 'Before changing how much you eat, or how much protein you aim for', num: 'Contact' }, nhs111],
  medicalNoDeficit: [{ name: 'Your GP or care team', desc: 'Before changing how much you eat', num: 'Contact' }, nhs111],
  under16: [
    { name: 'Childline', desc: 'Free and confidential for anyone under 19. Call or chat online, any time.', num: SIGNPOSTS.childline.phone, tel: SIGNPOSTS.childline.phone },
    beat('If food, eating or your body feel hard to think about.'),
    emergency,
  ],
}

const call = (n: string) => () => { void Linking.openURL('tel:' + n.replace(/\s/g, '')) }
const open = (u: string) => () => { void Linking.openURL(u) }

export function Signposts({ list, onElev }: { list: SP[]; onElev?: boolean }) {
  const t = useTokens()
  const T = [tx(16), { color: t.label }]
  const S = [tx(13, 400, 1.35), { color: t.label2 }]
  const N = [tx(16, 600), num, { color: t.tint }]
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 13, paddingHorizontal: 16 }
  return (
    <View style={{ backgroundColor: onElev ? t.elev : t.card, borderRadius: t.radius, overflow: 'hidden' }}>
      {list.map((s, i) => {
        const sep = i < list.length - 1 ? { borderBottomWidth: 1, borderBottomColor: t.sep } : null
        if (s.lines) {
          return (
            <View key={s.name} style={[row, { alignItems: 'flex-start' }, sep]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={T}>{s.name}</Text><Text style={S}>{s.desc}</Text>
                {s.lines.map(([l, n], j) => (
                  <Pressable key={l} accessibilityRole="link" accessibilityLabel={`${s.name}, ${l}: call ${n}`} onPress={call(n)}
                    style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingTop: 8 }, j > 0 && { borderTopWidth: 1, borderTopColor: t.sep, marginTop: 8 }]}>
                    <Text style={[tx(15), { color: t.label }]}>{l}</Text><Text style={N}>{n}</Text>
                  </Pressable>
                ))}
                {s.web && (
                  <Pressable accessibilityRole="link" accessibilityLabel="Webchat and email Open" onPress={open(s.web)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.sep, marginTop: 8 }}>
                    <Text style={[tx(15), { color: t.label }]}>Webchat and email</Text><Text style={[tx(16, 600), { color: t.tint }]}>Open</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
        }
        if (s.tel && s.web) {
          return (
            <View key={s.name} style={[row, sep]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={T}>{s.name}</Text><Text style={S}>{s.desc}</Text>
                <Pressable accessibilityRole="link" onPress={open(s.web)}><Text style={[tx(13, 500), { color: t.tint, marginTop: 2 }]}>{s.webLabel ?? 'Webchat and email'}</Text></Pressable>
              </View>
              <Pressable accessibilityRole="link" accessibilityLabel={`${s.name}: call ${s.num}`} onPress={call(s.tel)}><Text style={N}>{s.num}</Text></Pressable>
            </View>
          )
        }
        const inner = <Fragment>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={T}>{s.name}</Text><Text style={S}>{s.desc}</Text></View>
          {s.num && <Text style={N}>{s.num}</Text>}
        </Fragment>
        return s.tel
          ? <Pressable key={s.name} accessibilityRole="link" accessibilityLabel={`${s.name}: call ${s.num}`} onPress={call(s.tel)} style={[row, sep]}>{inner}</Pressable>
          : <View key={s.name} style={[row, sep]}>{inner}</View>
      })}
    </View>
  )
}
