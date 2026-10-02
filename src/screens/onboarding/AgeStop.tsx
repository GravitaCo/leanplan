/**
 * The 18+ stop (Benn, Sept 2026) and the signpost list the onboarding notes share. Loaded with
 * the app, not with the wizard's chunk, so the stop shows offline even on a device that never
 * fetched the wizard: a launch with a stored under-18 age must never wait on the network.
 *
 * Two variants of one screen:
 * - the wizard's (board "Age 18+ · 2"): Close deletes the new account (store deleteUnderAge)
 * - the app's (board "Age 18+ · 1"): an under-18 age from Profile, a backup, sync or this phone's
 *   saved data. "Close and delete" opens the usual account deletion (AccountData's confirm step,
 *   with its re-sign-in); "I typed my age wrong" goes back to Profile.
 */
import { useEffect, useState } from 'react'
import { useStore, type UnderAgeSource } from '@/store/store'
import { NATIONS, SIGNPOSTS, beatFor } from '@/core/data/signposts'
import { DeleteConfirmSheet } from '../profile/AccountData'
import { NOTES } from './copy'
import { Signposts, type SP } from './Signposts'

export { Signposts, type SP }

/** Beat: every nation's number, labelled (Benn: no nation question), and the webchat. */
const beat = (desc: string): SP => ({
  name: 'Beat', desc: `${desc} ${SIGNPOSTS.beat.hours}. Webchat too.`, web: SIGNPOSTS.beat.web,
  lines: NATIONS.map(([k, l]) => [l, beatFor(k)]),
})
const emergency: SP = { name: 'Emergency', desc: 'If you or someone else is in danger now', num: SIGNPOSTS.emergency.phone, tel: SIGNPOSTS.emergency.phone }

export const SPS: Record<'wellbeing' | 'readiness' | 'pregnancy' | 'medical' | 'under16', SP[]> = {
  wellbeing: [
    beat('For anyone worried about food, eating or their body.'),
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time. In Northern Ireland, call your GP.', num: '111', tel: SIGNPOSTS.nhs111.phone },
    { name: 'Samaritans', desc: 'Talk about anything, any time, free', num: '116 123', tel: SIGNPOSTS.samaritans.phone },
    emergency,
  ],
  readiness: [
    { name: 'Your GP', desc: 'Before you build up, or if anything changes', num: 'Book' },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time. In Northern Ireland, call your GP.', num: '111', tel: SIGNPOSTS.nhs111.phone },
    emergency,
  ],
  pregnancy: [
    { name: 'Your midwife or GP', desc: 'For anything about you or your baby', num: 'Contact' },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time. In Northern Ireland, call your GP.', num: '111', tel: SIGNPOSTS.nhs111.phone },
    emergency,
  ],
  medical: [
    { name: 'Your GP or care team', desc: 'Before changing how much you eat', num: 'Contact' },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time. In Northern Ireland, call your GP.', num: '111', tel: SIGNPOSTS.nhs111.phone },
  ],
  // both 18+ stops (boards "Age 18+ · 1" and "· 2"): numbers from the checked list only
  under16: [
    { name: 'Childline', desc: 'Free and confidential for anyone under 19. Call or chat online, any time.', num: SIGNPOSTS.childline.phone, tel: SIGNPOSTS.childline.phone },
    beat('If food, eating or your body feel hard to think about.'),
    emergency,
  ],
}


/**
 * The kind stop (ob4-1). In the wizard, Close deletes the new account and this device's data
 * (Benn, §14). With `source` it's the app's variant (board "Age 18+ · 1"): Close and delete opens
 * the account deletion, whose Cancel comes back here.
 */
export function Under16({ onWrong, onClose, deleting, source }: { onWrong?: () => void; onClose: () => void; deleting?: boolean; source?: UnderAgeSource }) {
  const busy = useStore((s) => s.deletingAccount)
  const app = source !== undefined
  const c = app ? NOTES.underAge : NOTES.under16
  const note = app ? (source === 'profile' ? `${NOTES.underAge.note} ${NOTES.underAge.notSaved}` : NOTES.underAge.note) : NOTES.under16.note
  return (
    <div className="wz" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 110px)' }} data-testid={app ? 'age-stop' : 'age-stop-wizard'}>
      <h1 className="wz-h xl" style={{ margin: 0 }}>{c.title}</h1>
      <div className="wz-lead body ink">{c.lead}</div>
      <div className="wz-lead body">{c.more}</div>
      <Signposts list={SPS.under16} />
      <div className="wz-note">{note}</div>
      <div className="ob-cta">
        {!deleting && <button className="btn ob-btn" onClick={onClose} disabled={busy}>{app ? NOTES.underAge.close : 'Close'}</button>}
        {!deleting && onWrong && <button className="linkbtn ob-alt" onClick={onWrong}>{NOTES.underAge.wrong}</button>}
      </div>
    </div>
  )
}

/**
 * The app-level stop while the store's `underAge` is set: nothing else of the app shows, nothing
 * syncs, reminders are held. Redo setup (an existing account) shows it in place of the wizard's own. Close and delete opens the existing deletion confirm (typed DELETE, a fresh sign-in when
 * the session's is old; the server keeps its own re-auth rule). Its Cancel returns here.
 */
export function UnderAgeStop({ source, onWrong }: { source: UnderAgeSource; onWrong?: () => void }) {
  const underAgeMistake = useStore((s) => s.underAgeMistake)
  // the redo wizard's stop also goes back to its age question
  const mistake = () => { underAgeMistake(); onWrong?.() }
  const profileOpen = useStore((s) => s.profileOpen)
  const clearProfileOpen = useStore((s) => s.clearProfileOpen)
  // back from a Google re-sign-in for the deletion (App asks for 'delete-confirm'): reopen the confirm
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (profileOpen === 'delete-confirm') { clearProfileOpen(); setConfirm(true) }
  }, [profileOpen, clearProfileOpen])
  return (
    <>
      <Under16 source={source} onClose={() => setConfirm(true)} onWrong={mistake} />
      {confirm && <DeleteConfirmSheet onClose={() => setConfirm(false)} />}
    </>
  )
}
