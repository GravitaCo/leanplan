import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { SetEntry, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS, SWAPS } from '@/core/data/workouts'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { fmtDate, todayStr } from '@/core/domain/date'
import { catchUp, easyUntil, sessionsThisWeek, welcomeBack } from '@/core/domain/training'
import { howToLink } from '@/core/domain/workout'
import { lowSignals, shorterPrescription } from '@/core/domain/dayOptions'
import { PageHeader, Seg } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { DayNav } from '@/ui/WeekStrip'
import { DemoPlayer } from './train/DemoPlayer'

const TABS: [WorkoutType, string][] = [['Legs', 'Legs'], ['Push', 'Push'], ['Pull', 'Pull'], ['Cardio', 'Cardio']]

/** Day-of choices (plan §0.2): equal options, the planned session always one tap away. */
type Choice = 'planned' | 'shorter' | 'mobility' | 'walk'
const CHOICES: [Choice, string][] = [['planned', 'As planned'], ['shorter', 'Shorter'], ['mobility', '10-min mobility'], ['walk', 'Easy walk']]

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
  const setPrefs = useStore((s) => s.setPrefs)

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

  // day-of choices: offered when two or more check-in signals are low for this person, and
  // always available from a quiet link; never applied automatically
  const recent = useMemo(() => Object.keys(data.days).filter((d) => d < cur).sort().reverse().map((d) => data.days[d]?.checkin), [data.days, cur])
  const low = lowSignals(day.checkin, recent)
  const offer = !logged && low.length >= 2
  // an accepted "easier first week" pre-selects the shorter version (still just a choice)
  const easy = !logged && !!data.profile.easyUntil && cur <= data.profile.easyUntil
  const [choice, setChoice] = useState<Choice>(easy ? 'shorter' : 'planned')
  const [askLighter, setAskLighter] = useState(easy)
  useEffect(() => { setChoice(easy ? 'shorter' : 'planned'); setAskLighter(easy) }, [cur, easy])

  // plans slide: offer the planned session that didn't happen; the calendar never moves
  const isToday = cur === todayStr()
  const pickUp = isToday ? catchUp(data, cur) : null
  const weekCount = sessionsThisWeek(data, cur)
  const back = isToday && welcomeBack(data, cur)
  const shorter = choice === 'shorter'
  const swap = choice === 'mobility' || choice === 'walk' ? SWAPS[choice] : null
  const [walkMins, setWalkMins] = useState('')

  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])

  const last = useMemo(() => (sel !== 'Cardio' ? lastSessionOf(data.days, cur, sel) : null), [data.days, cur, sel])

  const dayName = fd.dow
  const banner = logged?.option === 'swap' ? (
    <><b>{logged.cardioType === 'Mobility' ? 'Mobility' : 'Easy walk'}</b> logged for {dayName}. Nice choice. Moving gently still counts.</>
  ) : logged ? (
    <><b>{logged.type === 'Cardio' ? 'Cardio' : WORKOUTS[logged.type].title}</b>{logged.option === 'shorter' ? ' (shorter)' : ''} logged for {dayName}.</>
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
    saveWorkout(sel, wk.ex.map((e, i) => ({ name: e.n, sets: (sets[i] || []).filter((s) => s.w !== '' || s.reps !== '') })), shorter ? 'shorter' : undefined)
  }

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Train" />

      <div className="banner">
        <span style={{ color: 'var(--activity-ink)' }}><Icon name="dumbbell" /></span>
        <div>{banner}</div>
      </div>
      {weekCount > 0 && <div className="foot week-n">{weekCount} {weekCount === 1 ? 'session' : 'sessions'} this week</div>}

      {back && (
        <div className="card dayopt">
          <div className="t">Welcome back. Want an easier first week?</div>
          <div className="foot" style={{ padding: '0 0 10px' }}>A break doesn't undo anything. Shorter sessions for a week can make it easier to settle back in.</div>
          <div className="chips">
            <button className="chip" onClick={() => setPrefs({ welcomeAsked: cur, easyUntil: easyUntil(cur) })}>Yes, go easier</button>
            <button className="chip" onClick={() => setPrefs({ welcomeAsked: cur })}>No thanks</button>
          </div>
        </div>
      )}

      {!logged && pickUp && pickUp !== sel && (
        <div className="card dayopt">
          <div className="t">Pick up with {pickUp} whenever you're ready.</div>
          <div className="chips"><button className="chip" onClick={() => setSel(pickUp)}>Do {pickUp} today</button></div>
        </div>
      )}

      <div style={{ margin: '4px 0 14px' }}><Seg options={TABS} value={sel} onChange={setSel} /></div>

      {!logged && (offer || askLighter) && (
        <div className="card dayopt">
          <div className="t">{offer
            ? (low.includes('sleep') ? 'Short night? ' : 'Tough day? ') + 'Here are a few options for today. All of them count.'
            : 'Here are a few options for today. All of them count.'}</div>
          <div className="chips" role="radiogroup" aria-label="Today's session">
            {CHOICES.map(([k, label]) => (
              <button key={k} role="radio" aria-checked={choice === k} className={'chip' + (choice === k ? ' on' : '')} onClick={() => setChoice(k)}>{label}</button>
            ))}
          </div>
          {swap && <div className="foot">Your plan picks up where you left off.</div>}
        </div>
      )}
      {!logged && !offer && !askLighter && (
        <button className="linkbtn muted dayopt-link" onClick={() => setAskLighter(true)}>Want a lighter option?</button>
      )}

      {swap ? (
        <>
          <div className="grp-h">{swap.title}</div>
          {swap.ex.map((e) => (
            <div className="card ex" key={e.n}>
              <div className="h"><div className="n">{e.n}</div><span className="tg">{e.t}</span></div>
              <div className="cue">{e.cue}</div>
            </div>
          ))}
          {choice === 'walk' && (
            <div className="list">
              <div className="frow"><label htmlFor="w_min">Minutes</label>
                <input id="w_min" type="number" inputMode="numeric" value={walkMins} placeholder={swap.mins} onChange={(e) => setWalkMins(e.target.value)} /></div>
            </div>
          )}
          <div className="stack"><button className="btn" onClick={() => saveCardio(swap.cardioType, choice === 'walk' ? walkMins || swap.mins : swap.mins, 'swap')}>
            Save {choice === 'walk' ? 'walk' : 'mobility'}</button></div>
        </>
      ) : sel === 'Cardio' ? (
        <>
          <div className="card ex">
            <div className="h"><div className="n">{WORKOUTS.Cardio.ex[0].n}</div><span className="tg">{shorter ? shorterPrescription(WORKOUTS.Cardio.ex[0].t) : WORKOUTS.Cardio.ex[0].t}</span></div>
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
          <div className="stack"><button className="btn" onClick={() => saveCardio(cardioType, mins, shorter ? 'shorter' : undefined)}>Save cardio</button></div>
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
                <div className="h"><div className="n">{e.n}</div><span className="tg">{shorter ? shorterPrescription(e.t) : e.t}</span></div>
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
          <div className="stack"><button className="btn" onClick={commitLift}>Save {shorter ? 'shorter ' : ''}{sel} session</button></div>
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
