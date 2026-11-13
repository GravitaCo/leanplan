/**
 * Label photos on the phone, with no UI: take one from the camera view or choose one from the
 * photo library, and make it the JPEG the web sends to ai-read-label (src/screens/food/
 * LabelCaptureView.tsx `toJpeg`): long edge at most 1600 px for the nutrition table and 1024 px for
 * the front, at most 1.5 MB, trying quality 0.85, then 0.72, then 80% of the edge at 0.72.
 *
 * The photo stays in memory and the app's private cache only until it has been read (or the
 * screen closes, or a photo is retaken), then it's deleted; a launch sweep removes anything a crash
 * left behind. Tilo never keeps it (compliance register item 24).
 */
import { measureImage, type TiloCameraViewRef } from '../../modules/tilo-camera'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { launchImageLibraryAsync } from 'expo-image-picker'
import { Directory, File, Paths } from 'expo-file-system'
import { QUALITY_EDGE, QUALITY_LIMITS, qualityIssue, type QualityIssue } from '@/core/domain/labelQuality'
import { b64Bytes, edgeOf, fitLongEdge, jpegSteps, MAX_BYTES, type PhotoKind } from './photoSize'

export type { PhotoKind }
export interface Shot {
  /** shown as the review thumbnail */
  uri: string
  /** base64 JPEG, no data: prefix: the request body's `panel` or `front` */
  base64: string
  issue: QualityIssue | null
}
interface Source { uri: string; width: number; height: number }

/** The cache folders the camera, the image manipulator and the photo picker write into (their
 *  native code names them: modules/tilo-camera "TiloCamera", expo-image-manipulator
 *  "ImageManipulator", expo-image-picker "ImagePicker"). Only the scan screens use them. */
export const PHOTO_CACHE_DIRS = ['TiloCamera', 'ImageManipulator', 'ImagePicker'] as const

/** Files written and not yet deleted. */
const written = new Set<string>()

/** Delete one photo file now (gone already is fine). */
export function deleteFile(uri: string): void {
  written.delete(uri)
  try {
    const f = new File(uri)
    if (f.exists) f.delete()
  } catch { /* already gone, or never written */ }
}

/**
 * The JPEG that is sent, re-encoded on the device every time (also when no resize is needed), so
 * the camera's or the library's EXIF, location included, never leaves the phone: the web gets the
 * same by redrawing through a canvas. The source and every failed try are deleted at once; only
 * the JPEG that's sent stays, for the review thumbnail, until the read.
 */
async function toJpeg(src: Source, edge: number): Promise<{ uri: string; base64: string }> {
  try {
    for (const [max, q] of jpegSteps(edge)) {
      const ctx = ImageManipulator.manipulate(src.uri)
      const fit = fitLongEdge(src.width, src.height, max)
      if (fit) ctx.resize(fit)
      const img = await ctx.renderAsync()
      const out = await img.saveAsync({ base64: true, compress: q, format: SaveFormat.JPEG })
      img.release()
      ctx.release()
      written.add(out.uri)
      if (out.base64 && b64Bytes(out.base64) <= MAX_BYTES) return { uri: out.uri, base64: out.base64 }
      deleteFile(out.uri)
    }
    throw new Error('too large')
  } finally {
    deleteFile(src.uri)
  }
}

/** The photo's quality, judged as the web judges its small copy (core labelQuality): measured
 *  natively on a grey copy at QUALITY_EDGE, before the source is deleted. Unmeasurable = no flag. */
async function qualityOf(src: Source): Promise<QualityIssue | null> {
  const q = await measureImage(src.uri, QUALITY_EDGE, QUALITY_LIMITS.clip)
  return q ? qualityIssue(q) : null
}

async function shotFrom(src: Source, kind: PhotoKind): Promise<Shot> {
  const issue = await qualityOf(src)
  return { ...(await toJpeg(src, edgeOf(kind))), issue }
}

/** A photo from the camera view. Throws when it can't be used ("That photo couldn't be used."). */
export async function captureShot(cam: TiloCameraViewRef, kind: PhotoKind): Promise<Shot> {
  const pic = await cam.takePhoto()
  written.add(pic.uri)
  return shotFrom(pic, kind)
}

/** A photo of a barcode from the library (the web's "Take a photo" row), or null if cancelled.
 *  The caller decodes it and then deletes it with `deleteFile`. */
export async function pickPhotoUri(): Promise<string | null> {
  const r = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false, base64: false })
  if (r.canceled || !r.assets?.[0]) return null
  written.add(r.assets[0].uri)
  return r.assets[0].uri
}

/** A photo chosen from the library through the system picker (no library permission needed), or
 *  null if the person cancelled. Throws when it can't be opened ("That photo couldn't be opened."). */
export async function pickShot(kind: PhotoKind): Promise<Shot | null> {
  const r = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false, base64: false })
  if (r.canceled || !r.assets?.[0]) return null
  const a = r.assets[0]
  // the picker hands over a copy in the app's cache
  written.add(a.uri)
  return shotFrom({ uri: a.uri, width: a.width, height: a.height }, kind)
}

/** A photo replaced (Retake) or removed (the front). */
export function discardShot(shot: Shot | null): void {
  if (shot) deleteFile(shot.uri)
}

/** Every photo file still on the phone from this screen: called as soon as the read has an answer
 *  (any answer), and when the screen closes. */
export function discardAll(): void {
  for (const uri of [...written]) deleteFile(uri)
}

/** At launch: whatever a crash left behind in the photo cache folders is deleted, so a photo
 *  never outlives the label screen. For the app's start-up (the lead's app/_layout). */
export function sweepPhotoCache(): void {
  for (const name of PHOTO_CACHE_DIRS) {
    try {
      const d = new Directory(Paths.cache, name)
      if (d.exists) d.delete()
    } catch { /* nothing to sweep */ }
  }
}
