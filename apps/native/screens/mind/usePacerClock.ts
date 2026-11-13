/**
 * The pacer clock as a React hook for the Reset screen: starts a run whenever `run` changes (null:
 * at rest), and stops it on unmount or a null `run`. The screen gives `onSegment` a Reanimated
 * withTiming on its fullness value (Easing.inOut(Easing.sin) equals pacerEase); everything else is
 * startPacerRun in pacerClock.ts, which the tests cover.
 */
import { useEffect, useRef, useState } from 'react'
import type { PacerPattern, PacerState } from '@/core/domain/pacer'
import { startPacerRun, type ClockEnv, type PacerSegment } from './pacerClock'

const realClock: ClockEnv = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

export function usePacerClock(pattern: PacerPattern, minutes: number, run: number | null, h: {
  onLeft?: (left: string) => void; onDone?: () => void; onSegment?: (seg: PacerSegment) => void
}): PacerState | null {
  const [st, setSt] = useState<PacerState | null>(null)
  const cb = useRef(h)
  cb.current = h
  useEffect(() => {
    setSt(null)
    if (run === null) return
    return startPacerRun(pattern, minutes, {
      onState: setSt,
      onLeft: (l) => cb.current.onLeft?.(l),
      onSegment: (s) => cb.current.onSegment?.(s),
      onDone: () => cb.current.onDone?.(),
    }, realClock)
  }, [run, pattern, minutes])
  return st
}
