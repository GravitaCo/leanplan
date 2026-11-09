import { useEffect } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist'
import { useStore } from '@/store/store'
import { supabase } from '@/data/supabase'
import { useGate } from '../lib/gate'

// supabase-js on React Native: refresh the session only while the app is in front
AppState.addEventListener('change', (s) => {
  if (s === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
// a cold launch is already active, so no change fires for it (security-data finding 3)
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh()

export default function Root() {
  const [fontsLoaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold })
  const initAuth = useStore((s) => s.initAuth)
  useEffect(() => { initAuth() }, [initAuth])
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
