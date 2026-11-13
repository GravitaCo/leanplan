/**
 * The Mind page's pure helpers (no React, no DOM), shared by the web page (MindPage.tsx) and the
 * native one (apps/native/screens/mind), so both say the same thing for the same data.
 */
import { DAY_NAME, parseYmd } from '@/core/domain/date'
import { ENERGY, MOODS, SLEEP, STRESS } from '@/core/domain/insights'
import type { CheckIn } from '@/core/types'
import { MIND } from '@/copy/mind'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Thursday 8 October" (deck B5.3). */
export function mindEyebrow(ymd: string): string {
  const d = parseYmd(ymd)
  return `${DAY_NAME[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/**
 * Today's answers as label and value pairs, in the B5 order: Mood, Sleep, Stress, Energy. Only
 * answered ones show. Hunger and soreness stay on the Summary card and in the sheet: the approved
 * board draws the four pairs only, though the sample person answered hunger (deck B5 text says
 * "Hunger and soreness only if answered"; the board wins, flagged for design).
 */
export function checkinPairs(c: CheckIn | null | undefined): [string, string][] {
  if (!c) return []
  const rows: [string, number | undefined, readonly string[]][] = [
    [MIND.mood, c.mood, MOODS], [MIND.sleep, c.sleep, SLEEP], [MIND.stress, c.stress, STRESS],
    [MIND.energy, c.energy, ENERGY],
  ]
  return rows.filter(([, v, labels]) => !!v && !!labels[v - 1]).map(([k, v, labels]) => [k, labels[v! - 1]])
}
