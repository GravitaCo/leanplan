import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { SESSIONS, LIFTS } from '@/core/data/workouts'

const DAYS: [string, number][] = [
  ['Monday', 1],
  ['Tuesday', 2],
  ['Wednesday', 3],
  ['Thursday', 4],
  ['Friday', 5],
  ['Saturday', 6],
  ['Sunday', 0],
]

function badge(v: string): { label: string; bg: string; color: string } {
  if (LIFTS.includes(v as WorkoutType)) return { label: 'Lift', bg: 'var(--card-2)', color: 'var(--ink)' }
  if (v === 'Cardio') return { label: 'Cardio', bg: 'rgba(232,163,77,.15)', color: 'var(--carbs)' }
  return { label: 'Rest', bg: 'var(--card-2)', color: 'var(--muted)' }
}

export function PlanScreen() {
  const schedule = useStore((s) => s.data.schedule)
  const setScheduleDay = useStore((s) => s.setScheduleDay)

  return (
    <div className="screen">
      <div className="page-hdr">
        <h1 className="page-title">Plan</h1>
      </div>

      <div className="section-label">Your weekly schedule</div>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Set any day to whatever you like. This is your recurring plan, and the Train tab opens to whatever's set here
          each day.
        </div>
        {DAYS.map(([name, idx]) => {
          const v = schedule[idx] || 'Rest'
          const b = badge(v)
          return (
            <div
              key={idx}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ width: 42, fontWeight: 800, fontSize: 13 }}>{name.slice(0, 3)}</div>
              <div style={{ flex: 1 }}>
                <select value={v} onChange={(e) => setScheduleDay(idx, e.target.value as WorkoutType | 'Rest')}>
                  {SESSIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === 'Legs' ? 'Legs & Core' : s}
                    </option>
                  ))}
                </select>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: b.bg,
                  color: b.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {b.label}
              </span>
            </div>
          )
        })}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
          Aim for 3 lifts a week with a rest day between where you can, so a muscle group recovers before you train it
          again. Daily steps (~7,000–10,000) burn more over a week than the gym sessions do.
        </div>
      </div>

      <div className="section-label">How the split works</div>
      <div className="card" style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' }}>
        <p style={{ marginTop: 0 }}>
          Lifts rotate best as <b>Legs → Push → Pull</b> so back-to-back sessions hit different muscles.
        </p>
        <p style={{ marginBottom: 0, color: 'var(--muted)', fontSize: 13 }}>
          <b style={{ color: 'var(--ink)' }}>Legs &amp; Core</b> — leg press, RDL, extensions, calves, core.{' '}
          <b style={{ color: 'var(--ink)' }}>Push</b> — chest, shoulders, triceps.{' '}
          <b style={{ color: 'var(--ink)' }}>Pull</b> — back, rear delts, biceps.
        </p>
      </div>
    </div>
  )
}
