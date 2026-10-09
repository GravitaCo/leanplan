import { useEffect, useRef, useState } from 'react'
import { fmtLeft, pacerAt, type PacerPattern, type PacerState } from '@/core/domain/pacer'

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

export interface Ring { d: number; o: number; w: number }
export interface Glow { sphere: number; rings: Ring[] }

/* The board's keyframes at fullness 0 (rest), 0.7 (end of the breath in) and 1 (after the second
   breath in): ring diameter in px, opacity and border width, inner ring first. */
const KNOTS = [0, 0.7, 1]
const DIAM = [[221, 232, 243, 254], [268, 288, 308, 328], [290, 315, 340, 365]]
const OPAC = [[0.55, 0.38, 0.24, 0.13], [0.44, 0.30, 0.19, 0.10], [0.33, 0.23, 0.14, 0.08]]
const BORDER = [2, 1.5, 1]
/** the sphere's scale at rest and when full (board: 0.8 to 1) */
const S_MIN = 0.8

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d

/** The glow at fullness `u` (0 to 1, pacerAt's `scale`). */
export function glowAt(u: number): Glow {
  const x = Math.min(1, Math.max(0, u))
  const k = x <= KNOTS[1] ? 0 : 1
  const t = (x - KNOTS[k]) / (KNOTS[k + 1] - KNOTS[k])
  return {
    sphere: round(lerp(S_MIN, 1, x), 4),
    rings: [0, 1, 2, 3].map((i) => ({
      d: round(lerp(DIAM[k][i], DIAM[k + 1][i], t), 1),
      o: round(lerp(OPAC[k][i], OPAC[k + 1][i], t), 3),
      w: round(lerp(BORDER[k], BORDER[k + 1], t), 2),
    })),
  }
}

/** Reduced motion: the board's still frame, a middle size that never moves. */
export const GLOW_MID: Glow = {
  sphere: 0.9,
  rings: [256, 274, 292, 310].map((d, i) => ({ d, o: [0.44, 0.30, 0.19, 0.10][i], w: 1.5 })),
}

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
