/**
 * The native Plan tab's model from the shared store: the values come from planTabModel in
 * src/screens/plan/planModel.ts (shared and tested). No JSX: the screen built on N1's primitives
 * renders it and calls the store's own actions.
 */
import { useStore } from '@/store/store'
import { todayStr } from '@/core/domain/date'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { dayTarget, planTabModel, type PlanTabModel } from '@/screens/plan/planModel'
import { planArt, type PlanArt } from '@/screens/plan/planArt'

export type { PlanTabModel, PlanCard, IfThenRow } from '@/screens/plan/planModel'

/** The tab's model with each plan's photograph (bundled, so it shows offline). */
export type PlanTabView = PlanTabModel & { cardArt?: PlanArt; suggestedArt?: PlanArt }

/** The Plan tab's model, recomputed when the store's data changes. */
export function usePlanTab(): PlanTabView {
  const data = useStore((s) => s.data)
  const m = planTabModel(data, WELLBEING_ENABLED, todayStr(), new Date().getDay())
  return { ...m, cardArt: planArt(m.card?.plan.baseTemplateId), suggestedArt: planArt(m.suggested?.id) }
}

/** Where tapping a day of This week goes (the repeating week's day, or the plan's phase week). */
export function usePlanDayTarget(): (d: number) => ReturnType<typeof dayTarget> {
  const trainingPlans = useStore((s) => s.data.trainingPlans)
  return (d) => dayTarget({ trainingPlans }, d, todayStr())
}
