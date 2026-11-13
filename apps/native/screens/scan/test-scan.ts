/**
 * `npm run test:scan` (from apps/native): the scan stream's logic against the web's, with fixtures
 * and no phone. Every network call is answered in memory; the real Supabase project and Open Food
 * Facts are never reached, and the model API is never called.
 *
 * - The platform scanner's reads (expo-camera's names, iOS's UPC-A quirk) give the same code as the
 *   web decoder's reads of the same pack, and so the same lookups.
 * - The lookup chain (lookup.ts) in the web's order, with every outcome, and the requests it sends
 *   through the shared src/data functions (lookup-product body, Open Food Facts URL).
 * - Label photos: the web's sizes and JPEG tries; the read (labelRead.ts) carries over
 *   e2e-label-scan's outcomes: a good read, a function error, offline, the function missing
 *   (unavailable), the consent sent before the photo, a 403 consent refusal, the daily cap, an
 *   unreadable photo, and the gates (no health answer, under 18) that keep the photo on the phone.
 */
import { FOODS } from '@/core/data/foods'
import { normalizeBarcode, type ScanDraft } from '@/core/domain/barcode'
import type { Food } from '@/core/types'
import { LABEL_ROWS, type LabelRead, type LabelRowKey } from '../../../../supabase/functions/_shared/label-read'
import { lookupProduct } from '@/data/products'
import { lookupShared } from '@/data/sharedProducts'
import { readLabel } from '@/data/labelReader'
import { setSession } from '@/data/supabase'
import { typedDigits, webFormat, NATIVE_FORMATS } from './barcode'
import { resolveBarcode, type LookupDeps, type ScanOutcome } from './lookup'
import { b64Bytes, edgeOf, fitLongEdge, jpegSteps, MAX_BYTES } from './photoSize'
import { readBody, readPhotos, thenKey, typedDraft, type ReadDeps } from './labelRead'

let failed = 0
let passed = 0
function check(name: string, ok: boolean, detail?: unknown): void {
  if (ok) passed++
  else { failed++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400)) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/* ---------------- fetch stand-in ---------------- */

type Call = { url: string; method: string; body: string; headers: Record<string, string> }
const calls: Call[] = []
let answer: (c: Call) => Response | Promise<Response> = () => new Response('{}', { status: 404 })
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const h = new Headers(init.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined))
  const headers: Record<string, string> = {}
  h.forEach((v, k) => { headers[k] = v })
  const body = init.body == null ? '' : typeof init.body === 'string' ? init.body : String(init.body)
  const c = { url, method: init.method ?? 'GET', body, headers }
  calls.push(c)
  if (init.signal?.aborted) throw new DOMException('aborted', 'AbortError')
  return answer(c)
}) as typeof fetch
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } })
// a session the shared code accepts (the functions' Authorization header carries it)
setSession('h.' + btoa('{}').replace(/=+$/, '') + '.s', '11111111-2222-4333-8444-555555555555')

/* ---------------- 1. platform reads = web reads ---------------- */

