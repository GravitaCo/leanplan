import { isUnderAge } from '@/core/domain/age'
import type { BodyArea, Equipment, Experience, Goal, Modality, MovingNow, Profile, TrainingPlace, Why } from '@/core/types'

/**
 * The engine's day-1 inputs: the onboarding answers (first-run-onboarding.md §2, engine §3.2).
 * Every field is optional; a skipped one falls to the safe side (§2.1) and is traced with the
 * `default` WhyCode. With no training details at all the engine returns the Starter week.
 */
/**
 * 'under-18' is a backstop only: Tali is strictly 18+ and the stop happens before the engine
 * (core/domain/age.ts), but if an under-18 age ever reached it, it gets no AI and words only.
 */
export type AgeBand = 'under-18' | '18-54' | '55-64' | '65+'
export type Minutes = 10 | 20 | 30 | 45 | 60
export type DaysPerWeek = 1 | 2 | 3 | 4 | 5 | 6
/** The readiness check's outcome only (PAR-Q+ style, 3 items); the answers themselves are never stored. */
export type Readiness = 'clear' | 'flagged'
/** The wellbeing question's outcome; "yes" or "sometimes" routes to gentle mode (§3). */
export type Wellbeing = 'no' | 'sometimes' | 'yes' | 'rather-not-say'
/** "How are things lately?" (screen 5). */
export interface Lately { sleep?: 'good' | 'mixed' | 'poor'; stress?: 'low' | 'some' | 'high'; room?: 'plenty' | 'some' | 'little' }
/** From the nutrition side (plan §3.3): a big deficit holds progression and keeps volume low. */
export type Deficit = 'none' | 'moderate' | 'big'

export interface PlanInputs {
  goal?: Goal
  experience?: Experience
  movingNow?: MovingNow
  daysPerWeek?: DaysPerWeek
  /** 0 = Sun … 6 = Sat; when given, the count comes from here */
  weekdays?: number[]
  minutes?: Minutes
  place?: TrainingPlace[]
  /** kit ticked ("What do you have at home?"); the gym's kit comes from `place` */
  equipment?: Equipment[]
  enjoy?: Modality[]
  bodyAreas?: BodyArea[]
  readiness?: Readiness
  lately?: Lately
  wellbeing?: Wellbeing
  /** profile.gentle */
  gentle?: boolean
  /** the gentle start is pre-selected from the answers (§4); true or false here is the person's own choice */
  gentleStart?: boolean
  ageBand?: AgeBand
  deficit?: Deficit
}
export type InputField = keyof PlanInputs

/**
 * What each field is for (engine §3.7 test 1: a field is tested against its declared scope and a
 * field with no job is removed from the questionnaire). `options` are the answers the tests try,
 * `undefined` meaning skipped. Declared here, next to the fields, so the test reads it.
 */
