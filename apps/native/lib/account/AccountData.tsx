/**
 * Profile's account and privacy items (src/screens/ProfileScreen.tsx "Account and data" and
 * "Privacy", src/screens/profile/AccountData.tsx): health data (agree, or stop keeping it with a
 * copy offered first), back up and restore, delete account, the legal documents, and sign out.
 *
 * N10 builds Profile; until then `AccountSection` stands in for these rows (in the sheet the avatar
 * opens), and N10 places the same pieces in its own rows. Words and rules are the web's; the shared
 * store does every change. Export and import use the system share sheet and document picker
 * (./backupFile) where the web downloads and uploads.
 */
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from './Text'
import { useStore } from '@/store/store'
import { useConsent, useHealthWithdrawal } from '@/store/hooks'
import { consentLetsSync, hasExistingData, healthDataSummary, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { backupSummary, unsyncedCount, type PersistedState } from '@/data/persistence'
import { fmtDate } from '@/core/domain/date'
import { healthAnswersView } from '@/core/domain/onboarding'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import type { LegalDocId } from '@/core/legal'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { HEALTH_ANSWERS_ROW, REDO_ROW, SETUP_ROW, SUPPORT } from '@/screens/onboarding/copyApp'
import { supportList } from '@/screens/profile/supportRows'
import { SUPPORT_MIND } from '@/screens/mind/copy'
import { ACCOUNT_ROW, BACKUP, HEALTH_DATA, HEALTH_TICKS, PRIVACY_ROW, SIGN_OUT } from '@/copy/account'
import { font, useTokens } from '../theme'
import { Button, Chevron, Foot, LinkButton, List, NavButton, Row, Sheet, T, Ticks } from './kit'
import { ConsentScreen, P, PrivacySheet, RegrantHealthSheet } from './Consent'
import { DeleteAccountView } from './Delete'
import { Opts, Signposts } from './AgeStop'
import { LEGAL_LABEL, openLegal } from './legal'
import { exportBackup } from '@/data/backup'
import { pickBackup } from './backupFile'


export type HealthStatus = 'on' | 'paused' | 'off' | 'unasked'
export function useHealthStatus(): HealthStatus {
  return useStore((s) => {
    const r = latestConsent(s.data, 'health')
    return r ? (r.granted ? 'on' : 'off') : healthSyncPaused(s.data) ? 'paused' : 'unasked'
  })
}
export const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = HEALTH_DATA.status

/* ---------------- health data ---------------- */

/**
 * `start="withdraw"` opens straight at the copy-first withdraw step (Privacy's button). "Yes, keep it"
 * hands over to `onAgree`: giving consent from Profile goes through the explicit statement and
 * unticked box, never a bare tap.
 */
export function HealthDataSheet({ onClose, onAgree, onAnswers, onRedo, start = 'main' }: { onClose: () => void; onAgree: () => void; onAnswers?: () => void; onRedo?: () => void; start?: 'main' | 'withdraw' }) {
  const t = useTokens()
  const status = useHealthStatus()
  const { prepare, download, withdraw } = useHealthWithdrawal()
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState<null | ReturnType<typeof prepare>>(() => (start === 'withdraw' ? prepare() : null))
  const [privacy, setPrivacy] = useState(false)
  const [support, setSupport] = useState(false)
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields + h.trainingPrefs > 0 || !!s.data._meta?.lastPull })
  const hasAnswers = useStore((s) => ONBOARDING_ENABLED && healthAnswersView(s.data.profile).rows.some((r) => r.kind !== 'baseline'))
  const onboarded = useStore((s) => !!s.data.profile.onboardedAt)
  const answersRow = hasAnswers && !!onAnswers, redoRow = ONBOARDING_ENABLED && !!onRedo

  if (step) {
    const onPhone = HEALTH_DATA.onPhone(step.summary)
    return (
      <Sheet title={HEALTH_DATA.title} onClose={onClose} left={<NavButton back title="Back" onPress={() => setStep(null)} />}>
        <View style={{ paddingHorizontal: 4, gap: 10 }}>
          <P color={t.label2}>{step.prompt}</P>
          {onPhone && <P color={t.label2}>{onPhone}</P>}
        </View>
        <View style={{ gap: 8, marginTop: 16 }}>
          {/* the same file the web downloads (the whole log), through the share sheet. Unlike the web it
              never turns to "Downloaded": the share sheet can't say whether the copy was saved or the
              person closed it (compliance, 13 Nov) */}
          <Button kind="gray" title={HEALTH_DATA.download} onPress={download} />
          <Button kind="danger" title={HEALTH_DATA.remove} onPress={() => { withdraw(); showToast(HEALTH_DATA.removed); onClose() }} />
        </View>
      </Sheet>
    )
  }

  return (
    <Sheet title={HEALTH_DATA.title} onClose={onClose} left={null} right={<NavButton bold title="Done" onPress={onClose} />}>
      <T size={15} lh={1.45} color={t.label2} style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
        {status === 'on' ? HEALTH_DATA.on : status === 'paused' ? HEALTH_DATA.paused + unconsentedCopyLine() : status === 'off' ? HEALTH_DATA.off : HEALTH_DATA.unasked}
      </T>
      <Ticks items={HEALTH_TICKS} />
      <LinkButton title={HEALTH_DATA.readPrivacy} onPress={() => setPrivacy(true)} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
      {(answersRow || redoRow) && (
        <List bg={t.elev} style={{ marginTop: 12 }}>
          {answersRow && <Row first title={HEALTH_ANSWERS_ROW} right={<Chevron />} onPress={onAnswers} />}
          {redoRow && <Row first={!answersRow} title={onboarded ? REDO_ROW : SETUP_ROW} right={<Chevron />} onPress={onRedo} />}
        </List>
      )}
      <List bg={t.elev} style={{ marginTop: 12 }}>
        <Row first title={SUPPORT.row} sub={SUPPORT.rowSub} right={<Chevron />} onPress={() => setSupport(true)} />
      </List>
      <View style={{ gap: 8, marginTop: 16 }}>
        {status !== 'on' && <Button title={HEALTH_DATA.agree} onPress={onAgree} />}
        {(status === 'on' || (status !== 'off' && canRemove)) && <Button kind="danger" title={HEALTH_DATA.stop} onPress={() => setStep(prepare())} />}
      </View>
      {privacy && <PrivacySheet onClose={() => setPrivacy(false)} />}
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </Sheet>
  )
}

