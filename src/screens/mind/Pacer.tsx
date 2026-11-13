import { useEffect, useRef, useState } from 'react'
import { fmtLeft, pacerAt, type PacerPattern, type PacerState } from '@/core/domain/pacer'
import { glowAt, GLOW_MID } from './glow'

/**
 * The P6 Glow breathing pacer (Benn, 8 Oct 2026; canvas 8c, artboards wp-pacer-glow-light/dark).
 * A sphere shaded from --card at the centre through --mind-fill to --mind at a crisp rim, with four
 * fine --mind rings fading outwards. It grows on the breath in, a little more on the second breath
 * in and settles slowly on the long breath out; the rings spread and thin as it grows. The count
 * (counting up) and the phase word sit in the centre.
 *
 * JS-driven: requestAnimationFrame plus pacerAt, the sphere's scale set inline. With reduced motion
 * the sphere and rings hold a middle size while the word and count still step.
 */

export { glowAt, GLOW_MID, type Glow, type Ring } from './glow'

/**
 * The pacer card. `run` is null before a start (the sphere at rest, no count) and changes for each
 * new run. `onLeft` hears the "m:ss" left whenever it changes; `onDone` fires once, at the end of
 * the last breath out. Unmounting or a null `run` stops the clock and reports nothing.
 */
export function Pacer({ pattern, minutes, run, reduced, onLeft, onDone }: {
  pattern: PacerPattern; minutes: number; run: number | null; reduced: boolean
  onLeft?: (left: string) => void; onDone?: () => void
}) {
  const [st, setSt] = useState<PacerState | null>(null)
  const cb = useRef({ onLeft, onDone, reduced })
  cb.current = { onLeft, onDone, reduced }

  useEffect(() => {
    setSt(null)
    if (run === null) return
    const t0 = performance.now()
    let raf = 0
    let left = ''
    let alive = true
    const tick = () => {
      if (!alive) return
      const s = pacerAt(pattern, performance.now() - t0, minutes)
      // the sphere moves every frame; with reduced motion only a new word or count re-renders
      setSt((prev) => (cb.current.reduced && prev && prev.phase === s.phase && prev.count === s.count && prev.done === s.done ? prev : s))
      const l = fmtLeft(s.leftMs)
      if (l !== left) { left = l; cb.current.onLeft?.(l) }
      if (s.done) { alive = false; cb.current.onDone?.(); return }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [run, pattern, minutes]) // a reduced-motion change mid-run keeps the clock: tick reads it from the ref

  const g = reduced ? GLOW_MID : glowAt(st ? st.scale : 0)
  return (
    <div className="card reset-glow" data-phase={st ? st.motion : 'ready'}>
      {g.rings.map((r, i) => (
        <span key={i} className="rg" style={{ width: r.d, height: r.d, opacity: r.o, borderWidth: r.w }} />
      ))}
      <span className="sph" style={{ transform: `scale(${g.sphere})` }} />
      {st && !st.done && (
        <div className="cnt">
          <span className="n num" aria-hidden="true">{st.count}</span>
          <span className="p" aria-live="polite">{st.word}</span>
        </div>
      )}
    </div>
  )
}
