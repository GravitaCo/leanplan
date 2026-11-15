/**
 * Profile's consent and account items (onboarding plan §8, §14): health data (agree, or stop and
 * clear it with a download offered first), AI features, and deleting the account (boards
 * ob6-5-delete and ob6-6-delete-confirm: typed DELETE, re-confirming who you are, needs a
 * connection). Error copy stays neutral: every failure says nothing was deleted.
 */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { useAccountDeletion, useConsent, useHealthWithdrawal } from '@/store/hooks'
import { healthDataSummary, unconsentedCopyLine } from '@/data/consent'
import { HEALTH_STATUS_LABEL, healthStatusOf, type HealthStatus } from './profileModel'
import { DELETE_MESSAGES } from '@/data/account'
import { exportBackup } from '@/data/backup'
import { BackButton, BareSheet, Sheet } from '@/ui/primitives'
import { Chevron } from '@/ui/icons'
import { AI_TICKS, HEALTH_TICKS, ONBOARDING_ENABLED, PrivacySheet, Ticks } from '../onboarding/Consent'
import { HEALTH_ANSWERS_ROW, REDO_ROW, SETUP_ROW, SUPPORT } from '../onboarding/copyApp'
import { Signposts } from '../onboarding/Signposts'
import { Opts } from '../onboarding/Opts'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import { supportList } from './supportRows'
import { SUPPORT_MIND } from '../mind/copy'
import { healthAnswersView } from '@/core/domain/onboarding'
import { DELETE, HEALTH_DATA } from '@/copy/account'

/** The word typed to confirm (board ob6-6). The server's own confirm phrase is sent by the data layer. */
export const DELETE_WORD = 'DELETE'
export const typedOk = (x: string) => x.trim().toUpperCase() === DELETE_WORD

export type { HealthStatus }
export { HEALTH_STATUS_LABEL }
export function useHealthStatus(): HealthStatus {
  return useStore((s) => healthStatusOf(s.data))
}

/* ---------------- health data ---------------- */

/**
 * `start="withdraw"` opens straight at the download-first withdraw step (Profile → Privacy's
 * button). "Yes, keep it" hands over to `onAgree`: giving consent from Profile goes through the
 * explicit statement and unticked box (legal/PrivacySheets RegrantHealthSheet), never a bare tap.
 */
