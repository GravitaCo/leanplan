/**
 * Headless end-to-end check of Tali's shared product list (boards sp-1 to sp-6), in Chromium with
 * a fake camera, in light and dark. Every Supabase request is intercepted: the session is a fake
 * one, lookup_product / report_product and the ai-read-label and submit-product functions are
 * mocked per scenario, and Open Food Facts answers "not found". Nothing real is called.
 *
 * The list is on only with label scanning (SHARED_PRODUCTS_ENABLED = LABEL_SCAN_ENABLED):
 *
 *   VITE_LABEL_SCAN=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 &
 *   NODE_PATH=$(npm root -g) E2E_OUT=<dir for screenshots> node scripts/e2e-shared-products.cjs
 *
 * Scenarios: a label read of a product OFF lacks → Save → the one-time opt-in (sp-1) → Yes → the
 * read is queued (owner on the device only) and sent after the random delay, never before; Not
 * now → nothing queued, never asked again; a found, unchecked product (sp-2) with its margin,
 * counted (sp-3) and checked (sp-3b); the report sheet (sp-6): Send off until a reason is picked,
 * an anonymous POST; offline: the queue waits, and goes after the connection returns; the Profile ›
 * Privacy toggle (sp-5). Screenshots of each board's state go to E2E_OUT.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const BASE = process.env.E2E_URL || 'http://localhost:4173/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-e2e-sp-'))
fs.mkdirSync(OUT, { recursive: true })
const W = 640, H = 480
const UID = '11111111-2222-4333-8444-555555555555'
const CODE = '5012345678900'

/** A nutrition table drawn on a canvas, returned as RGBA (as in e2e-label-scan.cjs). */
async function labelFrame(browser) {
  const page = await browser.newPage()
  const b64 = await page.evaluate(({ W, H }) => {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const x = c.getContext('2d')
    x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, W, H)
    x.fillStyle = '#111'; x.font = 'bold 30px sans-serif'; x.fillText('NUTRITION', 40, 50)
    x.font = '22px sans-serif'
    const rows = [['', 'Per 100g', 'Per 30g'], ['Energy', '1640kJ', '492kJ'], ['', '390kcal', '117kcal'], ['Fat', '7.1g', '2.1g'], ['of which saturates', '1.2g', '0.4g'],
      ['Carbohydrate', '66.0g', '19.8g'], ['of which sugars', '21.0g', '6.3g'], ['Fibre', '7.5g', '2.3g'], ['Protein', '9.0g', '2.7g'], ['Salt', '0.05g', '0.02g']]
    rows.forEach((r, i) => {
      const y = 95 + i * 38
      x.fillText(r[0], 40, y); x.fillText(r[1], 330, y); x.fillText(r[2], 480, y)
      x.fillRect(40, y + 10, W - 80, 2)
    })
    const d = x.getImageData(0, 0, W, H).data
    let s = ''
    for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000))
    return btoa(s)
  }, { W, H })
  await page.close()
  return Buffer.from(b64, 'base64')
}

function writeY4m(rgba, file) {
  const y = Buffer.alloc(W * H), u = Buffer.alloc((W / 2) * (H / 2)), v = Buffer.alloc((W / 2) * (H / 2))
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * 4, r = rgba[k], g = rgba[k + 1], b = rgba[k + 2]
    y[j * W + i] = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)))
    if (j % 2 === 0 && i % 2 === 0) {
      const q = (j / 2) * (W / 2) + i / 2
      u[q] = Math.max(0, Math.min(255, Math.round(-0.169 * r - 0.331 * g + 0.5 * b + 128)))
      v[q] = Math.max(0, Math.min(255, Math.round(0.5 * r - 0.419 * g - 0.081 * b + 128)))
    }
  }
  const frame = Buffer.concat([Buffer.from('FRAME\n'), y, u, v])
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), frame, frame]))
}

