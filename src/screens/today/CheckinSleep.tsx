import type { CSSProperties } from 'react'
import type { SleepBand } from '@/core/types'
import { SLEEP_BANDS } from '@/core/domain/checkin'
import { bandLabel } from '@/core/domain/sleep'
import { Chevron } from '@/ui/icons'
import { CHECKIN_SLEEP } from './checkinNight'

/**
 * WP10: the check-in's "More about sleep" (wellbeing board B10, approved for now by Benn, 8 Oct
 * 2026) and the flag-on feet. Sleep tier 1 (plan §4.2): a rough band and a wake time, both
 * optional. Rendered by CheckinSheet only while WELLBEING_ENABLED is on; with the flag off the
 * sheet is exactly as before. Kept beside CheckinSheet (not in mind/copy.ts) so this package
 * touches no file another package edits.
 */

export { CHECKIN_SLEEP, checkinSleepCopy, wakePrefill, nightShown, nightPatch } from './checkinNight'

/** B10: a selected band is the neutral range grey with a 2 px ring, never a pillar colour or the tint. */
const BAND_ON: CSSProperties = { background: 'var(--band)', color: 'var(--label)', fontWeight: 600, boxShadow: 'inset 0 0 0 2px var(--label)' }
const DISCL: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44, padding: '0 4px', marginTop: 4,
  background: 'none', border: 0, fontSize: 15, color: 'var(--tint)', textAlign: 'left',
}

/**
 * "More about sleep" under the Sleep scale: a quiet row with a chevron that turns when open
 * (`aria-expanded`), then the bands (no 7+ zone marked), "Woke up around" and B10.9.
 */
export function SleepMore({ open, onToggle, band, onBand, wakeAt, onWake }: {
  open: boolean; onToggle: () => void
  band: SleepBand | ''; onBand: (b: SleepBand | '') => void
  wakeAt: string; onWake: (v: string) => void
}) {
  return (
    <>
      <button type="button" className="ck-more" style={DISCL} aria-expanded={open} aria-controls="ck-sleep-more" onClick={onToggle}>
        {CHECKIN_SLEEP.more}
        <span style={{ marginLeft: 'auto', display: 'flex', color: 'var(--label3)' }}><Chevron rotate={open ? 90 : 0} /></span>
      </button>
      {open && (
        <div id="ck-sleep-more">
          <div className="lbl" style={{ paddingTop: 0 }} id="ck-band-l">{CHECKIN_SLEEP.howLong}</div>
          <div className="scale ck-bands" role="group" aria-labelledby="ck-band-l">
            {SLEEP_BANDS.map((b) => (
              <button type="button" key={b} aria-pressed={band === b} style={band === b ? BAND_ON : undefined} onClick={() => onBand(band === b ? '' : b)}>
                <b className="num" style={{ fontSize: 14 }}>{bandLabel(b)}</b>{CHECKIN_SLEEP.hours}
              </button>
            ))}
          </div>
          <div className="list" style={{ marginTop: 10 }}>
            <label className="frow">
              <span style={{ flex: 1, minWidth: 0, fontSize: 17, whiteSpace: 'nowrap' }}>{CHECKIN_SLEEP.woke}</span>
              <input type="time" className="num ck-wake" style={{ flex: 'none', width: 'auto', minWidth: 0 }} value={wakeAt} onChange={(e) => onWake(e.target.value)} />
            </label>
          </div>
          <div className="foot">{CHECKIN_SLEEP.foot}</div>
        </div>
      )}
    </>
  )
}

/** B10.12 under the note (with the Support link) and B10.13, the sheet's foot. */
export function CheckinFeet({ onSupport }: { onSupport: () => void }) {
  const f = CHECKIN_SLEEP.noteFoot
  return (
    <>
      <div className="foot">{f.before}<button type="button" className="linkbtn inl" onClick={onSupport}>{f.link}</button>{f.after}</div>
      <div className="foot">{CHECKIN_SLEEP.sheetFoot}</div>
    </>
  )
}
