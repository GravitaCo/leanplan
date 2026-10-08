import type { AppState, CheckIn, IfThenPlan, LoggedExercise, MealSlot, OnboardingOutcomes, Session, SetEntry } from '@/core/types'
import { DAY_NAME, parseYmd, shiftDay } from './date'
import { dayTotals } from './nutrition'
import { avg, plansDue, rangeFor } from './insights'
import { plannedKeys } from './plans'
import { workoutsOf } from './sessions'
import { offerLighter } from './dayOptions'
import { lastLogged } from './library'
import { PROTEIN_MEAL_G } from './foodMode'
import { LOOP_THRESHOLDS, type LoopThresholds } from './loopThresholds'

/**
 * One shared weekly picture across the four pillars: mind, food, movement and body
 * (docs/plans/maintenance-loop.md, Benn's rule: all data is connected, including the mind). The
 * weekly review, the weigh-in check and maintenance mode all read this, never their own copies.
 * Pure: the clock is passed in. It reads what's logged and stores nothing.
 *
 * A day still in progress (`today` or later) is never counted, so an unfinished day can't read as
 * a miss. Counts are counts, never "x of y" (Benn, 8 Oct 2026).
 */

/** Scale steps (insights HUNGER, SLEEP, STRESS, ENERGY, MOODS): facts about the scales, not thresholds. */
const POOR_SLEEP = 1, GOOD_SLEEP = 3
const LOW_STRESS = 1, HIGH_STRESS = 3
const HUNGRY_MAX = 2 // 1 Starving, 2 Hungry
const SATISFIED = 3
const GOOD_MOOD = 4 // Good, Great
const GOOD_ENERGY = 3
/** check-ins compared for a low day: dayOptions' own history length */
const LOW_HISTORY = 14
/** evening hunger: a check-in saved from 17:00 (mental-performance 8 Oct, a weak proxy [G]) */
const EVENING_HOUR = 17
const MAIN_MEALS: (MealSlot | 'other')[] = ['breakfast', 'lunch', 'dinner', 'other']

export interface DayMind {
  mood?: number
  hunger?: number
  sleep?: number
  stress?: number
  energy?: number
  sore?: number
  /** the hour the check-in was saved, when known */
  hour?: number
  /** two or more signals low against the person's own recent answers (dayOptions.offerLighter) */
  low: boolean
}

export type MoveKind = 'strength' | 'walk' | 'other'

export interface DayPicture {
  d: string
  /** before `today`: counts */
  finished: boolean
  /** null when there's no check-in that day */
  mind: DayMind | null
  food: {
    logged: boolean; kcal: number; protein: number; inRange: boolean
    /** distinct meal slots with food (no slot counts as one) */
    meals: number
    /** main meals (breakfast, lunch, dinner, no slot) with food, and those reaching PROTEIN_MEAL_G */
    mainMeals: number; proteinMeals: number
  }
  move: { sessions: Session[]; kinds: MoveKind[]; planned: number }
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
  if (c.t) { const h = new Date(c.t).getHours(); if (Number.isFinite(h)) m.hour = h }
  return m
}

/** Strength work, a walk, or anything else (yoga, a run, a class). */
export function moveKind(x: Session): MoveKind {
  if (x.modality === 'strength' || x.modality === 'calisthenics') return 'strength'
  if (x.modality === 'cardio' && /walk/i.test(x.cardio?.key || x.title || '')) return 'walk'
  return 'other'
}

/** One day across the four pillars. */
export function dayPicture(s: AppState, d: string, today: string): DayPicture {
  const day = s.days[d]
  const foods = day?.foods || []
  const t = dayTotals(day)
  const r = rangeFor(s, d)
  const done = workoutsOf(day, d)
  const bySlot = new Map<MealSlot | 'other', number>()
  for (const f of foods) { const k = f.meal ?? 'other'; bySlot.set(k, (bySlot.get(k) ?? 0) + (f.p || 0)) }
  const main = MAIN_MEALS.filter((k) => bySlot.has(k))
  return {
    d,
    finished: d < today,
    mind: mindOf(s, d),
    food: {
      logged: foods.length > 0, kcal: t.k, protein: t.p, inRange: t.k >= r.lo && t.k <= r.hi,
      meals: bySlot.size, mainMeals: main.length, proteinMeals: main.filter((k) => (bySlot.get(k) ?? 0) >= PROTEIN_MEAL_G).length,
    },
    move: { sessions: done, kinds: done.map(moveKind), planned: plannedKeys(s, d).length },
    weight: day?.weight || null,
  }
}

