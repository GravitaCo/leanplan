import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { SESSIONS, WORKOUTS, LIFTS } from '@/core/data/workouts'
import { EXERCISES } from '@/core/data/exercises'
import { WEEK_ORDER, plannedOn, shortTitle, weekWarnings } from '@/core/domain/week'
import { DAY_NAME, shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import { activePlan, bestFit, catalogue, fitOf, isEaseIn, endDate, phaseRows, phasesOf, planWeekNotes, positionOn, PLAN_TEMPLATES, templateById, timeline, totalWeeks, upcomingPlan, weekSource, type CatalogueEntry } from '@/core/domain/plans'
import { planArt, PlanTile, Timeline, WeekRows } from './plan/PlanParts'
import { MaintenanceCard, PlanLibrary, PlanPreview } from './plan/PlanLibrary'
import { PlanBuilder, builtPhases } from './plan/PlanBuilder'
import { PlanDetails, PlanEnd } from './plan/PlanDetails'
import { PlanDayView, PlanWeekView } from './plan/PlanDayViews'
import { LibrarySheet } from './train/LibrarySheet'
import { Thumb } from './train/Thumb'
import { DayView, WorkoutView, workoutSub } from './plan/PlanViews'
import { firstVideo } from '@/core/data/workouts'
import { PageHeader, Sheet } from '@/ui/primitives'
import { Icon, Chevron, type IconName } from '@/ui/icons'
import { PlanEditSheet, PLAN_OUTCOME } from './plan/PlanSheets'
import { RoutineBuilderSheet, type BuilderStart } from './train/RoutineBuilderSheet'
import { aboutMins, builtinSlots, canBuild, isBuiltinKey, isTaliKey, keyVideo, routineFor, slotsOf as routineSlots, type WorkoutKey } from '@/core/domain/routines'
import { MODALITY_LABEL } from '@/core/data/modalities'

type Guide = 'split' | 'basics'
const GUIDES: { id: Guide; title: string; icon: IconName; color: string }[] = [
  { id: 'split', title: 'How the split works', icon: 'dumbbell', color: 'var(--activity)' },
  { id: 'basics', title: 'The honest basics', icon: 'info', color: 'var(--mind)' },
]

export function PlanScreen() {
  const schedule = useStore((s) => s.data.schedule)
  const plans = useStore((s) => s.data.profile.plans) ?? []
  const planOpen = useStore((s) => s.planOpen)
  const clearOpen = useStore((s) => s.clearOpen)
  const [editing, setEditing] = useState<{ id?: string } | null>(null)
  const [guide, setGuide] = useState<Guide | null>(null)
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  // a built-in's type or the id of one of the user's own workouts (plan P4)
  const [workout, setWorkout] = useState<WorkoutKey | null>(null)
  const [builder, setBuilder] = useState<BuilderStart | null>(null)
  const routines = useStore((s) => s.data.routines)
  const profile = useStore((s) => s.data.profile)
  const mine = (routines || []).filter((r) => !r.archived)
  const build = canBuild(profile)
  const [sheet, setSheet] = useState<null | 'workouts' | 'library'>(null)
  // the plans screens (design canvas, Plans 1 to 4); `after` is the plan that just ended, with its look back
  type After = { id: string; reflection: { good?: string; change?: string } }
  const [flow, setFlow] = useState<
    | { v: 'library' } | { v: 'preview'; e: CatalogueEntry; after?: After } | { v: 'build'; after?: After }
    | { v: 'details'; planId: string } | { v: 'end'; planId: string; step?: 1 | 2 } | null>(null)
  const [mcard, setMcard] = useState(false)
  const startPlan = useStore((s) => s.startPlan)
  const finishPlan = useStore((s) => s.finishPlan)
  const notePlan = useStore((s) => s.notePlan)
  // a plan's week (a phase, from the editor) and one of its days (Flow 3, as for the one-workout week)
  // each carries its plan: the running one, or the next one waiting to start
  const [planWeekAt, setPlanWeekAt] = useState<{ planId: string; phase: number } | null>(null)
  const [planDay, setPlanDay] = useState<{ planId: string; phase: number; idx: number } | null>(null)
  const trainingPlans = useStore((s) => s.data.trainingPlans)
  const today = todayStr()
  const active = activePlan({ trainingPlans }, today)
  const pos = active ? positionOn(active, today) : null
  // the next plan, chosen at the end of this one, waiting for its start day
  const next = upcomingPlan({ trainingPlans }, today)
  const todayIdx = new Date().getDay()

  // Train's "Edit <workout> in Plan" opens that workout here
  useEffect(() => {
    if (!planOpen) return
    setWorkout(planOpen); setDayIdx(null); clearOpen()
  }, [planOpen, clearOpen])
  useEffect(() => { window.scrollTo(0, 0) }, [dayIdx, workout, planDay, planWeekAt, flow])
  // one of the user's own workouts removed (archived) while open: back to the plan
  const gone = !!workout && !isBuiltinKey(workout) && !isTaliKey(workout) && !mine.some((r) => r.id === workout)
  useEffect(() => { if (gone && !builder) setWorkout(null) }, [gone, builder])

  const builderSheet = builder && (
    <RoutineBuilderSheet start={builder} onClose={() => setBuilder(null)} onSaved={(id) => { setBuilder(null); setSheet(null); setWorkout(id) }} />
  )
  if (workout && !gone) {
    const r = routineFor(workout, routines)
    // Tali's plan workouts copy like the built-in cards; only the person's own are edited in place
    const own = r && r.source === 'custom' ? r : undefined
    return (
      <>
        <WorkoutView type={workout} onBack={() => setWorkout(null)}
          onEdit={own && build ? () => setBuilder({ routine: own }) : undefined}
          onCopy={!build ? undefined
            : r && !own ? () => setBuilder({ name: 'My ' + r.name, slots: routineSlots(r), baseId: r.id })
            : !r && LIFTS.includes(workout as WorkoutType) ? () => setBuilder({ name: 'My ' + shortTitle(workout), slots: builtinSlots(workout as WorkoutType), baseId: 'builtin-' + workout }) : undefined} />
        {builderSheet}
      </>
    )
  }
  const planOf = (id: string) => (trainingPlans || []).find((p) => p.id === id && p.phases.length)
  if (planDay && planOf(planDay.planId)) {
    const wk = planWeekAt ? planOf(planWeekAt.planId)?.phases[planWeekAt.phase]?.name : undefined
    return <PlanDayView planId={planDay.planId} phaseIndex={planDay.phase} idx={planDay.idx} backLabel={wk ?? 'My week'}
      onBack={() => setPlanDay(null)} onOpenWorkout={setWorkout} />
  }
  if (planWeekAt && planOf(planWeekAt.planId)) {
    return <PlanWeekView planId={planWeekAt.planId} phaseIndex={planWeekAt.phase} onBack={() => setPlanWeekAt(null)}
      onDay={(idx) => setPlanDay({ planId: planWeekAt.planId, phase: planWeekAt.phase, idx })} />
  }
  if (dayIdx != null && !pos) return <DayView idx={dayIdx} onBack={() => setDayIdx(null)} onOpenWorkout={setWorkout} />

  const warns = pos ? planWeekNotes(pos.planWeek, routines).map((text) => ({ text })) : weekWarnings(schedule)
  // a tapped day with a plan running edits the week this phase trains (a lighter phase's comes from its build phase)
  const editDay = (d: number) => {
    // no plan running yet (none, or one starting later): this week's schedule, as before
    if (!active || !pos) { setDayIdx(d); return }
    const src = weekSource(active, pos.phaseIndex)
    if (src >= 0) setPlanDay({ planId: active.id, phase: src, idx: d })
  }
  const dayLabel = shortDateOf
  const suggested = bestFit(PLAN_TEMPLATES, fitOf(profile))
  // the card's line: the next lighter week, or maintenance check-ins at about 8 and 12 weeks
  const nextLighter = active && pos && !pos.ended ? phaseRows(active, today).find((r) => r.kind === 'lighter' && r.from > pos.week) : undefined
  const planLine = !active || !pos ? null
    : pos.maintenanceWeek != null
      ? pos.maintenanceWeek >= 12 ? "About 12 weeks holding steady. When you'd like something new, choose a plan in Plan details."
        : pos.maintenanceWeek >= 8 ? 'About 8 weeks holding steady. Carry on as long as you like.'
        : 'Your workouts open on the shorter version. Lift the same weights as before.'
      : nextLighter && active.startedAt ? `Lighter week: week ${nextLighter.from}, from ${dayLabel(shiftDay(active.startedAt, (nextLighter.from - 1) * 7))}.`
      : pos.maintain ? (isEaseIn(active, pos.phaseIndex) ? 'Easing in: shorter sessions while you find your weights.' : 'A lighter week: workouts open on the shorter version.') : null
  // start a plan from a preview, a run-again or a build; the plan that ended keeps going until the new one starts
  const begin = (input: Parameters<typeof startPlan>[0], after?: After) => {
    if (after) { if ((input.startedAt ?? today) <= today) finishPlan(after.id, after.reflection); else notePlan(after.id, after.reflection) }
    startPlan(input)
    setFlow(null)
  }
  const overlay = mcard && <MaintenanceCard onClose={() => setMcard(false)} />
  const lastNote = (trainingPlans || []).filter((p) => p.reflection?.change).sort((a, b) => (b.reflection!.at > a.reflection!.at ? 1 : -1))[0]?.reflection?.change
  if (flow?.v === 'library') {
    return <>{<PlanLibrary onBack={() => setFlow(null)} onOpen={(e) => setFlow({ v: 'preview', e })} onNew={() => setFlow({ v: 'build' })} />}{overlay}</>
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
      <PlanBuilder note={after?.reflection.change?.trim() || lastNote} onCancel={() => setFlow(after ? null : { v: 'library' })} onMaintenance={() => setMcard(true)} onOpenWorkout={setWorkout}
        onStart={(b) => begin({ name: b.name, phases: builtPhases(b), source: 'custom', startedAt: b.startedAt }, after)} />
      {overlay}
    </>
  }
  const flowPlan = flow && (flow.v === 'details' || flow.v === 'end') ? (trainingPlans || []).find((p) => p.id === flow.planId) : undefined
  if (flow?.v === 'details' && flowPlan) {
    return <><PlanDetails plan={flowPlan} onBack={() => setFlow(null)} onMaintenance={() => setMcard(true)} onChoose={() => setFlow({ v: 'end', planId: flowPlan.id, step: 2 })} onEditWeek={(i) => { setFlow(null); setPlanWeekAt({ planId: flowPlan.id, phase: i }) }} />{overlay}</>
  }
  if (flow?.v === 'end' && flowPlan) {
    const end = endDate(flowPlan) ?? today
    return <>
      <PlanEnd plan={flowPlan} step0={flow.step} onClose={() => setFlow(null)} onMaintenance={() => setMcard(true)}
        onPreview={(id, reflection) => { const e = catalogue({ trainingPlans }, fitOf(profile)).find((x) => x.key === id); if (e) setFlow({ v: 'preview', e, after: { id: flowPlan.id, reflection } }) }}
        onAgain={(reflection) => begin({ name: flowPlan.name, phases: phasesOf({ phases: flowPlan.phases.filter((x) => !x.after) }), source: flowPlan.source, baseTemplateId: templateById(flowPlan.baseTemplateId)?.id, clonedFromId: flowPlan.id, startedAt: end > today ? end : today }, { id: flowPlan.id, reflection })}
        onBuild={(reflection) => setFlow({ v: 'build', after: { id: flowPlan.id, reflection } })} />
      {overlay}
    </>
  }

  return (
    <div className="screen">
      <PageHeader title="Plan" />

      {!active && (
        <>
          <div className="sub" style={{ margin: '-4px 0 16px' }}>No plan running. Your week below repeats until you choose one.</div>
          {suggested && (
            <>
              <h2 className="grp-h sm">Suggested for your goal</h2>
              <div style={{ marginBottom: 12 }}>
                <PlanTile name={suggested.name} line={suggested.tagline} art={planArt(suggested.id)} fits big
                  onClick={() => setFlow({ v: 'preview', e: catalogue({ trainingPlans }, fitOf(profile)).find((x) => x.key === suggested.id)! })} />
              </div>
            </>
          )}
          <button className="btn gray pl-browse" onClick={() => setFlow({ v: 'library' })}>Browse all plans</button>
        </>
      )}
      {active && (
        <button className="card pl-card" onClick={() => setFlow(pos?.ended && !pos.maintenanceWeek && !next ? { v: 'end', planId: active.id } : { v: 'details', planId: active.id })}>
          <span className="pl-top">
            {planArt(active.baseTemplateId) ? <img src={planArt(active.baseTemplateId)} alt="" /> : <span className="pl-dot" aria-hidden="true" />}
            <span className="m"><span className="k">Your plan</span><span className="t">{active.name}</span></span>
            <Chevron />
          </span>
          <span className="pl-body">
            {!pos ? (
              <span className="pl-big"><span className="num b">Starts</span><span className="num s">{shortDateOf(active.startedAt!)} · {totalWeeks(active)} weeks</span></span>
            ) : pos.maintenanceWeek != null ? (
              <span className="pl-big"><span className="num b">Maintenance</span><span className="num s">week {pos.maintenanceWeek}</span></span>
            ) : pos.ended ? (
              <span className="pl-big"><span className="num b">{pos.total} weeks</span><span className="num s">done</span></span>
            ) : (
              <span className="pl-big"><span className="num b">Week {pos.week}</span><span className="num s">of {pos.total} · {pos.phase.name}</span></span>
            )}
            <Timeline cells={timeline(active, today)} endLabel={`Week ${totalWeeks(active)}`} />
            {planLine && <span className="pl-note">{planLine}</span>}
          </span>
        </button>
      )}
      {pos?.ended && !pos.maintenanceWeek && !next && active && (
        <div className="card dayopt">
          <div className="t">You've reached the end of {active.name}.</div>
          <div className="foot" style={{ padding: '0 0 10px' }}>When you're ready, you can look back and choose what's next. Until then, your week carries on as it is.</div>
          <div className="chips"><button className="chip" onClick={() => setFlow({ v: 'end', planId: active.id })}>See what's next</button></div>
        </div>
      )}
      {next && (
        <div className="list">
          <button className="li" onClick={() => setFlow({ v: 'details', planId: next.id })}>
            <div className="m"><div className="t">Next: {next.name}</div><div className="s">Starts {shortDateOf(next.startedAt!)}. Until then, this week carries on.</div></div>
            <Chevron />
          </button>
        </div>
      )}

      <h2 className="grp-h">This week</h2>
      {pos ? (
        <WeekRows week={pos.planWeek} routines={routines} todayIdx={todayIdx} todayNote={pos.maintain ? 'Today · shorter' : 'Today'} onDay={editDay} />
      ) : (
        <div className="list wk">
          {WEEK_ORDER.map((d) => {
            const v = plannedOn(schedule, d)
            const today = d === todayIdx
            return (
              <button className={'li wk-row' + (today ? ' today' : '')} key={d} onClick={() => editDay(d)} aria-label={`${DAY_NAME[d]}: ${v === 'Rest' ? 'Rest' : shortTitle(v)}${today ? ', today' : ''}`}>
                <span className="dd">{DAY_NAME[d].slice(0, 3)}</span>
                {v === 'Rest' ? (
                  <div className="m"><div className="t muted">Rest · recovery counts too</div></div>
                ) : (
                  <div className="m">
                    <div className="t">{shortTitle(v)}</div>
                    {(v !== 'Cardio' || today) && <div className="s">{[v !== 'Cardio' ? `${WORKOUTS[v].ex.length} exercises` : '', today ? 'Today' : ''].filter(Boolean).join(' · ')}</div>}
                  </div>
                )}
                {v !== 'Rest' && v !== 'Cardio' && <Thumb video={firstVideo(v)} />}
                {v === 'Cardio' && <span className="cdot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
      {warns.map((w) => <div className="card plan-note" key={w.text}>{w.text}</div>)}
      <div className="foot">
        {pos ? <>Tap a day to change this phase's week. Daily steps burn more across a week than the gym sessions do.</> : <>Tap a day to change it. Changes repeat every week. Aim for three lifts a week with a rest day between where you can.
        Legs, then Push, then Pull means back-to-back sessions train different muscles. Daily steps burn more across a
        week than the gym sessions do.</>}
      </div>

      <div className="tiles plantiles">
        <button className="tile st" onClick={() => setSheet('workouts')}>
          <span className="v num">{SESSIONS.length - 1 + mine.length}</span><span className="tt">Workouts</span>
        </button>
        <button className="tile st" onClick={() => setSheet('library')}>
          <span className="v num">{EXERCISES.length}</span><span className="tt">Exercise library</span>
        </button>
      </div>

      <div className="grp-h"><span>If–then plans</span></div>
      <div className="list">
        {plans.map((pl) => {
          const lr = pl.reviews.length ? pl.reviews[pl.reviews.length - 1] : null
          return (
            <button className="li" key={pl.id} onClick={() => setEditing({ id: pl.id })}>
              <div className="m"><div className="t">When {pl.when}</div>
                <div className="s">I'll {pl.then}{lr ? ` · ${PLAN_OUTCOME[lr.r]}` : ''}</div>
                {pl.cope && <div className="s">Backup: {pl.cope}</div>}</div>
              <Chevron />
            </button>
          )
        })}
        <button className="li act" onClick={() => setEditing({})}><Icon name="plus" size={17} /><span>New plan</span></button>
      </div>
      <div className="foot">
        Pick a moment that trips you up and decide ahead of time what you'll do. For example: when I get home hungry, I'll have
        yoghurt before I cook. We'll check in weekly, because the follow-up is what makes plans stick.
      </div>

      <div className="grp-h"><span>Guides</span></div>
      <div className="list icons">
        {GUIDES.map((g) => (
          <button className="li" key={g.id} onClick={() => setGuide(g.id)}>
            <span className="ico" style={{ background: g.color }}><Icon name={g.icon} size={18} /></span>
            <div className="m"><div className="t">{g.title}</div></div><Chevron />
          </button>
        ))}
      </div>

      {editing && <PlanEditSheet id={editing.id} onClose={() => setEditing(null)} />}
      {guide && (
        <Sheet title={GUIDES.find((g) => g.id === guide)!.title} tall left={null} onClose={() => setGuide(null)}
          right={<button className="navbtn b" onClick={() => setGuide(null)}>Done</button>}>
          <GuideBody id={guide} />
        </Sheet>
      )}
      {sheet === 'library' && <LibrarySheet onClose={() => setSheet(null)} />}
      {builderSheet}
      {sheet === 'workouts' && (
        <Sheet title="Workouts" onClose={() => setSheet(null)} left={null} right={<button className="navbtn b" onClick={() => setSheet(null)}>Done</button>}>
          <div className="lbl" style={{ paddingTop: 0 }}>Ready-made</div>
          <div className="list">
            {SESSIONS.filter((x): x is WorkoutType => x !== 'Rest').map((t) => (
              <button className="li pv-row" key={t} onClick={() => { setSheet(null); setWorkout(t) }}>
                <Thumb video={firstVideo(t)} shape={t === 'Cardio' ? 'duration' : 'weight-reps'} />
                <div className="m"><div className="t">{shortTitle(t)}</div><div className="s num">{workoutSub(t)}</div></div>
                <Chevron />
              </button>
            ))}
          </div>
          <div className="lbl">Yours</div>
          <div className="list">
            {mine.map((r) => (
              <button className="li pv-row" key={r.id} onClick={() => { setSheet(null); setWorkout(r.id) }}>
                <Thumb video={keyVideo(r.id, routines)} shape={r.modality === 'cardio' ? 'duration' : 'weight-reps'} />
                <div className="m"><div className="t">{r.name}</div>
                  <div className="s num">{[MODALITY_LABEL[r.modality], `${routineSlots(r).length} ${routineSlots(r).length === 1 ? 'exercise' : 'exercises'}`, r.estMins ? `about ${aboutMins(r.estMins)} min` : ''].filter(Boolean).join(' · ')}</div></div>
                <Chevron />
              </button>
            ))}
            {build && (
              <button className="li act" onClick={() => setBuilder({})}><Icon name="plus" size={17} /><span>Build a workout</span></button>
            )}
          </div>
          <div className="foot" style={{ padding: '4px 4px 0' }}>Build your own from the library, or copy a ready-made one and change it.</div>
        </Sheet>
      )}
    </div>
  )
}

function GuideBody({ id }: { id: Guide }) {
  if (id === 'split') return (
    <div className="prose">
      <p>Lifts work best in the order <b>Legs → Push → Pull</b> so back-to-back sessions hit different muscles.</p>
      <p><b>Legs &amp; Core:</b> squats, Romanian deadlifts, leg extensions, calves and core.</p>
      <p><b>Push:</b> chest, shoulders, triceps.</p>
      <p><b>Pull:</b> back, rear delts, biceps.</p>
    </div>
  )
  return (
    <div className="prose">
      <p><b>You can't spot-reduce.</b> Fat comes off the whole body when you eat a little less than you burn. The belly is often one of the last places to change.</p>
      <p><b>Food does most of the work.</b> Training helps and protects muscle, but a steady, modest deficit is what moves body fat.</p>
      <p><b>Averages beat single days.</b> One high day doesn't undo a good week. Look at the weekly view, not the daily number.</p>
      <p><b>Estimates are fine.</b> People logging carefully still miss 20% or more. Being consistently roughly right beats being occasionally precise.</p>
      <p><b>Feeling sick with exercise?</b> Keep effort moderate, stop two or three reps short of failure, and eat a small snack 30–45 minutes before. If nausea is severe, stop and see a GP. For chest pain or feeling faint, follow the stop signs on the workout screen.</p>
      <p className="muted">General information, not medical advice.</p>
    </div>
  )
}
