/**
 * Headless end-to-end check of label photo scanning (phase 1), in Chromium with a fake camera.
 *
 * Label scanning is behind LABEL_SCAN_ENABLED (off), so test a build with it turned on, and
 * (optionally) check the normal build hides it:
 *
 *   VITE_LABEL_SCAN=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 &
 *   npm run build && npx vite preview --port 4174 &
 *   E2E_URL_OFF=http://localhost:4174/ NODE_PATH=$(npm root -g) node scripts/e2e-label-scan.cjs
 *
 * Needs Playwright (global install is fine; browsers in PLAYWRIGHT_BROWSERS_PATH, e.g.
 * /opt/pw-browsers). Every Supabase request is intercepted: the session is a fake one, and the
 * ai-read-label Edge Function is mocked per scenario. The real model API is never called.
 *
 * Scenarios: capture from a fake camera frame of a nutrition table → a good read → confirm;
 * a 1/7 misread → the suggestion is accepted; a function error → typing fallback; offline →
 * typing fallback; the function missing (a 404 preflight) → "isn't available", typing fallback;
 * with the flag off, no entry point shows.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const BASE = process.env.E2E_URL || 'http://localhost:4173/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-e2e-'))
const W = 640, H = 480

/** A nutrition table drawn on a canvas, returned as RGBA. */
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

