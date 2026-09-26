/**
 * Label photo scanning, the pure part (plan: docs/plans/label-scan-and-shared-products.md §1.3–1.4).
 *
 * The reader (the `ai-read-label` Edge Function) returns the literal text of every cell on a UK
 * nutrition panel. Here, and only here, that text becomes numbers:
 * - parseCell(): "0,64g" → 0.64, "<0.5g" → 0.5 (marked), "trace" → 0 (marked), a unit in the
 *   wrong row or a decimal point missing or doubled → flagged;
 * - labelIssues(): the ways a UK label states the same facts twice (kJ and kcal, per 100 and per
 *   serving, reference intake %, parts within wholes), so one misread digit breaks a relationship;
 * - suggestFix(): the one single-character OCR confusion (1↔7, 5↔6, 6↔8, 3↔8, 0↔8, O↔0, l↔1, a
 *   missing or extra decimal point) that makes every check pass, or nothing when there are none
 *   or several: we never guess;
 * - draftFromLabel(): the ScanDraft the existing confirm view starts from.
 *
 * No DOM, no network, so a native build (on-device text recognition) can reuse it unchanged.
 */
import { checkLabel, packFromQuantity, uniqueName, MAX_NAME, type FoodKind, type LabelField, type LabelValues, type ScanDraft } from './barcode'
import { LABEL_ROWS, type LabelRead, type LabelRowKey } from '../../../supabase/functions/_shared/label-read'

export { validateLabelRead, type LabelRead } from '../../../supabase/functions/_shared/label-read'

/** The reader's row names → the app's label fields. */
export const ROW_FIELD: Record<LabelRowKey, LabelField> = {
  kj: 'kj', kcal: 'k', fat: 'f', saturates: 'sat', carbohydrate: 'c', sugars: 'sugars', fibre: 'fibre', protein: 'p', salt: 'salt', alcohol: 'alcohol',
}

export type Col = 'per100' | 'serving' | 'ri'
/** One cell of the panel: "f:per100", "k:serving", "salt:ri". */
export type CellId = `${LabelField}:${Col}`
export const cellId = (f: LabelField, col: Col) => `${f}:${col}` as CellId
const splitCell = (id: CellId) => id.split(':') as [LabelField, Col]

/** What the checks run on: the texts of every cell, as read (or as edited in the confirm view). */
export interface LabelTexts {
  per100: Partial<Record<LabelField, string>>
  serving: Partial<Record<LabelField, string>>
  ri: Partial<Record<LabelField, string>>
  /** the serving the per-serving column is for, as printed */
  servingText: string
  /** the serving in g/ml when the confirm view has one typed; overrides servingText */
  servingG?: number
  ml: boolean
  riBasis: 'per100' | 'serving' | 'none'
}

/* ---------------- parsing ---------------- */

export interface Parsed {
  /** undefined = not printed, or not readable as a number */
  value?: number
  /** decimal places as printed, for the rounding a label allows */
  dp: number
  /** "<0.5g" (less than) or "trace": a real value we can't check exactly */
  mark?: 'lt' | 'trace'
  /** a problem with the text itself */
  flag?: 'unit' | 'format' | 'unreadable'
}

const LABELS: Record<LabelField, string> = {
  kj: 'Energy (kJ)', k: 'Energy (kcal)', f: 'Fat', sat: 'Saturates', c: 'Carbohydrate', sugars: 'Sugars', fibre: 'Fibre', p: 'Protein', salt: 'Salt', alcohol: 'Alcohol',
}

/** The unit a cell's value is shown in. */
export function unitOf(f: LabelField, col: Col): string {
  if (col === 'ri') return '%'
  return f === 'kj' ? 'kJ' : f === 'k' ? 'kcal' : f === 'alcohol' ? '% vol' : 'g'
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
  return { value, dp, ...(tok.lt ? { mark: 'lt' as const } : {}), ...((n.flag ?? flag) ? { flag: n.flag ?? flag } : {}) }
}

