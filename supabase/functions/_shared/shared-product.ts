/**
 * Tali's shared product list: the rules every side applies the same way. Used by the app
 * (src/core/domain/sharedProduct.ts, src/data/sharedProducts.ts), the `ai-read-label` Edge
 * Function (which signs what it read), the `submit-product` Edge Function (which checks a
 * submission before the database sees it) and the tests. The database repeats the checks in SQL
 * (docs/migrations/2026-10-10-shared-products.sql): keep the two in step.
 *
 * Benn's rules (10 Oct 2026):
 * - Only label-photo reads are shared: name and figures read from the pack by the label reader
 *   and confirmed unchanged by the user. Typed values and names never are; a barcode alone never is.
 * - Open Food Facts products, and barcodes Open Food Facts already has, are never added (ODbL).
 * - Nothing is tied to a person: no user id, hash or pseudonym; dates are first-of-month only;
 *   the barcode travels in POST bodies, never in a URL or a log.
 *
 * Pure TS; imports only its _shared neighbours, so Deno and the app load it as is.
 */
import { frontName, parseCell, parseServing, type LabelCellField } from './label-parse.ts'
import type { LabelRead } from './label-read.ts'

/** Tables that hold the shared list, not anyone's rows: never in USER_TABLES, the consent
 *  clears or the purge (scripts/test-consent.ts checks this). */
export const SHARED_TABLES = ['products', 'product_quota', 'product_sigs_seen'] as const

/** Global caps, identity-free (mirrored in SQL). */
export const CAPS = {
  /** counted reads per product version per calendar month: one person can't pump a count */
  countsPerVersionMonth: 10,
  /** versions (differing figures) kept per barcode */
  versionsPerBarcode: 5,
  /** new product rows across everyone per UTC day */
  newRowsPerDay: 300,
  /** reports (any reason but the name) that hide a version until it's reviewed */
  reportsToHide: 3,
  /** reports across everyone per UTC day */
  reportsPerDay: 500,
} as const

/** Label reads after which a product counts as "read from the pack N times" (sp-3). Pending
 *  nutrition-accuracy confirmation, with the margins in src/core/data/sources.ts. */
export const COUNTED_READS = 3

/** How long a signed read can wait in the device outbox before it's dropped. */
export const SIG_MAX_AGE_S = 30 * 86400

export const NAME_MAX = 80

/* ---------------- barcodes ---------------- */

/**
 * A barcode as GTIN-14 (EAN-8, UPC-A, EAN-13 or GTIN-14 with a valid GS1 check digit), or null.
 * Restricted-circulation codes are refused: in-store and variable-weight (EAN prefixes 020-029,
 * 200-299; EAN-8 starting 0 or 2), company-internal (040-049), coupons (050-059, 98x-99x) and
 * GTIN-14 indicator 9 (variable measure). UPC-E is expanded to UPC-A by the app first
 * (src/core/domain/barcode.ts). Mirrors public.gtin14() in SQL.
 */
export function gtin14(raw: string): string | null {
  const p = String(raw ?? '')
  if (!/^(\d{8}|\d{12,14})$/.test(p)) return null
  const n = p.length
  let s = 0
  for (let i = 1; i < n; i++) s += Number(p[n - 1 - i]) * (i % 2 === 1 ? 3 : 1)
  if ((10 - (s % 10)) % 10 !== Number(p[n - 1])) return null
  if (n === 8 && (p[0] === '0' || p[0] === '2')) return null
  const d = p.padStart(14, '0')
  if (d[0] === '9') return null
  const pre = d.slice(1, 4)
  if (n > 8 && ((pre >= '020' && pre <= '029') || (pre >= '040' && pre <= '059') || (pre >= '200' && pre <= '299') || pre >= '980')) return null
  return d
}

/* ---------------- names ---------------- */

export type NameProblem = 'length' | 'link' | 'contact' | 'digits' | 'free-from'

const LINK = /(https?:|:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|uk|io|co|me|info|app|shop|biz|xyz|ly|gg|tv)\b)/i
/** markup, and anything that looks like an email or a handle */
const CONTACT = /[<>{}@]/
/** seven or more digits in a row (spaces, dots or dashes between them): a phone number */
const DIGITS = /(?:\d[ .-]?){6}\d/
/**
 * Free-from and allergen claims (compliance, Oct 2026): a shared name that says "gluten free" or
 * "nut free" invites someone with an allergy to trust a stranger's product. Refused, not edited.
 */
