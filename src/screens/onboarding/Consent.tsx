/**
 * Consent screens (Design canvas row "Onboarding 6", note s-ob6; onboarding plan §8, §12–14):
 * ob6-1 health data, ob6-2 AI features (names Anthropic), ob6-3 the one-time sheet for people who
 * used Tali before consent was asked, and ob6-4 the "Build my plan" card on Plan.
 *
 * The first-run entry (ob6-1 → ob6-2) and the Build my plan card only show behind
 * ONBOARDING_ENABLED: the wizard they lead into ships later. The existing-user sheet (ob6-3) goes
 * with them, since it belongs to the same rollout. A build with VITE_ONBOARDING=1 turns them on
 * (for the headless tests only).
 */
import { useState, type ReactNode } from 'react'
import { LegalLink } from '../legal/LegalDoc'
import { useStore } from '@/store/store'
import { existingConsentDue, latestConsent, unconsentedCopyLine } from '@/data/consent'
import type { PersistedState } from '@/data/persistence'
import { BareSheet, Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'

export const ONBOARDING_ENABLED: boolean = false || import.meta.env?.VITE_ONBOARDING === '1'

/* ---------------- when each one shows ---------------- */

/**
 * First run: nothing answered for health yet, and nothing on this device from before (someone
 * new). A second device of someone who already answered doesn't ask again (plan §12): until an
 * answer is here, sync reads only consent records (store scheduleSync), and one pulled from
 * another device moves this screen on. (It no longer waits for the first full pull: that pull now
 * waits for the answer.) `online` is kept for the callers.
 */
export function firstRunDue(s: PersistedState, _online: boolean): boolean {
  if (!ONBOARDING_ENABLED) return false
  return !latestConsent(s, 'health') && !existingConsentDue(s) && !s.consents?.healthPause
}

/** The existing-user sheet (ob6-3) is due (behind ONBOARDING_ENABLED; see firstRunDue on pulls). */
export function existingDue(s: PersistedState, _online: boolean): boolean {
  if (!ONBOARDING_ENABLED) return false
  return existingConsentDue(s)
}

/* ---------------- shared pieces ---------------- */

/** The card of ticked lines on each consent screen. */
export function Ticks({ items, tight }: { items: string[]; tight?: boolean }) {
  return (
    <section className={'ticks' + (tight ? ' tight' : '')}>
      <ul>
        {items.map((t) => <li key={t}><Icon name="check" size={16} stroke={2.6} /><span>{t}</span></li>)}
      </ul>
    </section>
  )
}

export const HEALTH_TICKS = [
  'It’s private to your account. Nobody else can see it.',
  'It’s never sold or used for ads.',
  'Download it or delete it any time in Profile.',
  'Saved on this phone first, so this works offline too.',
]
export const AI_TICKS = [
  'Nothing is sent unless you use one of these features.',
  'Everything else in Tali works without it, offline too.',
  'Turn it off any time in Profile.',
]

/** "Read the privacy notice" / "What's sent, and where": the privacy text Tali has today
 *  (the full notice is still to be written, plan §8). */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Privacy" onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="prose sub" style={{ padding: '0 4px' }}>
        <p>Your log is stored on this phone and, once you agree, synced to a private database tied to your account. It’s never sold or used for ads.</p>
        <p style={{ margin: 0 }}>The full details are in the <LegalLink id="privacy">privacy policy</LegalLink>.</p>
      </div>
    </Sheet>
  )
}

function Screen({ eyebrow, title, lead, children, cta }: { eyebrow: string; title: string; lead: string; children: ReactNode; cta: ReactNode }) {
  return (
    <div className="ob">
      <div className="ob-eyebrow">{eyebrow}</div>
      <h1 className="ob-title">{title}</h1>
      <div className="ob-lead">{lead}</div>
      {children}
      <div className="ob-cta">{cta}</div>
    </div>
  )
}

/* ---------------- ob6-1 health data ---------------- */

