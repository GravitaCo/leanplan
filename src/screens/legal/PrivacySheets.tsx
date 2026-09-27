import { useState } from 'react'
import { useAccountDeletion, useHealthWithdrawal } from '@/store/hooks'
import { Sheet } from '@/ui/primitives'

/**
 * Withdrawing health consent (UK GDPR Art. 7(3): as easy as giving it). Offers the backup taken
 * before anything is cleared, then clears the health fields on every device (src/data/consent.ts).
 * Tali keeps working without them; the consent screen isn't shown again.
 */
export function WithdrawHealthSheet({ onClose }: { onClose: () => void }) {
  const { prepare, download, withdraw } = useHealthWithdrawal()
  const [{ summary, prompt }] = useState(prepare)
  const parts = [
    summary.weighIns ? `${summary.weighIns} weigh-in${summary.weighIns === 1 ? '' : 's'}` : '',
    summary.checkins ? `${summary.checkins} check-in${summary.checkins === 1 ? '' : 's'}` : '',
    summary.profileFields ? 'your body details' : '',
  ].filter(Boolean)
  return (
    <Sheet title="Withdraw consent" onClose={onClose}>
      <div className="card prose">
        <p>{prompt}</p>
        <p style={{ margin: 0 }}>{parts.length ? 'This clears ' + parts.join(', ') + '.' : 'There’s nothing to clear yet.'} You can keep using Tali, and give consent again later.</p>
      </div>
      <button className="btn gray" onClick={download}>Download a copy first</button>
      <button className="btn destructive" style={{ marginTop: 10 }} onClick={() => { withdraw(); onClose() }}>Withdraw and clear</button>
    </Sheet>
  )
}

/**
 * Right to erasure (UK GDPR Art. 17). Deletes the account and every row it owns through the
 * delete-account function, then wipes this device and signs out. A sign-in older than a few
 * minutes is confirmed first (password, or Google again).
 */
export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  const { canDelete, reason, deleting, provider, needsReauth, reauth, run } = useAccountDeletion()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setMsg(null)
    if (needsReauth()) { setConfirming(true); return }
    const { message } = await run()
    if (message) setMsg(message)
  }
  const confirm = async () => {
    setMsg(null)
    setBusy(true)
    const r = await reauth(provider === 'google' ? { google: true } : { password })
    setBusy(false)
    if (r === 'redirecting') return
    if (r !== 'ok') { setMsg(r === 'wrong-password' ? 'That password isn’t right.' : r === 'offline' ? 'You’re offline. Nothing has been deleted.' : 'Couldn’t confirm it’s you. Nothing has been deleted.'); return }
    setConfirming(false)
    const { message } = await run()
    if (message) setMsg(message)
  }

  return (
    <Sheet title="Delete account" onClose={onClose}>
      <div className="card prose">
        <p>This permanently deletes your Tali account and everything in it: your profile, food and body logs, workouts and plans, check-ins, recipes, custom foods, reminders and consent records. It also removes your data from this phone.</p>
        <p style={{ margin: 0 }}>It can’t be undone. Export a copy first in Back up and restore if you want one.</p>
      </div>
      {msg && <div className="banner" role="alert">{msg}</div>}
      {!canDelete && reason && <div className="banner" role="status">{reason}</div>}
      {confirming ? (
        <>
          <div className="sub" style={{ padding: '0 4px 8px' }}>To delete your account, confirm it’s you.</div>
          {provider === 'google' ? (
            <button className="btn gray" disabled={busy} onClick={confirm}>{busy ? 'Opening Google…' : 'Sign in with Google again'}</button>
          ) : (
            <>
              <div className="field"><label htmlFor="del_pw">Password</label>
                <input id="del_pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <button className="btn destructive" disabled={busy || !password} onClick={confirm}>{busy ? 'Checking…' : 'Confirm and delete'}</button>
            </>
          )}
        </>
      ) : (
        <button className="btn destructive" disabled={!canDelete || deleting} onClick={go}>{deleting ? 'Deleting…' : 'Delete account and data'}</button>
      )}
    </Sheet>
  )
}
