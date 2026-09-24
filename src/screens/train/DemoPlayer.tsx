import { useEffect, useRef, useState } from 'react'
import type { ExerciseTemplate } from '@/core/types'
import { mediaUrl } from '@/core/data/media'
import { PHASE_LABEL, PHASE_SHORT, tempoAt } from '@/core/domain/tempo'
import { Icon } from '@/ui/icons'

/**
 * Full-screen demo clip with the tempo counter laid over it (phase, rep and a 1-2-3 count), so
 * the lifter can match the pace. The counter reads the video's own clock, so it stays in step
 * when the clip is paused, buffers or loops.
 */
export function DemoPlayer({ ex, onClose }: { ex: ExerciseTemplate; onClose: () => void }) {
  const m = ex.video!
  const vid = useRef<HTMLVideoElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
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

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    document.body.classList.add('noscroll')
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !root.current) return
      // keep focus inside the overlay (aria-modal): cycle through its buttons
      const btns = [...root.current.querySelectorAll('button')]
      const i = btns.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault()
      btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.classList.remove('noscroll'); window.removeEventListener('keydown', onKey); opener?.focus() }
  }, [onClose])

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

  return (
    <div ref={root} className="demo-full" role="dialog" aria-modal="true" aria-label={`Example: ${ex.n}`}>
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

      <div className="demo-top">
        <div>
          <div className="demo-t">{title}</div>
          {kit && <div className="demo-sub">{kit[0].toUpperCase() + kit.slice(1)}</div>}
        </div>
        <button ref={closeBtn} className="demo-x" onClick={onClose} aria-label="Close example"><Icon name="x" size={18} stroke={2.4} /></button>
      </div>

      {!failed && !playing && (
        <button className="demo-play" onClick={toggle} aria-label="Play example"><Icon name="play" size={32} /></button>
      )}

      {!failed && (
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
