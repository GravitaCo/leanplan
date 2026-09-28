import { useState, type ReactNode } from 'react'
import { LEGAL, MIN_AGE } from '@/core/legal'
import { useStore } from '@/store/store'
import { hasExistingData, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { LegalLink } from './LegalDoc'

/**
 * Explicit consent before Tali stores anyone's health data (UK/EU GDPR Art. 9(2)(a)). Shown after
 * sign-in until the person has answered the current version (healthConsentAnswered); sync waits
 * for it. Each statement is its own unticked box: consent has to be a clear, specific act, never
 * pre-ticked or bundled with anything else. The health box records the `health` consent; the
 * screen can't be submitted without the terms and age boxes, so that record stands for all three
 * (CONSENT_VERSIONS in src/data/consent.ts). Works offline: the record saves on the device first.
 */
export function ConsentScreen({ fromProfile = false }: { fromProfile?: boolean }) {
  const grantConsent = useStore((s) => s.grantConsent)
  const signOut = useStore((s) => s.signOut)
  const notNow = useStore((s) => s.notNowHealth)
  const setConsentOpen = useStore((s) => s.setConsentOpen)
  // someone who used Tali before consent was asked may say "Not now": everything stays on this
  // phone and nothing syncs until they agree (asked once more after 2 weeks); for someone new,
  // "Not now" is signing out, since there's nothing to keep
  const existing = useStore((s) => hasExistingData(s.data) && !latestConsent(s.data, 'health'))
  const reasked = useStore((s) => healthSyncPaused(s.data))
  const [health, setHealth] = useState(false)
  const [terms, setTerms] = useState(false)
  const [adult, setAdult] = useState(false)

  const box = (on: boolean, set: (v: boolean) => void, id: string, children: ReactNode) => (
    <div className="li consent-row">
      <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <label htmlFor={id}>{children}</label>
    </div>
  )

  return (
    <div className="screen consent-screen">
      <h1>Before you start</h1>
      <p className="sub">
        What you log in Tali, like your weight, food, workouts, sleep, stress, mood and any injuries, is health
        information. It’s stored on this phone and in a database in Ireland (EU) that’s private to your
        account. It’s never sold, shared for marketing or used for ads.
      </p>

      <div className="list">
        {box(health, setHealth, 'c_health', <>I agree to Tali storing and using my health information to run the app for me, as the <LegalLink id="privacy">privacy policy</LegalLink> explains. I can withdraw this at any time in Profile, then Privacy.</>)}
        {box(terms, setTerms, 'c_terms', <>I accept the <LegalLink id="terms">terms and conditions</LegalLink>, and understand Tali gives general wellness information, not medical advice.</>)}
        {box(adult, setAdult, 'c_age', <>I’m {MIN_AGE} or over.</>)}
      </div>

      <button className="btn" disabled={!(health && terms && adult)} onClick={() => { grantConsent('health'); if (fromProfile) setConsentOpen(false) }}>Continue</button>
      {fromProfile ? (
        <button className="btn gray" onClick={() => setConsentOpen(false)}>Back</button>
      ) : existing ? (
        <>
          <button className="btn gray" onClick={notNow}>Not now, keep it on this phone</button>
          <div className="foot">
            Until you agree, nothing you log syncs to your account or is backed up there. {unconsentedCopyLine()}{' '}
            {reasked ? 'We won’t ask again: you can agree any time in Profile, then Privacy.' : 'We’ll ask once more in 2 weeks.'}
          </div>
          <button type="button" className="linkbtn muted" onClick={() => signOut()}>Sign out</button>
        </>
      ) : (
        <button className="btn gray" onClick={() => signOut()}>Not now, sign out</button>
      )}
      <div className="foot">
        Already have data in Tali and would rather it was deleted? Email {LEGAL.contactEmail} and we’ll delete your account.
      </div>
      <div className="foot">
        If you’re pregnant, have a medical condition, or have had an eating disorder, talk to a GP before using Tali to guide your eating.
      </div>
    </div>
  )
}
