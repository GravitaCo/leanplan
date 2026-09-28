/* The personalised training engine, day 1 (personalised-training-engine.md §3.7; first-run-onboarding.md
   §2.1, §11). Run from scripts/test-core.ts (npm test); returns the number of failures. The "not
   fake" property tests: every onboarding field does its declared job, different people get
   materially different plans, every reason is real, nothing changes without new input or data. */
import type { BodyArea, Equipment, Experience, Goal, WhyCode } from '@/core/types'
import { EXERCISES, EXERCISE_BY_ID } from '@/core/data/exercises'
import { coverageGate, type KitProfile } from '@/core/domain/libraryCoverage'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { suggestedTargets } from '@/core/domain/nutrition'
import { estMins } from '@/core/domain/routines'
import { cleanPhases, planWeekNotes, scheduleMirror } from '@/core/domain/plans'
import {
  buildPlan, allWhys, calibrationTarget, copyIssues, renderWhy, whyText, FIELDS, DEFAULT_WEEKDAYS, TRAINING_FIELDS,
  type BuildResult, type InputField, type PlanInputs, type PersonModel,
} from '@/core/domain/engine'
import { stableKey } from '@/core/domain/engine/hash'

let bad = 0
const report = (area: string, checks: [string, boolean, string?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `engine: ${area}: ${n}`, !ok && detail ? detail : '') }
}
const skip = (area: string, n: string, detail: string) => console.log('SKIP', `engine: ${area}: ${n}`, detail)

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────────

const memo = new Map<string, BuildResult>()
function plan(i: PlanInputs, pm?: PersonModel, seed = 'test-seed'): BuildResult {
  const k = stableKey({ i, pm: pm ?? null, seed })
  let r = memo.get(k)
  if (!r) { r = buildPlan(i, pm, seed); memo.set(k, r) }
  return r
}

const KIT: Record<KitProfile, Pick<PlanInputs, 'place' | 'equipment'>> = {
  none: { place: ['home'], equipment: [] },
  bands: { place: ['home'], equipment: ['band'] },
  dumbbells: { place: ['home'], equipment: ['dumbbell', 'bench'] },
  gym: { place: ['gym'] },
}
const kitOf = (i: PlanInputs): KitProfile =>
  i.place?.includes('gym') ? 'gym' : i.equipment?.includes('dumbbell') ? 'dumbbells' : i.equipment?.includes('band') ? 'bands' : 'none'

const exIds = (r: BuildResult) => new Set(r.plan.sessions.flatMap((s) => s.slots.map((x) => x.exId)))
const bands = (r: BuildResult) => new Set(r.plan.sessions.flatMap((s) => s.slots.filter((x) => x.unit === 'reps' || x.restSec > 15).map((x) => `${x.role}:${x.reps?.lo}–${x.reps?.hi}:${x.restSec}`)))
const jaccard = (a: Set<string>, b: Set<string>) => { const u = new Set([...a, ...b]); let n = 0; for (const x of a) if (b.has(x)) n++; return u.size ? n / u.size : 1 }
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))

/**
 * Materially different (§3.7 test 1): a different split, exercise-set Jaccard below 0.8, total
 * weekly sets 2 or more apart, different rep or rest bands, different weekdays. Plus a different
 * ease-in length (weeks 1–2 are a different plan), called out in the report.
 */
function material(a: BuildResult, b: BuildResult): string[] {
  const why: string[] = []
  if (a.plan.split !== b.plan.split) why.push('split')
  if (jaccard(exIds(a), exIds(b)) < 0.8) why.push('exercises')
  if (Math.abs(a.plan.totalSets - b.plan.totalSets) >= 2) why.push('sets')
  if (!sameSet(bands(a), bands(b))) why.push('bands')
  if (a.plan.weekdays.join() !== b.plan.weekdays.join()) why.push('weekdays')
  if (a.plan.easeInWeeks !== b.plan.easeInWeeks) why.push('ease-in')
  return why
}
const routingKey = (r: BuildResult) => stableKey({ ...r.plan.routing, why: undefined })
const safetyDiff = (a: BuildResult, b: BuildResult) => routingKey(a) !== routingKey(b)
const contentKey = (r: BuildResult) => stableKey({ s: r.plan.sessions.map((s) => [s.weekday, s.name, s.slots.map((x) => [x.exId, x.rx, x.restSec])]), e: r.plan.easeInWeeks, r: routingKey(r), o: r.plan.offers.map((o) => o.kind) })
const outputKey = (r: BuildResult) => contentKey(r)

const settled: Partial<PlanInputs> = { movingNow: 'regularly', readiness: 'clear', lately: { sleep: 'good', stress: 'low', room: 'plenty' }, ageBand: '18-54', wellbeing: 'no', bodyAreas: [] }

const GOALS: Goal[] = ['build-muscle', 'increase-strength', 'lose-fat', 'increase-endurance', 'feel-better']
const DAYS = [1, 2, 3, 4, 5, 6] as const
const MINUTES = [10, 20, 30, 45, 60] as const
const KITS: KitProfile[] = ['none', 'bands', 'dumbbells', 'gym']
const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced']
const AREAS: BodyArea[][] = [[], ['knees'], ['lower-back']]

// §4.2 coverage gate (test 0): which kit × level cells the library covers
const gate = coverageGate(EXERCISES)
const covered = (kit: KitProfile, level: Experience) => !gate.gaps.some((g) => g.kit === kit && g.level === level)

