import type { CheckIn, SleepBand, SleepSource } from '@/core/types'
import { SLEEP_BANDS, SLEEP_SOURCES } from './checkin'

/**
 * Last night, read for display and for the weekly patterns (wellbeing plan §4.2, §4.3). Tier 1 is
 * the person's own rough band ("More about sleep" in the check-in, deck B10); a wearable's
 * duration (tier 2, later) reads through the same `nightFor`. Pure: no clock, no storage.
 */

/** The band's label on the check-in scale (deck B10.6; each sits over the word "hours", B10.7). */
const BAND_LABEL: Record<SleepBand, string> = { lt5: 'Under 5', '5-6': '5–6', '6-7': '6–7', '7-8': '7–8', '8+': '8+' }
/**
 * The band in a sentence. "6 to 7 hours" is deck B4.10 ("Mostly 6 to 7 hours"); the other four follow
 * the same pattern and are not on a board yet (flag to design and mental-performance).
 */
const BAND_WORDS: Record<SleepBand, string> = { lt5: 'under 5 hours', '5-6': '5 to 6 hours', '6-7': '6 to 7 hours', '7-8': '7 to 8 hours', '8+': '8 hours or more' }

export const bandLabel = (b: SleepBand): string => BAND_LABEL[b]
export const bandWords = (b: SleepBand): string => BAND_WORDS[b]

/** The band a device duration falls in (lower bound inclusive: 7 h 0 min is '7-8'). */
export function bandOfMinutes(min: number): SleepBand {
  if (min < 5 * 60) return 'lt5'
  if (min < 6 * 60) return '5-6'
  if (min < 7 * 60) return '6-7'
  if (min < 8 * 60) return '7-8'
  return '8+'
}

/** The "over 7 hours" side of the sleep observation (deck B4.17): the 7–8 and 8+ bands. */
export const isLongBand = (b: SleepBand): boolean => b === '7-8' || b === '8+'

export interface NightView {
  /** where the band came from */
  source: SleepSource
  /** the self-reported band, or the device duration's band */
  band: SleepBand
  /** device only, whole minutes (shown rounded, never staged) */
  asleepMin?: number
  wakeAt?: string
  /** the person's own rating, Poor / OK / Good (1 to 3), always kept beside a device record */
  rating?: number
}

/**
 * Last night as one view: the device duration if there is one, else the self-reported band.
 * The person's own Sleep answer stays alongside as `rating` either way (plan §4.3: a wearable
 * never replaces how someone says they slept). Null when there's no band and no duration.
 */
export function nightFor(c: CheckIn | null | undefined): NightView | null {
  const n = c?.night
  // a later version's source (kept by shape on load) isn't one this version knows how to show
  if (!n || !SLEEP_SOURCES.includes(n.source)) return null
  const rating = c?.sleep || undefined
  if (typeof n.asleepMin === 'number' && n.asleepMin >= 0) {
    return { source: n.source, band: bandOfMinutes(n.asleepMin), asleepMin: n.asleepMin, ...(n.wakeAt ? { wakeAt: n.wakeAt } : {}), ...(rating ? { rating } : {}) }
  }
  if (n.band && SLEEP_BANDS.includes(n.band)) {
    return { source: n.source, band: n.band, ...(n.wakeAt ? { wakeAt: n.wakeAt } : {}), ...(rating ? { rating } : {}) }
  }
  return null
}
