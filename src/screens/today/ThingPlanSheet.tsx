import type { Thing } from '@/core/data/skills'
import { PlanEditSheet } from '../plan/PlanSheets'

/**
 * "Make it a plan" from the day's one thing (board B9, deck B9.8 to B9.17): the existing plan sheet,
 * prefilled from `thing.plan` (B9.11 "after lunch", B9.13 "get outside for 10 minutes"), saved with
 * `kind: 'mind'` under "Mind plans" on Plan, then the B9.17 toast. Nothing is saved until Save. A
 * thing with no approved prefill opens the sheet empty, still as a Mind plan. Flag-on builds only.
 */
export function ThingPlanSheet({ thing, onClose }: { thing: Thing; onClose: () => void }) {
  return <PlanEditSheet prefill={thing.plan} kind="mind" onClose={onClose} />
}
