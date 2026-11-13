// The tab shell (native-build-plan N0): Summary, Mind, Food, Train, Plan, drawn by lib/ui/TabBar to
// match the web's bar. store.tab decides the tab (lib/navBridge.ts); Profile is the avatar beside
// each title, opening the avatar sheet until N10's Profile lands. Nothing renders behind the gate.
import { Tabs } from 'expo-router'
import { useStore } from '@/store/store'
import { useGate } from '../../lib/gate'
import { TabBar } from '../../lib/ui/TabBar'
import { LabSheet } from '../../lib/labSheet'
import { useNavBridge } from '../../lib/navBridge'

export default function TabsLayout() {
  const gated = useGate() !== null
  const ready = useStore((s) => s.authReady)
  if (gated || !ready) return null
  return <Shell />
}

function Shell() {
  useNavBridge()
  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="mind" />
        <Tabs.Screen name="food" />
        <Tabs.Screen name="train" />
        <Tabs.Screen name="plan" />
      </Tabs>
      <LabSheet />
    </>
  )
}
