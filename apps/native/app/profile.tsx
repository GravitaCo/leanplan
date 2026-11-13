// N10: Profile as its own route, for the parity check and until the lead wires the avatar to it.
// Gated like the tab layout: nothing renders until sign-in, consent and the store are ready.
import { useStore } from '@/store/store'
import { useGate } from '../lib/gate'
import { ProfileScreen } from '../lib/profile'

export default function Profile() {
  const gated = useGate() !== null
  const ready = useStore((s) => s.authReady)
  return gated || !ready ? null : <ProfileScreen />
}