const FREE_FROM = /\b(free[\s-]*from|allerg(en|y|ies)[\s-]*(free|safe|friendly)|(gluten|wheat|nut|peanut|tree[\s-]*nut|dairy|milk|lactose|egg|soy|soya|sesame|celery|mustard|lupin|sulphites?|sulfites?|fish|shellfish|crustaceans?|molluscs?|casein|coeliac|celiac)[\s-]*(free|safe))\b/i

/** Printable text, single-spaced, trimmed. */
export function cleanName(x: string): string {
  return x.replace(/[\x00-\x1f\x7f\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim()
}

/** Why a name can't go on the shared list (it's shown to everyone), or null when it can. */
export function nameProblem(raw: string): NameProblem | null {
  const name = cleanName(raw)
  if (name.length < 1 || name.length > NAME_MAX) return 'length'
  if (LINK.test(name)) return 'link'
  if (CONTACT.test(name)) return 'contact'
  if (DIGITS.test(name)) return 'digits'
  if (FREE_FROM.test(name)) return 'free-from'
  return null
}

/* ---------------- values ---------------- */

/** What a shared product holds: per 100 g (or 100 ml when `ml`), plus the pack's serving. */
export interface SharedValues {
  name: string
  k: number
  p: number
  c: number
  f: number
  fibre?: number
  sugars?: number
  sat?: number
  salt?: number
  ml: boolean
  serving_g?: number
}

export type SharedField = 'k' | 'p' | 'c' | 'f' | 'fibre' | 'sugars' | 'sat' | 'salt'
export const SHARED_FIELDS: SharedField[] = ['k', 'p', 'c', 'f', 'fibre', 'sugars', 'sat', 'salt']
const REQUIRED: SharedField[] = ['k', 'p', 'c', 'f']
/** label row → field */
const ROW: Record<SharedField, keyof LabelRead['rows']> = { k: 'kcal', p: 'protein', c: 'carbohydrate', f: 'fat', fibre: 'fibre', sugars: 'sugars', sat: 'saturates', salt: 'salt' }
/** decimal places kept (the SQL columns' scale) */
const DP: Record<SharedField, number> = { k: 0, p: 1, c: 1, f: 1, fibre: 1, sugars: 1, sat: 1, salt: 2 }
const MAX: Record<SharedField, number> = { k: 900, p: 100, c: 110, f: 100, fibre: 100, sugars: 110, sat: 100, salt: 10 }

/** A value at the precision the list keeps it. */
export const roundShared = (f: SharedField, v: number): number => {
  const m = 10 ** DP[f]
  return Math.round(v * m + Number.EPSILON) / m
}

/**
 * The hard limits a shared product must meet (core/domain/checks.ts checkPer100 at its warning
 * level, which on the confirm view stops nothing; here it keeps an obvious misread off the list).
 */
export function valuesProblem(v: SharedValues): string | null {
  for (const f of SHARED_FIELDS) {
    const x = v[f]
    if (x === undefined) { if (REQUIRED.includes(f)) return 'missing ' + f; continue }
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > MAX[f]) return 'range ' + f
  }
  if (v.p + v.c + v.f > (v.ml ? 140 : 110)) return 'macros'
  if (v.sat !== undefined && v.sat > v.f) return 'sat'
  if (v.sugars !== undefined && v.sugars > v.c) return 'sugars'
  const mk = 4 * v.p + 4 * v.c + 9 * v.f + 2 * (v.fibre ?? 0)
  if (mk >= 20) {
    const ratio = v.k / mk
    if ((ratio >= 3.5 && ratio <= 4.9) || Math.abs(v.k - mk) > Math.max(60, 0.5 * Math.max(v.k, mk))) return 'energy'
  }
  if (v.serving_g !== undefined && !(v.serving_g > 0 && v.serving_g <= 5000)) return 'serving'
  return null
}

/**
 * The shareable values in a label read, or null when anything about it isn't clean enough to
 * share: no front-of-pack name (or a name the list refuses), no per-100 basis, a required figure
 * missing, any per-100 cell the parser flags, or an alcohol row (the list doesn't hold it). The
 * app parses the same cells with the same parser (label-parse.ts), so a read the user confirms
 * unchanged matches these values exactly.
 */
export function valuesFromRead(read: LabelRead): SharedValues | null {
  if (!read.readable || (read.basis !== '100g' && read.basis !== '100ml')) return null
  if (read.rows.alcohol.per100.text) return null
  const name = cleanName(frontName(read.front))
  if (nameProblem(name)) return null
  const v: SharedValues = { name, k: 0, p: 0, c: 0, f: 0, ml: read.basis === '100ml' }
  for (const f of SHARED_FIELDS) {
    const text = read.rows[ROW[f]].per100.text
    if (!text) { if (REQUIRED.includes(f)) return null; continue }
    const cell = parseCell(text, f as LabelCellField, 'per100')
    if (cell.flag || cell.value === undefined) return null
    v[f] = roundShared(f, cell.value)
  }
  const g = parseServing(read.serving_text)
  if (g !== undefined) v.serving_g = Math.round(g * 10) / 10
  return valuesProblem(v) ? null : v
}

/** Untrusted JSON → SharedValues (only the known keys, of the right types), or null. */
export function cleanValues(x: unknown): SharedValues | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  const allowed = new Set<string>(['name', 'ml', 'serving_g', ...SHARED_FIELDS])
  if (Object.keys(o).some((k) => !allowed.has(k))) return null
  if (typeof o.name !== 'string' || typeof o.ml !== 'boolean') return null
  const v: SharedValues = { name: o.name, k: 0, p: 0, c: 0, f: 0, ml: o.ml }
  for (const f of SHARED_FIELDS) {
    const n = o[f]
    if (n === undefined || n === null) { if (REQUIRED.includes(f)) return null; continue }
    if (typeof n !== 'number' || !Number.isFinite(n)) return null
    v[f] = n
  }
  if (o.serving_g !== undefined && o.serving_g !== null) {
    if (typeof o.serving_g !== 'number' || !Number.isFinite(o.serving_g)) return null
    v.serving_g = o.serving_g
  }
  if (nameProblem(v.name) || cleanName(v.name) !== v.name || valuesProblem(v)) return null
  return v
}

