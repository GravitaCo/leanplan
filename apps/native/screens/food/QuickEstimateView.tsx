/** For meals out or anything without a label (src/screens/food/QuickEstimateView.tsx). Logged as an estimate so the total stays honest. */
import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { BackButton, FormRow, Lbl, List, NavBtn, Sheet, Sub } from './ui'
import { MealSeg } from './common'

export function QuickEstimateView({ meal, setMeal, onBack, onClose, animate }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
}) {
  const logEntries = useStore((s) => s.logEntries)
  const showToast = useStore((s) => s.showToast)
  const [f, setF] = useState({ n: '', k: '', p: '', c: '', fat: '' })
  const num = (v: string) => parseFloat(v.replace(',', '.')) || 0
  const commit = () => {
    const k = num(f.k)
    if (k <= 0) { showToast('Enter the calories'); return }
    logEntries([{ n: f.n.trim() || 'Quick estimate', grams: 0, k, p: num(f.p), c: num(f.c), f: num(f.fat), meal, src: 'quick', how: 'quick', err: CAPTURE_ERR.quick }], 'Estimate added')
    onClose()
  }
  const row = (key: keyof typeof f, label: string, unit: string, ph: string, text = false) => (
    <FormRow label={label} unit={unit} placeholder={ph} numeric={!text} value={f[key]} onChange={(v) => setF({ ...f, [key]: v })} />
  )
  return (
    <Sheet title="Quick estimate" onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title="Add" onPress={commit} />}>
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
        For meals out or anything without a label. It's logged as an estimate (± {CAPTURE_ERR.quick * 100}%) so your total stays honest.
      </Sub>
      <List>
        {row('n', 'Name', '', 'Pub lunch', true)}
        {row('k', 'Calories', 'kcal', 'Required')}
        {row('p', 'Protein', 'g', 'Optional')}
        {row('c', 'Carbs', 'g', 'Optional')}
        {row('fat', 'Fat', 'g', 'Optional')}
      </List>
      <Lbl>Meal</Lbl>
      <MealSeg value={meal} onChange={setMeal} />
    </Sheet>
  )
}
