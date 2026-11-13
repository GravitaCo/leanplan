/**
 * Today's once-only sheets, ported from the web: the food asks (today/FoodAskSheet.tsx, ob9-3 and
 * ob9-4), the 12-week "Does this still apply?" (profile/HealthAnswers.tsx PregnancyCheckSheet in its
 * `checkin` mode, ob7-3) and the one-time medical question (MedicalSheet). All behind
 * ONBOARDING_ENABLED, as on web. Same store actions, same copy files; `.sheet.consent` layout.
 */
import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { medicalOutcome } from '@/core/domain/onboarding'
import { FOOD9 } from '@/copy/onboardingApp'
import { CHECKIN, COPY, MEDICAL_ITEMS } from '@/copy/onboarding'
import { BTN, tx, useTokens } from '../../lib/theme'
import { Btn, LinkBtn } from '../../lib/ui/kit'
import { BareSheet } from '../../lib/ui/primitives'
import { Icon } from '../../lib/ui/icons'

/** `.sheet.consent .sheet-bd`: a column 14 apart */
function Consent({ children }: { children: ReactNode }) {
  return <View style={{ gap: 14 }}>{children}</View>
}
/** `.btn.ob-btn` (54 high) and `.btn.f9-no` (gray, 48 high, 16 pt) */
const OB_BTN = { height: 54, minHeight: 54, borderRadius: 27 }
const F9_NO = { height: 48, minHeight: 48, borderRadius: 24 }

/** `.cs-t` and `.cs-lead` */
function Title({ children, style }: { children: string; style?: object }) {
  const t = useTokens()
  return <Text style={[tx(24, 600), { color: t.label }, [{ lineHeight: 30, marginTop: 4 }, style]]}>{children}</Text>
}
function Lead({ children }: { children: string }) {
  const t = useTokens()
  return <Text style={[tx(16, 400), { color: t.label2 }, { lineHeight: 24 }]}>{children}</Text>
}

export function FoodAskSheet({ ask, onClose }: { ask: 'today' | 'range'; onClose: () => void }) {
  const t = useTokens()
  const answer = useStore((s) => s.answerFoodOptIn)
  const c = ask === 'today' ? FOOD9.todayAsk : FOOD9.rangeAsk
  const pick = (yes: boolean) => {
    if (ask === 'today') answer({ ask, value: yes ? 'today' : 'food' })
    else answer({ ask, value: yes ? 'shown' : 'not-now' })
    onClose()
  }
  return (
    <BareSheet label={c.t} onClose={() => pick(false)}><Consent>
      <Text style={[tx(13, 600), { color: t.tint }]}>{c.k}</Text>
      <Title style={{ marginTop: -6 }}>{c.t}</Title>
      <Lead>{c.s}</Lead>
      <Btn title={c.yes} onPress={() => pick(true)} style={OB_BTN} />
      <Btn title={c.no} kind="gray" onPress={() => pick(false)} style={F9_NO} textStyle={tx(16, 600, 1.3, BTN)} />
    </Consent></BareSheet>
  )
}

/** onboarding/Opts (`.wz-opts`, `.wz-opt`, `.wz-dot`), single or multi, from the web markup.
 *  TODO(N1-followup): swap for N1's Opts when it lands. */
