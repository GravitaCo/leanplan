/**
 * Barcode helpers for the scan screen. The native reads' format names map to the web's in the
 * camera module (modules/tilo-camera/src/mapping.ts `webFormat`).
 */
export { webFormat } from '../../modules/tilo-camera/src/mapping'

/** The typed number: digits only, at most 14 (the web's input filter). */
export const typedDigits = (v: string): string => v.replace(/[^\d]/g, '').slice(0, 14)
