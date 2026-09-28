/**
 * Onboarding 7's screens load on demand, like the wizard, so their copy and the engine stay out of
 * the main bundle. App fetches the chunk while online (the service worker keeps it for offline:
 * public/sw.js, the build's tali-lazy list). If it still can't load, nothing breaks: the check-in
 * just doesn't show, and the answers screen goes back.
 */
import { Component, lazy, Suspense, type ComponentProps, type ReactNode } from 'react'

const load = () => import('./HealthAnswers')
export const preloadHealthAnswers = (): void => { load().catch(() => {}) }

const Screen = lazy(() => load().then((m) => ({ default: m.HealthAnswersScreen })))
const Check = lazy(() => load().then((m) => ({ default: m.PregnancyCheckSheet })))

class Quiet extends Component<{ children: ReactNode; onFail?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFail?.() }
  render() { return this.state.failed ? null : this.props.children }
}

export function LazyHealthAnswersScreen(p: ComponentProps<typeof Screen>) {
  return <Quiet onFail={p.onBack}><Suspense fallback={null}><Screen {...p} /></Suspense></Quiet>
}

export function LazyPregnancyCheckSheet(p: ComponentProps<typeof Check>) {
  return <Quiet><Suspense fallback={null}><Check {...p} /></Suspense></Quiet>
}