/* ---------------- support and helplines ---------------- */

/**
 * Onboarding 10 (board ob9-7): pure UI, no store action, no saved field, no network (its foot says
 * opening it is private). The nation is this sheet's own state, forgotten on close.
 */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  const foot = [font(400), { fontSize: 12, lineHeight: 17, color: t.label2, paddingHorizontal: 4 }]
  return (
    <Sheet title={SUPPORT.title} onClose={onClose} left={null} right={<NavButton bold title="Done" onPress={onClose} />} gap={14}>
      <T size={16} lh={1.5} style={{ paddingHorizontal: 4 }}>{SUPPORT.lead}</T>
      {picking
        ? <Opts label="Nation" opts={NATIONS} value={nation ?? undefined} bg={t.elev} onPick={(k) => { setNation(k); setPicking(false) }} />
        : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
            <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{SUPPORT.showing(name)}</Text>
            <Pressable role="button" aria-label={nation ? SUPPORT.change : SUPPORT.choose} onPress={() => setPicking(true)} hitSlop={12}>
              <Text style={[font(600), { fontSize: 13, color: t.tint }]}>{nation ? SUPPORT.change : SUPPORT.choose}</Text>
            </Pressable>
          </View>
        )}
      <Signposts list={supportList(nation)} bg={t.elev} />
      {!nation && <Text style={foot}>{SUPPORT.chooseNation}</Text>}
      <Text style={foot}>{SUPPORT.foot}</Text>
    </Sheet>
  )
}

/* ---------------- back up and restore ---------------- */

/** Confirm step before a backup replaces data: what's in it and what changes (on all devices). */
export function ImportSheet({ backup, onClose, onImport }: { backup: PersistedState; onClose: () => void; onImport: () => void }) {
  const t = useTokens()
  const b = backupSummary(backup)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title={BACKUP.importTitle} onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 10 }}>
        <P color={t.label2}>{BACKUP.has(b, span)}</P>
        <P color={t.label2}>{BACKUP.replaces(b)}</P>
      </View>
      <View style={{ marginTop: 16 }}><Button kind="tinted" title={BACKUP.importBtn} onPress={onImport} /></View>
    </Sheet>
  )
}

