import type {
  BodyArea, Equipment, Exercise, Experience, Goal, Modality, MovementPattern, MovingNow, MuscleGroup, PlanPhase, PlanWeek,
  Routine, RoutineEffort, RoutineSlot, TrainingPlan, Why,
} from '@/core/types'
import { EXERCISES } from '@/core/data/exercises'
import { KIT_PROFILES } from '../libraryCoverage'
import { deriveEffort, estMins, headlineModality } from '../routines'
import { parseRx } from '../guided'
import { RAMP_MINUTES, warmupMinutesFor, type SessionRange } from '../warmup'
import { seededUuid, stableKey, unit } from './hash'
import { DEFAULT_WEEKDAYS, WEEK_ORDER, defaultWhy, hasTrainingAnswers, poorLately, type AgeBand, type Deficit, type InputField, type PlanInputs } from './inputs'

/**
 * The personalised training engine, day 1 (personalised-training-engine.md §3.3, phase E1): it
 * generates a week from the exercise library within the person's constraints, never picks a
 * template. Pure and deterministic: the same inputs, person model and seed give the same plan, and
 * nothing here reads the clock.
 *
 * Pipeline: weekly budget (sessions and their mix) → placement on the weekdays → split, scored
 * for this person's days, minutes and weekdays → slots → exercise selection (hard filters, then a
 * score, then a seeded tie-break) → prescription from goal and experience → fit to the minutes →
 * guardrails (only ever lighter) → the why trace, written as each step decides.
 *
 * Every number marked "judgement call" is unvalidated and shown that way on purpose (§5).
 */

// ─── Public shapes ───────────────────────────────────────────────────────────────────────────

export type SessionKind = 'resistance' | 'cardio' | 'mind-body'
export type Focus = 'full-body' | 'upper' | 'lower' | 'legs' | 'push' | 'pull' | 'cardio' | 'yoga' | 'pilates' | 'mobility'
export type Split = 'full-body' | 'upper-lower' | 'ppl' | 'hybrid' | 'none'
export type SlotRole = 'main' | 'compound' | 'accessory' | 'balance' | 'cooldown' | 'cardio' | 'flow'
export interface Range { lo: number; hi: number }

export interface PlannedSlot {
  exId: string
  pattern: MovementPattern
  role: SlotRole
  /** working sets (1 for a timed piece) */
  sets: number
  /** reps, seconds or minutes per set; null for breaths, rounds and other counts */
  reps: Range | null
  unit: 'reps' | 'sec' | 'min' | 'other'
  /** the app's notation ("3 × 8–12", "20–30 min"), what the card and the player read */
  rx: string
  restSec: number
  /** reps in reserve to aim for, for loaded and bodyweight sets */
  rir?: Range
  /** "find your weight" on sessions 1–2 (no guessed load); see calibrationTarget */
  calibrate: boolean
  why: Why[]
}

export interface PlannedSession {
  /** 0 = Sun … 6 = Sat */
  weekday: number
  routineId: string
  kind: SessionKind
  focus: Focus
  name: string
  effort: RoutineEffort
  /** the engine's estimate, never above the minutes asked for */
  mins: number
  /** the light sixth day of a 6-day fat-loss week: there if wanted */
  optional?: boolean
  slots: PlannedSlot[]
  why: Why[]
}

/** The safety-scoped outcomes the rest of the app reads (engine §0, §3.5 G; onboarding §3, §4). */
export interface Routing {
  /** pre-selected from the answers (poor sleep, high stress, little room), changeable */
  gentleStart: boolean
  /** nothing high-impact (readiness, knees, 55+, gentle start, or the answer skipped) */
  lowImpact: boolean
  /** volume is never raised in the first 4 weeks; never at all in gentle mode, when wellbeing-routed or under 18 (a backstop) */
  volumeIncreases: 'after-week-4' | 'never'
  /** a big deficit: loads hold steady */
  holdProgression: boolean
  /** no "fancy a change?" stall offers while eating less */
  stallChecks: boolean
  /** trends as numbers on the exercise screen, or in words only */
  trends: 'numbers' | 'words'
  /** under 18 (a backstop) or age not given: no AI features */
  ai: boolean
  /** gentle mode (profile.gentle or wellbeing-routed): weekly volume shown in words, never numbers */
  gentleMode: boolean
  /** show the GP / midwife / NHS 111 line quietly */
  signpostHealth: boolean
  why: Why[]
}

export type OfferKind = 'add-strength' | 'add-cardio' | 'second-day'
/** Something offered once and never forced (plan §0.1, §3.2). */
export interface Offer { kind: OfferKind; why: Why }

export interface GeneratedPlan {
  /** source 'recommended', state 'active' with no start date yet: the UI sets `startedAt` (planStart) on confirm */
  trainingPlan: TrainingPlan
  /** the generated workouts (source 'recommended'), one per session, in weekday order */
  routines: Routine[]
  sessions: PlannedSession[]
  split: Split
  /** the days that have a session */
  weekdays: number[]
  /** weekly hard sets per muscle (1.0 primary, 0.5 secondary; judgement call) */
  weeklySets: Partial<Record<MuscleGroup, number>>
  /** weekly working sets across the resistance work */
  totalSets: number
  /** the weekly sets-per-muscle target it started from */
  volumeTarget: number
  easeInWeeks: number
  routing: Routing
  offers: Offer[]
  /** the copy the summary uses: "Built from your answers" or "Starter week: tell us more to personalise it" */
  label: 'built-from-answers' | 'starter-week'
}

export interface BuildResult {
  plan: GeneratedPlan
  /** the plan-level trace (split, mix, days, dose, ease-in, defaults); sessions and slots carry their own */
  why: Why[]
  /** true: the Starter week, which claims no personalisation */
  starter: boolean
}

/**
 * What the engine knows from the person's own data (§3.4). Day 1 uses it for preferences and
 * calibration only; it's derived from logs and `training.exPrefs`, never stored as such.
 */
export interface PersonModel {
  /** sessions with at least one working set, per exercise id */
  ex?: Record<string, { exposures: number }>
  liked?: string[]
  disliked?: string[]
}

// ─── Tables (judgement calls unless cited) ───────────────────────────────────────────────────

const LEVEL: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 }

/**
 * Weekly [resistance, cardio, mind-body] sessions by goal × sessions (plan §3.2; the 2-a-week
 * strength floor is WHO 2020 / UK CMO 2019, the rest a judgement call). A 1-day week is one
 * full-body session for every goal (onboarding §13.3). feel-better isn't in §3.2: it leans on
 * strength and mind-body, with the WHO floor offered when it isn't met.
 */
const MIX: Record<Goal, [number, number, number][]> = {
  'build-muscle': [[1, 0, 0], [2, 0, 0], [3, 0, 0], [3, 0, 1], [4, 0, 1], [5, 0, 1]],
  'increase-strength': [[1, 0, 0], [2, 0, 0], [3, 0, 0], [3, 0, 1], [4, 0, 1], [4, 1, 1]],
  'lose-fat': [[1, 0, 0], [1, 1, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1], [2, 2, 2]],
  // keeping it steady: strength 2+ days a week from 2 days on, to hold muscle (maintenance-numbers
  // rule 5, Mozaffarian et al. 2025), with cardio and mind-body added after that (judgement call)
  maintain: [[1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1], [3, 1, 1], [3, 2, 1]],
  'increase-endurance': [[1, 0, 0], [1, 1, 0], [1, 2, 0], [2, 2, 0], [2, 3, 0], [2, 3, 1]],
  'feel-better': [[1, 0, 0], [1, 0, 1], [2, 0, 1], [2, 1, 1], [2, 2, 1], [3, 2, 1]],
}

/**
 * Weekly hard sets per muscle (Schoenfeld, Ogborn & Krieger 2017 dose-response for "about 10+";
 * the bands by confidence follow MEV/MAV practitioner guidance: judgement call). Start at `low`
 * when anything says to go gently, `mid` otherwise.
 */
const VOLUME: Record<Experience, { low: number; mid: number }> = {
  beginner: { low: 8, mid: 10 },
  intermediate: { low: 12, mid: 14 },
  advanced: { low: 16, mid: 18 },
}

interface Scheme { reps: Range; rest: number; rir: Range }
/** Reps, rest and reps in reserve by goal (plan §3.4: Schoenfeld 2016/2021, ACSM 2009, Refalo 2023). */
function scheme(goal: Goal, exp: Experience, role: SlotRole, plates = true): Scheme {
  const acc = role === 'accessory'
  // 4–6 reps asks for a load that goes up in small steps (a bar and plates); dumbbells and
  // bodyweight get the 6–10 band on the main lift instead (judgement call)
  const main = role === 'main' && plates
  switch (goal) {
    case 'increase-strength':
      if (main) return exp === 'beginner' ? { reps: { lo: 6, hi: 8 }, rest: 180, rir: { lo: 2, hi: 3 } } : { reps: { lo: 4, hi: 6 }, rest: 180, rir: { lo: 1, hi: 3 } }
      return acc ? { reps: { lo: 8, hi: 12 }, rest: 90, rir: { lo: 2, hi: 3 } } : { reps: { lo: 6, hi: 10 }, rest: 120, rir: { lo: 2, hi: 3 } }
    case 'build-muscle':
      return acc ? { reps: { lo: 10, hi: 15 }, rest: 90, rir: { lo: 2, hi: 3 } } : { reps: exp === 'beginner' ? { lo: 10, hi: 12 } : { lo: 8, hi: 12 }, rest: 120, rir: { lo: 2, hi: 3 } }
    case 'lose-fat':
    case 'maintain':
      return acc ? { reps: { lo: 12, hi: 15 }, rest: 60, rir: { lo: 2, hi: 3 } } : { reps: exp === 'beginner' ? { lo: 10, hi: 12 } : { lo: 8, hi: 12 }, rest: 90, rir: { lo: 2, hi: 3 } }
    case 'increase-endurance':
      return acc ? { reps: { lo: 15, hi: 20 }, rest: 45, rir: { lo: 3, hi: 4 } } : { reps: { lo: 12, hi: 15 }, rest: 60, rir: { lo: 3, hi: 4 } }
    case 'feel-better':
      return acc ? { reps: { lo: 12, hi: 15 }, rest: 60, rir: { lo: 3, hi: 4 } } : { reps: { lo: 10, hi: 12 }, rest: 90, rir: { lo: 3, hi: 4 } }
  }
}

