/**
 * TEMPORARY, pending the lead's answer on src/copy/plan.ts (native-build-plan §1 finding 4).
 *
 * The web keeps these pure helpers and labels inside DOM files (screens/plan/PlanSheets.tsx,
 * PlanParts.tsx, PlanViews.tsx, PlanLibrary.tsx, PlanBuilder.tsx) that native can't import. Each
 * line here is the web's, character for character, with its source named, so the swap to the shared
 * file is a change of import only. Nothing native ships while this file exists.
 */
import type { Goal, IfThenPlan, PlanWeek, WorkoutType } from '@/core/types'
import { WORKOUTS } from '@/core/data/workouts'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { setCount } from '@/core/domain/guided'
import { copyWeek, newPhaseId, withEasierStart, type PlanExperience, type PlanFilters, type PlanWhere } from '@/core/domain/plans'

/* ---- PlanSheets.tsx ---- */

/** "When I get home from work", or a plan made from a cue (ob5-4) as it was written: "After lunch". */
export const whenLine = (when: string) => (/^after\b/i.test(when) ? when.charAt(0).toUpperCase() + when.slice(1) : `When ${when}`)

export const PLAN_OUTCOME: Record<IfThenPlan['reviews'][number]['r'], string> = { worked: 'Worked', mixed: 'Mixed', no: "Didn't work" }

/** Mind plans (board B9, deck B9.15 and B9.17; plan `kind: 'mind'`). */
export const MIND_PLAN = {
  group: 'Mind plans',
  savedUnder: 'Saved under Mind plans on Plan',
  saved: 'Plan saved. Tilo will check in on it next week.',
  optional: 'Optional',
} as const

export function planGroups(plans: readonly IfThenPlan[], wellbeing: boolean): { ifThen: IfThenPlan[]; mind: IfThenPlan[] } {
  if (!wellbeing) return { ifThen: [...plans], mind: [] }
  return { ifThen: plans.filter((p) => p.kind !== 'mind'), mind: plans.filter((p) => p.kind === 'mind') }
}

/* ---- PlanParts.tsx ---- */

export const GOAL_CHIP: [Goal, string][] = [
  ['build-muscle', 'Build muscle'], ['increase-strength', 'Get stronger'], ['lose-fat', 'Lose fat'], ['feel-better', 'Feel better'], ['increase-endurance', 'Endurance'],
]
export const goalLabel = (g: Goal | undefined) => GOAL_CHIP.find(([k]) => k === g)?.[1]

/* ---- PlanViews.tsx ---- */

export const workoutSub = (t: WorkoutType) => (t === 'Cardio' ? WORKOUTS.Cardio.ex[0].t : `${WORKOUTS[t].ex.length} exercises · ${setCount(WORKOUTS[t].ex)}`)
export const kindOf = (t: WorkoutType) => (t === 'Cardio' ? MODALITY_LABEL.cardio : MODALITY_LABEL.strength)

/* ---- PlanLibrary.tsx ---- */

export const DAYS: [NonNullable<PlanFilters['days']>[number], string][] = [['2-3', 'Up to 3'], ['4-5', '4–5'], ['6', '6 or more']]
export const EXPERIENCE: [PlanExperience, string][] = [['new', 'Just starting'], ['comfortable', 'Getting comfortable'], ['confident', 'Confident']]
export const WHERE: [PlanWhere, string][] = [['gym', 'Gym'], ['home', 'Home, some kit'], ['none', 'No equipment']]
export const LENGTH: [NonNullable<PlanFilters['length']>[number], string][] = [['6', 'Up to 6 weeks'], ['8', '7 to 9 weeks'], ['12', '10 weeks or more']]
export const MADE: [NonNullable<PlanFilters['madeBy']>[number], string][] = [['tali', 'Tilo'], ['me', 'Me']]

export const MAINTENANCE_STEPS: [string, string][] = [
  ['What maintenance is', "A lighter way to train once a plan ends. You keep doing the same workouts, just with fewer sets. It's for busy spells, a breather between plans, or whenever you'd like to hold steady."],
  ['Why it works', 'People who had trained for a few months kept most of their strength and muscle for months on about a third of their usual sets, sometimes training just once a week. Older adults kept more when they did a bit more, so Stronger with age keeps about two thirds.'],
  ['What changes in Tilo', 'Your workouts open on the shorter version, usually 2 sets instead of 3, on two or three days a week. Light cardio and balance sessions stay if you want them. You can do the full workout any day.'],
  ['The one thing to keep: the weight', "Lift the same weights you finished the plan on, and stop a couple of reps before you couldn't do another. Fewer sets is fine. Much lighter weights is what lets progress slip."],
  ["How long, and what's next", "As long as you need. We'll check in after about 8 weeks and suggest a new plan around 12, whenever you're ready. A week or two off along the way won't undo your work."],
]

/* ---- PlanBuilder.tsx ---- */

export interface BuiltPlan { name: string; weeks: number; week: PlanWeek; startedAt: string; easier: boolean }

/** The phases a built plan starts with: one build phase (easier or lighter weeks come later, in Plan details). */
export const builtPhases = (p: BuiltPlan) => {
  const phases = [{ id: newPhaseId(), name: 'Build', weeks: p.weeks, week: copyWeek(p.week) }]
  return p.easier ? withEasierStart(phases) : phases
}

/* ---- train/GuidedPlayer.tsx (N7's file; Plan's exercise list uses it) ---- */

export const bareName = (n: string) => n.replace(/\s*\(.*\)\s*$/, '')
