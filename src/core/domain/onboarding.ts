import type { Goal, OnboardingOutcomes, PregnancyFlag, Profile, Sex, SexAnswer } from '@/core/types'
import type { SignpostKind } from '@/core/data/signposts'
import { shiftDay } from './date'
import { isUnderAge, MIN_AGE } from './age'

/**
 * First-run onboarding: safety routing (first-run-onboarding.md §3) and the skipped-answer
 * defaults (§2.1). Nobody is blocked except under-18s (Tali is strictly 18+); every other signal makes the plan safer.
 * Pure: the store decides what to save, and only outcomes are ever saved (§8).
 */

/** What routing needs. Built from the profile with `safetyAnswersFrom`; never stored as is. */
export interface SafetyAnswers {
  /** required in the wizard (§13); null is still handled on the safe side (§2.1) */
  age: number | null
  heightCm?: number | null
  weightKg?: number | null
  goal?: Goal
  /** absent fields = skipped */
  outcomes?: OnboardingOutcomes
  /** pregnant or breastfeeding, from the pregnancy flag */
  pregnant?: boolean
  /** health-data consent given (§8, §14 "Not now" → false) */
  healthConsent: boolean
}

/** Why calorie numbers are hidden. The last three come from `startingTargets`, not routing. */
export type HiddenReason = 'under16' | 'no-consent' | 'pregnancy' | 'no-age' | 'gentle' | 'no-weight' | 'no-height'

/** Which §3 rows fired, for tests and the rules-based "why". */
export type RoutingReason =
  | 'under16' | 'age-missing' | 'no-consent' | 'pregnancy' | 'low-bmi'
  | 'wellbeing' | 'readiness' | 'medical'

/** Skipped fields that fell back to a default (§2.1), each with its "You haven't told us…" line. */
export type DefaultField = 'age' | 'readiness' | 'baseline' | 'wellbeing' | 'weight' | 'height' | 'sex' | 'movement'

export interface SafetyRouting {
  /** kind stop: "Tali is for 18+" (§14: the account and the device's data are then deleted). The id is internal and predates 18+. */
  stop?: 'under16'
  /** never below maintenance, whatever the goal */
  noDeficit: boolean
  hideWeight: boolean
  noAI: boolean
  /** gentle mode on (Profile.gentle: calories and weight hidden, the day in words) */
  gentle: boolean
  /** exactly maintenance: no deficit and no surplus */
  maintenanceOnly: boolean
  hideCalories: boolean
  signpost: SignpostKind[]
  /** why calories are hidden, or null */
  hiddenReason: HiddenReason | null
  /** a gentler, low-impact training start */
  gentlerStart: boolean
  /** sleep/stress low or skipped: calories near maintenance (the goal band's shallowest deficit at most) */
  nearMaintenance: boolean
  /** wellbeing "Rather not say" or skipped: maintenance pre-selected, the person can change it */
  startAtMaintenance: boolean
  /** gentle mode offered, not switched on */
  offerGentle: boolean
  /** protein at the reference intake instead of the high-protein goal anchor */
  noProteinAnchor: boolean
  /** show the "check with your GP" note */
  gpNote: boolean
  /** signposting shown quietly, not as an alert (readiness skipped only) */
  quietSignpost: boolean
  reasons: RoutingReason[]
  defaults: DefaultField[]
}

/** Display order for signposts. */
const SIGNPOST_ORDER: SignpostKind[] = ['emergency', 'beat', 'samaritans', 'childline', 'nhs111-mental-health', 'nhs111', 'midwife', 'gp']

/** BMI under this is a safety gate only (no deficit): never shown, never used for targets (§9). */
export const LOW_BMI = 18.5
/** the legal minimum age (18), re-exported so routing and the legal texts can't drift apart */
export { MIN_AGE }
/** the pregnancy question is re-asked this often (§13.5, confirmed in §14) */
export const PREGNANCY_REASK_DAYS = 12 * 7

/** The wellbeing screen's four options (board ob1-6-wellbeing). */
export type WellbeingAnswer = 'yes' | 'sometimes' | 'no' | 'rather-not-say'

/**
 * The only thing stored from the wellbeing screen. No → 'clear' (normal targets); Yes or
 * Sometimes → 'flagged'; "Rather not say" → 'undisclosed'; skipped → absent. Undisclosed and
 * skipped take the §2.1 safe side: maintenance pre-selected (the goal's deficit offered, one tap
 * to choose), gentle mode offered, not on, and weight still shown.
 */
