/**
 * Mind parity, web against native (native-build-brief §1: "parity is tested, not eyeballed"; N9).
 * Opens the same seeded account in the real web app and in the native app's code rendered for the
 * web (react-native-web), reads the same facts from each (words, order, what's shown, what's saved,
 * what's sent) and compares them, scenario by scenario, carrying over the web's e2e cases
 * (scripts/e2e-wellbeing.cjs wp6, wp11, wp12, wp13, wp15 support side, closeout-design-reset).
 * Screenshots of both, light and dark, go to E2E_OUT for `design`.
 *
 *   (repo root) npm run build && npx vite preview --port 4177 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   WEB_URL=http://localhost:4177/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-mind-parity.cjs [--only=reset]
 *
 * `--self` runs the web app on both sides (checks the script and the web half before the native
 * screens exist). Every Supabase request is answered by an in-memory stand-in; the real project is
 * never reached. Both builds use the default flags (WELLBEING and MIND_REVIEWED on).
 *
 * The native screens expose these testIDs (data-testid on the web render) for what has no visible
 * text or role of its own: screen-mind, screen-reset, screen-wind-down, screen-outside, mind-pair,
 * mind-skill, mind-week, mind-bands, mind-band-on, reset-count, reset-word, reset-left,
 * reset-sphere, support-row, support-row-name, unload-pair, unload-mind, unload-next, unload-note,
 * unload-note-day, toast. Roles and labels are the web's: tab "Mind", buttons by their words,
 * dialogs by their titles.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const SELF = process.argv.includes('--self')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = SELF ? WEB : process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-mind-parity-'))
const UID = '11111111-2222-4333-8444-555555555555'
const AUTH_KEY = 'sb-exvblofwiwbvycomxvmj-auth-token'
const HARD_DAY = '2026-10-08'
const ORDINARY_DAY = '2026-10-10'
const SENT = 'SENTINEL-UNLOAD-PARITY'

/* ---------------- seeds (as scripts/e2e-wellbeing.cjs) ---------------- */

const shift = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
const PROFILE = { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 81.8, activityLevel: 'light', supplements: [], notificationsEnabled: false }
const SCHEDULE = { 0: 'Rest', 1: 'Push', 2: 'Cardio', 3: 'Pull', 4: 'Legs', 5: 'Cardio', 6: 'Rest' }
const BREAKFAST = [
  { n: 'Porridge, made with milk', grams: 250, k: 210, p: 11.5, c: 30.3, f: 5.8, meal: 'breakfast', src: 'db', how: 'g' },
  { n: 'Banana (1 ~118g)', grams: 118, k: 96, p: 1.4, c: 24, f: 0.1, meal: 'breakfast', src: 'db', how: 'g' },
]
const dayOf = ({ foods = [], weight = null, checkin } = {}) => ({ foods, supps: {}, weight, workout: null, ...(checkin ? { checkin } : {}) })
const ci = (d, mood, sleep, stress, energy, hunger = 3) => ({ mood, hunger, sleep, stress, energy, sore: 0, note: '', t: d + 'T08:30:00.000Z' })

