import type { AppState, Experience, Goal, MuscleGroup, Profile, PlanPhase, PlanWeek, Routine, Schedule, TrainingPlan, WorkoutType } from '@/core/types'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { DEFAULT_SCHEDULE, LIFTS } from '@/core/data/workouts'
import { DAY_NAME, parseYmd, shiftDay, todayStr } from './date'
import { isBuiltinKey, keyTitle, routineFor, slotsOf, type WorkoutKey } from './routines'
import { mainMuscles, plannedOn, weekWarnings, WEEK_ORDER } from './week'
import { sessionsOf } from './sessions'
import { PROTEIN_PER_KG } from './nutrition'

/**
 * Weekly plans (plan P5, Benn's model, §6 "P5 as built"): a set number of weeks in phases. A
 * build phase has its own week (weekday → workouts); a maintain phase reuses the previous
 * phase's week and its workouts open on the lighter version. Where you are is worked out from the
 * start date by the calendar, never stored: no rotation, no "next workout" pointer.
 */

/** A phase is 1 to 26 weeks; a plan up to a year (judgement calls). */
export const MAX_PHASE_WEEKS = 26
export const MAX_PLAN_WEEKS = 52

const DAY_MS = 86400000
const WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four' }
const daysBetween = (a: string, b: string) => Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / DAY_MS)

const byStart = (a: TrainingPlan, b: TrainingPlan) => (b.startedAt! > a.startedAt! ? 1 : b.startedAt! < a.startedAt! ? -1 : (b._u || '') > (a._u || '') ? 1 : -1)
const activeList = (s: Pick<AppState, 'trainingPlans'>) => (s.trainingPlans || []).filter((p) => p.state === 'active' && p.startedAt && p.phases.length)

/**
 * The plan in charge on a date (today by default): the active plan with the latest start on or
 * before it (two devices each starting one: the later start wins). A plan chosen to start later
 * leaves the current one running until then. With none started yet, the next one to start (so
 * the Plan screen can say when), which plans nothing before its start.
 */
export function activePlan(s: Pick<AppState, 'trainingPlans'>, date: string = todayStr()): TrainingPlan | undefined {
  const act = activeList(s)
  return act.filter((p) => p.startedAt! <= date).sort(byStart)[0] ?? act.sort((a, b) => -byStart(a, b))[0]
}

/** A plan waiting to start after the one in charge today (chosen at the end of a plan). */
export function upcomingPlan(s: Pick<AppState, 'trainingPlans'>, date: string = todayStr()): TrainingPlan | undefined {
  const cur = activePlan(s, date)
  return activeList(s).filter((p) => p !== cur && p.startedAt! > date).sort((a, b) => -byStart(a, b))[0]
}

/** Active plans a later-started one has replaced by this date: they're finished (completed). */
export function supersededPlans(s: Pick<AppState, 'trainingPlans'>, date: string = todayStr()): TrainingPlan[] {
  const cur = activePlan(s, date)
  if (!cur || cur.startedAt! > date) return []
  return activeList(s).filter((p) => p !== cur && p.startedAt! <= date)
}

/** A phase with a week of its own to train (not a lighter week, not maintenance after the plan). */
const isBuild = (ph: PlanPhase) => !ph.maintain && !ph.after

/** The plan's weeks, maintenance after it left out (that runs for as long as the person likes). */
export const totalWeeks = (p: { phases: Pick<PlanPhase, 'weeks' | 'after'>[] }) => p.phases.reduce((a, x) => a + (x.after ? 0 : Math.max(0, x.weeks)), 0)

/** Maintenance after the plan, when the person has chosen it. */
export const afterPhase = (p: Pick<TrainingPlan, 'phases'>) => p.phases.find((x) => x.after)

/**
 * The week a phase trains: its own; a lighter week, the nearest build week before it (else
 * after it); maintenance, its own week or else the last build week.
 */
export function phaseWeek(p: Pick<TrainingPlan, 'phases'>, i: number): PlanWeek {
  const ph = p.phases[i]
  const hasAny = (w?: PlanWeek) => !!w && Object.values(w).some((k) => k && k.length)
  if (ph && isBuild(ph) && ph.week) return ph.week
  if (ph && ph.after && hasAny(ph.week)) return ph.week!
  for (let j = i - 1; j >= 0; j--) if (isBuild(p.phases[j]) && p.phases[j].week) return p.phases[j].week!
  for (let j = i + 1; j < p.phases.length; j++) if (isBuild(p.phases[j]) && p.phases[j].week) return p.phases[j].week!
  return {}
}

