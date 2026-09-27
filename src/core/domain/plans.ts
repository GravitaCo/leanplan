import type { AppState, PlanPhase, PlanWeek, Routine, Schedule, TrainingPlan, WorkoutType } from '@/core/types'
import { DEFAULT_SCHEDULE, LIFTS } from '@/core/data/workouts'
import { DAY_NAME, parseYmd, shiftDay } from './date'
import { isBuiltinKey, keyTitle, routineFor, type WorkoutKey } from './routines'
import { plannedOn, weekWarnings, WEEK_ORDER } from './week'

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
const daysBetween = (a: string, b: string) => Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / DAY_MS)

/** The active plan: at most one; if two devices each started one, the later start wins. */
export function activePlan(s: Pick<AppState, 'trainingPlans'>): TrainingPlan | undefined {
  const act = (s.trainingPlans || []).filter((p) => p.state === 'active' && p.startedAt && p.phases.length)
  return act.sort((a, b) => (b.startedAt! > a.startedAt! ? 1 : b.startedAt! < a.startedAt! ? -1 : (b._u || '') > (a._u || '') ? 1 : -1))[0]
}

export const totalWeeks = (p: Pick<TrainingPlan, 'phases'>) => p.phases.reduce((a, x) => a + Math.max(0, x.weeks), 0)

/** The week a phase trains: its own, or (maintain) the nearest build week before it, else after it. */
export function phaseWeek(p: Pick<TrainingPlan, 'phases'>, i: number): PlanWeek {
  const ph = p.phases[i]
  if (ph && !ph.maintain && ph.week) return ph.week
  for (let j = i - 1; j >= 0; j--) if (!p.phases[j].maintain && p.phases[j].week) return p.phases[j].week!
  for (let j = i + 1; j < p.phases.length; j++) if (!p.phases[j].maintain && p.phases[j].week) return p.phases[j].week!
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
  planWeek: PlanWeek
}

/** Where a plan is on a date; null before it starts. */
export function positionOn(p: TrainingPlan, date: string): PlanPosition | null {
  if (!p.startedAt || !p.phases.length) return null
  const d = daysBetween(p.startedAt, date)
  if (d < 0) return null
  const week = Math.floor(d / 7) + 1
  const total = totalWeeks(p)
  let left = Math.min(week, Math.max(total, 1))
  let i = 0
  while (i < p.phases.length - 1 && left > p.phases[i].weeks) { left -= p.phases[i].weeks; i++ }
  const phase = p.phases[i]
  return { week, total, phaseIndex: i, phase, weekInPhase: Math.min(left, phase.weeks), maintain: !!phase.maintain, ended: week > total, planWeek: phaseWeek(p, i) }
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
  const p = activePlan(s)
  const pos = p ? positionOn(p, date) : null
  const idx = parseYmd(date).getDay()
  if (pos) {
    return (pos.planWeek[idx] || []).filter((k) => { if (isBuiltinKey(k)) return true; const r = routineFor(k, s.routines); return !!r && !r.archived })
  }
  const v = plannedOn(s.schedule, idx)
  return v === 'Rest' ? [] : [v]
}

/** A maintenance week of the active plan: planned workouts open on the lighter version. */
export function maintainOn(s: Pick<AppState, 'trainingPlans'>, date: string): boolean {
  const p = activePlan(s)
  const pos = p ? positionOn(p, date) : null
  return !!pos?.maintain && !pos.ended
}

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

/**
 * Gentle notes about a plan's week (plan §3.3; they never block): more than one hard workout on
 * a day, the same muscles on back-to-back days and no rest day (the existing week rules). All
 * thresholds are judgement calls, unvalidated.
 */
export function planWeekNotes(week: PlanWeek, routines: Routine[] | undefined): string[] {
  const out: string[] = []
  for (const d of WEEK_ORDER) {
    const hard = (week[d] || []).filter((k) => isHardKey(k, routines))
    if (hard.length > 1) out.push(`${DAY_NAME[d]} has ${hard.length} harder workouts. One hard session a day, with anything else kept light, gives your body time to recover.`)
  }
  // back-to-back muscles and a week with no rest day, as the one-workout week already says them
  for (const w of weekWarnings(scheduleMirror(week, routines))) out.push(w.text)
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

export interface PlanTemplate {
  id: string
  name: string
  about: string
  phases: Omit<PlanPhase, 'id'>[]
}

const PPL = weekFromSchedule(DEFAULT_SCHEDULE as Schedule)

/**
 * Tali's plans (source 'recommended'). Lengths and the build/maintain split are judgement calls
 * for fitness-workouts to confirm: several weeks of steady building, then a lighter block that
 * keeps what was built (strength and muscle hold with much less volume for a while; Bickel et al.
 * 2011, Med Sci Sports Exerc).
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'tpl-ppl-12', name: 'Push, Pull, Legs · 12 weeks',
    about: 'Three lifting days and light cardio between them. Eight weeks building, then four lighter weeks to hold what you built.',
    phases: [{ name: 'Build', weeks: 8, week: PPL }, { name: 'Maintain', weeks: 4, maintain: true }],
  },
  {
    id: 'tpl-ppl-8', name: 'Push, Pull, Legs · 8 weeks',
    about: 'The same week in a shorter block: six weeks building, then two lighter weeks.',
    phases: [{ name: 'Build', weeks: 6, week: PPL }, { name: 'Maintain', weeks: 2, maintain: true }],
  },
]

export const templateById = (id: string | undefined) => PLAN_TEMPLATES.find((t) => t.id === id)

/** Tali plans to suggest when one ends: any but the one just done. */
export function nextSuggestions(done: TrainingPlan | undefined): PlanTemplate[] {
  return PLAN_TEMPLATES.filter((t) => t.id !== done?.baseTemplateId)
}

/** Clamp a phase's weeks to what the app allows; a plan's total can't pass a year. */
export function cleanPhases(phases: PlanPhase[]): PlanPhase[] {
  let left = MAX_PLAN_WEEKS
  const out: PlanPhase[] = []
  for (const ph of phases) {
    const weeks = Math.max(1, Math.min(MAX_PHASE_WEEKS, left, Math.round(+ph.weeks || 1)))
    if (left <= 0) break
    left -= weeks
    const week: PlanWeek = {}
    if (!ph.maintain) for (let d = 0; d < 7; d++) week[d] = (ph.week?.[d] || []).filter((k) => typeof k === 'string' && k.length <= 64).slice(0, 4)
    out.push({ id: ph.id, name: (ph.name || (ph.maintain ? 'Maintain' : 'Build')).slice(0, 40), weeks, ...(ph.maintain ? { maintain: true } : { week }) })
  }
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

/** When a new plan starts: the Monday of this week, or of next week, so plan weeks match the week view. */
export function planStart(today: string, when: 'this' | 'next'): string {
  const back = (parseYmd(today).getDay() + 6) % 7
  return shiftDay(today, -back + (when === 'next' ? 7 : 0))
}

/** The build phase whose week a phase trains (itself, or the one a maintain phase reuses); -1 for none. */
export function weekSource(p: Pick<TrainingPlan, 'phases'>, i: number): number {
  const ph = p.phases[i]
  if (ph && !ph.maintain) return i
  for (let j = i - 1; j >= 0; j--) if (!p.phases[j].maintain) return j
  for (let j = i + 1; j < p.phases.length; j++) if (!p.phases[j].maintain) return j
  return -1
}
