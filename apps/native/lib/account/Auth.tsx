/**
 * The sign-in screen (src/screens/AuthScreen.tsx): sign in, create an account, forgot password and
 * check your email, over the hero photo with the Tilo mark, and "Continue with Google". The words,
 * checks and Supabase calls are the web's; only where the email links come back to differs (the app,
 * lib/account/oauth.ts). Like the web, a reset link signs the person in and has no "set a new
 * password" step yet (a separate web task; native mirrors it).
 *
 * And the owner choice (OwnerChoiceScreen on the web): shown after signing in when this phone holds
 * data that may belong to another account. Nothing of it shows, syncs or exports until they pick.
 */
import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { Text, TextInput } from './Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { unsyncedCount } from '@/data/persistence'
import { consentLetsSync, hasExistingData } from '@/data/consent'
import { MIN_AGE } from '@/core/legal'
import { supabase } from '@/data/supabase'
import { useStore } from '@/store/store'
import { font, useTokens } from '../theme'
import { Button, GoogleG, Ico, InlineLink, LinkButton, Mark, T } from './kit'
import { openLegal } from './legal'
import { emailRedirect, googleSignIn } from './oauth'
import { exportBackup } from './backupFile'

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email'

const COPY = {
  signin: { t: 'Welcome back', s: 'Eat well, move often, feel better.', cta: 'Sign in' },
  signup: { t: 'Create your account', s: 'Two minutes to set up, then it works offline.', cta: 'Create account' },
  forgot: { t: 'Reset your password', s: 'Enter your email and we’ll send you a link to set a new one.', cta: 'Send reset link' },
  'check-email': { t: 'Check your email', s: '', cta: '' },
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HERO = require('../../assets/auth-hero.jpg')
const HERO_W = 928, HERO_H = 1152

export function AuthScreen() {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  const { height: vh, width: vw } = useWindowDimensions()
  const [mode, setModeRaw] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // what the last email was for, so "send it again" repeats the right one
  const [sentFor, setSentFor] = useState<'signup' | 'forgot'>('signup')
  const [resent, setResent] = useState(false)
  const beginSignIn = useStore((st) => st.beginSignIn)
  const notice = useStore((st) => st.authNotice)
  const setMode = (m: Mode) => { setErr(''); setModeRaw(m) }

  async function submit() {
    if (busy) return
    setErr('')
    beginSignIn()
    if (mode === 'forgot') {
      if (!email) return setErr('Please enter your email.')
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirect() })
      setBusy(false)
      if (error) return setErr(error.message)
      setSentFor('forgot')
      setModeRaw('check-email')
      return
    }
    if (!email || !pw) return setErr('Please fill in all fields.')
    if (mode === 'signup') {
      if (pw !== pw2) return setErr('Passwords do not match.')
      if (pw.length < 8) return setErr('Password must be at least 8 characters.')
      setBusy(true)
      const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: emailRedirect() } })
      setBusy(false)
      if (error) return setErr(error.message)
      setSentFor('signup')
      setModeRaw('check-email')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setErr(error.message)
  }

  async function google() {
    setErr('')
    beginSignIn()
    const r = await googleSignIn()
    if (r.status === 'error') setErr(r.message)
  }

  async function resend() {
    if (busy || !email) return
    setErr('')
    setBusy(true)
    const { error } = sentFor === 'forgot'
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirect() })
      : await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: emailRedirect() } })
    setBusy(false)
    if (!error) return setResent(true)
    setResent(false)
    setErr(error.status === 429 || /rate|security purposes/i.test(error.message) ? 'Give it a minute, then try again.' : error.message)
  }

  const copy = COPY[mode]
  // .auth2-photo: 48% of the screen (36% creating an account, 52% for the email steps), at least 260 (200)
  const photoH = mode === 'signup' ? Math.max(200, vh * 0.36) : mode === 'signin' ? Math.max(260, vh * 0.48) : Math.max(260, vh * 0.52)
  const field = { height: 26, padding: 0, fontSize: 17, color: t.label, fontFamily: 'Geist_400Regular' } as const
  const fieldBox = (first: boolean) => [{ paddingVertical: 11, paddingHorizontal: 16, gap: 2 }, !first && { borderTopWidth: 1, borderTopColor: t.sep }]
  const label = [font(400), { fontSize: 13, color: t.label2 }]
  const errLine = err ? <T role="alert" size={13} lh={1.38} color={t.red} style={{ paddingHorizontal: 4, marginTop: -6 }}>{err}</T> : null

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View style={{ height: photoH, backgroundColor: t.fill, overflow: 'hidden' }}>
          {/* object-fit: cover at object-position 50% 30%, as the web: the photo fills the width (or the
              height, if taller), and 30% of what overflows is cropped from the top */}
          {(() => {
            const scale = Math.max(vw / HERO_W, photoH / HERO_H), w = HERO_W * scale, h = HERO_H * scale
            return <Image source={HERO} accessibilityIgnoresInvertColors style={{ position: 'absolute', width: w, height: h, left: (vw - w) / 2, top: -(h - photoH) * 0.3 }} />
          })()}
          <Svg width="100%" height={140} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} aria-hidden>
            <Defs><LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000" stopOpacity={0.34} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></LinearGradient></Defs>
            <Rect x="0" y="0" width="100%" height="140" fill="url(#shade)" />
          </Svg>
          <View style={{ position: 'absolute', left: 20, top: ins.top + 18 }}><Mark width={76} color="#ffffff" /></View>
        </View>

        <View style={{ flex: 1, marginTop: -48, backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24 + ins.bottom, gap: 16 }}>
          {notice && mode !== 'check-email' ? (
            <View role="status" style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14 }}><T size={15} lh={1.35}>{notice}</T></View>
          ) : null}

          {mode === 'check-email' ? (
            <>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}><Ico name="mail" size={26} color={t.tint} /></View>
              <View>
                <T role="heading" size={30} w={600} style={{ lineHeight: 36, letterSpacing: -0.6 }}>{copy.t}</T>
                <T size={16} lh={1.45} color={t.label2} style={{ marginTop: 4 }}>We sent a link to {email || 'your inbox'}. Open it on this phone to continue.</T>
              </View>
              {errLine}
              <Button kind="gray" title="Back to sign in" height={54} onPress={() => { setResent(false); setMode('signin') }} />
              <Text role="status" style={[font(400), { marginTop: 'auto', textAlign: 'center', fontSize: 15, color: t.label2 }]}>
                {resent ? 'Sent again. It can take a minute or two. ' : 'Nothing yet? Check your spam folder, or '}
                <Text role="button" aria-disabled={busy || undefined} onPress={busy ? undefined : resend} style={[font(600), { color: t.tint }]}>{resent ? 'Send another' : 'send it again'}</Text>{resent ? '' : '.'}
              </Text>
            </>
          ) : (
            <>
              <View>
                <T role="heading" size={30} w={600} style={{ lineHeight: 36, letterSpacing: -0.6 }}>{copy.t}</T>
                <T size={16} lh={1.45} color={t.label2} style={{ marginTop: 4 }}>{copy.s}</T>
              </View>

              <View style={{ backgroundColor: t.card, borderRadius: 22, overflow: 'hidden' }}>
                <View style={fieldBox(true)}>
                  <Text style={label}>Email</Text>
                  <TextInput aria-label="Email" style={field} value={email} onChangeText={(v) => setEmail(v.trim())} placeholder="you@example.com" placeholderTextColor={t.label3}
                    autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" inputMode="email"
                    returnKeyType={mode === 'forgot' ? 'send' : 'next'} onSubmitEditing={mode === 'forgot' ? submit : undefined} />
                </View>
                {mode !== 'forgot' && (
                  <View style={fieldBox(false)}>
                    <Text style={label}>Password</Text>
                    <TextInput aria-label="Password" style={[field, mode === 'signin' && { paddingRight: 92 }]} value={pw} onChangeText={setPw} secureTextEntry
                      placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} placeholderTextColor={t.label3}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                      returnKeyType={mode === 'signin' ? 'go' : 'next'} onSubmitEditing={mode === 'signin' ? submit : undefined} />
                    {mode === 'signin' && (
                      <View style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                        <Pressable role="button" aria-label="Forgot?" onPress={() => setMode('forgot')} hitSlop={6}
                          style={({ pressed }) => ({ backgroundColor: t.fill, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, opacity: pressed ? 0.6 : 1 })}>
                          <Text style={[font(600), { fontSize: 14, color: t.tint }]}>Forgot?</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {mode === 'signup' && (
                  <View style={fieldBox(false)}>
                    <Text style={label}>Confirm password</Text>
                    <TextInput aria-label="Confirm password" style={field} value={pw2} onChangeText={setPw2} secureTextEntry placeholder="Repeat password" placeholderTextColor={t.label3}
                      autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
                  </View>
                )}
              </View>

              {errLine}

              <Button title={busy ? 'Please wait…' : copy.cta} height={54} disabled={busy} onPress={submit} after={busy ? null : <ArrowIcon color={t.btnInk} />} />

              {mode !== 'forgot' && (
                <>
                  {mode === 'signin' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 4 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: t.sep }} /><T size={13} color={t.label2}>or</T><View style={{ flex: 1, height: 1, backgroundColor: t.sep }} />
                    </View>
                  )}
                  <Button kind="google" title="Continue with Google" height={54} onPress={google}><GoogleG /></Button>
                </>
              )}

              {mode === 'signup' && (
                <T size={13} lh={1.45} color={t.label2} center>
                  Tilo is for people aged {MIN_AGE} and over. Read the <InlineLink underline onPress={() => openLegal('terms')}>Terms</InlineLink> and{' '}
                  <InlineLink underline onPress={() => openLegal('privacy')}>Privacy notice</InlineLink>. You’ll be asked to agree after you sign up.
                </T>
              )}

              <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                {mode === 'forgot' ? (
                  <LinkButton title="Back to sign in" w={600} onPress={() => setMode('signin')} style={{ paddingHorizontal: 2 }} />
                ) : (
                  <>
                    <T size={15} color={t.label2}>{mode === 'signup' ? 'Already have an account? ' : 'New to Tilo? '}</T>
                    <LinkButton title={mode === 'signup' ? 'Sign in' : 'Create an account'} w={600} onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={{ paddingHorizontal: 2 }} />
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** The primary button's trailing arrow (AuthScreen's Arrow). */
export function ArrowIcon({ color }: { color: string }) {
  return <Ico name="arrow" size={18} stroke={2.4} color={color} />
}

export function OwnerChoiceScreen() {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  const ask = useStore((st) => st.ownerAsk)
  const resolveOwner = useStore((st) => st.resolveOwner)
  const data = useStore((st) => st.data)
  const [busy, setBusy] = useState(false)
  // the log here that "Start fresh" would remove: changes never uploaded, or a log kept on this phone only
  const atRisk = unsyncedCount(data) > 0 || (!consentLetsSync(data) && hasExistingData(data))
  const [sure, setSure] = useState(false)
  const who = ask?.email || 'this account'
  const pick = async (c: 'keep' | 'fresh' | 'cancel') => {
    if (busy) return
    if (c === 'fresh' && atRisk && !sure) { setSure(true); return } // losing a log takes a second tap
    setBusy(true)
    try { await resolveOwner(c) } finally { setBusy(false) }
  }
  const card = { backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 10 } as const
  const p = (s: string) => <T size={15} lh={1.45} color={t.label2} center>{s}</T>
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: ins.top + 32, paddingBottom: ins.bottom + 28, paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Mark width={112} color={t.mark} />
        <T role="heading" size={34} w={600} style={{ lineHeight: 40, letterSpacing: -0.85, marginTop: 22, marginBottom: 2 }}>Tilo</T>
        <T size={15} color={t.label2} center>Signed in as {who}</T>
      </View>
      {ask?.checking ? (
        <View role="status" style={card}>{p('Checking the log on this device…')}</View>
      ) : (
        <View style={{ gap: 10 }}>
          <T role="heading" size={22} w={600} center style={{ letterSpacing: -0.2 }}>This device has another log</T>
          <View style={card}>
            {p(`The log on this device was made in a different account, or before it was linked to ${who}.`)}
            {p(`Starting fresh removes it from this device and loads ${who}’s own data. If the log is yours from another account, cancel and sign in to that one instead: anything that hadn’t synced yet is still there.`)}
            {p(`Keeping it adds it to ${who}, replacing that account’s targets, profile, and any days, foods or recipes that are in both.`)}
          </View>
          {sure && <View role="alert" style={card}>{p('Some of the log on this device isn’t in any account, so starting fresh deletes it for good. Export a copy first if you might want it.')}</View>}
          <View style={{ gap: 8, marginTop: 16 }}>
            {sure && <Button kind="gray" title="Export a copy" disabled={busy} onPress={() => void exportBackup(data)} />}
            <Button title={sure ? 'Start fresh and delete it' : `Start fresh with ${who}`} disabled={busy} onPress={() => void pick('fresh')} />
            <Button kind="gray" title={`Keep this log in ${who}`} disabled={busy} onPress={() => void pick('keep')} />
          </View>
        </View>
      )}
      <View style={{ marginTop: 18 }}>
        <LinkButton title="Cancel and sign out" muted disabled={busy} onPress={() => void pick('cancel')} />
      </View>
    </ScrollView>
  )
}
