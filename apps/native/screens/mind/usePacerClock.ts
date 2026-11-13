/**
 * The pacer clock as a React hook for the Reset screen: starts a run whenever `run` changes (null:
 * at rest), and stops it on unmount or a null `run`. The screen gives `onSegment` a Reanimated
 * withTiming on its fullness value (Easing.inOut(Easing.sin) equals pacerEase); everything else is
 * startPacerRun in pacerClock.ts, which the tests cover. `segmentNow` is the movement from this
 * moment to the end of the current phase, for when Reduce Motion is switched off mid-run.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PacerPattern, PacerState } from '@/core/domain/pacer'
import { pacerTick, startPacerRun, type ClockEnv, type PacerSegment } from './pacerClock'

const realClock: ClockEnv = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

export function usePacerClock(pattern: PacerPattern, minutes: number, run: number | null, h: {
  onLeft?: (left: string) => void; onDone?: () => void; onSegment?: (seg: PacerSegment) => void
}): [PacerState | null, () => PacerSegment | null] {
  const [st, setSt] = useState<PacerState | null>(null)
  const cb = useRef(h)
  cb.current = h
  const t0 = useRef<number | null>(null)
  useEffect(() => {
    setSt(null)
    t0.current = null
    if (run === null) return
    t0.current = realClock.now()
    return startPacerRun(pattern, minutes, {
      onState: setSt,
      onLeft: (l) => cb.current.onLeft?.(l),
      onSegment: (s) => cb.current.onSegment?.(s),
      onDone: () => cb.current.onDone?.(),
    }, realClock)
  }, [run, pattern, minutes])
  /** the segment from this moment to the end of the current phase (Reduce Motion switched off mid-run) */
  const segmentNow = useCallback((): PacerSegment | null => (t0.current === null ? null : pacerTick(pattern, minutes, realClock.now() - t0.current, '').segment), [pattern, minutes])
  return [st, segmentNow]
}
