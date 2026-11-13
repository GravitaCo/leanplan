/**
 * Whether the first-run wizard shows (plan §12), without the feature flag so `npm test` can run
 * it (wizardDue below adds the flag). No React, so the native app imports it too.
 */
import type { PersistedState } from './persistence'
import type { WizardDraft } from '@/core/domain/wizard'
import { hasExistingData } from './consent'
import { loadDraft, setupCardHidden } from './onboardingDraft'
import { ONBOARDING_ENABLED } from './onboardingFlag'

/**
 * How long the first run waits for the first pull (a second device, or someone who used Tilo
 * before) before showing the wizard anyway. Counted from when the wait starts, not from launch.
 */
export const FIRST_PULL_WAIT_MS = 10_000

/**
 * Someone who used Tilo before onboarding (plan §12): anything logged or saved, a plan, or a goal
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

/**
 * The first-run wizard is due (behind ONBOARDING_ENABLED): wizardDueFor with this device's draft.
 * Online and signed in it waits for the first full pull (`_meta.lastPull`), so a second device, or
 * someone who used Tilo before, never sees the wizard flash up; once it's on screen and the person
 * has started, it stays.
 */
export function wizardDue(s: PersistedState, x: { online: boolean; signedIn: boolean; showing: boolean }): boolean | 'wait' {
  if (!ONBOARDING_ENABLED) return false
  return wizardDueFor(s, { ...x, draft: loadDraft() })
}

/** Today's "Finish your setup" card (ob2-0b): onboarded, on the Starter week, not waved off here. */
export function setupCardDue(s: PersistedState): boolean {
  if (!ONBOARDING_ENABLED || !s.profile?.onboardedAt || setupCardHidden()) return false
  const p = (s.trainingPlans || []).find((x) => x.state === 'active')
  return !!p && !!p.why?.some((w) => w.code === 'starter')
}

/** Plan's "Build my plan" card (ob6-4): anyone whose running week wasn't built from their answers. */
export function buildCardDue(s: PersistedState): boolean {
  if (!ONBOARDING_ENABLED) return false
  const p = (s.trainingPlans || []).find((x) => x.state === 'active')
  return !(p?.source === 'recommended' && p.why?.length && !p.why.some((w) => w.code === 'starter'))
}