export interface PlanPosition {
  /** 1-based week of the plan (past the end, it keeps counting) */
  week: number
  total: number
  phaseIndex: number
  phase: PlanPhase
  /** 1-based week within the phase */
  weekInPhase: number
  maintain: boolean
  /** past the last week: the last week carries on until the person chooses what's next */
  ended: boolean
  /** past the last week in maintenance, which the person chose: its 1-based week */
  maintenanceWeek: number | null
  planWeek: PlanWeek
}

/** Where a plan is on a date; null before it starts. */
export function positionOn(p: TrainingPlan, date: string): PlanPosition | null {
  if (!p.startedAt || !p.phases.length) return null
  const d = daysBetween(p.startedAt, date)
  if (d < 0) return null
  const week = Math.floor(d / 7) + 1
  const total = totalWeeks(p)
  const after = p.phases.findIndex((x) => x.after)
  // past the end with maintenance chosen: its weeks count on, for as long as it runs
  // (counted from the day it was chosen, so a few weeks deciding don't count as maintenance)
  const since = after >= 0 ? p.phases[after].since : undefined
  if (week > total && after >= 0 && (!since || date >= since)) {
    const mw = since ? Math.floor(daysBetween(since, date) / 7) + 1 : week - total
    return { week, total, phaseIndex: after, phase: p.phases[after], weekInPhase: mw, maintain: true, ended: false, maintenanceWeek: mw, planWeek: phaseWeek(p, after) }
  }
  const idx = p.phases.map((x, k) => (x.after ? -1 : k)).filter((k) => k >= 0)
  let left = Math.min(week, Math.max(total, 1))
  let n = 0
  while (n < idx.length - 1 && left > p.phases[idx[n]].weeks) { left -= p.phases[idx[n]].weeks; n++ }
  const i = idx[n] ?? 0
  const phase = p.phases[i]
  return { week, total, phaseIndex: i, phase, weekInPhase: Math.min(left, phase.weeks), maintain: !!phase.maintain, ended: week > total, maintenanceWeek: null, planWeek: phaseWeek(p, i) }
}

/** The first date after the plan's last week (when "what's next" is asked). */
export function endDate(p: TrainingPlan): string | null {
  return p.startedAt ? shiftDay(p.startedAt, totalWeeks(p) * 7) : null
}

/**
 * The workouts planned for a date: from the active plan (several a day allowed, own workouts
 * included) or, with none, the weekly schedule's one workout. Keys this device doesn't know (an
 * own workout removed, or from a newer app) are left out rather than breaking the day.
 */
export function plannedKeys(s: Pick<AppState, 'trainingPlans' | 'schedule' | 'routines'>, date: string): WorkoutKey[] {
  const p = activePlan(s, date)
  const pos = p ? positionOn(p, date) : null
  const idx = parseYmd(date).getDay()
  if (pos) {
    return (pos.planWeek[idx] || []).filter((k) => { if (isBuiltinKey(k)) return true; const r = routineFor(k, s.routines); return !!r && !r.archived })
  }
  const v = plannedOn(s.schedule, idx)
  return v === 'Rest' ? [] : [v]
}

/**
 * A lighter week of the active plan: planned workouts open on the shorter version. Past the end
 * the last phase carries on as it was, so a plan ending on lighter weeks stays lighter until the
 * person chooses what's next (never a silent step up).
 */
export function maintainOn(s: Pick<AppState, 'trainingPlans'>, date: string): boolean {
  const p = activePlan(s, date)
  const pos = p ? positionOn(p, date) : null
  return !!pos?.maintain
}

/** Where each of a plan's weeks sits, for the timeline strip: done, this week, or to come. */
export interface WeekCell { kind: 'full' | 'easier' | 'after'; state: 'done' | 'now' | 'next' }

/** The plan's weeks as cells (easier blocks and lighter weeks striped), then three for maintenance after. */
export function timeline(p: Pick<TrainingPlan, 'phases' | 'startedAt'>, date?: string): WeekCell[] {
  const cur = date && p.startedAt ? Math.floor(daysBetween(p.startedAt, date) / 7) + 1 : 0
  const out: WeekCell[] = []
  for (const ph of p.phases) {
    if (ph.after) continue
    for (let k = 0; k < Math.max(0, ph.weeks); k++) {
      const n = out.length + 1
      out.push({ kind: ph.maintain || ph.easier ? 'easier' : 'full', state: n < cur ? 'done' : n === cur ? 'now' : 'next' })
    }
  }
  const total = out.length
  for (let k = 0; k < 3; k++) out.push({ kind: 'after', state: cur > total && k === 0 && p.phases.some((x) => x.after) ? 'now' : 'next' })
  return out
}

/** Days in a week with a harder workout (a lift, or an own workout saved as hard). */
export function liftingDays(week: PlanWeek | undefined, routines: Routine[] | undefined): number {
  return WEEK_ORDER.filter((d) => (week?.[d] || []).some((k) => isHardKey(k, routines))).length
}

