/** About this estimate (src/screens/food/MarginSheet.tsx): the ± on the day total, honest about what the log knows. */
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { CAPTURE_LABEL, biggestMarginSource, dayMargin } from '@/core/domain/estimate'
import { MARGIN } from '@/copy/food'
import { Big, Card } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { Prose, Sub } from '../../lib/ui/text'
import { tx, useTokens } from '../../lib/theme'

export function MarginSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const foods = useStore((s) => s.data.days[s.cur]?.foods) ?? []
  const margin = dayMargin(foods)
  const top = biggestMarginSource(foods)
  return (
    <Sheet title={MARGIN.title} left={null} onClose={onClose} right={<NavBtn bold title={MARGIN.done} onPress={onClose} />}>
      <Card plain style={{ alignItems: 'center', marginBottom: 10 }}>
        <Big center value={`± ${margin}`} unit="kcal" />
        <Sub>{MARGIN.todaysMargin}</Sub>
      </Card>
      <View style={{ paddingHorizontal: 4 }}>
        <Prose blocks={[
          { p: MARGIN.p1 },
          { p: MARGIN.p2 },
          ...(top ? [{ p: <><Text style={tx(15, 700, 1.45)}>{MARGIN.biggest}</Text> {MARGIN.biggestWhat(CAPTURE_LABEL[top])}</> }] : []),
          { p: <Text style={{ color: t.label2 }}>{MARGIN.context}</Text> },
        ]} />
      </View>
    </Sheet>
  )
}
