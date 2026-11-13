import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist'
import { useStore } from '@/store/store'
import { useGate } from '../lib/gate'
import '../lib/e2eHook'
import { clearBackupCopies } from '../lib/account/backupFile'

export default function Root() {
  const [fontsLoaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold })
  const initAuth = useStore((s) => s.initAuth)
  useEffect(() => { initAuth() }, [initAuth])
  // a backup copy the share sheet left in the cache (N2: lib/account/backupFile.ts)
  useEffect(() => { clearBackupCopies() }, [])
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
