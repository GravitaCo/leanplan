/** Explains the ± on the day total (src/screens/food/MarginSheet.tsx): honest about what the log knows. */
import { View } from 'react-native'
import { useStore } from '@/store/store'
import { CAPTURE_LABEL, biggestMarginSource, dayMargin } from '@/core/domain/estimate'
import { useTokens } from '../../lib/theme'
import { Big, Card, NavBtn, Sheet, Sub, Txt } from './ui'

export function MarginSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const foods = useStore((s) => s.data.days[s.cur]?.foods) ?? []
  const margin = dayMargin(foods)
  const top = biggestMarginSource(foods)
  const p = { size: 15, style: { lineHeight: 22, marginBottom: 10 } } as const
  return (
    <Sheet title="About this estimate" left={null} onClose={onClose} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <Card center>
        <Big value={`± ${margin}`} unit="kcal" />
        <Sub>today's margin</Sub>
      </Card>
      <View style={{ paddingHorizontal: 4 }}>
        <Txt {...p}>No food log is exact. Portions are guessed, labels round, and cooking changes things. Instead of pretending, Tilo shows how sure it is.</Txt>
        <Txt {...p}>Weighed food is very close. Servings and your usual portions are close. Hand estimates and quick estimates are rougher. The margin combines them all.</Txt>
        {top && <Txt {...p}><Txt size={15} w={700}>Biggest source today:</Txt> {CAPTURE_LABEL[top].toLowerCase()} entries.</Txt>}
        <Txt {...p} color={t.label2}>For context, careful manual logging typically misses 20% or more. Roughly right every day beats precise now and then.</Txt>
      </View>
    </Sheet>
  )
}
