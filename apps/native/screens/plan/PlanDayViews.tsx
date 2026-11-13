/**
 * Native port of src/screens/plan/PlanDayViews.tsx: a plan phase's week, and one of its days
 * (Flow 3 on the design canvas) over a running plan's week or a plan being built.
 */
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useStore } from '@/store/store'
import type { PlanPhase, PlanWeek, WorkoutType } from '@/core/types'
import { DAY_NAME } from '@/core/domain/date'
import { WEEK_ORDER } from '@/core/domain/week'
import { keyTitle, keyVideo, routineFor, isBuiltinKey, slotsOf as routineSlots, aboutLine, routineEstMins, type WorkoutKey } from '@/core/domain/routines'
import { copyWeek, planWeekNotes } from '@/core/domain/plans'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { workoutSub } from './planShared'
import { Thumb } from './trainBridge'
import { AddWorkoutSheet } from './PlanViews'
import { WeekRow } from './PlanParts'
import { BackButton, Chevron, DashAdd, Foot, Lbl, Li, LinkBtn, List, M, PlanNote, PvBack, Screen, Sheet, Sub, TitleRow } from './ui'

/** Most workouts a day in a plan (the same cap cleanPhases applies). */
const MAX_A_DAY = 4

/** A plan phase's week, and a way to change one day of it with an Undo (as the one-workout week does). */
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

const known = (keys: WorkoutKey[] | undefined, routines: ReturnType<typeof useStore.getState>['data']['routines']) =>
  (keys || []).filter((k) => isBuiltinKey(k) || !!routineFor(k, routines))

/** Pick another weekday of the plan's week (copy from it, or swap with it). */
function PlanDayPick({ week, idx, title, onPick, onClose }: { week: PlanWeek; idx: number; title: string; onPick: (d: number) => void; onClose: () => void }) {
  const routines = useStore((s) => s.data.routines)
  return (
    <Sheet title={title} onClose={onClose}>
      <List>
        {WEEK_ORDER.filter((d) => d !== idx).map((d) => {
          const keys = known(week[d], routines)
          return (
            <Li key={d} onPress={() => onPick(d)}>
              <M t={DAY_NAME[d]} s={keys.length ? keys.map((k) => keyTitle(k, routines)).join(' + ') : 'Rest'} />
              <Chevron />
            </Li>
          )
        })}
      </List>
    </Sheet>
  )
}

/**
 * One weekday of a plan's week (Flow 3 on the design canvas): what's on it, "Add a workout" or
 * "Add another" (a plan's day can hold several), and rest, copy and swap. Changes repeat every
 * week of the phase; one-off changes happen in Train.
 */
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
 * The Flow 3 day page over any week: a running plan's (saved with Undo) or a plan being built
 * (Plans 2, step 2), which is only kept once it starts.
 */
