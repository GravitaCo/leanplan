import { NativeModule, requireOptionalNativeModule } from 'expo'
import type { NativeBarcode } from './mapping'

declare class TiloCameraModule extends NativeModule<Record<never, never>> {
  permissionStatus(): Promise<string>
  requestPermission(): Promise<string>
  barcodesInImage(uri: string): Promise<NativeBarcode[]>
  pickPhoto(): Promise<{ uri: string; width: number; height: number } | null>
  preparePhoto(uri: string, steps: [number, number][], maxBytes: number, qualityEdge: number, clip: number): Promise<{ uri: string; base64: string; width: number; height: number; quality?: Record<string, unknown> }>
  deleteFile(uri: string): Promise<void>
  clearTemporary(): Promise<void>
}

/** null in a build without the module (Expo Go, web, Android until its Kotlin side exists). */
export default requireOptionalNativeModule<TiloCameraModule>('TiloCamera')
