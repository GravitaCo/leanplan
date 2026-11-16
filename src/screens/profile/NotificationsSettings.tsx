/**
 * Profile › Notifications, the Mind reminder types (wellbeing board B11; build plan WP17a).
 * Behind WELLBEING_ENABLED (ProfileScreen mounts these only with the flag on).
 *
 * - Check-in, Wind-down and Plan check-in: off by default, each turned on by the person, and only
 *   with a current health yes (store setMindReminder). The setting saves on this phone first and
 *   the push subscription follows when online (security-data L7).
 * - "Your times": the usual wake and wind-down times (health data: not editable while health
 *   logging is off). Unset times show the defaults the reminders use (_shared/reminders.ts).
 * - The back-off notice (B11.14 to B11.16) for each type the phone saw go unopened twice in a row.
 * - B11b: "Show supplement names in reminders", under Supplement reminders (SuppNamesRow).
 * Copy: notifyCopy.ts.
 */
import { useStore } from '@/store/store'
import type { NotifyKind } from '@/core/types'
import { NOTIFY_KINDS } from '@/core/domain/checkin'
import { healthLoggingAllowed } from '@/data/consent'
import { backoffDismissed } from '@/data/deviceOnly'
import { pushSupported } from '@/data/push'
import { SettingRow, Toggle } from '@/ui/primitives'
import { Icon, type IconName } from '@/ui/icons'
import { isHHMM, kindTimes, usualTimes } from '../../../supabase/functions/_shared/reminders'
import { NOTIFY_COPY as C, backoffLine } from './notifyCopy'

const ICON: Record<NotifyKind, IconName> = { checkin: 'bell', 'wind-down': 'moon', plan: 'list' }
const MINDF = 'var(--mind-fill)'

/** The three Mind reminder rows (B11.2 to B11.7), placed above Supplement reminders. */
export function MindReminderRows() {
  const data = useStore((s) => s.data)
  const setMindReminder = useStore((s) => s.setMindReminder)
  const showToast = useStore((s) => s.showToast)
  const mind = data.profile.mind
  const at = kindTimes(mind)
  const ready = pushSupported()
  const toggle = async (kind: NotifyKind) => {
    const on = mind?.notify?.[kind] !== true
    const r = await setMindReminder(kind, on)
    // the app's existing reminder messages (ProfileScreen's supplement row)
    showToast(r === true ? (on ? 'Reminders on' : 'Reminders off')
      : r === 'consent' ? 'Reminders start once you’ve agreed in Profile, then Privacy.'
      : r === 'denied' ? 'Permission denied'
      : r === 'unsaved' ? (on ? 'Reminders on' : 'Reminders off') + ', but this device couldn’t save the setting. Storage may be full.'
      : 'Not supported in this browser')
  }
  return (
    <>
      {NOTIFY_KINDS.map((k) => {
        const on = mind?.notify?.[k] === true
        return (
          <SettingRow key={k} icon={ICON[k]} color={MINDF} soft label={C.rows[k].label} sub={C.rows[k].sub}
            value={on && k !== 'plan' ? at[k] : undefined}
            right={<Toggle label={C.rows[k].aria} on={on} disabled={!ready} onChange={() => void toggle(k)} />} />
        )
      })}
    </>
  )
}

/**
 * B11b (approved by Benn, 10 Oct 2026): "Show supplement names in reminders", a sub-row under
 * Supplement reminders (shown while they're on), off by default. Saved as `profile.mind.lockNames`
 * (a preference, kept on withdrawal); the reminder service names the supplement only when it is
 * true, and otherwise sends "Time for your supplements" with no name anywhere in the payload
 * (supabase/functions/_shared/reminders.ts suppPayload).
 */
export function SuppNamesRow() {
  const on = useStore((s) => s.data.profile.mind?.lockNames === true)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  return (
    <div className="li nf-sub">
      <span className="m"><span className="t">{C.names}</span></span>
      <Toggle label={C.names} on={on} onChange={() => setMindPrefs({ lockNames: !on })} />
    </div>
  )
}

/** B11b's foot, under the Notifications list. */
export const SuppNamesFoot = () => <div className="foot nf-names-foot">{C.namesFoot}</div>

/** "Your times" (B11.9 to B11.11) and the foot (B11.12). */
export function YourTimes() {
  const data = useStore((s) => s.data)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const t = usualTimes(data.profile.mind)
  const allowed = healthLoggingAllowed(data)
  const save = (k: 'wakeAt' | 'windDownAt', v: string) => {
    if (v === '') setMindPrefs({ [k]: null })
    else if (isHHMM(v)) setMindPrefs({ [k]: v })
  }
  return (
    <>
      <div className="lbl">{C.timesHeading}</div>
      <div className="list nf-times">
        <div className="frow"><label htmlFor="nf-wake">{C.wakeAt}</label>
          <input id="nf-wake" type="time" className="num" value={t.wakeAt} disabled={!allowed} onChange={(e) => save('wakeAt', e.target.value)} /></div>
        <div className="frow"><label htmlFor="nf-wind">{C.windDownAt}</label>
          <input id="nf-wind" type="time" className="num" value={t.windDownAt} disabled={!allowed} onChange={(e) => save('windDownAt', e.target.value)} /></div>
      </div>
      <div className="foot">{C.foot}</div>
    </>
  )
}

/** The back-off notice (B11.14 to B11.16), one per type sent less often, until closed. */
export function BackoffNotices() {
  const data = useStore((s) => s.data)
  const backToUsual = useStore((s) => s.backToUsual)
  const dismissBackoff = useStore((s) => s.dismissBackoff)
  const halved = data.profile.mind?.halved
  const kinds = NOTIFY_KINDS.filter((k) => halved?.[k] && data.profile.mind?.notify?.[k] === true && !backoffDismissed(data, k, halved[k]))
  if (!kinds.length) return null
  return (
    <>
      {kinds.map((k) => (
        <div key={k} className="banner nf-back" role="note">
          <span style={{ color: 'var(--mind-ink)', display: 'flex' }}><Icon name="info" /></span>
          <div className="m">
            <div>{backoffLine(k)}</div>
            <button type="button" className="btn gray sm" onClick={() => backToUsual(k)}>{C.backToUsual}</button>
          </div>
          <button type="button" className="nf-x" aria-label={C.dismiss} onClick={() => dismissBackoff(k)}><span><Icon name="x" size={12} stroke={3} /></span></button>
        </div>
      ))}
    </>
  )
}