export function HealthDataSheet({ onClose, onAgree, onAnswers, onRedo, start = 'main' }: { onClose: () => void; onAgree: () => void; onAnswers?: () => void; onRedo?: () => void; start?: 'main' | 'withdraw' }) {
  const status = useHealthStatus()
  const { prepare, download, withdraw } = useHealthWithdrawal()
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState<null | ReturnType<typeof prepare>>(() => (start === 'withdraw' ? prepare() : null))
  const [saved, setSaved] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [support, setSupport] = useState(false)
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields + h.trainingPrefs > 0 || !!s.data._meta?.lastPull })
  // Health check answers (ob7-1), behind the wizard: only when an onboarding answer is kept
  // ("how things are lately" has no row: answerRows)
  const hasAnswers = useStore((s) => ONBOARDING_ENABLED && healthAnswersView(s.data.profile).rows.some((r) => r.kind !== 'baseline'))
  // Redo setup (compliance item 32) once setup has been finished, or Set up my plan for someone who
  // never ran it (they used Tilo before onboarding); behind the wizard. Both open it prefilled
  const onboarded = useStore((s) => !!s.data.profile.onboardedAt)
  const answersRow = hasAnswers && !!onAnswers, redoRow = ONBOARDING_ENABLED && !!onRedo

  if (step) {
    const onPhone = HEALTH_DATA.onPhone(step.summary)
    return (
      <Sheet title={HEALTH_DATA.title} onClose={onClose} left={<BackButton onClick={() => setStep(null)} />}>
        <div className="prose sub" style={{ padding: '0 4px' }}>
          <p>{step.prompt}</p>
          {onPhone && <p style={{ margin: 0 }} className="num">{onPhone}</p>}
        </div>
        <div className="stack">
          <button className="btn gray" onClick={() => { download(); setSaved(true) }}>{saved ? HEALTH_DATA.downloaded : HEALTH_DATA.download}</button>
          <button className="btn danger" onClick={() => { withdraw(); showToast(HEALTH_DATA.removed); onClose() }}>{HEALTH_DATA.remove}</button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={HEALTH_DATA.title} onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="sub" style={{ padding: '0 4px 12px', lineHeight: 1.45 }}>
        {status === 'on' ? HEALTH_DATA.on : status === 'paused' ? HEALTH_DATA.paused + unconsentedCopyLine() : status === 'off' ? HEALTH_DATA.off : HEALTH_DATA.unasked}
      </div>
      <Ticks items={HEALTH_TICKS} />
      <button className="linkbtn" style={{ marginTop: 8 }} onClick={() => setPrivacy(true)}>{HEALTH_DATA.readPrivacy}</button>
      {(answersRow || redoRow) && (
        <div className="list" style={{ marginTop: 12 }}>
          {answersRow && <button className="li" onClick={onAnswers}><div className="m"><div className="t">{HEALTH_ANSWERS_ROW}</div></div><Chevron /></button>}
          {redoRow && <button className="li" onClick={onRedo}><div className="m"><div className="t">{onboarded ? REDO_ROW : SETUP_ROW}</div></div><Chevron /></button>}
        </div>
      )}
      {/* Onboarding 10 (ob9-6): for everyone, whatever their consent or answers */}
      <div className="list" style={{ marginTop: 12 }}>
        <button className="li" onClick={() => setSupport(true)}><div className="m"><div className="t">{SUPPORT.row}</div><div className="s">{SUPPORT.rowSub}</div></div><Chevron /></button>
      </div>
      <div className="stack">
        {status !== 'on' && <button className="btn" onClick={onAgree}>{HEALTH_DATA.agree}</button>}
        {/* withdraw (download first) whenever there's health data to remove: on, or paused / not
            asked with data on this phone or (after a sync) in the account */}
        {(status === 'on' || (status !== 'off' && canRemove)) && <button className="btn danger" onClick={() => setStep(prepare())}>{HEALTH_DATA.stop}</button>}
      </div>
      {privacy && <PrivacySheet onClose={() => setPrivacy(false)} />}
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </Sheet>
  )
}

/* ---------------- support and helplines ---------------- */

/**
 * Onboarding 10 (board ob9-7, note s-ob10). Its foot says opening it is private, so it must stay
 * pure UI: no store action, no persisted field, no network. The nation is this sheet's own state
 * (forgotten on close), and the list is signposts.ts's, bundled with the app. It opens on the whole
 * UK, as the Mind sheet does (register item 44; Benn, 10 Oct 2026): Beat first on its UK-wide line,
 * the GP in NHS 111's place, "Choose" and a footnote until a nation is picked, then "Change".
 */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  return (
    <Sheet title={SUPPORT.title} onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="sp-sheet">
        <div className="sp-lead">{SUPPORT.lead}</div>
        {picking
          ? <Opts label="Nation" opts={NATIONS} value={nation ?? undefined} onPick={(k) => { setNation(k); setPicking(false) }} />
          : <div className="sp-nation"><span>{SUPPORT.showing(name)}</span><button className="linkbtn" onClick={() => setPicking(true)}>{nation ? SUPPORT.change : SUPPORT.choose}</button></div>}
        <Signposts list={supportList(nation)} />
        {!nation && <div className="sp-foot">{SUPPORT.chooseNation}</div>}
        <div className="sp-foot">{SUPPORT.foot}</div>
      </div>
    </Sheet>
  )
}

/* ---------------- AI features ---------------- */

export function AiSheet({ onClose }: { onClose: () => void }) {
  const { granted, grant, withdraw } = useConsent('ai')
  const [privacy, setPrivacy] = useState(false)
  return (
    <Sheet title="AI features" onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="sub" style={{ padding: '0 4px 12px', lineHeight: 1.45 }}>
        Some features, like reading a food label from a photo or describing a meal in words, send what you share to Anthropic, the company that makes the AI Tilo uses.
      </div>
      <Ticks items={AI_TICKS} />
      <button className="linkbtn" style={{ marginTop: 8 }} onClick={() => setPrivacy(true)}>What's sent, and where</button>
      <div className="stack">
        {granted
          ? <button className="btn gray" onClick={() => { withdraw(); onClose() }}>Turn off AI features</button>
          : <button className="btn" onClick={() => { grant(); onClose() }}>Turn on AI features</button>}
      </div>
      {privacy && <PrivacySheet onClose={() => setPrivacy(false)} />}
    </Sheet>
  )
}