function deviceState({ days = {}, profile, schedule, at }) {
  const u = at + 'T07:00:00.000Z'
  return {
    days, profile, schedule, consents: GRANTED,
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}
function hardDay() {
  const days = {}
  const ordinary = [[4, 2, 2, 2], [3, 2, 2, 2], [4, 3, 1, 3], [3, 2, 2, 2], [4, 2, 1, 2], [3, 3, 2, 2], [4, 2, 2, 3], [3, 2, 2, 2], [4, 3, 1, 2], [3, 2, 2, 2], [4, 2, 2, 2]]
  ;[1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13].forEach((n, i) => { const d = shift(HARD_DAY, -n); days[d] = dayOf({ checkin: ci(d, ...ordinary[i]) }) })
  for (const n of [1, 2, 3, 5, 6, 7, 9, 10, 12, 13]) { const d = shift(HARD_DAY, -n); days[d] = { ...(days[d] || dayOf()), foods: BREAKFAST.map((f) => ({ ...f })) } }
  days[shift(HARD_DAY, -1)].weight = 81.8
  days[HARD_DAY] = dayOf({ checkin: { mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1, sore: 0, note: '', t: HARD_DAY + 'T07:40:00.000Z' } })
  return { at: HARD_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at: HARD_DAY }) }
}
const hardDayNoCheckin = () => { const s = hardDay(); delete s.state.days[HARD_DAY].checkin; return s }
const hardDayWithNote = () => {
  const s = hardDay()
  s.state.deviceOnly = { unload: { owner: UID, notes: [{ id: 'e2e-note-1', at: '2026-10-06T19:30:00.000Z', pairs: [{ mind: 'Sort the boiler service', next: 'call on Thursday' }] }] } }
  return s
}
function ordinaryDay() {
  const days = {}
  for (let n = 1; n <= 10; n++) { const d = shift(ORDINARY_DAY, -n); days[d] = dayOf({ foods: n % 3 ? BREAKFAST.map((f) => ({ ...f })) : [], checkin: n % 2 ? ci(d, 4, 3, 1, 3) : undefined }) }
  days[ORDINARY_DAY] = dayOf({ checkin: ci(ORDINARY_DAY, 4, 3, 1, 3) })
  return { at: ORDINARY_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at: ORDINARY_DAY }) }
}
const settledIn = (seed) => { const d = shift(seed.at, -30); seed.state.days[d] = dayOf({ foods: BREAKFAST.map((f) => ({ ...f })) }); seed.state._meta.days[d] = { ...seed.state._meta.days[seed.at] }; return seed }
function reflectionWeek() {
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

/* ---------------- the two apps, read the same way ---------------- */

const fakeJwt = () => {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: UID, role: 'authenticated', aud: 'authenticated', exp: s + 86400 * 400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = () => ({ access_token: fakeJwt(), token_type: 'bearer', expires_in: 86400 * 400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 400, refresh_token: 'r', user: USER })

/** Each app's way to the same thing. Web: its CSS classes. Native: testIDs, roles and labels. */
const ADAPTERS = {
  web: {
    openMind: async (p) => { await p.locator('nav.tabbar').getByRole('button', { name: 'Mind', exact: true }).click(); await p.locator('.screen.mind').waitFor() },
    screen: (p, k) => p.locator({ mind: '.screen.mind', reset: '.screen.reset', 'wind-down': '.screen.wind-down', outside: '.screen.outside' }[k]),
    pairs: (p) => p.locator('.mind-g2 > div'),
    skills: (p) => p.locator('.mind-skills .li .t'),
    week: (p) => p.locator('.screen.mind section.mind-week'),
    bands: (p) => p.locator('.mind-bands .mind-band'),
    bandOn: (p) => p.locator('.mind-bands .mind-band.on'),
    count: (p) => p.locator('.reset-glow .cnt .n'),
    word: (p) => p.locator('.reset-glow .cnt .p'),
    left: (p) => p.locator('.reset-left'),
    sphere: (p) => p.locator('.reset-glow .sph'),
    sheet: (p, title) => p.locator(`.sheet[aria-label="${title}"]`),
    supportNames: (p) => p.locator('.sheet .wz-sp .t'),
    unloadMind: (p) => p.locator('.ul-pair textarea:not(.ul-next)'),
    unloadNext: (p) => p.locator('.ul-pair textarea.ul-next'),
    noteDays: (p) => p.locator('.ul-notes .li .t'),
    notes: (p) => p.locator('.ul-notes .li'),
    toast: (p) => p.locator('.toast.show'),
    tabBar: (p) => p.locator('nav.tabbar'),
    picked: async (p) => (await p.getByRole('radio', { checked: true }).first().innerText()).trim(),
  },
  native: {
    openMind: async (p) => { await p.getByRole('tab', { name: 'Mind', exact: true }).click(); await p.getByTestId('screen-mind').waitFor() },
    screen: (p, k) => p.getByTestId('screen-' + k),
    pairs: (p) => p.getByTestId('mind-pair'),
    skills: (p) => p.getByTestId('mind-skill'),
    week: (p) => p.getByTestId('mind-week'),
    bands: (p) => p.getByTestId('mind-bands').locator('[data-testid^="mind-band"]'),
    bandOn: (p) => p.getByTestId('mind-band-on'),
    count: (p) => p.getByTestId('reset-count'),
    word: (p) => p.getByTestId('reset-word'),
    left: (p) => p.getByTestId('reset-left'),
    sphere: (p) => p.getByTestId('reset-sphere'),
    // lib/ui's Sheet carries its title as aria-label (and aria-modal) on the web render, not role=dialog
    sheet: (p, title) => p.locator(`[aria-label="${title}"][aria-modal="true"], [aria-modal="true"] [aria-label="${title}"]`).first(),
    // TODO(N1-followup): Seg sets accessibilityState only, so the web render has no aria-checked; until it
    // does, the picked segment is the raised one (on --segon)
    picked: async (p) => p.evaluate(() => { const r = [...document.querySelectorAll('[role="radio"]')].find((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'); return r ? r.innerText.trim() : '' }),
    // lib/ui Signposts: each service is a direct child of the group inside support-rows
    supportNames: (p) => p.locator('[data-testid="support-rows"] > div > *'),
    unloadMind: (p) => p.getByTestId('unload-mind'),
    unloadNext: (p) => p.getByTestId('unload-next'),
    noteDays: (p) => p.getByTestId('unload-note'),
    notes: (p) => p.getByTestId('unload-note'),
    // TODO(N1-followup): a testID on ToastHost; meanwhile its live region (the last polite one with words)
    toast: (p) => p.locator('[aria-live="polite"]').filter({ hasText: /\S/ }).last(),
    tabBar: (p) => p.getByRole('tablist'),
  },
}

async function open(browser, side, seed, { scheme = 'light', reduced = false } = {}) {
  const url = side === 'web' ? WEB : NATIVE
  const a = SELF ? ADAPTERS.web : ADAPTERS[side]
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, timezoneId: 'Europe/London', locale: 'en-GB', ...(reduced ? { reducedMotion: 'reduce' } : {}) })
  await ctx.addInitScript(([s, data, key]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem(key, s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', data)
  }, [JSON.stringify(SESSION()), JSON.stringify(seed.state), AUTH_KEY])
  const rows = { consents: GRANTED.records.map((r) => ({ ...r, user_id: UID, recorded_at: r.at })) }
  const net = { posts: [], seen: [] }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(USER) })
    if (u.includes('/auth/v1/token')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(SESSION()) })
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    if (m && req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    if (m) net.posts.push({ t: m[1], body: req.postData() || '' })
    return route.fulfill({ status: 201, headers: cors, body: '' })
  })
  await ctx.route(/openfoodfacts\.org|b-cdn\.net|mediadelivery\.net/, (r) => r.abort())
  const page = await ctx.newPage()
  page.on('request', (r) => net.seen.push(r.url() + ' ' + (r.postData() || '')))
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.clock.install({ time: new Date(seed.at + 'T09:00:00') })
  await page.goto(url)
  await page.waitForTimeout(800)
  return { ctx, page, a, net, errors, side }
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const texts = async (loc) => (await loc.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
const has = async (page, text) => (await page.getByText(text, { exact: true }).count()) > 0
const btn = (scope, name) => scope.getByRole('button', { name, exact: true })
async function shots(app, name) {
  for (const scheme of ['light', 'dark']) {
    await app.page.emulateMedia({ colorScheme: scheme })
    await app.page.waitForTimeout(150)
    await app.page.screenshot({ path: path.join(OUT, `${name}-${scheme}-${app.side}.png`) })
  }
  await app.page.emulateMedia({ colorScheme: 'light' })
}

/* ---------------- scenarios: each returns the facts both apps must agree on ---------------- */

/** what Support looks like for each nation, and that opening it records and sends nothing */
async function supportFacts(app, opener) {
  const { page, a, net } = app
  await page.waitForTimeout(1500)
  const before = JSON.stringify((await stored(page)).days) + JSON.stringify((await stored(page)).profile)
  const posts = net.posts.length
  await opener()
  const sheet = a.sheet(page, 'Support and helplines')
  await sheet.waitFor()
  const facts = {}
  const read = async () => ({
    names: (await a.supportNames(page).allInnerTexts()).map((x) => x.split('\n')[0].trim()),
    showing: (await sheet.getByText(/^Showing services for /).first().innerText()).trim(),
    choose: await btn(sheet, 'Choose').count(), change: await btn(sheet, 'Change').count(),
    chooseFoot: await has(page, 'Choose your nation above to see your local NHS services.'),
    notCrisis: await has(page, 'Tilo isn’t a crisis service and doesn’t monitor what you write. If you or someone else is in danger now, call 999.'),
    privateFoot: await has(page, 'Opening this page is private. Tilo doesn’t record it or tell anyone. Calls to these numbers are free. Texting Shout is free from the main UK networks.'),
  })
  facts.uk = await read()
  await shots(app, 'support-uk')
  for (const n of ['England', 'Scotland', 'Wales', 'Northern Ireland']) {
    await btn(sheet, facts[Object.keys(facts).pop()].change ? 'Change' : 'Choose').click()
    await sheet.getByText(n, { exact: true }).click()
    facts[n] = await read()
  }
  await shots(app, 'support-ni')
  await btn(sheet, 'Done').click()
  await sheet.waitFor({ state: 'detached' })
  await page.waitForTimeout(1500)
  const after = JSON.stringify((await stored(page)).days) + JSON.stringify((await stored(page)).profile)
  facts.recordsNothing = after === before
  facts.sendsNothing = net.posts.length === posts
  return facts
}

const SCENARIOS = [
  ['mind-page', hardDay, {}, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    const scr = a.screen(page, 'mind')
    const box = await btn(scr, 'Need support now?').boundingBox()
    const bar = await a.tabBar(page).boundingBox()
    await shots(app, 'mind-page')
    return {
      eyebrow: await has(page, 'Thursday 8 October'),
      title: await scr.getByText('Mind', { exact: true }).count() > 0,
      avatar: await btn(scr, 'Profile').count(),
      pairs: await texts(a.pairs(page)),
      update: await btn(scr, 'Update').count(),
      supportAboveFold: !!(box && bar && box.y + box.height <= bar.y),
      skills: (await a.skills(page).allInnerTexts()).map((x) => x.split('\n')[0].trim()),
      plans: await has(page, 'If–then plans') && await has(page, 'On Plan'),
      wellness: await has(page, 'For everyday wellbeing. Not a treatment for any condition.'),
      reflectionHeld: await a.week(page).count() === 0,
    }
  }],
  ['mind-empty', hardDayNoCheckin, {}, async (app) => {
    await app.a.openMind(app.page)
    await shots(app, 'mind-empty')
    return { ask: await has(app.page, 'How are you today?'), sub: await has(app.page, 'Mood, sleep, stress and energy · 20 seconds'), checkIn: await btn(app.page, 'Check in').count() }
  }],
  ['support', hardDay, {}, async (app) => {
    await app.a.openMind(app.page)
    return supportFacts(app, () => btn(app.a.screen(app.page, 'mind'), 'Need support now?').click())
  }],
  ['reflection-a', () => settledIn(ordinaryDay()), {}, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    const card = a.week(page)
    await card.waitFor()
    await card.scrollIntoViewIfNeeded()
    await shots(app, 'reflection-a')
    const text = (await card.innerText()).replace(/\s+/g, ' ').trim()
    return { span: await has(page, '5–11 Oct'), text, bands: await a.bands(page).count(), link: await btn(card, 'See your whole week').count() }
  }],
  ['reflection-b', reflectionWeek, {}, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    const card = a.week(page)
    await card.waitFor()
    await card.scrollIntoViewIfNeeded()
    await shots(app, 'reflection-b')
    return { text: (await card.innerText()).replace(/\s+/g, ' ').trim(), bands: await a.bands(page).count(), on: await a.bandOn(page).count() }
  }],
  ['reflection-food-off', () => { const s = reflectionWeek(); s.state.profile.mind = { off: ['food'] }; return s }, {}, async (app) => {
    await app.a.openMind(app.page)
    await app.a.week(app.page).waitFor()
    return { link: await btn(app.a.week(app.page), 'See your whole week').count() }
  }],
  ['reflection-held', ordinaryDay, {}, async (app) => {
    await app.a.openMind(app.page)
    await app.page.getByText('If–then plans').waitFor()
    return { shown: await app.a.week(app.page).count() }
  }],
  ['reset', hardDay, {}, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    await btn(page, 'Reset').first().click().catch(async () => page.getByRole('button', { name: /^Reset/ }).first().click())
    const scr = a.screen(page, 'reset')
    await scr.waitFor()
    await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000)
    const now = async () => ({ word: (await a.word(page).count()) ? (await a.word(page).innerText()).trim() : '', count: (await a.count(page).count()) ? (await a.count(page).innerText()).trim() : '', left: (await a.left(page).count()) ? (await a.left(page).innerText()).trim() : '' })
    const f = {}
    f.ready = { back: await btn(page, 'Mind').count(), tabBar: await a.tabBar(page).isVisible(), sub: await has(page, 'A few slow breaths. Eyes open is fine.'), picked: await a.picked(page), start: await btn(page, 'Start').count(), ...(await now()) }
    await shots(app, 'reset-ready')
    await btn(page, 'Start').click()
    await page.clock.runFor(1500)
    f.mid = { ...(await now()), sub: await has(page, 'A few slow breaths. Eyes open is fine.') }
    await shots(app, 'reset-in')
    const words = []
    for (let t = 0; t < 12000; t += 250) { const s = await now(); if (s.word && s.word !== words[words.length - 1]) words.push(s.word); await page.clock.runFor(250) }
    f.words = words
    await btn(page, 'Stop').click()
    f.stopped = { comeBack: await has(page, 'Come back to this whenever you like.'), thats: await page.getByText(/That’s|That's/).count(), ...(await now()) }
    await page.clock.runFor(3000)
    f.stoppedLogged = ((await stored(page)).days[HARD_DAY].checkin.skills || []).filter((x) => x.id === 'reset').length
    await shots(app, 'reset-stopped')
    await page.getByRole('radio', { name: '1 min' }).click()
    await btn(page, 'Start').click()
    await page.clock.runFor(75000)
    f.finished = { line: await has(page, "That's 1 minute."), comeBack: await has(page, 'Come back to this whenever you like.') }
    await page.clock.runFor(3000)
    const c = (await stored(page)).days[HARD_DAY].checkin
    f.finishedLogged = (c.skills || []).filter((x) => x.id === 'reset').length
    f.answersKept = c.mood === 2 && c.sleep === 1 && c.stress === 2
    await shots(app, 'reset-finished')
    await btn(page, 'Done').click()
    await a.screen(page, 'mind').waitFor()
    f.tabBarBack = await a.tabBar(page).isVisible()
    return f
  }],
  ['reset-reduced', hardDay, { reduced: true }, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    await page.getByRole('button', { name: /^Reset/ }).first().click()
    await a.screen(page, 'reset').waitFor()
    await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000)
    await btn(page, 'Start').click()
    const sphere = async () => a.sphere(page).evaluate((e) => getComputedStyle(e).transform)
    const s0 = await sphere()
    const words = []
    for (let t = 0; t < 11000; t += 500) { await page.clock.runFor(500); const w = (await a.word(page).innerText()).trim(); if (w !== words[words.length - 1]) words.push(w) }
    await shots(app, 'reset-reduced')
    return { line: await has(page, 'Motion is reduced on this device, so follow the words.'), words, sphereStill: (await sphere()) === s0, sphere: s0 }
  }],
  ['unload', hardDayWithNote, {}, async (app) => {
    const { page, a, net } = app
    await a.openMind(page)
    await page.getByRole('button', { name: /^Unload/ }).first().click()
    const sheet = a.sheet(page, 'Unload')
    await sheet.getByText("Write what's on your mind, and one next step for each.").waitFor()
    const f = { doneOff: await btn(sheet, 'Done').isDisabled(), local: await has(page, "Your notes stay on this device only. They aren't synced or sent anywhere, so if you remove Tilo or clear this device's data, they're gone."), crisis: await has(page, "Tilo isn't a crisis service. In an emergency, call 999.") }
    await shots(app, 'unload-empty')
    await a.unloadMind(page).first().fill('The deadline on Friday ' + SENT)
    await a.unloadNext(page).first().fill('Block an hour')
    await btn(sheet, 'Add another').click()
    await a.unloadNext(page).nth(1).fill('Ring the garage ' + SENT)
    await btn(sheet, 'One thing that went OK today').click()
    await sheet.getByPlaceholder('Optional', { exact: true }).fill('Lunch outside ' + SENT)
    f.doneOn = !(await btn(sheet, 'Done').isDisabled())
    await btn(sheet, 'Done').click()
    await sheet.waitFor({ state: 'detached' })
    f.toast = (await a.toast(page).innerText().catch(() => '')).trim()
    const st = await stored(page)
    f.notes = st.deviceOnly.unload.notes.map((n) => ({ pairs: n.pairs, ok: n.ok }))
    f.onlyDeviceOnly = !JSON.stringify({ ...st, deviceOnly: undefined }).includes(SENT)
    f.logged = (st.days[HARD_DAY].checkin.skills || []).some((s) => s.id === 'unload')
    await page.clock.runFor(5000)
    await page.waitForTimeout(1500)
    f.noLeak = !net.seen.some((s) => s.includes(SENT) || s.includes('deviceOnly'))
    await page.getByRole('button', { name: /^Unload/ }).first().click()
    await btn(a.sheet(page, 'Unload'), 'Earlier notes').click()
    f.days = (await a.noteDays(page).allInnerTexts()).map((x) => x.split('\n')[0].trim())
    f.lines = (await texts(a.notes(page))).map((t) => t.replace(/\s*Delete$/, '').trim())
    await shots(app, 'unload-earlier')
    return f
  }],
  ['wind-down', hardDay, {}, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    await page.getByRole('button', { name: /^Wind down/ }).first().click()
    const scr = a.screen(page, 'wind-down')
    await scr.waitFor()
    await shots(app, 'wind-down')
    return { text: (await scr.innerText()).replace(/\s+/g, ' ').trim(), tabBar: await a.tabBar(page).isVisible() }
  }],
  ['outside', hardDay, {}, async (app) => {
    const { page, a } = app
    await a.openMind(page)
    await page.getByRole('button', { name: /^Get outside/ }).first().click()
    const scr = a.screen(page, 'outside')
    await scr.waitFor()
    await shots(app, 'outside')
    return { text: (await scr.innerText()).replace(/\s+/g, ' ').trim(), tabBar: await a.tabBar(page).isVisible() }
  }],
]

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'mind parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 900) : '') }

