/**
 * Get outside's large icon square (board B13, mind.css `.go-sq.lg`): 56 pt, radius 14, in the move
 * pillar's fill with the icon in its ink. Mind-only (the lead, 13 Nov 2026), on tokens.
 */
import { View } from 'react-native'
import { Icon, type IconName } from '../../lib/ui/icons'
import { useTokens } from '../../lib/theme'

export function GoSquare({ icon, size }: { icon: Extract<IconName, 'sun' | 'leaf'>; size: number }) {
  const t = useTokens()
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.moveFill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size} color={t.moveInk} />
    </View>
  )
}