/** Days in a week with anything planned. */
export const trainingDays = (week: PlanWeek | undefined) => WEEK_ORDER.filter((d) => (week?.[d] || []).length > 0).length

export interface PhaseRow { index: number; name: string; from: number; to: number; kind: 'full' | 'easier' | 'lighter'; state: 'done' | 'now' | '' }

/** A plan's phases as rows ("Build · Weeks 3–6"), each marked done or now on a date. */
export function phaseRows(p: TrainingPlan, date: string): PhaseRow[] {
  const pos = positionOn(p, date)
  let from = 1
  const out: PhaseRow[] = []
  p.phases.forEach((ph, index) => {
    if (ph.after) return
    const to = from + Math.max(1, ph.weeks) - 1
    const state = !pos ? '' : pos.maintenanceWeek != null || pos.week > to ? 'done' : pos.week >= from ? 'now' : ''
    out.push({ index, name: ph.name, from, to, kind: ph.maintain ? 'lighter' : ph.easier ? 'easier' : 'full', state })
    from = to + 1
  })
  return out
}

/** "Weeks 3–6" or "Week 7". */
export const weeksSpan = (r: Pick<PhaseRow, 'from' | 'to'>) => (r.from === r.to ? `Week ${r.from}` : `Weeks ${r.from}–${r.to}`)

/**
 * The weekly schedule older installs and one-workout readers see while a plan is active
 * (written, never read): the first built-in lift that day, else 'Cardio' for any other workout,
 * else 'Rest'.
 */
export function scheduleMirror(week: PlanWeek, routines: Routine[] | undefined): Schedule {
  const out: Schedule = {}
  for (let d = 0; d < 7; d++) {
    const keys = (week[d] || []).filter((k) => isBuiltinKey(k) || !!routineFor(k, routines))
    const lift = keys.find((k) => LIFTS.includes(k as WorkoutType)) as WorkoutType | undefined
    out[d] = lift ?? (keys.length ? 'Cardio' : 'Rest')
  }
  return out
}

/** Hard for the one-hard-session-a-day note: built-in lifts, and own workouts saved as hard. */
export function isHardKey(k: WorkoutKey, routines: Routine[] | undefined): boolean {
  if (isBuiltinKey(k)) return LIFTS.includes(k as WorkoutType)
  return routineFor(k, routines)?.effort === 'hard'
}

/** Main muscles a hard workout trains (core left out, as in mainMuscles): a built-in lift's, or an own workout's moves. */
function keyMuscles(k: WorkoutKey, routines: Routine[] | undefined): Set<MuscleGroup> {
  if (isBuiltinKey(k)) return mainMuscles(k as WorkoutType)
  const out = new Set<MuscleGroup>()
  const r = routineFor(k, routines)
  for (const sl of r ? slotsOf(r) : []) { const m = EXERCISE_BY_ID[sl.exId]?.primary; if (m && m !== 'core') out.add(m) }
  return out
}

/**
 * Gentle notes about a plan's week (plan §3.3; they never block): more than one hard workout on
 * a day, the same workout or two sharing two or more main muscles on back-to-back days (every hard
 * workout of each day, own ones too, Sunday wrapping to Monday), and no rest day (the existing
 * week rule). All thresholds are judgement calls, unvalidated.
 */
export function planWeekNotes(week: PlanWeek, routines: Routine[] | undefined): string[] {
  const out: string[] = []
  const hardOn = (d: number) => (week[d] || []).filter((k) => isHardKey(k, routines))
  for (const d of WEEK_ORDER) {
    const hard = hardOn(d)
    if (hard.length > 1) out.push(`${DAY_NAME[d]} has ${WORDS[hard.length] ?? hard.length} harder workouts. One hard session a day, with anything else light, leaves more room to recover.`)
  }
  for (let i = 0; i < 7; i++) {
    const a = WEEK_ORDER[i], b = WEEK_ORDER[(i + 1) % 7]
    const A = hardOn(a), B = hardOn(b)
    if (!A.length || !B.length) continue
    const same = A.find((k) => B.includes(k))
    const mb = new Set(B.flatMap((k) => [...keyMuscles(k, routines)]))
    const shared = new Set(A.flatMap((k) => [...keyMuscles(k, routines)]).filter((m) => mb.has(m)))
    if (same || shared.size >= 2) {
      out.push(`${same ? keyTitle(same, routines) + ' is' : 'Two workouts for the same muscles are'} on back-to-back days (${DAY_NAME[a]} and ${DAY_NAME[b]}). Legs, then Push, then Pull gives each area time to recover.`)
    }
  }
  // a week with no rest day, as the one-workout week already says it
  for (const w of weekWarnings(scheduleMirror(week, routines))) if (w.kind === 'no-rest') out.push(w.text)
  return [...new Set(out)]
}

