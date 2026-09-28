/**
 * The onboarding wizard's draft, on this device only, so a reload or an app switch mid-wizard
 * (offline too) picks up where it left off. It holds outcomes only (core/domain/wizard.ts), and is
 * written only once a local health consent exists (the guard in the store). Under `tali.`, so
 * sign-out-and-remove and account deletion wipe it (account.ts isPersonalKey).
 *
 * Also the under-18 deletion (the wizard's age stop, 18+ for now) that couldn't reach the server yet (onboarding §14): the device's
 * data is wiped at once; the account is deleted on the next connection.
 */
import type { WizardDraft } from '@/core/domain/wizard'
import type { DeleteResult } from './account'

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

/**
 * An under-18 account whose server deletion still has to run. `tries` counts the server's refusals
 * and failures (never "no connection"), `next` is when the next automatic try may run (ms), and
 * `stage: 'sign-in'` means automatic tries have stopped: this device is signed out and the deletion
 * finishes when that account signs in again (a fresh sign-in also passes the server's re-auth).
 */
export interface PendingDeletion { uid: string; at: string; tries?: number; next?: number; stage?: 'retry' | 'sign-in' }

export function pendingDeletion(): PendingDeletion | null {
  try {
    const p = JSON.parse(store()?.getItem(PENDING_KEY) || 'null')
    if (!p || typeof p.uid !== 'string' || typeof p.at !== 'string') return null
    return {
      uid: p.uid, at: p.at,
      ...(Number.isFinite(p.tries) ? { tries: p.tries } : {}),
      ...(Number.isFinite(p.next) ? { next: p.next } : {}),
      ...(p.stage === 'sign-in' || p.stage === 'retry' ? { stage: p.stage } : {}),
    }
  } catch { return null }
}
export function markPendingDeletion(p: PendingDeletion): void {
  try { store()?.setItem(PENDING_KEY, JSON.stringify(p)) } catch { /* blocked */ }
}
export function clearPendingDeletion(): void {
  try { store()?.removeItem(PENDING_KEY) } catch { /* blocked */ }
}

/** Automatic tries before this device stops and asks for a fresh sign-in. */
export const UNDER_AGE_MAX_TRIES = 6
/** Back-off between automatic tries: 1, 2, 4 … minutes, at most an hour. */
export const underAgeRetryDelayMs = (tries: number): number => Math.min(60_000 * Math.pow(2, Math.max(0, tries - 1)), 3_600_000)

/**
 * Whether a try may run now, for a session of the pending account (the store adds its own
 * once-a-minute guard). At the sign-in stage this device was signed out, so a session means the
 * person has just signed in again: that fresh sign-in is the one try, straight away.
 */
export const underAgeRetryDue = (p: PendingDeletion, now: number): boolean => p.stage === 'sign-in' || p.next === undefined || now >= p.next

/**
 * Whether the under-age stop may wipe this device's data: it's the under-age account's (`owner`
 * equals `uid`), or nobody's yet (no owner: a new device). Never another account's data.
 */
export const underAgeWipesDevice = (owner: string | undefined, uid: string | undefined): boolean => !owner || owner === uid

export type UnderAgeStep =
  /** the account is gone: forget the pending deletion */
  | { kind: 'done' }
  /** try again later (automatically), with this record */
  | { kind: 'wait'; pending: PendingDeletion }
  /** stop trying: sign this device out and ask for a fresh sign-in, keeping this record */
  | { kind: 'sign-in'; pending: PendingDeletion }

/**
 * What to do after an under-age deletion attempt. No connection or a sync in the way changes
 * nothing. The server's re-auth refusal (an account over 24 hours old) stops at once: only a fresh
 * sign-in can finish it. Anything else backs off, and stops after UNDER_AGE_MAX_TRIES. Pure.
 */
export function underAgeNext(status: DeleteResult['status'], p: PendingDeletion, now: number): UnderAgeStep {
  if (status === 'ok') return { kind: 'done' }
  const base: PendingDeletion = { uid: p.uid, at: p.at }
  if (status === 'offline' || status === 'busy') return { kind: 'wait', pending: { ...p } }
  if (status === 'reauth') return { kind: 'sign-in', pending: { ...base, stage: 'sign-in' } }
  const tries = (p.stage === 'sign-in' ? 0 : p.tries ?? 0) + 1
  if (tries >= UNDER_AGE_MAX_TRIES) return { kind: 'sign-in', pending: { ...base, stage: 'sign-in' } }
  return { kind: 'wait', pending: { ...base, tries, next: now + underAgeRetryDelayMs(tries), stage: 'retry' } }
}

/** "Not now" on Today's "Finish your setup" card (ob2-0b), on this device. */
export const setupCardHidden = (): boolean => { try { return store()?.getItem(SETUP_HIDDEN_KEY) === '1' } catch { return false } }
export const hideSetupCard = (): void => { try { store()?.setItem(SETUP_HIDDEN_KEY, '1') } catch { /* blocked */ } }
