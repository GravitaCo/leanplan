/**
 * The web's src/screens/plan/PlanDetails.tsx on lib/ui: Plan details (Plans 3) and the end of a plan
 * (Plans 4). Lines come from planModel (detailsLines, lighterWeekAt, phaseRowDetail).
 */
import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { useStore } from '@/store/store'
import type { TrainingPlan } from '@/core/types'
import { dayMonthOf, shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import {
  afterPhase, endDate, fitOf, fits, liftingDays, maintenanceLine, maintenanceWeekOf, nextSuggestions, phaseRows, phaseWeek, positionOn,
  timeline, totalWeeks, weeksSpan, withEasierStart, withLighterWeek, workoutsDone,
} from '@/core/domain/plans'
import { detailsLines, lighterWeekAt, phaseRowDetail } from '@/screens/plan/planModel'
import { planArt } from '@/screens/plan/planArt'
import { Btn, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { Input, NameField } from '../../lib/ui/fields'
import { Foot, Sub } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { Cell, Photo, PlanHero, PlanTile, Timeline } from './PlanParts'
import { PlanPage, PvBack, RowLink } from './PlanViews'

const day = shortDateOf

/** `.grp-h.sm`: a 13 pt label heading a list. */
export function SmallHead({ children }: { children: string }) {
  const t = useTokens()
  return <Text accessibilityRole="header" style={[tx(13, 500), { color: t.label2, paddingHorizontal: 4, marginBottom: 8 }]}>{children}</Text>
}

/** A card holding a timeline (`.card.pp-weeks`). */
function WeeksCard({ children, mb = 16 }: { children: ReactNode; mb?: number }) {
  const t = useTokens()
  return <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 12, marginBottom: mb }}>{children}</View>
}

