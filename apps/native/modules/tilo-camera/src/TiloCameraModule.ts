import { NativeModule, requireOptionalNativeModule } from 'expo'
import type { NativeBarcode } from './mapping'

declare class TiloCameraModule extends NativeModule<Record<never, never>> {
  permissionStatus(): Promise<string>
  requestPermission(): Promise<string>
  barcodesInImage(uri: string): Promise<NativeBarcode[]>
  measureImage(uri: string, edge: number, clip: number): Promise<Record<string, unknown>>
}

/** null in a build without the module (Expo Go, web, Android until its Kotlin side exists). */
export default requireOptionalNativeModule<TiloCameraModule>('TiloCamera')
