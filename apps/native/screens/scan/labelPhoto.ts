/**
 * Label photos on the phone, with no UI: take one from the camera view or choose one from the
 * photo library, and make it the JPEG the web sends to ai-read-label (src/screens/food/
 * LabelCaptureView.tsx `toJpeg`): long edge at most 1600 px for the nutrition table and 1024 px for
 * the front, at most 1.5 MB, trying quality 0.85, then 0.72, then 80% of the edge at 0.72.
 *
 * The photo stays in memory and the app's own cache folder only while the label screen is open,
 * and is discarded when it closes (Tilo never keeps it).
 */
import type { CameraView } from 'expo-camera'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { launchImageLibraryAsync } from 'expo-image-picker'
import type { QualityIssue } from '@/core/domain/labelQuality'
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

/** Files written while the screen is open, deleted by `discardAll`. */
const written = new Set<string>()

async function toJpeg(src: Source, edge: number): Promise<{ uri: string; base64: string }> {
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
  }
  throw new Error('too large')
}

/** The quality check on a taken photo (proposal P2, PHOTO_QUALITY_CHECK): null until approved. */
async function qualityOf(_src: Source): Promise<QualityIssue | null> {
  return null
}

async function shotFrom(src: Source, kind: PhotoKind): Promise<Shot> {
  const [jpeg, issue] = await Promise.all([toJpeg(src, edgeOf(kind)), qualityOf(src)])
  return { ...jpeg, issue }
}

/** A photo from the camera view. Throws when it can't be used ("That photo couldn't be used."). */
export async function captureShot(cam: CameraView, kind: PhotoKind): Promise<Shot> {
  const pic = await cam.takePictureAsync({ quality: 1, exif: false })
  if (!pic?.uri) throw new Error('no picture')
  written.add(pic.uri)
  return shotFrom(pic, kind)
}

/** A photo chosen from the library (no permission needed: the system picker), or null if the
 *  person cancelled. Throws when it can't be opened ("That photo couldn't be opened."). */
export async function pickShot(kind: PhotoKind): Promise<Shot | null> {
  const r = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false, base64: false })
  if (r.canceled || !r.assets?.[0]) return null
  const a = r.assets[0]
  // the picker hands over a copy in the app's cache: it goes with the rest
  written.add(a.uri)
  return shotFrom({ uri: a.uri, width: a.width, height: a.height }, kind)
}

/** Deletes every photo file written while the screen was open. Deleting needs expo-file-system
 *  (asked of the lead); until it's agreed the files stay in the app's cache folder, which only
 *  this app can read and the system clears. */
export function discardAll(): void {
  written.clear()
}
