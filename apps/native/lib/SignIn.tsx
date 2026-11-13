/**
 * Email sign-in for the spike, with the web's words and calls (src/screens/AuthScreen.tsx sign-in
 * mode). Sign-up, password reset, Google and the rest of the account flows are N2.
 */
import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native'
import { supabase } from '@/data/supabase'
import { googleSignIn } from './account/oauth'
import { useStore } from '@/store/store'
import { Btn } from './ui/kit'
import { font, useTokens } from './theme'

export function SignIn() {
  const t = useTokens()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const beginSignIn = useStore((s) => s.beginSignIn)
  const notice = useStore((s) => s.authNotice)

  /** "Continue with Google", as on the web: the system's sign-in sheet (lib/account/oauth.ts). */
  async function google() {
    setErr('')
    beginSignIn()
    setBusy(true)
    const r = await googleSignIn()
    setBusy(false)
    if (r.status === 'error') setErr(r.message)
  }

  async function submit() {
    setErr('')
    beginSignIn()
    if (!email || !pw) return setErr('Please fill in all fields.')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error) setErr(error.message)
  }

  const input = { height: 50, borderRadius: 14, backgroundColor: t.card, paddingHorizontal: 16, fontSize: 17, color: t.label, fontFamily: 'Geist_400Regular' }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text accessibilityRole="header" style={[font(600), { fontSize: 34, letterSpacing: -0.85, color: t.label }]}>Welcome back</Text>
      <Text style={[font(400), { fontSize: 17, color: t.label2, marginBottom: 12 }]}>Eat well, move often, feel better.</Text>
      {notice ? <Text style={[font(400), { fontSize: 15, color: t.label }]}>{notice}</Text> : null}
      <TextInput style={input} placeholder="Email" placeholderTextColor={t.label3} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" value={email} onChangeText={setEmail} />
      <TextInput style={input} placeholder="Password" placeholderTextColor={t.label3} secureTextEntry autoComplete="current-password" textContentType="password" value={pw} onChangeText={setPw} onSubmitEditing={submit} />
      {err ? <Text accessibilityRole="alert" style={[font(400), { fontSize: 15, color: t.red }]}>{err}</Text> : null}
      <View style={{ marginTop: 8 }}>
        {busy ? <ActivityIndicator color={t.label2} /> : <Btn title="Sign in" onPress={submit} />}
      </View>
      <Text style={[font(400), { fontSize: 13, color: t.label2, textAlign: 'center', marginVertical: 4 }]}>or</Text>
      <Btn kind="gray" title="Continue with Google" onPress={google} disabled={busy} />
    </KeyboardAvoidingView>
  )
}

/** A plain centred message for states the spike doesn't build yet. */
export function Notice({ title, body, action }: { title: string; body?: string; action?: { title: string; onPress: () => void } }) {
  const t = useTokens()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
      <Text style={[font(600), { fontSize: 22, color: t.label, textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label2, textAlign: 'center' }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}><Btn kind="gray" title={action.title} onPress={action.onPress} /></View> : null}
    </View>
  )
}