/** A week in words for lists: "Legs · Push · Pull + 2 more". */
export function weekSummary(week: PlanWeek, routines: Routine[] | undefined): string {
  const names = WEEK_ORDER.flatMap((d) => week[d] || []).map((k) => keyTitle(k, routines))
  const days = WEEK_ORDER.filter((d) => (week[d] || []).length > 0).length
  return `${days} ${days === 1 ? 'day' : 'days'} a week${names.length ? ' · ' + [...new Set(names)].slice(0, 3).join(', ') + (new Set(names).size > 3 ? '…' : '') : ''}`
}

/** A week from the one-workout-a-day schedule. */
export function weekFromSchedule(s: Schedule): PlanWeek {
  const out: PlanWeek = {}
  for (let d = 0; d < 7; d++) { const v = plannedOn(s, d); out[d] = v === 'Rest' ? [] : [v] }
  return out
}

export type PlanExperience = 'new' | 'comfortable' | 'confident'
export type PlanWhere = 'gym' | 'home' | 'none'

/** One of Tali's plans (source 'recommended'), as the plan library shows it (design canvas, Plans 1). */
export interface PlanTemplate {
  id: string
  name: string
  /** the tile's line: "12 weeks · 3 lifting days, then 6" */
  tagline: string
  about: string
  /** the profile goals it fits, the main one first ("Fits your goal"; nothing is ever locked) */
  goals: Goal[]
  /** the Food targets goal its eating line comes from (the same engine as Food) */
  nutritionGoal: Goal
  /** a line after the engine's figures, when the plan needs one */
  eatingExtra?: string
  /** a safety line for the preview, before the GP line */
  safety?: string
  /** a photograph position for its tiles and header */
  artAt: string
  experience: PlanExperience[]
  where: PlanWhere[]
  /** the preview's facts */
  forWho: string
  kit: string
  time: string
  /** how the weeks go, in words, under the timeline */
  weeksText: string
  phases: Omit<PlanPhase, 'id'>[]
  /** the week maintenance runs, on the shorter version, if the person chooses it after the plan */
  maintenance: PlanWeek
}

const wk = (days: Partial<Record<number, string[]>>): PlanWeek => { const out: PlanWeek = {}; for (let d = 0; d < 7; d++) out[d] = days[d] ?? []; return out }
/** Mon Legs, Tue cardio, Wed Push, Fri Pull, Sat cardio: the app's default week. */
const PPL3 = weekFromSchedule(DEFAULT_SCHEDULE as Schedule)
/** Push, pull and legs twice a week, Sunday off. */
const PPL6 = wk({ 1: ['Legs'], 2: ['Push'], 3: ['Pull'], 4: ['Legs'], 5: ['Push'], 6: ['Pull'] })

const SBA = 'tali-strength-balance-a', SBB = 'tali-strength-balance-b', BM = 'tali-balance-mobility'
const FBA = 'tali-full-body-a', FBB = 'tali-full-body-b', FBC = 'tali-full-body-c'

