import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { SetEntry, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS } from '@/core/data/workouts'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { fmtDate } from '@/core/domain/date'
import { howToLink } from '@/core/domain/workout'
import { PageHeader, Seg } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { DayNav } from '@/ui/WeekStrip'
import { DemoPlayer } from './train/DemoPlayer'

const TABS: [WorkoutType, string][] = [['Legs', 'Legs'], ['Push', 'Push'], ['Pull', 'Pull'], ['Cardio', 'Cardio']]

function lastSessionOf(days: Record<string, { workout: { type: string; ex?: { name: string; sets: SetEntry[] }[] } | null }>, cur: string, type: string) {
  const ds = Object.keys(days)
    .filter((d) => d !== cur && days[d].workout && days[d].workout!.type === type)
    .sort()
  return ds.length ? days[ds[ds.length - 1]].workout : null
}

export function TrainScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const saveCardio = useStore((s) => s.saveCardio)

  const day = data.days[cur] || { foods: [], supps: {}, weight: null, workout: null }
  const logged = day.workout
  const fd = fmtDate(cur)
  const sched = data.schedule[fd.idx] || 'Rest'

  const initial: WorkoutType =
    (logged?.type as WorkoutType) || (LIFTS.includes(sched as WorkoutType) ? (sched as WorkoutType) : 'Cardio')
  const [sel, setSel] = useState<WorkoutType>(initial)
  useEffect(() => {
    setSel(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  // editable set state for lifts: index -> sets[]
  const wk = sel !== 'Cardio' ? WORKOUTS[sel] : null
  const loggedSets = logged?.type === sel ? logged.ex : null
  const [sets, setSets] = useState<Record<number, SetEntry[]>>({})
  useEffect(() => {
    if (!wk) return
    const next: Record<number, SetEntry[]> = {}
    wk.ex.forEach((_, i) => {
      next[i] = loggedSets?.[i]?.sets?.length
        ? loggedSets[i].sets.map((s) => ({ ...s }))
        : [{ w: '', reps: '' }, { w: '', reps: '' }]
    })
    setSets(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, cur])

  // cardio state
  const cardio = logged?.type === 'Cardio' ? logged : null
  const [cardioType, setCardioType] = useState(cardio?.cardioType || 'Brisk walk')
  const [mins, setMins] = useState(cardio?.mins || '')
  useEffect(() => {
    setCardioType(cardio?.cardioType || 'Brisk walk')
    setMins(cardio?.mins || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])

  const last = useMemo(() => (sel !== 'Cardio' ? lastSessionOf(data.days, cur, sel) : null), [data.days, cur, sel])

  const dayName = fd.dow
  const banner = logged ? (
    <><b>{logged.type === 'Cardio' ? 'Cardio' : WORKOUTS[logged.type].title}</b> logged for {dayName}.
</>
  ) : sched === 'Rest' ? (
    <><b>{dayName} is a rest day.</b> Recovery is when you adapt. A gentle walk is fine, and you can still log a session below.</>
  ) : (
    <><b>{dayName}: {WORKOUTS[sched]?.title || sched}.</b> Doing something else? Pick it below. It only changes today.</>
  )

  function updateSet(exi: number, si: number, field: keyof SetEntry, value: string) {
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s, i) => (i === si ? { ...s, [field]: value } : s)) }))
  }
  function addSet(exi: number) {
    setSets((prev) => ({ ...prev, [exi]: [...prev[exi], { w: '', reps: '' }] }))
  }
  function commitLift() {
    if (!wk) return
    saveWorkout(sel, wk.ex.map((e, i) => ({ name: e.n, sets: (sets[i] || []).filter((s) => s.w !== '' || s.reps !== '') })))
  }

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Train" />

      <div className="banner">
        <span style={{ color: 'var(--activity-ink)' }}><Icon name="dumbbell" /></span>
        <div>{banner}</div>
      </div>
      <div style={{ margin: '4px 0 14px' }}><Seg options={TABS} value={sel} onChange={setSel} /></div>

      {sel === 'Cardio' ? (
        <>
          <div className="card ex">
            <div className="h"><div className="n">{WORKOUTS.Cardio.ex[0].n}</div><span className="tg">{WORKOUTS.Cardio.ex[0].t}</span></div>
            <div className="cue">{WORKOUTS.Cardio.ex[0].cue}</div>
          </div>
          <div className="list">
            <div className="frow"><label htmlFor="c_type">Type</label>
              <select id="c_type" value={cardioType} onChange={(e) => setCardioType(e.target.value)}>
                {/* a retired type from an older log still shows as saved */}
                {(CARDIO_OPTIONS.includes(cardioType) ? CARDIO_OPTIONS : [...CARDIO_OPTIONS, cardioType]).map((o) => <option key={o}>{o}</option>)}
              </select></div>
            <div className="frow"><label htmlFor="c_min">Minutes</label>
              <input id="c_min" type="number" inputMode="numeric" value={mins} placeholder="25" onChange={(e) => setMins(e.target.value)} /></div>
          </div>
          <div className="stack"><button className="btn" onClick={() => saveCardio(cardioType, mins)}>Save cardio</button></div>
        </>
      ) : (
        <>
          {wk!.ex.map((e, exi) => {
            const isPlank = e.n.toLowerCase().includes('plank')
            const lastEx = last?.ex?.[exi]
            const lastTxt = lastEx?.sets?.length
              ? 'Last time: ' + lastEx.sets.map((s) => (s.w ? s.w + ' kg' : '') + (s.w && s.reps ? ' × ' : '') + (s.reps || '')).filter(Boolean).join(', ')
              : ''
            return (
              <div className="card ex" key={exi}>
                <div className="h"><div className="n">{e.n}</div><span className="tg">{e.t}</span></div>
                <div className="cue">{e.cue}</div>
                {e.video
                  ? <button className="howto" onClick={() => setDemo(exi)}><Icon name="play" size={15} /> Watch example</button>
                  : <a className="howto" href={howToLink(e.n)} target="_blank" rel="noopener noreferrer">Watch how to do it ›</a>}
                {lastTxt && <div className="last num">{lastTxt}</div>}
                {(sets[exi] || []).map((s, si) => (
                  <div className="setrow" key={si}>
                    <span className="n">Set {si + 1}</span>
                    {!isPlank && (
                      <>
                        <input className="num" type="number" inputMode="decimal" placeholder="kg" value={s.w} aria-label={`Set ${si + 1} weight`}
                          onChange={(ev) => updateSet(exi, si, 'w', ev.target.value)} />
                        <span className="u">kg</span>
                      </>
                    )}
                    <input className="num" type="number" inputMode="numeric" placeholder={isPlank ? 'sec' : 'reps'} value={s.reps}
                      aria-label={`Set ${si + 1} ${isPlank ? 'seconds' : 'reps'}`} onChange={(ev) => updateSet(exi, si, 'reps', ev.target.value)} />
                    <span className="u">{isPlank ? 'sec' : 'reps'}</span>
                  </div>
                ))}
                <button className="addset" onClick={() => addSet(exi)}>Add set</button>
              </div>
            )
          })}
          <div className="stack"><button className="btn" onClick={commitLift}>Save {sel} session</button></div>
        </>
      )}

      {wk && demo != null && wk.ex[demo]?.video && <DemoPlayer ex={wk.ex[demo]} onClose={closeDemo} />}

      <div className="foot" style={{ padding: '12px 4px 0' }}>
        Keep two or three reps in the tank each set. When every set hits the top of the range with good form, add a little
        weight next time. Rest about 90 seconds between sets.
      </div>
    </div>
  )
}
