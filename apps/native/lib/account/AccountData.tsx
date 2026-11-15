/**
 * Profile's account and privacy items (src/screens/ProfileScreen.tsx "Account and data" and
 * "Privacy", src/screens/profile/AccountData.tsx): health data (agree, or stop keeping it with a copy
 * offered first), back up and restore, delete account, the legal documents, and sign out.
 *
 * N10 builds Profile; until then `AccountSection` stands in for these rows (in the sheet the avatar
 * opens), and N10 places the same pieces in its own rows. Words: src/copy/account.ts. Pieces: lib/ui.
 * Export and import use the system share sheet and document picker where the web downloads and
 * uploads (src/data/backup.native.ts, ./backupFile).
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { useConsent, useHealthWithdrawal } from '@/store/hooks'
import { consentLetsSync, hasExistingData, healthDataSummary, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { backupSummary, unsyncedCount, type PersistedState } from '@/data/persistence'
import { exportBackup } from '@/data/backup'
import { fmtDate } from '@/core/domain/date'
import { healthAnswersView } from '@/core/domain/onboarding'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import type { LegalDocId } from '@/core/legal'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { HEALTH_ANSWERS_ROW, REDO_ROW, SETUP_ROW, SUPPORT } from '@/screens/onboarding/copyApp'
import { supportList } from '@/screens/profile/supportRows'
import { SUPPORT_MIND } from '@/screens/mind/copy'
import { ACCOUNT_ROW, BACKUP, HEALTH_DATA, HEALTH_TICKS, PRIVACY_ROW, SIGN_OUT } from '@/copy/account'
import { BTN, num, tx, useTokens } from '../theme'
import { Btn, LinkBtn, List, slop } from '../ui/kit'
import { BackButton, Disclosure, NavBtn, Row, SettingRow, Sheet } from '../ui/primitives'
import { ConsentScreen, PrivacySheet, RegrantHealthSheet } from './Consent'
import { Sub } from '../ui/text'
import { DeleteAccountView } from './Delete'
import { Opts, Signposts, Ticks } from '../ui/choices'
import { LEGAL_LABEL, openLegal } from './legal'
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
      <Sheet title={HEALTH_DATA.title} onClose={onClose} left={<BackButton onPress={() => setStep(null)} />}>
        <View style={{ paddingHorizontal: 4, gap: 10 }}>
          <Sub style={tx(15, 400, 1.45)}>{step.prompt}</Sub>
          {onPhone && <Text style={[tx(15, 400, 1.45), num, { color: t.label2 }]}>{onPhone}</Text>}
        </View>
        <View style={{ gap: 8, marginTop: 16 }}>
          {/* the same file the web downloads (the whole log), through the share sheet. Unlike the web it
              never turns to "Downloaded": the share sheet can't say whether the copy was saved or the
              person closed it (compliance, 13 Nov) */}
          <Btn kind="gray" title={HEALTH_DATA.download} onPress={download} />
          <Btn kind="danger" title={HEALTH_DATA.remove} onPress={() => { withdraw(); showToast(HEALTH_DATA.removed); onClose() }} />
        </View>
      </Sheet>
    )
  }

  return (
    <Sheet title={HEALTH_DATA.title} onClose={onClose} left={null} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <Text style={[tx(15, 400, 1.45), { color: t.label2, paddingHorizontal: 4, paddingBottom: 12 }]}>
        {status === 'on' ? HEALTH_DATA.on : status === 'paused' ? HEALTH_DATA.paused + unconsentedCopyLine() : status === 'off' ? HEALTH_DATA.off : HEALTH_DATA.unasked}
      </Text>
      <Ticks items={[...HEALTH_TICKS]} />
      <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><LinkBtn title={HEALTH_DATA.readPrivacy} onPress={() => setPrivacy(true)} style={tx(15, 400, 1.3, BTN)} /></View>
      {(answersRow || redoRow) && (
        <List style={{ marginTop: 12 }}>
          {answersRow && <Row title={HEALTH_ANSWERS_ROW} onPress={onAnswers} />}
          {redoRow && <Row title={onboarded ? REDO_ROW : SETUP_ROW} onPress={onRedo} />}
        </List>
      )}
      <List style={{ marginTop: 12 }}>
        <Row title={SUPPORT.row} sub={SUPPORT.rowSub} onPress={() => setSupport(true)} />
      </List>
      <View style={{ gap: 8, marginTop: 16 }}>
        {status !== 'on' && <Btn title={HEALTH_DATA.agree} onPress={onAgree} />}
        {(status === 'on' || (status !== 'off' && canRemove)) && <Btn kind="danger" title={HEALTH_DATA.stop} onPress={() => setStep(prepare())} />}
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
  const foot = [tx(12, 400, 1.4), { color: t.label2, paddingHorizontal: 4 }]
  return (
    <Sheet title={SUPPORT.title} onClose={onClose} left={null} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <View style={{ gap: 14 }}>
        <Text style={[tx(16, 400, 1.5), { color: t.label, paddingHorizontal: 4 }]}>{SUPPORT.lead}</Text>
        {picking
          ? <Opts label="Nation" opts={NATIONS} value={nation ?? undefined} onPick={(k) => { setNation(k); setPicking(false) }} />
          : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
              <Text style={[tx(13), { color: t.label2 }]}>{SUPPORT.showing(name)}</Text>
              <Pressable accessibilityRole="button" onPress={() => setPicking(true)} hitSlop={slop(40, 17)}>
                <Text style={[tx(13, 600, 1.3, BTN), { color: t.tint }]}>{nation ? SUPPORT.change : SUPPORT.choose}</Text>
              </Pressable>
            </View>
          )}
        <Signposts list={supportList(nation)} support />
        {!nation && <Text style={foot}>{SUPPORT.chooseNation}</Text>}
        <Text style={foot}>{SUPPORT.foot}</Text>
      </View>
    </Sheet>
  )
}

