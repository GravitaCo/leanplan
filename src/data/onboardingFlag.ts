/**
 * First-run onboarding (the setup wizard, its health questions, Redo setup, Health check answers,
 * the "Finish your setup" card and the wizard's under-18 deletion): built, off for users. A build
 * with VITE_ONBOARDING=1 turns it on (headless tests only). Lives in data/, not a screen, so the
 * legal scripts (`npm run legal:html`, which publishes with onboarding = ONBOARDING_ENABLED) can
 * read it without React; screens import it through screens/onboarding/Consent.
 */
export const ONBOARDING_ENABLED: boolean = false || import.meta.env?.VITE_ONBOARDING === '1'