const ROWS = ['kj', 'kcal', 'fat', 'saturates', 'carbohydrate', 'sugars', 'fibre', 'protein', 'salt', 'alcohol']
const GRANOLA = {
  kj: ['1640kJ', '492kJ'], kcal: ['390kcal', '117kcal'], fat: ['7.1g', '2.1g'], saturates: ['1.2g', '0.4g'], carbohydrate: ['66.0g', '19.8g'],
  sugars: ['21.0g', '6.3g'], fibre: ['7.5g', '2.3g'], protein: ['9.0g', '2.7g'], salt: ['0.05g', '0.02g'],
}
const cell = (t) => ({ text: t || '', confidence: 'high' })
const READ = {
  readable: true, basis: '100g', serving_text: '30g', ri_basis: 'none',
  rows: Object.fromEntries(ROWS.map((k) => [k, { per100: cell(GRANOLA[k]?.[0]), serving: cell(GRANOLA[k]?.[1]), ri: cell('') }])),
  front: { brand: 'Tali Test', product: 'Crunchy Granola', variety: 'Honey', pack_size: '500g' },
}
/** What ai-read-label signs for this read (the app checks its shape; the server checks the HMAC). */
const SHARE = {
  barcode: '0' + CODE, iat: Math.floor(Date.now() / 1000), sig: 'A'.repeat(43),
  values: { name: 'Tali Test Crunchy Granola Honey', k: 390, p: 9, c: 66, f: 7.1, fibre: 7.5, sugars: 21, sat: 1.2, salt: 0.05, ml: false, serving_g: 30 },
}
/** The board's flapjack, as lookup_product returns it. */
const FLAPJACK = (reads, audited) => ({
  version: 1, name: 'Oat & raisin flapjack', k: 442, p: 5.5, c: 58, f: 20, fibre: 4, sugars: 30, sat: 9, salt: 0.3, ml: false, serving_g: 65,
  status: audited ? 'verified' : 'unverified', is_current: true, label_reads: reads, audited_on: audited ? '2026-10-01' : null,
})

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`
}

async function scenario(browser, name, scheme, fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'], colorScheme: scheme })
  const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const session = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user }
  const records = [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' },
    { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000ab', type: 'label-photo', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }, ...(opts.consents || [])]
  const u = new Date().toISOString()
  const device = { days: {}, consents: { records },
    _meta: { settings: { u, dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: null, owner: UID },
    profile: { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 70, activityLevel: 'light', supplements: [], notificationsEnabled: false, onboardedAt: '2026-09-20T08:00:00.000Z', activityMult: 1.3 } }
  await ctx.addInitScript(([s, st]) => {
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    if (!localStorage.getItem('leanplan.v1')) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(session), JSON.stringify(device)])
  const calls = { lookup: [], report: [], submit: [], read: [], urls: [] }
  const state = { lookup: [], submit: { status: 200, body: { ok: true } } }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), url = req.url(), method = req.method()
    calls.urls.push(method + ' ' + url)
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (url.includes('/functions/v1/')) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      const body = JSON.parse(req.postData() || '{}')
      if (url.includes('ai-read-label')) {
        calls.read.push({ barcode: body.barcode })
        return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true, read: READ, ...(body.barcode ? { share: SHARE } : {}) }) })
      }
      if (url.includes('submit-product')) {
        calls.submit.push(body)
        return route.fulfill({ status: state.submit.status, contentType: 'application/json', headers: cors, body: JSON.stringify(state.submit.body) })
      }
    }
    if (url.includes('/rest/v1/rpc/lookup_product')) { calls.lookup.push({ method, url, body: req.postData() }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.lookup) }) }
    if (url.includes('/rest/v1/rpc/report_product')) { calls.report.push({ method, url, body: req.postData() }); return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' }) }
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
    if (url.includes('/rest/v1/')) return route.fulfill({ status: method === 'GET' ? 200 : 201, contentType: 'application/json', body: method === 'GET' ? '[]' : '' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  // Open Food Facts doesn't have it
  await ctx.route(/openfoodfacts\.org/, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"status":0}' }))
  const page = await ctx.newPage()
  if (opts.clock) await page.clock.install()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  try {
    await page.goto(BASE)
    await fn({ page, ctx, calls, state, scheme })
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '))
    console.log('PASS', name, `(${scheme})`)
    return true
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, 'FAIL-' + scheme + '-' + name.replace(/\W+/g, '-') + '.png'), fullPage: true }).catch(() => {})
    console.log('FAIL', name, `(${scheme})`, '\n  ', e.message.split('\n')[0], '\n   screenshot in', OUT)
    return false
  } finally {
    await ctx.close()
  }
}

const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
const shot = (page, scheme, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`), fullPage: full })
/** The sheet's own scroller, for a full-length view of a tall sheet. */
async function sheetShot(page, scheme, name) {
  await page.evaluate(() => { const bd = [...document.querySelectorAll('.sheet-bd')].at(-1); if (bd) bd.scrollTop = 0 })
  await shot(page, scheme, name)
  const tall = await page.evaluate(() => { const bd = [...document.querySelectorAll('.sheet-bd')].at(-1); return bd ? bd.scrollHeight > bd.clientHeight : false })
  if (tall) {
    await page.evaluate(() => { const bd = [...document.querySelectorAll('.sheet-bd')].at(-1); bd.scrollTop = bd.scrollHeight })
    await shot(page, scheme, name + '-end')
    await page.evaluate(() => { const bd = [...document.querySelectorAll('.sheet-bd')].at(-1); bd.scrollTop = 0 })
  }
}

