/**
 * Headless end-to-end check of the foundations UI (Design canvas row "Onboarding 6"): the
 * connection pill, consent (first run, the existing-user sheet, withdrawal with a download
 * first) and account deletion.
 *
 * The first-run consent screens and the existing-user sheet are behind ONBOARDING_ENABLED (off),
 * so they're tested on a build with it on (label scanning on too, for the offline note on it);
 * everything that ships now is tested on the normal build:
 *
 *   VITE_ONBOARDING=1 VITE_LABEL_SCAN=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4175 &
 *   npm run build && npx vite preview --port 4176 &
 *   E2E_URL=http://localhost:4176/ E2E_URL_ON=http://localhost:4175/ NODE_PATH=$(npm root -g) node scripts/e2e-foundations.cjs
 *
 * Needs Playwright (global install is fine; browsers in PLAYWRIGHT_BROWSERS_PATH, e.g.
 * /opt/pw-browsers). Every Supabase request is intercepted by an in-memory PostgREST stand-in
 * (upserts merge columns like the real one); the real project is never reached. Screenshots of
 * each key screen go to E2E_OUT.
 */
const { chromium } = (() => { try { return require('playwright') } catch { return require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright') } })()
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const BASE = process.env.E2E_URL || 'http://localhost:4176/'
const ON = process.env.E2E_URL_ON || 'http://localhost:4175/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-e2e-'))
const UID = '11111111-2222-4333-8444-555555555555'
const KEY = 'sb-exvblofwiwbvycomxvmj-auth-token'
const today = new Date().toISOString().slice(0, 10)

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400, iat: now, amr: [{ method: 'password', timestamp: now - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const sessionOf = (authAgoS) => ({ access_token: fakeJwt(UID, authAgoS), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user: USER })

/** A device state as the app saves it: `days`, synced once (lastPull), owned by UID. */
function deviceState({ days = {}, dirty = [], consents, pulled = true } = {}) {
  const u = new Date().toISOString()
  return {
    days,
    ...(consents ? { consents } : {}),
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: dirty.includes(d) }])), foodDeletes: [], recipeDeletes: [], lastPull: pulled ? u : null, owner: UID },
  }
}
const aDay = (weight, checkin) => ({ foods: [{ n: 'Toast', k: 100, p: 4, c: 18, f: 1, grams: 40 }], supps: {}, weight, workout: null, ...(checkin ? { checkin } : {}) })

async function scenario(browser, name, fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
  const session = sessionOf(opts.authAgoS ?? 10)
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return // only on the first load: a reload keeps what the app saved
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    if (st) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(session), opts.state ? JSON.stringify(opts.state) : null])
  // the server: rows per table; `mode` changes how writes answer
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [], ...(opts.rows || {}) }
  const net = { mode: 'ok', posts: [], fnCalls: [], release: null, tokenCalls: 0 }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/functions/v1/delete-account')) {
      net.fnCalls.push({ body: JSON.parse(req.postData() || '{}'), auth: req.headers().authorization || '' })
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true }) })
    }
    if (url.includes('/auth/v1/token')) {
      net.tokenCalls++
      const body = JSON.parse(req.postData() || '{}')
      if (body.password !== 'right-password') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionOf(1)) })
    }
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) })
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    const t = m[1]
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows[t] || []) })
    // a write
    const list = JSON.parse(req.postData() || '[]')
    net.posts.push({ t, list })
    if (net.mode === 'hang') await new Promise((r) => { net.release = r })
    if (net.mode === 'fail') return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    for (const row of list) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...row }; else rows[t].push(row)
    }
    return route.fulfill({ status: 201, body: '' })
  })
  await ctx.route(/openfoodfacts\.org/, (r) => r.abort())
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  try {
    if (opts.before) opts.before(net)
    await page.goto(opts.url || BASE)
    await fn({ page, ctx, net, rows })
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '))
    console.log('PASS', name)
    return true
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, 'FAIL-' + name.replace(/\W+/g, '-') + '.png'), fullPage: true }).catch(() => {})
    console.log('FAIL', name, '\n  ', e.message.split('\n')[0], '\n   screenshot in', OUT)
    return false
  } finally {
    if (net.release) net.release()
    await ctx.close()
  }
}

