/**
 * tilo://auth-callback: where Supabase's email links come back to the app (confirming a new
 * account, a password reset), with a one-time code that only works with the PKCE verifier saved on
 * this phone when the email was asked for. The code is exchanged for a session (the store picks it
 * up through onAuthStateChange, as any sign-in), then the app opens as usual. Google's return is
 * taken by the sign-in sheet itself (lib/account/oauth.ts); if it also lands here, the person is
 * already signed in, or the sign-in sheet is still handling it, and nothing more happens. A link that can't be used here (opened on another
 * phone, already used) leaves the sign-in screen as it was, as on the web.
 */
import { useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/data/supabase'
import { useStore } from '@/store/store'
import { googleInProgress } from '../lib/account/oauth'

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>()
  useEffect(() => {
    let done = false
    const leave = () => { if (!done) { done = true; if (router.canGoBack()) router.back(); else router.replace('/') } }
    // a Google sign-in's own return (Android also delivers it here): the sign-in sheet's caller
    // exchanges it; leave whatever screen is open (the delete confirm) as it is
    if (googleInProgress()) { leave(); return }
    ;(async () => {
      if (typeof code === 'string' && code && !useStore.getState().signedIn) {
        useStore.getState().beginSignIn()
        await supabase.auth.exchangeCodeForSession(code).catch(() => null)
      }
      leave()
    })()
  }, [code])
  return null
}
