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
import { font, useTokens } from '../theme'
import { Button, Chevron, Foot, LinkButton, List, NavButton, Row, Sheet, T, Ticks } from './kit'
import { ConsentScreen, P, PrivacySheet, RegrantHealthSheet } from './Consent'
import { DeleteAccountView } from './Delete'
import { Opts, Signposts } from './AgeStop'
import { LEGAL_LABEL, openLegal } from './legal'
import { exportBackup, pickBackup } from './backupFile'

/** The lines on the health data sheet (onboarding/Consent.tsx HEALTH_TICKS). */
export const HEALTH_TICKS = [
  'It’s private to your account. Nobody else can see it.',
  'It’s never sold or used for ads.',
  'Download it or delete it any time in Profile.',
  'Saved on this phone first, so this works offline too.',
]

export type HealthStatus = 'on' | 'paused' | 'off' | 'unasked'
export function useHealthStatus(): HealthStatus {
  return useStore((s) => {
    const r = latestConsent(s.data, 'health')
    return r ? (r.granted ? 'on' : 'off') : healthSyncPaused(s.data) ? 'paused' : 'unasked'
  })
}
export const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = { on: 'On', paused: 'Paused', off: 'Off', unasked: 'Not asked yet' }

/* ---------------- health data ---------------- */

/**
 * `start="withdraw"` opens straight at the copy-first withdraw step (Privacy's button). "Yes, keep it"
 * hands over to `onAgree`: giving consent from Profile goes through the explicit statement and
 * unticked box, never a bare tap.
 */
