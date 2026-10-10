import { thingPlan, type Thing } from '@/core/data/skills'
import { useStore } from '@/store/store'
import { PlanEditSheet } from '../plan/PlanSheets'

/**
 * "Make it a plan" from the day's one thing (board B9, deck B9.8 to B9.17): the existing plan sheet,
 * prefilled from `thing.plan` (B9.11 "after lunch", B9.13 "get outside for 10 minutes", and the
 * other things' wording approved by Benn on 10 Oct 2026), with the wind-down time filled in as the
 * sheet opens. Saved with `kind: 'mind'` under "Mind plans" on Plan, then the B9.17 toast. Nothing
 * is saved until Save. Not offered once a Mind plan was saved that day (MindCard, summary.ts
 * makePlanOffered). Flag-on builds only.
 */
export function ThingPlanSheet({ thing, onClose }: { thing: Thing; onClose: () => void }) {
  const windDownAt = useStore((s) => s.data.profile.mind?.windDownAt)
  return <PlanEditSheet prefill={thingPlan(thing, { windDownAt })} kind="mind" onClose={onClose} />
}
