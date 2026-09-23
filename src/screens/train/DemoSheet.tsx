import { useEffect, useRef, useState } from 'react'
import type { ExerciseTemplate } from '@/core/types'
import { mediaUrl } from '@/core/data/media'
import { PHASE_LABEL, tempoAt } from '@/core/domain/tempo'
import { Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'

/**
 * Demo clip with a tempo counter that follows the footage (phase, rep and a 1-2-3 count), so the
 * lifter can match the pace. The counter reads the video's own clock, so it stays in step when
 * the clip is paused, buffers or loops.
 */
export function DemoSheet({ ex, onClose }: { ex: ExerciseTemplate; onClose: () => void }) {
  const m = ex.video!
  const vid = useRef<HTMLVideoElement>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let raf = 0
    const tick = () => { if (vid.current) setT(vid.current.currentTime); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  function toggle() {
    const v = vid.current
    if (!v) return
    if (v.paused) v.play().catch(() => setPlaying(false))
    else v.pause()
  }

  const s = tempoAt(m, t)
  const rep1 = m.tempo.filter((p) => p.rep === 1)
  const pace = rep1.map((p) => {
    const st = tempoAt(m, p.at)
    return { label: PHASE_LABEL[p.kind], sec: st.lengthSec }
  })

  return (
    <Sheet title="Example" onClose={onClose} left={null} tall right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="demo-n">{ex.n}</div>
      {failed ? (
        <div className="note">This example needs a connection. You can still log your sets offline.</div>
      ) : (
        <div className="demo">
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
            onError={() => setFailed(true)}
            onClick={toggle}
            aria-label={`Example of ${ex.n}`}
          />
          {!playing && (
            <button className="demo-play" onClick={toggle} aria-label="Play example"><Icon name="play" size={30} /></button>
          )}
          <div className="demo-hud" aria-hidden="true">
            <div className="demo-rep">{s.rep ? `Rep ${s.rep} of ${s.reps}` : `${s.reps} reps`}</div>
            <div className="demo-ph">
              <span>{PHASE_LABEL[s.kind]}</span>
              {s.kind !== 'ready' && <span className="num demo-cnt">{s.count}</span>}
            </div>
            <div className="demo-bar"><i style={{ transform: `scaleX(${s.progress})` }} /></div>
          </div>
          {playing && (
            <button className="demo-pause" onClick={toggle} aria-label="Pause example"><Icon name="pause" size={18} stroke={2.6} /></button>
          )}
        </div>
      )}
      <div className="grp-h">Pace to match</div>
      <div className="list">
        {pace.map((p, i) => (
          <div className="li" key={i}>
            <div className="m"><div className="t">{p.label}</div></div>
            <span className="num" style={{ color: 'var(--label2)' }}>{p.sec} s</span>
          </div>
        ))}
      </div>
      <div className="foot" style={{ padding: '8px 4px 0' }}>
        Count along with the timer. Take your time on the way down, as that's where most of the work happens.
      </div>
    </Sheet>
  )
}
