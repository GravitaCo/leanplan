/**
 * The web's PlanDayView and DayEditor (src/screens/plan/PlanDayViews.tsx) on lib/ui: one weekday of
 * a plan's week (Flow 3), over a running plan's week (saved with Undo) or a plan being built.
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { num } from '../../lib/theme'
import { useStore } from '@/store/store'
import type { PlanPhase, PlanWeek } from '@/core/types'
import { DAY_NAME } from '@/core/domain/date'
import { WEEK_ORDER } from '@/core/domain/week'
import { copyWeek, planWeekNotes } from '@/core/domain/plans'
import { isBuiltinKey, keyTitle, keyVideo, routineFor, type WorkoutKey } from '@/core/domain/routines'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { keyLine, knownKeys } from '@/screens/plan/planModel'
import { DashAdd, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, Row, Sheet, TitleRow } from '../../lib/ui/primitives'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { Thumb } from '../train'
import { PlanNote } from './PlanParts'
import { AddWorkoutSheet, PlanPage, PvBack } from './PlanViews'

/** Most workouts a day in a plan (the same cap cleanPhases applies). */
const MAX_A_DAY = 4

/** A plan phase's week, and a way to change one day of it with an Undo. */
function usePlanWeek(planId: string, phaseIndex: number) {
  const plan = useStore((s) => s.data.trainingPlans?.find((p) => p.id === planId))
  const updatePlan = useStore((s) => s.updatePlan)
  const showToast = useStore((s) => s.showToast)
  const week: PlanWeek = plan?.phases[phaseIndex]?.week ?? {}
  const change = (next: PlanWeek, msg: string) => {
    if (!plan) return
    const before = plan.phases
    const phases: PlanPhase[] = plan.phases.map((ph, i) => (i === phaseIndex ? { ...ph, week: next } : ph))
    updatePlan(plan.id, { phases })
    showToast(msg, { label: 'Undo', run: () => updatePlan(plan.id, { phases: before }) })
  }
  return { plan, week, change }
}

/** Pick another weekday of the plan's week (copy from it, or swap with it). */
function PlanDayPick({ week, idx, title, onPick, onClose }: { week: PlanWeek; idx: number; title: string; onPick: (d: number) => void; onClose: () => void }) {
  const routines = useStore((s) => s.data.routines)
  return (
    <Sheet title={title} onClose={onClose}>
      <List style={{ marginBottom: 8 }}>
        {WEEK_ORDER.filter((d) => d !== idx).map((d) => {
          const keys = knownKeys(week[d], routines)
          return <Row key={d} title={DAY_NAME[d]} sub={keys.length ? keys.map((k) => keyTitle(k, routines)).join(' + ') : 'Rest'} onPress={() => onPick(d)} />
        })}
      </List>
    </Sheet>
  )
}

/** One weekday of a running plan's week. */
export function PlanDayView({ planId, phaseIndex, idx, backLabel = 'My week', onBack, onOpenWorkout }: {
  planId: string; phaseIndex: number; idx: number; backLabel?: string; onBack: () => void; onOpenWorkout: (k: WorkoutKey) => void
}) {
  const { plan, week, change } = usePlanWeek(planId, phaseIndex)
  if (!plan) return null
  const ph = plan.phases[phaseIndex]
  const lighterAfter = plan.phases.some((x, j) => j > phaseIndex && (x.maintain || x.after))
  return <DayEditor week={week} change={change} idx={idx} phaseName={ph?.name} lighterAfter={lighterAfter} backLabel={backLabel} onBack={onBack} onOpenWorkout={onOpenWorkout} />
}

/**
 * The Flow 3 day page over any week: what's on it (View, Remove), "Add a workout" or "Add another"
 * (up to four), rest, copy and swap. Changes repeat every week of the phase.
 */
