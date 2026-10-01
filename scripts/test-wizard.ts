/* The first-run wizard and summary (first-run-onboarding §2, §2.1, §3, §8, §10 phase 3, §12, §14;
   Design canvas rows Onboarding 1–5). Run from scripts/test-core.ts (npm test); returns the number
   of failures. The UI only asks and shows: every decision tested here is the one it uses. */
import type { Profile } from '@/core/types'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import {
  HEALTH_STEPS, applyDraft, draftFromProfile, baselineOutcome, dayList, defaultSpread, deficitOf, exposureOf, finishedProfile, loadOf, medicalOutcome, newDraft,
  afterAnswer, outcomeInputs, readinessOutcome, replacementFor, rerunForAnswers, stepsFor, summaryFor, trainingFrom, whyRows, MINUTES_MAP, MOVING_MAP, WIZARD_MIN_AGE, type WizardDraft,
} from '@/core/domain/wizard'
import { clearHealthAnswerIn, confirmPregnancyIn, healthAnswersView, numbersStayHidden, pregnancyReaskDue, PREGNANCY_SNOOZE_DAYS, profileRouting, routeSafety, safetyAnswersFrom, setHealthAnswerIn, snoozePregnancyIn } from '@/core/domain/onboarding'
import { startingTargets } from '@/core/domain/targets'
import { suggestedTargets } from '@/core/domain/nutrition'
import { allWhys, copyIssues, renderWhy } from '@/core/domain/engine'
import { mergeProfiles, MERGED_FIELDS } from '@/core/domain/profileMerge'
import { answerTargets, planFromAnswers } from '@/core/domain/answerTargets'
import { applyHealthWithdrawal, clearHealthData, HEALTH_FIELDS, healthDataSummary, healthWhy, recordConsent, withdraw, withoutHealth } from '@/data/consent'
import { loadDraft, markPendingDeletion, pendingDeletion, pendingExpired, PENDING_MAX_DAYS, saveDraft, underAgeNext, underAgeRetryDelayMs, underAgeRetryDue, underAgeUid, underAgeWipesDevice, UNDER_AGE_MAX_TRIES, type PendingDeletion } from '@/data/onboardingDraft'
import { ensureMeta, stateFromBackup } from '@/data/persistence'
import { PLAN_WHY_SYNC, pullAll, pushDirty, toServerPlan } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { allCopy, CHECKIN, COPY, HEALTH_ANSWERS, NOTES, REDO } from '../src/screens/onboarding/copy'
import { answerRows, clearConfirmLine } from '../src/screens/profile/healthAnswerRows'
import { deleteAccount, refreshFailure, savedSessionUid } from '@/data/account'
import { UNDER_AGE_REASON, newAccount } from '../supabase/functions/_shared/account'
import { wizardDueFor, FIRST_PULL_WAIT_MS } from '@/data/firstRun'
import { readFileSync } from 'node:fs'
import { rangeEngineMinutes, rangeFromMinutes, SESSION_RANGES, warmupMinutes } from '@/core/domain/warmup'
import { planFitLine, sessionLine, warmupFor } from '@/core/domain/wizard'
import { PLAN_TEMPLATES } from '@/core/domain/plans'
import { ifThenOfferDue } from '@/core/domain/insights'
const FN = readFileSync('supabase/functions/delete-account/index.ts', 'utf8')

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

let bad = 0
const report = (area: string, checks: [string, boolean, string?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `wizard: ${area}: ${n}`, !ok && detail ? detail : '') }
}
const TODAY = '2026-09-28'
const AT = '2026-09-28T09:00:00.000Z'

/** Someone who answers everything: 34, lose fat, home with dumbbells and a mat, 3 days, 30 min, knees. */
const full = (x: Partial<WizardDraft> = {}): WizardDraft => ({
  ...newDraft('first', 'seed-1'), step: 'summary', name: 'Sam', age: 34,
  outcomes: { readiness: 'clear', wellbeing: 'clear', baseline: 'ok', medical: 'clear' }, motivations: ['energy', 'stronger'], goal: 'lose-fat',
  height: 172, heightUnit: 'cm', sexAnswer: 'female', weight: 87, weightUnit: 'kg', movement: { kind: 'steps', band: '5k-7.5k' },
  moving: 'now-and-then', experience: 'beginner', daysPerWeek: 3, minutes: 30, where: 'home', kit: ['dumbbell', 'mat'], enjoy: ['walking'], areas: ['knees'],
  ...x,
})
const ctx = { healthConsent: true, today: TODAY }

function steps(): void {
  const d = full()
  const s = stepsFor(d, true)
  report('steps', [
    ['s-ob1 order, then the setup card, then the summary', s.join() === 'intro,name,age,ready,why,goal,lately,wellbeing,body,medical,weight,move,handoff,moving,confidence,days,minutes,where,kit,enjoy,areas,plan-intro,summary', s.join()],
    ['the medical question only when the goal means eating less', !stepsFor(full({ goal: 'build-muscle' }), true).includes('medical')],
    ['18+ for now (Benn): 17 gets the kind stop too; 18 goes on', stepsFor(full({ age: 17 }), true).slice(-1)[0] === 'under16' && WIZARD_MIN_AGE === 18 && stepsFor(full({ age: 18 }), true).includes('ready')],
    ['under 16: the kind stop, and nothing after it', stepsFor(full({ age: 15 }), true).slice(-1)[0] === 'under16' && !stepsFor(full({ age: 15 }), true).includes('ready')],
    ['readiness yes: the gentle-start screen straight after', stepsFor(full({ outcomes: { readiness: 'flagged' } }), true).join().includes('ready,ready-note,why')],
    ['pregnant: the pregnancy screen instead', stepsFor(full({ outcomes: { readiness: 'flagged' }, pregnant: true }), true).join().includes('ready,pregnancy-note,why')],
    ['wellbeing yes or sometimes: its signposting screen', stepsFor(full({ outcomes: { wellbeing: 'flagged' } }), true).join().includes('wellbeing,wellbeing-note,body')],
    ['Onboarding 9: Sometimes, stored apart, keeps the signposting screen', stepsFor(full({ outcomes: { wellbeing: 'sometimes' } }), true).join().includes('wellbeing,wellbeing-note,body')],
    ['medical flagged: its screen after the question', stepsFor(full({ outcomes: { medical: 'flagged' } }), true).join().includes('medical,medical-note,weight')],
    ['Later: the setup card is left out', !stepsFor(full({ later: true }), true).includes('moving')],
    ['a gym: no kit screen', !stepsFor(full({ where: 'gym' }), true).includes('kit')],
    ['skip on the intro: age only', stepsFor({ ...newDraft('first', 's'), skipped: true }, true).join() === 'intro,skip-age'],
    ['no local health consent: no health question is asked', stepsFor(d, false).every((x) => !HEALTH_STEPS.includes(x))],
    ['the setup card alone', stepsFor(newDraft('setup', 's'), true).join() === 'moving,confidence,days,minutes,where,kit,enjoy,areas,summary'],
  ])
}