/** Plan details: the timeline and where you are, the phases, maintenance after, rename, add a week, save a copy, stop. */
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
  const end = endDate(plan)
  const rows = phaseRows(plan, today)
  const started = !!pos
  const cur = pos && pos.maintenanceWeek == null ? pos : null
  const inMaint = pos?.maintenanceWeek != null
  const carrying = inMaint && !!pos?.phase.full
  const { sub, where } = detailsLines(plan, pos, data, today)
  const lighterAt = lighterWeekAt(plan, pos)
  const editRow = cur ? rows.find((r) => r.state === 'now') : rows.find((r) => r.kind !== 'lighter')

  return (
    <PlanPage>
      <PlanHero art={planArt(plan.baseTemplateId)} height={220} onBack={onBack}>
        <Text accessibilityRole="header" style={[tx(28, 600, 34, -0.02), { color: '#fff' }]}>{plan.name}</Text>
        <Text style={[tx(15), num, { color: 'rgba(255,255,255,0.92)' }]}>{sub}</Text>
      </PlanHero>
      <WeeksCard>
        <Timeline cells={timeline(plan, today)} endLabel={`Week ${totalWeeks(plan)}`} />
        <Text style={[tx(14), num, { color: t.label }]}>{where}</Text>
      </WeeksCard>
      <SmallHead>The weeks</SmallHead>
      <List style={{ marginBottom: 8 }}>
        {rows.map((r) => {
          const ph = plan.phases[r.index]
          const detail = phaseRowDetail(r, weeksSpan(r), liftingDays(phaseWeek(plan, r.index), data.routines))
          const state = <Text style={[tx(13, r.state === 'now' ? 600 : 400, 1.3, 0), { color: r.state === 'now' ? t.tint : t.label2 }]}>{r.state === 'done' ? 'Done' : r.state === 'now' ? 'Now' : ''}</Text>
          const lead = <Cell kind={r.kind === 'lighter' || r.kind === 'easier' ? 'easier' : 'full'} state={r.state === 'done' ? 'done' : r.state === 'now' ? 'now' : 'next'} width={14} />
          return r.kind === 'lighter'
            ? <Row key={r.index} wrapSub title={ph.name} sub={detail} lead={lead} right={state} />
            : <Row key={r.index} wrapSub title={ph.name} sub={detail} lead={lead} right={state} onPress={() => onEditWeek(r.index)} label={`${ph.name}, ${detail}. Edit its week`} />
        })}
        <Row wrapSub title={carrying ? 'Carrying on' : 'Then maintenance'} lead={<Cell kind="after" state="" width={14} />} onPress={onMaintenance} right={<RowLink title="Read" />}
          sub={carrying ? 'Your last week at the full version, for as long as you like' : inMaint ? 'Now, for as long as you like' : end ? `From ${day(end)}, if you choose it` : 'If you choose it'} />
      </List>
      {/* .list margins collapse on the web: 8 below the weeks, 16 above the actions, 16 between */}
      <List style={{ marginTop: 8, marginBottom: 8 }}>
        {editRow && <Row title={cur ? "Edit this week's workouts" : 'Edit the workouts'} onPress={() => onEditWeek(editRow.index)} />}
        {inMaint && <Row title="Choose a new plan" onPress={onChoose} />}
        {!inMaint && !pos?.ended && <Row title="Add an easier or lighter week" onPress={() => setSheet('add')} />}
        <Row title="Rename" onPress={() => { setName(plan.name); setSheet('rename') }} />
        <Row title="Save a copy as my own plan" chevron={false} onPress={() => savePlanCopy(plan.id)} />
        <Row title="Stop plan" chevron={false} onPress={() => setSheet('stop')} />
      </List>
      <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>Stopping keeps everything you logged. Your week keeps repeating without a plan.</Foot>

      {sheet === 'rename' && (
        <Sheet title="Rename" onClose={() => setSheet(null)} right={<NavBtn bold title="Save" onPress={() => { updatePlan(plan.id, { name }); setSheet(null) }} />}>
          <Input sheetInput label="Plan name" value={name} maxLength={120} onChangeText={setName} autoFocus />
        </Sheet>
      )}
      {sheet === 'add' && (
        <Sheet title="Add a week" onClose={() => setSheet(null)}>
          <List wrap style={{ marginBottom: 8 }}>
            {!started && !plan.phases[0]?.easier && (
              <Row wrapSub chevron={false} title="An easier first week" sub="To find your weights before the plan builds" onPress={() => { updatePlan(plan.id, { phases: withEasierStart(plan.phases) }); setSheet(null) }} />
            )}
            <Row wrapSub chevron={false} title="A lighter week" sub="The same workouts on the shorter version, to recover before the next stretch" onPress={() => { updatePlan(plan.id, { phases: withLighterWeek(plan.phases, lighterAt) }); setSheet(null) }} />
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
    </PlanPage>
  )
}

/** `.pe-hero .fade`: the photograph fades into the page from 55% down. */
function Fade({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="pl-pefade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0.55} stopColor={color} stopOpacity={0} />
            <Stop offset={1} stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#pl-pefade)" />
      </Svg>
    </View>
  )
}

type Reflection = { good?: string; change?: string }

/**
 * The end of a plan: a calm finish with the plan's photograph, dates and workouts, an optional look
 * back, then what's next: maintenance first, a plan that fits the goal, run again, build your own,
 * or no plan. Until the person chooses, the last week carries on.
 */
export function PlanEnd({ plan, step0, onClose, onMaintenance, onPreview, onAgain, onBuild }: {
  plan: TrainingPlan; step0?: 1 | 2; onClose: () => void; onMaintenance: () => void
  onPreview: (templateId: string, reflection: Reflection) => void; onAgain: (reflection: Reflection) => void; onBuild: (reflection: Reflection) => void
}) {
  const t = useTokens()
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
      <PlanPage footer={
        <>
          <View style={{ alignSelf: 'center' }}><LinkBtn title="Skip" onPress={() => { setGood(''); setChange(''); setStep(2) }} /></View>
          <Btn title="Continue" onPress={() => setStep(2)} style={{ minHeight: 54, borderRadius: 27 }} />
        </>
      }>
        <View style={{ height: art != null ? 330 : 160, marginHorizontal: -16, backgroundColor: art != null ? t.sep : 'transparent' }}>
          {art != null && <Photo art={art} />}
          <Fade color={t.bg} />
        </View>
        <View style={{ alignItems: 'center', gap: 8, marginTop: -40, marginBottom: 16 }}>
          <Text style={[tx(13, 600), { color: t.tint }]}>{plan.name}</Text>
          <Text accessibilityRole="header" style={[tx(36, 600, 42, -0.025), { color: t.label, textAlign: 'center' }]}>{n} {n === 1 ? 'week' : 'weeks'}, done.</Text>
          <Text style={[tx(15), num, { color: t.label2 }]}>{plan.startedAt ? `${dayMonthOf(plan.startedAt)} to ${dayMonthOf(last)}` : ''}{done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'}` : ''}</Text>
        </View>
        <WeeksCard><Timeline cells={timeline(plan).filter((c) => c.kind !== 'after').map((c) => ({ ...c, state: 'done' as const }))} labels={false} /></WeeksCard>
        <SmallHead>Looking back · optional, just for you</SmallHead>
        <NameField multiline label="What worked for you?" value={good} maxLength={500} placeholder="A few words" onChangeText={setGood} />
        <NameField multiline label="Anything you'd do differently?" value={change} maxLength={500} placeholder="A few words" onChangeText={setChange} />
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>We'll show this when you start your next plan.</Foot>
      </PlanPage>
    )
  }

  return (
    <PlanPage>
      <PvBack><BackButton onPress={() => (step0 === 2 ? onClose() : setStep(1))} /></PvBack>
      <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), { color: t.label, marginTop: 8, marginBottom: 10 }]}>What's next?</Text>
      <Sub style={{ marginTop: -4, marginBottom: 16 }}>No rush. Until you choose, your last week carries on as it was.</Sub>
      {!afterPhase(plan) && (
        // .pe-rec: a card ringed in the tint
        // the web's 2 pt ring is an inset shadow inside the padding: the border takes 2 off the padding
        <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14, gap: 12, marginBottom: 16, borderWidth: 2, borderColor: t.tint }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={[tx(13, 600), { color: t.tint }]}>Recommended</Text>
            <LinkBtn title="How it works" onPress={onMaintenance} style={{ paddingVertical: 0, paddingHorizontal: 0 }} />
          </View>
          <View>
            <Text style={[tx(20, 600), { color: t.label }]}>Switch to maintenance</Text>
            <Text style={[tx(14, 400, 1.45), { color: t.label2, marginTop: 2 }]}>{maintenanceLine(mweek, data.routines)}</Text>
          </View>
          <Btn title="Start maintenance" onPress={() => { notePlan(plan.id, reflection); startMaintenance(plan.id, mweek); onClose() }} style={{ minHeight: 54, borderRadius: 27 }} />
        </View>
      )}
      <SmallHead>Or start a new plan</SmallHead>
      {suggest && (
        <View style={{ marginBottom: 12 }}>
          <PlanTile name={suggest.name} line={suggest.tagline} art={planArt(suggest.id)} fits={fits(suggest, fitOf(data.profile))} big onPress={() => onPreview(suggest.id, reflection)} />
        </View>
      )}
      <List wrap style={{ marginBottom: 8 }}>
        <Row wrapSub title={`Run ${plan.name} again`} sub={`From ${day(again)}, the same ${n} weeks`} onPress={() => onAgain(reflection)} />
        <Row wrapSub title="Build your own" sub="Pick the length, then fill the week" onPress={() => onBuild(reflection)} />
        <Row wrapSub title="Keep going without a plan" sub="Your last week repeats at the full version, for as long as you like" onPress={() => { carryOn(plan.id, reflection); onClose() }} />
      </List>
    </PlanPage>
  )
}
