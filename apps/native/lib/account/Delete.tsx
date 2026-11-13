/**
 * Deleting the account (src/screens/profile/AccountData.tsx, boards ob6-5-delete and
 * ob6-6-delete-confirm): what goes, a copy first, then the typed DELETE, re-confirming who you are
 * when the sign-in is older than 5 minutes (the server checks too), and only with a connection
 * (nothing is queued). The deletion itself is the shared store's (src/data/account.ts): the phone
 * is wiped only after the server confirms. Every failure says nothing was deleted.
 *
 * One difference in how, not what: on the web a Google re-sign-in leaves the page and comes back to
 * the confirm step; here it happens in the system's sign-in sheet over the app, so the confirm step
 * simply stays open.
 */
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Text, TextInput } from './Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { useAccountDeletion } from '@/store/hooks'
import { DELETE_MESSAGES } from '@/data/account'
import { font, useTokens } from '../theme'
import { Button, Chevron, LinkButton, List, NavButton, Row, Sheet, T } from './kit'
import { exportBackup } from '@/data/backup'
import { typedOk } from './rules'
import { DELETE } from '@/copy/account'



export function DeleteAccountView({ onBack, confirmOpen, setConfirmOpen }: { onBack: () => void; confirmOpen: boolean; setConfirmOpen: (x: boolean) => void }) {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const { reason, deleting } = useAccountDeletion()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: ins.top + 18, paddingBottom: ins.bottom + 24, gap: 16 }}>
      <View style={{ alignSelf: 'flex-start', marginLeft: -6 }}><NavButton back title={DELETE.back} size={16} onPress={onBack} /></View>
      <T role="heading" size={32} w={600} style={{ lineHeight: 38, letterSpacing: -0.64 }}>{DELETE.title}</T>
      <T size={16} lh={1.5} color={t.label2} style={{ marginTop: -6 }}>{DELETE.lead}</T>
      <Text role="heading" style={[font(500), { fontSize: 13, color: t.label2, paddingHorizontal: 4, marginBottom: -6 }]}>{DELETE.goesHeading}</Text>
      <List>{DELETE.goes.map((x, i) => <Row key={x} first={i === 0} title={x} wrap />)}</List>
      <List>
        <Row first wrap title={DELETE.copyRow} sub={DELETE.copySub} right={<Chevron />} onPress={() => exportBackup(data)} />
      </List>
      <Button kind="cardRed" title={DELETE.button} height={52} radius={16} disabled={!online || deleting} onPress={() => setConfirmOpen(true)} />
      <T size={12} lh={1.4} color={t.label2} style={{ paddingHorizontal: 4 }}>{online && reason ? reason : DELETE.needsConnection}</T>
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
  const needPw = stale && !google
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
   *  reauthForDeletion: src/data/account.ts reauthWithGoogle, through the platform's googleOAuth). If
   *  another Google account is picked, its session replaces this one and the store's owner check asks
   *  whose data this is (the owner choice replaces this sheet); neither account can be deleted until
   *  that's settled (tokenMatchesOwner). */
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

  const box = { backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 13, paddingHorizontal: 16, gap: 4 } as const
  const input = [font(400), { fontSize: 17, color: t.label, padding: 0, minHeight: 24 }]
  return (
    <Sheet title={DELETE.confirmTitle} header={false} onClose={onClose} gap={14}>
      <T role="heading" size={24} w={600} style={{ lineHeight: 30, marginTop: 4 }}>{DELETE.confirmTitle}</T>
      <T size={16} lh={1.5} color={t.label2}>{DELETE.confirmLead}</T>
      {stale && google && (
        <>
          <T size={15} lh={1.45} color={t.label2} style={{ paddingHorizontal: 4 }}>{DELETE_MESSAGES.reauth}</T>
          <Button kind="gray" title={DELETE.googleAgain} disabled={!online || busy} onPress={() => void googleAgain()} />
        </>
      )}
      {needPw && (
        <View style={box}>
          <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{DELETE.password}</Text>
          <TextInput aria-label={DELETE.password} style={input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
        </View>
      )}
      <View style={box}>
        <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{DELETE.typed}</Text>
        <TextInput aria-label={DELETE.typed} style={input} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoComplete="off" autoCorrect={false} spellCheck={false} />
      </View>
      {msg ? <T role="status" size={15} lh={1.45} color={t.label2} style={{ paddingHorizontal: 4 }}>{msg}</T> : null}
      {!online && !msg ? <T role="status" size={15} lh={1.45} color={t.label2} style={{ paddingHorizontal: 4 }}>{DELETE_MESSAGES.offline}</T> : null}
      <Button kind="red" title={deleting ? DELETE.deleting : DELETE.confirm} height={54} disabled={!ready || (stale && google)} onPress={() => void go()} />
      <LinkButton title={DELETE.cancel} size={16} w={500} onPress={onClose} />
    </Sheet>
  )
}
