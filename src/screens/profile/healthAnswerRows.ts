/**
 * The rows of Profile › Health data › Health check answers (board ob7-1, notes s-ob7): one per
 * answer kept, board order, each with what it's set to and what it changes. Values say only what
 * is stored (healthAnswersView). No React, so `npm test` checks it.
 */
import type { Profile } from '@/core/types'
import { healthAnswersView, type HealthAnswerKind } from '@/core/domain/onboarding'
import { HEALTH_ANSWERS as H } from '../onboarding/copy'

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
      value: r.value === 'flagged' ? H.wellbeingFlagged : r.value === 'clear' ? H.no : H.rather,
      does: r.value === 'flagged' ? H.does.wellbeing : r.value === 'undisclosed' && !p.deficitChosen ? H.does.rather : H.does.nothing,
    })
  }
  return out
}