/**
 * Tali's three interim plans (design canvas, Plans 1; defined by fitness-workouts and approved by
 * Benn, 27 Sept 2026). Each has a set length (no variants). Maintenance comes after a plan, when the
 * person chooses it: each plan's maintenance week, on the shorter version (Bickel et al. 2011, Med
 * Sci Sports Exerc; Spiering et al. 2021, J Strength Cond Res). Benn's principle: Tali's plans
 * follow the profile's recommended goals and the science, and people are free to choose any plan.
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'pure-muscle-growth', name: 'Pure muscle growth', tagline: '12 weeks · 3 lifting days, then 6', goals: ['build-muscle', 'increase-strength'], nutritionGoal: 'build-muscle', artAt: '50% 40%',
    about: "Push, pull and legs, twice a week once you've settled in: enough work for each muscle to grow, with a few days for each to recover. Two easier weeks come first to find your weights, and a lighter week in the middle helps you recover for the final stretch.",
    experience: ['comfortable', 'confident'], where: ['gym'],
    forWho: 'Build muscle; getting comfortable or confident lifters', kit: 'Gym: barbell and rack, dumbbells, cables, machines', time: 'About 4 hours a week from week 3 (six sessions of 35–50 minutes)',
    weeksText: 'Weeks 1–2 Foundation, 3 lifting days · 3–6 Build, 6 days · 7 Lighter week · 8–12 Build',
    phases: [
      { name: 'Foundation', weeks: 2, easier: true, week: PPL3 },
      { name: 'Build', weeks: 4, week: PPL6 },
      { name: 'Lighter week', weeks: 1, maintain: true },
      { name: 'Build', weeks: 5, week: PPL6 },
    ],
    // the Foundation week's three lifts (light cardio stays if wanted), on the shorter version
    maintenance: PPL3,
  },
  {
    id: 'stronger-with-age', name: 'Stronger with age', tagline: '12 weeks · 2 strength, 1 balance, 2 cardio', goals: ['increase-strength', 'feel-better', 'build-muscle'], nutritionGoal: 'feel-better', artAt: '50% 35%',
    about: 'Two strength sessions of about 40 minutes and one balance session a week, built around everyday moves like standing up, stepping and carrying. Strength and balance training together are among the best-supported ways to stay steady and independent as the years go by. You start gently and build from there.',
    experience: ['new', 'comfortable'], where: ['home'],
    forWho: 'Getting stronger and steadier; just starting or getting comfortable', kit: 'Dumbbells, a chair, a wall and a low step or the bottom stair', time: 'About 2½ hours a week',
    eatingExtra: 'around 25–30 g at each main meal',
    safety: 'No barbell, nothing overhead and no jumping. A few moves are on the floor: use a mat and get down and up next to a chair, or skip them if the floor is hard. Had a recent fall, dizziness, chest pain, a heart condition, surgery or a fracture? Speak to your GP first.',
    weeksText: 'Weeks 1–2 Ease in, shorter sessions · 3–12 Build',
    phases: [
      { name: 'Ease in', weeks: 2, maintain: true },
      { name: 'Build', weeks: 10, week: wk({ 1: [SBA], 2: ['Cardio'], 3: [BM], 4: [SBB], 5: ['Cardio'] }) },
    ],
    // both strength days on the shorter version, with Balance & Mobility and one cardio kept
    maintenance: wk({ 1: [SBA], 2: ['Cardio'], 3: [BM], 4: [SBB] }),
  },
  {
    id: 'full-body-system', name: 'Full body system', tagline: '8 weeks · 3 full-body, 2 cardio', goals: ['lose-fat', 'feel-better', 'build-muscle', 'increase-strength'], nutritionGoal: 'lose-fat', artAt: '50% 40%',
    about: 'Three sessions a week, each working your whole body with a squat or lunge, a hip or hamstring move, a push and a pull. A simple, complete way to build strength and muscle with plenty of room to recover. A great first plan, and it fits well alongside fat-loss eating.',
    experience: ['new', 'comfortable'], where: ['gym'],
    forWho: 'A first plan; losing fat, feeling better or building strength', kit: 'Gym: dumbbells, cables, machines', time: 'About 3 hours a week',
    weeksText: 'Week 1 Ease in, shorter sessions · 2–8 Build',
    phases: [
      { name: 'Ease in', weeks: 1, maintain: true },
      { name: 'Build', weeks: 7, week: wk({ 1: [FBA], 2: ['Cardio'], 3: [FBB], 4: ['Cardio'], 5: [FBC] }) },
    ],
    // the two full-body days shorter; light cardio stays (a fat-loss plan)
    maintenance: wk({ 1: [FBA], 2: ['Cardio'], 4: [FBB], 6: ['Cardio'] }),
  },
]

export const templateById = (id: string | undefined) => PLAN_TEMPLATES.find((t) => t.id === id)

/** What the profile says, for matching plans to it. */
export interface Fit { goal?: Goal; age?: number | null; experience?: Experience }
export const fitOf = (p: Pick<Profile, 'goal' | 'age' | 'training'> | undefined): Fit => ({ goal: p?.goal, age: p?.age, experience: p?.training?.experience })

const EXP: Record<Experience, PlanExperience> = { beginner: 'new', intermediate: 'comfortable', advanced: 'confident' }

/**
 * Whether a Tali plan fits the person ("Fits your goal"): their goal is one it names, and their
 * experience (when given) is one it's for. Never a gate: every plan stays open to everyone.
 */
export function fits(t: Pick<PlanTemplate, 'goals' | 'experience'>, p: Fit | undefined): boolean {
  if (!p?.goal || !t.goals.includes(p.goal)) return false
  return !p.experience || t.experience.includes(EXP[p.experience])
}

/** How well a plan suits someone, for ordering: a fit first (its main goal before a side one); from 55, Stronger with age leads. */
function fitScore(t: Pick<PlanTemplate, 'id' | 'goals' | 'experience'>, p: Fit | undefined): number {
  if (!p) return 0
  let n = fits(t, p) ? (t.goals[0] === p.goal ? 3 : 2) : p.goal && t.goals.includes(p.goal) ? 1 : 0
  if (t.id === 'stronger-with-age' && (p.age ?? 0) >= 55) n += 4
  return n
}

/** The plans that suit the person first; nothing is ever hidden or locked. */
export function fitsFirst<T extends Pick<PlanTemplate, 'id' | 'goals' | 'experience'>>(list: T[], p: Fit | undefined): T[] {
  return [...list].sort((a, b) => fitScore(b, p) - fitScore(a, p))
}