/* ---------------- ob6-5 delete account ---------------- */

const GOES = DELETE.goes

export function DeleteAccountView({ onBack, confirmOpen, setConfirmOpen }: { onBack: () => void; confirmOpen: boolean; setConfirmOpen: (x: boolean) => void }) {
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const { reason, deleting } = useAccountDeletion()
  return (
    <div className="screen del">
      <BackButton onClick={onBack} label={DELETE.back} />
      <h1 className="del-t">{DELETE.title}</h1>
      <div className="del-lead">{DELETE.lead}</div>
      <h2 className="del-h">{DELETE.goesHeading}</h2>
      <div className="list">{GOES.map((x) => <div className="li" key={x}><div className="m"><div className="t">{x}</div></div></div>)}</div>
      <div className="list">
        <button className="li" onClick={() => exportBackup(data)}>
          <div className="m"><div className="t">{DELETE.copyRow}</div><div className="s">{DELETE.copySub}</div></div>
          <Chevron />
        </button>
      </div>
      <button className="btn delbtn" disabled={!online || deleting} onClick={() => setConfirmOpen(true)}>{DELETE.button}</button>
      <div className="del-foot">{online && reason ? reason : DELETE.needsConnection}</div>
      {confirmOpen && <DeleteConfirmSheet onClose={() => setConfirmOpen(false)} />}
    </div>
  )
}

/* ---------------- ob6-6 typed confirm ---------------- */

export function DeleteConfirmSheet({ onClose }: { onClose: () => void }) {
  const online = useStore((s) => s.online)
  const { deleting, provider, needsReauth, reauth, run } = useAccountDeletion()
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  // re-confirm who you are when the sign-in is older than 5 minutes (the server checks too)
  const [stale, setStale] = useState(() => needsReauth())
  const google = provider === 'google'
  const needPw = stale && !google
  const ready = typedOk(typed) && online && !deleting && (!needPw || password.length > 0)

  const go = async () => {
    if (!ready) return
    setMsg(null)
    if (needPw) {
      const r = await reauth({ password })
      if (r === 'wrong-password') { setMsg(DELETE.wrongPassword); return }
      if (r === 'offline') { setMsg(DELETE_MESSAGES.offline); return }
      if (r !== 'ok') { setMsg(DELETE_MESSAGES.error); return }
    }
    const { result, message } = await run()
    if (result.status === 'reauth') setStale(true)
    if (message) setMsg(message)
  }

  return (
    <BareSheet label={DELETE.confirmTitle} onClose={onClose} className="delconf">
      <h2 className="cs-t">{DELETE.confirmTitle}</h2>
      <div className="cs-lead">{DELETE.confirmLead}</div>
      {stale && google && (
        <>
          <div className="cs-msg">{DELETE_MESSAGES.reauth}</div>
          <button className="btn gray" disabled={!online} onClick={async () => { const r = await reauth({ google: true }); if (r !== 'redirecting') setMsg(r === 'offline' ? DELETE_MESSAGES.offline : DELETE_MESSAGES.error) }}>{DELETE.googleAgain}</button>
        </>
      )}
      {needPw && (
        <label className="typed">
          <span>{DELETE.password}</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      )}
      <label className="typed">
        <span>{DELETE.typed}</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} />
      </label>
      {msg && <div className="cs-msg" role="status">{msg}</div>}
      {!online && !msg && <div className="cs-msg" role="status">{DELETE_MESSAGES.offline}</div>}
      <button className="btn delall" disabled={!ready || (stale && google)} onClick={go}>{deleting ? DELETE.deleting : DELETE.confirm}</button>
      <button className="linkbtn ob-alt" onClick={onClose}>{DELETE.cancel}</button>
    </BareSheet>
  )
}
