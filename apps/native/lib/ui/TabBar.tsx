/**
 * Native port of src/ui/BottomNav.tsx with WELLBEING_ENABLED: Summary, Mind, Food, Train, Plan, and
 * Profile as the avatar beside every title. With the Mind pillar off the Mind tab stays in place,
 * faded and not tappable, so the bar never shifts (Benn, 8 Oct). Sizes from theme.css `.tabbar`.
 * (With the wellbeing flag off the web shows Profile as a fifth tab instead of Mind: N0 follow-up.)
 */
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from 'expo-router/tabs'
import { useStore } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { Icon, type IconName } from './icons'
import { font, useTokens } from '../theme'

const TABS: { route: string; label: string; icon: IconName }[] = [
  { route: 'index', label: 'Summary', icon: 'heart' },
  { route: 'mind', label: 'Mind', icon: 'mind' },
  { route: 'food', label: 'Food', icon: 'fork' },
  { route: 'train', label: 'Train', icon: 'dumbbell' },
  { route: 'plan', label: 'Plan', icon: 'calendar' },
]

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const mindOff = useStore((s) => WELLBEING_ENABLED && !!s.data.profile.mind?.off?.includes('mind'))
  const active = state.routes[state.index]?.name
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: t.tabbar, borderTopWidth: 1, borderTopColor: t.sep, paddingBottom: insets.bottom }}>
      {TABS.map(({ route, label, icon }) => {
        const off = route === 'mind' && mindOff
        const on = !off && active === route
        const color = off ? t.label3 : on ? t.tint : t.label2
        return (
          <Pressable key={route} disabled={off} accessibilityRole="tab"
            accessibilityLabel={off ? 'Mind, switched off in Profile' : label}
            accessibilityState={{ selected: on, disabled: off }}
            onPress={() => { const r = state.routes.find((x) => x.name === route); if (r) navigateToTab(r.key) }}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 7, paddingBottom: 5 }}>
            <Icon name={icon} size={25} stroke={on ? 2.3 : 1.9} color={color} />
            <Text style={[font(500), { fontSize: 10, letterSpacing: 0.1, color }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