function formats() {
  // [what the web decoder reports, what expo-camera reports for the same pack on iOS / Android]
  const packs: { name: string; web: [string, string]; ios: [string, string]; android: [string, string] }[] = [
    // EAN-13, UK
    { name: 'EAN-13 (UK pack)', web: ['5000157024671', 'ean_13'], ios: ['ean13', '5000157024671'], android: ['ean13', '5000157024671'] },
    // UPC-A: iOS reports it as an EAN-13 and strips the leading 0 (expo-camera BarcodeScannerUtils)
    { name: 'UPC-A (US pack)', web: ['036000291452', 'upc_a'], ios: ['ean13', '036000291452'], android: ['upc_a', '036000291452'] },
    // an EAN-13 that starts with 0: iOS strips that 0 too
    { name: 'EAN-13 starting 0', web: ['0012345678905', 'ean_13'], ios: ['ean13', '012345678905'], android: ['ean13', '0012345678905'] },
    // EAN-8 (the UK's short code)
    { name: 'EAN-8', web: ['96385074', 'ean_8'], ios: ['ean8', '96385074'], android: ['ean8', '96385074'] },
    // an 8-digit code valid as both EAN-8 and UPC-E: only the format tells them apart
    { name: 'EAN-8 that is also a valid UPC-E', web: ['01234572', 'ean_8'], ios: ['ean8', '01234572'], android: ['ean8', '01234572'] },
    { name: 'UPC-E that is also a valid EAN-8', web: ['01234572', 'upc_e'], ios: ['upc_e', '01234572'], android: ['upc_e', '01234572'] },
    // UPC-E
    { name: 'UPC-E', web: ['01234565', 'upc_e'], ios: ['upc_e', '01234565'], android: ['upc_e', '01234565'] },
  ]
  for (const p of packs) {
    const web = normalizeBarcode(p.web[0], p.web[1])
    for (const os of ['ios', 'android'] as const) {
      const [type, data] = p[os]
      const nat = normalizeBarcode(data, webFormat(type, data))
      check(`${p.name}: ${os} read looks up the web's code`, !!web && eq(nat, web), { web, nat })
    }
  }
  check('a misread (bad check digit) is refused as on web', normalizeBarcode('5000157024672', webFormat('ean13', '5000157024672')) === null)
  check('the scanner asks only for the four retail formats', eq([...NATIVE_FORMATS].sort(), ['ean13', 'ean8', 'upc_a', 'upc_e']))
  check('typed input: digits only, at most 14 (web filter)', typedDigits('50 0015-7024671999x') === '50001570246719')
}

/* ---------------- 2. the lookup chain ---------------- */

const OFF_PRODUCT = {
  product_name: 'Sensations Roasted Chicken & Thyme', brands: 'Walkers', quantity: '150 g', product_quantity: 150, serving_size: '30 g', serving_quantity: 30,
  nutriments: { 'energy-kcal_100g': 497, 'energy-kj_100g': 2075, fat_100g: 27, 'saturated-fat_100g': 2.3, carbohydrates_100g: 56, sugars_100g: 3.6, fiber_100g: 4.5, proteins_100g: 6.2, salt_100g: 1.3 },
  categories_tags: ['en:crisps'], countries_tags: ['en:united-kingdom'],
}
const SHARED_ROW = { version: 2, name: 'Oat & raisin flapjack', k: 442, p: 5.5, c: 58, f: 20, fibre: 4, sugars: 30, sat: 9, salt: 0.3, ml: false, serving_g: 65, status: 'unverified', is_current: true, label_reads: 1, audited_on: null }

function deps(over: Partial<LookupDeps> = {}): LookupDeps {
  return { all: FOODS, customFoods: [], linkBarcode: () => null, sharedEnabled: true, lookupShared: (c, o) => lookupShared(c, { ...o, storage: null }), lookupProduct, ...over }
}
async function settle(raw: string, format: string | undefined, d: LookupDeps): Promise<ScanOutcome | 'invalid' | null> {
  const r = resolveBarcode(raw, format, d)
  if (r.kind === 'invalid') return 'invalid'
  return r.kind === 'done' ? r.outcome : r.result
}

