import type {
  BodyArea, CardioVariation, DailyMovement, DayLog, Equipment, Experience, Goal, HeightUnit, JobType, Modality, MovingNow,
  OnboardingOutcomes, Profile, SexAnswer, StepsBand, TrainingPlace, TrainingPrefs, WeightUnit, Why,
} from '@/core/types'
import { asksMedical, legacySex, routeSafety, safetyAnswersFrom, type SafetyRouting } from './onboarding'
import { MIN_AGE as LEGAL_MIN_AGE } from '@/core/legal'
import { activityLevelFor, startingTargets, type StartingTargets, type TrainingLoad } from './targets'
import { allWhys, buildPlan, inputsFromProfile, type BuildResult, type PersonModel, type PlanInputs } from './engine'
import { DEFAULT_WEEKDAYS, WEEK_ORDER, type Lately } from './engine/inputs'
import { sessionsOf } from './sessions'
import { stampFields, type MergedField } from './profileMerge'
import { DAY_NAME } from './date'
import { KIT_PROFILES } from './libraryCoverage'
import { alternativesFor } from './library'
import { EXERCISE_BY_ID } from '@/core/data/exercises'

/**
 * The first-run wizard and the "Finish your setup" card (first-run-onboarding §2, §2.1, §9, §14;
 * Design canvas rows Onboarding 1–4, notes s-ob1…s-ob4). Pure: which screens show, what an answer
 * turns into, the summary the person confirms. The UI keeps a draft on the device while it runs;
 * the draft only ever holds outcomes, never the screener's raw answers (§8).
 */

// ─── Screens ─────────────────────────────────────────────────────────────────────────────────

export type StepId =
  | 'intro' | 'skip-age' | 'name' | 'age' | 'under16' | 'ready' | 'ready-note' | 'pregnancy-note' | 'why' | 'goal'
  | 'lately' | 'wellbeing' | 'wellbeing-note' | 'body' | 'medical' | 'medical-note' | 'weight' | 'move' | 'handoff'
  | 'moving' | 'confidence' | 'days' | 'minutes' | 'where' | 'kit' | 'enjoy' | 'areas' | 'summary'

/** 'first': the whole first run; 'setup': the setup card on its own (Build my plan, Finish your setup) */
export type WizardMode = 'first' | 'setup'

/** Minutes as offered on board ob2-4 (60 = "60+"). */
export type MinutesAnswer = 15 | 20 | 30 | 45 | 60
export type WhereAnswer = 'home' | 'gym' | 'outdoors' | 'mix'
export type MovingAnswer = 'not-now' | 'now-and-then' | 'most-weeks' | 'three-plus'
export type EnjoyAnswer = 'weights' | 'walking' | 'running' | 'cycling' | 'swimming' | 'yoga-pilates' | 'dancing' | 'classes' | 'not-sure'
export type KitAnswer = Exclude<Equipment, 'bodyweight' | 'trap-bar' | 'machine' | 'cable' | 'yoga-props' | 'reformer'> | 'nothing'

export interface WizardDraft {
  v: 1
  mode: WizardMode
  step: StepId
  /** the plan id (engine seed), so the week the summary shows is the week that's accepted */
  seed: string
  /** "Skip, I'll figure it out myself" on the intro */
  skipped?: boolean
  /** "Later" on the handoff: the Starter week */
  later?: boolean
  name?: string
  age?: number
  /** outcomes only (readiness, wellbeing, baseline, medical): §8 */
  outcomes: OnboardingOutcomes
  /** the readiness item "pregnant, breastfeeding or recent surgery" answered yes, then "pregnant or breastfeeding" */
  pregnant?: boolean
  motivations?: string[]
  goal?: Goal
  height?: number
  heightUnit?: HeightUnit
  sexAnswer?: SexAnswer
  weight?: number
  weightUnit?: WeightUnit
  movement?: DailyMovement
  moving?: MovingAnswer
  experience?: Experience
  daysPerWeek?: 1 | 2 | 3 | 4 | 5 | 6
  weekdays?: number[]
  minutes?: MinutesAnswer
  where?: WhereAnswer
  kit?: KitAnswer[]
  enjoy?: EnjoyAnswer[]
  areas?: BodyArea[]
  /** after "Rather not say": the person chose their goal's deficit over the maintenance start */
  deficitChosen?: boolean
  /** a screen opened from the summary ("Add weight"): back to the summary after it */
  ret?: 'summary'
}

