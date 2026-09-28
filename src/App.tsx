import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { useStore } from './store/store'
import { healthConsentAnswered, liveConsentDue } from './data/consent'
import { takeReauthReturn } from './data/account'
import { getUid } from './data/supabase'
import { ONBOARDING_ENABLED, wizardDue } from './screens/onboarding/Consent'
// the wizard, its summary and the training engine load on demand (most launches never need them)
const Onboarding = lazy(() => import('./screens/onboarding/Wizard').then((m) => ({ default: m.Onboarding })))
const Under16 = lazy(() => import('./screens/onboarding/Wizard').then((m) => ({ default: m.Under16 })))
import { pendingDeletion } from './data/onboardingDraft'
import { BottomNav } from './ui/BottomNav'
import { warmPlanArt } from './screens/plan/PlanParts'
import { AuthScreen, OwnerChoiceScreen } from './screens/AuthScreen'
import { TodayScreen } from './screens/TodayScreen'
import { FoodScreen } from './screens/FoodScreen'
import { TrainScreen } from './screens/TrainScreen'
import { PlanScreen } from './screens/PlanScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ConsentScreen } from './screens/legal/ConsentScreen'
import { legalRedirect } from './screens/legal/LegalDoc'

/** Old /?doc=… links go to the document on the website. */
const moved = legalRedirect()
if (moved) window.location.replace(moved)

export default function App() {
  if (moved) return null
  return <TaliApp />
}

function TaliApp() {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const toast = useStore((s) => s.toast)
  const toastAction = useStore((s) => s.toastAction)
  const initAuth = useStore((s) => s.initAuth)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const authed = useStore((s) => s.authed)
  const openProfile = useStore((s) => s.openProfile)
  const consentOpen = useStore((s) => s.consentOpen)
  const answered = healthConsentAnswered(data)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // back from a Google re-sign-in for account deletion: reopen its confirm step (once, same account)
  useEffect(() => {
    if (authed && takeReauthReturn(getUid())) openProfile('delete-confirm')
  }, [authed, openProfile])

  const setupOpen = useStore((s) => s.setupOpen)
  const openSetup = useStore((s) => s.openSetup)
  // the first-run wizard waits a moment for the first pull (a second device), never for long
  const [waited, setWaited] = useState(false)
  useEffect(() => { const t = setTimeout(() => setWaited(true), 6000); return () => clearTimeout(t) }, [])
  // with the flag on, fetch the wizard's chunk while online, so the service worker keeps it for
  // a first run (or a resume) with no connection
  useEffect(() => { if (ONBOARDING_ENABLED && online) import('./screens/onboarding/Wizard').catch(() => {}) }, [online])

  // the plan photographs, fetched once when idle so the library looks right offline
  useEffect(() => {
    if (!signedIn) return
    const run = () => warmPlanArt()
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 3000)
  }, [signedIn])

  // Each tab opens at the top, like a native tab bar.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--label2)',
        }}
      >
        <span className="mono">Loading…</span>
      </div>
    )
  }

  if (ownerAsk) return <OwnerChoiceScreen />
  if (!signedIn) return <AuthScreen />
  // under 18 (onboarding §14, Benn: 18+ for now): the device is already wiped; the account's deletion retries on the
  // next connection (store runSync), and until then only the kind stop shows
  // only for the account it belongs to (the live session's, or offline this device's owner)
  const pend = ONBOARDING_ENABLED ? pendingDeletion() : null
  if (pend && pend.uid === (authed ? getUid() : data._meta?.owner)) return <Lazy><Under16 deleting onClose={() => {}} /></Lazy>
  // One consent screen: the live one (screens/legal/ConsentScreen.tsx) until the health answer is
  // in; sync waits for it too (store scheduleSync, consentLetsSync). Benn: it stays the one consent
  // screen with the onboarding flag on as well (the Onboarding 6 consent boards aren't shown).
  // Profile opens it too, for someone who never agreed on it; after a "Not now" it comes back once,
  // 2 weeks on (liveConsentDue)
  if (consentOpen) return <ConsentScreen fromProfile />
  if (!answered && liveConsentDue(data)) return <ConsentScreen />
  // then, behind ONBOARDING_ENABLED, the first-run wizard for someone new
  const due = wizardDue(data, { online, authed })
  if (due === 'wait' && !waited) return <Loading />
  if (due) return <Lazy><Onboarding mode="first" /></Lazy>
  if (ONBOARDING_ENABLED && setupOpen) return <Lazy><Onboarding mode="setup" onClose={() => openSetup(false)} /></Lazy>

  return (
    <div className="app-shell">
      <div className="status-shim" />
      {tab === 'today' && <TodayScreen />}
      {tab === 'food' && <FoodScreen />}
      {tab === 'train' && <TrainScreen />}
      {tab === 'plan' && <PlanScreen />}
      {tab === 'profile' && <ProfileScreen />}

      <div className={'toast' + (toast ? ' show' : '') + (toastAction ? ' act' : '')} role="status" aria-live="polite">
        <span>{toast}</span>
        {toast && toastAction && (
          <button onClick={() => { toastAction.run(); useStore.setState({ toast: null, toastAction: null }) }}>{toastAction.label}</button>
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

function Loading() {
  return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label2)' }}><span className="mono">Loading…</span></div>
}
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={<Loading />}>{children}</Suspense>