/** Sign out, optionally removing this phone's log (shared phones). It stays in the account. */
export function SignOutSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const signOut = useStore((s) => s.signOut)
  const data = useStore((s) => s.data)
  const [busy, setBusy] = useState<'keep' | 'remove' | null>(null)
  const [sure, setSure] = useState(false)
  const unsynced = unsyncedCount(data)
  // no yes to health data: the log isn't in the account at all, so removing it deletes the only copy
  const phoneOnly = !consentLetsSync(data) && hasExistingData(data)
  const go = async (remove: boolean) => {
    if (busy) return
    if (remove && (unsynced > 0 || phoneOnly) && !sure) { setSure(true); return } // losing data takes a second tap
    setBusy(remove ? 'remove' : 'keep')
    try { await signOut({ remove }) } finally { setBusy(null) }
  }
  return (
    <Sheet title={SIGN_OUT.title} onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 10 }}>
        {phoneOnly
          ? <P color={t.label2}>{SIGN_OUT.phoneOnly}</P>
          : <P color={t.label2}>{SIGN_OUT.stays}</P>}
        {!phoneOnly && unsynced > 0 && <P color={t.label2}>{SIGN_OUT.unsynced(unsynced)}</P>}
      </View>
      <View style={{ gap: 8, marginTop: 16 }}>
        <Button kind="tinted" title={busy === 'keep' ? SIGN_OUT.signingOut : SIGN_OUT.title} disabled={!!busy} onPress={() => void go(false)} />
        {phoneOnly && <Button kind="gray" title={SIGN_OUT.exportCopy} disabled={!!busy} onPress={() => exportBackup(data)} />}
        <Button kind="danger" disabled={!!busy} onPress={() => void go(true)}
          title={busy === 'remove' ? SIGN_OUT.signingOut : sure && phoneOnly ? SIGN_OUT.removeSure : sure && unsynced > 0 ? SIGN_OUT.removeLose(unsynced) : SIGN_OUT.remove} />
      </View>
    </Sheet>
  )
}

/** A row that opens its contents below it (the web's `Disclosure`; N1 builds the real one). */
function Disclosure({ label, value, open, onToggle, first, children }: { label: string; value?: string; open: boolean; onToggle: () => void; first?: boolean; children: React.ReactNode }) {
  const t = useTokens()
  return (
    <View>
      <Pressable role="button" aria-label={label} aria-expanded={open} onPress={onToggle}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10, paddingHorizontal: 16 }, pressed && { backgroundColor: t.fill }]}>
        {!first && <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, backgroundColor: t.sep }} />}
        <Text style={[font(400), { fontSize: 17, color: t.label }]}>{label}</Text>
        <Text numberOfLines={1} style={[font(400), { flex: 1, textAlign: 'right', fontSize: 15, color: t.label2 }]}>{value}</Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Chevron /></View>
      </Pressable>
      {open && <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{children}</View>}
    </View>
  )
}

/**
 * The account rows of Profile, standing in until N10's Profile: Account, Health data, Back up and
 * restore, Delete account, Privacy (the legal documents, withdraw, delete) and Sign out, with every
 * sheet they open. `onDeleteView` shows the Delete your account view in place of the list.
 */
