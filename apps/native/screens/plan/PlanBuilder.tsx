/**
 * Native port of src/screens/plan/PlanBuilder.tsx: build your own plan in three steps, one question
 * each (design canvas, Plans 2): how long, what the week looks like, when to start. Nothing is kept
 * until it starts.
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { PlanWeek } from '@/core/types'
import { shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import { copyWeek, MAX_PHASE_WEEKS, timeline, trainingDays, weekFromSchedule } from '@/core/domain/plans'
import type { WorkoutKey } from '@/core/domain/routines'
import { WEEK_ORDER } from '@/core/domain/week'
import type { BuiltPlan } from './planShared'
import { Timeline, WeekRows } from './PlanParts'
import { DayEditor } from './PlanDayViews'
import { StartChoice } from './PlanLibrary'
import { NamedField } from './PlanDetails'
import { CatSq } from './PlanViews'
import { Btn, Card, Chevron, Foot, Icon, Li, LinkBtn, List, M, NavBtn, PlanNote, Screen, Toggle, font, num, useTokens } from './ui'

export function PlanBuilder({ onCancel, onStart, onMaintenance, onOpenWorkout, note, onHideNote }: {
  onCancel: () => void
  onStart: (p: BuiltPlan) => void
  onMaintenance: () => void
  onOpenWorkout: (k: WorkoutKey) => void
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

  const head = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 10 }}>
        {step === 1 ? <NavBtn title="Cancel" onPress={onCancel} /> : <NavBtn back title="Back" onPress={() => setStep(step - 1)} />}
        <Text style={[font(400), num, { fontSize: 13, color: t.label2 }]}>{step} of 3</Text>
      </View>
      <View accessibilityLabel={`Step ${step} of 3`} style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.tint : t.sep }} />)}
      </View>
    </>
  )
  const h1 = (s: string) => <Text accessibilityRole="header" style={[font(600), { fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: t.label, marginTop: 4, marginBottom: 16 }]}>{s}</Text>

  if (step === 1) {
    const stepBtn = (label: string, sym: string, n: number) => (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setLen(n)}
        style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Text style={[font(400), { fontSize: 20, color: t.label }]}>{sym}</Text>
      </Pressable>
    )
    return (
      <Screen footer={<Btn tall title="Next: your week" onPress={() => setStep(2)} />}>
        {head}
        {h1('How long?')}
        {note && noteShown && (
          <PlanNote style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 0, marginBottom: 16 }}>
            <Text style={[font(400), { flex: 1, fontSize: 14, lineHeight: 19.6, color: t.label }]}>From your last plan: “{note}”</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Hide this note" onPress={() => { setNoteShown(false); onHideNote?.() }}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={14} stroke={2.6} color={t.label2} />
            </Pressable>
          </PlanNote>
        )}
        <NamedField label="Name" value={name} maxLength={120} onChange={(v) => { setName(v); setNamed(true) }} />
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 12 }}>
          <Text style={[font(500), { flex: 1, fontSize: 16, color: t.label }]}>Plan length</Text>
          {stepBtn('Fewer weeks', '−', weeks - 1)}
          <Text style={[font(500), num, { minWidth: 58, textAlign: 'center', fontSize: 26, color: t.label }]}>{weeks}<Text style={[font(500), { fontSize: 13, color: t.label2 }]}> {weeks === 1 ? 'week' : 'weeks'}</Text></Text>
          {stepBtn('More weeks', '+', weeks + 1)}
        </Card>
        <View style={{ paddingTop: 4, paddingHorizontal: 4, paddingBottom: 16 }}><Timeline cells={cells} /></View>
        <List>
          <Li onPress={onMaintenance}>
            <CatSq sm color={t.fill} />
            <M wrap t="When it ends: maintenance, if you choose it" s="The same workouts with fewer sets, to keep what you built. Read how it works" />
            <Chevron />
          </Li>
        </List>
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>Most plans run 6 to 12 weeks. You can add a lighter week later in Plan details, and an easier first week until the plan starts.</Foot>
      </Screen>
    )
  }

  if (step === 2) {
    return (
      <Screen footer={
        <>
          <Text style={[font(400), num, { fontSize: 13, color: t.label2, textAlign: 'center' }]}>{workouts} {workouts === 1 ? 'workout' : 'workouts'} · {rest} rest {rest === 1 ? 'day' : 'days'}</Text>
          <Btn tall title="Next: when to start" disabled={empty} onPress={() => setStep(3)} />
        </>
      }>
        {head}
        {h1('Your week')}
        {empty && trainingDays(fromSchedule) > 0 && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 12, marginBottom: 12 }}>
            <Text style={[font(400), { fontSize: 15, color: t.label, flex: 1 }]}>Start from the week you have now?</Text>
            <LinkBtn title="Copy it" onPress={() => setWeek(copyWeek(fromSchedule))} />
          </Card>
        )}
        <WeekRows week={week} routines={routines} onDay={setDay} emptyAdd />
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>Tap a day to add a workout, several on one day if you like. Empty days are rest days.</Foot>
        {!empty && rest === 0 && <PlanNote>No rest days in this week. Most plans keep at least one, because recovery is when training pays off.</PlanNote>}
      </Screen>
    )
  }

  const end = shiftDay(start, weeks * 7 - 1)
  return (
    <Screen footer={<Btn tall title="Start plan" onPress={() => onStart({ name: name.trim() || 'My plan', weeks, week, startedAt: start, easier })} />}>
      {head}
      {h1('Ready to start')}
      <Card style={{ gap: 12, marginBottom: 16 }}>
        <View>
          <Text style={[font(600), { fontSize: 20, color: t.label }]}>{name.trim() || 'My plan'}</Text>
          <Text style={[font(400), num, { fontSize: 13, color: t.label2 }]}>{weeks} {weeks === 1 ? 'week' : 'weeks'} · {workouts} {workouts === 1 ? 'workout' : 'workouts'} a week</Text>
        </View>
        <Timeline cells={cells} />
      </Card>
      <StartChoice value={start} onChange={setStart} />
      <List style={{ marginTop: 16 }}>
        <Li>
          <M wrap t="Start with an easier week" s="One week to find your weights before the plan builds. Adds a week." />
          <Toggle on={easier} label="Start with an easier week" onChange={() => setEasier(!easier)} />
        </Li>
      </List>
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>Ends {shortDateOf(easier ? shiftDay(end, 7) : end)}. Week 1 is the first 7 days from the start. When it ends, you can choose maintenance.</Foot>
    </Screen>
  )
}