export function HealthDataSheet({ onClose, onAgree, onAnswers, onRedo, start = 'main' }: { onClose: () => void; onAgree: () => void; onAnswers?: () => void; onRedo?: () => void; start?: 'main' | 'withdraw' }) {
  const t = useTokens()
  const status = useHealthStatus()
  const data = useStore((s) => s.data)
  const { prepare, withdraw } = useHealthWithdrawal()
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState<null | ReturnType<typeof prepare>>(() => (start === 'withdraw' ? prepare() : null))
  const [privacy, setPrivacy] = useState(false)
  const [support, setSupport] = useState(false)
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields + h.trainingPrefs > 0 || !!s.data._meta?.lastPull })
  const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`
  const hasAnswers = useStore((s) => ONBOARDING_ENABLED && healthAnswersView(s.data.profile).rows.some((r) => r.kind !== 'baseline'))
  const onboarded = useStore((s) => !!s.data.profile.onboardedAt)
  const answersRow = hasAnswers && !!onAnswers, redoRow = ONBOARDING_ENABLED && !!onRedo

  if (step) {
    const s = step.summary
    const parts = [s.weighIns ? n(s.weighIns, 'weigh-in', 'weigh-ins') : '', s.checkins ? n(s.checkins, 'check-in', 'check-ins') : '', s.profileFields ? n(s.profileFields, 'body detail', 'body details') : '', s.trainingPrefs ? n(s.trainingPrefs, 'training preference', 'training preferences') : ''].filter(Boolean)
    return (
      <Sheet title="Health data" onClose={onClose} left={<NavButton back title="Back" onPress={() => setStep(null)} />}>
        <View style={{ paddingHorizontal: 4, gap: 10 }}>
          <P color={t.label2}>{step.prompt}</P>
          {parts.length > 0 && <P color={t.label2}>On this phone: {parts.join(', ')}.</P>}
        </View>
        <View style={{ gap: 8, marginTop: 16 }}>
          {/* the same file the web downloads (the whole log), through the share sheet. Unlike the web it
              never turns to "Downloaded": the share sheet can't say whether the copy was saved or the
              person closed it (compliance, 13 Nov) */}
          <Button kind="gray" title="Download a copy" onPress={() => void exportBackup(data)} />
          <Button kind="danger" title="Remove my health data" onPress={() => { withdraw(); showToast('Health data removed'); onClose() }} />
        </View>
      </Sheet>
    )
  }

  return (
    <Sheet title="Health data" onClose={onClose} left={null} right={<NavButton bold title="Done" onPress={onClose} />}>
      <T size={15} lh={1.45} color={t.label2} style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
        {status === 'on' ? 'Tilo keeps your log, including your weight, check-ins and body details, to run the app and build your plan and targets.'
          : status === 'paused' ? 'Your log is on this phone only until you agree: nothing syncs to your account or is backed up there. ' + unconsentedCopyLine()
          : status === 'off' ? 'You’ve said no, so your log is on your phones only: nothing syncs to your account. To build your plan, Tilo uses things like your weight, sleep, stress and health, and needs your OK to keep them.'
          : 'To build your plan, Tilo asks about things like your weight, sleep, stress and health. That’s health data, so we need your OK to keep it.'}
      </T>
      <Ticks items={HEALTH_TICKS} />
      <LinkButton title="Read the privacy notice" onPress={() => setPrivacy(true)} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
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
        {status !== 'on' && <Button title="Yes, keep it" onPress={onAgree} />}
        {(status === 'on' || (status !== 'off' && canRemove)) && <Button kind="danger" title="Stop keeping my health data" onPress={() => setStep(prepare())} />}
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
  const n = (x: number, one: string, many: string) => x + ' ' + (x === 1 ? one : many)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title="Import backup" onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 10 }}>
        <P color={t.label2}>This backup has {n(b.days, 'day', 'days')}{span}, {n(b.foods, 'saved food', 'saved foods')}, {n(b.recipes, 'recipe', 'recipes')} and {n(b.workouts, 'workout', 'workouts')}.</P>
        <P color={t.label2}>Importing replaces your targets and profile{b.days ? (b.days === 1 ? ', that day' : ', those ' + b.days + ' days') : ''}{b.foods || b.recipes ? ' and any saved food or recipe with the same name' : ''}{b.workouts ? ', and adds its workouts' : ''} on all your devices. Anything else here stays as it is.</P>
      </View>
      <View style={{ marginTop: 16 }}><Button kind="tinted" title="Import" onPress={onImport} /></View>
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
    <Sheet title="Sign out" onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 10 }}>
        {phoneOnly
          ? <P color={t.label2}>What you log now is only on this phone: nothing syncs to your account until you agree to Tilo keeping your health data. Signing out keeps it here for when you sign back in. Removing it deletes it from this phone for good, so export a copy first.</P>
          : <P color={t.label2}>Your log stays on this device for when you sign back in. On a shared phone you can remove it instead: it stays in your account.</P>}
        {!phoneOnly && unsynced > 0 && <P color={t.label2}>{unsynced === 1 ? '1 change hasn’t' : unsynced + ' changes haven’t'} synced yet, so removing the log now would lose {unsynced === 1 ? 'it' : 'them'}. Connect first, or export a copy in Back up and restore.</P>}
      </View>
      <View style={{ gap: 8, marginTop: 16 }}>
        <Button kind="tinted" title={busy === 'keep' ? 'Signing out…' : 'Sign out'} disabled={!!busy} onPress={() => void go(false)} />
        {phoneOnly && <Button kind="gray" title="Export a copy" disabled={!!busy} onPress={() => void exportBackup(data)} />}
        <Button kind="danger" disabled={!!busy} onPress={() => void go(true)}
          title={busy === 'remove' ? 'Signing out…' : sure && phoneOnly ? 'Remove anyway and delete your log' : sure && unsynced > 0 ? 'Remove anyway and lose ' + (unsynced === 1 ? '1 change' : unsynced + ' changes') : 'Sign out and remove this device’s log'} />
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
    try { const b = await pickBackup(); if (b) setPendingBackup(b) } catch { showToast("That isn't a valid backup file") }
  }
  const lbl = [font(500), { fontSize: 13, color: t.label2, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 }]

  // the consent screen from Profile (someone who never agreed on it): the app gate shows it over the app
  if (consentOpen) return <View style={{ minHeight: 700 }}><ConsentScreen fromProfile /></View>
  if (view === 'delete') return <View style={{ minHeight: 700 }}><DeleteAccountView onBack={() => { setView('main'); setConfirmOpen(false) }} confirmOpen={confirmOpen} setConfirmOpen={setConfirmOpen} /></View>

  return (
    <View>
      <Text style={lbl}>Account and data</Text>
      <List>
        <Disclosure first label="Account" open={open === 'account'} onToggle={() => toggle('account')}>
          <T size={13} color={t.label2}>Signed in as</T>
          <T size={17}>{syncPaused ? 'Your account (not syncing right now)' : email}</T>
        </Disclosure>
        <Row title="Health data" right={<><Text style={[font(400), { fontSize: 15, color: t.label2 }]}>{HEALTH_STATUS_LABEL[healthStatus]}</Text><Chevron /></>} label={`Health data, ${HEALTH_STATUS_LABEL[healthStatus]}`} onPress={() => setHealthOpen('main')} />
        <Disclosure label="Back up and restore" value="Export, import" open={open === 'backup'} onToggle={() => toggle('backup')}>
          <T size={15} lh={1.4} color={t.label2} style={{ marginBottom: 10 }}>{!consentLetsSync(data)
            ? 'Your log is only on this phone until you agree to Tilo keeping your health data, so export a copy now and then.'
            : `Your log is stored on this device, so Tilo works without a connection${authed ? ', and it syncs to your private database when you’re online' : syncPaused ? '. Not syncing right now: changes sync when you’re back online, or sign in again from Account' : ''}. Export a copy now and then.`}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button kind="gray" title="Export" onPress={() => void exportBackup(data)} /></View>
            <View style={{ flex: 1 }}><Button kind="gray" title="Import" onPress={() => void pick()} /></View>
          </View>
        </Disclosure>
        <Row title="Delete account" onPress={() => setView('delete')} />
      </List>

      <List style={{ marginTop: 24 }}>
        <Disclosure first label="Privacy" value={health.granted ? undefined : 'Health data off'} open={open === 'privacy'} onToggle={() => toggle('privacy')}>
          <T size={15} lh={1.45} color={t.label2} style={{ marginBottom: 10 }}>
            {health.granted && healthAt ? `You agreed to Tilo using your health information on ${healthAt}. ` : healthStatus === 'off' ? 'You’ve withdrawn consent, so your log is on your phones only and Tilo doesn’t keep your weigh-ins, check-ins or body details. ' : ''}
            {consentLetsSync(data) ? 'Your data is stored on this phone and in your private account database.' : 'Your log is only on this phone until you agree.'} It’s never sold or used for ads.
          </T>
          <List bg={t.bg} style={{ marginBottom: 8 }}>
            {(['privacy', 'terms', 'cookies'] as LegalDocId[]).map((id, i) => (
              <Row key={id} first={i === 0} tint title={LEGAL_LABEL[id]} right={<Chevron />} onPress={() => openLegal(id)} />
            ))}
          </List>
          {health.granted
            ? <Button kind="gray" title="Withdraw consent for health data" onPress={() => setHealthOpen('withdraw')} />
            : <Button kind="gray" title="Turn health data back on" onPress={agree} />}
          <Button kind="danger" title="Delete account" style={{ marginTop: 6 }} onPress={() => setView('delete')} />
        </Disclosure>
      </List>

      <Button kind="cardRed" title="Sign out" radius={16} style={{ marginTop: 24 }} onPress={() => setSignOutOpen(true)} />
      <Foot center style={{ paddingTop: 12 }}>Tilo offers general wellness guidance, not medical advice.</Foot>

      {signOutOpen && <SignOutSheet onClose={() => setSignOutOpen(false)} />}
      {healthOpen && <HealthDataSheet start={healthOpen} onClose={() => setHealthOpen(false)} onAgree={() => { setHealthOpen(false); agree() }} />}
      {regrantOpen && <RegrantHealthSheet onClose={() => setRegrantOpen(false)} />}
      {pendingBackup && <ImportSheet backup={pendingBackup} onClose={() => setPendingBackup(null)} onImport={() => { importBackup(pendingBackup); setPendingBackup(null) }} />}
    </View>
  )
}
