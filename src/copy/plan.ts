/**
 * Plan's words that both apps read (native-build-plan finding 4): the outcome labels, Mind plans
 * (board B9), the goal chips and plan filters, how maintenance works and the guides. Moved out of
 * screens/plan/*.tsx unchanged; the web files import them from here.
 */
import type { Goal, IfThenPlan } from '@/core/types'
import type { PlanExperience, PlanFilters, PlanWhere } from '@/core/domain/plans'

/** An if–then plan's last check-in, as its row says it. */
export const PLAN_OUTCOME: Record<IfThenPlan['reviews'][number]['r'], string> = { worked: 'Worked', mixed: 'Mixed', no: "Didn't work" }

/**
 * Mind plans (board B9, deck B9.15 and B9.17; plan `kind: 'mind'`). Every string here is linted with
 * mindCopyIssues by scripts/wellbeing/one-thing.ts. Shown only with WELLBEING_ENABLED: a Mind plan
 * is only made from the day's one thing, and Plan groups by kind only with the flag on.
 */
export const MIND_PLAN = {
  /** the Plan group name (board B9, approved for now by Benn, 8 Oct 2026) */
  group: 'Mind plans',
  /** B9.15, under the fields */
  savedUnder: 'Saved under Mind plans on Plan',
  /** B9.17, the toast after saving */
  saved: 'Plan saved. Tilo will check in on it next week.',
  /** B9.14's empty field, as drawn */
  optional: 'Optional',
} as const

/** The goal chips and filters, in the profile's own words where they exist. */
export const GOAL_CHIP: [Goal, string][] = [
  ['build-muscle', 'Build muscle'], ['increase-strength', 'Get stronger'], ['lose-fat', 'Lose fat'], ['feel-better', 'Feel better'], ['increase-endurance', 'Endurance'],
]

/** The plan library's filter sheet. */
export const PLAN_FILTER_DAYS: [NonNullable<PlanFilters['days']>[number], string][] = [['2-3', 'Up to 3'], ['4-5', '4–5'], ['6', '6 or more']]
export const PLAN_FILTER_EXPERIENCE: [PlanExperience, string][] = [['new', 'Just starting'], ['comfortable', 'Getting comfortable'], ['confident', 'Confident']]
export const PLAN_FILTER_WHERE: [PlanWhere, string][] = [['gym', 'Gym'], ['home', 'Home, some kit'], ['none', 'No equipment']]
export const PLAN_FILTER_LENGTH: [NonNullable<PlanFilters['length']>[number], string][] = [['6', 'Up to 6 weeks'], ['8', '7 to 9 weeks'], ['12', '10 weeks or more']]
export const PLAN_FILTER_MADE: [NonNullable<PlanFilters['madeBy']>[number], string][] = [['tali', 'Tilo'], ['me', 'Me']]

/** How maintenance works (Plans 1, the full-screen card): heading and text of each step. */
export const MAINTENANCE_STEPS: [string, string][] = [
  ['What maintenance is', "A lighter way to train once a plan ends. You keep doing the same workouts, just with fewer sets. It's for busy spells, a breather between plans, or whenever you'd like to hold steady."],
  ['Why it works', 'People who had trained for a few months kept most of their strength and muscle for months on about a third of their usual sets, sometimes training just once a week. Older adults kept more when they did a bit more, so Stronger with age keeps about two thirds.'],
  ['What changes in Tilo', 'Your workouts open on the shorter version, usually 2 sets instead of 3, on two or three days a week. Light cardio and balance sessions stay if you want them. You can do the full workout any day.'],
  ['The one thing to keep: the weight', "Lift the same weights you finished the plan on, and stop a couple of reps before you couldn't do another. Fewer sets is fine. Much lighter weights is what lets progress slip."],
  ["How long, and what's next", "As long as you need. We'll check in after about 8 weeks and suggest a new plan around 12, whenever you're ready. A week or two off along the way won't undo your work."],
]

/** A guide paragraph as runs of text; `true` marks a bold run. `muted` is the closing note. */
export type GuidePara = { runs: [string, boolean][]; muted?: boolean }

/** Plan's guides: their titles and paragraphs. */
export const PLAN_GUIDES: { id: 'split' | 'basics'; title: string; paras: GuidePara[] }[] = [
  {
    id: 'split', title: 'How the split works', paras: [
      { runs: [['Lifts work best in the order ', false], ['Legs → Push → Pull', true], [' so back-to-back sessions hit different muscles.', false]] },
      { runs: [['Legs & Core:', true], [' squats, Romanian deadlifts, leg extensions, calves and core.', false]] },
      { runs: [['Push:', true], [' chest, shoulders, triceps.', false]] },
      { runs: [['Pull:', true], [' back, rear delts, biceps.', false]] },
    ],
  },
  {
    id: 'basics', title: 'The honest basics', paras: [
      { runs: [["You can't spot-reduce.", true], [' Fat comes off the whole body when you eat a little less than you burn. The belly is often one of the last places to change.', false]] },
      { runs: [['Food does most of the work.', true], [' Training helps and protects muscle, but a steady, modest deficit is what moves body fat.', false]] },
      { runs: [['Averages beat single days.', true], [" One high day doesn't undo a good week. Look at the weekly view, not the daily number.", false]] },
      { runs: [['Estimates are fine.', true], [' People logging carefully still miss 20% or more. Being consistently roughly right beats being occasionally precise.', false]] },
      { runs: [['Feeling sick with exercise?', true], [' Keep effort moderate, stop two or three reps short of failure, and eat a small snack 30–45 minutes before. If nausea is severe, stop and see a GP. For chest pain or feeling faint, follow the stop signs on the workout screen.', false]] },
      { runs: [['General information, not medical advice.', false]], muted: true },
    ],
  },
]
