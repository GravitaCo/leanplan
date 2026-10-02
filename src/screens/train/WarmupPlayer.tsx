import { useEffect, useRef, useState } from 'react'
import type { WarmupBlock } from '@/core/domain/warmup'
import { fmtClock } from '@/core/domain/guided'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { mediaUrl } from '@/core/data/media'
import { Icon } from '@/ui/icons'

const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

/**
 * The warm-up block a guided session opens with (board ob5-0): one timed block, a countdown per
 * move, "Next: …", a 5 s gap to get into place, "Switch sides" halfway through one-sided moves,
 * and Pause, Skip this move and Skip warm-up. The move's clip or still shows full bleed when there
 * is one (the video-screen rules: no blur, a light shade top and bottom), otherwise a calm
 * placeholder. Nothing is logged as sets: the parent records "warm-up done" with its minutes.
 * The clock is the device's, so it works offline.
 */
export function WarmupPlayer({ block, after, onEnd, onLeave, onProgress }: {
  block: WarmupBlock
  /** the first exercise after the warm-up, for the last "Next: …" */
  after?: string
  /** seconds of moves done, and whether the whole block was */
  onEnd: (sec: number, complete: boolean) => void
  onLeave: () => void
  onProgress: (sec: number) => void
}) {
  const moves = block.moves
  const [i, setI] = useState(0)
  const [gap, setGap] = useState(false)
  const [left, setLeft] = useState(moves[0].sec * 1000)
  const [paused, setPaused] = useState(false)
  const [say, setSay] = useState('')
  const spent = useRef(0)
  const st = useRef({ paused, gap })
  st.current = { paused, gap }
  const ended = useRef(false)
  const skipped = useRef(false)

  useEffect(() => {
    let last = Date.now()
    const t = setInterval(() => {
      const n = Date.now(), dt = n - last
      last = n
      if (st.current.paused || ended.current) return
      setLeft((l) => l - dt)
      if (!st.current.gap) { spent.current += dt; onProgress(spent.current / 1000) }
    }, 250)
    return () => clearInterval(t)
  }, [onProgress])

  const end = (complete: boolean) => { if (ended.current) return; ended.current = true; onEnd(spent.current / 1000, complete && !skipped.current) }
  const next = (skip = false) => {
    if (skip) skipped.current = true
    if (i >= moves.length - 1) { end(true); return }
    setI(i + 1); setGap(true); setLeft(block.gapSec * 1000)
    setSay(`Next: ${moves[i + 1].n}. Get ready.`)
  }
  const start = () => { setGap(false); setLeft(moves[i].sec * 1000); setSay(`${moves[i].n}, ${fmtClock(moves[i].sec)}.`) }
  useEffect(() => {
    if (left > 0 || ended.current) return
    if (gap) start(); else next()
  }, [left])

  const m = moves[i]
  const sec = Math.max(0, Math.ceil(left / 1000))
  const half = Math.round(m.sec / 2)
  const second = m.perSide && !gap && sec <= half
  useEffect(() => {
    if (!second) return
    setSay('Switch sides')
    try { navigator.vibrate?.(150) } catch { /* unsupported */ }
  }, [second])

  const x = EXERCISE_BY_ID[m.id]
  const video = x?.video
  const [reduced] = useState(reducedMotion)
  const [bad, setBad] = useState<Record<string, true>>({})
  const clip = video && !bad[video.src] && !reduced ? video.src : null
  const still = !clip && video?.poster && !bad[video.poster] ? video.poster : null
  const plain = !clip && !still
  const total = gap ? block.gapSec : m.sec
  const upNext = gap ? `${fmtClock(m.sec)}${m.perSide ? ', switching sides halfway' : ''}` : i < moves.length - 1 ? moves[i + 1].n : after

  return (
    <div className={'wu' + (plain ? ' plain' : '')}>
      {clip && <video key={clip} src={mediaUrl(clip)} poster={video?.poster ? mediaUrl(video.poster) : undefined} autoPlay muted loop playsInline preload="metadata"
        aria-label={`How to do ${m.n.toLowerCase()}, on a loop`} onError={() => setBad({ ...bad, [clip]: true })} />}
      {still && <img className="gp-still" src={mediaUrl(still)} alt={`How to do ${m.n.toLowerCase()}`} onError={() => setBad({ ...bad, [still]: true })} />}
      {plain && <div className="wu-ph" aria-hidden="true"><span /></div>}
      <div className="gp-shade" aria-hidden="true" />

      <header className="gp-top">
        <button className="gp-rb" aria-label="Leave the workout" onClick={() => { setPaused(true); onLeave() }}><Icon name="x" size={16} stroke={2.6} /></button>
        <span className="gp-pill num">Warm-up · {i + 1} of {moves.length} · {block.mins} min</span>
        <span style={{ width: 40 }} />
      </header>
      <div className="sr" aria-live="polite">{say}</div>

      <section className="gp-bot wu-bot" aria-label={`Warm-up: ${m.n}`}>
        <div className="wu-k">{gap ? 'Get ready' : second ? 'Switch sides' : 'Warm-up'}</div>
        <h1 className="gp-name">{m.n}</h1>
        <p className="wu-cue">{m.cue}</p>
        <div className="gp-clock" role="timer" aria-label={`${fmtClock(sec)} of ${fmtClock(total)} left`}>
          <span className="num" aria-hidden="true">{fmtClock(sec)}</span>
          <small className="num" aria-hidden="true">{gap ? `then ${upNext}` : `of ${fmtClock(m.sec)}${m.perSide ? (second ? ' · second side' : ` · switch sides at ${fmtClock(half)}`) : ''}`}</small>
        </div>
        <div className="gp-bar"><i style={{ transform: `scaleX(${Math.min(1, Math.max(0, 1 - left / (total * 1000)))})` }} /></div>
        {!gap && upNext && <div className="gp-next">Next: {upNext}</div>}
        <div className="gp-row2">
          <button className="gp-sec" onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
          {gap ? <button className="gp-main" onClick={start}>Start now</button> : <button className="gp-main" onClick={() => next(true)}>Skip this move</button>}
        </div>
        <button className="gp-adj" onClick={() => end(false)}>Skip warm-up</button>
      </section>
    </div>
  )
}
