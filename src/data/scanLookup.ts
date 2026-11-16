/**
 * What a scanned or typed barcode leads to, as the web's ScanView `handle()` decides it: validate,
 * then a food already on the device (offline too), then Tilo's shared product list (when it's on),
 * then Open Food Facts; anything else is "missing" and goes to Create a food with the barcode.
 *
 * One copy for both apps: the web's ScanView and the native scanner (apps/native/screens/scan)
 * call it. No React and no UI: every outside call is injected, so the order and every outcome are
 * checked with fixtures (apps/native/screens/scan/test-scan.ts).
 */
import type { Food } from '@/core/types'
import { draftFromOff, findByBarcode, linkableFood, normalizeBarcode, type ScanDraft } from '@/core/domain/barcode'
import { draftFromShared } from '@/core/domain/sharedProduct'
import type { lookupProduct } from './products'
import type { lookupShared } from './sharedProducts'

export type ScanOutcome =
  | { kind: 'local'; food: Food; custom: boolean }
  | { kind: 'found'; draft: ScanDraft }
  /** on Tilo's shared product list (sp-2, sp-3, sp-3b) */
  | { kind: 'shared'; draft: ScanDraft }
  | { kind: 'missing'; barcode: string; why: 'not-found' | 'offline' | 'error' }

export interface LookupDeps {
  /** built-in foods and the user's own, as the web's `FOODS.concat(customFoods)` */
  all: Food[]
  customFoods: Food[]
  linkBarcode: (id: string, code: string) => Food | null
  sharedEnabled: boolean
  lookupShared: typeof lookupShared
  lookupProduct: typeof lookupProduct
  signal?: AbortSignal
  /** false once the screen has closed: nothing more is reported */
  alive?: () => boolean
}

export type Resolution =
  /** the number fails its check digit: say so, keep the scanner open */
  | { kind: 'invalid' }
  /** a valid code that needs the network: show "Looking up <code>…" while `result` settles */
  | { kind: 'pending'; code: string; result: Promise<ScanOutcome | null> }
  /** settled at once, from the device */
  | { kind: 'done'; outcome: ScanOutcome }

/**
 * Resolve a code from any path. `format` is the web decoder's name for it (see barcode.ts).
 * A pending result resolves to null when the screen closed meanwhile.
 */
export function resolveBarcode(raw: string, format: string | undefined, d: LookupDeps): Resolution {
  const norm = normalizeBarcode(raw, format)
  if (!norm) return { kind: 'invalid' }
  const local = findByBarcode(d.all, norm.code) ?? (norm.alt ? findByBarcode(d.all, norm.alt) : undefined)
  if (local) return { kind: 'done', outcome: { kind: 'local', food: local, custom: !!local.id } }
  const alive = d.alive ?? (() => true)
  const names = () => d.all.map((f) => f.n)
  const result = (async (): Promise<ScanOutcome | null> => {
    // Tilo's shared list first (it never holds Open Food Facts products); no connection there
    // means none for Open Food Facts either
    if (d.sharedEnabled) {
      const sh = await d.lookupShared(norm, { signal: d.signal })
      if (!alive()) return null
      if (sh.status === 'found') return { kind: 'shared', draft: draftFromShared(sh.product, norm.code, names()) }
      if (sh.status === 'offline') return { kind: 'missing', barcode: norm.code, why: 'offline' }
    }
    const res = await d.lookupProduct(norm, { signal: d.signal })
    if (!alive()) return null
    if (res.status !== 'found') return { kind: 'missing', barcode: norm.code, why: res.status }
    let draft: ScanDraft
    try {
      draft = draftFromOff(res.code, res.product, names())
    } catch {
      return { kind: 'missing', barcode: norm.code, why: 'error' }
    }
    // the user already saved this product by hand under the same name: link the barcode to it
    // (their own label values stay) rather than saving a "(2)" copy
    const mine = linkableFood(d.customFoods, draft.baseName)
    const linked = mine?.id ? d.linkBarcode(mine.id, res.code) : null
    return linked ? { kind: 'local', food: linked, custom: true } : { kind: 'found', draft }
  })()
  return { kind: 'pending', code: norm.code, result }
}