/** Add food → Scan barcode → type the number → Look up. */
async function scanCode(page) {
  await page.getByRole('button', { name: 'Add food' }).first().click()
  await page.getByRole('button', { name: 'Scan barcode' }).first().click()
  await page.locator('#bc_num').fill(CODE)
  await page.getByRole('button', { name: 'Look up' }).click()
}

/** From "not found": Photo of the label → capture → Read the label → Check the label. */
async function readLabelForCode(page) {
  await page.getByRole('button', { name: /Photo of the label/ }).first().click()
  await page.getByText('Find good light. Lay the pack flat. Fill the frame with the nutrition table. Avoid glare and creases.').waitFor()
  await page.locator('[data-quality="ok"]').waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await page.getByText('Nutrition table', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Read the label' }).click()
  await page.getByText('Your pack label (read from your photo).').waitFor()
}

const outbox = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tali.productOutbox') || 'null'))
const consentsOf = (page, type) => page.evaluate((t) => JSON.parse(localStorage.getItem('leanplan.v1')).consents.records.filter((r) => r.type === t), type)

;(async () => {
  const y4m = path.join(OUT, 'label.y4m')
  const plain = await chromium.launch()
  writeY4m(await labelFrame(plain), y4m)
  await plain.close()
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`] })
  const results = []

  for (const scheme of ['light', 'dark']) {
    results.push(await scenario(browser, 'opt-in at the first save → Yes → queued, sent after the delay', scheme, async ({ page, calls }) => {
      await scanCode(page)
      await page.getByText(/Not found\. Enter it from the label/).waitFor()
      expect(calls.lookup.length === 1 && calls.lookup[0].method === 'POST' && !calls.lookup[0].url.includes(CODE) && JSON.parse(calls.lookup[0].body).p_barcode === '0' + CODE, 'lookup is a POST with the barcode in the body: ' + JSON.stringify(calls.lookup))
      await readLabelForCode(page)
      expect(calls.read[0]?.barcode === CODE, 'the barcode went with the photo, to be signed')
      await page.getByRole('button', { name: 'Save food' }).click()
      await page.getByText('Add new products you scan to Tali’s shared list?').waitFor()
      await page.getByText('We save the barcode, name and figures, never who added them. Because of that, we can’t remove one you added later. Turn this off any time in Profile, Privacy.').waitFor()
      await page.waitForTimeout(400)
      await shot(page, scheme, 'sp-1-optin')
      expect(!(await outbox(page)), 'nothing queued before the answer')
      await page.getByRole('button', { name: 'Yes, share new products' }).click()
      // saved either way: the portion view opens for the new food
      await page.getByText('Tali Test Crunchy Granola Honey').first().waitFor()
      const ob = await outbox(page)
      expect(ob && ob.owner === UID && ob.items.length === 1 && ob.items[0].barcode === '0' + CODE, 'queued with the owner on the device: ' + JSON.stringify(ob))
      const c = await consentsOf(page, 'shared-products')
      expect(c.length === 1 && c[0].granted === true && c[0].version === '2026-10-v1', 'a yes recorded: ' + JSON.stringify(c))
      // not sent on the save path
      await page.clock.runFor(15_000)
      expect(calls.submit.length === 0, 'nothing sent within 15 s of the save')
      await page.clock.runFor(80_000)
      await page.waitForFunction(() => !localStorage.getItem('tali.productOutbox'), null, { timeout: 5000 })
      expect(calls.submit.length === 1 && Object.keys(calls.submit[0]).sort().join() === 'barcode,iat,sig,values', 'sent once, the signed read only (no user id): ' + JSON.stringify(calls.submit))
      // asked once: Profile › Privacy shows it on (sp-5)
      await page.keyboard.press('Escape').catch(() => {})
      await page.getByRole('button', { name: 'Profile' }).last().click()
      await page.getByRole('button', { name: /^Privacy/ }).click()
      const toggle = page.getByRole('switch', { name: 'Share new products I scan' })
      await toggle.waitFor()
      expect((await toggle.getAttribute('aria-checked')) === 'true', 'the Privacy toggle is on after a yes')
      await page.getByText('Barcode, name and figures only, never who added them.').scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, 260))
      await page.waitForTimeout(300)
      await shot(page, scheme, 'sp-5-profile')
      await toggle.click()
      const c2 = await consentsOf(page, 'shared-products')
      expect(c2.length === 2 && c2.at(-1).granted === false, 'turning it off records a no')
    }, { clock: true }))

    results.push(await scenario(browser, 'Not now → saved, nothing queued, never asked again', scheme, async ({ page, calls }) => {
      await scanCode(page)
      await page.getByText(/Not found\. Enter it from the label/).waitFor()
      await readLabelForCode(page)
      await page.getByRole('button', { name: 'Save food' }).click()
      await page.getByRole('button', { name: 'Not now' }).click()
      await page.getByText('Tali Test Crunchy Granola Honey').first().waitFor()
      expect(!(await outbox(page)), 'nothing queued after Not now')
      const c = await consentsOf(page, 'shared-products')
      expect(c.length === 1 && c[0].granted === false, 'a no recorded (asked once): ' + JSON.stringify(c))
      await page.clock.runFor(100_000)
      expect(calls.submit.length === 0, 'nothing sent')
    }, { clock: true }))

    results.push(await scenario(browser, 'found, not yet checked (sp-2) → report (sp-6)', scheme, async ({ page, calls, state }) => {
      state.lookup = [FLAPJACK(1)]
      await scanCode(page)
      await page.getByText('Added by a Tali user, not yet checked. Check against your pack.').waitFor()
      await page.locator('#sc_g').fill('65')
      await page.getByText('± 20% while a shared product is unchecked, against ± 15% for a food you add yourself.').waitFor()
      const serv = (await page.locator('.sp-serv').textContent()) || ''
      expect(serv.includes('287 kcal') && serv.includes('± 57'), 'One serving 287 kcal ± 57: ' + serv)
      await page.waitForTimeout(300)
      await sheetShot(page, scheme, 'sp-2-found-unchecked')
      await page.getByRole('button', { name: 'Report this product' }).click()
      await page.getByText('What’s wrong?').waitFor()
      const send = page.getByRole('button', { name: 'Send', exact: true })
      expect(await send.isDisabled(), 'Send is off until a reason is picked')
      await page.getByText('Offensive or personal details in the name').click()
      expect(!(await send.isDisabled()), 'Send on once picked')
      await page.waitForTimeout(300)
      await shot(page, scheme, 'sp-6-report')
      await send.click()
      await page.getByText('Report sent. Thank you.').waitFor()
      const r = calls.report[0]
      expect(r && r.method === 'POST' && !r.url.includes(CODE) && r.body === JSON.stringify({ p_barcode: '0' + CODE, p_version: 1, p_reason: 'name' }), 'report: anonymous POST: ' + JSON.stringify(r))
      // saved unchanged: the food keeps the list's source and the unchecked margin
      await page.getByRole('button', { name: 'Save food' }).click()
      await page.getByText('Oat & raisin flapjack').first().waitFor()
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1')).customFoods.find((f) => f.n === 'Oat & raisin flapjack'))
      expect(saved && saved.src === 'shared-unchecked:' + CODE && saved.k === 442 && saved.barcode === CODE, 'saved with the shared source: ' + JSON.stringify(saved))
      expect(calls.submit.length === 0 && !(await outbox(page)), 'a found product saved is never re-submitted')
    }))

    results.push(await scenario(browser, 'read from the pack 3 times (sp-3) and checked by Tali (sp-3b)', scheme, async ({ page, state }) => {
      state.lookup = [FLAPJACK(3)]
      await scanCode(page)
      await page.getByText('Read from the pack 3 times', { exact: true }).waitFor()
      await page.locator('#sc_g').fill('65')
      await page.getByText('± 15% once it’s been read from the pack 3 times, the same as a food you add yourself.').waitFor()
      expect(((await page.locator('.sp-serv').textContent()) || '').includes('± 43'), '± 43')
      await page.waitForTimeout(300)
      await sheetShot(page, scheme, 'sp-3-found-counted')
      await page.getByRole('button', { name: 'Back' }).first().click()
      state.lookup = [FLAPJACK(7, true)]
      await page.locator('#bc_num').fill(CODE)
      await page.getByRole('button', { name: 'Look up' }).click()
      await page.getByText('Checked by Tali, Oct 2026').waitFor()
      await page.getByText('Only Tali’s own checks set this.').waitFor()
      await page.locator('#sc_g').fill('65')
      await page.getByText('± 12%, the same as a built-in food.').waitFor()
      expect(((await page.locator('.sp-serv').textContent()) || '').includes('± 34'), '± 34')
      await page.waitForTimeout(300)
      await sheetShot(page, scheme, 'sp-3b-verified')
    }))
  }

  results.push(await scenario(browser, 'offline: the queue waits, and goes once the connection is back', 'light', async ({ page, ctx, calls }) => {
    await scanCode(page)
    await page.getByText(/Not found\. Enter it from the label/).waitFor()
    await readLabelForCode(page)
    await ctx.setOffline(true)
    await page.getByRole('button', { name: 'Save food' }).click()
    await page.getByRole('button', { name: 'Yes, share new products' }).click()
    await page.getByText('Tali Test Crunchy Granola Honey').first().waitFor()
    expect((await outbox(page))?.items.length === 1, 'queued offline')
    await page.clock.runFor(120_000)
    expect(calls.submit.length === 0 && (await outbox(page))?.items.length === 1, 'nothing sent offline; still queued')
    await ctx.setOffline(false)
    await page.clock.runFor(10_000)
    expect(calls.submit.length === 0, 'not sent with the reconnect itself')
    await page.clock.runFor(90_000)
    await page.waitForFunction(() => !localStorage.getItem('tali.productOutbox'), null, { timeout: 5000 })
    expect(calls.submit.length === 1, 'sent after the reconnect, after the delay')
  }, { clock: true, consents: [] }))

  results.push(await scenario(browser, 'a server that keeps it (busy) leaves it queued; another account drops it', 'light', async ({ page, state, calls }) => {
    state.submit = { status: 503, body: { ok: false, error: 'retry' } }
    await scanCode(page)
    await page.getByText(/Not found\. Enter it from the label/).waitFor()
    await readLabelForCode(page)
    await page.getByRole('button', { name: 'Save food' }).click()
    await page.getByRole('button', { name: 'Yes, share new products' }).click()
    await page.getByText('Tali Test Crunchy Granola Honey').first().waitFor()
    await page.clock.runFor(95_000)
    await page.waitForTimeout(500)
    expect(calls.submit.length >= 1 && (await outbox(page))?.items.length === 1, 'kept after a 503')
    // the queue belongs to another account: dropped at the next sign-in, never sent
    await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('tali.productOutbox')); o.owner = '99999999-9999-4999-8999-999999999999'; localStorage.setItem('tali.productOutbox', JSON.stringify(o)) })
    await page.reload()
    await page.getByRole('button', { name: 'Add food' }).first().waitFor()
    await page.waitForFunction(() => !localStorage.getItem('tali.productOutbox'), null, { timeout: 5000 })
  }, { clock: true }))

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
