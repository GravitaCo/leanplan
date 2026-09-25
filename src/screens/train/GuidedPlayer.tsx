import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useStore } from '@/store/store'
import type { Effort, ExerciseMedia, LoggedExercise, SetEntry, Workout, WorkoutType } from '@/core/types'
import { mediaUrl } from '@/core/data/media'
import { PHASE_LABEL, tempoAt } from '@/core/domain/tempo'
import { todayStr } from '@/core/domain/date'
import { buildLogged, fmtClock, fmtTarget, lastTime, later, readyToStepUp, restFor, restHint, setsLine, splitLogged, stintMins, swapInto, targetFor, warmupSlot, working, type Slot } from '@/core/domain/guided'
import { sessionsOf } from '@/core/domain/sessions'
import { exById } from '@/core/domain/library'
import { howToLink } from '@/core/domain/workout'
import { shortTitle } from '@/core/domain/week'
import { Sheet, Toggle, useScrollLock } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { AdjustSheet } from './AdjustSheet'
import { FinishSheet } from './FinishSheet'
import { HoldTimer } from './HoldTimer'
import { SwapSheet } from './SwapSheet'

const SOUND_KEY = 'tali.sound'
const soundPref = () => { try { return localStorage.getItem(SOUND_KEY) === '1' } catch { return false } }
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

/** "Romanian deadlift (dumbbell or barbell)" → "Romanian deadlift" */
export const bareName = (n: string) => n.replace(/\s*\(.*\)\s*$/, '')
/** The first sentence of a cue, for the line under the name. */
const firstLine = (cue: string) => (cue.match(/^.*?[.!?](\s|$)/)?.[0] ?? cue).trim()

/** The warm-up line (fitness-workouts), shared with the preview card. */
export const warmupCopy = (name: string) =>
  `5 minutes of easy movement, then one or two lighter ${name.toLowerCase()} sets, building up to your working weight. Log them as warm-ups: they don't count towards your targets.`

/** A short chime at the end of rest, only when sound is on. */
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.55)
    setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch { /* no audio */ }
}

/**
 * The demo's count for the current phase ("2 · of 3 · Lower slowly"). It follows the clip's own
 * clock but only re-renders when the count or phase shown changes, not every frame. It never
 * claims to count the person's reps.
 */
