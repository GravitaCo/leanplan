/** Small SVG data displays: activity-style rings, meters, sparkline, week bars. */
import type { DayStat } from '@/core/domain/insights'

import { DOW } from '@/core/domain/date'

/** Concentric rings, outermost first. Progress caps at a full ring — never an "over" state. */
export function Rings({ items, size, stroke }: { items: { pct: number; color: string }[]; size: number; stroke?: number }) {
  const sw = stroke ?? Math.round(size * 0.105)
  const c = size / 2
  const gap = Math.max(1.5, sw * 0.2)
  let r = c - sw / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flex: 'none' }}>
      <g transform={`rotate(-90 ${c} ${c})`}>
        {items.map((it, i) => {
          const rr = r
          r -= sw + gap
          const C = 2 * Math.PI * rr
          const p = Math.max(0, Math.min(1, it.pct || 0))
          return (
            <g key={i}>
              <circle cx={c} cy={c} r={rr} fill="none" stroke={it.color} strokeOpacity={0.22} strokeWidth={sw} />
              {p > 0.005 && (
                <circle cx={c} cy={c} r={rr} fill="none" stroke={it.color} strokeWidth={sw} strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

/** Thin progress bar (0–1), capped at full: never an "over" state. */
export function Meter({ pct }: { pct: number }) {
  return (
    <span className="meter" style={{ height: 4, borderRadius: 2 }} aria-hidden="true">
      <i style={{ width: Math.max(0, Math.min(100, (pct || 0) * 100)) + '%', background: 'var(--food)', borderRadius: 2 }} />
    </span>
  )
}

/** The day's energy against its range: fill, with the range as a soft band behind it. */
export function KcalBar({ k, lo, hi }: { k: number; lo: number; hi: number }) {
  const max = hi * 1.1 || 1
  const P = (v: number) => Math.max(0, Math.min(100, (v / max) * 100))
  return (
    <div className="kbar" aria-hidden="true">
      <span className="band" style={{ left: P(lo) + '%', width: P(hi) - P(lo) + '%' }} />
      <span className="f" style={{ width: P(k) + '%' }} />
    </div>
  )
}

/** Protein, carbs and fat against their targets (Studio: value, bar, "of N g"). */
export function MacroTrio({ p, c, f, tp, tc, tf }: { p: number; c: number; f: number; tp: number; tc: number; tf: number }) {
  const col = (label: string, v: number, goal: number) => (
    <div className="mstat">
      <span className="k">{label}</span>
      <span className="v num">{Math.round(v)}<small> g</small></span>
      <Meter pct={goal ? v / goal : 0} />
      <span className="s num">of {goal} g</span>
    </div>
  )
  return <div className="mtrio">{col('Protein', p, tp)}{col('Carbs', c, tc)}{col('Fat', f, tf)}</div>
}

export function Sparkline({ values, w, h, color }: { values: number[]; w: number; h: number; color: string }) {
  if (values.length < 2) return null
  const mn = Math.min(...values), mx = Math.max(...values), rg = mx - mn || 1
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - mn) / rg) * (h - 6)).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Fitbit-style week bars against the target band. A missed day is a quiet stub, not a gap to feel bad about. */
export function WeekBars({ rows, lo, hi, cur }: { rows: DayStat[]; lo: number; hi: number; cur: string }) {
  const W = 320, H = 128, base = H - 20, bw = 24
  const max = Math.max(...rows.map((x) => x.t.k), hi) * 1.08 || 1
  const y = (v: number) => base - (v / max) * (base - 4)
  const step = W / 7
  return (
    <svg className="bars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Energy this week against your range">
      <rect x={0} y={y(hi)} width={W} height={y(lo) - y(hi)} rx={5} fill="var(--food-track)" />
      {rows.map((x, i) => {
        const cx = step * i + step / 2
        const top = y(x.t.k)
        return (
          <g key={x.d}>
            {x.logged ? (
              <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(4, base - top)} rx={6} fill={x.d === cur ? 'var(--energy-ink)' : 'var(--energy)'} />
            ) : !x.future ? (
              <rect x={cx - bw / 2} y={base - 3} width={bw} height={3} rx={1.5} fill="var(--fill3)" />
            ) : null}
            <text x={cx} y={H - 4} textAnchor="middle" className={x.d === cur ? 'on' : ''}>{DOW[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}
