/**
 * N11 Onboarding on native. The screens come once N1's primitives land (PARITY.md); until then,
 * the flow, with no JSX. The answers, the draft rules and the summary's view logic are shared:
 * core/domain/wizardAnswers.ts and src/screens/onboarding/summaryModel.ts.
 */
export { useWizardFlow, type WizardFlow } from './useWizardFlow'
export { wizardDue, setupCardDue, buildCardDue } from '@/data/firstRun'
