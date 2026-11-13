import { useState } from 'react'
import { useConsent } from '@/store/hooks'
import { Sheet } from '@/ui/primitives'
import { LegalLink } from './LegalDoc'
import { REGRANT } from '@/copy/account'

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
    <Sheet title={REGRANT.title} onClose={onClose}>
      <div className="card prose">
        <p style={{ margin: 0 }}>{REGRANT.lead}</p>
      </div>
      <div className="list">
        <div className="li consent-row">
          <input id="c_regrant" type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
          <label htmlFor="c_regrant">{REGRANT.box.before}<LegalLink id="privacy">{REGRANT.box.link}</LegalLink>{REGRANT.box.after}</label>
        </div>
      </div>
      <button className="btn" disabled={!on} onClick={() => { grant(); onClose() }}>{REGRANT.cta}</button>
    </Sheet>
  )
}
