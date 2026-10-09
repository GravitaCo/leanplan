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
function hardDay({ schedule = SCHEDULE } = {}) {
  const days = {}
  const ordinary = [[4, 2, 2, 2], [3, 2, 2, 2], [4, 3, 1, 3], [3, 2, 2, 2], [4, 2, 1, 2], [3, 3, 2, 2], [4, 2, 2, 3], [3, 2, 2, 2], [4, 3, 1, 2], [3, 2, 2, 2], [4, 2, 2, 2]]
  const checked = [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13] // 11 of the 14 days before
  checked.forEach((n, i) => { const d = shift(HARD_DAY, -n); days[d] = dayOf({ checkin: ci(d, ...ordinary[i]) }) })
  const ate = [1, 2, 3, 5, 6, 7, 9, 10, 12, 13] // yesterday and 9 more recent days
  for (const n of ate) { const d = shift(HARD_DAY, -n); days[d] = { ...(days[d] || dayOf()), foods: BREAKFAST.map((f) => ({ ...f })) } }
  const y = shift(HARD_DAY, -1)
  days[y].weight = 81.8
  days[HARD_DAY] = dayOf({ checkin: { mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1, sore: 0, note: '', t: HARD_DAY + 'T07:40:00.000Z' } })
  return { at: HARD_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...schedule }, at: HARD_DAY }) }
}

/** WP8: the hard day, with Legs & Core last Thursday (barbell squat 40 kg × 10, three sets). */
function hardDayWithLastTime() {
  const seed = hardDay()
  const d = shift(HARD_DAY, -7)
  seed.state.days[d].sessions = [{ id: 'e2e-legs-1', modality: 'strength', title: 'Legs & Core', routineId: 'builtin-Legs', at: d + 'T18:00:00.000Z',
    ex: [{ name: 'Barbell squat', exId: 'back-squat', log: 'weight-reps', rx: '3 × 10–12', sets: [{ w: '40', reps: '10' }, { w: '40', reps: '10' }, { w: '40', reps: '10' }] }] }]
  return seed
}

