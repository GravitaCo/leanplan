/**
 * Barcode decoding for the scanner. The browser's own BarcodeDetector when it reads all four
 * retail formats (Android Chrome); otherwise the `barcode-detector` polyfill (ZXing compiled to
 * WebAssembly), imported only when the scanner opens so the main bundle doesn't carry it.
 * The .wasm is a Vite asset served from our own origin (never a CDN), so the service worker
 * caches it on first use and scanning works offline afterwards.
 */
import { SCAN_FORMATS } from '@/core/domain/barcode'

export interface Hit { raw: string; format: string }
export interface Decoder { native: boolean; detect: (src: ImageBitmapSource) => Promise<Hit[]> }

interface DetectorLike { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string; format: string }[]> }

const wrap = (d: DetectorLike, native: boolean): Decoder => ({
  native,
  detect: async (src) => (await d.detect(src)).map((b) => ({ raw: b.rawValue, format: b.format })),
})

async function nativeDecoder(): Promise<Decoder | null> {
  const N = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): DetectorLike; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  if (!N || typeof N.getSupportedFormats !== 'function') return null
  try {
    const have = await N.getSupportedFormats()
    return SCAN_FORMATS.every((f) => have.includes(f)) ? wrap(new N({ formats: [...SCAN_FORMATS] }), true) : null
  } catch {
    return null
  }
}

async function polyfillDecoder(): Promise<Decoder> {
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  // load the module now (not on the first frame) so a missing .wasm shows up as "can't scan"
  await prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? new URL(wasmUrl, location.href).href : prefix + path) },
    fireImmediately: true,
  })
  return wrap(new BarcodeDetector({ formats: [...SCAN_FORMATS] }), false)
}

let pending: Promise<Decoder> | null = null

/** The decoder, made once per page. A failure (e.g. offline before the .wasm was ever cached)
 *  isn't remembered, so the next open tries again. */
export function getDecoder(): Promise<Decoder> {
  pending ??= nativeDecoder().then((d) => d ?? polyfillDecoder()).catch((e) => { pending = null; throw e })
  return pending
}

/**
 * Decode a still photo. Phone photos are 12 MP or more; ZXing reads a barcode better (and much
 * faster) from a smaller copy, so try a large then a small one. EXIF rotation is applied by
 * createImageBitmap (the default in current Safari and Chrome).
 */
export async function decodePhoto(file: Blob): Promise<Hit[]> {
  const d = await getDecoder()
  const bmp = await createImageBitmap(file)
  try {
    for (const max of [1800, 900]) {
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas')
      c.width = Math.round(bmp.width * scale)
      c.height = Math.round(bmp.height * scale)
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      const hits = await d.detect(c)
      if (hits.length) return hits
      if (scale === 1) break
    }
    return []
  } finally {
    bmp.close()
  }
}
