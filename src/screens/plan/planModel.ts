/**
 * Plan's pure helpers, shared by the web and native Plan screens (no React, no DOM). Moved out of
 * PlanSheets.tsx, PlanParts.tsx, PlanViews.tsx and PlanBuilder.tsx unchanged; those re-export them.
 * Tested in scripts/test-plan.ts.
 */
import type { AppState, Goal, IfThenPlan, PlanWeek, Routine, Schedule, TrainingPlan, TrainingPrefs, WorkoutType } from '@/core/types'
import { SESSIONS, WORKOUTS } from '@/core/data/workouts'
import { EXERCISES } from '@/core/data/exercises'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { setCount } from '@/core/domain/guided'
import { activePlan, bestFit, copyWeek, endDate, fitOf, isEaseIn, newPhaseId, phaseRows, planWeekNotes, positionOn, PLAN_TEMPLATES, timeline, totalWeeks, upcomingPlan, weekSource, withEasierStart, workoutsDone, type PhaseRow, type PlanPosition, type PlanTemplate, type WeekCell } from '@/core/domain/plans'
import { DAY_NAME, shiftDay, shortDateOf } from '@/core/domain/date'
import { WEEK_ORDER, plannedOn, shortTitle, weekWarnings } from '@/core/domain/week'
import { aboutLine, canBuild, isBuiltinKey, keyTitle, routineEstMins, routineFor, slotsOf, templateFor, type WorkoutKey } from '@/core/domain/routines'
import { GOAL_CHIP, PLAN_OUTCOME } from '@/copy/plan'

/** "When I get home from work", or a plan made from a cue (ob5-4) as it was written: "After lunch". */
export const whenLine = (when: string) => (/^after\b/i.test(when) ? when.charAt(0).toUpperCase() + when.slice(1) : `When ${when}`)

/**
 * Plan's if–then groups: with the wellbeing flag on, Mind plans get their own group; every other
 * plan (and every plan with the flag off) stays under "If–then plans", in saved order.
 */
export function planGroups(plans: readonly IfThenPlan[], wellbeing: boolean): { ifThen: IfThenPlan[]; mind: IfThenPlan[] } {
  if (!wellbeing) return { ifThen: [...plans], mind: [] }
  return { ifThen: plans.filter((p) => p.kind !== 'mind'), mind: plans.filter((p) => p.kind === 'mind') }
}

/** A goal in the plan chips' words ("Get stronger"), or undefined. */
export const goalLabel = (g: Goal | undefined) => GOAL_CHIP.find(([k]) => k === g)?.[1]

/** A ready-made workout's line: "5 exercises · 13–15 sets", or cardio's own line. */
export const workoutSub = (t: WorkoutType) => (t === 'Cardio' ? WORKOUTS.Cardio.ex[0].t : `${WORKOUTS[t].ex.length} exercises · ${setCount(WORKOUTS[t].ex)}`)

/** A ready-made workout's kind ("Weights", "Cardio"). */
export const workoutKind = (t: WorkoutType) => (t === 'Cardio' ? MODALITY_LABEL.cardio : MODALITY_LABEL.strength)

/** A plan built in the builder (Plans 2), before it starts. */
export interface BuiltPlan { name: string; weeks: number; week: PlanWeek; startedAt: string; easier: boolean }

/** The phases a built plan starts with: one build phase (easier or lighter weeks come later, in Plan details). */
export const builtPhases = (p: BuiltPlan) => {
  const phases = [{ id: newPhaseId(), name: 'Build', weeks: p.weeks, week: copyWeek(p.week) }]
  return p.easier ? withEasierStart(phases) : phases
}

/* ---------------- view models (what each Plan view shows; both apps render from these) ---------------- */


const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** One of the person's own (or Tilo's) workouts as a row says it: "Weights · 6 exercises · about 45 min". */
export function routineLine(r: Routine, routines: Routine[] | undefined, training: TrainingPrefs | undefined, onboarding: boolean): string {
  return [MODALITY_LABEL[r.modality], plural(slotsOf(r).length, 'exercise'), aboutLine(routineEstMins(r, routines, training, onboarding))].filter(Boolean).join(' · ')
}