export function wellbeingOutcome(a: WellbeingAnswer | undefined): OnboardingOutcomes['wellbeing'] {
  if (!a) return undefined
  return a === 'no' ? 'clear' : a === 'rather-not-say' ? 'undisclosed' : 'flagged'
}

/** The medical question's outcome: a tick flags, "None of these" clears, nothing is skipped. */
export const medicalOutcome = (ticked: number, none: boolean): OnboardingOutcomes['medical'] => (ticked > 0 ? 'flagged' : none ? 'clear' : undefined)

/** The medical-conditions question is only asked when the goal means eating less (§3). */
export const asksMedical = (goal: Goal | undefined): boolean => goal === 'lose-fat'

/** The onboarding sex answer, read from older profiles too ('M' → male, 'F' → female). */
export function sexOf(p: Pick<Profile, 'sex' | 'sexAnswer'>): SexAnswer {
  return p.sexAnswer ?? (p.sex === 'F' ? 'female' : 'male')
}

/**
 * The legacy `sex` to store beside an answer, for consumers that only know 'M' | 'F'.
 * 'unspecified' maps to 'F': the lower estimate and the lower floor, the safe side.
 */
export const legacySex = (a: SexAnswer): Sex => (a === 'male' ? 'M' : 'F')

/** "Ask me later" on the re-ask brings it back this many days later (2 weeks, design brief) */
export const PREGNANCY_SNOOZE_DAYS = 14

/**
 * Whether it's time to ask "Does this still apply?" (12 weeks after the pregnancy answer, and 2
 * weeks after an "Ask me later"). Only a yes is re-asked: there's nothing to re-check otherwise.
 */
export function pregnancyReaskDue(flag: PregnancyFlag | undefined, today: string): boolean {
  if (!flag?.flagged || flag.askedAt > shiftDay(today, -PREGNANCY_REASK_DAYS)) return false
  return !flag.snoozedAt || flag.snoozedAt <= shiftDay(today, -PREGNANCY_SNOOZE_DAYS)
}

/* ─── Health check answers (Profile control and the 12-week re-ask; UI not built yet) ─── */

/** The onboarding health answers a person can see and clear: the stored outcomes and the pregnancy flag. */
export type HealthAnswerKind = 'readiness' | 'pregnancy' | 'baseline' | 'wellbeing' | 'medical'
/** Wizard order. */
export const HEALTH_ANSWER_KINDS: readonly HealthAnswerKind[] = ['readiness', 'pregnancy', 'baseline', 'wellbeing', 'medical']

export interface HealthAnswerRow {
  kind: HealthAnswerKind
  /** exactly what is stored: the outcome, or for pregnancy 'flagged' / 'clear' */
  value: string
  /** the answer changes the plan (a gentler start, maintenance, gentle mode, a lighter start) */
  flagged: boolean
  /** when it was last answered or confirmed (ISO), when known */
  answeredAt?: string
}

export interface HealthAnswersView {
  /** only the answers that are stored, in wizard order; empty when there are none */
  rows: HealthAnswerRow[]
  /** "Does this still apply?" is due (needs `today`) */
  pregnancyReask: boolean
}

/** The merge key (profile.answeredAt / MERGED_FIELDS) for each answer. */
export const healthAnswerField = (k: HealthAnswerKind): 'pregnancy' | `outcomes.${Exclude<HealthAnswerKind, 'pregnancy'>}` =>
  k === 'pregnancy' ? 'pregnancy' : `outcomes.${k}`

/** What Tali keeps from the health check, for the Profile "Health check answers" control. Pure. */
export function healthAnswersView(p: Pick<Profile, 'outcomes' | 'pregnancy' | 'answeredAt'>, today?: string): HealthAnswersView {
  const rows: HealthAnswerRow[] = []
  for (const kind of HEALTH_ANSWER_KINDS) {
    let value: string | undefined, flagged = false
    if (kind === 'pregnancy') {
      if (p.pregnancy) { value = p.pregnancy.flagged ? 'flagged' : 'clear'; flagged = p.pregnancy.flagged }
    } else {
      value = p.outcomes?.[kind]
      flagged = value === 'flagged' || value === 'low'
    }
    if (value === undefined) continue
    const answeredAt = p.answeredAt?.[healthAnswerField(kind)] ?? (kind === 'pregnancy' ? p.pregnancy?.askedAt : undefined)
    rows.push({ kind, value, flagged, ...(answeredAt ? { answeredAt } : {}) })
  }
  return { rows, pregnancyReask: !!today && pregnancyReaskDue(p.pregnancy, today) }
}

/**
 * Remove one stored answer (as if skipped) and stamp the clear, so an older copy on another
 * device can't bring it back through the per-field merge. Gentle mode stays as the person has
 * it (their own setting, also kept on a withdrawal). Returns whether anything was removed.
 */
