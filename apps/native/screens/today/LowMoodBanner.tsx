/**
 * The low-mood signpost on Summary, ported from src/screens/today/LowMoodBanner.tsx (board B6 frame
 * 2, WP15): the info icon on a --mind-fill square, the B6.10 line for every nation, "See support"
 * and Dismiss with a 44 pt target. When it shows is the web's own hook (useLowMoodSignpost).
 */
import { Pressable, View } from 'react-native'
import { LOW_MOOD_LINE_ANY_NATION } from '@/core/domain/mind'
import { LOW_MOOD } from '@/screens/mind/copy'
import { useTokens } from '../../lib/theme'
import { Button, T, TIcon } from './ui'

export function LowMoodBanner({ onSupport, onDismiss }: { onSupport: () => void; onDismiss: () => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="summary" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.mindFill, alignItems: 'center', justifyContent: 'center' }}>
        <TIcon name="info" size={20} color={t.mindInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T s={15} style={{ lineHeight: 21 }}>{LOW_MOOD_LINE_ANY_NATION}</T>
        <Button title={LOW_MOOD.seeSupport} kind="gray" onPress={onSupport} h={44} size={15} align="flex-start" style={{ marginTop: 10 }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={LOW_MOOD.dismiss} onPress={onDismiss}
        style={{ width: 44, height: 44, marginTop: -8, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
          <TIcon name="x" size={20} stroke={3} color={t.label2} />
        </View>
      </Pressable>
    </View>
  )
}