/** The days from `from` to `to`, oldest first. */
export function dayPictures(s: AppState, from: string, to: string, today: string): DayPicture[] {
  const out: DayPicture[] = []
  for (let d = from; d <= to; d = shiftDay(d, 1)) out.push(dayPicture(s, d, today))
  return out
}

/* ---------------- the mind side ---------------- */

/** Which part of the week a run of days sits in, for "Lower than usual mid-week". */
export type WeekPart = 'early' | 'mid' | 'weekend'

export interface MindContext {
  checkins: number
  /** finished days in the run, for "every day" */
  days: number
  /** days with two or more low signals */
  lowDays: number
  poorSleepDays: number
  goodSleepDays: number
  sleepAnswers: number
  highStressDays: number
  lowStressDays: number
  stressAnswers: number
  /** every high-stress day fell Monday to Friday and weekend stress stayed at Some or lower */
  calmerWeekend: boolean
  goodMoodDays: number
  moodAnswers: number
  /** two or more days in a row below the person's own 28-day median mood, and where they fell */
  lowerMood: WeekPart | null
  /** mood Rough or Low on 4+ days: the care tier, never a row */
  careMood: boolean
  hungryDays: number
  satisfiedDays: number
  hungerAnswers: number
  /** of the hungry days, two-thirds or more were check-ins from 17:00 */
  eveningHunger: boolean
  /** Starving on 3+ days: a restriction signal, never a row (mental-performance 8 Oct) */
  starvingDays: number
  /** a hard week (one predicate for the hard encouragement line, mind options first and no eat-less) */
  hard: boolean
  wellbeing: OnboardingOutcomes['wellbeing']
  baseline: OnboardingOutcomes['baseline']
}

const count = (xs: (number | undefined)[], f: (v: number) => boolean) => xs.filter((v) => v !== undefined && f(v)).length
const nAns = (xs: (number | undefined)[]) => xs.filter((v) => v !== undefined).length
const median = (xs: number[]): number | null => {
  if (!xs.length) return null
  const v = [...xs].sort((a, b) => a - b), n = v.length
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2
}
const dow = (d: string) => parseYmd(d).getDay()
const partOf = (d: string): WeekPart => { const w = dow(d); return w === 0 || w === 6 ? 'weekend' : w <= 2 ? 'early' : 'mid' }

