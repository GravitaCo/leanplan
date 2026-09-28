import { useEffect, useState } from 'react'
import { useStore } from './store/store'
import { healthConsentAnswered, latestConsent, liveConsentDue } from './data/consent'
import { takeReauthReturn } from './data/account'
import { getUid } from './data/supabase'
import { ExistingConsentSheet, FirstRunConsent, existingDue, firstRunDue } from './screens/onboarding/Consent'
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

  // first-run consent (behind ONBOARDING_ENABLED): health, then AI, once each
  const [firstRun, setFirstRun] = useState<'health' | 'ai' | null>(null)
  useEffect(() => {
    if (!signedIn || ownerAsk) return
    if (!firstRun && firstRunDue(data, online)) setFirstRun('health')
    else if (firstRun === 'health' && latestConsent(data, 'health')) setFirstRun(latestConsent(data, 'ai') ? null : 'ai')
    else if (firstRun === 'ai' && latestConsent(data, 'ai')) setFirstRun(null)
  }, [data, online, signedIn, ownerAsk, firstRun])

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
  // One consent screen at a time. Live: the consent screen (screens/legal/ConsentScreen.tsx) until
  // the health answer is in; sync waits for it too (store scheduleSync, consentLetsSync). Behind
  // ONBOARDING_ENABLED, the Onboarding 6 flow takes its place: first-run ob6-1 → ob6-2, or for
  // someone who already has data here the ob6-3 sheet over the app ("Not now" keeps everything on
  // this phone: sync still waits for an answer).
  if (firstRun || firstRunDue(data, online)) return <FirstRunConsent step={firstRun ?? 'health'} />
  if (consentOpen) return <ConsentScreen fromProfile />
  if (!answered && liveConsentDue(data) && !existingDue(data, online)) return <ConsentScreen />

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
      {existingDue(data, online) && <ExistingConsentSheet />}
    </div>
  )
}
