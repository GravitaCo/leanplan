import { useEffect, useMemo, useState } from 'react'
import { useStore, TRAIN_LOG_WALK } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import { fmtDate, shiftDay, todayStr } from '@/core/domain/date'
import { easyUntil } from '@/core/domain/training'
import { showLoadNote } from '@/core/domain/load'
import { plannedKeys } from '@/core/domain/plans'
import { planArt } from './plan/PlanParts'
import { keyTitle, templateFor, type WorkoutKey } from '@/core/domain/routines'
import { PageHeader } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { DayNav, MoveStrip } from '@/ui/WeekStrip'
import { SupportSheet } from './train/SupportSheet'
import { LogSessionSheet } from './train/LogSessionSheet'
import { LibrarySheet } from './train/LibrarySheet'
import { AddSomethingSheet } from './train/AddSomethingSheet'
import { Preview } from './train/Preview'
import { GuidedPlayer } from './train/GuidedPlayer'
import { ManualLog } from './train/ManualLog'
import { Thumb } from './train/Thumb'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { HARD_DAY_COPY } from './train/hardDay'
import { CHOICES, type Choice } from '@/copy/train'
import { NO_TRAIN_UI, sessSub, trainDay, type TrainUi } from './train/trainModel'
import './train/hardDay.css'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

