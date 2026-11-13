/**
 * The app's gate, in App.tsx's order (lib/account/gateModel.ts): loading, whose data is on this
 * phone, sign-in, a pending under-18 deletion, the 18+ stop, consent, then the app. Returns null
 * once the app may show; until then nothing behind it is rendered, and the store's own rules keep
 * sync off until the health yes and during the 18+ stop.
 */
import { useStore } from '@/store/store'
import { healthConsentAnswered, liveConsentDue } from '@/data/consent'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { pendingDeletion } from '@/data/onboardingDraft'
import { getUid } from '@/data/supabase'
import { Notice } from './Notice'
import { AuthScreen, OwnerChoiceScreen } from './account/Auth'
import { ConsentScreen } from './account/Consent'
import { Under18, UnderAgeStop } from './account/AgeStop'
import { gateStep, pendingFor } from './account/gateModel'

export function useGate(fontsLoaded = true) {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const authed = useStore((s) => s.authed)
  const owner = useStore((s) => s.data._meta?.owner)
  const ownerAsk = useStore((s) => !!s.ownerAsk)
  const underAge = useStore((s) => !!s.underAge)
  const underAgeSource = useStore((s) => s.underAge?.source)
  const consentOpen = useStore((s) => s.consentOpen)
  const consentDue = useStore((s) => !healthConsentAnswered(s.data) && liveConsentDue(s.data))
  const pend = ONBOARDING_ENABLED ? pendingDeletion() : null
  const step = gateStep({
    ready: fontsLoaded && authReady, ownerAsk, signedIn, underAge, consentOpen, consentDue,
    pendingDeletion: pendingFor(pend?.uid, { authed, sessionUid: authed ? getUid() : null, owner }),
  })
  switch (step) {
    case null: return null
    case 'loading': return <Notice title="Loading…" />
    case 'owner': return <OwnerChoiceScreen />
    case 'sign-in': return <AuthScreen />
    // the wizard's stop while a new under-18 account's deletion is pending (the store retries it)
    case 'deleting': return <Under18 deleting onClose={() => {}} />
    case 'under-age': return <UnderAgeStop source={underAgeSource ?? 'launch'} />
    case 'consent-profile': return <ConsentScreen fromProfile />
    case 'consent': return <ConsentScreen />
  }
}
