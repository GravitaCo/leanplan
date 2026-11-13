/**
 * Visible differences from the web, each off until Benn or Sara approve its board
 * (screens/scan/PROPOSALS.md). With a flag off the screen does what the code can do today on
 * native and the difference is listed in PARITY.md.
 */

/** P1: the web's "Take a photo" row on the barcode screen. expo-camera can't read an EAN/UPC
 *  from a still photo on iOS (scanFromURLAsync reads QR only there), so the row is left out. */
export const BARCODE_PHOTO_ROW = false

/** P2: the label photo's quality check (too dark, glare, blur: core/domain/labelQuality.ts) run on
 *  the photo once taken, in place of the web's live line over the camera (expo-camera gives no frame
 *  pixels). Needs jpeg-js, approved only with this proposal. Off: no check, one Capture button. */
export const PHOTO_QUALITY_CHECK = false
