/**
 * Headless end-to-end checks for Wellbeing Phase 1 (build plan, "Headless verification"). Three
 * builds: the normal one (flag off, what users get), one with WELLBEING_ENABLED on and one with
 * MIND_REVIEWED on as well:
 *
 *   npm run build && npx vite preview --port 4176 &
 *   VITE_WELLBEING=1 npx vite build --outDir dist-wb && npx vite preview --outDir dist-wb --port 4177 &
 *   VITE_WELLBEING=1 VITE_MIND_REVIEWED=1 npx vite build --outDir dist-wbr && npx vite preview --outDir dist-wbr --port 4178 &
 *   E2E_URL=http://localhost:4176/ E2E_URL_WB=http://localhost:4177/ E2E_URL_WBR=http://localhost:4178/ NODE_PATH=$(npm root -g) node scripts/e2e-wellbeing.cjs [--only=flag-off]
 *
 * Needs Playwright (a global install is fine; browsers in PLAYWRIGHT_BROWSERS_PATH, e.g.
 * /opt/pw-browsers). Every Supabase request is answered by an in-memory PostgREST stand-in
 * (as in e2e-foundations.cjs), so the real project is never reached. State is seeded through
 * `leanplan.v1`; the browser clock is fixed to the seed's day (Europe/London). Screenshots go to
 * E2E_OUT, each in light and dark. `--only=<name>` runs the scenarios whose name starts with it.
 * The `flag-off` scenario stays in every run: with the flag off the app is exactly as on main.
 */
const { chromium } = (() => { try { return require('playwright') } catch { return require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright') } })()
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const BASE = process.env.E2E_URL || 'http://localhost:4176/'
const WB = process.env.E2E_URL_WB || 'http://localhost:4177/'
const WBR = process.env.E2E_URL_WBR || 'http://localhost:4178/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-e2e-wb-'))
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const UID = '11111111-2222-4333-8444-555555555555'
const AUTH_KEY = 'sb-exvblofwiwbvycomxvmj-auth-token'

/* ---------------- dates ---------------- */

const ymd = (d) => d.toISOString().slice(0, 10)
/** `n` days after the YYYY-MM-DD date `d` (negative for before). */
const shift = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return ymd(x) }
/** Deck 0.1: Thursday 8 October 2026. */
const HARD_DAY = '2026-10-08'
/** Deck B9: Saturday 10 October 2026. */
const ORDINARY_DAY = '2026-10-10'

/* ---------------- the account and the server stand-in ---------------- */

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400 * 400, iat: now, amr: [{ method: 'password', timestamp: now - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
// the browser clock is fixed (it can be behind or ahead of this machine's), so the session lasts long enough either way
const sessionOf = (authAgoS) => ({ access_token: fakeJwt(UID, authAgoS), token_type: 'bearer', expires_in: 86400 * 400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 400, refresh_token: 'r', user: USER })

/** Health consent given (and synced) on the live consent screen: the app past it. */
const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }

/** A device state as the app saves it: synced once, owned by UID, health consent given. */
function deviceState({ days = {}, profile, schedule, consents = GRANTED, at } = {}) {
  const u = at ? at + 'T07:00:00.000Z' : new Date().toISOString()
  return {
    days,
    ...(profile ? { profile } : {}),
    ...(schedule ? { schedule } : {}),
    ...(consents ? { consents } : {}),
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}

/* ---------------- seeds ---------------- */

const PROFILE = { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 81.8, activityLevel: 'light', supplements: [], notificationsEnabled: false }
/** Legs & Core on Thursdays (deck 0.1), cardio and rest around it. */
const SCHEDULE = { 0: 'Rest', 1: 'Push', 2: 'Cardio', 3: 'Pull', 4: 'Legs', 5: 'Cardio', 6: 'Rest' }
/** The usual breakfast: porridge made with milk 250 g and a banana 118 g (CoFID, as the app logs them). */
const BREAKFAST = [
  { n: 'Porridge, made with milk', grams: 250, k: 210, p: 11.5, c: 30.3, f: 5.8, meal: 'breakfast', src: 'db', how: 'g' },
  { n: 'Banana (1 ~118g)', grams: 118, k: 96, p: 1.4, c: 24, f: 0.1, meal: 'breakfast', src: 'db', how: 'g' },
]
const dayOf = ({ foods = [], weight = null, checkin } = {}) => ({ foods, supps: {}, weight, workout: null, ...(checkin ? { checkin } : {}) })
const ci = (d, mood, sleep, stress, energy, hunger = 3) => ({ mood, hunger, sleep, stress, energy, sore: 0, note: '', t: d + 'T08:30:00.000Z' })

/**
 * Hard day (deck 0.1, Thu 8 Oct): mood 2, sleep 1, stress 2, energy 1, hunger 2; 11 check-ins
 * over the 14 days before; the usual breakfast yesterday and on 9 recent days; Legs & Core
 * planned; weight 81.8 kg.
 */
function hardDay() {
  const days = {}
  const ordinary = [[4, 2, 2, 2], [3, 2, 2, 2], [4, 3, 1, 3], [3, 2, 2, 2], [4, 2, 1, 2], [3, 3, 2, 2], [4, 2, 2, 3], [3, 2, 2, 2], [4, 3, 1, 2], [3, 2, 2, 2], [4, 2, 2, 2]]
  const checked = [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13] // 11 of the 14 days before
  checked.forEach((n, i) => { const d = shift(HARD_DAY, -n); days[d] = dayOf({ checkin: ci(d, ...ordinary[i]) }) })
  const ate = [1, 2, 3, 5, 6, 7, 9, 10, 12, 13] // yesterday and 9 more recent days
  for (const n of ate) { const d = shift(HARD_DAY, -n); days[d] = { ...(days[d] || dayOf()), foods: BREAKFAST.map((f) => ({ ...f })) } }
  const y = shift(HARD_DAY, -1)
  days[y].weight = 81.8
  days[HARD_DAY] = dayOf({ checkin: { mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1, sore: 0, note: '', t: HARD_DAY + 'T07:40:00.000Z' } })
  return { at: HARD_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at: HARD_DAY }) }
}

