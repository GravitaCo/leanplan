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
  // opts.fakeClock (WP12): timers and requestAnimationFrame under Playwright's clock, so a scenario can
  // pause it and step time with runFor; otherwise the date is fixed and timers run in real time
  if (opts.seed?.at) {
    if (opts.fakeClock) await page.clock.install({ time: new Date(opts.seed.at + 'T09:00:00') })
    else await page.clock.setFixedTime(new Date(opts.seed.at + 'T09:00:00'))
  }
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
    expect((await main.locator('.hdr-row.av').getByRole('button', { name: 'Profile', exact: true }).count()) === 1, 'the Profile avatar beside the title')
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

  // WP9: Profile's pillars and asks settings (board B1)
  const B116 = 'Finding food tracking hard? Gentle display hides the numbers, and support is here.'
  const openProfileWb = async (page) => {
    await page.locator('nav.tabbar').waitFor()
    await page.locator('.hdr').getByRole('button', { name: 'Profile', exact: true }).first().click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    const sec = page.locator('section.pillars')
    await sec.waitFor()
    await sec.locator('.lbl').first().scrollIntoViewIfNeeded()
    await page.evaluate(() => { const el = document.querySelector('section.pillars'); window.scrollBy(0, el.getBoundingClientRect().top - 60) })
    return sec
  }
  const sw = (sec, name) => sec.getByRole('switch', { name, exact: true })
  const mindPrefs = async (page) => ((await stored(page)) || {}).profile?.mind || {}

  await run('wp9-pillars', async ({ page }) => {
    const sec = await openProfileWb(page)
    // between "You and your goal" and "Tracking"
    const order = await page.evaluate(() => [...document.querySelectorAll('.screen .lbl')].map((x) => x.textContent.trim()))
    const i = order.indexOf('What do you want Tali for?')
    expect(order[i - 1] === 'You and your goal' && order[i + 1] === 'How often Tali asks' && order[i + 2] === 'Tracking', 'group order: ' + order.join(' | '))
    const rows = (await sec.locator('.list.icons .li .t').allTextContents()).map((s) => s.trim())
    expect(JSON.stringify(rows) === JSON.stringify(['Mind', 'Food', 'Move']), 'rows: ' + rows.join(', '))
    for (const p of ['Mind', 'Food', 'Move']) expect((await sw(sec, p).getAttribute('aria-checked')) === 'true' && await sw(sec, p).isEnabled(), p + ' on and enabled')
    await sec.getByText("Keep at least one on. One that's off leaves Today and stops its prompts. Nothing is deleted, and you can switch it back any time.").waitFor()
    await sec.getByRole('radio', { name: 'Usual' }).waitFor()
    expect((await sec.getByRole('radio', { name: 'Usual' }).getAttribute('aria-checked')) === 'true', 'Usual selected')
    await sec.getByText("Usual: up to 3 suggestions or prompts a day. Fewer prompts: 1. On a harder day, Tali asks for less either way. Anything you open yourself doesn't count.").waitFor()
    await shot(page, 'wp9-all-on')

    // Food off: B1.14 replaces B1.8; not on the at-risk route, so no B1.16
    await sw(sec, 'Food').click()
    await sec.getByText("Food is off. Today won't show calories, ranges or food prompts. Your food log is kept.").waitFor()
    expect(!(await sec.getByText(/Keep at least one on/).count()), 'B1.8 replaced')
    expect(!(await page.getByText(B116).count()), 'no B1.16 outside the at-risk route')
    await page.waitForTimeout(300)
    let m = await mindPrefs(page)
    expect(JSON.stringify(m.off) === '["food"]', 'saved off: ' + JSON.stringify(m))
    const st = await stored(page)
    expect(st.profile.answeredAt && st.profile.answeredAt['mind.off'], 'mind.off stamped')
    expect(Object.values(st.days).some((d) => (d.foods || []).length), 'the food log is kept')
    await shot(page, 'wp9-food-off')

    // only Move on: its switch is disabled with B1.9; tapping it changes nothing
    await sw(sec, 'Mind').click()
    await sec.getByText('At least one stays on').waitFor()
    await sec.getByText(/Keep at least one on/).waitFor() // the board's only-Move frame keeps B1.8
    expect(await sw(sec, 'Move').isDisabled(), 'Move disabled')
    await sw(sec, 'Move').click({ force: true })
    await page.waitForTimeout(300)
    m = await mindPrefs(page)
    expect(JSON.stringify(m.off) === '["mind","food"]', 'only Move on: ' + JSON.stringify(m))
    // the Mind tab is faded and switched off (WP5)
    expect((await page.locator('nav.tabbar').getByRole('button', { name: 'Mind, switched off in Profile', exact: true }).count()) === 1, 'Mind tab off')
    await shot(page, 'wp9-only-move')

    // asks: Fewer prompts
    await sec.getByRole('radio', { name: 'Fewer prompts' }).click()
    await page.waitForTimeout(300)
    expect((await mindPrefs(page)).asks === 'fewer', 'asks saved')
    // everything back on: off removed
    await sw(sec, 'Mind').click()
    await sw(sec, 'Food').click()
    await page.waitForTimeout(300)
    m = await mindPrefs(page)
    expect(m.off === undefined && m.asks === 'fewer', 'all on again: ' + JSON.stringify(m))
    await page.reload()
    const sec2 = await openProfileWb(page)
    expect((await sec2.getByRole('radio', { name: 'Fewer prompts' }).getAttribute('aria-checked')) === 'true', 'Fewer prompts kept over a reload')
  }, { url: WB, seed: ordinaryDay() })

  await run('wp9-gentle', async ({ page }) => {
    const sec = await openProfileWb(page)
    expect(!(await page.getByText(B116).count()), 'no B1.16 while Food is on')
    await sw(sec, 'Food').click()
    const hard = sec.locator('.pillars-hard')
    await hard.waitFor()
    expect((await hard.innerText()).trim() === B116, 'B1.16: ' + (await hard.innerText()))
    await shot(page, 'wp9-food-off-gentle')
    // "support is here": the Support sheet in one tap
    await hard.getByRole('button', { name: 'support is here' }).click()
    const sheet = page.locator('.sheet')
    await sheet.getByText('Support and helplines', { exact: true }).waitFor()
    await sheet.getByText('Samaritans', { exact: true }).first().waitFor()
    await shot(page, 'wp9-support')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await sheet.waitFor({ state: 'detached' })
    // "Gentle display": Profile › Display open, in view
    await hard.getByRole('button', { name: 'Gentle display' }).click()
    const display = page.locator('button.li[aria-expanded="true"]', { hasText: 'Display' })
    await display.waitFor()
    await page.waitForTimeout(300)
    const box = await display.boundingBox()
    expect(box && box.y > 0 && box.y < 844 - 83, 'Display in view: ' + JSON.stringify(box))
    await page.getByRole('radio', { name: 'Gentle' }).waitFor()
    expect((await page.getByRole('radio', { name: 'Gentle' }).getAttribute('aria-checked')) === 'true', 'still gentle')
    await shot(page, 'wp9-display')
    // Food off and on again never resets gentle mode or foodMode
    await sw(sec, 'Food').click()
    await page.waitForTimeout(300)
    const p = (await stored(page)).profile
    expect(p.gentle === true && p.foodMode === 'sometimes' && !(p.mind && p.mind.off), 'gentle kept: ' + JSON.stringify({ gentle: p.gentle, foodMode: p.foodMode, mind: p.mind }))
  }, { url: WB, seed: (() => { const o = ordinaryDay(); o.state.profile = { ...o.state.profile, gentle: true, foodMode: 'sometimes' }; return o })() })

  await run('wp9-flag-off', async ({ page }) => {
    await page.locator('nav.tabbar').waitFor()
    await tab(page, 'Profile')
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    await page.getByText('Tracking', { exact: true }).waitFor()
    expect(!(await page.getByText('What do you want Tali for?').count()) && !(await page.getByText('How often Tali asks').count()), 'no B1 group with the flag off')
    const order = await page.evaluate(() => [...document.querySelectorAll('.screen .lbl')].map((x) => x.textContent.trim()))
    const i = order.indexOf('You and your goal')
    expect(order[i + 1] === 'Tracking', 'flag off: ' + order.join(' | '))
    await shot(page, 'wp9-flag-off-profile')
  }, { seed: ordinaryDay() })
  // WP10: the check-in's "More about sleep" (board B10)
  /** the hard day, with yesterday's wake time at 07:10 (B10.8's pre-fill) */
  const hardDayWoke = () => { const s = hardDay(); const y = shift(HARD_DAY, -1); s.state.days[y].checkin.night = { source: 'self', band: '7-8', wakeAt: '07:10', t: y + 'T08:30:00.000Z' }; return s }
  const openCheckin = async (page) => {
    await openMindTab(page)
    await page.locator('.screen.mind').getByRole('button', { name: 'Update', exact: true }).click()
    const sheet = page.locator('.sheet').first()
    await sheet.getByText('How are you feeling?').waitFor()
    return sheet
  }
  const B10_13 = "Answer what you like, and leave the rest. There's no right answer. Sleep and stress often show up in hunger and energy, so these help you spot patterns. On a tough day, Tali asks for less and offers lighter options."
  /** scrolls the check-in so the disclosure sits near the top of the sheet */
  const toDisclosure = (page) => page.evaluate(() => { const bd = document.querySelector('.sheet .sheet-bd'); const m = document.querySelector('.ck-more'); if (bd && m) bd.scrollTop = m.offsetTop - 140 })

  await run('wp10-checkin', async ({ page, net }) => {
    let sheet = await openCheckin(page)
    const more = sheet.getByRole('button', { name: 'More about sleep' })
    expect((await more.getAttribute('aria-expanded')) === 'false', 'closed by default')
    expect(!(await sheet.getByText('Woke up around').count()) && !(await sheet.getByText('Roughly how long?').count()), 'nothing inside while closed')
    await sheet.getByText(B10_13).waitFor()
    await sheet.getByText("Tali doesn't read your notes. If you're struggling,", { exact: false }).waitFor()
    expect(!(await sheet.getByText('Skip anything you like.', { exact: false }).count()), 'the old foot is gone with the flag on')
    await shot(page, 'wp10-checkin-closed')
    await page.evaluate(() => { const bd = document.querySelector('.sheet .sheet-bd'); if (bd) bd.scrollTop = bd.scrollHeight })
    await shot(page, 'wp10-checkin-closed-foot')
    // open: yesterday's wake time shows only now
    await more.click()
    expect((await more.getAttribute('aria-expanded')) === 'true', 'open')
    await sheet.getByText('Roughly how long?').waitFor()
    const wake = sheet.locator('input[type="time"]')
    expect((await wake.inputValue()) === '07:10', 'pre-filled from yesterday: ' + (await wake.inputValue()))
    const bands = (await sheet.locator('.ck-bands button').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
    expect(bands.join('|') === 'Under 5 hours|5–6 hours|6–7 hours|7–8 hours|8+ hours', 'bands: ' + bands.join('|'))
    expect(!(await sheet.locator('.ck-bands button[aria-pressed="true"]').count()), 'no band preselected')
    await sheet.locator('.ck-bands button', { hasText: '6–7' }).click()
    await wake.fill('07:10')
    await sheet.getByText('A rough idea is plenty. Leave it blank if you like.').waitFor()
    const on = sheet.locator('.ck-bands button[aria-pressed="true"]')
    const bg = await on.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).boxShadow])
    const others = await sheet.locator('.ck-bands button[aria-pressed="false"]').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
    expect(others.length === 4 && new Set(others).size === 1 && !others.includes(bg[0]) && /2px/.test(bg[1]), 'band selection: ' + JSON.stringify({ bg, others }))
    await toDisclosure(page)
    await shot(page, 'wp10-checkin-open')
    // dark: the bands read on --elev inside the sheet
    await page.emulateMedia({ colorScheme: 'dark' })
    const dark = await sheet.locator('.ck-bands button[aria-pressed="false"]').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(dark === 'rgb(44, 44, 46)', 'dark band button on --elev: ' + dark)
    await page.emulateMedia({ colorScheme: 'light' })
    // "support is here" opens Support over the check-in; Escape closes Support only
    await sheet.getByRole('button', { name: 'support is here' }).click()
    const support = page.locator('.sheet', { hasText: 'Support and helplines' })
    await support.getByText('Samaritans', { exact: true }).waitFor()
    await shot(page, 'wp10-checkin-support')
    await page.keyboard.press('Escape')
    await support.waitFor({ state: 'detached' })
    expect((await sheet.locator('.ck-bands button[aria-pressed="true"]').innerText()).includes('6–7'), 'answers kept under Support')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await sheet.waitFor({ state: 'detached' })
    await page.waitForTimeout(1500)
    const st = await stored(page)
    const c = st.days[HARD_DAY].checkin
    expect(c.mood === 2 && c.sleep === 1 && c.stress === 2 && c.energy === 1, 'answers unchanged: ' + JSON.stringify(c))
    expect(c.night && c.night.source === 'self' && c.night.band === '6-7' && c.night.wakeAt === '07:10' && c.night.t, 'night: ' + JSON.stringify(c.night))
    expect(st.deviceOnly && st.deviceOnly.ui && st.deviceOnly.ui.sleepMore === true, 'open state kept on the device')
    expect(!JSON.stringify(net.posts).includes('sleepMore'), 'the open state never syncs')
    // reload and reopen: open, 6–7, 07:10, mood still Low
    await page.reload()
    sheet = await openCheckin(page)
    expect((await sheet.getByRole('button', { name: 'More about sleep' }).getAttribute('aria-expanded')) === 'true', 'still open next time')
    expect((await sheet.locator('.ck-bands button[aria-pressed="true"]').innerText()).includes('6–7'), '6–7 kept')
    expect((await sheet.locator('input[type="time"]').inputValue()) === '07:10', '07:10 kept')
    expect((await sheet.locator('.scale').first().locator('button[aria-pressed="true"]').innerText()).trim() === 'Low', 'mood still Low')
  }, { seed: hardDayWoke(), url: WB })

  await run('wp10-prefill-untouched', async ({ page }) => {
    // left open last time: yesterday's time shows, but isn't saved unless the person answers there
    const sheet = await openCheckin(page)
    expect((await sheet.getByRole('button', { name: 'More about sleep' }).getAttribute('aria-expanded')) === 'true', 'open from last time')
    expect((await sheet.locator('input[type="time"]').inputValue()) === '07:10', 'pre-filled when already open')
    await sheet.locator('.scale').first().getByRole('button', { name: 'Okay', exact: true }).click()
    await sheet.getByRole('button', { name: 'Done' }).click()
    await sheet.waitFor({ state: 'detached' })
    const c = (await stored(page)).days[HARD_DAY].checkin
    expect(c.mood === 3 && !c.night, 'no night recorded from the pre-fill alone: ' + JSON.stringify(c))
  }, { seed: (() => { const s = hardDayWoke(); s.state.deviceOnly = { ui: { sleepMore: true } }; return s })(), url: WB })

  await run('wp10-flag-off', async ({ page }) => {
    // flag off: the sheet as on main (no disclosure, the old foot, no support line)
    await page.locator('.mind-row').click()
    const sheet = page.locator('.sheet')
    await sheet.getByText('How are you feeling?').waitFor()
    expect(!(await sheet.getByText('More about sleep').count()), 'no disclosure')
    expect(!(await sheet.getByText('support is here', { exact: false }).count()) && !(await sheet.getByText(B10_13).count()), 'no flag-on feet')
    await sheet.getByText('Skip anything you like.', { exact: false }).waitFor()
    await sheet.locator('.scale').first().getByRole('button', { name: 'Okay', exact: true }).click()
    await sheet.getByRole('button', { name: 'Done' }).click()
    await sheet.waitFor({ state: 'detached' })
    const c = (await stored(page)).days[HARD_DAY].checkin
    expect(c.mood === 3 && !c.night, 'flag-off save: ' + JSON.stringify(c))
    await page.locator('.mind-row').click()
    await page.locator('.sheet').getByText('How are you feeling?').waitFor()
    await page.evaluate(() => { const bd = document.querySelector('.sheet .sheet-bd'); if (bd) bd.scrollTop = bd.scrollHeight })
    await shot(page, 'wp10-flag-off-checkin-foot')
  }, { seed: hardDayWoke() })
  // WP13: Unload (board B8), on the MIND_REVIEWED build. Every request the page makes is scanned
  // for the note text (the Supabase stand-in and anything else), and the note sits only under
  // deviceOnly on the device.
  const SENT = 'SENTINEL-UNLOAD-E2E'
  /** the hard day with one earlier note, Tuesday 6 October (board wp-b8-more) */
  const hardDayWithNote = () => {
    const s = hardDay()
    s.state.deviceOnly = { unload: { owner: UID, notes: [{ id: 'e2e-note-1', at: '2026-10-06T19:30:00.000Z', pairs: [{ mind: 'Sort the boiler service', next: 'call on Thursday' }] }] } }
    return s
  }
  const watchRequests = (page) => {
    const seen = []
    page.on('request', (r) => seen.push(r.url() + ' ' + (r.postData() || '')))
    return seen
  }
  const openUnload = async (page) => {
    await openMindTab(page)
    await page.locator('.screen.mind .mind-skills .li', { hasText: 'Unload' }).click()
    const sheet = page.locator('.sheet[aria-label="Unload"]')
    await sheet.getByText("Write what's on your mind, and one next step for each.").waitFor()
    return sheet
  }

  await run('wp13-unload', async ({ page, net }) => {
    const seen = watchRequests(page)
    const sheet = await openUnload(page)
    const done = sheet.getByRole('button', { name: 'Done', exact: true })
    expect(await done.isDisabled(), 'Done is off while empty')
    expect((await sheet.locator('.ul-pair').count()) === 1, 'one pair to start')
    await sheet.getByText("Your notes stay on this device only. They aren't synced or sent anywhere, so if you remove Tali or clear this device's data, they're gone.").waitFor()
    await sheet.getByText("Tali isn't a crisis service. In an emergency, call 999.").waitFor()
    expect((await sheet.locator('.foot').nth(1).innerText()).trim() === "Tali doesn't read your notes. If you're struggling, support is here.", 'B8.12')
    expect(!(await sheet.getByText('Earlier notes').count()), 'no Earlier notes row before any note')
    await shot(page, 'wp13-unload-empty')
    // "support is here" and the S.1 row open Support over the sheet, and close back to it
    await sheet.getByRole('button', { name: 'support is here' }).click()
    const sup = page.locator('.sheet[aria-label="Support and helplines"]')
    await sup.waitFor()
    await sup.getByRole('button', { name: 'Done' }).click()
    await sup.waitFor({ state: 'detached' })
    await sheet.getByRole('button', { name: 'Need support now?' }).click()
    await sup.waitFor()
    await sup.getByRole('button', { name: 'Done' }).click()
    await sup.waitFor({ state: 'detached' })

    // fill: a pair, then a second pair with only a next step, then the went-OK line
    await sheet.locator('.ul-pair textarea').first().fill('The deadline on Friday, and the car needs booking in. ' + SENT)
    await sheet.locator('.ul-pair input').first().fill('Block an hour on Wednesday morning')
    expect(!(await done.isDisabled()), 'Done is on once something is written')
    await sheet.getByRole('button', { name: 'Add another' }).click()
    await sheet.locator('.ul-pair input').nth(1).fill('Ring the garage ' + SENT)
    const wentOk = sheet.getByRole('button', { name: 'One thing that went OK today' })
    expect((await wentOk.getAttribute('aria-expanded')) === 'false', 'went OK starts closed')
    await wentOk.click()
    await sheet.getByPlaceholder('Optional', { exact: true }).fill('Lunch outside ' + SENT)
    await shot(page, 'wp13-unload-filled')

    await done.click()
    await sheet.waitFor({ state: 'detached' })
    await page.locator('.toast.show', { hasText: 'Saved on this device' }).waitFor()
    await page.screenshot({ path: path.join(OUT, 'wp13-unload-saved-light.png') })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.screenshot({ path: path.join(OUT, 'wp13-unload-saved-dark.png') })
    await page.emulateMedia({ colorScheme: 'light' })

    const st = await stored(page)
    const notes = st.deviceOnly && st.deviceOnly.unload && st.deviceOnly.unload.notes
    expect(notes && notes.length === 1, 'one note saved: ' + JSON.stringify(st.deviceOnly))
    expect(JSON.stringify(notes[0].pairs) === JSON.stringify([{ mind: 'The deadline on Friday, and the car needs booking in. ' + SENT, next: 'Block an hour on Wednesday morning' }, { mind: '', next: 'Ring the garage ' + SENT }]) && notes[0].ok === 'Lunch outside ' + SENT, 'pairs: ' + JSON.stringify(notes[0]))
    expect(!JSON.stringify({ ...st, deviceOnly: undefined }).includes(SENT), 'the note text sits under deviceOnly only')
    const c = st.days[HARD_DAY].checkin
    expect(c.mood === 2 && (c.skills || []).some((s) => s.id === 'unload'), 'skill logged, mood kept: ' + JSON.stringify(c))

    // the skill use syncs (so the scan below saw real uploads), the note never does
    for (let i = 0; i < 20 && !net.posts.some((p) => p.t === 'day_logs' && JSON.stringify(p.list).includes('unload')); i++) await page.waitForTimeout(300)
    expect(net.posts.some((p) => p.t === 'day_logs' && JSON.stringify(p.list).includes('"unload"')), 'the skill use synced')
    const leaks = seen.filter((s) => s.includes(SENT) || s.includes('deviceOnly'))
    expect(!leaks.length, 'a request carried note text: ' + leaks.join(' | ').slice(0, 300))
    expect(seen.length > 0, 'requests were watched')

    // Earlier notes: newest first, no count, Delete
    const again = await openUnload(page)
    const row = again.getByRole('button', { name: 'Earlier notes' })
    expect(/^Earlier notes$/.test((await row.innerText()).trim()), 'no count on the row')
    await row.click()
    const list = page.locator('.sheet[aria-label="Earlier notes"]')
    const items = list.locator('.ul-notes .li')
    expect((await items.count()) === 1, 'one note listed')
    const text = (await items.first().innerText()).replace(/\s+/g, ' ')
    expect(text.includes('Thursday 8 October') && text.includes('The deadline on Friday, and the car needs booking in. ' + SENT + '. Next step: Block an hour on Wednesday morning') && text.includes('Next step: Ring the garage ' + SENT) && text.includes('Lunch outside ' + SENT), 'note: ' + text)
    await items.first().getByRole('button', { name: /^Delete/ }).click()
    await page.locator('.sheet[aria-label="Unload"]').waitFor()
    expect(!(await page.locator('.sheet').getByText('Earlier notes').count()), 'no row once the last note is gone')
    const after = await stored(page)
    expect(!JSON.stringify(after).includes(SENT), 'deleted on the device')
    expect(!seen.some((s) => s.includes(SENT)), 'still no request with the note text')
  }, { seed: hardDay(), url: WBR })

  await run('wp13-unload-earlier', async ({ page }) => {
    const sheet = await openUnload(page)
    await sheet.locator('.ul-pair textarea').fill('Work is a lot this week')
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await sheet.waitFor({ state: 'detached' })
    const again = await openUnload(page)
    await again.getByRole('button', { name: 'Earlier notes' }).click()
    const list = page.locator('.sheet[aria-label="Earlier notes"]')
    const days = (await list.locator('.ul-notes .li .t').allTextContents()).map((s) => s.trim())
    expect(JSON.stringify(days) === JSON.stringify(['Thursday 8 October', 'Tuesday 6 October']), 'newest first: ' + days.join(', '))
    await list.getByText('Sort the boiler service. Next step: call on Thursday').waitFor()
    await shot(page, 'wp13-unload-earlier')
    // Back keeps the sheet open on the form
    await list.getByRole('button', { name: 'Unload' }).click()
    await page.locator('.sheet[aria-label="Unload"]').getByText('Earlier notes').waitFor()
  }, { seed: hardDayWithNote(), url: WBR })

  await run('wp13-unload-offline', async ({ page, ctx }) => {
    // signed in, offline: Unload still saves on this device (signedIn, never authed)
    const seen = watchRequests(page)
    await page.locator('nav.tabbar').waitFor()
    await ctx.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    const sheet = await openUnload(page)
    await sheet.locator('.ul-pair textarea').fill('Offline thought ' + SENT)
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await sheet.waitFor({ state: 'detached' })
    await page.locator('.toast.show', { hasText: 'Saved on this device' }).waitFor()
    const st = await stored(page)
    expect(JSON.stringify(st.deviceOnly).includes('Offline thought'), 'saved offline')
    await ctx.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await page.waitForTimeout(2500)
    expect(!seen.some((s) => s.includes(SENT)), 'no request carried the note after reconnecting')
  }, { seed: hardDay(), url: WBR })
  // WP7: Summary on a hard day and the one prompt slot (board B2, B9)
  const PLAN_DUE = [{ id: 'e2e-plan-1', when: 'after work', then: 'walk home the long way', created: '2026-09-01', reviews: [] }]
  const SUPPS = [{ id: 's1', name: 'Vitamin D', time: '08:00' }, { id: 's2', name: 'Creatine', time: '08:00' }]
  // reviewWeight: the weight tile shows the number (main's opt-in, ml-c4); lastReviewAt: the weekly review
  // (main) isn't waiting, so the plan review banner is the one that shows (on review days it waits for it)
  const wp7Hard = (patch = {}) => { const s = hardDay(); Object.assign(s.state.profile, { plans: PLAN_DUE, supplements: SUPPS, reviewWeight: true, lastReviewAt: HARD_DAY }, patch); return s }
  const sumMind = (page) => page.locator('section.wb-mind')
  const foodKcal = async (page) => (await page.locator('section[aria-labelledby="sum-food"] .kbig .num').first().innerText()).trim()

  await run('wp7-hard-day', async ({ page }) => {
    const card = sumMind(page)
    await card.getByText('Feeling low').waitFor()
    await card.getByText(/^Checked in at \d\d:\d\d$/).waitFor()
    await card.getByText('A lighter day is still a good day.').waitFor()
    await card.getByText("One thing for today, if you'd like:").waitFor()
    const chips = (await card.locator('.wb-things .chip').allTextContents()).map((s) => s.trim())
    // MIND_REVIEWED off: the Reset chip opens a skill screen, so only Get outside (no food chip)
    expect(chips.join() === 'Get outside for 10 minutes', 'chips: ' + chips.join(' | '))
    // exactly one ask, and the slot under the card is empty: the due plan review waits
    expect(!(await page.getByText('How are your plans going?').count()), 'plan review held on a hard day')
    expect(!(await page.locator('.pillars > .banner, .pillars > .dayopt').count()), 'prompt slot empty')
    expect(!(await page.getByText('Worth a quick check').count()), 'no quick check')
    expect(!(await page.getByText('Rough night? Your usuals are first today.').count()), 'no B2.33 line')
    // Food: numbers unchanged, usuals start with Same as yesterday (R1 to R3)
    expect((await foodKcal(page)) === '0', 'Food card 0 kcal')
    const rows = page.locator('.li', { has: page.locator('.t') })
    const same = page.locator('.li.wb-same')
    expect((await same.locator('.s').innerText()).trim() === 'Porridge, made with milk and Banana (1 ~118g) · 306 kcal', 'same row: ' + (await same.locator('.s').innerText()))
    const usual = (await page.locator('.lbl', { hasText: 'Your usual breakfast' }).locator('xpath=following-sibling::div[1]').locator('.li .t').allTextContents()).map((s) => s.trim())
    expect(usual[0] === 'Same as yesterday' && usual.length >= 2, 'usual list: ' + usual.join(' | '))
    void rows
    // Move: the lighter choices named (B2.26)
    await page.locator('section[aria-labelledby="sum-move"]').getByText('5 exercises · lighter choices today').waitFor()
    // Weight: when it was, no weekly change, no sparkline (R5, R6). Since main's maintenance loop
    // (merged 9 Oct) the tile shows a number only for people who chose to include weight
    // (reviewWeight), with the day it was; on a hard day it drops the trend words too
    const wt = page.locator('.tile', { has: page.locator('.tk', { hasText: 'Weight' }) })
    expect((await wt.locator('.v').innerText()).replace(/\s+/g, '') === '81.8kg', 'weight value: ' + (await wt.locator('.v').innerText()))
    expect((await wt.locator('.s').innerText()).trim() === 'Wednesday', 'weight sub (the day it was): ' + (await wt.locator('.s').innerText()))
    expect(!(await wt.locator('svg, .wt-trend').count()), 'no sparkline, no trend words')
    await page.locator('.tile', { hasText: 'Supplements' }).waitFor()
    await shot(page, 'wp7-hard-day')
    await page.evaluate(() => window.scrollTo(0, 700))
    await shot(page, 'wp7-hard-day-lower')
    await page.evaluate(() => window.scrollTo(0, 0))
    // one tap on Same as yesterday adds exactly 306 kcal
    await same.click()
    await page.waitForFunction(() => document.querySelector('section[aria-labelledby="sum-food"] .kbig .num')?.textContent?.trim() === '306')
    expect(!(await page.locator('.li.wb-same').count()), 'row gone once breakfast has entries')
    // the one thing: pick, Done, Make it a plan (WP14's hook opens the plan sheet)
    await card.locator('.wb-things .chip', { hasText: 'Get outside for 10 minutes' }).click()
    await card.getByText('Today: Get outside for 10 minutes').waitFor()
    await shot(page, 'wp7-thing-picked')
    await card.getByRole('button', { name: 'Change', exact: true }).click()
    await card.locator('.wb-things .chip').first().click()
    await card.getByRole('button', { name: 'Done', exact: true }).click()
    await card.locator('.wb-done', { hasText: 'Got outside' }).waitFor()
    expect((await stored(page)).days[HARD_DAY].checkin.thing.key === 'outside-10', 'thing stored')
    expect((await stored(page)).days[HARD_DAY].checkin.mood === 2, 'mood kept')
    await shot(page, 'wp7-thing-done')
    await card.getByRole('button', { name: 'Make it a plan', exact: true }).click()
    await page.locator('.sheet').getByText('New plan').waitFor()
    await page.locator('.sheet').getByRole('button', { name: 'Cancel' }).click().catch(() => page.keyboard.press('Escape'))
    await page.locator('.sheet').waitFor({ state: 'detached' })
    // the card opens the Mind tab
    await card.locator('.wb-mind-row').click()
    await page.locator('.hdr .ltitle', { hasText: 'Mind' }).waitFor()
  }, { url: WB, seed: wp7Hard() })

  await run('wp7-hard-day-reviewed', async ({ page }) => {
    const chips = (await sumMind(page).locator('.wb-things .chip').allTextContents()).map((s) => s.trim())
    expect(chips.join() === '2-minute Reset,Get outside for 10 minutes', 'chips: ' + chips.join(' | '))
    await shot(page, 'wp7-hard-day-reviewed')
  }, { url: WBR, seed: wp7Hard() })

  await run('wp7-before-checkin', async ({ page }) => {
    const card = sumMind(page)
    await card.getByText('How are you today?').waitFor()
    await card.getByText('Mood, sleep, stress and energy · 20 seconds').waitFor()
    expect(!(await card.getByText('A lighter day').count()) && !(await card.locator('.chip').count()), 'no lighter line or chips before the check-in')
    await shot(page, 'wp7-before-checkin')
    await card.getByRole('button', { name: 'Check in', exact: true }).click()
    await page.locator('.sheet').getByText('How are you feeling?').waitFor()
  }, { url: WB, seed: (() => { const s = wp7Hard(); delete s.state.days[HARD_DAY].checkin; return s })() })

  await run('wp7-gentle', async ({ page }) => {
    const same = page.locator('.li.wb-same .s')
    expect((await same.innerText()).trim() === 'Porridge, made with milk and Banana (1 ~118g)', 'gentle: no kcal: ' + (await same.innerText()))
    expect(!(await page.locator('.li .s', { hasText: 'kcal' }).count()), 'no kcal on usual rows')
    await shot(page, 'wp7-gentle')
  }, { url: WB, seed: wp7Hard({ gentle: true }) })

  await run('wp7-food-off', async ({ page }) => {
    await sumMind(page).getByText('A lighter day is still a good day.').waitFor()
    expect(!(await page.locator('section[aria-labelledby="sum-food"]').count()), 'no Food card')
    expect(!(await page.getByText('Your usual breakfast').count()), 'no usuals')
    expect(!(await page.locator('.tile', { has: page.locator('.tk', { hasText: 'Weight' }) }).count()), 'no weight tile')
    await page.locator('.tile', { hasText: 'Supplements' }).waitFor()
    await page.locator('section[aria-labelledby="sum-move"]').waitFor()
    await shot(page, 'wp7-food-off')
  }, { url: WB, seed: wp7Hard({ mind: { off: ['food'] } }) })

  await run('wp7-mind-move-off', async ({ page }) => {
    await page.locator('section[aria-labelledby="sum-food"]').waitFor()
    expect(!(await page.locator('section.wb-mind, .mind-row').count()), 'no Mind card')
    expect(!(await page.locator('section[aria-labelledby="sum-move"]').count()), 'no Move card')
    await shot(page, 'wp7-mind-move-off')
  }, { url: WB, seed: wp7Hard({ mind: { off: ['mind', 'move'] } }) })

  await run('wp7-ordinary', async ({ page }) => {
    // past the first two weeks, with a due plan review: the banner shows within the budget
    const card = sumMind(page)
    await card.getByText('Feeling good').waitFor()
    expect(!(await card.getByText('A lighter day').count()), 'no lighter line')
    await page.getByText('How are your plans going?').waitFor()
    const chips = (await card.locator('.wb-things .chip').allTextContents()).map((s) => s.trim())
    expect(chips.join() === 'Lunch somewhere you like,Get outside at lunch', 'chips: ' + chips.join(' | '))
    expect(!(await page.locator('.li.wb-same').count()), 'no Same as yesterday row on an ordinary day')
    const wt = page.locator('.tile', { has: page.locator('.tk', { hasText: 'Weight' }) })
    expect((await wt.locator('.s').innerText()).trim() !== 'Last weigh-in', 'ordinary weight sub')
    await shot(page, 'wp7-ordinary')
  }, { url: WB, seed: (() => { const o = ordinaryDay(); o.state.days[shift(ORDINARY_DAY, -40)] = dayOf({ foods: BREAKFAST.map((f) => ({ ...f })), weight: 82.4 }); o.state._meta.days[shift(ORDINARY_DAY, -40)] = { u: ORDINARY_DAY + 'T07:00:00.000Z', dirty: false }; Object.assign(o.state.profile, { plans: PLAN_DUE, supplements: SUPPS, reviewWeight: true, lastReviewAt: ORDINARY_DAY }); return o })() })

  await run('wp7-flag-off', async ({ page }) => {
    await page.locator('.mind-row').waitFor()
    expect(!(await page.locator('section.wb-mind, .li.wb-same').count()), 'no flag-on Mind card or Same as yesterday row')
    expect(!(await page.getByText('A lighter day is still a good day.').count()), 'no lighter line')
    await page.getByText('How are your plans going?').waitFor()
    expect(!(await page.getByText('lighter choices today').count()), 'Move sub as today')
    const wt = page.locator('.tile', { has: page.locator('.tk', { hasText: 'Weight' }) })
    expect((await wt.locator('.s').innerText()).trim() !== 'Last weigh-in', 'weight sub as today')
    expect((await foodKcal(page)) === '0', 'Food card 0 kcal')
    await shot(page, 'wp7-flag-off')
  }, { seed: wp7Hard() })

  /* ---------- WP11: the weekly reflection (B4) on the Mind page ---------- */
  /** a seed past the first two weeks (asks.ts holds the reflection back before day 14): a day 30 days back */
  const settledIn = (seed) => { const d = shift(seed.at, -30); seed.state.days[d] = dayOf({ foods: BREAKFAST.map((f) => ({ ...f })) }); seed.state._meta.days[d] = { ...seed.state._meta.days[seed.at] }; return seed }
  /** B4 state B, Sat 10 Oct (week 5–11 Oct): 5 check-ins, mostly 6 to 7 hours, Reset twice and Unload once,
   * 1 plan reviewed; over 14 days long nights with energy OK or Good, shorter ones Low (one observation) */
  const reflectionWeek = () => {
    const days = {}
    const night = (d, band) => ({ source: 'self', band, t: d + 'T07:30:00.000Z' })
    const add = (d, energy, band, skills = []) => {
      days[d] = dayOf({ checkin: { ...ci(d, 4, 2, 2, energy), night: night(d, band), ...(skills.length ? { skills: skills.map((id, i) => ({ id, at: d + `T1${i}:00:00.000Z` })) } : {}) } })
    }
    add('2026-10-05', 1, '6-7', ['reset']); add('2026-10-06', 1, '6-7'); add('2026-10-07', 3, '7-8', ['reset', 'unload']); add('2026-10-08', 1, '6-7'); add(ORDINARY_DAY, 3, '7-8')
    for (let n = 1; n <= 7; n++) add(shift('2026-10-05', -n), n % 2 ? 3 : 1, n % 2 ? '8+' : '5-6')
    const plans = [{ id: 'aaaaaaaa-1111-4222-8333-444444444444', when: 'When I sit down after work', then: 'I will step outside for five minutes', created: '2026-09-01T08:00:00.000Z',
      lastReview: '2026-10-07', reviews: [{ d: '2026-09-30', r: 'mixed' }, { d: '2026-10-07', r: 'worked' }] }]
    return settledIn({ at: ORDINARY_DAY, state: deviceState({ days, profile: { ...PROFILE, plans }, schedule: { ...SCHEDULE }, at: ORDINARY_DAY }) })
  }
  const weekCard = (page) => page.locator('.screen.mind section.mind-week')
  const noOf7 = async (page) => expect(!/\d+ of 7\b/.test(await page.locator('.screen.mind').innerText()), 'a count "of 7" on the Mind page')

  await run('wp11-reflection-a', async ({ page }) => {
    // ordinary day, under 8 data points: state A
    await openMindTab(page)
    const main = page.locator('.screen.mind')
    await main.locator('.mind-week-h', { hasText: 'Your week' }).getByText('5–11 Oct').waitFor()
    const card = weekCard(page)
    await card.getByText('4 check-ins this week', { exact: true }).waitFor()
    await card.getByText('Not enough answers yet', { exact: true }).waitFor()
    await card.getByText('Patterns from your own answers can show up here over time.', { exact: true }).waitFor()
    expect(await card.locator('.mind-bands').count() === 0, 'a band strip with no sleep answers')
    expect(await card.locator('.mind-obs').count() === 0, 'an observation under 8 data points')
    const text = await card.innerText()
    expect(!/Skills|Plans|Food|Weight|kcal/.test(text), 'a line that should be left out: ' + text)
    await noOf7(page)
    await card.scrollIntoViewIfNeeded()
    await shot(page, 'wp11-reflection-a')
    // "See your whole week" goes to Summary's This week
    await card.getByRole('button', { name: 'See your whole week' }).click()
    await page.locator('#sum-week').waitFor()
  }, { seed: settledIn(ordinaryDay()), url: WB })

  await run('wp11-reflection-b', async ({ page }) => {
    await openMindTab(page)
    const card = weekCard(page)
    await card.getByText('5 check-ins this week', { exact: true }).waitFor()
    await card.getByText('Mostly 6 to 7 hours', { exact: true }).waitFor()
    await card.getByText('Reset twice, Unload once', { exact: true }).waitFor()
    await card.getByText('1 plan reviewed', { exact: true }).waitFor()
    const strip = card.locator('.mind-bands')
    expect((await strip.getAttribute('aria-hidden')) === 'true', 'the band strip is not aria-hidden')
    expect(await strip.locator('.mind-band').count() === 5 && await strip.locator('.mind-band.on').count() === 1, 'five segments, one filled')
    expect((await strip.locator('.mind-band').nth(2).getAttribute('class')).includes('on'), 'the 6–7 segment is the filled one')
    const bg = await strip.locator('.mind-band.on').evaluate((e) => getComputedStyle(e).backgroundColor)
    const band = await page.evaluate(() => { const s = document.createElement('span'); s.style.background = 'var(--band)'; document.body.append(s); const c = getComputedStyle(s).backgroundColor; s.remove(); return c })
    expect(bg === band, `filled segment ${bg}, --band ${band}`)
    const obs = card.locator('.mind-obs')
    await obs.getByRole('heading', { name: 'Something in your answers' }).waitFor()
    expect(/^Over the last two weeks, on nights .*7 hours.* you more often rated energy OK or Good\.$/.test((await obs.locator('.mind-obs-t').innerText()).trim()), 'the observation line')
    await obs.getByText('Just a pattern in your own answers, not a rule.', { exact: true }).waitFor()
    expect(await card.getByText('Patterns from your own answers can show up here over time.').count() === 0, 'the later line beside an observation')
    expect(!/Food|Weight|kcal|weigh/.test(await card.innerText()), 'a food or weight line')
    await noOf7(page)
    await card.scrollIntoViewIfNeeded()
    await shot(page, 'wp11-reflection-b')
    await page.locator('.screen.mind .mind-wellness').scrollIntoViewIfNeeded()
    await shot(page, 'wp11-reflection-b-foot')
  }, { seed: reflectionWeek(), url: WB })

  await run('wp11-reflection-held', async ({ page }) => {
    // the first two weeks: no reflection yet (asks.ts holds it back before day 14)
    await openMindTab(page)
    await page.locator('.screen.mind .mind-plans').waitFor()
    expect(await page.locator('.screen.mind .mind-week-h').count() === 0, 'the reflection shows in the first two weeks')
  }, { seed: ordinaryDay(), url: WB })

  await run('wp11-reflection-food-off', async ({ page }) => {
    await openMindTab(page)
    const card = weekCard(page)
    await card.getByText('Mostly 6 to 7 hours', { exact: true }).waitFor()
    expect(await card.getByRole('button', { name: 'See your whole week' }).count() === 0, 'the link with Food off')
  }, { seed: (() => { const s = reflectionWeek(); s.state.profile.mind = { off: ['food'] }; return s })(), url: WB })

  /* ---------- WP12: Reset with the P6 Glow pacer (B7, canvas 8c), MIND_REVIEWED build ---------- */
  const R = {
    sub: 'A few slow breaths. Eyes open is fine.',
    stop: 'Stop any time. If this makes you feel worse, try a walk instead.',
    dizzy: 'If you feel dizzy or uncomfortable, breathe normally.',
    back: 'Come back to this whenever you like.',
    reduced: 'Motion is reduced on this device, so follow the words.',
  }
  /** Mind tab → Reset, then pause the clock so the pacer only moves when the scenario steps it */
  const openReset = async (page) => {
    await openMindTab(page)
    await page.locator('.mind-skills').getByRole('button', { name: /^Reset/ }).click()
    const scr = page.locator('.screen.reset')
    await scr.locator('.ltitle', { hasText: 'Reset' }).waitFor()
    const now = await page.evaluate(() => Date.now())
    await page.clock.pauseAt(now + 1000)
    return scr
  }
  /** the pacer's word, count and sphere scale now */
  const pacerNow = (scr) => scr.evaluate((el) => {
    const t = (s) => (el.querySelector(s)?.textContent || '').trim()
    const sph = el.querySelector('.reset-glow .sph')
    return { word: t('.cnt .p'), count: t('.cnt .n'), left: t('.reset-left'), sphere: sph ? sph.style.transform : '', phase: el.querySelector('.reset-glow')?.getAttribute('data-phase') }
  })
  /** both schemes without waiting on the (paused) clock */
  const still = async (page, name) => {
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.waitForTimeout(150)
      await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`) })
    }
    await page.emulateMedia({ colorScheme: 'light' })
  }
  /** step the clock in 250 ms slices until `until(state)` holds; returns every state seen */
  const stepUntil = async (page, scr, until, maxMs = 30000) => {
    const seen = []
    for (let t = 0; t <= maxMs; t += 250) {
      const s = await pacerNow(scr)
      seen.push(s)
      if (until(s)) return seen
      await page.clock.runFor(250)
    }
    throw new Error('pacer never reached the state; last ' + JSON.stringify(seen[seen.length - 1]))
  }
  const resetSkills = async (page) => ((await stored(page)).days[HARD_DAY].checkin.skills || []).filter((x) => x.id === 'reset')

  await run('wp12-reset', async ({ page }) => {
    const scr = await openReset(page)
    // ready: Back "Mind", the avatar, sub, 1/2/5 min with 2 selected, how-to, the sphere at rest, Start, foot
    await scr.locator('.pv-back').getByRole('button', { name: 'Mind' }).waitFor()
    expect((await scr.locator('.hdr-row.av').getByRole('button', { name: 'Profile', exact: true }).count()) === 1, 'the Profile avatar beside the title')
    await scr.getByText(R.sub).waitFor()
    expect((await scr.locator('.seg [aria-checked="true"]').textContent()).trim() === '2 min', '2 min selected')
    for (const s of [R.stop, R.dizzy, 'Need support now?', 'For everyday wellbeing. Not a treatment for any condition.']) await scr.getByText(s, { exact: true }).waitFor()
    expect(!(await scr.locator('.cnt').count()) && !(await scr.locator('.reset-left').count()), 'no count or time before Start')
    expect((await pacerNow(scr)).sphere === 'scale(0.8)', 'sphere at rest')
    // mind tokens: a crisp --mind rim on the sphere, the phase word in --mind-ink (checked once running)
    const tokColor = (v) => scr.evaluate((el, v) => { const d = document.createElement('span'); d.style.color = `var(${v})`; el.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c }, v)
    const sphShadow = await scr.locator('.reset-glow .sph').evaluate((e) => getComputedStyle(e).boxShadow)
    expect(sphShadow.includes(await tokColor('--mind')) && sphShadow.includes('inset'), 'sphere rim in --mind: ' + sphShadow)
    await still(page, 'wp12-reset-ready')

    await scr.getByRole('button', { name: 'Start', exact: true }).click()
    expect(!(await scr.getByText(R.sub).count()), 'running hides the sub, length and how-to (Glow boards)')
    expect(!(await scr.getByText(R.reduced).count()), 'no reduced-motion line with motion on')
    await page.clock.runFor(1500)
    const mid = await pacerNow(scr)
    expect(mid.word === 'Breathe in' && mid.count === '2', 'mid breath in: ' + JSON.stringify(mid))
    expect(/^\d+:\d\d left$/.test(mid.left), 'time left line: ' + mid.left)
    const sc = Number((mid.sphere.match(/[\d.]+/) || [0])[0])
    expect(sc > 0.8 && sc < 1, 'the sphere grows on the breath in: ' + mid.sphere)
    const wordColor = await scr.locator('.cnt .p').evaluate((e) => getComputedStyle(e).color)
    const numFont = await scr.locator('.cnt .n').evaluate((e) => { const c = getComputedStyle(e); return [c.fontSize, c.fontWeight, c.fontVariantNumeric].join(' ') })
    expect(numFont.startsWith('112px 200') && numFont.includes('tabular-nums'), 'count type: ' + numFont)
    expect(wordColor === (await tokColor('--mind-ink')), 'phase word in --mind-ink: ' + wordColor)
    await still(page, 'wp12-reset-in')

    // words step in order and counts go up within each phase (timings from skills.ts)
    const seen = await stepUntil(page, scr, (s) => s.word === 'Breathe out' && Number(s.count) >= 3)
    const words = seen.map((s) => s.word).filter((w, i, a) => w && w !== a[i - 1])
    expect(JSON.stringify(words) === JSON.stringify(['Breathe in', 'And in again', 'Breathe out']), 'words: ' + words.join(' → '))
    for (let i = 1; i < seen.length; i++) if (seen[i].word === seen[i - 1].word) expect(Number(seen[i].count) >= Number(seen[i - 1].count), 'counts up')
    const outSc = Number(((await pacerNow(scr)).sphere.match(/[\d.]+/) || [0])[0])
    expect(outSc < 1, 'settling on the breath out')
    await still(page, 'wp12-reset-out')

    // stop early: quietly, B7.15 only, never the time done, nothing logged
    await scr.getByRole('button', { name: 'Stop', exact: true }).click()
    await scr.locator('.reset-end').getByText(R.back, { exact: true }).waitFor()
    expect(!(await scr.getByText(/That’s|That's/).count()), 'no partial time after a stop')
    expect(!(await scr.locator('.reset-left, .cnt').count()), 'no time left after a stop')
    await page.clock.runFor(3000)
    expect(!(await resetSkills(page)).length, 'a stopped run is not logged')
    await still(page, 'wp12-reset-stopped')
    await scr.getByRole('button', { name: 'Done', exact: true }).click()
    await page.locator('.screen.mind').waitFor()
  }, { seed: hardDay(), url: WBR, fakeClock: true })

  await run('wp12-reset-finish', async ({ page }) => {
    const scr = await openReset(page)
    const before = (await stored(page)).days[HARD_DAY].checkin
    await scr.locator('.seg').getByRole('radio', { name: '1 min' }).click()
    await scr.getByRole('button', { name: 'Start', exact: true }).click()
    await page.clock.runFor(75000)
    await scr.locator('.reset-end').getByText('That’s 1 minute.', { exact: true }).waitFor()
    await scr.locator('.reset-end').getByText(R.back, { exact: true }).waitFor()
    await page.clock.runFor(3000)
    const after = (await stored(page)).days[HARD_DAY].checkin
    expect((await resetSkills(page)).length === 1, 'a finished run is logged once: ' + JSON.stringify(after.skills))
    expect(after.mood === before.mood && after.sleep === before.sleep && after.stress === before.stress, 'the check-in answers are untouched')
    await still(page, 'wp12-reset-finished')
  }, { seed: hardDay(), url: WBR, fakeClock: true })

  await run('wp12-reset-reduced', async ({ page }) => {
    const scr = await openReset(page)
    await scr.getByRole('button', { name: 'Start', exact: true }).click()
    await scr.getByText(R.reduced, { exact: true }).waitFor()
    await page.clock.runFor(1500)
    const first = await pacerNow(scr)
    expect(first.word === 'Breathe in', 'reduced: word steps: ' + JSON.stringify(first))
    const seen = await stepUntil(page, scr, (s) => s.word === 'Breathe out' && Number(s.count) >= 3)
    const words = seen.map((s) => s.word).filter((w, i, a) => w && w !== a[i - 1])
    expect(JSON.stringify(words) === JSON.stringify(['Breathe in', 'And in again', 'Breathe out']), 'reduced words: ' + words.join(' → '))
    const scales = [...new Set(seen.map((s) => s.sphere))]
    expect(scales.length === 1 && scales[0] === 'scale(0.9)', 'reduced: the sphere holds a middle size: ' + scales.join(', '))
    expect(new Set(seen.map((s) => s.count)).size > 2, 'reduced: the count still steps')
    await still(page, 'wp12-reset-reduced')
  }, { seed: hardDay(), url: WBR, fakeClock: true, reducedMotion: true })

  // WP17: Profile › Notifications (board B11): the Mind reminder types, "Your times", the back-off notice
  const openNotify = async (page) => {
    await page.locator('nav.tabbar').waitFor()
    const hdrBtn = page.locator('.hdr').getByRole('button', { name: 'Profile', exact: true }).first()
    if (await hdrBtn.count()) await hdrBtn.click(); else await tab(page, 'Profile')
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    const lbl = page.locator('.screen .lbl', { hasText: /^Notifications$/ })
    await lbl.waitFor()
    await lbl.scrollIntoViewIfNeeded()
    await page.evaluate(() => { const el = [...document.querySelectorAll('.screen .lbl')].find((x) => x.textContent.trim() === 'Notifications'); window.scrollBy(0, el.getBoundingClientRect().top - 60) })
    return page.locator('.screen')
  }
  const notifyRows = async (page) => {
    const lbl = page.locator('.screen .lbl', { hasText: /^Notifications$/ })
    // the first .list.icons after the Notifications label
    return (await page.evaluate(() => {
      const el = [...document.querySelectorAll('.screen .lbl')].find((x) => x.textContent.trim() === 'Notifications')
      let n = el.nextElementSibling
      while (n && !n.matches('.list.icons')) n = n.nextElementSibling
      return n ? [...n.querySelectorAll('.li .t')].map((x) => x.textContent.trim()) : []
    })) || (void lbl)
  }
  const B11_FOOT = "Tali sends at most one of these a day, and nothing after your wind-down time or before you're usually up. Supplement reminders come at the times you set."
  const B11_14 = 'The last 2 check-in reminders went unopened, so Tali now sends them half as often. Nothing you need to do.'
  const swn = (page, name) => page.getByRole('switch', { name, exact: true })

  await run('wp17-notify-off', async ({ page }) => {
    await openNotify(page)
    const rows = await notifyRows(page)
    expect(JSON.stringify(rows) === JSON.stringify(['Check-in', 'Wind-down', 'Plan check-in', 'Supplement reminders', 'Weekly review reminder']), 'rows: ' + rows.join(', '))
    for (const n of ['Check-in reminders', 'Wind-down reminders', 'Plan check-in reminders']) expect((await swn(page, n).getAttribute('aria-checked')) === 'false', n + ' off by default')
    await page.getByText("A morning reminder, after you're usually up", { exact: true }).waitFor()
    await page.getByText('Your times', { exact: true }).waitFor()
    expect((await page.locator('#nf-wake').inputValue()) === '07:00' && (await page.locator('#nf-wind').inputValue()) === '22:30', 'default times')
    await page.getByText(B11_FOOT, { exact: true }).waitFor()
    expect(!(await page.getByText(/lock screen|supplement names/i).count()), 'no names setting (B11b not approved)')
    expect(!(await page.locator('.banner.nf-back').count()), 'no back-off notice')
    const m = ((await stored(page)) || {}).profile?.mind || {}
    expect(!m.notify && !m.tz, 'nothing saved by opening Profile: ' + JSON.stringify(m))
    await shot(page, 'wp17-notify-off')
  }, { url: WB, seed: ordinaryDay() })

  await run('wp17-notify-on', async ({ page, ctx }) => {
    await page.locator('nav.tabbar').waitFor()
    // headless Chromium reports notifications as blocked whatever is granted: stand in for a phone
    // where the person allows them (the prompt itself can't be shown headless)
    await ctx.grantPermissions(['notifications'], { origin: new URL(page.url()).origin })
    await ctx.addInitScript(() => {
      let p = 'default'
      const N = function () {}
      Object.defineProperty(N, 'permission', { get: () => p })
      N.requestPermission = async () => { p = 'granted'; return p }
      window.Notification = N
    })
    await page.reload()
    await openNotify(page)
    await swn(page, 'Check-in reminders').click()
    await page.getByText('Reminders on', { exact: true }).waitFor()
    await swn(page, 'Wind-down reminders').click()
    await swn(page, 'Plan check-in reminders').click()
    await page.waitForTimeout(400)
    for (const n of ['Check-in reminders', 'Wind-down reminders', 'Plan check-in reminders']) expect((await swn(page, n).getAttribute('aria-checked')) === 'true', n + ' on')
    const st = await stored(page)
    const m = st.profile.mind
    expect(m.notify.checkin === true && m.notify['wind-down'] === true && m.notify.plan === true, 'saved: ' + JSON.stringify(m))
    expect(m.tz === 'Europe/London' && st.profile.answeredAt['mind.tz'] && st.profile.answeredAt['mind.notify'], 'time zone from the device: ' + JSON.stringify(m))
    // the rows show when each goes: the check-in 90 minutes after the usual wake time
    const vals = await page.evaluate(() => [...document.querySelectorAll('.screen .list.icons .li')].filter((li) => li.querySelector('[role=switch][aria-label$="reminders"]')).map((li) => (li.querySelector('.tr')?.textContent || '').trim()))
    expect(vals[0] === '08:30' && vals[1] === '22:30' && vals[2] === '', 'row times: ' + vals.join(','))
    // a new wake time moves the check-in, and is saved (health data, with the yes)
    await page.locator('#nf-wake').fill('06:30')
    await page.waitForTimeout(300)
    expect(((await stored(page)).profile.mind || {}).wakeAt === '06:30', 'wake time saved')
    await page.getByText('08:00', { exact: true }).waitFor()
    await page.locator('#nf-wake').fill('07:00')
    await page.waitForTimeout(300)
    await page.locator('#nf-wake').blur()
    await shot(page, 'wp17-notify-on')
    // off again: saved as off, the others stay on
    await swn(page, 'Plan check-in reminders').click()
    await page.waitForTimeout(300)
    expect((await stored(page)).profile.mind.notify.plan === false, 'plan off')
  }, { url: WB, seed: ordinaryDay() })

  await run('wp17-notify-consent', async ({ page }) => {
    await openNotify(page)
    await swn(page, 'Check-in reminders').click()
    await page.getByText('Reminders start once you’ve agreed in Profile, then Privacy.', { exact: true }).waitFor()
    expect((await swn(page, 'Check-in reminders').getAttribute('aria-checked')) === 'false', 'still off')
    expect(!(((await stored(page)) || {}).profile?.mind || {}).notify, 'nothing saved without a current health yes')
  }, { url: WB, seed: (() => { const o = ordinaryDay(); o.state.consents = { records: [{ ...GRANTED.records[0], granted: false, at: '2026-10-01T08:00:00.000Z' }] }; return o })() })

  await run('wp17-backoff', async ({ page }) => {
    await page.locator('nav.tabbar').waitFor()
    // the service worker's log: two check-in reminders shown and not opened (written as sw.js does)
    await page.evaluate(() => new Promise((res, rej) => {
      const r = indexedDB.open('tali-notify', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('events', { autoIncrement: true })
      r.onerror = () => rej(r.error)
      r.onsuccess = () => {
        const tx = r.result.transaction('events', 'readwrite')
        const s = tx.objectStore('events')
        s.add({ kind: 'checkin', at: '2026-10-08T07:30:00.000Z', ev: 'shown' })
        s.add({ kind: 'checkin', at: '2026-10-09T07:30:00.000Z', ev: 'shown' })
        s.add({ kind: 'checkin', at: '2026-10-10T07:30:00.000Z', ev: 'shown' })
        tx.oncomplete = () => { r.result.close(); res() }
      }
    }))
    // Tali comes back to the front: it reads and empties the log
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('leanplan.v1')).profile.mind || {}).halved?.checkin)
    const left = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('tali-notify'); r.onsuccess = () => { const q = r.result.transaction('events').objectStore('events').count(); q.onsuccess = () => { res(q.result); r.result.close() } } }))
    expect(left === 0, 'the log was emptied: ' + left)
    await openNotify(page)
    const b = page.locator('.banner.nf-back')
    await b.getByText(B11_14, { exact: true }).waitFor()
    await b.getByRole('button', { name: 'Back to usual' }).waitFor()
    const x = await b.getByRole('button', { name: 'Dismiss' }).boundingBox()
    expect(x && x.width >= 44 && x.height >= 44, 'dismiss target: ' + JSON.stringify(x))
    await shot(page, 'wp17-backoff')
    await b.getByRole('button', { name: 'Back to usual' }).click()
    await b.waitFor({ state: 'detached' })
    expect(!((await stored(page)).profile.mind.halved || {}).checkin, 'back to usual saved')
  }, { url: WB, seed: (() => { const o = ordinaryDay(); o.state.profile = { ...o.state.profile, mind: { notify: { checkin: true }, tz: 'Europe/London' } }; return o })() })

  await run('wp17-backoff-dismiss', async ({ page }) => {
    await openNotify(page)
    const b = page.locator('.banner.nf-back')
    await b.waitFor()
    await b.getByRole('button', { name: 'Dismiss' }).click()
    await b.waitFor({ state: 'detached' })
    expect(((await stored(page)).profile.mind.halved || {}).checkin, 'dismiss keeps the back-off')
    await page.reload()
    await openNotify(page)
    await page.waitForTimeout(300)
    expect(!(await page.locator('.banner.nf-back').count()), 'still hidden after a reload')
  }, { url: WB, seed: (() => { const o = ordinaryDay(); o.state.profile = { ...o.state.profile, mind: { notify: { checkin: true }, halved: { checkin: '2026-10-09T07:30:00.000Z' }, tz: 'Europe/London' } }; return o })() })

  await run('wp17-flag-off', async ({ page }) => {
    await openNotify(page)
    const rows = await notifyRows(page)
    expect(JSON.stringify(rows) === JSON.stringify(['Supplement reminders', 'Weekly review reminder']), 'flag off rows: ' + rows.join(', '))
    expect(!(await page.getByText('Your times', { exact: true }).count()) && !(await page.getByText(B11_FOOT).count()), 'no B11 parts with the flag off')
    await shot(page, 'wp17-flag-off-notify')
  }, { seed: ordinaryDay() })

  // Later packages add their scenarios here, against WB (flag on) and WBR (flag on, MIND_REVIEWED on),
  // with the seeds above: hardDay(), ordinaryDay(), lowMoodFortnight().
  void WB; void WBR; void lowMoodFortnight

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
