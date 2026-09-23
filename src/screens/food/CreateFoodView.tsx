import { useState } from 'react'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { checkPer100 } from '@/core/domain/checks'
import { Sheet, Seg, BackButton } from '@/ui/primitives'
import { Checks } from './common'

/** Save a food from its packet label, then pick the portion. */
export function CreateFoodView({ onBack, onClose, animate, onSaved }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean; onSaved: (f: Food) => void
}) {
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const showToast = useStore((s) => s.showToast)
  const [unit, setUnit] = useState<'g' | 'ml'>('g')
  const [f, setF] = useState({ n: '', g: '100', k: '', p: '', c: '', fat: '' })
  const [warned, setWarned] = useState(false)
  const num = (v: string) => parseFloat(v) || 0
  const vals = { k: num(f.k), p: num(f.p), c: num(f.c), f: num(f.fat) }
  const given = { k: f.k !== '', macros: f.p !== '' || f.c !== '' || f.fat !== '' }
  const checks = checkPer100(vals, given)
  const commit = () => {
    if (!f.n.trim()) { showToast('Give it a name'); return }
    // a likely typo gets one nudge; the user has the packet, so a second Save keeps their numbers
    if (!warned && checks.some((c) => c.level === 'warn')) { setWarned(true); showToast('Check the note below, or tap Save again to keep these numbers'); return }
    const food = saveCustomFood({ n: f.n.trim(), g: num(f.g) || 100, ...vals, ml: unit === 'ml' })
    onSaved(food)
  }
  const row = (key: keyof typeof f, label: string, u: string, ph = '0') => (
    <div className="frow">
      <label htmlFor={'cf_' + key}>{label}</label>
      <input id={'cf_' + key} type={key === 'n' ? 'text' : 'number'} inputMode={key === 'n' ? 'text' : 'decimal'} placeholder={ph}
        value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      {u && <span className="u">{u}</span>}
    </div>
  )
  return (
    <Sheet title="Create a food" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit}>Save</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        Copy the “per 100 {unit}” column from the packet. Saved foods appear in search from now on.
      </div>
      <Seg<'g' | 'ml'> options={[['g', 'Grams'], ['ml', 'Millilitres']]} value={unit} onChange={setUnit} />
      <div className="list" style={{ marginTop: 12 }}>
        {row('n', 'Name', '', "Mum's chilli")}
        {row('g', 'Serving', unit, '100')}
      </div>
      <div className="lbl">Per 100 {unit}</div>
      <div className="list">
        {row('k', 'Calories', 'kcal')}
        {row('p', 'Protein', 'g')}
        {row('c', 'Carbs', 'g')}
        {row('fat', 'Fat', 'g')}
      </div>
      <Checks checks={checks} ok={given.k && given.macros ? 'Adds up: the calories match the protein, carbs and fat.' : undefined}
        onFix={(k) => setF({ ...f, k: String(k) })} />
    </Sheet>
  )
}
