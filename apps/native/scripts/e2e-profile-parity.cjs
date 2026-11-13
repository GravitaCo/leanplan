/**
 * Profile parity, web against native (N10; native-build-brief §1: "parity is tested, not eyeballed").
 * Opens the same seeded account in the real web app and in the native app's code rendered for the
 * web (react-native-web), and compares Profile row by row: the identity card, every row's value and
 * switch, the suggested targets, Daily targets' fields, Health data, Health check answers, Support
 * and helplines; then drives the same actions in both and compares what each stored. Carries over
 * e2e-onboarding's ob7-*, ob10-*, "fix" and health-data-off cases and e2e-wellbeing's wp9 and wp17
 * (settings side) where they touch Profile. Screenshots of both, light and dark, go to E2E_OUT.
 *
 *   (repo root) npm run build && npx vite preview --port 4177 &
 *   (repo root) VITE_ONBOARDING=1 npx vite build --outDir dist-ob && npx vite preview --outDir dist-ob --port 4178 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   (apps/native) EXPO_PUBLIC_ONBOARDING=1 npx expo export --platform web --output-dir dist-web-ob && npx serve -s dist-web-ob -l 4189 &
 *   node scripts/e2e-profile-parity.cjs
 *
 * Every Supabase request is answered by an in-memory stand-in; the real project is never reached.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const WEB_OB = process.env.WEB_OB_URL || 'http://localhost:4178/'
const NATIVE_OB = process.env.NATIVE_OB_URL || 'http://localhost:4189/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-profile-parity-'))
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const UID = '11111111-2222-4333-8444-555555555555'
const NOW = new Date(process.env.E2E_NOW || '2026-11-14T12:00:00')
const ymd = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
const ago = (n) => { const t = new Date(NOW); t.setDate(t.getDate() - n); return ymd(t) }
const agoIso = (n) => new Date(NOW.getTime() - n * 86400000).toISOString()
const today = ymd(NOW)

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(NOW.getTime() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 86400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(NOW.getTime() / 1000) + 86400, refresh_token: 'r', user: USER }
const GRANT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }
const WITHDRAW = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000ab', type: 'health', version: '2026-09-v1', granted: false, at: '2026-10-20T08:00:00.000Z' }

const MEALS = [
  { n: 'Porridge with milk', k: 420, p: 16, c: 60, f: 10, meal: 'breakfast', grams: 300, how: 'search' },
  { n: 'Chicken sandwich', k: 650, p: 32, c: 60, f: 26, meal: 'lunch', grams: 260, how: 'search' },
]

/** One seeded account. `p` patches the profile, `consents` replaces the consent records. */
function state({ p = {}, consents = [GRANT], pause, target = { kcal: 2250, p: 125, c: 260, f: 75 } } = {}) {
  const days = {}
  for (let i = 30; i >= 0; i -= 3) days[ago(i)] = { foods: i === 0 ? MEALS : [], supps: {}, weight: 70 + (i % 2 ? 0.3 : 0), workout: null }
  const u = NOW.toISOString()
  return {
    target,
    schedule: { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Rest', 5: 'Legs', 6: 'Rest' },
    profile: {
      name: 'Sam Taylor', sex: 'F', sexAnswer: 'female', age: 34, height: 168, weight: 70, activityLevel: 'light', activityMult: 1.375,
      supplements: [{ id: 'sp1', name: 'Creatine 5 g', time: '08:00' }, { id: 'sp2', name: 'Vitamin D', time: '09:30' }],
      notificationsEnabled: false, goal: 'maintain', diet: 'vegetarian', accuracy: 'precise', reviewDay: 3, reviewWeight: true, onboardedAt: '2026-09-20T08:00:00.000Z', ...p,
    },
    days, customFoods: [], recipes: [], routines: [], trainingPlans: [],
    consents: { records: consents, ...(pause ? { healthPause: { at: pause } } : {}) },
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}
const ob9 = (wb, x = {}) => ({ outcomes: { readiness: 'clear', wellbeing: wb, baseline: 'ok' }, onboardedAt: agoIso(x.ago ?? 3), answeredAt: { 'outcomes.wellbeing': agoIso(x.ago ?? 3) }, ...(wb === 'flagged' ? { gentle: true } : {}), ...(x.p || {}) })
const BOARD = { outcomes: { readiness: 'flagged', medical: 'flagged', wellbeing: 'flagged', baseline: 'ok' }, pregnancy: { flagged: true, askedAt: today }, gentle: true, answeredAt: { 'outcomes.medical': today + 'T08:00:00.000Z' } }

/** The seeded accounts every row is compared on. */
const SCENARIOS = {
  standard: state(),
  gentle: state({ p: { gentle: true } }),
  'lose fat': state({ p: { goal: 'lose-fat', diet: 'none', accuracy: undefined, supplements: [] } }),
  'lose fat, small and older (floor)': state({ p: { goal: 'lose-fat', age: 66, height: 150, weight: 44, activityLevel: 'sedentary', activityMult: 1.2 } }),
  'build muscle, man': state({ p: { sex: 'M', sexAnswer: 'male', goal: 'build-muscle', height: 182, weight: 84 } }),
  'no goal yet': state({ p: { goal: undefined } }),
  // "Not now" two days ago: health data paused on this phone (a person never asked is held at the consent screen)
  'no name, no age, paused': state({ p: { name: '', age: null, height: null }, consents: [], pause: agoIso(2) }),
  'health data withdrawn': state({ consents: [GRANT, WITHDRAW] }),
  'Sometimes (ob9)': state({ p: ob9('sometimes') }),
  'Yes (ob9), gentle': state({ p: ob9('flagged') }),
  'Yes (ob9), gentle off': state({ p: { ...ob9('flagged'), gentle: false } }),
  'pregnant Sometimes': state({ p: ob9('sometimes', { p: { pregnancy: { flagged: true, askedAt: today } } }) }),
  'conditions (no high protein)': state({ p: { goal: 'lose-fat', outcomes: { readiness: 'clear', medical: 'flagged', baseline: 'ok' }, answeredAt: { 'outcomes.medical': today + 'T08:00:00.000Z' } } }),
  'food off, at risk (wp9)': state({ p: { gentle: true, mind: { off: ['food'] } } }),
  'reminders on (wp17)': state({ p: { notificationsEnabled: true, reviewPush: true, mind: { notify: { checkin: true, 'wind-down': true }, wakeAt: '06:45', windDownAt: '22:15' } } }),
}

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'profile parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 900) : '') }
const norm = (s) => (s ?? '').replace(/[  ]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()

async function open(browser, url, st, { scheme = 'light', native }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme })
  await ctx.addInitScript(([s, data]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', data)
  }, [JSON.stringify(SESSION), JSON.stringify(st)])
  const rows = { consents: (st.consents?.records || []).map((r) => ({ ...r, user_id: UID, recorded_at: r.at })) }
  const net = { posts: [] }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (req.method() !== 'GET') net.posts.push(u)
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(USER) })
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    if (m && req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  await ctx.clock.install({ time: NOW })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  if (native) {
    // as on the phone: the app opens first, then Profile (the avatar's route), so it mounts after launch
    await page.goto(url)
    await page.getByText('This week', { exact: true }).first().waitFor({ timeout: 20000 })
    await page.evaluate(() => { history.pushState({}, '', '/profile'); dispatchEvent(new PopStateEvent('popstate')) })
  } else {
    await page.goto(url)
    await page.getByRole('button', { name: 'Profile', exact: true }).first().click({ timeout: 20000 })
  }
  await page.getByText('Account and data', { exact: true }).first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(400)
  return { ctx, page, errors, net, native }
}

