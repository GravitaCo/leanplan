/**
 * The app's gate, in App.tsx's order (lib/account/gateModel.ts): loading, whose data is on this
 * phone, sign-in, a pending under-18 deletion, the 18+ stop, consent, then the app. Returns null
 * once the app may show; until then nothing behind it is rendered, and the store's own rules keep
 * sync off until the health yes and during the 18+ stop.
 *
 * The N2 screens are being rebuilt on lib/ui (N1); until they land each step keeps the spike's plain
 * message, which never goes past it.
 */
import { useStore } from '@/store/store'
import { healthConsentAnswered, liveConsentDue } from '@/data/consent'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { pendingDeletion } from '@/data/onboardingDraft'
import { getUid } from '@/data/supabase'
import { Notice, SignIn } from './SignIn'
import { gateStep, pendingFor } from './account/gateModel'

export function useGate(fontsLoaded = true) {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const authed = useStore((s) => s.authed)
  const owner = useStore((s) => s.data._meta?.owner)
  const ownerAsk = useStore((s) => !!s.ownerAsk)
  const underAge = useStore((s) => !!s.underAge)
  const consentOpen = useStore((s) => s.consentOpen)
  const signOut = useStore((s) => s.signOut)
  const consentDue = useStore((s) => !healthConsentAnswered(s.data) && liveConsentDue(s.data))
  const pend = ONBOARDING_ENABLED ? pendingDeletion() : null
  const step = gateStep({
    ready: fontsLoaded && authReady, ownerAsk, signedIn, underAge, consentOpen, consentDue,
    pendingDeletion: pendingFor(pend?.uid, { authed, sessionUid: authed ? getUid() : null, owner }),
  })
  switch (step) {
    case null: return null
    case 'loading': return <Notice title="Loading…" />
    case 'owner': return <Notice title="This phone has someone else's Tilo data" body="The spike doesn't ask whose it is yet. Sign out, or use the web app for this account for now." action={{ title: 'Sign out', onPress: () => void signOut() }} />
    case 'sign-in': return <SignIn />
    case 'deleting':
    case 'under-age': return <Notice title="Tilo is for people 18 and over" />
    case 'consent':
    case 'consent-profile': return <Notice title="One more step on the web" body="Answer the health data question at app.tilo.fit, then open this again. The native consent screen comes with the account work." />
  }
}
