/**
 * What the app shows before (or instead of) itself, in src/App.tsx's order. Pure, so it's tested
 * (scripts/test-account.mjs) and Node imports it directly: lib/gate.tsx reads the store and renders
 * the screen for the step.
 *
 * Native differs in one case, on purpose: the web shows the redo wizard's own 18+ stop while that
 * wizard is open; native has no wizard until N11, so the app's stop shows whenever an under-18 age
 * is known. It never opens past one (compliance, 13 Nov).
 */
export type GateStep = 'loading' | 'owner' | 'sign-in' | 'deleting' | 'under-age' | 'consent-profile' | 'consent' | null

export interface GateFacts {
  ready: boolean
  /** another account's log may be on this phone (store.ownerAsk) */
  ownerAsk: boolean
  signedIn: boolean
  /** a new under-18 account's deletion is still pending for this account (onboardingDraft) */
  pendingDeletion: boolean
  underAge: boolean
  /** Profile opened the consent screen (store.consentOpen) */
  consentOpen: boolean
  /** no health answer yet and the screen is due (healthConsentAnswered, liveConsentDue) */
  consentDue: boolean
}

export function gateStep(f: GateFacts): GateStep {
  if (!f.ready) return 'loading'
  if (f.ownerAsk) return 'owner'
  if (!f.signedIn) return 'sign-in'
  if (f.pendingDeletion) return 'deleting'
  if (f.underAge) return 'under-age'
  if (f.consentOpen) return 'consent-profile'
  if (f.consentDue) return 'consent'
  return null
}

/** The pending deletion counts only for the account it belongs to: the live session's, or offline
 *  this phone's owner. */
export function pendingFor(pendingUid: string | null | undefined, x: { authed: boolean; sessionUid: string | null; owner: string | undefined }): boolean {
  if (!pendingUid) return false
  return pendingUid === (x.authed ? x.sessionUid : x.owner)
}