function outcomes(): void {
  report('outcomes only', [
    ['readiness: any yes flags, all no clears, anything else is skipped', readinessOutcome([false, true, false]) === 'flagged' && readinessOutcome([false, false, false]) === 'clear' && readinessOutcome([false, undefined, false]) === undefined],
    ['lately: poor sleep, high stress or little room is low; nothing picked is skipped', baselineOutcome({ sleep: 'mixed', stress: 'some', room: 'some' }) === 'ok' && baselineOutcome({ room: 'little' }) === 'low' && baselineOutcome({}) === undefined],
    ['medical: a tick flags, "None of these" clears', medicalOutcome(1, false) === 'flagged' && medicalOutcome(0, true) === 'clear' && medicalOutcome(0, false) === undefined],
    ['the engine reads outcomes, never raw answers', JSON.stringify(outcomeInputs({ baseline: 'low', wellbeing: 'undisclosed', readiness: 'flagged' })) === JSON.stringify({ readiness: 'flagged', lately: { sleep: 'poor' }, wellbeing: 'rather-not-say' })],
  ])
  const p = applyDraft(DEFAULT_PROFILE, full(), TODAY, AT)
  const allowed = new Set(['name', 'sex', 'age', 'height', 'weight', 'activityLevel', 'supplements', 'notificationsEnabled', 'goal', 'training', 'sexAnswer', 'units', 'motivations', 'movement', 'outcomes', 'answeredAt'])
  const raw = JSON.stringify(p)
  report('outcomes only', [
    ['the saved profile holds answers and outcomes, nothing else', Object.keys(p).every((k) => allowed.has(k)), Object.keys(p).join()],
    ['no raw screener answers anywhere (sleep, stress, room, the readiness items, conditions)', !/"sleep"|"stress"|"room"|chest|dizz|surgery|insulin|kidney|semaglutide/i.test(raw)],
    ['outcomes as §8 lists them', JSON.stringify(p.outcomes) === JSON.stringify({ readiness: 'clear', medical: 'clear', wellbeing: 'clear', baseline: 'ok' })],
    ['every answered field carries its time for the per-field merge', ['goal', 'age', 'outcomes.readiness', 'training.daysPerWeek', 'training.limitations'].every((f) => p.answeredAt?.[f] === AT)],
    ['wellbeing yes: gentle mode on', applyDraft(DEFAULT_PROFILE, full({ outcomes: { wellbeing: 'flagged' } }), TODAY).gentle === true],
    ['pregnancy: the flag and when it was asked', JSON.stringify(applyDraft(DEFAULT_PROFILE, full({ pregnant: true }), TODAY).pregnancy) === JSON.stringify({ flagged: true, askedAt: TODAY })],
    ['a skipped answer on a re-run clears the old one', applyDraft({ ...DEFAULT_PROFILE, goal: 'lose-fat', movement: { kind: 'job', job: 'desk' } }, { ...full(), movement: undefined }, TODAY).movement === undefined],
    ['setup card: only training changes', (() => { const q = applyDraft({ ...DEFAULT_PROFILE, age: 50, goal: 'feel-better' }, { ...newDraft('setup', 's'), daysPerWeek: 2 }, TODAY); return q.age === 50 && q.goal === 'feel-better' && q.training?.daysPerWeek === 2 })()],
    ['board options onto the engine: 15 minutes builds 10, "most weeks" starts as "some"', MINUTES_MAP[15] === 10 && MOVING_MAP['most-weeks'] === 'some' && MOVING_MAP['three-plus'] === 'regularly'],
    ['weekdays set the count; "Nothing, just me" is no kit; walking is cardio and a cardio preference',
      (() => { const t = trainingFrom(full({ weekdays: [5, 1], kit: ['nothing'] })); return t.daysPerWeek === 2 && JSON.stringify(t.weekdays) === '[1,5]' && JSON.stringify(t.equipment) === '[]' && t.modalities?.includes('cardio') && t.cardioPrefs?.includes('walking') })()],
  ])
}

function summary(): void {
  const d = full()
  const m = summaryFor(DEFAULT_PROFILE, d, ctx)
  const routing = routeSafety(safetyAnswersFrom(m.profile, 87, true))
  const expect = startingTargets(m.profile, loadOf(m.result, 'lose-fat'), routing, 87)
  const done = finishedProfile(m, d, AT, TODAY, DEFAULT_PROFILE)
  const sug = suggestedTargets(done, 87, routing)
  report('summary', [
    ['a generated week, "Built from your answers"', !m.result.starter && m.result.plan.label === 'built-from-answers'],
    ['the numbers are startingTargets for the plan it shows', m.targets.kcal === expect.kcal && JSON.stringify(m.targets.maintenance) === JSON.stringify(expect.maintenance) && m.targets.kcal != null, `${m.targets.kcal} vs ${expect.kcal}`],
    ['the deficit the targets set reaches the engine', m.inputs.deficit === deficitOf(m.targets.adjustPct) && deficitOf(-25) === 'big' && deficitOf(-12) === 'moderate' && deficitOf(0) === 'none'],
    ['finishing: onboardedAt, and the multiplier the summary used', done.onboardedAt === AT && done.activityMult === m.targets.effectiveMultiplier && !!done.activityLevel],
    ['Profile\'s targets match the summary afterwards (same kcal)', !!sug && 'kcal' in sug && sug.kcal === m.targets.kcal, JSON.stringify(sug)],
    ['the plan lands on the default spread for 3 days', dayList(m.result.plan.weekdays) === 'Monday, Wednesday, Friday'],
  ])
  const rows = whyRows(m, d)
  const texts = rows.flatMap((r) => [r.title, r.sub, ...(r.lines ?? []), ...r.whys.map(renderWhy)])
  report('summary why rows', [
    ['every row but the warm-up (s-ob8 point 4) carries the engine\'s own reasons', rows.length >= 4 && rows[0].key === 'warmup' && rows.slice(1).every((r) => r.whys.length > 0), rows.map((r) => r.key + ':' + r.whys.length).join()],
    ['every reason shown is one the plan has', rows.every((r) => r.whys.every((w) => allWhys(m.result).some((x) => JSON.stringify(x) === JSON.stringify(w))))],
    ['knees: the row names them', rows.some((r) => r.key === 'areas' && /knees/.test(r.title))],
    ['copy lint on every row and reason', texts.every((t) => !copyIssues(t).length), texts.filter((t) => copyIssues(t).length).join(' | ')],
  ])

  const starter = summaryFor(DEFAULT_PROFILE, full({ later: true, moving: undefined, experience: undefined, daysPerWeek: undefined, minutes: undefined, where: undefined, kit: undefined, enjoy: undefined, areas: undefined }), ctx)
  const skipped = summaryFor(DEFAULT_PROFILE, { ...newDraft('first', 's2'), skipped: true, age: 30 }, ctx)
  report('summary: Starter week', [
    ['no training answers: the Starter week, labelled as such', starter.result.starter && starter.result.plan.label === 'starter-week' && whyRows(starter, full({ later: true })).length === 3],
    ['skip on the intro: Starter week with no calorie numbers', skipped.result.starter && skipped.targets.kcal === null && skipped.targets.hidden != null],
  ])
  const noW = summaryFor(DEFAULT_PROFILE, full({ weight: undefined }), ctx)
  const gentle = summaryFor(DEFAULT_PROFILE, full({ outcomes: { wellbeing: 'flagged' } }), ctx)
  const preg = summaryFor(DEFAULT_PROFILE, full({ outcomes: { readiness: 'flagged' }, pregnant: true }), ctx)
  const med = summaryFor(DEFAULT_PROFILE, full({ outcomes: { medical: 'flagged', readiness: 'clear', wellbeing: 'clear', baseline: 'ok' } }), ctx)
  const teen = summaryFor(DEFAULT_PROFILE, full({ age: 17 }), ctx)
  const noNumbers = (x: typeof noW) => x.targets.kcal === null && x.targets.maintenance === null && x.targets.protein === null
  report('summary: safety routes', [
    ['no weight: no calorie or protein number (ob3-3)', noNumbers(noW) && noW.targets.hidden === 'no-weight'],
    ['wellbeing yes: gentle, no number (ob4-7)', noNumbers(gentle) && gentle.targets.hidden === 'gentle' && gentle.routing.gentle],
    ['pregnant: maintenance only, no number, gentler start', noNumbers(preg) && preg.targets.hidden === 'pregnancy' && preg.routing.maintenanceOnly && preg.routing.gentlerStart],
    ['medical: held at maintenance, no high-protein anchor', med.targets.heldAtMaintenance && med.targets.protein?.anchor === false && (med.targets.adjustPct ?? -1) >= 0],
    ['17 (no 16–17 tier): the stop, no numbers', teen.routing.stop === 'under16' && noNumbers(teen) && teen.targets.hidden === 'under16'],
  ])
  const thin = summaryFor(DEFAULT_PROFILE, full({ weight: 50, height: 172 }), ctx)
  report('summary: BMI under 18.5', [
    ['lose fat, BMI 16.9: food held at maintenance, a number still shown', thin.routing.reasons.includes('low-bmi') && thin.routing.noDeficit && thin.targets.kcal != null && (thin.targets.adjustPct ?? -1) >= 0 && thin.targets.heldAtMaintenance],
    ['and the engine gets no deficit', thin.inputs.deficit === undefined || thin.inputs.deficit === 'none'],
  ])
  const one = summaryFor(DEFAULT_PROFILE, full({ daysPerWeek: undefined, weekdays: [3] }), ctx)
  const oneDefault = summaryFor(DEFAULT_PROFILE, full({ daysPerWeek: 1, weekdays: undefined }), ctx)
  report('summary: a 1-day week', [
    ['one session, on the day picked', one.result.plan.sessions.filter((s) => !s.optional).length === 1 && one.result.plan.weekdays[0] === 3],
    ['1 day, no weekday picked: Wednesday (§2)', oneDefault.result.plan.weekdays.join() === '3' && defaultSpread(1) === 'Wednesday'],
    ['its row says so in Benn\'s words', whyRows(one, full({ weekdays: [3] })).some((r) => r.key === 'days' && r.whys.map(renderWhy).includes("One day is a good start. A second day adds more when you're ready, if you'd like."))],
  ])
  // ob2-4 and s-ob8 point 4: session length as a range, and the warm-up it includes
  report('session range and warm-up', [
    ['warm-up minutes by range: 4, 5, 6, 8, 10', SESSION_RANGES.map(warmupMinutes).join() === '4,5,6,8,10', SESSION_RANGES.map(warmupMinutes).join()],
    ['each range gives the engine one of its lengths', SESSION_RANGES.map(rangeEngineMinutes).join() === '20,30,45,60,60'],
    ['an older stored length reads back as a range', [10, 20, 30, 45, 60].map(rangeFromMinutes).join() === '15-20,15-20,20-30,30-45,60+'],
    ['the range is saved beside the engine length', (() => { const t = trainingFrom(full({ sessionRange: '30-45', minutes: 45 })); return t.sessionRange === '30-45' && t.minutesPerSession === 45 })()],
    ['a skipped length: the engine’s 30 minutes, a 5-minute warm-up', warmupFor({}) === 5 && warmupFor({ sessionRange: '60+' }) === 10],
    ['a redo with an older length keeps the profile as it was', (() => {
      const base: Profile = { ...DEFAULT_PROFILE, age: 34, goal: 'lose-fat', training: { minutesPerSession: 45 } }
      const dr = draftFromProfile(base, 'seed', { healthConsent: true, weight: 80 })
      return dr.sessionRange === '30-45' && applyDraft(base, dr, TODAY).training?.sessionRange === undefined && applyDraft(base, { ...dr, sessionRange: '45-60', minutes: 60 }, TODAY).training?.sessionRange === '45-60'
    })()],
    ['week row line', sessionLine({ slots: new Array(5), mins: 30 }, false) === 'Warm-up, then 5 exercises · about 30 min' && sessionLine({ slots: new Array(5), mins: 30 }, true) === 'Warm-up, then 5 exercises · no equipment'],
  ])
  // ob3-6: how each Tali plan fits 3 days at home (the lines drawn)
  const fit = Object.fromEntries(PLAN_TEMPLATES.map((t) => [t.id, planFitLine(t, full(), 3)]))
  report('other plans', [
    ['Full body system', fit['full-body-system'] === 'Fits your 3 days · needs a gym', fit['full-body-system']],
    ['Pure muscle growth', fit['pure-muscle-growth'] === 'Needs 6 days from week 3 · gym', fit['pure-muscle-growth']],
    ['Stronger with age', fit['stronger-with-age'] === 'Fits your 3 days · dumbbells, chair, wall', fit['stronger-with-age']],
    ['at a gym', planFitLine(PLAN_TEMPLATES.find((t) => t.id === 'full-body-system')!, full({ where: 'gym' }), 3) === 'Fits your 3 days · at your gym'],
    ['a chosen plan is kept in the draft only', trainingFrom(full({ planChoice: 'full-body-system' })).place?.join() === 'home'],
  ])
  // ob5-4: once, after the first workout
  const ses = { days: { [TODAY]: { foods: [], supps: {}, sessions: [{ id: 's1', modality: 'strength', at: AT }] } } } as any
  const onb = { ...DEFAULT_PROFILE, onboardedAt: AT }
  report('if-then offer', [
    ['after the first workout', ifThenOfferDue({ profile: onb, ...ses })],
    ['not before one', !ifThenOfferDue({ profile: onb, days: {} })],
    ['never again once used or waved off', !ifThenOfferDue({ profile: { ...onb, ifThenOffered: true }, ...ses })],
    ['not with a plan already', !ifThenOfferDue({ profile: { ...onb, plans: [{ id: 'p', when: 'x', then: 'y', created: TODAY, reviews: [] }] } as Profile, ...ses })],
    ['not without setup', !ifThenOfferDue({ profile: DEFAULT_PROFILE, ...ses })],
    ['a workout from before setup does not count', !ifThenOfferDue({ profile: onb, days: { '2025-03-01': ses.days[TODAY] } } as any)],
  ])
  // the summary's shortcuts back into the questions never skip a safety screen (ship-critic B1)
  const ret = (x: Partial<WizardDraft>) => afterAnswer(full({ ...x, ret: 'summary' }), true)
  report('summary shortcuts', [
    ['plain answer: straight back to the summary', ret({ step: 'weight' }).step === 'summary'],
    ['health answers, now a yes: the gentle-start screen first', ret({ step: 'ready', outcomes: { readiness: 'flagged' } }).step === 'ready-note'],
    ['and its Continue returns to the summary', afterAnswer({ ...full({ outcomes: { readiness: 'flagged' } }), step: 'ready-note', ret: 'summary' }, true).step === 'summary'],
    ['an under-18 age: the stop, not the summary', ret({ step: 'age', age: 17 }).step === 'under16'],
    ['wellbeing Yes or Sometimes from the summary: its note first, never skipped', ret({ step: 'wellbeing', outcomes: { wellbeing: 'flagged' } }).step === 'wellbeing-note' && ret({ step: 'wellbeing', outcomes: { wellbeing: 'sometimes' } }).step === 'wellbeing-note'],
    ['the engine reads Sometimes as Sometimes (gentle training, as before)', outcomeInputs({ wellbeing: 'sometimes' }).wellbeing === 'sometimes' && outcomeInputs({ wellbeing: 'flagged' }).wellbeing === 'yes'],
  ])
  // the estimate's ±15% is an uncertainty, not a score: Benn approved it in these words (ob9-1, ob9-5)
  const linted = (t: string) => copyIssues(t.replace(/15% out either way/g, 'a sixth out either way'))
  report('copy lint', [['every wizard, summary and signposting line', allCopy().every((t) => !linted(t).length), allCopy().filter((t) => linted(t).length).join(' | ')]])
}