/** The text of the row whose label is exactly `label` (the smallest box around it that is row-sized). */
async function row(page, label) {
  return page.evaluate((label) => {
    const els = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.trim() === label && e.getClientRects().length)
    const el = els[0]
    if (!el) return null
    let best = el, cur = el.parentElement
    while (cur && cur.getBoundingClientRect().height < 96 && cur.innerText.split('\n').filter(Boolean).length <= 4) { best = cur; cur = cur.parentElement }
    const sw = best.querySelector('[role="switch"], input[type="checkbox"]')
    const swState = sw ? ` [switch ${(sw.checked ?? sw.getAttribute('aria-checked') === 'true') ? 'on' : 'off'}${sw.disabled || sw.getAttribute('aria-disabled') === 'true' ? ', disabled' : ''}]` : ''
    return best.innerText.replace(/\s*\n\s*/g, ' | ').trim() + swState
  }, label)
}

/** Expand a disclosure (or press a row) by its label. */
async function press(page, label) {
  await page.getByText(label, { exact: true }).first().click()
  await page.waitForTimeout(250)
}

const ROWS = ['Body and goal', 'Daily targets', 'Training', 'Supplements', 'Diet', 'Hand portions', 'Accuracy', 'Display', 'Review day', 'Include weight in reviews',
  'Supplement reminders', 'Weekly review reminder', 'Check-in', 'Wind-down', 'Plan check-in', 'Mind', 'Food', 'Move', 'Account', 'Health data', 'Back up and restore', 'Delete account', 'Send feedback', 'About Tilo', 'Privacy']