function TempoCount({ vid, media }: { vid: RefObject<HTMLVideoElement>; media: ExerciseMedia }) {
  const [shown, setShown] = useState<{ kind: string; count: number; of: number } | null>(null)
  useEffect(() => {
    let raf = 0, key = ''
    const tick = () => {
      const v = vid.current
      if (v && !v.paused) {
        const s = tempoAt(media, v.currentTime)
        const k = `${s.kind}|${s.count}|${s.countOf}`
        if (k !== key) { key = k; setShown({ kind: s.kind, count: s.count, of: s.countOf }) }
      } else if (key) { key = ''; setShown(null) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [vid, media])
  if (!shown) return null
  return (
    <section className="gp-count" aria-hidden="true">
      {shown.kind === 'ready'
        ? <div className="p">{PHASE_LABEL.ready}</div>
        : <><div className="n num">{shown.count}</div><div className="p">of {shown.of} · {PHASE_LABEL[shown.kind as keyof typeof PHASE_LABEL]}</div></>}
    </section>
  )
}

type SheetKind = null | 'adjust' | 'warmup' | 'menu' | 'leave' | 'finish' | 'hold' | 'swap' | 'stopped'

/**
 * The guided session (Flow 1): one exercise per screen, the demo clip full bleed where there is
 * one (no blur, a light shade top and bottom only, the controls below the move), or the cue on
 * a plain dark background where there isn't. Every set is saved the moment it's logged, so
 * leaving part-way keeps it. Nothing here waits on the network: a clip that can't load falls
 * back to its poster or the cue.
 */
export function GuidedPlayer({ type, slots, option, onSwap, onClose, onFinished }: {
  type: WorkoutType
  slots: Slot[]
  option?: Workout['option']
  onSwap: (i: number, id: string) => void
  onClose: () => void
  /** after Finish: back to the today list */
  onFinished?: () => void
}) {
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const gentle = useStore((s) => !!s.data.profile.gentle)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const removeSession = useStore((s) => s.removeSession)
  const restoreSession = useStore((s) => s.restoreSession)
  const showToast = useStore((s) => s.showToast)
  const title = shortTitle(type)
  const session = sessionsOf(days[cur], cur).find((x) => x.routineId === 'builtin-' + type)
  const isToday = cur === todayStr()
  const shorter = option === 'shorter'
  useScrollLock()

  // what's already logged today (resume); anything that isn't a slot's now is kept as an extra
  const [init] = useState(() => splitLogged(session?.ex, slots))
  const [logged, setLogged] = useState<Record<number, SetEntry[]>>(init.bySlot)
  const [extras, setExtras] = useState<LoggedExercise[]>(init.extras)
  const [prevMins] = useState(() => session?.mins)
  const [order, setOrder] = useState(() => slots.map((s) => s.i))
  const [pos, setPos] = useState(() => {
    const k = slots.findIndex((s) => working(logged[s.i]).length < s.sets)
    return k < 0 ? 0 : k
  })
  const [started] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [restMsg, setRestMsg] = useState('')
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [sound, setSound] = useState(soundPref)
  const [discard, setDiscard] = useState(false)

  const slot = slots.find((s) => s.i === order[pos]) ?? slots[0]
  const sets = logged[slot.i] || []
  const done = working(sets)
  const setNo = done.length
  const complete = setNo >= slot.sets
  const last = useMemo(() => lastTime(days, cur, slot.x?.id, slot.shown.n, slot.fullRx), [days, cur, slot.x?.id, slot.shown.n, slot.fullRx])
  const target = complete ? null : targetFor(slot.shape, slot.rx, last, setNo, done)
  const isLastSlot = pos >= order.length - 1
  const name = bareName(slot.shown.n)
  const video = slot.shown.video

  // one clock for the elapsed time and the rest countdown (device clock: works offline)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0
  useEffect(() => {
    if (!rest || now < rest.end) return
    // never counts past zero: rest ends, it's announced once, and the set is back
    setRest(null)
    setRestMsg(`Rest over. ${complete ? name : `Set ${setNo + 1} of ${slot.sets}, ${name}`}.`)
    try { navigator.vibrate?.(180) } catch { /* unsupported */ }
    if (sound) chime()
  }, [now, rest, sound, complete, name, setNo, slot.sets])

  // focus moves into the player and stays there; Escape asks before leaving
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    return () => opener?.focus?.()
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet) return // a sheet handles its own keys
      if (e.key === 'Escape') { e.preventDefault(); setSheet('leave'); return }
      if (e.key !== 'Tab' || !root.current) return
      const items = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')]
      if (!items.length) return
      const i = items.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  const write = useCallback((next: Record<number, SetEntry[]>, ex: LoggedExercise[], extra: Parameters<typeof saveWorkout>[3]) => {
    saveWorkout(type, buildLogged(slots, next, ex), option, extra)
  }, [slots, type, option, saveWorkout])
  // every set saves at once, marked open until Finish
  const save = (next: Record<number, SetEntry[]>, ex = extras) => write(next, ex, { quiet: true, open: true })

  /** the next slot in play order that still has sets to do, after `from` */
  const nextOpen = (from: number, lg = logged) => {
    for (let k = from + 1; k < order.length; k++) {
      const s = slots.find((y) => y.i === order[k])!
      if (working(lg[s.i]).length < s.sets) return k
    }
    return -1
  }
  const moveOn = () => { setRest(null); const k = nextOpen(pos); if (k < 0) setSheet('finish'); else { setPos(k); setSheet(null) } }

  function logSet(entry: SetEntry) {
    const next = { ...logged, [slot.i]: [...sets, entry] }
    setLogged(next)
    save(next)
    setRestMsg('')
    setSheet(null)
    if (entry.warmup) return
    // stopped early: no rest timer, ask what next (the pain check lives in Adjust)
    if (entry.feel === 'stopped') { setRest(null); setSheet('stopped'); return }
    const nowDone = working(next[slot.i]).length >= slot.sets
    if (nowDone) {
      const k = nextOpen(pos, next)
      if (k < 0) { setRest(null); setSheet('finish'); return }
      setPos(k)
    }
    const sec = restFor(slot.x, slot.shown)
    if (sec > 0) setRest({ end: Date.now() + sec * 1000, total: sec })
  }

  function primary() {
    if (complete) { moveOn(); return }
    if (slot.shape === 'hold') { setSheet('hold'); return }
    if (!target) { setSheet('adjust'); return }
    // "Done as planned": the target, ticked (SetEntry.done marks the one-tap log)
    logSet({ w: target.w, reps: target.reps, ...(target.mins ? { mins: target.mins } : {}), ...(target.assist ? { assist: true } : {}), done: true })
  }
  const go = (d: -1 | 1) => {
    setRest(null)
    if (d === 1 && isLastSlot) { setSheet('finish'); return }
    setPos(Math.max(0, Math.min(order.length - 1, pos + d)))
  }

  /** a swap keeps what was logged for the move swapped out (as an extra), and the new move starts fresh */
  function swapTo(id: string) {
    // the move going out keeps its sets (as an extra); the move coming in takes back its own
    const r = swapInto(slot, id, sets, extras, shorter, exById)
    const next = { ...logged, [slot.i]: r.sets }
    setExtras(r.extras)
    setLogged(next)
    if (sets.length || r.sets.length) {
      // saved with the slot as it now is (the parent's slots update on the next render)
      saveWorkout(type, buildLogged(slots.map((s) => (s.i === slot.i ? r.slot : s)), next, r.extras), option, { quiet: true, open: true })
    }
    onSwap(slot.i, id)
  }

  const anything = Object.values(logged).some((l) => l.length) || extras.length > 0
  const finish = (effort: Effort | null, note: string, mins: number | undefined) => {
    // nothing logged: nothing to save (an empty session would count as a day moved)
    if (!anything && !session) { showToast('Nothing logged this time'); onClose(); return }
    write(logged, extras, { effort, note, ...(mins != null ? { mins } : {}), toast: `${title} saved` })
    onClose(); onFinished?.()
  }
  const leave = () => {
    if (anything) {
      const m = stintMins(prevMins, Date.now() - started, isToday)
      write(logged, extras, { quiet: true, open: true, ...(m != null ? { mins: m } : {}) })
    }
    onClose()
  }

  // video: plays muted on a loop unless reduced motion is on; a clip that fails shows its poster, then the cue
  const vid = useRef<HTMLVideoElement>(null)
  const [reduced] = useState(reducedMotion)
  const [playing, setPlaying] = useState(false)
  const [clip, setClip] = useState<'ok' | 'poster' | 'none'>(video ? 'ok' : 'none')
  useEffect(() => { setClip(video ? 'ok' : 'none'); setPlaying(false) }, [video])
  const toggle = () => { const v = vid.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause() }

  const elapsed = Math.floor((now - started) / 1000)
  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const optional = !complete && setNo >= slot.setsLo
  const upNext = complete ? '' : `Set ${setNo + 1} of ${slot.sets}${optional ? ' (optional)' : ''}${target ? ' · ' + fmtTarget(target, slot.shape) : ''}`
  const plain = clip === 'none'
  const wSlot = warmupSlot(slots.map((s) => s.shape))

  return (
    <div ref={root} className={'gp' + (plain ? ' plain' : '')} role="dialog" aria-modal="true" aria-label={`${title}: ${name}`}>
      {clip === 'ok' && video && (
        <video key={video.src} ref={vid} src={mediaUrl(video.src)} poster={video.poster ? mediaUrl(video.poster) : undefined}
          autoPlay={!reduced} muted loop playsInline preload="metadata" aria-label={`Demo: ${name}, on a loop`}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onError={() => setClip(video.poster ? 'poster' : 'none')} onClick={toggle} />
      )}
      {clip === 'poster' && video?.poster && <img className="gp-still" src={mediaUrl(video.poster)} alt={`Demo still: ${name}`} onError={() => setClip('none')} />}
      {!plain && <div className="gp-shade" aria-hidden="true" />}

      <header className="gp-top">
        <button ref={closeBtn} className="gp-rb" aria-label="Leave the workout" onClick={() => setSheet('leave')}><Icon name="x" size={16} stroke={2.6} /></button>
        <span className="gp-pill num">{pos + 1} of {order.length}{gentle ? '' : ` · ${mm}`}</span>
        <span className="gp-tr">
          {clip === 'ok' && (
            <button className="gp-rb" aria-label={playing ? 'Pause the demo' : 'Play the demo'} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={16} stroke={2.6} /></button>
          )}
          <button className="gp-rb" aria-label="More: swap, do this later, skip, sound" onClick={() => setSheet('menu')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        </span>
      </header>

      {plain && !rest && <div className="gp-cue">{slot.shown.cue}</div>}
      {clip === 'ok' && video && !rest && <TempoCount vid={vid} media={video} />}
      {clip === 'ok' && reduced && !playing && !rest && (
        <button className="demo-play" onClick={toggle} aria-label="Play the demo"><Icon name="play" size={32} /></button>
      )}
      <div className="sr" aria-live="polite">{restMsg}</div>

      {rest ? (
        <section className="gp-bot" aria-label="Rest">
          <div className="gp-rh"><span className="k">Rest</span><span className="h">{restHint(rest.total)}</span></div>
          <div className="gp-clock" role="timer" aria-label={`${fmtClock(restLeft)} of ${fmtClock(rest.total)} rest left`}><span className="num" aria-hidden="true">{fmtClock(restLeft)}</span><small className="num" aria-hidden="true">of {fmtClock(rest.total)}</small></div>
          <div className="gp-bar"><i style={{ transform: `scaleX(${Math.min(1, 1 - restLeft / rest.total)})` }} /></div>
          <div className="gp-next">Up next: {setNo === 0 && !complete ? name + ' · ' : ''}{upNext || name}</div>
          <div className="gp-row2">
            <button className="gp-sec" onClick={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })}>+15 s</button>
            <button className="gp-main" onClick={() => setRest(null)}>Skip rest</button>
          </div>
        </section>
      ) : (
        <section className="gp-bot" aria-label={name}>
          <div>
            <h1 className="gp-name">{name}</h1>
            {!plain && <p className="gp-line">{firstLine(slot.shown.cue)}</p>}
            {slot.swapped && <p className="gp-line sm">In place of {bareName(slot.planned.n)}, today only.</p>}
          </div>
          <div className="gp-prog">
            <span className="segs" style={{ gridTemplateColumns: `repeat(${slot.sets}, minmax(0, 1fr))` }}>
              {Array.from({ length: slot.sets }, (_, k) => <i key={k} className={(k < setNo ? 'on' : '') + (k >= slot.setsLo ? ' opt' : '')} />)}
            </span>
            <span className="t num">{complete ? `All ${slot.sets} ${slot.sets === 1 ? 'set' : 'sets'} logged` : upNext}</span>
          </div>
          <div className="gp-ctl">
            <button className="gp-arrow" aria-label="Previous exercise" disabled={pos === 0} onClick={() => go(-1)}><Icon name="chevL" size={18} stroke={2.4} /></button>
            <button className="gp-main" onClick={primary}>
              {complete ? (nextOpen(pos) < 0 ? 'Finish' : 'Next exercise') : slot.shape === 'hold' ? 'Start hold' : target ? 'Done as planned' : 'Log set'}
            </button>
            <button className="gp-arrow" aria-label={isLastSlot ? 'Finish' : 'Next exercise'} onClick={() => go(1)}><Icon name="chevR" size={18} stroke={2.4} /></button>
          </div>
          {!complete && slot.shape !== 'check' && (
            <button className="gp-adj" onClick={() => setSheet('adjust')}>{slot.shape === 'hold' ? 'Enter seconds instead' : slot.shape === 'duration' ? 'Adjust minutes' : 'Adjust weight or reps'}</button>
          )}
        </section>
      )}

      {(sheet === 'adjust' || sheet === 'warmup') && (
        <AdjustSheet key={slot.i + '-' + setNo + sheet} name={name} x={slot.x} shape={slot.shape} rx={slot.rx} setNo={setNo}
          target={sheet === 'warmup' ? null : target} first={!target && sheet !== 'warmup'} warmup={sheet === 'warmup'}
          allowWarmup={slot.shape === 'weight-reps'} stepUp={!shorter && setNo === 0 && readyToStepUp(last, slot.fullRx)}
          onLog={logSet} onGentler={slot.x ? () => setSheet('swap') : undefined} onTimer={() => setSheet('hold')} onClose={() => setSheet(null)} />
      )}
      {sheet === 'hold' && (
        <HoldTimer name={slot.shown.n} rx={slot.rx} perSide={slot.x?.perSide}
          onDone={(sec) => logSet({ w: '', reps: String(sec), sec: String(sec) })} onClose={() => setSheet((s) => (s === 'hold' ? null : s))} />
      )}
      {sheet === 'swap' && slot.x && (
        <SwapSheet current={slot.x} planned={slot.swapped ? exById(slot.planned.id) : undefined} shorter={shorter}
          loggedSets={done.length} onPick={swapTo} onClose={() => setSheet(null)} />
      )}
      {sheet === 'stopped' && (
        <Sheet title="Stopped early" onClose={() => setSheet(null)} left={null}>
          <div className="sub" style={{ padding: '0 4px 14px' }}>That's fine. If something hurt, leave this one for today.</div>
          <div className="stack" style={{ marginTop: 0 }}>
            <button className="btn" onClick={moveOn}>Move to the next exercise</button>
            {slot.x && <button className="btn gray" onClick={() => setSheet('swap')}>Try a gentler option</button>}
            <button className="btn gray" onClick={() => setSheet(null)}>Carry on with this one</button>
          </div>
        </Sheet>
      )}
      {sheet === 'menu' && (
        <Sheet title={name} onClose={() => setSheet(null)} left={null} right={<button className="navbtn b" onClick={() => setSheet(null)}>Done</button>}>
          <div className="list">
            {slot.x && <button className="li" onClick={() => setSheet('swap')}><div className="m"><div className="t">Swap exercise</div><div className="s">Today only</div></div></button>}
            {!isLastSlot && <button className="li" onClick={() => { setOrder(later(order, pos)); setRest(null); setSheet(null) }}><div className="m"><div className="t">Do this later</div><div className="s">Moves it to the end of today's workout</div></div></button>}
            <button className="li" onClick={() => { setSheet(null); go(1) }}><div className="m"><div className="t">Skip this exercise</div><div className="s">It shows as "Not today"</div></div></button>
            {slot.shape === 'weight-reps' && <button className="li" onClick={() => setSheet('warmup')}><div className="m"><div className="t">Log a warm-up set</div><div className="s wrap">{slot.i === wSlot ? warmupCopy(name) : "Doesn't count towards your targets"}</div></div></button>}
            {!video && <a className="li" href={howToLink(slot.shown.n)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><div className="m"><div className="t">Watch how to do it</div><div className="s">Opens a video search</div></div></a>}
            <div className="li"><div className="m"><div className="t">Sound</div><div className="s">A chime when rest ends</div></div>
              <Toggle on={sound} label="Sound" onChange={() => { const v = !sound; setSound(v); try { localStorage.setItem(SOUND_KEY, v ? '1' : '0') } catch { /* blocked */ } }} /></div>
          </div>
          <div className="list"><button className="li act" onClick={() => setSheet('finish')}>Finish now</button></div>
        </Sheet>
      )}
      {sheet === 'leave' && (
        <Sheet title="Leave the workout?" onClose={() => { setSheet(null); setDiscard(false) }} left={null}>
          <div className="foot" style={{ padding: '0 4px 12px' }}>Everything you've logged is saved. You can pick it up again from Train.</div>
          <div className="stack" style={{ marginTop: 0 }}>
            <button className="btn" onClick={() => setSheet(null)}>Keep going</button>
            <button className="btn gray" onClick={() => setSheet('finish')}>Finish now</button>
            <button className="btn gray" onClick={leave}>Leave for now</button>
            {session && (discard
              ? <button className="btn danger" onClick={() => {
                  const kept = session, day = cur
                  removeSession(session.id)
                  showToast(`${title} discarded`, { label: 'Undo', run: () => restoreSession(day, kept) })
                  onClose()
                }}>Yes, discard this session</button>
              : <button className="btn danger" onClick={() => setDiscard(true)}>Discard this session</button>)}
          </div>
        </Sheet>
      )}
      {sheet === 'finish' && (
        <FinishSheet title={title} gentle={gentle} mins={stintMins(prevMins, now - started, isToday)}
          rows={slots.map((s) => { const line = setsLine(logged[s.i], s.shape); return { name: bareName(s.swapped && s.x ? s.x.n : s.planned.n), line, none: line === 'Not today' } })}
          effort0={session?.effort} note0={session?.note} onFinish={finish} onBack={() => setSheet(null)} />
      )}
    </div>
  )
}
