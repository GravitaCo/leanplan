import { useState } from 'react'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { checkPer100 } from '@/core/domain/checks'
import { Sheet, Seg, BackButton } from '@/ui/primitives'
import { Checks, LabelPhotoButton } from './common'
import { useDuplicateSave } from './DuplicateViews'
import { CREATE_FOOD } from '@/copy/food'

/** Save a food from its packet label, then pick the portion. */
export function CreateFoodView({ onBack, onClose, animate, onSaved, barcode, note, onLabelPhoto }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean; onSaved: (f: Food) => void
  /** from a scan that found nothing: saved with the food, so the next scan opens it */
  barcode?: string
  /** why we're here instead of the scan result */
  note?: string
  /** "Photo of the label": read the numbers from a photo instead of typing them */
  onLabelPhoto?: () => void
}) {
  // the same barcode, or a food that looks like a saved one, asks first (boards dup-1, dup-2)
  const dup = useDuplicateSave(onSaved, 'typed')
  const showToast = useStore((s) => s.showToast)
  const [unit, setUnit] = useState<'g' | 'ml'>('g')
  const [f, setF] = useState({ n: '', g: '100', k: '', p: '', c: '', fat: '' })
  const [warned, setWarned] = useState(false)
  const num = (v: string) => parseFloat(v) || 0
  const vals = { k: num(f.k), p: num(f.p), c: num(f.c), f: num(f.fat) }
  const given = { k: f.k !== '', macros: f.p !== '' || f.c !== '' || f.fat !== '' }
  const checks = checkPer100(vals, given)
  const commit = () => {
    if (!f.n.trim()) { showToast(CREATE_FOOD.needName); return }
    // a likely typo gets one nudge; the user has the packet, so a second Save keeps their numbers
    if (!warned && checks.some((c) => c.level === 'warn')) { setWarned(true); showToast(CREATE_FOOD.checkNote); return }
    dup.save({ n: f.n.trim(), g: num(f.g) || 100, ...vals, ml: unit === 'ml', ...(barcode ? { barcode } : {}) })
  }
  const row = (key: keyof typeof f, label: string, u: string, ph = '0') => (
    <div className="frow">
      <label htmlFor={'cf_' + key}>{label}</label>
      <input id={'cf_' + key} type={key === 'n' ? 'text' : 'number'} inputMode={key === 'n' ? 'text' : 'decimal'} placeholder={ph}
        value={f[key]} onChange={(e) => { setF({ ...f, [key]: e.target.value }); setWarned(false) }} />
      {u && <span className="u">{u}</span>}
    </div>
  )
  return (
    <Sheet title={CREATE_FOOD.title} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit}>{CREATE_FOOD.save}</button>}>
      {note && <div className="note" role="status" style={{ marginTop: 0, marginBottom: 12 }}><span>{note}{barcode && <span className="num muted">{CREATE_FOOD.barcode(barcode)}</span>}</span></div>}
      {onLabelPhoto && (
        <div className="stack" style={{ marginTop: 0, marginBottom: 12 }}>
          <LabelPhotoButton onPress={onLabelPhoto} />
        </div>
      )}
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        {CREATE_FOOD.intro(unit, !!barcode)}
      </div>
      <Seg<'g' | 'ml'> options={[['g', CREATE_FOOD.grams], ['ml', CREATE_FOOD.millilitres]]} value={unit} onChange={setUnit} />
      <div className="list" style={{ marginTop: 12 }}>
        {row('n', CREATE_FOOD.name, '', CREATE_FOOD.namePh)}
        {row('g', CREATE_FOOD.serving, unit, '100')}
      </div>
      <div className="lbl">{CREATE_FOOD.per100(unit)}</div>
      <div className="list">
        {row('k', CREATE_FOOD.calories, 'kcal')}
        {row('p', CREATE_FOOD.protein, 'g')}
        {row('c', CREATE_FOOD.carbs, 'g')}
        {row('fat', CREATE_FOOD.fat, 'g')}
      </div>
      <Checks checks={checks} ok={given.k && given.macros ? CREATE_FOOD.addsUp : undefined}
        onFix={(k) => setF({ ...f, k: String(k) })} />
      {dup.sheet}
    </Sheet>
  )
}