export type Scope = 'plan' | 'targets' | 'copy' | 'safety'
export const FIELDS: { [K in InputField]-?: { scope: Scope[]; options: PlanInputs[K][] } } = {
  goal: { scope: ['plan', 'targets'], options: ['build-muscle', 'increase-strength', 'lose-fat', 'increase-endurance', 'feel-better'] },
  experience: { scope: ['plan'], options: [undefined, 'beginner', 'intermediate', 'advanced'] },
  movingNow: { scope: ['plan'], options: [undefined, 'not-at-all', 'some', 'regularly'] },
  daysPerWeek: { scope: ['plan'], options: [undefined, 1, 2, 3, 4, 5, 6] },
  weekdays: { scope: ['plan'], options: [undefined, [1, 3, 5], [2, 4, 6], [1, 2, 3], [0, 3], [1, 2, 4, 5], [1, 2, 3, 4, 5, 6], [3]] },
  minutes: { scope: ['plan'], options: [undefined, 10, 20, 30, 45, 60] },
  place: { scope: ['plan'], options: [undefined, ['home'], ['gym'], ['outdoors'], ['home', 'outdoors'], ['gym', 'home']] },
  equipment: { scope: ['plan'], options: [undefined, [], ['dumbbell'], ['band'], ['kettlebell'], ['dumbbell', 'bench'], ['pull-up-bar'], ['dumbbell', 'band', 'pull-up-bar', 'bench', 'mat']] },
  enjoy: { scope: ['plan'], options: [undefined, ['strength'], ['calisthenics'], ['cardio'], ['yoga'], ['pilates'], ['mobility'], ['strength', 'yoga'], ['cardio', 'strength']] },
  bodyAreas: { scope: ['plan', 'safety'], options: [undefined, [], ['knees'], ['lower-back'], ['hips'], ['ankles'], ['shoulders'], ['elbows'], ['wrists'], ['neck']] },
  readiness: { scope: ['plan', 'safety'], options: [undefined, 'clear', 'flagged'] },
  lately: { scope: ['plan', 'safety'], options: [undefined, { sleep: 'good', stress: 'low', room: 'plenty' }, { sleep: 'poor' }, { stress: 'high' }, { room: 'little' }] },
  wellbeing: { scope: ['safety'], options: [undefined, 'no', 'sometimes', 'yes', 'rather-not-say'] },
  gentle: { scope: ['safety'], options: [undefined, false, true] },
  gentleStart: { scope: ['plan'], options: [undefined, false, true] },
  ageBand: { scope: ['plan', 'safety'], options: [undefined, 'under-18', '18-54', '55-64', '65+'] },
  deficit: { scope: ['plan', 'safety'], options: [undefined, 'none', 'moderate', 'big'] },
}

/** The setup-card answers (screen 9): none of these given → the Starter week. */
export const TRAINING_FIELDS: InputField[] = ['experience', 'movingNow', 'daysPerWeek', 'weekdays', 'minutes', 'place', 'equipment', 'enjoy', 'bodyAreas']

/** Days → the fixed default weekdays when days are given but weekdays aren't (onboarding §2). */
export const DEFAULT_WEEKDAYS: Record<DaysPerWeek, number[]> = {
  1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
}

/** Mon → Sun, the order the week is read in. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function ageBandOf(age: number | null | undefined): AgeBand | undefined {
  if (age == null || !Number.isFinite(age)) return undefined
  // the kind stop happens before the engine ("Tali is for 18+"); this is the backstop
  if (isUnderAge(age)) return 'under-18'
  return age < 55 ? '18-54' : age < 65 ? '55-64' : '65+'
}

/**
 * Inputs from the stored profile plus the outcome-only answers that are never stored in it
 * (readiness, lately, the wellbeing outcome) and the nutrition deficit.
 */
export function inputsFromProfile(p: Pick<Profile, 'goal' | 'age' | 'gentle' | 'training'>, extra: Pick<PlanInputs, 'readiness' | 'lately' | 'wellbeing' | 'deficit' | 'gentleStart'> = {}): PlanInputs {
  const t = p.training ?? {}
  const band = ageBandOf(p.age)
  return {
    goal: p.goal, experience: t.experience, movingNow: t.movingNow, daysPerWeek: t.daysPerWeek, weekdays: t.weekdays,
    minutes: t.minutesPerSession, place: t.place, equipment: t.equipment, enjoy: t.modalities, bodyAreas: t.limitations,
    gentle: p.gentle, ageBand: band, ...extra,
  }
}

/** Anything worth reading in `lately`: an empty object counts as skipped. */
const answered = (l: Lately | undefined) => !!l && (l.sleep != null || l.stress != null || l.room != null)
/** Poor sleep, high stress or little room (onboarding §4); skipped counts as poor (§2.1). */
export const poorLately = (l: Lately | undefined) => !answered(l) || l!.sleep === 'poor' || l!.stress === 'high' || l!.room === 'little'

/** A `default` why for a skipped field (§2.1): the plan never claims a skipped field as a reason. */
export const defaultWhy = (field: InputField, about: Why['about'] = 'plan', value?: string): Why => ({ code: 'default', about, field, ...(value ? { data: { value } } : {}) })

export const hasTrainingAnswers = (i: PlanInputs) => TRAINING_FIELDS.some((f) => i[f] !== undefined)
