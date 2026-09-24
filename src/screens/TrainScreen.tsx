import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import type { Exercise, ExerciseTemplate, LoggedExercise, LogShape, SetEntry, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS, SWAPS } from '@/core/data/workouts'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { fmtDate, shiftDay, todayStr } from '@/core/domain/date'
import { catchUp, daysMovedThisWeek, easyUntil, welcomeBack } from '@/core/domain/training'
import { SupportSheet } from './train/SupportSheet'
import { howToLink } from '@/core/domain/workout'
import { lowSignals, shorterPrescription } from '@/core/domain/dayOptions'
import { PageHeader, Seg, Toggle } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { DayNav } from '@/ui/WeekStrip'
import { DemoPlayer } from './train/DemoPlayer'
import { LogSessionSheet } from './train/LogSessionSheet'
import { sessionsOf } from '@/core/domain/sessions'
import { showLoadNote } from '@/core/domain/load'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { EXERCISES } from '@/core/data/exercises'
import { exById, fmtSet, lastLogged, setHasData } from '@/core/domain/library'
import { CARE_DISCLAIMER, SwapSheet } from './train/SwapSheet'
import { careList } from '@/core/data/libraryLabels'
import { LibrarySheet } from './train/LibrarySheet'
import { MyWorkoutsSheet } from './train/MyWorkoutsSheet'
import { RoutineBuilderSheet, type BuilderStart } from './train/RoutineBuilderSheet'
import { aboutMins, canBuild, routineTemplate } from '@/core/domain/routines'
import { HoldTimer, RED_FLAG } from './train/HoldTimer'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

const TABS: [WorkoutType, string][] = [['Legs', 'Legs'], ['Push', 'Push'], ['Pull', 'Pull'], ['Cardio', 'Cardio']]

/** Day-of choices (plan §0.2): equal options, the planned session always one tap away. */
type Choice = 'planned' | 'shorter' | 'mobility' | 'walk'
const CHOICES: [Choice, string][] = [['planned', 'As planned'], ['shorter', 'Shorter'], ['mobility', '10-min mobility'], ['walk', 'Easy walk']]

const blankRows = (): SetEntry[] => [{ w: '', reps: '' }, { w: '', reps: '' }]

/** How a slot is logged: the library entry's shape (plank before ids: a hold). */
function shapeFor(t: ExerciseTemplate, x?: Exercise): LogShape {
  return x?.log ?? (t.n.toLowerCase().includes('plank') ? 'hold' : 'weight-reps')
}

/**
 * Saved sets back into the form. Holds edit `sec` only: older logs kept their seconds in `reps`,
 * and new saves copy `sec` into `reps` for older installs, so the form clears `reps` (a save puts
 * it back) and clearing the box really clears the set.
 */
function toRows(sets: SetEntry[], shape: LogShape): SetEntry[] {
  return sets.map((s) => (shape === 'hold' ? { ...s, sec: s.sec || s.reps, reps: '' } : { ...s }))
}

/** The library id a logged exercise stands for, when it isn't the workout's own (a swap). */
function loggedSwap(t: ExerciseTemplate, L: LoggedExercise | undefined): string | undefined {
  if (!L || L.name === t.n) return undefined
  const id = L.exId ?? EXERCISES.find((x) => x.n === L.name)?.id
  return id && id !== t.id ? id : undefined
}

