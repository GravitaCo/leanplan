import type { Thing } from '@/core/data/skills'
import { PlanEditSheet } from '../plan/PlanSheets'

/**
 * "Make it a plan" from the day's one thing (B9.8 to B9.17). HOOK FOR WP14: it replaces this with
 * PlanEditSheet prefilled from `thing.plan` (B9.11, B9.13), `kind: 'mind'`, the B9.15 group line and
 * the B9.17 toast. Until then it opens the existing empty "New plan" sheet. Flag-on builds only.
 */
export function ThingPlanSheet({ thing, onClose }: { thing: Thing; onClose: () => void }) {
  void thing
  return <PlanEditSheet onClose={onClose} />
}
