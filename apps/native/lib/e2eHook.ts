/**
 * For the native e2e checks only (scripts/e2e-sync.cjs): in a web render built with
 * EXPO_PUBLIC_E2E=1, the shared store is reachable as `window.__tiloStore`, so the checks can log,
 * save notes and finish onboarding through the store's own actions while the native screens for
 * them (N2, N4, N5, N8) aren't built yet. EXPO_PUBLIC_* is inlined at build time, so in any other
 * build, phone builds included, this is dead code and nothing is exposed.
 */
import { Platform } from 'react-native'
import { useStore } from '@/store/store'

if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_E2E === '1') {
  ;(globalThis as unknown as { __tiloStore?: typeof useStore }).__tiloStore = useStore
}