/** A deterministic sample of the goal × days × minutes × kit × experience × body-areas grid. */
function grid(n: number, filter: (i: PlanInputs) => boolean = () => true): PlanInputs[] {
  const all: PlanInputs[] = []
  for (const goal of GOALS) for (const daysPerWeek of DAYS) for (const minutes of MINUTES) for (const kit of KITS) for (const experience of LEVELS) for (const bodyAreas of AREAS) {
    all.push({ ...settled, goal, daysPerWeek, minutes, experience, bodyAreas, ...KIT[kit] })
  }
  const ok = all.filter(filter)
  const step = ok.length / n
  return Array.from({ length: Math.min(n, ok.length) }, (_, k) => ok[Math.floor(k * step + step / 2) % ok.length])
}
const inCovered = (i: PlanInputs) => covered(kitOf(i), i.experience ?? 'beginner')

// ─── 0. The coverage gate ────────────────────────────────────────────────────────────────────

function gateTest() {
  console.log(`INFO engine: coverage gate ${gate.ok ? 'green' : `red (${gate.gaps.length} cells short)`}; covered kit × level: ${KITS.flatMap((k) => LEVELS.filter((l) => covered(k, l)).map((l) => `${k}/${l}`)).join(', ')}`)
  report('0 gate', [['the gate is computed and has the §4.2 shape', gate.gaps.every((g) => g.ids.length < 2)]])
}

// ─── 1. No fake questions ────────────────────────────────────────────────────────────────────

const BASES: PlanInputs[] = [
  { ...settled, goal: 'build-muscle', experience: 'intermediate', daysPerWeek: 4, minutes: 45, place: ['gym'] },
  { ...settled, goal: 'lose-fat', experience: 'beginner', daysPerWeek: 3, minutes: 30, ...KIT.dumbbells },
  { ...settled, goal: 'increase-endurance', experience: 'beginner', daysPerWeek: 5, minutes: 30, place: ['home', 'outdoors'], equipment: ['band'] },
  { ...settled, goal: 'feel-better', experience: 'beginner', daysPerWeek: 2, minutes: 20, ...KIT.bands },
  { ...settled, goal: 'increase-strength', experience: 'intermediate', daysPerWeek: 3, minutes: 60, place: ['gym'] },
  { ...settled, goal: 'build-muscle', experience: 'beginner', daysPerWeek: 6, minutes: 60, place: ['gym'], enjoy: ['strength', 'yoga'] },
  { ...settled, goal: 'feel-better', experience: 'intermediate', daysPerWeek: 4, minutes: 45, place: ['gym'], enjoy: ['pilates', 'strength'] },
  { ...settled, goal: 'lose-fat', experience: 'intermediate', daysPerWeek: 5, minutes: 45, place: ['gym', 'outdoors'], movingNow: 'some' },
  { ...settled, goal: 'increase-endurance', experience: 'intermediate', daysPerWeek: 4, minutes: 45, place: ['gym', 'outdoors'] },
  { ...settled, goal: 'build-muscle', experience: 'beginner', daysPerWeek: 3, minutes: 30, place: ['gym'], weekdays: [1, 2, 3] },
  { ...settled, goal: 'feel-better', experience: 'beginner', daysPerWeek: 3, minutes: 30, ...KIT.dumbbells, enjoy: ['yoga', 'mobility'] },
  { ...settled, goal: 'increase-strength', experience: 'beginner', daysPerWeek: 4, minutes: 60, place: ['gym'], enjoy: ['calisthenics'] },
  { ...settled, goal: 'feel-better', experience: 'intermediate', daysPerWeek: 5, minutes: 60, place: ['gym'], enjoy: ['yoga'] },
]

/** Whether a field's option did its declared job against a base. */
function doesJob(field: InputField, base: PlanInputs, variant: PlanInputs): { plan: boolean; safety: boolean; targets: boolean } {
  const a = plan(base), b = plan(variant)
  const tgt = (i: PlanInputs) => { const t = suggestedTargets({ ...DEFAULT_PROFILE, age: 35, height: 170, goal: i.goal }, 70); return t && 'kcal' in t ? t.kcal : null }
  return {
    plan: material(a, b).length > 0,
    // body areas are preference filtering (plan §0.7): its safety job is swapping out the moves that load the area
    safety: safetyDiff(a, b) || (field === 'bodyAreas' && !sameSet(exIds(a), exIds(b))),
    targets: field === 'goal' ? tgt(base) !== tgt(variant) : false,
  }
}

function fakeQuestions() {
  const rows: string[] = []
  const failures: string[] = []
  for (const f of Object.keys(FIELDS) as InputField[]) {
    const { scope, options } = FIELDS[f]
    // each option against every other option, on the same person: symmetric, so an option is
    // "fake" only if choosing it never gives anything different from some other answer
    let pairs = 0, did = 0
    const works = new Set<number>()
    for (const b of BASES) {
      const vs = options.map((v) => ({ ...b, [f]: v } as PlanInputs))
      for (let x = 0; x < vs.length; x++) for (let y = x + 1; y < vs.length; y++) {
        const j = doesJob(f, vs[x], vs[y])
        const ok = (scope.includes('plan') && j.plan) || (scope.includes('safety') && j.safety) || (scope.includes('targets') && j.targets)
        pairs++; if (ok) { did++; works.add(x); works.add(y) }
      }
    }
    const dead = options.filter((_, k) => !works.has(k)).map((v) => JSON.stringify(v ?? 'skipped'))
    rows.push(`${f} [${scope.join('+')}] ${did}/${pairs} answer pairs did the job${dead.length ? `; never: ${dead.join(', ')}` : ''}`)
    if (dead.length) failures.push(`${f}: ${dead.join(', ')} never changed anything`)
  }
  console.log('INFO engine: 1 field scopes:\n    ' + rows.join('\n    '))
  report('1 no fake questions', [['every option of every onboarding field does its declared job for some person', failures.length === 0, failures.join('; ')]])
}

