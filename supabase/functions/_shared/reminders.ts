/**
 * Reminder rules (wellbeing Phase 1, board B11; security-data H2 to H4), shared by the generalised
 * `send-supplement-reminders` Edge Function (Deno: index.next.ts), the app (Profile › Notifications)
 * and the tests. Pure TS with no imports, so both runtimes load it as is.
 *
 * - The three Mind reminder types (check-in, wind-down, plan check-in) are opt-in, one by one, and
 *   only ever sent with a current health yes (the function checks health_consent_current).
 * - At most one check-in or plan reminder a day (the server claims the day in `notify_sent` before
 *   it sends), never after the person's wind-down time or before they're usually up. The wind-down
 *   reminder is a cue the person set for themselves, so it sits outside that cap (Benn, 10 Oct 2026,
 *   wellbeing plan "Close-out decisions"): still at most once a day (its own claim, by_kind), still
 *   halved, never in quiet hours. Supplement reminders are the person's own, at the times they
 *   set: outside the cap and the quiet hours.
 * - A type the person stopped opening (two in a row, counted on the phone: profile.mind.halved)
 *   is sent half as often: only when its last one was at least two days ago.
 * - Times are the person's own clock: `profile.mind.tz` (IANA, from the phone), else UK time.
 * - What a reminder says is fixed, neutral copy (B11.17 to B11.19): never a mood or sleep word,
 *   never anything from the log. public/sw.js shows the same fixed copy whatever the payload says,
 *   and `npm test` checks the two agree.
 * - A supplement reminder carries no supplement name unless the person turned on "Show supplement
 *   names in reminders" (B11b: `profile.mind.lockNames === true`, nothing else counts). With it off
 *   or missing, the name is left out of the payload entirely, not just hidden (security-data).
 *   The wind-down and check-in reminders never carry a mood or sleep word either way.
 */

export const MIND_KINDS = ['checkin', 'wind-down', 'plan'] as const
export type MindKind = (typeof MIND_KINDS)[number]
/** The types that share the one-a-day cap (`notify_sent.last_on`). Wind-down is outside it. */
export const CAPPED_KINDS: readonly MindKind[] = ['checkin', 'plan']
export const isCapped = (k: MindKind): boolean => CAPPED_KINDS.includes(k)

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
  // main's lock-screen fix (2026-10-09): no supplement name unless the person turned names on (B11b)
  supp: { title: 'Time for your supplements', body: 'Time for your supplements', tag: 'tali-supp' },
}

/**
 * B11b, with "Show supplement names in reminders" on: the title, and the tag public/sw.js shows a
 * name for (it shows it under `tali-supp`, so it replaces an unread reminder like any other). Any
 * other supplement tag gets the generic text on the phone, whatever the payload says.
 */
export const SUPP_NAMED = { title: 'Supplement reminder', tag: 'tali-supp-named' } as const
/** a supplement name in a payload is cut to this many characters, and a payload names at most SUPP_MAX_NAMES */
export const SUPP_NAME_MAX = 60
export const SUPP_MAX_NAMES = 6

export interface MindPrefsLike {
  wakeAt?: unknown
  windDownAt?: unknown
  notify?: unknown
  halved?: unknown
  tz?: unknown
  /** B11b: "Show supplement names in reminders"; only `true` names a supplement */
  lockNames?: unknown
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
  /** notify_sent for this person: the last day a check-in or plan reminder was sent (the cap), and
   *  the last day per type (the wind-down reminder's once a day, the halving and the plan gap) */
  lastOn?: string | null
  byKind?: Record<string, unknown> | null
}

/**
 * The Mind types due now, in the order they'd be claimed. The check-in and plan check-in share the
 * daily cap: none of them once one went today (`lastOn`), and the function claims the first due and
 * sends only if the claim succeeds. The wind-down reminder is outside the cap: due unless one already
 * went today (`byKind['wind-down']`), claimed on its own. Never in quiet hours, never for a type
 * that isn't on (`notify[kind] === true`), a halved one sent too recently, or a plan check-in sent
 * within PLAN_GAP_DAYS.
 */
export function dueKinds(x: DueInput): MindKind[] {
  const capped = !!x.lastOn && x.lastOn >= x.day
  const on = obj(x.mind?.notify)
  const t = usualTimes(x.mind)
  const at = kindTimes(x.mind)
  const order: MindKind[] = ['plan', 'checkin', 'wind-down']
  return order.filter((k) =>
    on[k] === true && at[k] === x.time &&
    (isCapped(k) ? !capped : sinceLast(x.byKind, k, x.day) >= 1) &&
    !inQuietHours(x.time, t.windDownAt, t.wakeAt) &&
    (k !== 'plan' || (planDue(x.plans, x.day) && sinceLast(x.byKind, 'plan', x.day) >= PLAN_GAP_DAYS)) &&
    halvedAllows(x.mind, k, x.byKind, x.day))
}

/** The push payload for a Mind type: fixed copy, its own tag, a tap opens ./?n=<kind>. */
export function payloadFor(kind: MindKind): ReminderCopy & { url: string; icon: string } {
  return { ...REMINDER_COPY[kind], url: './?n=' + kind, icon: '/icon-192.png' }
}

/**
 * The supplement reminder's payload, one however many are due. Generic text and tag `tali-supp`
 * unless `mind.lockNames === true` (B11b), and then only: the title "Supplement reminder" and the
 * names of the supplements due at `time` as the body ("Vitamin D, Magnesium"), tag
 * `tali-supp-named`. With the setting off or missing the supplements aren't read at all, so no
 * name can reach the payload. A due supplement with no usable name falls back to the generic text.
 * The setting also needs its own answered stamp (`answeredAt['mind.lockNames']`, as stampFields
 * writes it): a profile re-uploaded by an app from before B11b drops the Mind stamps, so a
 * `lockNames` with no stamp is treated as off (security-data L1).
 */
export function suppPayload(mind?: MindPrefsLike | null, supplements?: unknown, time?: string, answeredAt?: unknown): ReminderCopy & { icon: string } {
  const generic = { ...REMINDER_COPY.supp, icon: '/icon-192.png' }
  if (mind?.lockNames !== true || typeof obj(answeredAt)['mind.lockNames'] !== 'string' || !isHHMM(time) || !Array.isArray(supplements)) return generic
  const names: string[] = []
  for (const s of supplements) {
    const x = obj(s)
    if (x.time !== time || typeof x.name !== 'string') continue
    const n = x.name.replace(/\s+/g, ' ').trim().slice(0, SUPP_NAME_MAX).trim()
    if (n && !names.includes(n)) names.push(n)
  }
  if (!names.length) return generic
  return { title: SUPP_NAMED.title, body: names.slice(0, SUPP_MAX_NAMES).join(', '), tag: SUPP_NAMED.tag, icon: '/icon-192.png' }
}

/** Supplements due at `time` (their own times, in the person's clock). */
export function suppsDue(supplements: unknown, time: string): number {
  return Array.isArray(supplements) ? supplements.filter((s) => obj(s).time === time).length : 0
}