/** Rows and values that differ on purpose: the web in a browser has push, the phone doesn't until N12. */
const pushRow = (label) => ['Supplement reminders', 'Weekly review reminder', 'Check-in', 'Wind-down', 'Plan check-in'].includes(label)

async function facts(page) {
  const f = {}
  for (const l of ROWS) f[l] = await row(page, l)
  f.identity = norm(await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /^(Sam Taylor|Add your name)$/.test(e.textContent.trim()))
    let cur = els[0]; for (let i = 0; i < 6 && cur && cur.innerText.split('\n').length < 3; i++) cur = cur.parentElement
    return cur ? cur.innerText : null
  }))
  return f
}

/** The suggested-targets card (or the foot asking for age and height), with Body and goal open. */
async function suggestion(page) {
  const card = page.locator('#sug-targets, [data-testid="sug-targets"]')
  if (await card.count()) return norm(await card.first().innerText())
  const foot = page.getByText(/^Add age/)
  return (await foot.count()) ? norm(await foot.first().innerText()) : null
}

/** The values in the open section's fields, in order (Daily targets). */
const inputs = (page) => page.evaluate(() => [...document.querySelectorAll('input:not([type=file]):not([type=checkbox]), textarea')].filter((e) => e.getClientRects().length && !e.closest('[role=switch]')).map((e) => e.value))

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1')))

async function pair(browser, st, opts = {}) {
  const w = await open(browser, opts.ob ? WEB_OB : WEB, st, { ...opts, native: false })
  const n = await open(browser, opts.ob ? NATIVE_OB : NATIVE, st, { ...opts, native: true })
  return { w, n, close: async () => { await w.ctx.close(); await n.ctx.close() } }
}

async function run(name, fn) {
  if (ONLY && !ONLY.test(name)) return
  try { await fn() } catch (e) { bad++; console.log('FAIL', 'profile parity:', name, String(e).slice(0, 400)) }
}

