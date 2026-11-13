/**
 * Food parity, web against native (native-build-plan N5; brief §1: "parity is tested, not eyeballed").
 * Opens the same seeded account in the real web app and in the native app's code rendered for the
 * web (react-native-web), and checks:
 *
 * 1. The Food screen's words and figures match in every food view: numbers, gentle, Yes, Yes with
 *    "Show a range" (ob9-4), Sometimes (the ob9 Food cases from e2e-onboarding.cjs).
 * 2. Every Food sheet reads the same: the margin, edit entry, Add food, recipes, a recipe's builder,
 *    "What can I make?", quick estimate, create a food, a portion.
 * 3. Search returns the same foods in the same order for the same queries.
 * 4. The logging path: one serving of a food logged through each app's own screens stores the same
 *    entry in both, and for a chain food that equals the published figure (as `npm test` checks
 *    on the data). A sample by default; FOOD_ALL=1 runs every chain food.
 * 5. Duplicate foods (test-duplicates.ts cases that have screens): the dup-3 row, dup-4 "Keep this
 *    one" and "They're different", dup-2 on a typed food, each leaving the same stored data.
 * 6. Offline: search and logging work with the network cut.
 *
 *   (repo root) npm run build && npx vite preview --port 4177 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   WEB_URL=http://localhost:4177/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-food-parity.cjs
 *
 * Every Supabase request is answered by an in-memory stand-in; the real project is never reached.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync } = require('node:child_process')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-food-parity-'))
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const ROOT = path.resolve(__dirname, '../../..')
const UID = '11111111-2222-4333-8444-555555555555'
const NOW = new Date(process.env.E2E_NOW || '2026-11-14T12:00:00')
const ymd = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
const ago = (n) => { const t = new Date(NOW); t.setDate(t.getDate() - n); return ymd(t) }
const today = ago(0)
const iso = (n) => new Date(NOW.getTime() - n * 86400000).toISOString()

/** The chain foods and their published per-serving kcal, from the shared data (as test-core). */
function chainFoods() {
  const src = `
    import { FOODS } from '@/core/data/foods'
    import { SOURCES } from '@/core/data/sources'
    const chain = FOODS.filter((f) => f.src && SOURCES[f.src.split(':')[0]]?.err)
    // the chain's own per-portion figure (ref) where it is one serving; else what the data implies
    const derived = (f, x) => Math.round((f[x] * f.g) / (f.each ? 1 : 100) * 10) / 10
    const one = (f) => f.ref && f.ref.g === f.g
    console.log(JSON.stringify(chain.map((f) => ({ n: f.n, src: f.src, each: !!f.each,
      published: Math.round(one(f) ? f.ref.k : derived(f, 'k')),
      // only the macros the chain publishes (some refs carry kcal alone)
      macros: one(f) ? Object.fromEntries(['p', 'c', 'f'].filter((x) => typeof f.ref[x] === 'number').map((x) => [x, f.ref[x]])) : null }))))`
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-chain-'))
  const out = path.join(dir, 'chain.cjs')
  fs.writeFileSync(path.join(dir, 'chain.ts'), src)
  execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [path.join(dir, 'chain.ts'), '--bundle', '--platform=node', `--alias:@=${path.join(ROOT, 'src')}`, '--log-level=error', `--outfile=${out}`, '--define:import.meta.env={}'])
  return JSON.parse(execFileSync('node', [out]).toString())
}

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(NOW.getTime() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 86400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(NOW.getTime() / 1000) + 86400, refresh_token: 'r', user: USER }
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }

