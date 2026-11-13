/**
 * The Plan tab (the web's src/screens/PlanScreen.tsx): which view shows, as the web does with its
 * own state (a sub-view replaces the tab; Back returns to the same place), and the sheets the tab
 * opens. Mount it in app/(tabs)/plan.tsx.
 */
import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { SESSIONS, LIFTS, firstVideo } from '@/core/data/workouts'
import { shortTitle } from '@/core/domain/week'
import { todayStr } from '@/core/domain/date'
import { activePlan, catalogue, endDate, fitOf, PLAN_TEMPLATES, bestFit, phasesOf, positionOn, templateById, type CatalogueEntry } from '@/core/domain/plans'
import { builtinSlots, canBuild, isBuiltinKey, isTaliKey, keyVideo, routineFor, slotsOf, type WorkoutKey } from '@/core/domain/routines'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { PLAN_GUIDES } from '@/copy/plan'
import { builtPhases, dayTarget, lastPlanNote, routineLine, workoutSub } from '@/screens/plan/planModel'
import { List } from '../../lib/ui/kit'
import { NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { Foot, Lbl } from '../../lib/ui/text'
import { LibrarySheet, RoutineBuilderSheet, Thumb, type BuilderStart } from '../train'
import { MaintenanceCard } from './MaintenanceCard'
import { PlanBuilder } from './PlanBuilder'
import { PlanDayView } from './PlanDayViews'
import { PlanDetails, PlanEnd } from './PlanDetails'
import { PlanHome, type PlanGo } from './PlanHome'
import { PlanLibrary, PlanPreview } from './PlanLibrary'
import { PlanEditSheet } from './PlanSheets'
import { DayView, WorkoutView } from './PlanViews'
import { PlanWeekView } from './PlanWeekView'

type After = { id: string; reflection: { good?: string; change?: string } }
type Flow =
  | { v: 'library' } | { v: 'preview'; e: CatalogueEntry; after?: After } | { v: 'build'; after?: After }
  | { v: 'details'; planId: string } | { v: 'end'; planId: string; step?: 1 | 2 }

export function PlanScreen() {
  const data = useStore((s) => s.data)
  const { trainingPlans, routines, profile } = data
  const planOpen = useStore((s) => s.planOpen)
  const clearOpen = useStore((s) => s.clearOpen)
  const startPlan = useStore((s) => s.startPlan)
  const finishPlan = useStore((s) => s.finishPlan)
  const notePlan = useStore((s) => s.notePlan)
  const setPrefs = useStore((s) => s.setPrefs)
  const [editing, setEditing] = useState<{ id?: string } | null>(null)
  const [guide, setGuide] = useState<(typeof PLAN_GUIDES)[number]['id'] | null>(null)
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  const [workout, setWorkout] = useState<WorkoutKey | null>(null)
  const [builder, setBuilder] = useState<BuilderStart | null>(null)
  const [sheet, setSheet] = useState<null | 'workouts' | 'library'>(null)
  const [flow, setFlow] = useState<Flow | null>(null)
  const [mcard, setMcard] = useState(false)
  const [planWeekAt, setPlanWeekAt] = useState<{ planId: string; phase: number } | null>(null)
  const [planDay, setPlanDay] = useState<{ planId: string; phase: number; idx: number } | null>(null)
  const mine = (routines || []).filter((r) => !r.archived)
  const build = canBuild(profile)
  const today = todayStr()
  const active = activePlan({ trainingPlans }, today)
  const pos = active ? positionOn(active, today) : null

  // Train's "Edit <workout> in Plan" opens that workout here
  useEffect(() => {
    if (!planOpen) return
    setWorkout(planOpen); setDayIdx(null); clearOpen()
  }, [planOpen, clearOpen])
  // one of the user's own workouts removed (archived) while open: back to the plan
  const gone = !!workout && !isBuiltinKey(workout) && !isTaliKey(workout) && !mine.some((r) => r.id === workout)
  useEffect(() => { if (gone && !builder) setWorkout(null) }, [gone, builder])

  const builderSheet = builder && (
    <RoutineBuilderSheet start={builder} onClose={() => setBuilder(null)} onSaved={(id) => { setBuilder(null); setSheet(null); setWorkout(id) }} />
  )
  if (workout && !gone) {
    const r = routineFor(workout, routines)
    const own = r && r.source === 'custom' ? r : undefined
    return (
      <>
        <WorkoutView type={workout} onBack={() => setWorkout(null)}
          onEdit={own && build ? () => setBuilder({ routine: own }) : undefined}
          onCopy={!build ? undefined
            : r && !own ? () => setBuilder({ name: 'My ' + r.name, slots: slotsOf(r), baseId: r.id })
            : !r && LIFTS.includes(workout as WorkoutType) ? () => setBuilder({ name: 'My ' + shortTitle(workout), slots: builtinSlots(workout as WorkoutType), baseId: 'builtin-' + workout }) : undefined} />
        {builderSheet}
      </>
    )
  }
  const planOf = (id: string) => (trainingPlans || []).find((p) => p.id === id && p.phases.length)
  if (planDay && planOf(planDay.planId)) {
    const wk = planWeekAt ? planOf(planWeekAt.planId)?.phases[planWeekAt.phase]?.name : undefined
    return <PlanDayView planId={planDay.planId} phaseIndex={planDay.phase} idx={planDay.idx} backLabel={wk ?? 'My week'} onBack={() => setPlanDay(null)} onOpenWorkout={setWorkout} />
  }
  if (planWeekAt && planOf(planWeekAt.planId)) {
    return <PlanWeekView planId={planWeekAt.planId} phaseIndex={planWeekAt.phase} onBack={() => setPlanWeekAt(null)}
      onDay={(idx) => setPlanDay({ planId: planWeekAt.planId, phase: planWeekAt.phase, idx })} />
  }
  if (dayIdx != null && !pos) return <DayView idx={dayIdx} onBack={() => setDayIdx(null)} onOpenWorkout={setWorkout} />

  // start a plan from a preview, a run-again or a build; the plan that ended keeps going until the new one starts
  const begin = (input: Parameters<typeof startPlan>[0], after?: After) => {
    if (after) { if ((input.startedAt ?? today) <= today) finishPlan(after.id, after.reflection); else notePlan(after.id, after.reflection) }
    startPlan(input)
    setFlow(null)
  }
  const overlay = mcard && <MaintenanceCard onClose={() => setMcard(false)} />
  const lastRef = lastPlanNote(trainingPlans, profile.planNoteHidden)
  const entryFor = (id: string) => catalogue({ trainingPlans }, fitOf(profile)).find((x) => x.key === id)

  if (flow?.v === 'library') {
    return <><PlanLibrary onBack={() => setFlow(null)} onOpen={(e) => setFlow({ v: 'preview', e })} onNew={() => setFlow({ v: 'build' })} />{overlay}</>
  }
  if (flow?.v === 'preview') {
    const { e, after } = flow
    return <>
      <PlanPreview entry={e} onBack={() => setFlow(after ? null : { v: 'library' })} onMaintenance={() => setMcard(true)} note={after ? after.reflection.change?.trim() || undefined : undefined}
        onStart={(startedAt) => begin(e.template
          ? { name: e.template.name, phases: phasesOf(e.template), source: 'recommended', baseTemplateId: e.template.id, startedAt }
          : { name: e.name, phases: phasesOf({ phases: (e.plan?.phases ?? []).filter((x) => !x.after) }), source: 'custom', clonedFromId: e.plan?.id, baseTemplateId: e.plan?.baseTemplateId, startedAt }, after)} />
      {overlay}
    </>
  }
  if (flow?.v === 'build') {
    const after = flow.after
    return <>
      <PlanBuilder note={after?.reflection.change?.trim() || lastRef?.change} onHideNote={() => { if (lastRef && !after?.reflection.change?.trim()) setPrefs({ planNoteHidden: lastRef.at }) }}
        onCancel={() => setFlow(after ? null : { v: 'library' })} onMaintenance={() => setMcard(true)} onOpenWorkout={setWorkout}
        onStart={(b) => begin({ name: b.name, phases: builtPhases(b), source: 'custom', startedAt: b.startedAt }, after)} />
      {overlay}
    </>
  }
  const flowPlan = flow && (flow.v === 'details' || flow.v === 'end') ? (trainingPlans || []).find((p) => p.id === flow.planId) : undefined
  if (flow?.v === 'details' && flowPlan) {
    return <><PlanDetails plan={flowPlan} onBack={() => setFlow(null)} onMaintenance={() => setMcard(true)} onChoose={() => setFlow({ v: 'end', planId: flowPlan.id, step: 2 })}
      onEditWeek={(i) => { setFlow(null); setPlanWeekAt({ planId: flowPlan.id, phase: i }) }} />{overlay}</>
  }
  if (flow?.v === 'end' && flowPlan) {
    const end = endDate(flowPlan) ?? today
    return <>
      <PlanEnd plan={flowPlan} step0={flow.step} onClose={() => setFlow(null)} onMaintenance={() => setMcard(true)}
        onPreview={(id, reflection) => { const e = entryFor(id); if (e) setFlow({ v: 'preview', e, after: { id: flowPlan.id, reflection } }) }}
        onAgain={(reflection) => begin({ name: flowPlan.name, phases: phasesOf({ phases: flowPlan.phases.filter((x) => !x.after) }), source: flowPlan.source, baseTemplateId: templateById(flowPlan.baseTemplateId)?.id, clonedFromId: flowPlan.id, startedAt: end > today ? end : today }, { id: flowPlan.id, reflection })}
        onBuild={(reflection) => setFlow({ v: 'build', after: { id: flowPlan.id, reflection } })} />
      {overlay}
    </>
  }

  const go = (to: PlanGo) => {
    switch (to.v) {
      case 'details': case 'end': setFlow({ v: to.v, planId: to.planId }); return
      case 'library': setFlow({ v: 'library' }); return
      case 'preview-suggested': {
        const best = bestFit(PLAN_TEMPLATES, fitOf(profile))
        const e = best ? entryFor(best.id) : undefined
        if (e) setFlow({ v: 'preview', e })
        return
      }
      case 'day': {
        // a tapped day with a plan running edits the week its phase trains
        const target = dayTarget({ trainingPlans }, to.d, today)
        if (target?.kind === 'schedule') setDayIdx(target.idx)
        else if (target) setPlanDay({ planId: target.planId, phase: target.phase, idx: target.idx })
        return
      }
      case 'ifthen': setEditing({ id: to.id }); return
      case 'workouts': setSheet('workouts'); return
      case 'exercises': setSheet('library'); return
    }
  }

  return (
    <>
      <PlanHome go={go} guide={guide} setGuide={setGuide} />
      {editing && <PlanEditSheet id={editing.id} onClose={() => setEditing(null)} />}
      {sheet === 'library' && <LibrarySheet onClose={() => setSheet(null)} />}
      {builderSheet}
      {sheet === 'workouts' && (
        <Sheet title="Workouts" onClose={() => setSheet(null)} left={null} right={<NavBtn bold title="Done" onPress={() => setSheet(null)} />}>
          <Lbl style={{ paddingTop: 0 }}>Ready-made</Lbl>
          <List>
            {SESSIONS.filter((x): x is WorkoutType => x !== 'Rest').map((w) => (
              <Row key={w} pv title={shortTitle(w)} sub={workoutSub(w)} onPress={() => { setSheet(null); setWorkout(w) }}
                lead={<Thumb video={firstVideo(w)} shape={w === 'Cardio' ? 'duration' : 'weight-reps'} />} />
            ))}
          </List>
          <Lbl>Yours</Lbl>
          <List>
            {mine.map((r) => (
              <Row key={r.id} pv title={r.name} sub={routineLine(r, routines, profile.training, ONBOARDING_ENABLED)} onPress={() => { setSheet(null); setWorkout(r.id) }}
                lead={<Thumb video={keyVideo(r.id, routines)} shape={r.modality === 'cardio' ? 'duration' : 'weight-reps'} />} />
            ))}
            {build && <Row act icon="plus" title="Build a workout" onPress={() => setBuilder({})} />}
          </List>
          <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>Build your own from the library, or copy a ready-made one and change it.</Foot>
        </Sheet>
      )}
    </>
  )
}