/** Ordinary day (deck B9, Sat 10 Oct): a good check-in, the usual breakfast, nothing hard. */
function ordinaryDay() {
  const days = {}
  for (let n = 1; n <= 10; n++) { const d = shift(ORDINARY_DAY, -n); days[d] = dayOf({ foods: n % 3 ? BREAKFAST.map((f) => ({ ...f })) : [], checkin: n % 2 ? ci(d, 4, 3, 1, 3) : undefined }) }
  days[ORDINARY_DAY] = dayOf({ checkin: ci(ORDINARY_DAY, 4, 3, 1, 3) })
  return { at: ORDINARY_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at: ORDINARY_DAY }) }
}

/** Low-mood fortnight: at least 5 answered check-ins in 14 days, most with mood 1 or 2. */
function lowMoodFortnight(at = HARD_DAY) {
  const days = {}
  const moods = [2, 1, 2, 3, 2, 1, 2]
  moods.forEach((m, i) => { const d = shift(at, -(i * 2 + 1)); days[d] = dayOf({ checkin: ci(d, m, 2, 2, 2) }) })
  days[at] = dayOf({ checkin: ci(at, 2, 2, 2, 2) })
  return { at, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at }) }
}

/* ---------------- the scenario runner ---------------- */

async function scenario(browser, name, fn, opts = {}) {
  if (ONLY && name !== 'flag-off' && !name.startsWith(ONLY)) return true
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, acceptDownloads: true, timezoneId: 'Europe/London', locale: 'en-GB',
    colorScheme: 'light', ...(opts.reducedMotion ? { reducedMotion: 'reduce' } : {}),
  })
  const session = sessionOf(opts.authAgoS ?? 10)
  await ctx.addInitScript(([s, st, key]) => {
    if (sessionStorage.getItem('e2e.seeded')) return // only on the first load: a reload keeps what the app saved
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem(key, s)
    localStorage.setItem('tali.mode', 'account')
    if (st) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(session), opts.seed ? JSON.stringify(opts.seed.state) : null, AUTH_KEY])
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [], ...(opts.rows || {}) }
  const net = { mode: 'ok', posts: [] }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/auth/v1/token')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionOf(1)) })
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) })
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (url.includes('/functions/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' })
    if (url.includes('/rest/v1/rpc/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' })
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    const t = m[1]
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows[t] || []) })
    const list = JSON.parse(req.postData() || '[]')
    net.posts.push({ t, list })
    if (net.mode === 'fail') return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    for (const row of [].concat(list)) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...row }; else rows[t].push(row)
    }
    return route.fulfill({ status: 201, body: '' })
  })
  await ctx.route(/openfoodfacts\.org/, (r) => r.abort())
  await ctx.route(/b-cdn\.net|mediadelivery\.net/, (r) => r.abort()) // demo clips need no network here
  const page = await ctx.newPage()
  if (opts.seed?.at) await page.clock.setFixedTime(new Date(opts.seed.at + 'T09:00:00'))
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  try {
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
    await ctx.close()
  }
}