const F = (n, k, p, c, f, grams, meal, how = 'serv', extra = {}) => ({ n, k, p, c, f, grams, meal, how, ...extra })
/** Today: breakfast and lunch with two items each, a quick estimate, one entry from before meals. */
const TODAY_FOODS = [
  F('Porridge with milk', 420, 16, 60, 10, 300, 'breakfast'),
  F('Banana', 105, 1.3, 27, 0.4, 118, 'breakfast'),
  F('Chicken sandwich', 650, 32, 60, 26, 260, 'lunch', 'hand'),
  F('Pub lunch', 900, 35, 80, 45, 0, 'lunch', 'quick', { src: 'quick', err: 0.3 }),
  F('Apple', 80, 0, 20, 0, 150, undefined),
]
const YESTERDAY = [F('Greek yoghurt', 150, 15, 6, 7, 150, 'snack'), F('Salmon fillet', 400, 40, 0, 26, 180, 'dinner')]
const RECIPES = [
  { id: 'r1', name: 'Chicken curry', servings: 4, items: [{ n: 'Chicken breast, raw', k: 106, p: 24, c: 0, f: 1.1, grams: 500 }, { n: 'Onion', k: 36, p: 1.2, c: 7.9, f: 0.2, grams: 150 }, { n: 'Olive oil', k: 899, p: 0, c: 0, f: 99.9, grams: 15 }] },
  { id: 'r2', name: 'Overnight oats', servings: 1, items: [{ n: 'Porridge oats', k: 374, p: 11, c: 60, f: 8, grams: 50 }, { n: 'Semi-skimmed milk', k: 47, p: 3.5, c: 4.8, f: 1.7, grams: 150, ml: true }] },
]
/** two saved foods that look alike (dup-3), and a third that doesn't */
const CUSTOM = [
  { id: 'cf-1', n: 'Tesco Greek Style Yogurt', g: 150, k: 93, p: 5.6, c: 4.9, f: 5.7 },
  { id: 'cf-2', n: 'Greek Style Yogurt Tesco', g: 150, k: 93, p: 5.6, c: 4.9, f: 5.7 },
  { id: 'cf-3', n: "Mum's chilli", g: 350, k: 120, p: 9, c: 8, f: 5 },
]

