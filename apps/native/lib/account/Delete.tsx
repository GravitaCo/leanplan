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
import { useState } from 'react'
import { Platform, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { useAccountDeletion } from '@/store/hooks'
import { DELETE_MESSAGES } from '@/data/account'
import { exportBackup } from '@/data/backup'
import { DELETE } from '@/copy/account'
import { BTN, tx, useTokens } from '../theme'
import { Btn, LinkBtn, List } from '../ui/kit'
import { BackButton, BareSheet, Row } from '../ui/primitives'
import { typedOk } from './rules'
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
      {/* .del .navbtn: 6 pt into the margin. TODO(N1-followup): BackButton at 16 pt medium (.del .navbtn) */}
      <View style={{ marginLeft: -6 }}><BackButton label={DELETE.back} onPress={onBack} /></View>
      <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), { color: t.label }]}>{DELETE.title}</Text>
      <Text style={[tx(16, 400, 1.5), { color: t.label2, marginTop: -6 }]}>{DELETE.lead}</Text>
      <Text accessibilityRole="header" style={[tx(13, 500), { color: t.label2, paddingHorizontal: 4, marginBottom: -6 }]}>{DELETE.goesHeading}</Text>
      {/* TODO(N1-followup): Row with a wrapping title (.del .li .t { white-space: normal }) */}
      <List>{DELETE.goes.map((x) => <Row key={x} title={x} />)}</List>
      <List><Row title={DELETE.copyRow} sub={DELETE.copySub} onPress={() => exportBackup(data)} /></List>
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
  const google = provider === 'google'
  const apple = provider === 'apple'
  const needPw = stale && !google && !apple
  const ready = typedOk(typed) && online && !deleting && !busy && (!needPw || password.length > 0)

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
    if (result.status === 'reauth') setStale(true)
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
    setStale(needsReauth())
  }

  return (
    <BareSheet label={DELETE.confirmTitle} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Text accessibilityRole="header" style={[tx(24, 600, 30), { color: t.label, marginTop: 4 }]}>{DELETE.confirmTitle}</Text>
        <Text style={[tx(16, 400, 1.5), { color: t.label2 }]}>{DELETE.confirmLead}</Text>
        {stale && google && (
          <>
            <Message text={DELETE_MESSAGES.reauth} />
            <Btn kind="gray" title={DELETE.googleAgain} disabled={!online || busy} onPress={() => void googleAgain()} />
          </>
        )}
        {stale && apple && (
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
        <Btn title={deleting ? DELETE.deleting : DELETE.confirm} disabled={!ready || (stale && (google || apple))} onPress={() => void go()}
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
 * `label.typed`: a card with a small label over a plain input.
 * TODO(N1-followup): fields; this is the web markup as the spec (.typed is on --card in a sheet too).
 */
function Typed({ label, value, onChange, secure }: { label: string; value: string; onChange: (v: string) => void; secure?: boolean }) {
  const t = useTokens()
  return (
    <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 13, paddingHorizontal: 16, gap: 4 }}>
      <Text style={[tx(13), { color: t.label2 }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={[tx(17, 400, 24), { color: t.label, padding: 0, minHeight: 24 }, Platform.OS === 'web' && { outlineWidth: 0 }]}
        {...(secure
          ? { secureTextEntry: true, autoComplete: 'current-password' as const, textContentType: 'password' as const }
          : { autoCapitalize: 'characters' as const, autoComplete: 'off' as const, autoCorrect: false, spellCheck: false })} />
    </View>
  )
}