export const newDraft = (mode: WizardMode, seed: string): WizardDraft =>
  ({ v: 1, mode, step: mode === 'setup' ? 'moving' : 'intro', seed, outcomes: {} })

/**
 * The wizard's age stop (Benn, Sept 2026): 18+ for now, matching the legal texts and the live
 * consent screen. Under it, the kind stop and the automatic deletion (the step keeps its id,
 * 'under16', from the boards). routeSafety's 16–17 rules stay in place but can't be reached from here.
 */
export const WIZARD_MIN_AGE = LEGAL_MIN_AGE

/** Screens that ask for health data (plan §8): never shown without a local health consent. */
export const HEALTH_STEPS: StepId[] = ['ready', 'ready-note', 'pregnancy-note', 'lately', 'wellbeing', 'wellbeing-note', 'body', 'medical', 'medical-note', 'weight', 'move', 'areas']

/** The kit screen follows "where" for home, outdoors or a mix; a gym is assumed fully equipped (s-ob2). */
export const asksKit = (w: WhereAnswer | undefined) => w !== 'gym'

function setupSteps(d: WizardDraft): StepId[] {
  return ['moving', 'confidence', 'days', 'minutes', 'where', ...(asksKit(d.where) ? ['kit' as const] : []), 'enjoy', 'areas']
}

/**
 * The screens, in order, for what's been answered so far (s-ob1 order: name, age, health check,
 * your why, goal, how things are, food and weight, body, weight, daily movement; then the setup
 * card, then the summary). Signposting screens appear straight after the answer that routes to
 * them; the medical question only when the goal means eating less, after body (s-ob4).
 */
export function stepsFor(d: WizardDraft, healthConsent: boolean): StepId[] {
  const health = (s: StepId[]) => (healthConsent ? s : s.filter((x) => !HEALTH_STEPS.includes(x)))
  if (d.mode === 'setup') return [...health(setupSteps(d)), 'summary']
  const young = d.age != null && d.age < WIZARD_MIN_AGE
  if (d.skipped) return ['intro', 'skip-age', ...(young ? ['under16' as const] : [])]
  const s: StepId[] = ['intro', 'name', 'age']
  if (young) return [...s, 'under16']
  s.push('ready')
  if (d.pregnant) s.push('pregnancy-note')
  else if (d.outcomes.readiness === 'flagged') s.push('ready-note')
  s.push('why', 'goal', 'lately', 'wellbeing')
  if (d.outcomes.wellbeing === 'flagged') s.push('wellbeing-note')
  s.push('body')
  if (asksMedical(d.goal)) { s.push('medical'); if (d.outcomes.medical === 'flagged') s.push('medical-note') }
  s.push('weight', 'move', 'handoff')
  if (!d.later) s.push(...setupSteps(d))
  s.push('summary')
  return health(s)
}

export function nextStep(d: WizardDraft, healthConsent: boolean): StepId {
  const s = stepsFor(d, healthConsent)
  const i = s.indexOf(d.step)
  return s[Math.min(s.length - 1, i + 1)] ?? 'summary'
}
export function prevStep(d: WizardDraft, healthConsent: boolean): StepId | null {
  const s = stepsFor(d, healthConsent)
  const i = s.indexOf(d.step)
  // back never lands on a signposting screen: it goes to the question before it
  for (let k = i - 1; k >= 0; k--) if (!NOTE_STEPS.includes(s[k])) return s[k]
  return null
}
export const NOTE_STEPS: StepId[] = ['under16', 'ready-note', 'pregnancy-note', 'wellbeing-note', 'medical-note', 'handoff', 'intro', 'skip-age']

/** Progress on the wizard's 10 bars and the setup card's 8 (boards ob1, ob2), and the time line above them. */
const WIZ_BAR: Partial<Record<StepId, [number, string]>> = {
  name: [1, 'About 2 minutes left'], age: [2, 'About 2 minutes left'], ready: [3, 'About 2 minutes left'], why: [4, 'About 2 minutes left'],
  goal: [5, 'About 1 minute left'], lately: [6, 'About 1 minute left'], wellbeing: [7, 'About 1 minute left'],
  body: [8, 'Under a minute left'], medical: [8, 'Under a minute left'], weight: [9, 'Under a minute left'], move: [10, 'Almost done'],
}
const SETUP_BAR: Partial<Record<StepId, [number, string]>> = {
  moving: [1, 'About a minute left'], confidence: [2, 'About a minute left'], days: [3, 'About a minute left'],
  minutes: [4, 'Under a minute left'], where: [5, 'Under a minute left'], kit: [6, 'Under a minute left'],
  enjoy: [7, 'Nearly there'], areas: [8, 'Last one'],
}
export function progressOf(step: StepId): { at: number; of: number; left: string } | null {
  const w = WIZ_BAR[step]
  if (w) return { at: w[0], of: 10, left: w[1] }
  const s = SETUP_BAR[step]
  return s ? { at: s[0], of: 8, left: s[1] } : null
}