export function AccountSection() {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const email = useStore((s) => s.email)
  const authed = useStore((s) => s.authed)
  const syncPaused = useStore((s) => s.syncPaused)
  const consentOpen = useStore((s) => s.consentOpen)
  const importBackup = useStore((s) => s.importBackup)
  const showToast = useStore((s) => s.showToast)
  const healthStatus = useHealthStatus()
  const health = useConsent('health')
  const [open, setOpen] = useState<'account' | 'backup' | 'privacy' | null>(null)
  const [view, setView] = useState<'main' | 'delete'>('main')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState<false | 'main' | 'withdraw'>(false)
  const [regrantOpen, setRegrantOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<PersistedState | null>(null)
  const toggle = (s: NonNullable<typeof open>) => setOpen((o) => (o === s ? null : s))
  const healthRec = latestConsent(data, 'health')
  const healthAt = healthRec?.granted ? new Date(healthRec.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  // someone who never agreed on the full screen gets its three boxes; after a withdrawal, the one-box sheet
  const agree = () => {
    if ((data.consents?.records || []).some((r) => r.type === 'health' && r.granted)) setRegrantOpen(true)
    else useStore.getState().setConsentOpen(true)
  }
  const pick = async () => {
    try { const b = await pickBackup(); if (b) setPendingBackup(b) } catch { showToast(BACKUP.invalid) }
  }
  const lbl = [font(500), { fontSize: 13, color: t.label2, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 }]

  // the consent screen from Profile (someone who never agreed on it): the app gate shows it over the app
  if (consentOpen) return <View style={{ minHeight: 700 }}><ConsentScreen fromProfile /></View>
  if (view === 'delete') return <View style={{ minHeight: 700 }}><DeleteAccountView onBack={() => { setView('main'); setConfirmOpen(false) }} confirmOpen={confirmOpen} setConfirmOpen={setConfirmOpen} /></View>

  return (
    <View>
      <Text style={lbl}>{ACCOUNT_ROW.heading}</Text>
      <List>
        <Disclosure first label={ACCOUNT_ROW.account} open={open === 'account'} onToggle={() => toggle('account')}>
          <T size={13} color={t.label2}>{ACCOUNT_ROW.signedInAs}</T>
          <T size={17}>{syncPaused ? ACCOUNT_ROW.notSyncing : email}</T>
        </Disclosure>
        <Row title={HEALTH_DATA.title} right={<><Text style={[font(400), { fontSize: 15, color: t.label2 }]}>{HEALTH_STATUS_LABEL[healthStatus]}</Text><Chevron /></>} label={`${HEALTH_DATA.title}, ${HEALTH_STATUS_LABEL[healthStatus]}`} onPress={() => setHealthOpen('main')} />
        <Disclosure label={BACKUP.row} value={BACKUP.value} open={open === 'backup'} onToggle={() => toggle('backup')}>
          <T size={15} lh={1.4} color={t.label2} style={{ marginBottom: 10 }}>{!consentLetsSync(data)
            ? BACKUP.phoneOnly
            : BACKUP.stored(authed ? BACKUP.storedSyncing : syncPaused ? BACKUP.storedPaused : '')}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button kind="gray" title={BACKUP.exportBtn} onPress={() => exportBackup(data)} /></View>
            <View style={{ flex: 1 }}><Button kind="gray" title={BACKUP.importBtn} onPress={() => void pick()} /></View>
          </View>
        </Disclosure>
        <Row title={ACCOUNT_ROW.deleteRow} onPress={() => setView('delete')} />
      </List>

      <List style={{ marginTop: 24 }}>
        <Disclosure first label={PRIVACY_ROW.label} value={health.granted ? undefined : PRIVACY_ROW.off} open={open === 'privacy'} onToggle={() => toggle('privacy')}>
          <T size={15} lh={1.45} color={t.label2} style={{ marginBottom: 10 }}>
            {health.granted && healthAt ? PRIVACY_ROW.agreedOn(healthAt) : healthStatus === 'off' ? PRIVACY_ROW.withdrawn : ''}
            {consentLetsSync(data) ? PRIVACY_ROW.stored : PRIVACY_ROW.phoneOnly}{PRIVACY_ROW.neverSold}
          </T>
          <List bg={t.bg} style={{ marginBottom: 8 }}>
            {(['privacy', 'terms', 'cookies'] as LegalDocId[]).map((id, i) => (
              <Row key={id} first={i === 0} tint title={LEGAL_LABEL[id]} right={<Chevron />} onPress={() => openLegal(id)} />
            ))}
          </List>
          {health.granted
            ? <Button kind="gray" title={PRIVACY_ROW.withdraw} onPress={() => setHealthOpen('withdraw')} />
            : <Button kind="gray" title={PRIVACY_ROW.turnBackOn} onPress={agree} />}
          <Button kind="danger" title={ACCOUNT_ROW.deleteRow} style={{ marginTop: 6 }} onPress={() => setView('delete')} />
        </Disclosure>
      </List>

      <Button kind="cardRed" title={SIGN_OUT.title} radius={16} style={{ marginTop: 24 }} onPress={() => setSignOutOpen(true)} />
      <Foot center style={{ paddingTop: 12 }}>{PRIVACY_ROW.wellness}</Foot>

      {signOutOpen && <SignOutSheet onClose={() => setSignOutOpen(false)} />}
      {healthOpen && <HealthDataSheet start={healthOpen} onClose={() => setHealthOpen(false)} onAgree={() => { setHealthOpen(false); agree() }} />}
      {regrantOpen && <RegrantHealthSheet onClose={() => setRegrantOpen(false)} />}
      {pendingBackup && <ImportSheet backup={pendingBackup} onClose={() => setPendingBackup(null)} onImport={() => { importBackup(pendingBackup); setPendingBackup(null) }} />}
    </View>
  )
}
