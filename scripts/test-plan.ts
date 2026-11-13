/* Plan's shared model and words (src/screens/plan/planModel.ts, src/copy/plan.ts), which the web
   and native Plan screens both read. Run from scripts/test-core.ts (npm test); returns the number
   of failures. */
import type { IfThenPlan } from '@/core/types'
import { WORKOUTS } from '@/core/data/workouts'
import { cleanPhases, totalWeeks } from '@/core/domain/plans'
import { builtPhases, goalLabel, planGroups, whenLine, workoutKind, workoutSub } from '@/screens/plan/planModel'
import { GOAL_CHIP, MAINTENANCE_STEPS, MIND_PLAN, PLAN_FILTER_DAYS, PLAN_GUIDES, PLAN_OUTCOME } from '@/copy/plan'
import * as sheets from '@/screens/plan/PlanSheets'

let bad = 0
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'plan model:', name, !ok && detail !== undefined ? JSON.stringify(detail) : '')
}

const pl = (id: string, kind?: 'mind'): IfThenPlan => ({ id, when: 'x', then: 'y', created: '2026-11-01', reviews: [], ...(kind ? { kind } : {}) })

export function planSuite(): number {
  bad = 0
  // whenLine: a cue plan keeps its own words, capitalised; any other reads "When …"
  check('whenLine: an "after" cue', whenLine('after my morning coffee') === 'After my morning coffee')
  check('whenLine: "After" already capitalised', whenLine('After lunch') === 'After lunch')
  check('whenLine: an ordinary plan', whenLine('I get home from work') === 'When I get home from work')
  check('whenLine: "afternoon" is not a cue', whenLine('afternoon slumps hit') === 'When afternoon slumps hit')

  // planGroups: Mind plans apart only with the wellbeing flag, saved order kept
  const plans = [pl('a'), pl('m1', 'mind'), pl('b'), pl('m2', 'mind')]
  const on = planGroups(plans, true), off = planGroups(plans, false)
  check('planGroups on: if–then plans in order', on.ifThen.map((p) => p.id).join() === 'a,b')
  check('planGroups on: Mind plans in order', on.mind.map((p) => p.id).join() === 'm1,m2')
  check('planGroups off: everything under if–then, none apart', off.ifThen.length === 4 && off.mind.length === 0)
  check('planGroups: a copy, never the stored array', off.ifThen !== plans)

  // goal labels
  check('goalLabel: profile goal to chip words', goalLabel('increase-strength') === 'Get stronger')
  check('goalLabel: no goal', goalLabel(undefined) === undefined)
  check('goal chips: five, in order', GOAL_CHIP.map(([g]) => g).join() === 'build-muscle,increase-strength,lose-fat,feel-better,increase-endurance')

  // ready-made workout lines
  check('workoutSub: cardio reads its own line', workoutSub('Cardio') === WORKOUTS.Cardio.ex[0].t)
  check('workoutSub: a lift counts exercises and sets', new RegExp(`^${WORKOUTS.Push.ex.length} exercises · \\d`).test(workoutSub('Push')), workoutSub('Push'))
  check('workoutKind: cardio and weights', workoutKind('Cardio') !== workoutKind('Legs'))

  // builtPhases: one build phase, or an easier week first that adds a week
  const week = { 1: ['Push'], 3: ['Pull'], 5: ['Legs'] }
  const plain = builtPhases({ name: 'P', weeks: 8, week, startedAt: '2026-11-16', easier: false })
  const easy = builtPhases({ name: 'P', weeks: 8, week, startedAt: '2026-11-16', easier: true })
  check('builtPhases: one 8-week build phase', plain.length === 1 && plain[0].name === 'Build' && plain[0].weeks === 8)
  check('builtPhases: the week is copied, not shared', plain[0].week !== week && JSON.stringify(plain[0].week[1]) === '["Push"]')
  check('builtPhases: an easier start adds a week', totalWeeks({ phases: easy }) === 9 && !!easy[0].easier)
  check('builtPhases: survives cleanPhases as the store saves it', totalWeeks({ phases: cleanPhases(easy) }) === 9)

  // the words both apps read
  check('outcomes: three, as the rows say them', Object.values(PLAN_OUTCOME).join('|') === "Worked|Mixed|Didn't work")
  check('Mind plans: group name (B9)', MIND_PLAN.group === 'Mind plans')
  check('filters: days', PLAN_FILTER_DAYS.length === 3)
  check('maintenance: five steps', MAINTENANCE_STEPS.length === 5 && MAINTENANCE_STEPS.every(([h, p]) => !!h && !!p))
  check('guides: split and basics, basics ends with the not-medical-advice note',
    PLAN_GUIDES.map((g) => g.id).join() === 'split,basics' && PLAN_GUIDES[1].paras.at(-1)!.muted === true && PLAN_GUIDES[1].paras.at(-1)!.runs[0][0] === 'General information, not medical advice.')
  check('no em dashes in Plan words', !JSON.stringify([PLAN_OUTCOME, MIND_PLAN, GOAL_CHIP, MAINTENANCE_STEPS, PLAN_GUIDES]).includes('—'))

  // the web's old import paths still answer
  check('PlanSheets re-exports the moved names', sheets.whenLine === whenLine && sheets.planGroups === planGroups && sheets.MIND_PLAN === MIND_PLAN && sheets.PLAN_OUTCOME === PLAN_OUTCOME)
  return bad
}
