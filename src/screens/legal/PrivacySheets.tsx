import { useState } from 'react'
import { useConsent } from '@/store/hooks'
import { Sheet } from '@/ui/primitives'
import { LegalLink } from './LegalDoc'

/*
 * Withdrawing health consent and deleting the account are Profile's Health data sheet (download
 * first) and Delete account view (screens/profile/AccountData.tsx), reached from their own rows
 * and from Privacy's buttons.
 */

/**
 * Giving health consent again after a withdrawal: the same explicit statement and unticked box as
 * the consent screen, never a bare tap (Art. 7: consent must be specific and informed).
 */
export function RegrantHealthSheet({ onClose }: { onClose: () => void }) {
  const { grant } = useConsent('health')
  const [on, setOn] = useState(false)
  return (
    <Sheet title="Health data" onClose={onClose}>
      <div className="card prose">
        <p style={{ margin: 0 }}>Turning this back on lets Tali save your weigh-ins, check-ins and body details again, and uploads your whole log from this phone to your account.</p>
      </div>
      <div className="list">
        <div className="li consent-row">
          <input id="c_regrant" type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
          <label htmlFor="c_regrant">I agree to Tali storing and using my health information to run the app for me, as the <LegalLink id="privacy">privacy policy</LegalLink> explains. I can withdraw this at any time.</label>
        </div>
      </div>
      <button className="btn" disabled={!on} onClick={() => { grant(); onClose() }}>Turn health data back on</button>
    </Sheet>
  )
}