/** Tali plans to suggest when one ends: the one that suits the person first, never the one just done. */
export function nextSuggestions(done: TrainingPlan | undefined, p?: Fit): PlanTemplate[] {
  return fitsFirst(PLAN_TEMPLATES.filter((t) => t.id !== done?.baseTemplateId), p)
}

/** Energy in the Food targets for each goal, in words (goalAdjustPct in nutrition.ts). */
const ENERGY_WORDS: Record<Goal, string> = {
  'build-muscle': 'a small surplus', 'lose-fat': 'a moderate deficit', 'increase-strength': 'energy at about maintenance',
  'increase-endurance': 'enough energy to fuel your training', 'feel-better': 'energy at about maintenance',
}
const GOAL_WORDS: Record<Goal, string> = {
  'build-muscle': 'building muscle', 'lose-fat': 'losing fat', 'increase-strength': 'getting stronger', 'increase-endurance': 'endurance', 'feel-better': 'feeling better',
}

/**
 * A plan's eating line, from the same targets engine as Food (PROTEIN_PER_KG, goalAdjustPct), true
 * whatever the person's own goal (nutrition-accuracy); gentle mode leaves the numbers out
 * (mental-performance). Never "from your Food targets" unless their goal is the plan's.
 */
export function eatingLine(t: Pick<PlanTemplate, 'nutritionGoal' | 'eatingExtra'>, goal: Goal | undefined, gentle?: boolean): string {
  const g = t.nutritionGoal
  const figures = t.eatingExtra ? `protein about ${PROTEIN_PER_KG[g]} g per kg a day, ${t.eatingExtra}, and ${ENERGY_WORDS[g]}` : `protein about ${PROTEIN_PER_KG[g]} g per kg a day and ${ENERGY_WORDS[g]}`
  if (!goal) return 'Set a goal in Profile and your Food targets will follow it.'
  if (goal === g) return gentle ? 'Enough protein through the day, and enough food to fuel your training. Your Food targets cover this.' : `${figures[0].toUpperCase()}${figures.slice(1)}. Your Food targets for ${GOAL_WORDS[g]} cover this.`
  return gentle ? 'Your Food targets follow your own goal. You can change your goal in Profile if you like.'
    : `For ${GOAL_WORDS[g]}, Food targets suggest ${figures}. Yours follow your own goal; you can change it in Profile if you like.`
}

/** A workout key a plan may hold: a built-in type, a Tali or own workout id (letters, digits, - and _). */
const KEY_RE = /^[A-Za-z0-9_-]{1,64}$/

/** A week made valid: each day a list of up to four well-formed keys. */
function cleanWeek(w: unknown): PlanWeek {
  const out: PlanWeek = {}
  for (let d = 0; d < 7; d++) {
    const v = w && typeof w === 'object' ? (w as Record<number, unknown>)[d] : undefined
    out[d] = (Array.isArray(v) ? v : []).filter((k): k is string => typeof k === 'string' && KEY_RE.test(k)).slice(0, 4)
  }
  return out
}

/** Clamp a phase's weeks to what the app allows; a plan's total can't pass a year. */
export function cleanPhases(phases: PlanPhase[]): PlanPhase[] {
  let left = MAX_PLAN_WEEKS
  const out: PlanPhase[] = []
  // maintenance after the plan: the first real one, kept apart so the year's cap can never drop it
  const isAfter = (x: PlanPhase) => !!x && x.after === true && x.maintain !== true
  const after = phases.find(isAfter)
  for (const ph of phases.filter((x) => !isAfter(x))) {
    const weeks = Math.max(1, Math.min(MAX_PHASE_WEEKS, left, Math.round(+ph.weeks || 1)))
    if (left <= 0) break
    left -= weeks
    const week: PlanWeek = {}
    // every field checked, so a plan from a newer or buggy client can't break a launch
    const maintain = ph.maintain === true
    const easier = ph.easier === true && !maintain
    if (!maintain) Object.assign(week, cleanWeek(ph.week))
    const name = typeof ph.name === 'string' && ph.name.trim() ? ph.name.trim() : maintain ? 'Maintain' : 'Build'
    out.push({ id: typeof ph.id === 'string' && ph.id ? ph.id.slice(0, 40) : newPhaseId(), name: [...name].slice(0, 40).join(''), weeks, ...(maintain ? { maintain: true } : { week }), ...(easier ? { easier: true } : {}) })
  }
  if (after && out.length) {
    const since = typeof after.since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(after.since) ? after.since : undefined
    out.push({ id: typeof after.id === 'string' && after.id ? after.id.slice(0, 40) : newPhaseId(), name: 'Maintenance', weeks: 1, after: true, week: cleanWeek(after.week), ...(since ? { since } : {}) })
  }
  // the server caps a plan's phases at 64 KB: trim whole build phases from the end, never below one
  while (out.filter((x) => !x.after).length > 1 && JSON.stringify(out).length > 60000) out.splice(out[out.length - 1].after ? out.length - 2 : out.length - 1, 1)
  return out
}

