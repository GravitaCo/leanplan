// The tab shell (native-build-plan N0): Summary, Mind, Food, Train, Plan, drawn by lib/ui/TabBar to
// match the web's bar. Profile is the avatar beside each title; in the spike it opens the lab screen.
import { Tabs } from 'expo-router'
import { useStore } from '@/store/store'
import { useGate } from '../../lib/gate'
import { TabBar } from '../../lib/ui/TabBar'
import { LabSheet } from '../../lib/labSheet'
import { ToastHost } from '../../lib/ui/kit'

export default function TabsLayout() {
  const gated = useGate() !== null
  const ready = useStore((s) => s.authReady)
  if (gated || !ready) return null
  return (
    <>
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="mind" />
      <Tabs.Screen name="food" />
      <Tabs.Screen name="train" />
      <Tabs.Screen name="plan" />
    </Tabs>
    {/* the app's one toast, above the tab bar (App.tsx's .toast) */}
    <ToastHost />
    <LabSheet />
    </>
  )
}
