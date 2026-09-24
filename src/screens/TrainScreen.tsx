import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { DayLog, SetEntry, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS, SWAPS } from '@/core/data/workouts'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { fmtDate, shiftDay, todayStr } from '@/core/domain/date'
import { catchUp, daysMovedThisWeek, easyUntil, welcomeBack } from '@/core/domain/training'
import { SupportSheet } from './train/SupportSheet'
import { howToLink } from '@/core/domain/workout'
import { lowSignals, shorterPrescription } from '@/core/domain/dayOptions'
import { PageHeader, Seg } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { DayNav } from '@/ui/WeekStrip'
import { DemoPlayer } from './train/DemoPlayer'
import { LogSessionSheet } from './train/LogSessionSheet'
import { sessionsOf } from '@/core/domain/sessions'
import { showLoadNote } from '@/core/domain/load'
import { MODALITY_LABEL } from '@/core/data/modalities'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

const TABS: [WorkoutType, string][] = [['Legs', 'Legs'], ['Push', 'Push'], ['Pull', 'Pull'], ['Cardio', 'Cardio']]

/** Day-of choices (plan §0.2): equal options, the planned session always one tap away. */
type Choice = 'planned' | 'shorter' | 'mobility' | 'walk'
const CHOICES: [Choice, string][] = [['planned', 'As planned'], ['shorter', 'Shorter'], ['mobility', '10-min mobility'], ['walk', 'Easy walk']]

/** The most recent other day's session from this built-in card, for "Last time". */
function lastSessionOf(days: Record<string, DayLog>, cur: string, type: string) {
  const ds = Object.keys(days).filter((d) => d !== cur).sort().reverse()
  for (const d of ds) {
    const x = sessionsOf(days[d], d).find((y) => y.routineId === 'builtin-' + type)
    if (x) return x
  }
  return null
}

export function TrainScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const saveCardio = useStore((s) => s.saveCardio)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const removeSession = useStore((s) => s.removeSession)
  const [logOpen, setLogOpen] = useState(false)
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

  const initial: WorkoutType =
    (firstBuiltin?.routineId?.replace('builtin-', '') as WorkoutType) || (LIFTS.includes(sched as WorkoutType) ? (sched as WorkoutType) : 'Cardio')
  const [sel, setSel] = useState<WorkoutType>(initial)
  useEffect(() => {
    setSel(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  // editable set state for lifts: index -> sets[]
  const wk = sel !== 'Cardio' ? WORKOUTS[sel] : null
  const loggedSets = builtin(sel)?.ex ?? null
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
  }, [sel, cur, builtin(sel)?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const offer = !logged && sched !== 'Rest' && low.length >= 2
  // an accepted "easier first week" pre-selects the shorter version (still just a choice)
  const easy = !logged && sched !== 'Rest' && !!data.profile.easyUntil && cur >= (data.profile.easyFrom || data.profile.welcomeAsked || '') && cur <= data.profile.easyUntil
  const [walkMins, setWalkMins] = useState('')
  /*
   * The day-of choice is worked out, not stored, so it's right on the first frame:
   * - a card with its own saved session shows that version (a shorter Push stays shorter),
   *   unless the person picks something else on that card;
   * - otherwise the person's pick carries across tabs until it's used to save;
   * - otherwise the day's default (shorter in an easier week or on a lighter day).
   */
  const [picked, setPicked] = useState<{ choice: Choice; tab: WorkoutType } | null>(null)
  const [askLighter, setAskLighter] = useState(easy)
  useEffect(() => { setPicked(null); setAskLighter(easy); setWalkMins(''); setConfirmId(null) }, [cur, easy]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setConfirmId(null) }, [sel])
  const own = builtin(sel)
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

  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])

  const last = useMemo(() => (sel !== 'Cardio' ? lastSessionOf(data.days, cur, sel) : null), [data.days, cur, sel])

  const dayName = fd.dow
  const one = sessions.length === 1 ? sessions[0] : null
  const banner = sessions.length > 1 ? (
    <><b>{sessions.length} sessions</b> logged for {dayName}.</>
  ) : one?.option === 'swap' ? (
    <><b>{one.title}</b> logged for {dayName}. Gentle movement counts too.</>
  ) : one ? (
    <><b>{one.option === 'shorter' ? 'Shorter ' + (one.modality === 'strength' ? one.title : one.title.toLowerCase()) : one.title}</b> logged for {dayName}.</>
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
              <button className="chip" onClick={() => { setPrefs({ loadNoteSeen: cur, easyFrom: shiftDay(cur, 1), easyUntil: shiftDay(cur, 1) }); showToast('Tomorrow will start with the shorter version selected.') }}>Make tomorrow lighter</button>
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
                  <div className="t">{x.title}</div>
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
      </div>
      {logOpen && <LogSessionSheet onClose={() => setLogOpen(false)} />}
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

      <div style={{ margin: '4px 0 14px' }}><Seg options={TABS} value={sel} onChange={pickTab} /></div>

      {!logged && sched !== 'Rest' && (offer || askLighter) && (
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
      {!logged && sched !== 'Rest' && !offer && !askLighter && (
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
        </>
      ) : (
        <>
          {wk!.ex.map((e, exi) => {
            const isPlank = e.n.toLowerCase().includes('plank')
            // same slot AND same exercise: a replaced move (leg press → squat) never shows the old weights
            const lastEx = last?.ex?.[exi]?.name === e.n ? last.ex[exi] : undefined
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

      {!swap && sel !== 'Cardio' && (
        <div className="foot" style={{ padding: '12px 4px 0' }}>
          Keep two or three reps in the tank each set. When every set hits the top of the range with good form, add a little
          weight next time. Rest about 90 seconds between sets.
        </div>
      )}
    </div>
  )
}
