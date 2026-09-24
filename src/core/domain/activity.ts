import type { ActivityLevel, AppState } from '@/core/types'
import { shiftDay } from './date'
import { isTrainingSess, sessionsOf } from './sessions'

/** A day counts once however many sessions it has. */
const trainingDay = (s: AppState, d: string) => sessionsOf(s.days[d], d).some(isTrainingSess)

/**
 * Activity-level suggestion (workout plan P1.5, rule from nutrition-accuracy). Since logged
 * workouts no longer widen the food range, the activity level carries training. When four weeks
 * of logging clearly point to a different level, offer to update it. The person decides; it
 * never changes by itself. Bands follow the level labels and are judgement calls, unvalidated.
 */
const WINDOW = 28
const COOL_DOWN = 28
/** unanswered for this many days counts as "Keep as is" (a design choice, not evidence-based) */
const EXPIRE = 3
/** after a break, no downward suggestion for this long (mental-performance) */
const RETURN_QUIET = 14
/** a gap this long with no training session is a break (same 10-day length as "welcome back"; stricter definition of a session) */
const BREAK_DAYS = 10

/**
 * On a break now (10+ days since the last training session), or back from one within the last
 * 14 days, read from the log itself so it doesn't depend on answering "welcome back". Gaps are
 * measured between training sessions, so a short mobility swap in the middle of a long break
 * doesn't hide it (mental-performance).
 */
export function onOrAfterBreak(s: AppState, today: string): boolean {
  const ds = Object.keys(s.days).filter((d) => d < today && trainingDay(s, d)).sort()
  if (!ds.length) return false
  if (ds[ds.length - 1] <= shiftDay(today, -BREAK_DAYS)) return true
  const since = shiftDay(today, -RETURN_QUIET)
  for (let i = 1; i < ds.length; i++) if (ds[i] > since && ds[i - 1] <= shiftDay(ds[i], -BREAK_DAYS)) return true
  return false
}
const ORDER: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active']

/** Band for an average number of training days a week (light 1–<3, moderate 3–<5.5, active 5.5+). */
export function bandFor(daysPerWeek: number): ActivityLevel | null {
  if (daysPerWeek >= 5.5) return 'active'
  if (daysPerWeek >= 3) return 'moderate'
  if (daysPerWeek >= 1) return 'light'
  return null
}

/** Training days in each of the last four whole weeks before `today`, oldest first. */
export function trainingWeeks(s: AppState, today: string): number[] {
  const weeks = [0, 0, 0, 0]
  for (let i = 1; i <= WINDOW; i++) {
    // a day counts once however many sessions it has
    if (trainingDay(s, shiftDay(today, -i))) weeks[3 - Math.floor((i - 1) / 7)]++
  }
  return weeks
}

/** The date the suggestion was last settled: answered, or left unanswered long enough. */
function settledOn(s: AppState, today: string): string {
  const asked = s.profile.activityAsked || ''
  const shown = s.profile.activityShown || ''
  return shown > asked && shown <= shiftDay(today, -EXPIRE) ? shown : asked
}

/** Whether the card should record today as the first day it was shown. */
export function markActivityShown(s: AppState, today: string): boolean {
  const shown = s.profile.activityShown
  return !shown || shown <= (s.profile.activityAsked || '') || shown <= shiftDay(today, -COOL_DOWN)
}

export interface ActivitySuggestion { level: ActivityLevel; up: boolean }

/**
 * The level to suggest, or null. Only once there are 28+ days of any logging; only when at
 * least 3 of the 4 weeks sit in the same band as the average; never up from sedentary (it also
 * describes daily life); never down without at least one logged session (not logging isn't
 * evidence of not training), during an easier week or in the two weeks after a break; at most
 * once every 28 days, counting a card left unanswered for 3 days as answered.
 */
export function activitySuggestion(s: AppState, today: string): ActivitySuggestion | null {
  const first = Object.keys(s.days).sort()[0]
  if (!first || first > shiftDay(today, -WINDOW)) return null
  const settled = settledOn(s, today)
  if (settled && settled > shiftDay(today, -COOL_DOWN)) return null
  const weeks = trainingWeeks(s, today)
  const total = weeks.reduce((a, b) => a + b, 0)
  const band = bandFor(total / 4)
  const cur = ORDER.includes(s.profile.activityLevel) ? s.profile.activityLevel : 'light' // as nutrition.ts does
  if (!band || band === cur) return null
  if (weeks.filter((w) => bandFor(w) === band).length < 3) return null
  const up = ORDER.indexOf(band) > ORDER.indexOf(cur)
  if (up && cur === 'sedentary') return null
  if (!up) {
    if (total === 0) return null
    const p = s.profile
    if (p.easyUntil && today <= p.easyUntil) return null
    if (p.welcomeAsked && p.welcomeAsked > shiftDay(today, -RETURN_QUIET)) return null
    if (onOrAfterBreak(s, today)) return null
  }
  return { level: band, up }
}