/** Skip (top right) on everything but age and goal (s-ob1); the setup card's screens all skip. */
export const canSkip = (step: StepId) => !!(WIZ_BAR[step] || SETUP_BAR[step]) && step !== 'age' && step !== 'goal'

// ─── Answers → outcomes ──────────────────────────────────────────────────────────────────────

/** The three readiness items (board ob1-2). Any yes → 'flagged'; the answers themselves are never kept. */
export function readinessOutcome(items: (boolean | undefined)[]): OnboardingOutcomes['readiness'] {
  if (items.some((x) => x === true)) return 'flagged'
  return items.length && items.every((x) => x === false) ? 'clear' : undefined
}

/** "How are things lately?" (ob1-5): poor sleep, high stress or little room → 'low'; nothing picked → skipped. */
export function baselineOutcome(l: Lately): OnboardingOutcomes['baseline'] {
  if (l.sleep == null && l.stress == null && l.room == null) return undefined
  return l.sleep === 'poor' || l.stress === 'high' || l.room === 'little' ? 'low' : 'ok'
}

/** The medical question (ob4-5): any condition ticked → 'flagged'; "None of these" → 'clear'. */
export const medicalOutcome = (ticked: number, none: boolean): OnboardingOutcomes['medical'] => (ticked > 0 ? 'flagged' : none ? 'clear' : undefined)

/** What the engine reads from the stored outcomes (it never needs the raw answers). */
export function outcomeInputs(o: OnboardingOutcomes | undefined): Pick<PlanInputs, 'readiness' | 'lately' | 'wellbeing'> {
  const x = o ?? {}
  return {
    readiness: x.readiness,
    lately: x.baseline === 'ok' ? { sleep: 'good', stress: 'low', room: 'plenty' } : x.baseline === 'low' ? { sleep: 'poor' } : undefined,
    wellbeing: x.wellbeing === 'flagged' ? 'yes' : x.wellbeing === 'clear' ? 'no' : x.wellbeing === 'undisclosed' ? 'rather-not-say' : undefined,
  }
}

// ─── Option lists (approved drafts, §14) and their mapping onto the engine's inputs ──────────

