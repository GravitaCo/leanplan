/* Plan's shared model and words (src/screens/plan/planModel.ts, src/copy/plan.ts), which the web
   and native Plan screens both read. Run from scripts/test-core.ts (npm test); returns the number
   of failures. */
import type { IfThenPlan, Routine, TrainingPlan } from '@/core/types'
import { SESSIONS, WORKOUTS } from '@/core/data/workouts'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { cleanPhases, phaseRows, phasesOf, positionOn, PLAN_TEMPLATES, totalWeeks, weeksSpan } from '@/core/domain/plans'
import { shiftDay, shortDateOf } from '@/core/domain/date'
import { awaitingNext, dayTarget, planTabModel, builtPhases, detailsLines, goalLabel, keyLine, knownKeys, lastPlanNote, lighterWeekAt, phaseRowDetail, planCardFigure, planCardNote, planGroups, plannedDaysLine, planWeekRows, scheduleWeekRows, whenLine, workoutKind, workoutSub } from '@/screens/plan/planModel'
import { FIRST_PLAN_CUES, GOAL_CHIP, MAINTENANCE_STEPS, MIND_PLAN, PLAN_FILTER_DAYS, PLAN_GUIDES, PLAN_OUTCOME } from '@/copy/plan'
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
  check('first plan cues: label and chip', FIRST_PLAN_CUES.label === 'Cues' && FIRST_PLAN_CUES.chip('lunch') === 'After lunch')
  check('Mind plans: group name (B9)', MIND_PLAN.group === 'Mind plans')
  check('filters: days', PLAN_FILTER_DAYS.length === 3)
  check('maintenance: five steps', MAINTENANCE_STEPS.length === 5 && MAINTENANCE_STEPS.every(([h, p]) => !!h && !!p))
  check('guides: split and basics, basics ends with the not-medical-advice note',
    PLAN_GUIDES.map((g) => g.id).join() === 'split,basics' && PLAN_GUIDES[1].paras.at(-1)!.muted === true && PLAN_GUIDES[1].paras.at(-1)!.runs[0][0] === 'General information, not medical advice.')
  check('no em dashes in Plan words', !JSON.stringify([PLAN_OUTCOME, MIND_PLAN, GOAL_CHIP, MAINTENANCE_STEPS, PLAN_GUIDES]).includes('—'))

  viewModels()
  tabModel()

  // the web's old import paths still answer
  check('PlanSheets re-exports the moved names', sheets.whenLine === whenLine && sheets.planGroups === planGroups && sheets.MIND_PLAN === MIND_PLAN && sheets.PLAN_OUTCOME === PLAN_OUTCOME)
  return bad
}

