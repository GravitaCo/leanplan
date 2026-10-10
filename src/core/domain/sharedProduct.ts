/**
 * Tali's shared product list, the pure part: what a lookup row means (its tier and margin), the
 * confirm view's starting point for a found product (boards sp-2, sp-3, sp-3b), and whether a
 * label read the user is saving may join the list. No DOM, no network.
 *
 * The rules shared with the Edge Functions and the database (barcodes, names, signed values)
 * live in supabase/functions/_shared/shared-product.ts.
 */
import type { LabelValues, ScanDraft } from './barcode'
import { uniqueName } from './barcode'
import { SOURCES } from '@/core/data/sources'
import { COUNTED_READS, SHARED_FIELDS, gtin14, roundShared, type SharedValues, type ShareToken } from '../../../supabase/functions/_shared/shared-product'

export type SharedTier = 'unchecked' | 'counted' | 'verified'

/** The source key a product saved at each tier cites (src/core/data/sources.ts). */
export const TIER_SOURCE: Record<SharedTier, 'shared-unchecked' | 'shared-counted' | 'shared-verified'> = {
  unchecked: 'shared-unchecked', counted: 'shared-counted', verified: 'shared-verified',
}

/** One version of a product as lookup_product returns it, checked. */
export interface SharedProduct {
  version: number
  values: SharedValues
  status: 'unverified' | 'verified' | 'disputed'
  /** signed label reads counted for this version */
  reads: number
  /** the month of Tali's own check, "2026-10", when there was one */
  audited?: string
}

/** What the confirm view needs to say where a found product came from. */
export interface SharedInfo {
  tier: SharedTier
  reads: number
  version: number
  audited?: string
  /** the values as found: saved unchanged, the food keeps the shared source */
  values: LabelValues
  ml: boolean
}

const num = (x: unknown): number | undefined => {
  const n = typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' ? Number(x) : NaN
  return Number.isFinite(n) ? n : undefined
}

/** A lookup_product row → SharedProduct, or null when anything is off (never trust the wire). */
export function cleanLookupRow(x: unknown): SharedProduct | null {
  if (!x || typeof x !== 'object') return null
  const r = x as Record<string, unknown>
  const version = num(r.version)
  const reads = num(r.label_reads)
  if (version === undefined || !Number.isInteger(version) || version < 1 || reads === undefined || reads < 0) return null
  if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 80 || typeof r.ml !== 'boolean') return null
  const status = r.status === 'verified' || r.status === 'disputed' ? r.status : 'unverified'
  const v: SharedValues = { name: r.name.trim(), k: 0, p: 0, c: 0, f: 0, ml: r.ml }
  for (const f of SHARED_FIELDS) {
    const n = num(r[f])
    if (n === undefined) { if (f === 'k' || f === 'p' || f === 'c' || f === 'f') return null; continue }
    if (n < 0 || n > 900) return null
    v[f] = n
  }
  const serv = num(r.serving_g)
  if (serv !== undefined && serv > 0 && serv <= 5000) v.serving_g = serv
  const audited = typeof r.audited_on === 'string' && /^\d{4}-\d{2}-01$/.test(r.audited_on) ? r.audited_on.slice(0, 7) : undefined
  return { version, values: v, status, reads, ...(audited ? { audited } : {}) }
}

/** Checked by Tali's own audit; else read from the pack enough times; else not yet checked. */
export function tierOf(p: Pick<SharedProduct, 'status' | 'reads' | 'audited'>): SharedTier {
  if (p.status === 'verified' && p.audited) return 'verified'
  return p.reads >= COUNTED_READS ? 'counted' : 'unchecked'
}

/** The tier's margin (a fraction), from its source. */
export const tierErr = (t: SharedTier): number => SOURCES[TIER_SOURCE[t]].err ?? 0

