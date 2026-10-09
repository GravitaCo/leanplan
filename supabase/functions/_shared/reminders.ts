/**
 * Reminder rules (wellbeing Phase 1, board B11; security-data H2 to H4), shared by the generalised
 * `send-supplement-reminders` Edge Function (Deno: index.next.ts), the app (Profile › Notifications)
 * and the tests. Pure TS with no imports, so both runtimes load it as is.
 *
 * - The three Mind reminder types (check-in, wind-down, plan check-in) are opt-in, one by one, and
 *   only ever sent with a current health yes (the function checks health_consent_current).
 * - At most one of them a day (the server claims the day in `notify_sent` before it sends), never
 *   after the person's wind-down time or before they're usually up. Supplement reminders are the
 *   person's own, at the times they set: outside the cap and the quiet hours.
 * - A type the person stopped opening (two in a row, counted on the phone: profile.mind.halved)
 *   is sent half as often: only when its last one was at least two days ago.
 * - Times are the person's own clock: `profile.mind.tz` (IANA, from the phone), else UK time.
 * - What a reminder says is fixed, neutral copy (B11.17 to B11.19): never a mood or sleep word,
 *   never anything from the log, never a supplement name. public/sw.js shows the same fixed copy
 *   whatever the payload says, and `npm test` checks the two agree.
 */

export const MIND_KINDS = ['checkin', 'wind-down', 'plan'] as const
export type MindKind = (typeof MIND_KINDS)[number]

/** used when the person hasn't set their times (Profile › Notifications › Your times) */
export const DEFAULT_WAKE = '07:00'
export const DEFAULT_WIND_DOWN = '22:30'
/** the check-in reminder comes this long after the usual wake time ("after you're usually up") */
export const CHECKIN_AFTER_WAKE_MIN = 90
/** a halved type goes only when its last one was at least this many days ago */
export const HALVED_GAP_DAYS = 2
export const DEFAULT_TZ = 'Europe/London'

export interface ReminderCopy { title: string; body: string; tag: string }

/** The only words a reminder carries. One tag per type, so a new one replaces an unread one. */
export const REMINDER_COPY: Record<MindKind | 'supp', ReminderCopy> = {
  checkin: { title: 'Tali', body: 'How are you today? A quick check-in, if you have a moment.', tag: 'tali-checkin' },
  'wind-down': { title: 'Tali', body: "Your wind-down starts now, if you'd like it.", tag: 'tali-wind-down' },
  plan: { title: 'Tali', body: 'How are your plans going?', tag: 'tali-plan' },
  // main's lock-screen fix (2026-10-09): no supplement name, ever, until a names setting is approved
  supp: { title: 'Time for your supplements', body: 'Time for your supplements', tag: 'tali-supp' },
}

export interface MindPrefsLike {
  wakeAt?: unknown
  windDownAt?: unknown
  notify?: unknown
  halved?: unknown
  tz?: unknown
}

export const isHHMM = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5)
const fromMin = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0') }
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})

/** The person's usual wake and wind-down times, or the defaults. */
export function usualTimes(mind: MindPrefsLike | null | undefined): { wakeAt: string; windDownAt: string } {
  return {
    wakeAt: isHHMM(mind?.wakeAt) ? mind!.wakeAt as string : DEFAULT_WAKE,
    windDownAt: isHHMM(mind?.windDownAt) ? mind!.windDownAt as string : DEFAULT_WIND_DOWN,
  }
}

/** When each Mind type is sent, "HH:MM" in the person's own time. The plan check-in shares the
 *  morning slot with the check-in (and goes first: it's due at most once a week). */
export function kindTimes(mind: MindPrefsLike | null | undefined): Record<MindKind, string> {
  const t = usualTimes(mind)
  const morning = fromMin(toMin(t.wakeAt) + CHECKIN_AFTER_WAKE_MIN)
  return { checkin: morning, 'wind-down': t.windDownAt, plan: morning }
}

/** Nothing after the wind-down time or before the usual wake time (the wind-down reminder itself
 *  comes at the start of the wind-down, so that minute isn't quiet). Works across midnight both
 *  ways (someone who winds down at 05:00 after a night shift and gets up at 13:00). */
export function inQuietHours(time: string, windDownAt: string, wakeAt: string): boolean {
  if (!isHHMM(time) || !isHHMM(windDownAt) || !isHHMM(wakeAt)) return false
  const t = toMin(time), w = toMin(windDownAt), u = toMin(wakeAt)
  if (w === u) return false
  return w < u ? t > w && t < u : t > w || t < u
}