/** The mind side of a run of days (finished days only). */
export function mindContext(s: AppState, days: DayPicture[], t: LoopThresholds = LOOP_THRESHOLDS): MindContext {
  const fin = days.filter((x) => x.finished)
  const withMind = fin.filter((x) => x.mind)
  const m = withMind.map((x) => x.mind!)
  const sleep = m.map((x) => x.sleep), stress = m.map((x) => x.stress), mood = m.map((x) => x.mood), hunger = m.map((x) => x.hunger)
  const lowDays = m.filter((x) => x.low).length
  const poorSleepDays = count(sleep, (v) => v === POOR_SLEEP)
  const highStressDays = count(stress, (v) => v === HIGH_STRESS)
  const k = t.mind

  // calmer weekend: the high-stress days all fell on weekdays, and the weekend's answers stayed at Some or lower
  const hi = withMind.filter((x) => x.mind!.stress === HIGH_STRESS)
  const wkend = withMind.filter((x) => partOf(x.d) === 'weekend' && x.mind!.stress !== undefined)
  const calmerWeekend = hi.length > 0 && hi.every((x) => partOf(x.d) !== 'weekend') && wkend.length > 0 && wkend.every((x) => x.mind!.stress! <= 2)

  // lower than usual: two or more days in a row below the median of the 28 days before the run
  let lowerMood: WeekPart | null = null
  if (fin.length) {
    const hist: number[] = []
    for (let i = 1; i <= 28; i++) { const v = s.days[shiftDay(fin[0].d, -i)]?.checkin?.mood; if (v) hist.push(v) }
    const med = hist.length >= k.minAnswers ? median(hist) : null
    if (med !== null) {
      for (let i = 1; i < fin.length && !lowerMood; i++) {
        const a = fin[i - 1].mind?.mood, b = fin[i].mind?.mood
        if (a && b && a < med && b < med) lowerMood = partOf(fin[i].d)
      }
    }
  }

  const hungry = withMind.filter((x) => x.mind!.hunger !== undefined && x.mind!.hunger <= HUNGRY_MAX)
  const evening = hungry.filter((x) => (x.mind!.hour ?? -1) >= EVENING_HOUR).length
  const hard = m.length >= k.hardCheckins && (poorSleepDays >= k.hardPoorSleep || highStressDays >= k.hardHighStress || lowDays >= k.hardLowDays)
  return {
    checkins: m.length,
    days: fin.length,
    lowDays,
    poorSleepDays, goodSleepDays: count(sleep, (v) => v === GOOD_SLEEP), sleepAnswers: nAns(sleep),
    highStressDays, lowStressDays: count(stress, (v) => v === LOW_STRESS), stressAnswers: nAns(stress),
    calmerWeekend,
    goodMoodDays: count(mood, (v) => v >= GOOD_MOOD), moodAnswers: nAns(mood),
    lowerMood,
    careMood: count(mood, (v) => v <= 2) >= 4,
    hungryDays: hungry.length, satisfiedDays: count(hunger, (v) => v === SATISFIED), hungerAnswers: nAns(hunger),
    eveningHunger: hungry.length >= 3 && evening * 3 >= hungry.length * 2,
    starvingDays: count(hunger, (v) => v === 1),
    hard,
    wellbeing: s.profile.outcomes?.wellbeing,
    baseline: s.profile.outcomes?.baseline,
  }
}

/* ---------------- strength progress ---------------- */

export interface StrengthProgress {
  name: string
  d: string
  kind: 'load' | 'reps' | 'hold'
  /** the new best: kg (load), reps, or seconds */
  value: number
}

const num = (x: string | undefined) => { const v = parseFloat(x || ''); return Number.isFinite(v) ? v : 0 }
const working = (sets: SetEntry[]) => sets.filter((x) => !x.warmup && !x.assist)

/** The best working set: top load and the most reps at it, the most reps overall, the longest hold. */
function best(x: LoggedExercise) {
  const sets = working(x.sets || [])
  const top = Math.max(0, ...sets.map((y) => num(y.w)))
  return {
    load: top,
    repsAtLoad: Math.max(0, ...sets.filter((y) => num(y.w) === top).map((y) => num(y.reps))),
    reps: Math.max(0, ...sets.map((y) => num(y.reps))),
    hold: Math.max(0, ...sets.map((y) => num(y.sec))),
    repsAtOrAbove: (kg: number) => Math.max(0, ...sets.filter((y) => num(y.w) >= kg).map((y) => num(y.reps))),
  }
}

/**
 * The one strength line for the week (mental-performance 8 Oct): against the previous logged
 * session of the same exercise, working sets only, never a first-ever log. A load increase (with
 * at least last time's reps) beats a rep increase at the same or higher load; holds count longer
 * time. Ties go to the latest day. Null when nothing went up.
 */
export function strengthProgress(s: AppState, days: DayPicture[]): StrengthProgress | null {
  const rank = { load: 3, reps: 2, hold: 1 }
  let out: StrengthProgress | null = null
  for (const day of days.filter((x) => x.finished)) {
    for (const sess of day.move.sessions) {
      for (const x of sess.ex || []) {
        const prev = lastLogged(s.days, day.d, x.exId, x.name)
        if (!prev) continue
        const now = best(x), was = best(prev)
        let hit: StrengthProgress | null = null
        if (x.log === 'hold') { if (now.hold > was.hold) hit = { name: x.name, d: day.d, kind: 'hold', value: now.hold } }
        else if (now.load > 0 && now.load > was.load && now.repsAtLoad >= was.repsAtLoad) hit = { name: x.name, d: day.d, kind: 'load', value: now.load }
        else if (was.load > 0 ? now.repsAtOrAbove(was.load) > was.repsAtLoad : now.reps > was.reps) hit = { name: x.name, d: day.d, kind: 'reps', value: was.load > 0 ? now.repsAtOrAbove(was.load) : now.reps }
        if (hit && (!out || rank[hit.kind] > rank[out.kind] || (rank[hit.kind] === rank[out.kind] && hit.d >= out.d))) out = hit
      }
    }
  }
  return out
}

