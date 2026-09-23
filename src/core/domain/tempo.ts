import type { ExerciseMedia, TempoPhaseKind } from '@/core/types'

export const PHASE_LABEL: Record<TempoPhaseKind, string> = {
  ready: 'Get set',
  lift: 'Lift',
  squeeze: 'Squeeze',
  lower: 'Lower slowly',
  stretch: 'Hold the stretch',
}

export interface TempoState {
  kind: TempoPhaseKind
  rep: number | null
  reps: number
  /** whole-second count within the phase, starting at 1 ("1… 2… 3") */
  count: number
  /** 0–1 through the current phase */
  progress: number
  /** phase length in seconds, rounded to the nearest half second for display */
  lengthSec: number
}

/** Which phase of the demo is on screen at time `t` (seconds). */
export function tempoAt(m: ExerciseMedia, t: number): TempoState {
  const ph = m.tempo
  const reps = Math.max(0, ...ph.map((p) => p.rep ?? 0))
  const time = Math.min(Math.max(t, 0), m.durationSec)
  let i = 0
  while (i + 1 < ph.length && ph[i + 1].at <= time) i++
  const start = ph[i].at
  const end = i + 1 < ph.length ? ph[i + 1].at : m.durationSec
  const len = Math.max(end - start, 0.001)
  const into = time - start
  return {
    kind: ph[i].kind,
    rep: ph[i].rep ?? null,
    reps,
    count: Math.min(Math.floor(into) + 1, Math.max(1, Math.ceil(len))),
    progress: Math.min(into / len, 1),
    lengthSec: Math.round(len * 2) / 2,
  }
}
