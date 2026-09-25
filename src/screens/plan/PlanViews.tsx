import { useState } from 'react'
import { useStore } from '@/store/store'
import type { Schedule, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS } from '@/core/data/workouts'
import { exById } from '@/core/domain/library'
import { todayStr } from '@/core/domain/date'
import { mediaUrl } from '@/core/data/media'
import { setCount, shapeFor } from '@/core/domain/guided'
import { DAY_NAME, WEEK_ORDER, plannedOn, shortTitle, swapDays, weekWarnings } from '@/core/domain/week'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { BackButton, Sheet } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { Thumb } from '../train/Thumb'
import { LibrarySheet } from '../train/LibrarySheet'
import { bareName } from '../train/GuidedPlayer'

export type Planned = WorkoutType | 'Rest'

/** Ready-made workouts by category. Categories with none (Bodyweight, Yoga, Pilates, Mobility) stay hidden. */
const CATEGORIES: { id: 'weights' | 'cardio'; label: string; items: WorkoutType[]; color: string }[] = [
  { id: 'weights', label: MODALITY_LABEL.strength, items: LIFTS, color: 'var(--move-fill)' },
  { id: 'cardio', label: MODALITY_LABEL.cardio, items: ['Cardio'], color: 'var(--mind-fill)' },
]

export const firstVideo = (t: WorkoutType) => WORKOUTS[t].ex.find((e) => e.video)?.video
export const workoutSub = (t: WorkoutType) => (t === 'Cardio' ? WORKOUTS.Cardio.ex[0].t : `${WORKOUTS[t].ex.length} exercises · ${setCount(WORKOUTS[t].ex)}`)
const kindOf = (t: WorkoutType) => (t === 'Cardio' ? MODALITY_LABEL.cardio : MODALITY_LABEL.strength)

/** Change the week, with a toast that can undo it. */
function useWeekChange() {
  const schedule = useStore((s) => s.data.schedule)
  const setSchedule = useStore((s) => s.setSchedule)
  const showToast = useStore((s) => s.showToast)
  return (next: Schedule, msg: string) => {
    const before: Schedule = { ...schedule }
    setSchedule(next, true)
    showToast(msg, { label: 'Undo', run: () => setSchedule(before, true) })
  }
}

