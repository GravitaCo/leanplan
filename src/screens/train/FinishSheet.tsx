import { useState } from 'react'
import type { Effort } from '@/core/types'
import { EFFORTS } from '@/core/data/modalities'
import { BareSheet } from '@/ui/primitives'

/**
 * The end of a guided session: what was logged ("Not today" for anything skipped, in grey), an
 * optional effort and an optional note. Finish saves them; Back returns to the workout.
 */
export function FinishSheet({ title, mins, gentle, rows, effort0, note0, onFinish, onBack }: {
  title: string
  /** minutes to prefill (earlier minutes plus this stint on today; the saved value on another day) */
  mins?: number
  /** hides the minutes in the heading line */
  gentle?: boolean
  rows: { name: string; line: string; none: boolean }[]
  effort0?: Effort
  note0?: string
  onFinish: (effort: Effort | null, note: string, mins: number | undefined) => void
  onBack: () => void
}) {
  const [effort, setEffort] = useState<Effort | null>(effort0 ?? null)
  const [note, setNote] = useState(note0 ?? '')
  const [m, setM] = useState(mins != null ? String(mins) : '')
  const typed = parseFloat(m)
  const minsOut = Number.isFinite(typed) && typed > 0 ? Math.min(240, typed) : undefined
  return (
    <BareSheet label={`${title}, done`} onClose={onBack} className="finish">
      <button className="navbtn" style={{ marginBottom: 4 }} onClick={onBack}>Back to workout</button>
      <h2 className="fin-t">{title}, done.</h2>
      <div className="sub" style={{ margin: '2px 0 14px' }}>{[minsOut != null && !gentle ? `${Math.round(minsOut)} min` : '', `${rows.length} ${rows.length === 1 ? 'exercise' : 'exercises'}`].filter(Boolean).join(' · ')}</div>
      <div className="list">
        {rows.map((r, i) => (
          <div className="li" key={i}>
            <div className="m"><div className="t">{r.name}</div></div>
            <span className="tr num" style={r.none ? { color: 'var(--label3)' } : undefined}>{r.line}</span>
          </div>
        ))}
      </div>
      <div className="lbl">How did it feel overall? <span style={{ color: 'var(--label3)' }}>Optional</span></div>
      <div className="effort4" role="radiogroup" aria-label="Effort">
        {EFFORTS.map(([k, label]) => (
          <button key={k} role="radio" aria-checked={effort === k} className={effort === k ? 'on' : ''} onClick={() => setEffort(effort === k ? null : k)}>{label}</button>
        ))}
      </div>
      <div className="list" style={{ marginTop: 14 }}>
        <div className="frow"><label htmlFor="fin_min">Minutes</label>
          <input id="fin_min" className="num" type="number" inputMode="numeric" value={m} placeholder="Optional" onChange={(e) => setM(e.target.value)} /></div>
      </div>
      <label className="sr" htmlFor="fin_note">Note</label>
      <input id="fin_note" className="sheet-input note-in" value={note} placeholder="Add a note" maxLength={500} onChange={(e) => setNote(e.target.value)} />
      <div className="stack"><button className="btn" onClick={() => onFinish(effort, note.trim(), minsOut)}>Finish</button></div>
    </BareSheet>
  )
}