export function HealthConsentScreen() {
  const grant = useStore((s) => s.grantConsent)
  const decline = useStore((s) => s.declineConsent)
  const [agree, setAgree] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  return (
    <Screen eyebrow="Before we start" title="Your health data"
      lead="To build your plan, Tali asks about things like your weight, sleep, stress and health. That's health data, so we need your OK to keep it."
      cta={<>
        {/* "Not now" isn't on board ob6-1 (the gap in note s-ob6); added per Benn's decision (plan §14) */}
        <button className="btn ob-btn" disabled={!agree} onClick={() => grant('health')}>Continue</button>
        <button className="linkbtn ob-alt" onClick={() => decline('health')}>Not now</button>
      </>}>
      <Ticks items={HEALTH_TICKS} />
      <label className="agree">
        <input type="checkbox" className="sr" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span className={'agree-box' + (agree ? ' on' : '')} aria-hidden="true">{agree && <Icon name="check" size={14} stroke={2.6} />}</span>
        <span>I agree to Tali keeping my health data to build my plan and targets.</span>
      </label>
      <button className="linkbtn ob-link" onClick={() => setPrivacy(true)}>Read the privacy notice</button>
      {privacy && <PrivacySheet onClose={() => setPrivacy(false)} />}
    </Screen>
  )
}

/* ---------------- ob6-2 AI features ---------------- */

export function AiConsentScreen() {
  const grant = useStore((s) => s.grantConsent)
  const decline = useStore((s) => s.declineConsent)
  const [privacy, setPrivacy] = useState(false)
  return (
    <Screen eyebrow="Optional" title="AI features"
      lead="Some features, like reading a food label from a photo or describing a meal in words, send what you share to Anthropic, the company that makes the AI Tali uses."
      cta={<>
        <button className="btn ob-btn" onClick={() => grant('ai')}>Turn on AI features</button>
        <button className="linkbtn ob-alt" onClick={() => decline('ai')}>Not now</button>
      </>}>
      <Ticks items={AI_TICKS} />
      <button className="linkbtn ob-link" onClick={() => setPrivacy(true)}>What's sent, and where</button>
      {privacy && <PrivacySheet onClose={() => setPrivacy(false)} />}
    </Screen>
  )
}

/** The first-run consent step, full screen, before the app (behind ONBOARDING_ENABLED). */
export function FirstRunConsent({ step }: { step: 'health' | 'ai' }) {
  return step === 'health' ? <HealthConsentScreen /> : <AiConsentScreen />
}

/* ---------------- ob6-3 existing users, once ---------------- */

/** Due when existingConsentDue says so (and ONBOARDING_ENABLED). Dismissing it counts as Not now. */
export function ExistingConsentSheet() {
  const grant = useStore((s) => s.grantConsent)
  const notNow = useStore((s) => s.notNowHealth)
  // the first time, a "Not now" leads to one more ask in 2 weeks; at that re-ask it doesn't
  const first = useStore((s) => !s.data.consents?.healthPause)
  return (
    <BareSheet label="Is it OK to keep your health data?" onClose={notNow} className="consent">
      <h2 className="cs-t">Is it OK to keep your health data?</h2>
      <div className="cs-lead">We now ask before keeping things like your weight, check-ins and training notes. You already have some in Tali. Nothing about your week or targets changes.</div>
      <Ticks tight items={['Private to your account, never sold or used for ads.', 'Download or delete it any time in Profile.']} />
      <button className="btn ob-btn" onClick={() => grant('health')}>Yes, keep it</button>
      <button className="linkbtn ob-alt" onClick={notNow}>Not now</button>
      <div className="cs-foot">New health data stays on this phone. {unconsentedCopyLine()}{first ? ' We’ll ask once more in 2 weeks.' : ''}</div>
    </BareSheet>
  )
}

/* ---------------- ob6-4 Build my plan ---------------- */

/** On Plan, above the week (behind ONBOARDING_ENABLED). The wizard it opens ships later. */
export function BuildPlanCard({ onBuild }: { onBuild?: () => void }) {
  return (
    <section className="card buildplan" aria-label="Build my plan">
      <div className="bp-new">New</div>
      <div className="bp-t">Build my plan</div>
      <div className="bp-s">Answer a few questions about your time, kit and what you enjoy, and Tali builds a week from your answers. Your current week stays until you choose.</div>
      <button className="btn gray bp-btn" onClick={onBuild}>Build my plan</button>
    </section>
  )
}
