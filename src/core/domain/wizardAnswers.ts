/**
 * What each wizard screen does with its picks (first-run-onboarding §2, §2.1, §8), so the web
 * wizard (src/screens/onboarding/Wizard.tsx) and the native one ask the same and keep the same.
 * Pure, no React: a screen holds its picks in local state, starts them from `…Init(d)`, and on
 * Continue or Skip passes the result of `…Answer` / `…Skip` to the wizard's `go`.
 *
 * Also the draft's own rules: what may be kept on the device (never health answers without the
 * local consent record, never Redo setup's under-18 age) and what the first-run age stop keeps.
 */
import type { BodyArea, OnboardingOutcomes } from '../types'
import type { Lately } from './engine'
import { baselineOutcome, medicalOutcome, newDraft, readinessOutcome, type WizardDraft, type WizardMode } from './wizard'
import { rangeEngineMinutes, type SessionRange } from './warmup'

/* ---------------- the draft on this device ---------------- */

/** Anything health-related in the draft (plan §8: never kept without a local health consent). */
export const hasHealth = (d: WizardDraft): boolean => Object.keys(d.outcomes).length > 0 || d.pregnant !== undefined || d.height != null || d.weight != null ||
  !!d.sexAnswer || !!d.movement || !!d.areas

/** What a draft is saved as: Redo setup's under-18 stop keeps no age (a reload asks the age again). */
export const keptDraft = (d: WizardDraft): WizardDraft => (d.redo && d.step === 'under16' ? { ...d, age: undefined, step: 'age' } : d)

/** Whether a draft may be written to this device (plan §8). */
export const mayKeep = (d: WizardDraft, health: boolean): boolean => health || !hasHealth(keptDraft(d))

/**
 * The first-run age stop keeps nothing but the age it was given ("We haven't kept any of your
 * answers"): the draft it resets to, or null when there's nothing to reset (or it's Redo setup's).
 */
export function stopReset(d: WizardDraft, mode: WizardMode): WizardDraft | null {
  if (d.step !== 'under16' || d.redo) return null
  if (d.name === undefined && !d.motivations && !Object.keys(d.outcomes).length) return null
  return { ...newDraft(mode, d.seed), step: 'under16', age: d.age, skipped: d.skipped }
}

/** An outcome skipped or left unanswered: dropped from the draft, never guessed. */
export function withoutOutcome(d: WizardDraft, key: keyof OnboardingOutcomes): Pick<WizardDraft, 'outcomes'> {
  const outcomes = { ...d.outcomes }
  delete outcomes[key]
  return { outcomes }
}

/* ---------------- a few health questions (readiness) ---------------- */

export type PregnancyWhich = 'pregnant' | 'breastfeeding' | 'surgery'
export interface ReadinessPicks { items: (boolean | undefined)[]; which: PregnancyWhich | undefined }

/** The answers stay on the screen, only the outcome is kept: a kept "clear" shows as three No's. */
export const readinessInit = (d: WizardDraft): ReadinessPicks => ({
  items: d.outcomes.readiness === 'clear' ? [false, false, false] : [undefined, undefined, d.pregnant ? true : undefined],
  which: d.pregnant ? 'pregnant' : undefined,
})

/** Continue: the outcome (a kept yes stays when nothing is picked) and whether it's pregnancy or breastfeeding. */
export function readinessAnswer(d: WizardDraft, { items, which }: ReadinessPicks): Partial<WizardDraft> {
  const readiness = readinessOutcome(items) ?? (d.outcomes.readiness === 'flagged' && items.every((x) => x === undefined) ? 'flagged' : undefined)
  const outcomes: OnboardingOutcomes = { ...d.outcomes, readiness }
  if (!readiness) delete outcomes.readiness
  return { outcomes, pregnant: items[2] === true ? (which ? which !== 'surgery' : d.pregnant) : items[2] === false ? false : undefined }
}
export const readinessSkip = (d: WizardDraft): Partial<WizardDraft> => ({ ...withoutOutcome(d, 'readiness'), pregnant: undefined })

/* ---------------- your why ---------------- */

/** Picks among `known` chip keys, and the one free-text answer (60 characters). */
export function whyInit(d: WizardDraft, known: readonly string[]): { picked: string[]; other: string } {
  const k = new Set(known)
  return { picked: (d.motivations ?? []).filter((x) => k.has(x)), other: (d.motivations ?? []).find((x) => !k.has(x)) ?? '' }
}
export function whyAnswer(picked: readonly string[], other: string): Partial<WizardDraft> {
  const all = [...picked, ...(other.trim() ? [other.trim().slice(0, 60)] : [])]
  return { motivations: all.length ? all : undefined }
}

/* ---------------- how are things lately ---------------- */

