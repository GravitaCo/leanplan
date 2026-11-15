/**
 * Summary's wellbeing strings (board B2, copy deck B2 and B9; build plan WP7). Shown only with
 * WELLBEING_ENABLED. The one thing's chip and done wording live in core/data/skills.ts (THINGS).
 * Every string here is linted with mindCopyIssues by scripts/wellbeing/summary.ts.
 */
export const SUMMARY_MIND = {
  /** B2.2 */
  feeling: (mood: string) => `Feeling ${mood}`,
  /** B2.3 */
  checkedInAt: (time: string) => `Checked in at ${time}`,
  checkedIn: 'Checked in',
  /** B2.8 (a past day keeps the app's "How was this day?") */
  ask: 'How are you today?',
  askPast: 'How was this day?',
  /** B2.9 */
  askSub: 'Mood, sleep, stress and energy · 20 seconds',
  /** B2.10 */
  checkIn: 'Check in',
  /** B2.4, a hard day */
  lighter: 'A lighter day is still a good day.',
  /** B2.5 / B9.1 */
  thingLead: "One thing for today, if you'd like:",
  /** B9.4 */
  today: (thing: string) => `Today: ${thing}`,
  /** B9.5, B9.6, B9.8 */
  done: 'Done',
  change: 'Change',
  makePlan: 'Make it a plan',
} as const

/** B2.19: the first usual on a hard day (its sub-line comes from insights.sameAsYesterdayRow) */
export const SAME_AS_YESTERDAY = 'Same as yesterday'

/** B2.26: the Move card's sub-line when Train offers the lighter choices */
export const LIGHTER_CHOICES = 'lighter choices today'

/** R5 (nutrition-accuracy): the weight tile's sub-line on a hard day */
export const WEIGH_IN = {
  today: 'Today',
  recent: 'Last weigh-in',
  older: (date: string) => `Last weigh-in, ${date}`,
  /** B2.32, when there's no weigh-in to show */
  none: 'Whenever it suits you',
} as const

/** Every fixed string above, with sample values filled in, for the copy lint. */
export function summaryCopy(): string[] {
  return [
    SUMMARY_MIND.feeling('low'), SUMMARY_MIND.checkedInAt('08:10'), SUMMARY_MIND.checkedIn, SUMMARY_MIND.ask,
    SUMMARY_MIND.askPast, SUMMARY_MIND.askSub, SUMMARY_MIND.checkIn, SUMMARY_MIND.lighter, SUMMARY_MIND.thingLead,
    SUMMARY_MIND.today('Get outside at lunch'), SUMMARY_MIND.done, SUMMARY_MIND.change, SUMMARY_MIND.makePlan,
    SAME_AS_YESTERDAY, `5 exercises · ${LIGHTER_CHOICES}`,
    WEIGH_IN.today, WEIGH_IN.recent, WEIGH_IN.older('24 Sept'), WEIGH_IN.none,
  ]
}
