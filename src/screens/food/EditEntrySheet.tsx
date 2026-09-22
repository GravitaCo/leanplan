import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { CAPTURE_LABEL, entryErr, isFlagged } from '@/core/domain/estimate'
import { Sheet } from '@/ui/primitives'
import { MealSeg } from './common'

const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** Correcting an entry is a slider on the entry itself — never a trip back to search. */
export function EditEntrySheet({ index, onClose }: { index: number; onClose: () => void }) {
  const x = useStore((s) => s.data.days[s.cur]?.foods[index])
  const profile = useStore((s) => s.data.profile)
  const updateEntry = useStore((s) => s.updateEntry)
  const confirmEntry = useStore((s) => s.confirmEntry)
  const removeFood = useStore((s) => s.removeFood)
  const [mult, setMult] = useState(1)
  // entries logged without a meal stay in "Other" unless the user picks one
  const [meal, setMeal] = useState<MealSlot | undefined>(x?.meal)
  if (!x) return null
  const gentle = !!profile.gentle
  const u = x.unit ?? 'g'
  const flagged = isFlagged(x, profile)
  const save = () => { updateEntry(index, mult, meal); onClose() }

  return (
    <Sheet title={x.n} onClose={onClose} right={<button className="navbtn b" onClick={save}>Done</button>}>
      <div className="card" style={{ textAlign: 'center' }}>
        {gentle ? (
          <div className="big num">{x.grams ? <>{Math.round(x.grams * mult)}<small>{u}</small></> : <>×{mult}</>}</div>
        ) : (
          <div className="big num">{fmt(x.k * mult)}<small>kcal</small></div>
        )}
        <div className="sub num">{!gentle && x.grams ? `${Math.round(x.grams * mult)} ${u} · ` : ''}{r1(x.p * mult)} g protein</div>
        <input type="range" min={0.25} max={3} step={0.05} value={mult} style={{ marginTop: 12 }} aria-label="Portion size"
          onChange={(e) => setMult(+e.target.value)} />
        <div className="chips" style={{ justifyContent: 'center', marginTop: 8 }}>
          {STEPS.map((v) => (
            <button key={v} className={'chip' + (Math.abs(mult - v) < 0.001 ? ' on' : '')} onClick={() => setMult(v)}>
              {v === 1 ? 'As logged' : '×' + v}
            </button>
          ))}
        </div>
      </div>
      <div className="sub" style={{ fontSize: 13, padding: '0 4px 12px' }}>
        {x.how ? CAPTURE_LABEL[x.how] : 'Logged'}{gentle ? '.' : ` · ± ${fmt(x.k * entryErr(x))} kcal.`}{' '}
        {flagged ? 'This is one of the bigger uncertainties in your day.' : ''}
      </div>
      <MealSeg value={meal} onChange={setMeal} />
      <div className="stack">
        {flagged && <button className="btn tinted" onClick={() => { confirmEntry(index); onClose() }}>Looks right</button>}
        <button className="btn danger" onClick={() => { removeFood(index); onClose() }}>Delete entry</button>
      </div>
    </Sheet>
  )
}
