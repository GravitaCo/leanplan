/**
 * N11 Onboarding on native: what the lead wires into the gate and what other streams place on their
 * screens. Every piece is behind ONBOARDING_ENABLED, as on web. The answers, the draft rules and the
 * summary's view logic are shared with the web (core/domain/wizardAnswers.ts,
 * src/screens/onboarding/summaryModel.ts); the due checks are src/data/firstRun.ts.
 */
export { Onboarding } from './Wizard'
export { useOnboardingGate, useUnderAgeInWizard } from './gate'
export { useWizardFlow, type WizardFlow } from './useWizardFlow'
export { SetupCard, BuildPlanCard, FirstPlanSheet } from './Moments'
export { Opts } from './Opts'
export { Signposts, SPS, type SP } from './Signposts'
export { AgeStopStub, type AgeStopRender } from './AgeStop'
export { wizardDue, setupCardDue, buildCardDue } from '@/data/firstRun'