export function DayEditor({ week, change, idx, phaseName, lighterAfter, backLabel = 'My week', onBack, onOpenWorkout }: {
  week: PlanWeek
  change: (next: PlanWeek, msg: string) => void
  idx: number
  phaseName?: string
  lighterAfter?: boolean
  backLabel?: string
  onBack: () => void
  onOpenWorkout: (k: WorkoutKey) => void
}) {
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const [sheet, setSheet] = useState<null | 'add' | 'copy' | 'swap'>(null)
  const day = DAY_NAME[idx]
  const keys = known(week[idx], routines)
  const rest = keys.length === 0
  const ph = phaseName ? { name: phaseName } : undefined
  // keys this device doesn't know (a newer app's) are kept, after the ones shown
  const unknownOn = (d: number) => (week[d] || []).filter((k) => !isBuiltinKey(k) && !routineFor(k, routines))
  const setDay = (next: WorkoutKey[], msg: string) => change({ ...copyWeek(week), [idx]: [...next, ...unknownOn(idx)].slice(0, MAX_A_DAY) }, msg)
  const notes = planWeekNotes(week, routines).filter((n) => n.includes(day) || n.includes('no rest day'))
  const subOf = (k: WorkoutKey) => {
    const r = routineFor(k, routines)
    if (!r) return `${k === 'Cardio' ? MODALITY_LABEL.cardio : MODALITY_LABEL.strength} · ${workoutSub(k as WorkoutType)}`
    const n = routineSlots(r).length
    return [MODALITY_LABEL[r.modality], `${n} ${n === 1 ? 'exercise' : 'exercises'}`, aboutLine(routineEstMins(r, routines, training, ONBOARDING_ENABLED))].filter(Boolean).join(' · ')
  }

  return (
    <Screen>
      <PvBack><BackButton label={backLabel} onPress={onBack} /></PvBack>
      <TitleRow title={day} />
      <Sub style={{ marginTop: 2, marginBottom: 16 }}>{rest ? 'Rest day · recovery counts too' : `Every week of ${ph?.name ?? 'this phase'}`}</Sub>

      {!rest && (
        <List>
          {keys.map((k, i) => (
            <Li key={k + i} style={{ paddingVertical: 10, paddingHorizontal: 14, minHeight: 72 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${keyTitle(k, routines)}`} onPress={() => onOpenWorkout(k)}
                style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1 })}>
                <Thumb video={keyVideo(k, routines)} shape={k === 'Cardio' ? 'duration' : undefined} />
                <M wrap t={keyTitle(k, routines)} s={subOf(k)} />
              </Pressable>
              <LinkBtn title="Remove" label={`Remove ${keyTitle(k, routines)} from ${day}`}
                onPress={() => setDay(keys.filter((_, j) => j !== i), `${keyTitle(k, routines)} removed from ${day}`)} />
            </Li>
          ))}
        </List>
      )}
      {keys.length < MAX_A_DAY && <DashAdd title={rest ? 'Add a workout' : 'Add another'} onPress={() => setSheet('add')} />}

      {rest && <Lbl>Or</Lbl>}
      <List style={{ marginTop: rest ? 0 : 12 }}>
        {!rest && (
          <Li onPress={() => setDay([], `${day} is a rest day now`)}>
            <M t={`Make ${day} a rest day`} s="Rest is part of the plan" />
          </Li>
        )}
        <Li onPress={() => setSheet('copy')}><M t="Copy another day" s="Pick a day to copy from" /><Chevron /></Li>
        <Li onPress={() => setSheet('swap')}><M t="Swap with another day" /><Chevron /></Li>
      </List>
      {notes.map((n) => <PlanNote key={n}>{n}</PlanNote>)}
      <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>
        Changes here repeat every week of {ph?.name ?? 'this phase'}{lighterAfter ? ', and the lighter weeks after it' : ''}. To change just this {day}, use the Train tab.
      </Foot>

      {sheet === 'add' && <AddWorkoutSheet idx={idx} have={keys} onClose={() => setSheet(null)}
        notesFor={(k) => planWeekNotes({ ...week, [idx]: [...keys, k] }, routines).filter((n) => n.includes(day))}
        onAdd={(k) => setDay([...keys, k], `${keyTitle(k, routines)} added to ${day}`)} />}
      {sheet === 'copy' && <PlanDayPick week={week} idx={idx} title="Copy from" onClose={() => setSheet(null)} onPick={(d) => {
        setDay(known(week[d], routines).slice(0, MAX_A_DAY), `${day} now matches ${DAY_NAME[d]}`); setSheet(null)
      }} />}
      {sheet === 'swap' && <PlanDayPick week={week} idx={idx} title="Swap with" onClose={() => setSheet(null)} onPick={(d) => {
        const next = copyWeek(week); const a = next[idx]; next[idx] = next[d]; next[d] = a
        change(next, `${day} and ${DAY_NAME[d]} swapped`); setSheet(null)
      }} />}
    </Screen>
  )
}

/** A plan phase's week as the Plan tab's week list (Option A): tap a day to change it. */
export function PlanWeekView({ planId, phaseIndex, onBack, onDay }: { planId: string; phaseIndex: number; onBack: () => void; onDay: (d: number) => void }) {
  const routines = useStore((s) => s.data.routines)
  const { plan, week } = usePlanWeek(planId, phaseIndex)
  if (!plan) return null
  const ph = plan.phases[phaseIndex]
  const notes = planWeekNotes(week, routines)
  return (
    <Screen>
      <PvBack><BackButton label="Plan" onPress={onBack} /></PvBack>
      <TitleRow title={ph?.name ?? 'Week'} />
      <Sub style={{ marginTop: 2, marginBottom: 16 }}>{plan.name} · {ph?.weeks} {ph?.weeks === 1 ? 'week' : 'weeks'}</Sub>
      <List radius={20} inset={14}>
        {WEEK_ORDER.map((d) => {
          const keys = known(week[d], routines)
          const names = keys.map((k) => keyTitle(k, routines))
          return <WeekRow key={d} d={d} names={names} first={keys[0]} video={keys[0] ? keyVideo(keys[0], routines) : undefined} onPress={() => onDay(d)}
            label={`${DAY_NAME[d]}: ${names.length ? names.join(' and ') : 'Rest'}`} />
        })}
      </List>
      {notes.map((n) => <PlanNote key={n}>{n}</PlanNote>)}
      <Foot>Tap a day to change it. Changes repeat every week of {ph?.name ?? 'this phase'}.</Foot>
      <View />
    </Screen>
  )
}