export const WHY_CHIPS: [string, string][] = [
  ['energy', 'More energy'], ['sleep', 'Sleep better'], ['stronger', 'Feel stronger'], ['confident', 'Feel more confident'],
  ['keep-up', 'Keep up with family and friends'], ['health', 'Look after my health'], ['enjoy', 'Enjoy moving again'], ['calmer', 'Feel calmer'],
]
export const GOAL_OPTIONS: [Goal, string, string][] = [
  ['lose-fat', 'Lose fat', 'Eat a little less and keep your strength'],
  ['build-muscle', 'Build muscle', 'Train to grow, and eat a little more'],
  ['increase-strength', 'Increase strength', 'Lift heavier over time'],
  ['increase-endurance', 'Improve endurance', 'Go for longer: walking, running, cycling'],
  ['feel-better', 'Feel better and move more', 'More energy, easier movement'],
]
/** Board ob1-8 offers four bands; "Over 10,000" takes the 10k–12.5k multiplier, the lower one (§2.1: errs low). */
export const STEP_OPTIONS: [StepsBand, string, string][] = [
  ['under-5k', 'Under 5,000 steps', 'Mostly sitting'], ['5k-7.5k', '5,000 to 7,500 steps', 'Some walking'],
  ['7.5k-10k', '7,500 to 10,000 steps', 'On the move a fair bit'], ['10k-12.5k', 'Over 10,000 steps', 'On my feet most of the day'],
]
export const JOB_OPTIONS: [JobType, string, string][] = [
  ['desk', 'Mostly sitting', 'Desk, driving, studying'], ['standing', 'A mix of sitting and standing', 'Teaching, retail, around the house'],
  ['on-feet', 'On my feet most of the day', 'Nursing, hospitality, warehouse'], ['manual', 'Heavy physical work', 'Building, farming, moving things'],
]
export const MOVING_OPTIONS: [MovingAnswer, string][] = [
  ['not-now', 'Not at the moment'], ['now-and-then', 'A little, now and then'], ['most-weeks', 'Most weeks'], ['three-plus', 'Three or more times a week'],
]
/** Four answers onto the engine's three levels, on the safe side: "Most weeks" starts as "some". */
export const MOVING_MAP: Record<MovingAnswer, MovingNow> = { 'not-now': 'not-at-all', 'now-and-then': 'some', 'most-weeks': 'some', 'three-plus': 'regularly' }
export const CONFIDENCE_OPTIONS: [Experience, string, string][] = [
  ['beginner', 'Just starting', 'New to it, or back after a long break'],
  ['intermediate', 'Getting comfortable', 'I know the basics and some moves'],
  ['advanced', 'Confident', 'I train regularly and know my way around'],
]
export const MINUTES_OPTIONS: MinutesAnswer[] = [15, 20, 30, 45, 60]
/** The engine's session lengths are 10/20/30/45/60: 15 builds a 10-minute session, so it never runs over. */
export const MINUTES_MAP: Record<MinutesAnswer, NonNullable<TrainingPrefs['minutesPerSession']>> = { 15: 10, 20: 20, 30: 30, 45: 45, 60: 60 }
export const WHERE_OPTIONS: [WhereAnswer, string][] = [['home', 'At home'], ['gym', 'At a gym'], ['outdoors', 'Outdoors'], ['mix', 'A mix']]
export const WHERE_MAP: Record<WhereAnswer, TrainingPlace[]> = { home: ['home'], gym: ['gym'], outdoors: ['outdoors'], mix: ['home', 'gym', 'outdoors'] }
export const KIT_OPTIONS: [KitAnswer, string][] = [
  ['dumbbell', 'Dumbbells'], ['kettlebell', 'Kettlebell'], ['band', 'Resistance bands'], ['bench', 'Bench'], ['pull-up-bar', 'Pull-up bar'],
  ['mat', 'Mat'], ['barbell', 'Barbell'], ['cardio-machine', 'Cardio machine'], ['nothing', 'Nothing, just me'],
]
export const ENJOY_OPTIONS: [EnjoyAnswer, string][] = [
  ['weights', 'Lifting weights'], ['walking', 'Walking'], ['running', 'Running'], ['cycling', 'Cycling'], ['swimming', 'Swimming'],
  ['yoga-pilates', 'Yoga or Pilates'], ['dancing', 'Dancing'], ['classes', 'Classes'], ['not-sure', 'Not sure yet'],
]
const ENJOY_MOD: Record<EnjoyAnswer, Modality[]> = {
  weights: ['strength'], walking: ['cardio'], running: ['cardio'], cycling: ['cardio'], swimming: ['cardio'],
  'yoga-pilates': ['yoga', 'pilates'], dancing: ['cardio'], classes: ['cardio', 'calisthenics'], 'not-sure': [],
}
const ENJOY_CARDIO: Partial<Record<EnjoyAnswer, CardioVariation>> = { walking: 'walking', running: 'running', cycling: 'cycling', swimming: 'swimming' }
export const AREA_OPTIONS: [BodyArea, string][] = [
  ['lower-back', 'Lower back'], ['knees', 'Knees'], ['shoulders', 'Shoulders'], ['elbows', 'Elbows'], ['wrists', 'Wrists'], ['neck', 'Neck'],
]

/** The training answers as TrainingPrefs (only what was answered; skipped stays absent). */
export function trainingFrom(d: WizardDraft): TrainingPrefs {
  const t: TrainingPrefs = {}
  if (d.moving) t.movingNow = MOVING_MAP[d.moving]
  if (d.experience) t.experience = d.experience
  if (d.weekdays?.length) { t.weekdays = [...d.weekdays].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)); t.daysPerWeek = Math.min(6, d.weekdays.length) as TrainingPrefs['daysPerWeek'] }
  else if (d.daysPerWeek) t.daysPerWeek = d.daysPerWeek
  if (d.minutes) t.minutesPerSession = MINUTES_MAP[d.minutes]
  if (d.where) t.place = [...WHERE_MAP[d.where]]
  if (d.kit) t.equipment = d.kit.filter((k): k is Exclude<KitAnswer, 'nothing'> => k !== 'nothing')
  if (d.enjoy) {
    const mods = [...new Set(d.enjoy.flatMap((e) => ENJOY_MOD[e]))]
    if (mods.length) t.modalities = mods
    const cardio = d.enjoy.map((e) => ENJOY_CARDIO[e]).filter((x): x is CardioVariation => !!x)
    if (cardio.length) t.cardioPrefs = cardio
  }
  if (d.areas) t.limitations = [...d.areas]
  return t
}