interface Spec { pattern: MovementPattern; muscle?: MuscleGroup; prio: number }
const S = (pattern: MovementPattern, prio: number, muscle?: MuscleGroup): Spec => ({ pattern, prio, muscle })
const iso = (muscle: MuscleGroup, prio: number) => S('isolation', prio, muscle)

/** Session templates: pattern slots, compounds first (§3.3 step 5). Priority 1 is never cut for time. */
const TEMPLATES: Record<string, { focus: Focus; slots: Spec[] }> = {
  FB1: { focus: 'full-body', slots: [S('squat', 1), S('horizontal-push', 1), S('horizontal-pull', 1), S('hinge', 1), S('vertical-push', 2), S('vertical-pull', 2), S('core', 3), iso('calves', 4)] },
  FBA: { focus: 'full-body', slots: [S('squat', 1), S('horizontal-push', 1), S('vertical-pull', 1), S('hinge', 2), S('core', 3), iso('shoulders', 4), iso('biceps', 4)] },
  FBB: { focus: 'full-body', slots: [S('hinge', 1), S('vertical-push', 1), S('horizontal-pull', 1), S('lunge', 2), S('core', 3), iso('triceps', 4), iso('calves', 4)] },
  FBC: { focus: 'full-body', slots: [S('lunge', 1), S('horizontal-push', 1), S('horizontal-pull', 1), S('hinge', 2), S('core', 3), iso('shoulders', 4), iso('hamstrings', 4)] },
  UPPER: { focus: 'upper', slots: [S('horizontal-push', 1), S('horizontal-pull', 1), S('vertical-push', 2), S('vertical-pull', 2), iso('shoulders', 3), iso('biceps', 4), iso('triceps', 4)] },
  LOWER: { focus: 'lower', slots: [S('squat', 1), S('hinge', 1), S('lunge', 2), S('core', 3), iso('hamstrings', 4), iso('calves', 4)] },
  LEGS: { focus: 'legs', slots: [S('squat', 1), S('hinge', 1), S('lunge', 2), iso('quads', 3), iso('hamstrings', 3), iso('calves', 4), S('core', 4)] },
  PUSH: { focus: 'push', slots: [S('horizontal-push', 1), S('vertical-push', 1), S('horizontal-push', 2), iso('shoulders', 3), iso('triceps', 3), S('core', 4)] },
  PULL: { focus: 'pull', slots: [S('vertical-pull', 1), S('horizontal-pull', 1), S('horizontal-pull', 2), iso('biceps', 3), S('core', 3)] },
}

/** Candidate splits per resistance-session count; scored, never looked up by days (§3.3 step 4). */
const SPLITS: Record<number, { split: Split; t: string[] }[]> = {
  1: [{ split: 'full-body', t: ['FB1'] }],
  2: [{ split: 'full-body', t: ['FBA', 'FBB'] }, { split: 'upper-lower', t: ['LOWER', 'UPPER'] }],
  3: [{ split: 'full-body', t: ['FBA', 'FBB', 'FBC'] }, { split: 'ppl', t: ['LEGS', 'PUSH', 'PULL'] }, { split: 'hybrid', t: ['LOWER', 'UPPER', 'FBC'] }],
  4: [{ split: 'full-body', t: ['FBA', 'FBB', 'FBA', 'FBB'] }, { split: 'upper-lower', t: ['LOWER', 'UPPER', 'LOWER', 'UPPER'] }, { split: 'hybrid', t: ['LEGS', 'PUSH', 'PULL', 'FBB'] }],
  5: [{ split: 'full-body', t: ['FBA', 'FBB', 'FBC', 'FBA', 'FBB'] }, { split: 'hybrid', t: ['LEGS', 'PUSH', 'PULL', 'LOWER', 'UPPER'] }, { split: 'upper-lower', t: ['LOWER', 'UPPER', 'LOWER', 'UPPER', 'FBC'] }],
  6: [{ split: 'ppl', t: ['LEGS', 'PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL'] }, { split: 'upper-lower', t: ['LOWER', 'UPPER', 'LOWER', 'UPPER', 'LOWER', 'UPPER'] }],
}

type Group = 'knee' | 'hip' | 'push' | 'pull' | 'core' | string
const groupOf = (s: Spec): Group =>
  s.pattern === 'squat' || s.pattern === 'lunge' ? 'knee' : s.pattern === 'hinge' ? 'hip'
    : s.pattern === 'horizontal-push' || s.pattern === 'vertical-push' ? 'push'
      : s.pattern === 'horizontal-pull' || s.pattern === 'vertical-pull' ? 'pull'
        : s.pattern === 'core' || s.pattern === 'carry' ? 'core' : 'iso:' + s.muscle

/** Weekly sets per group as a share of the per-muscle target (a squat also works glutes, etc.; judgement call). */
function groupShare(g: Group, goal: Goal): number {
  if (g === 'knee' || g === 'push' || g === 'pull') return 1
  if (g === 'hip') return 0.8
  if (g === 'core') return 0.4
  return goal === 'build-muscle' ? 0.5 : 0.3
}

const RESIST = (e: Exercise) => e.modality === 'strength' || e.modality === 'calisthenics'
const WORKS = (e: Exercise, m: Modality) => e.modality === m || !!e.also?.includes(m)
const RELAX = new Set(['rest-pose', 'legs-up-the-wall'])
/**
 * Cardio the engine plans as a whole session. Swimming waits for the cardio question (it needs a
 * pool); jump rope stays in the library but isn't generated: it's high-impact, its own range is
 * 5–10 minutes, and we don't know there's a rope.
 */
const CARDIO = EXERCISES.filter((e) => e.modality === 'cardio' && e.log === 'duration' && e.id !== 'cardio-swim' && e.id !== 'cardio-jump-rope')
const MINDBODY: Modality[] = ['yoga', 'pilates', 'mobility']

// ─── Resolved inputs ─────────────────────────────────────────────────────────────────────────

interface Ctx {
  seed: string
  goal: Goal
  exp: Experience
  moving: MovingNow
  minutes: number
  /** the warm-up block's minutes (core/domain/warmup): taken from the session first, never trimmed */
  warm: number
  kit: Set<Equipment>
  kitField?: InputField
  homeOnly: boolean
  outdoors: boolean
  gym: boolean
  enjoy: Modality[] | null
  areas: BodyArea[]
  noImpact: boolean
  impactField: InputField
  gentleStart: boolean
  gentleField: InputField
  readinessFlag: boolean
  age: AgeBand | undefined
  deficit: Deficit
  V: number
  vTrims: Why[]
  liked: Set<string>
  disliked: Set<string>
  exposures: Record<string, number>
  starter: boolean
}

