/**
 * Fixed products for the scan preview (app/scan-preview.tsx, e2e builds only) and its parity
 * screenshots: the same packs the web's e2e scripts use (e2e-label-scan GRANOLA, e2e-shared-products
 * FLAPJACK), built into drafts by the shared core exactly as the scanner would.
 */
import { draftFromOff, type ScanDraft } from '@/core/domain/barcode'
import { draftFromLabel } from '@/core/domain/label'
import { cleanLookupRow, draftFromShared } from '@/core/domain/sharedProduct'
import { LABEL_ROWS, type LabelRead, type LabelRowKey } from '../../../../supabase/functions/_shared/label-read'

const NOW = Date.parse('2026-11-14T12:00:00Z')

export const OFF_PRODUCT = {
  product_name: 'Sensations Roasted Chicken & Thyme', brands: 'Walkers', quantity: '150 g', product_quantity: 150, serving_size: '30 g', serving_quantity: 30,
  nutriments: { 'energy-kcal_100g': 497, 'energy-kj_100g': 2075, fat_100g: 27, 'saturated-fat_100g': 2.3, carbohydrates_100g: 56, sugars_100g: 3.6, fiber_100g: 4.5, proteins_100g: 6.2, salt_100g: 1.3 },
  categories_tags: ['en:crisps'], countries_tags: ['en:united-kingdom'], last_modified_t: Math.floor(NOW / 1000),
}

const GRANOLA: Partial<Record<LabelRowKey, [string, string]>> = {
  kj: ['1640kJ', '492kJ'], kcal: ['390kcal', '117kcal'], fat: ['7.1g', '2.1g'], saturates: ['1.2g', '0.4g'], carbohydrate: ['66.0g', '19.8g'],
  sugars: ['21.0g', '6.3g'], fibre: ['7.5g', '2.3g'], protein: ['9.0g', '2.7g'], salt: ['0.05g', '0.02g'],
}
const cell = (text = '') => ({ text, confidence: 'high' as const })
const readOf = (cells: Partial<Record<LabelRowKey, [string, string]>>): LabelRead => ({
  readable: true, basis: '100g', serving_text: '30g', ri_basis: 'none',
  rows: Object.fromEntries(LABEL_ROWS.map((k) => [k, { per100: cell(cells[k]?.[0]), serving: cell(cells[k]?.[1]), ri: cell() }])) as LabelRead['rows'],
  front: { brand: 'Tilo Test', product: 'Crunchy Granola', variety: 'Honey', pack_size: '500g' },
})

const flapjack = (reads: number, verified = false) => cleanLookupRow({
  version: 2, name: 'Oat & raisin flapjack', k: 442, p: 5.5, c: 58, f: 20, fibre: 4, sugars: 30, sat: 9, salt: 0.3, ml: false, serving_g: 65,
  status: verified ? 'verified' : 'unverified', label_reads: reads, audited_on: verified ? '2026-10-01' : null,
})

export const CODE = '5012345678900'

/** Every draft the confirm view is checked in. */
export function previewDrafts(): Record<string, ScanDraft> {
  const taken: string[] = []
  const shared = (reads: number, verified?: boolean) => draftFromShared(flapjack(reads, verified)!, CODE, taken)
  return {
    off: draftFromOff('5000157024671', OFF_PRODUCT, taken, NOW),
    label: draftFromLabel(readOf(GRANOLA), { barcode: CODE, taken }),
    // a 1/7 misread: fat per 100 read as 1.1 g where the serving column says 2.1 g for 30 g
    misread: draftFromLabel(readOf({ ...GRANOLA, fat: ['1.1g', '2.1g'] }), { barcode: CODE, taken }),
    unchecked: shared(1),
    counted: shared(3),
    verified: shared(7, true),
  }
}
