/**
 * The breathing pacer's clock (deck B7, Benn's P6 Glow): which phase a run is in at a given moment,
 * the word, a count that goes up within each phase, and how full the sphere is. Pure: the screen
 * passes the elapsed milliseconds (requestAnimationFrame), so the maths is testable and the
 * reduced-motion view reads the same words and counts with the scale ignored.
 *
 * The timings themselves live in core/data/skills.ts and are PLACEHOLDERS until mental-performance
 * sources them (`PacerPattern.placeholder`); nothing here presents them as sourced.
 */

/** in: the main breath in; in-again: the small second breath on top; out: the long breath out */
export type PacerMotion = 'in' | 'in-again' | 'out'

export interface PacerPhase {
  motion: PacerMotion
  /** the word on screen (deck B7.8a to c) */
  word: string
  /** whole seconds */
  s: number
}

export interface PacerPattern {
  phases: PacerPhase[]
  /** where the timings come from (a source, or a stated product choice) */
  source: string
  /** true until the timings are approved (blocks MIND_REVIEWED) */
  placeholder: boolean
}

export interface PacerState {
  /** index into pattern.phases */
  phase: number
  motion: PacerMotion
  word: string
  /** 1-based, counting up within the phase, whole seconds (1, 2, … up to the phase's length) */
  count: number
  /** sphere fullness, 0 (empty) to 1 (full), eased */
  scale: number
  /** the breath number, 0-based */
  breath: number
  /** the run is over: it always stops at the end of a breath out */
  done: boolean
  /** milliseconds left in the run (never shown after an early stop: deck B7, stopped early) */
  leftMs: number
}

/**
 * Where the sphere sits at the end of the main breath in, before the small second breath fills it.
 * A visual choice, not a physiological one (design judgement).
 */
const IN_TOP = 0.75
const ease = (x: number): number => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2

/** One breath, start of the first phase to the end of the last, in ms. */
export const breathMs = (p: PacerPattern): number => p.phases.reduce((a, x) => a + x.s * 1000, 0)

/**
 * How long a run of about `minutes` really lasts: a whole number of breaths (at least one), so it
 * never ends half-way through a breath out.
 */
export function runMs(p: PacerPattern, minutes: number): number {
  const b = breathMs(p)
  if (b <= 0) return 0
  return Math.max(1, Math.round((minutes * 60000) / b)) * b
}

function scaleFor(motion: PacerMotion, x: number): number {
  if (motion === 'in') return IN_TOP * ease(x)
  if (motion === 'in-again') return IN_TOP + (1 - IN_TOP) * ease(x)
  return 1 - ease(x)
}

/**
 * The pacer at `ms` into a run of `minutes` (rounded to whole breaths by `runMs`). Past the end
 * it reports `done`, resting on the last breath out with an empty sphere.
 */
export function pacerAt(p: PacerPattern, ms: number, minutes: number): PacerState {
  const total = runMs(p, minutes)
  const b = breathMs(p)
  const last = p.phases.length - 1
  if (!p.phases.length || b <= 0) return { phase: 0, motion: 'out', word: '', count: 0, scale: 0, breath: 0, done: true, leftMs: 0 }
  const t = Math.max(0, ms)
  if (t >= total) {
    const ph = p.phases[last]
    return { phase: last, motion: ph.motion, word: ph.word, count: ph.s, scale: 0, breath: Math.round(total / b) - 1, done: true, leftMs: 0 }
  }
  const breath = Math.floor(t / b)
  let within = t - breath * b
  let i = 0
  while (i < last && within >= p.phases[i].s * 1000) { within -= p.phases[i].s * 1000; i++ }
  const ph = p.phases[i]
  const len = ph.s * 1000
  return {
    phase: i,
    motion: ph.motion,
    word: ph.word,
    count: Math.min(ph.s, Math.floor(within / 1000) + 1),
    scale: scaleFor(ph.motion, within / len),
    breath,
    done: false,
    leftMs: total - t,
  }
}

/** "1:20" for the time left (deck B7.9 "{m}:{ss} left"); whole seconds, rounded up. */
export function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
