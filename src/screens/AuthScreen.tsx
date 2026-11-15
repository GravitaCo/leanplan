import { useState } from 'react'
import { exportBackup } from '@/data/backup'
import { unsyncedCount } from '@/data/persistence'
import { consentLetsSync, hasExistingData } from '@/data/consent'
import { LEGAL_URLS, MIN_AGE } from '@/core/legal'
import { supabase } from '@/data/supabase'
import { useStore } from '@/store/store'
import { TaliMark } from '@/ui/brand'
import { Icon } from '@/ui/icons'
import { AUTH, OWNER } from '@/copy/account'

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email'

const redirect = () => window.location.origin + window.location.pathname

export function AuthScreen() {
  const [mode, setModeRaw] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // what the last email was for, so "send it again" repeats the right one
  const [sentFor, setSentFor] = useState<'signup' | 'forgot'>('signup')
  const [resent, setResent] = useState(false)
  const beginSignIn = useStore((st) => st.beginSignIn)
  const notice = useStore((st) => st.authNotice)
  const setMode = (m: Mode) => {
    setErr('')
    setModeRaw(m)
  }

  async function submit() {
    setErr('')
    beginSignIn()
    if (mode === 'forgot') {
      if (!email) return setErr(AUTH.errEmail)
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() })
      setBusy(false)
      if (error) return setErr(error.message)
      setSentFor('forgot')
      setModeRaw('check-email')
      return
    }
    if (!email || !pw) return setErr(AUTH.errFields)
    if (mode === 'signup') {
      if (pw !== pw2) return setErr(AUTH.errMatch)
      if (pw.length < 8) return setErr(AUTH.errShort)
      setBusy(true)
      const { error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo: redirect() },
      })
      setBusy(false)
      if (error) return setErr(error.message)
      setSentFor('signup')
      setModeRaw('check-email')
      return
    }
    // signin
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setErr(error.message)
  }

  async function google() {
    beginSignIn()
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } })
  }

  async function resend() {
    if (busy || !email) return
    setErr('')
    setBusy(true)
    const { error } = sentFor === 'forgot'
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() })
      : await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirect() } })
    setBusy(false)
    if (!error) return setResent(true)
    setResent(false)
    setErr(error.status === 429 || /rate|security purposes/i.test(error.message) ? AUTH.errRate : error.message)
  }

  const copy = AUTH.modes[mode]

  return (
    <div className={'auth2 m-' + mode}>
      <div className="auth2-photo">
        <img src="images/auth-hero.jpg" alt="" />
        <TaliMark width={76} />
      </div>

      <div className="auth2-panel">
        {notice && mode !== 'check-email' && <div className="banner" role="status">{notice}</div>}

        {mode === 'check-email' ? (
          <>
            <div className="auth2-ico"><Icon name="mail" /></div>
            <div>
              <h1 className="auth2-t">{copy.t}</h1>
              <p className="auth2-s">{AUTH.sent(email)}</p>
            </div>
            {err && <div className="auth-err" role="alert">{err}</div>}
            <button className="btn gray" onClick={() => { setResent(false); setMode('signin') }}>{AUTH.back}</button>
            <p className="auth2-foot" role="status">
              {resent ? AUTH.resentLead : AUTH.resendLead}
              <button type="button" className="linkbtn" disabled={busy} onClick={resend}>{resent ? AUTH.sendAnother : AUTH.sendAgain}</button>{resent ? '' : '.'}
            </p>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (!busy) submit()
            }}
          >
            <div>
              <h1 className="auth2-t">{copy.t}</h1>
              <p className="auth2-s">{copy.s}</p>
            </div>

            <div className="auth2-fields">
              <div className="auth2-f">
                <label htmlFor="auth-email">{AUTH.email}</label>
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder={AUTH.emailPlaceholder}
                />
              </div>
              {mode !== 'forgot' && (
                <div className={'auth2-f' + (mode === 'signin' ? ' has-forgot' : '')}>
                  <label htmlFor="auth-pw">{AUTH.password}</label>
                  <input
                    id="auth-pw"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder={mode === 'signup' ? AUTH.passwordNew : AUTH.passwordCurrent}
                  />
                  {mode === 'signin' && (
                    <button type="button" className="auth2-forgot" onClick={() => setMode('forgot')}>{AUTH.forgot}</button>
                  )}
                </div>
              )}
              {mode === 'signup' && (
                <div className="auth2-f">
                  <label htmlFor="auth-pw2">{AUTH.confirm}</label>
                  <input
                    id="auth-pw2"
                    type="password"
                    autoComplete="new-password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder={AUTH.confirmPlaceholder}
                  />
                </div>
              )}
            </div>

            {err && (
              <div className="auth-err" role="alert">
                {err}
              </div>
            )}

            <button type="submit" className="btn auth2-go" disabled={busy}>
              {busy ? AUTH.wait : <>{copy.cta}<Arrow /></>}
            </button>

            {mode !== 'forgot' && (
              <>
                {mode === 'signin' && <div className="auth-or">{AUTH.or}</div>}
                <button type="button" className="btn auth2-google" onClick={google}>
                  <GoogleG />
                  {AUTH.google}
                </button>
              </>
            )}

            {mode === 'signup' && (
              <p className="auth2-legal">
                {AUTH.legal.lead(MIN_AGE)}
                <a href={LEGAL_URLS.terms} target="_blank" rel="noopener noreferrer">{AUTH.legal.terms}</a>{AUTH.legal.and}
                <a href={LEGAL_URLS.privacy} target="_blank" rel="noopener noreferrer">{AUTH.legal.privacy}</a>{AUTH.legal.after}
              </p>
            )}

            <p className="auth2-foot">
              {mode === 'forgot' ? (
                <button type="button" className="linkbtn" onClick={() => setMode('signin')}>{AUTH.back}</button>
              ) : (
                <>
                  {mode === 'signup' ? AUTH.haveAccount : AUTH.newHere}{' '}
                  <button type="button" className="linkbtn" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
                    {mode === 'signup' ? AUTH.toSignIn : AUTH.toSignUp}
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/**
 * Shown after signing in when this device holds data that may belong to another account (a
 * shared phone). Nothing from that data shows, syncs or exports until the user picks one; if it
 * is theirs from another account, they sign in to that one to get it.
 */
export function OwnerChoiceScreen() {
  const ask = useStore((st) => st.ownerAsk)
  const resolveOwner = useStore((st) => st.resolveOwner)
  const [busy, setBusy] = useState(false)
  const data = useStore((st) => st.data)
  // the log here that "Start fresh" would remove: changes never uploaded, or a log kept on this phone only
  const atRisk = unsyncedCount(data) > 0 || (!consentLetsSync(data) && hasExistingData(data))
  const [sure, setSure] = useState(false)
  const who = ask?.email || OWNER.thisAccount
  const pick = async (c: 'keep' | 'fresh' | 'cancel') => {
    if (busy) return
    if (c === 'fresh' && atRisk && !sure) { setSure(true); return } // losing a log takes a second tap
    setBusy(true)
    try { await resolveOwner(c) } finally { setBusy(false) }
  }
  return (
    <div className="auth auth-owner">
      <div className="auth-brand">
        <TaliMark width={112} />
        <h1>Tilo</h1>
        <p>{OWNER.signedInAs(who)}</p>
      </div>
      {ask?.checking ? (
        <div className="card prose" role="status">{OWNER.checking}</div>
      ) : (
        <>
          <h2 className="auth-t">{OWNER.title}</h2>
          <div className="card prose">
            <p>{OWNER.p1(who)}</p>
            <p>{OWNER.p2(who)}</p>
            <p style={{ margin: 0 }}>{OWNER.p3(who)}</p>
          </div>
          {sure && (
            <div className="card prose" role="alert">
              <p style={{ margin: 0 }}>{OWNER.sure}</p>
            </div>
          )}
          {sure && <button className="btn gray" disabled={busy} onClick={() => exportBackup(data)}>{OWNER.exportCopy}</button>}
          <button className="btn" disabled={busy} onClick={() => pick('fresh')}>{sure ? OWNER.freshSure : OWNER.fresh(who)}</button>
          <button className="btn gray" disabled={busy} onClick={() => pick('keep')}>{OWNER.keep(who)}</button>
        </>
      )}
      <div className="auth-links">
        <button type="button" className="linkbtn muted" disabled={busy} onClick={() => pick('cancel')}>{OWNER.cancel}</button>
      </div>
    </div>
  )
}

/** Google's multicolour "G", as its sign-in branding guidelines ask for on this button. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