async function sync(fakeServer: FakeServer): Promise<void> {
  // two devices answer different questions offline; both sync; every answer survives
  const base: Profile = { ...DEFAULT_PROFILE }
  const a = applyDraft(base, { ...newDraft('setup', 'a'), daysPerWeek: 4 }, TODAY, '2026-09-28T10:00:00.000Z')
  const b = applyDraft(base, { ...newDraft('setup', 'b'), minutes: 45 }, TODAY, '2026-09-28T10:05:00.000Z')
  // A's own unanswered minutes must not wipe B's answer (and vice versa)
  delete a.training!.minutesPerSession; delete b.training!.daysPerWeek
  const m1 = mergeProfiles(b, a)
  const newer = mergeProfiles({ ...a, goal: 'feel-better', answeredAt: { ...a.answeredAt, goal: '2026-09-28T11:00:00.000Z' } }, { ...a, goal: 'lose-fat', answeredAt: { ...a.answeredAt, goal: '2026-09-28T09:00:00.000Z' } })
  const plain = mergeProfiles({ ...DEFAULT_PROFILE, name: 'Mine' }, { ...DEFAULT_PROFILE, name: 'Theirs' })
  report('multi-device merge', [
    ['answers from two devices both survive', m1.training?.daysPerWeek === 4 && m1.training?.minutesPerSession === 45, JSON.stringify(m1.training)],
    ['the latest answer to the same question wins', newer.goal === 'feel-better'],
    ['without stamps nothing changes (this device wins, as before)', plain.name === 'Mine'],
    ['only the listed fields are ever merged', !MERGED_FIELDS.some((f) => f.includes('__proto__')) && mergeProfiles(DEFAULT_PROFILE, { answeredAt: { '__proto__.x': AT } as never }).name === ''],
  ])

  // through sync: device B pushes after device A; A's answer on the server is kept
  const rows: Record<string, any[]> = { settings: [{ user_id: LOCAL_USER, target: {}, schedule: {}, profile: { ...a, onboardedAt: '2026-09-28T10:00:00.000Z', answeredAt: { ...a.answeredAt, onboardedAt: '2026-09-28T10:00:00.000Z' } } }], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [] }
  const s = stateFromBackup({ days: {} } as never)
  s.profile = b
  s.consents = { records: [{ id: '0b8f7a2e-1c4d-4e5f-8a9b-0c1d2e3f4a5b', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
  const meta = ensureMeta(s, false); meta.settings.dirty = true
  const f = fakeServer(rows)
  const real = globalThis.fetch
  globalThis.fetch = f.fetchFn
  try { await pushDirty(s, meta); await pullAll(s, meta) } finally { globalThis.fetch = real }
  const srv = rows.settings[0].profile
  report('multi-device merge', [
    ['sync: both devices\' answers end up on the server and here', srv.training.daysPerWeek === 4 && srv.training.minutesPerSession === 45 && s.profile.training?.daysPerWeek === 4, JSON.stringify(srv.training)],
    ['onboardedAt from the other device reaches this one (its wizard stays away)', s.profile.onboardedAt === '2026-09-28T10:00:00.000Z'],
  ])

  // plan reasons: off until the migration; a pull keeps the device's copy
  const plan = summaryFor(DEFAULT_PROFILE, full(), ctx).result.plan.trainingPlan
  const s2 = stateFromBackup({ days: {} } as never)
  s2.trainingPlans = [{ ...plan, startedAt: TODAY }]
  const meta2 = ensureMeta(s2, false)
  const rows2: Record<string, any[]> = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [{ ...toServerPlan(plan, LOCAL_USER), updated_at: 'x' }] }
  globalThis.fetch = fakeServer(rows2).fetchFn
  try { await pullAll(s2, meta2) } finally { globalThis.fetch = real }
  report('plan why sync', [
    ['PLAN_WHY_SYNC is on (2026-09-plan-why.sql applied), and off sends no why', PLAN_WHY_SYNC === true && !('why' in toServerPlan(plan, LOCAL_USER, false))],
    ['with it on, the reasons go in the new column', JSON.stringify((toServerPlan(plan, LOCAL_USER, true) as { why?: unknown }).why) === JSON.stringify(plan.why)],
    ['a pull without the column keeps this device\'s reasons', JSON.stringify(s2.trainingPlans[0].why) === JSON.stringify(plan.why) && !!plan.why?.length],
    ['no reasons on this device (why undefined): no why sent, the server\'s copy stays', (() => { const { why: _w, ...bare } = plan; void _w; return !('why' in toServerPlan(bare, LOCAL_USER, true)) })()],
    ['an empty list (a withdrawal) is sent as null, clearing the server\'s copy', (toServerPlan({ ...plan, why: [] }, LOCAL_USER, true) as { why?: unknown }).why === null],
  ])
  // a push with both kinds: two requests, each one shape, and the server keeps the reasons it had
  {
    const { why: _w, ...bare } = plan; void _w
    const s3 = stateFromBackup({ days: {} } as never)
    s3.trainingPlans = [{ ...bare, id: 'aaaaaaaa-0000-4000-8000-00000000000b', startedAt: TODAY, _dirty: true }, { ...plan, id: 'aaaaaaaa-0000-4000-8000-00000000000c', startedAt: TODAY, _dirty: true }]
    const meta3 = ensureMeta(s3, false)
    const serverWhy = [{ code: 'goal', about: 'plan' }]
    const rows3: Record<string, any[]> = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [{ id: 'aaaaaaaa-0000-4000-8000-00000000000b', user_id: LOCAL_USER, why: serverWhy }] }
    const bodies: unknown[][] = []
    const inner = fakeServer(rows3).fetchFn
    globalThis.fetch = (async (url: string, o: RequestInit = {}) => { if (o.method === 'POST' && String(url).includes('/training_plans')) bodies.push(JSON.parse(String(o.body))); return inner(url as never, o) }) as typeof fetch
    try { await pushDirty(s3, meta3) } finally { globalThis.fetch = real }
    const shapes = bodies.map((b) => [...new Set(b.map((r) => 'why' in (r as object)))])
    report('plan why sync', [
      ['mixed plans go as two requests, each of one shape', bodies.length === 2 && shapes.every((x) => x.length === 1), JSON.stringify(shapes)],
      ['the plan without reasons leaves the server\'s reasons as they were', JSON.stringify(rows3.training_plans.find((r) => r.id === 'aaaaaaaa-0000-4000-8000-00000000000b')?.why) === JSON.stringify(serverWhy)
        && JSON.stringify(rows3.training_plans.find((r) => r.id === 'aaaaaaaa-0000-4000-8000-00000000000c')?.why) === JSON.stringify(plan.why), JSON.stringify(rows3.training_plans.map((r) => [r.id, r.why]))],
    ])
  }
}

function withdrawal(): void {
  // compliance (Sept 2026): every onboarding answer is health data; withdrawing clears them all
  const s = stateFromBackup({ days: {} } as never)
  const m = summaryFor(DEFAULT_PROFILE, full({ pregnant: true, outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'low', medical: 'flagged' } }), ctx)
  s.profile = finishedProfile(m, full({ pregnant: true, outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'low', medical: 'flagged' } }), AT, TODAY, DEFAULT_PROFILE)
  s.profile.activityMult = s.profile.activityMult ?? 1.4
  s.profile.training = { ...s.profile.training, exPrefs: { liked: ['goblet-squat'] } }
  const meta = ensureMeta(s, false); meta.settings.dirty = false
  const hs = healthDataSummary(s), before = hs.profileFields + hs.trainingPrefs
  clearHealthData(s, meta)
  const p = s.profile
  // the plan's health-derived reasons go too, from workouts and plans, marked to sync
  const gen = summaryFor(DEFAULT_PROFILE, full({ outcomes: { readiness: 'flagged', baseline: 'low', wellbeing: 'clear', medical: 'clear' } }), ctx).result.plan
  const s2 = stateFromBackup({ days: {} } as never)
  s2.profile = { ...DEFAULT_PROFILE, height: 170 }
  s2.routines = structuredClone(gen.routines).map((r) => ({ ...r, _dirty: false }))
  s2.trainingPlans = [{ ...structuredClone(gen.trainingPlan), _dirty: false }]
  const every = (st: typeof s2) => [...st.trainingPlans.flatMap((p) => p.why ?? []), ...st.routines.flatMap((r) => [...(r.why ?? []), ...r.blocks.flatMap((b) => b.slots.flatMap((x) => x.why ?? []))])]
  const hadHealth = every(s2).filter(healthWhy).length
  const routinesWith = s2.routines.filter((r) => [...(r.why ?? []), ...r.blocks.flatMap((b) => b.slots.flatMap((x) => x.why ?? []))].some(healthWhy)).map((r) => r.id)
  clearHealthData(s2, ensureMeta(s2, false))
  report('withdrawal strips health-derived reasons', [
    ['the plan had some (areas, readiness, the lately baseline)', hadHealth > 0 && every(s2).length > 0, String(hadHealth)],
    ['none left in workouts or the plan', every(s2).filter(healthWhy).length === 0 && !JSON.stringify(every(s2)).includes('knees')],
    ['what changed is marked to sync (and only that)', s2.routines.every((r) => !!r._dirty === routinesWith.includes(r.id)) && s2.trainingPlans[0]._dirty === true],
  ])
  report('withdrawal clears the onboarding answers', [
    ['HEALTH_FIELDS names them', ['profile.outcomes', 'profile.pregnancy', 'profile.motivations', 'profile.height', 'profile.movement', 'profile.activityMult', 'profile.training'].every((f) => (HEALTH_FIELDS as readonly string[]).includes(f))],
    ['outcomes, pregnancy, why, body, movement, multiplier and training prefs are gone',
      !p.outcomes && !p.pregnancy && !p.motivations && p.height === null && !p.sexAnswer && !p.movement && !p.activityMult && !p.deficitChosen && !Object.keys(p.training ?? {}).length, JSON.stringify(p)],
    ['the activity level set from movement goes back to the default with the multiplier', p.activityLevel === 'light' && p.answeredAt?.activityLevel !== AT],
    ['counted before, nothing left after', before >= 8 && healthDataSummary(s).profileFields === 0 && healthDataSummary(s).trainingPrefs === 0],
    ['the clear is stamped, so an older copy elsewhere can\'t bring an answer back', p.answeredAt?.['outcomes.readiness'] !== AT && !!p.answeredAt?.['training.limitations'] && meta.settings.dirty],
    ['age stays (the one required answer), as does the goal', p.age === 34 && p.goal === 'lose-fat'],
    ['a patch saved without consent drops the health fields', (() => { const x = withoutHealth({ name: 'A', height: 180, outcomes: { readiness: 'clear' }, training: { daysPerWeek: 3 } }); return x.name === 'A' && x.height === undefined && !x.outcomes && !x.training })()],
  ])
}

