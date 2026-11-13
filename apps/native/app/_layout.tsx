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
import { clearBackupCopies } from '../lib/account/backupFile'
import { useNotifications } from '../lib/platform/notifications'
import { ToastHost } from '../lib/ui/kit'
import { sweepPhotoCache } from '../screens/scan/labelPhoto'

export default function Root() {
  const [fontsLoaded] = useFonts(FONTS)
  const initAuth = useStore((s) => s.initAuth)
  useEffect(() => { initAuth() }, [initAuth])
  // a backup copy the share sheet left in the cache (N2: lib/account/backupFile.ts)
  useEffect(() => { clearBackupCopies() }, [])
  // label and barcode photos a crash left in Caches/TiloCamera (N6; register: label photos)
  useEffect(() => { sweepPhotoCache() }, [])
  // reminders: taps, the delivery log and the push token (N12)
  useNotifications()
  // the navigator stays mounted (Expo Router needs it); its screens render nothing while gated
  const gate = useGate(fontsLoaded)
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      {/* the app's one toast (App.tsx's .toast): above the tabs and pushed screens such as Profile,
          and, as on the web, not over the gate screens */}
      {!gate && <ToastHost />}
      {gate && <View style={StyleSheet.absoluteFill}>{gate}</View>}
    </SafeAreaProvider>
  )
}
