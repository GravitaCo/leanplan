import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { ExerciseTemplate, LoggedExercise, Session, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS, firstVideo } from '@/core/data/workouts'
import { fmtDate, shiftDay, todayStr } from '@/core/domain/date'
import { catchUp, daysMovedThisWeek, easyUntil, welcomeBack } from '@/core/domain/training'
import { lowSignals, offerLighter } from '@/core/domain/dayOptions'
import { builtinId, builtinType, isBuiltin, sessionsOf } from '@/core/domain/sessions'
import { showLoadNote } from '@/core/domain/load'
import { exById } from '@/core/domain/library'
import { setCount, slotsOf, working } from '@/core/domain/guided'
import { plannedOn, shortTitle } from '@/core/domain/week'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { EXERCISES } from '@/core/data/exercises'
import { PageHeader } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { DayNav, MoveStrip } from '@/ui/WeekStrip'
import { SupportSheet } from './train/SupportSheet'
import { LogSessionSheet } from './train/LogSessionSheet'
import { LibrarySheet } from './train/LibrarySheet'
import { AddSomethingSheet } from './train/AddSomethingSheet'
import { Preview, CHOICES, type Choice } from './train/Preview'
import { GuidedPlayer } from './train/GuidedPlayer'
import { ManualLog } from './train/ManualLog'
import { Thumb } from './train/Thumb'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

/** The library id a logged exercise stands for, when it isn't the workout's own (a swap). */
function loggedSwap(t: ExerciseTemplate, L: LoggedExercise | undefined): string | undefined {
  if (!L || L.name === t.n) return undefined
  const id = L.exId ?? EXERCISES.find((x) => x.n === L.name)?.id
  return id && id !== t.id ? id : undefined
}

/**
 * Train: what I'm doing today (stage 4 redesign). The day's planned workout with Start, a
 * catch-up offer, "Add something", the lighter options and what's done. Planning (the week, the
 * workouts) lives in Plan; one-off changes for today happen here.
 */