function firstSession(): void {
  const t = { place: ['home' as const], equipment: ['dumbbell' as const] }
  const plan = summaryFor(DEFAULT_PROFILE, full(), ctx).result.plan
  const slot = plan.sessions[0].slots[0]
  const r = replacementFor(slot.exId, t, plan.sessions[0].slots.map((x) => x.exId))
  const x = r ? EXERCISE_BY_ID[r] : null
  const days = { '2026-09-21': { foods: [], supps: {}, weight: null, workout: null, sessions: [{ id: 's', modality: 'strength' as const, title: 'A', ex: [{ name: 'Goblet', exId: 'goblet-squat', sets: [{ w: '8', reps: '10' }, { w: '8', reps: '10', feel: 'spare' as const }] }] }] } }
  const ex = exposureOf(days, TODAY, 'goblet-squat')
  report('first-session moments', [
    ['thumbs down: something else for the same slot, with the kit they have', !!x && x.id !== slot.exId && (!x.equipment.length || x.equipment.some((q) => ['bodyweight', 'mat', 'dumbbell'].includes(q))), String(r)],
    ['never a disliked one', replacementFor(slot.exId, { ...t, exPrefs: { disliked: r ? [r] : [] } }, []) !== r],
    ['find your weight: earlier sessions and how the last set felt', ex.n === 1 && ex.last?.w === '8' && ex.last?.feel === 'spare' && exposureOf(days, '2026-09-21', 'goblet-squat').n === 0],
  ])
}

