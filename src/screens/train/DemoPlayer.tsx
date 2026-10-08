import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ExerciseTemplate } from '@/core/types'
import { mediaUrl } from '@/core/data/media'
import { PHASE_LABEL, PHASE_SHORT, tempoAt } from '@/core/domain/tempo'
import { exById, holdTarget } from '@/core/domain/library'
import { Icon } from '@/ui/icons'
import { useScrollLock } from '@/ui/primitives'

/**
 * Full-screen demo clip with the tempo counter laid over it (phase, rep and a 1-2-3 count), so
 * the lifter can match the pace. The counter reads the video's own clock, so it stays in step
 * when the clip is paused, buffers or loops. A hold clip (board h1) has no count: it says what to
 * hold and for how long, from the exercise's own target.
 */
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }
/**
 * The player's first (and, on close, last) frame when it grows out of the library's poster: the
 * full-screen picture scaled and moved so it sits exactly where the poster showed it, clipped to the
 * poster's rounded box. Both crop the same vertical clip with object-fit: cover, the poster with
 * its focus 30% down (`.ex-media img`), the player centred. Null on a wide screen, where the player
 * letterboxes instead (no match to grow from).
 */
function fromPoster(r: DOMRect): Keyframe | null {
  const sw = window.innerWidth, sh = window.innerHeight
  if (sw / sh >= 3 / 4 || !r.width || !r.height) return null
  const vw = 9, vh = 16 // every demo clip is vertical 9:16
  const cs = Math.max(sw / vw, sh / vh), cp = Math.max(r.width / vw, r.height / vh)
  const k = cp / cs
  const tx = r.left + (r.width - vw * cp) * 0.5 - k * ((sw - vw * cs) * 0.5)
  const ty = r.top + (r.height - vh * cp) * 0.3 - k * ((sh - vh * cs) * 0.5)
  // the poster's box, in the player's own (unscaled) coordinates
  const top = (r.top - ty) / k, left = (r.left - tx) / k
  const right = sw - (r.right - tx) / k, bottom = sh - (r.bottom - ty) / k
  return {
    transform: `translate(${tx}px, ${ty}px) scale(${k})`,
    clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${22 / k}px)`,
  }
}
const FULL: Keyframe = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 0px)' }
const fadeIn = (el: Element | null, delay: number) => el?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay, fill: 'backwards' })

export function DemoPlayer({ ex, onClose, origin }: {
  ex: ExerciseTemplate
  onClose: () => void
  /** where the clip was opened from (the library's poster): the player grows out of it, closes back
   *  into it, and leads with Back, since it stands in for the page underneath */
  origin?: () => DOMRect | null | undefined
}) {
  const m = ex.video!
  const [reduced] = useState(reducedMotion)
  const closing = useRef(false)
  const vid = useRef<HTMLVideoElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useScrollLock()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  // offline vs a device that can't decode the clip: the copy differs
  const [failed, setFailed] = useState<'offline' | 'format' | null>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => { if (vid.current) setT(vid.current.currentTime); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // grow out of the poster (before the first paint, so the full-screen frame never flashes)
  const [grows] = useState(() => { const r = origin?.(); return !!(r && !reduced && fromPoster(r)) })
  useLayoutEffect(() => {
    const r = origin?.()
    const from = r && grows ? fromPoster(r) : null
    if (!from || !root.current?.animate) return
    root.current.style.transformOrigin = '0 0'
    root.current.animate([from, FULL], { duration: 380, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
    // the overlays arrive once the picture has nearly filled the screen
    root.current.querySelectorAll('.demo-top, .demo-bot, .demo-play').forEach((el) => fadeIn(el, 260))
  }, [])

  /** close, shrinking back into the poster when there is one */
  const close = () => {
    if (closing.current) return
    closing.current = true
    const r = origin?.()
    const to = r && grows ? fromPoster(r) : null
    if (!to || !root.current?.animate) return onClose()
    root.current.querySelectorAll('.demo-top, .demo-bot, .demo-play').forEach((el) => el.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }))
    const a = root.current.animate([FULL, to], { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
    a.onfinish = onClose
    a.oncancel = onClose
  }
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab' || !root.current) return
      // keep focus inside the overlay (aria-modal): cycle through its buttons
      const btns = [...root.current.querySelectorAll('button')]
      const i = btns.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault()
      btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); opener?.focus() }
  }, [])

  function toggle() {
    const v = vid.current
    if (!v) return
    if (v.paused) v.play().catch(() => setPlaying(false))
    else v.pause()
  }

  const s = tempoAt(m, t)
  // "Romanian deadlift (dumbbell or barbell)" → title + a quieter equipment line
  const [, title, kit] = ex.n.match(/^(.*?)\s*(?:\((.*)\))?$/) || [, ex.n, '']
  const pace = m.tempo.filter((p) => p.rep === 1).map((p) => ({ kind: p.kind, sec: tempoAt(m, p.at).lengthSec }))
  const perSide = exById(ex.id)?.perSide ?? /each side/.test(ex.t)
  const aim = holdTarget(ex.t)

  return (
    <div ref={root} className="demo-full" role="dialog" aria-modal="true" aria-label={`Example: ${ex.n}`} style={grows ? { animation: 'none' } : undefined}>
      {/* the still behind the video: shows while it loads (and as it grows out of the poster) */}
      {m.poster && <img className="demo-still" src={mediaUrl(m.poster)} alt="" aria-hidden="true" />}
      {failed ? (
        <div className="demo-msg">
          {failed === 'format' ? "This example isn't available right now." : 'This example needs a connection. You can still log your sets offline.'}
        </div>
      ) : (
        <video
          ref={vid}
          src={mediaUrl(m.src)}
          poster={m.poster ? mediaUrl(m.poster) : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={(e) => setFailed(navigator.onLine && e.currentTarget.error?.code === 4 ? 'format' : 'offline')}
          onClick={toggle}
          aria-label={playing ? 'Pause example' : 'Play example'}
        />
      )}

      <div className={'demo-top' + (origin ? ' has-back' : '')}>
        {origin && <button ref={closeBtn} className="demo-back" onClick={close}><Icon name="chevL" size={22} stroke={2.4} />Back</button>}
        <div>
          <div className="demo-t">{title}</div>
          {kit && <div className="demo-sub">{kit[0].toUpperCase() + kit.slice(1)}</div>}
        </div>
        {!origin && <button ref={closeBtn} className="demo-x" onClick={close} aria-label="Close example"><Icon name="x" size={18} stroke={2.4} /></button>}
      </div>

      {!failed && !playing && (
        <button className="demo-play" onClick={toggle} aria-label="Play example"><Icon name="play" size={32} /></button>
      )}

      {!failed && m.hold && (
        <div className="demo-bot">
          {(m.hold !== 'move' || aim) && <div className="demo-sub">{m.hold === 'move' ? 'A timed move' : perSide ? 'A hold · one side shown, do both' : 'A hold'}</div>}
          <div className="demo-ph"><span className="l">{m.hold === 'move' ? 'Keep moving' : m.hold === 'position' ? 'Hold the position' : PHASE_LABEL.stretch}</span></div>
          <div className="demo-rule" aria-hidden="true" />
          <div className="demo-pace hold">
            {aim && (
              <div className="on">
                <div className="k">Aim for</div>
                <div className="v num">{aim.lo === aim.hi ? aim.lo : `${aim.lo}–${aim.hi}`} sec{perSide ? ' each side' : ''}</div>
              </div>
            )}
            <div className="on">
              <div className="k">Breathe</div>
              <div className="v">Slow and steady</div>
            </div>
          </div>
        </div>
      )}

      {!failed && !m.hold && (
        <div className="demo-bot">
          <div className="demo-sub" aria-hidden="true">{s.rep ? `Rep ${s.rep} of ${s.reps}` : `${s.reps} reps`}</div>
          <div className="demo-ph" aria-hidden="true">
            <span className="l">{PHASE_LABEL[s.kind]}</span>
            {s.kind !== 'ready' && <span className="c num">{s.count}</span>}
          </div>
          <div className="demo-bar" aria-hidden="true"><i style={{ transform: `scaleX(${s.progress})` }} /></div>
          <div className="demo-pace" aria-label="Pace to match">
            {pace.map((p) => (
              <div key={p.kind} className={p.kind === s.kind ? 'on' : ''}>
                <div className="k">{PHASE_SHORT[p.kind]}</div>
                <div className="v num">{p.sec} s</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
