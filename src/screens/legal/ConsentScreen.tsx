import { useState, type ReactNode } from 'react'
import { LEGAL, MIN_AGE } from '@/core/legal'
import { useStore } from '@/store/store'
import { hasExistingData, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { LegalLink } from './LegalDoc'
import { CONSENT } from '@/copy/account'

/**
 * Explicit consent before Tilo stores anyone's health data (UK/EU GDPR Art. 9(2)(a)). Shown after
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
  // someone who used Tilo before consent was asked may say "Not now": everything stays on this
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
      <h1>{CONSENT.title}</h1>
      <p className="sub">{CONSENT.lead}</p>

      <div className="list">
        {box(health, setHealth, 'c_health', <>{CONSENT.health.before}<LegalLink id="privacy">{CONSENT.health.link}</LegalLink>{CONSENT.health.after}</>)}
        {box(terms, setTerms, 'c_terms', <>{CONSENT.terms.before}<LegalLink id="terms">{CONSENT.terms.link}</LegalLink>{CONSENT.terms.after}</>)}
        {box(adult, setAdult, 'c_age', <>{CONSENT.adult(MIN_AGE)}</>)}
      </div>

      <button className="btn" disabled={!(health && terms && adult)} onClick={() => { grantConsent('health'); if (fromProfile) setConsentOpen(false) }}>{CONSENT.cont}</button>
      {fromProfile ? (
        <button className="btn gray" onClick={() => setConsentOpen(false)}>{CONSENT.back}</button>
      ) : existing ? (
        <>
          <button className="btn gray" onClick={notNow}>{CONSENT.notNowKeep}</button>
          <div className="foot">
            {CONSENT.notNowFoot} {unconsentedCopyLine()}{' '}
            {reasked ? CONSENT.reasked : CONSENT.askAgain}
          </div>
          <button type="button" className="linkbtn muted" onClick={() => signOut()}>{CONSENT.signOut}</button>
        </>
      ) : (
        <button className="btn gray" onClick={() => signOut()}>{CONSENT.notNowSignOut}</button>
      )}
      <div className="foot">
        {CONSENT.deleteFoot(LEGAL.contactEmail)}
      </div>
      <div className="foot">
        {CONSENT.gpFoot}
      </div>
    </div>
  )
}
