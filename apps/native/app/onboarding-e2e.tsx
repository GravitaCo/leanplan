/**
 * For the native e2e checks only (scripts/e2e-onboarding-parity.cjs): in a web render built with
 * EXPO_PUBLIC_E2E=1, this route shows onboarding through useOnboardingGate, as the app's gate does
 * (lib/gate.tsx) (the root's gate overlay still covers sign-in, the 18+
 * stop and consent first). Web renders only, and EXPO_PUBLIC_* is inlined at build time, so in any
 * other build, phone builds included, the route renders nothing.
 */
import { Platform, View } from 'react-native'
import { useOnboardingGate } from '../screens/onboarding'
import { Notice } from '../lib/Notice'

const E2E = Platform.OS === 'web' && process.env.EXPO_PUBLIC_E2E === '1'

export default function OnboardingE2E() {
  return E2E ? <Live /> : null
}

// The root's gate draws onboarding now (lib/gate.tsx), so this route draws nothing over it and
// only says so when nothing is due.
function Live() {
  const ob = useOnboardingGate()
  return ob ? null : <View style={{ flex: 1 }}><Notice title="Onboarding isn’t due" /></View>
}