const TRAINING_KEYS: (keyof TrainingPrefs & string)[] = ['movingNow', 'experience', 'daysPerWeek', 'weekdays', 'minutesPerSession', 'place', 'equipment', 'modalities', 'cardioPrefs', 'limitations']

/**
 * The profile the answers make: `base` with every answered field set and, for the first run,
 * every skipped one cleared (so a re-run never keeps an old answer the person skipped this time).
 * `activityMult` is always cleared: startingTargets must use the new answers.
 * `at`: stamp the answered fields for the per-field merge (§12).
 */
export function applyDraft(base: Profile, d: WizardDraft, today: string, at?: string): Profile {
  const p = structuredClone(base) as Profile
  delete p.activityMult
  const stamped: MergedField[] = []
  const put = <K extends keyof Profile>(k: K, v: Profile[K] | undefined, field: MergedField) => {
    if (v === undefined) { if (d.mode === 'first' && k !== 'name') delete p[k]; return }
    p[k] = v; stamped.push(field)
  }
  if (d.mode === 'first') {
    if (d.name !== undefined) { p.name = d.name.trim().slice(0, 40); stamped.push('name') }
    if (d.age != null) { p.age = d.age; stamped.push('age') }
    if (d.height != null) { p.height = d.height; stamped.push('height') } else p.height = null
    put('weight', d.weight, 'weight')
    if (d.sexAnswer) { p.sexAnswer = d.sexAnswer; p.sex = legacySex(d.sexAnswer); stamped.push('sexAnswer', 'sex') } else delete p.sexAnswer
    if (d.heightUnit || d.weightUnit) { p.units = { weight: d.weightUnit ?? p.units?.weight ?? 'kg', height: d.heightUnit ?? p.units?.height ?? 'cm' }; stamped.push('units') }
    put('goal', d.goal, 'goal')
    put('motivations', d.motivations?.length ? [...d.motivations] : undefined, 'motivations')
    put('movement', d.movement, 'movement')
    const o: OnboardingOutcomes = {}
    for (const k of ['readiness', 'medical', 'wellbeing', 'baseline'] as const) {
      const v = d.outcomes[k]
      if (v !== undefined) { (o as Record<string, string>)[k] = v; stamped.push(`outcomes.${k}` as MergedField) }
    }
    if (Object.keys(o).length) p.outcomes = o; else delete p.outcomes
    if (d.pregnant !== undefined) { p.pregnancy = { flagged: d.pregnant, askedAt: today }; stamped.push('pregnancy') } else delete p.pregnancy
    // wellbeing Yes or Sometimes: gentle mode on (§3). Otherwise the person's own setting stays.
    if (d.outcomes.wellbeing === 'flagged') { p.gentle = true; stamped.push('gentle') }
    if (d.deficitChosen !== undefined) { p.deficitChosen = d.deficitChosen; stamped.push('deficitChosen') } else delete p.deficitChosen
  }
  const t = trainingFrom(d)
  const keep = p.training ?? {}
  const next: TrainingPrefs = { ...keep }
  for (const k of TRAINING_KEYS) {
    const v = t[k]
    if (v !== undefined) { (next as Record<string, unknown>)[k] = v; stamped.push(`training.${k}` as MergedField) }
    else delete (next as Record<string, unknown>)[k]
  }
  p.training = next
  if (at) stampFields(p, stamped, at)
  return p
}

// ─── The summary ─────────────────────────────────────────────────────────────────────────────

/** Sessions with at least one working set, per exercise, and the stored likes (engine §3.4 day 1). */
export function personModelFrom(days: Record<string, DayLog> | undefined, prefs: TrainingPrefs['exPrefs']): PersonModel {
  const ex: Record<string, { exposures: number }> = {}
  for (const [d, day] of Object.entries(days || {})) {
    for (const s of sessionsOf(day, d)) for (const e of s.ex || []) {
      const id = e.exId
      if (!id || !(e.sets || []).some((x) => !x.warmup && (x.reps || x.w || x.sec))) continue
      ;(ex[id] ||= { exposures: 0 }).exposures++
    }
  }
  return { ex, liked: [...(prefs?.liked ?? [])], disliked: [...(prefs?.disliked ?? [])] }
}

/** The plan's weekly training for the energy estimate: its sessions (the light optional one left out). */
export function loadOf(r: BuildResult, goal: Goal | undefined): TrainingLoad | null {
  const ss = r.plan.sessions.filter((s) => !s.optional)
  if (!ss.length) return null
  return { daysPerWeek: ss.length, minutes: Math.round(ss.reduce((a, s) => a + s.mins, 0) / ss.length), endurance: goal === 'increase-endurance' }
}

