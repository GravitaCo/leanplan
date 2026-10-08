import type { AppState } from '@/core/types'
import { shiftDay } from './date'
import { avg } from './insights'
import { LOOP_THRESHOLDS, type LoopThresholds } from './loopThresholds'

/**
 * The weight trend for the maintenance loop (docs/research/maintenance-numbers-2026-10.md rule 1):
 * a least-squares fit over the last 28 days, never a week-against-week number. Readings more
 * than 3% from the window median are dropped once; the window grows to 42, then 56 days until it
 * holds 6 weigh-ins. Pure: the clock is passed in, nothing is stored.
 *
 * - `level` is the fitted weight at the window's last day (yesterday), not the window mean, which
 *   lags by half the window. It's what the steady range and drift compare.
 * - `se` is the plain least-squares standard error times SE_INFLATION, because day-to-day weight
 *   noise is correlated (nutrition-accuracy, 8 Oct: about sqrt((1 + 0.4) / (1 - 0.4))).
 * - A level may be shown after 3 weigh-ins over 7+ days; trend words only after 6 weigh-ins over
 *   21+ days with the first at least 28 days back (Benn, 8 Oct: "after 4 weeks").
 */

export interface WeighIn { d: string; kg: number }

export function weighIns(s: AppState, from: string, to: string): WeighIn[] {
  return Object.keys(s.days).filter((d) => d >= from && d <= to && s.days[d]?.weight).sort().map((d) => ({ d, kg: s.days[d].weight as number }))
}

export const dayIndex = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5
export const daysBetween = (a: string, b: string) => Math.round(dayIndex(b) - dayIndex(a))

const median = (xs: number[]): number => {
  const v = [...xs].sort((a, b) => a - b), n = v.length
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2
}

/** A straight-line fit through the points: kg a day, its (inflated) standard error and the fitted value at `at`. */
export function fitLine(points: WeighIn[], at: string, inflate: number): { slope: number; se: number; level: number } | null {
  const n = points.length
  if (n < 3) return null
  const xs = points.map((p) => dayIndex(p.d)), ys = points.map((p) => p.kg)
  const mx = avg(xs), my = avg(ys)
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  if (!sxx) return null
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx
  const rss = ys.reduce((a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2, 0)
  return { slope, se: Math.sqrt(rss / (n - 2) / sxx) * inflate, level: my + slope * (dayIndex(at) - mx) }
}

export interface WeightTrend {
  /** fitted kg at `to` */
  level: number
  /** kg a day (minus = down) and its inflated standard error */
  slope: number
  se: number
  /** slope as % of the level a week (minus = down) */
  weeklyPct: number
  /** weigh-ins used (after the outlier drop) and the days they span */
  n: number
  spanDays: number
  /** the window used, in days (28, 42 or 56) and its first day */
  windowDays: number
  from: string
  to: string
  /** a level may be shown ("about 84 kg") */
  levelReady: boolean
  /** trend words may be shown */
  wordsReady: boolean
}

/**
 * The trend ending `to` (normally yesterday). `notBefore` clips the window's start: readings from
 * before it never count (the first 14 days after a target change, or before a reference reset).
 * `today` sets "the first weigh-in at least 28 days back" for the trend words.
 */
export function weightTrend(s: AppState, to: string, o: { notBefore?: string; t?: LoopThresholds } = {}): WeightTrend | null {
  const t = o.t ?? LOOP_THRESHOLDS
  const k = t.trend
  let pts: WeighIn[] = [], windowDays = k.windowDays[0], from = to
  for (const w of k.windowDays) {
    windowDays = w
    from = shiftDay(to, -(w - 1))
    if (o.notBefore && from < o.notBefore) from = o.notBefore
    const raw = weighIns(s, from, to)
    if (!raw.length) { pts = []; continue }
    const m = median(raw.map((x) => x.kg))
    pts = raw.filter((x) => Math.abs(x.kg - m) / m <= k.outlierPct / 100)
    if (pts.length >= k.wordsMinWeighIns) break
  }
  const fit = fitLine(pts, to, k.seInflation)
  if (!fit) return null
  const spanDays = daysBetween(pts[0].d, pts[pts.length - 1].d)
  const firstEver = weighIns(s, o.notBefore ?? '0000-00-00', to)[0]
  return {
    level: fit.level, slope: fit.slope, se: fit.se,
    weeklyPct: ((fit.slope * 7) / fit.level) * 100,
    n: pts.length, spanDays, windowDays, from, to,
    levelReady: pts.length >= k.levelMinWeighIns && spanDays >= k.levelMinSpanDays,
    wordsReady: pts.length >= k.wordsMinWeighIns && spanDays >= k.wordsMinSpanDays && !!firstEver && daysBetween(firstEver.d, to) >= k.wordsMinHistoryDays - 1,
  }
}

/** Kg a week as a % of body weight, from kg a day. */
export const pctWeek = (kgPerDay: number, kg: number) => ((kgPerDay * 7) / kg) * 100

/**
 * Direction in words for goals with no pace or steady range (strength, endurance, feel better):
 * "about level" when the change is under the level threshold or within 2 SE of zero.
 */
export type LevelWord = 'level' | 'down' | 'up'
export function levelWord(tr: WeightTrend, t: LoopThresholds = LOOP_THRESHOLDS): LevelWord {
  const sePct = Math.abs(pctWeek(tr.se, tr.level))
  if (Math.abs(tr.weeklyPct) <= t.trend.levelPctWeek || Math.abs(tr.weeklyPct) <= 2 * sePct) return 'level'
  return tr.weeklyPct < 0 ? 'down' : 'up'
}
