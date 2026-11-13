/**
 * Profile's links into stream N2 (account, consent and legal; branch native/n2-account). Profile
 * owns the rows; N2 owns the flows behind them. Until N2 lands, each entry point here says so
 * instead of doing anything, and never changes data, consent or the account. When N2 merges, this
 * file re-exports its real entry points under the same names, and nothing else in Profile changes.
 */
import { Alert, Linking } from 'react-native'
import { LEGAL_URLS, type LegalDocId } from '@/core/legal'
import type { PersistedState } from '@/data/persistence'

const pending = (what: string) => Alert.alert(what, 'This arrives with the account and consent work (stream N2). Nothing has changed.')

/** Back up and restore › Export, Download a copy, and the earlier version: the share sheet (N2). */
export function exportBackup(_state: PersistedState): void { pending('Export') }

/** Back up and restore › Import: pick a backup file and read it (N2); null when nothing was picked. */
export async function pickBackup(): Promise<PersistedState | null> { pending('Import'); return null }

/** "Yes, keep it" and "Turn health data back on": the consent screen, or the one-box regrant sheet. */
export function agreeHealth(_regrant: boolean): void { pending('Health data') }

/** "Stop keeping my health data" and Privacy's "Withdraw consent": the download-first withdraw step. */
export function withdrawHealth(): void { pending('Health data') }

/** "Read the privacy notice" (onboarding/Consent.tsx PrivacySheet). */
export function openPrivacyNotice(): void { pending('Privacy notice') }

/** Delete account (boards ob6-5, ob6-6): the delete view and its typed confirm. */
export function openDeleteAccount(): void { pending('Delete account') }

/** Privacy's three legal rows: the published pages on www.tilo.fit, as the web app links out. */
export function openLegal(id: LegalDocId): void { void Linking.openURL(LEGAL_URLS[id]) }
