/**
 * Native port of src/ui/BottomNav.tsx with WELLBEING_ENABLED: Summary, Mind, Food, Train, Plan, and
 * Profile as the avatar beside every title. With the Mind pillar off the Mind tab stays in place,
 * faded and not tappable, so the bar never shifts (Benn, 8 Oct). Sizes from theme.css `.tabbar`:
 * the icons draw at 20 pt as the web's `svg.i` rule draws them (their 25 size attribute loses to it).
 * A tap sets store.tab (lib/navBridge.ts moves the router), so tabs change only through the store,
 * and a pushed full-screen view (Reset, the guided player...) hides the bar, as on the web.
 * (With the wellbeing flag off the web shows Profile as a fifth tab instead of Mind: N0 follow-up.)
 */
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from 'expo-router/tabs'
import { useStore, type Tab } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { Icon, type IconName } from './icons'
import { tx, useTokens } from '../theme'

export type TabRoute = 'index' | 'mind' | 'food' | 'train' | 'plan'
const TABS: { route: TabRoute; tab: Tab; label: string; icon: IconName }[] = [
  { route: 'index', tab: 'today', label: 'Summary', icon: 'heart' },
  { route: 'mind', tab: 'mind', label: 'Mind', icon: 'mind' },
  { route: 'food', tab: 'food', label: 'Food', icon: 'fork' },
  { route: 'train', tab: 'train', label: 'Train', icon: 'dumbbell' },
  { route: 'plan', tab: 'plan', label: 'Plan', icon: 'calendar' },
]

/** The bar's look: `active` tab in the tint, the Mind tab faded when the Mind pillar is off. */
export function TabBarView({ active, mindOff, onPress, bottom }: { active: string | undefined; mindOff: boolean; onPress: (r: TabRoute) => void; bottom: number }) {
  const t = useTokens()
  return (
    // The web's bar is fixed over the page, so its translucent --tabbar always composites over --bg.
    // Here the bar sits below the scene, so --bg is laid under it to give the same colour.
    <View style={{ backgroundColor: t.bg }}>
    <View accessibilityRole="tablist" accessibilityLabel="Main" style={{ flexDirection: 'row', backgroundColor: t.tabbar, borderTopWidth: 1, borderTopColor: t.sep, paddingBottom: bottom }}>
      {TABS.map(({ route, label, icon }) => {
        const off = route === 'mind' && mindOff
        const on = !off && active === route
        const color = off ? t.label3 : on ? t.tint : t.label2
        return (
          <Pressable key={route} disabled={off} accessibilityRole="tab"
            accessibilityLabel={off ? 'Mind, switched off in Profile' : undefined}
            accessibilityState={{ selected: on, disabled: off }}
            onPress={() => onPress(route)}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 7, paddingBottom: 5 }}>
            <Icon name={icon} size={20} stroke={on ? 2.3 : 1.9} color={color} />
            <Text style={[tx(10, 500, 1.3, 0.01), { color }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
    </View>
  )
}

export function TabBar({ state, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const mindOff = useStore((s) => WELLBEING_ENABLED && !!s.data.profile.mind?.off?.includes('mind'))
  const setTab = useStore((s) => s.setTab)
  const focused = state.routes[state.index]
  const style = focused ? StyleSheet.flatten(descriptors[focused.key]?.options.tabBarStyle as StyleProp<ViewStyle>) : undefined
  if (style?.display === 'none') return null
  return (
    <TabBarView active={focused?.name} mindOff={mindOff} bottom={insets.bottom}
      onPress={(route) => { const x = TABS.find((y) => y.route === route); if (x) setTab(x.tab) }} />
  )
}
