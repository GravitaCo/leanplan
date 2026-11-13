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
import { codeFrom, reauthMatches } from './rules'
import { setGoogleOAuth } from '@/data/platform'
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

export type GoogleResult = { status: 'ok'; uid: string } | { status: 'cancelled' } | { status: 'error'; message: string }

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
      return error ? { status: 'error', message: error.message } : { status: 'cancelled' }
    }
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT, skipBrowserRedirect: true, queryParams } })
    if (error || !data?.url) return { status: 'error', message: error?.message ?? 'Google sign-in could not start.' }
    const res = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT)
    if (res.type !== 'success') return { status: 'cancelled' }
    const { code, why } = codeFrom(res.url)
    if (!code) return { status: 'error', message: why || 'Google sign-in did not finish.' }
    const { data: ex, error: exErr } = await supabase.auth.exchangeCodeForSession(code)
    if (exErr || !ex.session) return { status: 'error', message: exErr?.message ?? 'Google sign-in did not finish.' }
    return { status: 'ok', uid: ex.session.user.id }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
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
export async function appleSignIn(): Promise<GoogleResult> {
  try {
    const raw = hex(getRandomBytes(32))
    const hashed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, raw)
    const cred = await appleSignInNative(hashed)
    if (!cred) return { status: 'cancelled' }
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw })
    if (error || !data.session) return { status: 'error', message: error?.message ?? 'Sign in with Apple did not finish.' }
    return { status: 'ok', uid: data.session.user.id }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}

/** Sign in with Apple again before deleting: 'ok' only for this phone's own account. */
export async function appleReauth(): Promise<'ok' | 'cancelled' | 'error'> {
  const r = await appleSignIn()
  if (r.status !== 'ok') return r.status
  return reauthMatches(useStore.getState().data._meta?.owner, r.uid) ? 'ok' : 'error'
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
