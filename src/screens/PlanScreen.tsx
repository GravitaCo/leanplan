import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { SESSIONS, WORKOUTS, LIFTS } from '@/core/data/workouts'
import { EXERCISES } from '@/core/data/exercises'
import { WEEK_ORDER, plannedOn, shortTitle, weekWarnings } from '@/core/domain/week'
import { DAY_NAME, fmtDate, todayStr } from '@/core/domain/date'
import { activePlan, planWeekNotes, positionOn, upcomingPlan, weekSource } from '@/core/domain/plans'
import { PlanEditorSheet, PlanEndSheet, PlanStartSheet, type PlanDraft } from './plan/TrainingPlanSheets'
import { PlanDayView, PlanWeekView } from './plan/PlanDayViews'
import { LibrarySheet } from './train/LibrarySheet'
import { Thumb } from './train/Thumb'
import { DayView, WorkoutView, workoutSub } from './plan/PlanViews'
import { firstVideo } from '@/core/data/workouts'
import { PageHeader, Sheet } from '@/ui/primitives'
import { Icon, Chevron, type IconName } from '@/ui/icons'
import { PlanEditSheet, PLAN_OUTCOME } from './plan/PlanSheets'
import { RoutineBuilderSheet, type BuilderStart } from './train/RoutineBuilderSheet'
import { aboutMins, builtinSlots, canBuild, isBuiltinKey, keyTitle, keyVideo, routineFor, slotsOf as routineSlots, type WorkoutKey } from '@/core/domain/routines'
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
  const [sheet, setSheet] = useState<null | 'workouts' | 'library' | 'start' | 'end'>(null)
  // the weekly plan (P5): being edited or started, and at which week (a tapped day)
  const [draft, setDraft] = useState<{ d: PlanDraft } | null>(null)
  // a plan's week (a phase, from the editor) and one of its days (Flow 3, as for the one-workout week)
  const [planWeekAt, setPlanWeekAt] = useState<number | null>(null)
  const [planDay, setPlanDay] = useState<{ phase: number; idx: number } | null>(null)
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
  useEffect(() => { window.scrollTo(0, 0) }, [dayIdx, workout, planDay, planWeekAt])
  // one of the user's own workouts removed (archived) while open: back to the plan
  const gone = !!workout && !isBuiltinKey(workout) && !mine.some((r) => r.id === workout)
  useEffect(() => { if (gone && !builder) setWorkout(null) }, [gone, builder])

  const builderSheet = builder && (
    <RoutineBuilderSheet start={builder} onClose={() => setBuilder(null)} onSaved={(id) => { setBuilder(null); setSheet(null); setWorkout(id) }} />
  )
  if (workout && !gone) {
    const own = routineFor(workout, routines)
    return (
      <>
        <WorkoutView type={workout} onBack={() => setWorkout(null)}
          onEdit={own && build ? () => setBuilder({ routine: own }) : undefined}
          onCopy={!own && build && LIFTS.includes(workout as WorkoutType)
            ? () => setBuilder({ name: 'My ' + shortTitle(workout), slots: builtinSlots(workout as WorkoutType), baseId: 'builtin-' + workout }) : undefined} />
        {builderSheet}
      </>
    )
  }
  if (planDay && active) {
    return <PlanDayView planId={active.id} phaseIndex={planDay.phase} idx={planDay.idx} backLabel={planWeekAt != null ? active.phases[planWeekAt]?.name ?? 'Week' : 'My week'}
      onBack={() => setPlanDay(null)} onOpenWorkout={setWorkout} />
  }
  if (planWeekAt != null && active) {
    return <PlanWeekView planId={active.id} phaseIndex={planWeekAt} onBack={() => setPlanWeekAt(null)} onDay={(idx) => setPlanDay({ phase: planWeekAt, idx })} />
  }
  if (dayIdx != null && !pos) return <DayView idx={dayIdx} onBack={() => setDayIdx(null)} onOpenWorkout={setWorkout} />

  const vals = WEEK_ORDER.map((d) => plannedOn(schedule, d))
  const lifts = vals.filter((v) => LIFTS.includes(v as WorkoutType)).length
  const cardio = vals.filter((v) => v === 'Cardio').length
  const rest = vals.filter((v) => v === 'Rest').length
  const ppl = LIFTS.every((l) => vals.includes(l))
  const warns = pos ? planWeekNotes(pos.planWeek, routines).map((text) => ({ text })) : weekWarnings(schedule)
  // a tapped day with a plan running edits the week this phase trains (a lighter phase's comes from its build phase)
  const editDay = (d: number) => {
    // no plan running yet (none, or one starting later): this week's schedule, as before
    if (!active || !pos) { setDayIdx(d); return }
    const src = weekSource(active, pos.phaseIndex)
    if (src >= 0) setPlanDay({ phase: src, idx: d })
  }
  const planSheets = (
    <>
      {sheet === 'start' && <PlanStartSheet onClose={() => setSheet(null)} onDraft={(d) => { setSheet(null); setDraft({ d }) }} />}
      {sheet === 'end' && active && <PlanEndSheet plan={active} onClose={() => setSheet(null)} onDraft={(d) => { setSheet(null); setDraft({ d }) }} />}
      {draft && <PlanEditorSheet draft={draft.d} onClose={() => setDraft(null)} onEditWeek={(i) => { setDraft(null); setPlanWeekAt(i) }} />}
    </>
  )
  const n = (k: number, one: string, many = one + 's') => `${k} ${k === 1 ? one : many}`

  return (
    <div className="screen">
      <PageHeader title="Plan" />

      {active ? (
        <div className="plancard">
          <div className="k">Your plan</div>
          <div className="t">{active.name}</div>
          <div className="pc-f">
            <span className="s num">{!pos
              ? `Starts ${fmtDate(active.startedAt!).dow}`
              : pos.ended ? `Finished · ${pos.total} weeks`
              : `Week ${pos.week} of ${pos.total} · ${pos.maintain ? 'Lighter week' : pos.phase.name}`}</span>
            <button className="linkbtn inl" onClick={() => setDraft({ d: { planId: active.id } })}>Edit</button>
          </div>
        </div>
      ) : (
        <div className="plancard">
          <div className="k">Your week</div>
          <div className="t">{ppl ? 'Push / Pull / Legs' : 'Your week'}</div>
          <div className="pc-f">
            <span className="s">{[n(lifts, 'lift'), cardio ? `${cardio} cardio` : '', n(rest, 'rest day')].filter(Boolean).join(' · ')}</span>
            <button className="linkbtn inl" onClick={() => setGuide('split')}>About</button>
          </div>
        </div>
      )}
      {next && (
        <div className="list">
          <button className="li" onClick={() => setDraft({ d: { planId: next.id } })}>
            <div className="m"><div className="t">Next: {next.name}</div><div className="s">Starts {fmtDate(next.startedAt!).dow}. Until then, this week carries on.</div></div>
            <Chevron />
          </button>
        </div>
      )}
      {pos?.ended && !next && (
        <div className="card dayopt">
          <div className="t">You've reached the end of {active!.name}.</div>
          <div className="foot" style={{ padding: '0 0 10px' }}>When you're ready, you can look back and choose what's next. Until then, your week carries on as it is.</div>
          <div className="chips"><button className="chip" onClick={() => setSheet('end')}>See what's next</button></div>
        </div>
      )}
      {pos?.maintain && (
        <div className="foot" style={{ padding: '8px 4px 0' }}>Lighter weeks: the same workouts, opening on the shorter version. The full one is always there if you feel like it.</div>
      )}

      <h2 className="grp-h">This week</h2>
      <div className="list wk">
        {WEEK_ORDER.map((d) => {
          const isToday = d === todayIdx
          if (pos) {
            const keys = (pos.planWeek[d] || []).filter((k) => isBuiltinKey(k) || mine.some((r) => r.id === k))
            const names = keys.map((k) => keyTitle(k, routines))
            return (
              <button className={'li wk-row' + (isToday ? ' today' : '')} key={d} onClick={() => editDay(d)} aria-label={`${DAY_NAME[d]}: ${names.length ? names.join(' and ') : 'Rest'}${isToday ? ', today' : ''}`}>
                <span className="dd">{DAY_NAME[d].slice(0, 3)}</span>
                {keys.length === 0 ? (
                  <div className="m"><div className="t muted">Rest · recovery counts too</div></div>
                ) : (
                  <div className="m">
                    <div className="t">{names.join(' + ')}</div>
                    {isToday && <div className="s">{pos.maintain ? 'Today · lighter' : 'Today'}</div>}
                  </div>
                )}
                {keys.length > 0 && (keys[0] === 'Cardio' ? <span className="cdot" aria-hidden="true" /> : <Thumb video={keyVideo(keys[0], routines)} />)}
              </button>
            )
          }
          const v = plannedOn(schedule, d)
          const today = isToday
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
      {warns.map((w) => <div className="card plan-note" key={w.text}>{w.text}</div>)}
      <div className="foot">
        {pos ? <>Tap a day to change this phase's week. </> : <>Tap a day to change it. Changes repeat every week. </>}Aim for three lifts a week with a rest day between where you can.
        Legs, then Push, then Pull means back-to-back sessions train different muscles. Daily steps burn more across a
        week than the gym sessions do.
      </div>

      {!active && (
        <div className="list">
          <button className="li act" onClick={() => setSheet('start')}><Icon name="plus" size={17} /><span>Start a plan</span></button>
        </div>
      )}

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
      {planSheets}
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
