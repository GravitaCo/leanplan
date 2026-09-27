import { useEffect } from 'react'
import { useStore } from './store/store'
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
import { healthConsentAnswered } from './data/consent'
import { REAUTH_FLAG } from './data/account'

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
  const answered = useStore((s) => healthConsentAnswered(s.data))

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // the plan photographs, fetched once when idle so the library looks right offline
  useEffect(() => {
    if (!signedIn) return
    const run = () => warmPlanArt()
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 3000)
  }, [signedIn])

  // back from a Google re-sign-in started in Profile to delete the account: go back there (Profile
  // reads and clears the flag, and reopens the delete step)
  useEffect(() => {
    if (!signedIn) return
    try { if (sessionStorage.getItem(REAUTH_FLAG)) setTab('profile') } catch { /* blocked */ }
  }, [signedIn, setTab])

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
  // explicit consent before any health data is stored or synced (sync waits for it too)
  if (!answered) return <ConsentScreen />

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