/** The serving the per-serving column is for, in g or ml: the last "200g" / "250 ml" in the text. */
export function parseServing(text: string | undefined): number | undefined {
  const all = [...(text || '').toLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(g|ml|kg|l)\b/g)]
  const m = all[all.length - 1]
  if (!m) return undefined
  const x = parseFloat(m[1].replace(',', '.')) * (m[2] === 'kg' || m[2] === 'l' ? 1000 : 1)
  return x > 0 && x <= 5000 ? x : undefined
}

/* ---------------- checks ---------------- */

export interface LabelIssue {
  /** stable per check, so a suggestion can prove it fixes the base read's problems */
  id: string
  /** the cells involved: any of them could hold the misread */
  cells: CellId[]
  msg: string
  /** worth a look, but not a contradiction (salt over 10 g, a hard-to-read cell) */
  soft?: boolean
  kind: 'format' | 'energy' | 'serving' | 'ri' | 'part' | 'sum' | 'macros' | 'salt'
}

const KJ_PER_KCAL = 4.184
/** kJ ↔ kcal must agree this closely (plan §1.3.1), plus 1 kcal for rounding. */
const KJ_TOL = 0.02
/** UK reference intakes (Regulation (EU) 1169/2011 Annex XIII, retained in UK law). */
export const RI: Partial<Record<LabelField, number>> = { kj: 8400, k: 2000, f: 70, sat: 20, c: 260, sugars: 90, p: 50, salt: 6 }
const MAX_G_PER_100ML = 140
const SALT_MAX = 10

const fmt = (v: number, dp: number) => String(Math.round(v * 10 ** dp) / 10 ** dp)
const show = (v: number, f: LabelField, col: Col, dp = f === 'kj' || f === 'k' ? 0 : f === 'salt' ? 2 : 1) => {
  const u = unitOf(f, col)
  return u === '%' ? `${fmt(v, 0)}%` : `${fmt(v, dp)} ${u}`
}
const COL_NAME: Record<Exclude<Col, 'ri'>, string> = { per100: 'per 100', serving: 'per serving' }

export interface LabelCheckResult {
  issues: LabelIssue[]
  parsed: Record<CellId, Parsed>
  per100: LabelValues
  serving: LabelValues
  /** the serving the checks used, g or ml */
  g?: number
}

