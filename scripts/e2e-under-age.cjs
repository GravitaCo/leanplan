/**
 * Headless end-to-end check of the 18+ rule (Benn, Sept 2026) on every path an age comes in by:
 * Profile save, backup import, a launch with a stored under-18 age, and the wizard's stop (boards
 * "Age 18+ · 1" and "· 2"). The app's stop is on the normal build; the wizard's needs the flag on:
 *
 *   VITE_ONBOARDING=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4195 &
 *   npm run build && npx vite preview --port 4196 &
 *   E2E_URL=http://localhost:4196/ E2E_URL_ON=http://localhost:4195/ node scripts/e2e-under-age.cjs
 *
 * Needs Playwright (global install is fine; browsers in PLAYWRIGHT_BROWSERS_PATH). Every Supabase
 * request goes to an in-memory PostgREST stand-in; the real project is never reached. Screenshots
 * of the stop screen (light and dark, 390×844) go to E2E_OUT.
 */
const { chromium } = (() => { try { return require('playwright') } catch { return require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright') } })()
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const BASE = process.env.E2E_URL || 'http://localhost:4196/'
const ON = process.env.E2E_URL_ON || 'http://localhost:4195/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-age-e2e-'))
fs.mkdirSync(OUT, { recursive: true })
const UID = '11111111-2222-4333-8444-555555555555'
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400, iat: now, amr: [{ method: 'password', timestamp: now - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const sessionOf = (authAgoS) => ({ access_token: fakeJwt(UID, authAgoS), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user: USER })
const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
const PROFILE = { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 70, activityLevel: 'light', supplements: [], notificationsEnabled: false, onboardedAt: '2026-09-20T08:00:00.000Z', activityMult: 1.3 }
/** a signed-in, consented, synced device (as the app saves it) */
function deviceState({ profile = PROFILE, days = {} } = {}) {
  const u = new Date().toISOString()
  return {
    days, profile, consents: GRANTED,
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}
/** a new account for the wizard: consented, nothing onboarded */
function newAccount() {
  const u = new Date().toISOString()
  return { days: {}, consents: GRANTED, _meta: { settings: { u, dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID } }
}

async function scenario(browser, name, fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light', acceptDownloads: true })
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    if (st) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(sessionOf(opts.authAgoS ?? 10)), JSON.stringify(opts.state ?? deviceState())])
  // Web Push stubbed on the page (headless has no push service): one subscription, counted.
  // sessionStorage 'e2e.push' = { unsub: 'ok' | 'fail', sub: 'ok' | 'fail', active } survives reloads
  if (opts.push) await ctx.addInitScript((mode) => {
    const load = () => JSON.parse(sessionStorage.getItem('e2e.push') || 'null') || { ...mode, active: true, unsubs: 0, subs: 0 }
    const save = (x) => sessionStorage.setItem('e2e.push', JSON.stringify(x))
    save(load())
    const sub = { endpoint: 'https://push.example/e2e-endpoint', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'p', auth: 'a' } } },
      async unsubscribe() { const x = load(); x.unsubs++; if (x.unsub === 'fail') { save(x); throw new Error('push service unreachable') } x.active = false; save(x); return true } }
    const pm = { async getSubscription() { return load().active ? sub : null },
      async subscribe() { const x = load(); x.subs++; if (x.sub === 'fail') { save(x); throw new Error('no gesture') } x.active = true; save(x); return sub } }
    const reg = { pushManager: pm }
    navigator.serviceWorker.getRegistration = async () => reg
    Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve(reg) })
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' })
    Notification.requestPermission = async () => 'granted'
    window.__setPush = (m) => save({ ...load(), ...m })
  }, { unsub: 'ok', sub: 'ok', ...opts.push })
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [{ id: GRANTED.records[0].id, user_id: UID, type: 'health', version: '2026-09-v1', granted: true, recorded_at: GRANTED.records[0].at }], routines: [], training_plans: [], ...(opts.rows || {}) }
  // every request to the backend, by kind: `writes` are uploads, `reads` pulls, `fnCalls` functions
  const net = { writes: [], reads: [], fnCalls: [] }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/functions/v1/')) {
      net.fnCalls.push({ url, body: JSON.parse(req.postData() || '{}') })
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true }) })
    }
    if (url.includes('/auth/v1/token')) {
      const body = JSON.parse(req.postData() || '{}')
      if (body.password !== 'right-password') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionOf(1)) })
    }
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) })
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    const t = m[1]
    if (req.method() === 'GET') { net.reads.push(t); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows[t] || []) }) }
    const list = JSON.parse(req.postData() || '[]')
    net.writes.push({ t, list, method: req.method(), url })
    for (const row of [].concat(list)) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...row }; else rows[t].push(row)
    }
    return route.fulfill({ status: 201, body: '' })
  })
  await ctx.route(/openfoodfacts\.org/, (r) => r.abort())
  // the backend unreachable from the start (a launch with no connection to it)
  if (opts.offlineFirst) await ctx.route(/supabase\.co\//, (r) => { net.reads.push('blocked'); return r.abort() })
  const page = await ctx.newPage()
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

const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const tab = (page, name) => page.locator('nav.tabbar').getByRole('button', { name }).click()
const h1 = (page, text) => page.getByRole('heading', { name: text, exact: true }).waitFor()
const btn = (page, name) => page.getByRole('button', { name, exact: true })
/** the wizard's age wheel (role=slider), set by keyboard: one nudge so it counts as picked, then the arrow keys */
async function slide(page, name, target) {
  const sl = page.getByRole('slider', { name, exact: true }).first()
  await sl.focus(); await sl.press('ArrowUp'); await sl.press('ArrowDown')
  let now = +(await sl.getAttribute('aria-valuenow'))
  for (let i = 0; i < 200 && now !== target; i++) { await sl.press(now < target ? 'ArrowUp' : 'ArrowDown'); now = +(await sl.getAttribute('aria-valuenow')) }
}
const shot = async (page, name) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, name + '.png') }) }
const STOP = '[data-testid="age-stop"]'
/** the stop's copy (board "Age 18+ · 1"), and its signposts with the checked numbers */
async function stopCopy(page, { saved }) {
  await page.locator(STOP).waitFor()
  await h1(page, 'Tali is for 18+')
  const text = await page.locator(STOP).innerText()
  for (const t of [
    'Thanks for using Tali. It’s made for people aged 18 and over, so we need to close your account. That’s about how Tali is built, not about you or anything you’ve logged.',
    'Tali’s food and activity targets are made for adults, not for bodies that are still growing.',
    'Childline', 'Free and confidential for anyone under 19. Call or chat online, any time.', '0800 1111',
    'Beat', 'If food, eating or your body feel hard to think about. 3pm–8pm, Monday to Friday. Webchat too.',
    '0808 801 0677', '0808 801 0432', '0808 801 0433', '0808 801 0434',
    'Emergency', 'If you or someone else is in danger now', '999',
    'Closing deletes your account and everything logged in it, on this phone and on our servers.',
    'Close and delete', 'I typed my age wrong',
  ]) expect(text.includes(t), 'stop copy missing: ' + t)
  expect(text.includes('Your age hasn’t been saved.') === saved, 'the "not saved" line only when the age wasn’t stored')
  expect((await page.locator('nav.tabbar').count()) === 0, 'nothing of the app behind it')
}
async function typeAge(page, age) {
  await tab(page, 'Profile')
  await page.getByRole('button', { name: /Body and goal/ }).click()
  await page.getByPlaceholder('35').fill(String(age))
  await btn(page, 'Save metrics').click()
}
/** uploads of the settings row (the profile): the one a saved age would go in */
const settingsWrites = (net) => net.writes.filter((w) => w.t === 'settings')
const pushState = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('e2e.push') || 'null'))
const REMINDERS = { ...PROFILE, notificationsEnabled: true }

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const run = async (...a) => results.push(await scenario(browser, ...a))

  await run('Profile: age 15 + Save → the stop; nothing saved, nothing synced', async ({ page, net }) => {
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    await page.waitForTimeout(1200) // the launch sync settles
    const before = await stored(page)
    const w0 = net.writes.length, r0 = net.reads.length
    const input = page.getByPlaceholder('35')
    await tab(page, 'Profile'); await page.getByRole('button', { name: /Body and goal/ }).click()
    expect(await input.getAttribute('min') === '18' && await input.getAttribute('max') === '120' && await input.getAttribute('inputmode') === 'numeric', 'min 18, max 120, numeric keyboard')
    await input.fill('15')
    await page.waitForTimeout(300)
    expect((await page.locator(STOP).count()) === 0, 'never while typing')
    await btn(page, 'Save metrics').click()
    await stopCopy(page, { saved: true })
    await shot(page, 'age-stop-light')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await shot(page, 'age-stop-light-bottom')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(2500) // longer than the sync debounce
    const after = await stored(page)
    expect(after.profile.age === 34, 'age not saved: ' + after.profile.age)
    expect(JSON.stringify(after.profile) === JSON.stringify(before.profile) && JSON.stringify(after._meta.settings) === JSON.stringify(before._meta.settings), 'no profile change, no dirty flag')
    expect(net.writes.length === w0 && net.reads.length === r0, `sync not attempted (writes ${net.writes.length - w0}, reads ${net.reads.length - r0})`)
    // the label reader can't be reached either: nothing of the app shows, and no function was called
    expect(net.fnCalls.length === 0, 'no function called')
  })

  await run('Profile: the stop in dark mode', async ({ page }) => {
    await page.locator('.hdr .cpill').waitFor()
    await typeAge(page, 15)
    await stopCopy(page, { saved: true })
    await shot(page, 'age-stop-dark')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await shot(page, 'age-stop-dark-bottom')
  }, { dark: true })

  await run('"I typed my age wrong" (Profile) → back to Profile, the old age intact', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await typeAge(page, 15)
    await page.locator(STOP).waitFor()
    await btn(page, 'I typed my age wrong').click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    expect((await page.locator(STOP).count()) === 0, 'stop gone')
    expect(await page.getByPlaceholder('35').inputValue() === '34', 'the form shows the stored age')
    expect((await stored(page)).profile.age === 34, 'stored age intact')
    // and an 18 saves normally, and syncs
    await page.getByPlaceholder('35').fill('18')
    await btn(page, 'Save metrics').click()
    await page.waitForTimeout(1500)
    expect((await page.locator(STOP).count()) === 0, 'no stop at 18')
    expect((await stored(page)).profile.age === 18, 'age 18 saved')
    const up = settingsWrites(net).flatMap((w) => [].concat(w.list)).pop()
    expect(up && JSON.stringify(up).includes('"age":18'), 'age 18 synced: ' + JSON.stringify(up)?.slice(0, 200))
  })

  await run('"Close and delete" → the existing delete flow; Cancel comes back to the stop', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await typeAge(page, 16)
    await page.locator(STOP).waitFor()
    await btn(page, 'Close and delete').click()
    await page.getByRole('dialog', { name: 'Delete everything?' }).waitFor()
    await shot(page, 'age-stop-delete-confirm')
    await btn(page, 'Cancel').click()
    await page.locator(STOP).waitFor()
    expect((await page.getByRole('dialog', { name: 'Delete everything?' }).count()) === 0, 'confirm closed, the stop stays')
    const w0 = net.writes.length
    await page.waitForTimeout(1500)
    expect(net.writes.length === w0, 'sync still off after Cancel')
    // and through it: typed DELETE deletes the account and this device's data
    await btn(page, 'Close and delete').click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await btn(page, 'Delete everything').click()
    await page.getByRole('button', { name: /Sign in|Log in/ }).first().waitFor({ timeout: 8000 })
    const del = net.fnCalls.filter((c) => c.url.includes('delete-account'))
    expect(del.length === 1 && del[0].body.confirm === 'delete my account', 'delete-account ran once: ' + JSON.stringify(del))
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k === 'leanplan.v1' || k.startsWith('sb-')))
    const st = await stored(page)
    expect(!left.some((k) => k.startsWith('sb-')) && (!st || (!Object.keys(st.days || {}).length && !st.profile?.age)), 'device wiped: ' + left.join())
  }, { state: deviceState({ days: { [today]: { foods: [{ n: 'Toast', k: 100, p: 4, c: 18, f: 1, grams: 40 }], supps: {}, weight: 70, workout: null } } }) })

  await run('"Close and delete" with an old sign-in asks for the password (re-auth kept)', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await typeAge(page, 16)
    await btn(page, 'Close and delete').click()
    await page.getByLabel('Your password, to confirm it’s you').waitFor()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    expect(await btn(page, 'Delete everything').isDisabled(), 'waits for the password')
    expect(net.fnCalls.length === 0, 'nothing sent')
  }, { authAgoS: 3600 })

  await run('launch with a stored age of 16 → the stop; nothing syncs; "typed wrong" clears it', async ({ page, net }) => {
    await stopCopy(page, { saved: false })
    await shot(page, 'age-stop-launch')
    await page.waitForTimeout(2500)
    expect(net.writes.length === 0 && net.reads.length === 0, `no sync while stopped (writes ${net.writes.length}, reads ${net.reads.length})`)
    await btn(page, 'I typed my age wrong').click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    const st = await stored(page)
    expect(st.profile.age === null && st._meta.settings.dirty === true, 'stored age cleared as an edit: ' + st.profile.age)
    await page.waitForTimeout(2000)
    const up = settingsWrites(net).flatMap((w) => [].concat(w.list)).pop()
    expect(up && JSON.stringify(up).includes('"age":null'), 'the cleared age synced')
  }, { state: deviceState({ profile: { ...PROFILE, age: 16 } }) })

  await run('launch with the backend unreachable and a stored age of 16 → the stop, without waiting on it', async ({ page }) => {
    const t0 = Date.now()
    await stopCopy(page, { saved: false })
    // getSession gives up after 4 s at most; the stop needs no network of its own
    expect(Date.now() - t0 < 6000, 'shown without waiting on the network: ' + (Date.now() - t0) + ' ms')
  }, { state: deviceState({ profile: { ...PROFILE, age: 16 } }), offlineFirst: true })

  await run('sync pull of a profile aged 17 → the stop, no further uploads; "typed wrong" clears it', async ({ page, net }) => {
    await stopCopy(page, { saved: false })
    const w0 = net.writes.length
    await page.waitForTimeout(2000)
    expect(net.writes.length === w0, 'no uploads after the stop')
    expect((await stored(page)).profile.age === 17, 'the pulled age is what the stop is about')
    // typed wrong: the stored 17 is cleared, and the clear wins over the account's stamped age
    await btn(page, 'I typed my age wrong').click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    await page.waitForTimeout(2000)
    const up = settingsWrites(net).flatMap((w) => [].concat(w.list)).pop()
    expect(up && up.profile.age === null, 'the cleared age synced: ' + JSON.stringify(up?.profile?.age))
    expect((await stored(page)).profile.age === null && (await page.locator(STOP).count()) === 0, 'and it stays cleared after the pull')
  }, { rows: { settings: [{ user_id: UID, profile: { ...PROFILE, age: 17, answeredAt: { age: '2026-09-29T10:00:00.000Z' } }, target: { kcal: 2000, p: 120, c: 220, f: 70 }, schedule: { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Rest', 5: 'Legs', 6: 'Rest' }, updated_at: new Date(Date.now() + 60_000).toISOString() }] } })

  await run('backup with age 15 → refused, the stop, nothing on the device changed', async ({ page, net }) => {
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    const before = await stored(page)
    const backup = { ...deviceState({ profile: { ...PROFILE, name: 'Kid', age: 15 }, days: { '2026-09-01': { foods: [{ n: 'Apple', k: 50, p: 0, c: 12, f: 0, grams: 100 }], supps: {}, weight: null, workout: null } } }) }
    const file = path.join(OUT, 'backup-15.json'); fs.writeFileSync(file, JSON.stringify(backup))
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Back up and restore/ }).click()
    await page.locator('input[type="file"]').first().setInputFiles(file)
    // the import sheet's confirm button
    const sheetBtn = page.locator('.btn.tinted', { hasText: 'Import' })
    await sheetBtn.waitFor()
    await sheetBtn.click()
    await stopCopy(page, { saved: false })
    const after = await stored(page)
    expect(after.profile.age === 34 && after.profile.name === 'Sam' && !after.days['2026-09-01'], 'backup not loaded')
    expect(JSON.stringify(after) === JSON.stringify(before), 'nothing on the device changed')
    const w0 = net.writes.length
    await page.waitForTimeout(1500)
    expect(net.writes.length === w0, 'no sync')
    // typed wrong: nothing stored to clear; back to Profile with the age as it was
    await btn(page, 'I typed my age wrong').click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    expect((await stored(page)).profile.age === 34, 'the stored age untouched')
  })

  await run('reminders: the stop ends this device’s push subscription; "typed wrong" brings it back', async ({ page, net }) => {
    await page.locator('.hdr .cpill[data-conn="up-to-date"]').waitFor()
    await page.waitForTimeout(800)
    await typeAge(page, 15)
    await page.locator(STOP).waitFor() // the stop first, whatever the push service does
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('e2e.push')).active === false)
    const del = net.writes.filter((w) => w.t === 'push_subscriptions' && w.method === 'DELETE')
    expect(del.length === 1 && del[0].url.includes('endpoint=eq.'), 'the subscription row deleted through the existing path: ' + del.length)
    const st = await stored(page)
    expect(st._meta.pushHeld === true && st.profile.notificationsEnabled === true && st.profile.age === 34, 'held on this device; the setting and the profile unchanged')
    await btn(page, 'I typed my age wrong').click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('e2e.push')).active === true)
    const up = net.writes.filter((w) => w.t === 'push_subscriptions' && w.method === 'POST')
    expect(up.length === 1, 'registered again: ' + up.length)
    const after = await stored(page)
    expect(!after._meta.pushHeld && after.profile.notificationsEnabled === true, 'restored as it was')
    expect(await page.getByRole('switch', { name: 'Supplement reminders' }).getAttribute('aria-checked') === 'true', 'Profile says on')
  }, { push: {}, state: deviceState({ profile: REMINDERS }) })

  await run('reminders: a failed unsubscribe retries on the next launch; a restore that can’t happen turns them off', async ({ page, net }) => {
    await stopCopy(page, { saved: false }) // stored age 16: the stop at launch
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('e2e.push')).unsubs >= 1)
    expect((await pushState(page)).active === true && (await stored(page))._meta.pushHeld === true, 'the push service failed: still held, still to do')
    await page.evaluate(() => window.__setPush({ unsub: 'ok', sub: 'fail' }))
    await page.reload()
    await page.locator(STOP).waitFor()
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('e2e.push')).active === false)
    expect(net.writes.filter((w) => w.t === 'settings').length === 0, 'still no sync')
    await btn(page, 'I typed my age wrong').click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    await page.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('leanplan.v1')); return s.profile.notificationsEnabled === false && !s._meta.pushHeld })
    expect(await page.getByRole('switch', { name: 'Supplement reminders' }).getAttribute('aria-checked') === 'false', 'Profile says off')
  }, { push: { unsub: 'fail' }, state: deviceState({ profile: { ...REMINDERS, age: 16 } }) })

  await run('redo setup (flag on, existing account): the app stop, Close and delete, typed wrong back to the age question', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).click()
    await page.getByRole('button', { name: 'Redo setup' }).click()
    await h1(page, 'What do you like to be called?')
    await btn(page, 'Continue').click()
    await h1(page, 'How old are you?')
    await slide(page, 'Age in years', 15); await btn(page, 'Continue').click()
    await stopCopy(page, { saved: true })
    await shot(page, 'age-stop-redo')
    expect(!(await page.locator(STOP).innerText()).includes('Closing deletes your new account'), 'not the first-run note')
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('tali.onboarding') || 'null'))
    expect(!draft || draft.age == null, 'no under-18 age kept in the draft: ' + draft?.age)
    const w0 = net.writes.length
    await page.waitForTimeout(1500)
    expect(net.writes.length === w0 && net.fnCalls.length === 0, 'nothing synced, nothing deleted by itself')
    await btn(page, 'Close and delete').click()
    await page.getByRole('dialog', { name: 'Delete everything?' }).waitFor()
    await btn(page, 'Cancel').click()
    await page.locator(STOP).waitFor()
    await btn(page, 'I typed my age wrong').click()
    await h1(page, 'How old are you?')
    expect((await stored(page)).profile.age === 34 && (await stored(page)).profile.name === 'Sam', 'nothing saved')
    await slide(page, 'Age in years', 34); await btn(page, 'Continue').click()
    await h1(page, 'A few health questions')
  }, { url: ON })

  await run('redo setup: Close and delete runs the usual deletion, not the under-age one', async ({ page, net }) => {
    await page.locator('.hdr .cpill').waitFor()
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).click()
    await page.getByRole('button', { name: 'Redo setup' }).click()
    await h1(page, 'What do you like to be called?'); await btn(page, 'Continue').click()
    await h1(page, 'How old are you?')
    await slide(page, 'Age in years', 16); await btn(page, 'Continue').click()
    await page.locator(STOP).waitFor()
    await btn(page, 'Close and delete').click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await btn(page, 'Delete everything').click()
    await page.getByRole('button', { name: /Sign in|Log in/ }).first().waitFor({ timeout: 8000 })
    const del = net.fnCalls.filter((c) => c.url.includes('delete-account'))
    expect(del.length === 1 && del[0].body.reason !== 'under-age', 'one ordinary deletion: ' + JSON.stringify(del))
  }, { url: ON })

  await run('wizard stop (flag on): Childline, Beat and 999, the new copy', async ({ page }) => {
    await h1(page, 'A few questions, so Tali fits you')
    await btn(page, 'Let’s go').click()
    await h1(page, 'What do you like to be called?')
    await page.getByPlaceholder('Sam').fill('Sam'); await btn(page, 'Continue').click()
    await h1(page, 'How old are you?')
    await slide(page, 'Age in years', 15); await btn(page, 'Continue').click()
    await h1(page, 'Tali is for 18+')
    const text = await page.locator('[data-testid="age-stop-wizard"]').innerText()
    for (const t of [
      'Thanks for giving it a try. Tali is made for people aged 18 and over, so we can’t set you up just yet.',
      'If you’d like help with food, being active or how you’re feeling, a parent or carer, another adult you trust, your school or college nurse, or your GP is a good place to start.',
      'Childline', '0800 1111', 'Beat', '0808 801 0677', '0808 801 0434', 'Emergency', '999',
      'We haven’t kept any of your answers. Closing deletes your new account.', 'Close', 'I typed my age wrong',
    ]) expect(text.includes(t), 'wizard stop copy missing: ' + t)
    await shot(page, 'age-stop-wizard')
  }, { url: ON, state: newAccount() })

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
