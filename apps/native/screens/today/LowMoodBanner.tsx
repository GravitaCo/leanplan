/**
 * The low-mood signpost on Summary, ported from src/screens/today/LowMoodBanner.tsx (board B6 frame
 * 2, WP15): the info icon on a --mind-fill square, the B6.10 line for every nation, "See support"
 * and Dismiss with a 44 pt target. When it shows is the web's own hook (useLowMoodSignpost).
 */
import { Pressable, Text, View } from 'react-native'
import { LOW_MOOD_LINE_ANY_NATION } from '@/core/domain/mind'
import { LOW_MOOD } from '@/screens/mind/copy'
import { tx, useTokens } from '../../lib/theme'
import { Btn } from '../../lib/ui/kit'
import { Icon } from '../../lib/ui/icons'

export function LowMoodBanner({ onSupport, onDismiss }: { onSupport: () => void; onDismiss: () => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="summary" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.mindFill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="info" size={20} color={t.mindInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tx(15, 400), { color: t.label }, { lineHeight: 21 }]}>{LOW_MOOD_LINE_ANY_NATION}</Text>
        {/* .lm-banner .lm-body .btn.sm: 44 tall, 18 padding */}
        <Btn title={LOW_MOOD.seeSupport} kind="gray" small onPress={onSupport} style={{ marginTop: 10, height: 44, minHeight: 44, borderRadius: 22, paddingHorizontal: 18 }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={LOW_MOOD.dismiss} onPress={onDismiss}
        style={{ width: 44, height: 44, marginTop: -8, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} stroke={3} color={t.label2} />
        </View>
      </Pressable>
    </View>
  )
}
