/** Save a food from its packet label, then pick the portion (src/screens/food/CreateFoodView.tsx). */
import { useState } from 'react'
import { View } from 'react-native'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { checkPer100 } from '@/core/domain/checks'
import { NEEDS_NET } from '@/ui/ConnectionPill'
import { useTokens } from '../../lib/theme'
import { BackButton, Button, Checks, Foot, FormRow, Lbl, List, NavBtn, Note, Seg, Sheet, Stack, Sub, Txt } from './ui'
import { useDuplicateSave } from './DuplicateViews'

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
  const num = (v: string) => parseFloat(v.replace(',', '.')) || 0
  const vals = { k: num(f.k), p: num(f.p), c: num(f.c), f: num(f.fat) }
  const given = { k: f.k !== '', macros: f.p !== '' || f.c !== '' || f.fat !== '' }
  const checks = checkPer100(vals, given)
  const commit = () => {
    if (!f.n.trim()) { showToast('Give it a name'); return }
    // a likely typo gets one nudge; the user has the packet, so a second Save keeps their numbers
    if (!warned && checks.some((c) => c.level === 'warn')) { setWarned(true); showToast('Check the note below, or tap Save again to keep these numbers'); return }
    dup.save({ n: f.n.trim(), g: num(f.g) || 100, ...vals, ml: unit === 'ml', ...(barcode ? { barcode } : {}) })
  }
  const row = (key: keyof typeof f, label: string, u: string, ph = '0') => (
    <FormRow label={label} unit={u} placeholder={ph} numeric={key !== 'n'} value={f[key]}
      onChange={(v) => { setF({ ...f, [key]: v }); setWarned(false) }} />
  )
  return (
    <Sheet title="Create a food" onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title="Save" onPress={commit} />}>
      {note && (
        <Note icon={null} style={{ marginTop: 0, marginBottom: 12 }}>
          <Txt size={15} style={{ flex: 1, lineHeight: 20 }}>{note}{barcode ? <Txt size={15} n color={t.label2}> Barcode {barcode}.</Txt> : null}</Txt>
        </Note>
      )}
      {onLabelPhoto && (
        <Stack style={{ marginTop: 0, marginBottom: 12 }}>
          <Button kind="gray" icon="camera" title="Photo of the label" disabled={!online} onPress={onLabelPhoto} />
          {!online && <Foot style={{ paddingHorizontal: 0 }}>{NEEDS_NET}</Foot>}
        </Stack>
      )}
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
        Copy the “per 100 {unit}” column from the packet. Saved foods appear in search from now on{barcode ? ', and open when you scan this barcode' : ''}.
      </Sub>
      <Seg<'g' | 'ml'> options={[['g', 'Grams'], ['ml', 'Millilitres']]} value={unit} onChange={setUnit} />
      <View style={{ marginTop: 12 }}>
        <List>
          {row('n', 'Name', '', "Mum's chilli")}
          {row('g', 'Serving', unit, '100')}
        </List>
      </View>
      <Lbl>Per 100 {unit}</Lbl>
      <List>
        {row('k', 'Calories', 'kcal')}
        {row('p', 'Protein', 'g')}
        {row('c', 'Carbs', 'g')}
        {row('fat', 'Fat', 'g')}
      </List>
      <Checks checks={checks} ok={given.k && given.macros ? 'Adds up: the calories match the protein, carbs and fat.' : undefined}
        onFix={(k) => setF({ ...f, k: String(k) })} />
      {dup.sheet}
    </Sheet>
  )
}
