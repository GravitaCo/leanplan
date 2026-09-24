import { useState } from 'react'
import { useStore } from '@/store/store'
import type { Effort, Modality } from '@/core/types'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { DEFAULT_MINS, EFFORTS, MODALITIES, MODALITY_LABEL } from '@/core/data/modalities'
import { Sheet } from '@/ui/primitives'

/**
 * Quick log of any movement (workout plan P2, §2.2): the kind, minutes and, optionally, a name,
 * effort and (for cardio) distance. Detail is always optional; it adds to the day's other sessions.
 */
export function LogSessionSheet({ onClose }: { onClose: () => void }) {
  const addSession = useStore((s) => s.addSession)
  const [modality, setModality] = useState<Modality>('yoga')
  const [cardioKey, setCardioKey] = useState('Brisk walk')
  const [name, setName] = useState('')
  const [mins, setMins] = useState('')
  const [km, setKm] = useState('')
  const [effort, setEffort] = useState<Effort | null>(null)

  const save = () => {
    const m = parseFloat(mins)
    const d = parseFloat(km)
    addSession({
      modality,
      title: name.trim() || (modality === 'cardio' ? cardioKey : MODALITY_LABEL[modality]),
      ...(Number.isFinite(m) ? { mins: Math.max(0, m) } : {}),
      ...(effort ? { effort } : {}),
      ...(modality === 'cardio' ? { cardio: { key: cardioKey, ...(Number.isFinite(d) && d > 0 ? { km: d } : {}) } } : {}),
    })
    onClose()
  }

  return (
    <Sheet title="Log a session" onClose={onClose} right={<button className="navbtn b" onClick={save}>Save</button>}>
      <div className="lbl">What did you do?</div>
      <div className="chips" role="radiogroup" aria-label="Kind of session" style={{ marginBottom: 14 }}>
        {MODALITIES.map((k) => (
          <button key={k} role="radio" aria-checked={modality === k} className={'chip' + (modality === k ? ' on' : '')} onClick={() => setModality(k)}>
            {MODALITY_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="list">
        {modality === 'cardio' && (
          <div className="frow"><label htmlFor="ls_type">Type</label>
            <select id="ls_type" value={cardioKey} onChange={(e) => setCardioKey(e.target.value)}>
              {CARDIO_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select></div>
        )}
        <div className="frow"><label htmlFor="ls_name">Name</label>
          <input id="ls_name" value={name} placeholder={modality === 'cardio' ? cardioKey : MODALITY_LABEL[modality]} onChange={(e) => setName(e.target.value)} /></div>
        <div className="frow"><label htmlFor="ls_min">Minutes</label>
          <input id="ls_min" className="num" type="number" inputMode="numeric" value={mins} placeholder={String(DEFAULT_MINS[modality])} onChange={(e) => setMins(e.target.value)} /></div>
        {modality === 'cardio' && (
          <div className="frow"><label htmlFor="ls_km">Distance (km)</label>
            <input id="ls_km" className="num" type="number" inputMode="decimal" value={km} placeholder="Optional" onChange={(e) => setKm(e.target.value)} /></div>
        )}
      </div>
      <div className="lbl">How did it feel? <span className="muted">Optional</span></div>
      <div className="chips" role="radiogroup" aria-label="Effort">
        {EFFORTS.map(([k, label]) => (
          <button key={k} role="radio" aria-checked={effort === k} className={'chip' + (effort === k ? ' on' : '')} onClick={() => setEffort(effort === k ? null : k)}>{label}</button>
        ))}
      </div>
      <div className="foot" style={{ padding: '12px 4px 0' }}>This sits alongside anything else you've logged today. Every kind of movement counts.</div>
    </Sheet>
  )
}