async function underAgeDeletion(): Promise<void> {
  const now = Math.floor(Date.parse('2026-09-28T12:00:00Z') / 1000)
  const sent: unknown[] = []
  const deps = { online: () => true, hasSession: () => true, fresh: () => false, accountMatches: () => true, wipe: () => {}, signOut: async () => {},
    call: async (reason?: string) => { sent.push(reason); return { status: 200, body: { ok: true } } } }
  const stale = await deleteAccount(deps)
  const minor = await deleteAccount(deps, UNDER_AGE_REASON)
  report('under-age deletion (delete-account v2, security-data SAFE)', [
    ['a new account (under 24 h, from Auth) skips the re-auth window', newAccount('2026-09-28T02:00:00Z', now) && !newAccount('2026-09-27T11:59:00Z', now)],
    ['fails closed: no or odd created_at, or one in the future', !newAccount(undefined, now) && !newAccount('soon', now) && !newAccount('2026-09-29T12:00:00Z', now)],
    ['the app asks for it only for the age stop, and the server decides', stale.status === 'reauth' && minor.status === 'ok' && JSON.stringify(sent) === JSON.stringify(['under-age'])],
    ['the function checks created_at itself and refuses any other reason', /UNDER_AGE_REASON && newAccount\(who\.data\.user\.created_at/.test(FN) && /body\.reason !== UNDER_AGE_REASON\) return fail\('bad_request'\)/.test(FN)],
  ])
}

/** A Map-backed localStorage for the device-only keys (tali.onboarding, tali.pendingDelete). */
function withFakeStorage(run: (ls: Storage) => void): void {
  const m = new Map<string, string>()
  const ls = {
    get length() { return m.size }, key: (i: number) => [...m.keys()][i] ?? null, clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)) }, removeItem: (k: string) => { m.delete(k) },
  } as Storage
  const g = globalThis as { localStorage?: Storage }
  const had = g.localStorage
  g.localStorage = ls
  try { run(ls) } finally { if (had) g.localStorage = had; else delete g.localStorage }
}

