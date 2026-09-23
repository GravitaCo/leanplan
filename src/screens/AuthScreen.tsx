import { useState } from 'react'
import { supabase } from '@/data/supabase'
import { useStore } from '@/store/store'
import { TaliIcon } from '@/ui/brand'
import { Icon } from '@/ui/icons'

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email'

const redirect = () => window.location.origin + window.location.pathname

export function AuthScreen() {
  const continueAsGuest = useStore((s) => s.continueAsGuest)
  const [mode, setModeRaw] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
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
      if (!email) return setErr('Please enter your email.')
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() })
      setBusy(false)
      if (error) return setErr(error.message)
      setModeRaw('check-email')
      return
    }
    if (!email || !pw) return setErr('Please fill in all fields.')
    if (mode === 'signup') {
      if (pw !== pw2) return setErr('Passwords do not match.')
      if (pw.length < 8) return setErr('Password must be at least 8 characters.')
      setBusy(true)
      const { error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo: redirect() },
      })
      setBusy(false)
      if (error) return setErr(error.message)
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

  const title = mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Welcome back'

  return (
    <div className="auth">
      <div className="auth-brand">
        <TaliIcon size={88} />
        <h1>Tali</h1>
        <p>Eat well, move often, feel better.</p>
      </div>

      {notice && mode !== 'check-email' && <div className="banner" role="status">{notice}</div>}

      {mode === 'check-email' ? (
        <div className="card auth-check">
          <div className="ico">
            <Icon name="mail" />
          </div>
          <h2>Check your email</h2>
          <p>We sent a link to your inbox. Open it to continue.</p>
          <button className="btn gray" onClick={() => setMode('signin')}>
            Back to sign in
          </button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) submit()
          }}
        >
          <h2 className="auth-t">{title}</h2>

          <div className="list">
            <div className="frow">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder="you@example.com"
              />
            </div>
            {mode !== 'forgot' && (
              <div className="frow">
                <label htmlFor="auth-pw">Password</label>
                <input
                  id="auth-pw"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Required'}
                />
              </div>
            )}
            {mode === 'signup' && (
              <div className="frow">
                <label htmlFor="auth-pw2">Confirm</label>
                <input
                  id="auth-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
            )}
          </div>

          {err && (
            <div className="auth-err" role="alert">
              {err}
            </div>
          )}

          <button type="submit" className="btn" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Sign in'}
          </button>

          {mode !== 'forgot' && (
            <>
              <div className="auth-or">or</div>
              <button type="button" className="btn gray" onClick={google}>
                <GoogleG />
                Continue with Google
              </button>
            </>
          )}

          <div className="auth-links">
            {mode === 'signin' && (
              <button type="button" className="linkbtn" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            )}
            {mode === 'forgot' ? (
              <button type="button" className="linkbtn" onClick={() => setMode('signin')}>
                Back to sign in
              </button>
            ) : (
              <span>
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  className="linkbtn"
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                >
                  {mode === 'signup' ? 'Sign in' : 'Sign up'}
                </button>
              </span>
            )}
            {mode !== 'forgot' && (
              <button type="button" className="linkbtn muted" onClick={continueAsGuest}>
                Continue without an account
              </button>
            )}
          </div>
        </form>
      )}
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
