/**
 * Deleting the account (src/screens/profile/AccountData.tsx, boards ob6-5-delete and
 * ob6-6-delete-confirm): what goes, a copy first, then the typed DELETE, re-confirming who you are
 * when the sign-in is older than 5 minutes (the server checks too), and only with a connection
 * (nothing is queued). The deletion itself is the shared store's (src/data/account.ts): the phone is
 * wiped only after the server confirms. Every failure says nothing was deleted.
 *
 * One difference in how, not what: on the web a Google re-sign-in leaves the page and comes back to
 * the confirm step; here it happens in the system's sign-in sheet over the app, so the confirm step
 * simply stays open.
 */
import { useEffect, useState } from 'react'
import { Platform, ScrollView, Text, TextInput, View, type TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { useAccountDeletion } from '@/store/hooks'
import { DELETE_MESSAGES } from '@/data/account'
import { exportBackup } from '@/data/backup'
import { DELETE } from '@/copy/account'
import { BTN, tx, useTokens } from '../theme'
import { Btn, LinkBtn, List } from '../ui/kit'
import { BackButton, BareSheet, Row } from '../ui/primitives'
import { appleAlways, typedOk } from './rules'
import { supabase } from '@/data/supabase'
import { appleAvailable } from '../../modules/tilo-auth'
import { appleReauth } from './oauth'
import { Sub } from '../ui/text'
import { dark } from '../tokens.generated'

export function DeleteAccountView({ onBack, confirmOpen, setConfirmOpen }: { onBack: () => void; confirmOpen: boolean; setConfirmOpen: (x: boolean) => void }) {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const { reason, deleting } = useAccountDeletion()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: ins.top + 18, paddingBottom: ins.bottom + 24, gap: 16 }}>
      {/* .del .navbtn: 16 pt medium, 6 pt into the margin */}
      <BackButton small label={DELETE.back} onPress={onBack} />
      <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), { color: t.label }]}>{DELETE.title}</Text>
      <Text style={[tx(16, 400, 1.5), { color: t.label2, marginTop: -6 }]}>{DELETE.lead}</Text>
      <Text accessibilityRole="header" style={[tx(13, 500), { color: t.label2, paddingHorizontal: 4, marginBottom: -6 }]}>{DELETE.goesHeading}</Text>
      {/* .del .li .t, .del .li .s { white-space: normal } */}
      <List>{DELETE.goes.map((x) => <Row key={x} wrap title={x} />)}</List>
      <List><Row wrap title={DELETE.copyRow} sub={DELETE.copySub} onPress={() => exportBackup(data)} /></List>
      {/* .btn.delbtn: a card-coloured block, radius 16, 52 high, red words */}
      <Btn kind="danger" title={DELETE.button} disabled={!online || deleting} onPress={() => setConfirmOpen(true)}
        style={{ minHeight: 52, borderRadius: 16, backgroundColor: t.card }} textStyle={tx(17, 600, 1.3, BTN)} />
      <Text style={[tx(12, 400, 1.4), { color: t.label2, paddingHorizontal: 4 }]}>{online && reason ? reason : DELETE.needsConnection}</Text>
      {confirmOpen && <DeleteConfirmSheet onClose={() => setConfirmOpen(false)} />}
    </ScrollView>
  )
}