function Opts<K extends string>({ opts, value, onPick, multi, label }: { opts: readonly (readonly [K, string])[]; value: K[]; onPick: (k: K) => void; multi?: boolean; label: string }) {
  const t = useTokens()
  return (
    <View accessibilityLabel={label} accessibilityRole={multi ? undefined : 'radiogroup'} style={{ backgroundColor: t.card, borderRadius: t.radius, overflow: 'hidden' }}>
      {opts.map(([k, txt], i) => {
        const on = value.includes(k)
        return (
          <Pressable key={k} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }} onPress={() => onPick(k)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i < opts.length - 1 ? 1 : 0, borderBottomColor: t.sep, backgroundColor: on ? t.tintSoft : undefined }}>
            <Text style={[tx(17, on ? 500 : 400, 1.3, BTN), { flex: 1, color: t.label }]}>{txt}</Text>
            <View style={[{ width: multi ? 22 : 24, height: multi ? 22 : 24, borderRadius: multi ? 6 : 12, alignItems: 'center', justifyContent: 'center' },
              on ? { backgroundColor: t.label } : { borderWidth: 1.5, borderColor: t.dash }]}>
              {on && <Icon name="check" size={14} stroke={2.6} color={t.card} />}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

/** ob7-3 on Today: closing counts as Ask me later; No longer thanks them, with a link to the answers. */
export function PregnancyCheckSheet({ onClose, onAnswers }: { onClose: () => void; onAnswers: () => void }) {
  const t = useTokens()
  const confirm = useStore((s) => s.confirmPregnancy)
  const snooze = useStore((s) => s.snoozePregnancyReask)
  const [thanks, setThanks] = useState(false)
  const later = () => { snooze(); onClose() }
  if (thanks) {
    return (
      <BareSheet label={CHECKIN.doneT} onClose={onClose}><Consent>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={26} stroke={2.6} color={t.tint} />
        </View>
        <Title style={{ marginTop: 0 }}>{CHECKIN.doneT}</Title>
        {/* .linkbtn.ha-link: 16 pt, 500, no padding */}
        <View style={{ alignSelf: 'flex-start' }}><LinkBtn title={CHECKIN.seeAnswers} onPress={onAnswers} style={[tx(16, 500, 1.3, BTN), { paddingVertical: 0, paddingHorizontal: 0 }]} /></View>
        <Btn title={CHECKIN.done} onPress={onClose} style={OB_BTN} />
      </Consent></BareSheet>
    )
  }
  const pick = (k: (typeof CHECKIN.options)[number][0]) => {
    if (k === 'no-longer') { confirm('no-longer'); setThanks(true); return }
    confirm('still-applies')
    onClose()
  }
  return (
    <BareSheet label={CHECKIN.title} onClose={later}><Consent>
      <Title>{CHECKIN.title}</Title>
      <Lead>{CHECKIN.lead}</Lead>
      <Opts label={CHECKIN.title} opts={CHECKIN.options} value={[]} onPick={pick} />
      <Pressable accessibilityRole="button" onPress={later} style={{ padding: 4, alignItems: 'center' }}>
        <Text style={[tx(16, 500, 1.3, BTN), { color: t.tint }]}>{CHECKIN.later}</Text>
      </Pressable>
    </Consent></BareSheet>
  )
}

/** The one-time medical question on Today (the wizard's ob4-5); only the outcome is saved. */
export function MedicalSheet({ onClose }: { onClose: () => void }) {
  const setAnswer = useStore((s) => s.setHealthAnswer)
  const flagged = useStore((s) => { const m = s.data.profile.outcomes?.medical; return m === 'flagged' || m === 'no-deficit' })
  const [ticked, setTicked] = useState<number[]>([])
  const [none, setNone] = useState(!flagged)
  const pick = (k: string) => {
    if (k === 'none') { setNone(!none); setTicked([]); return }
    const i = +k
    setNone(false)
    setTicked(ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i])
  }
  const outcome = medicalOutcome(ticked, none)
  const title = COPY.medical?.title ?? ''
  const opts = [...MEDICAL_ITEMS.map((x, i) => [String(i), x] as const), ['none', 'None of these'] as const]
  return (
    <BareSheet label={title} onClose={onClose}><Consent>
      <Title>{title}</Title>
      <Lead>{COPY.medical?.lead ?? ''}</Lead>
      <Opts label="Conditions and medicines" multi opts={opts} value={[...ticked.map(String), ...(none ? ['none'] : [])]} onPick={pick} />
      <Btn title={CHECKIN.done} disabled={!outcome} onPress={() => { if (outcome) setAnswer({ kind: 'medical', value: outcome }); onClose() }} style={OB_BTN} />
    </Consent></BareSheet>
  )
}
