/**
 * N11 Onboarding on native. The screens come once N1's primitives land (PARITY.md); until then,
 * the flow and the draft rules, with no JSX.
 */
export { useWizardFlow, type WizardFlow } from './useWizardFlow'
export { hasHealth, keptDraft, mayKeep, stopReset } from './draftRules'
export { wizardDue, setupCardDue, buildCardDue } from '@/data/firstRun'
