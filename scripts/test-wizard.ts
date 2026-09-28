/* The first-run wizard and summary (first-run-onboarding §2, §2.1, §3, §8, §10 phase 3, §12, §14;
   Design canvas rows Onboarding 1–5). Run from scripts/test-core.ts (npm test); returns the number
   of failures. The UI only asks and shows: every decision tested here is the one it uses. */
import type { Profile } from '@/core/types'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import {
  HEALTH_STEPS, applyDraft, baselineOutcome, dayList, defaultSpread, deficitOf, exposureOf, finishedProfile, loadOf, medicalOutcome, newDraft,
  outcomeInputs, readinessOutcome, replacementFor, stepsFor, summaryFor, trainingFrom, whyRows, MINUTES_MAP, MOVING_MAP, type WizardDraft,
} from '@/core/domain/wizard'
import { routeSafety, safetyAnswersFrom } from '@/core/domain/onboarding'
import { startingTargets } from '@/core/domain/targets'
import { suggestedTargets } from '@/core/domain/nutrition'
import { allWhys, copyIssues, renderWhy } from '@/core/domain/engine'
import { mergeProfiles, MERGED_FIELDS } from '@/core/domain/profileMerge'
import { clearHealthData, HEALTH_FIELDS, healthDataSummary, withoutHealth } from '@/data/consent'
import { ensureMeta, stateFromBackup } from '@/data/persistence'
import { PLAN_WHY_SYNC, pullAll, pushDirty, toServerPlan } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { allCopy } from '../src/screens/onboarding/copy'

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
    ['s-ob1 order, then the setup card, then the summary', s.join() === 'intro,name,age,ready,why,goal,lately,wellbeing,body,medical,weight,move,handoff,moving,confidence,days,minutes,where,kit,enjoy,areas,summary', s.join()],
    ['the medical question only when the goal means eating less', !stepsFor(full({ goal: 'build-muscle' }), true).includes('medical')],
    ['under 16: the kind stop, and nothing after it', stepsFor(full({ age: 15 }), true).slice(-1)[0] === 'under16' && !stepsFor(full({ age: 15 }), true).includes('ready')],
    ['readiness yes: the gentle-start screen straight after', stepsFor(full({ outcomes: { readiness: 'flagged' } }), true).join().includes('ready,ready-note,why')],
    ['pregnant: the pregnancy screen instead', stepsFor(full({ outcomes: { readiness: 'flagged' }, pregnant: true }), true).join().includes('ready,pregnancy-note,why')],
    ['wellbeing yes or sometimes: its signposting screen', stepsFor(full({ outcomes: { wellbeing: 'flagged' } }), true).join().includes('wellbeing,wellbeing-note,body')],
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
  const texts = rows.flatMap((r) => [r.title, r.sub, ...r.whys.map(renderWhy)])
  report('summary why rows', [
    ['every row carries the engine\'s own reasons', rows.length >= 4 && rows.every((r) => r.whys.length > 0), rows.map((r) => r.key + ':' + r.whys.length).join()],
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
    ['16–17: no deficit, weight hidden, no AI', teen.routing.noDeficit && teen.routing.hideWeight && teen.routing.noAI && (teen.targets.adjustPct ?? -1) >= 0],
  ])
  const one = summaryFor(DEFAULT_PROFILE, full({ daysPerWeek: undefined, weekdays: [3] }), ctx)
  const oneDefault = summaryFor(DEFAULT_PROFILE, full({ daysPerWeek: 1, weekdays: undefined }), ctx)
  report('summary: a 1-day week', [
    ['one session, on the day picked', one.result.plan.sessions.filter((s) => !s.optional).length === 1 && one.result.plan.weekdays[0] === 3],
    ['1 day, no weekday picked: Wednesday (§2)', oneDefault.result.plan.weekdays.join() === '3' && defaultSpread(1) === 'Wednesday'],
    ['its row says so in Benn\'s words', whyRows(one, full({ weekdays: [3] })).some((r) => r.key === 'days' && r.whys.map(renderWhy).includes("One day is a good start. A second day adds more when you're ready, if you'd like."))],
  ])
  report('copy lint', [['every wizard, summary and signposting line', allCopy().every((t) => !copyIssues(t).length), allCopy().filter((t) => copyIssues(t).length).join(' | ')]])
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
    ['PLAN_WHY_SYNC is off until 2026-09-plan-why.sql is applied', PLAN_WHY_SYNC === false && !('why' in toServerPlan(plan, LOCAL_USER))],
    ['with it on, the reasons go in the new column', JSON.stringify((toServerPlan(plan, LOCAL_USER, true) as { why?: unknown }).why) === JSON.stringify(plan.why)],
    ['a pull without the column keeps this device\'s reasons', JSON.stringify(s2.trainingPlans[0].why) === JSON.stringify(plan.why) && !!plan.why?.length],
  ])
}

function withdrawal(): void {
  // compliance (Sept 2026): every onboarding answer is health data; withdrawing clears them all
  const s = stateFromBackup({ days: {} } as never)
  const m = summaryFor(DEFAULT_PROFILE, full({ pregnant: true, outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'low', medical: 'flagged' } }), ctx)
  s.profile = finishedProfile(m, full({ pregnant: true, outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'low', medical: 'flagged' } }), AT, TODAY, DEFAULT_PROFILE)
  s.profile.activityMult = s.profile.activityMult ?? 1.4
  s.profile.training = { ...s.profile.training, exPrefs: { liked: ['goblet-squat'] } }
  const meta = ensureMeta(s, false); meta.settings.dirty = false
  const before = healthDataSummary(s).profileFields
  clearHealthData(s, meta)
  const p = s.profile
  report('withdrawal clears the onboarding answers', [
    ['HEALTH_FIELDS names them', ['profile.outcomes', 'profile.pregnancy', 'profile.motivations', 'profile.height', 'profile.movement', 'profile.activityMult', 'profile.training'].every((f) => (HEALTH_FIELDS as readonly string[]).includes(f))],
    ['outcomes, pregnancy, why, body, movement, multiplier and training prefs are gone',
      !p.outcomes && !p.pregnancy && !p.motivations && p.height === null && !p.sexAnswer && !p.movement && !p.activityMult && !p.deficitChosen && !Object.keys(p.training ?? {}).length, JSON.stringify(p)],
    ['counted before, nothing left after', before >= 8 && healthDataSummary(s).profileFields === 0],
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

export async function wizardSuite(fakeServer: FakeServer): Promise<number> {
  steps(); outcomes(); summary(); withdrawal(); firstSession()
  await sync(fakeServer)
  return bad
}