const pct = (x: number) => `± ${Math.round(x * 100)}%`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The source card at the top of the confirm view (boards sp-2, sp-3, sp-3b). */
export function sourceCard(s: Pick<SharedInfo, 'tier' | 'reads' | 'audited'>): { title: string; sub?: string } {
  if (s.tier === 'verified' && s.audited) {
    const [y, m] = s.audited.split('-')
    return { title: `Checked by Tali, ${MONTHS[Number(m) - 1]} ${y}`, sub: 'Only Tali’s own checks set this.' }
  }
  if (s.tier === 'counted') return { title: `Read from the pack ${s.reads} times`, sub: 'Check against your pack.' }
  return { title: 'Added by a Tali user, not yet checked. Check against your pack.' }
}

/** The line under "One serving" that explains its margin. */
export function marginNote(t: SharedTier): string {
  const own = SOURCES['shared-counted'].err ?? 0.15
  if (t === 'verified') return `${pct(tierErr(t))}, the same as a built-in food.`
  if (t === 'counted') return `${pct(tierErr(t))} once it’s been read from the pack ${COUNTED_READS} times, the same as a food you add yourself.`
  return `${pct(tierErr(t))} while a shared product is unchecked, against ${pct(own)} for a food you add yourself.`
}

/** A found product → the confirm view's starting point. `barcode` is the code as scanned. */
export function draftFromShared(p: SharedProduct, barcode: string, taken: Iterable<string>): ScanDraft {
  const v = p.values
  const values: LabelValues = { k: v.k, p: v.p, c: v.c, f: v.f }
  for (const f of ['fibre', 'sugars', 'sat', 'salt'] as const) if (v[f] !== undefined) values[f] = v[f]
  const tier = tierOf(p)
  return {
    barcode,
    name: uniqueName(v.name, taken),
    baseName: v.name,
    values,
    kcalFromKj: false,
    ml: v.ml,
    kind: 'cook',
    meal: false,
    serving: { eat: v.serving_g, cook: v.serving_g ?? 100 },
    wholePack: false,
    liquid: v.ml,
    vague: false,
    notes: [],
    usLabel: false,
    source: 'shared',
    offMissing: true,
    shared: { tier, reads: p.reads, version: p.version, ...(p.audited ? { audited: p.audited } : {}), values, ml: v.ml },
  }
}

/** The per-100 values as confirmed equal the ones found (a shared product saved unchanged). */
export function sameAsFound(info: Pick<SharedInfo, 'values' | 'ml'>, values: LabelValues, ml: boolean): boolean {
  if (ml !== info.ml) return false
  return SHARED_FIELDS.every((f) => info.values[f] === values[f])
}

/**
 * Whether a label read the user is saving may join the shared list (Benn's rule 1): it came
 * with a signed token (a barcode was scanned, the read parsed cleanly), Open Food Facts doesn't
 * have the barcode, the name is the one read from the front of the pack (untouched), and every
 * figure is exactly what the reader read (no typed or corrected value).
 */
export function shareEligible(d: Pick<ScanDraft, 'share' | 'offMissing' | 'name' | 'baseName' | 'barcode'>, confirmed: { name: string; values: LabelValues; ml: boolean }): boolean {
  const t: ShareToken | undefined = d.share
  if (!t || !d.offMissing || !d.barcode || gtin14(d.barcode) !== t.barcode) return false
  if (confirmed.name.trim() !== d.name.trim() || t.values.name !== d.baseName.trim()) return false
  if (confirmed.ml !== t.values.ml) return false
  return SHARED_FIELDS.every((f) => {
    const mine = confirmed.values[f], read = t.values[f]
    if (mine === undefined || read === undefined) return mine === read
    return roundShared(f, mine) === read
  })
}

/**
 * What saving does about the shared list (consent gating, sp-1): nothing for a read that can't
 * be shared; the one-time question when the person has never answered; otherwise their answer.
 * Saying no (or not answering) never stops the save.
 */
export function shareDecision(eligible: boolean, latest: { granted: boolean } | null): 'none' | 'ask' | 'share' | 'keep' {
  if (!eligible) return 'none'
  if (!latest) return 'ask'
  return latest.granted ? 'share' : 'keep'
}
