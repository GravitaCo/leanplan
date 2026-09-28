/* The first-run wizard and summary (first-run-onboarding §2, §2.1, §3, §8, §10 phase 3, §12, §14;
   Design canvas rows Onboarding 1–5). Run from scripts/test-core.ts (npm test); returns the number
   of failures. The UI only asks and shows: every decision tested here is the one it uses. */
import type { Profile } from '@/core/types'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import {
  HEALTH_STEPS, applyDraft, baselineOutcome, dayList, defaultSpread, deficitOf, exposureOf, finishedProfile, loadOf, medicalOutcome, newDraft,
  outcomeInputs, readinessOutcome, replacementFor, stepsFor, summaryFor, trainingFrom, whyRows, MINUTES_MAP, MOVING_MAP, WIZARD_MIN_AGE, type WizardDraft,
} from '@/core/domain/wizard'
import { clearHealthAnswerIn, confirmPregnancyIn, healthAnswersView, pregnancyReaskDue, PREGNANCY_SNOOZE_DAYS, routeSafety, safetyAnswersFrom, snoozePregnancyIn } from '@/core/domain/onboarding'
import { startingTargets } from '@/core/domain/targets'
import { suggestedTargets } from '@/core/domain/nutrition'
import { allWhys, copyIssues, renderWhy } from '@/core/domain/engine'
import { mergeProfiles, MERGED_FIELDS } from '@/core/domain/profileMerge'
import { applyHealthWithdrawal, clearHealthData, HEALTH_FIELDS, healthDataSummary, healthWhy, recordConsent, withdraw, withoutHealth } from '@/data/consent'
import { loadDraft, markPendingDeletion, pendingDeletion, saveDraft, underAgeNext, underAgeRetryDelayMs, underAgeRetryDue, underAgeWipesDevice, UNDER_AGE_MAX_TRIES, type PendingDeletion } from '@/data/onboardingDraft'
import { ensureMeta, stateFromBackup } from '@/data/persistence'
import { PLAN_WHY_SYNC, pullAll, pushDirty, toServerPlan } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { allCopy, COPY, NOTES } from '../src/screens/onboarding/copy'
import { deleteAccount } from '@/data/account'
import { UNDER_AGE_REASON, newAccount } from '../supabase/functions/_shared/account'
import { readFileSync } from 'node:fs'
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
    ['s-ob1 order, then the setup card, then the summary', s.join() === 'intro,name,age,ready,why,goal,lately,wellbeing,body,medical,weight,move,handoff,moving,confidence,days,minutes,where,kit,enjoy,areas,summary', s.join()],
    ['the medical question only when the goal means eating less', !stepsFor(full({ goal: 'build-muscle' }), true).includes('medical')],
    ['18+ for now (Benn): 17 gets the kind stop too; 18 goes on', stepsFor(full({ age: 17 }), true).slice(-1)[0] === 'under16' && WIZARD_MIN_AGE === 18 && stepsFor(full({ age: 18 }), true).includes('ready')],
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
    ['PLAN_WHY_SYNC is on (2026-09-plan-why.sql applied), and off sends no why', PLAN_WHY_SYNC === true && !('why' in toServerPlan(plan, LOCAL_USER, false))],
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

function compliance(): void {
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
    ['wipes this device for the under-age account, or when nobody owns it yet (new device)', underAgeWipesDevice(U, U) && underAgeWipesDevice(undefined, U) && underAgeWipesDevice(undefined, undefined)],
    ['never another account\'s data', !underAgeWipesDevice(OTHER, U)],
  ])
  withFakeStorage((ls) => {
    markPendingDeletion({ uid: U, at: AT, tries: 2, next: now, stage: 'retry' })
    const back = pendingDeletion()
    ls.setItem('tali.pendingDelete', JSON.stringify({ uid: U, at: AT }))
    const old = pendingDeletion()
    ls.setItem('tali.pendingDelete', JSON.stringify({ uid: U, at: AT, tries: 'x', stage: 'weird' }))
    const odd = pendingDeletion()
    report('under-age deletion ends safely (register 37)', [
      ['the record round-trips', JSON.stringify(back) === JSON.stringify({ uid: U, at: AT, tries: 2, next: now, stage: 'retry' })],
      ['an older record (uid and time only) still reads, and tries at once', !!old && old.uid === U && underAgeRetryDue(old, now)],
      ['odd fields are dropped', JSON.stringify(odd) === JSON.stringify({ uid: U, at: AT })],
    ])
  })
  const STORE = readFileSync('src/store/store.ts', 'utf8')
  report('under-age deletion ends safely (register 37)', [
    ['the store backs off, stops with the sign-in note, and wipes only through underAgeWipesDevice', /underAgeRetryDue\(pend, Date\.now\(\)\)/.test(STORE) && /step\.kind === 'wait'/.test(STORE)
      && /authNotice = UNDER_AGE_SIGN_IN_MSG/.test(STORE) && (STORE.match(/underAgeWipesDevice\(/g) || []).length === 2 && !/owner === uid\)/.test(STORE)],
    ['only the pending account\'s sync waits', /pend && pend\.uid === getUid\(\)/.test(STORE)],
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

export async function wizardSuite(fakeServer: FakeServer): Promise<number> {
  steps(); outcomes(); summary(); withdrawal(); firstSession(); compliance()
  await underAgeDeletion()
  await sync(fakeServer)
  return bad
}
