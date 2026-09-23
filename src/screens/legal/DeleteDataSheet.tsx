import { useState } from 'react'
import { useStore } from '@/store/store'
import { exportBackup } from '@/data/backup'
import { Sheet } from '@/ui/primitives'

/**
 * Right to erasure (GDPR Art. 17). With an account: deletes the account and its cloud data,
 * then this device. The device is only wiped once the server confirms, so a failure never
 * leaves someone with half their data. Without an account: wipes this device.
 */
export function DeleteDataSheet({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s.data)
  const authed = useStore((s) => s.authed)
  const syncPaused = useStore((s) => s.syncPaused)
  const deleteAccount = useStore((s) => s.deleteAccount)
  const deleteDeviceData = useStore((s) => s.deleteDeviceData)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const account = authed || syncPaused

  const run = async () => {
    setErr('')
    if (!account) { deleteDeviceData(); return }
    setBusy(true)
    const e = await deleteAccount()
    setBusy(false)
    if (e) setErr(e)
  }

  return (
    <Sheet title={account ? 'Delete account' : 'Delete my data'} onClose={onClose}>
      <div className="card prose">
        {account ? (
          <>
            <p>This permanently deletes your Tali account and everything in it: your profile, food and body logs, workouts, check-ins, recipes, custom foods and reminders. It also removes your data from this device.</p>
            <p style={{ margin: 0 }}>It can’t be undone. Deleting your account also withdraws your consent for Tali to use your health information.</p>
          </>
        ) : (
          <p style={{ margin: 0 }}>This permanently deletes everything Tali has stored on this device. You don’t have an account, so there’s nothing stored anywhere else. It can’t be undone.</p>
        )}
      </div>
      {err && <div className="banner" role="alert">{err}</div>}
      <button className="btn gray" onClick={() => exportBackup(data)}>Export a copy first</button>
      <button className="btn" style={{ marginTop: 10, background: 'var(--red)' }} disabled={busy} onClick={run}>
        {busy ? 'Deleting…' : account ? 'Delete account and data' : 'Delete data on this device'}
      </button>
    </Sheet>
  )
}