export function clearHealthAnswerIn(p: Profile, kind: HealthAnswerKind, at: string): boolean {
  if (kind === 'pregnancy') {
    if (!p.pregnancy) return false
    delete p.pregnancy
  } else {
    if (p.outcomes?.[kind] === undefined) return false
    const o = { ...p.outcomes }
    delete o[kind]
    if (Object.keys(o).length) p.outcomes = o; else delete p.outcomes
  }
  p.answeredAt = { ...p.answeredAt, [healthAnswerField(kind)]: at }
  return true
}

/** The re-ask's answer: it still applies (re-dated, asked again in 12 weeks), or it doesn't (the flag goes). */
export type PregnancyStatus = 'still-applies' | 'no-longer'

/** Apply the answer to "Does this still apply?". `today` is a local date, `at` the ISO time. */
export function confirmPregnancyIn(p: Profile, status: PregnancyStatus, today: string, at: string): void {
  if (status === 'no-longer') { clearHealthAnswerIn(p, 'pregnancy', at); return }
  p.pregnancy = { flagged: true, askedAt: today }
  p.answeredAt = { ...p.answeredAt, pregnancy: at }
}

/** Answers Profile's "Change" can set (board ob7-1): the conditions outcome and the wellbeing answer. */
export type ChangeableAnswer =
  | { kind: 'medical'; value: 'flagged' | 'clear' }
  | { kind: 'wellbeing'; value: 'flagged' | 'clear' | 'undisclosed' }

/**
 * Set one answer from Profile, as the wizard would: outcomes only, stamped for the per-field
 * merge. Wellbeing Yes or Sometimes turns gentle mode on (as in the wizard, §3); moving off it
 * turns gentle mode off again, since that answer is what turned it on. Returns whether it changed.
 */
export function setHealthAnswerIn(p: Profile, a: ChangeableAnswer, at: string): boolean {
  const before = p.outcomes?.[a.kind]
  if (before === a.value) return false
  p.outcomes = { ...p.outcomes, [a.kind]: a.value }
  const stamps: Record<string, string> = { [healthAnswerField(a.kind)]: at }
  if (a.kind === 'wellbeing') {
    if (a.value === 'flagged' && !p.gentle) { p.gentle = true; stamps.gentle = at }
    else if (before === 'flagged' && a.value !== 'flagged' && p.gentle) { p.gentle = false; stamps.gentle = at }
  }
  p.answeredAt = { ...p.answeredAt, ...stamps }
  return true
}

/**
 * After clearing `kind`, calorie numbers would still be hidden by something else: gentle mode or
 * a wellbeing Yes/Sometimes, or the other answer that hides them (pregnancy). The clear
 * confirm then says so instead of promising numbers (s-ob7, the undrawn variant).
 */
export function numbersStayHidden(p: Pick<Profile, 'gentle' | 'outcomes' | 'pregnancy'>, kind: HealthAnswerKind): boolean {
  return !!p.gentle || p.outcomes?.wellbeing === 'flagged' || (kind !== 'pregnancy' && !!p.pregnancy?.flagged)
}

/** "Ask me later" on the re-ask: the flag and its date stay; it comes back in 2 weeks. */
export function snoozePregnancyIn(p: Profile, today: string, at: string): boolean {
  if (!p.pregnancy?.flagged) return false
  p.pregnancy = { ...p.pregnancy, snoozedAt: today }
  p.answeredAt = { ...p.answeredAt, pregnancy: at }
  return true
}

/** Routing input from a saved profile and the current weight. */
export function safetyAnswersFrom(p: Profile, weightKg: number | null, healthConsent: boolean): SafetyAnswers {
  return {
    age: p.age,
    heightCm: p.height,
    weightKg,
    goal: p.goal,
    outcomes: p.outcomes,
    pregnant: !!p.pregnancy?.flagged,
    healthConsent,
  }
}

/**
 * Routing for screens outside onboarding (Profile's suggestion), from what's stored. A profile
 * that hasn't onboarded has no screener answers, and §12 keeps existing users' numbers as they
 * are, so its missing outcomes count as clear and consent as given (the one-time consent sheet
 * handles that separately). The rules that don't depend on screener answers always apply:
 * age (under 18: the stop; missing: the safe defaults), the pregnancy flag and the BMI gate. Onboarded profiles route exactly
 * as the summary did.
 */