// ─── 3. Different people, different plans ────────────────────────────────────────────────────

function differentPeople(label: string, bases: PlanInputs[], allowKit: (k: KitProfile, i: PlanInputs) => boolean): { rate: number; n: number; byDim: Record<string, string>; jac: number } {
  let n = 0, hit = 0, jacSum = 0
  const byDim: Record<string, [number, number]> = {}
  const miss: string[] = []
  for (const b of bases) {
    const variants: [string, PlanInputs][] = [
      ...GOALS.filter((g) => g !== b.goal).map((goal): [string, PlanInputs] => ['goal', { ...b, goal }]),
      ...DAYS.filter((d) => d !== b.daysPerWeek).map((daysPerWeek): [string, PlanInputs] => ['days', { ...b, daysPerWeek }]),
      ...MINUTES.filter((m) => m !== b.minutes).map((minutes): [string, PlanInputs] => ['minutes', { ...b, minutes }]),
      ...KITS.filter((k) => k !== kitOf(b) && allowKit(k, b)).map((k): [string, PlanInputs] => ['kit', { ...b, place: undefined, equipment: undefined, ...KIT[k] }]),
    ]
    for (const [dim, v] of variants) {
      const m = material(plan(b), plan(v))
      jacSum += jaccard(exIds(plan(b)), exIds(plan(v)))
      n++; byDim[dim] = byDim[dim] ?? [0, 0]; byDim[dim][1]++
      if (m.length) { hit++; byDim[dim][0]++ } else if (miss.length < 3) miss.push(`${dim}: ${stableKey(b)} → ${stableKey(v)}`)
    }
  }
  const rate = n ? hit / n : 1
  const dims = Object.fromEntries(Object.entries(byDim).map(([k, [a, t]]) => [k, `${a}/${t}`]))
  console.log(`INFO engine: 3 ${label}: ${hit}/${n} pairs materially different (${(rate * 100).toFixed(1)}%), mean exercise Jaccard ${(jacSum / Math.max(1, n)).toFixed(2)}, by dimension ${JSON.stringify(dims)}${miss.length ? '\n    e.g. not different: ' + miss.join('\n    ') : ''}`)
  return { rate, n, byDim: dims, jac: jacSum / Math.max(1, n) }
}

function differentPlans() {
  const full = differentPeople('full grid', grid(48), () => true)
  if (!gate.ok) skip('3 different people', 'full grid ≥95% materially different', `(gate red: ${gate.gaps.length} library cells short; measured ${(full.rate * 100).toFixed(1)}%)`)
  else report('3 different people', [['full grid ≥95% materially different', full.rate >= 0.95, `${(full.rate * 100).toFixed(1)}%`]])
  // the covered part of the library, where the gate is green cell by cell
  const sub = differentPeople('covered cells', grid(48, inCovered), (k, i) => covered(k, i.experience ?? 'beginner'))
  report('3 different people', [['covered cells ≥95% materially different', sub.rate >= 0.95 && sub.n > 100, `${(sub.rate * 100).toFixed(1)}% of ${sub.n}`]])
}

// ─── 2. Reasons are real ─────────────────────────────────────────────────────────────────────

/** "Off" for each field: the answer that switches its rule off (or, for goal and days, another answer). */
const NEUTRAL: { [K in InputField]: (i: PlanInputs) => PlanInputs[K] } = {
  goal: (i) => (i.goal === 'feel-better' ? 'build-muscle' : 'feel-better'),
  experience: () => 'advanced',
  movingNow: () => 'regularly',
  daysPerWeek: (i) => (i.daysPerWeek === 3 ? 4 : 3),
  weekdays: () => undefined,
  minutes: () => 60,
  place: () => ['gym', 'home', 'outdoors'],
  equipment: () => ['barbell', 'trap-bar', 'dumbbell', 'machine', 'cable', 'kettlebell', 'band', 'cardio-machine', 'bench', 'pull-up-bar', 'mat', 'yoga-props'],
  enjoy: () => undefined,
  bodyAreas: () => [],
  readiness: () => 'clear',
  lately: () => ({ sleep: 'good', stress: 'low', room: 'plenty' }),
  wellbeing: () => 'no',
  gentle: () => false,
  gentleStart: () => false,
  ageBand: () => '18-54',
  deficit: () => 'none',
}
const neutralise = (i: PlanInputs, fs: InputField[]) => { const o: PlanInputs = { ...i }; for (const f of fs) (o as Record<string, unknown>)[f] = NEUTRAL[f](i); return o }

