/**
 * The onboarding wizard's draft, on this device only, so a reload or an app switch mid-wizard
 * (offline too) picks up where it left off. It holds outcomes only (core/domain/wizard.ts), and is
 * written only once a local health consent exists (the guard in the store). Under `tali.`, so
 * sign-out-and-remove and account deletion wipe it (account.ts isPersonalKey).
 *
 * Also the under-16 deletion that couldn't reach the server yet (onboarding §14): the device's
 * data is wiped at once; the account is deleted on the next connection.
 */
import type { WizardDraft } from '@/core/domain/wizard'

const DRAFT_KEY = 'tali.onboarding'
const PENDING_KEY = 'tali.pendingDelete'
const SETUP_HIDDEN_KEY = 'tali.setupCardHidden'

const store = (): Storage | null => { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }

export function loadDraft(): WizardDraft | null {
  try {
    const d = JSON.parse(store()?.getItem(DRAFT_KEY) || 'null')
    return d && typeof d === 'object' && d.v === 1 && typeof d.step === 'string' && typeof d.seed === 'string' ? { outcomes: {}, ...d } : null
  } catch { return null }
}
export function saveDraft(d: WizardDraft): boolean {
  try { store()?.setItem(DRAFT_KEY, JSON.stringify(d)); return true } catch { return false }
}
export function clearDraft(): void {
  try { store()?.removeItem(DRAFT_KEY) } catch { /* blocked */ }
}

/** An under-16 account whose server deletion still has to run (the uid it belongs to). */
export function pendingDeletion(): { uid: string; at: string } | null {
  try {
    const p = JSON.parse(store()?.getItem(PENDING_KEY) || 'null')
    return p && typeof p.uid === 'string' && typeof p.at === 'string' ? p : null
  } catch { return null }
}
export function markPendingDeletion(uid: string, at: string): void {
  try { store()?.setItem(PENDING_KEY, JSON.stringify({ uid, at })) } catch { /* blocked */ }
}
export function clearPendingDeletion(): void {
  try { store()?.removeItem(PENDING_KEY) } catch { /* blocked */ }
}

/** "Not now" on Today's "Finish your setup" card (ob2-0b), on this device. */
export const setupCardHidden = (): boolean => { try { return store()?.getItem(SETUP_HIDDEN_KEY) === '1' } catch { return false } }
export const hideSetupCard = (): void => { try { store()?.setItem(SETUP_HIDDEN_KEY, '1') } catch { /* blocked */ } }
