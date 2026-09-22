import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { Sheet, BackButton } from '@/ui/primitives'
import { MealSeg } from './common'

/** For meals out or anything without a label. Logged as an estimate so the total stays honest. */
export function QuickEstimateView({ meal, setMeal, onBack, onClose, animate }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
}) {
  const logEntries = useStore((s) => s.logEntries)
  const showToast = useStore((s) => s.showToast)
  const [f, setF] = useState({ n: '', k: '', p: '', c: '', fat: '' })
  const num = (v: string) => parseFloat(v) || 0
  const commit = () => {
    const k = num(f.k)
    if (k <= 0) { showToast('Enter the calories'); return }
    logEntries([{ n: f.n.trim() || 'Quick estimate', grams: 0, k, p: num(f.p), c: num(f.c), f: num(f.fat), meal, src: 'quick', how: 'quick', err: CAPTURE_ERR.quick }], 'Estimate added')
    onClose()
  }
  const row = (key: keyof typeof f, label: string, unit: string, ph: string, mode: 'text' | 'decimal' = 'decimal') => (
    <div className="frow">
      <label htmlFor={'qk_' + key}>{label}</label>
      <input id={'qk_' + key} type={mode === 'text' ? 'text' : 'number'} inputMode={mode} placeholder={ph} value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      {unit && <span className="u">{unit}</span>}
    </div>
  )
  return (
    <Sheet title="Quick estimate" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit}>Add</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        For meals out or anything without a label. It's logged as an estimate (± {CAPTURE_ERR.quick * 100}%) so your total stays honest.
      </div>
      <div className="list">
        {row('n', 'Name', '', 'Pub lunch', 'text')}
        {row('k', 'Calories', 'kcal', 'Required')}
        {row('p', 'Protein', 'g', 'Optional')}
        {row('c', 'Carbs', 'g', 'Optional')}
        {row('fat', 'Fat', 'g', 'Optional')}
      </div>
      <div className="lbl">Meal</div>
      <MealSeg value={meal} onChange={setMeal} />
    </Sheet>
  )
}
