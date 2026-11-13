import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { Sheet, BackButton } from '@/ui/primitives'
import { MealSeg } from './common'
import { quickEntry } from './foodModel'
import { QUICK } from '@/copy/food'

/** For meals out or anything without a label. Logged as an estimate so the total stays honest. */
export function QuickEstimateView({ meal, setMeal, onBack, onClose, animate }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
}) {
  const logEntries = useStore((s) => s.logEntries)
  const showToast = useStore((s) => s.showToast)
  const [f, setF] = useState({ n: '', k: '', p: '', c: '', fat: '' })
  const commit = () => {
    const entry = quickEntry(f, meal, CAPTURE_ERR.quick)
    if (!entry) { showToast(QUICK.needCalories); return }
    logEntries([entry], QUICK.added)
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
    <Sheet title={QUICK.title} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit}>{QUICK.add}</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        {QUICK.intro(CAPTURE_ERR.quick * 100)}
      </div>
      <div className="list">
        {row('n', QUICK.name, '', QUICK.namePh, 'text')}
        {row('k', QUICK.calories, 'kcal', QUICK.required)}
        {row('p', QUICK.protein, 'g', QUICK.optional)}
        {row('c', QUICK.carbs, 'g', QUICK.optional)}
        {row('fat', QUICK.fat, 'g', QUICK.optional)}
      </div>
      <div className="lbl">{QUICK.meal}</div>
      <MealSeg value={meal} onChange={setMeal} />
    </Sheet>
  )
}