/**
 * The nutrition side's deficit, for the engine's guardrails (plan §3.3: a big deficit holds
 * progression and keeps volume low). Judgement call: 20% or more below maintenance is big.
 */
export function deficitOf(adjustPct: number | null): PlanInputs['deficit'] {
  if (adjustPct == null || adjustPct >= 0) return 'none'
  return adjustPct <= -20 ? 'big' : 'moderate'
}

export interface SummaryModel {
  /** the profile as it will be saved (before onboardedAt and activityMult) */
  profile: Profile
  kg: number | null
  routing: SafetyRouting
  inputs: PlanInputs
  result: BuildResult
  load: TrainingLoad | null
  targets: StartingTargets
}

/**
 * Build the summary: routing, then the plan (without a deficit, for its training load), the
 * targets from that load, then the plan again with the deficit the targets set, and the targets
 * once more for that plan's load. Deterministic for the draft's seed.
 */
export function summaryFor(base: Profile, d: WizardDraft, ctx: { healthConsent: boolean; days?: Record<string, DayLog>; currentWeight?: number | null; today: string }): SummaryModel {
  const profile = applyDraft(base, d, ctx.today)
  const kg = d.mode === 'first' ? d.weight ?? null : ctx.currentWeight ?? profile.weight ?? null
  // setup mode keeps the person's stored multiplier: their targets aren't re-run here
  const forTargets = d.mode === 'setup' && base.activityMult ? { ...profile, activityMult: base.activityMult } : profile
  const routing = routeSafety(safetyAnswersFrom(profile, kg, ctx.healthConsent))
  const pm = personModelFrom(ctx.days, profile.training?.exPrefs)
  const inputs0: PlanInputs = inputsFromProfile(profile, outcomeInputs(profile.outcomes))
  let result = buildPlan(inputs0, pm, d.seed)
  let load = loadOf(result, profile.goal)
  let targets = startingTargets(forTargets, load, routing, kg)
  let inputs = inputs0
  const deficit = deficitOf(targets.adjustPct)
  if (deficit !== 'none') {
    inputs = { ...inputs0, deficit }
    result = buildPlan(inputs, pm, d.seed)
    load = loadOf(result, profile.goal)
    targets = startingTargets(forTargets, load, routing, kg)
  }
  return { profile, kg, routing, inputs, result, load, targets }
}

/** What finishing saves on the profile: the answers, onboardedAt and the effective multiplier. */
export function finishedProfile(m: SummaryModel, d: WizardDraft, at: string, today: string, base: Profile): Profile {
  const p = applyDraft(base, d, today, at)
  const mult = d.mode === 'first' ? m.targets.effectiveMultiplier : null
  if (mult) { p.activityMult = mult; p.activityLevel = activityLevelFor(mult) }
  else if (d.mode === 'setup' && base.activityMult) p.activityMult = base.activityMult
  if (d.mode === 'first') p.onboardedAt = at
  stampFields(p, [...(mult ? ['activityMult', 'activityLevel'] as const : []), ...(d.mode === 'first' ? ['onboardedAt'] as const : [])], at)
  return p
}

// ─── "Why this week" rows (board ob3-1: every row names the answer behind it) ────────────────

export interface WhyRow { key: string; title: string; sub: string; whys: Why[] }

const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const listWords = (w: string[]) => (w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : w.join(''))
const AREA_WORD: Record<BodyArea, string> = { 'lower-back': 'lower back', knees: 'knees', hips: 'hips', ankles: 'ankles', shoulders: 'shoulders', elbows: 'elbows', wrists: 'wrists', neck: 'neck' }
const KIT_WORD = Object.fromEntries(KIT_OPTIONS.map(([k, l]) => [k, l])) as Record<KitAnswer, string>
const ENJOY_WORD = Object.fromEntries(ENJOY_OPTIONS.map(([k, l]) => [k, l])) as Record<EnjoyAnswer, string>

/** The week's days, Monday first, as full names ("Monday, Wednesday, Friday"). */
export const dayList = (days: number[]) => [...days].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)).map((d) => DAY_NAME[d]).join(', ')

/**
 * The rows under "Why this week". Each row carries the engine's own reasons (shown when tapped),
 * so the summary never claims a reason the plan didn't use (s-ob3, engine §3.7 test 2).
 */
