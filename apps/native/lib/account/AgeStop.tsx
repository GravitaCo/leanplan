/**
 * The 18+ stop (src/screens/onboarding/AgeStop.tsx; Benn, Sept 2026) and the signpost list it
 * shares with the support sheet. Bundled with the app, no network: a launch with a stored under-18
 * age must never wait on a connection.
 *
 * - the app's stop (board "Age 18+ · 1"): an under-18 age from Profile, a backup, sync or this phone's
 *   saved data. "Close and delete" opens the usual account deletion (its typed confirm and
 *   re-sign-in); its Cancel comes back here. "I typed my age wrong" goes back to Profile.
 * - the wizard's (board "Age 18+ · 2", `deleting`): shown while a new under-18 account's deletion is
 *   still pending, with no buttons (the store retries the deletion on the next connection).
 */
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore, type UnderAgeSource } from '@/store/store'
import { NATIONS, SIGNPOSTS, beatFor } from '@/core/data/signposts'
import { NOTES } from '@/screens/onboarding/copy'
import type { SP } from '@/screens/onboarding/Signposts'
import { BTN, num, tx, useTokens } from '../theme'
import { Btn, LinkBtn } from '../ui/kit'
import { Icon } from '../ui/icons'
import { openLink } from './legal'
import { DeleteConfirmSheet } from './Delete'

export type { SP }

/** Beat: every nation's number, labelled (Benn: no nation question), and the webchat. */
const beat = (desc: string): SP => ({
  name: 'Beat', desc: `${desc} ${SIGNPOSTS.beat.hours}. Webchat too.`, web: SIGNPOSTS.beat.web,
  lines: NATIONS.map(([k, l]) => [l, beatFor(k)]),
})
const emergency: SP = { name: 'Emergency', desc: 'If you or someone else is in danger now', num: SIGNPOSTS.emergency.phone, tel: SIGNPOSTS.emergency.phone }
/** Both 18+ stops (the web's SPS.under16): numbers from the checked list only. */
export const UNDER18_SIGNPOSTS: SP[] = [
  { name: 'Childline', desc: 'Free and confidential for anyone under 19. Call or chat online, any time.', num: SIGNPOSTS.childline.phone, tel: SIGNPOSTS.childline.phone },
  beat('If food, eating or your body feel hard to think about.'),
  emergency,
]

const tel = (n: string) => 'tel:' + n.replace(/\s/g, '')

/**
 * `.wz-group` of `.wz-sp` rows: tap a number to call it.
 * TODO(N1-followup): Signposts in lib/ui; this is the web markup (onboarding/Signposts.tsx) as the spec.
 */
