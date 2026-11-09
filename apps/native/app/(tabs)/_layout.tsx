// Spike tabs: Summary and the Spike lab. The real tab bar (Summary, Mind, Food, Train, Plan, and the
// Profile avatar) is N0, built to match ui/BottomNav.tsx.
import { Tabs } from 'expo-router'
import { useTokens, GEIST } from '../../lib/theme'
import { useStore } from '@/store/store'
import { useGate } from '../../lib/gate'

export default function TabsLayout() {
  const t = useTokens()
  const gated = useGate() !== null
  const ready = useStore((s) => s.authReady)
  if (gated || !ready) return null
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.tint,
      tabBarInactiveTintColor: t.label2,
      tabBarStyle: { backgroundColor: t.card, borderTopColor: t.sep },
      tabBarLabelStyle: { fontFamily: GEIST[600], fontSize: 11 },
      tabBarIconStyle: { display: 'none' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Summary' }} />
      <Tabs.Screen name="lab" options={{ title: 'Spike' }} />
    </Tabs>
  )
}