function reasonsAreReal() {
  const people = [...BASES, ...grid(24), { goal: 'lose-fat', daysPerWeek: 4 } as PlanInputs, { goal: 'build-muscle', experience: 'beginner', minutes: 20, bodyAreas: ['knees', 'wrists'], ageBand: '65+', place: ['home'], equipment: ['dumbbell'] } as PlanInputs]
  const fieldNames = new Set(Object.keys(FIELDS))
  let readOk = true, namedOk = true, defaultsOk = true, realOk = true
  const detail: string[] = []
  for (const i of people) {
    // (a) a recording proxy: every Why.field was read
    const reads = new Set<string>()
    const proxy = new Proxy(i, { get(t, k) { if (typeof k === 'string') reads.add(k); return (t as Record<string, unknown>)[k as string] } })
    const r = buildPlan(proxy, undefined, 'test-seed')
    const whys = allWhys(r)
    for (const w of whys) if (w.field && (!reads.has(w.field) || !fieldNames.has(w.field))) { readOk = false; detail.push(`unread field ${w.field}`) }
    // (d) a `default` reason only for a field that really was skipped
    for (const w of whys) if (w.code === 'default' && (i as Record<string, unknown>)[w.field!] !== undefined && !(w.field === 'lately')) { defaultsOk = false; detail.push(`default claimed for answered ${w.field}`) }
    // (b) every read field that changes the output appears in some Why
    for (const f of [...reads].filter((x) => fieldNames.has(x)) as InputField[]) {
      for (const v of FIELDS[f].options) {
        if (stableKey(i[f]) === stableKey(v)) continue
        const other = plan({ ...i, [f]: v } as PlanInputs)
        if (outputKey(other) === outputKey(plan(i))) continue
        const named = [...allWhys(plan(i)), ...allWhys(other)].some((w) => w.field === f)
        if (!named) { namedOk = false; if (detail.length < 8) detail.push(`${f} changed the plan but no reason names it (${stableKey(v)})`) }
      }
    }
    // (c) every claimed reason is real: switching its field off (alone, or with the other fields
    // claimed for the same thing) changes the plan
    const base = outputKey(plan(i))
    const byAbout = new Map<string, Set<InputField>>()
    for (const w of whys) if (w.field && w.code !== 'default') { const s = byAbout.get(w.about ?? '') ?? new Set(); s.add(w.field as InputField); byAbout.set(w.about ?? '', s) }
    for (const w of whys) {
      if (!w.field || w.code === 'default') continue
      const f = w.field as InputField
      // switched off, or (for answers with no "off": goal, days, minutes, place, kit) any other answer
      const alone = outputKey(plan(neutralise(i, [f]))) !== base || FIELDS[f].options.some((v) => stableKey(v) !== stableKey(i[f]) && outputKey(plan({ ...i, [f]: v } as PlanInputs)) !== base)
      const together = alone || outputKey(plan(neutralise(i, [...(byAbout.get(w.about ?? '') ?? [])]))) !== base
      if (!together) { realOk = false; if (detail.length < 12) detail.push(`${w.code}/${w.about} claims ${f} but switching it off changes nothing (${renderWhy(w)})`) }
    }
  }
  report('2 reasons are real', [
    ['every Why.field is an onboarding field the engine read (recording proxy)', readOk, detail.join('; ')],
    ['every field that changes the plan is named by some Why', namedOk, detail.join('; ')],
    ['a default reason is only claimed for a skipped answer', defaultsOk, detail.join('; ')],
    ['no claimed reason it didn\'t use: switching the field off changes the plan', realOk, detail.join('; ')],
  ])
}

// every day-1 code is emitted somewhere, and every code has copy
const DAY1: WhyCode[] = ['goal', 'experience', 'moving-now', 'days', 'minutes', 'kit', 'enjoy', 'body-area', 'baseline', 'age-edge', 'guardrail', 'time-limited', 'variety', 'liked', 'disliked', 'evidence', 'default', 'calibration', 'starter']
const LATER: WhyCode[] = ['perf-top-of-range', 'perf-below-range', 'perf-stalled', 'feel', 'recovery', 'adherence']

function codesUsed() {
  const seen = new Set<WhyCode>()
  for (const r of memo.values()) for (const w of allWhys(r)) seen.add(w.code)
  // liked / disliked come from the person model
  const pm = plan(BASES[0], { liked: ['goblet-squat'], disliked: ['back-squat'] })
  for (const w of allWhys(pm)) seen.add(w.code)
  for (const w of calibrationTarget({ exId: 'goblet-squat', sets: 3, reps: { lo: 8, hi: 12 }, calibrate: true }, 1, 'spare')!.why) seen.add(w.code)
  const unused = DAY1.filter((c) => !seen.has(c))
  const noCopy = [...DAY1, ...LATER].filter((c) => !whyText(c, {}).trim())
  report('2 reasons are real', [
    ['every day-1 WhyCode is actually used by the generator', unused.length === 0, 'never emitted: ' + unused.join(', ')],
    ['every WhyCode has copy (learning-loop codes are E2/E3 and not emitted on day 1)', noCopy.length === 0 && LATER.every((c) => !seen.has(c) || c === 'feel'), noCopy.join(', ')],
  ])
}

// ─── 5. Constraint soundness, session length, guardrails ─────────────────────────────────────

const EXCLUDED = /kipping|bench dip|headstand|shoulder stand|plough|plow|lotus|wheel pose|rollover|jackknife|neck pull|weighted sit|russian twist|behind[- ]the[- ]neck|box jump|depth jump|pistol/i
const GYM_KIT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'cardio-machine', 'bench', 'pull-up-bar', 'mat', 'yoga-props']

function kitFor(i: PlanInputs): Set<Equipment> {
  const k = new Set<Equipment>(['bodyweight'])
  if (i.place?.includes('gym')) GYM_KIT.forEach((q) => k.add(q))
  if (!i.place || i.place.includes('home') || i.place.includes('gym')) k.add('mat')
  for (const q of i.equipment ?? []) k.add(q)
  return k
}

