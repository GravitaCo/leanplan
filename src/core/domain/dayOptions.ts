import type { CheckIn, Exercise, MuscleGroup } from '@/core/types'
import type { SwapId } from '@/core/data/workouts'

/**
 * Day-of options (workout plan §0.2, §4.0.5). On a tough day Train offers the planned session,
 * a shorter version or a gentle swap as equal choices. It never changes anything by itself, and
 * there is deliberately no score: each signal is only compared with the person's own recent
 * answers.
 */
export type Signal = 'sleep' | 'stress' | 'energy' | 'sore'
const SIGNALS: Signal[] = ['sleep', 'stress', 'energy', 'sore']
/** true when a higher answer is the harder one (stress, soreness); false for sleep, energy */
const HIGH_IS_WORSE: Record<Signal, boolean> = { sleep: false, stress: true, energy: false, sore: true }
const WORST: Record<Signal, number> = { sleep: 1, stress: 3, energy: 1, sore: 3 }
/** judgement calls, unvalidated (plan §4.0.5): compare with the last 14 answers; with fewer than 7, only the worst step counts */
const HISTORY = 14
const MIN_HISTORY = 7

/**
 * Signals that are low today for this person. `recent` is earlier check-ins, most recent first.
 * The scale's worst step always counts (so someone who is often stressed or sleeps badly still
 * gets the offer); with a week or more of answers, anything worse than their median counts too.
 */
export function lowSignals(today: CheckIn | null | undefined, recent: (CheckIn | null | undefined)[]): Signal[] {
  if (!today) return []
  return SIGNALS.filter((k) => {
    const v = today[k]
    if (!v) return false
    if (v === WORST[k]) return true
    const past = recent.map((c) => c?.[k]).filter((x): x is number => !!x).slice(0, HISTORY)
    if (past.length < MIN_HISTORY) return false
    const sorted = [...past].sort((a, b) => a - b)
    const n = sorted.length
    const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    return HIGH_IS_WORSE[k] ? v > median : v < median
  })
}

/** Offer the lighter choices when two or more signals are low (mental-performance's threshold, a judgement call). */
export function offerLighter(today: CheckIn | null | undefined, recent: (CheckIn | null | undefined)[]): boolean {
  return lowSignals(today, recent).length >= 2
}

const SETS = /^(\d+)(?:–(\d+))? × (.+)$/
const MINS = /^(\d+)(?:–(\d+))? min$/

/**
 * Sets in the shorter version: about 60% of the top of the prescribed range, never below one
 * (3 → 2, 2 → 1, "2–3" → 2). Reps per set stay the same; only the last sets are dropped.
 */
export function shorterSets(t: string): number | null {
  const m = t.match(SETS)
  if (!m) return null
  const top = parseInt(m[2] || m[1])
  return Math.max(1, Math.round(0.6 * top))
}

/** The prescription text for the shorter version ("3 × 10–12" → "2 × 10–12", "20–30 min" → "12–18 min"). */
export function shorterPrescription(t: string): string {
  const s = t.match(SETS)
  if (s) return `${shorterSets(t)} × ${s[3]}`
  const m = t.match(MINS)
  if (m) {
    const cut = (x: string) => Math.max(5, Math.round(0.6 * parseInt(x)))
    return m[2] ? `${cut(m[1])}–${cut(m[2])} min` : `${cut(m[1])} min`
  }
  return t
}

/**
 * Which shorter version a day is on (wellbeing plan §7.5, fitness-workouts):
 * - 'easier': a hard day's Shorter, an easier or lighter week, easing in. Fewer sets, 3–4 reps to
 *   spare, last time's weight or lighter (guided.SHORTER_RIR, targetFor's rule).
 * - 'maintain': a plan's maintenance week. Fewer sets at the usual effort and the same weights,
 *   because cutting volume holds strength only when effort is kept (Bickel 2011; Spiering 2021).
 */
