import { parseYmd } from './date'

/**
 * The asks budget (wellbeing plan §7.3, §10a; build plan WP3): how many things Tali asks of
 * someone on Summary in a day, and which ones. Every number here is a judgement call (plan §7.3,
 * mental-performance), unvalidated, like dayOptions.ts. Pure: the screen gathers what is due and
 * passes it in; this decides what shows today and what waits.
 *
 * Nothing that isn't shown may be marked seen or answered (nutrition-accuracy: markActivityShown
 * must not fire for a held suggestion; a food ask is deferred a day, never dropped). Opening
 * Support is never an ask: it isn't in ASK_IDS, so it can't be counted, logged or held.
 */

export type AskId =
  /** low-mood signpost (safety, sub-flag MIND_REVIEWED) */
  | 'signpost'
  /** "How are your plans going?" (time-sensitive) */
  | 'plan-review'
  /** the day's one thing, as chips in the Mind card */
  | 'thing'
  /** "Plan when you'll do it", the first if-then offer (ob5-4) */
  | 'if-then-offer'
  /** "Welcome back" after a day off logging */
  | 'welcome-back'
  /** the activity-level suggestion (plan P1.5) */
  | 'activity'
  /** "Your range on workout days has changed" */
  | 'burn-note'
  /** Onboarding 9's food ask sheet (FoodAskSheet) */
  | 'food-ask'
  /** the 12-week pregnancy "Does this still apply?" */
  | 'pregnancy-reask'
  /** the Food card's "Worth a quick check" list (optional precision) */
  | 'quick-check'
  /** the Mind card's "Check in" prompt before today's check-in */
  | 'checkin'
  /** the weekly reflection card on the Mind page */
  | 'reflection'
  /** main's weekly review card on Summary (it carries the plan check-in, so it waits like the plan review) */
  | 'review'
  /** "Keep the weekly reminder?" on Summary */
  | 'review-keep'

type Rank = 'safety' | 'time' | 'thing' | 'rest'

interface AskMeta {
  rank: Rank
  /** counts against the day's budget (false: part of a card, not a prompt) */
  budgeted: boolean
  /** an optional food prompt, held back on a hard day and offered again the next day */
  food?: boolean
  /**
   * the plan-review kind: held on any hard day and on a Low or Rough mood day (Benn, 9 Oct 2026),
   * never dropped; it is offered again the next ordinary day
   */
  plans?: boolean
  /** shown in the first two weeks (only the check-in prompt and the one thing, plus safety) */
  early?: boolean
  /** keeps its own approved schedule, so the first-weeks ramp doesn't move it (Onboarding 9, ob7-3) */
  ownSchedule?: boolean
}

const ASKS: Record<AskId, AskMeta> = {
  signpost: { rank: 'safety', budgeted: true, early: true },
  'plan-review': { rank: 'time', budgeted: true, plans: true },
  thing: { rank: 'thing', budgeted: true, early: true },
  'if-then-offer': { rank: 'rest', budgeted: true, plans: true },
  'welcome-back': { rank: 'rest', budgeted: true },
  activity: { rank: 'rest', budgeted: true },
  'burn-note': { rank: 'rest', budgeted: true },
  'food-ask': { rank: 'rest', budgeted: true, food: true, ownSchedule: true },
  'pregnancy-reask': { rank: 'rest', budgeted: true, food: true, ownSchedule: true },
  'quick-check': { rank: 'rest', budgeted: false, food: true, ownSchedule: true },
  checkin: { rank: 'rest', budgeted: false, early: true },
  reflection: { rank: 'rest', budgeted: false },
  // waits until it's opened, so holding it a day costs nothing (mental-performance close-out, change 1)
  review: { rank: 'time', budgeted: false, plans: true, ownSchedule: true },
  'review-keep': { rank: 'rest', budgeted: true, ownSchedule: true },
}
export const ASK_IDS = Object.keys(ASKS) as AskId[]
const RANK_ORDER: Rank[] = ['safety', 'time', 'thing', 'rest']

/** Judgement calls (plan §7.3): Usual 3 a day; Fewer prompts, a hard day or a signpost day 1. */
export const USUAL_ASKS = 3
export const FEWER_ASKS = 1

export function askBudget(ctx: { asks?: 'usual' | 'fewer'; hard?: boolean; signpostToday?: boolean }): number {
  if (ctx.signpostToday || ctx.hard || ctx.asks === 'fewer') return FEWER_ASKS
  return USUAL_ASKS
}

