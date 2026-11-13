/**
 * Tilo's camera: AVFoundation and Vision on iOS, no third-party camera library. The preview view,
 * the permission, barcodes from a still photo, and a photo's quality numbers. Android: not yet
 * (README.md says what its Kotlin side needs); without the module everything reports "no camera".
 */
import TiloCamera from './src/TiloCameraModule'
import { toFrameQuality, toPermission, type CameraPermission, type NativeBarcode } from './src/mapping'
import type { FrameQuality } from '@/core/domain/labelQuality'

export { TiloCameraView, type CameraMode, type TakenPhoto, type TiloCameraViewProps, type TiloCameraViewRef } from './src/TiloCameraView'
export { toFrameQuality, toHit, toPermission, webFormat, type CameraPermission, type NativeBarcode } from './src/mapping'

export const cameraAvailable = (): boolean => !!TiloCamera

export async function cameraPermission(): Promise<CameraPermission> {
  return TiloCamera ? toPermission(await TiloCamera.permissionStatus()) : 'denied'
}

export async function requestCameraPermission(): Promise<CameraPermission> {
  return TiloCamera ? toPermission(await TiloCamera.requestPermission()) : 'denied'
}

/** Retail barcodes in a photo file (Vision). Empty without the module. */
export async function barcodesInImage(uri: string): Promise<NativeBarcode[]> {
  return TiloCamera ? TiloCamera.barcodesInImage(uri) : []
}

/** A photo file's quality numbers, or null when they can't be measured. */
export async function measureImage(uri: string, edge: number, clip: number): Promise<FrameQuality | null> {
  if (!TiloCamera) return null
  try { return toFrameQuality(await TiloCamera.measureImage(uri, edge, clip)) } catch { return null }
}