async function compliance(): Promise<void> {
  // register item 34: the notes say what is kept (Benn approved the wording, 28 Sept 2026)
  const lines = allCopy().join('\n')
  const KEPT = 'We keep your answer (yes, no or rather not say) to keep things gentle. Nothing more.'
  report('what the notes say is kept (register 34)', [
    ['the health check: a short note of what applies, never a medical record', COPY.ready?.note === 'We keep a short note of what applies (like pregnancy), never a medical record.'],
    ['wellbeing: the answer is kept, on the question and on its note', !!COPY.wellbeing?.why?.endsWith(KEPT) && NOTES.wellbeing.note.endsWith(KEPT)],
    ['no line still claims only the result or only gentle mode is kept', !/never your answers|whether gentle mode is on|whether that’s on/i.test(lines)],
  ])

  // register item 35: a health withdrawal also removes the unfinished onboarding draft
  withFakeStorage((ls) => {
    const draft: WizardDraft = { ...full(), step: 'weight', pregnant: true, outcomes: { readiness: 'flagged' } }
    const s = stateFromBackup({ days: {} } as never)
    recordConsent(s, 'health', true)
    saveDraft(draft)
    const hadIt = !!loadDraft()
    recordConsent(s, 'ai', true); withdraw(s, ensureMeta(s, false), 'ai')
    const keptOnOther = !!loadDraft()
    withdraw(s, ensureMeta(s, false), 'health')
    const goneHere = !loadDraft() && ls.getItem('tali.onboarding') === null
    // a withdrawal made on another device and pulled here clears it too
    const s2 = stateFromBackup({ days: {} } as never)
    recordConsent(s2, 'health', true); saveDraft(draft)
    recordConsent(s2, 'health', false)
    const applied = applyHealthWithdrawal(s2, ensureMeta(s2, false))
    report('a health withdrawal clears the onboarding draft (register 35)', [
      ['the draft held health answers', hadIt],
      ['withdrawing another consent leaves it', keptOnOther],
      ['withdrawing health on this phone removes it', goneHere],
      ['a withdrawal from another device removes it once seen', applied && !loadDraft()],
    ])
  })

  // register item 37: under-age deletion always ends, and never touches another account's data
  const U = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222'
  const p0: PendingDeletion = { uid: U, at: AT }
  const now = Date.parse(AT)
  let p: PendingDeletion = p0, tries = 0, stopped = false
  for (let i = 0; i < 20 && !stopped; i++) {
    const st = underAgeNext('unavailable', p, now)
    if (st.kind === 'sign-in') { stopped = true; p = st.pending } else if (st.kind === 'wait') { p = st.pending; tries++ }
  }
  const reauth = underAgeNext('reauth', { uid: U, at: AT, tries: 2, next: now + 5, stage: 'retry' }, now)
  const again = underAgeNext('reauth', { uid: U, at: AT, stage: 'sign-in' }, now)
  report('under-age deletion ends safely (register 37)', [
    ['a re-auth refusal (account over 24 h) stops at once: sign in again', reauth.kind === 'sign-in' && reauth.pending.stage === 'sign-in' && reauth.pending.uid === U && !reauth.pending.tries],
    ['other failures back off (1, 2, 4 … min, at most an hour)', underAgeRetryDelayMs(1) === 60_000 && underAgeRetryDelayMs(2) === 120_000 && underAgeRetryDelayMs(3) === 240_000 && underAgeRetryDelayMs(20) === 3_600_000],
    ['and stop after a cap, never for ever', stopped && tries === UNDER_AGE_MAX_TRIES - 1 && p.stage === 'sign-in', String(tries)],
    ['no connection or a busy sync counts nothing', (() => { const x = underAgeNext('offline', { uid: U, at: AT, tries: 3 }, now); const y = underAgeNext('busy', p0, now); return x.kind === 'wait' && x.pending.tries === 3 && y.kind === 'wait' && !y.pending.tries })()],
    ['success forgets it', underAgeNext('ok', p0, now).kind === 'done'],
    ['a backed-off try waits; at the sign-in stage the fresh sign-in tries straight away', !underAgeRetryDue({ ...p0, next: now + 1000 }, now) && underAgeRetryDue({ ...p0, next: now + 1000 }, now + 1000)
      && underAgeRetryDue({ ...p0, stage: 'sign-in', next: now + 999_999 }, now) && underAgeRetryDue(p0, now)],
    ['a fresh sign-in that is refused again asks again (never loops by itself)', again.kind === 'sign-in'],
    ['wipes this device for the under-age account, or when nobody owns it yet (new device)', underAgeWipesDevice(U, U) && underAgeWipesDevice(undefined, U)],
    ['no account known: no wipe (no server deletion would follow)', !underAgeWipesDevice(undefined, undefined) && underAgeUid(null, undefined, null) === null],
    ['whose: the live session, else the owner (offline), else the saved session (new device)', underAgeUid(U, OTHER, OTHER) === U && underAgeUid(null, U, OTHER) === U && underAgeUid(null, undefined, U) === U],
    ['never another account\'s data', !underAgeWipesDevice(OTHER, U)],
  ])
  withFakeStorage((ls) => {
    const none = savedSessionUid(ls)
    ls.setItem('sb-proj-auth-token', JSON.stringify({ access_token: 'x', user: { id: U } }))
    const saved = savedSessionUid(ls)
    ls.setItem('sb-proj-auth-token', '{bad')
    const bad = savedSessionUid(ls)
    ls.removeItem('sb-proj-auth-token')
    report('under-age deletion ends safely (register 37)', [
      ['the saved session\'s uid is read for a new device; none or malformed gives none', none === null && saved === U && bad === null],
    ])
    markPendingDeletion({ uid: U, at: AT, tries: 2, next: now, stage: 'retry' })
    const back = pendingDeletion(now)
    ls.setItem('tali.pendingDelete', JSON.stringify({ uid: U, at: AT }))
    const old = pendingDeletion(now)
    ls.setItem('tali.pendingDelete', JSON.stringify({ uid: U, at: AT, tries: 'x', stage: 'weird' }))
    const odd = pendingDeletion(now)
    report('under-age deletion ends safely (register 37)', [
      ['the record round-trips', JSON.stringify(back) === JSON.stringify({ uid: U, at: AT, tries: 2, next: now, stage: 'retry' })],
      ['an older record (uid and time only) still reads, and tries at once', !!old && old.uid === U && underAgeRetryDue(old, now)],
      ['odd fields are dropped', JSON.stringify(odd) === JSON.stringify({ uid: U, at: AT })],
    ])
    // (c) the record is only a device-side helper: it expires after 30 days
    markPendingDeletion({ uid: U, at: AT })
    const day29 = pendingDeletion(now + 29 * 86_400_000)
    const day31 = pendingDeletion(now + 31 * 86_400_000)
    const after = ls.getItem('tali.pendingDelete')
    ls.setItem('tali.pendingDelete', JSON.stringify({ uid: U, at: 'not a date' }))
    const junk = pendingDeletion(now)
    report('under-age deletion ends safely (register 37)', [
      ['kept for 30 days, then dropped (and removed from the device)', !!day29 && day31 === null && after === null && PENDING_MAX_DAYS === 30],
      ['an unreadable time counts as expired', junk === null && !pendingExpired({ at: AT }, now)],
    ])
  })
  // (b) the reply was lost after the server deleted it: a retry's 401, then one refresh decides
  const fn401 = await deleteAccount({ online: () => true, hasSession: () => true, fresh: () => true, accountMatches: () => true, call: async () => ({ status: 401, body: null }), wipe: () => {}, signOut: async () => {} }, UNDER_AGE_REASON)
  const already = await deleteAccount({ online: () => true, hasSession: () => true, fresh: () => true, accountMatches: () => true, call: async () => ({ status: 200, body: { ok: true, already: true } }), wipe: () => {}, signOut: async () => {} }, UNDER_AGE_REASON)
  report('under-age deletion ends safely (register 37)', [
    ['a retry answered { ok: true, already: true } is done', already.status === 'ok' && underAgeNext(already.status, p0, now).kind === 'done'],
    ['a 401 is marked as refused by the server (not "no session here")', fn401.status === 'no-session' && 'rejected' in fn401 && fn401.rejected === true],
    ['only "user not found" proves the account is gone', refreshFailure({ code: 'user_not_found' }) === 'gone' && refreshFailure({ message: 'User from sub claim in JWT does not exist' }) === 'gone'],
    ['a dead refresh token proves nothing: sign in again (refresh_token_not_found, already used, invalid, no session)', refreshFailure({ code: 'refresh_token_not_found' }) === 'dead'
      && refreshFailure({ message: 'Invalid Refresh Token: Already Used' }) === 'dead' && refreshFailure({ message: 'Invalid Refresh Token: Refresh Token Not Found' }) === 'dead' && refreshFailure({ code: 'session_not_found' }) === 'dead'],
    ['anything else (no connection) just fails', refreshFailure({ message: 'Failed to fetch' }) === 'failed' && refreshFailure(null) === 'failed'],
    ['a dead token goes to the sign-in stage and keeps the record', (() => { const st = underAgeNext('reauth', { ...p0, tries: 3, stage: 'retry' }, now); return st.kind === 'sign-in' && st.pending.uid === U && st.pending.stage === 'sign-in' })()],
  ])
  const STORE = readFileSync('src/store/store.ts', 'utf8')
  report('under-age deletion ends safely (register 37)', [
    ['the store backs off, stops with the sign-in note, and wipes only through underAgeWipesDevice', /underAgeRetryDue\(pend, Date\.now\(\)\)/.test(STORE) && /step\.kind === 'wait'/.test(STORE)
      && /authNotice = UNDER_AGE_SIGN_IN_MSG/.test(STORE) && (STORE.match(/underAgeWipesDevice\(/g) || []).length === 3 && !/owner === uid\)/.test(STORE)],
    ['only the pending account\'s sync waits', /pend && pend\.uid === getUid\(\)/.test(STORE)],
    ['a 401 tries one refresh: gone is done (signed out, pending cleared), a dead token is the sign-in stage (record kept), a new token retries once', (() => {
      const f = STORE.slice(STORE.indexOf('deleteUnderAge: async'), STORE.indexOf('clearHealthAnswer: (kind)'))
      return /res\.status === 'no-session' && res\.rejected/.test(f) && /refreshForRetry\(\)/.test(f) && /r === 'gone'\) gone = true/.test(f) && /r === 'dead'\) dead = true/.test(f) && /underAgeNext\(dead \? 'reauth' : res\.status/.test(f)
        && /r === 'ok'\) res = await get\(\)\.deleteAccount\('under-age'\)/.test(f) && /gone \? \{ kind: 'done' as const \}/.test(f) })()],
    ['no uid at all: returns before recording or wiping anything (the stop screen stays), clearing only the draft (37b)', (() => {
      const f = STORE.slice(STORE.indexOf('deleteUnderAge: async'), STORE.indexOf('clearHealthAnswer: (kind)'))
      const stop = f.indexOf("if (!uid) { clearDraft(); return { status: 'no-session' } }")
      return stop > 0 && stop < f.indexOf('markPendingDeletion(') && stop < f.indexOf('saveState(') && stop < f.indexOf('freshForAccount(') })()],
    ['a normal account deletion clears the pending record only when it is that account\'s', (() => {
      const f = STORE.slice(STORE.indexOf('deleteAccount: async (reason)'), STORE.indexOf('signOut: async (opts)'))
      return /const goneUid = getUid\(\)/.test(f) && /if \(goneUid && pendingDeletion\(\)\?\.uid === goneUid\) clearPendingDeletion\(\)/.test(f)
        && f.indexOf('clearPendingDeletion()') > f.indexOf("if (res.status !== 'ok')") })()],
    ['sign out and remove this device\'s log: the draft and setup-card choice go, the pending record stays (37c)', (() => {
      const f = STORE.slice(STORE.indexOf('signOut: async (opts)'))
      const r = f.slice(f.indexOf('if (opts?.remove)'), f.indexOf('freshForDevice()'))
      return /clearDraft\(\)/.test(r) && /showSetupCard\(\)/.test(r) && !/PendingDeletion|wipeDevice/.test(r) })()],
  ])

  // the Profile control and the 12-week re-ask (boards on the Design canvas; the logic is ready)
  const prof = (x: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, ...structuredClone(x) })
  const answered = prof({ outcomes: { readiness: 'flagged', wellbeing: 'undisclosed', baseline: 'low', medical: 'clear' }, pregnancy: { flagged: true, askedAt: '2026-07-01' }, answeredAt: { 'outcomes.readiness': AT } })
  const v = healthAnswersView(answered, TODAY)
  report('health check answers view', [
    ['every stored answer, in wizard order, with what is stored', v.rows.map((r) => `${r.kind}:${r.value}:${r.flagged}`).join() === 'readiness:flagged:true,pregnancy:flagged:true,baseline:low:true,wellbeing:undisclosed:false,medical:clear:false', v.rows.map((r) => r.kind + r.value).join()],
    ['answered times: the merge stamp, or the pregnancy date', v.rows[0].answeredAt === AT && v.rows[1].answeredAt === '2026-07-01' && !v.rows[2].answeredAt],
    ['the re-ask is due after 12 weeks', v.pregnancyReask && !healthAnswersView(answered).pregnancyReask],
    ['nothing stored: no rows, nothing due', healthAnswersView(prof(), TODAY).rows.length === 0 && !healthAnswersView(prof(), TODAY).pregnancyReask],
    ['a "no" isn\'t re-asked', !pregnancyReaskDue({ flagged: false, askedAt: '2026-01-01' }, TODAY)],
  ])
  const c = prof(answered)
  const T2 = '2026-09-28T10:00:00.000Z'
  const cleared = clearHealthAnswerIn(c, 'readiness', T2) && clearHealthAnswerIn(c, 'pregnancy', T2)
  const all = prof(answered)
  for (const k of ['readiness', 'pregnancy', 'baseline', 'wellbeing', 'medical'] as const) clearHealthAnswerIn(all, k, AT)
  const merged = mergeProfiles(c, answered)
  report('clear one health answer', [
    ['removes just that answer', cleared && c.outcomes?.readiness === undefined && !c.pregnancy && c.outcomes?.baseline === 'low'],
    ['stamps the clear, so an older copy elsewhere can\'t bring it back', c.answeredAt?.['outcomes.readiness'] === T2 && c.answeredAt?.pregnancy === T2
      && !merged.pregnancy && merged.outcomes?.readiness === undefined, JSON.stringify(merged)],
    ['clearing everything leaves no outcomes object', !all.outcomes && !all.pregnancy && healthAnswersView(all).rows.length === 0],
    ['nothing to clear: false', !clearHealthAnswerIn(prof(), 'medical', AT)],
    ['routing follows: no longer treated as pregnant', !safetyAnswersFrom(c, 80, true).pregnant && safetyAnswersFrom(answered, 80, true).pregnant],
  ])
  const still = prof(answered), gone = prof(answered), snoozed = prof(answered)
  confirmPregnancyIn(still, 'still-applies', TODAY, AT)
  confirmPregnancyIn(gone, 'no-longer', TODAY, AT)
  const sn = snoozePregnancyIn(snoozed, TODAY, AT)
  report('the 12-week "Does this still apply?"', [
    ['still applies: re-dated today, asked again in 12 weeks', still.pregnancy?.flagged === true && still.pregnancy.askedAt === TODAY && !pregnancyReaskDue(still.pregnancy, TODAY) && pregnancyReaskDue(still.pregnancy, '2026-12-21') && still.answeredAt?.pregnancy === AT],
    ['no longer: the flag goes (stamped), and routing no longer holds for it', !gone.pregnancy && gone.answeredAt?.pregnancy === AT && !safetyAnswersFrom(gone, 80, true).pregnant],
    ['ask me later: the answer stays, asked again in 2 weeks', sn && snoozed.pregnancy?.flagged === true && snoozed.pregnancy.askedAt === '2026-07-01' && !pregnancyReaskDue(snoozed.pregnancy, '2026-10-11') && pregnancyReaskDue(snoozed.pregnancy, '2026-10-12') && PREGNANCY_SNOOZE_DAYS === 14],
    ['nothing to snooze without a yes', !snoozePregnancyIn(prof(), TODAY, AT)],
  ])
}

