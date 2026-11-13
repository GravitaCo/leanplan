/**
 * Native port of src/screens/plan/PlanDetails.tsx: Plan details (Plans 3) and the end of a plan
 * (Plans 4).
 */
import { useState } from 'react'
import { Image, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import type { TrainingPlan } from '@/core/types'
import { dayMonthOf, shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import {
  afterPhase as afterPhaseOf, endDate, fitOf, fits, liftingDays, maintenanceLine, maintenanceWeekOf, nextSuggestions, phaseRows, phaseWeek, positionOn,
  timeline, totalWeeks, weeksSpan, withEasierStart, withLighterWeek, workoutsDone,
} from '@/core/domain/plans'
import { Cell, planArt, PlanTile, Timeline } from './PlanParts'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { PlanHero } from './PlanLibrary'
import { ViewLink } from './PlanViews'
import { Btn, Card, Chevron, Field, Foot, GrpH, Li, LinkBtn, List, M, NavBtn, PvBack, Sheet, Sub, font, num, useTokens } from './ui'

const day = shortDateOf
const short = dayMonthOf

/**
 * Plan details (Plans 3): the timeline and where you are, the phases (a build phase opens its
 * week), maintenance after, rename, add an easier or lighter week, save a copy, stop.
 */
export function PlanDetails({ plan, onBack, onEditWeek, onMaintenance, onChoose }: {
  plan: TrainingPlan; onBack: () => void; onChoose: () => void; onEditWeek: (phaseIndex: number) => void; onMaintenance: () => void
}) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const updatePlan = useStore((s) => s.updatePlan)
  const savePlanCopy = useStore((s) => s.savePlanCopy)
  const finishPlan = useStore((s) => s.finishPlan)
  const [sheet, setSheet] = useState<null | 'rename' | 'add' | 'stop'>(null)
  const [name, setName] = useState(plan.name)
  const today = todayStr()
  const pos = positionOn(plan, today)
  const n = totalWeeks(plan)
  const end = endDate(plan)
  const rows = phaseRows(plan, today)
  const done = workoutsDone(data, plan, today)
  const started = !!pos
  const cur = pos && pos.maintenanceWeek == null ? pos : null
  const inMaint = pos?.maintenanceWeek != null
  const carrying = inMaint && !!pos?.phase.full
  const sub = plan.startedAt ? (started ? `Started ${day(plan.startedAt)}` : `Starts ${day(plan.startedAt)}`) + (end ? ` · ends ${day(shiftDay(end, -1))}` : '') : ''
  const where = !pos ? `${n} weeks · starts ${day(plan.startedAt!)}`
    : inMaint ? `${carrying ? 'Carrying on' : 'Maintenance'} · week ${pos.maintenanceWeek}`
    : pos.ended ? `${n} weeks, done${done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'}` : ''}`
    : `Week ${pos.week} of ${n}${done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'} so far` : ''}`
  const lighterAt = Math.min(Math.max((cur?.week ?? 0) + 1, Math.ceil(n / 2) + 1), n + 1)
  const editRow = cur ? rows.find((r) => r.state === 'now') : rows.find((r) => r.kind !== 'lighter')

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <PlanHero art={planArt(plan.baseTemplateId)} height={220} onBack={onBack}>
          <Text accessibilityRole="header" style={[font(600), { fontSize: 28, lineHeight: 34, letterSpacing: -0.56, color: '#fff' }]}>{plan.name}</Text>
          <Text style={[font(400), num, { fontSize: 15, color: 'rgba(255,255,255,0.92)' }]}>{sub}</Text>
        </PlanHero>
        <Card style={{ gap: 12, marginBottom: 16 }}>
          <Timeline cells={timeline(plan, today)} endLabel={`Week ${n}`} />
          <Text style={[font(400), num, { fontSize: 14, color: t.label }]}>{where}</Text>
        </Card>
        <GrpH sm>The weeks</GrpH>
        <List>
          {rows.map((r) => {
            const ph = plan.phases[r.index]
            const w = phaseWeek(plan, r.index)
            const lift = liftingDays(w, data.routines)
            const detail = r.kind === 'lighter' ? `${weeksSpan(r)} · shorter version` : `${weeksSpan(r)} · ${lift} lifting ${lift === 1 ? 'day' : 'days'}`
            const body = (
              <>
                <Cell kind={r.kind === 'lighter' || r.kind === 'easier' ? 'easier' : 'full'} state={r.state === 'done' ? 'done' : r.state === 'now' ? 'now' : 'next'} width={14} />
                <M wrap t={ph.name} s={detail} />
                <Text style={[font(r.state === 'now' ? 600 : 400), { fontSize: 13, color: r.state === 'now' ? t.tint : t.label2 }]}>{r.state === 'done' ? 'Done' : r.state === 'now' ? 'Now' : ''}</Text>
              </>
            )
            return r.kind === 'lighter'
              ? <Li key={r.index}>{body}</Li>
              : <Li key={r.index} onPress={() => onEditWeek(r.index)} label={`${ph.name}, ${detail}. Edit its week`}>{body}</Li>
          })}
          <Li onPress={onMaintenance}>
            <Cell kind="after" state="" width={14} />
            <M wrap t={carrying ? 'Carrying on' : 'Then maintenance'} s={carrying ? 'Your last week at the full version, for as long as you like' : inMaint ? 'Now, for as long as you like' : end ? `From ${day(end)}, if you choose it` : 'If you choose it'} />
            <ViewLink title="Read" />
          </Li>
        </List>
        <List style={{ marginTop: 16 }}>
          {editRow && <Li onPress={() => onEditWeek(editRow.index)}><M t={cur ? "Edit this week's workouts" : 'Edit the workouts'} /><Chevron /></Li>}
          {inMaint && <Li onPress={onChoose}><M t="Choose a new plan" /><Chevron /></Li>}
          {!inMaint && !pos?.ended && <Li onPress={() => setSheet('add')}><M t="Add an easier or lighter week" /><Chevron /></Li>}
          <Li onPress={() => { setName(plan.name); setSheet('rename') }}><M t="Rename" /><Chevron /></Li>
          <Li onPress={() => savePlanCopy(plan.id)}><M t="Save a copy as my own plan" /></Li>
          <Li onPress={() => setSheet('stop')}><M t="Stop plan" /></Li>
        </List>
        <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>Stopping keeps everything you logged. Your week keeps repeating without a plan.</Foot>
      </ScrollView>

      {sheet === 'rename' && (
        <Sheet title="Rename" onClose={() => setSheet(null)} right={<NavBtn bold title="Save" onPress={() => { updatePlan(plan.id, { name }); setSheet(null) }} />}>
          <Field accessibilityLabel="Plan name" value={name} maxLength={120} onChangeText={setName} autoFocus />
        </Sheet>
      )}
      {sheet === 'add' && (
        <Sheet title="Add a week" onClose={() => setSheet(null)}>
          <List>
            {!started && !plan.phases[0]?.easier && (
              <Li onPress={() => { updatePlan(plan.id, { phases: withEasierStart(plan.phases) }); setSheet(null) }}>
                <M wrap t="An easier first week" s="To find your weights before the plan builds" />
              </Li>
            )}
            <Li onPress={() => { updatePlan(plan.id, { phases: withLighterWeek(plan.phases, lighterAt) }); setSheet(null) }}>
              <M wrap t="A lighter week" s="The same workouts on the shorter version, to recover before the next stretch" />
            </Li>
          </List>
          <Foot style={{ paddingTop: 10, paddingHorizontal: 4 }}>A lighter week goes in at week {lighterAt}. Either way the plan ends a week later{end ? `, on ${day(end)}` : ''}. Weeks you've done don't move.</Foot>
        </Sheet>
      )}
      {sheet === 'stop' && (
        <Sheet title="Stop plan" onClose={() => setSheet(null)}>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 12 }}>Everything you've logged stays. {data.profile.weekBeforePlan ? 'Your week goes back to the one you had before this plan.' : 'Without a plan, your week repeats with the ready-made workouts on their days, and days with only other workouts become light cardio.'} You can change any day, and start another plan whenever it suits you.</Foot>
          <View style={{ gap: 8, marginTop: 16 }}>
            <Btn title="Stop plan" onPress={() => { finishPlan(plan.id, undefined, 'archived'); setSheet(null); onBack() }} />
            <Btn kind="gray" title="Keep the plan" onPress={() => setSheet(null)} />
          </View>
        </Sheet>
      )}
    </View>
  )
}

