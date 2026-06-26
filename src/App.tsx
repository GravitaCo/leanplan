import { useEffect } from 'react'
import { useStore } from './store/store'
import { BottomNav } from './ui/BottomNav'
import { AuthScreen } from './screens/AuthScreen'
import { TodayScreen } from './screens/TodayScreen'
import { FoodScreen } from './screens/FoodScreen'
import { TrainScreen } from './screens/TrainScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'

export default function App() {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const toast = useStore((s) => s.toast)
  const initAuth = useStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

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

  return (
    <div className="app-shell">
      {tab === 'today' && <TodayScreen />}
      {tab === 'food' && <FoodScreen />}
      {tab === 'train' && <TrainScreen />}
      {tab === 'plan' && <PlaceholderScreen title="Plan" subtitle="Your weekly schedule lands here next." />}
      {tab === 'profile' && (
        <PlaceholderScreen title="Profile" subtitle="Profile, metrics, supplements & settings land here next." />
      )}

      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