/** Only the outcome (ok or low) is kept: a kept "ok" shows as the three good answers, a "low" as none. */
export const latelyInit = (d: WizardDraft): Lately => (d.outcomes.baseline === 'ok' ? { sleep: 'good', stress: 'low', room: 'plenty' } : {})
/** Continue: nothing picked keeps a stored "low" (it can't be shown as picks). */
export function latelyAnswer(d: WizardDraft, l: Lately): Partial<WizardDraft> {
  const baseline = baselineOutcome(l) ?? (d.outcomes.baseline === 'low' ? 'low' : undefined)
  return baseline ? { outcomes: { ...d.outcomes, baseline } } : withoutOutcome(d, 'baseline')
}

/* ---------------- conditions and medicines ---------------- */

export interface MedicalPicks { ticked: number[]; none: boolean }
/** The ticks are never kept: back here, only "None of these" can show again. */
export const medicalInit = (d: WizardDraft): MedicalPicks => ({ ticked: [], none: d.outcomes.medical === 'clear' })
/** A tap: "none" clears the ticks; any item clears "none". */
export function medicalPick(p: MedicalPicks, k: 'none' | number): MedicalPicks {
  if (k === 'none') return { ticked: [], none: !p.none }
  return { none: false, ticked: p.ticked.includes(k) ? p.ticked.filter((x) => x !== k) : [...p.ticked, k] }
}
/** Continue: nothing ticked keeps a stored yes. */
export function medicalAnswer(d: WizardDraft, { ticked, none }: MedicalPicks): Partial<WizardDraft> {
  const stored = d.outcomes.medical
  const medical = medicalOutcome(ticked, none) ?? (stored && stored !== 'clear' && !none ? stored : undefined)
  return medical ? { outcomes: { ...d.outcomes, medical } } : withoutOutcome(d, 'medical')
}

/* ---------------- multi-pick lists with a "none" answer (kit, enjoy, areas) ---------------- */

/** A tap in a list whose `none` is exclusive: it clears the rest, and anything else clears it. */
export function toggleExclusive<T extends string>(v: readonly T[], k: T, none: T): T[] {
  if (k === none) return v.includes(none) ? [] : [none]
  return v.includes(k) ? v.filter((x) => x !== k) : [...v.filter((x) => x !== none), k]
}

/** Areas: "None of these" is stored as an empty list (answered), Skip as undefined. */
export const areasInit = (d: WizardDraft): string[] => (d.areas ? (d.areas.length ? d.areas : ['none']) : [])
export const areasAnswer = (v: readonly string[]): Partial<WizardDraft> => ({ areas: v.length ? (v.filter((x) => x !== 'none') as BodyArea[]) : undefined })

/* ---------------- days and weekdays ---------------- */

type Days = WizardDraft['daysPerWeek']
export interface DaysPicks { n: Days; weekdays: number[] }
export const daysInit = (d: WizardDraft): DaysPicks => ({ n: (d.weekdays?.length || d.daysPerWeek) as Days, weekdays: d.weekdays ?? [] })
/** A count: picked weekdays that don't match it are cleared. */
export const daysPickN = (p: DaysPicks, x: number): DaysPicks => ({ n: x as Days, weekdays: p.weekdays.length && p.weekdays.length !== x ? [] : p.weekdays })
/** A weekday: at most 6; picking days sets the count. */
export function daysToggle(p: DaysPicks, k: number): DaysPicks {
  const next = p.weekdays.includes(k) ? p.weekdays.filter((x) => x !== k) : p.weekdays.length >= 6 ? p.weekdays : [...p.weekdays, k]
  return { weekdays: next, n: next.length ? (next.length as Days) : p.n }
}
/** Continue: picked weekdays win over the count (the week is weekday-keyed). */
export const daysAnswer = (p: DaysPicks): Partial<WizardDraft> =>
  (p.weekdays.length ? { weekdays: p.weekdays, daysPerWeek: undefined } : { daysPerWeek: p.n, weekdays: undefined })
export const daysSkip: Partial<WizardDraft> = { daysPerWeek: undefined, weekdays: undefined }

/* ---------------- minutes a session ---------------- */

/** A range (ob2-4), with the engine's nearest length; undefined is the Skip. */
export const minutesAnswer = (r: SessionRange | undefined): Partial<WizardDraft> =>
  (r ? { sessionRange: r, minutes: rangeEngineMinutes(r) } : { sessionRange: undefined, minutes: undefined })
/** Continue with nothing picked keeps the earlier answer. */
export const minutesContinue = (d: WizardDraft, r: SessionRange | undefined): Partial<WizardDraft> =>
  (r ? minutesAnswer(r) : { sessionRange: d.sessionRange, minutes: d.minutes })
