import { useEffect } from 'react'
import { useStore } from './store/store'
import { BottomNav } from './ui/BottomNav'
import { AuthScreen } from './screens/AuthScreen'
import { TodayScreen } from './screens/TodayScreen'
import { FoodScreen } from './screens/FoodScreen'
import { TrainScreen } from './screens/TrainScreen'
import { PlanScreen } from './screens/PlanScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ConsentScreen } from './screens/legal/ConsentScreen'
import { LegalPage, legalDocFromUrl } from './screens/legal/LegalDoc'

/** ?doc=privacy or ?doc=terms opens that document on its own, no sign-in needed. */
const publicDoc = legalDocFromUrl()

export default function App() {
  if (publicDoc) return <LegalPage id={publicDoc} />
  return <TaliApp />
}

function TaliApp() {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const toast = useStore((s) => s.toast)
  const initAuth = useStore((s) => s.initAuth)
  const consent = useStore((s) => s.consent)

  useEffect(() => {
    initAuth()
  }, [initAuth])

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
          color: 'var(--muted)',
        }}
      >
        <span className="mono">Loading…</span>
      </div>
    )
  }

  if (!signedIn) return <AuthScreen />
  if (!consent) return <ConsentScreen />

  return (
    <div className="app-shell">
      <div className="status-shim" />
      {tab === 'today' && <TodayScreen />}
      {tab === 'food' && <FoodScreen />}
      {tab === 'train' && <TrainScreen />}
      {tab === 'plan' && <PlanScreen />}
      {tab === 'profile' && <ProfileScreen />}

      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