/** Any workout key's line in the add-workout and day lists: a ready-made one's, or routineLine. */
export function keyLine(k: WorkoutKey, routines: Routine[] | undefined, training: TrainingPrefs | undefined, onboarding: boolean, withKind = false): string {
  const r = routineFor(k, routines)
  if (r) return routineLine(r, routines, training, onboarding)
  return (withKind ? `${workoutKind(k as WorkoutType)} · ` : '') + workoutSub(k as WorkoutType)
}

/** The keys on a plan day this device knows (a newer app's own workouts are left out of the view). */
export const knownKeys = (keys: WorkoutKey[] | undefined, routines: Routine[] | undefined) => (keys || []).filter((k) => isBuiltinKey(k) || !!routineFor(k, routines))

/** A week row (Option A): the day, its workouts' names, the one-workout exercise count, its label. */
export interface WeekRowModel { d: number; day: string; keys: WorkoutKey[]; names: string[]; sub: string; today: boolean; label: string }

/** A plan week as the Plan tab lists it, Monday first. */
export function planWeekRows(week: PlanWeek, routines: Routine[] | undefined, todayIdx?: number, todayNote = 'Today'): WeekRowModel[] {
  return WEEK_ORDER.map((d) => {
    const keys = knownKeys(week[d], routines)
    const names = keys.map((k) => keyTitle(k, routines))
    const today = d === todayIdx
    const n = keys.length === 1 && keys[0] !== 'Cardio' ? templateFor(keys[0], routines)?.ex.length ?? 0 : 0
    const sub = [n ? plural(n, 'exercise') : '', today ? todayNote : ''].filter(Boolean).join(' · ')
    return { d, day: DAY_NAME[d].slice(0, 3), keys, names, sub, today, label: `${DAY_NAME[d]}: ${names.length ? names.join(' and ') : 'Rest'}${today ? ', today' : ''}` }
  })
}

/** The repeating week (no plan running), one workout a day. */
export function scheduleWeekRows(schedule: Schedule, todayIdx: number): WeekRowModel[] {
  return WEEK_ORDER.map((d) => {
    const v = plannedOn(schedule, d)
    const today = d === todayIdx
    const rest = v === 'Rest'
    const sub = rest || (v === 'Cardio' && !today) ? '' : [v !== 'Cardio' ? `${WORKOUTS[v].ex.length} exercises` : '', today ? 'Today' : ''].filter(Boolean).join(' · ')
    return { d, day: DAY_NAME[d].slice(0, 3), keys: rest ? [] : [v], names: rest ? [] : [shortTitle(v)], sub, today, label: `${DAY_NAME[d]}: ${rest ? 'Rest' : shortTitle(v)}${today ? ', today' : ''}` }
  })
}

/** The running plan card's big figure and its line ("Week 3" · "of 12 · Build"). */
export function planCardFigure(p: TrainingPlan, pos: PlanPosition | null): { big: string; small: string } {
  if (!pos) return { big: 'Starts', small: `${shortDateOf(p.startedAt!)} · ${totalWeeks(p)} weeks` }
  if (pos.maintenanceWeek != null) return { big: pos.phase.full ? 'Carrying on' : 'Maintenance', small: `week ${pos.maintenanceWeek}` }
  if (pos.ended) return { big: `${pos.total} weeks`, small: 'done' }
  return { big: `Week ${pos.week}`, small: `of ${pos.total} · ${pos.phase.name}` }
}

