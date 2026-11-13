/**
 * The platform barcode scanner's reads in the web decoder's terms. expo-camera names formats
 * 'ean13', 'ean8', 'upc_a', 'upc_e'; the shared code (core/domain/barcode.ts SCAN_FORMATS) uses the
 * Barcode Detection API's 'ean_13', 'ean_8', 'upc_a', 'upc_e'. iOS reports a UPC-A as an EAN-13 and
 * strips its leading 0, so a 12-digit 'ean13' read is a UPC-A: normalizeBarcode gives it back its
 * 0, and the code looked up is the same one the web looks up.
 */
import type { BarcodeType } from 'expo-camera'

/** The four retail formats a food pack carries, as expo-camera names them. */
export const NATIVE_FORMATS: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e']

const TO_WEB: Record<string, string> = { ean13: 'ean_13', ean8: 'ean_8', upc_a: 'upc_a', upc_e: 'upc_e' }

/** The web decoder's format name for a native read (anything else passes through unchanged). */
export function webFormat(type: string, data: string): string {
  const f = TO_WEB[type] ?? type
  return f === 'ean_13' && /^\d{12}$/.test(data) ? 'upc_a' : f
}

/** The typed number: digits only, at most 14 (the web's input filter). */
export const typedDigits = (v: string): string => v.replace(/[^\d]/g, '').slice(0, 14)