function soundness() {
  const people = [...grid(90), ...BASES]
  const issues: Record<string, string[]> = { kit: [], care: [], excluded: [], days: [], notes: [], mins: [], why: [], sixDays: [], impact: [], size: [] }
  for (const i of people) {
    const r = plan(i)
    const kit = kitFor(i)
    const days = r.plan.sessions.map((s) => s.weekday)
    if (new Set(days).size !== days.length) issues.days.push('two sessions on one day')
    if (days.length > 6) issues.days.push('no rest day')
    for (const s of r.plan.sessions) {
      if (s.mins > (i.minutes ?? 30) || estMins(s.slots.map((x) => ({ exId: x.exId, rx: x.rx }))) > (i.minutes ?? 30)) issues.mins.push(`${s.name} ${s.mins} min for ${i.minutes}`)
      if (!s.why.length) issues.why.push(`${s.name}: no reason`)
      for (const x of s.slots) {
        const e = EXERCISE_BY_ID[x.exId]
        const needs = e.equipment.filter((q) => q !== 'bench' || !e.props?.length)
        if (needs.length && !needs.some((q) => kit.has(q)) && !(e.modality === 'cardio')) issues.kit.push(`${e.id} needs ${e.equipment.join('/')}`)
        if (e.care?.some((a) => (i.bodyAreas ?? []).includes(a))) issues.care.push(`${e.id} with ${i.bodyAreas}`)
        if (EXCLUDED.test(e.n)) issues.excluded.push(e.id)
        if (r.plan.routing.lowImpact && e.impact === 'high') issues.impact.push(e.id)
        const abouts = new Set(x.why.map((w) => w.about))
        if (!abouts.has('exercise') || !(abouts.has('reps') || abouts.has('rest') || x.role === 'cardio') || !(abouts.has('sets') || abouts.has('plan') || x.role === 'flow' || x.role === 'balance' || x.role === 'cooldown')) issues.why.push(`${s.name}/${x.exId}: ${[...abouts].join(',')}`)
      }
    }
    // the week's own notes (plan §3.3): one hard session a day, no shared muscles back to back
    const notes = planWeekNotes(r.plan.trainingPlan.phases[r.plan.trainingPlan.phases.length - 1].week!, r.plan.routines)
    for (const n of notes) issues.notes.push(n)
    if (i.goal === 'lose-fat' && r.plan.sessions.filter((s) => !s.optional).length > 5) issues.sixDays.push('lose-fat with six planned days')
    const size = JSON.stringify({ p: r.plan.trainingPlan, r: r.plan.routines }).length
    if (size > 64000 || JSON.stringify(r.plan.trainingPlan.phases).length > 60000) issues.size.push(String(size))
  }
  const one = (k: string) => [issues[k].length === 0, issues[k].slice(0, 4).join('; ')] as [boolean, string]
  report('5 constraint soundness', [
    ['never unavailable kit', ...one('kit')],
    ['never a care-flagged move for a flagged area', ...one('care')],
    ['nothing from the §5.4 left-out list', ...one('excluded')],
    ['one session a day, at least one rest day', ...one('days')],
    ['no week notes: one hard session a day, no shared muscles on back-to-back days (Legs → Push → Pull)', ...one('notes')],
    ['every session fits its minutes (the engine\'s estimate and the app\'s)', ...one('mins')],
    ['every session and every exercise, its sets and its reps or rest carry a reason', ...one('why')],
    ['no six-day fat-loss week: the sixth day is light and optional', ...one('sixDays')],
    ['nothing high-impact when low-impact is on', ...one('impact')],
    ['plans stay inside the 64 KB settings cap', ...one('size')],
  ])
}

function guardrails() {
  const b = BASES[0]
  const lighter: [string, PlanInputs][] = [
    ['readiness yes', { ...b, readiness: 'flagged' }],
    ['poor sleep', { ...b, lately: { sleep: 'poor' } }],
    ['high stress', { ...b, lately: { stress: 'high' } }],
    ['little room', { ...b, lately: { room: 'little' } }],
    ['lately skipped', { ...b, lately: undefined }],
    ['big deficit', { ...b, deficit: 'big' }],
    ['gentle start chosen', { ...b, gentleStart: true }],
  ]
  const only: string[] = []
  for (const base of [b, BASES[5], BASES[7]]) {
    for (const [n, i0] of lighter) {
      const i = { ...i0, goal: base.goal, daysPerWeek: base.daysPerWeek, minutes: base.minutes, place: base.place, equipment: base.equipment, experience: base.experience }
      const a = plan(base).plan, x = plan(i).plan
      if (x.totalSets > a.totalSets || x.sessions.length > a.sessions.length || x.volumeTarget > a.volumeTarget || x.easeInWeeks < a.easeInWeeks) only.push(`${n} made it harder`)
    }
  }
  const R = (i: PlanInputs) => plan(i).plan.routing
  const gentlePre = R({ ...b, lately: { sleep: 'poor' } }).gentleStart && R({ ...b, lately: { stress: 'high' } }).gentleStart && R({ ...b, lately: { room: 'little' } }).gentleStart && R({ ...b, lately: undefined }).gentleStart && !R(b).gentleStart
  const changeable = !R({ ...b, lately: { sleep: 'poor' }, gentleStart: false }).gentleStart && plan({ ...b, lately: { sleep: 'poor' }, gentleStart: false }).plan.sessions.length === plan(b).plan.sessions.length
  const cap3 = plan({ ...b, daysPerWeek: 6, lately: { sleep: 'poor' } }).plan.sessions.length <= 3 && plan({ ...b, daysPerWeek: 6, readiness: 'flagged' }).plan.sessions.length <= 3
  const never = (['gentle', 'wellbeing-yes', 'wellbeing-sometimes', '16-17'] as const).every((k) => R({ ...b, ...(k === 'gentle' ? { gentle: true } : k === '16-17' ? { ageBand: '16-17' } : { wellbeing: k === 'wellbeing-yes' ? 'yes' : 'sometimes' }) }).volumeIncreases === 'never')
  const first4 = R(b).volumeIncreases === 'after-week-4' && R({ ...b, wellbeing: 'rather-not-say' }).volumeIncreases === 'after-week-4'
  const teen = !R({ ...b, ageBand: '16-17' }).ai && R({ ...b, ageBand: '16-17' }).trends === 'words' && R(b).ai
  const deficit = R({ ...b, deficit: 'big' }).holdProgression && !R({ ...b, deficit: 'moderate' }).stallChecks && R(b).stallChecks
  const readiness = R({ ...b, readiness: 'flagged' }).signpostHealth && R({ ...b, readiness: 'flagged' }).lowImpact && plan({ ...b, readiness: 'flagged' }).plan.easeInWeeks === 2
  const noImpact55 = plan({ ...BASES[8], ageBand: '65+' }).plan.sessions.every((s) => s.slots.every((x) => EXERCISE_BY_ID[x.exId].impact !== 'high'))
  const balance65 = plan({ ...b, ageBand: '65+' }).plan.sessions.filter((s) => s.kind === 'resistance').every((s) => s.slots.some((x) => x.role === 'balance'))
  const texts = (r: BuildResult) => allWhys(r).map(renderWhy)
  const gentleWords = [plan({ ...b, gentle: true }), plan({ ...b, wellbeing: 'yes' })].every((r) => r.plan.routing.gentleMode && texts(r).every((t) => !/\d+ hard sets a week/.test(t)) && texts(r).some((t) => /amount this week/.test(t))) && texts(plan(b)).some((t) => /\d+ hard sets a week/.test(t))
  const skippedLately = texts(plan({ ...b, lately: undefined })).includes("You skipped how things are lately, so we've started gently. You can update this by redoing setup.") && texts(plan({ ...b, lately: undefined })).every((t) => !/a lot lately/.test(t))
  const noAge = texts(plan({ ...b, ageBand: undefined })).includes("You haven't told us your age, so there are no AI features for now and sets stay steady.") && !texts(plan({ ...b, ageBand: undefined })).some((t) => /16 or 17/.test(t))
  report('guardrails (§0, §3.5 G, mental-performance)', [
    ['gentle mode: weekly sets per muscle in words, never numbers', gentleWords],
    ['a skipped "lately" says it was skipped, never "a lot lately"', skippedLately],
    ['a missing age has its own line, not the 16–17 one', noAge],
    ['guardrails only ever lighten: fewer or equal sets, sessions and dose, never a shorter ease-in', only.length === 0, only.join('; ')],
    ['a gentle start is pre-selected for poor sleep, high stress, little room or a skipped answer', gentlePre],
    ['the person can switch the gentle start off', changeable],
    ['poor baseline or a readiness "yes" caps the start at 3 days', cap3],
    ['no volume increases ever in gentle mode, when wellbeing-routed or at 16–17', never],
    ['and none in the first 4 weeks for anyone', first4],
    ['16–17: no AI, trends in words', teen],
    ['a big deficit holds progression; any deficit pauses stall offers', deficit],
    ['readiness "yes": signposting, low-impact, two-week ease-in', readiness],
    ['from 55 nothing high-impact; from 65 balance work in every strength session', noImpact55 && balance65],
  ])
}

