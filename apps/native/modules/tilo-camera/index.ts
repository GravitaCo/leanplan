/**
 * Tilo's camera: AVFoundation, Vision, PhotosUI and ImageIO on iOS, no outside library. The preview
 * view, the permission, barcodes from a still photo, choosing a photo, making a photo ready to send,
 * and its own temporary files. Android: not yet
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

/** One photo from the library (the system picker, no permission), copied into the module's
 *  temporary folder, or null when cancelled. */
export async function pickPhoto(): Promise<{ uri: string; width: number; height: number } | null> {
  if (!TiloCamera) throw new Error('no camera module')
  return TiloCamera.pickPhoto()
}

export interface PreparedPhoto {
  /** the JPEG that's sent, kept for the review thumbnail until the read */
  uri: string
  /** base64 JPEG (no data: prefix), no metadata */
  base64: string
  width: number
  height: number
  /** the photo's quality numbers, or null when they couldn't be measured */
  quality: FrameQuality | null
}

/** A photo made ready to send (steps and cap from JS); the source is deleted if it's the module's. */
export async function preparePhoto(uri: string, steps: [number, number][], maxBytes: number, qualityEdge: number, clip: number): Promise<PreparedPhoto> {
  if (!TiloCamera) throw new Error('no camera module')
  const r = await TiloCamera.preparePhoto(uri, steps, maxBytes, qualityEdge, clip)
  return { uri: r.uri, base64: r.base64, width: r.width, height: r.height, quality: toFrameQuality(r.quality) }
}

/** Deletes one of the module's temporary photos (anything else is left alone). */
export async function deletePhoto(uri: string): Promise<void> {
  await TiloCamera?.deleteFile(uri)
}

/** Deletes every temporary photo: after a read, when a scan screen closes, and at launch. */
export async function clearTemporaryPhotos(): Promise<void> {
  await TiloCamera?.clearTemporary()
}
