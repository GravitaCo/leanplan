import type { MuscleGroup, Schedule, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS } from '@/core/data/workouts'
import { EXERCISE_BY_ID } from '@/core/data/exercises'

/**
 * The weekly plan (Plan tab, stage 4). The schedule stays one workout per weekday
 * (0 = Sunday … 6 = Saturday), repeating every week. Warnings here never block anything.
 */

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Main muscles a workout trains: the primary muscle of each move, core left out (it recovers fast). */
export function mainMuscles(type: WorkoutType | 'Rest' | undefined): Set<MuscleGroup> {
  const out = new Set<MuscleGroup>()
  if (!type || type === 'Rest') return out
  for (const e of WORKOUTS[type]?.ex ?? []) {
    const p = EXERCISE_BY_ID[e.id ?? '']?.primary
    if (p && p !== 'core') out.add(p)
  }
  return out
}

export interface WeekWarning { kind: 'back-to-back' | 'no-rest'; days: number[]; text: string }

/**
 * Gentle notes about the week: the same workout, or two that share two or more main muscles, on
 * back-to-back days (Sunday wraps to Monday); and a week with no rest day. Push then Pull only
 * share the shoulders (rear delts), so the usual split never warns.
 */
export function weekWarnings(s: Schedule): WeekWarning[] {
  const out: WeekWarning[] = []
  for (let k = 0; k < 7; k++) {
    const a = WEEK_ORDER[k], b = WEEK_ORDER[(k + 1) % 7]
    const x = s[a], y = s[b]
    if (!x || !y || x === 'Rest' || y === 'Rest' || !LIFTS.includes(x) || !LIFTS.includes(y)) continue
    const shared = [...mainMuscles(x)].filter((m) => mainMuscles(y).has(m))
    if (x === y || shared.length >= 2) {
      const name = x === y ? WORKOUTS[x].title.split(' · ')[0] : 'Two workouts for the same muscles'
      out.push({
        kind: 'back-to-back', days: [a, b],
        text: `${name} ${x === y ? 'is' : 'are'} on back-to-back days (${DAY_NAME[a]} and ${DAY_NAME[b]}). Legs, then Push, then Pull gives each area time to recover.`,
      })
    }
  }
  if (WEEK_ORDER.every((d) => (s[d] || 'Rest') !== 'Rest')) {
    out.push({ kind: 'no-rest', days: [], text: 'Your week has no rest day now. Rest is when your body adapts.' })
  }
  return out
}

/** Swap two weekdays' workouts. */
export function swapDays(s: Schedule, a: number, b: number): Schedule {
  return { ...s, [a]: s[b] || 'Rest', [b]: s[a] || 'Rest' }
}

/** "Legs & Core", "Push", "Pull", "Light cardio": the name before the muscle list. */
export function shortTitle(type: WorkoutType | string): string {
  return (WORKOUTS[type]?.title ?? type).split(' · ')[0]
}

/** A weekday's plan, with anything unknown (a value from a newer or broken install) read as Rest. */
export function plannedOn(s: Schedule, d: number): WorkoutType | 'Rest' {
  const v = s[d]
  return v && v !== 'Rest' && WORKOUTS[v] ? v : 'Rest'
}
