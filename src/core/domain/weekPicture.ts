import type { AppState, CheckIn, IfThenPlan, OnboardingOutcomes } from '@/core/types'
import { shiftDay } from './date'
import { dayTotals } from './nutrition'
import { dayMargin } from './estimate'
import { avg, plansDue, rangeFor } from './insights'
import { plannedKeys } from './plans'
import { isHardSession, sessionMetMins, workoutsOf } from './sessions'
import { offerLighter } from './dayOptions'
import { LOOP_THRESHOLDS, type LoopThresholds } from './loopThresholds'

/**
 * One shared weekly picture across the four pillars: mind, food, movement and body
 * (docs/plans/maintenance-loop.md, Benn's rule: all data is connected, including the mind). The
 * weekly review, the weigh-in check and maintenance mode all read this, never their own copies.
 * Pure: the clock is passed in. It reads what's logged and stores nothing.
 *
 * A day still in progress (`today` or later) is in the picture but never in an average, so an
 * unfinished day can't read as a miss.
 */

/** Scale steps (insights HUNGER, SLEEP, STRESS): facts about the scales, not thresholds. */
const HUNGRY_MAX = 2 // 1 Starving, 2 Hungry
const POOR_SLEEP = 1
const HIGH_STRESS = 3
/** check-ins compared for a low day: dayOptions' own history length */
const LOW_HISTORY = 14

export interface DayMind {
  mood?: number
  hunger?: number
  sleep?: number
  stress?: number
  energy?: number
  sore?: number
  /** two or more signals low against the person's own recent answers (dayOptions.offerLighter) */
  low: boolean
}

export interface DayPicture {
  d: string
  /** before `today`: counts in averages */
  finished: boolean
  /** null when there's no check-in that day */
  mind: DayMind | null
  food: { logged: boolean; kcal: number; protein: number; inRange: boolean; margin: number }
  move: { sessions: number; minutes: number; hard: number; planned: number; plannedDone: boolean }
  weight: number | null
}

const answered = (v: number | undefined) => (v ? v : undefined)

function mindOf(s: AppState, d: string): DayMind | null {
  const c = s.days[d]?.checkin
  if (!c) return null
  const recent: (CheckIn | null | undefined)[] = []
  for (let i = 1; i <= LOW_HISTORY; i++) recent.push(s.days[shiftDay(d, -i)]?.checkin)
  const m: DayMind = { low: offerLighter(c, recent) }
  for (const k of ['mood', 'hunger', 'sleep', 'stress', 'energy', 'sore'] as const) {
    const v = answered(c[k])
    if (v !== undefined) m[k] = v
  }
  return m
}

/** One day across the four pillars. */
export function dayPicture(s: AppState, d: string, today: string): DayPicture {
  const day = s.days[d]
  const t = dayTotals(day)
  const r = rangeFor(s, d)
  const done = workoutsOf(day, d)
  const planned = plannedKeys(s, d).length
  return {
    d,
    finished: d < today,
    mind: mindOf(s, d),
    food: { logged: (day?.foods?.length ?? 0) > 0, kcal: t.k, protein: t.p, inRange: t.k >= r.lo && t.k <= r.hi, margin: day ? dayMargin(day.foods || []) : 0 },
    move: {
      sessions: done.length,
      minutes: done.reduce((a, x) => a + sessionMetMins(x).mins, 0),
      hard: done.filter(isHardSession).length,
      planned,
      plannedDone: planned > 0 && done.length > 0,
    },
    weight: day?.weight || null,
  }
}

/** The days from `from` to `to`, oldest first. */
export function dayPictures(s: AppState, from: string, to: string, today: string): DayPicture[] {
  const out: DayPicture[] = []
  for (let d = from; d <= to; d = shiftDay(d, 1)) out.push(dayPicture(s, d, today))
  return out
}

export interface MindContext {
  checkins: number
  /** days with two or more low signals */
  lowDays: number
  poorSleepDays: number
  highStressDays: number
  hungryDays: number
  /** null while mental-performance's `strainedLowDays` is unset */
  strained: boolean | null
  wellbeing: OnboardingOutcomes['wellbeing']
  baseline: OnboardingOutcomes['baseline']
}

const mean = (xs: (number | undefined)[]): number | null => {
  const v = xs.filter((x): x is number => x !== undefined)
  return v.length ? avg(v) : null
}

/** The mind side of a run of days (finished days only). */
export function mindContext(s: AppState, days: DayPicture[], t: LoopThresholds = LOOP_THRESHOLDS): MindContext {
  const m = days.filter((x) => x.finished && x.mind).map((x) => x.mind!)
  const lowDays = m.filter((x) => x.low).length
  const need = t.strainedLowDays.value
  return {
    checkins: m.length,
    lowDays,
    poorSleepDays: m.filter((x) => x.sleep === POOR_SLEEP).length,
    highStressDays: m.filter((x) => x.stress === HIGH_STRESS).length,
    hungryDays: m.filter((x) => x.hunger !== undefined && x.hunger <= HUNGRY_MAX).length,
    strained: need === null ? null : lowDays >= need,
    wellbeing: s.profile.outcomes?.wellbeing,
    baseline: s.profile.outcomes?.baseline,
  }
}

