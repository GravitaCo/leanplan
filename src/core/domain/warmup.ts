/**
 * Session length as a range (board ob2-4, note s-ob8 points 3 and 4) and the warm-up that goes
 * with it. Every session starts with a warm-up, never zero and never trimmed; its length follows
 * the session: 15–20 min → 4, 20–30 → 5, 30–45 → 6, 45–60 → 8, 60+ → 10 (fitness-workouts).
 * Ready-made plans use 6. Pure: no React, no DOM.
 */
import type { SessionRange } from '../types'
export type { SessionRange } from '../types'

/** The ranges offered, shortest first. */
export const SESSION_RANGES: SessionRange[] = ['15-20', '20-30', '30-45', '45-60', '60+']

/** How a range reads on its chip ("15–20", "60+"). */
export const rangeLabel = (r: SessionRange): string => r.replace('-', '–')

const WARMUP: Record<SessionRange, number> = { '15-20': 4, '20-30': 5, '30-45': 6, '45-60': 8, '60+': 10 }

/** Minutes of warm-up at the start of a session of this length. */
export const warmupMinutes = (r: SessionRange): number => WARMUP[r]

/** The warm-up of a Tali ready-made plan's sessions. */
export const PLAN_WARMUP_MINUTES = 6

/**
 * The engine's session length for a range: the nearest of its current options (10, 20, 30, 45,
 * 60), taking the top of the range on a tie, since the engine fits a session to at most its
 * minutes (board ob3-1: 20–30 is "about 30 min").
 */
const ENGINE: Record<SessionRange, 20 | 30 | 45 | 60> = { '15-20': 20, '20-30': 30, '30-45': 45, '45-60': 60, '60+': 60 }
export const rangeEngineMinutes = (r: SessionRange): 20 | 30 | 45 | 60 => ENGINE[r]

/** A stored engine length read back as a range (older answers, before ranges). */
export function rangeFromMinutes(m: number): SessionRange {
  if (m <= 20) return '15-20'
  if (m <= 30) return '20-30'
  if (m <= 45) return '30-45'
  return '60+'
}
