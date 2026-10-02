/**
 * A horizontal ruler picker (Design canvas "Refined direction", board r3-weight; ob1-7-body):
 * ticks slide under a fixed mauve marker, a long labelled tick every `major`, a middle one every
 * `mid`. Drag (touch, pen or mouse) with snapping, or the arrow keys; it is a role=slider for
 * VoiceOver. It works in whole ticks: the caller maps its unit onto them (kg, lb, cm, inches).
 *
 * `value` undefined means nothing is picked yet: the ruler rests on `initial` but says "Not set".
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

export function Ruler({ min, max, value, initial, onChange, label, valueText, major = 10, mid = 5, px = 9.2, tickLabel }: {
  min: number; max: number; value: number | undefined; initial: number; onChange: (v: number) => void
  label: string; valueText: (v: number) => string
  major?: number; mid?: number; px?: number; tickLabel?: (v: number) => string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const base = clamp(value ?? initial)
  const [drag, setDrag] = useState<number | null>(null)
  const start = useRef<{ x: number; pos: number; moved: boolean } | null>(null)
  const pos = drag ?? base

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    start.current = { x: e.clientX, pos: base, moved: false }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s) return
    const dx = s.x - e.clientX
    if (Math.abs(dx) > 3) s.moved = true
    if (s.moved) setDrag(Math.min(max + 0.4, Math.max(min - 0.4, s.pos + dx / px)))
  }
  const up = () => {
    const s = start.current
    start.current = null
    if (!s?.moved) return
    setDrag(null)
    onChange(clamp(Math.round(pos)))
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: major, PageDown: -major }
    let next: number | undefined
    if (e.key in step) next = clamp(base + step[e.key])
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next === undefined) return
    e.preventDefault()
    onChange(next)
  }

  // only the ticks near the marker are drawn (a phone shows about 45)
  const span = 34
  const ticks: number[] = []
  for (let i = Math.max(min, Math.floor(pos) - span); i <= Math.min(max, Math.ceil(pos) + span); i++) ticks.push(i)

  return (
    <div className={'ruler' + (value === undefined ? ' unset' : '') + (drag != null ? ' drag' : '')} role="slider" tabIndex={0} aria-label={label}
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={base} aria-valuetext={value === undefined ? 'Not set' : valueText(value)}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { start.current = null; setDrag(null) }} onKeyDown={key}>
      <div className="ruler-t" aria-hidden="true" style={{ transform: `translateX(${-pos * px}px)` }}>
        {ticks.map((i) => {
          const k = i % major === 0 ? 'mj' : i % mid === 0 ? 'md' : ''
          return (
            <span key={i} className={'tk ' + k} style={{ left: i * px }}>
              {k === 'mj' && <span className="tkl num">{tickLabel ? tickLabel(i) : i}</span>}
            </span>
          )
        })}
      </div>
      <div className="ruler-m" aria-hidden="true" />
    </div>
  )
}