export function DeleteConfirmSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const online = useStore((s) => s.online)
  const { deleting, provider, needsReauth, reauth, run } = useAccountDeletion()
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // re-confirm who you are when the sign-in is older than 5 minutes (the server checks too)
  const [stale, setStale] = useState(() => needsReauth())
  // every way this account signs in (app_metadata.providers; the store keeps only the first): an
  // account with Apple re-confirms with Apple every time, so the server can revoke Tilo's Sign in
  // with Apple (rules.ts appleAlways)
  const [providers, setProviders] = useState<string[]>(provider ? [provider] : [])
  // the delete waits for them, so a Google account that linked Apple can't skip the Apple step
  const [providersRead, setProvidersRead] = useState(false)
  useEffect(() => {
    let on = true
    void supabase.auth.getSession().then(({ data }) => {
      const p = data.session?.user.app_metadata?.providers
      if (on && Array.isArray(p)) setProviders(p.filter((x): x is string => typeof x === 'string'))
    }).catch(() => {}).finally(() => { if (on) setProvidersRead(true) })
    return () => { on = false }
  }, [])
  const [appleDone, setAppleDone] = useState(false)
  const apple = appleAlways(providers, appleAvailable()) && !appleDone
  const google = !apple && stale && provider === 'google'
  const needPw = !apple && stale && provider !== 'google'
  const ready = providersRead && typedOk(typed) && online && !deleting && !busy && (!needPw || password.length > 0)

  const go = async () => {
    if (!ready) return
    setMsg(null)
    if (needPw) {
      setBusy(true)
      const r = await reauth({ password })
      setBusy(false)
      if (r === 'wrong-password') { setMsg(DELETE.wrongPassword); return }
      if (r === 'offline') { setMsg(DELETE_MESSAGES.offline); return }
      if (r !== 'ok') { setMsg(DELETE_MESSAGES.error); return }
    }
    const { result, message } = await run()
    // the server still wants a fresh sign-in: an Apple account goes back to Sign in with Apple, never a password
    if (result.status === 'reauth') { setStale(true); setAppleDone(false) }
    if (message) setMsg(message)
  }

  /** A fresh Google sign-in for this account, in the system's sign-in sheet (the store's
   *  reauthForDeletion, through the platform's googleOAuth: lib/account/oauth.ts refuses a different
   *  Google account). If another account was picked anyway, its session replaces this one and the
   *  store's owner check asks whose data this is; neither account can be deleted until that's settled
   *  (tokenMatchesOwner). */
  const googleAgain = async () => {
    setBusy(true)
    const r = await reauth({ google: true })
    setBusy(false)
    if (r === 'cancelled') return
    if (r === 'offline') { setMsg(DELETE_MESSAGES.offline); return }
    if (r !== 'ok') { setMsg(DELETE_MESSAGES.error); return }
    setMsg(null)
    setStale(needsReauth())
  }

  /** Sign in with Apple again (iOS), for an account that signed in with Apple; the same account only. */
  const appleAgain = async () => {
    if (!online) { setMsg(DELETE_MESSAGES.offline); return }
    setBusy(true)
    const r = await appleReauth()
    setBusy(false)
    if (r === 'cancelled') return
    if (r !== 'ok') { setMsg(DELETE_MESSAGES.error); return }
    setMsg(null)
    setAppleDone(true)
    setStale(needsReauth())
  }

  return (
    <BareSheet label={DELETE.confirmTitle} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Text accessibilityRole="header" style={[tx(24, 600, 30), { color: t.label, marginTop: 4 }]}>{DELETE.confirmTitle}</Text>
        <Text style={[tx(16, 400, 1.5), { color: t.label2 }]}>{DELETE.confirmLead}</Text>
        {google && (
          <>
            <Message text={DELETE_MESSAGES.reauth} />
            <Btn kind="gray" title={DELETE.googleAgain} disabled={!online || busy} onPress={() => void googleAgain()} />
          </>
        )}
        {apple && (
          <>
            <Message text={DELETE.reauthApple} />
            <Btn kind="gray" title={DELETE.appleAgain} disabled={!online || busy} onPress={() => void appleAgain()} />
          </>
        )}
        {needPw && <Typed label={DELETE.password} value={password} onChange={setPassword} secure />}
        <Typed label={DELETE.typed} value={typed} onChange={setTyped} />
        {msg ? <Message text={msg} /> : null}
        {!online && !msg ? <Message text={DELETE_MESSAGES.offline} /> : null}
        {/* .btn.delall: white on red in light, black on the lighter dark-mode red (4.5:1) */}
        <Btn title={deleting ? DELETE.deleting : DELETE.confirm} disabled={!ready || google || apple} onPress={() => void go()}
          style={{ minHeight: 54, borderRadius: 27, backgroundColor: t.red }} textStyle={{ color: t === dark ? '#000000' : '#ffffff' }} />
        <View style={{ alignItems: 'center' }}><LinkBtn title={DELETE.cancel} onPress={onClose} style={[tx(16, 500, 1.3, BTN), { paddingVertical: 4, paddingHorizontal: 4 }]} /></View>
      </View>
    </BareSheet>
  )
}

/** `.cs-msg` (15 pt --label2, 1.45), announced as the web's role=status. */
function Message({ text }: { text: string }) {
  return <View accessibilityLiveRegion="polite"><Sub style={[tx(15, 400, 1.45), { paddingHorizontal: 4 }]}>{text}</Sub></View>
}

/**
 * `label.typed` (the delete confirm's own field, theme.css .typed): a card with a small label over a
 * borderless input, on --card in the sheet too. Not lib/ui's Field (.field is a filled input under
 * its label, a different look); the web keeps .typed to this screen, so it stays with it.
 */
function Typed({ label, value, onChange, secure }: { label: string; value: string; onChange: (v: string) => void; secure?: boolean }) {
  const t = useTokens()
  return (
    <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 13, paddingHorizontal: 16, gap: 4 }}>
      <Text style={[tx(13), { color: t.label2 }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={[tx(17, 400, 24), { color: t.label, padding: 0, minHeight: 24 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle)]}
        {...(secure
          ? { secureTextEntry: true, autoComplete: 'current-password' as const, textContentType: 'password' as const }
          : { autoCapitalize: 'characters' as const, autoComplete: 'off' as const, autoCorrect: false, spellCheck: false })} />
    </View>
  )
}
