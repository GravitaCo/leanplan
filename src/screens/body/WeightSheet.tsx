import { useState } from 'react'
import { useStore } from '@/store/store'
import { fmtDate, r1 } from '@/core/domain/date'
import { weightWeekDelta } from '@/core/domain/insights'
import { Sheet, focusOnMount } from '@/ui/primitives'

interface Point { d: string; w: number }

function buildPath(points: Point[], w: number, h: number, pad: number) {
  if (points.length < 2) return { line: '', area: '', dots: [] as { x: number; y: number }[] }
  const weights = points.map((p) => p.w)
  const min = Math.min(...weights)
  const range = Math.max(...weights) - min || 1
  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (w - pad * 2),
    y: pad + (1 - (p.w - min) / range) * (h - pad * 2),
  }))
  const line = coords.map((c, i) => (i === 0 ? `M${c.x},${c.y}` : `L${c.x},${c.y}`)).join(' ')
  const area = `${line} L${coords[coords.length - 1].x},${h} L${coords[0].x},${h} Z`
  return { line, area, dots: coords }
}

/** Log today's weight and see the trend. Framed as a weekly average, not the daily bounce. */
export function WeightSheet({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const setWeight = useStore((s) => s.setWeight)
  const today = data.days[cur]?.weight
  const [bw, setBw] = useState(today ? String(today) : '')

  const points: Point[] = Object.keys(data.days).filter((d) => data.days[d].weight != null).sort().slice(-30)
    .map((d) => ({ d, w: data.days[d].weight as number }))
  const W = 320, H = 130
  const { line, area, dots } = buildPath(points, W, H, 12)
  const delta = weightWeekDelta(data, cur)
  const save = () => { const v = parseFloat(bw); if (v) { setWeight(v); onClose() } }

  return (
    <Sheet title="Body weight" tall onClose={onClose} right={<button className="navbtn b" onClick={save}>Save</button>}>
      <div className="card">
        <div className="gram">
          <input ref={focusOnMount} className="num" type="number" inputMode="decimal" step="0.1" placeholder="0.0" value={bw}
            aria-label={`Weight for ${fmtDate(cur).dow} in kg`} onChange={(e) => setBw(e.target.value)} />
          <span>kg</span>
        </div>
      </div>
      <div className="foot" style={{ paddingBottom: 8 }}>
        Weight swings 1–2 kg day to day with water, salt and sleep. The weekly average is the number to watch.
      </div>
      {points.length >= 2 && (
        <div className="card">
          <div className="hk-h">
            <div className="hk-c" style={{ color: 'var(--body-ink)' }}>Last {points.length} entries</div>
            {delta != null && <div className="hk-m num">{delta > 0 ? '+' : delta < 0 ? '−' : ''}{Math.abs(delta)} kg vs last week</div>}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-label="Weight trend">
            <defs>
              <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--body)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--body)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#wfill)" />
            <path d={line} fill="none" stroke="var(--body-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {dots.length > 0 && <circle cx={dots[dots.length - 1].x} cy={dots[dots.length - 1].y} r="4.5" fill="var(--body-ink)" />}
          </svg>
        </div>
      )}
      {points.length > 0 && (
        <div className="list">
          {points.slice().reverse().slice(0, 14).map((p) => (
            <div className="li" key={p.d}><div className="m"><div className="t">{fmtDate(p.d).full}</div></div><span className="tr num">{r1(p.w)} kg</span></div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