function healthAnswersUi(): void {
  // Onboarding 7 (boards ob7-1 to ob7-4, s-ob7): rows, actions and what re-runs
  const prof = (x: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, ...structuredClone(x) })
  const board = prof({ outcomes: { readiness: 'flagged', medical: 'flagged', wellbeing: 'flagged', baseline: 'ok' }, pregnancy: { flagged: true, askedAt: '2026-07-01' } })
  const rows = answerRows(board)
  const acts = (r: (typeof rows)[number]) => [r.change && 'Change', r.clear && 'Clear'].filter(Boolean).join('+')
  report('health check answers (ob7-1)', [
    ['board order and labels', rows.map((r) => r.label).join() === 'Pregnant or breastfeeding,Conditions or medicines,Health check,Food and weight', rows.map((r) => r.label).join()],
    ['actions: Change and Clear; Change and Clear; Clear only; Change only', rows.map(acts).join() === 'Change+Clear,Change+Clear,Clear,Change', rows.map(acts).join()],
    ['what each changes, in the board\'s words', rows.map((r) => r.does).join('|') === [
      'Food stays at maintenance with no calorie number, and training stays gentle.', 'Food stays at maintenance, with no high-protein target.',
      'Your plan starts with lighter, low-impact sessions.', 'Weight is hidden and there’s no calorie target to hit.'].join('|')],
    ['values say only what is stored (no condition, no pregnant vs breastfeeding)', rows[0].value === 'Yes' && rows[1].value === 'Yes' && rows[2].value === 'Gentler start' && rows[3].value === 'Yes'],
    ['Onboarding 9: Sometimes is its own value, with its own line', (() => {
      const r = answerRows(prof({ outcomes: { wellbeing: 'sometimes' } })).find((x) => x.kind === 'wellbeing')
      return r?.value === 'Sometimes' && r.does === HEALTH_ANSWERS.does.wellbeingSometimes && r.change && !r.clear })()],
    ['Clear asks first only for pregnancy and conditions', rows.map((r) => r.confirm).join() === 'true,true,false,false'],
    ['nothing kept: no rows (the empty board)', answerRows(prof()).length === 0 && HEALTH_ANSWERS.empty === 'Nothing kept from your health check.'],
    ['a kept "no" still shows, changing nothing', (() => { const x = answerRows(prof({ outcomes: { medical: 'clear' } })); return x.length === 1 && x[0].value === 'None of these' && x[0].does === 'Nothing changes in your plan.' && !x[0].confirm })()],
    ['"Rather not say" keeps food at maintenance until the deficit is chosen', answerRows(prof({ outcomes: { wellbeing: 'undisclosed' } }))[0].does === 'Food stays at maintenance for now.' && answerRows(prof({ outcomes: { wellbeing: 'undisclosed' }, deficitChosen: true }))[0].does === 'Nothing changes in your plan.'],
  ])
  const cl = (x: Partial<Profile>, k: 'pregnancy' | 'medical') => clearConfirmLine(prof({ age: 30, ...x }), k)
  report('clear confirm (ob7-2)', [
    ['nothing remains: the board\'s line', cl({ pregnancy: { flagged: true, askedAt: TODAY } }, 'pregnancy') === HEALTH_ANSWERS.confirm],
    ['a gentler start remains: Benn\'s line', cl({ pregnancy: { flagged: true, askedAt: TODAY }, outcomes: { readiness: 'flagged' } }, 'pregnancy') === 'Your food targets will show calorie numbers again. Your gentler start stays until you clear it too.'
      && cl({ outcomes: { medical: 'flagged', readiness: 'flagged' } }, 'medical') === HEALTH_ANSWERS.confirmGentler],
    ['numbers stay hidden: the approved variant', cl({ gentle: true, outcomes: { readiness: 'flagged' } }, 'pregnancy') === HEALTH_ANSWERS.confirmHidden],
    ['the board\'s title and line', HEALTH_ANSWERS.confirmT('Pregnant or breastfeeding') === 'Clear pregnant or breastfeeding?' && HEALTH_ANSWERS.confirm === 'Your food targets will show calorie numbers again, and training goes back to your usual pace.'],
    ['numbers stay hidden: wellbeing yes/sometimes, gentle mode, or the pregnancy flag when clearing conditions (age plays no part: under 18 is stopped)', numbersStayHidden(prof({ age: 30, outcomes: { wellbeing: 'flagged' } }), 'pregnancy')
      && numbersStayHidden(prof({ age: 30, gentle: true }), 'medical') && !numbersStayHidden(prof({ age: 30 }), 'pregnancy')
      && numbersStayHidden(prof({ age: 30, pregnancy: { flagged: true, askedAt: TODAY } }), 'medical') && !numbersStayHidden(prof({ age: 30, pregnancy: { flagged: true, askedAt: TODAY } }), 'pregnancy')],
  ])
  const w = prof({ outcomes: { wellbeing: 'clear' } })
  const on = setHealthAnswerIn(w, { kind: 'wellbeing', value: 'flagged' }, AT)
  const wasOn = w.gentle === true && w.answeredAt?.gentle === AT && w.answeredAt?.['outcomes.wellbeing'] === AT
  setHealthAnswerIn(w, { kind: 'wellbeing', value: 'undisclosed' }, '2026-09-28T10:00:00.000Z')
  const m = prof({})
  report('change an answer', [
    ['food and weight yes: gentle mode on, as in the wizard', on && wasOn],
    ['and off again when the answer moves off it', w.gentle === false && w.outcomes?.wellbeing === 'undisclosed'],
    ['conditions: the outcome only, stamped', setHealthAnswerIn(m, { kind: 'medical', value: 'flagged' }, AT) && m.outcomes?.medical === 'flagged' && m.answeredAt?.['outcomes.medical'] === AT && !setHealthAnswerIn(m, { kind: 'medical', value: 'flagged' }, AT)],
  ])

  // re-run: the answers' plan and the targets, the summary's way
  const d = full({ outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'ok', medical: 'clear' } })
  const sm = summaryFor(DEFAULT_PROFILE, d, ctx)
  const done = finishedProfile(sm, d, AT, TODAY, DEFAULT_PROFILE)
  const active = { ...sm.result.plan.trainingPlan, startedAt: TODAY }
  const cleared = structuredClone(done); clearHealthAnswerIn(cleared, 'readiness', AT)
  const before = rerunForAnswers(done, active, { healthConsent: true, kg: 87 })
  const after = rerunForAnswers(cleared, active, { healthConsent: true, kg: 87 })
  const again = rerunForAnswers(cleared, active, { healthConsent: true, kg: 87 })
  const preg = structuredClone(done); preg.pregnancy = { flagged: true, askedAt: TODAY }
  const hidden = rerunForAnswers(preg, active, { healthConsent: true, kg: 87 })
  const sug = suggestedTargets(cleared, 87, profileRouting(cleared, 87, true))
  const guard = (r: typeof after) => /"code":"guardrail","about":"[a-z-]+","field":"readiness"/.test(JSON.stringify(allWhysOf(r.plan)))
  report('changing an answer re-runs routing, targets and the plan', [
    ['the readiness guardrail goes when its answer is cleared', guard(before) && !guard(after)],
    ['targets are Profile\'s suggestion for the new answers', !!after.target && !!sug && 'kcal' in sug && after.target.kcal === sug.kcal && after.target.p === sug.p],
    ['the same answers give the same plan (seeded by the plan\'s id)', JSON.stringify(after.plan?.routines.map((r) => r.id)) === JSON.stringify(again.plan?.routines.map((r) => r.id))],
    ['pregnancy hides numbers: no target to set', hidden.target === null],
    ['the light half (main bundle, offline) gives the same target', JSON.stringify(answerTargets(cleared, 87, true)) === JSON.stringify(after.target) && answerTargets(preg, 87, true) === null],
    ['a rebuild is pending only for a plan built from the answers', planFromAnswers(active) && !planFromAnswers({ ...active, source: 'custom' }) && !planFromAnswers({ ...active, why: [] }) && !planFromAnswers(undefined)],
    ['only a plan built from the answers is rebuilt', rerunForAnswers(cleared, { ...active, source: 'custom' }, { healthConsent: true, kg: 87 }).plan === null && rerunForAnswers(cleared, undefined, { healthConsent: true, kg: 87 }).plan === null],
  ])
  report('12-week check-in (ob7-3, ob7-4)', [
    ['three options, Ask me later, the thanks and its link', CHECKIN.options.map((o) => o[1]).join() === 'Still pregnant,Breastfeeding now,No longer' && CHECKIN.later === 'Ask me later'
      && CHECKIN.doneT === 'Thanks. Your plan and targets will update.' && CHECKIN.seeAnswers === 'See your health check answers' && CHECKIN.title === 'Does this still apply?'],
  ])
}
const allWhysOf = (p: { trainingPlan: { why?: unknown }; routines: { why?: unknown; blocks: unknown }[] } | null) => p ? [p.trainingPlan.why, ...p.routines.map((r) => [r.why, r.blocks])] : []

