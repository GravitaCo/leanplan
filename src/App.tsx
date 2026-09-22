import { useEffect } from 'react'
import { useStore } from './store/store'
import { BottomNav } from './ui/BottomNav'
import { AuthScreen } from './screens/AuthScreen'
import { TodayScreen } from './screens/TodayScreen'
import { FoodScreen } from './screens/FoodScreen'
import { TrainScreen } from './screens/TrainScreen'
import { PlanScreen } from './screens/PlanScreen'
import { ProfileScreen } from './screens/ProfileScreen'

export default function App() {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const toast = useStore((s) => s.toast)
  const initAuth = useStore((s) => s.initAuth)
  const theme = useStore((s) => s.data.profile.theme)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Each tab opens at the top, like a native tab bar.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // Appearance preference: automatic follows the OS; light/dark force the palette.
  useEffect(() => {
    const el = document.documentElement
    if (theme === 'light' || theme === 'dark') el.dataset.theme = theme
    else delete el.dataset.theme
    // keep the browser/status-bar colour in step with a forced theme
    const forced = theme === 'light' || theme === 'dark'
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      if (m.dataset.content == null) { m.dataset.content = m.content; m.dataset.media = m.media }
      m.content = forced ? (theme === 'dark' ? '#000000' : '#f2f2f7') : m.dataset.content!
      m.media = forced ? 'all' : m.dataset.media!
    })
  }, [theme])

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
