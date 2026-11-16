/* For scripts/e2e-onboarding.cjs (bundled by it with esbuild): the numbers the summary should show
   for a draft, straight from the core, so the headless run checks the screen against
   startingTargets rather than against numbers typed into the test. */
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { finishedProfile, loadOf, summaryFor, type WizardDraft } from '@/core/domain/wizard'
import { routeSafety, safetyAnswersFrom } from '@/core/domain/onboarding'
import { startingTargets } from '@/core/domain/targets'

export function expected(draft: WizardDraft, today: string) {
  const m = summaryFor(DEFAULT_PROFILE, draft, { healthConsent: true, today })
  const t = startingTargets(m.profile, loadOf(m.result, m.profile.goal), routeSafety(safetyAnswersFrom(m.profile, m.kg, true)), m.kg)
  return {
    kcal: t.kcal, estimate: t.estimate, low: t.maintenance?.low ?? null, high: t.maintenance?.high ?? null, hidden: t.hidden,
    summaryKcal: m.targets.kcal, planId: m.result.plan.trainingPlan.id, routines: m.result.plan.routines.map((r) => r.id),
    weekdays: m.result.plan.weekdays, starter: m.result.starter, mult: t.effectiveMultiplier,
  }
}

/** A finished first run as stored: the profile, and the generated plan started today (ob7 e2e). */
export function finished(draft: WizardDraft, today: string, at: string) {
  const m = summaryFor(DEFAULT_PROFILE, draft, { healthConsent: true, today })
  const plan = m.result.plan
  return {
    profile: finishedProfile(m, draft, at, today, DEFAULT_PROFILE),
    trainingPlans: [{ ...plan.trainingPlan, startedAt: today }],
    routines: plan.routines,
  }
}
