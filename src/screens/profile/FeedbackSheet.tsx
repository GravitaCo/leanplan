/**
 * Tester feedback, one step at a time: each key area (a quick rating and an optional note), then
 * what they'd like to see, then a review. Sending opens the tester's email app with it all filled
 * in, addressed to Benn; Copy is there for a phone without a mail app. Every question can be skipped.
 * Closing the sheet by accident keeps the answers for next time; they clear once it's sent.
 */
import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { FEEDBACK_AREAS, FEEDBACK_RATINGS, FEEDBACK_TO, feedbackEmail, feedbackMailto, hasFeedback, type FeedbackAnswers } from '@/core/domain/feedback'
import { BackButton, Sheet } from '@/ui/primitives'

const STEPS = FEEDBACK_AREAS.length + 3 // intro, the areas, open questions, review
const EMPTY: FeedbackAnswers = { areas: {}, wishes: '', other: '' }
// the unsent draft, kept while the app is open (a stray tap on the backdrop shouldn't lose it)
let draft: { step: number; a: FeedbackAnswers } = { step: 0, a: EMPTY }

export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState(draft.step)
  const [a, setA] = useState<FeedbackAnswers>(draft.a)
  useEffect(() => { draft = { step, a } }, [step, a])
  // each step starts at the top of the sheet
  useEffect(() => { document.querySelector('.sheet .sheet-bd')?.scrollTo(0, 0) }, [step])
  const [opened, setOpened] = useState(false)
  const [version, setVersion] = useState<string>()
  // the service worker's cache name is the deployed version (tali-vNN)
  useEffect(() => {
    if (typeof caches === 'undefined') return
    caches.keys().then((k) => setVersion(k.find((x) => x.startsWith('tali-')))).catch(() => {})
  }, [])

  const email = feedbackEmail(a, { version, device: navigator.userAgent })
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => { setOpened(false); setStep((s) => Math.max(0, s - 1)) }
  const area = step >= 1 && step <= FEEDBACK_AREAS.length ? FEEDBACK_AREAS[step - 1] : null
  const cur = area ? a.areas[area.id] ?? {} : {}
  const setArea = (patch: { rating?: (typeof FEEDBACK_RATINGS)[number]; note?: string }) =>
    area && setA((x) => ({ ...x, areas: { ...x.areas, [area.id]: { ...x.areas[area.id], ...patch } } }))
  const copy = async () => {
    try { await navigator.clipboard.writeText(email.body); showToast('Copied. Paste it into an email to ' + FEEDBACK_TO) }
    catch { showToast('Couldn’t copy on this device') }
  }
  const ready = hasFeedback(a)

  return (
    <Sheet title="Feedback" tall onClose={onClose} left={step > 0 ? <BackButton onClick={back} /> : undefined}
      right={step > 0 ? <span className="sub num">{step} of {STEPS - 1}</span> : undefined}>
      {step === 0 && (
        <div className="prose">
          <p className="fb-q">Help shape Tali</p>
          <p className="sub">A few quick questions about each part of the app, then what you’d like to see next. It takes about two minutes, and you can skip anything.</p>
          <p className="sub">Your answers go to {FEEDBACK_TO} from your own email app, so you’ll see exactly what’s sent.</p>
        </div>
      )}

      {area && (
        <>
          <p className="fb-q" id="fb-q">{area.question}</p>
          <div className="foot" style={{ padding: '0 0 12px' }}>{area.hint}</div>
          <div className="scale" role="radiogroup" aria-labelledby="fb-q" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {FEEDBACK_RATINGS.map((r) => (
              <button key={r} role="radio" className={cur.rating === r ? 'on' : ''} aria-checked={cur.rating === r}
                onClick={() => setArea({ rating: cur.rating === r ? undefined : r })}>{r}</button>
            ))}
          </div>
          <label className="lbl" htmlFor="fb-note" style={{ display: 'block' }}>What worked, or what got in the way?</label>
          <textarea id="fb-note" rows={4} value={cur.note ?? ''} placeholder="Optional" onChange={(e) => setArea({ note: e.target.value })} />
        </>
      )}

      {step === FEEDBACK_AREAS.length + 1 && (
        <>
          <label className="fb-q" htmlFor="fb-wishes" style={{ display: 'block' }}>What would you like to see in Tali?</label>
          <div className="foot" style={{ padding: '0 0 12px' }}>Features, foods, workouts, anything that would make it more useful for you.</div>
          <textarea id="fb-wishes" rows={5} value={a.wishes} placeholder="Optional" onChange={(e) => setA({ ...a, wishes: e.target.value })} />
          <label className="lbl" htmlFor="fb-other" style={{ display: 'block' }}>Anything else?</label>
          <textarea id="fb-other" rows={3} value={a.other} placeholder="Optional" onChange={(e) => setA({ ...a, other: e.target.value })} />
        </>
      )}

      {step === STEPS - 1 && (
        <>
          <p className="fb-q">Ready to send</p>
          <div className="card fb-preview">{email.body}</div>
          {opened ? (
            <div className="foot" style={{ padding: '0 0 12px' }}>Your email app should now be open with this ready to send. Didn’t open? Copy it instead and paste it into an email to {FEEDBACK_TO}.</div>
          ) : (
            <div className="foot" style={{ padding: '0 0 12px' }}>
              {ready ? `Opens your email app, addressed to ${FEEDBACK_TO}.` : 'Answer at least one question to send.'} The app version and device type are included to help track down bugs.
            </div>
          )}
          <div className="stack">
            {opened
              ? <button className="btn" onClick={() => { draft = { step: 0, a: EMPTY }; onClose() }}>Done</button>
              : <button className="btn" disabled={!ready} onClick={() => { window.location.href = feedbackMailto(email); setOpened(true); draft = { step: 0, a: EMPTY } }}>Send by email</button>}
            <button className="btn gray" disabled={!ready} onClick={copy}>Copy instead</button>
          </div>
        </>
      )}

      {step < STEPS - 1 && <div className="sheet-cta"><button className="btn" onClick={next}>{step === 0 ? 'Start' : 'Next'}</button></div>}
    </Sheet>
  )
}
