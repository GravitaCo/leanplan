/** Correcting an entry is a slider on the entry itself, never a trip back to search (src/screens/food/EditEntrySheet.tsx). */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { CAPTURE_LABEL, entryErr, isFlagged } from '@/core/domain/estimate'
import { amountText, roundAmount } from '@/core/domain/nutrition'
import { Big, Button, Card, Chip, Chips, NavBtn, Sheet, Slider, Stack, Sub } from './ui'
import { MealSeg } from './common'

const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function EditEntrySheet({ index, onClose }: { index: number; onClose: () => void }) {
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
  const u = x.unit ?? 'g'
  // items snap to quarters, and the multiplier follows the snapped count so kcal and count agree
  const amount = roundAmount((x.grams || 0) * mult, u)
  const m = u === 'item' && x.grams ? amount / x.grams : mult
  const flagged = isFlagged(x, profile)
  const save = () => { updateEntry(index, m, meal); onClose() }

  return (
    <Sheet title={x.n} onClose={onClose} right={<NavBtn bold title="Done" onPress={save} />}>
      <Card center>
        {gentle
          ? <Big value={x.grams ? amountText(amount, u) : `×${mult}`} />
          : <Big value={fmt(x.k * m)} unit="kcal" />}
        <Sub n>{!gentle && x.grams ? `${amountText(amount, u)} · ` : ''}{r1(x.p * m)} g protein</Sub>
        <Slider min={0.25} max={3} step={0.05} value={mult} onChange={setMult} label="Portion size" style={{ marginTop: 12, alignSelf: 'stretch' }} />
        <Chips style={{ justifyContent: 'center', marginTop: 8 }}>
          {STEPS.map((v) => (
            <Chip key={v} on={Math.abs(mult - v) < 0.001} onPress={() => setMult(v)} label={v === 1 ? 'As logged' : '×' + v} />
          ))}
        </Chips>
      </Card>
      <Sub style={{ fontSize: 13, letterSpacing: -0.13, paddingHorizontal: 4, paddingBottom: 12 }}>
        {x.how ? CAPTURE_LABEL[x.how] : 'Logged'}{gentle ? '.' : ` · ± ${fmt(x.k * entryErr(x))} kcal.`}{' '}
        {flagged ? 'This is one of the bigger uncertainties in your day.' : ''}
      </Sub>
      <MealSeg value={meal} onChange={setMeal} />
      <Stack>
        {flagged && <Button kind="tinted" title="Looks right" onPress={() => { confirmEntry(index); onClose() }} />}
        <Button kind="danger" title="Delete entry" onPress={() => { removeFood(index); onClose() }} />
      </Stack>
    </Sheet>
  )
}
