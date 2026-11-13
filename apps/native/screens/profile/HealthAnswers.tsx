/**
 * Profile › Health data › Health check answers (boards ob7-1 to ob7-4, notes s-ob7), from
 * src/screens/profile/HealthAnswers.tsx: the answers with Change and Clear, the Sometimes "where
 * the range shows" control, Yes's range undo, and the sheets behind them. The rows are
 * healthAnswerRows.ts's and the decisions core's; this only shows and asks.
 * PregnancyCheckSheet is also the 12-week re-ask that Today opens (N4 imports it).
 */
import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { medicalOutcome } from '@/core/domain/onboarding'
import { CHECKIN, COPY, HEALTH_ANSWERS as H } from '@/copy/onboarding'
import { FOOD9 } from '@/copy/onboardingApp'
import { answerRows, clearConfirmLine, foodShows, optInRows, type AnswerRow } from '@/screens/profile/healthAnswerRows'
import { GEIST, tx, useTokens } from '../../lib/theme'
import { Btn, LinkBtn } from '../../lib/ui/kit'
import { BackButton, BareSheet, Seg } from '../../lib/ui/primitives'
import { Icon } from '../../lib/ui/icons'
import { sheetLead, sheetTitle } from './text'

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
  const small = [tx(13, 400, 1.4), { color: t.label2 }]
  // `.ha-act`: 15 pt 600 tinted, padding 8 6, named as the web's aria-label ("Clear pregnant or breastfeeding").
  // TODO(N1-followup): LinkBtn has no `label` prop yet, so this wrapper carries the name and VoiceOver's tap
  const act = (title: string, label: string, onPress: () => void) => (
    <View key={title} accessible accessibilityRole="button" accessibilityLabel={label} onAccessibilityTap={onPress}>
      <LinkBtn title={title} onPress={onPress} style={{ fontFamily: GEIST[600], paddingVertical: 8, paddingHorizontal: 6 }} />
    </View>
  )
  const sep = (i: number) => ({ borderTopWidth: i ? 1 : 0, borderTopColor: t.sep })
  const row = (key: string, label: string, value: string, does: string, acts: ReactNode, i: number) => (
    <View key={key} style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingLeft: 16, paddingRight: 10 }, sep(i)]}>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <Text style={small}>{label}</Text>
        <Text style={[tx(17), { color: t.label, marginTop: 1 }]}>{value}</Text>
        <Text style={[small, { marginTop: 3 }]}>{does}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>{acts}</View>
    </View>
  )
  let i = 0
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ marginLeft: -6 }}><BackButton label="Health data" onPress={onBack} /></View>
        <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), { color: t.label }]}>{H.title}</Text>
        <Text style={[tx(16, 400, 1.45), { color: t.label2, marginTop: -8 }]}>{H.lead}</Text>
        {rows.length ? (
          <View style={{ backgroundColor: t.card, borderRadius: t.radius, overflow: 'hidden' }}>
            {rows.map((r) => row(r.kind, r.label, r.value, r.does, [
              r.change && act(H.change, `${H.change} ${r.label.toLowerCase()}`, () => setOpen({ sheet: r.kind === 'pregnancy' ? 'pregnancy' : r.kind === 'medical' ? 'medical' : 'wellbeing' })),
              r.clear && act(H.clear, `${H.clear} ${r.label.toLowerCase()}`, () => onClear(r)),
            ], i++))}
            {shows && (
              <View testID="food-shows" style={[{ gap: 10, paddingVertical: 14, paddingHorizontal: 16 }, sep(i++)]}>
                <Text style={small}>{FOOD9.shows.label}</Text>
                <Seg options={FOOD9.shows.options.map(([k, l]) => [k, l])} value={shows.value} onChange={(v) => answerOptIn({ ask: 'today', value: v })} />
                <Text style={small}>{shows.line}</Text>
              </View>
            )}
            {opts.map((r) => row(r.key, r.label, r.value, r.does, act(FOOD9.optIn.off, `${FOOD9.optIn.off}: ${r.label.toLowerCase()}`, () => answerOptIn(r.off)), i++))}
          </View>
        ) : (
          <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 28, paddingHorizontal: 16 }}>
            <Text style={[tx(16), { color: t.label2, textAlign: 'center' }]}>{H.empty}</Text>
          </View>
        )}
        <Text style={[tx(12, 400, 1.4), { color: t.label2, paddingHorizontal: 4 }]}>{H.foot}</Text>
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
  return <View style={{ alignItems: 'center' }}><LinkBtn title={title} onPress={onPress} style={tx(16, 500)} /></View>
}