/* ---------------- back up and restore ---------------- */

/** Confirm step before a backup replaces data: what's in it and what changes (on all devices). */
export function ImportSheet({ backup, onClose, onImport }: { backup: PersistedState; onClose: () => void; onImport: () => void }) {
  const b = backupSummary(backup)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title={BACKUP.importTitle} onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 10 }}>
        <Sub style={tx(15, 400, 1.45)}>{BACKUP.has(b, span)}</Sub>
        <Sub style={tx(15, 400, 1.45)}>{BACKUP.replaces(b)}</Sub>
      </View>
      <View style={{ marginTop: 16 }}><Btn kind="tinted" title={BACKUP.importBtn} onPress={onImport} /></View>
    </Sheet>
  )
}

/** Sign out, optionally removing this phone's log (shared phones). It stays in the account. */
export function SignOutSheet({ onClose }: { onClose: () => void }) {
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
        <Sub style={tx(15, 400, 1.45)}>{phoneOnly ? SIGN_OUT.phoneOnly : SIGN_OUT.stays}</Sub>
        {!phoneOnly && unsynced > 0 && <Sub style={tx(15, 400, 1.45)}>{SIGN_OUT.unsynced(unsynced)}</Sub>}
      </View>
      <View style={{ gap: 8, marginTop: 16 }}>
        <Btn kind="tinted" title={busy === 'keep' ? SIGN_OUT.signingOut : SIGN_OUT.title} disabled={!!busy} onPress={() => void go(false)} />
        {phoneOnly && <Btn kind="gray" title={SIGN_OUT.exportCopy} disabled={!!busy} onPress={() => exportBackup(data)} />}
        <Btn kind="danger" disabled={!!busy} onPress={() => void go(true)}
          title={busy === 'remove' ? SIGN_OUT.signingOut : sure && phoneOnly ? SIGN_OUT.removeSure : sure && unsynced > 0 ? SIGN_OUT.removeLose(unsynced) : SIGN_OUT.remove} />
      </View>
    </Sheet>
  )
}