const shot = async (page, name) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, name + '.png') }) } // after a sheet's slide-up
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
const pill = (page) => page.locator('.hdr .cpill')
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const latest = (st, type) => (st?.consents?.records || []).filter((r) => r.type === type).sort((a, b) => a.at.localeCompare(b.at)).pop()
const tab = (page, name) => page.locator('nav.tabbar').getByRole('button', { name }).click()

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const run = async (...a) => results.push(await scenario(browser, ...a))

  /* ---------------- the connection pill ---------------- */

  await run('pill: up to date, and the line under it', async ({ page }) => {
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    expect((await pill(page).textContent()) === 'Up to date', 'label')
    await pill(page).click()
    await page.getByText('Everything is saved to your account.').waitFor()
    await shot(page, 'pill-up-to-date')
    await tab(page, 'Plan')
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor() // every tab
  })

  await run('pill: saved on this phone, will sync (n)', async ({ page }) => {
    await page.locator('.hdr .cpill[data-conn="pending"]').waitFor()
    const txt = await pill(page).textContent()
    expect(txt === 'Saved on this phone, will sync (1)', 'label: ' + txt)
    await pill(page).click()
    await page.getByText('1 change is safe on this phone and uploads when you’re back online.').waitFor()
    await shot(page, 'pill-pending')
  }, { state: deviceState({ days: { [today]: aDay(null) }, dirty: [today] }), before: (net) => { net.mode = 'hang' } })

  await run('pill: offline, and online-only features say so', async ({ page, ctx }) => {
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    await ctx.setOffline(true)
    await page.locator('.hdr .cpill[data-conn="offline"]').waitFor()
    await pill(page).click()
    await page.getByText('Logging, search, plans and workouts all still work.').waitFor()
    await shot(page, 'pill-offline')
    await tab(page, 'Food')
    await page.getByRole('button', { name: 'Add food' }).first().click()
    await page.locator('.sheet .cpill[data-conn="offline"]').waitFor()
    await page.getByText('Works for products you’ve scanned before').waitFor()
    await page.getByText('Needs a connection. Search works offline.').waitFor()
    expect((await page.locator('.li.needsnet').count()) === 1, 'label photo shown, off')
    // search still works offline
    await page.getByRole('textbox', { name: 'Search foods' }).fill('banana')
    await page.locator('.sheet .li').filter({ hasText: /banana/i }).first().waitFor()
    await page.getByRole('textbox', { name: 'Search foods' }).fill('')
    await shot(page, 'needs-connection')
    await ctx.setOffline(false)
    await page.locator('.sheet .cpill').waitFor({ state: 'detached' })
    expect((await page.locator('.li.needsnet').count()) === 0, 'label photo back on when online')
  }, { url: ON, state: deviceState({ consents: { records: [
    { id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' },
    { id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002', type: 'ai', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] } }) })

  await run('pill: sync problem, tap tries again', async ({ page, net }) => {
    await page.locator('.hdr .cpill[data-conn="problem"]').waitFor()
    const before = net.posts.length
    await pill(page).click()
    await page.getByText('Your data is safe on this phone. Tap to try again, or see what happened.').waitFor()
    await page.waitForTimeout(600)
    expect(net.posts.length > before, 'tapping retried the sync')
    expect(!(await page.locator('.hdr .cpill').evaluate((el) => getComputedStyle(el).color)).includes('179, 38, 30'), 'never red')
    await shot(page, 'pill-problem')
  }, { state: deviceState({ days: { [today]: aDay(null) }, dirty: [today] }), before: (net) => { net.mode = 'fail' } })

  await run('flag off: no first-run consent, no existing-user sheet, no Build my plan', async ({ page }) => {
    await page.locator('.hdr .cpill').waitFor()
    await page.waitForTimeout(500)
    expect((await page.getByText('Your health data').count()) === 0, 'no first-run screen')
    expect((await page.getByText('Is it OK to keep your health data?').count()) === 0, 'no existing-user sheet')
    await tab(page, 'Plan')
    await page.locator('.hdr .ltitle', { hasText: 'Plan' }).waitFor()
    expect((await page.locator('.buildplan').count()) === 0, 'no Build my plan card')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  /* ---------------- consent ---------------- */

  await run('first run: agree to health, not now to AI', async ({ page, rows }) => {
    await page.getByRole('heading', { name: 'Your health data' }).waitFor()
    const cont = page.getByRole('button', { name: 'Continue' })
    expect(await cont.isDisabled(), 'Continue waits for the tick')
    await shot(page, 'ob6-1-consent')
    await page.getByText('I agree to Tali keeping my health data to build my plan and targets.').click()
    await cont.click()
    await page.getByRole('heading', { name: 'AI features' }).waitFor()
    await page.getByText(/send what you share to Anthropic, the company that makes the AI Tali uses/).waitFor()
    await shot(page, 'ob6-2-ai')
    await page.getByRole('button', { name: 'Not now' }).click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(latest(st, 'health')?.granted === true && latest(st, 'ai')?.granted === false, 'recorded: ' + JSON.stringify(st.consents))
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    expect(rows.consents.length === 2, 'synced to consents: ' + rows.consents.length)
    await page.reload()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(400)
    expect((await page.getByRole('heading', { name: 'Your health data' }).count()) === 0, 'asked once')
  }, { url: ON, state: deviceState({}) })

  await run('first run: not now to health → app works, no weight or calorie numbers, agree later in Profile', async ({ page }) => {
    await page.getByRole('heading', { name: 'Your health data' }).waitFor()
    await page.getByRole('button', { name: 'Not now' }).click()
    await page.getByRole('button', { name: 'Turn on AI features' }).click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(latest(st, 'health')?.granted === false && latest(st, 'ai')?.granted === true, 'recorded')
    expect((await page.locator('.tile').filter({ hasText: 'Weight' }).count()) === 0, 'no weight tile')
    await tab(page, 'Food')
    await page.locator('.hdr .ltitle', { hasText: 'Food' }).waitFor()
    expect((await page.getByText('kcal eaten').count()) === 0, 'no calorie numbers')
    await tab(page, 'Summary')
    await page.locator('.mind-row').click() // check-in → agree in Profile
    await page.getByRole('dialog', { name: 'Health data' }).waitFor()
    await shot(page, 'profile-health-agree')
    await page.getByRole('button', { name: 'Yes, keep it' }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    expect(latest(await stored(page), 'health')?.granted === true, 'agreed later')
    await tab(page, 'Food')
    await page.getByText('kcal eaten').waitFor()
  }, { url: ON, state: deviceState({}) })

  await run('withdraw health consent in Profile: export offered first', async ({ page, rows }) => {
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).click()
    await page.getByRole('button', { name: 'Stop keeping my health data' }).click()
    await page.getByText('This removes your weigh-ins, check-ins and body details from all your devices. Download a copy first?').waitFor()
    await page.getByText('On this phone: 1 weigh-in, 1 check-in.').waitFor()
    await shot(page, 'withdraw-export')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download a copy' }).click()])
    const file = path.join(OUT, 'backup.json')
    await dl.saveAs(file)
    const b = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(b.days[today].weight === 70 && b.days[today].checkin?.mood === 3, 'the copy has the health data')
    await page.getByRole('button', { name: 'Remove my health data' }).click()
    const st = await stored(page)
    expect(st.days[today].weight === null && !st.days[today].checkin && st.days[today].foods.length === 1, 'cleared, food kept')
    expect(latest(st, 'health')?.granted === false, 'withdrawal recorded')
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    const r = rows.day_logs.find((x) => x.log_date === today)
    expect(r && r.weight === null && !r.supps._checkin, 'the server copy is cleared too')
    expect(rows.consents.some((x) => x.type === 'health' && x.granted === false), 'withdrawal synced')
  }, { state: deviceState({ days: { [today]: aDay(70, { mood: 3, hunger: 2, sleep: 2 }) }, consents: { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] } }) })

  await run('withdraw when never asked: offered, with the download first', async ({ page, rows }) => {
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).filter({ hasText: 'Not asked yet' }).click()
    await page.getByRole('button', { name: 'Stop keeping my health data' }).click()
    await page.getByRole('button', { name: 'Download a copy' }).waitFor()
    await page.getByRole('button', { name: 'Remove my health data' }).click()
    const st = await stored(page)
    expect(st.days[today].weight === null && latest(st, 'health')?.granted === false, 'cleared and recorded')
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    expect(rows.day_logs.find((x) => x.log_date === today)?.weight === null, 'server copy cleared')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  const EXISTING = { [today]: aDay(70, { mood: 3, hunger: 2, sleep: 2 }) }
  await run('existing user: the sheet shows once; Not now keeps health data on the phone and pauses its sync', async ({ page, rows, net }) => {
    await page.getByRole('dialog', { name: 'Is it OK to keep your health data?' }).waitFor()
    await page.getByText('New health data stays on this phone. What’s already in your account stays until you choose. We’ll ask once more in 2 weeks.').waitFor()
    await shot(page, 'ob6-3-existing')
    await page.getByRole('button', { name: 'Not now' }).click()
    await page.getByRole('dialog', { name: 'Is it OK to keep your health data?' }).waitFor({ state: 'detached' })
    const st = await stored(page)
    expect(st.consents.healthPause && !latest(st, 'health') && st.days[today].weight === 70, 'paused, nothing recorded or cleared')
    // new health data while paused: a check-in. It stays on the phone; the day syncs without it
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    await page.locator('.mind-row').click()
    await page.getByRole('button', { name: 'Great' }).first().click()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).days[new Date().toISOString().slice(0, 10)].checkin.mood === 5)
    await page.waitForFunction(() => document.querySelector('.hdr .cpill')?.getAttribute('data-conn') === 'up-to-date')
    await page.waitForTimeout(300)
    const dayPost = net.posts.filter((p) => p.t === 'day_logs').pop()
    expect(dayPost && !('weight' in dayPost.list[0]) && dayPost.list[0].supps._checkin?.mood === 3, 'no health data uploaded: ' + JSON.stringify(dayPost?.list[0]))
    const srv = rows.day_logs.find((x) => x.log_date === today)
    expect(srv.weight === 70 && srv.supps._checkin.mood === 3, 'the server keeps what it had')
    await page.reload()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(800)
    expect((await page.getByText('Is it OK to keep your health data?').count()) === 0, 'shown once')
    expect((await stored(page)).days[today].checkin.mood === 5, 'the phone keeps its own check-in after a pull')
    // held back: the pill stays "Up to date" and its line says so
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').click()
    await page.getByText('Health data is kept on this phone until you agree.').waitFor()
    await shot(page, 'pill-held')
    // agree later in Profile: what was held uploads
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).filter({ hasText: 'Paused' }).click()
    await page.getByText('Kept on this phone only until you agree. What’s already in your account stays until you choose.').waitFor()
    await page.getByRole('button', { name: 'Stop keeping my health data' }).waitFor() // withdrawal offered while paused too
    await shot(page, 'profile-health-paused')
    await page.getByRole('button', { name: 'Yes, keep it' }).click()
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1')).consents.healthPause)
    await page.waitForTimeout(1500)
    const after = rows.day_logs.find((x) => x.log_date === today)
    expect(after.supps._checkin.mood === 5 && after.weight === 70, 'held check-in uploaded after the yes: ' + JSON.stringify(after))
  }, { url: ON, state: deviceState({ days: EXISTING }), rows: { day_logs: [{ user_id: UID, log_date: today, foods: EXISTING[today].foods, supps: { _checkin: EXISTING[today].checkin }, weight: 70, workout: null }] } })

  const pausedAgo = (days, reasked) => deviceState({ days: EXISTING, consents: { records: [], healthPause: { at: new Date(Date.now() - days * 86400_000).toISOString(), ...(reasked ? { reasked: true } : {}) } } })
  await run('existing user: asked again once after 2 weeks, then never', async ({ page }) => {
    await page.getByRole('dialog', { name: 'Is it OK to keep your health data?' }).waitFor()
    await page.getByText('New health data stays on this phone. What’s already in your account stays until you choose.', { exact: true }).waitFor() // no "once more" at the re-ask
    await page.getByRole('button', { name: 'Not now' }).click()
    const st = await stored(page)
    expect(st.consents.healthPause.reasked === true, 'the re-ask is answered')
    await page.reload()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(600)
    expect((await page.getByText('Is it OK to keep your health data?').count()) === 0, 'never again')
  }, { url: ON, state: pausedAgo(15) })

  await run('existing user: not asked again within 2 weeks', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(800)
    expect((await page.getByText('Is it OK to keep your health data?').count()) === 0, 'not yet')
  }, { url: ON, state: pausedAgo(10) })

  await run('existing user: yes on the sheet', async ({ page }) => {
    await page.getByRole('button', { name: 'Yes, keep it' }).click()
    expect(latest(await stored(page), 'health')?.granted === true, 'granted')
    await tab(page, 'Plan')
    await page.locator('.buildplan').waitFor() // ob6-4, behind the flag
    await shot(page, 'ob6-4-buildplan')
  }, { url: ON, state: deviceState({ days: EXISTING }) })

  /* ---------------- delete account ---------------- */

  const toDelete = async (page) => {
    await tab(page, 'Profile')
    await page.getByRole('button', { name: 'Delete account' }).click()
    await page.getByRole('heading', { name: 'Delete your account' }).waitFor()
  }

  await run('delete account: happy path', async ({ page, net }) => {
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    await toDelete(page)
    await page.getByText('Needs a connection, so it deletes everywhere at once.').waitFor()
    await shot(page, 'ob6-5-delete')
    await page.getByRole('button', { name: 'Delete account' }).click()
    await page.getByRole('dialog', { name: 'Delete everything?' }).waitFor()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await shot(page, 'ob6-6-delete-confirm')
    await page.getByRole('button', { name: 'Delete everything' }).click()
    await page.getByRole('button', { name: /Sign in|Log in/ }).first().waitFor({ timeout: 8000 })
    expect(net.fnCalls.length === 1 && net.fnCalls[0].body.confirm === 'delete my account' && net.fnCalls[0].auth.startsWith('Bearer '), 'function called once, confirmed: ' + JSON.stringify(net.fnCalls))
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k === 'leanplan.v1' || k.startsWith('sb-') || k.startsWith('tali.')))
    const st = await stored(page)
    expect(!left.some((k) => k.startsWith('sb-')) && (!st || Object.keys(st.days || {}).length === 0), 'device wiped: ' + left.join())
    await shot(page, 'deleted-signin')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('delete account: offline, refused with the connection note', async ({ page, ctx, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await toDelete(page)
    await page.getByRole('button', { name: 'Delete account' }).click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await ctx.setOffline(true)
    await page.getByText('Deleting your account needs a connection. Nothing has been deleted.').waitFor()
    expect(await page.getByRole('button', { name: 'Delete everything' }).isDisabled(), 'button off offline')
    await shot(page, 'delete-offline')
    await page.getByRole('button', { name: 'Cancel' }).click()
    expect(await page.getByRole('button', { name: 'Delete account' }).isDisabled(), 'Delete account off offline')
    await page.getByText('Needs a connection, so it deletes everywhere at once.').waitFor()
    expect(net.fnCalls.length === 0, 'nothing sent')
    expect(Object.keys((await stored(page)).days).length === 1, 'nothing deleted')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('delete account: the wrong word keeps the button off', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await toDelete(page)
    await page.getByRole('button', { name: 'Delete account' }).click()
    const btn = page.getByRole('button', { name: 'Delete everything' })
    for (const w of ['', 'DELET', 'delete it', 'REMOVE']) {
      await page.getByLabel('Type DELETE to confirm').fill(w)
      expect(await btn.isDisabled(), 'off for ' + JSON.stringify(w))
    }
    await btn.click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
    expect(net.fnCalls.length === 0, 'nothing sent')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('delete account: an old sign-in asks for the password first', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await toDelete(page)
    await page.getByRole('button', { name: 'Delete account' }).click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    const btn = page.getByRole('button', { name: 'Delete everything' })
    expect(await btn.isDisabled(), 'waits for the password')
    await page.getByLabel('Your password, to confirm it’s you').fill('wrong')
    await btn.click()
    await page.getByText('That password doesn’t match this account. Nothing has been deleted.').waitFor()
    expect(net.fnCalls.length === 0, 'nothing sent on a wrong password')
    await page.getByLabel('Your password, to confirm it’s you').fill('right-password')
    await btn.click()
    await page.getByRole('button', { name: /Sign in|Log in/ }).first().waitFor({ timeout: 8000 })
    expect(net.fnCalls.length === 1, 'deleted after re-confirming')
  }, { authAgoS: 3600, state: deviceState({ days: { [today]: aDay(70) } }) })

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
