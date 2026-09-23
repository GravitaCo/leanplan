import { useState, type ReactNode } from 'react'
import { MIN_AGE, type LegalDocId } from '@/core/legal'
import { useStore } from '@/store/store'
import { LegalSheet } from './LegalDoc'

/**
 * Explicit consent before Tali processes anyone's health data (UK/EU GDPR Art. 9(2)(a)).
 * Each statement is its own unticked box: consent has to be a clear, specific action,
 * never pre-ticked or bundled. Works offline: the record saves on the device first.
 */
export function ConsentScreen() {
  const authed = useStore((s) => s.authed)
  const syncPaused = useStore((s) => s.syncPaused)
  const acceptConsent = useStore((s) => s.acceptConsent)
  const signOut = useStore((s) => s.signOut)
  const [adult, setAdult] = useState(false)
  const [health, setHealth] = useState(false)
  const [terms, setTerms] = useState(false)
  const [doc, setDoc] = useState<LegalDocId | null>(null)
  const account = authed || syncPaused

  const link = (id: LegalDocId, label: string) => (
    <button type="button" className="navbtn" style={{ fontSize: 'inherit', padding: 0, display: 'inline' }}
      onClick={(e) => { e.preventDefault(); setDoc(id) }}>{label}</button>
  )
  const box = (on: boolean, set: (v: boolean) => void, id: string, children: ReactNode) => (
    <div className="li" style={{ alignItems: 'flex-start', gap: 12, padding: '12px 16px' }}>
      <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)}
        style={{ width: 22, height: 22, flex: '0 0 22px', marginTop: 1, padding: 0, accentColor: 'var(--tint)', WebkitAppearance: 'checkbox', appearance: 'auto' }} />
      <label htmlFor={id} style={{ flex: 1, fontSize: 15, lineHeight: 1.4 }}>{children}</label>
    </div>
  )

  return (
    <div className="screen" style={{ maxWidth: 520, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 24, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Before you start</h1>
      <p className="sub" style={{ margin: '0 0 16px', lineHeight: 1.45 }}>
        What you log in Tali, like weight, food, workouts, injuries and mood, is health information.
        {account
          ? ' It’s stored on this device and in your private account database in Ireland (EU), which only you can read.'
          : ' Without an account it stays on this device and never reaches us.'}
        {' '}It’s never sold, shared for marketing or used for ads.
      </p>

      <div className="list">
        {box(health, setHealth, 'c_health', <>I agree to Tali storing and using my health information to run the app for me, as the {link('privacy', 'privacy policy')} explains. I can withdraw this at any time by deleting my data in Profile.</>)}
        {box(terms, setTerms, 'c_terms', <>I accept the {link('terms', 'terms of use')}, and understand Tali gives general wellness information, not medical advice.</>)}
        {box(adult, setAdult, 'c_age', <>I’m {MIN_AGE} or over.</>)}
      </div>

      <button className="btn" style={{ marginTop: 16 }} disabled={!(adult && health && terms)} onClick={acceptConsent}>Continue</button>
      <button className="btn danger" style={{ marginTop: 6 }} onClick={signOut}>{account ? 'Not now, sign out' : 'Not now'}</button>
      <div className="foot" style={{ textAlign: 'center' }}>
        If you’re pregnant, have a medical condition, or have had an eating disorder, talk to a GP before using Tali to guide your eating.
      </div>

      {doc && <LegalSheet id={doc} onClose={() => setDoc(null)} />}
    </div>
  )
}