/** A phase id: only needs to be unique within its plan. */
export const newPhaseId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `ph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** A template's phases, ready to edit or start (each with its own id and its own copy of the week). */
export function phasesOf(t: Pick<PlanTemplate, 'phases'>): PlanPhase[] {
  return t.phases.map((ph) => ({ ...ph, id: newPhaseId(), ...(ph.week ? { week: copyWeek(ph.week) } : {}) }))
}

export function copyWeek(w: PlanWeek | undefined): PlanWeek {
  const out: PlanWeek = {}
  for (let d = 0; d < 7; d++) out[d] = [...(w?.[d] || [])]
  return out
}

/**
 * When a new plan starts: today, or next Monday. Never an earlier day, so a plan never rewrites
 * days already lived (no "pick it up" for a workout that wasn't planned then); its weeks run
 * seven days from the start.
 */
export function planStart(today: string, when: 'today' | 'monday'): string {
  if (when === 'today') return today
  const ahead = (8 - parseYmd(today).getDay()) % 7 || 7
  return shiftDay(today, ahead)
}

/** The build phase whose week a phase trains (itself, or the one a maintain phase reuses); -1 for none. */
export function weekSource(p: Pick<TrainingPlan, 'phases'>, i: number): number {
  const ph = p.phases[i]
  if (ph && (isBuild(ph) || (ph.after && ph.week && Object.values(ph.week).some((k) => k.length)))) return i
  for (let j = i - 1; j >= 0; j--) if (isBuild(p.phases[j])) return j
  for (let j = i + 1; j < p.phases.length; j++) if (isBuild(p.phases[j])) return j
  return -1
}

/** A plan in the library: one of Tali's, or one of the person's own (design canvas, Plans 1). */
export interface CatalogueEntry {
  key: string
  name: string
  line: string
  madeBy: 'tali' | 'me'
  goals: Goal[]
  weeks: number
  /** the most days a week it trains */
  days: number
  experience: PlanExperience[]
  where: PlanWhere[]
  template?: PlanTemplate
  plan?: TrainingPlan
}

const maxDays = (phases: Pick<PlanPhase, 'week' | 'maintain' | 'after'>[]) => Math.max(0, ...phases.filter((x) => !x.maintain && !x.after).map((x) => trainingDays(x.week)))

/**
 * Every plan in one list, Tali's and the person's own (their saved ones and those they've run,
 * newest first, one per name); the one that fits their goal leads. Nothing is locked.
 */
export function catalogue(s: Pick<AppState, 'trainingPlans'>, fit?: Fit): CatalogueEntry[] {
  const tali: CatalogueEntry[] = PLAN_TEMPLATES.map((t) => ({
    key: t.id, name: t.name, line: t.tagline, madeBy: 'tali', goals: t.goals, weeks: totalWeeks(t), days: maxDays(t.phases), experience: t.experience, where: t.where, template: t,
  }))
  const seen = new Set<string>()
  const own: CatalogueEntry[] = []
  for (const p of [...(s.trainingPlans || [])].filter((x) => x.source === 'custom' && x.state !== 'archived' && x.phases.length).sort((a, b) => ((b._u || '') > (a._u || '') ? 1 : -1))) {
    const k = p.name.trim().toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    const n = totalWeeks(p), d = maxDays(p.phases)
    own.push({ key: p.id, goals: [], name: p.name, line: `${n} ${n === 1 ? 'week' : 'weeks'} · ${d} ${d === 1 ? 'workout day' : 'workout days'} · yours`, madeBy: 'me', weeks: n, days: d, experience: [], where: [], plan: p })
  }
  return [...fitsFirst(tali.map((e) => ({ ...e, id: e.key, experience: e.experience })), fit), ...own]
}

export interface PlanFilters { q?: string; goal?: Goal[]; days?: ('2-3' | '4-5' | '6')[]; experience?: PlanExperience[]; where?: PlanWhere[]; length?: ('6' | '8' | '12')[]; madeBy?: ('tali' | 'me')[] }

/** Narrow the library: search by name, then each filter group (any of its choices). */
export function filterCatalogue(list: CatalogueEntry[], f: PlanFilters): CatalogueEntry[] {
  const words = (f.q || '').toLowerCase().split(/\s+/).filter(Boolean)
  const dayBand = (n: number) => (n <= 3 ? '2-3' : n <= 5 ? '4-5' : '6')
  const lenBand = (n: number) => (n <= 6 ? '6' : n <= 9 ? '8' : '12')
  const some = <T,>(sel: T[] | undefined, test: (v: T) => boolean) => !sel?.length || sel.some(test)
  return list.filter((e) =>
    words.every((w) => e.name.toLowerCase().includes(w) || (e.template?.about.toLowerCase().includes(w) ?? false)) &&
    some(f.goal, (g) => e.goals.includes(g)) && some(f.days, (d) => dayBand(e.days) === d) && some(f.experience, (x) => e.experience.includes(x)) &&
    some(f.where, (w) => e.where.includes(w)) && some(f.length, (l) => lenBand(e.weeks) === l) && some(f.madeBy, (m) => e.madeBy === m))
}

/** A date plans can start on: today or any day after, as YYYY-MM-DD; anything else is today. */
export function startOn(today: string, pick: string | undefined): string {
  return pick && /^\d{4}-\d{2}-\d{2}$/.test(pick) && pick >= today ? pick : today
}

/** Workouts logged from a plan's start up to a date (any session counts: the plan is a shape, not a checklist). */
export function workoutsDone(s: Pick<AppState, 'days'>, p: Pick<TrainingPlan, 'startedAt'>, upTo: string): number {
  if (!p.startedAt) return 0
  let n = 0
  for (const [d, day] of Object.entries(s.days || {})) if (d >= p.startedAt && d <= upTo) n += sessionsOf(day, d).length
  return n
}

/** The week maintenance runs after a plan: the Tali plan's own, else the plan's last build week. */
export function maintenanceWeekOf(p: Pick<TrainingPlan, 'phases' | 'baseTemplateId'>): PlanWeek {
  const t = templateById(p.baseTemplateId)
  if (t) return copyWeek(t.maintenance)
  for (let i = p.phases.length - 1; i >= 0; i--) if (isBuild(p.phases[i]) && p.phases[i].week) return copyWeek(p.phases[i].week)
  return copyWeek({})
}

/** Maintenance in words: "Legs & Core, Push and Pull on Monday, Wednesday and Friday, shorter version." */
export function maintenanceLine(week: PlanWeek, routines: Routine[] | undefined): string {
  const days = WEEK_ORDER.filter((d) => (week[d] || []).some((k) => isHardKey(k, routines)))
  const names = [...new Set(days.flatMap((d) => (week[d] || []).filter((k) => isHardKey(k, routines)).map((k) => keyTitle(k, routines))))]
  const and = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1])
  if (!days.length) return 'Your last week on the shorter version.'
  return `${and(names)} on ${and(days.map((d) => DAY_NAME[d]))}, shorter version. Keep your weights.`
}

/** An easier first week (to find your weights): the first build week, drawn striped. Only before the plan starts. */
export function withEasierStart(phases: PlanPhase[]): PlanPhase[] {
  const first = phases.find(isBuild)
  if (!first || phases[0]?.easier || phases[0]?.maintain) return phases
  return [{ id: newPhaseId(), name: 'Easier first week', weeks: 1, easier: true, week: copyWeek(first.week) }, ...phases]
}

/**
 * A lighter week at a plan week (1-based): the build phase that holds it splits around one week on
 * the shorter version. The plan gets a week longer; weeks already done don't move.
 */
export function withLighterWeek(phases: PlanPhase[], at: number): PlanPhase[] {
  let from = 1
  for (let i = 0; i < phases.length; i++) {
    const ph = phases[i]
    if (ph.after) break
    const to = from + ph.weeks - 1
    if (at >= from && at <= to + 1 && isBuild(ph)) {
      const before = Math.min(ph.weeks, at - from)
      const rest = ph.weeks - before
      const out: PlanPhase[] = [...phases.slice(0, i)]
      if (before > 0) out.push({ ...ph, weeks: before, week: copyWeek(ph.week) })
      out.push({ id: newPhaseId(), name: 'Lighter week', weeks: 1, maintain: true })
      if (rest > 0) out.push({ ...ph, id: newPhaseId(), weeks: rest, week: copyWeek(ph.week) })
      return [...out, ...phases.slice(i + 1)]
    }
    from = to + 1
  }
  return phases
}

/** An "Ease in" block: shorter sessions before any build week (a plan's start, not a mid-plan lighter week). */
export const isEaseIn = (p: Pick<TrainingPlan, 'phases'>, i: number): boolean =>
  !!p.phases[i]?.maintain && p.phases.slice(0, i).every((x) => x.maintain || x.easier)

/** The one plan to mark "Fits your goal" and lead with: the best-suited, when it fits at all. */
export function bestFit<T extends Pick<PlanTemplate, 'id' | 'goals' | 'experience'>>(list: T[], p: Fit | undefined): T | undefined {
  const top = fitsFirst(list, p)[0]
  return top && fits(top, p) ? top : undefined
}
