/**
 * Profile's own sheet, Hand portions (src/screens/ProfileScreen.tsx HandsSheet). Sign out and Import's
 * confirm are N2's (lib/account/AccountData.tsx); the review-day sheet is N4's (screens/today/WeeklyReview.tsx).
 */
import { useState } from 'react'
import type { HandPortion } from '@/core/types'
import { useStore } from '@/store/store'
import { HANDS, handGrams } from '@/core/domain/estimate'
import { PROFILE as P } from '@/copy/profile'
import { Sub } from '../../lib/ui/text'
import { List } from '../../lib/ui/kit'
import { FRow } from '../../lib/ui/fields'
import { NavBtn, Sheet } from '../../lib/ui/primitives'

/** Weigh one of each once; after that "a palm" is a measurement, not a guess. */
export function HandsSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const types = Object.keys(HANDS) as HandPortion[]
  const [vals, setVals] = useState<Record<HandPortion, string>>(
    Object.fromEntries(types.map((k) => [k, String(handGrams(profile, k))])) as Record<HandPortion, string>,
  )
  const save = () => {
    const hands: Partial<Record<HandPortion, number>> = { ...profile.hands }
    for (const k of types) { const v = parseFloat(vals[k]); if (v > 0) hands[k] = Math.round(v) }
    setPrefs({ hands }); showToast(P.hands.saved); onClose()
  }
  return (
    <Sheet title={P.hands.title} onClose={onClose} right={<NavBtn title={P.hands.save} bold onPress={save} />}>
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>{P.hands.lead}</Sub>
      <List>
        {types.map((k) => (
          <FRow key={k} label={HANDS[k].label} hint={HANDS[k].hint} unit={P.hands.unit} keyboardType="number-pad" value={vals[k]} onChangeText={(v) => setVals({ ...vals, [k]: v })} />
        ))}
      </List>
    </Sheet>
  )
}