/* ---------------- the week ---------------- */

export interface WeekPicture {
  from: string
  to: string
  days: DayPicture[]
  /** nothing in any pillar on the finished days: the review says "welcome back", nothing to catch up */
  empty: boolean
  mind: MindContext & {
    plansDue: IfThenPlan[]
    /** the person's own "what would make this worth it" answers, shown back as they gave them */
    motivations: string[]
  }
  food: {
    loggedDays: number; inRangeDays: number
    avgKcal: number | null; avgProtein: number | null
    /** main meals with food, and those with 15 g+ protein, across the logged days */
    mainMeals: number; proteinMeals: number
  }
  move: { strength: number; walks: number; other: number; sessions: number; plannedDays: number; progress: StrengthProgress | null }
  body: { weighIns: number }
}

/** The days from `from` to `to` (normally the 7 days ending yesterday), across mind, food, movement and body. */
export function weekPicture(s: AppState, from: string, to: string, today: string, t: LoopThresholds = LOOP_THRESHOLDS): WeekPicture {
  const days = dayPictures(s, from, to, today)
  const fin = days.filter((x) => x.finished)
  const fed = fin.filter((x) => x.food.logged)
  const kinds = fin.flatMap((x) => x.move.kinds)
  const empty = !fin.some((x) => x.food.logged || x.mind || x.move.sessions.length || x.weight !== null)
  return {
    from, to, days, empty,
    mind: { ...mindContext(s, days, t), plansDue: plansDue(s.profile, today), motivations: [...(s.profile.motivations ?? [])] },
    food: {
      loggedDays: fed.length,
      inRangeDays: fed.filter((x) => x.food.inRange).length,
      avgKcal: fed.length ? avg(fed.map((x) => x.food.kcal)) : null,
      avgProtein: fed.length ? avg(fed.map((x) => x.food.protein)) : null,
      mainMeals: fed.reduce((a, x) => a + x.food.mainMeals, 0),
      proteinMeals: fed.reduce((a, x) => a + x.food.proteinMeals, 0),
    },
    move: {
      strength: kinds.filter((k) => k === 'strength').length,
      walks: kinds.filter((k) => k === 'walk').length,
      other: kinds.filter((k) => k === 'other').length,
      sessions: kinds.length,
      plannedDays: days.filter((x) => x.move.planned > 0).length,
      progress: strengthProgress(s, days),
    },
    body: { weighIns: fin.filter((x) => x.weight !== null).length },
  }
}

/* ---------------- pattern lines ---------------- */

/**
 * A pattern line compares the person's own days with each other, never with anyone else, and
 * never claims a cause (mental-performance 8 Oct, v1 set; none ends in weight or kcal, no mood
 * lines). The UI words it (loopCopy.ts).
 * - hunger-poor-sleep: hunger on poor-sleep days vs the rest (hungrier is a lower number)
 * - hunger-high-stress: hunger on high-stress days vs the rest
 * - energy-good-sleep: energy after a good night (the same day's check-in) vs the rest
 * - sessions-good-energy: share of days with a session, good-energy days vs the rest
 * - sessions-calm: share of days with a session, low-stress days vs the rest
 */
export type PatternCode = 'hunger-poor-sleep' | 'hunger-high-stress' | 'energy-good-sleep' | 'sessions-good-energy' | 'sessions-calm'
export const PATTERN_CODES: PatternCode[] = ['hunger-poor-sleep', 'hunger-high-stress', 'energy-good-sleep', 'sessions-good-energy', 'sessions-calm']
/** gentle mode: mind and movement lines only, never hunger (mental-performance 8 Oct, board ml-a2) */
export const GENTLE_PATTERNS: PatternCode[] = ['energy-good-sleep', 'sessions-good-energy', 'sessions-calm']

export interface PatternLine {
  code: PatternCode
  /** days in the marked group and in the rest */
  days: [number, number]
  /** marked group average minus the rest's, on the signal's own scale (a share for sessions) */
  diff: number
}

