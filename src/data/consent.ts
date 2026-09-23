/**
 * The user's explicit consent (UK/EU GDPR Art. 9(2)(a)) to Tali processing their health
 * data, plus acceptance of the terms and the age confirmation. Kept in its own key, not in
 * the synced profile: writing the profile on a new device before the first pull would win
 * last-write-wins and overwrite the account's real profile. Accounts also get a copy in
 * the Supabase user's metadata (see the store) so consent can be shown server-side.
 */
import { CONSENT_VERSION } from '@/core/legal'

export interface ConsentRecord {
  /** CONSENT_VERSION the user agreed to */
  v: string
  /** ISO time consent was given */
  at: string
  health: true
  terms: true
  adult: true
  /** the account it was given for; absent = given as a guest, for this device only */
  uid?: string
}

const KEY = 'tali.consent'

export function newConsent(uid?: string): ConsentRecord {
  const r: ConsentRecord = { v: CONSENT_VERSION, at: new Date().toISOString(), health: true, terms: true, adult: true }
  if (uid) r.uid = uid
  return r
}

/** A record for the current version, or null (never given, or a material change since). */
export function currentConsent(x: unknown): ConsentRecord | null {
  const r = x as Partial<ConsentRecord> | null
  return r && r.v === CONSENT_VERSION && r.health === true && r.terms === true && r.adult === true && typeof r.at === 'string'
    ? (r as ConsentRecord) : null
}

export function loadConsent(): ConsentRecord | null {
  try { return currentConsent(JSON.parse(localStorage.getItem(KEY) || 'null')) } catch { return null }
}

export function saveConsent(r: ConsentRecord | null): void {
  try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY) } catch { /* blocked */ }
}
