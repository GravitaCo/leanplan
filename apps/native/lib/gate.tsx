/**
 * The app's gate, in App.tsx's order: loading, whose data is on this phone (the owner choice),
 * sign-in, a pending under-18 deletion, the 18+ stop, the consent screen (after sign-in until the
 * health answer is in, or opened from Profile), then the app. Returns null once the app may show;
 * until then nothing behind it is rendered. The first-run wizard (behind ONBOARDING_ENABLED) comes
 * after consent with N11.
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

export function useGate(fontsLoaded = true) {
  const authReady = useStore((s) => s.authReady)
  const signedIn = useStore((s) => s.signedIn)
  const authed = useStore((s) => s.authed)
  const owner = useStore((s) => s.data._meta?.owner)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const underAge = useStore((s) => s.underAge)
  const consentOpen = useStore((s) => s.consentOpen)
  const consentDue = useStore((s) => !healthConsentAnswered(s.data) && liveConsentDue(s.data))
  if (!fontsLoaded || !authReady) return <Notice title="Loading…" />
  if (ownerAsk) return <OwnerChoiceScreen />
  if (!signedIn) return <AuthScreen />
  // a new under-18 account whose deletion is still pending (the wizard's stop): only for the account
  // it belongs to (the live session's, or offline this phone's owner); the store retries it
  const pend = ONBOARDING_ENABLED ? pendingDeletion() : null
  if (pend && pend.uid === (authed ? getUid() : owner)) return <Under18 deleting onClose={() => {}} />
  // 18+: an under-18 age from Profile, a backup, sync or this phone's saved data. Only the stop
  // shows, before consent or anything else; sync stays off (the store's rule). The web shows the redo
  // wizard's own stop in its place while that wizard is open; native has no wizard until N11, so the
  // app's stop shows in every case: never open past an under-18 age (compliance, 13 Nov)
  if (underAge) return <UnderAgeStop source={underAge.source} />
  // the one consent screen until the health answer is in (after a "Not now", once more 2 weeks on);
  // Profile opens it too, for someone who never agreed on it
  if (consentOpen) return <ConsentScreen fromProfile />
  if (consentDue) return <ConsentScreen />
  return null
}
