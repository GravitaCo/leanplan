/**
 * Whether the first-run wizard shows (plan §12), without the feature flag so `npm test` can run
 * it (screens/onboarding/Consent.tsx wizardDue adds the flag). No React.
 */
import type { PersistedState } from './persistence'
import type { WizardDraft } from '@/core/domain/wizard'
import { hasExistingData } from './consent'

/**
 * How long the first run waits for the first pull (a second device, or someone who used Tali
 * before) before showing the wizard anyway. Counted from when the wait starts, not from launch.
 */
export const FIRST_PULL_WAIT_MS = 10_000

/**
 * Someone who used Tali before onboarding (plan §12): anything logged or saved, a plan, or a goal
 * or age set in Profile. They keep their current week and targets, and get the Build my plan card.
 */
export function usedBefore(s: PersistedState): boolean {
  return hasExistingData(s) || (s.trainingPlans || []).length > 0 || !!s.profile?.goal || s.profile?.age != null
}

export interface FirstRunCtx {
  online: boolean
  signedIn: boolean
  /** the wizard is on screen in this session already */
  showing: boolean
  /** this device's wizard draft, if any */
  draft: WizardDraft | null
}

/**
 * true: show the wizard; 'wait': hold the loading screen for the first pull; false: the app.
 * - A first run under way (a first-run draft: the person has tapped something) keeps going,
 *   whatever the pull brings in; their answers merge per field (plan §12). Profile's Redo setup and
 *   Set up my plan drafts (`redo`) open only from Profile, never here.
 * - Otherwise onboarded (here or elsewhere) or used before: no wizard, even if it was on screen
 *   (nothing has been answered yet, so switching to the app loses nothing).
 * - Online and signed in with no pull yet: wait for it (App caps the wait at FIRST_PULL_WAIT_MS).
 *   Offline it runs, and the answers merge on sync.
 */
export function wizardDueFor(s: PersistedState, x: FirstRunCtx): boolean | 'wait' {
  const started = x.draft?.mode === 'first' && !x.draft.redo
  if (started && (x.showing || !s.profile?.onboardedAt)) return true
  if (s.profile?.onboardedAt) return false
  if (usedBefore(s)) return false
  if (x.online && x.signedIn && !s._meta?.lastPull) return 'wait'
  return true
}
