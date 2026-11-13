/**
 * Native port of src/ui/BottomNav.tsx with WELLBEING_ENABLED: Summary, Mind, Food, Train, Plan, and
 * Profile as the avatar beside every title. With the Mind pillar off the Mind tab stays in place,
 * faded and not tappable, so the bar never shifts (Benn, 8 Oct). Sizes from theme.css `.tabbar`.
 * A tap sets store.tab (lib/navBridge.ts moves the router), so tabs change only through the store.
 * (With the wellbeing flag off the web shows Profile as a fifth tab instead of Mind: N0 follow-up.)
 */
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from 'expo-router/tabs'
import { useStore, type Tab } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { Icon, type IconName } from './icons'
import { font, useTokens } from '../theme'

const TABS: { route: string; tab: Tab; label: string; icon: IconName }[] = [
  { route: 'index', tab: 'today', label: 'Summary', icon: 'heart' },
  { route: 'mind', tab: 'mind', label: 'Mind', icon: 'mind' },
  { route: 'food', tab: 'food', label: 'Food', icon: 'fork' },
  { route: 'train', tab: 'train', label: 'Train', icon: 'dumbbell' },
  { route: 'plan', tab: 'plan', label: 'Plan', icon: 'calendar' },
]

export function TabBar({ state, descriptors }: BottomTabBarProps) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const mindOff = useStore((s) => WELLBEING_ENABLED && !!s.data.profile.mind?.off?.includes('mind'))
  const setTab = useStore((s) => s.setTab)
  const focused = state.routes[state.index]
  const active = focused?.name
  // a pushed full-screen view (Reset, the guided player...) hides the bar, as on the web
  const style = focused ? StyleSheet.flatten(descriptors[focused.key]?.options.tabBarStyle as StyleProp<ViewStyle>) : undefined
  if (style?.display === 'none') return null
  return (
    // The web's bar is fixed over the page, so its translucent --tabbar always composites over --bg.
    // Here the bar sits below the scene, so --bg is laid under it to give the same colour.
    <View style={{ backgroundColor: t.bg }}>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: t.tabbar, borderTopWidth: 1, borderTopColor: t.sep, paddingBottom: insets.bottom }}>
      {TABS.map(({ route, tab, label, icon }) => {
        const off = route === 'mind' && mindOff
        const on = !off && active === route
        const color = off ? t.label3 : on ? t.tint : t.label2
        return (
          <Pressable key={route} disabled={off} accessibilityRole="tab"
            accessibilityLabel={off ? 'Mind, switched off in Profile' : label}
            accessibilityState={{ selected: on, disabled: off }}
            onPress={() => setTab(tab)}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 7, paddingBottom: 5 }}>
            {/* 20, not the 25 BottomNav asks for: the web's `svg.i` rule draws every icon at 20 px */}
            <Icon name={icon} size={20} stroke={on ? 2.3 : 1.9} color={color} />
            <Text style={[font(500), { fontSize: 10, letterSpacing: 0.1, color }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
    </View>
  )
}
