/**
 * The sign-in screen (src/screens/AuthScreen.tsx): sign in, create an account, forgot password and
 * check your email, over the hero photo with the Tilo mark, and "Continue with Google". The words
 * (src/copy/account.ts), checks and Supabase calls are the web's; only where the email links come
 * back to differs (the app, lib/account/oauth.ts). Like the web, a reset link signs the person in and
 * has no "set a new password" step yet (a separate web task; native mirrors it).
 *
 * And the owner choice (OwnerChoiceScreen on the web): shown after signing in when this phone holds
 * data that may belong to another account. Nothing of it shows, syncs or exports until they pick.
 */
import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { unsyncedCount } from '@/data/persistence'
import { consentLetsSync, hasExistingData } from '@/data/consent'
import { MIN_AGE } from '@/core/legal'
import { AUTH, OWNER } from '@/copy/account'
import { supabase } from '@/data/supabase'
import { exportBackup } from '@/data/backup'
import { useStore } from '@/store/store'
import { BTN, tx, useTokens } from '../theme'
import { Btn, Card, LinkBtn, slop } from '../ui/kit'
import { Icon } from '../ui/icons'
import { TaliMark } from '../ui/brand'
import { Link } from './Consent'
import { openLegal } from './legal'
import { emailRedirect, googleSignIn } from './oauth'
import { coverFrame, photoHeight } from './rules'

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email'

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
      if (!email) return setErr(AUTH.errEmail)
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirect() })
      setBusy(false)
      if (error) return setErr(error.message)
      setSentFor('forgot')
      setModeRaw('check-email')
      return
    }
    if (!email || !pw) return setErr(AUTH.errFields)
    if (mode === 'signup') {
      if (pw !== pw2) return setErr(AUTH.errMatch)
      if (pw.length < 8) return setErr(AUTH.errShort)
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
    setErr(error.status === 429 || /rate|security purposes/i.test(error.message) ? AUTH.errRate : error.message)
  }

  const copy = AUTH.modes[mode]
  const photoH = photoHeight(mode, vh)
  // TODO(N1-followup): fields. .auth2-fields / .auth2-f as the spec: a card of labelled inputs
  const field = [tx(17, 400, 26), { height: 26, padding: 0, color: t.label }]
  const fieldBox = (first: boolean) => [{ paddingVertical: 11, paddingHorizontal: 16, gap: 2 }, !first && { borderTopWidth: 1, borderTopColor: t.sep }]
  const label = [tx(13), { color: t.label2 }]
  const title = [tx(30, 600, 36, -0.02), { color: t.label }]
  const sub = [tx(16, 400, 1.45), { color: t.label2, marginTop: 4 }]
  const errLine = err ? <Text accessibilityRole="alert" style={[tx(13, 400, 1.38), { color: t.red, paddingHorizontal: 4, marginTop: -6 }]}>{err}</Text> : null
  const big = { minHeight: 54, borderRadius: 27 } // .auth2 .btn

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        {/* .auth2-photo: cover at 50% 30%, the top shade, the white mark */}
        <View style={{ height: photoH, backgroundColor: t.fill, overflow: 'hidden' }}>
          <Image source={HERO} accessibilityIgnoresInvertColors style={{ position: 'absolute', ...coverFrame(HERO_W, HERO_H, vw, photoH) }} />
          <Svg width="100%" height={140} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} accessible={false}>
            <Defs><LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000" stopOpacity={0.34} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></LinearGradient></Defs>
            <Rect x="0" y="0" width="100%" height="140" fill="url(#shade)" />
          </Svg>
          <View style={{ position: 'absolute', left: 20, top: ins.top + 18 }}><WhiteMark width={76} /></View>
        </View>

        <View style={{ flex: 1, marginTop: -48, backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24 + ins.bottom, gap: 16 }}>
          {/* TODO(N1-followup): Banner without an icon (the web's plain .banner) */}
          {notice && mode !== 'check-email' ? (
            <Card plain style={{ paddingVertical: 12, paddingHorizontal: 14 }}><Text accessibilityRole="text" accessibilityLiveRegion="polite" style={[tx(15, 400, 1.35), { color: t.label }]}>{notice}</Text></Card>
          ) : null}

          {mode === 'check-email' ? (
            <>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="mail" size={26} color={t.tint} /></View>
              <View>
                <Text accessibilityRole="header" style={title}>{copy.t}</Text>
                <Text style={sub}>{AUTH.sent(email)}</Text>
              </View>
              {errLine}
              <Btn kind="gray" title={AUTH.back} style={big} onPress={() => { setResent(false); setMode('signin') }} />
              <Text accessibilityLiveRegion="polite" style={[tx(15), { marginTop: 'auto', textAlign: 'center', color: t.label2 }]}>
                {resent ? AUTH.resentLead : AUTH.resendLead}
                <Text accessibilityRole="button" accessibilityState={{ disabled: busy }} onPress={busy ? undefined : resend} style={[tx(15, 600, 1.3, BTN), { color: t.tint }]}>{resent ? AUTH.sendAnother : AUTH.sendAgain}</Text>{resent ? '' : '.'}
              </Text>
            </>
          ) : (
            <>
              <View>
                <Text accessibilityRole="header" style={title}>{copy.t}</Text>
                <Text style={sub}>{copy.s}</Text>
              </View>

              <View style={{ backgroundColor: t.card, borderRadius: 22, overflow: 'hidden' }}>
                <View style={fieldBox(true)}>
                  <Text style={label}>{AUTH.email}</Text>
                  <TextInput accessibilityLabel={AUTH.email} style={field} value={email} onChangeText={(v) => setEmail(v.trim())} placeholder={AUTH.emailPlaceholder} placeholderTextColor={t.label3}
                    autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" inputMode="email"
                    returnKeyType={mode === 'forgot' ? 'send' : 'next'} onSubmitEditing={mode === 'forgot' ? submit : undefined} />
                </View>
                {mode !== 'forgot' && (
                  <View style={fieldBox(false)}>
                    <Text style={label}>{AUTH.password}</Text>
                    <TextInput accessibilityLabel={AUTH.password} style={[field, mode === 'signin' && { paddingRight: 92 }]} value={pw} onChangeText={setPw} secureTextEntry
                      placeholder={mode === 'signup' ? AUTH.passwordNew : AUTH.passwordCurrent} placeholderTextColor={t.label3}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                      returnKeyType={mode === 'signin' ? 'go' : 'next'} onSubmitEditing={mode === 'signin' ? submit : undefined} />
                    {mode === 'signin' && (
                      <View style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                        {/* .auth2-forgot: a small fill pill in a 44 pt tap area */}
                        <Pressable accessibilityRole="button" onPress={() => setMode('forgot')} hitSlop={slop(0, 32)}
                          style={({ pressed }) => ({ backgroundColor: t.fill, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, opacity: pressed ? 0.7 : 1 })}>
                          <Text style={[tx(14, 600, 1.15, BTN), { color: t.tint }]}>{AUTH.forgot}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {mode === 'signup' && (
                  <View style={fieldBox(false)}>
                    <Text style={label}>{AUTH.confirm}</Text>
                    <TextInput accessibilityLabel={AUTH.confirm} style={field} value={pw2} onChangeText={setPw2} secureTextEntry placeholder={AUTH.confirmPlaceholder} placeholderTextColor={t.label3}
                      autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
                  </View>
                )}
              </View>

              {errLine}

              <GoButton title={busy ? AUTH.wait : copy.cta} arrow={!busy} disabled={busy} onPress={submit} />

              {mode !== 'forgot' && (
                <>
                  {mode === 'signin' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 4 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: t.sep }} /><Text style={[tx(13), { color: t.label2 }]}>{AUTH.or}</Text><View style={{ flex: 1, height: 1, backgroundColor: t.sep }} />
                    </View>
                  )}
                  {/* .auth2-google: a card-coloured button with a 1 px --sep ring, 16 pt, Google's own G */}
                  <Btn kind="gray" title={AUTH.google} icon={<GoogleG />} onPress={() => void google()}
                    style={[big, { backgroundColor: t.card, borderWidth: 1, borderColor: t.sep, gap: 10 }]} textStyle={tx(16, 600, 1.3, BTN)} />
                </>
              )}

              {mode === 'signup' && (
                <Text style={[tx(13, 400, 1.45), { color: t.label2, textAlign: 'center' }]}>
                  {AUTH.legal.lead(MIN_AGE)}<Link underline onPress={() => openLegal('terms')}>{AUTH.legal.terms}</Link>{AUTH.legal.and}<Link underline onPress={() => openLegal('privacy')}>{AUTH.legal.privacy}</Link>{AUTH.legal.after}
                </Text>
              )}

              <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                {mode === 'forgot' ? (
                  <LinkBtn title={AUTH.back} onPress={() => setMode('signin')} style={tx(15, 600, 1.3, BTN)} />
                ) : (
                  <>
                    <Text style={[tx(15), { color: t.label2 }]}>{(mode === 'signup' ? AUTH.haveAccount : AUTH.newHere) + ' '}</Text>
                    <LinkBtn title={mode === 'signup' ? AUTH.toSignIn : AUTH.toSignUp} onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={[tx(15, 600, 1.3, BTN), { paddingHorizontal: 2 }]} />
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

/**
 * `.btn.auth2-go`: the 54 pt ink pill with its words and the arrow after them.
 * TODO(N1-followup): a trailing icon on Btn; this is the web markup as the spec.
 */
function GoButton({ title, arrow, disabled, onPress }: { title: string; arrow: boolean; disabled: boolean; onPress: () => void }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 54, borderRadius: 27, backgroundColor: t.btn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
      <Text style={[tx(17, 600, 1.3, BTN), { color: t.btnInk }]}>{title}</Text>
      {arrow && (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={t.btnInk} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
          <Path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
      )}
    </Pressable>
  )
}

/**
 * The Tilo mark in white over the photo (.auth2-photo .tali-mark { color: #fff }).
 * TODO(N1-followup): a colour on TaliMark; the path is brand.tsx's.
 */
const MARK = 'M123.57.33c-17.27,0-31.27,14-31.27,31.27s14,31.27,31.27,31.27,31.27-14,31.27-31.27S140.85.33,123.57.33ZM123.57,45.88c-7.87,0-14.27-6.4-14.27-14.27s6.4-14.27,14.27-14.27,14.27,6.4,14.27,14.27-6.4,14.27-14.27,14.27ZM65.63,28.52V.33h-17v28.19c0,18.59,15.13,33.72,33.72,33.72h9.95v-17h-9.95c-9.22,0-16.72-7.5-16.72-16.72ZM9.95,0H0v17h9.95c9.22,0,16.72,7.5,16.72,16.72v28.19h17v-28.19C43.67,15.13,28.54,0,9.95,0Z'
function WhiteMark({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 62.88) / 154.85} viewBox="0 0 154.85 62.88" accessible accessibilityRole="image" accessibilityLabel="Tilo">
      <Path fill="#ffffff" d={MARK} />
    </Svg>
  )
}

/** Google's multicolour "G", as its sign-in branding guidelines ask for on this button. */
function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" accessible={false}>
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  )
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
  const who = ask?.email || OWNER.thisAccount
  const pick = async (c: 'keep' | 'fresh' | 'cancel') => {
    if (busy) return
    if (c === 'fresh' && atRisk && !sure) { setSure(true); return } // losing a log takes a second tap
    setBusy(true)
    try { await resolveOwner(c) } finally { setBusy(false) }
  }
  // .auth-owner .card: centred, --label2, 15 pt, 1.45
  const p = (s: string) => <Text style={[tx(15, 400, 1.45), { color: t.label2, textAlign: 'center' }]}>{s}</Text>
  const card = { gap: 10 }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: ins.top + 32, paddingBottom: ins.bottom + 28, paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <TaliMark width={112} />
        <Text accessibilityRole="header" style={[tx(34, 600, 40, -0.025), { color: t.label, marginTop: 22, marginBottom: 2 }]}>Tilo</Text>
        <Text style={[tx(15), { color: t.label2, textAlign: 'center' }]}>{OWNER.signedInAs(who)}</Text>
      </View>
      {ask?.checking ? (
        <Card plain style={card}>{p(OWNER.checking)}</Card>
      ) : (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={[tx(22, 600, 1.3, -0.01), { color: t.label, textAlign: 'center' }]}>{OWNER.title}</Text>
          <Card plain style={card}>
            {p(OWNER.p1(who))}
            {p(OWNER.p2(who))}
            {p(OWNER.p3(who))}
          </Card>
          {sure && <Card plain style={card}>{p(OWNER.sure)}</Card>}
          <View style={{ gap: 8, marginTop: 16 }}>
            {sure && <Btn kind="gray" title={OWNER.exportCopy} disabled={busy} onPress={() => exportBackup(data)} />}
            <Btn title={sure ? OWNER.freshSure : OWNER.fresh(who)} disabled={busy} onPress={() => void pick('fresh')} />
            <Btn kind="gray" title={OWNER.keep(who)} disabled={busy} onPress={() => void pick('keep')} />
          </View>
        </View>
      )}
      <View style={{ marginTop: 18, alignItems: 'center' }}>
        <LinkBtn title={OWNER.cancel} muted onPress={() => { if (!busy) void pick('cancel') }} />
      </View>
    </ScrollView>
  )
}
