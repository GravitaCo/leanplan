import type { AppState, WorkoutType } from '@/core/types'
import { fmtDate, shiftDay } from './date'
import { weekOf } from './insights'
import { sessionsOf } from './sessions'

const did = (s: AppState, d: string) => sessionsOf(s.days[d], d).length > 0
const didRoutine = (s: AppState, d: string, type: string) => sessionsOf(s.days[d], d).some((x) => x.routineId === 'builtin-' + type)

/**
 * Plans that slide (workout plan §0.3, §0.4, §4.1b). Nothing is ever "missed" and the calendar
 * never moves: a planned session that didn't happen is simply offered again, as a choice.
 * Windows below are judgement calls, unvalidated.
 */
const CATCH_UP_DAYS = 6
const AWAY_DAYS = 10
const EASY_DAYS = 7

/**
 * The most recent planned session in the last few days that wasn't done (and wasn't waved off
 * with "Not this time"), if it differs from
 * today's plan and hasn't been done since. Only days after the person started logging count,
 * so a new install never offers sessions from before they joined. Never edits the schedule.
 */
export function catchUp(s: AppState, today: string): { type: WorkoutType; d: string } | null {
  if (did(s, today)) return null
  const first = Object.keys(s.days).sort()[0]
  if (!first) return null
  const todays = s.schedule[fmtDate(today).idx]
  for (let i = 1; i <= CATCH_UP_DAYS; i++) {
    const d = shiftDay(today, -i)
    if (d < first) return null
    const planned = s.schedule[fmtDate(d).idx]
    if (!planned || planned === 'Rest') continue
    if (did(s, d)) return null // the most recent planned day was done
    if (planned === todays) return null
    // done on another day since then? then there's nothing to pick up
    for (let j = i - 1; j >= 1; j--) if (didRoutine(s, shiftDay(today, -j), planned)) return null
    return s.profile.pickUpDismissed === d ? null : { type: planned, d }
  }
  return null
}

/** Sessions logged this week (Monday to Sunday), counted up, never a streak. */
export function sessionsThisWeek(s: AppState, d: string): number {
  return weekOf(d).reduce((n, x) => n + sessionsOf(s.days[x], x).length, 0)
}

/** The last day with a logged session before `d`, if any. */
export function lastSessionBefore(s: AppState, d: string): string | null {
  const ds = Object.keys(s.days).filter((x) => x < d && did(s, x)).sort()
  return ds.length ? ds[ds.length - 1] : null
}

/**
 * "Welcome back" after a break of 10+ days with no session, asked once per break. Only for
 * people who have trained before, and never on the day they're already back.
 */
export function welcomeBack(s: AppState, today: string): boolean {
  if (did(s, today)) return false
  const last = lastSessionBefore(s, today)
  if (!last || last > shiftDay(today, -AWAY_DAYS)) return false
  return (s.profile.welcomeAsked || '') < last
}

/** The date an "easier first week" ends if accepted today. */
export function easyUntil(today: string): string {
  return shiftDay(today, EASY_DAYS - 1)
}