async function chain() {
  const saved: Food = { id: 'f1', n: 'My oat bar', k: 400, p: 8, c: 60, f: 14, barcode: '5012345678900' } as Food
  // on the device: no network at all
  calls.length = 0
  const local = await settle('5012345678900', 'ean_13', deps({ all: FOODS.concat([saved]), customFoods: [saved] }))
  check('a saved food opens from the device, no request', !!local && local !== 'invalid' && local.kind === 'local' && local.food.id === 'f1' && calls.length === 0, local)
  const bad = resolveBarcode('5012345678901', 'ean_13', deps())
  check('a bad check digit is invalid (scanner stays open)', bad.kind === 'invalid')
  const pend = resolveBarcode('5000157024671', 'ean_13', deps())
  check('a valid code not on the device shows "Looking up <code>"', pend.kind === 'pending' && pend.code === '5000157024671')
  if (pend.kind === 'pending') await pend.result

  // the shared list first, then Open Food Facts
  calls.length = 0
  answer = (c) => (c.url.includes('/functions/v1/lookup-product') ? json([SHARED_ROW]) : json({ status: 0 }, 404))
  const shared = await settle('5012345678900', 'ean_13', deps())
  const lp = calls.find((c) => c.url.includes('/functions/v1/lookup-product'))
  check('shared list found → "shared" with its draft', !!shared && shared !== 'invalid' && shared.kind === 'shared' && shared.draft.shared?.version === 2, shared)
  check('lookup-product: POST, the barcode as GTIN-14 in the body (never the URL)', !!lp && lp.method === 'POST' && lp.body === JSON.stringify({ barcode: '05012345678900' }) && !lp.url.includes('5012345678900'), lp)
  check('Open Food Facts not asked once the shared list has it', !calls.some((c) => c.url.includes('openfoodfacts')))

  calls.length = 0
  answer = (c) => (c.url.includes('lookup-product') ? json([]) : c.url.includes('openfoodfacts') ? json({ status: 1, product: OFF_PRODUCT }) : json({}, 404))
  const off = await settle('5000157024671', 'ean_13', deps())
  const offCall = calls.find((c) => c.url.includes('openfoodfacts'))
  check('not on the shared list → Open Food Facts → "found"', !!off && off !== 'invalid' && off.kind === 'found' && off.draft.values.k === 497, off)
  check('shared list asked before Open Food Facts', calls.findIndex((c) => c.url.includes('lookup-product')) < calls.findIndex((c) => c.url.includes('openfoodfacts')))
  check('Open Food Facts URL as on web', !!offCall && offCall.url.startsWith('https://world.openfoodfacts.org/api/v2/product/5000157024671.json?fields='), offCall?.url)

  calls.length = 0
  const offOnly = await settle('5000157024671', 'ean_13', deps({ sharedEnabled: false }))
  check('shared list off → straight to Open Food Facts', !!offOnly && offOnly !== 'invalid' && offOnly.kind === 'found' && !calls.some((c) => c.url.includes('lookup-product')))

  answer = (c) => (c.url.includes('lookup-product') ? json([]) : json({ status: 0 }, 404))
  const nf = await settle('5000157024671', 'ean_13', deps())
  check('nowhere → missing, not-found (Create a food with the barcode)', eq(nf, { kind: 'missing', barcode: '5000157024671', why: 'not-found' }), nf)

  answer = (c) => (c.url.includes('lookup-product') ? json([]) : new Response('', { status: 502 }))
  const err = await settle('5000157024671', 'ean_13', deps())
  check('Open Food Facts error → missing, error', eq(err, { kind: 'missing', barcode: '5000157024671', why: 'error' }), err)

  // offline: navigator.onLine false (NetInfo on the phone)
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
  calls.length = 0
  const offl = await settle('5000157024671', 'ean_13', deps())
  check('offline → missing, offline, nothing sent', eq(offl, { kind: 'missing', barcode: '5000157024671', why: 'offline' }) && calls.length === 0, { offl, calls: calls.length })
  if (nav) Object.defineProperty(globalThis, 'navigator', nav)
  else Reflect.deleteProperty(globalThis, 'navigator')

  // saved by hand under the same name: the barcode is linked to it
  const mine: Food = { id: 'm1', n: 'Walkers Sensations Roasted Chicken & Thyme', k: 500, p: 6, c: 55, f: 28 } as Food
  let linked: [string, string] | null = null
  answer = (c) => (c.url.includes('lookup-product') ? json([]) : json({ status: 1, product: OFF_PRODUCT }))
  const link = await settle('5000157024671', 'ean_13', deps({ customFoods: [mine], all: FOODS.concat([mine]), linkBarcode: (id, code) => { linked = [id, code]; return { ...mine, barcode: code } } }))
  check('same name saved by hand → barcode linked, opens as local', !!link && link !== 'invalid' && link.kind === 'local' && eq(linked, ['m1', '5000157024671']), { link, linked })

  // the screen closed while looking up: nothing reported
  const closed = await settle('5000157024671', 'ean_13', deps({ alive: () => false }))
  check('closed mid-lookup → nothing reported', closed === null)
}

