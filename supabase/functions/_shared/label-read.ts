/**
 * The shape of one nutrition-label read, shared by the `ai-read-label` Edge Function (Deno) and
 * the app (`src/core/domain/label.ts`). Pure TS with no imports, so both runtimes load it as is.
 *
 * The reader only transcribes: every value is the literal text printed on the pack ("0.64g",
 * "<0.5g", "trace", "2079kJ"), or '' when the row or column isn't printed or can't be read. The
 * app's own code, never the model, turns text into numbers and checks them.
 */

export const LABEL_ROWS = ['kj', 'kcal', 'fat', 'saturates', 'carbohydrate', 'sugars', 'fibre', 'protein', 'salt', 'alcohol'] as const
export type LabelRowKey = (typeof LABEL_ROWS)[number]

export const CONFIDENCE = ['high', 'medium', 'low'] as const
export type Confidence = (typeof CONFIDENCE)[number]

export interface ReadCell {
  /** the literal text as printed, '' when not printed or not legible */
  text: string
  confidence: Confidence
}

export interface ReadRow {
  /** the per 100 g / 100 ml column */
  per100: ReadCell
  /** the per serving (portion, pack, bar …) column */
  serving: ReadCell
  /** the reference intake % column, when printed */
  ri: ReadCell
}

export interface LabelRead {
  /** false when the photo shows no nutrition table the reader could read */
  readable: boolean
  basis: '100g' | '100ml' | 'unknown'
  /** the serving the per-serving column is for, as printed ("30g", "Per ½ pack (200g)") */
  serving_text: string
  /** which column the RI % refers to */
  ri_basis: 'per100' | 'serving' | 'none'
  rows: Record<LabelRowKey, ReadRow>
  /** from the optional front-of-pack photo; '' when not read */
  front: { brand: string; product: string; variety: string; pack_size: string }
}

/** Longest cell text we accept: a nutrition value is never longer than this. */
export const MAX_CELL = 32
/** Longest front-of-pack text we accept. */
export const MAX_FRONT = 80

const cell = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'confidence'],
  properties: {
    text: { type: 'string', description: 'Exactly as printed, including units and symbols such as < or "trace". Empty string if not printed or not legible.' },
    confidence: { type: 'string', enum: [...CONFIDENCE] },
  },
} as const

const row = {
  type: 'object',
  additionalProperties: false,
  required: ['per100', 'serving', 'ri'],
  properties: { per100: cell, serving: cell, ri: cell },
} as const

/** The JSON schema the model's output must follow (structured outputs). */
export const LABEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['readable', 'basis', 'serving_text', 'ri_basis', 'rows', 'front'],
  properties: {
    readable: { type: 'boolean' },
    basis: { type: 'string', enum: ['100g', '100ml', 'unknown'] },
    serving_text: { type: 'string' },
    ri_basis: { type: 'string', enum: ['per100', 'serving', 'none'] },
    rows: {
      type: 'object',
      additionalProperties: false,
      required: [...LABEL_ROWS],
      properties: Object.fromEntries(LABEL_ROWS.map((k) => [k, row])),
    },
    front: {
      type: 'object',
      additionalProperties: false,
      required: ['brand', 'product', 'variety', 'pack_size'],
      properties: { brand: { type: 'string' }, product: { type: 'string' }, variety: { type: 'string' }, pack_size: { type: 'string' } },
    },
  },
} as const

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
/** Printable text only, trimmed; null when it isn't a string or is too long. */
const text = (x: unknown, max: number): string | null => {
  if (typeof x !== 'string') return null
  const t = x.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return t.length <= max ? t : null
}
const oneOf = <T extends string>(x: unknown, opts: readonly T[]): T | null => (typeof x === 'string' && (opts as readonly string[]).includes(x) ? (x as T) : null)

function readCell(x: unknown): ReadCell | null {
  if (!isObj(x)) return null
  const t = text(x.text, MAX_CELL)
  const c = oneOf(x.confidence, CONFIDENCE)
  return t === null || c === null ? null : { text: t, confidence: c }
}

/**
 * A read, checked field by field against the schema. Null when anything is missing, of the wrong
 * type or too long: the caller then treats it as unreadable (never shows raw model text).
 */
export function validateLabelRead(x: unknown): LabelRead | null {
  if (!isObj(x) || typeof x.readable !== 'boolean') return null
  const basis = oneOf(x.basis, ['100g', '100ml', 'unknown'] as const)
  const riBasis = oneOf(x.ri_basis, ['per100', 'serving', 'none'] as const)
  const serving = text(x.serving_text, MAX_FRONT)
  if (!basis || !riBasis || serving === null || !isObj(x.rows) || !isObj(x.front)) return null
  const rows = {} as Record<LabelRowKey, ReadRow>
  for (const k of LABEL_ROWS) {
    const r = x.rows[k]
    if (!isObj(r)) return null
    const per100 = readCell(r.per100), serv = readCell(r.serving), ri = readCell(r.ri)
    if (!per100 || !serv || !ri) return null
    rows[k] = { per100, serving: serv, ri }
  }
  const f = x.front
  const front = { brand: text(f.brand, MAX_FRONT), product: text(f.product, MAX_FRONT), variety: text(f.variety, MAX_FRONT), pack_size: text(f.pack_size, MAX_CELL) }
  if (front.brand === null || front.product === null || front.variety === null || front.pack_size === null) return null
  return { readable: x.readable, basis, serving_text: serving, ri_basis: riBasis, rows, front: front as LabelRead['front'] }
}