export function TrainScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const saveCardio = useStore((s) => s.saveCardio)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const removeSession = useStore((s) => s.removeSession)
  const saveRoutineSession = useStore((s) => s.saveRoutineSession)
  const [myOpen, setMyOpen] = useState(false)
  const [builder, setBuilder] = useState<BuilderStart | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  // two taps to remove, so a mis-tap never deletes logged sets
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const gentle = !!data.profile.gentle

  const day = data.days[cur] || { foods: [], supps: {}, weight: null, workout: null }
  // a day can hold several sessions (plan P2); each built-in card reads its own saved session
  const sessions = sessionsOf(day, cur)
  const logged = sessions.length > 0
  const builtin = (t: string) => sessions.find((x) => x.routineId === 'builtin-' + t)
  // open on the day's lift if there is one (as the mirror does), else the first built-in card
  const firstBuiltin = sessions.find((x) => LIFTS.includes((x.routineId || '').replace('builtin-', '') as WorkoutType))
    ?? sessions.find((x) => (x.routineId || '').startsWith('builtin-'))
  const fd = fmtDate(cur)
  const sched = data.schedule[fd.idx] || 'Rest'

  // the user's own workouts (plan P4); a day's saved one reopens with it
  const routines = data.routines || []
  const firstOwn = sessions.find((x) => routines.some((r) => r.id === x.routineId))
  const initial: string =
    (firstBuiltin?.routineId?.replace('builtin-', '') as WorkoutType) || firstOwn?.routineId || (LIFTS.includes(sched as WorkoutType) ? (sched as WorkoutType) : 'Cardio')
  /** a built-in card ('Legs', 'Push', 'Pull', 'Cardio') or the id of one of the user's workouts */
  const [sel, setSel] = useState<string>(initial)
  useEffect(() => {
    setSel(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  // editable set state for lifts: index -> sets[]
  const routine = routines.find((r) => r.id === sel)
  const wk = routine ? routineTemplate(routine) : sel !== 'Cardio' ? WORKOUTS[sel as WorkoutType] ?? null : null
  /** the session this card saved today, if any */
  const cardSession = sessions.find((x) => x.routineId === (routine ? routine.id : 'builtin-' + sel))
  const loggedSets = cardSession?.ex ?? null
  const [sets, setSets] = useState<Record<number, SetEntry[]>>({})
  // per-slot swaps for today (plan P3): slot index -> library id
  const [swaps, setSwaps] = useState<Record<number, string>>({})
  const [swapFor, setSwapFor] = useState<number | null>(null)
  const [timer, setTimer] = useState<{ exi: number; si: number } | null>(null)
  /** bodyweight cards: bodyweight only, added weight or assistance (chosen before anything is typed) */
  const [loadMode, setLoadMode] = useState<Record<number, 'none' | 'added' | 'assist'>>({})
  const slotEx = (i: number, sw = swaps) => (wk ? exById(sw[i] ?? wk.ex[i].id) : undefined)
  /** what a save writes: the exercise in each slot, its shape, and only the sets with something in them */
  const buildEx = (sw = swaps, rows = sets): LoggedExercise[] => (wk ? wk.ex.map((e, i) => {
    const x = slotEx(i, sw)
    const shape = shapeFor(e, x)
    const kept = (rows[i] || []).filter((r) => setHasData(r, shape))
    // holds also keep their seconds in `reps`, which is where older installs read and filter them
    const out = shape === 'hold' ? kept.map((r) => ({ ...r, reps: r.sec || r.reps })) : kept
    return { name: sw[i] && x ? x.n : e.n, ...(x ? { exId: x.id } : {}), log: shape, sets: out }
  }) : [])
  const setsKey = useRef('')
  useEffect(() => {
    if (!wk) return
    // our own first save echoing back (blank rows filtered out): keep the rows on screen
    const key = `${sel}|${cur}`
    const echo = key === setsKey.current && !!loggedSets && JSON.stringify(loggedSets) === JSON.stringify(buildEx())
    setsKey.current = key
    if (echo) return
    // which logged exercise belongs to which slot: the same exercise wherever it now sits (an own
    // workout can be reordered after it was logged), then what's left by position, which is a swap
    const logged = loggedSets ?? []
    const byExercise = (e: ExerciseTemplate, y: LoggedExercise) => (y.exId ? y.exId === e.id : y.name === e.n)
    const taken = new Set<number>()
    const slotLog: (LoggedExercise | undefined)[] = wk.ex.map((e, i) => {
      const j = byExercise(e, logged[i] ?? { name: '', sets: [] }) ? i : logged.findIndex((y, k) => !taken.has(k) && byExercise(e, y))
      if (j >= 0 && !taken.has(j)) { taken.add(j); return logged[j] }
      return undefined
    })
    wk.ex.forEach((_, i) => { if (!slotLog[i] && logged[i] && !taken.has(i)) { taken.add(i); slotLog[i] = logged[i] } })
    const nextSw: Record<number, string> = {}
    wk.ex.forEach((e, i) => { const id = loggedSwap(e, slotLog[i]); if (id && exById(id)) nextSw[i] = id })
    const next: Record<number, SetEntry[]> = {}
    wk.ex.forEach((e, i) => {
      const L = slotLog[i]
      next[i] = L?.sets?.length ? toRows(L.sets, L.log ?? shapeFor(e, slotEx(i, nextSw))) : blankRows()
    })
    setSwaps(nextSw)
    setSets(next)
    setSwapFor(null)
    setTimer(null)
    setLoadMode({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, cur, cardSession?.id, routine?._u]) // eslint-disable-line react-hooks/exhaustive-deps

  // cardio state
  const cardioS = builtin('Cardio')
  const cardio = cardioS ? { cardioType: cardioS.cardio?.key, mins: cardioS.mins != null ? String(cardioS.mins) : '' } : null
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
  // not on rest days: rest is the plan, and a lighter option than rest would nudge movement
  // a day with training in it: the schedule says so, or the person opened one of their own workouts
  // (P4: start any workout any day, with the same lighter options)
  const trainingDay = sched !== 'Rest' || !!routine
  const offer = !logged && trainingDay && low.length >= 2
  // an accepted "easier first week" pre-selects the shorter version (still just a choice)
  const easy = !logged && trainingDay && !!data.profile.easyUntil && cur >= (data.profile.easyFrom || data.profile.welcomeAsked || '') && cur <= data.profile.easyUntil
  const [walkMins, setWalkMins] = useState('')
  /*
   * The day-of choice is worked out, not stored, so it's right on the first frame:
   * - a card with its own saved session shows that version (a shorter Push stays shorter),
   *   unless the person picks something else on that card;
   * - otherwise the person's pick carries across tabs until it's used to save;
   * - otherwise the day's default (shorter in an easier week or on a lighter day).
   */
  const [picked, setPicked] = useState<{ choice: Choice; tab: string } | null>(null)
  const [askLighter, setAskLighter] = useState(easy)
  useEffect(() => { setPicked(null); setAskLighter(easy); setWalkMins(''); setConfirmId(null) }, [cur, easy]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setConfirmId(null) }, [sel])
  const own = cardSession
  const choice: Choice = own && picked?.tab !== sel
    ? own.option === 'shorter' ? 'shorter' : 'planned'
    : picked ? picked.choice : easy ? 'shorter' : 'planned'
  /** a choice the person makes themselves */
  const pickChoice = (c: Choice) => setPicked({ choice: c, tab: sel })

  // plans slide: offer the planned session that didn't happen; the calendar never moves
  const isToday = cur === todayStr()
  const pick = isToday ? catchUp(data, cur) : null
  const pickUp = pick?.type
  const weekCount = daysMovedThisWeek(data, cur)
  const back = isToday && welcomeBack(data, cur)
  const shorter = choice === 'shorter'
  const swap = choice === 'mobility' || choice === 'walk' ? SWAPS[choice] : null
  /** choosing a tab always shows that session: it leaves a swap (the planned session stays one tap away) */
  function pickTab(t: WorkoutType) { setSel(t); if (swap) setPicked(null) }

  const resistCard = !!wk?.ex.some((e) => { const m = exById(e.id)?.modality; return m === 'strength' || m === 'calisthenics' || !e.id })
  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])


  const dayName = fd.dow
  const one = sessions.length === 1 ? sessions[0] : null
  const banner = sessions.length > 1 ? (
    <><b>{sessions.length} sessions</b> logged for {dayName}.</>
  ) : one?.option === 'swap' ? (
    <><b>{one.title}</b> logged for {dayName}. Gentle movement counts too.</>
  ) : one ? (
    <><b>{one.option === 'shorter' ? 'Shorter ' + (one.modality === 'strength' || !(one.routineId || '').startsWith('builtin-') ? one.title : one.title.toLowerCase()) : one.title}</b> logged for {dayName}.</>
  ) : sched === 'Rest' ? (
    <><b>{dayName} is a rest day.</b> Recovery is when you adapt. A gentle walk is fine, and you can still log a session below.</>
  ) : (
    <><b>{dayName}: {WORKOUTS[sched]?.title || sched}.</b> Doing something else? Pick it below. It only changes today.</>
  )

  function updateSet(exi: number, si: number, patch: Partial<SetEntry>) {
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s, i) => (i === si ? { ...s, ...patch } : s)) }))
  }
  function addSet(exi: number) {
    setSets((prev) => ({ ...prev, [exi]: [...prev[exi], { w: '', reps: '' }] }))
  }
  /** bodyweight moves: none, added weight or assistance, for every set of the card */
  function setLoad(exi: number, v: 'none' | 'added' | 'assist') {
    setLoadMode((p) => ({ ...p, [exi]: v }))
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s) => (v === 'none' ? { ...s, w: '', assist: undefined } : { ...s, assist: v === 'assist' ? true : undefined })) }))
  }
  /** a different exercise in this slot today: its sets start fresh (weights never carry across moves) */
  function swapSlot(exi: number, id: string) {
    if (!wk) return
    setSwaps((prev) => { const n = { ...prev }; if (id === wk.ex[exi].id) delete n[exi]; else n[exi] = id; return n })
    setSets((prev) => ({ ...prev, [exi]: blankRows() }))
    setLoadMode((p) => { const n = { ...p }; delete n[exi]; return n })
  }
  function commitLift() {
    if (!wk) return
    if (routine) saveRoutineSession(routine, buildEx(), shorter ? 'shorter' : undefined)
    else saveWorkout(sel as WorkoutType, buildEx(), shorter ? 'shorter' : undefined)
    setPicked(null) // used: it doesn't carry to the day's other cards
  }

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Train" />

      <div className="banner">
        <span style={{ color: 'var(--activity-ink)' }}><Icon name="dumbbell" /></span>
        <div>{banner}</div>
      </div>
      {weekCount > 0 && <div className="foot week-n">You moved on {gentle ? WORDS[weekCount] : weekCount} {weekCount === 1 ? 'day' : 'days'} this week</div>}

      {isToday && showLoadNote(data, cur) && (
        <div className="card dayopt">
          <div className="t">You've trained a lot this week. Rest is when your body adapts, so a lighter day can help.</div>
          <div className="chips">
            <button className="chip" onClick={() => setPrefs({ loadNoteSeen: cur })}>Thanks</button>
            {(data.schedule[fmtDate(shiftDay(cur, 1)).idx] || 'Rest') !== 'Rest' && (
              <button className="chip" onClick={() => {
                const tmr = shiftDay(cur, 1)
                const p = data.profile
                // an easier week already covering tomorrow stays as it is, not cut to one day
                if (p.easyUntil && p.easyUntil >= tmr && (p.easyFrom || p.welcomeAsked || '') <= tmr) setPrefs({ loadNoteSeen: cur })
                else setPrefs({ loadNoteSeen: cur, easyFrom: tmr, easyUntil: tmr })
                showToast('Tomorrow will start with the shorter version selected.')
              }}>Make tomorrow lighter</button>
            )}
          </div>
          <button className="linkbtn muted" style={{ paddingLeft: 0, marginTop: 6 }} onClick={() => setSupportOpen(true)}>Finding it hard to ease off?</button>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          <div className="grp-h">{isToday ? 'Logged today' : `Logged on ${dayName}`}</div>
          <div className="list">
            {sessions.map((x) => (
              <div className="li" key={x.id}>
                <div className="m">
                  {routines.some((r) => r.id === x.routineId)
                    ? <button className="t linkbtn" style={{ padding: 0, color: 'inherit', font: 'inherit', textAlign: 'left' }} onClick={() => setSel(x.routineId!)} aria-label={`Open ${x.title}`}>{x.title}</button>
                    : <div className="t">{x.title}</div>}
                  <div className="s">{MODALITY_LABEL[x.modality] ?? x.modality}{x.mins != null ? ` · ${x.mins} min` : ''}{x.cardio?.km ? ` · ${x.cardio.km} km` : ''}</div>
                </div>
                {confirmId === x.id
                  ? <button className="linkbtn" style={{ color: 'var(--red)' }} aria-label={`Remove ${x.title}`} onClick={() => { removeSession(x.id); setConfirmId(null) }}>Remove</button>
                  : <button className="x-btn" aria-label={`Remove ${x.title}`} onClick={() => setConfirmId(x.id)}><Icon name="x" size={14} stroke={2.6} /></button>}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="list">
        <button className="li" onClick={() => setLogOpen(true)}>
          <span className="ico" style={{ background: 'var(--activity)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">Log something else</div><div className="s">A walk, yoga, pilates, anything</div></div>
          <Chevron />
        </button>
        <button className="li" onClick={() => setMyOpen(true)}>
          <span className="ico" style={{ background: 'var(--activity)' }}><Icon name="dumbbell" size={18} /></span>
          <div className="m"><div className="t">My workouts</div><div className="s">{routines.some((r) => !r.archived) ? 'Open one on any day, or build another' : 'Build your own from the library'}</div></div>
          <Chevron />
        </button>
        <button className="li" onClick={() => setLibOpen(true)}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="book" size={18} /></span>
          <div className="m"><div className="t">Exercise library</div><div className="s">How to do each move, easier and harder options</div></div>
          <Chevron />
        </button>
      </div>
      {logOpen && <LogSessionSheet onClose={() => setLogOpen(false)} />}
      {libOpen && <LibrarySheet onClose={() => setLibOpen(false)} />}
      {myOpen && !builder && (
        <MyWorkoutsSheet onClose={() => setMyOpen(false)} onBuild={(b) => setBuilder(b)}
          onStart={(id) => { setSel(id); setPicked(null); setMyOpen(false); window.scrollTo(0, 0) }} />
      )}
      {builder && (
        <RoutineBuilderSheet start={builder} onClose={() => setBuilder(null)}
          onSaved={(id) => { setBuilder(null); setMyOpen(false); setSel(id); setPicked(null) }} />
      )}
      {supportOpen && <SupportSheet onClose={() => setSupportOpen(false)} />}

      {back && (
        <div className="card dayopt">
          <div className="t">Welcome back. Want an easier first week?</div>
          <div className="foot" style={{ padding: '0 0 10px' }}>Breaks happen, and coming back is what counts. Shorter sessions for a week can make it easier to settle back in.</div>
          <div className="chips">
            <button className="chip" onClick={() => setPrefs({ welcomeAsked: cur, easyFrom: cur, easyUntil: easyUntil(cur) })}>Yes, go easier</button>
            <button className="chip" onClick={() => setPrefs({ welcomeAsked: cur })}>No thanks</button>
          </div>
        </div>
      )}

      {!back && data.profile.welcomeAsked !== cur && !logged && pick && pickUp && pickUp !== sel && (
        <div className="card dayopt">
          <div className="t">Pick up with {pickUp} whenever you're ready.</div>
          <div className="chips">
            <button className="chip" onClick={() => pickTab(pickUp)}>Do {pickUp} today</button>
            <button className="chip" onClick={() => setPrefs({ pickUpDismissed: pick.d })}>Not this time</button>
          </div>
        </div>
      )}

      <div style={{ margin: '4px 0 14px' }}><Seg options={TABS} value={routine ? undefined : (sel as WorkoutType)} onChange={pickTab} /></div>
      {routine && (
        <div className="routine-hd">
          <div>
            <div className="t">{routine.name}</div>
            <div className="s">Your workout{routine.estMins ? ` · about ${aboutMins(routine.estMins)} min` : ''}. Your weekly schedule stays as it is.</div>
          </div>
          {canBuild(data.profile) && !routine.archived && <button className="btn sm gray" onClick={() => setBuilder({ routine })}>Edit</button>}
        </div>
      )}
      {routine && wk && !wk.ex.length && <div className="foot" style={{ padding: '0 4px 12px' }}>This workout has no exercises this version of Tali knows. Update the app, or edit the workout.</div>}

      {!logged && trainingDay && (offer || askLighter) && (
        <div className="card dayopt">
          <div className="t">{offer
            ? (low.includes('sleep') ? 'Short night? ' : 'Tough day? ') + 'Here are a few options for today. All of them count.'
            : easy ? (data.profile.easyFrom && data.profile.easyFrom === data.profile.easyUntil
              ? 'Lighter day: the shorter version is selected for today. Change it any time.'
              : `Easier week: shorter sessions are selected until ${fmtDate(data.profile.easyUntil!).dow}. Change it any time.`)
            : 'Here are a few options for today. All of them count.'}</div>
          <div className="chips" role="radiogroup" aria-label="Today's session">
            {CHOICES.map(([k, label]) => (
              <button key={k} role="radio" aria-checked={choice === k} className={'chip' + (choice === k ? ' on' : '')} onClick={() => pickChoice(k)}>{label}</button>
            ))}
          </div>
          {swap && <div className="foot">This counts as today's session. Your plan carries on as usual.</div>}
        </div>
      )}
      {!logged && trainingDay && !offer && !askLighter && (
        <div className="list dayopt-link">
          <button className="li" onClick={() => setAskLighter(true)}>
            <span className="ico" style={{ background: 'var(--mind)' }}><Icon name="leaf" size={18} /></span>
            <div className="m"><div className="t">Want a lighter option?</div><div className="s">Shorter, 10-min mobility or a walk</div></div>
            <Chevron />
          </button>
        </div>
      )}

      {swap ? (
        <>
          <div className="grp-h">{swap.title}</div>
          {swap.note && <div className="foot" style={{ padding: '0 4px 10px' }}>{swap.note}</div>}
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
          <div className="stack"><button className="btn" onClick={() => {
            // show what was logged (the cardio tab with this type), not the planned lift
            const m = choice === 'walk' ? walkMins || swap.mins : swap.mins
            setSel('Cardio'); setCardioType(swap.cardioType); setMins(m)
            saveCardio(swap.cardioType, m, 'swap'); setPicked(null)
          }}>
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
          <div className="stack"><button className="btn" onClick={() => { saveCardio(cardioType, mins, cardioS?.option === 'swap' ? 'swap' : shorter ? 'shorter' : undefined); setPicked(null) }}>Save cardio</button></div>
          <div className="foot" style={{ padding: '12px 4px 0' }}>{RED_FLAG}</div>
        </>
      ) : (
        <>
          {wk!.ex.map((e, exi) => {
            const x = slotEx(exi)
            const shape = shapeFor(e, x)
            const swapped = !!swaps[exi] && !!x
            // a swapped slot shows the library entry; the planned one keeps the workout's own words
            const shown: ExerciseTemplate = swapped ? { id: x!.id, n: x!.n, t: x!.defaultRx ?? e.t, cue: x!.cue, video: x!.video } : e
            const rx = shorter ? shorterPrescription(shown.t) : shown.t
            const lastEx = lastLogged(data.days, cur, x?.id, shown.n)
            const lastTxt = lastEx ? lastEx.sets.map((r) => fmtSet(r, lastEx.log ?? shape)).filter(Boolean).join(', ') : ''
            const rows = sets[exi] || []
            const load = loadMode[exi] ?? (rows.some((r) => r.assist) ? 'assist' : rows.some((r) => r.w) ? 'added' : 'none')
            const loadOn = load !== 'none'
            return (
              <div className="card ex" key={exi}>
                <div className="h"><div className="n">{shown.n}</div><span className="tg">{rx}</span></div>
                {swapped && (
                  <div className="swapped">In place of {e.n}, {isToday ? 'today' : 'this day'} only. <button onClick={() => swapSlot(exi, e.id!)} aria-label={`Undo, back to ${e.n}`}>Undo</button>
                    {x!.care?.length ? <> Asks quite a lot of {careList(x!.care)}. {CARE_DISCLAIMER}</> : null}</div>
                )}
                <div className="cue">{shown.cue}</div>
                {!swapped && x?.gentler && x.equipment[0] === 'barbell' && x.difficulty !== 'beginner' && exById(x.gentler) && (
                  <div className="swapped">New to this? The {exById(x.gentler)!.n.toLowerCase()} is a good place to start. Tap Swap.</div>
                )}
                <div className="acts">
                  {shown.video
                    ? <button className="howto" onClick={() => setDemo(exi)}><Icon name="play" size={15} /> Watch example</button>
                    : <a className="howto" href={howToLink(shown.n)} target="_blank" rel="noopener noreferrer">Watch how to do it ›</a>}
                  {x && <button className="howto" onClick={() => setSwapFor(exi)} aria-label={`Swap ${shown.n}`}>Swap</button>}
                </div>
                {lastTxt && <div className="last num">Last time: {lastTxt}</div>}
                {shape === 'reps' && loadOn && (
                  <div className="load"><Seg options={[['none', 'Bodyweight'], ['added', 'Added weight'], ['assist', 'Assisted']]} value={load} onChange={(v) => setLoad(exi, v)} /></div>
                )}
                {rows.map((r, si) => (
                  <div className="setrow" key={si}>
                    <span className="n">Set {si + 1}</span>
                    {shape === 'weight-reps' && (
                      <>
                        <input className="num" type="number" inputMode="decimal" placeholder="kg" value={r.w} aria-label={`Set ${si + 1} weight`}
                          onChange={(ev) => updateSet(exi, si, { w: ev.target.value })} />
                        <span className="u">kg</span>
                      </>
                    )}
                    {shape === 'reps' && loadOn && (
                      <>
                        <input className="num" type="number" inputMode="decimal" placeholder="kg" value={r.w} aria-label={`Set ${si + 1} ${load === 'assist' ? 'assistance' : 'added weight'}`}
                          onChange={(ev) => updateSet(exi, si, { w: ev.target.value, ...(load === 'assist' ? { assist: true } : {}) })} />
                        <span className="u">kg</span>
                      </>
                    )}
                    {(shape === 'weight-reps' || shape === 'reps' || shape === 'rounds') && (
                      <>
                        <input className="num" type="number" inputMode="numeric" placeholder={shape === 'rounds' ? 'rounds' : 'reps'} value={r.reps}
                          aria-label={`Set ${si + 1} ${shape === 'rounds' ? 'rounds' : 'reps'}`} onChange={(ev) => updateSet(exi, si, { reps: ev.target.value })} />
                        <span className="u">{shape === 'rounds' ? 'rounds' : 'reps'}</span>
                      </>
                    )}
                    {shape === 'hold' && (
                      <>
                        <input className="num" type="number" inputMode="numeric" placeholder="sec" value={r.sec ?? ''} aria-label={`Set ${si + 1} seconds`}
                          onChange={(ev) => updateSet(exi, si, { sec: ev.target.value })} />
                        <span className="u">sec</span>
                        <button className="tm" onClick={() => setTimer({ exi, si })} aria-label={`Time set ${si + 1}`}>Timer</button>
                      </>
                    )}
                    {shape === 'duration' && (
                      <>
                        <input className="num" type="number" inputMode="numeric" placeholder="min" value={r.mins ?? ''} aria-label={`Set ${si + 1} minutes`}
                          onChange={(ev) => updateSet(exi, si, { mins: ev.target.value })} />
                        <span className="u">min</span>
                        <input className="num" type="number" inputMode="decimal" placeholder="km" value={r.km ?? ''} aria-label={`Set ${si + 1} distance`}
                          onChange={(ev) => updateSet(exi, si, { km: ev.target.value })} />
                        <span className="u">km</span>
                      </>
                    )}
                    {shape === 'check' && (
                      <label className="tick"><Toggle on={!!r.done} label={`Set ${si + 1} done`} onChange={() => updateSet(exi, si, { done: !r.done })} /> Done</label>
                    )}
                  </div>
                ))}
                <div className="acts">
                  <button className="addset" onClick={() => addSet(exi)}>Add set</button>
                  {shape === 'reps' && !loadOn && <button className="addset" onClick={() => setLoad(exi, 'added')}>Add weight or assistance</button>}
                </div>
              </div>
            )
          })}
          <div className="stack"><button className="btn" onClick={commitLift} disabled={!wk!.ex.length}>{routine ? `Save ${shorter ? 'shorter ' : ''}${routine.name}` : `Save ${shorter ? 'shorter ' : ''}${sel} session`}</button></div>
        </>
      )}

      {wk && demo != null && (() => { const x = swaps[demo] ? slotEx(demo) : undefined; const ex = x ? { n: x.n, t: x.defaultRx ?? '', cue: x.cue, video: x.video } : wk.ex[demo]; return ex?.video ? <DemoPlayer ex={ex} onClose={closeDemo} /> : null })()}
      {wk && swapFor != null && slotEx(swapFor) && (
        <SwapSheet current={slotEx(swapFor)!} planned={swaps[swapFor] ? exById(wk.ex[swapFor].id) : undefined}
          shorter={shorter} onPick={(id) => swapSlot(swapFor, id)} onClose={() => setSwapFor(null)} />
      )}
      {wk && timer && (() => {
        const x = slotEx(timer.exi)
        const e = wk.ex[timer.exi]
        const t = swaps[timer.exi] && x ? x.defaultRx ?? e.t : e.t
        return <HoldTimer name={swaps[timer.exi] && x ? x.n : e.n} rx={shorter ? shorterPrescription(t) : t} perSide={x?.perSide}
          onDone={(sec) => updateSet(timer.exi, timer.si, { sec: String(sec) })} onClose={() => setTimer(null)} />
      })()}

      {!swap && sel !== 'Cardio' && (
        <div className="foot" style={{ padding: '12px 4px 0' }}>
          {/* the lifting advice only where there is lifting; the red flag always */}
          {resistCard && <>
          {/* no progression prompt on a shorter day (plan §4.0.5) */}
          Keep two or three reps in the tank each set.{shorter ? '' : ' When every set hits the top of the range with good form, add a little weight next time.'} Rest
          about 90 seconds between sets. </>}{RED_FLAG}
        </div>
      )}
    </div>
  )
}
