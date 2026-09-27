import { useState } from 'react'
import { useStore } from '@/store/store'
import type { PlanWeek } from '@/core/types'
import { shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import { copyWeek, MAX_PHASE_WEEKS, newPhaseId, timeline, trainingDays, weekFromSchedule } from '@/core/domain/plans'
import { type WorkoutKey } from '@/core/domain/routines'
import { WEEK_ORDER } from '@/core/domain/week'
import { Icon, Chevron } from '@/ui/icons'
import { Timeline, WeekRows } from './PlanParts'
import { DayEditor } from './PlanDayViews'
import { StartChoice } from './PlanLibrary'

export interface BuiltPlan { name: string; weeks: number; week: PlanWeek; startedAt: string }

/**
 * Build your own plan in three steps, one question each (design canvas, Plans 2): how long, what
 * the week looks like (Flow 3's day page), when to start. Nothing is kept until it starts.
 */
export function PlanBuilder({ onCancel, onStart, onMaintenance, onOpenWorkout, note }: {
  onCancel: () => void
  onStart: (p: BuiltPlan) => void
  onMaintenance: () => void
  onOpenWorkout: (k: WorkoutKey) => void
  /** the last plan's "do differently", shown while setting up the next */
  note?: string
}) {
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
  const setLen = (n: number) => {
    const w = Math.max(1, Math.min(MAX_PHASE_WEEKS, n))
    setWeeks(w)
    if (!named) setName(`My ${w}-week plan`)
  }
  const cells = timeline({ phases: [{ id: 'x', name: 'Build', weeks, week }] })
  const workouts = WEEK_ORDER.reduce((a, d) => a + (week[d] || []).length, 0)
  const rest = 7 - trainingDays(week)
  const fromSchedule = weekFromSchedule(schedule)
  const empty = workouts === 0

  if (day != null) {
    return <DayEditor week={week} idx={day} phaseName="the plan" backLabel="Your week" onBack={() => setDay(null)} onOpenWorkout={onOpenWorkout}
      change={(next) => setWeek(next)} />
  }

  const head = (
    <>
      <div className="pb-top">
        {step === 1 ? <button className="navbtn" onClick={onCancel}>Cancel</button> : <button className="navbtn" onClick={() => setStep(step - 1)}><Icon name="chevL" size={20} stroke={2.6} />Back</button>}
        <span className="num foot" style={{ padding: 0 }}>{step} of 3</span>
      </div>
      <div className="pb-steps" aria-label={`Step ${step} of 3`}>{[1, 2, 3].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
    </>
  )

  if (step === 1) {
    return (
      <div className="screen pb">
        {head}
        <h1 className="pb-h">How long?</h1>
        {note && noteShown && (
          <div className="card plan-note pw-last">
            <span>From your last plan: “{note}”</span>
            <button className="x-btn" aria-label="Hide this note" onClick={() => setNoteShown(false)}><Icon name="x" size={14} stroke={2.6} /></button>
          </div>
        )}
        <label className="card pb-name"><span className="pb-k">Name</span>
          <input value={name} maxLength={120} onChange={(e) => { setName(e.target.value); setNamed(true) }} /></label>
        <div className="card pb-len">
          <span className="t">Plan length</span>
          <button className="pb-step" aria-label="Fewer weeks" onClick={() => setLen(weeks - 1)}>−</button>
          <span className="num pb-n">{weeks}<small> {weeks === 1 ? 'week' : 'weeks'}</small></span>
          <button className="pb-step" aria-label="More weeks" onClick={() => setLen(weeks + 1)}>+</button>
        </div>
        <div style={{ padding: '4px 4px 16px' }}><Timeline cells={cells} /></div>
        <div className="list">
          <button className="li" onClick={onMaintenance}>
            <span className="catsq sm" style={{ background: 'var(--fill)' }} aria-hidden="true" />
            <div className="m"><div className="t">When it ends: maintenance, if you choose it</div><div className="s">The same workouts with fewer sets, to keep what you built. Read how it works</div></div>
            <Chevron />
          </button>
        </div>
        <div className="foot" style={{ padding: '0 4px' }}>Most plans run 6 to 12 weeks. You can add a lighter week later in Plan details, and an easier first week until the plan starts.</div>
        <div className="pl-cta"><button className="btn" onClick={() => setStep(2)}>Next: your week</button></div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="screen pb">
        {head}
        <h1 className="pb-h">Your week</h1>
        {empty && trainingDays(fromSchedule) > 0 && (
          <div className="card pb-copy">
            <span>Start from the week you have now?</span>
            <button className="linkbtn" onClick={() => setWeek(copyWeek(fromSchedule))}>Copy it</button>
          </div>
        )}
        <WeekRows week={week} routines={routines} onDay={setDay} emptyAdd />
        <div className="foot" style={{ padding: '0 4px' }}>Tap a day to add a workout, several on one day if you like. Empty days are rest days.</div>
        {!empty && rest === 0 && <div className="card plan-note">No rest days in this week. Most plans keep at least one, because recovery is when training pays off.</div>}
        <div className="pl-cta">
          <div className="foot num" style={{ textAlign: 'center', padding: 0 }}>{workouts} {workouts === 1 ? 'workout' : 'workouts'} · {rest} rest {rest === 1 ? 'day' : 'days'}</div>
          <button className="btn" disabled={empty} onClick={() => setStep(3)}>Next: when to start</button>
        </div>
      </div>
    )
  }

  const end = shiftDay(start, weeks * 7 - 1)
  return (
    <div className="screen pb">
      {head}
      <h1 className="pb-h">Ready to start</h1>
      <section className="card pp-weeks">
        <div><div className="pb-title">{name.trim() || 'My plan'}</div>
          <div className="foot num" style={{ padding: 0 }}>{weeks} {weeks === 1 ? 'week' : 'weeks'} · {workouts} {workouts === 1 ? 'workout' : 'workouts'} a week</div></div>
        <Timeline cells={cells} />
      </section>
      <StartChoice value={start} onChange={setStart} />
      <div className="foot" style={{ padding: '12px 4px 0' }}>Ends {shortDateOf(end)}. Week 1 is the first 7 days from the start. When it ends, you can choose maintenance.</div>
      <div className="pl-cta"><button className="btn" onClick={() => onStart({ name: name.trim() || 'My plan', weeks, week, startedAt: start })}>Start plan</button></div>
    </div>
  )
}

/** The phases a built plan starts with: one build phase (easier or lighter weeks come later, in Plan details). */
export const builtPhases = (p: BuiltPlan) => [{ id: newPhaseId(), name: 'Build', weeks: p.weeks, week: copyWeek(p.week) }]
