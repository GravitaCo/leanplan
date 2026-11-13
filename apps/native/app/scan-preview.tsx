// The scan screens in their states (screens/scan/ScanPreview.tsx) for design review and the parity
// screenshots, in EXPO_PUBLIC_E2E builds only: elsewhere the route renders nothing, and the inlined
// flag lets the bundler drop the preview from a release bundle.
import { Redirect } from 'expo-router'
import { ScanPreview } from '../screens/scan/ScanPreview'

export default function ScanPreviewRoute() {
  if (process.env.EXPO_PUBLIC_E2E !== '1') return <Redirect href="/" />
  return <ScanPreview />
}