/* the view models: what each Plan view shows, for one seeded plan at known dates */
function viewModels() {
  const t = PLAN_TEMPLATES.find((x) => x.id === 'pure-muscle-growth')!
  const start = '2026-10-29'
  const plan: TrainingPlan = { id: 'p', name: t.name, source: 'recommended', state: 'active', phases: phasesOf(t), startedAt: start, baseTemplateId: t.id }
  const today = shiftDay(start, 16)
  const pos = positionOn(plan, today)
  const n = totalWeeks(plan)

  const fig = planCardFigure(plan, pos)
  check('card: week 3 of the plan', fig.big === 'Week 3' && fig.small.startsWith(`of ${n} · `), fig)
  check('card: before the start', planCardFigure(plan, null).big === 'Starts' && planCardFigure(plan, null).small === `Thu 29 Oct · ${n} weeks`, planCardFigure(plan, null))
  const lighter = phaseRows(plan, today).find((r) => r.kind === 'lighter' && r.from > pos!.week)
  const note = planCardNote(plan, pos, today)
  check('card note: the next lighter week with its date', !!lighter && note === `Lighter week: week ${lighter.from}, from ${shortDateOf(shiftDay(start, (lighter.from - 1) * 7))}.`, note)
  check('card note: none without a plan', planCardNote(undefined, null, today) === null)

  // maintenance and carrying on
  const withAfter = (full: boolean): TrainingPlan => ({ ...plan, phases: [...plan.phases, { id: 'a', name: full ? 'Carrying on' : 'Maintenance', weeks: 1, after: true, since: shiftDay(start, n * 7), ...(full ? { full: true } : {}), week: {} }] })
  const m = withAfter(false), mPos = (w: number) => positionOn(m, shiftDay(start, n * 7 + (w - 1) * 7))
  check('maintenance: figure', planCardFigure(m, mPos(3)).big === 'Maintenance' && planCardFigure(m, mPos(3)).small === 'week 3')
  check('maintenance: weeks 1 to 7 say lift the same weights', planCardNote(m, mPos(3), '')!.startsWith('Your workouts open on the shorter version'))
  check('maintenance: about 8 weeks', planCardNote(m, mPos(8), '')!.startsWith('About 8 weeks'))
  check('maintenance: about 12 weeks', planCardNote(m, mPos(12), '')!.startsWith('About 12 weeks'))
  const c = withAfter(true)
  check('carrying on: figure and note', planCardFigure(c, positionOn(c, shiftDay(start, n * 7 + 7))).big === 'Carrying on' && planCardNote(c, positionOn(c, shiftDay(start, n * 7 + 7)), '')!.startsWith('Your last week repeats'))

  // the end, with and without a next plan
  const endPos = positionOn(plan, shiftDay(start, n * 7 + 2))
  check('ended: figure', planCardFigure(plan, endPos).big === `${n} weeks` && planCardFigure(plan, endPos).small === 'done')
  check('ended, nothing chosen: awaiting next', awaitingNext(endPos, undefined) && !awaitingNext(endPos, plan) && !awaitingNext(pos, undefined))

  // details lines
  const d = detailsLines(plan, pos, { days: {} }, today)
  check('details: started and ends', d.sub === 'Started Thu 29 Oct · ends ' + d.sub.split(' · ends ')[1] && d.where === `Week 3 of ${n}`, d)
  check('details: not started', detailsLines(plan, null, { days: {} }, start).where === `${n} weeks · starts Thu 29 Oct`)
  check('lighter week: after this week, no earlier than halfway', lighterWeekAt(plan, pos) === Math.ceil(n / 2) + 1)
  const r0 = phaseRows(plan, today)[0]
  check('phase row detail: lifting days', phaseRowDetail(r0, weeksSpan(r0), 1) === `${weeksSpan(r0)} · 1 lifting day` && phaseRowDetail({ ...r0, kind: 'lighter' }, 'Week 7', 3) === 'Week 7 · shorter version')

  // week rows
  const rows = planWeekRows({ 1: ['Push'], 3: ['Pull', 'Cardio'], 5: ['nope'] }, [], 1, 'Today · shorter')
  check('week rows: Monday first, seven days', rows.length === 7 && rows[0].d === 1 && rows[6].d === 0)
  check('week rows: one workout counts exercises, today noted', rows[0].sub === `${WORKOUTS.Push.ex.length} exercises · Today · shorter` && rows[0].label === 'Monday: Push, today', rows[0])
  check('week rows: two workouts joined, no count', rows[2].names.length === 2 && rows[2].sub === '' && rows[2].label.includes(' and '), rows[2])
  check('week rows: an unknown key reads as rest', rows[4].keys.length === 0 && rows[4].label === 'Friday: Rest')
  const sched = scheduleWeekRows({ 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Cardio', 5: 'Legs', 6: 'Rest' }, 4)
  check('schedule rows: cardio today says Today only', sched[3].sub === 'Today' && sched[3].label === 'Thursday: Light cardio, today', sched[3])
  check('schedule rows: rest has no line', sched[1].names.length === 0 && sched[1].sub === '')
  check('schedule rows: cardio on another day has no line', scheduleWeekRows({ 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Cardio', 5: 'Legs', 6: 'Rest' }, 1)[3].sub === '')

  // workout lines and known keys
  const own: Routine = { id: 'r1', name: 'Mine', source: 'custom', modality: 'strength', blocks: [{ slots: [{ exId: 'goblet-squat' }] }] } as Routine
  check('known keys: own workouts kept, unknown dropped', knownKeys(['Push', 'r1', 'gone'], [own]).join() === 'Push,r1')
  check('key line: own workout counts one exercise', keyLine('r1', [own], undefined, false).includes('1 exercise'), keyLine('r1', [own], undefined, false))
  check('key line: ready-made with its kind', keyLine('Cardio', [], undefined, false, true) === `${workoutKind('Cardio')} · ${workoutSub('Cardio')}`)

  check('planned days: none, one, several', plannedDaysLine([]) === 'Not in your week' && plannedDaysLine([1]) === 'Mondays' && plannedDaysLine([1, 3, 5]) === 'Mondays, Wednesdays and Fridays')

  const p1 = { ...plan, id: 'a', reflection: { at: '2026-10-01', change: 'old' } }, p2 = { ...plan, id: 'b', reflection: { at: '2026-11-01', change: 'newer' } }
  check('last plan note: the newest change', lastPlanNote([p1, p2], undefined)?.change === 'newer')
  check('last plan note: hidden stays hidden', lastPlanNote([p1, p2], '2026-11-01') === undefined)
}

/* the Plan tab's model: no plan, a running plan, an ended one, a plan starting later */
function tabModel() {
  const t = PLAN_TEMPLATES.find((x) => x.id === 'pure-muscle-growth')!
  const start = '2026-10-29', today = shiftDay(start, 16)
  const schedule = { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Cardio', 5: 'Legs', 6: 'Rest' } as const
  const plans: IfThenPlan[] = [
    { id: 'a', when: 'I get home hungry', then: 'have a yoghurt', cope: 'keep bars in my bag', created: '2026-10-01', reviews: [{ d: '2026-11-01', r: 'mixed' }] },
    { id: 'm', when: 'after work', then: 'take a walk', created: '2026-11-01', reviews: [], kind: 'mind' },
  ]
  const profile = { ...DEFAULT_PROFILE, goal: 'build-muscle' as const, plans }
  const base = { schedule: { ...schedule }, routines: [], profile }
  const running: TrainingPlan = { id: 'p', name: t.name, source: 'recommended', state: 'active', phases: phasesOf(t), startedAt: start, baseTemplateId: t.id }

  const none = planTabModel({ ...base, trainingPlans: [] }, true, today, 6)
  check('tab, no plan: no card, a suggestion, the repeating week', !none.card && !!none.suggested && !none.planWeek && none.week.length === 7)
  check('tab: counts for the tiles', none.workouts === SESSIONS.length - 1 && none.exercises > 0)
  check('tab: if–then rows with outcome and backup', none.ifThen.length === 1 && none.ifThen[0].sub === "I'll have a yoghurt · Mixed" && none.ifThen[0].backup === 'keep bars in my bag')
  check('tab, wellbeing on: the Mind plan apart', none.mind.length === 1 && none.mind[0].title === 'After work')
  const off = planTabModel({ ...base, trainingPlans: [] }, false, today, 6)
  check('tab, wellbeing off: no Mind group', off.mind.length === 0 && off.ifThen.length === 2)

  const act = planTabModel({ ...base, trainingPlans: [running] }, true, today, 6)
  check('tab, running: the card, the plan week, no suggestion', act.card?.big === 'Week 3' && act.planWeek && !act.suggested && !act.ended && act.card.endLabel === `Week ${totalWeeks(running)}`)
  check('tab, running: tapping a day edits the build week', (() => { const x = dayTarget({ trainingPlans: [running] }, 1, today); return x?.kind === 'plan' && x.planId === 'p' })())
  check('tab, no plan: tapping a day edits the schedule', dayTarget({ trainingPlans: [] }, 3, today)?.kind === 'schedule')

  const ended = planTabModel({ ...base, trainingPlans: [running] }, true, shiftDay(start, totalWeeks(running) * 7 + 1), 6)
  check('tab, ended: the card opens the end and the next-step card shows', !!ended.card?.opensEnd && ended.ended)

  const later = planTabModel({ ...base, trainingPlans: [{ ...running, startedAt: shiftDay(today, 5) }] }, true, today, 6)
  check('tab, starting later: "Starts" and the repeating week until then', later.card?.big === 'Starts' && !later.planWeek)
}