export type ShorterKind = 'easier' | 'maintain'

/** What kind of day a workout is, for the day-matched swap. */
export type DayType = 'lower' | 'upper' | 'full' | 'cardio' | 'mind-body'

const LOWER: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves']
const UPPER: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms']
const MIND_BODY = ['yoga', 'pilates', 'mobility']

/**
 * The day type of a workout from its exercises (library entries; unknown ones are ignored).
 * Resistance work decides it: counting each non-core exercise's primary muscle, at least twice as
 * many lower as upper is 'lower', the reverse 'upper', anything between 'full' (a judgement call:
 * "mostly"). With no resistance work: any cardio is 'cardio', otherwise yoga, pilates or mobility
 * is 'mind-body'. Built-ins: Legs → lower, Push and Pull → upper, Cardio → cardio.
 */
export function dayTypeOf(xs: (Pick<Exercise, 'modality' | 'pattern' | 'primary'> | undefined)[]): DayType {
  let lo = 0, up = 0
  for (const x of xs) {
    if (!x?.primary || x.pattern === 'core' || x.pattern === 'cardio' || x.pattern === 'mobility') continue
    if (LOWER.includes(x.primary)) lo++
    else if (UPPER.includes(x.primary)) up++
  }
  if (lo || up) return lo >= 2 * up ? 'lower' : up >= 2 * lo ? 'upper' : 'full'
  const known = xs.filter((x): x is Pick<Exercise, 'modality' | 'pattern' | 'primary'> => !!x)
  if (known.some((x) => x.modality === 'cardio' || x.pattern === 'cardio')) return 'cardio'
  if (known.length && known.every((x) => MIND_BODY.includes(x.modality))) return 'mind-body'
  return 'full'
}

/**
 * The day-matched swap (fitness-workouts, B3 review). It depends on the day only, never on which
 * signals are low: the lower and upper routines are slow floor holds, so they already serve a
 * high-stress day, and the hard-day Mind suggestion offers the walk and the breathing. A cardio
 * day gets the mobility routine, because an easy walk would repeat the shorter cardio; a yoga,
 * pilates or mobility day gets the walk for the same reason.
 */
export function swapFor(day: DayType): SwapId {
  switch (day) {
    case 'lower': return 'mobility-lower'
    case 'upper': return 'mobility-upper'
    case 'mind-body': return 'walk'
    default: return 'mobility'
  }
}

/** A rough night: sleep is one of today's low signals (the same test as the "Rough night?" line). */
export const roughNight = (low: Signal[]): boolean => low.includes('sleep')

/**
 * The rough-night shorter version (wellbeing plan §7.5): each exercise with a `steadier` entry
 * swaps to it, and interval moves with none are left out. Indexes are positions in `xs` (the
 * exercises as shown, after any swap the person made). Apply it to the shorter version only:
 * "As planned" is never changed. If `leaveOut` covers every exercise (an all-interval workout),
 * the shorter version would be empty, so offer the day's swap instead.
 */
export function roughNightPlan(xs: (Pick<Exercise, 'steadier' | 'cardioVariation'> | undefined)[]): { swaps: Record<number, string>; leaveOut: number[] } {
  const swaps: Record<number, string> = {}
  const leaveOut: number[] = []
  xs.forEach((x, i) => {
    if (x?.steadier) swaps[i] = x.steadier
    else if (x?.cardioVariation === 'hiit') leaveOut.push(i)
  })
  return { swaps, leaveOut }
}

/**
 * Whether the rough-night note (B3.17) shows: a rough night and something in the workout that the
 * rough-night shorter version changes.
 */
export function showRoughNightNote(low: Signal[], xs: (Pick<Exercise, 'steadier' | 'cardioVariation'> | undefined)[]): boolean {
  if (!roughNight(low)) return false
  const p = roughNightPlan(xs)
  return p.leaveOut.length > 0 || Object.keys(p.swaps).length > 0
}