/** WP8: the hard day (a rough night) with an own workout that has moves with steadier versions. */
function roughNightOwnWorkout() {
  const seed = hardDay()
  seed.state.routines = [{ id: '99999999-8888-4777-8666-555555555555', name: 'Hill legs', modality: 'strength', effort: 'hard', source: 'custom', _dirty: true, _u: HARD_DAY + 'T07:00:00.000Z',
    blocks: [{ id: 'b1', kind: 'sets', slots: [{ exId: 'step-up', rx: '3 × 10–12' }, { exId: 'cardio-run', rx: '20–30 min' }, { exId: 'mountain-climber', rx: '3 × 20–30' }, { exId: 'back-squat', rx: '3 × 10–12' }] }] }]
  return seed
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

/* ---------------- WP5: navigation ---------------- */

const TABS_WB = ['Summary', 'Mind', 'Food', 'Train', 'Plan']

/** The title's first line and the avatar share a top edge; the avatar's tap area is 44 px. */
async function avatarBesideTitle(page, title) {
  const row = page.locator('.hdr-row.av', { has: page.locator('.ltitle', { hasText: title }) }).first()
  await row.waitFor()
  const h1 = await row.locator('.ltitle').boundingBox()
  const btn = row.getByRole('button', { name: 'Profile', exact: true })
  const tap = await btn.boundingBox()
  const av = await btn.locator('.avatar').boundingBox()
  expect(Math.abs(av.y - h1.y) <= 1, `${title}: avatar top ${av.y} vs title top ${h1.y}`)
  expect(tap.width >= 44 && tap.height >= 44, `${title}: tap area ${tap.width}×${tap.height}`)
  expect(av.x + av.width <= 390 - 16 + 1, `${title}: avatar inside the gutter`)
  return { h1, av }
}
const titled = (page, t) => page.locator('.ltitle', { hasText: t }).first().waitFor()

/** Flag on: five tabs, an avatar beside every title, tapping it opens Profile (no avatar there). */
async function wp5Nav({ page }) {
  await page.locator('nav.tabbar').waitFor()
  const labels = await tabLabels(page)
  expect(JSON.stringify(labels) === JSON.stringify(TABS_WB), 'tab bar: ' + labels.join(', '))
  for (const [t, title] of [['Summary', 'Summary'], ['Mind', 'Mind'], ['Food', 'Food'], ['Train', 'Train'], ['Plan', 'Plan']]) {
    await tab(page, t)
    await titled(page, title)
    await avatarBesideTitle(page, title)
    expect((await page.locator('.hdr .avatar').count()) === 1, `${t}: one avatar`)
    const cur = await page.locator('nav.tabbar button[aria-current="page"]').allTextContents()
    expect(cur.length === 1 && cur[0].trim() === t, `${t}: current tab ${cur.join(',')}`)
    await shot(page, 'wp5-tab-' + t.toLowerCase())
  }
  // a pushed screen: Train's session preview, with the avatar beside its title
  await tab(page, 'Train')
  await page.locator('.li.trow').first().click()
  await page.locator('.pv .ltitle').waitFor()
  const name = (await page.locator('.pv .ltitle').textContent()).trim()
  await avatarBesideTitle(page, name)
  await shot(page, 'wp5-pushed-preview')
  // a long title wraps to two lines and the avatar stays level with its first line
  await page.locator('.pv .ltitle').evaluate((h) => { h.textContent = 'Hips, hamstrings and calves' })
  const { h1 } = await avatarBesideTitle(page, 'Hips, hamstrings and calves')
  expect(h1.height >= 79, 'long title wraps: ' + h1.height)
  await shot(page, 'wp5-pushed-long-title')
  // the avatar opens Profile: no avatar there, and no tab highlighted
  await page.locator('.pv').getByRole('button', { name: 'Profile', exact: true }).click()
  await titled(page, 'Profile')
  expect(!(await page.locator('.hdr .pfl').count()), 'no avatar on Profile')
  expect(!(await page.locator('nav.tabbar button[aria-current="page"]').count()), 'no tab highlighted on Profile')
  await shot(page, 'wp5-profile')
}

/** Flag on, Mind pillar off: the Mind tab stays in place, faded, aria-disabled, and doesn't open. */
async function wp5MindOff({ page }) {
  await page.locator('nav.tabbar').waitFor()
  const labels = await tabLabels(page)
  expect(JSON.stringify(labels) === JSON.stringify(TABS_WB), 'tab bar: ' + labels.join(', '))
  const mind = page.locator('nav.tabbar').getByRole('button', { name: 'Mind, switched off in Profile', exact: true })
  expect((await mind.count()) === 1, 'Mind tab named "Mind, switched off in Profile"')
  expect((await mind.getAttribute('aria-disabled')) === 'true', 'aria-disabled')
  const col = await mind.evaluate((b) => getComputedStyle(b).color)
  const label3 = await page.evaluate(() => { const s = document.createElement('span'); s.style.color = 'var(--label3)'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c })
  expect(col === label3, `faded: ${col} vs ${label3}`)
  await mind.click({ force: true }) // aria-disabled: Playwright would wait for it to enable
  await page.waitForTimeout(200)
  await titled(page, 'Summary')
  expect(!(await page.locator('.ltitle', { hasText: /^Mind$/ }).count()), 'Mind did not open')
  await shot(page, 'wp5-mind-off-summary')
  // Support stays reachable from Profile (Health data, then Support and helplines)
  await page.locator('.hdr').getByRole('button', { name: 'Profile', exact: true }).click()
  await titled(page, 'Profile')
  await page.getByRole('button', { name: /Health data/ }).first().click()
  await page.locator('.sheet').getByText('Support and helplines').click()
  await page.locator('.sheet').getByText(/Samaritans/).first().waitFor()
  await shot(page, 'wp5-mind-off-support')
}

/** Flag off: Summary keeps its own avatar (bottom-aligned, as on main); no other title has one. */
async function wp5FlagOffHeaders({ page }) {
  await page.locator('nav.tabbar').waitFor()
  expect(!(await page.locator('.hdr-row.av, .pfl').count()), 'no flag-on header on Summary')
  expect((await page.locator('.hdr button.avatar[aria-label="Profile"]').count()) === 1, 'Summary avatar as today')
  for (const t of ['Food', 'Train', 'Plan', 'Profile']) {
    await tab(page, t)
    await titled(page, t)
    expect(!(await page.locator('.hdr .avatar, .pfl').count()), `${t}: no avatar beside the title`)
  }
  await tab(page, 'Train')
  await page.locator('.li.trow').first().click()
  await page.locator('.pv .ltitle').waitFor()
  expect(!(await page.locator('.pfl, .hdr-row.av').count()), 'pushed screen: no avatar')
  await shot(page, 'wp5-flag-off-preview')
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

  // WP5: the Mind tab and the Profile avatar beside every title (canvas section 9)
  await run('wp5-nav', wp5Nav, { url: WB, seed: hardDay() })
  await run('wp5-mind-off', wp5MindOff, { url: WB, seed: (() => { const s = hardDay(); s.state.profile.mind = { off: ['mind'] }; return s })() })
  await run('wp5-flag-off-headers', wp5FlagOffHeaders, { seed: hardDay() })

  // WP8: Train hard-day choices (board B3)
  await run('wp8-train-hard-day', async ({ page }) => {
    await tab(page, 'Train')
    await page.locator('.hdr .ltitle', { hasText: 'Train' }).waitFor()
    const card = page.locator('.card.lighter.hd')
    await card.getByText('Rough night? Here are a few options for today. All of them count.').waitFor()
    const tiles = (await card.locator('.opttile').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
    expect(tiles.length === 3, 'three tiles: ' + tiles.join(' | '))
    expect(tiles[0] === 'As planned Legs & Core 5 exercises · 14–15 sets', 'tile 1: ' + tiles[0])
    expect(tiles[1] === 'Shorter Legs & Core 10 sets · easier effort', 'tile 2: ' + tiles[1])
    expect(tiles[2] === 'Swap Hips, hamstrings and calves About 10 min · on a mat', 'tile 3: ' + tiles[2])
    expect(!(await card.locator('.opttile.on, .opttile[aria-pressed="true"], .chip').count()), 'nothing selected, no chips')
    await card.getByText("Shorter means fewer sets and an easier effort: stop each set with three or four reps to spare, at last time's weight or lighter.").waitFor()
    await card.getByText('Resting today is fine too.').waitFor()
    expect(!(await card.getByRole('button', { name: 'Resting today is fine too.' }).count()), 'rest is a plain line')
    expect(!(await card.getByText(/jump rope/).count()), 'no rough-night note: Legs & Core has nothing to change')
    await shot(page, 'wp8-train-hard-day')
    // Shorter: 10 sets, B3.14, the aim line and the footer at three or four
    await card.locator('.opttile').nth(1).click()
    await page.locator('.pv .ltitle', { hasText: 'Legs & Core' }).waitFor()
    const sub = await page.locator('.pv .sub').first().innerText()
    expect(sub.includes('10 sets'), 'preview sub: ' + sub)
    const chips = (await page.locator('.vchips .vchip').allTextContents()).map((s) => s.trim())
    expect(chips.join() === 'As planned,Shorter,Hips, hamstrings and calves', 'chips: ' + chips.join(' | '))
    expect((await page.locator('.vchip[aria-checked="true"]').innerText()).trim() === 'Shorter', 'Shorter on')
    await page.getByText('Shorter today: fewer sets, three or four reps to spare on each, and no adding weight. Change it any time.').waitFor()
    const first = await page.locator('.pv-row').first().innerText()
    expect(first.includes('2 × 10–12') && first.includes('Aim for 10–12 reps with 3 or 4 to spare, at 40 kg or lighter'), 'aim line: ' + first)
    await page.getByText('Swaps here only change today. Stop each set with three or four reps to spare.', { exact: false }).waitFor()
    await shot(page, 'wp8-preview-shorter')
    // the player: the aim line, and last time's reps with no +1
    await page.locator('.pv-cta .btn', { hasText: 'Start' }).click()
    const gp = page.locator('.gp')
    await gp.waitFor()
    const skipWarm = gp.getByRole('button', { name: 'Skip warm-up' })
    if (await skipWarm.count()) await skipWarm.click()
    await gp.locator('.gp-name', { hasText: 'Barbell squat' }).waitFor()
    await gp.getByText('Aim for 10–12 reps with 3 or 4 to spare').waitFor()
    const prog = await gp.locator('.gp-prog .t').innerText()
    expect(prog.includes('Set 1 of 2') && prog.includes('40 kg × 10') && !prog.includes('× 11'), 'target: ' + prog)
    await shot(page, 'wp8-player-shorter')
  }, { url: WB, seed: hardDayWithLastTime() })

  await run('wp8-rough-night', async ({ page }) => {
    // an own workout with a step-up, a run and mountain climbers, after a rough night
    await tab(page, 'Train')
    await page.locator('.hdr .ltitle', { hasText: 'Train' }).waitFor()
    await page.locator('.addrow').click()
    await page.locator('.sheet').getByText('Hill legs').click()
    await page.locator('.pv .ltitle', { hasText: 'Hill legs' }).waitFor()
    const chips = (await page.locator('.vchips .vchip').allTextContents()).map((s) => s.trim())
    expect(chips.join() === 'As planned,Shorter,Hips, hamstrings and calves', 'chips: ' + chips.join(' | '))
    expect(!(await page.getByText(/jump rope/).count()), 'no rough-night note on As planned')
    await page.locator('.vchip', { hasText: 'Shorter' }).click()
    await page.getByText('After a rough night, the shorter version swaps running, jump rope and loaded single-leg moves for steadier ones, and keeps cardio at an easy, steady pace.').waitFor()
    const rows = (await page.locator('.pv-row .m > .t').allTextContents()).map((s) => s.trim())
    expect(rows.length === 3 && !rows.some((r) => /^(Step-up|Run|Mountain climber)$/.test(r)), 'rows: ' + rows.join(' | '))
    await page.getByText(/In place of Step-up, today only/).waitFor()
    await shot(page, 'wp8-rough-night-shorter')
    // As planned is never changed
    await page.locator('.vchip', { hasText: 'As planned' }).click()
    const planned = (await page.locator('.pv-row .m > .t').allTextContents()).map((s) => s.trim())
    expect(planned.length === 4 && planned.includes('Step-up') && planned.includes('Mountain climber'), 'as planned: ' + planned.join(' | '))
  }, { url: WB, seed: roughNightOwnWorkout() })

  await run('wp8-cardio-day', async ({ page }) => {
    // a cardio day: the swap is 10-minute mobility and the effort note is the cardio one
    await tab(page, 'Train')
    const card = page.locator('.card.lighter.hd')
    await card.getByText('Rough night? Here are a few options for today. All of them count.').waitFor()
    const tiles = (await card.locator('.opttile').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
    expect(tiles[2] === 'Swap 10-minute mobility Hips, back and shoulders · on a mat', 'tile 3: ' + tiles[2])
    await card.getByText('Shorter means fewer minutes at an easy pace, one where you could chat in full sentences.').waitFor()
    await shot(page, 'wp8-train-cardio-day')
  }, { url: WB, seed: hardDay({ schedule: { ...SCHEDULE, 4: 'Cardio' } }) })

  await run('wp8-ordinary-day', async ({ page }) => {
    await tab(page, 'Train')
    const row = page.locator('.card.lighter.hd button.lh')
    await row.getByText('Shorter or a gentler swap').waitFor()
    expect((await row.getAttribute('aria-expanded')) === 'false', 'folded')
    await shot(page, 'wp8-train-ordinary-folded')
    await row.click()
    expect((await page.locator('.card.lighter.hd .opttile').count()) === 3, 'three tiles when unfolded')
    expect(!(await page.getByText('Resting today is fine too.').count()), 'the rest line is for a hard day')
    await shot(page, 'wp8-train-ordinary-open')
  }, { url: WB, seed: (() => { const o = ordinaryDay(); o.state.schedule[6] = 'Push'; return o })() }) // Push on the Saturday
  // WP6: the Mind tab root (B5) and the Support sheet in the Mind context (B6 frame 1)
  const openMindTab = async (page) => {
    await page.locator('nav.tabbar').waitFor()
    await tab(page, 'Mind')
    await page.locator('.hdr .ltitle', { hasText: 'Mind' }).waitFor()
  }
  /** the parts of the saved state a Support visit must never touch */
  const keep = (st) => JSON.stringify({ days: st.days, profile: st.profile, consents: st.consents, deviceOnly: st.deviceOnly, settings: st._meta && st._meta.settings })
  /** the hard day before its check-in */
  const hardDayNoCheckin = () => { const s = hardDay(); delete s.state.days[HARD_DAY].checkin; return s }

  await run('wp6-mind', async ({ page, net }) => {
    await openMindTab(page)
    const main = page.locator('.screen.mind')
    expect((await main.locator('.eyebrow').textContent()).trim() === 'Thursday 8 October', 'eyebrow')
    expect(!(await main.locator('.pv-back, .hdr .navbtn').count()), 'no back button on the tab root')
    const pairs = (await main.locator('.mind-g2 > div').allTextContents()).map((s) => s.trim())
    expect(JSON.stringify(pairs) === JSON.stringify(['MoodLow', 'SleepPoor', 'StressSome', 'EnergyLow']), 'pairs: ' + pairs.join(', '))
    await main.getByRole('button', { name: 'Update', exact: true }).waitFor()
    // S.1 directly under the Today card, above the fold at 390x844 (above the tab bar)
    const row = main.getByRole('button', { name: 'Need support now?' })
    const box = await row.boundingBox()
    const bar = await page.locator('nav.tabbar').boundingBox()
    expect(box && bar && box.y + box.height <= bar.y, 'support row above the fold: ' + JSON.stringify({ box, bar }))
    expect(!(await main.getByText('Skills', { exact: true }).count()), 'no Skills section with MIND_REVIEWED off')
    await main.getByText('If–then plans').waitFor()
    await main.getByText('For everyday wellbeing. Not a treatment for any condition.').waitFor()
    await shot(page, 'wp6-mind')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await shot(page, 'wp6-mind-foot')
    await page.evaluate(() => window.scrollTo(0, 0))

    // opening Support writes nothing, counts nothing, syncs nothing
    await page.waitForTimeout(1500)
    const before = keep(await stored(page))
    const posts = net.posts.length
    await row.click()
    const sheet = page.locator('.sheet')
    await sheet.getByText('Support and helplines', { exact: true }).waitFor()
    const names = (await sheet.locator('.wz-sp .t').allTextContents()).map((s) => s.trim())
    expect(JSON.stringify(names) === JSON.stringify(['Samaritans', 'Shout', 'NHS 111, option 2', 'NHS 111', 'Beat', 'Emergency services']), 'rows: ' + names.join(', '))
    const shout = sheet.locator('a.wz-sp', { hasText: 'Shout' })
    expect((await shout.getAttribute('href')) === 'sms:85258?&body=SHOUT', 'Shout sms link')
    await shout.getByText('Text SHOUT to 85258 · 24 hours, every day').waitFor()
    await sheet.getByText('Tali isn’t a crisis service and doesn’t monitor what you write. If you or someone else is in danger now, call 999.').waitFor()
    await sheet.getByText('Opening this page is private. Tali doesn’t record it or tell anyone. Calls to these numbers are free. Texting Shout is free from the main UK networks.').waitFor()
    await shot(page, 'wp6-support')
    // Northern Ireland: the GP in NHS 111's place
    await sheet.getByRole('button', { name: 'Change' }).click()
    await sheet.getByText('Northern Ireland', { exact: true }).click()
    const ni = (await sheet.locator('.wz-sp .t').allTextContents()).map((s) => s.trim())
    expect(JSON.stringify(ni) === JSON.stringify(['Samaritans', 'Shout', 'Your GP', 'Beat', 'Emergency services']), 'NI rows: ' + ni.join(', '))
    await sheet.getByRole('button', { name: 'Done' }).click()
    await sheet.waitFor({ state: 'detached' })
    await page.waitForTimeout(1500)
    expect(keep(await stored(page)) === before, 'opening Support changed the saved state')
    expect(net.posts.length === posts, 'opening Support sent ' + (net.posts.length - posts) + ' request(s)')
    // Update opens the existing check-in sheet
    await main.getByRole('button', { name: 'Update', exact: true }).click()
    await page.locator('.sheet').getByText('How are you feeling?').waitFor()
  }, { seed: hardDay(), url: WB })

  await run('wp6-mind-reviewed', async ({ page }) => {
    await openMindTab(page)
    const main = page.locator('.screen.mind')
    await main.getByText('Skills', { exact: true }).waitFor()
    const skills = (await main.locator('.mind-skills .li .t').allTextContents()).map((s) => s.trim())
    expect(JSON.stringify(skills) === JSON.stringify(['Reset', 'Unload']), 'skills: ' + skills.join(', '))
    await shot(page, 'wp6-mind-reviewed')
  }, { seed: hardDay(), url: WBR })

  await run('wp6-mind-empty', async ({ page }) => {
    // before today's check-in: the ask and "Check in", which opens the sheet
    await openMindTab(page)
    const main = page.locator('.screen.mind')
    await main.getByText('How are you today?').waitFor()
    await shot(page, 'wp6-mind-empty')
    await main.getByRole('button', { name: 'Check in', exact: true }).click()
    await page.locator('.sheet').getByText('How are you feeling?').waitFor()
  }, { seed: hardDayNoCheckin(), url: WB })

  // Later packages add their scenarios here, against WB (flag on) and WBR (flag on, MIND_REVIEWED on),
  // with the seeds above: hardDay(), ordinaryDay(), lowMoodFortnight().
  void WB; void WBR; void lowMoodFortnight

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