/** `.pb-name` on a card: a label over a borderless field */
export function NamedField({ label, value, onChange, multiline, maxLength, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; maxLength?: number; placeholder?: string
}) {
  const t = useTokens()
  return (
    <Card style={{ gap: 4, paddingVertical: 14, marginBottom: 16 }}>
      <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} numberOfLines={multiline ? 2 : 1} maxLength={maxLength} placeholder={placeholder} placeholderTextColor={t.label3}
        style={[font(400), { fontSize: multiline ? 16 : 17, color: t.label, padding: 0, minHeight: multiline ? 44 : undefined, textAlignVertical: 'top' }]} />
    </Card>
  )
}

/**
 * The end of a plan (Plans 4): a calm finish with the plan's image, dates and workouts, an optional
 * look back, then what's next: maintenance first (recommended), a plan that fits the goal, run
 * again, build your own, or no plan. Until the person chooses, the last week carries on.
 */
export function PlanEnd({ plan, step0, onClose, onMaintenance, onPreview, onAgain, onBuild }: {
  plan: TrainingPlan
  step0?: 1 | 2
  onClose: () => void
  onMaintenance: () => void
  onPreview: (templateId: string, reflection: { good?: string; change?: string }) => void
  onAgain: (reflection: { good?: string; change?: string }) => void
  onBuild: (reflection: { good?: string; change?: string }) => void
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const startMaintenance = useStore((s) => s.startMaintenance)
  const carryOn = useStore((s) => s.carryOn)
  const notePlan = useStore((s) => s.notePlan)
  const [step, setStep] = useState<number>(step0 ?? 1)
  const [good, setGood] = useState('')
  const [change, setChange] = useState('')
  const today = todayStr()
  const end = endDate(plan) ?? today
  const n = totalWeeks(plan)
  const last = shiftDay(end, -1)
  const done = workoutsDone(data, plan, last)
  const reflection = { good, change }
  const art = planArt(plan.baseTemplateId)
  const mweek = maintenanceWeekOf(plan)
  const suggest = nextSuggestions(plan, fitOf(data.profile))[0]
  const again = end > today ? end : today

  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={{ height: art != null ? 330 : 160, marginHorizontal: -16, backgroundColor: art != null ? t.sep : 'transparent' }}>
            {art != null && <Image source={art} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />}
            {/* `.pe-hero .fade`: the photo fades into the page from 55% down */}
            <Fade color={t.bg} />
          </View>
          <View style={{ alignItems: 'center', gap: 8, marginTop: -40, marginBottom: 16 }}>
            <Text style={[font(600), { fontSize: 13, color: t.tint }]}>{plan.name}</Text>
            <Text accessibilityRole="header" style={[font(600), { fontSize: 36, lineHeight: 42, letterSpacing: -0.9, color: t.label, textAlign: 'center' }]}>{n} {n === 1 ? 'week' : 'weeks'}, done.</Text>
            <Text style={[font(400), num, { fontSize: 15, color: t.label2 }]}>{plan.startedAt ? `${short(plan.startedAt)} to ${short(last)}` : ''}{done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'}` : ''}</Text>
          </View>
          <Card style={{ marginBottom: 16 }}><Timeline cells={timeline(plan).filter((c) => c.kind !== 'after').map((c) => ({ ...c, state: 'done' as const }))} labels={false} /></Card>
          <GrpH sm>Looking back · optional, just for you</GrpH>
          <NamedField label="What worked for you?" value={good} onChange={setGood} multiline maxLength={500} placeholder="A few words" />
          <NamedField label="Anything you'd do differently?" value={change} onChange={setChange} multiline maxLength={500} placeholder="A few words" />
          <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>We'll show this when you start your next plan.</Foot>
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          <LinkBtn title="Skip" onPress={() => { setGood(''); setChange(''); setStep(2) }} style={{ alignSelf: 'center' }} />
          <Btn tall title="Continue" onPress={() => setStep(2)} />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: 24 }}>
        <PvBack><NavBtn back title="Back" onPress={() => (step0 === 2 ? onClose() : setStep(1))} /></PvBack>
        <Text accessibilityRole="header" style={[font(600), { fontSize: 32, lineHeight: 38, letterSpacing: -0.64, color: t.label, marginTop: 8, marginBottom: 10 }]}>What's next?</Text>
        <Sub style={{ marginTop: -4, marginBottom: 16 }}>No rush. Until you choose, your last week carries on as it was.</Sub>
        {!afterPhaseOf(plan) && (
          <Card style={{ gap: 12, marginBottom: 16, borderWidth: 2, borderColor: t.tint }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[font(600), { fontSize: 13, color: t.tint }]}>Recommended</Text>
              <LinkBtn title="How it works" onPress={onMaintenance} style={{ paddingVertical: 0, paddingHorizontal: 0 }} />
            </View>
            <View>
              <Text style={[font(600), { fontSize: 20, color: t.label }]}>Switch to maintenance</Text>
              <Text style={[font(400), { fontSize: 14, lineHeight: 20, color: t.label2, marginTop: 2 }]}>{maintenanceLine(mweek, data.routines)}</Text>
            </View>
            <Btn tall title="Start maintenance" onPress={() => { notePlan(plan.id, reflection); startMaintenance(plan.id, mweek); onClose() }} />
          </Card>
        )}
        <GrpH sm>Or start a new plan</GrpH>
        {suggest && (
          <View style={{ marginBottom: 12 }}>
            <PlanTile name={suggest.name} line={suggest.tagline} art={planArt(suggest.id)} fits={fits(suggest, fitOf(data.profile))} big onPress={() => onPreview(suggest.id, reflection)} />
          </View>
        )}
        <List>
          <Li onPress={() => onAgain(reflection)}><M wrap t={`Run ${plan.name} again`} s={`From ${day(again)}, the same ${n} weeks`} /><Chevron /></Li>
          <Li onPress={() => onBuild(reflection)}><M wrap t="Build your own" s="Pick the length, then fill the week" /><Chevron /></Li>
          <Li onPress={() => { carryOn(plan.id, reflection); onClose() }}><M wrap t="Keep going without a plan" s="Your last week repeats at the full version, for as long as you like" /><Chevron /></Li>
        </List>
      </ScrollView>
    </View>
  )
}

/** `.pe-hero .fade`: clear to 55%, then into the page colour */
function Fade({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="pefade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0.55} stopColor={color} stopOpacity={0} />
            <Stop offset={1} stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#pefade)" />
      </Svg>
    </View>
  )
}
