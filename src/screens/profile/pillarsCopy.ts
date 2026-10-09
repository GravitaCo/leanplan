/**
 * Profile › "What do you want Tali for?" and "How often Tali asks" (wellbeing board B1, canvas
 * wp-b1-light, wp-b1-dark and wp-b1-more; approved for now by Benn, 8 Oct 2026). Verbatim from the
 * copy deck v2, ids cited. Food off uses option C1 (the switch wins: B1.14). React-free so the
 * tests can lint every string (mindCopyIssues).
 */
import type { Pillar } from '@/core/types'

export const PILLARS_COPY = {
  /** B1.1 */
  heading: 'What do you want Tali for?',
  /** B1.2 to B1.7 */
  rows: {
    mind: { label: 'Mind', sub: 'Check-ins, skills and your week' },
    food: { label: 'Food', sub: 'Logging, ranges and usuals' },
    move: { label: 'Move', sub: 'Workouts and your plan' },
  } satisfies Record<Pillar, { label: string; sub: string }>,
  /** B1.8 */
  foot: "Keep at least one on. One that's off leaves Today and stops its prompts. Nothing is deleted, and you can switch it back any time.",
  /** B1.9: the sub of the last pillar still on, whose switch is disabled */
  lastOn: 'At least one stays on',
  /** B1.14 (option C1): replaces B1.8 while Food is off */
  foodOff: "Food is off. Today won't show calories, ranges or food prompts. Your food log is kept.",
  /** B1.16, split around its two links: "Gentle display" opens Profile › Display, "support is here" the Support sheet */
  hard: { lead: 'Finding food tracking hard? ', display: 'Gentle display', mid: ' hides the numbers, and ', support: 'support is here', end: '.' },
  /** B1.10 to B1.12 */
  asksHeading: 'How often Tali asks',
  asks: { usual: 'Usual', fewer: 'Fewer prompts' },
  /** B1.13 */
  asksFoot: "Usual: up to 3 suggestions or prompts a day. Fewer prompts: 1. On a harder day, Tali asks for less either way. Anything you open yourself doesn't count.",
} as const

/** Every string above, for the copy lint. */
export function pillarsStrings(): string[] {
  const c = PILLARS_COPY
  const h = c.hard
  return [
    c.heading, ...Object.values(c.rows).flatMap((r) => [r.label, r.sub]), c.foot, c.lastOn, c.foodOff,
    h.lead + h.display + h.mid + h.support + h.end, c.asksHeading, c.asks.usual, c.asks.fewer, c.asksFoot,
  ]
}