/**
 * The first 90 days (plan §7.3), judgement calls: weeks 1 and 2 only the check-in prompt and the
 * one thing (and safety); from week 3 everything else, plans and the reflection included. The fade
 * after about day 90 is NOT built in Phase 1 (build plan C20).
 */
export const EARLY_DAYS = 14

export type HeldReason = 'signpost' | 'hard-day' | 'low-mood' | 'early-weeks' | 'budget'

export interface AskCtx {
  /** profile.mind.asks */
  asks?: 'usual' | 'fewer'
  /** mind.hardDay(...) */
  hard?: boolean
  /** today's mood is 1 or 2 (Rough or Low): a due plan review waits for an ordinary day */
  lowMood?: boolean
  /** the low-mood signpost shows today: it is the only ask (the check-in prompt stays) */
  signpostToday?: boolean
  /** days since the person started (0 on the first day); see `daysUsing` */
  daysUsing?: number
}

export interface AskPick {
  budget: number
  /** what shows today, in order */
  show: AskId[]
  /** due but not shown today, with why: never mark these seen or answered */
  held: { id: AskId; reason: HeldReason }[]
}

/**
 * Which of today's due asks show. `due` is everything that would show without a budget, in the
 * screen's own priority order within a rank (for example welcome-back before activity before
 * burn-note, as TodayScreen orders them). Unknown ids are ignored. Order: safety, then
 * time-sensitive (the plan review and the weekly review card), then the one thing, then the rest.
 * - On a signpost day the signpost is the only ask: no chips, nothing else budgeted, and no
 *   unbudgeted card either (the food quick-check list, the reflection). Only the Mind card's check-in
 *   prompt stays: it is the card's baseline and supplies the mood answers (mental-performance, WP3).
 * - On a hard day the one thing is the single ask: the optional food prompts, the other banners,
 *   the plan review and the if-then offer all wait (Benn, 9 Oct 2026; reason 'hard-day').
 * - On a Low or Rough mood day the plan review and the if-then offer wait too (reason 'low-mood',
 *   which wins when the day is both).
 * A held plan review is never dropped or marked seen: plansDue (core/domain/insights) is still true
 * the next day because nothing was reviewed, and that day's ctx (store selectAskCtx, from that day's
 * check-in) brings it back as soon as the day is an ordinary one.
 */
export function pickAsks(due: readonly AskId[], ctx: AskCtx): AskPick {
  const budget = askBudget(ctx)
  const known = [...new Set(due)].filter((id): id is AskId => id in ASKS)
  const ordered = RANK_ORDER.flatMap((r) => known.filter((id) => ASKS[id].rank === r))
  const show: AskId[] = []
  const held: AskPick['held'] = []
  let used = 0
  const early = (ctx.daysUsing ?? Infinity) < EARLY_DAYS
  for (const id of ordered) {
    const m = ASKS[id]
    const hold = (reason: HeldReason) => held.push({ id, reason })
    if (ctx.signpostToday && id !== 'signpost' && id !== 'checkin') { hold('signpost'); continue }
    if (early && !m.early && !m.ownSchedule) { hold('early-weeks'); continue }
    if (ctx.hard && m.food) { hold('hard-day'); continue }
    if (ctx.lowMood && m.plans) { hold('low-mood'); continue }
    if (ctx.hard && m.plans) { hold('hard-day'); continue }
    if (ctx.hard && m.rank === 'rest' && m.budgeted) { hold('hard-day'); continue }
    if (m.budgeted) {
      if (used >= budget) { hold('budget'); continue }
      used++
    }
    show.push(id)
  }
  return { budget, show, held }
}

/** Whether a due ask may be marked seen or answered today (only when it actually showed). */
export const mayMarkSeen = (pick: AskPick, id: AskId): boolean => pick.show.includes(id)

/**
 * Days since the person started, from their earliest logged day (0 on that day). With nothing
 * logged yet, 0. Dates are local "YYYY-MM-DD".
 */
export function daysUsing(dayKeys: readonly string[], today: string): number {
  const first = dayKeys.filter((d) => d <= today).sort()[0]
  if (!first) return 0
  return Math.round((parseYmd(today).getTime() - parseYmd(first).getTime()) / 86400000)
}
