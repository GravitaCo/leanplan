/**
 * Reset's pacer clock for native (board B7, P6 Glow): the count is driven from code. Pure TypeScript,
 * no React Native, so it is unit-tested in Node.
 *
 * The web pacer (src/screens/mind/Pacer.tsx) reads pacerAt every animation frame. On a phone the
 * sphere moves on the UI thread instead, so this clock reads the shared pacerAt (timings from
 * core/data/skills RESET_PATTERN) only at each whole second of the run, where the count, the word
 * and the time left can change, and at each phase start hands the screen one animation segment:
 * fullness from `from` to `to` over `durationMs` with an in-out sine ease. That ease is exactly
 * pacerAt's own (0.5 - cos(πx)/2, Reanimated's Easing.inOut(Easing.sin)), so the sphere follows
 * the same curve as the web's.
 */
import { breathMs, fmtLeft, pacerAt, type PacerPattern, type PacerState } from '@/core/domain/pacer'

/** One phase's movement of the sphere's fullness (0 empty, 1 full). */
export interface PacerSegment {
  /** breath and phase, e.g. "0:2"; changes once per phase */
  key: string
  from: number
  to: number
  durationMs: number
}

/** What the clock knows at one moment of a run. */
export interface PacerTick {
  state: PacerState
  /** "m:ss" left (deck B7.9), whole seconds rounded up */
  left: string
  /** the segment to start when a phase begins at this tick, else null */
  segment: PacerSegment | null
  /** ms until the next whole second of the run (counts and phases change only on them); null when done */
  nextInMs: number | null
}

/** pacerAt's ease, for tests and for any renderer without Reanimated's Easing. */
export const pacerEase = (x: number): number => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2

const phaseStartMs = (p: PacerPattern, breath: number, phase: number): number =>
  breath * breathMs(p) + p.phases.slice(0, phase).reduce((a, x) => a + x.s * 1000, 0)

/** Where a phase leaves the sphere: pacerAt's fullness just before the phase ends. */
export function phaseEnd(p: PacerPattern, phase: number): number {
  return pacerAt(p, phaseStartMs(p, 0, phase) + p.phases[phase].s * 1000 - 1e-6, 1).scale
}

/**
 * The clock at `elapsedMs` into a run of `minutes`. `lastKey` is the segment key last started (''
 * at the start of a run), so a segment is handed over once per phase, from wherever the run is.
 */
export function pacerTick(p: PacerPattern, minutes: number, elapsedMs: number, lastKey: string): PacerTick {
  const state = pacerAt(p, elapsedMs, minutes)
  const left = fmtLeft(state.leftMs)
  if (state.done) return { state, left, segment: null, nextInMs: null }
  const key = `${state.breath}:${state.phase}`
  const end = phaseStartMs(p, state.breath, state.phase) + p.phases[state.phase].s * 1000
  const segment = key === lastKey ? null : { key, from: state.scale, to: phaseEnd(p, state.phase), durationMs: Math.max(0, end - elapsedMs) }
  return { state, left, segment, nextInMs: 1000 - (Math.max(0, elapsedMs) % 1000) }
}

/** The pieces of a running clock the outside world provides (a fake in tests). */
export interface ClockEnv {
  now: () => number
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (h: unknown) => void
}

export interface PacerRunHandlers {
  /** a new count, word or phase (not every tick: only when something visible changes) */
  onState: (s: PacerState) => void
  /** the time left whenever its "m:ss" changes */
  onLeft?: (left: string) => void
  /** a phase begins: animate the sphere through this segment */
  onSegment?: (seg: PacerSegment) => void
  /** once, at the end of the last breath out */
  onDone?: () => void
}

/**
 * Starts a run and returns its stop function. Stopping (or unmounting) reports nothing more:
 * no onDone, no further states. Ticks land 1 ms after each whole second of the run so the count
 * reads the new second, never the old one.
 */
export function startPacerRun(p: PacerPattern, minutes: number, h: PacerRunHandlers, env: ClockEnv): () => void {
  const t0 = env.now()
  let alive = true
  let timer: unknown = null
  let lastKey = ''
  let lastLeft = ''
  let last: PacerState | null = null
  const tick = () => {
    if (!alive) return
    const k = pacerTick(p, minutes, env.now() - t0, lastKey)
    const s = k.state
    if (!last || last.phase !== s.phase || last.count !== s.count || last.breath !== s.breath || last.done !== s.done) { last = s; h.onState(s) }
    if (k.left !== lastLeft) { lastLeft = k.left; h.onLeft?.(k.left) }
    if (k.segment) { lastKey = k.segment.key; h.onSegment?.(k.segment) }
    if (s.done) { alive = false; h.onDone?.(); return }
    timer = env.setTimeout(tick, (k.nextInMs ?? 1000) + 1)
  }
  tick()
  return () => { alive = false; if (timer !== null) env.clearTimeout(timer) }
}
