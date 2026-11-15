/** Quick estimate (src/screens/food/QuickEstimateView.tsx): for meals out, logged as an estimate so the total stays honest. */
import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { quickEntry } from '@/screens/food/foodModel'
import { QUICK } from '@/copy/food'
import { List } from '../../lib/ui/kit'
import { BackButton, NavBtn, Sheet } from '../../lib/ui/primitives'
import { FRow } from '../../lib/ui/fields'
import { Lbl, Sub } from '../../lib/ui/text'
import { MealSeg } from './common'

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
  const row = (key: keyof typeof f, label: string, unit: string, ph: string, text = false) => (
    <FRow label={label} unit={unit || undefined} placeholder={ph} value={f[key]} onChangeText={(v) => setF({ ...f, [key]: v })}
      keyboardType={text ? 'default' : 'decimal-pad'} />
  )
  return (
    <Sheet title={QUICK.title} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title={QUICK.add} onPress={commit} />}>
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>{QUICK.intro(CAPTURE_ERR.quick * 100)}</Sub>
      <List style={{ marginBottom: 8 }}>
        {row('n', QUICK.name, '', QUICK.namePh, true)}
        {row('k', QUICK.calories, 'kcal', QUICK.required)}
        {row('p', QUICK.protein, 'g', QUICK.optional)}
        {row('c', QUICK.carbs, 'g', QUICK.optional)}
        {row('fat', QUICK.fat, 'g', QUICK.optional)}
      </List>
      <Lbl>{QUICK.meal}</Lbl>
      <MealSeg value={meal} onChange={setMeal} />
    </Sheet>
  )
}
