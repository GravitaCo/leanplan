/**
 * Profile › Health data › Health check answers (boards ob7-1 to ob7-4, notes s-ob7), from
 * src/screens/profile/HealthAnswers.tsx: the answers with Change and Clear, the Sometimes "where
 * the range shows" control, Yes's range undo, and the sheets behind them. The decisions are core's
 * (healthAnswersView, rerunForAnswers) and the rows are healthAnswerRows.ts's; this only shows and asks.
 * PregnancyCheckSheet is also the 12-week "Does this still apply?" re-ask that Today opens (N4 imports it).
 */
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { medicalOutcome, wellbeingOutcome, type WellbeingAnswer } from '@/core/domain/onboarding'
import { CHECKIN, COPY, HEALTH_ANSWERS as H, MEDICAL_ITEMS, WELLBEING_OPTIONS, WELLBEING_STATEMENT } from '@/screens/onboarding/copy'
import { FOOD9 } from '@/screens/onboarding/copyApp'
import { answerRows, clearConfirmLine, foodShows, optInRows, type AnswerRow } from '@/screens/profile/healthAnswerRows'
import { font, useTokens } from '../theme'
import { BareSheet, Btn, Icon, NavBtn, Opts, Seg, SheetLead, SheetTitle } from './ui'

type Open = { sheet: 'confirm'; row: AnswerRow } | { sheet: 'pregnancy' | 'medical' | 'wellbeing' } | null

/** ob7-1 / ob7-1b: the answers, or "Nothing kept from your health check." */
export function HealthAnswersScreen({ onBack }: { onBack: () => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const profile = useStore((s) => s.data.profile)
  const clear = useStore((s) => s.clearHealthAnswer)
  const answerOptIn = useStore((s) => s.answerFoodOptIn)
  const [open, setOpen] = useState<Open>(null)
  const rows = answerRows(profile)
  const opts = optInRows(profile)
  const shows = foodShows(profile)
  const onClear = (r: AnswerRow) => { if (r.confirm) setOpen({ sheet: 'confirm', row: r }); else clear(r.kind) }
  const small = { fontSize: 13, lineHeight: 18, color: t.label2 }
  const act = (label: string, a11y: string, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} hitSlop={4} style={{ paddingVertical: 8, paddingHorizontal: 6 }}>
      <Text style={[font(600), { fontSize: 15, color: t.tint }]}>{label}</Text>
    </Pressable>
  )
  const row = (key: string, label: string, value: string, does: string, acts: ReactNode, i: number) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingLeft: 16, paddingRight: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.sep }}>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <Text style={[font(), small]}>{label}</Text>
        <Text style={[font(), { fontSize: 17, color: t.label, marginTop: 1 }]}>{value}</Text>
        <Text style={[font(), small, { marginTop: 3 }]}>{does}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>{acts}</View>
    </View>
  )
  let i = 0
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ alignSelf: 'flex-start', marginLeft: -6 }}><NavBtn title="Health data" back onPress={onBack} /></View>
        <Text accessibilityRole="header" style={[font(600), { fontSize: 32, lineHeight: 38, letterSpacing: -0.64, color: t.label }]}>{H.title}</Text>
        <Text style={[font(), { fontSize: 16, lineHeight: 23, color: t.label2, marginTop: -8 }]}>{H.lead}</Text>
        {rows.length ? (
          <View style={{ backgroundColor: t.card, borderRadius: t.radius, overflow: 'hidden' }}>
            {rows.map((r) => row(r.kind, r.label, r.value, r.does, [
              r.change && act(H.change, `${H.change} ${r.label.toLowerCase()}`, () => setOpen({ sheet: r.kind === 'pregnancy' ? 'pregnancy' : r.kind === 'medical' ? 'medical' : 'wellbeing' })),
              r.clear && act(H.clear, `${H.clear} ${r.label.toLowerCase()}`, () => onClear(r)),
            ], i++))}
            {shows && (
              <View testID="food-shows" style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i++ ? 1 : 0, borderTopColor: t.sep }}>
                <Text style={[font(), small]}>{FOOD9.shows.label}</Text>
                <Seg options={FOOD9.shows.options} value={shows.value} onChange={(v) => answerOptIn({ ask: 'today', value: v })} />
                <Text style={[font(), small]}>{shows.line}</Text>
              </View>
            )}
            {opts.map((r) => row(r.key, r.label, r.value, r.does, act(FOOD9.optIn.off, `${FOOD9.optIn.off}: ${r.label.toLowerCase()}`, () => answerOptIn(r.off)), i++))}
          </View>
        ) : (
          <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 28, paddingHorizontal: 16 }}>
            <Text style={[font(), { fontSize: 16, color: t.label2, textAlign: 'center' }]}>{H.empty}</Text>
          </View>
        )}
        <Text style={[font(), { fontSize: 12, lineHeight: 17, color: t.label2, paddingHorizontal: 4 }]}>{H.foot}</Text>
      </ScrollView>
      {open?.sheet === 'confirm' && <ClearConfirmSheet row={open.row} onClose={() => setOpen(null)} />}
      {open?.sheet === 'pregnancy' && <PregnancyCheckSheet mode="change" onClose={() => setOpen(null)} />}
      {open?.sheet === 'medical' && <MedicalSheet onClose={() => setOpen(null)} />}
      {open?.sheet === 'wellbeing' && <WellbeingSheet onClose={() => setOpen(null)} />}
    </View>
  )
}