/** Choose a category, then a ready-made workout, then "Add to Monday" (never "Start": that lives in Train). */
export function AddWorkoutSheet({ idx, onClose }: { idx: number; onClose: () => void }) {
  const schedule = useStore((s) => s.data.schedule)
  const change = useWeekChange()
  const [cat, setCat] = useState<(typeof CATEGORIES)[number] | null>(null)
  const [sel, setSel] = useState<WorkoutType | null>(null)
  const [see, setSee] = useState<WorkoutType | null>(null)
  const day = DAY_NAME[idx]
  const cancel = <button className="navbtn" onClick={onClose}>Cancel</button>
  const warn = sel ? weekWarnings({ ...schedule, [idx]: sel }).filter((w) => w.kind === 'back-to-back' && w.days.includes(idx)) : []

  if (see) {
    return (
      <Sheet title={shortTitle(see)} onClose={onClose} tall animate={false} left={<BackButton label={cat?.label ?? 'Back'} onClick={() => setSee(null)} />} right={cancel}>
        <ExerciseList type={see} />
      </Sheet>
    )
  }
  if (cat) {
    return (
      <Sheet title={cat.label} onClose={onClose} tall animate={false} left={<BackButton label="Categories" onClick={() => { setCat(null); setSel(null) }} />} right={cancel}>
        <div className="list" role="radiogroup" aria-label={`${cat.label} workouts`}>
          {cat.items.map((t) => (
            <button className="li pv-row" key={t} role="radio" aria-checked={sel === t} onClick={() => setSel(t)}>
              <Thumb video={firstVideo(t)} shape={t === 'Cardio' ? 'duration' : undefined} />
              <div className="m"><div className="t">{shortTitle(t)}</div><div className="s num">{workoutSub(t)}{schedule[idx] === t ? ' · on ' + day + ' now' : ''}</div></div>
              <span className={'chk' + (sel === t ? ' on' : '')} aria-hidden="true">{sel === t && <Icon name="check" size={14} stroke={3} />}</span>
            </button>
          ))}
        </div>
        {sel && sel !== 'Cardio' && <button className="linkbtn" style={{ paddingLeft: 4 }} onClick={() => setSee(sel)}>See what's in {shortTitle(sel)}</button>}
        {warn.map((w) => <div className="card plan-note" key={w.text}>{w.text}</div>)}
        <div className="stack sheet-cta">
          <button className="btn" disabled={!sel} onClick={() => {
            if (!sel) return
            change({ ...schedule, [idx]: sel }, `${shortTitle(sel)} added to ${day}`)
            onClose()
          }}>Add to {day}</button>
        </div>
      </Sheet>
    )
  }
  return (
    <Sheet title={`Add to ${day}`} onClose={onClose} tall left={null} right={cancel}>
      <div className="lbl" style={{ paddingTop: 0 }}>Ready-made</div>
      <div className="list">
        {CATEGORIES.map((c) => (
          <button className="li pv-row" key={c.id} onClick={() => setCat(c)}>
            <span className="catsq" style={{ background: c.color }} aria-hidden="true" />
            <div className="m"><div className="t">{c.label}</div><div className="s">{c.items.length} {c.items.length === 1 ? 'workout' : 'workouts'} · {c.items.map(shortTitle).join(', ')}</div></div>
            <Chevron />
          </button>
        ))}
      </div>
      <div className="foot" style={{ padding: '14px 4px 0' }}>
        Bodyweight, Yoga, Pilates and Mobility appear here once they have ready-made workouts. Building your own workout is coming later.
      </div>
    </Sheet>
  )
}

/** Pick another weekday (copy from it, or swap with it). */
function DayPick({ idx, title, onPick, onClose }: { idx: number; title: string; onPick: (d: number) => void; onClose: () => void }) {
  const schedule = useStore((s) => s.data.schedule)
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="list">
        {WEEK_ORDER.filter((d) => d !== idx).map((d) => {
          const v = plannedOn(schedule, d)
          return (
            <button className="li" key={d} onClick={() => onPick(d)}>
              <div className="m"><div className="t">{DAY_NAME[d]}</div><div className="s">{v === 'Rest' ? 'Rest' : shortTitle(v)}</div></div>
              <Chevron />
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/** One weekday: what's on it and the ways to change it. Changes repeat every week. */
export function DayView({ idx, onBack, onOpenWorkout }: { idx: number; onBack: () => void; onOpenWorkout: (t: WorkoutType) => void }) {
  const schedule = useStore((s) => s.data.schedule)
  const change = useWeekChange()
  const [sheet, setSheet] = useState<null | 'add' | 'copy' | 'swap'>(null)
  const v: Planned = plannedOn(schedule, idx)
  const day = DAY_NAME[idx]
  const warns = weekWarnings(schedule).filter((w) => w.kind === 'no-rest' || w.days.includes(idx))

  return (
    <div className="screen">
      <div className="pv-back"><BackButton label="My week" onClick={onBack} /></div>
      <h1 className="ltitle">{day}</h1>
      <div className="sub" style={{ margin: '2px 0 16px' }}>{v === 'Rest' ? 'Rest day · recovery counts too' : 'Every week'}</div>

      {v !== 'Rest' && (
        <div className="list">
          <button className="li pv-row" onClick={() => onOpenWorkout(v)}>
            <Thumb video={firstVideo(v)} shape={v === 'Cardio' ? 'duration' : undefined} />
            <div className="m"><div className="t">{shortTitle(v)}</div><div className="s num">{kindOf(v)} · {workoutSub(v)}</div></div>
            <span className="linkbtn">View</span>
          </button>
        </div>
      )}
      <button className="dash-add" onClick={() => setSheet('add')}><Icon name="plus" size={18} stroke={2.4} />{v === 'Rest' ? 'Add a workout' : 'Change workout'}</button>

      {v === 'Rest' && <div className="lbl">Or</div>}
      <div className="list" style={{ marginTop: v === 'Rest' ? 0 : 12 }}>
        {v !== 'Rest' && (
          <button className="li" onClick={() => change({ ...schedule, [idx]: 'Rest' }, `${day} is a rest day now`)}>
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
      {warns.map((w) => <div className="card plan-note" key={w.text}>{w.text}</div>)}
      <div className="foot" style={{ padding: '8px 4px 0' }}>Changes here repeat every week. To change just this {day}, use the Train tab.</div>

      {sheet === 'add' && <AddWorkoutSheet idx={idx} onClose={() => setSheet(null)} />}
      {sheet === 'copy' && <DayPick idx={idx} title="Copy from" onClose={() => setSheet(null)} onPick={(d) => {
        const from = plannedOn(schedule, d)
        change({ ...schedule, [idx]: from }, `${day} now matches ${DAY_NAME[d]}`); setSheet(null)
      }} />}
      {sheet === 'swap' && <DayPick idx={idx} title="Swap with" onClose={() => setSheet(null)} onPick={(d) => {
        change(swapDays(schedule, idx, d), `${day} and ${DAY_NAME[d]} swapped`); setSheet(null)
      }} />}
    </div>
  )
}

/** A workout's exercises, read only; each opens its library entry. */
function ExerciseList({ type }: { type: WorkoutType }) {
  const [lib, setLib] = useState<string | null>(null)
  return (
    <>
      <div className="list">
        {WORKOUTS[type].ex.map((e, i) => {
          const x = exById(e.id)
          const body = (
            <>
              <Thumb video={e.video} shape={shapeFor(e, x)} play={!!e.video} />
              <div className="m"><div className="t">{bareName(e.n)}</div></div>
              <span className="tr num" style={{ fontSize: 14 }}>{e.t}</span>
            </>
          )
          return x ? <button className="li pv-row" key={i} onClick={() => setLib(x.id)}>{body}</button> : <div className="li pv-row" key={i}>{body}</div>
        })}
      </div>
      {lib && <LibrarySheet initial={lib} onClose={() => setLib(null)} />}
    </>
  )
}

/**
 * A workout (Plan, p1-workout): its exercises and where it sits in the week. Ready-made workouts
 * are read only for now (there are no custom routines in the data model yet); a move can be
 * swapped for one day in Train. "Do this today" hands over to Train, which owns Start.
 */
export function WorkoutView({ type, onBack }: { type: WorkoutType; onBack: () => void }) {
  const schedule = useStore((s) => s.data.schedule)
  const openTrain = useStore((s) => s.openTrain)
  const setDate = useStore((s) => s.setDate)
  const v = firstVideo(type)
  const [failed, setFailed] = useState(false)
  const on = WEEK_ORDER.filter((d) => schedule[d] === type).map((d) => DAY_NAME[d] + 's')
  const when = on.length ? on.length === 1 ? on[0] : on.slice(0, -1).join(', ') + ' and ' + on[on.length - 1] : 'Not in your week'
  return (
    <div className="wv">
      <div className={'wv-hero' + (v?.poster && !failed ? '' : ' plain')}>
        {v?.poster && !failed && <img src={mediaUrl(v.poster)} alt="" onError={() => setFailed(true)} />}
        <button className="wv-back" aria-label="Back" onClick={onBack}><Icon name="chevL" size={18} stroke={2.6} /></button>
        <div className="wv-t">
          <h1>{shortTitle(type)}</h1>
          <div className="s num">{when} · {workoutSub(type)}</div>
        </div>
      </div>
      <div className="screen" style={{ paddingTop: 16 }}>
        <ExerciseList type={type} />
        <div className="foot" style={{ padding: '4px 4px 0' }}>Ready-made workouts can't be edited yet. To change a move for one day, use Swap in Train.</div>
        <div className="stack">
          <button className="btn gray" onClick={() => { setDate(todayStr()); openTrain(type) }}>Do this today</button>
        </div>
      </div>
    </div>
  )
}
