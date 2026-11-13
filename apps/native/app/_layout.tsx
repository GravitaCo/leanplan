import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { FONTS } from '../lib/theme'
import { useStore } from '@/store/store'
import { useGate } from '../lib/gate'
import '../lib/e2eHook'
import { useNotifications } from '../lib/platform/notifications'

export default function Root() {
  const [fontsLoaded] = useFonts(FONTS)
  const initAuth = useStore((s) => s.initAuth)
  useEffect(() => { initAuth() }, [initAuth])
  // reminders: taps, the delivery log and the push token (N12)
  useNotifications()
  // the navigator stays mounted (Expo Router needs it); its screens render nothing while gated
  const gate = useGate(fontsLoaded)
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      {gate && <View style={StyleSheet.absoluteFill}>{gate}</View>}
    </SafeAreaProvider>
  )
}
