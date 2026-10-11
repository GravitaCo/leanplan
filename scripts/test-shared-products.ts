/* Tali's shared product list (docs/migrations/2026-10-10-shared-products.sql, boards sp-1 to sp-6):
   barcode check digits, name filtering, the signed read, share eligibility, tiers and margins, the
   device cache and outbox rules, and consent gating. Run from scripts/test-core.ts (npm test);
   returns the number of failures. */
import { checkDigitOk, foodFromConfirmed, type LabelValues } from '@/core/domain/barcode'
import { draftFromLabel, type LabelRead } from '@/core/domain/label'
import { buildEntry } from '@/core/domain/estimate'
import { kjFromKcal } from '@/core/domain/label'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { sourceErr, sourceOf, SOURCES } from '@/core/data/sources'
import { cleanLookupRow, draftFromShared, marginNote, pct, sameAsFound, shareDecision, shareEligible, sourceCard, tierErr, tierOf, TIER_SOURCE, type SharedProduct } from '@/core/domain/sharedProduct'
import { CONSENT_TYPES, CONSENT_VERSIONS, cleanConsents, hasConsent, hasCurrentConsent, latestConsent, recordConsent, withdraw } from '@/data/consent'
import { stateFromBackup, type SyncMeta } from '@/data/persistence'
import {
  cacheGet, cachePut, canSendOutbox, CACHE_KEY, CACHE_MAX, dropOutbox, LOOKUP_FUNCTION, REPORT_FUNCTION, lookupShared, OUTBOX_KEY, OUTBOX_MAX, queueShare, readOutbox, reconcileOutbox,
  reportShared, sendDelayMs, sendOutbox, type SendResult,
} from '@/data/sharedProducts'
import { setSession } from '@/data/supabase'
import { CAPS, COUNTED_READS, SHARED_TABLES, cleanName, cleanToken, gtin14, kjAgrees, nameProblem, valuesFlags, valuesFromRead, valuesProblem, type ShareToken } from '../supabase/functions/_shared/shared-product'
import { signShare, sigHash, verifyShare } from '../supabase/functions/_shared/product-sig'
import { FRONT_NAME_MAX } from '../supabase/functions/_shared/label-parse'
import { MAX_NAME } from '@/core/domain/barcode'
import { readFileSync } from 'node:fs'

let bad = 0
const report = (area: string, checks: [string, boolean, unknown?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `shared products: ${area}: ${n}`, !ok && detail !== undefined ? JSON.stringify(detail) : '') }
}

function fakeStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, raw: m }
}

/** A code with its GS1 check digit appended. */
const withCheck = (body: string) => {
  let s = 0
  for (let i = 0; i < body.length; i++) s += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1)
  return body + String((10 - (s % 10)) % 10)
}

const ROWS = ['kj', 'kcal', 'fat', 'saturates', 'carbohydrate', 'sugars', 'fibre', 'protein', 'salt', 'alcohol'] as const
function readOf(cells: Partial<Record<(typeof ROWS)[number], string>>, front = { brand: 'Tali Test', product: 'Crunchy Granola', variety: 'Honey', pack_size: '500g' }, basis: LabelRead['basis'] = '100g'): LabelRead {
  const cell = (t: string) => ({ text: t, confidence: 'high' as const })
  return {
    readable: true, basis, serving_text: '30g', ri_basis: 'none',
    rows: Object.fromEntries(ROWS.map((k) => [k, { per100: cell(cells[k] || ''), serving: cell(''), ri: cell('') }])) as LabelRead['rows'],
    front,
  }
}
const GRANOLA = { kj: '1640kJ', kcal: '390kcal', fat: '7.1g', saturates: '1.2g', carbohydrate: '66.0g', sugars: '21.0g', fibre: '7.5g', protein: '9.0g', salt: '0.05g' }
const KEY = 'k'.repeat(16) + '-test-signing-key-0123456789'