/** Every relationship the panel states twice, checked (plan §1.3). Empty issues = it hangs together. */
export function labelIssues(t: LabelTexts): LabelCheckResult {
  const parsed = {} as Record<CellId, Parsed>
  const per100: LabelValues = {}, serving: LabelValues = {}
  const issues: LabelIssue[] = []
  const u = t.ml ? 'ml' : 'g'
  const fields = LABEL_ROWS.map((r) => ROW_FIELD[r])
  for (const f of fields) {
    for (const col of ['per100', 'serving', 'ri'] as Col[]) {
      const p = parseCell(t[col][f], f, col)
      parsed[cellId(f, col)] = p
      if (col !== 'ri' && p.value !== undefined) (col === 'per100' ? per100 : serving)[f] = p.value
      if (p.flag) {
        const msg = p.flag === 'unit'
          ? `${LABELS[f]}: the unit looks out of place (“${t[col][f]}”). Check against the pack.`
          : p.flag === 'format'
            ? `${LABELS[f]}: “${t[col][f]}” looks misread, perhaps a decimal point missing or doubled.`
            : `${LABELS[f]}: “${t[col][f]}” couldn’t be read as a number. Check against the pack.`
        issues.push({ id: `fmt:${f}:${col}`, cells: [cellId(f, col)], msg, kind: 'format' })
      }
    }
  }
  const exact = (f: LabelField, col: Col) => { const p = parsed[cellId(f, col)]; return p.value !== undefined && !p.mark && p.flag !== 'unreadable' ? p : undefined }
  const g = t.servingG && t.servingG > 0 ? t.servingG : parseServing(t.servingText)

  // 1. kJ ↔ kcal, in both columns
  for (const col of ['per100', 'serving'] as const) {
    const kj = exact('kj', col), k = exact('k', col)
    if (!kj || !k) continue
    const fromKj = kj.value! / KJ_PER_KCAL
    if (Math.abs(fromKj - k.value!) > Math.max(KJ_TOL * Math.max(fromKj, k.value!), 1)) {
      issues.push({ id: `energy:${col}`, cells: [cellId('kj', col), cellId('k', col)], kind: 'energy',
        msg: `Energy ${COL_NAME[col]}: ${fmt(kj.value!, 0)} kJ is about ${Math.round(fromKj)} kcal, but it reads ${fmt(k.value!, 0)} kcal.` })
    }
  }

  // 2. per 100 ↔ per serving, row by row, within the rounding each column is printed to
  if (g) {
    for (const f of fields) {
      if (f === 'alcohol') continue
      const a = exact(f, 'per100'), b = exact(f, 'serving')
      if (!a || !b) continue
      const expected = (a.value! * g) / 100
      const tol = 0.5 * 10 ** -b.dp + 0.5 * 10 ** -a.dp * (g / 100) + 0.02 * expected + 1e-9
      if (Math.abs(b.value! - expected) > tol) {
        issues.push({ id: `serving:${f}`, cells: [cellId(f, 'per100'), cellId(f, 'serving')], kind: 'serving',
          msg: `${LABELS[f]}: ${show(a.value!, f, 'per100', a.dp)} per 100 ${u} would be about ${show(expected, f, 'serving', Math.max(b.dp, 1))} for ${fmt(g, 1)} ${u}, but the per-serving column reads ${show(b.value!, f, 'serving', b.dp)}.` })
      }
    }
  }

  // 3. reference intake %, where printed
  if (t.riBasis !== 'none') {
    const col = t.riBasis
    for (const f of fields) {
      const ref = RI[f]
      const v = exact(f, col), ri = exact(f, 'ri')
      if (!ref || !v || !ri) continue
      const expected = (100 * v.value!) / ref
      if (Math.abs(expected - ri.value!) > 1 + (100 * 0.5 * 10 ** -v.dp) / ref) {
        issues.push({ id: `ri:${f}`, cells: [cellId(f, col), cellId(f, 'ri')], kind: 'ri',
          msg: `${LABELS[f]}: ${show(v.value!, f, col, v.dp)} is about ${Math.round(expected)}% of the reference intake, but it reads ${fmt(ri.value!, 0)}%.` })
      }
    }
  }

  // 4. parts within wholes, in both columns; and the per-100 parts can't weigh more than 100
  for (const col of ['per100', 'serving'] as const) {
    const pair = (part: LabelField, whole: LabelField, msg: string) => {
      const a = exact(part, col), b = exact(whole, col)
      if (a && b && a.value! > b.value! + Math.max(0.2, 10 ** -Math.min(a.dp, b.dp))) {
        issues.push({ id: `part:${part}:${col}`, cells: [cellId(part, col), cellId(whole, col)], kind: 'part', msg })
      }
    }
    pair('sugars', 'c', `Sugars are part of carbohydrate, so they can’t be more than it (${COL_NAME[col]}).`)
    pair('sat', 'f', `Saturates are part of fat, so they can’t be more than it (${COL_NAME[col]}).`)
  }
  const parts = (['p', 'c', 'f', 'fibre', 'salt'] as LabelField[]).filter((f) => exact(f, 'per100'))
  const total = parts.reduce((s, f) => s + per100[f]!, 0)
  if (total > (t.ml ? MAX_G_PER_100ML : 100) + 0.2) {
    issues.push({ id: 'sum', cells: parts.map((f) => cellId(f, 'per100')), kind: 'sum',
      msg: `Protein, carbs, fat, fibre and salt add up to ${Math.round(total)} g in 100 ${u}. One of them may be misread, or from the per-serving column.` })
  }

  // 5. energy ↔ macros (the same check typed labels get), per 100
  const kcalCells = (['k', 'p', 'c', 'f'] as LabelField[]).map((f) => cellId(f, 'per100'))
  if ((['k', 'p', 'c', 'f'] as LabelField[]).every((f) => exact(f, 'per100'))) {
    const vals: LabelValues = { k: per100.k, p: per100.p, c: per100.c, f: per100.f }
    for (const f of ['fibre', 'alcohol'] as LabelField[]) if (exact(f, 'per100')) vals[f] = per100[f]
    for (const pr of checkLabel(vals, { ml: t.ml })) {
      // kJ, parts and sums are checked above, with the label's own tighter rules
      if (pr.kind !== 'odd' || pr.field !== 'k' || /kJ|add up|negative/.test(pr.msg)) continue
      issues.push({ id: 'macros', cells: [...kcalCells, ...(vals.fibre !== undefined ? [cellId('fibre', 'per100')] : [])], kind: 'macros', msg: pr.msg })
      break
    }
  }

  // 6. salt: over 10 g per 100 g is only normal for seasonings and stock
  const salt = exact('salt', 'per100')
  if (salt && salt.value! > SALT_MAX) {
    issues.push({ id: 'salt', cells: [cellId('salt', 'per100')], kind: 'salt', soft: true,
      msg: `Salt reads ${show(salt.value!, 'salt', 'per100', salt.dp)} per 100 ${u}. That’s usual only for seasonings and stock: check against the pack.` })
  }
  return { issues, parsed, per100, serving, g }
}