function state(o = {}) {
  const days = {}
  const day = (d) => (days[d] ??= { foods: [], supps: {}, weight: null, workout: null, checkin: null })
  day(today).foods = o.empty ? [] : TODAY_FOODS
  day(ago(1)).foods = YESTERDAY.concat(o.dupLogs ? [F('Greek Style Yogurt Tesco', 139.5, 8.4, 7.4, 8.6, 150, 'snack', 'serv', { custom: true })] : [])
  for (let i = 2; i < 10; i++) day(ago(i)).weight = 70 + (i % 3) * 0.1
  day(ago(2)).foods = [F('Tesco Greek Style Yogurt', 139.5, 8.4, 7.4, 8.6, 150, 'snack', 'serv', { custom: true }), F('Greek Style Yogurt Tesco', 139.5, 8.4, 7.4, 8.6, 150, 'snack', 'serv', { custom: true })]
  const u = new Date(NOW).toISOString()
  return {
    target: { kcal: 2000, p: 120, c: 220, f: 70 },
    schedule: { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Rest', 5: 'Legs', 6: 'Rest' },
    profile: {
      name: 'Sam Taylor', sex: 'F', sexAnswer: 'female', age: 34, height: 168, weight: 70, activityLevel: 'light', activityMult: 1.3, supplements: [], notificationsEnabled: false,
      goal: 'maintain', ...(o.profile || {}),
    },
    // marked unsynced, so the stand-in's empty server lists don't replace them on the first pull
    days, customFoods: o.noCustom ? [] : CUSTOM.map((x) => ({ ...x, _dirty: true })), recipes: o.noRecipes ? [] : RECIPES.map((x) => ({ ...x, _dirty: true })), routines: [], trainingPlans: [],
    consents: { records: [CONSENT] },
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}
const ob9 = (wb, x = {}) => ({ outcomes: { readiness: 'clear', wellbeing: wb, baseline: 'ok' }, onboardedAt: iso(x.ago ?? 3), answeredAt: { 'outcomes.wellbeing': iso(x.ago ?? 3) }, ...(wb === 'flagged' ? { gentle: true } : {}), ...(x.p || {}) })
const VIEWS = {
  numbers: {},
  gentle: { profile: { gentle: true } },
  yes: { profile: ob9('flagged') },
  'yes-range': { profile: ob9('flagged', { ago: 28, p: { foodOptIn: { range: 'shown', rangeAt: today } } }) },
  sometimes: { profile: ob9('sometimes') },
  empty: { empty: true, noRecipes: true, noCustom: true },
}

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'food parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, +(process.env.DETAIL || 900)) : '') }

/** the two apps, as selectors over the same page shapes */
const APPS = {
  web: { kind: 'web', url: WEB, screen: '.screen', sheet: '.sheet', titles: '.sheet .li .t', search: 'Search foods' },
  native: { kind: 'native', url: NATIVE, screen: '[data-testid="food-screen"]', sheet: '[aria-modal="true"]', titles: '[aria-modal="true"] [data-testid="row-title"]', search: 'Search foods' },
}
// NATIVE_KIND=web puts a second web build in the native slot: a before/after check of a web change
if (process.env.NATIVE_KIND === 'web') APPS.native = { ...APPS.web, url: NATIVE }

async function open(browser, which, st, scheme = 'light') {
  const app = APPS[which]
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme })
  await ctx.addInitScript(([s, data]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', data)
  }, [JSON.stringify(SESSION), JSON.stringify(st)])
  const rows = { consents: [{ ...CONSENT, user_id: UID, recorded_at: CONSENT.at }] }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(USER) })
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    // a small server: upserts are kept by id (or by key), reads return them, deletes remove them
    const t = m && (rows[m[1]] ??= [])
    const keyOf = (r) => r.id ?? r.day ?? JSON.stringify(r)
    if (m && req.method() === 'GET') {
      const id = u.match(/[?&]id=eq\.([^&]+)/)
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(id ? t.filter((r) => String(r.id) === decodeURIComponent(id[1])) : t) })
    }
    if (m && (req.method() === 'POST' || req.method() === 'PATCH')) {
      let body = []
      try { body = JSON.parse(req.postData() || '[]') } catch { /* not JSON */ }
      const list = (Array.isArray(body) ? body : [body]).map((r) => ({ updated_at: new Date(NOW).toISOString(), ...r }))
      for (const r of list) { const i = t.findIndex((x) => keyOf(x) === keyOf(r)); if (i >= 0) t[i] = { ...t[i], ...r }; else t.push(r) }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(list) })
    }
    if (m && req.method() === 'DELETE') {
      const id = u.match(/[?&]id=eq\.([^&]+)/)
      if (id) rows[m[1]] = t.filter((r) => String(r.id) !== decodeURIComponent(id[1]))
    }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  // nothing else leaves the browser (Open Food Facts, fonts are local)
  await ctx.route((u) => !u.href.startsWith(app.url) && !/supabase\.co\//.test(u.href), (r) => r.abort())
  await ctx.clock.install({ time: NOW })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => d.accept())
  await page.goto(app.url)
  await page.getByText('This week', { exact: true }).first().waitFor({ timeout: 30000 })
  const tab = app.kind === 'web' ? page.locator('nav.tabbar').getByRole('button', { name: 'Food', exact: true }) : page.getByRole('tab', { name: 'Food', exact: true })
  await tab.click()
  await page.locator(app.screen).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(400)
  return { ctx, page, errors, app, which }
}