// ─── 6. Determinism, and nothing changes without new input or data ──────────────────────────

function determinism() {
  const i = BASES[6]
  const a = JSON.stringify(buildPlan(i, undefined, 's1')), b = JSON.stringify(buildPlan(i, undefined, 's1'))
  // the clock never matters
  const realNow = Date.now
  Date.now = () => realNow() + 86400000 * 400
  const later = JSON.stringify(buildPlan(i, undefined, 's1'))
  Date.now = realNow
  const otherSeed = buildPlan(i, undefined, 's2')
  const sameContent = contentKey(otherSeed) === contentKey(buildPlan(i, undefined, 's1')) && otherSeed.plan.trainingPlan.id !== buildPlan(i, undefined, 's1').plan.trainingPlan.id
  const noData = [undefined, {}, { ex: {}, liked: [], disliked: [] }].map((pm) => contentKey(buildPlan(i, pm as PersonModel | undefined, 's1')))
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  const ids = [buildPlan(i, undefined, 's1').plan.trainingPlan.id, ...buildPlan(i, undefined, 's1').plan.routines.map((r) => r.id)]
  const planIdIsSeed = buildPlan(i, undefined, '0f8fad5b-d9cb-469f-a165-70867728950e').plan.trainingPlan.id === '0f8fad5b-d9cb-469f-a165-70867728950e'
  // data drives change: a thumbs down, a thumbs up and two logged sessions each change the plan
  const base = plan(i, undefined, 's1')
  const first = base.plan.sessions[0].slots[0].exId
  const disliked = plan(i, { disliked: [first] }, 's1')
  const liked = plan(i, { liked: ['goblet-squat'] }, 's1')
  const cal = base.plan.sessions.flatMap((s) => s.slots).find((x) => x.calibrate)!
  const logged = plan(i, { ex: { [cal.exId]: { exposures: 2 } } }, 's1')
  const dataOk = !exIds(disliked).has(first) && allWhys(disliked).some((w) => w.code === 'disliked')
    && exIds(liked).has('goblet-squat') && allWhys(liked).some((w) => w.code === 'liked' && w.data?.exId === 'goblet-squat')
    && logged.plan.sessions.flatMap((s) => s.slots).filter((x) => x.exId === cal.exId).every((x) => !x.calibrate)
  report('6 determinism', [
    ['same inputs and seed: identical output', a === b],
    ['the clock never changes the plan', a === later],
    ['the seed sets the ids, not the content: same answers, same exercises', sameContent],
    ['no plan change without new data (no model = an empty model)', new Set(noData).size === 1],
    ['ids are UUIDs (they survive persistence and the server), and a UUID seed is the plan id', ids.every((x) => uuid.test(x)) && planIdIsSeed],
    ['data drives change: thumbs down, thumbs up and logged sessions each change the plan', dataOk],
  ])
}

// ─── 8. Weekdays, the 1-day week, the Starter week ───────────────────────────────────────────

