/**
 * Onboarding's place in the app's gate, in App.tsx's order (after sign-in, the 18+ stop and the
 * consent screen, which stay N2's and the lead's): the first-run wizard when it's due (waiting up
 * to FIRST_PULL_WAIT_MS for the first pull, as on web), then Profile's Redo setup and Set up my
 * plan, then the setup card on its own (Today's "Finish your setup", Plan's "Build my plan").
 *
 * For lib/gate.tsx (the lead's): after its consent check, `const ob = useOnboardingGate(); if (ob) return ob`.
 * Until then the e2e checks reach it through app/onboarding-e2e.tsx (EXPO_PUBLIC_E2E builds only).
 * Hooks run every render, so call it before the gate's early returns and use the result after them.
 * `underAgeInWizard` is the one case where it shows over the 18+ stop: Redo setup's own stop
 * (App.tsx: `underAge.inWizard && redoOpen`).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { FIRST_PULL_WAIT_MS } from '@/data/firstRun'
import { Onboarding } from './Wizard'
import { wizardDue } from '@/data/firstRun'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import type { AgeStopRender } from './AgeStop'
import { Notice } from '../../lib/SignIn'

export function useOnboardingGate(opts: { ageStop?: AgeStopRender } = {}): ReactNode | null {
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const redoOpen = useStore((s) => s.redoOpen)
  const setupOpen = useStore((s) => s.setupOpen)
  const openRedo = useStore((s) => s.openRedo)
  const openSetup = useStore((s) => s.openSetup)
  const [waited, setWaited] = useState(false)
  const showing = useRef(false)
  const due = signedIn ? wizardDue(data, { online, signedIn, showing: showing.current }) : false
  const waiting = due === 'wait'
  useEffect(() => { if (!waiting) return; const t = setTimeout(() => setWaited(true), FIRST_PULL_WAIT_MS); return () => clearTimeout(t) }, [waiting])
  // nothing before the app knows who is signed in (the root shows its own loading)
  if (!ONBOARDING_ENABLED || !authReady || !signedIn) return null
  if (due === 'wait' && !waited) return <Notice title="Loading…" />
  showing.current = !!due
  if (due) return <Onboarding mode="first" ageStop={opts.ageStop} />
  // Redo setup can reach the 18+ stop on an existing account, which needs N2's stop (the account
  // deletion): without one it never opens (mental-performance, compliance)
  if (redoOpen && opts.ageStop) return <Onboarding mode="first" redo ageStop={opts.ageStop} onClose={() => openRedo(false)} />
  if (setupOpen) return <Onboarding mode="setup" ageStop={opts.ageStop} onClose={() => openSetup(false)} />
  return null
}

/** Redo setup's own 18+ stop shows instead of the app's (App.tsx); the gate checks this before its underAge stop. */
export function useUnderAgeInWizard(): boolean {
  return useStore((s) => !!(ONBOARDING_ENABLED && s.underAge?.inWizard && s.redoOpen))
}
