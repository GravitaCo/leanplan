/**
 * How maintenance works (the web's MaintenanceCard in screens/plan/PlanLibrary.tsx, Plans 1): a tall
 * sheet with Close, the heading, the two bars, the five steps (src/copy/plan.ts) and Got it.
 */
import { Text, View } from 'react-native'
import { MAINTENANCE_STEPS } from '@/copy/plan'
import { Btn } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { num, tx, useTokens } from '../../lib/theme'

export function MaintenanceCard({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  // .mc-bars: 3fr and 2fr, a 10 pt bar over each label (building: --sep; holding: a --dash outline)
  const bar = (label: string, outline: boolean, flex: number) => (
    <View style={{ flex, paddingTop: 16 }}>
      <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, borderRadius: 3 }, outline ? { borderWidth: 1.5, borderColor: t.dash } : { backgroundColor: t.sep }]} />
      <Text style={[tx(12), { color: t.label2 }]}>{label}</Text>
    </View>
  )
  return (
    <Sheet title="After your plan" onClose={onClose} tall left={null} right={<NavBtn title="Close" onPress={onClose} />}>
      <Text accessibilityRole="header" style={[tx(28, 600, 1.3, -0.02), { color: t.label, marginHorizontal: 4, marginBottom: 14 }]}>Keeping what you've built</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 4, marginBottom: 18 }}>
        {bar('Your plan: building', false, 3)}{bar('Maintenance: holding steady', true, 2)}
      </View>
      <View style={{ gap: 16 }}>
        {MAINTENANCE_STEPS.map(([h, p], i) => (
          <View key={h} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[tx(14, 600), num, { color: t.tint }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[tx(17, 600), { color: t.label, marginBottom: 4 }]}>{h}</Text>
              <Text style={[tx(15, 400, 1.45), { color: t.label2 }]}>{p}</Text>
            </View>
          </View>
        ))}
      </View>
      {/* .sheet-cta */}
      <View style={{ paddingTop: 12, marginTop: 16 }}><Btn title="Got it" onPress={onClose} /></View>
    </Sheet>
  )
}