/* ---------------- 3. label photos ---------------- */

function sizes() {
  check('nutrition table sent at a 1600 px long edge, front at 1024 (web)', edgeOf('panel') === 1600 && edgeOf('front') === 1024)
  check('the web’s three JPEG tries', eq(jpegSteps(1600), [[1600, 0.85], [1600, 0.72], [1280, 0.72]]))
  check('1.5 MB cap (web MAX_BYTES)', MAX_BYTES === 1_500_000)
  check('never scaled up', fitLongEdge(1200, 900, 1600) === null)
  check('landscape scaled by width, portrait by height', eq(fitLongEdge(4032, 3024, 1600), { width: 1600 }) && eq(fitLongEdge(3024, 4032, 1600), { height: 1600 }))
  check('base64 size counts bytes', b64Bytes('QUJD') === 3 && b64Bytes('QUI=') === 2 && b64Bytes('QQ==') === 1)
}

// the granola label of scripts/e2e-label-scan.cjs (GRANOLA, readOf)
const GRANOLA: Partial<Record<LabelRowKey, [string, string]>> = {
  kj: ['1640kJ', '492kJ'], kcal: ['390kcal', '117kcal'], fat: ['7.1g', '2.1g'], saturates: ['1.2g', '0.4g'], carbohydrate: ['66.0g', '19.8g'],
  sugars: ['21.0g', '6.3g'], fibre: ['7.5g', '2.3g'], protein: ['9.0g', '2.7g'], salt: ['0.05g', '0.02g'],
}
const cell = (text = '') => ({ text, confidence: 'high' as const })
const READ: LabelRead = {
  readable: true, basis: '100g', serving_text: '30g', ri_basis: 'none',
  rows: Object.fromEntries(LABEL_ROWS.map((k) => [k, { per100: cell(GRANOLA[k]?.[0]), serving: cell(GRANOLA[k]?.[1]), ri: cell() }])) as LabelRead['rows'],
  front: { brand: 'Tilo Test', product: 'Crunchy Granola', variety: 'Honey', pack_size: '500g' },
}