function resolve(inp: PlanInputs, pm: PersonModel | undefined, seed: string, starter: boolean, range?: SessionRange): { ctx: Ctx; days: number[]; defaults: Why[]; dayWhy: Why[] } {
  const defaults: Why[] = []
  const dayWhy: Why[] = []
  const skip = (f: InputField, about: Why['about'] = 'plan', value?: string) => { if (!starter) defaults.push(defaultWhy(f, about, value)) }

  const goal: Goal = starter ? 'feel-better' : inp.goal ?? 'feel-better'
  if (inp.goal === undefined) skip('goal')
  const exp: Experience = starter ? 'beginner' : inp.experience ?? 'beginner'
  if (inp.experience === undefined) skip('experience')
  const moving: MovingNow = starter ? 'not-at-all' : inp.movingNow ?? 'not-at-all'
  if (inp.movingNow === undefined) skip('movingNow')
  const minutes = starter ? 30 : inp.minutes ?? 30
  if (inp.minutes === undefined) skip('minutes')

  // kit: place defaults (plan §4.0.2 F4), plus what's ticked; skipped → bodyweight + known kit
  const place = starter ? undefined : inp.place
  const equipment = starter ? undefined : inp.equipment
  const kit = new Set<Equipment>(['bodyweight'])
  const gym = !!place?.includes('gym')
  if (gym) KIT_PROFILES.gym.forEach((q) => kit.add(q))
  if (!place || place.includes('home') || gym) kit.add('mat')
  for (const q of equipment ?? []) kit.add(q)
  if (place === undefined && equipment === undefined) skip('place')
  const homeOnly = !!place?.includes('home') && !gym
  const outdoors = !!place?.includes('outdoors')
  // the answer that set the kit: the gym brings its own; at home it's what's ticked
  const kitField: InputField | undefined = gym || (equipment === undefined && place !== undefined) ? 'place' : equipment !== undefined ? 'equipment' : undefined

  const enjoy = starter || !inp.enjoy?.length ? null : [...inp.enjoy]
  if (inp.enjoy === undefined) skip('enjoy')
  const areas = starter ? [] : [...(inp.bodyAreas ?? [])]
  if (inp.bodyAreas === undefined) skip('bodyAreas')
  const readinessFlag = inp.readiness !== 'clear'
  if (inp.readiness === undefined) skip('readiness')
  const lately = inp.lately
  if (!lately || (lately.sleep == null && lately.stress == null && lately.room == null)) skip('lately')
  const gentleAuto = poorLately(lately)
  const gentleStart = starter ? false : inp.gentleStart ?? gentleAuto
  const gentleField: InputField = inp.gentleStart !== undefined ? 'gentleStart' : 'lately'
  const age = inp.ageBand
  if (age === undefined) skip('ageBand')
  const deficit: Deficit = inp.deficit ?? 'none'

  // impact (§3.3 step 6): off with a readiness "yes" (or skipped), knees or ankles flagged, areas
  // skipped, from 55, or on a gentle start
  const impactCauses: InputField[] = []
  if (readinessFlag) impactCauses.push('readiness')
  if (inp.bodyAreas === undefined || areas.includes('knees') || areas.includes('ankles')) impactCauses.push('bodyAreas')
  if (age === '55-64' || age === '65+') impactCauses.push('ageBand')
  if (gentleStart) impactCauses.push(gentleField)
  const noImpact = starter || impactCauses.length > 0

  // volume: start at the band's middle, or its low end when anything says to go gently
  const band = VOLUME[exp]
  const vTrims: Why[] = []
  if (!starter) {
    if (goal === 'lose-fat') vTrims.push({ code: 'goal', about: 'dose', field: 'goal', data: { value: goal } })
    if (moving !== 'regularly' && inp.movingNow !== undefined) vTrims.push({ code: 'moving-now', about: 'dose', field: 'movingNow', data: { value: moving } })
    if (gentleStart) vTrims.push({ code: 'baseline', about: 'dose', field: gentleField })
    if (readinessFlag && inp.readiness !== undefined) vTrims.push({ code: 'guardrail', about: 'dose', field: 'readiness', data: { value: 'readiness' } })
    if (deficit === 'big') vTrims.push({ code: 'guardrail', about: 'dose', field: 'deficit', data: { value: 'deficit' } })
  }
  // skipped movingNow or readiness still trim (safe side), traced by their `default` why
  const trimmed = starter || vTrims.length > 0 || inp.movingNow === undefined || inp.readiness === undefined
  let V = trimmed ? band.low : band.mid
  if (goal === 'increase-endurance') V = Math.round(V * 0.8) // part of the budget goes on cardio (plan §3.4)

  // days: the weekdays picked (the count comes from them), else days a week, else 3
  const picked = starter ? undefined : inp.weekdays ? [...new Set(inp.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : undefined
  const pickedOk = picked && picked.length ? picked : undefined
  let requested = starter ? 3 : pickedOk?.length ?? inp.daysPerWeek ?? 3
  if (!starter && !pickedOk && inp.daysPerWeek === undefined) skip('daysPerWeek')
  let chosen = pickedOk ? WEEK_ORDER.filter((d) => pickedOk.includes(d)) : undefined
  if (chosen && chosen.length > 6) {
    // at least one rest day (plan §0.5): Sunday stays free
    chosen = chosen.filter((d) => d !== 0)
    requested = 6
    dayWhy.push({ code: 'guardrail', about: 'days', field: 'weekdays', data: { value: 'rest-day' } })
  }
  requested = Math.max(1, Math.min(6, Math.round(requested)))
  const cap = gentleStart || readinessFlag ? 3 : 6
  const count = Math.min(requested, cap)
  if (count < requested) {
    dayWhy.push(gentleStart
      ? { code: 'baseline', about: 'days', field: gentleField }
      : { code: 'guardrail', about: 'days', field: 'readiness', data: { value: 'days-cap' } })
  }
  const days = chosen ? spread(chosen, count) : DEFAULT_WEEKDAYS[count as 1 | 2 | 3 | 4 | 5 | 6]
  if (!starter) {
    if (chosen) dayWhy.push({ code: 'days', about: 'days', field: 'weekdays', data: { value: days.join(',') } })
    else {
      skip('weekdays', 'days', days.join(','))
      if (inp.daysPerWeek !== undefined) dayWhy.push({ code: 'days', about: 'days', field: 'daysPerWeek', data: { n: count } })
    }
  }

  const ctx: Ctx = {
    seed, goal, exp, moving, minutes, warm: starter ? warmupMinutesFor(undefined, minutes) : warmupMinutesFor(range, minutes), kit, kitField, homeOnly, outdoors, gym,
    enjoy, areas, noImpact, impactField: impactCauses[0] ?? 'readiness', gentleStart, gentleField, readinessFlag, age, deficit,
    V, vTrims, liked: new Set(pm?.liked ?? []), disliked: new Set(pm?.disliked ?? []),
    exposures: Object.fromEntries(Object.entries(pm?.ex ?? {}).map(([k, v]) => [k, v?.exposures ?? 0])), starter,
  }
  return { ctx, days, defaults, dayWhy }
}

/** k of these weekdays, as evenly spread round the week as possible; ties go to the earliest in the week. */
function spread(days: number[], k: number): number[] {
  if (k >= days.length) return [...days]
  const pos = (d: number) => WEEK_ORDER.indexOf(d)
  let best: number[] = [], bestScore = -Infinity
  const pick = (from: number, acc: number[]) => {
    if (acc.length === k) {
      const ps = acc.map(pos)
      const gaps = ps.map((p, i) => (i + 1 < ps.length ? ps[i + 1] - p : ps[0] + 7 - p))
      // the smallest gap first, then how even they are, then earlier days (all judgement calls)
      const score = (k > 1 ? Math.min(...gaps) * 100 - (Math.max(...gaps) - Math.min(...gaps)) * 10 : 0) - ps.reduce((a, b) => a + b, 0) * 0.01
      if (score > bestScore) { bestScore = score; best = [...acc] }
      return
    }
    for (let i = from; i < days.length; i++) pick(i + 1, [...acc, days[i]])
  }
  pick(0, [])
  return best
}

// ─── Selection ───────────────────────────────────────────────────────────────────────────────

type Factor = 'kit' | 'place' | 'experience' | 'guardrail' | 'body-area' | 'disliked' | 'liked' | 'enjoy' | 'variety' | 'age-edge' | 'minutes' | 'goal' | 'baseline' | 'moving-now'
const FACTORS: Factor[] = ['kit', 'place', 'experience', 'guardrail', 'body-area', 'disliked', 'liked', 'enjoy', 'variety', 'age-edge', 'minutes', 'goal', 'baseline', 'moving-now']

interface PickState {
  mode: 'resist' | 'cardio' | 'flow' | 'balance'
  key: string
  role: SlotRole
  /** already in this session */
  session: Set<string>
  /** used elsewhere in the week for this slot (variety) */
  week: Set<string>
  /** main lifts elsewhere in the week (repeated on purpose for strength) */
  mains: Set<string>
  /** the next day is legs or lower: no hard intervals the day before (plan §3.1 rule 11) */
  beforeLegs?: boolean
  /** targets a cool-down should favour */
  targets?: string[]
}

/** Whether the kit (and place, for cardio) allows it. Equipment lists alternatives; household props stand in for a bench at home. */
function usable(e: Exercise, c: Ctx): boolean {
  if (e.modality === 'cardio' && e.log === 'duration') {
    if (e.equipment.length) return e.equipment.some((q) => c.kit.has(q))
    if (e.id === 'cardio-run') return c.outdoors || c.gym
    if (e.id === 'cardio-cycle') return c.outdoors
    if (e.id === 'cardio-incline-walk') return c.outdoors || c.gym
    return true
  }
  const eq = e.equipment
  const ok = !eq.length || eq.some((q) => c.kit.has(q)) || (eq.every((q) => q === 'bench') && !!e.props?.length && !c.gym)
  if (!ok) return false
  // a move done on a bench needs one, or a household stand-in the entry names (judgement call)
  if (e.position === 'bench' && !c.kit.has('bench') && !e.props?.length) return false
  return true
}

function allowed(e: Exercise, c: Ctx, st: PickState, off?: Factor): boolean {
  if (st.session.has(e.id)) return false
  if (off !== 'kit' && !usable(e, c)) return false
  if (off !== 'experience' && (LEVEL[e.difficulty] > LEVEL[c.exp] || (c.exp === 'beginner' && (e.skill ?? 1) > 2))) return false
  if (off !== 'guardrail') {
    if (c.noImpact && e.impact === 'high') return false
    if (st.beforeLegs && e.id === 'cardio-intervals') return false
  }
  if (off !== 'body-area' && e.care?.some((a) => c.areas.includes(a))) return false
  if (off !== 'disliked' && c.disliked.has(e.id)) return false
  if (off !== 'age-edge' && c.age === '65+' && (e.skill ?? 1) >= 3) return false
  return true
}

function score(e: Exercise, c: Ctx, st: PickState, off?: Factor): number {
  const on = (f: Factor) => off !== f
  let s = -((e.timeCost?.setupSec ?? 30) + (e.timeCost?.setSec ?? 40)) / 120
  // a main lift is easier to load and progress on both legs or arms (judgement call)
  if (st.role === 'main' && e.unilateral) s -= 1.5
  if (on('place')) {
    if (c.homeOnly && e.homeFriendly === false && st.mode !== 'cardio') s -= 4
    // a doorway or table stands in for gym kit at home; at the gym, use the gym's
    if (c.gym && !c.homeOnly && e.props?.length && st.mode === 'resist') s -= 3
    if (c.outdoors && st.mode === 'cardio' && ['cardio-walk', 'cardio-run', 'cardio-cycle'].includes(e.id)) s += 1.5
  }
  if (on('experience') && st.mode !== 'cardio') s += e.difficulty === c.exp ? 2 : LEVEL[c.exp] - LEVEL[e.difficulty] === 1 ? 1 : 0
  if (on('liked') && c.liked.has(e.id)) s += 5
  if (on('enjoy') && c.enjoy && st.mode !== 'cardio' && c.enjoy.some((m) => WORKS(e, m))) s += 3
  if (on('variety') && st.week.has(e.id) && !(c.goal === 'increase-strength' && st.role === 'main')) s -= 6
  if (on('goal')) {
    if (st.mode === 'resist') {
      if (c.goal !== 'increase-endurance' && c.goal !== 'feel-better' && e.log === 'weight-reps' && e.increment?.some((x) => x === 'plate-2.5' || x === 'next-weight' || x === 'next-stack')) s += 1
      if (c.goal === 'increase-strength' && st.role === 'main' && st.mains.has(e.id)) s += 8
    }
    if (st.mode === 'cardio') {
      if (c.goal === 'increase-endurance' && ['cardio-run', 'cardio-row', 'cardio-bike', 'cardio-cycle', 'cardio-intervals'].includes(e.id)) s += 2
      if ((c.goal === 'lose-fat' || c.goal === 'feel-better') && ['cardio-walk', 'cardio-incline-walk', 'cardio-cross-trainer'].includes(e.id)) s += 1.5
      // alongside lifting, easy-on-the-legs cardio gets in the way least (judgement call)
      if ((c.goal === 'build-muscle' || c.goal === 'increase-strength') && ['cardio-walk', 'cardio-incline-walk', 'cardio-bike', 'cardio-cross-trainer'].includes(e.id)) s += 1.5
    }
  }
  if (on('minutes') && c.minutes <= 20 && st.mode === 'resist') s -= (e.timeCost?.setupSec ?? 30) / 40 + ((e.skill ?? 1) - 1) * 0.5
  if (on('age-edge') && (c.age === '55-64' || c.age === '65+') && (e.position === 'floor' || e.position === 'hanging')) s -= 3
  if (on('baseline') && (c.gentleStart || c.readinessFlag)) {
    if (e.systemicCost === 'high') s -= 1.5
    if ((e.skill ?? 1) >= 3) s -= 1
    if (e.id === 'cardio-intervals') s -= 6
  }
  if (on('moving-now') && st.mode === 'cardio') {
    if (c.moving === 'not-at-all') s += e.id === 'cardio-easy-walk' ? 3 : e.id === 'cardio-walk' ? 2 : e.id === 'cardio-intervals' ? -6 : -2
    else if (c.moving === 'some') s += e.id === 'cardio-intervals' ? -3 : ['cardio-walk', 'cardio-incline-walk', 'cardio-bike', 'cardio-cross-trainer'].includes(e.id) ? 1 : 0
  }
  if (st.mode === 'flow' && st.targets?.length && e.targets?.some((t) => st.targets!.includes(t))) s += 1
  // the tie-break doesn't depend on the plan id: the same answers always give the same exercises
  return s + unit(`${st.key}|${e.id}`) * 0.01
}

function best(cands: Exercise[], c: Ctx, st: PickState, off?: Factor): Exercise | undefined {
  let top: Exercise | undefined, topS = -Infinity
  for (const e of cands) {
    if (!allowed(e, c, st, off)) continue
    const s = score(e, c, st, off)
    if (s > topS) { top = e; topS = s }
  }
  return top
}

/** The reason for each factor that changed the pick: counterfactual, so a reason is only claimed when it decided something (§3.7 test 2). */
function factorWhy(f: Factor, e: Exercise, alt: Exercise | undefined, c: Ctx, st: PickState): Why | null {
  const base = { about: 'exercise' as const }
  const d = { exId: e.id, ...(alt ? { alt: alt.id } : {}) }
  switch (f) {
    case 'kit': return { ...base, code: 'kit', ...(c.kitField ? { field: c.kitField } : {}), data: d }
    case 'place': return { ...base, code: 'kit', field: 'place', data: { ...d, value: st.mode === 'cardio' ? 'outdoors' : 'home' } }
    case 'experience': return { ...base, code: 'experience', field: 'experience', data: d }
    case 'guardrail': return { ...base, code: 'guardrail', field: c.impactField, data: { ...d, value: 'no-impact' } }
    case 'body-area': return { ...base, code: 'body-area', field: 'bodyAreas', data: { ...d, value: c.areas.filter((a) => alt?.care?.includes(a)).join(',') || c.areas.join(',') } }
    case 'disliked': return { ...base, code: 'disliked', data: d }
    case 'liked': return { ...base, code: 'liked', data: d }
    case 'enjoy': return { ...base, code: 'enjoy', field: 'enjoy', data: { ...d, value: c.enjoy?.find((m) => WORKS(e, m)) ?? c.enjoy?.[0] } }
    case 'variety': return { ...base, code: 'variety', data: d }
    case 'age-edge': return { ...base, code: 'age-edge', field: 'ageBand', data: d }
    case 'minutes': return { ...base, code: 'minutes', field: 'minutes', data: { ...d, value: String(c.minutes) } }
    case 'goal': return { ...base, code: 'goal', field: 'goal', data: { ...d, value: c.goal, ...(c.goal === 'increase-strength' && st.mains.has(e.id) ? { n: 1 } : {}) } }
    case 'baseline': return { ...base, code: 'baseline', field: c.readinessFlag && !c.gentleStart ? 'readiness' : c.gentleField, data: d }
    case 'moving-now': return { ...base, code: 'moving-now', field: 'movingNow', data: { ...d, value: c.moving } }
  }
}

/** Pick for a slot, with the counterfactual reasons when explaining. */
function choose(cands: Exercise[], c: Ctx, st: PickState, explain: boolean): { e?: Exercise; why: Why[]; leftOut?: Why } {
  const e = best(cands, c, st)
  if (!explain) return { e, why: [] }
  if (!e) {
    // nothing gentler for a flagged area: the slot is left out (it only ever swaps or leaves out)
    const w = best(cands, c, st, 'body-area')
    return { why: [], ...(w && c.areas.length ? { leftOut: { code: 'body-area', about: 'exercise', field: 'bodyAreas', data: { value: c.areas.filter((a) => w.care?.includes(a)).join(','), alt: w.pattern } } } : {}) }
  }
  const why: Why[] = []
  for (const f of FACTORS) {
    const alt = best(cands, c, st, f)
    if (alt?.id !== e.id) { const w = factorWhy(f, e, alt, c, st); if (w) why.push(w) }
  }
  if (!why.length) why.push({ code: 'evidence', about: 'exercise', data: { exId: e.id, value: st.mode === 'flow' ? (st.role === 'cooldown' ? 'cooldown' : 'flow') : e.pattern } })
  return { e, why }
}

// ─── Prescription and time ───────────────────────────────────────────────────────────────────

const ownRange = (e: Exercise) => e.log !== 'weight-reps' || /steps/.test(e.defaultRx ?? '') || parseRx(e.defaultRx).unit !== 'reps' || !parseRx(e.defaultRx).reps

function prescribe(e: Exercise, role: SlotRole, sets: number, c: Ctx): Omit<PlannedSlot, 'why' | 'exId' | 'pattern' | 'role'> & { whyReps: Why[] } {
  const sch = scheme(c.goal, c.exp, role === 'balance' || role === 'cooldown' ? 'accessory' : role, !!e.increment?.includes('plate-2.5'))
  let rest = sch.rest
  const whyReps: Why[] = []
  if (e.log === 'hold' || e.pattern === 'core') rest = c.goal === 'increase-endurance' ? 45 : 60
  if (role === 'balance' || role === 'cooldown' || role === 'flow') rest = 15
  const cap = c.minutes <= 10 ? 45 : role === 'accessory' ? 60 : 90
  const shortRest = c.minutes <= 20 && (role === 'main' || role === 'compound' || role === 'accessory') && rest > cap
  if (shortRest) rest = cap
  const side = e.perSide ? ' each side' : ''
  const calibrate = e.log === 'weight-reps' && !ownRange(e) && (c.exposures[e.id] ?? 0) < 2
  if (!ownRange(e) && role !== 'balance' && role !== 'cooldown') {
    const r = sch.reps
    whyReps.push({ code: 'goal', about: 'reps', field: 'goal', data: { exId: e.id, value: c.goal, range: `${r.lo}–${r.hi}` } })
    whyReps.push(shortRest ? { code: 'minutes', about: 'rest', field: 'minutes', data: { exId: e.id, value: String(c.minutes), n: rest } } : { code: 'goal', about: 'rest', field: 'goal', data: { exId: e.id, value: c.goal, n: rest } })
    if (calibrate) whyReps.push({ code: 'calibration', about: 'reps', data: { exId: e.id, n: 2 } })
    return { sets, reps: r, unit: 'reps', rx: `${sets} × ${r.lo}–${r.hi}${side}`, restSec: rest, rir: sch.rir, calibrate, whyReps }
  }
  // bodyweight, holds, carries and flows keep their own range: the ladder steps up at the top of it
  const p = parseRx(e.defaultRx)
  const raw = e.defaultRx ?? ''
  const rx = /^\s*\d+(?:\s*–\s*\d+)?\s*×/.test(raw) ? raw.replace(/^\s*\d+(?:\s*–\s*\d+)?\s*×/, `${sets} ×`) : raw
  const realSets = /×/.test(rx) ? sets : p.sets?.hi ?? 1
  whyReps.push({ code: 'evidence', about: 'reps', data: { exId: e.id, value: role === 'flow' || role === 'cooldown' || role === 'balance' ? 'own-pace' : 'own-range' } })
  if (role !== 'balance' && role !== 'cooldown' && role !== 'flow') {
    whyReps.push(shortRest ? { code: 'minutes', about: 'rest', field: 'minutes', data: { exId: e.id, value: String(c.minutes), n: rest } } : { code: 'goal', about: 'rest', field: 'goal', data: { exId: e.id, value: c.goal, n: rest } })
  }
  const unitOf = /breath|round|steps|each way/.test(raw) ? 'other' : p.unit
  return { sets: realSets, reps: unitOf === 'other' ? null : p.reps, unit: unitOf, rx, restSec: rest, ...(e.log === 'reps' ? { rir: sch.rir } : {}), calibrate: false, whyReps }
}

/** Seconds a slot takes: setup, the sets, rest between them and a short change-over (judgement call). */
function slotSec(e: Exercise, sl: Pick<PlannedSlot, 'sets' | 'restSec' | 'unit' | 'reps'>): number {
  if (e.log === 'duration') return (sl.reps?.hi ?? 20) * 60
  const tc = e.timeCost ?? { setupSec: 30, setSec: 40 }
  return tc.setupSec + sl.sets * tc.setSec + Math.max(0, sl.sets - 1) * sl.restSec + 15
}

interface Draft { e: Exercise; spec: Spec; role: SlotRole; slot: PlannedSlot; was?: number }
const asRoutineSlots = (ds: { slot: PlannedSlot }[]): RoutineSlot[] => ds.map((d) => ({ exId: d.slot.exId, rx: d.slot.rx }))
/**
 * Engine minutes for a session, and the app's own estimate (routines.estMins), whichever is
 * longer. Both start with the warm-up block (every kind of session has one) and about 90 s of
 * lighter sets when there's a weighted lift; the main work fills what's left.
 */
function sessionMins(ds: Draft[], c: Ctx): number {
  const ramp = ds.some((d) => d.e.log === 'weight-reps') ? RAMP_MINUTES : 0
  const own = c.warm + ramp + ds.reduce((a, d) => a + slotSec(d.e, d.slot), 0) / 60
  return Math.max(own, ds.length ? estMins(asRoutineSlots(ds), { warmup: true, mins: c.warm }) : 0)
}

// ─── Sessions ────────────────────────────────────────────────────────────────────────────────

interface Week {
  used: Map<string, Set<string>>
  mains: Set<string>
}
const usedFor = (w: Week, key: string) => { let s = w.used.get(key); if (!s) { s = new Set(); w.used.set(key, s) } return s }

function poolFor(spec: Spec, c: Ctx): Exercise[] {
  if (spec.pattern === 'isolation') return EXERCISES.filter((e) => RESIST(e) && e.pattern === 'isolation' && e.primary === spec.muscle)
  // pilates core work counts for a core slot when pilates is enjoyed
  return EXERCISES.filter((e) => e.pattern === spec.pattern && (RESIST(e) || (spec.pattern === 'core' && e.modality === 'pilates' && !!c.enjoy?.includes('pilates'))))
}

interface Built { drafts: Draft[]; mins: number; why: Why[]; trimmed: boolean; droppedMain: number; left: Why[] }

function setBounds(role: SlotRole, c: Ctx): [number, number] {
  const lo = c.minutes <= 10 ? 1 : 2
  if (role === 'main' || role === 'compound') return [lo, c.goal === 'increase-strength' && role === 'main' ? 5 : 4]
  return [lo, 3]
}

function buildResistance(tpl: string, day: number, c: Ctx, week: Week, targets: Record<Group, number>, explain: boolean, extras: { balance: boolean; cardioFinisher: boolean; beforeLegs: boolean }): Built {
  const T = TEMPLATES[tpl]
  const session = new Set<string>()
  const drafts: Draft[] = []
  const left: Why[] = []
  let first = true
  for (const [i, spec] of T.slots.entries()) {
    const role: SlotRole = spec.pattern === 'isolation' || spec.pattern === 'core' || spec.pattern === 'carry' ? 'accessory' : first ? 'main' : 'compound'
    const key = `${spec.pattern}:${spec.muscle ?? ''}`
    const st: PickState = { mode: 'resist', key: `${tpl}|${day}|${i}|${key}`, role, session, week: usedFor(week, key), mains: week.mains }
    const got = choose(poolFor(spec, c), c, st, explain)
    if (got.leftOut && spec.prio <= 2) left.push(got.leftOut)
    if (!got.e) continue
    const e = got.e
    if (role === 'main') first = false
    session.add(e.id)
    const [lo, hi] = setBounds(role, c)
    const target = targets[groupOf(spec)] ?? lo
    const sets = Math.max(lo, Math.min(hi, Math.round(target)))
    const p = prescribe(e, role, sets, c)
    const why = [...got.why, { code: 'experience', about: 'sets', field: 'experience', data: { exId: e.id, n: p.sets, value: String(c.V) } } as Why, ...p.whyReps]
    const { whyReps: _w, ...rest } = p
    drafts.push({ e, spec, role, slot: { exId: e.id, pattern: e.pattern!, role, ...rest, why } })
  }
  // balance from 55 (WHO 2020 multicomponent activity for older adults)
  if (extras.balance) {
    const pool = EXERCISES.filter((e) => e.pattern === 'mobility' && e.position === 'standing' && !!e.targets?.includes('balance'))
    const st: PickState = { mode: 'balance', key: `bal|${day}`, role: 'balance', session, week: usedFor(week, 'balance'), mains: week.mains }
    const got = choose(pool, c, st, explain)
    if (got.e) {
      session.add(got.e.id)
      const p = prescribe(got.e, 'balance', 1, c)
      const { whyReps, ...rest } = p
      drafts.push({ e: got.e, spec: S('mobility', 2), role: 'balance', slot: { exId: got.e.id, pattern: 'mobility', role: 'balance', ...rest, why: [{ code: 'age-edge', about: 'exercise', field: 'ageBand', data: { exId: got.e.id, value: 'balance' } }, ...whyReps] } })
    }
  }
  // the one-day endurance week: a short cardio piece after the lifting (§3.3 step 5)
  if (extras.cardioFinisher && c.minutes >= 30) {
    const st: PickState = { mode: 'cardio', key: `fin|${day}`, role: 'cardio', session, week: usedFor(week, 'cardio'), mains: week.mains, beforeLegs: extras.beforeLegs }
    const got = choose(CARDIO, c, st, explain)
    if (got.e) {
      session.add(got.e.id)
      drafts.push({ e: got.e, spec: S('cardio', 2), role: 'cardio', slot: { exId: got.e.id, pattern: 'cardio', role: 'cardio', sets: 1, reps: { lo: 10, hi: 10 }, unit: 'min', rx: '10 min', restSec: 0, calibrate: false, why: [...got.why, { code: 'goal', about: 'plan', field: 'goal', data: { value: c.goal } }] } })
    }
  }
  // a short cool-down with 45+ minutes (plan §3.5), yoga if that's enjoyed
  if (c.minutes >= 45) {
    const lowerDay = T.focus !== 'upper' && T.focus !== 'push' && T.focus !== 'pull'
    const want = lowerDay ? ['hips', 'hamstrings'] : ['shoulders', 'chest', 'spine']
    const pool = EXERCISES.filter((e) => e.pattern === 'mobility' && (e.modality === 'yoga' || e.modality === 'mobility') && e.log === 'hold' && !RELAX.has(e.id)
      && !e.targets?.includes('balance') && !!e.targets?.some((t) => want.includes(t)))
    for (let k = 0; k < 2; k++) {
      const st: PickState = { mode: 'flow', key: `cool|${day}|${k}`, role: 'cooldown', session, week: usedFor(week, 'cool'), mains: week.mains, targets: want }
      const got = choose(pool, c, st, explain)
      if (!got.e) continue
      session.add(got.e.id)
      const p = prescribe(got.e, 'cooldown', 1, c)
      const { whyReps, ...rest } = p
      drafts.push({ e: got.e, spec: S('mobility', 5), role: 'cooldown', slot: { exId: got.e.id, pattern: 'mobility', role: 'cooldown', ...rest, why: [...got.why, { code: 'minutes', about: 'exercise', field: 'minutes', data: { exId: got.e.id, value: String(c.minutes), n: 1 } }, ...whyReps] } })
    }
  }
  const fit = fitToMinutes(drafts, c, 'resistance', explain)
  for (const d of fit.drafts) usedFor(week, `${d.spec.pattern}:${d.spec.muscle ?? ''}`).add(d.e.id)
  const main = fit.drafts.find((d) => d.role === 'main')
  if (main) week.mains.add(main.e.id)
  return { ...fit, why: [], left }
}

/**
 * Trim until the session fits the minutes (§3.3 step 2, plan §3.5): the lowest-priority work goes
 * first (cool-down, isolation), then sets come down to two, then extras drop. Priority-1 slots are
 * never dropped while two remain. When time cuts the weekly dose, the trace says so.
 */
function fitToMinutes(input: Draft[], c: Ctx, _kind: SessionKind, explain: boolean): Omit<Built, 'why' | 'left'> {
  let ds = [...input]
  let trimmed = false, droppedMain = 0
  const fits = () => sessionMins(ds, c) <= c.minutes
  const lowerSets = (d: Draft, to: number) => {
    const p = prescribe(d.e, d.role, to, c)
    if (d.was == null) d.was = d.slot.sets
    const { whyReps: _w, ...rest } = p
    d.slot = { ...d.slot, ...rest, sets: p.sets }
  }
  const canCut = (d: Draft, floor: number) => d.slot.sets > floor && /×/.test(d.slot.rx)
  // take one set from the slot with the most, the least important and latest first
  const cutTo = (floor: number, ok: (d: Draft) => boolean = () => true) => {
    while (!fits()) {
      const d = ds.filter((x) => ok(x) && canCut(x, Math.max(floor, setBounds(x.role, c)[0]))).sort((a, b) => b.slot.sets - a.slot.sets || b.spec.prio - a.spec.prio || ds.indexOf(b) - ds.indexOf(a))[0]
      if (!d) return
      lowerSets(d, d.slot.sets - 1); trimmed = true
    }
  }
  const drop = (prio: number) => { for (const d of ds.filter((x) => x.spec.prio === prio).reverse()) { if (fits()) return; ds = ds.filter((x) => x !== d); trimmed = true } }
  // cool-down first, then any fourth or fifth sets, then isolation and extras, then down to two
  // sets, then the second big moves; priority-1 work stays (plan §3.5)
  drop(5)
  cutTo(3)
  drop(4); drop(3)
  cutTo(2)
  drop(2)
  cutTo(1)
  // a 10-minute session can come down to one move: the warm-up is never what gives
  while (!fits() && ds.length > (c.minutes <= 10 ? 1 : 2)) { ds = ds.slice(0, -1); droppedMain++; trimmed = true }
  if (explain) {
    for (const d of ds) {
      if (d.was != null && d.was !== d.slot.sets) {
        d.slot.why = d.slot.why.filter((w) => !(w.about === 'sets'))
        d.slot.why.unshift({ code: 'minutes', about: 'sets', field: 'minutes', data: { exId: d.e.id, n: d.slot.sets, was: d.was, value: String(c.minutes) } })
      }
    }
  }
  return { drafts: ds, mins: Math.round(sessionMins(ds, c)), trimmed, droppedMain }
}

function buildCardio(day: number, c: Ctx, week: Week, explain: boolean, beforeLegs: boolean): Built {
  const st: PickState = { mode: 'cardio', key: `cardio|${day}`, role: 'cardio', session: new Set(), week: usedFor(week, 'cardio'), mains: week.mains, beforeLegs }
  const got = choose(CARDIO, c, st, explain)
  const e = got.e ?? CARDIO.find((x) => x.id === 'cardio-walk')!
  // never more than twice the piece's own upper range (a 20–30 min run tops out at 60), within the
  // minutes the warm-up leaves
  const own = parseRx(e.defaultRx).reps?.hi ?? 30
  const hi = Math.min(c.minutes - c.warm, own * 2), lo = hi <= 10 ? hi : hi - 10
  const rx = lo === hi ? `${hi} min` : `${lo}–${hi} min`
  usedFor(week, 'cardio').add(e.id)
  const slot: PlannedSlot = { exId: e.id, pattern: 'cardio', role: 'cardio', sets: 1, reps: { lo, hi }, unit: 'min', rx, restSec: 0, calibrate: false, why: [...got.why, { code: 'minutes', about: 'plan', field: 'minutes', data: { exId: e.id, value: String(c.minutes) } }] }
  return { drafts: [{ e, spec: S('cardio', 1), role: 'cardio', slot }], mins: hi + c.warm, why: [], trimmed: false, droppedMain: 0, left: [] }
}

function mindModality(c: Ctx): Modality | null {
  return c.enjoy?.find((m) => MINDBODY.includes(m)) ?? null
}

function buildMindBody(day: number, c: Ctx, week: Week, explain: boolean): Built & { modality: Modality } {
  const m = mindModality(c) ?? 'mobility'
  // "not sure yet" → mobility with a little gentle yoga (plan §3.1 rule 5)
  const pool = EXERCISES.filter((e) => e.pattern !== 'cardio' && (WORKS(e, m) || (!mindModality(c) && e.modality === 'yoga' && e.difficulty === 'beginner')))
  const session = new Set<string>()
  let ds: Draft[] = []
  const most = Math.min(10, Math.max(3, Math.ceil(c.minutes / 2.5)))
  for (let k = 0; k < 16 && ds.length < most; k++) {
    const st: PickState = { mode: 'flow', key: `mind|${day}|${k}`, role: 'flow', session, week: usedFor(week, 'mind'), mains: week.mains, targets: c.age === '65+' ? ['balance'] : undefined }
    const got = choose(pool, c, st, explain)
    if (!got.e) break
    session.add(got.e.id)
    if (RELAX.has(got.e.id) && ds.some((d) => RELAX.has(d.e.id))) continue
    const p = prescribe(got.e, 'flow', parseRx(got.e.defaultRx).sets?.hi ?? 1, c)
    const { whyReps, ...rest } = p
    const next: Draft = { e: got.e, spec: S(got.e.pattern ?? 'mobility', 3), role: 'flow', slot: { exId: got.e.id, pattern: got.e.pattern ?? 'mobility', role: 'flow', ...rest, why: [...got.why, ...whyReps] } }
    if (sessionMins([...ds, next], c) > c.minutes) continue
    ds.push(next)
  }
  // standing first, then down to the floor, and any resting pose last
  const rank = (d: Draft) => (RELAX.has(d.e.id) ? 9 : ({ standing: 0, seated: 1, bench: 2, floor: 3, hanging: 4, water: 5 } as Record<string, number>)[d.e.position ?? 'floor'] ?? 3)
  ds = ds.map((d, i) => ({ d, i })).sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i).map((x) => x.d)
  for (const d of ds) usedFor(week, 'mind').add(d.e.id)
  const why: Why[] = mindModality(c) ? [{ code: 'enjoy', about: 'mix', field: 'enjoy', data: { value: m } }] : [{ code: 'evidence', about: 'mix', data: { value: 'recovery' } }]
  return { drafts: ds, mins: Math.round(sessionMins(ds, c)), why, trimmed: false, droppedMain: 0, left: [], modality: m }
}

// ─── Assembly ────────────────────────────────────────────────────────────────────────────────

interface Core {
  sessions: PlannedSession[]
  split: Split
  offers: Offer[]
  mixWhy: Why[]
  splitWhy: Why[]
  timeLimited: boolean
  twiceAWeek: boolean
}

type Kind = 'R' | 'C' | 'M'

function mixFor(c: Ctx, count: number): { R: number; C: number; M: number; why: Why[]; offers: Offer[]; optionalM: boolean } {
  // the Starter week is three full-body days for everyone (onboarding §2.1)
  let [R, C, M] = c.starter ? [count, 0, 0] : MIX[c.goal][count - 1]
  // the goal is claimed for the mix only where it sets one: one day is one session for every goal
  const goalSets = (Object.keys(MIX) as Goal[]).some((g) => MIX[g][count - 1].join() !== MIX[c.goal][count - 1].join())
  const why: Why[] = goalSets || c.starter ? [{ code: 'goal', about: 'mix', field: 'goal', data: { value: c.goal } }] : []
  const offers: Offer[] = []
  const optionalM = c.goal === 'lose-fat' && count === 6
  if (optionalM) why.push({ code: 'guardrail', about: 'mix', field: 'goal', data: { value: 'lose-fat-six' } })
  if (c.enjoy) {
    // enjoyment decides the mix and the goal shapes it; preferences are never overruled (plan §0.1)
    const likesR = c.enjoy.some((m) => m === 'strength' || m === 'calisthenics')
    const likesC = c.enjoy.includes('cardio')
    const likesM = c.enjoy.some((m) => MINDBODY.includes(m))
    const before = `${R}${C}${M}`
    if (!likesR && R > 0 && count > 1) { if (likesM) { M += R; R = 0 } else if (likesC) { C += R; R = 0 } }
    if (!likesC && C > 0) { if (likesR && R < 4) { R += C; C = 0 } else if (likesM) { M += C; C = 0 } }
    if (!likesM && M > 0 && likesC && !optionalM) { C += M; M = 0 }
    if (`${R}${C}${M}` !== before) why.push({ code: 'enjoy', about: 'mix', field: 'enjoy', data: { value: c.enjoy[0] } })
  }
  if (count >= 2 && R < 2) offers.push({ kind: 'add-strength', why: { code: 'evidence', about: 'offer', data: { value: 'who-strength' } } })
  if (c.goal === 'increase-endurance' && count >= 2 && C === 0) offers.push({ kind: 'add-cardio', why: { code: 'evidence', about: 'offer', data: { value: 'add-cardio' } } })
  return { R, C, M, why, offers, optionalM }
}

const nextDay = (d: number) => (d + 1) % 7
const prevDay = (d: number) => (d + 6) % 7

function assemble(c: Ctx, days: number[], explain: boolean): Core {
  const count = days.length
  const mix = mixFor(c, count)
  const rDays = mix.R ? spread(days, mix.R) : []
  const rest = days.filter((d) => !rDays.includes(d))

  // score each candidate split on these days (§3.3 step 4)
  let chosen: { split: Split; t: string[]; built: Built[]; score: number } | null = null
  for (const cand of mix.R ? SPLITS[mix.R] : []) {
    const built = buildAll(cand.t, rDays, c, false, days)
    const sc = scoreSplit(cand.t, rDays, built, mix.R, c)
    if (!chosen || sc > chosen.score) chosen = { ...cand, built, score: sc }
  }
  // the chosen split again, this time with its reasons
  const finalBuilt = chosen ? buildAll(chosen.t, rDays, c, explain, days) : []
  const week: Week = { used: new Map(), mains: new Set() }
  for (const b of finalBuilt) for (const d of b.drafts) usedFor(week, d.role === 'cardio' ? 'cardio' : `${d.spec.pattern}:${d.spec.muscle ?? ''}`).add(d.e.id)

  // cardio and mind-body on the other days: mind-body after legs or before a rest day (plan §3.1 rule 11)
  const focusOn: Record<number, Focus> = {}
  rDays.forEach((d, i) => { focusOn[d] = TEMPLATES[chosen!.t[i]].focus })
  const kinds: Record<number, Kind> = Object.fromEntries(rDays.map((d) => [d, 'R' as Kind]))
  let C = mix.C, M = mix.M
  for (const d of rest) {
    const afterLegs = ['legs', 'lower', 'full-body'].includes(focusOn[prevDay(d)] ?? '')
    const beforeRest = !days.includes(nextDay(d))
    if (M > 0 && (afterLegs || beforeRest || C === 0)) { kinds[d] = 'M'; M-- }
    else if (C > 0) { kinds[d] = 'C'; C-- }
    else { kinds[d] = 'M'; M-- }
  }

  const sessions: PlannedSession[] = []
  const lastM = [...rest].reverse().find((d) => kinds[d] === 'M')
  const names = nameSessions(chosen?.t ?? [])
  for (const d of WEEK_ORDER.filter((x) => days.includes(x))) {
    const id = seededUuid(c.seed, 'r' + d)
    if (kinds[d] === 'R') {
      const i = rDays.indexOf(d)
      const b = finalBuilt[i]
      sessions.push(sessionOf(d, id, 'resistance', TEMPLATES[chosen!.t[i]].focus, names[i], b, c, [
        { code: 'days', about: 'split', field: 'daysPerWeek', data: { value: chosen!.split, n: mix.R } },
        ...b.left,
      ]))
    } else if (kinds[d] === 'C') {
      const legsNext = ['legs', 'lower'].includes(focusOn[nextDay(d)] ?? '')
      const b = buildCardio(d, c, week, explain, legsNext)
      sessions.push(sessionOf(d, id, 'cardio', 'cardio', 'Cardio', b, c, mix.why.filter((w) => w.code === 'goal' || w.code === 'enjoy')))
    } else {
      const b = buildMindBody(d, c, week, explain)
      const optional = mix.optionalM && d === lastM
      const name = b.modality === 'yoga' ? 'Yoga flow' : b.modality === 'pilates' ? 'Pilates' : 'Mobility'
      const s = sessionOf(d, id, 'mind-body', b.modality === 'yoga' ? 'yoga' : b.modality === 'pilates' ? 'pilates' : 'mobility', optional ? `${name} (optional)` : name, b, c, [...b.why, ...(optional ? [{ code: 'guardrail', about: 'mix', field: 'goal', data: { value: 'lose-fat-six' } } as Why] : [])])
      if (optional) s.optional = true
      sessions.push(s)
    }
  }
  // time-limited: the minutes keep a main area's weekly sets under about 80% of its target (judgement call)
  const got: Record<string, number> = {}
  for (const b of finalBuilt) for (const d of b.drafts) { const g = groupOf(d.spec); got[g] = (got[g] ?? 0) + d.slot.sets }
  const timeLimited = finalBuilt.some((b) => b.trimmed) && ['knee', 'hip', 'push', 'pull'].some((g) => (got[g] ?? 0) < 0.8 * c.V * groupShare(g, c.goal))
  const freq = groupFreq(finalBuilt)
  const twiceAWeek = mix.R >= 2 && ['lower', 'push', 'pull'].every((g) => (freq[g] ?? 0) >= 2)
  const splitWhy: Why[] = chosen ? [{ code: 'days', about: 'split', data: { value: chosen.split, n: mix.R } }, ...(twiceAWeek ? [{ code: 'evidence', about: 'split', data: { value: 'twice-a-week' } } as Why] : [])] : []
  if (count === 1) mix.offers.push({ kind: 'second-day', why: { code: 'days', about: 'offer', field: 'daysPerWeek', data: { n: 1 } } })
  return { sessions, split: chosen?.split ?? 'none', offers: mix.offers, mixWhy: mix.why, splitWhy, timeLimited, twiceAWeek }
}

function nameSessions(t: string[]): string[] {
  const count: Record<string, number> = {}
  const total: Record<string, number> = {}
  const label = (x: string) => TEMPLATES[x].focus
  t.forEach((x) => { total[label(x)] = (total[label(x)] ?? 0) + 1 })
  const WORD: Record<string, string> = { 'full-body': 'Full body', upper: 'Upper', lower: 'Lower', legs: 'Legs', push: 'Push', pull: 'Pull' }
  return t.map((x) => {
    const f = label(x)
    const i = count[f] = (count[f] ?? 0) + 1
    return total[f] > 1 ? `${WORD[f]} ${'ABCDEF'[i - 1]}` : WORD[f]
  })
}

function buildAll(t: string[], rDays: number[], c: Ctx, explain: boolean, days: number[]): Built[] {
  const week: Week = { used: new Map(), mains: new Set() }
  // weekly group targets, shared over the slots that train each group (§3.3 step 3)
  const occ: Record<Group, number> = {}
  for (const x of t) for (const s of TEMPLATES[x].slots) occ[groupOf(s)] = (occ[groupOf(s)] ?? 0) + 1
  const perSlot: Record<Group, number> = {}
  for (const g of Object.keys(occ)) perSlot[g] = (c.V * groupShare(g, c.goal)) / occ[g]
  const balanceDays = c.age === '65+' ? rDays : c.age === '55-64' ? rDays.slice(0, 1) : []
  return t.map((x, i) => {
    const d = rDays[i]
    const nextFocus = rDays.includes(nextDay(d)) ? TEMPLATES[t[rDays.indexOf(nextDay(d))]].focus : undefined
    return buildResistance(x, d, c, week, perSlot, explain, {
      balance: balanceDays.includes(d),
      cardioFinisher: c.goal === 'increase-endurance' && days.length === 1,
      beforeLegs: nextFocus === 'legs' || nextFocus === 'lower',
    })
  })
}

function groupFreq(built: Built[]): Record<string, number> {
  const f: Record<string, number> = {}
  for (const b of built) {
    const gs = new Set(b.drafts.map((d) => groupOf(d.spec)).map((g) => (g === 'knee' || g === 'hip' ? 'lower' : g)))
    for (const g of gs) f[g] = (f[g] ?? 0) + 1
  }
  return f
}

/** Primary muscles a session works hard (core left out, as planWeekNotes does). */
const primaries = (b: Built) => new Set(b.drafts.filter((d) => d.role !== 'cooldown' && d.role !== 'balance' && d.role !== 'cardio').map((d) => d.e.primary).filter((m): m is MuscleGroup => !!m && m !== 'core'))

/**
 * Split score (judgement calls): each main area (lower, push, pull) at least twice a week
 * (Schoenfeld 2016), then more practice; heavily against the same muscles on back-to-back days
 * (the Legs → Push → Pull rule, and planWeekNotes' two-shared-muscles line); against thin or
 * dropped main work and over ~8 hard sets for a muscle in one session.
 */
function scoreSplit(t: string[], rDays: number[], built: Built[], R: number, c: Ctx): number {
  const f = groupFreq(built)
  let s = 0
  for (const g of ['lower', 'push', 'pull']) s += (R >= 2 ? 10 * Math.min(f[g] ?? 0, 2) : 0) + Math.min(f[g] ?? 0, 4)
  for (let i = 0; i < rDays.length; i++) {
    const j = rDays.indexOf(nextDay(rDays[i]))
    if (j < 0 || j === i) continue
    const a = primaries(built[i]), b = primaries(built[j])
    const shared = [...a].filter((m) => b.has(m)).length
    if (shared >= 2) s -= 40
  }
  for (const b of built) {
    s -= 8 * b.droppedMain
    for (const d of b.drafts) if (d.slot.sets < 2 && c.minutes > 10 && d.role !== 'cooldown' && d.role !== 'balance') s -= 3
    const per: Record<string, number> = {}
    for (const d of b.drafts) if (d.e.primary) per[d.e.primary] = (per[d.e.primary] ?? 0) + d.slot.sets
    for (const v of Object.values(per)) if (v > 8) s -= 5
  }
  return s - t.length * 0.001
}

function sessionOf(d: number, id: string, kind: SessionKind, focus: Focus, name: string, b: Built, c: Ctx, why: Why[]): PlannedSession {
  const slots = b.drafts.map((x) => x.slot)
  const rs: RoutineSlot[] = slots.map((s) => ({ exId: s.exId, rx: s.rx }))
  return { weekday: d, routineId: id, kind, focus, name, effort: deriveEffort(rs), mins: b.mins, slots, why: why.length ? why : [{ code: 'goal', about: 'mix', field: 'goal', data: { value: c.goal } }] }
}

// ─── The entry point ─────────────────────────────────────────────────────────────────────────

const PLAN_WEEKS = 8

function routingOf(inp: PlanInputs, c: Ctx): Routing {
  const why: Why[] = []
  const wellbeingRouted = inp.wellbeing === 'yes' || inp.wellbeing === 'sometimes'
  // under 18 (a backstop: the stop comes first) or age unknown: no AI, sets steady, words only
  const teen = inp.ageBand === 'under-18' || inp.ageBand === undefined
  const never = !!inp.gentle || wellbeingRouted || teen
  if (inp.gentle) why.push({ code: 'guardrail', about: 'safety', field: 'gentle', data: { value: 'no-volume-increase' } })
  if (wellbeingRouted) why.push({ code: 'guardrail', about: 'safety', field: 'wellbeing', data: { value: 'no-volume-increase' } })
  if (teen) why.push({ code: 'guardrail', about: 'safety', field: 'ageBand', data: { value: inp.ageBand === undefined ? 'no-ai-age' : 'no-ai' } })
  if (!never) why.push({ code: 'guardrail', about: 'safety', data: { value: 'hold-volume' } })
  if (inp.gentle || wellbeingRouted || teen) why.push({ code: 'guardrail', about: 'safety', field: inp.gentle ? 'gentle' : wellbeingRouted ? 'wellbeing' : 'ageBand', data: { value: 'words-only' } })
  if (c.deficit === 'big') why.push({ code: 'guardrail', about: 'safety', field: 'deficit', data: { value: 'deficit' } })
  if (c.deficit !== 'none') why.push({ code: 'guardrail', about: 'safety', field: 'deficit', data: { value: 'no-stall-checks' } })
  if (c.readinessFlag) why.push({ code: 'guardrail', about: 'safety', field: 'readiness', data: { value: 'readiness' } })
  if (c.noImpact) why.push({ code: 'guardrail', about: 'safety', field: c.impactField, data: { value: 'no-impact' } })
  if (c.gentleStart) why.push({ code: 'baseline', about: 'safety', field: c.gentleField })
  // pre-selected, not imposed: the person can switch it off (onboarding §2 screen 5)
  if (c.gentleStart && inp.gentleStart === undefined) why.push({ code: 'baseline', about: 'safety', field: 'gentleStart', data: { value: 'pre-selected' } })
  why.push({ code: 'guardrail', about: 'safety', data: { value: 'rest-day' } })
  return {
    gentleStart: c.gentleStart, lowImpact: c.noImpact, volumeIncreases: never ? 'never' : 'after-week-4', holdProgression: c.deficit === 'big',
    gentleMode: !!inp.gentle || wellbeingRouted, stallChecks: c.deficit === 'none', trends: inp.gentle || wellbeingRouted || teen ? 'words' : 'numbers', ai: !teen, signpostHealth: c.readinessFlag, why,
  }
}

/** What the week is built around: where they train, the kit, the minutes (each filters or sizes every session). */
function fitWhy(inp: PlanInputs, sessions: PlannedSession[]): Why[] {
  const out: Why[] = []
  if (inp.place !== undefined) out.push({ code: 'kit', about: 'plan', field: 'place', data: { value: inp.place.join(',') } })
  // at the gym the gym's kit decides; what's ticked counts when a chosen move needs it
  const ticked = inp.equipment ?? []
  const usesTicked = sessions.some((s) => s.slots.some((x) => { const e = EXERCISES.find((y) => y.id === x.exId); return !!e && e.equipment.some((q) => ticked.includes(q)) && !e.equipment.includes('bodyweight') }))
  if (inp.equipment !== undefined && !inp.place?.includes('gym') && usesTicked) out.push({ code: 'kit', about: 'plan', field: 'equipment' })
  if (inp.minutes !== undefined) out.push({ code: 'minutes', about: 'plan', field: 'minutes', data: { value: String(inp.minutes) } })
  return out
}

/** A comparable signature of what a person would actually do (tests, and the dose counterfactual). */
export function planSignature(p: Pick<GeneratedPlan, 'sessions' | 'easeInWeeks'>): string {
  return stableKey({ e: p.easeInWeeks, s: p.sessions.map((s) => [s.weekday, s.focus, s.slots.map((x) => [x.exId, x.sets, x.rx, x.restSec])]) })
}

/**
 * Build a day-1 plan from the onboarding answers. `personModel` (liked, disliked, exposures) comes
 * from the person's own data; `seed` is the plan id (a UUID), so variety is reproducible. Same
 * inputs, model and seed: the same plan. Nothing here is saved; the UI stores `trainingPlan`
 * and `routines` when the person confirms.
 */
/**
 * `opts.sessionRange`: the length as picked (a range). It only sets the warm-up's minutes, the
 * same ones onboarding shows (45–60 and 60+ both run as 60 engine minutes, with 8 and 10 minutes
 * of warm-up); without it the warm-up follows `minutes`.
 */
export function buildPlan(inputs: PlanInputs, personModel?: PersonModel, seed?: string, opts: { sessionRange?: SessionRange } = {}): BuildResult {
  const starter = !hasTrainingAnswers(inputs)
  const sd = seed ?? 'plan:' + stableKey({ i: inputs, p: personModel ?? null })
  const r = resolve(inputs, personModel, sd, starter, opts.sessionRange)
  const c = r.ctx
  const core = assemble(c, r.days, true)

  // the dose reasons are claimed only when the lower start changed what the person does
  let doseWhy: Why[] = []
  if (!starter) {
    doseWhy.push({ code: 'experience', about: 'dose', field: 'experience', data: { value: String(c.V), alt: c.exp } })
    if (c.vTrims.length) {
      const untrimmed = VOLUME[c.exp].mid * (c.goal === 'increase-endurance' ? 0.8 : 1)
      const other = assemble({ ...c, V: Math.round(untrimmed) }, r.days, false)
      if (planSignature({ sessions: other.sessions, easeInWeeks: 0 }) !== planSignature({ sessions: core.sessions, easeInWeeks: 0 })) doseWhy.push(...c.vTrims)
    }
    if (core.timeLimited) doseWhy.push({ code: 'time-limited', about: 'dose', field: 'minutes' })
  }

  // ease in: two weeks when not moving much yet, on a gentle start or after a readiness "yes"
  const easeWhy: Why[] = []
  if (!starter) {
    if (c.moving === 'not-at-all' && inputs.movingNow !== undefined) easeWhy.push({ code: 'moving-now', about: 'ease-in', field: 'movingNow', data: { value: c.moving } })
    if (c.gentleStart) easeWhy.push({ code: 'baseline', about: 'ease-in', field: c.gentleField })
    if (c.readinessFlag && inputs.readiness !== undefined) easeWhy.push({ code: 'guardrail', about: 'ease-in', field: 'readiness', data: { value: 'readiness' } })
    if (!easeWhy.length && c.moving === 'not-at-all') easeWhy.push(defaultWhy('movingNow', 'ease-in'))
    if (c.readinessFlag && inputs.readiness === undefined) easeWhy.push(defaultWhy('readiness', 'ease-in'))
    // otherwise week 1 is easier for everyone: fixed, because there's no data yet (§3.5 E)
    if (!easeWhy.length) easeWhy.push({ code: 'evidence', about: 'ease-in', data: { value: 'ease-in' } })
  }
  const easeIn = starter ? 0 : c.moving === 'not-at-all' || c.gentleStart || c.readinessFlag ? 2 : 1

  // the split reason names the field that set the count
  const countField: InputField | undefined = inputs.weekdays?.length ? 'weekdays' : inputs.daysPerWeek !== undefined ? 'daysPerWeek' : undefined
  const fix = (w: Why): Why => (w.code === 'days' && w.about === 'split' ? { ...w, ...(countField ? { field: countField } : { field: undefined }) } : w)
  const clean = (w: Why): Why => { const o = { ...w }; if (o.field === undefined) delete o.field; return o }
  for (const s of core.sessions) s.why = s.why.map(fix).map(clean)

  const routing = routingOf(inputs, c)
  const why: Why[] = starter
    ? [{ code: 'starter', about: 'plan' }]
    : [...r.defaults, ...r.dayWhy, ...core.splitWhy.map(fix), ...core.mixWhy, ...doseWhy, ...easeWhy, ...fitWhy(inputs, core.sessions)].map(clean)

  if (starter) {
    // the Starter week claims nothing: every reason is the starter label (and "find your weight")
    for (const s of core.sessions) {
      s.why = [{ code: 'starter', about: 'plan' }]
      for (const sl of s.slots) sl.why = [{ code: 'starter', about: 'exercise', data: { exId: sl.exId } }, ...sl.why.filter((w) => w.code === 'calibration')]
    }
  }

  // copy data the reasons need: a skipped "lately" says so; gentle mode has no weekly-set numbers
  const skippedLately = !inputs.lately || (inputs.lately.sleep == null && inputs.lately.stress == null && inputs.lately.room == null)
  const amount = c.V <= VOLUME[c.exp].low ? 'light' : 'moderate'
  const every = [...why, ...routing.why, ...core.sessions.flatMap((s) => [...s.why, ...s.slots.flatMap((x) => x.why)])]
  for (const w of every) {
    if (w.code === 'baseline' && w.field === 'lately' && skippedLately && w.about !== 'exercise') w.data = { ...w.data, value: 'skipped' }
    if (routing.gentleMode && w.code === 'experience' && (w.about === 'dose' || w.about === 'sets')) w.data = { ...w.data, value: amount }
  }

  const planId = seededUuid(sd, 'plan')
  const routines: Routine[] = core.sessions.map((s) => {
    const slots: RoutineSlot[] = s.slots.map((x) => ({ exId: x.exId, rx: x.rx, restSec: x.restSec, why: x.why }))
    return { id: s.routineId, name: s.name, modality: headlineModality(slots), effort: s.effort, blocks: [{ id: 'main', kind: 'sets', slots }], estMins: s.mins, source: 'recommended', why: s.why }
  })
  const week: PlanWeek = {}
  for (let d = 0; d < 7; d++) week[d] = core.sessions.filter((s) => s.weekday === d).map((s) => s.routineId)
  const phases: PlanPhase[] = starter
    ? [{ id: 'starter', name: 'Starter week', weeks: 4, week }]
    : [{ id: 'ease', name: 'Ease in', weeks: easeIn, maintain: true }, { id: 'build', name: 'Build', weeks: PLAN_WEEKS - easeIn, week }]
  const trainingPlan: TrainingPlan = { id: planId, name: starter ? 'Starter week' : 'Your plan', source: 'recommended', state: 'active', phases, why }

  const weeklySets: Partial<Record<MuscleGroup, number>> = {}
  let totalSets = 0
  for (const s of core.sessions) for (const sl of s.slots) {
    if (sl.role === 'cooldown' || sl.role === 'balance' || sl.role === 'cardio' || sl.role === 'flow') continue
    const e = EXERCISES.find((x) => x.id === sl.exId)
    if (!e?.primary) continue
    totalSets += sl.sets
    weeklySets[e.primary] = (weeklySets[e.primary] ?? 0) + sl.sets
    for (const m of e.secondary ?? []) weeklySets[m] = (weeklySets[m] ?? 0) + sl.sets * 0.5
  }

  const plan: GeneratedPlan = {
    trainingPlan, routines, sessions: core.sessions, split: core.split, weekdays: core.sessions.map((s) => s.weekday),
    weeklySets, totalSets, volumeTarget: c.V, easeInWeeks: easeIn, routing,
    offers: starter ? [] : core.offers, label: starter ? 'starter-week' : 'built-from-answers',
  }
  return { plan, why, starter }
}

/** Every reason in a result: plan, routing, offers, sessions and slots (tests, and "why this plan"). */
export function allWhys(r: BuildResult): Why[] {
  return [...r.why, ...r.plan.routing.why, ...r.plan.offers.map((o) => o.why), ...r.plan.sessions.flatMap((s) => [...s.why, ...s.slots.flatMap((x) => x.why)])]
}
