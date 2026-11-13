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
import { codeFrom } from './rules'

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
