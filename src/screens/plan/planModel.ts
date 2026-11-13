/**
 * Plan's pure helpers, shared by the web and native Plan screens (no React, no DOM). Moved out of
 * PlanSheets.tsx, PlanParts.tsx, PlanViews.tsx and PlanBuilder.tsx unchanged; those re-export them.
 * Tested in scripts/test-plan.ts.
 */
import type { Goal, IfThenPlan, PlanWeek, WorkoutType } from '@/core/types'
import { WORKOUTS } from '@/core/data/workouts'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { setCount } from '@/core/domain/guided'
import { copyWeek, newPhaseId, withEasierStart } from '@/core/domain/plans'
import { GOAL_CHIP } from '@/copy/plan'

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
