/**
 * A number wheel (Design canvas "Refined direction", board r2-age): a vertical column of numbers,
 * the chosen one large on a card, the rest smaller and fainter. Drag (touch, pen or mouse) with
 * snapping, tap a row, or use the arrow keys; it is a role=slider for VoiceOver.
 *
 * `value` undefined means nothing is picked yet: the wheel rests on `initial` but says "Not set",
 * so an untouched wheel never answers for the person.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

const SIZE = [44, 30, 26, 22]
const FADE = [1, 0.55, 0.32, 0.18]
const lerp = (xs: number[], d: number) => { const i = Math.min(Math.floor(d), xs.length - 1); const j = Math.min(i + 1, xs.length - 1); return xs[i] + (xs[j] - xs[i]) * (d - i) }

export function Wheel({ min, max, value, initial, onChange, label, unit, valueText, rows = 7, rowH = 48 }: {
  min: number; max: number; value: number | undefined; initial: number; onChange: (v: number) => void
  label: string; unit?: string; valueText?: (v: number) => string; rows?: number; rowH?: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const base = clamp(value ?? initial)
  const [drag, setDrag] = useState<number | null>(null)
  const start = useRef<{ y: number; pos: number; moved: boolean; top: number } | null>(null)
  const pos = drag ?? base
  const half = Math.floor(rows / 2)

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    start.current = { y: e.clientY, pos: base, moved: false, top: e.currentTarget.getBoundingClientRect().top }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s) return
    const dy = s.y - e.clientY
    if (Math.abs(dy) > 4) s.moved = true
    if (s.moved) setDrag(Math.min(max + 0.4, Math.max(min - 0.4, s.pos + dy / rowH)))
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    start.current = null
    if (!s) return
    if (s.moved) { setDrag(null); onChange(clamp(Math.round(pos))); return }
    // a tap: the row under the finger (the middle row picks what's shown)
    const row = Math.floor((e.clientY - s.top) / rowH) - half
    setDrag(null)
    onChange(clamp(base + row))
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }
    let next: number | undefined
    if (e.key in step) next = clamp(base + step[e.key])
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next === undefined) return
    e.preventDefault()
    onChange(next)
  }

  const from = Math.max(min, Math.floor(pos) - half - 1)
  const to = Math.min(max, Math.ceil(pos) + half + 1)
  const items: number[] = []
  for (let i = from; i <= to; i++) items.push(i)
  const text = value === undefined ? 'Not set' : valueText ? valueText(value) : `${value}${unit ? ' ' + unit : ''}`

  return (
    <div className={'wheel' + (value === undefined ? ' unset' : '') + (drag != null ? ' drag' : '')} style={{ height: rows * rowH }}>
      <div className="wheel-hi" aria-hidden="true" style={{ top: half * rowH, height: rowH }} />
      <div className="wheel-col" role="slider" tabIndex={0} aria-label={label} aria-orientation="vertical"
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={base} aria-valuetext={text}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { start.current = null; setDrag(null) }} onKeyDown={key}>
        {items.map((i) => {
          const d = Math.abs(i - pos)
          if (d > half + 0.5) return null
          return (
            <div key={i} className="wheel-n num" aria-hidden="true"
              style={{ height: rowH, transform: `translateY(${(i - pos + half) * rowH}px)`, fontSize: lerp(SIZE, d), opacity: lerp(FADE, d), fontWeight: d < 0.5 ? 600 : 400 }}>{i}</div>
          )
        })}
      </div>
      {unit && <div className="wheel-u" aria-hidden="true" style={{ top: half * rowH, height: rowH }}>{unit}</div>}
    </div>
  )
}
