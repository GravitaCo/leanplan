import type { CSSProperties } from 'react'
import type { CheckIn, DayLog, SleepBand, SleepNight } from '@/core/types'
import { isHHMM, SLEEP_BANDS } from '@/core/domain/checkin'
import { shiftDay } from '@/core/domain/date'
import { bandLabel } from '@/core/domain/sleep'
import { Chevron } from '@/ui/icons'

/**
 * WP10: the check-in's "More about sleep" (wellbeing board B10, approved for now by Benn, 8 Oct
 * 2026) and the flag-on feet. Sleep tier 1 (plan §4.2): a rough band and a wake time, both
 * optional. Rendered by CheckinSheet only while WELLBEING_ENABLED is on; with the flag off the
 * sheet is exactly as before. Kept beside CheckinSheet (not in mind/copy.ts) so this package
 * touches no file another package edits.
 */

/** Deck B10 copy, verbatim. */
export const CHECKIN_SLEEP = {
  /** B10.4, the disclosure under "Sleep last night" */
  more: 'More about sleep',
  /** B10.5 */
  howLong: 'Roughly how long?',
  /** B10.7, under each band (B10.6 are sleep.ts's band labels) */
  hours: 'hours',
  /** B10.8 */
  woke: 'Woke up around',
  /** B10.9, the foot under the disclosure */
  foot: 'A rough idea is plenty. Leave it blank if you like.',
  /** B10.12, under the note; "support is here" opens the Support sheet (B6) */
  noteFoot: { before: "Tali doesn't read your notes. If you're struggling, ", link: 'support is here', after: '.' },
  /** B10.13, the sheet's foot (flag on; flag off keeps the old line) */
  sheetFoot: "Answer what you like, and leave the rest. There's no right answer. Sleep and stress often show up in hunger and energy, so these help you spot patterns. On a tough day, Tali asks for less and offers lighter options.",
}

/** Every B10 string above plus the band labels, for the copy lint. */
export function checkinSleepCopy(): string[] {
  const { noteFoot, ...rest } = CHECKIN_SLEEP
  return [...Object.values(rest), noteFoot.before + noteFoot.link + noteFoot.after, ...SLEEP_BANDS.map(bandLabel)]
}

/**
 * The wake time to show once the disclosure opens (B10.8, "pre-filled from yesterday only once the
 * disclosure is opened"): the day before `day`'s wake time, if it has one. Never a guess.
 */
export function wakePrefill(days: Record<string, DayLog | undefined>, day: string): string {
  const w = days[shiftDay(day, -1)]?.checkin?.night?.wakeAt
  return isHHMM(w) ? w : ''
}

/** What the sheet shows for last night: today's own (self-reported) band and wake time. */
export function nightShown(c: CheckIn | null | undefined): { band: SleepBand | ''; wakeAt: string } {
  const n = c?.night
  if (!n || n.source !== 'self') return { band: '', wakeAt: '' }
  return { band: n.band && SLEEP_BANDS.includes(n.band) ? n.band : '', wakeAt: isHHMM(n.wakeAt) ? n.wakeAt : '' }
}

/**
 * The `night` part of the check-in patch. Only when the person answered something here this time
 * (picked or cleared a band, or set or cleared the time): a pre-filled wake time they never
 * touched isn't saved, so opening the sheet never records a night by itself. A night from a
 * device (a later tier) is never overwritten from here. Both cleared removes the night.
 */
export function nightPatch(existing: CheckIn | null | undefined, s: { band: SleepBand | ''; wakeAt: string; touched: boolean }, t: string): Partial<CheckIn> {
  if (!s.touched) return {}
  if (existing?.night && existing.night.source !== 'self') return {}
  const wakeAt = isHHMM(s.wakeAt) ? s.wakeAt : ''
  if (!s.band && !wakeAt) return { night: undefined }
  const night: SleepNight = { source: 'self', ...(s.band ? { band: s.band } : {}), ...(wakeAt ? { wakeAt } : {}), t }
  return { night }
}

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