/* ---------------- the suggested fix ---------------- */

/** Characters a photo reader commonly mistakes for each other (plan §1.4). */
const CONFUSE: Record<string, string[]> = {
  '1': ['7'], '7': ['1'], '5': ['6'], '6': ['5', '8'], '8': ['6', '3', '0'], '3': ['8'], '0': ['8'],
  o: ['0'], O: ['0'], l: ['1'], I: ['1'], i: ['1'],
}

/** Every text one confusion away: one character swapped, or a decimal point added or removed. */
export function variants(text: string): string[] {
  const out = new Set<string>()
  for (let i = 0; i < text.length; i++) {
    for (const alt of CONFUSE[text[i]] || []) out.add(text.slice(0, i) + alt + text.slice(i + 1))
    if (text[i] === '.' || text[i] === ',') out.add(text.slice(0, i) + text.slice(i + 1))
  }
  // a missing decimal point: only in a number that has none
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    if (/[.,]/.test(m[0])) continue
    for (let j = 1; j < m[0].length; j++) out.add(text.slice(0, m.index! + j) + '.' + text.slice(m.index! + j))
  }
  out.delete(text)
  return [...out]
}

export interface Suggestion {
  cell: CellId
  /** the text as read, and the text it becomes */
  from: string
  to: string
  value: number
  /** "7.1 g" */
  display: string
  /** why: "The per-serving column says 2.1 g for 30 g." */
  because: string
}

const getText = (t: LabelTexts, id: CellId) => { const [f, col] = splitCell(id); return t[col][f] }
export function withCell(t: LabelTexts, id: CellId, text: string): LabelTexts {
  const [f, col] = splitCell(id)
  return { ...t, [col]: { ...t[col], [f]: text } }
}

