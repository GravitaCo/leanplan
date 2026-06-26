/** Small presentational primitives shared across screens. */
import type { ReactNode } from 'react'

export function ProgressBar({
  pct,
  variant = '',
  height = 11,
  track = 'rgba(255,255,255,.1)',
}: {
  pct: number
  variant?: '' | 'warn' | 'over'
  height?: number
  track?: string
}) {
  const color = variant === 'over' ? 'var(--over)' : variant === 'warn' ? 'var(--warn)' : 'var(--accent)'
  return (
    <div style={{ height, background: track, borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: Math.min(100, Math.max(0, pct)) + '%',
          background: color,
          borderRadius: 8,
          transition: 'width .35s',
        }}
      />
    </div>
  )
}

export function MacroBlock({
  label,
  value,
  goal,
  unit = 'g',
  color,
}: {
  label: string
  value: number
  goal: number
  unit?: string
  color: string
}) {
  const pct = Math.min(100, goal ? (value / goal) * 100 : 0)
  return (
    <div style={{ background: 'var(--card-2)', borderRadius: 14, padding: '12px 11px' }}>
      <div className="mono" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>
        {Math.round(value)}
        <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>
          {' '}
          / {goal}
          {unit}
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        background: on ? 'var(--accent)' : 'rgba(255,255,255,.12)',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'background .18s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: on ? '#fff' : '#8a8884',
          transition: 'left .18s ease',
        }}
      />
    </div>
  )
}

export function CheckRow({
  on,
  label,
  sublabel,
  onClick,
}: {
  on: boolean
  label: string
  sublabel?: string
  onClick: () => void
}) {
  return (
    <div
      className="row"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: on ? 'var(--accent)' : 'transparent',
          border: on ? '2px solid var(--accent)' : '2px solid var(--line-strong)',
          color: '#fff',
        }}
      >
        {on ? '✓' : ''}
      </div>
      <div className="grow">
        <div
          className="name"
          style={{ color: on ? 'var(--muted)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}
        >
          {label}
        </div>
        {sublabel ? <div className="meta">{sublabel}</div> : null}
      </div>
    </div>
  )
}

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(0,0,0,.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'var(--bg)',
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTop: '1px solid var(--line-strong)',
          padding: '10px 18px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 2,
            background: 'var(--line-strong)',
            margin: '6px auto 14px',
          }}
        />
        {children}
      </div>
    </div>
  )
}
