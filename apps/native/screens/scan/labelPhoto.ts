/**
 * Label photos on the phone, with no UI: take one from the camera view or choose one from the
 * photo library, and make it the JPEG the web sends to ai-read-label (src/screens/food/
 * LabelCaptureView.tsx `toJpeg`): long edge at most 1600 px for the nutrition table and 1024 px for
 * the front, at most 1.5 MB, trying quality 0.85, then 0.72, then 80% of the edge at 0.72. The
 * rules are here (photoSize.ts); Tilo's camera module applies them with ImageIO, re-encoding with
 * no metadata, so no EXIF or location leaves the phone.
 *
 * Every photo file lives only in the camera module's temporary folder, until it has been read (or
 * the screen closes, or a photo is retaken), then it's deleted; a launch sweep removes anything a
 * crash left behind. Tilo never keeps it (compliance register item 24).
 */
import { QUALITY_EDGE, QUALITY_LIMITS, qualityIssue, type QualityIssue } from '@/core/domain/labelQuality'
import { clearTemporaryPhotos, deletePhoto, pickPhoto, preparePhoto, type TiloCameraViewRef } from '../../modules/tilo-camera'
import { edgeOf, jpegSteps, MAX_BYTES, type PhotoKind } from './photoSize'

export type { PhotoKind }
export interface Shot {
  /** shown as the review thumbnail */
  uri: string
  /** base64 JPEG, no data: prefix: the request body's `panel` or `front` */
  base64: string
  issue: QualityIssue | null
}

/** A photo file made ready to send, with its quality judged by core (the review row). */
async function shotFrom(uri: string, kind: PhotoKind): Promise<Shot> {
  const p = await preparePhoto(uri, jpegSteps(edgeOf(kind)), MAX_BYTES, QUALITY_EDGE, QUALITY_LIMITS.clip)
  return { uri: p.uri, base64: p.base64, issue: p.quality ? qualityIssue(p.quality) : null }
}

/** A photo from the camera view. Throws when it can't be used ("That photo couldn't be used."). */
export async function captureShot(cam: TiloCameraViewRef, kind: PhotoKind): Promise<Shot> {
  const pic = await cam.takePhoto()
  return shotFrom(pic.uri, kind)
}

/** A photo chosen from the library, or null if the person cancelled. Throws when it can't be
 *  opened ("That photo couldn't be opened."). */
export async function pickShot(kind: PhotoKind): Promise<Shot | null> {
  const p = await pickPhoto()
  return p ? shotFrom(p.uri, kind) : null
}

/** A photo of a barcode from the library (the web's "Take a photo" row), or null if cancelled.
 *  The caller decodes it, then deletes it with `deleteFile`. */
export async function pickPhotoUri(): Promise<string | null> {
  return (await pickPhoto())?.uri ?? null
}

/** Delete one photo file now. */
export function deleteFile(uri: string): void {
  void deletePhoto(uri)
}

/** A photo replaced (Retake) or removed (the front). */
export function discardShot(shot: Shot | null): void {
  if (shot) deleteFile(shot.uri)
}

/** Every photo file still on the phone: as soon as the read has an answer (any answer), and when
 *  the screen closes. */
export function discardAll(): void {
  void clearTemporaryPhotos()
}

/** At launch, whatever a crash left behind (the lead calls it from the app's start-up). */
export function sweepPhotoCache(): void {
  void clearTemporaryPhotos()
}
