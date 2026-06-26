import { useStore } from '@/store/store'

/** Temporary screen for tabs not yet migrated in this phase (Plan, Profile). */
export function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  const signOut = useStore((s) => s.signOut)
  const email = useStore((s) => s.email)

  return (
    <div className="screen">
      <div className="page-hdr">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{subtitle}</div>
      </div>

      {title === 'Profile' && (
        <div className="card">
          <div className="mono" style={{ marginBottom: 6 }}>
            Signed in as
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{email || '—'}</div>
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
