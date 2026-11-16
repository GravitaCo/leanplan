/**
 * WP10: the check-in's "More about sleep" (wellbeing board B10): the words and the decisions, with
 * no React, so the web (CheckinSleep.tsx) and native check-in share them. Sleep tier 1 (plan §4.2):
 * a rough band and a wake time, both optional.
 */
import type { CheckIn, DayLog, SleepBand, SleepNight } from '@/core/types'
import { isHHMM, SLEEP_BANDS } from '@/core/domain/checkin'
import { shiftDay } from '@/core/domain/date'
import { bandLabel } from '@/core/domain/sleep'

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
  noteFoot: { before: "Tilo doesn't read your notes. If you're struggling, ", link: 'support is here', after: '.' },
  /** B10.13, the sheet's foot (flag on; flag off keeps the old line) */
  sheetFoot: "Answer what you like, and leave the rest. There's no right answer. Sleep and stress often show up in hunger and energy, so these help you spot patterns. On a tough day, Tilo asks for less and offers lighter options.",
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
