/**
 * What the wizard's draft may hold on this device, as the web's Onboarding does
 * (src/screens/onboarding/Wizard.tsx `hasHealth`, `put` and the age stop's reset). Pure, no React,
 * so npm run test:onboarding checks it. Proposed to the lead: move these into the shared core
 * (core/domain/wizard.ts) so the web imports the same copy. Type-only imports, so Node runs it
 * directly (npm run test:onboarding).
 */
import type { WizardDraft } from '@/core/domain/wizard'

/** Anything health-related in the draft (plan §8: never kept without a local health consent). */
export const hasHealth = (d: WizardDraft): boolean => Object.keys(d.outcomes).length > 0 || d.pregnant !== undefined || d.height != null || d.weight != null ||
  !!d.sexAnswer || !!d.movement || !!d.areas

/** What a draft may be saved as: Redo setup's under-18 stop is saved as its age question, with no age. */
export const keptDraft = (d: WizardDraft): WizardDraft => (d.redo && d.step === 'under16' ? { ...d, age: undefined, step: 'age' } : d)

/** Whether a draft may be written to this device (plan §8). */
export const mayKeep = (d: WizardDraft, health: boolean): boolean => health || !hasHealth(keptDraft(d))

/**
 * The first-run age stop keeps nothing but the age it was given ("We haven't kept any of your
 * answers"): the draft it resets to (`fresh` is core newDraft for this run's mode), or null.
 */
export function stopReset(d: WizardDraft, fresh: (seed: string) => WizardDraft): WizardDraft | null {
  if (d.step !== 'under16' || d.redo) return null
  if (d.name === undefined && !d.motivations && !Object.keys(d.outcomes).length) return null
  return { ...fresh(d.seed), step: 'under16', age: d.age, skipped: d.skipped }
}

