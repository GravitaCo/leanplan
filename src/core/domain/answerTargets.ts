/**
 * The light half of re-running a changed health answer (ob7): routing and the daily target, as
 * Profile shows them (suggestedTargets with profileRouting). Kept out of wizard.ts so the main
 * bundle can apply it at once, offline too; only the plan rebuild needs the engine (rerunForAnswers).
 */
import type { MacroTarget, Profile, TrainingPlan } from '@/core/types'
import { profileRouting } from './onboarding'
import { suggestedTargets } from './nutrition'

/** The new daily target for the answers, or null when routing hides numbers (keep what's stored). */
export function answerTargets(profile: Profile, kg: number | null, healthConsent: boolean): MacroTarget | null {
  const sug = suggestedTargets(profile, kg, profileRouting(profile, kg, healthConsent))
  return sug && 'kcal' in sug ? { kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f } : null
}

/** Only a plan built from the answers (source 'recommended' with its reasons) is rebuilt. */
export const planFromAnswers = (p: TrainingPlan | undefined): p is TrainingPlan => !!p && p.source === 'recommended' && !!p.why?.length
