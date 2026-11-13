/**
 * The web's src/screens/plan/PlanBuilder.tsx on lib/ui: build your own plan in three steps, one
 * question each (Plans 2): how long, what the week looks like, when to start. Nothing is kept until
 * it starts.
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { PlanWeek } from '@/core/types'
import { shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import { copyWeek, MAX_PHASE_WEEKS, timeline, trainingDays, weekFromSchedule } from '@/core/domain/plans'
import type { WorkoutKey } from '@/core/domain/routines'
import { WEEK_ORDER } from '@/core/domain/week'
import type { BuiltPlan } from '@/screens/plan/planModel'
import { Btn, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, NavBtn, Row, Toggle, XBtn } from '../../lib/ui/primitives'
import { NameField } from '../../lib/ui/fields'
import { Foot } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { PlanNote, Timeline, WeekRows } from './PlanParts'
import { DayEditor } from './PlanDayViews'
import { StartChoice } from './PlanLibrary'
import { PlanPage, PvBack } from './PlanViews'

export function PlanBuilder({ onCancel, onStart, onMaintenance, onOpenWorkout, note, onHideNote }: {
  onCancel: () => void; onStart: (p: BuiltPlan) => void; onMaintenance: () => void; onOpenWorkout: (k: WorkoutKey) => void
  /** the last plan's "do differently", shown while setting up the next */
  note?: string
  onHideNote?: () => void
}) {
  const t = useTokens()
  const schedule = useStore((s) => s.data.schedule)
  const routines = useStore((s) => s.data.routines)
  const [step, setStep] = useState(1)
  const [weeks, setWeeks] = useState(8)
  const [name, setName] = useState('My 8-week plan')
  const [named, setNamed] = useState(false)
  const [week, setWeek] = useState<PlanWeek>(() => copyWeek({}))
  const [day, setDay] = useState<number | null>(null)
  const [start, setStart] = useState(todayStr())
  const [noteShown, setNoteShown] = useState(true)
  const [easier, setEasier] = useState(false)
  const setLen = (n: number) => {
    const w = Math.max(1, Math.min(MAX_PHASE_WEEKS, n))
    setWeeks(w)
    if (!named) setName(`My ${w}-week plan`)
  }
  const cells = timeline({ phases: [...(easier && step === 3 ? [{ id: 'e', name: 'Easier', weeks: 1, easier: true, week }] : []), { id: 'x', name: 'Build', weeks, week }] })
  const workouts = WEEK_ORDER.reduce((a, d) => a + (week[d] || []).length, 0)
  const rest = 7 - trainingDays(week)
  const fromSchedule = weekFromSchedule(schedule)
  const empty = workouts === 0

  if (day != null) {
    return <DayEditor week={week} idx={day} phaseName="the plan" backLabel="Your week" onBack={() => setDay(null)} onOpenWorkout={onOpenWorkout} change={(next) => setWeek(next)} />
  }

  // .pb-top and .pb-steps
  const head = (
    <>
      <PvBack>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, marginRight: -6 }}>
          {step === 1 ? <View style={{ marginLeft: 6 }}><NavBtn title="Cancel" onPress={onCancel} /></View> : <BackButton onPress={() => setStep(step - 1)} />}
          <Text style={[tx(13), num, { color: t.label2 }]}>{step} of 3</Text>
        </View>
      </PvBack>
      <View accessibilityLabel={`Step ${step} of 3`} style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.tint : t.sep }} />)}
      </View>
    </>
  )
  const h1 = (s: string) => <Text accessibilityRole="header" style={[tx(30, 600, 36, -0.02), { color: t.label, marginTop: 4, marginBottom: 16 }]}>{s}</Text>
  const cta = (title: string, onPress: () => void, disabled?: boolean) => <Btn title={title} onPress={onPress} disabled={disabled} style={{ minHeight: 54, borderRadius: 27 }} />

  if (step === 1) {
    // .pb-step: a 40 pt round --fill button
    const stepBtn = (label: string, sym: string, n: number) => (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setLen(n)}
        style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
        <Text style={[tx(20, 400, 1.3, 0), { color: t.label }]}>{sym}</Text>
      </Pressable>
    )
    return (
      <PlanPage footer={cta('Next: your week', () => setStep(2))}>
        {head}
        {h1('How long?')}
        {note && noteShown && (
          <PlanNote style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 0, marginBottom: 16 }}>
            <Text style={[tx(14, 400, 1.4), { flex: 1, color: t.label }]}>From your last plan: “{note}”</Text>
            <XBtn label="Hide this note" onPress={() => { setNoteShown(false); onHideNote?.() }} />
          </PlanNote>
        )}
        <NameField label="Name" value={name} maxLength={120} onChangeText={(v) => { setName(v); setNamed(true) }} />
        <View style={{ backgroundColor: t.card, borderRadius: t.radius, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 12 }}>
          <Text style={[tx(16, 500), { flex: 1, color: t.label }]}>Plan length</Text>
          {stepBtn('Fewer weeks', '−', weeks - 1)}
          <Text style={[tx(26, 500), num, { minWidth: 58, textAlign: 'center', color: t.label }]}>{weeks}<Text style={[tx(13, 500), { color: t.label2 }]}> {weeks === 1 ? 'week' : 'weeks'}</Text></Text>
          {stepBtn('More weeks', '+', weeks + 1)}
        </View>
        <View style={{ paddingTop: 4, paddingHorizontal: 4, paddingBottom: 16 }}><Timeline cells={cells} /></View>
        <List wrap style={{ marginBottom: 8 }}>
          {/* TODO(N1): `.catsq.sm` leads this row once lib/ui has it (asked N1) */}
          <Row wrapSub title="When it ends: maintenance, if you choose it" sub="The same workouts with fewer sets, to keep what you built. Read how it works" onPress={onMaintenance} />
        </List>
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>Most plans run 6 to 12 weeks. You can add a lighter week later in Plan details, and an easier first week until the plan starts.</Foot>
      </PlanPage>
    )
  }

  if (step === 2) {
    return (
      <PlanPage footer={
        <>
          <Text style={[tx(13), num, { color: t.label2, textAlign: 'center' }]}>{workouts} {workouts === 1 ? 'workout' : 'workouts'} · {rest} rest {rest === 1 ? 'day' : 'days'}</Text>
          {cta('Next: when to start', () => setStep(3), empty)}
        </>
      }>
        {head}
        {h1('Your week')}
        {empty && trainingDays(fromSchedule) > 0 && (
          <View style={{ backgroundColor: t.card, borderRadius: t.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={[tx(15), { color: t.label, flex: 1 }]}>Start from the week you have now?</Text>
            <LinkBtn title="Copy it" onPress={() => setWeek(copyWeek(fromSchedule))} />
          </View>
        )}
        <WeekRows week={week} routines={routines} onDay={setDay} emptyAdd />
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>Tap a day to add a workout, several on one day if you like. Empty days are rest days.</Foot>
        {!empty && rest === 0 && <PlanNote>No rest days in this week. Most plans keep at least one, because recovery is when training pays off.</PlanNote>}
      </PlanPage>
    )
  }

  const end = shiftDay(start, weeks * 7 - 1)
  return (
    <PlanPage footer={cta('Start plan', () => onStart({ name: name.trim() || 'My plan', weeks, week, startedAt: start, easier }))}>
      {head}
      {h1('Ready to start')}
      <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 12, marginBottom: 16 }}>
        <View>
          <Text style={[tx(20, 600), { color: t.label }]}>{name.trim() || 'My plan'}</Text>
          <Text style={[tx(13, 400, 1.38), num, { color: t.label2 }]}>{weeks} {weeks === 1 ? 'week' : 'weeks'} · {workouts} {workouts === 1 ? 'workout' : 'workouts'} a week</Text>
        </View>
        <Timeline cells={cells} />
      </View>
      <StartChoice value={start} onChange={setStart} />
      <List wrap style={{ marginTop: 16 }}>
        <Row wrapSub title="Start with an easier week" sub="One week to find your weights before the plan builds. Adds a week."
          right={<Toggle on={easier} label="Start with an easier week" onChange={() => setEasier(!easier)} />} />
      </List>
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>Ends {shortDateOf(easier ? shiftDay(end, 7) : end)}. Week 1 is the first 7 days from the start. When it ends, you can choose maintenance.</Foot>
    </PlanPage>
  )
}