/* ---------------- helpers ---------------- */

/** A screenshot in light and in dark (after a sheet's slide-up), back to light afterwards. */
async function shot(page, name) {
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.waitForTimeout(450)
    await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`) })
  }
  await page.emulateMedia({ colorScheme: 'light' })
}
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
const tab = (page, name) => page.locator('nav.tabbar').getByRole('button', { name, exact: true }).click()
const tabLabels = async (page) => (await page.locator('nav.tabbar button').allTextContents()).map((s) => s.trim())
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const TABS_NOW = ['Summary', 'Food', 'Train', 'Plan', 'Profile']
const TRAIN_CHIPS_NOW = ['As planned', 'Shorter', '10-min mobility', 'Easy walk']

/** The flag-off build looks and behaves as main does today (build plan, ground rule 1). */
async function flagOff({ page }) {
  await page.locator('nav.tabbar').waitFor()
  const labels = await tabLabels(page)
  expect(JSON.stringify(labels) === JSON.stringify(TABS_NOW), 'tab bar: ' + labels.join(', '))
  expect(!(await page.locator('nav.tabbar').getByRole('button', { name: 'Mind', exact: true }).count()), 'no Mind tab')
  expect(!(await page.getByText('Need support now?').count()), 'no "Need support now?" on Summary')
  await shot(page, 'flag-off-summary')
  // the Summary Mind card opens the check-in sheet, as today
  await page.locator('.mind-row').click()
  await page.locator('.sheet').getByText('How are you feeling?').waitFor()
  await shot(page, 'flag-off-checkin')
  await page.locator('.sheet').getByRole('button', { name: 'Done' }).click()
  await page.locator('.sheet').waitFor({ state: 'detached' })
  // the Train chips are the existing four
  await tab(page, 'Train')
  await page.locator('.hdr .ltitle', { hasText: 'Train' }).waitFor()
  const fold = page.locator('.card.lighter button.lh')
  if (await fold.count()) await fold.click()
  const chips = (await page.locator('.card.lighter .chips .chip').allTextContents()).map((s) => s.trim())
  expect(JSON.stringify(chips) === JSON.stringify(TRAIN_CHIPS_NOW), 'Train chips: ' + chips.join(', '))
  expect(!(await page.getByText('Need support now?').count()), 'no "Need support now?" on Train')
  await shot(page, 'flag-off-train')
  for (const t of ['Food', 'Plan', 'Profile']) {
    await tab(page, t)
    await page.locator('.hdr .ltitle', { hasText: t }).waitFor()
    expect(!(await page.getByText('Need support now?').count()), `no "Need support now?" on ${t}`)
  }
}

/* ---------------- scenarios ---------------- */

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const run = async (...a) => results.push(await scenario(browser, ...a))

  // kept in every run, whatever --only says
  await run('flag-off', flagOff, { seed: hardDay() })

  await run('flag-off-checkin-reload', async ({ page }) => {
    // WP1: the check-in sheet saves through the merge helper; mood, sleep and the note survive a reload
    await page.locator('.mind-row').click()
    const sheet = page.locator('.sheet')
    await sheet.getByText('How are you feeling?').waitFor()
    await sheet.locator('.scale').nth(0).getByRole('button', { name: 'Great', exact: true }).click()
    await sheet.locator('.scale').nth(1).getByRole('button', { name: 'OK', exact: true }).click()
    await sheet.locator('textarea').fill('Slept badly, walked at lunch')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await sheet.waitFor({ state: 'detached' })
    await page.reload()
    await page.locator('.mind-row').waitFor()
    const c = (await stored(page)).days[ORDINARY_DAY].checkin
    expect(c && c.mood === 5 && c.sleep === 2 && c.note === 'Slept badly, walked at lunch', 'saved: ' + JSON.stringify(c))
    await page.locator('.mind-row').getByText('Feeling great').waitFor()
    await page.locator('.mind-row').click()
    await page.locator('.sheet textarea').waitFor()
    expect((await page.locator('.sheet textarea').inputValue()) === 'Slept badly, walked at lunch', 'note shown again')
    await shot(page, 'flag-off-checkin-after-reload')
  }, { seed: ordinaryDay() })

  // Later packages add their scenarios here, against WB (flag on) and WBR (flag on, MIND_REVIEWED on),
  // with the seeds above: hardDay(), ordinaryDay(), lowMoodFortnight().
  void WB; void WBR; void lowMoodFortnight

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
