// The scan screens in their states (screens/scan/ScanPreview.tsx) for design review and the parity
// screenshots, in EXPO_PUBLIC_E2E builds only: elsewhere it redirects home. The preview's code still
// ships in the bundle (Metro keeps the import) but is unreachable and holds fixture packs only. In an
// e2e build it drives the real screens on the real store, so run e2e builds on test accounts only.
import { Redirect } from 'expo-router'
import { ScanPreview } from '../screens/scan/ScanPreview'

export default function ScanPreviewRoute() {
  if (process.env.EXPO_PUBLIC_E2E !== '1') return <Redirect href="/" />
  return <ScanPreview />
}
