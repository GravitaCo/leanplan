import { useState } from 'react'
import { useStore } from '@/store/store'
import type { PlanPhase, PlanWeek } from '@/core/types'
import { DAY_NAME } from '@/core/domain/date'
import { WEEK_ORDER } from '@/core/domain/week'
import { keyTitle, keyVideo, routineFor, isBuiltinKey, slotsOf as routineSlots, aboutMins, type WorkoutKey } from '@/core/domain/routines'
import { copyWeek, planWeekNotes } from '@/core/domain/plans'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { BackButton, Sheet } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { Thumb } from '../train/Thumb'
import { AddWorkoutSheet, workoutSub } from './PlanViews'
import type { WorkoutType } from '@/core/types'

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
      <div className="list">
        {WEEK_ORDER.filter((d) => d !== idx).map((d) => {
          const keys = known(week[d], routines)
          return (
            <button className="li" key={d} onClick={() => onPick(d)}>
              <div className="m"><div className="t">{DAY_NAME[d]}</div><div className="s">{keys.length ? keys.map((k) => keyTitle(k, routines)).join(' + ') : 'Rest'}</div></div>
              <Chevron />
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/**
 * One weekday of a plan's week (Flow 3 on the design canvas): what's on it, "Add a workout" or
 * "Add another" (a plan's day can hold several), and rest, copy and swap. Changes repeat every
 * week of the phase; one-off changes happen in Train.
 */
export function PlanDayView({ planId, phaseIndex, idx, backLabel = 'My week', onBack, onOpenWorkout }: {
  planId: string
  phaseIndex: number
  idx: number
  backLabel?: string
  onBack: () => void
  onOpenWorkout: (k: WorkoutKey) => void
}) {
  const routines = useStore((s) => s.data.routines)
  const { plan, week, change } = usePlanWeek(planId, phaseIndex)
  const [sheet, setSheet] = useState<null | 'add' | 'copy' | 'swap'>(null)
  if (!plan) return null
  const day = DAY_NAME[idx]
  const keys = known(week[idx], routines)
  const rest = keys.length === 0
  const ph = plan.phases[phaseIndex]
  const lighterAfter = plan.phases.some((x, j) => j > phaseIndex && x.maintain)
  // keys this device doesn't know (a newer app's) are kept, after the ones shown
  const unknownOn = (d: number) => (week[d] || []).filter((k) => !isBuiltinKey(k) && !routineFor(k, routines))
  const setDay = (next: WorkoutKey[], msg: string) => change({ ...copyWeek(week), [idx]: [...next, ...unknownOn(idx)].slice(0, MAX_A_DAY) }, msg)
  const notes = planWeekNotes(week, routines).filter((n) => n.includes(day) || n.includes('no rest day'))
  const subOf = (k: WorkoutKey) => {
    const r = routineFor(k, routines)
    if (!r) return `${k === 'Cardio' ? MODALITY_LABEL.cardio : MODALITY_LABEL.strength} · ${workoutSub(k as WorkoutType)}`
    const n = routineSlots(r).length
    return [MODALITY_LABEL[r.modality], `${n} ${n === 1 ? 'exercise' : 'exercises'}`, r.estMins ? `about ${aboutMins(r.estMins)} min` : ''].filter(Boolean).join(' · ')
  }

  return (
    <div className="screen">
      <div className="pv-back"><BackButton label={backLabel} onClick={onBack} /></div>
      <h1 className="ltitle">{day}</h1>
      <div className="sub" style={{ margin: '2px 0 16px' }}>{rest ? 'Rest day · recovery counts too' : `Every week of ${ph?.name ?? 'this phase'}`}</div>

      {!rest && (
        <div className="list">
          {keys.map((k, i) => (
            <div className="li pv-row" key={k + i}>
              <button className="li-in" onClick={() => onOpenWorkout(k)} aria-label={`View ${keyTitle(k, routines)}`}>
                <Thumb video={keyVideo(k, routines)} shape={k === 'Cardio' ? 'duration' : undefined} />
                <div className="m"><div className="t">{keyTitle(k, routines)}</div><div className="s num">{subOf(k)}</div></div>
              </button>
              <button className="linkbtn" aria-label={`Remove ${keyTitle(k, routines)} from ${day}`}
                onClick={() => setDay(keys.filter((_, j) => j !== i), `${keyTitle(k, routines)} removed from ${day}`)}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {keys.length < MAX_A_DAY && (
        <button className="dash-add" onClick={() => setSheet('add')}><Icon name="plus" size={18} stroke={2.4} />{rest ? 'Add a workout' : 'Add another'}</button>
      )}

      {rest && <div className="lbl">Or</div>}
      <div className="list" style={{ marginTop: rest ? 0 : 12 }}>
        {!rest && (
          <button className="li" onClick={() => setDay([], `${day} is a rest day now`)}>
            <div className="m"><div className="t">Make {day} a rest day</div><div className="s">Rest is part of the plan</div></div>
          </button>
        )}
        <button className="li" onClick={() => setSheet('copy')}>
          <div className="m"><div className="t">Copy another day</div><div className="s">Pick a day to copy from</div></div><Chevron />
        </button>
        <button className="li" onClick={() => setSheet('swap')}>
          <div className="m"><div className="t">Swap with another day</div></div><Chevron />
        </button>
      </div>
      {notes.map((t) => <div className="card plan-note" key={t}>{t}</div>)}
      <div className="foot" style={{ padding: '8px 4px 0' }}>
        Changes here repeat every week of {ph?.name ?? 'this phase'}{lighterAfter ? ', and the lighter weeks after it' : ''}. To change just this {day}, use the Train tab.
      </div>

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
    </div>
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
    <div className="screen">
      <div className="pv-back"><BackButton label="Plan" onClick={onBack} /></div>
      <h1 className="ltitle">{ph?.name ?? 'Week'}</h1>
      <div className="sub" style={{ margin: '2px 0 16px' }}>{plan.name} · {ph?.weeks} {ph?.weeks === 1 ? 'week' : 'weeks'}</div>
      <div className="list wk">
        {WEEK_ORDER.map((d) => {
          const keys = known(week[d], routines)
          const names = keys.map((k) => keyTitle(k, routines))
          return (
            <button className="li wk-row" key={d} onClick={() => onDay(d)} aria-label={`${DAY_NAME[d]}: ${names.length ? names.join(' and ') : 'Rest'}`}>
              <span className="dd">{DAY_NAME[d].slice(0, 3)}</span>
              {keys.length === 0
                ? <div className="m"><div className="t muted">Rest · recovery counts too</div></div>
                : <div className="m"><div className="t">{names.join(' + ')}</div></div>}
              {keys.length > 0 && (keys[0] === 'Cardio' ? <span className="cdot" aria-hidden="true" /> : <Thumb video={keyVideo(keys[0], routines)} />)}
            </button>
          )
        })}
      </div>
      {notes.map((t) => <div className="card plan-note" key={t}>{t}</div>)}
      <div className="foot">Tap a day to change it. Changes repeat every week of {ph?.name ?? 'this phase'}.</div>
    </div>
  )
}