export function whyRows(m: SummaryModel, d: WizardDraft): WhyRow[] {
  const r = m.result
  const plan = r.plan
  const every = allWhys(r)
  const pick = (f: (w: Why) => boolean) => every.filter(f).filter((w, i, a) => a.findIndex((x) => JSON.stringify(x) === JSON.stringify(w)) === i)
  const n = plan.sessions.filter((s) => !s.optional).length
  const days = [...new Set(plan.weekdays)]
  if (r.starter) {
    const starter = pick((w) => w.code === 'starter' && w.about === 'plan')
    return [
      { key: 'days', title: `${n} days, ${dayList(days)}`, sub: `You haven’t told us your days, so we’ve spread ${n} out`, whys: starter },
      { key: 'time', title: 'About 30 minutes, no equipment', sub: 'You haven’t told us your time or kit, so we’ve kept it simple', whys: starter },
      { key: 'impact', title: 'No jumping', sub: 'You haven’t told us about any sore spots, so we’ve kept it low-impact', whys: starter },
    ]
  }
  const rows: WhyRow[] = []
  const t = trainingFrom(d)
  const asked = t.weekdays?.length ?? t.daysPerWeek
  const dayWhys = pick((w) => (w.code === 'days' || (w.code === 'default' && w.field === 'daysPerWeek') || ((w.code === 'guardrail' || w.code === 'baseline') && w.about === 'days')) && w.field !== 'weekdays')
  const dayWord = `${n} ${n === 1 ? 'day' : 'days'}`
  if (asked == null) {
    rows.push({ key: 'days', title: `${dayWord}, ${dayList(days)}`, sub: `You haven’t told us your days, so we’ve spread ${n} out`, whys: [...dayWhys, ...pick((w) => w.field === 'weekdays')] })
  } else {
    rows.push({ key: 'days', title: dayWord, sub: n === 1 ? 'One day is a good start' : n !== asked ? 'Up to 3 to start, so there’s room to recover' : t.weekdays?.length ? 'One for each day you picked' : `Because you said ${n}`, whys: dayWhys })
    rows.push({ key: 'weekdays', title: dayList(days), sub: t.weekdays?.length ? 'The days you picked' : 'Spread out through the week', whys: pick((w) => w.field === 'weekdays') })
  }
  const minWhys = pick((w) => w.field === 'minutes')
  if (minWhys.length) rows.push({ key: 'minutes', title: `About ${d.minutes ?? 30} minutes`, sub: d.minutes ? 'The time you said you have' : 'You haven’t told us your time, so we’ve assumed 30', whys: minWhys })
  const kitWhys = pick((w) => w.code === 'kit' || (w.code === 'default' && (w.field === 'place' || w.field === 'equipment')))
  if (kitWhys.length) {
    const gym = d.where === 'gym' || d.where === 'mix'
    const kit = (d.kit ?? []).filter((k) => k !== 'nothing' && KIT_WORD[k])
    const word = (k: KitAnswer) => (k === 'mat' || k === 'bench' || k === 'kettlebell' || k === 'barbell' || k === 'pull-up-bar' || k === 'cardio-machine' ? 'a ' : '') + lower1(KIT_WORD[k])
    const title = d.where === 'gym' ? 'At a gym' : kit.length ? listWords(kit.map(word)).replace(/^a /, '').replace(/^(.)/, (c) => c.toUpperCase()) : d.where ? 'No equipment' : 'Bodyweight moves'
    rows.push({ key: 'kit', title: d.where === 'mix' && kit.length ? title + ', and a gym' : title, sub: !d.where && !d.kit ? 'You haven’t told us where you train' : gym && !kit.length ? 'Where you train' : 'What you have at home', whys: kitWhys })
  }
  const areaWhys = pick((w) => w.code === 'body-area' || (w.code === 'default' && w.field === 'bodyAreas') || (w.code === 'guardrail' && w.data?.value === 'no-impact'))
  if (d.areas?.length && areaWhys.length) rows.push({ key: 'areas', title: `Easy on your ${listWords(d.areas.map((a) => AREA_WORD[a]))}`, sub: 'Gentler moves for them, as you asked', whys: areaWhys })
  else if (!d.areas && areaWhys.length) rows.push({ key: 'areas', title: 'No jumping', sub: 'You haven’t told us about any sore spots, so we’ve kept it low-impact', whys: areaWhys })
  const easeWhys = pick((w) => w.about === 'ease-in')
  if (easeWhys.length) {
    const why: string[] = []
    if (easeWhys.some((w) => w.code === 'moving-now') || t.experience === 'beginner') why.push(t.experience === 'beginner' ? 'You’re just starting' : 'You’re not moving much right now')
    if (easeWhys.some((w) => w.code === 'baseline')) why.push(m.profile.outcomes?.baseline ? 'things have been a lot lately' : 'you skipped how things are lately')
    if (easeWhys.some((w) => w.field === 'readiness')) why.push(why.length ? 'your health check' : 'From your health check')
    const sub = why.length ? why.map((s, i) => (i ? lower1(s) : s)).join(', and ').replace(/^(.)/, (c) => c.toUpperCase()) : 'Easy on purpose, while you find your feet'
    rows.push({ key: 'ease', title: plan.easeInWeeks >= 2 ? 'A gentle first two weeks' : 'A gentle first week', sub, whys: easeWhys })
  }
  const enjoyWhys = pick((w) => w.code === 'enjoy')
  const liked = (d.enjoy ?? []).filter((e) => e !== 'not-sure' && ENJOY_WORD[e])
  if (enjoyWhys.length && liked.length) {
    rows.push({ key: 'enjoy', title: 'More of what you enjoy', sub: `You said you enjoy ${lower1(listWords(liked.map((e) => lower1(ENJOY_WORD[e]))))}`, whys: enjoyWhys })
  }
  if (d.enjoy?.includes('walking') && enjoyWhys.length) rows.push({ key: 'walks', title: 'Walks on rest days, if you like', sub: 'You said you enjoy walking', whys: enjoyWhys })
  return rows
}