/** RGBA → a Y4M (YUV 4:2:0) clip Chromium can use as the camera. */
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
function readOf(cells) {
  const cell = (t) => ({ text: t || '', confidence: 'high' })
  return {
    readable: true, basis: '100g', serving_text: '30g', ri_basis: 'none',
    rows: Object.fromEntries(ROWS.map((k) => [k, { per100: cell(cells[k]?.[0]), serving: cell(cells[k]?.[1]), ri: cell('') }])),
    front: { brand: 'Tali Test', product: 'Crunchy Granola', variety: 'Honey', pack_size: '500g' },
  }
}
const GRANOLA = {
  kj: ['1640kJ', '492kJ'], kcal: ['390kcal', '117kcal'], fat: ['7.1g', '2.1g'], saturates: ['1.2g', '0.4g'], carbohydrate: ['66.0g', '19.8g'],
  sugars: ['21.0g', '6.3g'], fibre: ['7.5g', '2.3g'], protein: ['9.0g', '2.7g'], salt: ['0.05g', '0.02g'],
}

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`
}

async function scenario(browser, name, fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] })
  const uid = '11111111-2222-4333-8444-555555555555'
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const session = { access_token: fakeJwt(uid), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user }
  // health consent already given on the consent screen (screens/legal/ConsentScreen.tsx), so the
  // app opens past it; only seeded once, so a reload keeps what the app saved
  const u = new Date().toISOString()
  const device = { days: {}, consents: { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] },
    _meta: { settings: { u, dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: null, owner: uid } }
  await ctx.addInitScript(([s, st]) => {
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    if (!localStorage.getItem('leanplan.v1')) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(session), JSON.stringify(device)])
  const calls = { fn: 0, bodies: [] }
  let reply = { status: 200, body: { ok: true, read: readOf(GRANOLA) } }
  let missing = false
  await ctx.route(/supabase\.co\//, async (route) => {
    const url = route.request().url()
    if (url.includes('/functions/v1/ai-read-label')) {
      // an undeployed function: Supabase answers the preflight 404 with no CORS headers
      // (Playwright answers CORS preflights itself when routing, so the failed preflight a
      // browser sees is played as a network failure; the 404 is what the gateway sends)
      if (missing === 'preflight') return route.abort('failed')
      if (missing) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'NOT_FOUND', message: 'Requested function was not found' }) })
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
      calls.fn++
      const body = JSON.parse(route.request().postData() || '{}')
      calls.bodies.push({ panel: (body.panel || '').length, front: (body.front || '').length, jpeg: String(body.panel || '').startsWith('/9j/'), auth: route.request().headers().authorization || '' })
      return route.fulfill({ status: reply.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(reply.body) })
    }
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
    if (url.includes('/rest/v1/')) return route.fulfill({ status: route.request().method() === 'GET' ? 200 : 201, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  // never reach the network for anything else either
  await ctx.route(/openfoodfacts\.org/, (r) => r.abort())
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const set = (r) => { reply = r }
  const setMissing = (how = '404') => { missing = how }
  try {
    await page.goto(opts.url || BASE)
    await fn({ page, ctx, calls, set, setMissing })
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '))
    console.log('PASS', name)
    return true
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, name.replace(/\W+/g, '-') + '.png'), fullPage: true }).catch(() => {})
    console.log('FAIL', name, '\n  ', e.message.split('\n')[0], '\n   screenshot in', OUT)
    return false
  } finally {
    await ctx.close()
  }
}

/** Add food → Scan the label → consent (first time) → capture from the camera → review. */
async function captureLabel(page, { consent = true } = {}) {
  await page.getByRole('button', { name: 'Add food' }).first().click()
  await page.getByRole('button', { name: /Scan the label/ }).click()
  if (consent) {
    await page.getByText('Tali doesn’t keep your photo. It’s sent to Anthropic’s AI service to read the numbers, under their data policy. You can check the numbers before anything is saved.').waitFor()
    await page.getByRole('button', { name: 'OK, take a photo' }).click()
  }
  await page.getByText('Find good light. Lay the pack flat. Fill the frame with the nutrition table. Avoid glare and creases.').waitFor()
  // the live quality check passes on a sharp, well-lit table
  await page.locator('[data-quality="ok"]').waitFor({ timeout: 10000 })
  const capture = page.getByRole('button', { name: 'Capture', exact: true })
  if (await capture.isDisabled()) throw new Error('Capture stayed disabled on a good frame')
  await capture.click()
  await page.getByText('Nutrition table', { exact: true }).waitFor()
  await shot(page, 'review')
  // the camera is off once the photo is taken
  const tracks = await page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => v.srcObject).length)
  if (tracks) throw new Error('camera still attached after capture')
}

/** E2E_SHOTS=1 saves a screenshot at each key screen, for a visual check. */
const shot = (page, name) => (process.env.E2E_SHOTS ? page.screenshot({ path: path.join(OUT, name + '.png') }) : Promise.resolve())
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }

;(async () => {
  const y4m = path.join(OUT, 'label.y4m')
  const plain = await chromium.launch()
  writeY4m(await labelFrame(plain), y4m)
  await plain.close()
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`],
  })
  const results = []

  results.push(await scenario(browser, 'good read → confirm → save', async ({ page, calls }) => {
    await captureLabel(page)
    await page.getByRole('button', { name: 'Read the label' }).click()
    await page.getByText('Your pack label (read from your photo).').waitFor()
    expect(calls.fn === 1, 'function called once')
    const b = calls.bodies[0]
    expect(b.jpeg && b.panel > 1000 && b.panel <= 2_100_000, 'panel sent as a downscaled JPEG, got ' + JSON.stringify(b))
    expect(/^Bearer .+\..+\..+$/.test(b.auth), 'sent with the session token')
    expect((await page.locator('#sc_f').inputValue()) === '7.1', 'fat per 100 g')
    expect((await page.locator('#sc_k').inputValue()) === '390', 'kcal per 100 g')
    expect((await page.locator('#sc_n').inputValue()) === 'Tali Test Crunchy Granola Honey', 'name from the front photo')
    expect((await page.locator('#sc_g').inputValue()) === '30', 'serving from the label')
    expect((await page.locator('.nserv[data-f="f"]').textContent()) === '2.1', 'per-serving from the label’s own column')
    expect((await page.locator('.nserv[data-f="f"]').getAttribute('data-read')) === 'true', 'per-serving marked as read')
    await page.getByText('These numbers are consistent with each other.').waitFor()
    await shot(page, 'confirm')
    await page.getByRole('button', { name: 'Save food' }).click()
    // saved: the portion view opens for the new food
    await page.getByText('Tali Test Crunchy Granola Honey').first().waitFor()
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1')).customFoods.find((f) => f.n === 'Tali Test Crunchy Granola Honey'))
    expect(saved && saved.src === 'label' && saved.f === 7.1 && saved.g === 30 && !saved.barcode, 'saved as src label: ' + JSON.stringify(saved))
  }))

  results.push(await scenario(browser, 'misread 1/7 → suggestion accepted', async ({ page, set }) => {
    set({ status: 200, body: { ok: true, read: readOf({ ...GRANOLA, fat: ['1.1g', '2.1g'] }) } })
    await captureLabel(page)
    await page.getByRole('button', { name: 'Read the label' }).click()
    const note = page.locator('[data-suggest="f"]')
    await note.waitFor()
    await note.scrollIntoViewIfNeeded()
    await shot(page, 'suggestion')
    const txt = (await note.textContent()) || ''
    expect(txt.includes('Did you mean 7.1 g?') && txt.includes('The per-serving column says 2.1 g for 30 g, which is about 7 g per 100 g.'), 'suggestion copy: ' + txt)
    await page.getByRole('button', { name: 'Use 7.1 g' }).click()
    expect((await page.locator('#sc_f').inputValue()) === '7.1', 'fat set to 7.1')
    expect((await page.locator('[data-suggest]').count()) === 0, 'suggestion gone')
    await page.getByText('These numbers are consistent with each other.').waitFor()
  }))

  results.push(await scenario(browser, 'function error → typing fallback', async ({ page, set, calls }) => {
    set({ status: 500, body: { ok: false, error: 'upstream' } })
    await captureLabel(page)
    await page.getByRole('button', { name: 'Read the label' }).click()
    await page.getByText('Couldn’t read the photo right now. Type the numbers from the pack below.').waitFor()
    expect(calls.fn === 1, 'function called')
    expect((await page.locator('#sc_k').inputValue()) === '' && (await page.locator('#sc_n').inputValue()) === '', 'empty fields to type into')
    await page.getByText('Brand, product and flavour, e.g. Walkers Sensations Roasted Chicken & Thyme').waitFor()
    // typing it in still saves
    await page.locator('#sc_n').fill('Typed Granola')
    await page.locator('#sc_g').fill('30')
    for (const [id, v] of [['k', '390'], ['p', '9'], ['c', '66'], ['f', '7.1']]) await page.locator('#sc_' + id).fill(v)
    await page.getByRole('button', { name: 'Save food' }).click()
    await page.getByText('Typed Granola').first().waitFor()
  }))

  results.push(await scenario(browser, 'offline → typing fallback, no request', async ({ page, ctx, calls }) => {
    await captureLabel(page)
    await ctx.setOffline(true)
    await page.getByRole('button', { name: 'Read the label' }).click()
    await page.getByText(/Couldn’t read the photo without a connection/).waitFor()
    expect(calls.fn === 0, 'no request offline')
    expect((await page.locator('#sc_k').inputValue()) === '', 'empty fields')
    await ctx.setOffline(false)
  }))

  results.push(await scenario(browser, 'function missing (gateway 404) → unavailable, typing fallback', async ({ page, setMissing, calls }) => {
    setMissing()
    await captureLabel(page)
    await page.getByRole('button', { name: 'Read the label' }).click()
    await page.getByText('Photo reading isn’t available right now. Type it in instead.').waitFor()
    expect(calls.fn === 0, 'the POST never ran')
    expect((await page.locator('#sc_k').inputValue()) === '', 'empty fields to type into')
  }))

  results.push(await scenario(browser, 'function missing (failed CORS preflight, online) → unavailable', async ({ page, setMissing }) => {
    setMissing('preflight')
    await captureLabel(page)
    await page.getByRole('button', { name: 'Read the label' }).click()
    await page.getByText('Photo reading isn’t available right now. Type it in instead.').waitFor()
  }))

  results.push(await scenario(browser, 'saved food keeps the pack’s per-serving line', async ({ page }) => {
    await captureLabel(page)
    await page.getByRole('button', { name: 'Read the label' }).click()
    await page.getByRole('button', { name: 'Save food' }).click()
    await page.getByText('Tali Test Crunchy Granola Honey').first().waitFor()
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1')).customFoods.find((f) => f.n === 'Tali Test Crunchy Granola Honey'))
    expect(saved.ref && saved.ref.g === 30 && saved.ref.k === 117 && saved.ref.f === 2.1, 'ref saved: ' + JSON.stringify(saved.ref))
  }))

  if (process.env.E2E_URL_OFF) {
    results.push(await scenario(browser, 'flag off: no label entry points', async ({ page }) => {
      await page.getByRole('button', { name: 'Add food' }).first().click()
      await page.getByRole('button', { name: /Create a food/ }).waitFor()
      expect((await page.getByRole('button', { name: /Scan the label/ }).count()) === 0, 'Scan the label hidden')
      expect((await page.getByText('Photo of the label').count()) === 0, 'Photo of the label hidden')
    }, { url: process.env.E2E_URL_OFF }))
  }

  results.push(await scenario(browser, 'consent is remembered on the device', async ({ page }) => {
    await captureLabel(page)
    await page.getByRole('button', { name: 'Close' }).first().click().catch(() => page.keyboard.press('Escape'))
    await page.reload()
    await captureLabel(page, { consent: false })
  }))

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed')
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