export function Signposts({ list }: { list: (SP & { sms?: string })[] }) {
  const t = useTokens()
  // .wz-group is on --card, in a sheet too (only .sheet .list and .card move to --elev)
  const bg = t.card
  const name = [tx(16), { color: t.label }]
  const desc = [tx(13, 400, 1.35), { color: t.label2 }]
  const n = [tx(16, 600), num, { color: t.tint }]
  const line = (first: boolean) => ({ borderTopWidth: first ? 0 : 1, borderTopColor: t.sep })
  return (
    <View style={{ backgroundColor: bg, borderRadius: t.radius, overflow: 'hidden' }}>
      {list.map((s, i) => {
        const row = [{ flexDirection: 'row' as const, alignItems: (s.lines ? 'flex-start' : 'center') as 'flex-start' | 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 }, line(i === 0)]
        const head = <><Text style={name}>{s.name}</Text><Text style={desc}>{s.desc}</Text></>
        if (s.lines) {
          return (
            <View key={s.name} style={row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {head}
                {s.lines.map(([l, x], j) => (
                  <Pressable key={l} accessibilityRole="link" accessibilityLabel={`${s.name}, ${l}: call ${x}`} onPress={() => openLink(tel(x))}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 8, marginTop: j ? 8 : 0, borderTopWidth: j ? 1 : 0, borderTopColor: t.sep }}>
                    <Text style={[tx(15), { color: t.label }]}>{l}</Text><Text style={n}>{x}</Text>
                  </Pressable>
                ))}
                {s.web && (
                  <Pressable accessibilityRole="link" accessibilityLabel="Webchat and email" onPress={() => openLink(s.web!)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: t.sep }}>
                    <Text style={[tx(15), { color: t.label }]}>Webchat and email</Text><Text style={[tx(16, 600), { color: t.tint }]}>Open</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
        }
        if (s.tel && s.web) {
          return (
            <View key={s.name} style={row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {head}
                <Text accessibilityRole="link" onPress={() => openLink(s.web!)} style={[tx(13, 500), { color: t.tint, marginTop: 2 }]}>{s.webLabel ?? 'Webchat and email'}</Text>
              </View>
              <Pressable accessibilityRole="link" accessibilityLabel={`${s.name}: call ${s.num}`} onPress={() => openLink(tel(s.tel!))} hitSlop={10}><Text style={n}>{s.num}</Text></Pressable>
            </View>
          )
        }
        const go = s.sms ? () => openLink(s.sms!) : s.tel ? () => openLink(tel(s.tel!)) : undefined
        const inner = <><View style={{ flex: 1, minWidth: 0 }}>{head}</View>{s.num ? <Text style={n}>{s.num}</Text> : null}</>
        return go
          ? <Pressable key={s.name} accessibilityRole="link" accessibilityLabel={`${s.name}: ${s.sms ? 'text' : 'call'} ${s.num}`} onPress={go} style={({ pressed }) => [row, pressed && { backgroundColor: t.fill }]}>{inner}</Pressable>
          : <View key={s.name} style={row}>{inner}</View>
      })}
    </View>
  )
}

/** The kind stop. With `source` it's the app's variant; `deleting` is the wizard's pending deletion. */
export function Under18({ onWrong, onClose, deleting, source }: { onWrong?: () => void; onClose: () => void; deleting?: boolean; source?: UnderAgeSource }) {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  const busy = useStore((s) => s.deletingAccount)
  const app = source !== undefined
  const c = app ? NOTES.underAge : NOTES.under16
  const note = app ? (source === 'profile' ? `${NOTES.underAge.note} ${NOTES.underAge.notSaved}` : NOTES.underAge.note) : NOTES.under16.note
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }} testID={app ? 'age-stop' : 'age-stop-wizard'}>
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 110, paddingHorizontal: 20, paddingBottom: ins.bottom + 170, gap: 18 }}>
        <Text accessibilityRole="header" style={[tx(34, 700, 40, -0.03), { color: t.label }]}>{c.title}</Text>
        <Text style={[tx(17, 400, 1.5), { color: t.label }]}>{c.lead}</Text>
        <Text style={[tx(17, 400, 1.5), { color: t.label2 }]}>{c.more}</Text>
        <Signposts list={UNDER18_SIGNPOSTS} />
        <Text style={[tx(12, 400, 1.4), { color: t.label2, paddingHorizontal: 4 }]}>{note}</Text>
      </ScrollView>
      {!deleting && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, paddingBottom: ins.bottom + 34, backgroundColor: t.bg, gap: 10 }}>
          {/* .btn.ob-btn: 54 high */}
          <Btn title={app ? NOTES.underAge.close : 'Close'} disabled={busy} onPress={onClose} style={{ minHeight: 54, borderRadius: 27 }} />
          {onWrong && <View style={{ alignItems: 'center' }}><LinkBtn title={NOTES.underAge.wrong} onPress={onWrong} style={[tx(16, 500, 1.3, BTN), { paddingVertical: 4, paddingHorizontal: 4 }]} /></View>}
        </View>
      )}
    </View>
  )
}

/**
 * The app-level stop while the store's `underAge` is set: nothing else of the app shows, nothing
 * syncs, reminders are held. Close and delete opens the usual deletion confirm (typed DELETE, a
 * fresh sign-in when the session's is old; the server keeps its own re-auth rule). A Google
 * re-sign-in happens in the system sheet without leaving the app, so the confirm stays open.
 */
export function UnderAgeStop({ source, onWrong }: { source: UnderAgeSource; onWrong?: () => void }) {
  const underAgeMistake = useStore((s) => s.underAgeMistake)
  const mistake = () => { underAgeMistake(); onWrong?.() }
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <Under18 source={source} onClose={() => setConfirm(true)} onWrong={mistake} />
      {confirm && <DeleteConfirmSheet onClose={() => setConfirm(false)} />}
    </>
  )
}

/**
 * The wizard's option list (onboarding/Opts.tsx): radio rows with a check dot.
 * TODO(N1-followup): Opts in lib/ui; this is the web markup as the spec.
 */
export function Opts<K extends string>({ opts, value, onPick, label }: { opts: readonly (readonly [K, string])[]; value: K | undefined; onPick: (v: K) => void; label: string }) {
  const t = useTokens()
  const bg = t.card // .wz-opts, as .wz-group
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ backgroundColor: bg, borderRadius: t.radius, overflow: 'hidden' }}>
      {opts.map(([k, l], i) => {
        const on = value === k
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(k)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: t.sep, backgroundColor: on ? t.tintSoft : 'transparent' }}>
            <Text style={[tx(17, on ? 500 : 400, 1.3, BTN), { flex: 1, color: t.label }]}>{l}</Text>
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.label : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: t.dash }}>
              {on && <Icon name="check" size={14} stroke={2.6} color={t.card} />}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