/**
 * Train: what I'm doing today (stage 4 redesign). The day's planned workout with Start, a
 * catch-up offer, "Add something", the lighter options and what's done. Planning (the week, the
 * workouts) lives in Plan; one-off changes for today happen here. The day model is shared with the
 * native app (train/trainModel.ts).
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
  // Get outside's Start (B13) opens "Log a session" set to an Easy walk
  const [logWalk, setLogWalk] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  // two taps to remove, so a mis-tap never deletes logged sets
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // a built-in's type or the id of one of the user's own workouts (plan P4)
  const [open, setOpen] = useState<WorkoutKey | null>(null)
  const [mode, setMode] = useState<'preview' | 'manual'>('preview')
  const [playing, setPlaying] = useState(false)
  const [ui, setUi] = useState<TrainUi>(NO_TRAIN_UI)
  const setPicked = (c: Choice | null, k: WorkoutKey | null = open) => setUi((u) => ({ ...u, pick0: c && k ? { c, k } : null }))
  const gentle = quietNumbers(data)
  const [lighterOpen, setLighterOpen] = useState(false)

  // today's date is a dependency too, so an app left open past midnight moves "today" on
  const today = todayStr()
  const m = useMemo(() => trainDay(data, cur, ui), [data, cur, ui, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const { sessions, routines, planned, restDay, planNow, planPos, isToday, dayName, offer, choiceFor, planShortKind } = m

  useEffect(() => { setOpen(null); setUi(NO_TRAIN_UI); setConfirmId(null); setLighterOpen(false); setPlaying(false) }, [cur])
  // Plan's "Do this today" hands a workout over; Get outside's Start (B13) hands over an Easy walk to log
  useEffect(() => {
    if (!trainOpen) return
    if (trainOpen === TRAIN_LOG_WALK) { setLogWalk(true); setLogOpen(true) } else openWorkout(trainOpen)
    clearOpen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainOpen])

  function setSwap(t: WorkoutKey, i: number, id: string) {
    const n = m.withSwap(t, i, id)
    setUi((u) => ({ ...u, ...n }))
  }
  function openWorkout(t: WorkoutKey, c?: Choice) {
    if (!templateFor(t, routines)) return // an unknown workout (from a newer install or a bad hand-off): stay on the list
    if (c) setPicked(c, t)
    setMode('preview'); setOpen(t); window.scrollTo(0, 0)
  }
  const closeWorkout = () => { setOpen(null); setPlaying(false); setMode('preview'); window.scrollTo(0, 0) }

  // ---------- a workout is open: preview, the manual form, or the player ----------
  if (open) {
    const v = m.openView(open)
    const { choice, slots, swaps, option, kind } = v
    if (mode === 'manual') {
      return <ManualLog type={open} slots={slots} option={option} swaps={swaps} onSwap={(i, id) => setSwap(open, i, id)} onBack={() => { setMode('preview'); window.scrollTo(0, 0) }} easier={kind === 'easier'} />
    }
    return (
      <>
        <Preview type={open} choice={choice} onChoice={(c) => setPicked(c, open)} slots={slots} swaps={swaps} onSwap={(i, id) => setSwap(open, i, id)}
          session={v.session} note={v.shorterNote} dayName={dayName} isToday={isToday}
          onStart={() => setPlaying(true)} onManual={() => { setMode('manual'); window.scrollTo(0, 0) }} onBack={closeWorkout}
          onEditPlan={() => openPlan(open)} generated={v.generated}
          swapId={v.swapDay?.swap} shorterKind={kind} noShorter={v.noShorter} roughNote={v.roughNote} />
        {playing && <GuidedPlayer type={open} slots={slots} option={option} generated={v.generated} shorterKind={kind} onSwap={(i, id) => setSwap(open, i, id)} onClose={() => { setPlaying(false); setPicked(null) }} onFinished={closeWorkout} />}
      </>
    )
  }

  // ---------- the today list ----------
  const { rows, first, allDone, showPick, pick, pickUp, lighterShown, lighterUp, weekCount, back } = m

  const lighter = WELLBEING_ENABLED ? hardDayCard() : (
    <div className={'card lighter' + (lighterUp || lighterOpen ? ' open' : '')}>
      {lighterUp ? (
        <div className="t">{m.lighterHeading}</div>
      ) : (
        <button className="lh" aria-expanded={lighterOpen} onClick={() => setLighterOpen(!lighterOpen)}>
          <span className="t">Lighter options</span>
          <span className="s">Shorter, mobility, walk <Chevron rotate={lighterOpen ? 270 : 90} /></span>
        </button>
      )}
      {(lighterUp || lighterOpen) && (
        <div className="chips" role="group" aria-label="Today's session" style={{ marginTop: 10 }}>
          {CHOICES.map(([k, label]) => (
            <button key={k} className={'chip' + (first && choiceFor(first) === k ? ' on' : '')} onClick={() => first && openWorkout(first, k)}>{label}</button>
          ))}
        </div>
      )}
    </div>
  )

  /**
   * Board B3: three equal options for the day's first workout (As planned, Shorter, the
   * day-matched swap), nothing selected, each opening the preview; the effort note, the
   * rough-night note when it applies, and "Resting today is fine too." as a plain line.
   */
  function hardDayCard() {
    const hd = m.hardDay()
    const k = hd.k
    const up = lighterUp || lighterOpen
    const tiles = hd.tiles
    return (
      <div className={'card lighter hd' + (up ? ' open' : '')}>
        {lighterUp ? (
          <div className="t">{hd.heading}</div>
        ) : (
          <button className="lh" aria-expanded={lighterOpen} onClick={() => setLighterOpen(!lighterOpen)}>
            <span className="t">Lighter options</span>
            <span className="s">{HARD_DAY_COPY.collapsed} <Chevron rotate={lighterOpen ? 270 : 90} /></span>
          </button>
        )}
        {up && k && (
          <>
            <div className="hd-opts" role="group" aria-label="Today's session">
              {tiles.map((x) => (
                <button key={x.c} type="button" className="opttile" onClick={() => openWorkout(k, x.c)}>
                  <span className="dot" aria-hidden="true" />
                  <span className="m"><span className="k">{x.k}</span><span className="tt">{x.t}</span><span className="d num">{x.d}</span></span>
                  <Chevron />
                </button>
              ))}
            </div>
            <div className="foot">{hd.effort}</div>
            {hd.roughNote && <div className="foot">{HARD_DAY_COPY.roughNote}</div>}
            {offer && <div className="foot">{HARD_DAY_COPY.rest}</div>}
          </>
        )}
      </div>
    )
  }

  const routineOf = m.routineOf

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Train" />
      <MoveStrip />

      {isToday && showLoadNote(data, cur) && (
        <div className="card dayopt">
          <div className="t">You've trained a lot this week. Rest is when your body adapts, so a lighter day can help.</div>
          <div className="chips">
            <button className="chip" onClick={() => setPrefs({ loadNoteSeen: cur })}>Thanks</button>
            {plannedKeys(data, shiftDay(cur, 1)).length > 0 && (
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
        {planNow && planPos && (
          <div className="t-plan">
            {planArt(planNow.baseTemplateId) ? <img src={planArt(planNow.baseTemplateId)} alt="" /> : <span className="dot" aria-hidden="true" />}
            <span><b>{planNow.name}</b> · {planPos.maintenanceWeek != null ? `${planPos.phase.full ? 'Carrying on' : 'Maintenance'}, week ${planPos.maintenanceWeek}` : planPos.ended ? `${planPos.total} weeks, done` : `Week ${planPos.week} of ${planPos.total} · ${planPos.phase.name}`}</span>
          </div>
        )}
        <h2 id="today-h" className="tsec-h">{isToday ? 'Today' : dayName}</h2>
        <div className="list tlist">
          {rows.filter((r) => r.show).map((r) => (
            <div key={r.k} className="li trow" role="button" tabIndex={0} onClick={() => openWorkout(r.k)}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openWorkout(r.k) } }}>
              <Thumb video={r.video} big />
              <div className="m">
                <div className="t b">{keyTitle(r.k, routines)}</div>
                <div className="s num">{r.inProgress ? `In progress · ${r.done} of ${r.sets} sets` : r.sub}</div>
              </div>
              <button className="btn sm startb" onClick={(e) => { e.stopPropagation(); openWorkout(r.k) }}>{r.inProgress ? 'Resume' : 'Start'}</button>
              {/* a lighter week or maintenance: a quiet way back to the full workout, never a nudge on a
                  low check-in day or in gentle mode, and after maintenance's first week only the link */}
              {r.planShort && !r.inProgress && (
                <div className="trow-note" onClick={(e) => e.stopPropagation()}>
                  {planPos?.maintenanceWeek != null
                    ? <>{planPos.maintenanceWeek === 1 ? 'Maintenance: fewer sets, the same weights as before. ' : ''}{!offer && !gentle && <button className="linkbtn inl" onClick={() => openWorkout(r.k, 'planned')}>Full workout</button>}</>
                    : <>{planShortKind === 'ease' ? 'Easing in: shorter sessions while you find your weights.' : 'A lighter week, to recover before the next stretch.'}{!offer && !gentle && <> <button className="linkbtn inl" onClick={() => openWorkout(r.k, 'planned')}>The full workout</button> is here if you'd like it.</>}</>}
                </div>
              )}
            </div>
          ))}
          {restDay && (
            <div className="li trow">
              <span className="thumb big ph" aria-hidden="true"><Icon name="leaf" size={22} /></span>
              <div className="m"><div className="t b">Rest day</div><div className="s">Recovery counts too. A gentle walk is fine.</div></div>
            </div>
          )}
          {allDone && !showPick && (
            <div className="li trow">
              <span className="done-chk" aria-hidden="true"><Icon name="check" size={16} stroke={2.6} /></span>
              <div className="m"><div className="t b">All done for today</div><div className="s">{rows.length === 1 ? `${keyTitle(rows[0].k, routines)} is` : 'Your workouts are'} in Done today</div></div>
            </div>
          )}
          {showPick && pickUp && (
            <div className="li trow">
              <span className="thumb big ph" aria-hidden="true"><Icon name="dumbbell" size={22} /></span>
              <div className="m"><div className="t muted">{keyTitle(pickUp, routines)}, from {fmtDate(pick!.d).dow}</div><div className="s">If you'd like to pick it up</div></div>
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

      {addOpen && <AddSomethingSheet planned={planned} onClose={() => setAddOpen(false)}
        onLog={() => { setAddOpen(false); setLogOpen(true) }}
        onWorkout={(w) => { setAddOpen(false); openWorkout(w) }}
        onLibrary={() => { setAddOpen(false); setLibOpen(true) }} />}
      {logOpen && <LogSessionSheet preset={logWalk ? { modality: 'cardio', cardioKey: 'Easy walk' } : undefined} onClose={() => { setLogOpen(false); setLogWalk(false) }} />}
      {libOpen && <LibrarySheet onClose={() => setLibOpen(false)} />}
      {supportOpen && <SupportSheet onClose={() => setSupportOpen(false)} />}
    </div>
  )
}