async function run() {
  const browser = await chromium.launch()
  for (const [name, seedFn, opts, fn] of SCENARIOS) {
    if (ONLY && !name.startsWith(ONLY)) continue
    const out = {}
    for (const side of ['web', 'native']) {
      const app = await open(browser, side, seedFn(), opts)
      try { out[side] = await fn(app) } catch (e) {
        out[side] = { error: String(e.message || e).split('\n')[0] }
        // what the page showed when it failed, for the person debugging it
        await app.page.screenshot({ path: path.join(OUT, `FAIL-${name}-${side}.png`) }).catch(() => {})
        fs.writeFileSync(path.join(OUT, `FAIL-${name}-${side}.txt`), String(e.stack || e) + '\n\n' + (await app.page.innerText('body').catch(() => '')))
        if (process.env.DUMP_DOM) fs.writeFileSync(path.join(OUT, `FAIL-${name}-${side}.html`), await app.page.content().catch(() => ''))
      }
      check(`${name}: no page errors on ${side}`, !app.errors.length, app.errors)
      await app.ctx.close()
    }
    if (process.env.DUMP) console.log(JSON.stringify(out, null, 1))
    check(`${name}: web ran`, !out.web.error, out.web)
    for (const k of Object.keys(out.web)) check(`${name}: ${k} matches`, JSON.stringify(out.web[k]) === JSON.stringify(out.native[k]), { web: out.web[k], native: out.native[k] })
  }
  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
