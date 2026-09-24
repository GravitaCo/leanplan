import { useEffect, useRef, useState } from 'react'
import { holdAt, holdTarget } from '@/core/domain/library'
import { Sheet } from '@/ui/primitives'

/** Red flags (plan §4.0.4): on the hold timer and the exercise cards. */
export const RED_FLAG = "Stop if you get chest pain, feel dizzy or faint, or have sudden severe pain. Call 999 for chest pain that doesn't go away, or NHS 111 if you're not sure."

/**
 * A timer for a hold (plank, a yoga pose, a stretch). It runs on the device clock, so it works
 * offline and with no clip, and writes the seconds into the set when stopped. Per-side holds with
 * a timed target say "Switch sides" once the first side has had its time.
 */
export function HoldTimer({ name, rx, perSide, onDone, onClose }: {
  name: string
  rx: string
  perSide?: boolean
  onDone: (sec: number) => void
  onClose: () => void
}) {
  const target = holdTarget(rx)
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const stopBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (start == null) return
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [start])

  const h = holdAt(start == null ? 0 : (now - start) / 1000, target, perSide)
  const goal = target ? (target.lo === target.hi ? `${target.lo} sec` : `${target.lo}–${target.hi} sec`) : null
  const stop = () => { if (start != null && h.logSec > 0) onDone(h.logSec); onClose() }

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="hold" aria-live="polite">
        <div className="hold-k">{start == null ? 'Ready when you are' : h.switchNow ? 'Switch sides' : perSide && target ? (h.side === 1 ? 'First side' : 'Second side') : target && h.sec >= target.hi ? 'Good place to stop' : h.reached ? 'In your range' : 'Holding'}</div>
        <div className="hold-n num" aria-label={`${h.sec} seconds`}>{h.sec}<span> sec</span></div>
        {goal && <div className="hold-g">Aim for {goal}{perSide ? ' each side' : ''}. Stop sooner if your form slips or anything hurts.</div>}
      </div>
      <div className="stack">
        {start == null
          ? <button className="btn" onClick={() => { setStart(Date.now()); setNow(Date.now()); setTimeout(() => stopBtn.current?.focus(), 0) }}>Start</button>
          : <button ref={stopBtn} className="btn tinted" onClick={stop}>Stop and save</button>}
      </div>
      <div className="foot" style={{ padding: '12px 4px 0' }}>Breathe steadily throughout. {RED_FLAG}</div>
    </Sheet>
  )
}