/**
 * Profile's account rows (ProfileScreen's "Account and data", "Privacy", Sign out), standing in until
 * N10's Profile, with every sheet they open. The Delete your account view shows in place of the rows.
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
  // the web's colours for these rows (ProfileScreen: GRAY = --fill2, MINDF = --mind-fill)
  const GRAY = t.fill2, MINDF = t.mindFill
  const lbl = [tx(13, 500), { color: t.label2, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 }]

  // the consent screen from Profile (someone who never agreed on it): the gate shows it over the app,
  // under this sheet, so it shows here too until N10's Profile is a screen of its own
  if (consentOpen) return <View style={{ minHeight: 700 }}><ConsentScreen fromProfile /></View>
  if (view === 'delete') return <View style={{ minHeight: 700 }}><DeleteAccountView onBack={() => { setView('main'); setConfirmOpen(false) }} confirmOpen={confirmOpen} setConfirmOpen={setConfirmOpen} /></View>

  return (
    <View>
      <Text style={lbl}>{ACCOUNT_ROW.heading}</Text>
      <List icons>
        <Disclosure icon="person" color={GRAY} soft label={ACCOUNT_ROW.account} open={open === 'account'} onToggle={() => toggle('account')}>
          <Text style={[tx(13), { color: t.label2 }]}>{ACCOUNT_ROW.signedInAs}</Text>
          <Text style={[tx(17), { color: t.label }]}>{syncPaused ? ACCOUNT_ROW.notSyncing : email}</Text>
          {authed && <Text style={[tx(13, 400, 1.38), { color: t.label2, paddingTop: 8 }]}>{ACCOUNT_ROW.changeFoot}</Text>}
        </Disclosure>
        <SettingRow icon="heart" color={MINDF} soft label={HEALTH_DATA.title} value={HEALTH_STATUS_LABEL[healthStatus]} onPress={() => setHealthOpen('main')} />
        <Disclosure icon="cloud" color={GRAY} soft label={BACKUP.row} value={BACKUP.value} open={open === 'backup'} onToggle={() => toggle('backup')}>
          <Text style={[tx(15), { color: t.label2, marginBottom: 10 }]}>{!consentLetsSync(data)
            ? BACKUP.phoneOnly
            : BACKUP.stored(authed ? BACKUP.storedSyncing : syncPaused ? BACKUP.storedPaused : '')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Btn kind="gray" title={BACKUP.exportBtn} onPress={() => exportBackup(data)} /></View>
            <View style={{ flex: 1 }}><Btn kind="gray" title={BACKUP.importBtn} onPress={() => void pick()} /></View>
          </View>
        </Disclosure>
        <SettingRow icon="x" color={GRAY} soft label={ACCOUNT_ROW.deleteRow} onPress={() => setView('delete')} />
      </List>

      <List icons style={{ marginTop: 24 }}>
        <Disclosure icon="key" color={GRAY} soft label={PRIVACY_ROW.label} value={health.granted ? undefined : PRIVACY_ROW.off} open={open === 'privacy'} onToggle={() => toggle('privacy')}>
          <Text style={[tx(15, 400, 1.45), { color: t.label2, marginBottom: 10 }]}>
            {health.granted && healthAt ? PRIVACY_ROW.agreedOn(healthAt) : healthStatus === 'off' ? PRIVACY_ROW.withdrawn : ''}
            {consentLetsSync(data) ? PRIVACY_ROW.stored : PRIVACY_ROW.phoneOnly}{PRIVACY_ROW.neverSold}
          </Text>
          {/* .list.legal-rows: .li.act rows, each opening the document on the website */}
          <List style={{ marginBottom: 8 }}>
            {(['privacy', 'terms', 'cookies'] as LegalDocId[]).map((id) => (
              <Row key={id} act chevron title={LEGAL_LABEL[id]} onPress={() => openLegal(id)} />
            ))}
          </List>
          {health.granted
            ? <Btn kind="gray" title={PRIVACY_ROW.withdraw} onPress={() => setHealthOpen('withdraw')} />
            : <Btn kind="gray" title={PRIVACY_ROW.turnBackOn} onPress={agree} />}
          <Btn kind="danger" title={ACCOUNT_ROW.deleteRow} style={{ marginTop: 6 }} onPress={() => setView('delete')} />
        </Disclosure>
      </List>

      <Btn kind="signout" title={SIGN_OUT.title} onPress={() => setSignOutOpen(true)} />
      <Text style={[tx(13, 400, 1.38), { color: t.label2, textAlign: 'center', paddingTop: 12, paddingHorizontal: 16 }]}>{PRIVACY_ROW.wellness}</Text>

      {signOutOpen && <SignOutSheet onClose={() => setSignOutOpen(false)} />}
      {healthOpen && <HealthDataSheet start={healthOpen} onClose={() => setHealthOpen(false)} onAgree={() => { setHealthOpen(false); agree() }} />}
      {regrantOpen && <RegrantHealthSheet onClose={() => setRegrantOpen(false)} />}
      {pendingBackup && <ImportSheet backup={pendingBackup} onClose={() => setPendingBackup(null)} onImport={() => { importBackup(pendingBackup); setPendingBackup(null) }} />}
    </View>
  )
}
