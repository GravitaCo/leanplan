/**
 * The weekly review's words (boards ml-a1 to ml-d1, approved by Benn on 8 Oct 2026) that the web
 * kept inline in review/WeeklyReview.tsx, shared so the web and native reviews read the same text.
 * The loop's decisions and generated lines stay in core/domain/loopCopy.ts. Where a line has a bold
 * part, the parts are separate so each app can set the bold piece in its own markup.
 */

/** "28 Sept to 4 Oct", or "5 to 11 Oct" within a month. */
export function spanText(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })} to ${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} to ${d(b, { day: 'numeric', month: 'short' })}`
}

/** ml-a1 to ml-a4: the review screen */
export const REVIEW = {
  back: 'Back',
  soFar: 'This week so far',
  title: 'Your week',
  titleBack: 'Welcome back',
  lead: 'A two-minute look back',
  leadBack: 'Nothing to catch up on. Here’s where things are now.',
  did: 'What you did',
  /** `since` is the YYYY-MM-DD the welcome-back week starts */
  didSince: (since: string) => `What you did since ${new Date(since + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' })}`,
  pattern: 'Something in your data',
  why: 'Why this matters to you',
  next: 'For next week',
  seeOptions: 'See the options',
  done: 'Done',
  noted: 'Noted for next week.',
} as const

/** ml-a1 "Your plan" */
export const PLAN_CARD = {
  label: 'Your plan',
  line: (when: string, then: string) => `If ${when.replace(/^when\s+/i, '')}, then I’ll ${then.replace(/\.$/, '')}.`,
  ask: 'How did it go this week?',
  helped: 'It helped',
  notReally: 'Not really',
  change: 'Change it',
} as const

/** The loop's sheets (ml-a5, ml-b1 to ml-b4, ml-c3, ml-c4, ml-d1) */
export const LOOP = {
  cancel: 'Cancel',
  close: 'Close',
  changeOne: 'Change one thing',
  tryIt: 'Try this next week',
  options: 'Options',
  keep: 'Keep things as they are',
  nothingChanges: 'Nothing changes unless you choose it.',
  allTogether: (cap: string) => `${cap}, all together`,
  /** the side-by-side rows' labels */
  rows: { sleep: 'Sleep', stress: 'Stress', mood: 'Mood', hunger: 'Hunger', move: 'Move', food: 'Food', weight: 'Weight' },
  /** a mind row read over the last week while move and food span longer (ml-b2) */
  lastWeek: ' last week',
  /** Move: "**3 sessions** done, plus walks" or "**2 walks**" */
  sessions: (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`,
  sessionsDone: ' done',
  plusWalks: ', plus walks',
  walks: (n: number) => `${n} ${n === 1 ? 'walk' : 'walks'}`,
  /** Food: "Averaged **2,100 kcal**, with 5 days in your range" */
  averaged: 'Averaged ',
  kcal: (k: string) => `${k} kcal`,
  inRange: (n: number) => `, with ${n} ${n === 1 ? 'day' : 'days'} in your range`,
  /** ml-b1 to ml-b3 */
  weighedIn: (n: number) => `Weighed in ${n} times.`,
  onPace: 'No change needed. Four weeks in line with your pace, so we’ll keep things as they are.',
  hardFirst: 'After a week like this one, the sleep and stress options come first.',
  carryOn: 'Good, carry on',
  /** ml-c3 */
  driftTitle: 'Keeping it steady',
  driftLead: (side: string) => `Your weigh-ins have sat a little ${side} your steady range for 2 weeks. That’s common, and there are a few ways to steer it.`,
  driftWeight: 'Weight',
  driftWeighed: (n: number) => `Weighed in ${n} times over 2 weeks.`,
  lastTwoWeeks: 'The last 2 weeks',
  /** ml-b4 */
  learnedTitle: 'Your range, from your logs',
  learnedKey: 'What your logs say keeps you steady',
  learnedRange: (lo: string, hi: string) => `${lo} to ${hi} `,
  kcalADay: 'kcal a day',
  learnedNote: (lo: string, hi: string) => `Narrower than the starting estimate of ${lo} to ${hi}, which came from your answers. It’s what keeps you steady going by what you log, so it works as a target even if some things go unlogged.`,
  floored: 'Tilo keeps your target at a safe minimum, so it starts a little higher than this.',
  basedOn: (weeks: number) => `Based on the last ${weeks} weeks`,
  /** "**24 complete days** logged, averaging 2,050 kcal" */
  completeDays: (n: number) => `${n} complete days`,
  averaging: (k: string) => ` logged, averaging ${k} kcal`,
  weighIns: (n: number) => `${n} weigh-ins`,
  useRange: 'Use this range',
  keepRange: 'Keep my current range',
  goodToKnow: 'Good to know',
  /** ml-c4 */
  weightAskTitle: 'Include your weight in reviews?',
  weightAskLead: 'It’s up to you. If you turn it on, your review shows how often you weighed in and, after 4 weeks, how things are going in words. Never a chart or a week-to-week number. You can change this any time.',
  includeIt: 'Include it',
  leaveOut: 'Leave it out',
  /** ml-c4 and ml-d1: what a review puts side by side */
  chips: ['Sleep', 'Stress', 'Mood', 'Hunger', 'Movement', 'Food', 'Weight'],
  /** ml-d1 */
  dayTitle: 'Your weekly review',
  dayClose: 'Done',
  dayLead: 'A two-minute look back at your week, with everything side by side.',
  whichDay: 'Which day suits you?',
  waiting: (day: string) => `It’ll be waiting on Summary from ${day} morning. No pressure to open it that day.`,
  wantReminder: 'Want a reminder for your weekly review?',
  oneNote: (day: string) => `One note on ${day}, nothing else.`,
  reminderOn: 'Reminder on',
  turnOff: 'Turn it off',
  remindMe: 'Remind me',
  noThanks: 'No thanks',
  /** compliance, 8 Oct: what the note says and when, in the place it's switched on */
  reminderNote: (day: string, time: string) => `Once a week on ${day} at ${time} UK time. It only says “Your week is ready”, nothing from your log. Turn it off any time in Profile.`,
  toastOn: 'Weekly reminder on',
  toastDenied: 'Notifications are off for Tilo in your settings',
  toastFailed: 'Couldn’t turn the reminder on. Try again when you’re online',
} as const