export function DayEditor({ week, change, idx, phaseName, lighterAfter, backLabel = 'My week', onBack, onOpenWorkout }: {
  week: PlanWeek; change: (next: PlanWeek, msg: string) => void; idx: number; phaseName?: string; lighterAfter?: boolean
  backLabel?: string; onBack: () => void; onOpenWorkout: (k: WorkoutKey) => void
}) {
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const [sheet, setSheet] = useState<null | 'add' | 'copy' | 'swap'>(null)
  const day = DAY_NAME[idx]
  const keys = knownKeys(week[idx], routines)
  const rest = keys.length === 0
  const phase = phaseName ?? 'this phase'
  // keys this device doesn't know (a newer app's) are kept, after the ones shown
  const unknownOn = (d: number) => (week[d] || []).filter((k) => !isBuiltinKey(k) && !routineFor(k, routines))
  const setDay = (next: WorkoutKey[], msg: string) => change({ ...copyWeek(week), [idx]: [...next, ...unknownOn(idx)].slice(0, MAX_A_DAY) }, msg)
  const notes = planWeekNotes(week, routines).filter((n) => n.includes(day) || n.includes('no rest day'))

  return (
    <PlanPage>
      <PvBack><BackButton label={backLabel} onPress={onBack} /></PvBack>
      <TitleRow title={day} />
      <Sub style={{ marginTop: 2, marginBottom: rest ? 4 : 16 }}>{rest ? 'Rest day · recovery counts too' : `Every week of ${phase}`}</Sub>

      {!rest && (
        <List>
          {keys.map((k, i) => (
            <Row key={k + i} pv title={keyTitle(k, routines)} sub={<Text style={num}>{keyLine(k, routines, training, ONBOARDING_ENABLED, true)}</Text>} label={`View ${keyTitle(k, routines)}`}
              onPress={() => onOpenWorkout(k)} lead={<Thumb video={keyVideo(k, routines)} shape={k === 'Cardio' ? 'duration' : undefined} />}
              right={<LinkBtn title="Remove" label={`Remove ${keyTitle(k, routines)} from ${day}`}
                onPress={() => setDay(keys.filter((_, j) => j !== i), `${keyTitle(k, routines)} removed from ${day}`)} />} />
          ))}
        </List>
      )}
      {keys.length < MAX_A_DAY && <DashAdd title={rest ? 'Add a workout' : 'Add another'} onPress={() => setSheet('add')} />}

      {rest && <Lbl>Or</Lbl>}
      <List style={{ marginTop: rest ? 0 : 12, marginBottom: 8 }}>
        {!rest && <Row title={`Make ${day} a rest day`} sub="Rest is part of the plan" chevron={false} onPress={() => setDay([], `${day} is a rest day now`)} />}
        <Row title="Copy another day" sub="Pick a day to copy from" onPress={() => setSheet('copy')} />
        <Row title="Swap with another day" onPress={() => setSheet('swap')} />
      </List>
      {notes.map((n, i) => <PlanNote key={n} style={i === 0 ? { marginTop: 0 } : undefined}>{n}</PlanNote>)}
      <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>
        Changes here repeat every week of {phase}{lighterAfter ? ', and the lighter weeks after it' : ''}. To change just this {day}, use the Train tab.
      </Foot>
      <View />

      {sheet === 'add' && <AddWorkoutSheet idx={idx} have={keys} onClose={() => setSheet(null)}
        notesFor={(k) => planWeekNotes({ ...week, [idx]: [...keys, k] }, routines).filter((n) => n.includes(day))}
        onAdd={(k) => setDay([...keys, k], `${keyTitle(k, routines)} added to ${day}`)} />}
      {sheet === 'copy' && <PlanDayPick week={week} idx={idx} title="Copy from" onClose={() => setSheet(null)} onPick={(d) => {
        setDay(knownKeys(week[d], routines).slice(0, MAX_A_DAY), `${day} now matches ${DAY_NAME[d]}`); setSheet(null)
      }} />}
      {sheet === 'swap' && <PlanDayPick week={week} idx={idx} title="Swap with" onClose={() => setSheet(null)} onPick={(d) => {
        const next = copyWeek(week); const a = next[idx]; next[idx] = next[d]; next[d] = a
        change(next, `${day} and ${DAY_NAME[d]} swapped`); setSheet(null)
      }} />}
    </PlanPage>
  )
}
