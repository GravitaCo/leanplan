import { useState } from 'react'
import { useStore } from '@/store/store'
import { fmtDate, r1 } from '@/core/domain/date'
import { Sheet } from '@/ui/primitives'

interface Point {
  d: string
  w: number
}

function buildPath(points: Point[], w: number, h: number, pad: number) {
  if (points.length < 2) return { line: '', area: '', dots: [] as { x: number; y: number }[] }
  const weights = points.map((p) => p.w)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * innerW
    const y = pad + (1 - (p.w - min) / range) * innerH
    return { x, y }
  })
  const line = coords.map((c, i) => (i === 0 ? `M${c.x},${c.y}` : `L${c.x},${c.y}`)).join(' ')
  const area = `${line} L${coords[coords.length - 1].x},${h} L${coords[0].x},${h} Z`
  return { line, area, dots: coords }
}

export function WeightSheet({ onClose }: { onClose: () => void }) {
  const days = useStore((s) => s.data.days)
  const cur = useStore((s) => s.cur)
  const setWeight = useStore((s) => s.setWeight)
  const [bw, setBw] = useState('')

  const points: Point[] = Object.keys(days)
    .filter((d) => days[d].weight != null)
    .sort()
    .map((d) => ({ d, w: days[d].weight as number }))

  const W = 320
  const H = 150
  const { line, area, dots } = buildPath(points, W, H, 14)

  const first = points[0]?.w
  const last = points[points.length - 1]?.w
  const diff = first != null && last != null ? r1(last - first) : null

  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ borderBottom: 0, paddingTop: 0 }}>
        <div className="grow">
          <div className="name" style={{ fontSize: 20, fontWeight: 800 }}>
            Body weight
          </div>
          <div className="meta">{points.length ? `${points.length} entries logged` : 'No entries yet'}</div>
        </div>
        <button className="x-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {/* current + trend */}
      <div className="card cream" style={{ marginTop: 6 }}>
        <div className="mono" style={{ marginBottom: 4 }}>
          Latest
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.2px' }}>{last != null ? r1(last) : '—'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cream-sub)' }}>kg</div>
          {diff != null && (
            <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: diff <= 0 ? '#2f8f63' : '#c0603f' }}>
              {diff > 0 ? '+' : ''}
              {diff} kg total
            </div>
          )}
        </div>
      </div>

      {/* chart */}
      {points.length >= 2 ? (
        <div className="card">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
            <defs>
              <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1="0" y1={H * g} x2={W} y2={H * g} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
            ))}
            <path d={area} fill="url(#wfill)" />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {dots.length > 0 && <circle cx={dots[dots.length - 1].x} cy={dots[dots.length - 1].y} r="4.5" fill="var(--accent)" />}
          </svg>
        </div>
      ) : (
        <div className="card">
          <div className="empty">Log your weight over a few days to see your trend here.</div>
        </div>
      )}

      {/* quick log */}
      <div className="card">
        <div className="mono" style={{ marginBottom: 8 }}>
          Log weight for {fmtDate(cur).dow}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" inputMode="decimal" placeholder="kg" value={bw} onChange={(e) => setBw(e.target.value)} />
          <button
            className="btn"
            style={{ width: 'auto', padding: '12px 20px' }}
            onClick={() => {
              const v = parseFloat(bw)
              if (v) {
                setWeight(v)
                setBw('')
              }
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* history */}
      {points.length > 0 && (
        <div className="card">
          {points
            .slice()
            .reverse()
            .slice(0, 14)
            .map((p) => (
              <div className="row" key={p.d}>
                <div className="grow">
                  <div className="name" style={{ fontSize: 14 }}>
                    {fmtDate(p.d).full}
                  </div>
                </div>
                <span style={{ fontWeight: 700 }}>{r1(p.w)} kg</span>
              </div>
            ))}
        </div>
      )}
    </Sheet>
  )
}