/** Profile's "Redo setup" (compliance item 32): prefilled, replaces the answers, keeps the rest. */
function redo(): void {
  const first = full({ pregnant: true, outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'low', medical: 'clear' } })
  const base = finishedProfile(summaryFor(DEFAULT_PROFILE, first, ctx), first, AT, TODAY, DEFAULT_PROFILE)
  base.pregnancy = { flagged: true, askedAt: '2026-07-01', snoozedAt: '2026-09-20' } as Profile['pregnancy']
  base.training = { ...base.training, exPrefs: { liked: ['goblet-squat'], disliked: ['burpee'] }, limitations: ['knees', 'hips'], modalities: ['strength', 'mobility'], place: ['home', 'gym'] }
  const d = draftFromProfile(base, 'seed-r', { healthConsent: true, weight: 86 })
  const same = applyDraft(base, d, '2026-10-01', '2026-10-01T09:00:00.000Z')
  const T = (p: Profile) => JSON.stringify({ ...p.training })
  const noHealth = draftFromProfile(base, 'seed-r', { healthConsent: false, weight: 86 })
  const changed = applyDraft(base, { ...d, goal: 'build-muscle', movement: { kind: 'job', job: 'desk' }, outcomes: { ...d.outcomes, baseline: 'ok' }, motivations: undefined, areas: ['shoulders'] }, '2026-10-01')
  const m = summaryFor(base, d, ctx)
  const fin = finishedProfile(m, d, '2026-10-01T09:00:00.000Z', '2026-10-01', base)
  report('redo setup (compliance 32)', [
    ['prefilled with the current answers, from the first question', d.step === 'name' && d.mode === 'first' && d.name === 'Sam' && d.age === 34 && d.goal === 'lose-fat' && d.weight === 86
      && d.outcomes.baseline === 'low' && d.pregnant === true && d.movement?.kind === 'steps' && d.motivations?.join() === 'energy,stronger' && d.daysPerWeek === 3 && d.minutes === 30 && d.areas?.join() === 'knees', JSON.stringify(d)],
    ['no health consent: no health answers in the draft', !noHealth.height && !noHealth.weight && !noHealth.movement && !Object.keys(noHealth.outcomes).length && noHealth.pregnant === undefined && !noHealth.areas],
    ['left as it was: every answer and training pref stays exactly (hips, mobility, home and gym too)', T(same) === T(base) && same.goal === base.goal && JSON.stringify(same.outcomes) === JSON.stringify(base.outcomes)
      && JSON.stringify(same.movement) === JSON.stringify(base.movement) && same.height === base.height, T(same) + ' vs ' + T(base)],
    ['left as it was: the pregnancy answer keeps its date and "ask me later"', JSON.stringify(same.pregnancy) === JSON.stringify(base.pregnancy)],
    ['changed: the new answers replace the old, skipped ones clear', changed.goal === 'build-muscle' && changed.movement?.kind === 'job' && changed.outcomes?.baseline === 'ok' && changed.motivations === undefined],
    ['changed areas keep the ones the screen doesn\'t offer', changed.training?.limitations?.slice().sort().join() === 'hips,shoulders', JSON.stringify(changed.training?.limitations)],
    ['exercise likes stay (the person model)', JSON.stringify(changed.training?.exPrefs) === JSON.stringify(base.training.exPrefs) && JSON.stringify(same.training?.exPrefs) === JSON.stringify(base.training.exPrefs)],
    ['keeps when setup was first finished', fin.onboardedAt === base.onboardedAt && !!base.onboardedAt],
    ['the summary offers the rebuild: two plain choices, linted', !!REDO.offerT && !!REDO.rebuild && !!REDO.keep && REDO.row === 'Redo setup'],
  ])
  // Set up my plan: someone who used Tali before and never onboarded
  const legacy: Profile = { ...DEFAULT_PROFILE, age: 44, height: 168, sex: 'F', goal: 'lose-fat' }
  const ld = draftFromProfile(legacy, 's', { healthConsent: true, weight: 70 })
  const lfin = finishedProfile(summaryFor(legacy, ld, ctx), ld, AT, TODAY, legacy)
  report('set up my plan (existing users)', [
    ['prefilled with what Profile knows: age, height, weight, sex, goal', ld.age === 44 && ld.height === 168 && ld.weight === 70 && ld.sexAnswer === 'female' && ld.goal === 'lose-fat' && !!ld.redo],
    ['finishing marks setup done (their first run)', lfin.onboardedAt === AT],
  ])

  // the first-run wait (Benn's device test: no flash of the wizard before the first pull)
  const fresh = stateFromBackup({ days: {} } as never); ensureMeta(fresh, false)
  const pulled = structuredClone(fresh); pulled._meta!.lastPull = AT
  const existing = structuredClone(pulled); existing.profile = { ...existing.profile, goal: 'lose-fat', age: 40 }
  const started = { ...newDraft('first', 's'), step: 'name' as const }
  const on = { online: true, signedIn: true, showing: false, draft: null }
  report('first run waits for the first pull', [
    ['online, signed in, no pull yet: wait (not the wizard)', wizardDueFor(fresh, on) === 'wait' && FIRST_PULL_WAIT_MS === 10_000],
    ['offline: straight in', wizardDueFor(fresh, { ...on, online: false }) === true],
    ['the pull says someone new: the wizard; used before: the app', wizardDueFor(pulled, on) === true && wizardDueFor(existing, on) === false],
    ['slow pull, wizard up but nothing tapped yet: the pull switches to the app', wizardDueFor(existing, { ...on, showing: true }) === false],
    ['slow pull, the person has started: keeps going (answers merge per field)', wizardDueFor(existing, { ...on, showing: true, draft: started }) === true
      && wizardDueFor({ ...existing, profile: { ...existing.profile, onboardedAt: AT } }, { ...on, showing: true, draft: started }) === true],
    ['a left-over draft after a relaunch, onboarded elsewhere: no wizard', wizardDueFor({ ...existing, profile: { ...existing.profile, onboardedAt: AT } }, { ...on, draft: started }) === false],
    ['a Redo setup or Set up my plan draft never opens the first run by itself', wizardDueFor(existing, { ...on, draft: { ...started, redo: { training: {} } } }) === false],
  ])

  report('softened edit promises (compliance 32)', [
    ['intro and lately point to Redo setup', COPY.intro!.note!.endsWith('You can redo setup any time from Profile.') && COPY.lately!.why!.endsWith('You can update this by redoing setup.')],
    ['no line promises changing answers in Profile generally, or the lately answer "later"', !allCopy().some((t) => /change them any time in Profile|You can change this later/.test(t))],
    ['the answers screen doesn\'t claim to list everything kept', HEALTH_ANSWERS.lead === 'Answers from your health check, and what each one changes.'],
  ])
}

export async function wizardSuite(fakeServer: FakeServer): Promise<number> {
  steps(); outcomes(); summary(); withdrawal(); firstSession(); await compliance(); healthAnswersUi(); redo()
  await underAgeDeletion()
  await sync(fakeServer)
  return bad
}
