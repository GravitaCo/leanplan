/**
 * The camera's native events in the web's terms. Pure (no React, no native code), so
 * apps/native/screens/scan/test-scan.ts checks it in node.
 *
 * Barcodes: the native reader names formats 'ean13', 'ean8', 'upce'; the shared code
 * (core/domain/barcode.ts SCAN_FORMATS) uses the Barcode Detection API's 'ean_13', 'ean_8',
 * 'upc_a', 'upc_e'. AVFoundation and Vision report a UPC-A as an EAN-13 with a leading 0 (13
 * digits), and some readers drop that 0 (12 digits): either way normalizeBarcode gives the same
 * code the web looks up.
 */
import type { FrameQuality } from '@/core/domain/labelQuality'

export type NativeBarcodeType = 'ean13' | 'ean8' | 'upce'
export interface NativeBarcode { type: string; data: string }

const TO_WEB: Record<string, string> = { ean13: 'ean_13', ean8: 'ean_8', upce: 'upc_e', upc_e: 'upc_e', upc_a: 'upc_a' }

/** The web decoder's format name for a native read (anything else passes through unchanged). */
export function webFormat(type: string, data: string): string {
  const f = TO_WEB[type] ?? type
  return f === 'ean_13' && /^\d{12}$/.test(data) ? 'upc_a' : f
}

/** A native read as the web decoder's hit ({ raw, format }). */
export const toHit = (b: NativeBarcode): { raw: string; format: string } => ({ raw: b.data, format: webFormat(b.type, b.data) })

/** A quality event's numbers as core's FrameQuality, or null when they aren't numbers. */
export function toFrameQuality(e: unknown): FrameQuality | null {
  if (!e || typeof e !== 'object') return null
  const { blur, brightness, glare } = e as Record<string, unknown>
  return [blur, brightness, glare].every((v) => typeof v === 'number' && Number.isFinite(v))
    ? { blur: blur as number, brightness: brightness as number, glare: glare as number }
    : null
}

/** The camera's permission states. */
export type CameraPermission = 'granted' | 'denied' | 'undetermined'
export const toPermission = (s: unknown): CameraPermission => (s === 'granted' || s === 'undetermined' ? s : 'denied')
