/**
 * Sign-in links on a phone. Every Supabase redirect comes back to the app at tilo://auth-callback
 * (exactly that entry is in Supabase's redirect list), with a one-time code that is useless without
 * the PKCE verifier kept on this phone (lib/platform/storage.ts keeps it in the encrypted store):
 *
 * - "Continue with Google" opens the system's sign-in sheet and takes the code from its return;
 * - the emails (confirm a new account, reset a password) open the link in the browser, which hands
 *   tilo://auth-callback?code=… to the app; app/auth-callback.tsx exchanges it.
 *
 * In the web render (side-by-side checks only) the links come back to the page instead, as on the web.
 */
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/data/supabase'
import { useStore } from '@/store/store'
import { codeFrom, failureOf, reauthMatches, type SignInFailure } from './rules'
import { AUTH_OPTIONS, setGoogleOAuth } from '@/data/platform'
import { exchangeOnceMore } from './exchange'
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto'
import { appleSignInNative } from '../../modules/tilo-auth'

export const REDIRECT = 'tilo://auth-callback'
const web = Platform.OS === 'web'

/** Where the emails' links come back to. */
export const emailRedirect = (): string => (web ? window.location.origin + window.location.pathname : REDIRECT)

/** True while a Google sign-in sheet is open: its return is this function's to exchange. On Android the
 *  same return also arrives as a tilo:// link, so app/auth-callback.tsx leaves it alone meanwhile
 *  (security-data, 13 Nov). */
let googleOpen = false
export const googleInProgress = () => googleOpen

/** `reason` picks the words on screen (Auth.tsx); the raw message is for the log only, never shown. */
export type GoogleResult = { status: 'ok'; uid: string } | { status: 'cancelled' } | { status: 'error'; reason: SignInFailure; message: string }

/**
 * A sign-in diagnostic in the device log (Xcode or Console.app; lead, 15 Nov): which step failed and
 * how, never an email, a code, a token or a user id. Error names and messages from supabase-js, Expo's
 * fetch and AuthenticationServices carry none of those.
 */
function fail(provider: 'google' | 'apple', step: string, e: unknown): GoogleResult {
  const err = (e && typeof e === 'object' ? e : { message: String(e) }) as { name?: string; message?: string; status?: number; code?: string }
  const reason = failureOf(err)
  console.warn(`[sign-in] ${provider} failed at ${step}: ${reason}`, err.name ?? '', err.code ?? '', err.status ?? '', err.message ?? '')
  return { status: 'error', reason, message: err.message ?? '' }
}

/**
 * Google sign-in (and the fresh Google sign-in before deleting an account: `queryParams` asks Google
 * for its account chooser, hinted to this account's email, as the web does). The session reaches the
 * store through onAuthStateChange like any sign-in.
 */
export async function googleSignIn(queryParams?: Record<string, string>): Promise<GoogleResult> {
  googleOpen = true
  try {
    if (web) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: emailRedirect(), queryParams } })
      return error ? fail('google', 'start', error) : { status: 'cancelled' }
    }
    // builds the URL only (and the PKCE verifier on this phone): no request is made here
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT, skipBrowserRedirect: true, queryParams } })
    if (error || !data?.url) return fail('google', 'start', error ?? { message: 'no URL' })
    const res = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT)
    if (res.type !== 'success') return { status: 'cancelled' }
    // Supabase's own error comes back in the return (a provider not enabled, a redirect not allowed)
    // only Supabase's short error code goes to the log: its description can hold Google's code
    const { code, errCode } = codeFrom(res.url)
    if (!code) return fail('google', 'return', { message: errCode || 'no code in the return' })
    // the one request: the code and this phone's verifier for a session, at Supabase's /auth/v1/token;
    // once more if it never got an answer (lib/account/exchange.ts)
    const store = AUTH_OPTIONS?.auth.storage
    const storageKey = (supabase.auth as unknown as { storageKey: string }).storageKey
    const { data: ex, error: exErr, retried } = store
      ? await exchangeOnceMore(() => supabase.auth.exchangeCodeForSession(code), store, storageKey)
      : { ...(await supabase.auth.exchangeCodeForSession(code)), retried: false }
    if (exErr || !ex.session) return fail('google', retried ? 'exchange (after a retry)' : 'exchange', exErr ?? { message: 'no session' })
    return { status: 'ok', uid: ex.session.user.id }
  } catch (e) {
    return fail('google', 'unexpected', e)
  } finally {
    googleOpen = false
  }
}

/**
 * The shared account code (src/data/account.ts reauthWithGoogle, before deleting the account) reaches
 * this sheet through the platform. It confirms the same account (the phone's recorded owner,
 * rules.ts reauthMatches): a different Google account picked in the chooser is not a re-sign-in, so it reports an error (and the store's owner check then holds that
 * other session back; ship-critic, 13 Nov).
 */
setGoogleOAuth(async (q) => {
  const r = await googleSignIn(q)
  if (r.status !== 'ok') return r.status
  return reauthMatches(useStore.getState().data._meta?.owner, r.uid) ? 'ok' : 'error'
})

/**
 * Sign in with Apple (iOS; Benn, 13 Nov 2026): a one-time nonce made here, its SHA-256 given to
 * Apple's sheet, the raw nonce given to Supabase with Apple's token, so a token can't be replayed.
 * The session reaches the store through onAuthStateChange like any sign-in. Before deleting an
 * account (`expectOwner`), a different Apple ID is refused as the Google re-sign-in is.
 */
export async function appleSignIn(): Promise<GoogleResult & { code?: string }> {
  try {
    const raw = hex(getRandomBytes(32))
    const hashed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, raw)
    let cred
    try { cred = await appleSignInNative(hashed) } catch (e) { return fail('apple', 'sheet', e) }
    if (!cred) return { status: 'cancelled' }
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw })
    // e.g. "Unsupported provider: provider is not enabled" until Supabase's Apple provider is on
    if (error || !data.session) return fail('apple', 'token', error ?? { message: 'no session' })
    // Apple's one-time authorization code: only the delete path uses it (the server revokes with it)
    return { status: 'ok', uid: data.session.user.id, ...(cred.authorizationCode ? { code: cred.authorizationCode } : {}) }
  } catch (e) {
    return fail('apple', 'unexpected', e)
  }
}

/** Sign in with Apple again before deleting: 'ok' only for this phone's own account, with Apple's
 *  one-time code for delete-account to revoke Tilo's Sign in with Apple (never stored or logged). */
export async function appleReauth(): Promise<{ status: 'ok'; code?: string } | { status: 'cancelled' | 'error' }> {
  const r = await appleSignIn()
  if (r.status !== 'ok') return { status: r.status }
  return reauthMatches(useStore.getState().data._meta?.owner, r.uid) ? { status: 'ok', code: r.code } : { status: 'error' }
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
