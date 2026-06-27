import { useState } from 'react'
import { supabase } from '@/data/supabase'
import { useStore } from '@/store/store'

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email'

const redirect = () => window.location.origin + window.location.pathname

export function AuthScreen() {
  const continueAsGuest = useStore((s) => s.continueAsGuest)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr('')
    if (mode === 'forgot') {
      if (!email) return setErr('Please enter your email.')
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() })
      setBusy(false)
      if (error) return setErr(error.message)
      return setMode('check-email')
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
      return setMode('check-email')
    }
    // signin
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setErr(error.message)
  }

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } })
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 22px calc(28px + env(safe-area-inset-bottom))',
        maxWidth: 460,
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 34 }}>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px' }}>Tali</div>
        <div className="mono" style={{ marginTop: 6 }}>
          eat well · move often · feel better
        </div>
      </div>

      {mode === 'check-email' ? (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Check your email</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px' }}>
            We sent a link to your inbox. Click it to continue.
          </p>
          <button className="btn ghost" onClick={() => setMode('signin')}>
            Back to sign in
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 18px', letterSpacing: '-0.4px' }}>
            {mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Welcome back'}
          </h2>

          {err && (
            <div
              style={{
                background: 'rgba(224,101,77,.12)',
                border: '1px solid var(--over)',
                color: 'var(--over)',
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              {err}
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="field">
              <label>Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
          )}

          <button className="btn" disabled={busy} onClick={submit}>
            {busy
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Sign in'}
          </button>

          {mode === 'signin' && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button className="pill" style={{ background: 'none', color: 'var(--accent)' }} onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '16px 0',
                  color: 'var(--muted)',
                  fontSize: 12,
                }}
              >
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                or
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
              <button className="btn ghost" onClick={google}>
                Continue with Google
              </button>
              <button
                className="pill"
                style={{ display: 'block', margin: '16px auto 0', background: 'none', color: 'var(--muted)' }}
                onClick={continueAsGuest}
              >
                Continue without an account
              </button>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            {mode === 'forgot' ? (
              <button className="pill" style={{ background: 'none', color: 'var(--accent)' }} onClick={() => setMode('signin')}>
                Back to sign in
              </button>
            ) : (
              <>
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <button
                  className="pill"
                  style={{ background: 'none', color: 'var(--accent)' }}
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                >
                  {mode === 'signup' ? 'Sign in' : 'Sign up'}
                </button>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
