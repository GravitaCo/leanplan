/**
 * Summary with the wellbeing flag on (board B2, build plan WP7): the pure parts, with no React,
 * so scripts/wellbeing/summary.ts can test them. TodayScreen gathers the facts and renders.
 */
import type { CheckIn, DayLog, IfThenPlan, Pillar } from '@/core/types'
import { thingPlan, type Thing } from '@/core/data/skills'
import type { AskId } from '@/core/domain/asks'
import { parseYmd } from '@/core/domain/date'
import { WEIGH_IN } from './summaryCopy'

/** The pillars that are on (C1: a switched-off pillar disappears from Summary). */
export function pillarsOn(off: readonly Pillar[] | undefined): Record<Pillar, boolean> {
  const o = off ?? []
  return { mind: !o.includes('mind'), food: !o.includes('food'), move: !o.includes('move') }
}

/**
 * Today's check-in has answers (a score or a night). A check-in that holds only a one thing or a
 * skill isn't a check-in yet, so the card still asks "How are you today?".
 */
export function checkedIn(c: CheckIn | null | undefined): boolean {
  if (!c) return false
  return !!(c.mood || c.hunger || c.sleep || c.stress || c.energy || c.sore || c.night)
}

/** "08:10" from the check-in's saved time (the device's clock, 24-hour as the app shows times). */
export function checkinTime(t: string | undefined): string | null {
  if (!t) return null
  const d = new Date(t)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** The most recent weigh-in on or before `upTo` (any age), or null. */
export function lastWeighIn(days: Record<string, DayLog | undefined>, upTo: string): { d: string; kg: number } | null {
  let best: { d: string; kg: number } | null = null
  for (const [d, x] of Object.entries(days)) {
    if (d > upTo || x?.weight == null) continue
    if (!best || d > best.d) best = { d, kg: x.weight }
  }
  return best
}

/**
 * The weight tile's sub-line on a hard day (nutrition-accuracy R5): "Today" if weighed today,
 * "Last weigh-in" if 1 to 6 days ago, "Last weigh-in, {d MMM}" from 7 days. No weekly change.
 */
export function weighInSub(last: string | null | undefined, today: string): string {
  if (!last) return WEIGH_IN.none
  const ago = Math.round((parseYmd(today).getTime() - parseYmd(last).getTime()) / 864e5)
  if (ago <= 0) return WEIGH_IN.today
  if (ago < 7) return WEIGH_IN.recent
  return WEIGH_IN.older(new Date(last + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
}

/** What could show on Summary today, before the asks budget (core/domain/asks pickAsks) decides. */
export interface SummaryDue {
  /** WP15: the low-mood signpost (selectAskCtx's signpostToday, only with MIND_REVIEWED) */
  signpost?: boolean
  /** today's check-in isn't done: the Mind card's "Check in" (unbudgeted) */
  checkin?: boolean
  /** the one thing has chips to offer, or one is already picked */
  thing?: boolean
  /** "How are your plans going?" */
  planReview?: boolean
  /** main's weekly review card (reviewWaiting) */
  review?: boolean
  /** "Keep the weekly reminder?" (reminderAskDue, never in a care week) */
  reviewKeep?: boolean
  /** the single banner slot under the Mind card, as TodayScreen picks it (one at most) */
  banner?: 'missed' | 'suggest' | 'burn' | null
  /** the onboarding sheets */
  ifThen?: boolean
  foodAsk?: boolean
  pregnancyReask?: boolean
  /** the Food card's "Worth a quick check" list */
  quickCheck?: boolean
}

export const BANNER_ASK: Record<'missed' | 'suggest' | 'burn', AskId> = { missed: 'welcome-back', suggest: 'activity', burn: 'burn-note' }

/**
 * The due list for pickAsks, with the switched-off pillars' asks left out (C1): Mind off takes
 * the check-in prompt, the one thing with its card and the low-mood signpost; Food off takes the food asks, the quick
 * check and the range note.
 */
export function summaryDue(due: SummaryDue, on: Record<Pillar, boolean>): AskId[] {
  const out: AskId[] = []
  if (on.mind && due.signpost) out.push('signpost')
  if (due.planReview) out.push('plan-review')
  if (due.review) out.push('review')
  if (on.mind && due.thing) out.push('thing')
  if (due.ifThen) out.push('if-then-offer')
  if (due.reviewKeep) out.push('review-keep')
  if (due.banner && !(due.banner === 'burn' && !on.food)) out.push(BANNER_ASK[due.banner])
  if (on.food && due.foodAsk) out.push('food-ask')
  if (due.pregnancyReask) out.push('pregnancy-reask')
  if (on.food && due.quickCheck) out.push('quick-check')
  if (on.mind && due.checkin) out.push('checkin')
  return out
}

/**
 * Whether the Mind card offers "Make it a plan" after the one thing is done (mental-performance
 * close-out, change 5): for a thing with an approved prefill (all of them since Benn's 10 Oct
 * wording; "Wind down from {time}" only while a wind-down time is set), and not once a Mind plan
 * was saved that day. Mind plans are made only from the one thing, and a day has one thing, so a
 * Mind plan created today is the plan from today's thing (no link is stored, so no data change).
 */
export function makePlanOffered(thing: Thing | undefined, plans: readonly IfThenPlan[] | undefined, today: string, ctx: { windDownAt?: string } = {}): boolean {
  if (!thingPlan(thing, ctx)) return false
  return !(plans ?? []).some((p) => p.kind === 'mind' && p.created?.slice(0, 10) === today)
}
