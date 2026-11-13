/**
 * The onboarding wizard's flow on native, with no JSX: which step shows, how an answer moves on,
 * Back, and the draft kept on this device. Every decision is the shared core's
 * (core/domain/wizard.ts: afterAnswer, prevStep, stepsFor, newDraft, draftFromProfile) and the draft
 * is the same `tali.onboarding` record (data/onboardingDraft.ts), so a run moves between web and
 * native unchanged. This is the logic of the web's `Onboarding` (src/screens/onboarding/Wizard.tsx)
 * minus its markup; the screens (built on N1's primitives) only ask and show.
 *
 * Never keeps health answers on the device without the local consent record (onboarding plan §8),
 * and Redo setup's age stop keeps no under-18 age (a reopen asks the age again).
 */
import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import { clearDraft, loadDraft, saveDraft } from '@/data/onboardingDraft'
import { uuid } from '@/data/supabase'
import { HEALTH_STEPS, afterAnswer, draftFromProfile, newDraft, prevStep, stepsFor, type StepId, type WizardDraft, type WizardMode } from '@/core/domain/wizard'
import { keptDraft, mayKeep, stopReset } from '@/core/domain/wizardAnswers'
import { latestWeight } from '@/core/domain/insights'
import { todayStr } from '@/core/domain/date'

export interface WizardFlow {
  d: WizardDraft
  health: boolean
  /** Profile's Redo setup or the setup card alone: Back from the first question closes */
  closable: boolean
  /** set the draft (and keep it on the device when allowed) */
  put: (next: WizardDraft) => void
  /** merge an answer into the draft without moving on */
  patch: (x: Partial<WizardDraft>) => void
  /** an answer, then the next step (never past a note or stop the answer leads to; `ret` returns to the summary) */
  go: (x?: Partial<WizardDraft>) => void
  back: () => void
  jump: (step: StepId) => void
}

export function useWizardFlow({ mode, redo, onClose }: { mode: WizardMode; redo?: boolean; onClose?: () => void }): WizardFlow {
  const data = useStore((s) => s.data)
  const health = canSaveHealthAnswers(data)
  const raiseUnderAge = useStore((s) => s.raiseUnderAge)
  const [d, setD] = useState<WizardDraft>(() => {
    const saved = loadDraft()
    if (saved && saved.mode === mode && !!saved.redo === !!redo) return saved
    return redo ? draftFromProfile(data.profile, uuid(), { healthConsent: health, weight: latestWeight(data, todayStr()) }) : newDraft(mode, uuid())
  })
  const closable = mode === 'setup' || !!d.redo
  const put = (next: WizardDraft) => {
    setD(next)
    if (mayKeep(next, health)) saveDraft(keptDraft(next))
  }
  const patch = (x: Partial<WizardDraft>) => put({ ...d, ...x })
  const go = (x: Partial<WizardDraft> = {}) => { const n = { ...d, ...x }; put({ ...n, ...afterAnswer(n, health) }) }
  const back = () => { const p = prevStep(d, health); if (p) put({ ...d, step: p }); else if (closable) { clearDraft(); onClose?.() } }
  const jump = (step: StepId) => put({ ...d, step })
  // a step that isn't in this run (a health step without consent, a skipped branch): move on
  useEffect(() => {
    const steps = stepsFor(d, health)
    if (!steps.includes(d.step)) put({ ...d, step: steps.find((s) => !HEALTH_STEPS.includes(s)) ?? 'summary' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step, health])
  // Redo setup is an existing account: its stop is the app's (nothing syncs, reminders held)
  useEffect(() => {
    if (d.step === 'under16' && d.redo) raiseUnderAge('profile', { inWizard: true })
    const reset = stopReset(d, mode)
    if (reset) put(reset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step])
  return { d, health, closable, put, patch, go, back, jump }
}