export function TrainScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const removeSession = useStore((s) => s.removeSession)
  const trainOpen = useStore((s) => s.trainOpen)
  const openPlan = useStore((s) => s.openPlan)
  const clearOpen = useStore((s) => s.clearOpen)

  const [addOpen, setAddOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  // two taps to remove, so a mis-tap never deletes logged sets
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [open, setOpen] = useState<WorkoutType | null>(null)
  const [mode, setMode] = useState<'preview' | 'manual'>('preview')
  const [playing, setPlaying] = useState(false)
  const [swapsBy, setSwapsBy] = useState<Record<string, Record<number, string>>>({})
  const [picked, setPicked] = useState<Choice | null>(null)
  const gentle = !!data.profile.gentle

  const day = data.days[cur]
  const sessions = sessionsOf(day, cur)
  const logged = sessions.length > 0
  const builtin = (t: string) => sessions.find((x) => x.routineId === builtinId(t))
  const fd = fmtDate(cur)
  // anything unknown in the schedule (a newer or broken install) reads as Rest, never a crash
  const sched = plannedOn(data.schedule, fd.idx)
  const isToday = cur === todayStr()
  const dayName = fd.dow

  // day-of choices: offered when two or more check-in signals are low for this person, and
  // always available from a quiet row; never applied automatically
  const recent = useMemo(() => Object.keys(data.days).filter((d) => d < cur).sort().reverse().map((d) => data.days[d]?.checkin), [data.days, cur])
  const low = lowSignals(day?.checkin, recent)
  // not on rest days: rest is the plan, and a lighter option than rest would nudge movement
  const offer = !logged && sched !== 'Rest' && offerLighter(day?.checkin, recent)
  // an accepted "easier first week" pre-selects the shorter version (still just a choice)
  const easy = !logged && sched !== 'Rest' && !!data.profile.easyUntil && cur >= (data.profile.easyFrom || data.profile.welcomeAsked || '') && cur <= data.profile.easyUntil
  const [lighterOpen, setLighterOpen] = useState(false)

  useEffect(() => { setOpen(null); setPicked(null); setSwapsBy({}); setConfirmId(null); setLighterOpen(false); setPlaying(false) }, [cur])
  // Plan's "Do this today" hands a workout over
  useEffect(() => {
    if (!trainOpen) return
    openWorkout(trainOpen)
    clearOpen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainOpen])

  const pick = isToday ? catchUp(data, cur) : null
  const pickUp = pick?.type
  const weekCount = daysMovedThisWeek(data, cur)
  const back = isToday && welcomeBack(data, cur)

  /** today's version of a workout: its own saved session wins, then the person's pick, then the day's default */
  const choiceFor = (t: WorkoutType): Choice => {
    if (picked) return picked
    const own = builtin(t)
    if (own) return own.option === 'shorter' ? 'shorter' : 'planned'
    return easy ? 'shorter' : 'planned'
  }
  const swapsFor = (t: WorkoutType): Record<number, string> => {
    if (swapsBy[t]) return swapsBy[t]
    const out: Record<number, string> = {}
    const L = builtin(t)?.ex
    WORKOUTS[t].ex.forEach((e, i) => { const id = loggedSwap(e, L?.[i]); if (id && exById(id)) out[i] = id })
    return out
  }
  function setSwap(t: WorkoutType, i: number, id: string) {
    const cur0 = swapsFor(t)
    const n = { ...cur0 }
    if (id === WORKOUTS[t].ex[i].id) delete n[i]; else n[i] = id
    setSwapsBy((p) => ({ ...p, [t]: n }))
  }
  function openWorkout(t: WorkoutType, c?: Choice) {
    if (!WORKOUTS[t]) return // an unknown workout (from a newer install or a bad hand-off): stay on the list
    if (c) setPicked(c)
    setMode('preview'); setOpen(t); window.scrollTo(0, 0)
  }
  const closeWorkout = () => { setOpen(null); setPlaying(false); setMode('preview'); window.scrollTo(0, 0) }

  const easyNote = easy ? (data.profile.easyFrom && data.profile.easyFrom === data.profile.easyUntil
    ? 'Lighter day: the shorter version is selected for today. Change it any time.'
    : `Easier week: shorter sessions are selected until ${fmtDate(data.profile.easyUntil!).dow}. Change it any time.`) : null

  // ---------- a workout is open: preview, the manual form, or the player ----------
  if (open) {
    const choice = choiceFor(open)
    const shorter = choice === 'shorter'
    const swaps = swapsFor(open)
    const slots = slotsOf(WORKOUTS[open].ex, swaps, shorter, exById)
    const option = shorter ? 'shorter' as const : undefined
    if (mode === 'manual') {
      return <ManualLog type={open} slots={slots} option={option} swaps={swaps} onSwap={(i, id) => setSwap(open, i, id)} onBack={() => { setMode('preview'); window.scrollTo(0, 0) }} />
    }
    return (
      <>
        <Preview type={open} choice={choice} onChoice={setPicked} slots={slots} swaps={swaps} onSwap={(i, id) => setSwap(open, i, id)}
          session={builtin(open)} note={choice === 'shorter' ? easyNote : null} dayName={dayName} isToday={isToday}
          onStart={() => setPlaying(true)} onManual={() => { setMode('manual'); window.scrollTo(0, 0) }} onBack={closeWorkout}
          onEditPlan={() => openPlan(open)} />
        {playing && <GuidedPlayer type={open} slots={slots} option={option} onSwap={(i, id) => setSwap(open, i, id)} onClose={() => { setPlaying(false); setPicked(null) }} onFinished={closeWorkout} />}
      </>
    )
  }

  // ---------- the today list ----------
  const plannedType = sched !== 'Rest' ? (sched as WorkoutType) : null
  const own = plannedType ? builtin(plannedType) : undefined
  const plannedShorter = plannedType ? choiceFor(plannedType) === 'shorter' : false
  const plannedSets = plannedType && LIFTS.includes(plannedType)
    ? slotsOf(WORKOUTS[plannedType].ex, swapsFor(plannedType), plannedShorter, exById).reduce((a, s) => a + s.sets, 0) : 0
  const ownDone = own?.ex ? own.ex.reduce((a, e) => a + working(e.sets).length, 0) : 0
  // left part-way in the player ("Leave for now", or closed mid-session): offer Resume
  const inProgress = !!own && plannedType !== 'Cardio' && own.open === true
  const showPlanned = !!plannedType && (!own || inProgress)
  const plannedSub = plannedType === 'Cardio' ? WORKOUTS.Cardio.ex[0].t
    : plannedType ? `${WORKOUTS[plannedType].ex.length} exercises · ${setCount(WORKOUTS[plannedType].ex, plannedShorter)}${plannedShorter ? ' · shorter' : ''}` : ''
  const plannedVideo = plannedType ? firstVideo(plannedType) : undefined
  const showPick = !back && data.profile.welcomeAsked !== cur && !logged && !!pick && !!pickUp && pickUp !== sched
  const lighterShown = !logged && sched !== 'Rest'
  const lighterUp = lighterShown && (offer || easy)

  const lighter = (
    <div className={'card lighter' + (lighterUp || lighterOpen ? ' open' : '')}>
      {lighterUp ? (
        <div className="t">{offer
          ? (low.includes('sleep') ? 'Short night? ' : 'Tough day? ') + 'Here are a few options for today. All of them count.'
          : easyNote}</div>
      ) : (
        <button className="lh" aria-expanded={lighterOpen} onClick={() => setLighterOpen(!lighterOpen)}>
          <span className="t">Lighter options</span>
          <span className="s">Shorter, mobility, walk <Chevron rotate={lighterOpen ? 270 : 90} /></span>
        </button>
      )}
      {(lighterUp || lighterOpen) && (
        <div className="chips" role="group" aria-label="Today's session" style={{ marginTop: 10 }}>
          {CHOICES.map(([k, label]) => (
            <button key={k} className={'chip' + (plannedType && choiceFor(plannedType) === k ? ' on' : '')} onClick={() => plannedType && openWorkout(plannedType, k)}>{label}</button>
          ))}
        </div>
      )}
    </div>
  )

  const sessSub = (x: Session) => {
    const n = x.ex ? x.ex.reduce((a, e) => a + working(e.sets).length, 0) : 0
    return [MODALITY_LABEL[x.modality] ?? x.modality, x.ex ? `${n} ${n === 1 ? 'set' : 'sets'}` : '', x.mins != null && !x.ex ? `${x.mins} min` : '', x.cardio?.km ? `${x.cardio.km} km` : '', x.option === 'shorter' ? 'shorter' : '']
      .filter(Boolean).join(' · ')
  }
  const routineOf = (x: Session): WorkoutType | null => {
    const t = builtinType(x) as WorkoutType
    return isBuiltin(x) && WORKOUTS[t] && x.option !== 'swap' ? t : null
  }

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Train" />
      <MoveStrip />

      {isToday && showLoadNote(data, cur) && (
        <div className="card dayopt">
          <div className="t">You've trained a lot this week. Rest is when your body adapts, so a lighter day can help.</div>
          <div className="chips">
            <button className="chip" onClick={() => setPrefs({ loadNoteSeen: cur })}>Thanks</button>
            {plannedOn(data.schedule, fmtDate(shiftDay(cur, 1)).idx) !== 'Rest' && (
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

      {lighterUp && lighter}

      <section className="tsec" aria-labelledby="today-h">
        <h2 id="today-h" className="tsec-h">{isToday ? 'Today' : dayName}</h2>
        <div className="list tlist">
          {showPlanned && plannedType && (
            <div className="li trow" role="button" tabIndex={0} onClick={() => openWorkout(plannedType)}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openWorkout(plannedType) } }}>
              <Thumb video={plannedVideo} big />
              <div className="m">
                <div className="t b">{shortTitle(plannedType)}</div>
                <div className="s num">{inProgress ? `In progress · ${ownDone} of ${plannedSets} sets` : plannedSub}</div>
              </div>
              <button className="btn sm startb" onClick={(e) => { e.stopPropagation(); openWorkout(plannedType) }}>{inProgress ? 'Resume' : 'Start'}</button>
            </div>
          )}
          {sched === 'Rest' && (
            <div className="li trow">
              <span className="thumb big ph" aria-hidden="true"><Icon name="leaf" size={22} /></span>
              <div className="m"><div className="t b">Rest day</div><div className="s">Recovery counts too. A gentle walk is fine.</div></div>
            </div>
          )}
          {plannedType && own && !inProgress && !showPick && (
            <div className="li trow">
              <span className="done-chk" aria-hidden="true"><Icon name="check" size={16} stroke={2.6} /></span>
              <div className="m"><div className="t b">All done for today</div><div className="s">{shortTitle(plannedType)} is in Done today</div></div>
            </div>
          )}
          {showPick && pickUp && (
            <div className="li trow">
              <span className="thumb big ph" aria-hidden="true"><Icon name="dumbbell" size={22} /></span>
              <div className="m"><div className="t muted">{shortTitle(pickUp)}, from {fmtDate(pick!.d).dow}</div><div className="s">If you'd like to pick it up</div></div>
              <button className="linkbtn" onClick={() => openWorkout(pickUp)}>Add</button>
              <button className="x-btn" aria-label="Not this time" onClick={() => setPrefs({ pickUpDismissed: pick!.d })}><Icon name="x" size={14} stroke={2.6} /></button>
            </div>
          )}
          <button className="li act addrow" onClick={() => setAddOpen(true)}><Icon name="plus" size={20} /><span>Add something</span></button>
        </div>
      </section>

      {lighterShown && !lighterUp && lighter}

      {weekCount > 0 && <div className="foot week-n">You moved on {gentle ? WORDS[weekCount] : weekCount} {weekCount === 1 ? 'day' : 'days'} this week</div>}

      <section className="tsec" aria-labelledby="done-h">
        <h2 id="done-h" className="tsec-s">{isToday ? 'Done today' : `Done on ${dayName}`}</h2>
        {sessions.length ? (
          <div className="list">
            {sessions.map((x) => {
              const r = routineOf(x)
              const body = (
                <>
                  <span className="done-chk" aria-hidden="true"><Icon name="check" size={16} stroke={2.6} /></span>
                  <div className="m"><div className="t">{x.title.split(' · ')[0]}</div><div className="s">{sessSub(x)}</div></div>
                </>
              )
              return (
                <div className="li" key={x.id}>
                  {r ? <button className="li-in" onClick={() => openWorkout(r)} aria-label={`Open ${x.title}`}>{body}</button> : <div className="li-in">{body}</div>}
                  {confirmId === x.id
                    ? <button className="linkbtn" style={{ color: 'var(--red)' }} aria-label={`Remove ${x.title}`} onClick={() => { removeSession(x.id); setConfirmId(null) }}>Remove</button>
                    : <button className="x-btn" aria-label={`Remove ${x.title}`} onClick={() => setConfirmId(x.id)}><Icon name="x" size={14} stroke={2.6} /></button>}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="dash-empty">{isToday ? 'Nothing yet. Anything you do today shows here.' : `Nothing logged on ${dayName}.`}</div>
        )}
      </section>

      {addOpen && <AddSomethingSheet planned={sched} onClose={() => setAddOpen(false)}
        onLog={() => { setAddOpen(false); setLogOpen(true) }}
        onWorkout={(w) => { setAddOpen(false); openWorkout(w) }}
        onLibrary={() => { setAddOpen(false); setLibOpen(true) }} />}
      {logOpen && <LogSessionSheet onClose={() => setLogOpen(false)} />}
      {libOpen && <LibrarySheet onClose={() => setLibOpen(false)} />}
      {supportOpen && <SupportSheet onClose={() => setSupportOpen(false)} />}
    </div>
  )
}