const norm = (s) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const text = async (a, sel) => norm(await a.page.locator(sel).last().innerText())
const stored = (a) => a.page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1')))
const sheetOpen = (a) => a.page.locator(a.app.sheet).last().waitFor({ timeout: 10000 })
const sheetGone = async (a) => { await a.page.waitForFunction((s) => !document.querySelector(s), a.app.sheet, { timeout: 10000 }) }
const btn = (a, name, exact = true) => a.page.getByRole('button', { name, exact })
/** a row in the open sheet with this title (web: `.li` with that `.t`; native: the row's label) */
const sheetRow = (a, title) => a.app.kind === 'web'
  ? a.page.locator('.sheet .li').filter({ has: a.page.locator('.t', { hasText: new RegExp('^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).first()
  // native rows are named by their whole text (as the web's), so find the one whose title is exactly this
  : a.page.locator(a.app.sheet).last().getByRole('button').filter({ has: a.page.getByText(title, { exact: true }) }).first()
const close = async (a) => { await a.page.keyboard.press('Escape').catch(() => {}); if (a.app.kind === 'native' || await a.page.locator(a.app.sheet).count()) { const c = btn(a, 'Cancel'); if (await c.count()) await c.last().click(); else { const d = btn(a, 'Done'); if (await d.count()) await d.last().click() } } await sheetGone(a).catch(() => {}) }

async function same(name, w, n, fn) {
  const [a, b] = [await fn(w), await fn(n)]
  // words and figures must match; where a line breaks or a unit sits in its own element doesn't
  const bare = (x) => JSON.stringify(x).replace(/\s+/g, '')
  check(name, bare(a) === bare(b), { web: a, native: b })
  return [a, b]
}

async function run() {
  const browser = await chromium.launch()
  const pair = async (st, scheme) => [await open(browser, 'web', st, scheme), await open(browser, 'native', st, scheme)]
  const done = async (w, n, label) => {
    check(`${label}: no page errors on web`, !w.errors.length, w.errors)
    check(`${label}: no page errors on native`, !n.errors.length, n.errors)
    await w.ctx.close(); await n.ctx.close()
  }
  const want = (k) => !ONLY || ONLY.test(k)

  // 1. the Food screen in every food view, light and dark
  for (const [view, o] of Object.entries(VIEWS)) {
    for (const scheme of ['light', 'dark']) {
      if (!want('screen:' + view)) continue
      const [w, n] = await pair(state(o), scheme)
      await w.page.screenshot({ path: path.join(OUT, `food-${view}-${scheme}-web.png`), fullPage: true })
      // the native tab scrolls inside its own view: grow the window to it, so the capture is the whole tab
      const tall = await n.page.evaluate(() => document.querySelector('[data-testid="food-screen"] > div')?.scrollHeight ?? 0)
      if (tall > 844) await n.page.setViewportSize({ width: 390, height: tall + 90 })
      await n.page.screenshot({ path: path.join(OUT, `food-${view}-${scheme}-native.png`), fullPage: true })
      if (scheme === 'light') {
        await same(`${view}: Food screen words and figures`, w, n, (a) => text(a, a.app.screen))
        if (view === 'yes') check('ob9-2 Yes: no range on Food before the yes', !/Roughly /.test(await text(n, n.app.screen)))
        if (view === 'yes-range' || view === 'sometimes') check(`ob9 ${view}: "Roughly N–N kcal a day" on Food`, /Roughly \d,\d{3}–\d,\d{3} kcal a day/.test(await text(n, n.app.screen)))
        if (view === 'sometimes') check('ob9 Sometimes: never a single number to aim at', !/kcal to go/.test(await text(n, n.app.screen)))
      }
      await done(w, n, `${view} ${scheme}`)
    }
  }

  // 2. the sheets, numbers and gentle, light; numbers again in dark for the captures
  for (const [view, scheme] of [['numbers', 'light'], ['gentle', 'light'], ['numbers', 'dark']]) {
    if (!want('sheets:' + view + (scheme === 'dark' ? ':dark' : ''))) continue
    const [w, n] = await pair(state(VIEWS[view]), scheme)
    const sheet = async (label, openIt, after) => {
      for (const a of [w, n]) {
        try { await openIt(a); await sheetOpen(a) } catch (e) {
          await a.page.screenshot({ path: path.join(OUT, `fail-${label.replace(/\W+/g, '-')}-${a.which}.png`) })
          check(`${view}: ${label} sheet opens on ${a.which}`, false, String(e).slice(0, 300))
          for (const b of [w, n]) await close(b)
          return
        }
        await a.page.waitForTimeout(450)
      }
      await same(`${view}: ${label} sheet`, w, n, (a) => text(a, a.app.sheet))
      for (const a of [w, n]) await a.page.screenshot({ path: path.join(OUT, `sheet-${view}${scheme === 'dark' ? '-dark' : ''}-${label.replace(/\W+/g, '-')}-${a.which}.png`) })
      if (after) await after()
      for (const a of [w, n]) await close(a)
    }
    // the ± is shown only with numbers
    if (view === 'numbers') await sheet('margin', (a) => btn(a, 'About this estimate').click())
    await sheet('same as yesterday', (a) => a.page.getByText('Same as yesterday', { exact: true }).click())
    await sheet('log a recipe', async (a) => {
      await a.page.getByText('What can I make?', { exact: true }).click(); await sheetOpen(a); await a.page.waitForTimeout(450)
      await sheetRow(a, 'Chicken curry').click()
      await a.page.getByText('The recipe makes 4 servings', { exact: false }).waitFor()
    })
    await sheet('edit entry', (a) => a.page.locator(a.app.screen).getByText('Chicken sandwich', { exact: true }).click())
    await sheet('add food', (a) => btn(a, 'Add food').click())
    await sheet('recipes', (a) => a.page.locator(a.app.screen).getByText('Your recipes', { exact: true }).last().click())
    await sheet('what can I make', (a) => a.page.getByText('What can I make?', { exact: true }).click())
    await sheet('quick estimate', (a) => a.page.locator(a.app.screen).getByRole('button', { name: /^Quick estimate/ }).click())
    await sheet('create a food', (a) => a.page.locator(a.app.screen).getByText('Create a food', { exact: true }).click())
    await sheet('save as recipe', (a) => a.page.getByText('Save as recipe', { exact: true }).click())
    // a recipe's builder, from Recipes → Edit
    await sheet('recipe builder', async (a) => {
      await a.page.locator(a.app.screen).getByText('Your recipes', { exact: true }).last().click(); await sheetOpen(a)
      await btn(a, 'Edit').first().click()
      await a.page.getByText('Edit recipe', { exact: true }).waitFor()
    })
    // a portion: a food with the cooking-fat question, then a per-item chain food
    for (const food of ['Chicken breast, raw, skinless', 'Greggs Sausage Roll']) {
      await sheet(`portion ${food}`, async (a) => {
        await btn(a, 'Add food').click(); await sheetOpen(a)
        await a.page.getByLabel(a.app.search).fill(food)
        await sheetRow(a, food).click()
        await a.page.locator(a.app.sheet).last().getByText(food, { exact: true }).first().waitFor()
      })
    }
    await done(w, n, `sheets ${view}`)
  }

  // 3. search: the same foods in the same order
  if (want('search')) {
    const [w, n] = await pair(state(VIEWS.numbers), 'light')
    // past the slide-up, so the sheet's text is laid out
    for (const a of [w, n]) { await btn(a, 'Add food').click(); await sheetOpen(a); await a.page.waitForTimeout(600) }
    await same('search: nothing typed (recipes, usuals, recent, my foods)', w, n, (a) => text(a, a.app.sheet))
    for (const q of ['chicken', 'greggs', 'sausage roll', 'milk', 'semi skimmed', 'oat', 'banana', 'rice', 'big mac', 'whopper', 'pret', 'coffee latte', 'curry', 'yogurt', 'egg', 'xyzzy']) {
      for (const a of [w, n]) { await a.page.getByLabel(a.app.search).fill(q); await a.page.waitForTimeout(200) }
      // the whole sheet: every row's title and figures, in order
      await same(`search "${q}"`, w, n, (a) => text(a, a.app.sheet))
    }
    await done(w, n, 'search')
  }

  // 4. the logging path: one serving through each app's screens
  if (want('log')) {
    const chain = chainFoods()
    const pick = process.env.FOOD_ALL ? chain : chain.filter((_, i) => i % Math.max(1, Math.floor(chain.length / 24)) === 0)
      .concat(chain.filter((f) => f.n === 'Greggs Bacon Breakfast Roll' || f.n === 'Burger King Whopper'))
    const generic = ['Chicken breast, raw, skinless', 'Milk, semi-skimmed', 'Banana (1 ~118g)', 'Oats, dry', 'Egg, fried', 'Coffee, black']
    const [w, n] = await pair(state({ ...VIEWS.numbers, empty: true }), 'light')
    let logged = 0
    for (const food of [...pick.map((f) => f.n), ...generic]) {
      const entries = []
      for (const a of [w, n]) {
        const before = (await stored(a)).days[today]?.foods.length ?? 0
        await btn(a, 'Add food').click(); await sheetOpen(a)
        await a.page.getByLabel(a.app.search).fill(food)
        const row = sheetRow(a, food)
        if (!(await row.count())) { entries.push({ missing: food }); await close(a); continue }
        try {
          await row.click()
          await a.page.locator(a.app.sheet).last().getByText(food, { exact: true }).first().waitFor()
          await btn(a, 'Add to Lunch').click()
          await sheetGone(a)
        } catch (err) { entries.push({ error: String(err).slice(0, 160) }); await close(a); continue }
        const fs0 = (await stored(a)).days[today].foods
        entries.push(fs0.slice(before).map(({ n: nm, k, p, c, f, grams, unit, how, meal, serv }) => ({ n: nm, k, p, c, f, grams, unit, how, meal, serv })))
      }
      const ok = JSON.stringify(entries[0]) === JSON.stringify(entries[1])
      const ch = pick.find((f) => f.n === food)
      // kcal to the whole number shown, macros to the 0.1 g the entry keeps (within rounding)
      const e1 = entries[1]?.[0]
      const near = (a, b) => Math.abs(Math.round(a * 10) / 10 - Math.round(b * 10) / 10) <= 0.1
      const pub = ch ? Math.round(e1?.k) === ch.published && (!ch.macros || Object.entries(ch.macros).every(([x, v]) => near(e1[x], v))) : true
      if (!ok || !pub) check(`log one serving of ${food}`, false, { web: entries[0], native: entries[1], published: ch?.published })
      else logged++
    }
    check(`logging path: ${logged} foods logged the same on both, chain foods at their published figure`, logged === pick.length + generic.length)
    await done(w, n, 'log')
  }

  // 5. duplicate foods (boards dup-2 to dup-4)
  if (want('dup')) {
    const flows = {
      'dup-4 keep this one': async (a) => {
        await btn(a, 'Add food').click(); await sheetOpen(a)
        await a.page.getByText('2 foods look the same', { exact: true }).click()
        await a.page.getByText('Pick the one to keep', { exact: true }).waitFor(); await a.page.waitForTimeout(450)
        await a.page.screenshot({ path: path.join(OUT, `dup4-open-${a.which}.png`) })
        const t = await text(a, a.app.sheet)
        await btn(a, 'Keep this one').click()
        await a.page.getByText('Your usual lunch').or(a.page.getByText('My foods', { exact: true })).first().waitFor()
        await a.page.waitForTimeout(300)
        return { sheet: t, row: await a.page.getByText('2 foods look the same', { exact: true }).count() }
      },
      "dup-4 they're different": async (a) => {
        await btn(a, 'Add food').click(); await sheetOpen(a)
        await a.page.getByText('2 foods look the same', { exact: true }).click()
        await btn(a, 'They’re different').click()
        await a.page.getByText('My foods', { exact: true }).waitFor(); await a.page.waitForTimeout(300)
        return { row: await a.page.getByText('2 foods look the same', { exact: true }).count() }
      },
      'dup-2 a typed food like a saved one': async (a) => {
        await a.page.locator(a.app.screen).getByText('Create a food', { exact: true }).click(); await sheetOpen(a)
        const fill = async (label, v) => { await a.page.getByLabel(label, { exact: true }).last().fill(v) }
        await fill('Name', "Mum's chilli"); await fill('Serving', '350'); await fill('Calories', '120'); await fill('Protein', '9'); await fill('Carbs', '8'); await fill('Fat', '5')
        await btn(a, 'Save').click()
        await a.page.getByText("Looks like your saved Mum's chilli.", { exact: true }).waitFor(); await a.page.waitForTimeout(450)
        await a.page.screenshot({ path: path.join(OUT, `dup2-open-${a.which}.png`) })
        const t = norm(await a.page.locator(a.app.sheet).last().innerText())
        await btn(a, 'Keep yours').click()
        await a.page.getByText('How much?', { exact: true }).waitFor()
        return { sheet: t }
      },
    }
    for (const [name, flow] of Object.entries(flows)) {
      const [w, n] = await pair(state({ ...VIEWS.numbers, dupLogs: true }), 'light')
      try {
        // the web's fieldset legend is for screen readers only (native labels the group instead)
        await same(name, w, n, async (a) => {
          const r = await flow(a)
          await a.page.screenshot({ path: path.join(OUT, `dup-${name.replace(/\W+/g, '-')}-${a.which}.png`) })
          if (r.sheet) r.sheet = r.sheet.replace('Food to keep ', '')
          return r
        })
      } catch (e) {
        for (const a of [w, n]) await a.page.screenshot({ path: path.join(OUT, `fail-${name.replace(/\W+/g, '-')}-${a.which}.png`) })
        check(name, false, String(e).slice(0, 300))
      }
      // the first sync gives each record a fresh id, so foods are compared by name
      await same(`${name}: stored foods and logs`, w, n, async (a) => {
        const s = await stored(a)
        const nameOf = new Map(s.customFoods.map((f) => [f.id, f.n]))
        return {
          foods: s.customFoods.map(({ n: nm, k, p, notSame, barcode }) => ({ n: nm, k, p, notSame: notSame?.map((id) => nameOf.get(id)), barcode })),
          logs: Object.fromEntries(Object.entries(s.days).map(([d, x]) => [d, x.foods.map((f) => f.n)])),
        }
      })
      await done(w, n, name)
    }
  }

  // 5b. paths the review asked for: Common in Add food, deleting a saved food, typed searches in
  // the recipe builder and in What can I make?
  if (want('more')) {
    const open = async (a, how) => { await how(a); await sheetOpen(a); await a.page.waitForTimeout(600) }
    {
      // no recent foods and nothing saved: Add food shows Common
      const [w, n] = await pair(state({ ...VIEWS.numbers, empty: true, noCustom: true }), 'light')
      await same('add food with nothing recent or saved (Common)', w, n, async (a) => { await open(a, (x) => btn(x, 'Add food').click()); return text(a, a.app.sheet) })
      await done(w, n, 'common')
    }
    {
      const [w, n] = await pair(state(VIEWS.numbers), 'light')
      await same("delete a saved food (Mum's chilli)", w, n, async (a) => {
        await open(a, (x) => btn(x, 'Add food').click())
        await btn(a, "Delete Mum's chilli").click()
        // past the toast, which native draws inside the open sheet
        await a.page.waitForTimeout(2200)
        const s = await stored(a)
        return { sheet: await text(a, a.app.sheet), saved: s.customFoods.map((f) => f.n) }
      })
      await done(w, n, 'delete')
    }
    {
      const [w, n] = await pair(state(VIEWS.numbers), 'light')
      for (const q of ['chicken', 'olive oil', 'xyzzy']) {
        await same(`recipe builder ingredient search "${q}"`, w, n, async (a) => {
          if (!(await a.page.getByText('Edit recipe', { exact: true }).count())) {
            await open(a, (x) => x.page.locator(x.app.screen).getByText('Your recipes', { exact: true }).last().click())
            await btn(a, 'Edit').first().click()
            await a.page.getByText('Edit recipe', { exact: true }).waitFor()
          }
          await a.page.getByLabel('Search ingredients').fill(q); await a.page.waitForTimeout(300)
          return text(a, a.app.sheet)
        })
      }
      // a decimal amount, typed a character at a time ("0" "." "5"), then the totals
      await same('recipe builder: type 0.5 as an amount', w, n, async (a) => {
        const box = a.page.getByLabel('Olive oil amount')
        await box.fill(''); await box.pressSequentially('0.5'); await a.page.waitForTimeout(200)
        // the web's number box shows a cleared 0 before the typing ("00.5"); both read 0.5, so compare what follows from it
        return text(a, a.app.sheet)
      })
      await done(w, n, 'builder search')
    }
    {
      const [w, n] = await pair(state(VIEWS.numbers), 'light')
      for (const q of ['onion', 'rice', 'xyzzy']) {
        await same(`what can I make "${q}"`, w, n, async (a) => {
          if (!(await a.page.getByText('I have…', { exact: true }).count())) await open(a, (x) => x.page.getByText('What can I make?', { exact: true }).click())
          await a.page.getByLabel('Add an ingredient you have').fill(q); await a.page.waitForTimeout(300)
          return text(a, a.app.sheet)
        })
      }
      await done(w, n, 'suggest search')
    }
  }

  // 6. offline: search and log with the network cut
  if (want('offline')) {
    const [w, n] = await pair(state({ ...VIEWS.numbers, empty: true }), 'light')
    for (const a of [w, n]) await a.ctx.setOffline(true)
    await same('offline: search, log, and the Add food sheet', w, n, async (a) => {
      await btn(a, 'Add food').click(); await sheetOpen(a); await a.page.waitForTimeout(600)
      const sheetText = await text(a, a.app.sheet)
      await a.page.getByLabel(a.app.search).fill('banana')
      await sheetRow(a, 'Banana (1 ~118g)').click()
      await btn(a, 'Add to Lunch').click(); await sheetGone(a)
      return { sheet: sheetText, last: (await stored(a)).days[today].foods.slice(-1)[0]?.n }
    })
    await done(w, n, 'offline')
  }

  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