export function profileRouting(p: Profile, weightKg: number | null, healthConsent: boolean): SafetyRouting {
  const a = safetyAnswersFrom(p, weightKg, healthConsent)
  if (p.onboardedAt) return routeSafety(a)
  return routeSafety({ ...a, healthConsent: true, outcomes: { readiness: 'clear', medical: 'clear', wellbeing: 'clear', baseline: 'ok', ...p.outcomes } })
}

/** BMI for the safety gate only. Never returned to the UI. */
function lowBmi(kg: number | null | undefined, cm: number | null | undefined): boolean {
  if (!kg || !cm) return false
  return kg / (cm / 100) ** 2 < LOW_BMI
}

/**
 * Safety routing, first-run-onboarding §3 with the §2.1 skipped-answer defaults:
 * - under 18: kind stop (Tali is strictly 18+)
 * - age missing: no deficit, weight hidden, no AI, no calorie number
 * - pregnant or breastfeeding: maintenance only, no calorie number, gentle training, midwife/GP
 * - BMI under 18.5: no deficit (a gate only)
 * - wellbeing Yes/Sometimes: no deficit, gentle mode on, weight hidden, calm signposting;
 *   "Rather not say" or skipped: maintenance pre-selected, gentle mode offered
 * - readiness yes: gentler start plus signposting; skipped: the same dose, signposting quietly
 * - medical flag: maintenance allowed (no deficit), no high-protein anchor, GP note. The flag
 *   keeps the protein rule even if the goal later stops meaning eating less.
 * - sleep/stress low or skipped: calories near maintenance, a gentler start
 * - health consent declined: no calorie numbers and no weight until they agree (§14)
 */
export function routeSafety(a: SafetyAnswers): SafetyRouting {
  const o = a.outcomes ?? {}
  const r: SafetyRouting = {
    noDeficit: false, hideWeight: false, noAI: false, gentle: false, maintenanceOnly: false,
    hideCalories: false, signpost: [], hiddenReason: null, gentlerStart: false, nearMaintenance: false,
    startAtMaintenance: false, offerGentle: false, noProteinAnchor: false, gpNote: false,
    quietSignpost: false, reasons: [], defaults: [],
  }
  const sp = new Set<SignpostKind>()
  const hide = (why: HiddenReason) => { r.hideCalories = true; r.hiddenReason ??= why }

  if (isUnderAge(a.age)) {
    return { ...r, stop: 'under16', noDeficit: true, hideWeight: true, noAI: true, maintenanceOnly: true,
      hideCalories: true, hiddenReason: 'under16', reasons: ['under16'] }
  }

  if (!a.healthConsent) { r.reasons.push('no-consent'); hide('no-consent'); r.hideWeight = true }

  if (a.age == null) {
    r.reasons.push('age-missing'); r.defaults.push('age'); hide('no-age')
    r.noDeficit = true; r.hideWeight = true; r.noAI = true
  }

  if (a.pregnant) {
    r.reasons.push('pregnancy')
    r.maintenanceOnly = true; r.noDeficit = true; r.gentlerStart = true
    hide('pregnancy'); sp.add('midwife')
  }

  if (lowBmi(a.weightKg, a.heightCm)) { r.reasons.push('low-bmi'); r.noDeficit = true }

  if (o.wellbeing === 'flagged') {
    r.reasons.push('wellbeing')
    r.noDeficit = true; r.gentle = true; r.hideWeight = true
    hide('gentle')
    for (const k of ['beat', 'nhs111-mental-health', 'nhs111', 'samaritans', 'emergency'] as const) sp.add(k)
  } else if (o.wellbeing !== 'clear') {
    if (o.wellbeing == null) r.defaults.push('wellbeing')
    r.startAtMaintenance = true; r.offerGentle = true
  }

  let quiet = false
  if (o.readiness === 'flagged') {
    r.reasons.push('readiness'); r.gentlerStart = true; sp.add('gp'); sp.add('nhs111')
  } else if (o.readiness == null) {
    r.defaults.push('readiness'); r.gentlerStart = true; quiet = true
  }

  if (o.medical === 'flagged') {
    r.reasons.push('medical')
    r.noDeficit = true; r.noProteinAnchor = true; r.gpNote = true; sp.add('gp')
  }

  if (o.baseline !== 'ok') {
    if (o.baseline == null) r.defaults.push('baseline')
    r.nearMaintenance = true; r.gentlerStart = true
  }

  // skipped readiness: its GP and NHS 111 line is shown quietly, unless another row already
  // signposts with more weight
  if (quiet && !sp.size) { sp.add('gp'); sp.add('nhs111'); r.quietSignpost = true }
  r.signpost = SIGNPOST_ORDER.filter((k) => sp.has(k))
  return r
}