export interface WeekPicture {
  from: string
  to: string
  days: DayPicture[]
  /** nothing in any pillar on the finished days: the review says "welcome back", nothing to catch up */
  empty: boolean
  mind: MindContext & {
    avg: { mood: number | null; hunger: number | null; sleep: number | null; stress: number | null; energy: number | null }
    plansDue: IfThenPlan[]
    /** the person's own "what would make this worth it" answers, shown back as they gave them */
    motivations: string[]
  }
  food: { loggedDays: number; avgKcal: number | null; avgProtein: number | null; inRangeDays: number; avgMargin: number | null }
  move: { sessions: number; minutes: number; hard: number; plannedDays: number; plannedDone: number }
  body: { weighIns: number; avg: number | null; lo: number | null; hi: number | null }
}

/** The 7 days ending `to`, across mind, food, movement and body. */
export function weekPicture(s: AppState, to: string, today: string, t: LoopThresholds = LOOP_THRESHOLDS): WeekPicture {
  const from = shiftDay(to, -6)
  const days = dayPictures(s, from, to, today)
  const fin = days.filter((x) => x.finished)
  const fed = fin.filter((x) => x.food.logged)
  const mind = fin.filter((x) => x.mind).map((x) => x.mind!)
  const w = fin.map((x) => x.weight).filter((x): x is number => x !== null)
  const empty = !fin.some((x) => x.food.logged || x.mind || x.move.sessions || x.weight !== null)
  return {
    from, to, days, empty,
    mind: {
      ...mindContext(s, days, t),
      avg: { mood: mean(mind.map((x) => x.mood)), hunger: mean(mind.map((x) => x.hunger)), sleep: mean(mind.map((x) => x.sleep)), stress: mean(mind.map((x) => x.stress)), energy: mean(mind.map((x) => x.energy)) },
      plansDue: plansDue(s.profile, today),
      motivations: [...(s.profile.motivations ?? [])],
    },
    food: {
      loggedDays: fed.length,
      avgKcal: fed.length ? avg(fed.map((x) => x.food.kcal)) : null,
      avgProtein: fed.length ? avg(fed.map((x) => x.food.protein)) : null,
      inRangeDays: fed.filter((x) => x.food.inRange).length,
      avgMargin: fed.length ? avg(fed.map((x) => x.food.margin)) : null,
    },
    move: {
      sessions: fin.reduce((a, x) => a + x.move.sessions, 0),
      minutes: fin.reduce((a, x) => a + x.move.minutes, 0),
      hard: fin.reduce((a, x) => a + x.move.hard, 0),
      plannedDays: days.filter((x) => x.move.planned > 0).length,
      plannedDone: days.filter((x) => x.move.plannedDone).length,
    },
    body: { weighIns: w.length, avg: w.length ? avg(w) : null, lo: w.length ? Math.min(...w) : null, hi: w.length ? Math.max(...w) : null },
  }
}

/**
 * A pattern line compares the person's own days with each other, never with anyone else, and
 * never claims a cause. It's returned as a code and its data: `mental-performance` owns the
 * wording, the thresholds and whether a line shows at all.
 * - hunger-poor-sleep: hunger on poor-sleep days vs other days ("hunger was higher on your
 *   short-sleep days"). Hunger runs 1 Starving to 5 Stuffed, so hungrier is a lower number.
 * - hunger-high-stress: the same for high-stress days.
 * - mood-moved: mood on days with a session vs days without.
 */
export type PatternCode = 'hunger-poor-sleep' | 'hunger-high-stress' | 'mood-moved'
export interface PatternLine {
  code: PatternCode
  /** days in the marked group (poor sleep, high stress, moved) and in the rest */
  days: [number, number]
  /** marked group average minus the rest's, on the signal's own scale */
  diff: number
}
export type PatternResult = { line: PatternLine } | { line: null; reason: 'awaiting-threshold' | 'off' | 'not-enough-data' }

export function patternLine(days: DayPicture[], t: LoopThresholds = LOOP_THRESHOLDS): PatternResult {
  const on = t.patternLinesOn.value, minDays = t.patternMinDays.value, minDiff = t.patternMinDiff.value
  if (on === null || minDays === null || minDiff === null) return { line: null, reason: 'awaiting-threshold' }
  if (!on) return { line: null, reason: 'off' }
  const fin = days.filter((x) => x.finished && x.mind)
  const compare = (code: PatternCode, value: (x: DayPicture) => number | undefined, marked: (x: DayPicture) => boolean | undefined): PatternLine | null => {
    const a: number[] = [], b: number[] = []
    for (const x of fin) {
      const v = value(x), m = marked(x)
      if (v === undefined || m === undefined) continue
      ;(m ? a : b).push(v)
    }
    if (a.length < minDays || b.length < minDays) return null
    const diff = avg(a) - avg(b)
    return Math.abs(diff) >= minDiff ? { code, days: [a.length, b.length], diff: Math.round(diff * 100) / 100 } : null
  }
  const lines = [
    compare('hunger-poor-sleep', (x) => x.mind!.hunger, (x) => (x.mind!.sleep === undefined ? undefined : x.mind!.sleep === POOR_SLEEP)),
    compare('hunger-high-stress', (x) => x.mind!.hunger, (x) => (x.mind!.stress === undefined ? undefined : x.mind!.stress === HIGH_STRESS)),
    compare('mood-moved', (x) => x.mind!.mood, (x) => x.move.sessions > 0),
  ].filter((x): x is PatternLine => !!x)
  if (!lines.length) return { line: null, reason: 'not-enough-data' }
  // one line only: the largest difference (ties keep the order above)
  return { line: lines.reduce((best, x) => (Math.abs(x.diff) > Math.abs(best.diff) ? x : best)) }
}
