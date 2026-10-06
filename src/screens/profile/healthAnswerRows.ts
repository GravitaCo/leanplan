/**
 * The rows of Profile › Health data › Health check answers (board ob7-1, notes s-ob7): one per
 * answer kept, board order, each with what it's set to and what it changes. Values say only what
 * is stored (healthAnswersView). No React, so `npm test` checks it.
 */
import type { Profile } from '@/core/types'
import { healthAnswersView, numbersStayHidden, type HealthAnswerKind } from '@/core/domain/onboarding'
import { HEALTH_ANSWERS as H } from '../onboarding/copy'
import { FOOD9 } from '../onboarding/copyApp'
import { foodModeOf, foodView, type FoodOptInAnswer } from '@/core/domain/foodMode'

export type RowKind = Exclude<HealthAnswerKind, 'baseline'>
export interface AnswerRow {
  kind: RowKind
  label: string
  value: string
  does: string
  change: boolean
  clear: boolean
  /** Clear asks first (s-ob7: pregnancy and conditions, when the answer changes the plan) */
  confirm: boolean
}

/** Board order (ob7-1). "How things are lately" has no row on the boards (GAP). */
const ORDER: RowKind[] = ['pregnancy', 'medical', 'readiness', 'wellbeing']

export function answerRows(p: Profile): AnswerRow[] {
  const v = healthAnswersView(p)
  const out: AnswerRow[] = []
  for (const kind of ORDER) {
    const r = v.rows.find((x) => x.kind === kind)
    if (!r) continue
    const label = H.labels[kind]
    if (kind === 'pregnancy') out.push(r.flagged
      ? { kind, label, value: H.yes, does: H.does.pregnancy, change: true, clear: true, confirm: true }
      : { kind, label, value: H.no, does: H.does.nothing, change: false, clear: true, confirm: false })
    else if (kind === 'medical') out.push(r.flagged
      ? { kind, label, value: H.yes, does: H.does.medical, change: true, clear: true, confirm: true }
      : { kind, label, value: H.none, does: H.does.nothing, change: true, clear: true, confirm: false })
    // the health check keeps only the outcome, so there's nothing to change it to (s-ob7)
    else if (kind === 'readiness') out.push({ kind, label, value: r.flagged ? H.gentler : H.none, does: r.flagged ? H.does.readiness : H.does.nothing, change: false, clear: true, confirm: false })
    // food and weight is an answer, not a flag: Change only (s-ob7)
    else out.push({
      kind, label, change: true, clear: false, confirm: false,
      value: r.value === 'flagged' ? H.wellbeingFlagged : r.value === 'sometimes' ? H.wellbeingSometimes : r.value === 'clear' ? H.no : H.rather,
      does: r.value === 'flagged' ? H.does.wellbeing : r.value === 'sometimes' ? H.does.wellbeingSometimes
        : r.value === 'undisclosed' && !p.deficitChosen ? H.does.rather : H.does.nothing,
    })
  }
  return out
}

/**
 * The clear confirm's line (ob7-2): numbers stay hidden by something else (the approved variant),
 * or a gentler start is still kept (Benn's line), or the board's line when nothing remains.
 */
export function clearConfirmLine(p: Profile, kind: RowKind): string {
  if (numbersStayHidden(p, kind)) return H.confirmHidden
  if (kind !== 'readiness' && p.outcomes?.readiness === 'flagged') return H.confirmGentler
  return H.confirm
}

export interface OptInRow { key: 'range'; label: string; value: string; does: string; off: FoodOptInAnswer }

/**
 * Onboarding 9: Yes's week-4 range, when they said yes, with its one-tap undo (an undo, never a
 * nudge to turn it on). Sometimes has foodShows instead.
 */
export function optInRows(p: Profile): OptInRow[] {
  const v = foodView(p)
  return v.mode === 'yes' && v.rangeOnFood ? [{ key: 'range', ...FOOD9.optIn.range, off: { ask: 'range', value: 'not-now' } }] : []
}

export interface FoodShows {
  /** what they chose (the day-14 ask or this control); undefined until then, so neither is marked */
  value: 'food' | 'today' | undefined
  /** where the range shows now: on Food only until they choose Today */
  line: string
}

/**
 * Onboarding 10 (board ob9-8): every Sometimes user chooses where the range shows, either way, any
 * time. The same answer the day-14 ask stores (answerFoodOptIn), so nothing else changes.
 */
export function foodShows(p: Profile): FoodShows | null {
  // pregnant or breastfeeding: no range shows anywhere (Food and Today), so the row is hidden
  if (foodModeOf(p) !== 'sometimes' || p.pregnancy?.flagged) return null
  const value = p.foodOptIn?.today
  return { value, line: value === 'today' ? FOOD9.shows.today : FOOD9.shows.food }
}