/** The local day, time and weekday at `now` in `tz` (an unknown zone reads as UK time). */
export function localNow(tz: unknown, now: Date): { day: string; time: string; dow: number; tz: string } {
  const zone = typeof tz === 'string' && tz ? tz : DEFAULT_TZ
  try {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now).replace(/^24:/, '00:')
    return { day, time, dow: new Date(day + 'T12:00:00Z').getUTCDay(), tz: zone }
  } catch {
    return zone === DEFAULT_TZ ? { day: now.toISOString().slice(0, 10), time: now.toISOString().slice(11, 16), dow: now.getUTCDay(), tz: 'UTC' } : localNow(DEFAULT_TZ, now)
  }
}

const dayNum = (d: string) => Math.round(Date.parse(d.slice(0, 10) + 'T12:00:00Z') / 864e5)

/** Plans not reviewed (or made) within the last week: the app's plansDue (core/domain/insights.ts). */
export function planDue(plans: unknown, day: string): boolean {
  if (!Array.isArray(plans)) return false
  return plans.some((p) => {
    const x = obj(p)
    const from = [x.lastReview, x.created].find((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) as string | undefined
    return dayNum(day) - dayNum(from ?? day) >= 7
  })
}

/**
 * The plan check-in goes at most once in this many days while plans stay unreviewed (its row says
 * "When a plan is due for its weekly look"), so it never takes the daily slot every morning and
 * starves the check-in reminder (mental-performance close-out, change 3). Judgement call.
 */
export const PLAN_GAP_DAYS = 7

/** Days since this type was last sent (`byKind`, from notify_sent); Infinity if never. */
const sinceLast = (byKind: Record<string, unknown> | null | undefined, k: MindKind, day: string): number => {
  const last = obj(byKind)[k]
  return typeof last === 'string' ? dayNum(day) - dayNum(last) : Infinity
}

/** A halved type goes only when its last one (`byKind`, from notify_sent) is HALVED_GAP_DAYS old. */
export function halvedAllows(mind: MindPrefsLike | null | undefined, kind: MindKind, byKind: Record<string, unknown> | null | undefined, day: string): boolean {
  if (!obj(mind?.halved)[kind]) return true
  const last = obj(byKind)[kind]
  return typeof last !== 'string' || dayNum(day) - dayNum(last) >= HALVED_GAP_DAYS
}

export interface DueInput {
  /** settings.profile.mind */
  mind: MindPrefsLike | null | undefined
  /** settings.profile.plans */
  plans?: unknown
  /** the person's local day and time (localNow) */
  day: string
  time: string
  /** notify_sent for this person: the last day one was sent, and per type */
  lastOn?: string | null
  byKind?: Record<string, unknown> | null
}

/**
 * The Mind types due now, in the order they'd claim the day (the function claims the first, and
 * sends only if the claim succeeds). Empty once one went today (the cap), in quiet hours, for a
 * type that isn't on (`notify[kind] === true`), a halved one sent too recently, or a plan check-in
 * sent within PLAN_GAP_DAYS.
 */
export function dueKinds(x: DueInput): MindKind[] {
  if (x.lastOn && x.lastOn >= x.day) return []
  const on = obj(x.mind?.notify)
  const t = usualTimes(x.mind)
  const at = kindTimes(x.mind)
  const order: MindKind[] = ['plan', 'checkin', 'wind-down']
  return order.filter((k) =>
    on[k] === true && at[k] === x.time &&
    !inQuietHours(x.time, t.windDownAt, t.wakeAt) &&
    (k !== 'plan' || (planDue(x.plans, x.day) && sinceLast(x.byKind, 'plan', x.day) >= PLAN_GAP_DAYS)) &&
    halvedAllows(x.mind, k, x.byKind, x.day))
}

/** The push payload for a Mind type: fixed copy, its own tag, a tap opens ./?n=<kind>. */
export function payloadFor(kind: MindKind): ReminderCopy & { url: string; icon: string } {
  return { ...REMINDER_COPY[kind], url: './?n=' + kind, icon: '/icon-192.png' }
}

/** The supplement reminder's payload: generic text only, one tag, however many are due. */
export function suppPayload(): ReminderCopy & { icon: string } {
  return { ...REMINDER_COPY.supp, icon: '/icon-192.png' }
}

/** Supplements due at `time` (their own times, in the person's clock). */
export function suppsDue(supplements: unknown, time: string): number {
  return Array.isArray(supplements) ? supplements.filter((s) => obj(s).time === time).length : 0
}