/** Why the suggestion fits, in the words the pack uses. */
function because(issue: LabelIssue, cell: CellId, t: LabelTexts, r: LabelCheckResult): string {
  const [f, col] = splitCell(cell)
  const u = t.ml ? 'ml' : 'g'
  const other = issue.cells.find((c) => c !== cell)
  const o = other ? r.parsed[other] : undefined
  const [of, oc] = other ? splitCell(other) : [f, col]
  const ov = o?.value !== undefined ? show(o.value, of, oc, o.dp) : ''
  switch (issue.kind) {
    case 'serving':
      return col === 'per100'
        ? `The per-serving column says ${ov} for ${fmt(r.g!, 1)} ${u}.`
        : `The per 100 ${u} column says ${ov}, which is about ${show((o!.value! * r.g!) / 100, f, 'serving')} for ${fmt(r.g!, 1)} ${u}.`
    case 'energy':
      return f === 'k' ? `The label says ${ov}, which is about ${Math.round(o!.value! / KJ_PER_KCAL)} kcal.` : `The label says ${ov}, which is about ${Math.round(o!.value! * KJ_PER_KCAL)} kJ.`
    case 'ri':
      return col === 'ri' ? `${ov} is about ${Math.round((100 * o!.value!) / RI[f]!)}% of the reference intake.` : `The label gives it as ${ov} of the reference intake.`
    case 'part':
      return f === 'sugars' || f === 'sat' ? `${LABELS[f]} can’t be more than ${f === 'sugars' ? 'carbohydrate' : 'fat'} (${ov}).` : `${LABELS[f]} can’t be less than ${of === 'sugars' ? 'sugars' : 'saturates'} (${ov}).`
    case 'sum':
      return `Then the parts add up to no more than 100 ${u}.`
    case 'macros':
      return 'Then the calories match the protein, carbs and fat.'
    default:
      return 'That reads as a number with the decimal point in place.'
  }
}

const ISSUE_ORDER: LabelIssue['kind'][] = ['serving', 'energy', 'ri', 'part', 'sum', 'macros', 'format']

/**
 * The one fix that makes every check pass, or null. Searches every single-character confusion in
 * each cell that a failing check (or a low-confidence read) points at. More than one candidate
 * means we can't tell which digit was misread, so we don't guess.
 */
export function suggestFix(t: LabelTexts, lowConf: CellId[] = []): Suggestion | null {
  const base = labelIssues(t)
  const failing = base.issues.filter((i) => !i.soft)
  if (!failing.length) return null
  const softIds = new Set(base.issues.filter((i) => i.soft).map((i) => i.id))
  const cells = [...new Set([...failing.flatMap((i) => i.cells), ...lowConf])]
  const found = new Map<string, Suggestion>()
  for (const cell of cells) {
    const text = getText(t, cell)
    if (!text) continue
    const [f, col] = splitCell(cell)
    for (const v of variants(text)) {
      const t2 = withCell(t, cell, v)
      const r = labelIssues(t2)
      // every check passes, and nothing new is merely odd
      if (!r.issues.every((i) => i.soft && softIds.has(i.id))) continue
      const p = r.parsed[cell]
      if (p.value === undefined) continue
      const key = cell + '=' + p.value
      if (found.has(key)) continue
      const issue = ISSUE_ORDER.map((k) => failing.find((i) => i.kind === k && i.cells.includes(cell))).find(Boolean) ?? failing[0]
      found.set(key, { cell, from: text, to: v, value: p.value, display: show(p.value, f, col, p.dp), because: because(issue, cell, t, base) })
    }
    if (found.size > 1) return null
  }
  return found.size === 1 ? [...found.values()][0] : null
}

/* ---------------- read → confirm view ---------------- */

export interface LabelInfo {
  /** the panel as read: the confirm view re-runs the checks on it as the user edits */
  texts: LabelTexts
  /** the one suggested fix, when exactly one exists */
  suggestion: Suggestion | null
  /** cells the reader wasn't sure of (low confidence): highlighted even if every check passes */
  lowConf: CellId[]
  /** "Fibre reads “<0.5g”: saved as 0.5 g." */
  marks: string[]
  /** the name came from the front-of-pack photo */
  nameFromFront: boolean
}

/** The read as texts the checks work on. */
export function textsFromRead(read: LabelRead, ml: boolean): LabelTexts {
  const t: LabelTexts = { per100: {}, serving: {}, ri: {}, servingText: read.serving_text, ml, riBasis: read.ri_basis }
  for (const row of LABEL_ROWS) {
    const f = ROW_FIELD[row], r = read.rows[row]
    if (r.per100.text) t.per100[f] = r.per100.text
    if (r.serving.text) t.serving[f] = r.serving.text
    if (r.ri.text) t.ri[f] = r.ri.text
  }
  return t
}

