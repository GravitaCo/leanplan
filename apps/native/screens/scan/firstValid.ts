/** The first read in a still photo whose number checks out, as the web ScanView's `firstValid`
 *  (a photo is decoded whole, so it needs no second read). Pure, tested in test-scan.ts. */
import { normalizeBarcode } from '@/core/domain/barcode'
import { toHit, type NativeBarcode } from '../../modules/tilo-camera/src/mapping'

export function firstValid(reads: NativeBarcode[]): { raw: string; format: string } | null {
  for (const r of reads) {
    const h = toHit(r)
    if (normalizeBarcode(h.raw, h.format)) return h
  }
  return null
}