function barcodes() {
  const ean13 = '5000157024671'
  const random = Array.from({ length: 300 }, (_, i) => String(5_000_000_000_000 + i * 7_919_113).slice(0, 13))
  report('barcodes', [
    ['a valid EAN-13 → GTIN-14', gtin14(ean13) === '0' + ean13],
    ['a valid UPC-A and EAN-8 → GTIN-14', gtin14('036000291452') === '00036000291452' && gtin14('96385074') === '00000096385074'],
    ['a valid GTIN-14 stays as it is', gtin14(withCheck('1501234567890')) === withCheck('1501234567890')],
    ['a wrong check digit is refused', gtin14('5000157024672') === null && gtin14('036000291453') === null],
    ['not digits, or the wrong length, is refused', gtin14('50001570246a1') === null && gtin14('1234567890') === null && gtin14('') === null && gtin14('5000157024671 ') === null],
    ['agrees with the app’s check digit on 300 codes', random.every((c) => (gtin14(c) !== null) === (checkDigitOk(c) && !/^(02|04|05|2|98|99)/.test(c)))],
    ['in-store and variable-weight codes refused (020-029, 200-299, EAN-8 0/2)', gtin14(withCheck('020123456789')) === null && gtin14(withCheck('210123456789')) === null && gtin14(withCheck('0212345')) === null && gtin14(withCheck('2212345')) === null],
    ['company-internal and coupons refused (040-059, 980+)', gtin14(withCheck('041234567890')) === null && gtin14(withCheck('051234567890')) === null && gtin14(withCheck('981234567890')) === null],
    ['US pharmacy codes (030-039) are real products: allowed', gtin14(withCheck('030123456789')) !== null],
    ['GTIN-14 indicator 9 (variable measure) refused', gtin14(withCheck('9501234567890')) === null],
    ['the SQL refuses the same ranges', /pre between '020' and '029' or pre between '040' and '059'\s+or pre between '200' and '299' or pre >= '980'/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8'))],
  ])
}

function names() {
  const ok = ['Oat & raisin flapjack', 'Walkers Sensations Roasted Chicken & Thyme', 'Coca-Cola Zero Sugar 500ml', 'Pack of 6 x 330ml', 'Sugar free mints', 'Granola 500 500g', 'Müller Corner Strawberry 124g', 'Fruit & Nut Mix']
  const refused: [string, string][] = [
    ['visit www.example.com', 'link'], ['shop.example.co.uk bars', 'link'], ['https://x.io bar', 'link'], ['bar.ly deals', 'link'],
    ['<b>Bold</b> bar', 'contact'], ['email me at sam@home', 'contact'], ['@handle snacks', 'contact'], ['{json}', 'contact'],
    ['Call 07700 900123', 'digits'], ['0800-123-4567 snacks', 'digits'], ['1234567', 'digits'],
    ['Gluten free bread', 'free-from'], ['Nut-free bar', 'free-from'], ['Dairy Free choc', 'free-from'], ['FREE FROM range', 'free-from'], ['Allergen-free cookies', 'free-from'], ['glutenfree loaf', 'free-from'], ['Peanut safe snack', 'free-from'], ['Egg free mayo', 'free-from'],
    ['x'.repeat(81), 'length'], ['   ', 'length'],
    ['Flap\u200Bjack', 'invisible'], ['Flapjack\u200F', 'invisible'], ['\u202Ekcajpalf', 'invisible'], ['Oat\u202A bar', 'invisible'], ['Flapjack\u2066', 'invisible'], ['Flapjack\u2069', 'invisible'], ['Flap\u200Cjack', 'invisible'], ['Flap\u200Djack', 'invisible'],
  ]
  const bads = refused.filter(([n, why]) => nameProblem(n) !== why)
  report('names', [
    ['ordinary names pass', ok.every((n) => nameProblem(n) === null), ok.filter((n) => nameProblem(n) !== null)],
    ['links, markup, @, long digit runs, free-from claims and over-long names are refused, each for its reason', !bads.length, bads.map(([n]) => [n, nameProblem(n)])],
    ['zero-width and bidi controls survive cleanName, so they are refused, not hidden', cleanName('Flap\u200Bjack') === 'Flap\u200Bjack' && nameProblem('Oat\u2010bar\u2019s \u2030') === null],
    ['the SQL refuses the same controls (U+200B-U+200F, U+202A-U+202E, U+2066-U+2069)', readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8').includes("n ~ '[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069]'")],
    ['the SQL refuses the same patterns (links, @, digit runs, free-from)', ['www\\.', '[<>{}@]', "([0-9][ .-]?){6}[0-9]", 'free[[:space:]-]*from', 'gluten|wheat|nut|peanut'].every((x) => readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8').includes(x))],
  ])
}

async function signedReads() {
  const read = readOf(GRANOLA)
  const v = valuesFromRead(read)
  const now = 1_790_000_000
  const t = v ? await signShare(KEY, '05000157024671', v, now) : null
  const verify = (x: ShareToken, at = now) => verifyShare(KEY, x, at)
  const lt = valuesFromRead(readOf({ ...GRANOLA, sugars: '<0.5g' }))
  report('signed reads', [
    ['a clean read gives the front name and per-100 values', !!v && v.name === 'Tali Test Crunchy Granola Honey' && v.k === 390 && v.f === 7.1 && v.c === 66 && v.salt === 0.05 && v.serving_g === 30 && v.ml === false, v],
    ['no front photo (no name): nothing to share', valuesFromRead(readOf(GRANOLA, { brand: '', product: '', variety: '', pack_size: '' })) === null],
    ['a free-from name on the pack: nothing to share', valuesFromRead(readOf(GRANOLA, { brand: 'Tali', product: 'Gluten Free Granola', variety: '', pack_size: '' })) === null],
    ['a flagged cell (kJ in the kcal row, a doubled decimal point) or a missing required figure: nothing', valuesFromRead(readOf({ ...GRANOLA, kcal: '1640kJ' })) === null && valuesFromRead(readOf({ ...GRANOLA, fat: '7.1.1g' })) === null && valuesFromRead(readOf({ ...GRANOLA, protein: '' })) === null],
    ['an alcohol row or no per-100 basis: nothing', valuesFromRead(readOf({ ...GRANOLA, alcohol: '4.5%' })) === null && valuesFromRead(readOf(GRANOLA, undefined, 'unknown')) === null],
    ['kJ and kcal that disagree (more than max(2.5%, 1 kcal)): nothing', valuesFromRead(readOf({ ...GRANOLA, kcal: '90kcal' })) === null && valuesFromRead(readOf({ ...GRANOLA, kj: '1700kJ' })) === null],
    ['kJ and kcal within 2.5%: kept; no kJ on the label: kept', valuesFromRead(readOf({ ...GRANOLA, kj: '1660kJ' }))?.k === 390 && valuesFromRead(readOf({ ...GRANOLA, kj: '' }))?.k === 390],
    ['kjAgrees: 2.5% or 1 kcal, whichever is larger', kjAgrees(1640, 390) && kjAgrees(1673, 390) && !kjAgrees(1720, 390) && kjAgrees(13, 3) && !kjAgrees(17, 3) && !kjAgrees(8, 3)],
    ['energy vs macros: only kJ in the kcal row is refused, a plain gap is kept', (() => {
      // macros give 97 kcal: 400 is kJ in the kcal row; 50 or 200 is only a gap
      const base = { name: 'x', k: 97, p: 2, c: 20, f: 1, ml: false }
      return valuesProblem({ ...base, k: 400 }) === 'energy' && valuesProblem({ ...base, k: 50 }) === null && valuesProblem({ ...base, k: 200 }) === null && valuesProblem(base) === null
    })()],
    ['salt up to 100 kept, over 10 flagged, over 100 refused', (() => {
      const base = { name: 'Stock cubes', k: 250, p: 10, c: 30, f: 10, ml: false }
      return valuesProblem({ ...base, salt: 45.5 }) === null && valuesFlags({ ...base, salt: 45.5 }).join() === 'salt' && valuesFlags({ ...base, salt: 10 }).length === 0 && valuesProblem({ ...base, salt: 100.5 }) === 'range salt'
    })()],
    ['the SQL matches: salt numeric(5,2) to 100, flagged over 10, no energy-gap refusal', (() => {
      const sql = readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')
      return sql.includes('salt numeric(5,2) check (salt between 0 and 100)') && sql.includes("product_num(p_values, 'salt', 0, 100)") && sql.includes('coalesce(v_salt > 10, false)') && !/abs\(v_k - mk\)/.test(sql) && /v_k \/ mk between 3\.5 and 4\.9/.test(sql)
    })()],
    ['"<0.5g" kept at the list’s precision (0.3)', lt?.sugars === 0.3],
    ['signed, the token verifies', !!t && (await verify(t))],
    ['a changed value, name, barcode or time fails', !!t && !(await verify({ ...t, values: { ...t.values, k: 391 } })) && !(await verify({ ...t, values: { ...t.values, name: 'Other' } })) && !(await verify({ ...t, barcode: '00036000291452' })) && !(await verify({ ...t, iat: now + 1 }))],
    ['another key fails', !!t && !(await verifyShare(KEY + 'x', t, now))],
    ['older than 30 days or from the future fails', !!t && !(await verify(t, now + 31 * 86400)) && !(await verify(t, now - 3600)) && (await verify(t, now + 29 * 86400))],
    ['a short key is refused', await signShare('short', '05000157024671', v!, now).then(() => false, () => true)],
    ['the token carries no user id', !!t && Object.keys(t).sort().join() === 'barcode,iat,sig,values' && !/sub|uid|user/i.test(JSON.stringify(t.values))],
    ['cleanToken: a good token passes; extra keys, a bad sig or a non-GTIN barcode do not', !!t && !!cleanToken(JSON.parse(JSON.stringify(t))) && !cleanToken({ ...t, user: 'x' }) && !cleanToken({ ...t, sig: 'abc' }) && !cleanToken({ ...t, barcode: '5000157024671' })],
    ['cleanToken refuses values with extra keys or a refused name', !!t && !cleanToken({ ...t, values: { ...t.values, brand: 'x' } }) && !cleanToken({ ...t, values: { ...t.values, name: 'Nut free www.x.com' } })],
    ['the replay hash is a 64-character hex SHA-256', !!t && /^[0-9a-f]{64}$/.test(await sigHash(t.sig))],
    ['the parser is one: the front name limit matches the app’s', FRONT_NAME_MAX === MAX_NAME],
  ])
  return t
}

function eligibility(t: ShareToken | null) {
  const draft = { ...draftFromLabel(readOf(GRANOLA), { barcode: '5000157024671', taken: [] }), share: t ?? undefined, offMissing: true }
  const lt = valuesFromRead(readOf({ ...GRANOLA, sugars: '<0.5g' }))
  const ltDraft = draftFromLabel(readOf({ ...GRANOLA, sugars: '<0.5g' }), { barcode: '5000157024671', taken: [] })
  const conf = (patch: Partial<{ name: string; values: LabelValues; ml: boolean }> = {}) => ({ name: draft.name, values: draft.values, ml: draft.ml, ...patch })
  report('eligibility', [
    ['the app’s own draft of the read, saved unchanged, may be shared', shareEligible(draft, conf())],
    ['the app parses "<0.5g" as 0.25, the list keeps 0.3: still the same read', !!lt && shareEligible({ ...ltDraft, share: { ...t!, values: lt }, offMissing: true }, { name: ltDraft.name, values: ltDraft.values, ml: false })],
    ['a renamed product is not shared (typed names never are)', !shareEligible(draft, conf({ name: 'My granola' }))],
    ['a changed or added figure is not shared (typed values never are)', !shareEligible(draft, conf({ values: { ...draft.values, f: 7.2 } })) && !shareEligible(draft, conf({ values: { ...draft.values, fibre: undefined } })) && !shareEligible({ ...draft, share: { ...t!, values: { ...t!.values, fibre: undefined } } }, conf())],
    ['per 100 ml switched: not shared', !shareEligible(draft, conf({ ml: true }))],
    ['Open Food Facts has it, or wasn’t asked (offline): not shared', !shareEligible({ ...draft, offMissing: false }, conf()) && !shareEligible({ ...draft, offMissing: undefined }, conf())],
    ['no signed read (typed in, or no barcode): not shared', !shareEligible({ ...draft, share: undefined }, conf()) && !shareEligible({ ...draft, barcode: '' }, conf())],
    ['a token for another barcode: not shared', !shareEligible({ ...draft, barcode: '036000291452' }, conf())],
    ['a "(2)" name for a second copy, from the same front name, still counts as unchanged', shareEligible({ ...draftFromLabel(readOf(GRANOLA), { barcode: '5000157024671', taken: ['Tali Test Crunchy Granola Honey'] }), share: t!, offMissing: true }, { name: 'Tali Test Crunchy Granola Honey (2)', values: draft.values, ml: false })],
  ])
}

function consentGating() {
  const s = stateFromBackup({ days: {} } as never)
  const meta = s._meta as SyncMeta
  const before = shareDecision(true, latestConsent(s, 'shared-products'))
  recordConsent(s, 'shared-products', true)
  const yes = shareDecision(true, latestConsent(s, 'shared-products'))
  withdraw(s, meta, 'shared-products')
  const no = shareDecision(true, latestConsent(s, 'shared-products'))
  const kept = cleanConsents(JSON.parse(JSON.stringify(s.consents)))
  report('consent', [
    ['a consent type of its own, versioned', (CONSENT_TYPES as readonly string[]).includes('shared-products') && CONSENT_VERSIONS['shared-products'] === '2026-10-v1'],
    ['label-photo notice reworded: version 2026-10-v1, and an older yes is asked again', (() => {
      const x = stateFromBackup({ days: {} } as never)
      recordConsent(x, 'label-photo', true, '2026-09-v1')
      const old = hasConsent(x, 'label-photo') && !hasCurrentConsent(x, 'label-photo')
      recordConsent(x, 'label-photo', true)
      return CONSENT_VERSIONS['label-photo'] === '2026-10-v1' && old && hasCurrentConsent(x, 'label-photo')
    })()],
    ['first eligible save asks; after a yes it shares; after a no it keeps the food to itself', before === 'ask' && yes === 'share' && no === 'keep'],
    ['a read that can’t be shared never asks', shareDecision(false, null) === 'none' && shareDecision(false, { granted: true }) === 'none'],
    ['a no is a record (asked once), and survives a backup round trip', !hasConsent(s, 'shared-products') && kept.records.filter((r) => r.type === 'shared-products').length === 2],
    ['withdrawing sharing leaves health consent and data alone', !s.consents!.healthCleared],
    ['the server checks it too (shared_products_allowed: health and shared-products)', /shared_products_allowed[\s\S]*health_consent_current\(auth\.uid\(\)\)[\s\S]*c\.type = 'shared-products'/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')) && readFileSync('supabase/functions/submit-product/index.ts', 'utf8').includes('shared_products_allowed')],
    ['the consents table accepts the new type', readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8').includes("check (type in ('health', 'ai', 'label-photo', 'shared-products'))")],
  ])
}

async function outbox(t: ShareToken | null) {
  if (!t) { report('outbox', [['a signed token to queue', false]]); return }
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
  const nowS = t.iat + 60
  const st = fakeStorage()
  queueShare(t, A, st, nowS)
  queueShare(t, A, st, nowS)
  const once = readOutbox(st)
  const t2 = { ...t, sig: t.sig.slice(0, -2) + (t.sig.endsWith('AA') ? 'BB' : 'AA') }
  queueShare(t2, B, st, nowS)
  const swapped = readOutbox(st)
  const big = fakeStorage()
  for (let i = 0; i < OUTBOX_MAX + 5; i++) queueShare({ ...t, sig: (t.sig.slice(0, 33) + String(i).padStart(10, '0')).slice(0, 43) }, A, big, nowS)
  const stale = fakeStorage()
  queueShare({ ...t, iat: t.iat - 40 * 86400 }, A, stale, nowS)
  queueShare(t, A, stale, nowS)

  const can = (p: Partial<Parameters<typeof canSendOutbox>[0]>) => canSendOutbox({ authed: true, online: true, uid: A, health: true, shared: true, ...p }, readOutbox(fakeStorage({ [OUTBOX_KEY]: JSON.stringify({ v: 1, owner: A, items: [t] }) })))

  const r1 = fakeStorage(); queueShare(t, A, r1, nowS); const d1 = reconcileOutbox(B, true, r1)
  const r2 = fakeStorage(); queueShare(t, A, r2, nowS); const d2 = reconcileOutbox(A, false, r2)
  const r3 = fakeStorage(); queueShare(t, A, r3, nowS); const d3 = reconcileOutbox(A, true, r3)

  // sending: sent and dropped go, a keep stops the run and stays; another account's queue is never sent
  const sendSt = fakeStorage()
  const tA = { ...t, sig: t.sig.slice(0, 40) + 'aaa' }, tB = { ...t, sig: t.sig.slice(0, 40) + 'bbb' }, tC = { ...t, sig: t.sig.slice(0, 40) + 'ccc' }
  for (const x of [tA, tB, tC]) queueShare(x, A, sendSt, nowS)
  const answers: Record<string, SendResult> = { [tA.sig]: 'sent', [tB.sig]: 'drop', [tC.sig]: 'keep' }
  const seen: string[] = []
  const res = await sendOutbox(A, { storage: sendSt, nowS, submit: async (x) => { seen.push(x.sig); return answers[x.sig] } })
  const left = readOutbox(sendSt)?.items.map((x) => x.sig)
  const other = fakeStorage(); queueShare(t, A, other, nowS)
  const calls: string[] = []
  const res2 = await sendOutbox(B, { storage: other, nowS, submit: async (x) => { calls.push(x.sig); return 'sent' } })
  const during = fakeStorage(); queueShare(tA, A, during, nowS)
  await sendOutbox(A, { storage: during, nowS, submit: async () => { queueShare(tB, A, during, nowS); return 'sent' } })
  const stopped = fakeStorage(); queueShare(tA, A, stopped, nowS); queueShare(tB, A, stopped, nowS)
  let n = 0
  await sendOutbox(A, { storage: stopped, nowS, still: () => n++ < 1, submit: async () => 'sent' })
  const delays = Array.from({ length: 50 }, (_, i) => sendDelayMs(() => i / 49))

  report('outbox', [
    ['queued with its owner (on the device only), once', once?.owner === A && once.items.length === 1],
    ['another account queuing replaces the old queue', swapped?.owner === B && swapped.items.length === 1 && swapped.items[0].sig === t2.sig],
    ['capped, oldest first out', readOutbox(big)?.items.length === OUTBOX_MAX],
    ['reads older than 30 days are dropped', readOutbox(stale)?.items.length === 1],
    ['sent only signed in, online, as its owner, with both consents, and not under 18', can({}) && !can({ authed: false }) && !can({ online: false }) && !can({ uid: B }) && !can({ uid: null }) && !can({ health: false }) && !can({ shared: false }) && !can({ underAge: true })],
    ['nothing to send: no send', !canSendOutbox({ authed: true, online: true, uid: A, health: true, shared: true }, null)],
    ['dropped when another account signs in or the consent is withdrawn; kept otherwise', d1 && !readOutbox(r1) && d2 && !readOutbox(r2) && !d3 && !!readOutbox(r3)],
    ['sent and refused reads go; a busy answer stops the run and stays', seen.join() === [tA.sig, tB.sig, tC.sig].join() && left?.join() === tC.sig && res.sent === 1, { seen, left, res }],
    ['another account’s queue is dropped unsent', calls.length === 0 && res2.dropped === 1 && !readOutbox(other)],
    ['a read queued during a send stays', readOutbox(during)?.items.map((x) => x.sig).join() === tB.sig],
    ['signed out or consent withdrawn mid-run: the rest stays', readOutbox(stopped)?.items.length === 1],
    ['the send waits 20 to 90 seconds, at random', Math.min(...delays) >= 20_000 && Math.max(...delays) <= 90_000 && new Set(delays).size > 10],
    ['dropOutbox removes it', (() => { const x = fakeStorage(); queueShare(t, A, x, nowS); dropOutbox(x); return !x.raw.has(OUTBOX_KEY) })()],
    ['the store never sends on launch: only after a save (queue) or a reconnect', (() => { const src = readFileSync('src/store/store.ts', 'utf8'); return (src.match(/scheduleSend\(/g) || []).length === 3 && !/initAuth[\s\S]{0,200}sendSharedProducts/.test(src) })()],
  ])
}

async function lookups() {
  const st = fakeStorage()
  const row = { version: 2, name: 'Oat & raisin flapjack', k: 442, p: 5.5, c: 58, f: 20, fibre: 4, sugars: 30, sat: 9, salt: 0.3, ml: false, serving_g: 65, status: 'unverified', is_current: true, label_reads: 1, audited_on: null }
  const calls: { path: string; body: string; method: string }[] = []
  const fetcher = (answer: () => Response) => (async (path: string, opts: RequestInit = {}) => { calls.push({ path, body: String(opts.body), method: String(opts.method) }); return answer() }) as never
  const ok = (rows: unknown) => () => new Response(JSON.stringify(rows), { status: 200 })
  setSession('h.' + Buffer.from('{}').toString('base64url') + '.s', 'u')
  const found = await lookupShared({ code: '5012345678900' }, { storage: st, fetcher: fetcher(ok([row])) })
  const cached = cacheGet(st, '05012345678900')
  const missing = await lookupShared({ code: '5000157024671' }, { storage: st, fetcher: fetcher(() => new Response('{}', { status: 404 })) })
  const err = await lookupShared({ code: '5000157024671' }, { storage: st, fetcher: fetcher(() => new Response('', { status: 500 })) })
  const fromCache = await lookupShared({ code: '5012345678900' }, { storage: st, fetcher: fetcher(() => { throw new TypeError('Failed to fetch') }) })
  const empty = await lookupShared({ code: '5012345678900' }, { storage: st, fetcher: fetcher(ok([])) })
  // nothing cached for this code: a slow function, a 5xx and a lost connection
  const hang = (async (_path: string, o: RequestInit = {}) => new Promise<Response>((_res, rej) => o.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))) as never
  const slow = await lookupShared({ code: '5000157024671' }, { storage: st, fetcher: hang, timeoutMs: 20 })
  const err503 = await lookupShared({ code: '5000157024671' }, { storage: st, fetcher: fetcher(() => new Response('', { status: 503 })) })
  const failOnline = await lookupShared({ code: '5000157024671' }, { storage: st, fetcher: fetcher(() => { throw new TypeError('Failed to fetch') }) })
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
  const noNet = await lookupShared({ code: '5000157024671' }, { storage: st, fetcher: fetcher(() => { throw new TypeError('Failed to fetch') }) })
  if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete (globalThis as { navigator?: unknown }).navigator
  const instore = await lookupShared({ code: withCheck('210123456789') }, { storage: st, fetcher: fetcher(ok([row])) })
  setSession(null, null)
  const noSession = await lookupShared({ code: '5012345678900' }, { storage: fakeStorage(), fetcher: fetcher(ok([row])) })
  const capped = fakeStorage()
  const p = cleanLookupRow(row)!
  for (let i = 0; i < CACHE_MAX + 10; i++) cachePut(capped, String(10_000_000_000_000 + i).padStart(14, '0'), p, i)
  const cacheSize = Object.keys(JSON.parse(capped.raw.get(CACHE_KEY)!).items).length
  setSession('h.e30.s', 'u')
  const rep = await reportShared('5012345678900', 2, 'name', { fetcher: fetcher(ok({ ok: true })) })
  const repLimited = await reportShared('5012345678900', 2, 'name', { fetcher: fetcher(() => new Response('{}', { status: 429 })) })
  setSession(null, null)
  // the cache belongs to the account that filled it: another account signing in clears it
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
  const own = fakeStorage(); cachePut(own, '05012345678900', p, 1, A)
  const keptA = !reconcileOutbox(A, true, own) && !!cacheGet(own, '05012345678900')
  reconcileOutbox(B, true, own)
  const clearedB = !own.raw.has(CACHE_KEY)
  const legacy = fakeStorage({ [CACHE_KEY]: JSON.stringify({ v: 1, items: {} }) }); reconcileOutbox(A, true, legacy)
  const mixed = fakeStorage(); cachePut(mixed, '05012345678900', p, 1, A); cachePut(mixed, '05000157024671', p, 2, B)
  const mixedOk = !cacheGet(mixed, '05012345678900') && !!cacheGet(mixed, '05000157024671')

  report('lookup and report', [
    ['found: a POST to the lookup-product function, the barcode only in the body (as GTIN-14)', found.status === 'found' && calls[0].path === LOOKUP_FUNCTION && LOOKUP_FUNCTION === 'lookup-product' && calls[0].method === 'POST' && JSON.parse(calls[0].body).barcode === '05012345678900' && Object.keys(JSON.parse(calls[0].body)).join() === 'barcode'],
    ['found products are cached on the device', !!cached && cached.version === 2 && cached.values.k === 442],
    ['not on the list (or the function not deployed yet): not found, so Open Food Facts runs', missing.status === 'not-found'],
    ['a server error: error (Open Food Facts runs)', err.status === 'error'],
    ['no connection: the cached product still opens', fromCache.status === 'found'],
    ['a slow lookup (timeout) or a 5xx is no shared result, not offline: Open Food Facts runs', slow.status === 'error' && err503.status === 'error'],
    ['only a device that says it’s offline is offline (nothing cached)', noNet.status === 'offline'],
    ['a failed fetch while online is an error, so Open Food Facts still runs', failOnline.status === 'error'],
    ['gone from the list: the cache forgets it', empty.status === 'not-found' && !cacheGet(st, '05012345678900')],
    ['in-store codes are never looked up', instore.status === 'not-found' && !calls.some((c) => c.body.includes('210123'))],
    ['not signed in: not looked up', noSession.status === 'not-found'],
    ['the cache is capped, least recently used out', cacheSize === CACHE_MAX],
    ['a report is a POST to the report-product function with no identity', rep === 'sent' && calls.at(-2)!.path === REPORT_FUNCTION && REPORT_FUNCTION === 'report-product' && Object.keys(JSON.parse(calls.at(-2)!.body)).sort().join() === 'barcode,reason,version'],
    ['a report over the per-caller limit (429) is an error, not sent', repLimited === 'error'],
    ['the cache is kept for its own account and cleared when another account signs in', keptA && clearedB],
    ['a cache with no owner on record is cleared at sign-in', !legacy.raw.has(CACHE_KEY)],
    ['another account’s lookup starts the cache afresh', mixedOk],
    ['a malformed row is refused', cleanLookupRow({ ...row, k: 'lots' }) === null && cleanLookupRow({ ...row, name: '' }) === null && cleanLookupRow(null) === null],
  ])
}

function tiersAndMargins() {
  const p = (reads: number, status: SharedProduct['status'] = 'unverified', audited?: string) => ({ reads, status, audited })
  const food = (src: string) => ({ id: 'x', n: 'Flapjack', k: 442, p: 5.5, c: 58, f: 20, g: 65, src })
  const portion = { serv: { mode: 'serv', serv: 1 }, g: { mode: 'g', grams: 65, learned: null }, hand: { mode: 'hand', type: 'cupped', count: 1 } } as const
  const entryErr = (src: string, custom = true, how: keyof typeof portion = 'serv') => buildEntry(food(src), portion[how] as never, 'snack' as never, DEFAULT_PROFILE, { custom, fat: null, askFat: false }).entry.err
  const row = { version: 1, name: 'Oat & raisin flapjack', k: 442, p: 5.5, c: 58, f: 20, fibre: 4, sugars: 30, sat: 9, salt: 0.3, ml: false, serving_g: 65, status: 'unverified', label_reads: 3, audited_on: null }
  const d = draftFromShared(cleanLookupRow(row)!, '5012345678900', [])
  const saved = foodFromConfirmed({ barcode: d.barcode, name: d.name, values: d.values, ml: d.ml, kind: 'eat', g: 65, source: 'label', sharedSrc: `${TIER_SOURCE[d.shared!.tier]}:${d.barcode}` })
  report('tiers and margins', [
    ['tiers: verified only by Tali’s audit; counted from COUNTED_READS reads; else unchecked', tierOf(p(1)) === 'unchecked' && tierOf(p(COUNTED_READS - 1)) === 'unchecked' && tierOf(p(COUNTED_READS)) === 'counted' && tierOf(p(50, 'verified', '2026-10')) === 'verified' && tierOf(p(50, 'verified')) === 'counted' && tierOf(p(1, 'disputed')) === 'unchecked'],
    ['source keys hold each tier’s extra margin: +0.09 (per-100), +0.04, +0', SOURCES['shared-unchecked'].err === 0.09 && SOURCES['shared-unchecked'].perHundred === true && SOURCES['shared-counted'].err === 0.04 && SOURCES['shared-verified'].err === 0],
    ['One serving margins add (0.12 + 0.03 + extra): 0.24, 0.19, 0.15', tierErr('unchecked') === 0.24 && tierErr('counted') === 0.19 && tierErr('verified') === 0.15],
    ['sp-2/3/3b One serving: 287 kcal ± 69, ± 55, ± 43', Math.round(287 * tierErr('unchecked')) === 69 && Math.round(287 * tierErr('counted')) === 55 && Math.round(287 * tierErr('verified')) === 43],
    ['margin lines', marginNote('unchecked') === '±\u00a024% while a shared product is unchecked, against ±\u00a015% for a food you add yourself.' && marginNote('counted') === '±\u00a019% once it’s been read from the pack 3 times, against ±\u00a015% for a food you add yourself.' && marginNote('verified') === '±\u00a015%, the same as a food you add yourself.'],
    ['pct keeps "±" and the figure together (a non-breaking space)', pct(0.15) === '±\u00a015%' && !/± /.test(marginNote('unchecked'))],
    ['source cards as on the boards', sourceCard({ tier: 'unchecked', reads: 1 }).title === 'Added by a Tali user, not yet checked. Check against your pack.' && sourceCard({ tier: 'counted', reads: 3 }).title === 'Read from the pack 3 times' && sourceCard({ tier: 'counted', reads: 3 }).sub === 'Check against your pack.' && sourceCard({ tier: 'verified', reads: 9, audited: '2026-10' }).title === 'Checked by Tali, Oct 2026' && sourceCard({ tier: 'verified', reads: 9, audited: '2026-10' }).sub === 'Only Tali’s own checks set this.'],
    ['margins add, by capture: weighed 0.20 / 0.15 / 0.11, serving 0.24 / 0.19 / 0.15, hand 0.32 / 0.27 / 0.23', (['unchecked', 'counted', 'verified'] as const).map((t) => [entryErr(TIER_SOURCE[t] + ':5012345678900', true, 'g'), entryErr(TIER_SOURCE[t] + ':5012345678900'), entryErr(TIER_SOURCE[t] + ':5012345678900', true, 'hand')].join('/')).join(' ') === '0.2/0.24/0.32 0.15/0.19/0.27 0.11/0.15/0.23',
      (['unchecked', 'counted', 'verified'] as const).map((t) => [entryErr(TIER_SOURCE[t] + ':5012345678900', true, 'g'), entryErr(TIER_SOURCE[t] + ':5012345678900'), entryErr(TIER_SOURCE[t] + ':5012345678900', true, 'hand')].join('/')).join(' ')],
    ['a typed label is unchanged (serving 0.15, weighed 0.11); a shared food adds the label margin even as a built-in path', entryErr('label') === 0.15 && entryErr('label', true, 'g') === 0.11 && entryErr('shared-counted:1', false) === 0.19],
    ['a saved shared food cites the list', sourceErr(food('shared-unchecked:1')) === 0.09 && sourceOf(food('shared-verified:5012345678900'))?.text === 'Tali’s shared list: checked by Tali · 5012345678900'],
    ['found product → confirm draft: values, serving, tier, never in OFF', d.source === 'shared' && d.values.k === 442 && d.serving.eat === 65 && d.shared?.tier === 'counted' && d.offMissing === true],
    ['with a pack serving it opens as "Eat as it is"; without one, "For cooking"', d.kind === 'eat' && draftFromShared(cleanLookupRow({ ...row, serving_g: null })!, '5012345678900', []).kind === 'cook'],
    ['kJ is worked out from kcal for display (kcal × 4.184, rounded)', kjFromKcal(442) === 1849 && kjFromKcal(0) === 0 && kjFromKcal(390) === 1632 && d.values.kj === undefined],
    ['the confirm view shows no "—" placeholders', !readFileSync('src/screens/food/ScanConfirmView.tsx', 'utf8').includes('—')],
    ['saved unchanged it keeps the tier’s source; changed figures make it the user’s own label', saved.src === 'shared-counted:5012345678900' && sameAsFound(d.shared!, d.values, false) && !sameAsFound(d.shared!, { ...d.values, k: 440 }, false) && !sameAsFound(d.shared!, d.values, true)],
    ['reports go through report-product; lookups through lookup-product; both RPCs are service-role only', (() => {
      const sql = readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')
      return sql.includes('grant execute on function public.report_product(text, integer, text) to service_role;') && sql.includes('grant execute on function public.lookup_product(text) to service_role;')
        && !/grant execute on function public\.(report|lookup)_product\([^)]*\) to authenticated/.test(sql)
        && readFileSync('supabase/functions/report-product/index.ts', 'utf8').includes('rateLimiter(5, 20)') && readFileSync('supabase/functions/lookup-product/index.ts', 'utf8').includes('rateLimiter(20, 200)')
    })()],
    ['a name report hides at 2, any report at 3 (CAPS mirrored in SQL)', CAPS.nameReportsToHide === 2 && CAPS.reportsToHide === 3 && /name_reports \+ \(p_reason = 'name'\)::integer >= 2/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8'))],
    ['report_product takes the submit_product lock', (readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8').match(/pg_advisory_xact_lock\(hashtextextended\('tali-product:' \|\| gtin, 0\)\)/g) || []).length === 2],
    ['product ids are random UUIDs, not a sequence (no day signal)', /id uuid primary key default gen_random_uuid\(\)/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')) && !/generated always as identity/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8'))],
    ['ai_usage rows older than 60 days are cleared daily by pg_cron', /cron\.schedule\('tali-ai-usage-cleanup', '41 3 \* \* \*', 'select public\.ai_usage_cleanup\(\)'\)/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')) && /day < \(now\(\) at time zone 'utc'\)::date - 60/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8'))],
    ['caps as Benn set them (10 a version a month, 5 versions, 300 new a day) are in the SQL', CAPS.countsPerVersionMonth === 10 && CAPS.versionsPerBarcode === 5 && CAPS.newRowsPerDay === 300 && /month_count < 10/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')) && /nver > 5/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8')) && /new_rows < 300/.test(readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8'))],
    ['the three shared tables are the ones the migration creates', SHARED_TABLES.every((t) => readFileSync('docs/migrations/2026-10-10-shared-products.sql', 'utf8').includes('create table if not exists public.' + t + ' ('))],
  ])
}

export async function sharedProductsSuite(): Promise<number> {
  bad = 0
  barcodes()
  names()
  const t = await signedReads()
  eligibility(t)
  consentGating()
  await outbox(t)
  await lookups()
  tiersAndMargins()
  return bad
}