function weekdays() {
  const b = BASES[1]
  const spreadOk = DAYS.every((d) => plan({ ...b, daysPerWeek: d }).plan.weekdays.join() === DEFAULT_WEEKDAYS[d].join())
  const table = DEFAULT_WEEKDAYS[1].join() === '3' && DEFAULT_WEEKDAYS[2].join() === '1,4' && DEFAULT_WEEKDAYS[3].join() === '1,3,5' && DEFAULT_WEEKDAYS[4].join() === '1,2,4,5' && DEFAULT_WEEKDAYS[5].join() === '1,2,3,5,6' && DEFAULT_WEEKDAYS[6].join() === '1,2,3,4,5,6'
  const picked = [[2, 4, 6], [0, 3], [1, 2, 3, 4, 5], [6]].every((w) => plan({ ...b, weekdays: w }).plan.weekdays.slice().sort().join() === w.slice().sort().join())
  const count = plan({ ...b, daysPerWeek: 5, weekdays: [2, 4] }).plan.sessions.length === 2
  const seven = plan({ ...b, weekdays: [0, 1, 2, 3, 4, 5, 6] }).plan.weekdays.length === 6
  const capped = plan({ ...b, weekdays: [1, 2, 3, 4, 5], lately: { sleep: 'poor' } }).plan.weekdays
  const cappedOk = capped.length === 3 && capped.every((d) => [1, 2, 3, 4, 5].includes(d))
  const noRotation = [...memo.values()].slice(0, 50).every((r) => !/rotation|sequence|pointer|nextIndex|"next"/i.test(JSON.stringify(r.plan)))
  const weekKeyed = [...memo.values()].slice(0, 50).every((r) => r.plan.trainingPlan.phases.every((ph) => !ph.week || Object.keys(ph.week).length === 7))
  report('8 weekdays', [
    ['with no weekdays picked, days 1–6 map to the fixed spread every time', spreadOk && table],
    ['the plan lands on the weekdays picked; picking days sets the count', picked && count],
    ['seven days picked still leaves a rest day', seven],
    ['a gentle start spreads 3 sessions over the days picked', cappedOk],
    ['weekday-keyed weeks; no rotation or sequence pointer anywhere', noRotation && weekKeyed],
  ])

  const oneDay = GOALS.map((goal) => plan({ ...b, goal, daysPerWeek: 1 }))
  report('1-day week', [
    ['one full-body session on Wednesday, for every goal', oneDay.every((r) => r.plan.sessions.length === 1 && r.plan.sessions[0].focus === 'full-body' && r.plan.weekdays.join() === '3')],
    ['with the gentle note offered, never pushed', oneDay.every((r) => r.plan.offers.some((o) => o.kind === 'second-day') && renderWhy(r.plan.offers.find((o) => o.kind === 'second-day')!.why) === "One day is a good start. A second day adds more when you're ready, if you'd like.")],
  ])

  const starters = GOALS.map((goal) => plan({ goal, readiness: 'clear', ageBand: '18-54' }))
  const s = starters[0]
  const claims = starters.flatMap((r) => [...r.why, ...r.plan.sessions.flatMap((x) => [...x.why, ...x.slots.flatMap((y) => y.why)])])
  report('Starter week', [
    ['no training answers: flagged starter, labelled "Starter week: tell us more to personalise it"', starters.every((r) => r.starter && r.plan.label === 'starter-week' && renderWhy(r.why[0]) === 'Starter week: tell us more to personalise it.')],
    ['it claims nothing: no reason names an answer, and it is the same for every goal', claims.every((w) => !w.field && (w.code === 'starter' || w.code === 'calibration')) && new Set(starters.map(contentKey).map((k) => k.replace(/"r":.*$/, ''))).size === 1],
    ['3 full-body days Mon/Wed/Fri, 30 minutes, bodyweight, nothing high-impact', s.plan.weekdays.join() === '1,3,5' && s.plan.sessions.every((x) => x.focus === 'full-body' && x.mins <= 30 && x.slots.every((y) => EXERCISE_BY_ID[y.exId].impact !== 'high' && EXERCISE_BY_ID[y.exId].equipment.every((q) => q === 'mat' || q === 'bench')))],
    ['one answer is enough to leave the Starter week', !plan({ goal: 'build-muscle', minutes: 20 }).starter && TRAINING_FIELDS.length === 9],
  ])
}

// ─── Body areas, calibration, trap bar, copy lint, storage ───────────────────────────────────

function bodyAreas() {
  const all: BodyArea[] = ['lower-back', 'knees', 'hips', 'ankles', 'shoulders', 'elbows', 'wrists', 'neck']
  const leaks: string[] = []
  let gentlerSeen = 0
  for (const a of all) for (const i of [...grid(30), ...BASES]) {
    const r = plan({ ...i, bodyAreas: [a] })
    for (const x of r.plan.sessions.flatMap((s) => s.slots)) if (EXERCISE_BY_ID[x.exId].care?.includes(a)) leaks.push(`${x.exId} for ${a}`)
    gentlerSeen += allWhys(r).filter((w) => w.code === 'body-area').length
  }
  const knees = plan({ ...BASES[0], bodyAreas: ['knees'] })
  report('body areas', [
    ['a flagged area never gets a move that loads it (exclusions are complete, across every area)', leaks.length === 0, leaks.slice(0, 5).join('; ')],
    ['the swap is explained ("a gentler choice for …")', gentlerSeen > 0 && allWhys(knees).some((w) => w.code === 'body-area' && /gentler choice for the knees|to go easy on the knees/.test(renderWhy(w)))],
  ])
}

