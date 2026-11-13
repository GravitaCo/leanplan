/** Create a food (src/screens/food/CreateFoodView.tsx): save a food from its packet label, then pick the portion. */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { checkPer100 } from '@/core/domain/checks'
import { numIn } from '@/screens/food/foodModel'
import { CREATE_FOOD } from '@/copy/food'
import { NEEDS_NET } from '@/copy/connection'
import { Btn, List, Note } from '../../lib/ui/kit'
import { BackButton, NavBtn, Seg, Sheet } from '../../lib/ui/primitives'
import { FRow } from '../../lib/ui/fields'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { num, useTokens } from '../../lib/theme'
import { Checks } from './common'
import { DuplicateSheets } from './DuplicateSheets'
import { useDuplicateSave } from './useDuplicateSave'

export function CreateFoodView({ onBack, onClose, animate, onSaved, barcode, note, onLabelPhoto }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean; onSaved: (f: Food) => void
  /** from a scan that found nothing: saved with the food, so the next scan opens it */
  barcode?: string
  /** why we're here instead of the scan result */
  note?: string
  /** "Photo of the label": read the numbers from a photo instead of typing them */
  onLabelPhoto?: () => void
}) {
  const t = useTokens()
  // the same barcode, or a food that looks like a saved one, asks first (boards dup-1, dup-2)
  const dup = useDuplicateSave(onSaved, 'typed')
  const showToast = useStore((s) => s.showToast)
  const online = useStore((s) => s.online)
  const [unit, setUnit] = useState<'g' | 'ml'>('g')
  const [f, setF] = useState({ n: '', g: '100', k: '', p: '', c: '', fat: '' })
  const [warned, setWarned] = useState(false)
  const vals = { k: numIn(f.k), p: numIn(f.p), c: numIn(f.c), f: numIn(f.fat) }
  const given = { k: f.k !== '', macros: f.p !== '' || f.c !== '' || f.fat !== '' }
  const checks = checkPer100(vals, given)
  const commit = () => {
    if (!f.n.trim()) { showToast(CREATE_FOOD.needName); return }
    // a likely typo gets one nudge; the user has the packet, so a second Save keeps their numbers
    if (!warned && checks.some((c) => c.level === 'warn')) { setWarned(true); showToast(CREATE_FOOD.checkNote); return }
    dup.save({ n: f.n.trim(), g: numIn(f.g) || 100, ...vals, ml: unit === 'ml', ...(barcode ? { barcode } : {}) })
  }
  const row = (key: keyof typeof f, label: string, u: string, ph = '0') => (
    <FRow label={label} unit={u || undefined} placeholder={ph} value={f[key]} keyboardType={key === 'n' ? 'default' : 'decimal-pad'}
      onChangeText={(v) => { setF({ ...f, [key]: v }); setWarned(false) }} />
  )
  return (
    <Sheet title={CREATE_FOOD.title} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title={CREATE_FOOD.save} onPress={commit} />}>
      {note && (
        <Note icon={null} status style={{ marginTop: 0, marginBottom: 12 }}>
          {note}{barcode ? <Text style={[num, { color: t.label2 }]}>{CREATE_FOOD.barcode(barcode)}</Text> : null}
        </Note>
      )}
      {onLabelPhoto && (
        <View style={{ gap: 8, marginBottom: 12 }}>
          <Btn kind="gray" icon="camera" title={CREATE_FOOD.labelPhoto} disabled={!online} onPress={onLabelPhoto} />
          {!online && <Foot style={{ paddingHorizontal: 0 }}>{NEEDS_NET}</Foot>}
        </View>
      )}
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>{CREATE_FOOD.intro(unit, !!barcode)}</Sub>
      <Seg<'g' | 'ml'> options={[['g', CREATE_FOOD.grams], ['ml', CREATE_FOOD.millilitres]]} value={unit} onChange={setUnit} />
      <List style={{ marginTop: 12, marginBottom: 8 }}>
        {row('n', CREATE_FOOD.name, '', CREATE_FOOD.namePh)}
        {row('g', CREATE_FOOD.serving, unit, '100')}
      </List>
      <Lbl>{CREATE_FOOD.per100(unit)}</Lbl>
      {/* no 8 below: the checks' note brings its own 10, which the web collapses with it */}
      <List>
        {row('k', CREATE_FOOD.calories, 'kcal')}
        {row('p', CREATE_FOOD.protein, 'g')}
        {row('c', CREATE_FOOD.carbs, 'g')}
        {row('fat', CREATE_FOOD.fat, 'g')}
      </List>
      <Checks checks={checks} ok={given.k && given.macros ? CREATE_FOOD.addsUp : undefined} onFix={(k) => setF({ ...f, k: String(k) })} />
      <DuplicateSheets ask={dup.ask} answer={dup.answer} dismiss={dup.dismiss} />
    </Sheet>
  )
}
