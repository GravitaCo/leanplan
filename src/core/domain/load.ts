import type { AppState } from '@/core/types'
import { shiftDay } from './date'
import { isHardSession, sessionsOf } from './sessions'

/**
 * Load guardrails (workout plan §0.5, §3.3). Tali never coaches toward more. When training gets
 * very heavy it offers one gentle note, at most once a week. Thresholds are judgement calls,
 * flagged as unvalidated by mental-performance.
 */
const HARD_PER_WEEK = 6
const DOUBLES_RUN = 3
const NOTE_EVERY = 7

export interface LoadSignals {
  /** hard sessions in the 7 days to `today` */
  hard7: number
  /** consecutive days, ending today, with two or more hard sessions */
  doublesRun: number
}

/**
 * Signals for the guardrail note. This is also the hook the supportive script in
 * ai-platform-plan §4.2 will read (with intake and mood trends); nothing here scores a person.
 */
export function loadSignals(s: AppState, today: string): LoadSignals {
  const hardOn = (d: string) => sessionsOf(s.days[d], d).filter(isHardSession).length
  let hard7 = 0
  for (let i = 0; i < 7; i++) hard7 += hardOn(shiftDay(today, -i))
  let doublesRun = 0
  while (doublesRun < 30 && hardOn(shiftDay(today, -doublesRun)) >= 2) doublesRun++
  return { hard7, doublesRun }
}

/** Show the "you've been training a lot" note: very heavy load, and not shown in the last week. */
export function showLoadNote(s: AppState, today: string): boolean {
  const seen = s.profile.loadNoteSeen
  if (seen && seen > shiftDay(today, -NOTE_EVERY)) return false
  const x = loadSignals(s, today)
  return x.hard7 > HARD_PER_WEEK || x.doublesRun >= DOUBLES_RUN
}