/* ---------------- the signed read ---------------- */

/** What ai-read-label returns beside a read when a barcode came with the photo. No user id. */
export interface ShareToken {
  /** GTIN-14 */
  barcode: string
  values: SharedValues
  /** when it was read (Unix seconds): only for the age limit; never stored */
  iat: number
  /** HMAC-SHA-256 over canonicalShare(), base64url */
  sig: string
}

/** The exact bytes that are signed: the barcode, the time and every value in a fixed order. */
export function canonicalShare(barcode: string, v: SharedValues, iat: number): string {
  const vals = [v.name, v.ml, v.serving_g ?? null, ...SHARED_FIELDS.map((f) => v[f] ?? null)]
  return ['tali-shared-product-v1', barcode, String(iat), JSON.stringify(vals)].join('|')
}

const SIG_RE = /^[A-Za-z0-9_-]{43}$/

/** Untrusted JSON → a well-formed token (the signature itself is checked by product-sig.ts). */
export function cleanToken(x: unknown): ShareToken | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  if (Object.keys(o).some((k) => !['barcode', 'values', 'iat', 'sig'].includes(k))) return null
  if (typeof o.barcode !== 'string' || gtin14(o.barcode) !== o.barcode) return null
  if (typeof o.iat !== 'number' || !Number.isInteger(o.iat) || o.iat < 1_700_000_000) return null
  if (typeof o.sig !== 'string' || !SIG_RE.test(o.sig)) return null
  const values = cleanValues(o.values)
  return values ? { barcode: o.barcode, values, iat: o.iat, sig: o.sig } : null
}

/** A token's age is within the limit (and not from the future, beyond a minute of skew). */
export const tokenFresh = (iat: number, nowS: number): boolean => iat <= nowS + 60 && nowS - iat <= SIG_MAX_AGE_S
