import type { CheckIn } from '@/core/types'

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
 * With a week or more of answers a signal is low when today is worse than the person's median;
 * before that, only the scale's worst step counts.
 */
export function lowSignals(today: CheckIn | null | undefined, recent: (CheckIn | null | undefined)[]): Signal[] {
  if (!today) return []
  return SIGNALS.filter((k) => {
    const v = today[k]
    if (!v) return false
    const past = recent.map((c) => c?.[k]).filter((x): x is number => !!x).slice(0, HISTORY)
    if (past.length < MIN_HISTORY) return v === WORST[k]
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