/** The running plan card's note: the next lighter week, easing in, or maintenance check-ins at about 8 and 12 weeks. */
export function planCardNote(p: TrainingPlan | undefined, pos: PlanPosition | null, today: string): string | null {
  if (!p || !pos) return null
  if (pos.maintenanceWeek != null) {
    return pos.phase.full ? 'Your last week repeats at the full version. Choose a new plan in Plan details whenever you like.'
      : pos.maintenanceWeek >= 12 ? "About 12 weeks holding steady. When you'd like something new, choose a plan in Plan details."
      : pos.maintenanceWeek >= 8 ? 'About 8 weeks holding steady. Carry on as long as you like.'
      : 'Your workouts open on the shorter version. Lift the same weights as before.'
  }
  const nextLighter = !pos.ended ? phaseRows(p, today).find((r) => r.kind === 'lighter' && r.from > pos.week) : undefined
  if (nextLighter && p.startedAt) return `Lighter week: week ${nextLighter.from}, from ${shortDateOf(shiftDay(p.startedAt, (nextLighter.from - 1) * 7))}.`
  if (pos.maintain) return isEaseIn(p, pos.phaseIndex) ? 'Easing in: shorter sessions while you find your weights.' : 'A lighter week: workouts open on the shorter version.'
  return null
}

/** The plan's end has come and nothing is chosen yet: the card opens the end, and the "See what's next" card shows. */
export const awaitingNext = (pos: PlanPosition | null, next: TrainingPlan | undefined) => !!pos?.ended && !pos.maintenanceWeek && !next

/** The last plan's "do differently", until the person hides it (the builder's note). */
export function lastPlanNote(plans: TrainingPlan[] | undefined, hiddenAt: string | undefined): { at: string; change: string } | undefined {
  const ref = (plans || []).filter((p) => p.reflection?.change).sort((a, b) => (b.reflection!.at > a.reflection!.at ? 1 : -1))[0]?.reflection
  return ref && ref.at !== hiddenAt ? { at: ref.at, change: ref.change! } : undefined
}

/** Plan details' lines: the hero's dates, where the plan is, and the phase rows' detail. */
export function detailsLines(p: TrainingPlan, pos: PlanPosition | null, days: Parameters<typeof workoutsDone>[0], today: string): { sub: string; where: string } {
  const n = totalWeeks(p)
  const end = endDate(p)
  const done = workoutsDone(days, p, today)
  const day = shortDateOf
  const sub = p.startedAt ? (pos ? `Started ${day(p.startedAt)}` : `Starts ${day(p.startedAt)}`) + (end ? ` · ends ${day(shiftDay(end, -1))}` : '') : ''
  const where = !pos ? `${n} weeks · starts ${day(p.startedAt!)}`
    : pos.maintenanceWeek != null ? `${pos.phase.full ? 'Carrying on' : 'Maintenance'} · week ${pos.maintenanceWeek}`
    : pos.ended ? `${n} weeks, done${done ? ` · ${plural(done, 'workout')}` : ''}`
    : `Week ${pos.week} of ${n}${done ? ` · ${plural(done, 'workout')} so far` : ''}`
  return { sub, where }
}

/** Where "Add a lighter week" puts it: after this week, and no earlier than halfway. */
export const lighterWeekAt = (p: TrainingPlan, pos: PlanPosition | null) => {
  const n = totalWeeks(p)
  const cur = pos && pos.maintenanceWeek == null ? pos : null
  return Math.min(Math.max((cur?.week ?? 0) + 1, Math.ceil(n / 2) + 1), n + 1)
}

/** A phase row's detail in Plan details: "Weeks 3–6 · 3 lifting days" or "Week 7 · shorter version". */
export const phaseRowDetail = (r: PhaseRow, span: string, lifting: number) => (r.kind === 'lighter' ? `${span} · shorter version` : `${span} · ${plural(lifting, 'lifting day')}`)

/** "Mondays and Thursdays" for a workout in this week, or "Not in your week". */
export function plannedDaysLine(on: number[]): string {
  const names = on.map((d) => DAY_NAME[d] + 's')
  return names.length ? names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : 'Not in your week'
}

/* ---------------- the Plan tab ---------------- */

/** An if–then plan row: when, what, the last check-in and the backup. */
export interface IfThenRow { id: string; title: string; sub: string; backup?: string }

