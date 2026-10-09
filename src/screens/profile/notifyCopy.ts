/**
 * Profile › Notifications, the Mind reminder types (wellbeing board B11, canvas wp-b11-light,
 * wp-b11-dark and wp-b11-more; approved for now by Benn, 8 Oct 2026). Verbatim from the copy deck
 * v2, ids cited. The lock-screen names setting (B11b) isn't approved yet: not here. React-free so
 * the tests can lint every string (mindCopyIssues). What the reminders themselves say (B11.17 to
 * B11.19) lives with the server rules: supabase/functions/_shared/reminders.ts REMINDER_COPY.
 */
import type { NotifyKind } from '@/core/types'

export const NOTIFY_COPY = {
  /** B11.2 to B11.7 (the toggles' accessible names as drawn on the board) */
  rows: {
    checkin: { label: 'Check-in', sub: "A morning reminder, after you're usually up", aria: 'Check-in reminders' },
    'wind-down': { label: 'Wind-down', sub: 'At the start of your wind-down', aria: 'Wind-down reminders' },
    plan: { label: 'Plan check-in', sub: 'When a plan is due for its weekly look', aria: 'Plan check-in reminders' },
  } satisfies Record<NotifyKind, { label: string; sub: string; aria: string }>,
  /** B11.9 to B11.11 */
  timesHeading: 'Your times',
  wakeAt: 'Usually up around',
  windDownAt: 'Wind down from',
  /** B11.12 */
  foot: "Tali sends at most one of these a day, and nothing after your wind-down time or before you're usually up. Supplement reminders come at the times you set.",
  /** B11.15, B11.16 */
  backToUsual: 'Back to usual',
  dismiss: 'Dismiss',
} as const

/** What the back-off notice calls each type ("The last 2 check-in reminders …"). */
const BACKOFF_NAME: Record<NotifyKind, string> = { checkin: 'check-in', 'wind-down': 'wind-down', plan: 'plan check-in' }

/** B11.14 (with mental-performance's "Nothing you need to do."). The board draws check-in; the
 *  other two types use the same sentence with their own name. */
export const backoffLine = (kind: NotifyKind): string =>
  `The last 2 ${BACKOFF_NAME[kind]} reminders went unopened, so Tali now sends them half as often. Nothing you need to do.`

/** Every string above, for the copy lint. */
export function notifyStrings(): string[] {
  const c = NOTIFY_COPY
  return [
    ...Object.values(c.rows).flatMap((r) => [r.label, r.sub, r.aria]), c.timesHeading, c.wakeAt, c.windDownAt, c.foot,
    c.backToUsual, c.dismiss, ...(Object.keys(BACKOFF_NAME) as NotifyKind[]).map(backoffLine),
  ]
}