/** ob7-2: Clear asks first for pregnancy and conditions; its line says what stays. */
function ClearConfirmSheet({ row, onClose }: { row: AnswerRow; onClose: () => void }) {
  const t = useTokens()
  const clear = useStore((s) => s.clearHealthAnswer)
  const line = useStore((s) => clearConfirmLine(s.data.profile, row.kind))
  const title = H.confirmT(row.label)
  return (
    <BareSheet label={title} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={sheetTitle(t)}>{title}</Text>
        <Text style={sheetLead(t)}>{line}</Text>
        <Btn title={H.clear} onPress={() => { clear(row.kind); onClose() }} />
        <Alt title={H.keep} onPress={onClose} />
      </View>
    </BareSheet>
  )
}

/** Change for conditions: the wizard's question (ob4-5), saved as the outcome only; also Today's one-time re-ask. */
export function MedicalSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const setAnswer = useStore((s) => s.setHealthAnswer)
  const flagged = useStore((s) => { const m = s.data.profile.outcomes?.medical; return m === 'flagged' || m === 'no-deficit' })
  // the ticks themselves are never kept, so the sheet starts from "None of these" or nothing
  const [ticked] = useState<number[]>([])
  const [none] = useState(!flagged)
  const outcome = medicalOutcome(ticked, none)
  const title = COPY.medical?.title ?? ''
  return (
    <BareSheet label={title} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={sheetTitle(t)}>{title}</Text>
        {COPY.medical?.lead ? <Text style={sheetLead(t)}>{COPY.medical.lead}</Text> : null}
        {/* TODO(N1-followup) item 3, Opts (multi): MEDICAL_ITEMS ticks and "None of these" (src/screens/profile/HealthAnswers.tsx MedicalSheet); picking updates `ticked` and `none` */}
        <Btn title={CHECKIN.done} disabled={!outcome} onPress={() => { if (outcome) setAnswer({ kind: 'medical', value: outcome }); onClose() }} />
      </View>
    </BareSheet>
  )
}

/** Change for food and weight: the wizard's four answers (ob1-6); picking one saves it. */
function WellbeingSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const title = COPY.wellbeing?.title ?? ''
  return (
    <BareSheet label={title} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={sheetTitle(t)}>{title}</Text>
        {/* TODO(N1-followup) item 3, Opts: WELLBEING_STATEMENT as the lead and WELLBEING_OPTIONS; a pick saves setHealthAnswer({ kind: 'wellbeing', value: wellbeingOutcome(a) }) and closes (src/screens/profile/HealthAnswers.tsx WellbeingSheet) */}
      </View>
    </BareSheet>
  )
}

/**
 * ob7-3 / ob7-4: "Does this still apply?". On Today (`checkin`) closing counts as Ask me later;
 * From Profile's Change (`change`) closing changes nothing.
 */
export function PregnancyCheckSheet({ mode, onClose, onAnswers }: { mode: 'checkin' | 'change'; onClose: () => void; onAnswers?: () => void }) {
  const t = useTokens()
  const snooze = useStore((s) => s.snoozePregnancyReask)
  const [thanks] = useState(false)
  const later = () => { snooze(); onClose() }
  if (thanks) {
    return (
      <BareSheet label={CHECKIN.doneT} onClose={onClose}>
        <View style={{ gap: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={26} stroke={2.6} color={t.tint} />
          </View>
          <Text accessibilityRole="header" style={sheetTitle(t)}>{CHECKIN.doneT}</Text>
          {onAnswers && <LinkBtn title={CHECKIN.seeAnswers} onPress={onAnswers} style={[tx(16, 500), { paddingHorizontal: 0 }]} />}
          <Btn title={CHECKIN.done} onPress={onClose} />
        </View>
      </BareSheet>
    )
  }
  return (
    <BareSheet label={CHECKIN.title} onClose={mode === 'checkin' ? later : onClose}>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={sheetTitle(t)}>{CHECKIN.title}</Text>
        <Text style={sheetLead(t)}>{CHECKIN.lead}</Text>
        {/* TODO(N1-followup) item 3, Opts: CHECKIN.options; "no-longer" confirms and thanks on Today, the others confirm 'still-applies' and close (src/screens/profile/HealthAnswers.tsx PregnancyCheckSheet) */}
        {mode === 'checkin' && <Alt title={CHECKIN.later} onPress={later} />}
      </View>
    </BareSheet>
  )
}
