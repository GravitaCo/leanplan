/**
 * Profile's consent and account items (onboarding plan §8, §14): health data (agree, or stop and
 * clear it with a download offered first), AI features, and deleting the account (boards
 * ob6-5-delete and ob6-6-delete-confirm: typed DELETE, re-confirming who you are, needs a
 * connection). Error copy stays neutral: every failure says nothing was deleted.
 */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { useAccountDeletion, useConsent, useHealthWithdrawal } from '@/store/hooks'
import { healthDataSummary, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { DELETE_MESSAGES } from '@/data/account'
import { exportBackup } from '@/data/backup'
import { BackButton, BareSheet, Sheet } from '@/ui/primitives'
import { Chevron } from '@/ui/icons'
import { AI_TICKS, HEALTH_TICKS, PrivacySheet, Ticks } from '../onboarding/Consent'

/** The word typed to confirm (board ob6-6). The server's own confirm phrase is sent by the data layer. */
export const DELETE_WORD = 'DELETE'
export const typedOk = (x: string) => x.trim().toUpperCase() === DELETE_WORD

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
 * `start="withdraw"` opens straight at the download-first withdraw step (Profile → Privacy's
 * button). "Yes, keep it" hands over to `onAgree`: giving consent from Profile goes through the
 * explicit statement and unticked box (legal/PrivacySheets RegrantHealthSheet), never a bare tap.
 */
export function HealthDataSheet({ onClose, onAgree, start = 'main' }: { onClose: () => void; onAgree: () => void; start?: 'main' | 'withdraw' }) {
  const status = useHealthStatus()
  const { prepare, download, withdraw } = useHealthWithdrawal()
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState<null | ReturnType<typeof prepare>>(() => (start === 'withdraw' ? prepare() : null))
  const [saved, setSaved] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields > 0 || !!s.data._meta?.lastPull })
  const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`

  if (step) {
    const s = step.summary
    const parts = [s.weighIns ? n(s.weighIns, 'weigh-in', 'weigh-ins') : '', s.checkins ? n(s.checkins, 'check-in', 'check-ins') : '', s.profileFields ? n(s.profileFields, 'body detail', 'body details') : ''].filter(Boolean)
    return (
      <Sheet title="Health data" onClose={onClose} left={<BackButton onClick={() => setStep(null)} />}>
        <div className="prose sub" style={{ padding: '0 4px' }}>
          <p>{step.prompt}</p>
          {parts.length > 0 && <p style={{ margin: 0 }} className="num">On this phone: {parts.join(', ')}.</p>}
        </div>
        <div className="stack">
          <button className="btn gray" onClick={() => { download(); setSaved(true) }}>{saved ? 'Downloaded' : 'Download a copy'}</button>
          <button className="btn danger" onClick={() => { withdraw(); showToast('Health data removed'); onClose() }}>Remove my health data</button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Health data" onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="sub" style={{ padding: '0 4px 12px', lineHeight: 1.45 }}>
        {status === 'on' ? 'Tali keeps your log, including your weight, check-ins and body details, to run the app and build your plan and targets.'
          : status === 'paused' ? 'Your log is on this phone only until you agree: nothing syncs to your account or is backed up there. ' + unconsentedCopyLine()
          : status === 'off' ? 'You’ve said no, so your log is on your phones only: nothing syncs to your account. To build your plan, Tali uses things like your weight, sleep, stress and health, and needs your OK to keep them.'
          : 'To build your plan, Tali asks about things like your weight, sleep, stress and health. That’s health data, so we need your OK to keep it.'}
      </div>
      <Ticks items={HEALTH_TICKS} />
      <button className="linkbtn" style={{ marginTop: 8 }} onClick={() => setPrivacy(true)}>Read the privacy notice</button>
      <div className="stack">
        {status !== 'on' && <button className="btn" onClick={onAgree}>Yes, keep it</button>}
        {/* withdraw (download first) whenever there's health data to remove: on, or paused / not
            asked with data on this phone or (after a sync) in the account */}
        {(status === 'on' || (status !== 'off' && canRemove)) && <button className="btn danger" onClick={() => setStep(prepare())}>Stop keeping my health data</button>}
      </div>
      {privacy && <PrivacySheet onClose={() => setPrivacy(false)} />}
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
        Some features, like reading a food label from a photo or describing a meal in words, send what you share to Anthropic, the company that makes the AI Tali uses.
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

const GOES = ['Your food log, meals and recipes', 'Workouts and sets', 'Weight, check-ins and notes', 'Plans and settings', 'Your login']

export function DeleteAccountView({ onBack, confirmOpen, setConfirmOpen }: { onBack: () => void; confirmOpen: boolean; setConfirmOpen: (x: boolean) => void }) {
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const { reason, deleting } = useAccountDeletion()
  return (
    <div className="screen del">
      <BackButton onClick={onBack} label="Profile" />
      <h1 className="del-t">Delete your account</h1>
      <div className="del-lead">This deletes everything, from our servers and from this phone. It can't be undone.</div>
      <h2 className="del-h">What gets deleted</h2>
      <div className="list">{GOES.map((x) => <div className="li" key={x}><div className="m"><div className="t">{x}</div></div></div>)}</div>
      <div className="list">
        <button className="li" onClick={() => exportBackup(data)}>
          <div className="m"><div className="t">Download a copy first</div><div className="s">A file with everything you've logged</div></div>
          <Chevron />
        </button>
      </div>
      <button className="btn delbtn" disabled={!online || deleting} onClick={() => setConfirmOpen(true)}>Delete account</button>
      <div className="del-foot">{online && reason ? reason : 'Needs a connection, so it deletes everywhere at once.'}</div>
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
      if (r === 'wrong-password') { setMsg('That password doesn’t match this account. Nothing has been deleted.'); return }
      if (r === 'offline') { setMsg(DELETE_MESSAGES.offline); return }
      if (r !== 'ok') { setMsg(DELETE_MESSAGES.error); return }
    }
    const { result, message } = await run()
    if (result.status === 'reauth') setStale(true)
    if (message) setMsg(message)
  }

  return (
    <BareSheet label="Delete everything?" onClose={onClose} className="delconf">
      <h2 className="cs-t">Delete everything?</h2>
      <div className="cs-lead">Your account and all your data will be deleted from Tali and this phone. You can sign up again any time, but it starts fresh.</div>
      {stale && google && (
        <>
          <div className="cs-msg">{DELETE_MESSAGES.reauth}</div>
          <button className="btn gray" disabled={!online} onClick={async () => { const r = await reauth({ google: true }); if (r !== 'redirecting') setMsg(r === 'offline' ? DELETE_MESSAGES.offline : DELETE_MESSAGES.error) }}>Sign in with Google again</button>
        </>
      )}
      {needPw && (
        <label className="typed">
          <span>Your password, to confirm it’s you</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      )}
      <label className="typed">
        <span>Type DELETE to confirm</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} />
      </label>
      {msg && <div className="cs-msg" role="status">{msg}</div>}
      {!online && !msg && <div className="cs-msg" role="status">{DELETE_MESSAGES.offline}</div>}
      <button className="btn delall" disabled={!ready || (stale && google)} onClick={go}>{deleting ? 'Deleting…' : 'Delete everything'}</button>
      <button className="linkbtn ob-alt" onClick={onClose}>Cancel</button>
    </BareSheet>
  )
}
