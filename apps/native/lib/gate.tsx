/**
 * The app's gate, in App.tsx's order: loading, whose data is on this phone, sign-in, the 18+ stop,
 * consent, then the app. The spike builds sign-in and the app; the owner question, the 18+ stop
 * and the consent screen are N2, so the spike stops at a message for them and never goes past
 * them (nothing syncs without the health yes: the store's own rule). Returns null once the app
 * may show; until then nothing behind it is rendered.
 */
import { useStore } from '@/store/store'
import { healthConsentAnswered, liveConsentDue } from '@/data/consent'
import { Notice, SignIn } from './SignIn'

export function useGate(fontsLoaded = true) {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const underAge = useStore((s) => s.underAge)
  const signOut = useStore((s) => s.signOut)
  const consentDue = useStore((s) => !healthConsentAnswered(s.data) && liveConsentDue(s.data))
  if (!fontsLoaded || !authReady) return <Notice title="Loading…" />
  if (ownerAsk) return <Notice title="This phone has someone else's Tilo data" body="The spike doesn't ask whose it is yet. Sign out, or use the web app for this account for now." action={{ title: 'Sign out', onPress: () => void signOut() }} />
  if (!signedIn) return <SignIn />
  if (underAge) return <Notice title="Tilo is for people 18 and over" />
  if (consentDue) return <Notice title="One more step on the web" body="Answer the health data question at app.tilo.fit, then open this again. The native consent screen comes with the account work." />
  return null
}