export interface PlanCard {
  plan: TrainingPlan
  big: string
  small: string
  note: string | null
  cells: WeekCell[]
  endLabel: string
  /** the card opens the end of the plan (it has ended and nothing is chosen) rather than its details */
  opensEnd: boolean
}

export interface PlanTabModel {
  today: string
  /** the plan in charge today, or one waiting for its start with none running */
  card: PlanCard | null
  /** with no plan: the suggested Tilo plan for the person's goal */
  suggested?: PlanTemplate
  /** the plan has ended and nothing is chosen: the "See what's next" card shows */
  ended: boolean
  /** a next plan waiting for its start day */
  next?: TrainingPlan
  /** This week: the plan's week (several a day) or the repeating week */
  week: WeekRowModel[]
  /** the week's notes, as cards under it */
  notes: string[]
  /** the foot under the week: the plan's wording or the repeating week's */
  planWeek: boolean
  /** the Workouts and Exercise library tiles */
  workouts: number
  exercises: number
  ifThen: IfThenRow[]
  mind: IfThenRow[]
  /** "Build a workout" shows */
  canBuild: boolean
}

const ifThenRow = (pl: IfThenPlan): IfThenRow => {
  const lr = pl.reviews.length ? pl.reviews[pl.reviews.length - 1] : null
  return { id: pl.id, title: whenLine(pl.when), sub: `I'll ${pl.then}${lr ? ` · ${PLAN_OUTCOME[lr.r]}` : ''}`, ...(pl.cope ? { backup: pl.cope } : {}) }
}

/** The Plan tab's model; `todayIdx` is today's weekday (0 Sunday), as the web reads it. */
export function planTabModel(data: Pick<AppState, 'trainingPlans' | 'routines' | 'schedule' | 'profile'>, wellbeing: boolean, today: string, todayIdx: number): PlanTabModel {
  const { trainingPlans, routines, schedule, profile } = data
  const active = activePlan({ trainingPlans }, today)
  const pos: PlanPosition | null = active ? positionOn(active, today) : null
  const next = upcomingPlan({ trainingPlans }, today)
  const fig = active ? planCardFigure(active, pos) : null
  const best = bestFit(PLAN_TEMPLATES, fitOf(profile))
  const groups = planGroups(profile.plans ?? [], wellbeing)
  return {
    today,
    card: active && fig ? {
      plan: active, big: fig.big, small: fig.small, note: planCardNote(active, pos, today),
      cells: timeline(active, today), endLabel: `Week ${totalWeeks(active)}`, opensEnd: awaitingNext(pos, next),
    } : null,
    ...(!active && best ? { suggested: best } : {}),
    ended: !!active && awaitingNext(pos, next),
    ...(next ? { next } : {}),
    week: pos ? planWeekRows(pos.planWeek, routines, todayIdx, pos.maintain ? 'Today · shorter' : 'Today') : scheduleWeekRows(schedule, todayIdx),
    notes: pos ? planWeekNotes(pos.planWeek, routines) : weekWarnings(schedule).map((w) => w.text),
    planWeek: !!pos,
    workouts: SESSIONS.length - 1 + (routines || []).filter((r) => !r.archived).length,
    exercises: EXERCISES.length,
    ifThen: groups.ifThen.map(ifThenRow),
    mind: groups.mind.map(ifThenRow),
    canBuild: canBuild(profile),
  }
}

/** Where tapping a day of This week goes: the repeating week's day, or the running plan's phase week. */
export function dayTarget(data: Pick<AppState, 'trainingPlans'>, d: number, today: string): { kind: 'schedule'; idx: number } | { kind: 'plan'; planId: string; phase: number; idx: number } | null {
  const active = activePlan({ trainingPlans: data.trainingPlans }, today)
  const pos = active ? positionOn(active, today) : null
  if (!active || !pos) return { kind: 'schedule', idx: d }
  const src = weekSource(active, pos.phaseIndex)
  return src >= 0 ? { kind: 'plan', planId: active.id, phase: src, idx: d } : null
}