function calibration() {
  const r = plan(BASES[0])
  const slot = r.plan.sessions.flatMap((s) => s.slots).find((x) => x.calibrate)!
  const t0 = calibrationTarget(slot, 0), t1 = calibrationTarget(slot, 1, 'spare'), t1s = calibrationTarget(slot, 1, 'stopped'), t1x = calibrationTarget(slot, 1), t2 = calibrationTarget(slot, 2)
  const bw = r.plan.sessions.flatMap((s) => s.slots).find((x) => EXERCISE_BY_ID[x.exId].log !== 'weight-reps')
  report('find your weight', [
    ['sessions 1–2 of every loaded exercise calibrate, with no weight guessed', r.plan.sessions.flatMap((s) => s.slots).filter((x) => EXERCISE_BY_ID[x.exId].log === 'weight-reps' && !/steps/.test(x.rx)).every((x) => x.calibrate) && t0?.w === null && t0.step === 'pick' && t0.rir.lo === 3 && t0.rir.hi === 4],
    ['session 2 follows how session 1 felt; a skipped rating holds', t1?.step === 'heavier' && t1s?.step === 'lighter' && t1x?.step === 'same'],
    ['from session 3 (or a bodyweight move) the usual targets take over', t2 === null && (!bw || calibrationTarget(bw, 0) === null)],
    ['with the "no wrong answer" copy', renderWhy(t0!.why[0]) === "No wrong answer. Pick a weight that feels comfortable, with a few reps to spare. We'll adjust from how it felt."],
  ])
}

function trapBar() {
  const barOnly = [plan({ ...BASES[4], place: ['home'], equipment: ['barbell', 'bench'] }), plan({ ...BASES[4], place: ['gym'] }), ...grid(40, (i) => kitOf(i) === 'gym').map((i) => plan(i))]
  const withIt = plan({ ...BASES[4], place: ['home'], equipment: ['trap-bar', 'dumbbell'], goal: 'increase-strength', experience: 'intermediate' })
  report('trap bar', [
    ['never suggested with a barbell but no trap bar (it has its own equipment type, same id)', barOnly.every((r) => !exIds(r).has('trap-bar-deadlift')) && EXERCISE_BY_ID['trap-bar-deadlift'].equipment.join() === 'trap-bar'],
    ['available when a trap bar is ticked', EXERCISES.filter((e) => e.pattern === 'hinge').some((e) => e.id === 'trap-bar-deadlift') && withIt.plan.sessions.length > 0],
  ])
}

function copyLint() {
  const texts = new Set<string>()
  for (const r of memo.values()) for (const w of allWhys(r)) texts.add(renderWhy(w))
  const all: WhyCode[] = [...DAY1, ...LATER]
  const abouts = ['plan', 'split', 'mix', 'days', 'dose', 'ease-in', 'exercise', 'sets', 'reps', 'rest', 'safety', 'offer'] as const
  for (const c of all) for (const about of abouts) for (const value of ['home', 'outdoors', 'not-at-all', 'regularly', 'lose-fat', 'readiness', 'deficit', 'who-strength', 'balance', 'full-body', 'rest-day', 'no-ai', 'knees']) {
    texts.add(whyText(c, { about, value, exId: 'goblet-squat', alt: 'back-squat', n: 3, was: 4, range: '8–12' }))
  }
  const hits = [...texts].filter((t) => copyIssues(t).length)
  const lintWorks = copyIssues('You missed a day').length > 0 && copyIssues('Keep your streak').length > 0 && copyIssues('You should do more').length > 0 && copyIssues('3 of 4 done').length > 0 && copyIssues('80% adherence').length > 0 && copyIssues('Only two sets').length > 0 && copyIssues('Earn your dinner').length > 0
  report('7 copy lint', [
    [`none of the banned words in any rendered reason (${texts.size} sentences)`, hits.length === 0, hits.slice(0, 5).join(' | ')],
    ['the lint catches what it bans', lintWorks],
    ['en-GB, no em dashes, no undefined', [...texts].every((t) => !/—|undefined|NaN/.test(t))],
  ])
}

function storage() {
  const r = plan(BASES[5])
  const tp = r.plan.trainingPlan
  const phases = cleanPhases(JSON.parse(JSON.stringify(tp.phases)))
  const kept = phases.length === tp.phases.length && phases[phases.length - 1].week && Object.values(phases[phases.length - 1].week!).flat().length === r.plan.sessions.length
  const mirror = scheduleMirror(phases[phases.length - 1].week!, r.plan.routines)
  const shape = tp.source === 'recommended' && tp.state === 'active' && !tp.startedAt && r.plan.routines.every((x) => x.source === 'recommended' && x.blocks[0].slots.every((s) => s.restSec != null && Array.isArray(s.why)))
  const whysAreData = JSON.stringify(tp.why).length < 4000 && !/[A-Z][a-z]+ [a-z]+ [a-z]+ [a-z]+/.test(JSON.stringify(r.plan.routines.map((x) => x.blocks[0].slots.map((s) => s.why))))
  report('storage', [
    ['the plan survives the phase cleaner and mirrors to a schedule', !!kept && Object.keys(mirror).length === 7],
    ['shipped shapes: recommended plan waiting for a start date, recommended workouts with rest and reasons', shape],
    ['reasons are stored as codes and data, never text', whysAreData],
  ])
}

export function engineSuite(): number {
  bad = 0
  const t0 = Date.now()
  gateTest()
  fakeQuestions()
  differentPlans()
  reasonsAreReal()
  soundness()
  guardrails()
  determinism()
  weekdays()
  bodyAreas()
  calibration()
  trapBar()
  copyLint()
  codesUsed()
  storage()
  console.log(`INFO engine: ${memo.size} plans built in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  return bad
}
