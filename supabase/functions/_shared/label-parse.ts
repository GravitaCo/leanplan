/**
 * Label text → numbers: the one parser, shared by the app (src/core/domain/label.ts re-exports
 * it) and the `ai-read-label` Edge Function (which signs the values it parses for the shared
 * product list, so both must read a cell the same way). Pure TS, no imports, so Deno and the app
 * load it as is.
 */

/** The label fields a cell can belong to (src/core/domain/barcode.ts LabelField). */
export type LabelCellField = 'k' | 'p' | 'c' | 'f' | 'kj' | 'sugars' | 'sat' | 'fibre' | 'alcohol' | 'salt'
type LabelField = LabelCellField

export type Col = 'per100' | 'serving' | 'ri'

export interface Parsed {
  /** undefined = not printed, or not readable as a number */
  value?: number
  /** decimal places as printed, for the rounding a label allows */
  dp: number
  /** "<0.5g" (less than) or "trace": a real value we can't check exactly. A "less than" value
   *  is stored at the midpoint (<0.5 g → 0.25 g); `raw` keeps the printed bound. */
  mark?: 'lt' | 'trace'
  raw?: number
  /** a problem with the text itself */
  flag?: 'unit' | 'format' | 'unreadable'
}

const NUM = /(<\s*|less than\s*)?(\d[\d.,]*|[.,]\d+)\s*(kj|kcal|cal|mg|µg|mcg|ml|g|%)?/g
/** Words a cell may carry besides its number. Anything else left over (a letter O inside a
 *  number, say) makes the cell unreadable rather than silently parsed. */
const NOISE = /\b(kj|kcal|cal|mg|µg|mcg|ml|g|vol|abv|less than|approx|per|serving)\b|[<%~()/|*:\s]/g

function number(s: string, energy: boolean): { v?: number; dp: number; flag?: 'format' } {
  const dots = (s.match(/\./g) || []).length
  const commas = (s.match(/,/g) || []).length
  let t = s
  if (dots && commas) t = s.replace(/,/g, '') // 2,079.5: commas group thousands
  else if (commas === 1 && energy && /^\d{1,3},\d{3}$/.test(s)) t = s.replace(',', '') // 2,079 kJ
  else if (commas === 1) t = s.replace(',', '.') // 0,64 g: a decimal comma
  else if (commas > 1) return { dp: 0, flag: 'format' }
  if ((t.match(/\./g) || []).length > 1) return { dp: 0, flag: 'format' } // 0.6.4
  if (t.endsWith('.')) t = t.slice(0, -1)
  const v = Number(t.startsWith('.') ? '0' + t : t)
  if (!Number.isFinite(v)) return { dp: 0, flag: 'format' }
  const dp = t.includes('.') ? t.split('.')[1].length : 0
  // "064" for 0.64: a decimal point missing after a leading zero
  return /^0\d/.test(t) ? { v, dp, flag: 'format' } : { v, dp }
}

/** A cell's literal text as a number, with what's odd about it. '' (or a dash) = not printed. */
export function parseCell(raw: string | undefined, f: LabelField, col: Col): Parsed {
  const s = (raw || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s || /^[-–—]+$/.test(s) || s === 'n/a') return { dp: 0 }
  if (/^(trace|tr|nil|traces)$/.test(s)) return { value: 0, dp: 1, mark: 'trace' }
  const rest = s.replace(NUM, ' ').replace(NOISE, ' ').trim()
  if (rest) return { dp: 0, flag: 'unreadable' }
  const toks = [...s.matchAll(NUM)].map((m) => ({ lt: !!m[1], num: m[2], unit: (m[3] || '').replace(/^cal$/, 'kcal') }))
  if (!toks.length) return { dp: 0, flag: 'unreadable' }
  const energy = col !== 'ri' && (f === 'kj' || f === 'k')
  let tok = toks[0]
  let flag: Parsed['flag']
  if (col === 'ri') {
    if (toks.length > 1) flag = 'format'
    else if (tok.unit && tok.unit !== '%') flag = 'unit'
  } else if (energy) {
    // "2079kJ/497kcal" in one cell: take the part in this row's unit
    const want = f === 'kj' ? 'kj' : 'kcal'
    const match = toks.find((x) => x.unit === want)
    if (match) tok = match
    else if (toks.length > 1) flag = 'format'
    else if (tok.unit && tok.unit !== want) flag = 'unit' // kJ in the kcal row, or the other way
  } else {
    if (toks.length > 1) flag = 'format'
    else if (f === 'alcohol' ? tok.unit && tok.unit !== '%' : tok.unit && tok.unit !== 'g' && tok.unit !== 'mg') flag = 'unit'
  }
  const n = number(tok.num, energy)
  if (n.v === undefined) return { dp: 0, flag: n.flag ?? 'unreadable' }
  let value = n.v, dp = n.dp
  // salt as 300mg: saved in grams
  if (col !== 'ri' && tok.unit === 'mg' && f !== 'alcohol') { value = value / 1000; dp += 3 }
  const lt = tok.lt ? { mark: 'lt' as const, raw: value } : {}
  // "<0.5g": halfway between 0 and the bound (nutrition-accuracy, Sept 2026)
  if (tok.lt) { value = value / 2; dp += 1 }
  return { value, dp, ...lt, ...((n.flag ?? flag) ? { flag: n.flag ?? flag } : {}) }
}

const QTY = /(\d+(?:[.,]\d+)?)\s*(g|ml|kg|l)\b/
/**
 * The serving the per-serving column is for, in g or ml. A quantity in brackets wins ("Per ½ pack
 * (200g)" → 200), else the first one ("250ml glass" → 250). Anything after "with", "serves" or
 * "makes" is about something else ("30g with 125ml milk" → 30).
 */
export function parseServing(text: string | undefined): number | undefined {
  const t = (text || '').toLowerCase().split(/\b(?:with|serves|makes)\b/)[0]
  const bracket = [...t.matchAll(/\(([^)]*)\)/g)].map((b) => b[1].match(QTY)).find(Boolean)
  const m = bracket ?? t.match(QTY)
  if (!m) return undefined
  const x = parseFloat(m[1].replace(',', '.')) * (m[2] === 'kg' || m[2] === 'l' ? 1000 : 1)
  return x > 0 && x <= 5000 ? x : undefined
}

/** Longest product name built from the front of the pack (barcode.ts MAX_NAME). */
export const FRONT_NAME_MAX = 120

/** "Walkers Sensations Roasted Chicken & Thyme": brand, product and variety, without repeats. */
export function frontName(front: { brand: string; product: string; variety: string }): string {
  const bare = (x: string) => ` ${x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
  let name = ''
  for (const part of [front.brand, front.product, front.variety].map((x) => x.trim()).filter(Boolean)) {
    if (!name || bare(part).includes(bare(name))) name = part // "Walkers" then "Walkers Sensations"
    else if (!bare(name).includes(bare(part))) name = `${name} ${part}`
  }
  return name.slice(0, FRONT_NAME_MAX).trim()
}