/** Rest-day copy on the week list (ob3-1): a walk is offered when the person enjoys walking. */
export const restLine = (d: WizardDraft) => (d.enjoy?.includes('walking') ? 'Rest, or a walk if you fancy it' : 'Rest')

/** The fixed spread the days screen promises when no weekdays are picked (§2). */
export const defaultSpread = (n: WizardDraft['daysPerWeek']) => dayList(DEFAULT_WEEKDAYS[n ?? 3])

/**
 * For "Find your weight" (engine calibrationTarget): how many earlier days logged working sets of
 * this exercise, and how the last working set felt on the most recent of them.
 */
export function exposureOf(days: Record<string, DayLog> | undefined, before: string, exId: string): { n: number; last?: { w: string; feel?: import('@/core/types').SetFeel } } {
  let n = 0
  let lastDay = ''
  let last: { w: string; feel?: import('@/core/types').SetFeel } | undefined
  for (const [d, day] of Object.entries(days || {})) {
    if (d >= before) continue
    for (const s of sessionsOf(day, d)) for (const e of s.ex || []) {
      if (e.exId !== exId) continue
      const work = (e.sets || []).filter((x) => !x.warmup && (x.reps || x.w))
      if (!work.length) continue
      n++
      if (d >= lastDay) { lastDay = d; const x = work[work.length - 1]; last = { w: x.w, ...(x.feel ? { feel: x.feel } : {}) } }
    }
  }
  return { n, ...(last ? { last } : {}) }
}

// ─── Thumbs down (board ob5-3): a quiet swap to something else for the same slot ─────────────

/** The kit a person has, as the engine reads it: bodyweight, a mat at home or the gym, what's ticked, the gym's own. */
export function kitOf(t: TrainingPrefs | undefined): Set<Equipment> {
  const kit = new Set<Equipment>(['bodyweight'])
  const place = t?.place
  if (place?.includes('gym')) KIT_PROFILES.gym.forEach((q) => kit.add(q))
  if (!place || place.includes('home') || place.includes('gym')) kit.add('mat')
  for (const q of t?.equipment ?? []) kit.add(q)
  return kit
}

/**
 * What replaces a thumbed-down exercise: the first like-for-like alternative (same pattern and
 * main muscle, gentler first) the person has the kit for, that isn't disliked or already in the
 * workout. Null when there's nothing suitable: the exercise then stays, and only the dislike is kept.
 */
export function replacementFor(exId: string, t: TrainingPrefs | undefined, inWorkout: string[]): string | null {
  const e = EXERCISE_BY_ID[exId]
  if (!e) return null
  const kit = kitOf(t)
  const disliked = new Set([...(t?.exPrefs?.disliked ?? []), exId])
  const alt = alternativesFor(e)
  const pool = [...alt.similar, ...(alt.easier ? [alt.easier] : [])]
  const ok = pool.find((x) => !disliked.has(x.id) && !inWorkout.includes(x.id) && (!x.equipment.length || x.equipment.some((q) => kit.has(q))))
  return ok?.id ?? null
}