type Pick = (x: DayPicture) => { v: number; marked: boolean } | null
const PAIRS: Record<PatternCode, { pick: Pick; sign: 1 | -1 }> = {
  // hungrier is lower: the line shows when the marked days run lower
  'hunger-poor-sleep': { sign: -1, pick: (x) => (x.mind?.hunger && x.mind.sleep ? { v: x.mind.hunger, marked: x.mind.sleep === POOR_SLEEP } : null) },
  'hunger-high-stress': { sign: -1, pick: (x) => (x.mind?.hunger && x.mind.stress ? { v: x.mind.hunger, marked: x.mind.stress === HIGH_STRESS } : null) },
  'energy-good-sleep': { sign: 1, pick: (x) => (x.mind?.energy && x.mind.sleep ? { v: x.mind.energy, marked: x.mind.sleep === GOOD_SLEEP } : null) },
  'sessions-good-energy': { sign: 1, pick: (x) => (x.mind?.energy ? { v: x.move.sessions.length ? 1 : 0, marked: x.mind.energy === GOOD_ENERGY } : null) },
  'sessions-calm': { sign: 1, pick: (x) => (x.mind?.stress ? { v: x.move.sessions.length ? 1 : 0, marked: x.mind.stress === LOW_STRESS } : null) },
}

const variance = (xs: number[]) => { const m = avg(xs); return xs.length > 1 ? xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1) : 0 }

/** The groups for one pair over some days: the difference (in the line's direction) and its standard error. */
function compare(code: PatternCode, days: DayPicture[]) {
  const a: number[] = [], b: number[] = []
  for (const x of days) { const p = PAIRS[code].pick(x); if (p) (p.marked ? a : b).push(p.v) }
  if (!a.length || !b.length) return { a: a.length, b: b.length, diff: 0, se: Infinity }
  return { a: a.length, b: b.length, diff: PAIRS[code].sign * (avg(a) - avg(b)), se: Math.sqrt(variance(a) / a.length + variance(b) / b.length) }
}

export type PatternResult = { line: PatternLine } | { line: null; reason: 'off' | 'not-enough-data' }

/**
 * At most one line (mental-performance 8 Oct): over the 42 days ending `to`, 6+ days in each
 * group, a difference beyond 2 standard errors in the line's direction, and each 21-day half
 * showing the same direction with 3+ days in each group. `allowed` narrows the pairs (gentle);
 * `recent` holds when each pair last showed (none within 28 days). The clearest difference wins.
 */
export function patternLine(s: AppState, to: string, today: string, o: { allowed?: PatternCode[]; recent?: Partial<Record<PatternCode, string>>; t?: LoopThresholds } = {}): PatternResult {
  const t = (o.t ?? LOOP_THRESHOLDS).pattern
  const allowed = o.allowed ?? PATTERN_CODES
  if (!allowed.length) return { line: null, reason: 'off' }
  const days = dayPictures(s, shiftDay(to, -(t.windowDays - 1)), to, today).filter((x) => x.finished && x.mind)
  const half = shiftDay(to, -(t.windowDays / 2 - 1))
  const first = days.filter((x) => x.d < half), second = days.filter((x) => x.d >= half)
  let best: PatternLine | null = null, bestZ = -Infinity
  for (const code of allowed) {
    const last = o.recent?.[code]
    if (last && last > shiftDay(today, -t.repeatDays)) continue
    const all = compare(code, days)
    if (all.a < t.minDays || all.b < t.minDays || !(all.diff > 0) || all.diff <= t.minSE * all.se) continue
    const h = [compare(code, first), compare(code, second)]
    if (!h.every((x) => x.a >= t.minHalfDays && x.b >= t.minHalfDays && x.diff > 0)) continue
    const line: PatternLine = { code, days: [all.a, all.b], diff: Math.round(all.diff * 100) / 100 }
    // the scales differ (1 to 5, 1 to 3, a share of days), so the clearest difference wins, in standard errors
    const z = all.se ? all.diff / all.se : Infinity
    if (!best || z > bestZ) { best = line; bestZ = z }
  }
  return best ? { line: best } : { line: null, reason: 'not-enough-data' }
}

/** The weekday name of a date, for "on Thursday". */
export const weekdayOf = (d: string) => DAY_NAME[dow(d)]
