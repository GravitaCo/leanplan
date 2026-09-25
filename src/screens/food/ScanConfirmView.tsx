/**
 * Check a scanned product before it's saved. Open Food Facts is crowdsourced, so the numbers are
 * shown editable next to the source, fields that don't hang together are marked (neutrally: the
 * user has the pack, we don't), and nothing is saved or logged until the user taps Save.
 */
import { useState } from 'react'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { checkLabel, foodFromConfirmed, type FoodKind, type LabelField, type LabelValues, type ScanDraft } from '@/core/domain/barcode'
import { Sheet, Seg, BackButton } from '@/ui/primitives'
import { Icon } from '@/ui/icons'

const MAIN: [LabelField, string, string][] = [['k', 'Calories', 'kcal'], ['p', 'Protein', 'g'], ['c', 'Carbs', 'g'], ['f', 'Fat', 'g']]
const EXTRA: [LabelField, string, string][] = [['kj', 'Energy', 'kJ'], ['sugars', 'of which sugars', 'g'], ['sat', 'of which saturates', 'g'], ['fibre', 'Fibre', 'g'], ['salt', 'Salt', 'g'], ['alcohol', 'Alcohol', '% vol']]

const toText = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * 100) / 100))

export function ScanConfirmView({ draft, onBack, onClose, animate, onSaved }: {
  draft: ScanDraft; meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean; onSaved: (f: Food) => void
}) {
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const [kind, setKind] = useState<FoodKind>(draft.kind)
  const [ml, setMl] = useState(draft.ml)
  const [name, setName] = useState(draft.name)
  const [serving, setServing] = useState(String(draft.serving[draft.kind]))
  const [servingTouched, setServingTouched] = useState(false)
  const [text, setText] = useState<Record<LabelField, string>>(() => {
    const t = {} as Record<LabelField, string>
    for (const [f] of [...MAIN, ...EXTRA]) t[f] = toText(draft.values[f])
    return t
  })
  // alcohol only when the product lists it; everything else always, so a gap can be filled in
  const extras = EXTRA.filter(([f]) => f !== 'alcohol' || draft.values.alcohol !== undefined)

  const values: LabelValues = {}
  for (const f of Object.keys(text) as LabelField[]) {
    const n = parseFloat(text[f].replace(',', '.'))
    if (text[f].trim() !== '' && Number.isFinite(n)) values[f] = n
  }
  const unit = ml ? 'ml' : 'g'
  const g = parseFloat(serving) || 0
  // product-level notes (per-serving values in the per-100 fields) mark calories until they're edited
  const kUnchanged = values.k === draft.values.k
  const problems = [...checkLabel(values, { ml, name, usLabel: draft.usLabel }), ...(kUnchanged ? draft.notes : [])]
  const missing = problems.some((p) => p.kind === 'missing')
  const odd = new Set(problems.filter((p) => p.kind === 'odd').map((p) => p.field))
  const notes = [...new Set(problems.filter((p) => p.kind === 'odd').map((p) => p.msg))]

  const pickKind = (k: FoodKind) => {
    setKind(k)
    if (!servingTouched) setServing(String(draft.serving[k]))
  }
  const save = () => {
    if (missing) return
    const food = saveCustomFood(foodFromConfirmed({ barcode: draft.barcode, name, values, ml, kind, cat: draft.cat, g: parseFloat(serving) || 100 }))
    onSaved(food)
  }

  const row = ([f, label, u]: [LabelField, string, string]) => {
    const need = (['k', 'p', 'c', 'f'] as LabelField[]).includes(f) && values[f] === undefined
    return (
      <div key={f} className={'frow' + (odd.has(f) ? ' flag' : '') + (need ? ' need' : '')}>
        <label htmlFor={'sc_' + f}>{label}</label>
        {odd.has(f) && <span className="flagnote">Looks off. Check against your pack</span>}
        <input id={'sc_' + f} type="number" inputMode="decimal" placeholder={need ? 'Needed' : '—'} value={text[f]}
          aria-invalid={odd.has(f) || need || undefined} onChange={(e) => setText({ ...text, [f]: e.target.value })} />
        <span className="u">{u}</span>
      </div>
    )
  }

  return (
    <Sheet title="Check the label" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={save} disabled={missing}>Save</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        Pack label via Open Food Facts: check against your pack.
        <div className="num" style={{ fontSize: 13, marginTop: 2 }}>Barcode {draft.barcode}{draft.kcalFromKj ? ' · calories worked out from kJ' : ''}</div>
      </div>
      <Seg<FoodKind> options={[['ingredient', 'Ingredient'], ['meal', 'Ready meal']]} value={kind} onChange={pickKind} />
      <div className="foot">{kind === 'meal'
        ? 'Eaten as it comes, like a ready meal or sandwich. One serving is the pack, unless it says otherwise.'
        : 'Something you cook or combine with, like pasta, milk or a sauce. Usable in recipes.'}</div>

      <div className="list" style={{ marginTop: 12 }}>
        <div className={'frow' + (name.trim() ? '' : ' need')}>
          <label htmlFor="sc_n">Name</label>
          <input id="sc_n" type="text" placeholder="Needed" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="frow">
          <label htmlFor="sc_g">{kind === 'meal' ? 'Serving' : 'Usual serving'}</label>
          <input id="sc_g" type="number" inputMode="decimal" placeholder="100" value={serving}
            onChange={(e) => { setServing(e.target.value); setServingTouched(true) }} />
          <span className="u">{unit}</span>
        </div>
      </div>
      {g > 0 && values.k !== undefined && (
        <div className="foot num">One serving ({Math.round(g * 10) / 10} {unit}) = {Math.round((values.k * g) / 100)} kcal. Compare with the pack’s per-serving column.</div>
      )}
      <div style={{ marginTop: 12 }}>
        <Seg<'g' | 'ml'> options={[['g', 'Per 100 g'], ['ml', 'Per 100 ml']]} value={unit} onChange={(u) => setMl(u === 'ml')} />
      </div>

      {(draft.usLabel || draft.staleYear) && (
        <div className="foot">
          {draft.usLabel && 'US label: carbs include fibre. '}
          {draft.staleYear && `Last updated ${draft.staleYear}. Recipes change: check against your pack.`}
        </div>
      )}
      <div className="lbl">Per 100 {unit}</div>
      <div className="list">{MAIN.map(row)}</div>
      <div className="lbl">Also on the label</div>
      <div className="list">{extras.map(row)}</div>

      {notes.length > 0 && (
        <div role="status">
          {notes.map((m) => <div key={m} className="note"><Icon name="info" size={17} /><span>{m}</span></div>)}
        </div>
      )}
      {!problems.length && <div className="note ok" role="status"><Icon name="checkc" size={17} /><span>These numbers hang together. Still worth a glance at the pack.</span></div>}
      <div className="stack">
        <button className="btn" onClick={save} disabled={missing}>{missing ? 'Fill in the marked fields' : 'Save food'}</button>
      </div>
      <div className="foot">Saved foods appear in search and open straight away next time you scan them, even offline.</div>
    </Sheet>
  )
}
