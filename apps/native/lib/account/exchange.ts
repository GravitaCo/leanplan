/**
 * Google's code exchange with one retry on a dropped connection (lead, 15 Nov: patchy phone networks
 * are normal). After the sign-in sheet, the app makes one request: the code and this phone's PKCE
 * verifier for a session (supabase.auth.exchangeCodeForSession). supabase-js removes the verifier
 * whether that request succeeds or fails, so a request that never reached Supabase would otherwise
 * mean opening the sheet again.
 *
 * So: the verifier's stored value is read before the exchange, and only when the exchange fails
 * because the request never got an answer (AuthRetryableFetchError: no connection, a timeout), it is
 * put back and the exchange runs once more, after a short pause. Anything Supabase answered (an
 * expired or used code, a wrong verifier) is never retried. A retry against a code that did reach
 * Supabase just fails the same way, as the code works once. The value is copied back exactly as it
 * was stored, never read or logged here.
 *
 * Which key: without a flow id in the exchange (Tilo passes none, and a phone has no callback URL to
 * read one from), supabase-js reads `<storageKey>-code-verifier` (auth-js lib/helpers.ts
 * retrievePKCEVerifier). Pure: no React Native, so scripts/test-account.mjs runs it in Node.
 */
import { isNetworkError } from './rules.ts'

export interface KeyStore {
  getItem: (k: string) => string | null | Promise<string | null>
  setItem: (k: string, v: string) => void | Promise<void>
}

type Result = { error: { name?: string; message?: string; status?: number } | null }

/** The key supabase-js keeps a phone's PKCE verifier under. */
export const verifierKey = (storageKey: string) => `${storageKey}-code-verifier`

export const RETRY_PAUSE_MS = 1000

export async function exchangeOnceMore<T extends Result>(exchange: () => Promise<T>, store: KeyStore, storageKey: string, pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))): Promise<T & { retried: boolean }> {
  const key = verifierKey(storageKey)
  let saved: string | null = null
  try { saved = await store.getItem(key) } catch { saved = null }
  const first = await exchange()
  if (!first.error || !isNetworkError(first.error) || saved == null) return { ...first, retried: false }
  await pause(RETRY_PAUSE_MS)
  try { await store.setItem(key, saved) } catch { return { ...first, retried: false } }
  const second = await exchange()
  return { ...second, retried: true }
}