/** "Walkers Sensations Roasted Chicken & Thyme": brand, product and variety, without repeats. */
export function frontName(front: LabelRead['front']): string {
  const bare = (x: string) => ` ${x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
  let name = ''
  for (const part of [front.brand, front.product, front.variety].map((x) => x.trim()).filter(Boolean)) {
    if (!name || bare(part).includes(bare(name))) name = part // "Walkers" then "Walkers Sensations"
    else if (!bare(name).includes(bare(part))) name = `${name} ${part}`
  }
  return name.slice(0, MAX_NAME).trim()
}

/**
 * The confirm view's starting point for a label read. `base` is the Open Food Facts draft when
 * the photo was taken from its confirm view (it keeps the barcode and OFF's name, kind and
 * category); the label's own numbers always replace OFF's.
 */
export function draftFromLabel(read: LabelRead, opts: { barcode?: string; base?: ScanDraft; taken: Iterable<string> }): ScanDraft {
  const { base } = opts
  const ml = read.basis === '100ml' ? true : read.basis === '100g' ? false : !!base?.ml
  const texts = textsFromRead(read, ml)
  const { parsed } = labelIssues(texts)
  const values: LabelValues = {}
  const marks: string[] = []
  for (const row of LABEL_ROWS) {
    const f = ROW_FIELD[row]
    const p = parsed[cellId(f, 'per100')]
    // a flagged unit or format keeps its number (highlighted); unreadable stays empty
    if (p.value !== undefined && p.flag !== 'unreadable') values[f] = p.value
    if (p.mark) marks.push(`${LABELS[f]} reads “${texts.per100[f]}”: saved as ${show(p.value!, f, 'per100', p.dp)}.`)
  }
  const lowConf: CellId[] = []
  for (const row of LABEL_ROWS) {
    const f = ROW_FIELD[row], r = read.rows[row]
    for (const col of ['per100', 'serving', 'ri'] as Col[]) if (r[col].text && r[col].confidence === 'low') lowConf.push(cellId(f, col))
  }
  const g = parseServing(read.serving_text)
  const fromFront = frontName(read.front)
  const baseName = fromFront || base?.baseName || ''
  const kind: FoodKind = base?.kind ?? 'cook'
  const serv = g !== undefined ? Math.round(g * 10) / 10 : undefined
  return {
    barcode: opts.barcode ?? base?.barcode ?? '',
    name: baseName ? uniqueName(baseName, opts.taken) : '',
    baseName,
    values,
    kcalFromKj: false,
    ml,
    kind,
    meal: base?.meal ?? false,
    cat: base?.cat,
    serving: { eat: serv ?? base?.serving.eat, cook: serv ?? base?.serving.cook ?? 100 },
    pack: packFromQuantity(read.front.pack_size) ?? base?.pack,
    wholePack: false,
    liquid: ml || !!base?.liquid,
    vague: false,
    notes: [],
    usLabel: false,
    source: 'label',
    label: { texts, suggestion: suggestFix(texts, lowConf), lowConf, marks, nameFromFront: !!fromFront },
  }
}

/** An empty label draft, for typing it in when the photo couldn't be read. */
export function emptyLabelDraft(opts: { barcode?: string; base?: ScanDraft; taken: Iterable<string> }): ScanDraft {
  const b = opts.base
  const baseName = b?.baseName ?? ''
  return {
    barcode: opts.barcode ?? b?.barcode ?? '', name: baseName ? uniqueName(baseName, opts.taken) : '', baseName,
    values: {}, kcalFromKj: false, ml: b?.ml ?? false, kind: b?.kind ?? 'cook', meal: b?.meal ?? false, cat: b?.cat,
    serving: { eat: b?.serving.eat, cook: b?.serving.cook ?? 100 }, pack: b?.pack, wholePack: false, liquid: b?.liquid ?? false,
    vague: false, notes: [], usLabel: false, source: 'label',
    label: { texts: { per100: {}, serving: {}, ri: {}, servingText: '', ml: b?.ml ?? false, riBasis: 'none' }, suggestion: null, lowConf: [], marks: [], nameFromFront: false },
  }
}