/** `.ob-alt`: the quiet second choice under a sheet's button */
function Alt({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useTokens()
  return <Text accessibilityRole="button" onPress={onPress} style={[font(500), { fontSize: 16, color: t.tint, textAlign: 'center', padding: 4 }]}>{title}</Text>
}

/** ob7-2: Clear asks first for pregnancy and conditions; its line says what stays (clearConfirmLine). */
function ClearConfirmSheet({ row, onClose }: { row: AnswerRow; onClose: () => void }) {
  const clear = useStore((s) => s.clearHealthAnswer)
  const line = useStore((s) => clearConfirmLine(s.data.profile, row.kind))
  const title = H.confirmT(row.label)
  return (
    <BareSheet label={title} onClose={onClose}>
      <SheetTitle>{title}</SheetTitle>
      <SheetLead>{line}</SheetLead>
      <Btn title={H.clear} onPress={() => { clear(row.kind); onClose() }} />
      <Alt title={H.keep} onPress={onClose} />
    </BareSheet>
  )
}

/** Change for conditions: the wizard's question (ob4-5), saved as the outcome only; also the one-time re-ask on Today. */
export function MedicalSheet({ onClose }: { onClose: () => void }) {
  const setAnswer = useStore((s) => s.setHealthAnswer)
  const flagged = useStore((s) => { const m = s.data.profile.outcomes?.medical; return m === 'flagged' || m === 'no-deficit' })
  // the ticks themselves are never kept, so the sheet starts from "None of these" or nothing
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
  return (
    <BareSheet label={title} onClose={onClose}>
      <SheetTitle>{title}</SheetTitle>
      {COPY.medical?.lead ? <SheetLead>{COPY.medical.lead}</SheetLead> : null}
      <Opts label="Conditions and medicines" multi opts={[...MEDICAL_ITEMS.map((x, i) => [String(i), x] as const), ['none', 'None of these'] as const]}
        value={[...ticked.map(String), ...(none ? ['none'] : [])]} onPick={pick} />
      <Btn title={CHECKIN.done} disabled={!outcome} onPress={() => { if (outcome) setAnswer({ kind: 'medical', value: outcome }); onClose() }} />
    </BareSheet>
  )
}

/** Change for food and weight: the wizard's four answers (ob1-6); picking one saves it. */
function WellbeingSheet({ onClose }: { onClose: () => void }) {
  const setAnswer = useStore((s) => s.setHealthAnswer)
  const title = COPY.wellbeing?.title ?? ''
  const pick = (a: WellbeingAnswer) => { const v = wellbeingOutcome(a); if (v) setAnswer({ kind: 'wellbeing', value: v }); onClose() }
  return (
    <BareSheet label={title} onClose={onClose}>
      <SheetTitle>{title}</SheetTitle>
      <SheetLead>{WELLBEING_STATEMENT}</SheetLead>
      <Opts label="Food and weight" opts={WELLBEING_OPTIONS.map(([k, x]) => [k, x] as const)} value={undefined} onPick={pick} />
    </BareSheet>
  )
}

/**
 * ob7-3 / ob7-4: "Does this still apply?". On Today (`checkin`) closing counts as Ask me later;
 * Still pregnant and Breastfeeding now close quietly and restart the 12 weeks; No longer thanks
 * them, with a link to the answers. From Profile's Change (`change`) closing changes nothing.
 */
export function PregnancyCheckSheet({ mode, onClose, onAnswers }: { mode: 'checkin' | 'change'; onClose: () => void; onAnswers?: () => void }) {
  const t = useTokens()
  const confirm = useStore((s) => s.confirmPregnancy)
  const snooze = useStore((s) => s.snoozePregnancyReask)
  const [thanks, setThanks] = useState(false)
  const later = () => { snooze(); onClose() }
  if (thanks) {
    return (
      <BareSheet label={CHECKIN.doneT} onClose={onClose}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={26} stroke={2.6} color={t.tint} />
        </View>
        <SheetTitle>{CHECKIN.doneT}</SheetTitle>
        {onAnswers && <Text accessibilityRole="button" onPress={onAnswers} style={[font(500), { fontSize: 16, color: t.tint }]}>{CHECKIN.seeAnswers}</Text>}
        <Btn title={CHECKIN.done} onPress={onClose} />
      </BareSheet>
    )
  }
  const pick = (k: (typeof CHECKIN.options)[number][0]) => {
    if (k === 'no-longer') { confirm('no-longer'); if (mode === 'checkin') setThanks(true); else onClose(); return }
    confirm('still-applies')
    onClose()
  }
  return (
    <BareSheet label={CHECKIN.title} onClose={mode === 'checkin' ? later : onClose}>
      <SheetTitle>{CHECKIN.title}</SheetTitle>
      <SheetLead>{CHECKIN.lead}</SheetLead>
      <Opts label={CHECKIN.title} opts={CHECKIN.options} value={undefined} onPick={pick} />
      {mode === 'checkin' && <Alt title={CHECKIN.later} onPress={later} />}
    </BareSheet>
  )
}