async function main() {
  const browser = await chromium.launch()

  // 1. Every row, its value and its switch; the identity card; the suggestion; Daily targets' fields
  for (const [label, st] of Object.entries(SCENARIOS)) {
    await run(`rows: ${label}`, async () => {
      const { w, n, close } = await pair(browser, st)
      const fw = await facts(w.page), fn = await facts(n.page)
      if (process.env.DUMP) console.log(JSON.stringify({ label, web: fw, native: fn }, null, 1))
      check(`${label}: identity card`, fw.identity === fn.identity, { web: fw.identity, native: fn.identity })
      for (const l of ROWS) {
        if (fw[l] === null && fn[l] === null) continue
        if (pushRow(l)) {
          // the label, sub and value match; the switch is disabled on the phone until N12 (push)
          const strip = (x) => (x || '').replace(/ \[switch .*\]$/, '').replace(/ \| (On|Off|Not supported in this browser|Blocked in your phone settings)$/, '')
          check(`${label}: row "${l}" (words)`, strip(fw[l]) === strip(fn[l]), { web: fw[l], native: fn[l] })
          check(`${label}: row "${l}" disabled on the phone (no push yet)`, /disabled\]$/.test(fn[l] || ''), fn[l])
          continue
        }
        check(`${label}: row "${l}"`, fw[l] === fn[l], { web: fw[l], native: fn[l] })
      }
      await press(w.page, 'Body and goal'); await press(n.page, 'Body and goal')
      const sw = await suggestion(w.page), sn = await suggestion(n.page)
      if (process.env.DUMP) console.log(JSON.stringify({ web: [(await stored(w.page)).profile, await inputs(w.page)], native: [(await stored(n.page)).profile, await inputs(n.page)] }))
      check(`${label}: suggested targets`, sw === sn, { web: sw, native: sn })
      await press(w.page, 'Body and goal'); await press(n.page, 'Body and goal')
      if ((await w.page.getByText('Daily targets', { exact: true }).count()) > 0) {
        await press(w.page, 'Daily targets'); await press(n.page, 'Daily targets')
        const iw = await inputs(w.page), inn = await inputs(n.page)
        check(`${label}: Daily targets fields`, JSON.stringify(iw) === JSON.stringify(inn), { web: iw, native: inn })
      }
      check(`${label}: no page errors`, !w.errors.length && !n.errors.length, { web: w.errors, native: n.errors })
      await close()
    })
  }

  // 2. Light and dark screenshots of the standard account, top to bottom
  for (const scheme of ['light', 'dark']) {
    await run(`screenshots ${scheme}`, async () => {
      const { w, n, close } = await pair(browser, SCENARIOS.standard, { scheme })
      // the native screen scrolls inside its own view, so give both pages the whole height
      for (const pg of [w.page, n.page]) { await pg.setViewportSize({ width: 390, height: 2900 }); await pg.waitForTimeout(300) }
      await w.page.screenshot({ path: path.join(OUT, `profile-${scheme}-web.png`), fullPage: true })
      await n.page.screenshot({ path: path.join(OUT, `profile-${scheme}-native.png`), fullPage: true })
      check(`${scheme}: no page errors`, !w.errors.length && !n.errors.length, { web: w.errors, native: n.errors })
      await close()
    })
  }

  // 2b. Open states, both apps, light and dark: Body and goal, Daily targets, Health data, the answers, Support
  for (const scheme of ['light', 'dark']) {
    await run(`screenshots open ${scheme}`, async () => {
      const { w, n, close } = await pair(browser, state({ p: { ...BOARD, goal: 'lose-fat', gentle: false } }), { scheme, ob: true })
      const snap = async (name) => {
        await w.page.screenshot({ path: path.join(OUT, `${name}-${scheme}-web.png`) })
        await n.page.screenshot({ path: path.join(OUT, `${name}-${scheme}-native.png`) })
      }
      for (const pg of [w.page, n.page]) { await press(pg, 'Body and goal'); await pg.getByText('Main goal', { exact: true }).first().scrollIntoViewIfNeeded() }
      await snap('open-body')
      for (const pg of [w.page, n.page]) { await press(pg, 'Body and goal'); await press(pg, 'Health data') }
      await snap('health-data')
      for (const pg of [w.page, n.page]) { await pg.getByText('Health check answers', { exact: true }).first().click(); await pg.waitForTimeout(300) }
      await snap('answers')
      check(`open ${scheme}: no page errors`, !w.errors.length && !n.errors.length, { web: w.errors, native: n.errors })
      await close()
    })
  }

  // 3. The same actions, the same stored result
  const both = async (st, act, read, opts = {}) => {
    const { w, n, close } = await pair(browser, st, opts)
    await act(w.page, false); await act(n.page, true)
    await w.page.waitForTimeout(300); await n.page.waitForTimeout(300)
    const r = [await read(w.page), await read(n.page)]
    await close()
    return r
  }
  // equal, and not equal by both finding nothing (an empty list, string or null proves nothing)
  const empty = (x) => x == null || x === '' || (Array.isArray(x) && !x.length) || x === false
  const same = (name, [a, b]) => check(name, JSON.stringify(a) === JSON.stringify(b) && !empty(a), { web: a, native: b })

  await run('Use these targets', async () => same('Use these targets stores the same targets', await both(SCENARIOS['lose fat'], async (p) => {
    await press(p, 'Body and goal'); await p.getByText('Use these targets', { exact: true }).click()
  }, async (p) => (await stored(p)).target)))

  await run('Save targets (floor and cap)', async () => same('Save targets applies the same floor and range cap', await both(SCENARIOS.standard, async (p) => {
    await press(p, 'Daily targets')
    const f = p.locator('input:not([type=file]):not([type=checkbox])')
    await f.nth(0).fill('900'); await f.nth(1).fill('650'); await f.nth(2).fill('140')
    await p.getByText('Save targets', { exact: true }).click()
  }, async (p) => { const s = await stored(p); return { target: s.target, width: s.profile.rangeWidth, fields: await inputs(p) } })))

  await run('goal chip', async () => same('choosing a goal stores it and shows the same suggestion', await both(SCENARIOS.standard, async (p) => {
    await press(p, 'Body and goal'); await p.getByText('Build muscle', { exact: true }).click()
  }, async (p) => ({ goal: (await stored(p)).profile.goal, sug: await suggestion(p) }))))

  await run('Save metrics', async () => same('Save metrics stores the same body details', await both(SCENARIOS.standard, async (p) => {
    await press(p, 'Body and goal')
    const f = p.locator('input:not([type=file]):not([type=checkbox])')
    await f.nth(0).fill('41'); await f.nth(1).fill('171'); await f.nth(2).fill('68.4')
    await p.getByText('Save metrics', { exact: true }).click()
  }, async (p) => { const s = await stored(p); return { age: s.profile.age, height: s.profile.height, w: s.days[today].weight, sug: await suggestion(p) } })))

  await run('Display gentle', async () => same('Display: Gentle stores gentle and changes the row', await both(SCENARIOS.standard, async (p) => {
    await press(p, 'Display'); await p.getByRole('radio', { name: 'Gentle' }).click(); await press(p, 'Display')
  }, async (p) => ({ gentle: (await stored(p)).profile.gentle, row: await row(p, 'Display'), weight: await row(p, 'Include weight in reviews') }))))

  await run('Diet and Accuracy', async () => same('Diet and Accuracy store the same choice', await both(SCENARIOS.standard, async (p) => {
    await press(p, 'Diet'); await p.getByRole('radio', { name: 'None' }).click(); await press(p, 'Diet')
    await press(p, 'Accuracy'); await p.getByRole('radio', { name: 'Relaxed' }).click(); await press(p, 'Accuracy')
  }, async (p) => { const s = await stored(p); return { diet: s.profile.diet, acc: s.profile.accuracy, d: await row(p, 'Diet'), a: await row(p, 'Accuracy') } })))

  await run('supplement add and delete', async () => same('Supplements: add and delete store the same list', await both(SCENARIOS.standard, async (p) => {
    await press(p, 'Supplements')
    await p.getByText('Add supplement', { exact: true }).click()
    const f = p.locator('input:not([type=file]):not([type=checkbox])')
    await f.nth(0).fill('Omega 3'); await f.nth(1).fill('07:15')
    await p.getByText('Add', { exact: true }).click()
    await p.getByText('Delete', { exact: true }).first().click()
  }, async (p) => (await stored(p)).profile.supplements.map((s) => s.name + ' ' + s.time))))

  // wp9: pillars. Food off for someone at risk shows B1.14 and B1.16; the last pillar on can't move
  await run('wp9 pillars', async () => same('wp9: Food off, then Move off, the same feet and stored prefs', await both(SCENARIOS.gentle, async (p) => {
    await p.getByRole('switch', { name: 'Food' }).click(); await p.waitForTimeout(200)
    await p.getByRole('switch', { name: 'Move' }).click(); await p.waitForTimeout(200)
  }, async (p) => {
    const t = norm(await p.innerText('body'))
    return { off: (await stored(p)).profile.mind?.off, mind: await row(p, 'Mind'), b116: /Finding food tracking hard\? Gentle display hides the numbers, and support is here\./.test(t), b18: t.includes("Keep at least one on. One that's off leaves Today") }
  })))
  await run('wp9 asks', async () => same('wp9: Fewer prompts stores the same', await both(SCENARIOS.standard, async (p) => {
    await p.getByRole('radio', { name: 'Fewer prompts' }).click()
  }, async (p) => (await stored(p)).profile.mind?.asks)))

  // wp17 (settings side): Your times are shown and saved; on the phone no reminder switch moves
  await run('wp17 times', async () => same('wp17: Your times show the same and a new wake time is stored', await both(SCENARIOS['reminders on (wp17)'], async (p, native) => {
    const f = p.getByLabel('Usually up around', { exact: true })
    if (native) await f.fill('07:05'); else await f.fill('07:05')
  }, async (p) => { const m = (await stored(p)).profile.mind; return { wake: m.wakeAt, wind: m.windDownAt } })))
  await run('wp17 no push on the phone', async () => {
    const { w, n, close } = await pair(browser, SCENARIOS['reminders on (wp17)'])
    const before = JSON.stringify((await stored(n.page)).profile)
    for (const l of ['Supplement reminders', 'Weekly review reminder', 'Check-in reminders']) await n.page.getByRole('switch', { name: l }).click({ force: true }).catch(() => {})
    await n.page.waitForTimeout(300)
    check('wp17: tapping a reminder switch on the phone changes nothing on the account', JSON.stringify((await stored(n.page)).profile) === before)
    check('wp17: no network write from the phone', !n.net.posts.length, n.net.posts)
    check('wp17: supplement reminders say what the web says without push', /Not supported in this browser/.test(await row(n.page, 'Supplement reminders')))
    void w
    await close()
  })

  // Health data, Support and helplines (ob10), Health check answers (ob7): the onboarding build
  await run('ob10 health data and support', async () => {
    for (const nation of [null, 'Scotland', 'Northern Ireland']) {
      const r = await both(SCENARIOS.standard, async (p) => {
        await press(p, 'Health data')
        await p.getByText('Support and helplines', { exact: true }).first().click(); await p.waitForTimeout(300)
        if (nation) { await p.getByText('Choose', { exact: true }).click(); await p.getByRole('radio', { name: nation }).click(); await p.waitForTimeout(200) }
      }, async (p) => {
        const t = norm(await p.innerText('body'))
        const i = t.lastIndexOf('People you can talk to')
        return t.slice(i, t.indexOf('All calls are free.', i) + 19).replace(/\n/g, ' | ')
      })
      same(`ob10 support list${nation ? ' for ' + nation : ' (whole UK)'}`, r)
    }
  })
  for (const [label, st] of [['on', SCENARIOS.standard], ['withdrawn', SCENARIOS['health data withdrawn']], ['paused', SCENARIOS['no name, no age, paused']], ['board answers', state({ p: BOARD })]]) {
    await run(`health data sheet: ${label}`, async () => same(`health data sheet (${label}): the same words, rows and buttons`, await both(st, async (p) => { await press(p, 'Health data') }, async (p) => {
      const t = norm(await p.innerText('body'))
      const i = t.lastIndexOf('Health data\n')
      const words = ['Tilo keeps your log', 'You’ve said no', 'To build your plan, Tilo asks', 'Nothing syncs to your account or is backed up there', 'Your log is on this phone only', 'Health check answers', 'Redo setup', 'Set up my plan', 'Support and helplines', 'Yes, keep it', 'Stop keeping my health data', 'Read the privacy notice']
      return words.filter((x) => t.slice(i).includes(x))
    }, { ob: true })))
  }

  const toAnswers = async (p) => { await press(p, 'Health data'); await p.getByText('Health check answers', { exact: true }).first().click(); await p.getByText('Answers from your health check, and what each one changes.').waitFor() }
  const answersText = async (p) => { const t = norm(await p.innerText('body')); const i = t.indexOf('Answers from your health check'); return t.slice(i, t.indexOf('Clearing these changes', i)).replace(/\n/g, ' | ') }
  for (const [label, p] of [['ob7-1 board', BOARD], ['ob10 Sometimes', ob9('sometimes')], ['ob10 Yes with range', ob9('flagged', { p: { foodOptIn: { range: 'shown', rangeAt: today } } })], ['fix pregnant Sometimes', ob9('sometimes', { p: { pregnancy: { flagged: true, askedAt: today } } })]]) {
    await run(`answers: ${label}`, async () => same(`${label}: the same answer rows`, await both(state({ p }), toAnswers, answersText, { ob: true })))
  }
  await run('ob7-2 clear pregnancy', async () => same('ob7-2: confirm, Keep it, then Clear: the same rows and stored answers', await both(state({ p: { outcomes: { readiness: 'clear' }, pregnancy: { flagged: true, askedAt: today } } }), async (p) => {
    await toAnswers(p)
    await p.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click()
    await p.getByText('Your food targets will show calorie numbers again, and training goes back to your usual pace.').waitFor()
    await p.getByText('Keep it', { exact: true }).click(); await p.waitForTimeout(200)
    await p.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click()
    await p.getByText('Clear', { exact: true }).last().click()
    await p.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1')).profile.pregnancy)
  }, async (p) => { const s = await stored(p); return { preg: s.profile.pregnancy ?? null, kcal: s.target.kcal, rows: await answersText(p) } }, { ob: true })))
  await run('ob7-2 variants', async () => {
    for (const [line, p] of [['Calorie numbers stay hidden while gentle mode is on.', BOARD], ['Your gentler start stays until you clear it too.', { outcomes: { readiness: 'flagged' }, pregnancy: { flagged: true, askedAt: today } }]]) {
      same(`ob7-2 variant: "${line}"`, await both(state({ p }), async (pg) => { await toAnswers(pg); await pg.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click(); await pg.waitForTimeout(300) },
        async (pg) => (await pg.getByText(line, { exact: false }).count()) > 0, { ob: true }))
    }
  })
  await run('ob7 change conditions and food and weight', async () => same('ob7: Change conditions to None and food and weight to No: the same outcomes', await both(state({ p: { outcomes: { medical: 'flagged', wellbeing: 'flagged' }, gentle: true, answeredAt: { 'outcomes.medical': today + 'T08:00:00.000Z', 'outcomes.wellbeing': agoIso(7) } } }), async (p) => {
    await toAnswers(p)
    await p.getByRole('button', { name: 'Change conditions or medicines' }).click()
    await p.getByRole('checkbox', { name: 'None of these' }).click()
    await p.getByText('Done', { exact: true }).last().click(); await p.waitForTimeout(300)
    await p.getByRole('button', { name: 'Change food and weight' }).click()
    await p.getByRole('radio', { name: 'No', exact: true }).click()
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.outcomes.wellbeing === 'clear')
  }, async (p) => { const s = await stored(p); return { o: s.profile.outcomes, gentle: s.profile.gentle, rows: await answersText(p) } }, { ob: true })))
  await run('ob10 where your food range shows', async () => same('ob10: On Today then On Food stores the same answer', await both(state({ p: ob9('sometimes') }), async (p) => {
    await toAnswers(p)
    const shows = p.getByTestId('food-shows')
    await shows.getByRole('radio', { name: 'On Today' }).click(); await p.waitForTimeout(200)
    await shows.getByRole('radio', { name: 'On Food' }).click()
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.foodOptIn?.today === 'food')
  }, async (p) => ({ v: (await stored(p)).profile.foodOptIn?.today, line: await p.getByText('Your range shows on Food, not on Today.').count() }), { ob: true })))

  // health data off: a height saved on Profile isn't kept (the store's rule, the same on both)
  await run('health data off: height', async () => same('health data off: saving a height stores the same (nothing kept)', await both(SCENARIOS['health data withdrawn'], async (p) => {
    await press(p, 'Body and goal')
    await p.locator('input:not([type=file]):not([type=checkbox])').nth(1).fill('175')
    await p.getByText('Save metrics', { exact: true }).click()
  }, async (p) => ({ height: (await stored(p)).profile.height ?? null }))))

  // Sign out: the sheet says the same things
  await run('sign out sheet', async () => same('Sign out: the same words and buttons', await both(SCENARIOS['no name, no age, paused'], async (p) => {
    await p.getByText('Sign out', { exact: true }).last().click(); await p.waitForTimeout(300)
  }, async (p) => { const t = norm(await p.innerText('body')); const i = t.lastIndexOf('What you log now'); const e = t.indexOf('Sign out and remove this device’s log', i); return t.slice(i, e + 37).replace(/\n/g, ' | ') })))

  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
