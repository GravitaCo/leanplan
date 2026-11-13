/** Edit an entry (src/screens/food/EditEntrySheet.tsx): correcting it is a slider on the entry itself, never a trip back to search. */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { CAPTURE_LABEL, entryErr, isFlagged } from '@/core/domain/estimate'
import { amountText } from '@/core/domain/nutrition'
import { EDIT_STEPS, editAmount } from '@/screens/food/foodModel'
import { EDIT_ENTRY } from '@/copy/food'
import { Big, Btn, Card, Chip, Chips } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { Slider } from '../../lib/ui/controls'
import { Sub } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { MealSeg } from './common'

export function EditEntrySheet({ index, onClose }: { index: number; onClose: () => void }) {
  const t = useTokens()
  const x = useStore((s) => s.data.days[s.cur]?.foods[index])
  const profile = useStore((s) => s.data.profile)
  const gentle = useStore((s) => kcalHidden(s.data))
  const updateEntry = useStore((s) => s.updateEntry)
  const confirmEntry = useStore((s) => s.confirmEntry)
  const removeFood = useStore((s) => s.removeFood)
  const [mult, setMult] = useState(1)
  // entries logged without a meal stay in "Other" unless the user picks one
  const [meal, setMeal] = useState<MealSlot | undefined>(x?.meal)
  if (!x) return null
  // items snap to quarters, and the multiplier follows the snapped count so kcal and count agree
  const { unit: u, amount, mult: m } = editAmount(x, mult)
  const flagged = isFlagged(x, profile)
  const save = () => { updateEntry(index, m, meal); onClose() }

  return (
    <Sheet title={x.n} onClose={onClose} right={<NavBtn bold title={EDIT_ENTRY.done} onPress={save} />}>
      <Card plain style={{ alignItems: 'center', marginBottom: 10 }}>
        {gentle ? <Big center value={x.grams ? amountText(amount, u) : `×${mult}`} /> : <Big center value={fmt(x.k * m)} unit="kcal" />}
        <Sub style={[num, { textAlign: 'center' }]}>{!gentle && x.grams ? `${amountText(amount, u)} · ` : ''}{r1(x.p * m)} g protein</Sub>
        <Slider min={0.25} max={3} step={0.05} value={mult} onChange={setMult} label={EDIT_ENTRY.portionSize} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <Chips>
            {EDIT_STEPS.map((v) => <Chip key={v} title={v === 1 ? EDIT_ENTRY.asLogged : '×' + v} on={Math.abs(mult - v) < 0.001} onPress={() => setMult(v)} />)}
          </Chips>
        </View>
      </Card>
      <Text style={[tx(13), { color: t.label2, paddingHorizontal: 4, paddingBottom: 12 }]}>
        {x.how ? CAPTURE_LABEL[x.how] : EDIT_ENTRY.logged}{gentle ? '.' : ` · ± ${fmt(x.k * entryErr(x))} kcal.`}{' '}
        {flagged ? EDIT_ENTRY.flagged : ''}
      </Text>
      <MealSeg value={meal} onChange={setMeal} />
      <View style={{ gap: 8, marginTop: 16 }}>
        {flagged && <Btn kind="tinted" title={EDIT_ENTRY.looksRight} onPress={() => { confirmEntry(index); onClose() }} />}
        <Btn kind="danger" title={EDIT_ENTRY.delete} onPress={() => { removeFood(index); onClose() }} />
      </View>
    </Sheet>
  )
}