async function reads() {
  const PANEL = '/9j/' + 'A'.repeat(200)
  const FRONT = '/9j/' + 'B'.repeat(200)
  check('request body as the web builds it', eq(readBody({ panel: PANEL, front: FRONT, barcode: '5000157024671' }), { panel: PANEL, front: FRONT, barcode: '5000157024671' }) && eq(readBody({ panel: PANEL }), { panel: PANEL }))
  const order: string[] = []
  const d = (over: Partial<ReadDeps> = {}): ReadDeps => ({
    consentLetsSync: () => true, underAge: () => false,
    flushConsents: async () => { order.push('flush') },
    readLabel: (b, o) => { order.push('read'); return readLabel(b, o) },
    discard: () => { order.push('discard') },
    ...over,
  })
  const note = (s: string, then: string) => `${s}|${then}`
  const base: ScanDraft = { name: 'From OFF' } as unknown as ScanDraft

  // a good read, through the real readLabel and the function stand-in
  calls.length = 0
  answer = (c) => (c.url.includes('/functions/v1/ai-read-label') ? json({ ok: true, read: READ }) : json({}, 404))
  const good = await readPhotos({ panel: PANEL, front: FRONT, barcode: '5000157024671', taken: [] }, d(), note)
  const fn = calls.find((c) => c.url.includes('ai-read-label'))
  check('good read → confirm with the label draft', good.kind === 'confirm' && !good.notice && good.draft.source === 'label' && good.draft.values.k === 390, good)
  check('ai-read-label gets the web’s body, with the session', !!fn && eq(JSON.parse(fn.body), { panel: PANEL, front: FRONT, barcode: '5000157024671' }) && fn.headers.authorization?.startsWith('Bearer '), fn && { body: fn.body.slice(0, 80), auth: fn.headers.authorization })
  check('the label-photo consent is sent before the photo, the photo deleted once read', order.join() === 'flush,read,discard', order)

  const fail = async (status: number, body: unknown, withBase = false) => {
    answer = (c) => (c.url.includes('ai-read-label') ? json(body, status) : json({}, 404))
    return readPhotos({ panel: PANEL, taken: [], ...(withBase ? { base } : {}) }, d(), note)
  }
  order.length = 0
  const e500 = await fail(500, { error: 'model' })
  check('a failed read deletes the photo too', order.join() === 'flush,read,discard', order)
  check('function error → type it in, with the web’s note', e500.kind === 'confirm' && e500.notice === 'error|type' && e500.draft.source === 'label', e500)
  const e404 = await fail(404, {})
  check('function missing → unavailable, "Type it in instead"', e404.kind === 'confirm' && e404.notice === 'unavailable|unavailable', e404)
  const e403 = await fail(403, { error: 'consent' })
  check('server refuses for consent → its note, typed fallback', e403.kind === 'confirm' && e403.notice === 'consent|type', e403)
  const e429 = await fail(429, {})
  check('daily cap → limit note', e429.kind === 'confirm' && e429.notice === 'limit|type', e429)
  const e422 = await fail(422, { error: 'unreadable' })
  check('unreadable photo → its note', e422.kind === 'confirm' && e422.notice === 'unreadable|type', e422)
  const withBase = await fail(500, {}, true)
  check('after Open Food Facts: back to its figures, "check them against your pack"', withBase.kind === 'confirm' && withBase.notice === 'error|off' && (withBase.draft as unknown as { name: string }).name === 'From OFF', withBase)

  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
  calls.length = 0
  const offline = await readPhotos({ panel: PANEL, taken: [] }, d(), note)
  check('offline → offline note, nothing sent', offline.kind === 'confirm' && offline.notice === 'offline|type' && !calls.some((c) => c.url.includes('ai-read-label')), offline)
  if (nav) Object.defineProperty(globalThis, 'navigator', nav)
  else Reflect.deleteProperty(globalThis, 'navigator')

  calls.length = 0
  const noHealth = await readPhotos({ panel: PANEL, taken: [] }, d({ consentLetsSync: () => false }), note)
  check('no health answer yet → the photo never leaves the phone', noHealth.kind === 'confirm' && noHealth.notice === 'error|type' && calls.length === 0, { noHealth, calls: calls.length })
  order.length = 0
  const under = await readPhotos({ panel: PANEL, taken: [] }, d({ underAge: () => true }), note)
  check('a photo that never left the phone is deleted too', order.join() === 'discard', order)
  check('under 18 on screen → the photo never leaves the phone', under.kind === 'confirm' && calls.length === 0)

  answer = () => json({}, 500)
  const share = await readPhotos({ panel: PANEL, barcode: '5000157024671', taken: [], forShare: true }, d(), note)
  check('sharing a saved food: a failed read goes back (nothing shared)', eq(share, { kind: 'share-failed', status: 'error' }), share)
  check('typed fallback keeps the barcode', typedDraft({ barcode: '5000157024671', taken: [] }).barcode === '5000157024671')
  check('fallback wording keys follow the web', thenKey('unavailable', false) === 'unavailable' && thenKey('unavailable', true) === 'off' && thenKey('limit', false) === 'type')
}

async function main() {
  formats()
  await chain()
  sizes()
  await reads()
  globalThis.fetch = realFetch
  console.log(`${failed ? 'FAIL' : 'PASS'} scan: ${passed} passed, ${failed} failed`)
  if (failed) throw new Error(`${failed} scan check(s) failed`)
}
void main().catch((e: unknown) => { console.error(e); (globalThis as { process?: { exitCode?: number } }).process!.exitCode = 1 })
