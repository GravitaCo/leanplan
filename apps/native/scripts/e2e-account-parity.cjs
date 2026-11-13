/**
 * N2 parity: account, consent and legal on native, checked against the web (native-build-brief §1:
 * "parity is tested, not eyeballed"). Carries over scripts/e2e-foundations.cjs's consent,
 * withdrawal, existing-user and delete-account cases and scripts/e2e-under-age.cjs's launch, sync
 * and backup cases, run against the native app's code rendered for the web (react-native-web), and
 * compares each screen's words with the web app's for the same state, light and dark screenshots of
 * both going to E2E_OUT for `design`.
 *
 *   (repo root) npm run build && npx vite preview --port 4176 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && (cd dist-web && python3 -m http.server 4188) &
 *   WEB_URL=http://localhost:4176/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-account-parity.cjs
 *
 * Every Supabase request is answered by the same in-memory stand-in as the web's e2e scripts; the
 * real project is never reached. Not covered here (the web render can't show them): the share sheet
 * and document picker (the web render uses the browser's download and file picker in their place),
 * Google's system sign-in sheet, and tilo:// links. Not yet covered: Profile's age field (N10) and the
 * wizard's stop (N11).
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const WEB = process.env.WEB_URL || 'http://localhost:4176/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-n2-'))
fs.mkdirSync(OUT, { recursive: true })
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const UID = '11111111-2222-4333-8444-555555555555'
const OTHER = '99999999-2222-4333-8444-555555555555'
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400, iat: now, amr: [{ method: 'password', timestamp: now - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const sessionOf = (authAgoS) => ({ access_token: fakeJwt(UID, authAgoS), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user: USER })

const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
const NONE = { records: [] }
const PROFILE = { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 70, activityLevel: 'light', supplements: [], notificationsEnabled: false, onboardedAt: '2026-09-20T08:00:00.000Z', activityMult: 1.3 }
function deviceState({ days = {}, dirty = [], consents = GRANTED, pulled = true, owner = UID, profile } = {}) {
  const u = new Date().toISOString()
  return {
    days, ...(profile ? { profile } : {}), ...(consents ? { consents } : {}),
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: dirty.includes(d) }])), foodDeletes: [], recipeDeletes: [], lastPull: pulled ? u : null, ...(owner ? { owner } : {}) },
  }
}
const aDay = (weight, checkin) => ({ foods: [{ n: 'Toast', k: 100, p: 4, c: 18, f: 1, grams: 40 }], supps: {}, weight, workout: null, ...(checkin ? { checkin } : {}) })

async function context(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: opts.shots ? 2 : 1, colorScheme: opts.dark ? 'dark' : 'light', acceptDownloads: true })
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return // only on the first load: a reload keeps what the app saved
    sessionStorage.setItem('e2e.seeded', '1')
    if (s) { localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s); localStorage.setItem('tali.mode', 'account') }
    if (st) localStorage.setItem('leanplan.v1', st)
  }, [opts.signedOut ? null : JSON.stringify(sessionOf(opts.authAgoS ?? 10)), opts.state ? JSON.stringify(opts.state) : null])
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [], ...(opts.rows || {}) }
  const net = { posts: [], reads: [], fnCalls: [], auth: [], tokenCalls: 0 }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
    if (opts.unreachable) return route.abort()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/functions/v1/delete-account')) { net.fnCalls.push({ body: JSON.parse(req.postData() || '{}'), auth: req.headers().authorization || '' }); return json(200, { ok: true }) }
    if (url.includes('/auth/v1/token')) {
      net.tokenCalls++
      const body = JSON.parse(req.postData() || '{}')
      if (body.password !== 'right-password') return json(400, { code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' })
      return json(200, sessionOf(1))
    }
    if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/recover') || url.includes('/auth/v1/resend')) { net.auth.push({ url, body: JSON.parse(req.postData() || '{}') }); return json(200, {}) }
    if (url.includes('/auth/v1/user')) return json(200, USER)
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/rest/v1/rpc/clear_log_after_withdrawal')) {
      net.posts.push({ t: 'rpc/clear_log_after_withdrawal', list: [] })
      const h = (rows.consents || []).filter((r) => r.type === 'health').sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at))).pop()
      if (!h || h.granted) return json(200, { cleared: false })
      for (const t of ['day_logs', 'custom_foods', 'recipes', 'routines', 'training_plans', 'push_subscriptions', 'settings']) rows[t] = []
      return json(200, { cleared: true })
    }
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return json(200, {})
    const t = m[1]
    if (req.method() === 'GET') { net.reads.push(t); return json(200, rows[t] || []) }
    const list = JSON.parse(req.postData() || '[]')
    net.posts.push({ t, list })
    for (const row of [].concat(list)) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...row }; else rows[t].push(row)
    }
    return route.fulfill({ status: 201, headers: cors, body: '' })
  })
  await ctx.route(/openfoodfacts\.org/, (r) => r.abort())
  await ctx.route(/www\.tilo\.fit/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>legal</title>' }))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  if (process.env.DUMP) page.on('console', (m) => { if (m.type() !== 'log') console.log('  console', m.type(), m.text().slice(0, 300)) })
  return { ctx, page, net, rows, errors }
}

const results = []
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
async function scenario(browser, name, fn, opts = {}) {
  if (ONLY && !ONLY.test(name)) return
  const c = await context(browser, opts)
  try {
    await c.page.goto(opts.url || NATIVE)
    await fn(c)
    if (c.errors.length) throw new Error('page errors: ' + c.errors.join(' | '))
    console.log('PASS', name); results.push(true)
  } catch (e) {
    await c.page.screenshot({ path: path.join(OUT, 'FAIL-' + name.replace(/\W+/g, '-') + '.png'), fullPage: true }).catch(() => {})
    console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); results.push(false)
    if (process.env.DUMP) console.log((await c.page.innerText('body').catch(() => '')).slice(-1200))
  } finally { await c.ctx.close() }
}

const btn = (page, name) => page.getByRole('button', { name, exact: true })
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const latest = (st, type) => (st?.consents?.records || []).filter((r) => r.type === type).sort((a, b) => a.at.localeCompare(b.at)).pop()
const heading = (page, name) => page.getByRole('heading', { name, exact: true })
/** the app past the gate: the avatar beside the title */
const inApp = (page) => btn(page, 'Profile').first().waitFor({ timeout: 20000 })
/** Profile's account rows (the avatar's sheet until N10's Profile) */
async function toProfile(page) {
  await inApp(page)
  await btn(page, 'Profile').first().click()
  await page.getByText('Account and data', { exact: true }).waitFor()
}
const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, name + '.png') }) }
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

/** The same state on web and native: the screen's words must match, and both are photographed. */
async function sameWords(browser, name, opts, ready, act) {
  if (ONLY && !ONLY.test(name)) return
  const ok = []
  for (const dark of [false, true]) {
    const sides = {}
    for (const [side, url] of [['web', WEB], ['native', NATIVE]]) {
      const c = await context(browser, { ...opts, dark, shots: true })
      try {
        await c.page.goto(url)
        if (act) await act(c.page)
        await ready(c.page).waitFor({ timeout: 20000 })
        await c.page.waitForTimeout(600)
        await c.page.screenshot({ path: path.join(OUT, `${name.replace(/\W+/g, '-')}-${dark ? 'dark' : 'light'}-${side}.png`) })
        sides[side] = norm(await c.page.innerText('body'))
        if (c.errors.length) throw new Error(side + ' page errors: ' + c.errors.join(' | '))
      } catch (e) { sides.err = (sides.err || '') + e.message } finally { await c.ctx.close() }
    }
    if (!dark) ok.push(!sides.err && sides.web === sides.native ? null : { web: sides.web, native: sides.native, err: sides.err })
  }
  const bad = ok.find(Boolean)
  console.log(bad ? 'FAIL' : 'PASS', 'same words:', name, bad ? '\n   ' + JSON.stringify(bad).slice(0, 900) : ''); results.push(!bad)
}

;(async () => {
  const browser = await chromium.launch()
  const run = (...a) => scenario(browser, ...a)

  /* ---------------- the sign-in screen: words, modes, checks ---------------- */

  await sameWords(browser, 'sign in', { signedOut: true }, (p) => heading(p, 'Welcome back'))
  await sameWords(browser, 'create account', { signedOut: true }, (p) => heading(p, 'Create your account'), (p) => btn(p, 'Create an account').click())
  await sameWords(browser, 'forgot password', { signedOut: true }, (p) => heading(p, 'Reset your password'), (p) => p.getByRole('button', { name: 'Forgot?' }).click())
  await sameWords(browser, 'check your email', { signedOut: true }, (p) => heading(p, 'Check your email'), async (p) => {
    await btn(p, 'Create an account').click()
    await p.getByLabel('Email').fill('new@example.com')
    await p.getByLabel('Password', { exact: true }).fill('a-long-password')
    await p.getByLabel('Confirm password').fill('a-long-password')
    await p.getByRole('button', { name: /^Create account/ }).click()
  })

  await run('sign-in checks: empty, mismatch, too short, wrong password, then signed in', async ({ page, net }) => {
    await heading(page, 'Welcome back').waitFor()
    await page.getByRole('button', { name: /^Sign in/ }).click()
    await page.getByText('Please fill in all fields.').waitFor()
    await btn(page, 'Create an account').click()
    await page.getByLabel('Email').fill('new@example.com')
    await page.getByLabel('Password', { exact: true }).fill('short')
    await page.getByLabel('Confirm password').fill('shorter')
    await page.getByRole('button', { name: /^Create account/ }).click()
    await page.getByText('Passwords do not match.').waitFor()
    await page.getByLabel('Confirm password').fill('short')
    await page.getByRole('button', { name: /^Create account/ }).click()
    await page.getByText('Password must be at least 8 characters.').waitFor()
    expect(!net.auth.length, 'nothing sent before the checks pass')
    await btn(page, 'Sign in').click()
    await page.getByLabel('Password', { exact: true }).fill('wrong')
    await page.getByRole('button', { name: /^Sign in/ }).click()
    await page.getByText('Invalid login credentials').waitFor()
    await page.getByLabel('Password', { exact: true }).fill('right-password')
    await page.getByRole('button', { name: /^Sign in/ }).click()
    await inApp(page)
  }, { signedOut: true, state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('sign up and reset send the right emails; send it again repeats the right one', async ({ page, net }) => {
    await btn(page, 'Create an account').click()
    await page.getByLabel('Email').fill('new@example.com')
    await page.getByLabel('Password', { exact: true }).fill('a-long-password')
    await page.getByLabel('Confirm password').fill('a-long-password')
    await page.getByRole('button', { name: /^Create account/ }).click()
    await page.getByText('We sent a link to new@example.com. Open it on this phone to continue.').waitFor()
    await btn(page, 'send it again').click().catch(() => page.getByText('send it again').click())
    await page.getByText('Sent again. It can take a minute or two.', { exact: false }).waitFor()
    expect(net.auth[0].url.includes('/signup') && net.auth[1].url.includes('/resend'), 'sign-up, then a resend: ' + net.auth.map((a) => a.url).join())
    await btn(page, 'Back to sign in').click()
    await page.getByRole('button', { name: 'Forgot?' }).click()
    await page.getByLabel('Email').fill('new@example.com')
    await page.getByRole('button', { name: /^Send reset link/ }).click()
    await heading(page, 'Check your email').waitFor()
    expect(net.auth[2].url.includes('/recover'), 'a reset email')
    await page.getByText('send it again').click()
    await page.waitForTimeout(500)
    expect(net.auth[3]?.url.includes('/recover'), 'send it again repeats the reset, not the sign-up')
  }, { signedOut: true })

  /* ---------------- consent ---------------- */

  await sameWords(browser, 'consent screen (new account)', { state: deviceState({ consents: NONE }) }, (p) => heading(p, 'Before you start'))
  await sameWords(browser, 'consent screen (existing user)', { state: deviceState({ days: { [today]: aDay(70) }, consents: NONE }) }, (p) => heading(p, 'Before you start'))

  await run('live consent screen: shows until answered, only consent syncs before, then the rest', async ({ page, rows, net }) => {
    await heading(page, 'Before you start').waitFor()
    await page.waitForTimeout(800)
    expect(!net.posts.some((p) => p.t !== 'consents'), 'nothing but consent before the answer: ' + net.posts.map((p) => p.t).join())
    const cont = btn(page, 'Continue')
    for (const id of ['c_health', 'c_terms']) { await page.getByTestId(id).click(); expect(await cont.isDisabled(), 'Continue waits for all three') }
    expect((await page.getByRole('checkbox', { checked: true }).count()) === 2, 'never pre-ticked: only what was tapped')
    await page.getByTestId('c_age').click()
    await cont.click()
    await inApp(page)
    for (let i = 0; i < 40 && !rows.day_logs.some((x) => x.log_date === today); i++) await page.waitForTimeout(250)
    expect(rows.consents.length === 1 && rows.consents[0].granted === true, 'the answer synced')
    expect(rows.day_logs.some((x) => x.log_date === today && x.weight === 70), 'then the log')
    const i = net.posts.findIndex((p) => p.t === 'consents'), j = net.posts.findIndex((p) => p.t === 'day_logs')
    expect(i >= 0 && j > i, 'consent before data')
  }, { state: deviceState({ days: { [today]: aDay(70) }, dirty: [today], consents: NONE }) })

  await run('new account: Not now signs out', async ({ page }) => {
    await btn(page, 'Not now, sign out').click()
    await heading(page, 'Welcome back').waitFor()
  }, { state: deviceState({ consents: NONE }) })

  const EXISTING = { [today]: aDay(70, { mood: 3, hunger: 2, sleep: 2 }) }
  await run('existing user: Not now keeps it all on the phone; agreeing later in Profile uploads it', async ({ page, rows, net }) => {
    await heading(page, 'Before you start').waitFor()
    await page.getByText('your phone keeps its copy.', { exact: false }).waitFor()
    await btn(page, 'Not now, keep it on this phone').click()
    await inApp(page)
    const st = await stored(page)
    expect(st.consents.healthPause && !latest(st, 'health') && st.days[today].weight === 70, 'paused, nothing recorded or cleared')
    await page.waitForTimeout(1500)
    expect(!net.posts.some((p) => p.t !== 'consents'), 'nothing but consent while paused: ' + net.posts.map((p) => p.t).join())
    await page.reload()
    await inApp(page)
    expect((await heading(page, 'Before you start').count()) === 0, 'not asked again within 2 weeks')
    await toProfile(page)
    await page.getByRole('button', { name: 'Health data, Paused' }).click()
    await page.getByText('Your log is on this phone only until you agree: nothing syncs to your account or is backed up there.', { exact: false }).waitFor()
    await btn(page, 'Yes, keep it').click()
    await heading(page, 'Before you start').last().waitFor()
    const cont = btn(page, 'Continue').last()
    expect(await cont.isDisabled(), 'waits for all three ticks')
    for (const id of ['c_health', 'c_terms', 'c_age']) await page.getByTestId(id).last().click()
    await cont.click()
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1')).consents.healthPause)
    for (let i = 0; i < 40 && !rows.day_logs.some((x) => x.log_date === today); i++) await page.waitForTimeout(250)
    expect(rows.day_logs.some((x) => x.log_date === today && x.weight === 70), 'the phone’s log uploaded after the yes')
  }, { state: deviceState({ days: EXISTING, consents: NONE }) })

  await run('existing user: the consent screen comes back once, 2 weeks after Not now', async ({ page }) => {
    await heading(page, 'Before you start').waitFor()
    await page.getByText('We won’t ask again', { exact: false }).waitFor()
  }, { state: deviceState({ days: EXISTING, consents: { records: [], healthPause: { at: new Date(Date.now() - 15 * 86400_000).toISOString() } } }) })

  /* ---------------- withdrawing health consent ---------------- */

  await run('withdraw health consent in Profile: a copy offered first', async ({ page, rows, net }) => {
    await toProfile(page)
    await page.getByRole('button', { name: 'Health data, On' }).click()
    await btn(page, 'Stop keeping my health data').click()
    await page.getByText('Tilo will stop syncing your log and delete it from your account, so it stays only on your phones. Your weigh-ins, check-ins, body details and training preferences are removed from them too. Download a copy first?').waitFor()
    await page.getByText('On this phone: 1 weigh-in, 1 check-in.').waitFor()
    await shot(page, 'withdraw-export-native')
    const [dl] = await Promise.all([page.waitForEvent('download'), btn(page, 'Download a copy').click()])
    const file = path.join(OUT, 'backup.json')
    await dl.saveAs(file)
    expect(dl.suggestedFilename() === `tali-backup-${today}.json`, 'the web’s file name: ' + dl.suggestedFilename())
    const b = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(b.days[today].weight === 70 && b.days[today].checkin?.mood === 3, 'the copy has the health data')
    await btn(page, 'Downloaded').waitFor()
    await btn(page, 'Remove my health data').click()
    const st = await stored(page)
    expect(st.days[today].weight === null && !st.days[today].checkin && st.days[today].foods.length === 1, 'cleared, food kept')
    expect(latest(st, 'health')?.granted === false, 'withdrawal recorded')
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('leanplan.v1')).consents.cloudClearedFor, null, { timeout: 15000 })
    expect(net.posts.some((p) => p.t === 'rpc/clear_log_after_withdrawal'), 'cleared through the server function')
    expect(rows.consents.some((x) => x.type === 'health' && x.granted === false), 'withdrawal synced')
    expect(!rows.day_logs.some((x) => x.user_id === UID), 'the account’s copy of the log is deleted')
    // turning it back on: the one-box sheet, never a bare tap
    await page.getByRole('button', { name: 'Health data, Off' }).waitFor()
    await page.getByRole('button', { name: 'Privacy' }).click()
    await btn(page, 'Turn health data back on').click()
    const on = btn(page, 'Turn health data back on').last()
    expect(await on.isDisabled(), 'waits for the box')
    await page.getByTestId('c_regrant').click()
    await on.click()
    await page.getByRole('button', { name: 'Health data, On' }).waitFor()
  }, { rows: { consents: [{ ...GRANTED.records[0], user_id: UID, recorded_at: GRANTED.records[0].at }] }, state: deviceState({ days: { [today]: aDay(70, { mood: 3, hunger: 2, sleep: 2 }) } }) })

  await run('Profile, then Privacy: the legal documents, and the same withdraw and delete flows', async ({ page }) => {
    await toProfile(page)
    await page.getByRole('button', { name: 'Privacy' }).click()
    for (const n of ['Privacy policy', 'Terms and conditions', 'Cookie policy']) await btn(page, n).waitFor()
    const [doc] = await Promise.all([page.context().waitForEvent('page'), btn(page, 'Privacy policy').click()])
    expect(doc.url().startsWith('https://www.tilo.fit/legals/privacy'), 'the website’s policy: ' + doc.url())
    await doc.close()
    await btn(page, 'Withdraw consent for health data').click()
    await page.getByText('Download a copy first?', { exact: false }).waitFor()
    await btn(page, 'Back').click()
    await btn(page, 'Done').last().click()
    await page.getByRole('button', { name: 'Delete account' }).last().click()
    await heading(page, 'Delete your account').waitFor()
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  /* ---------------- back up and restore ---------------- */

  await run('export and import: the same file both ways, with the confirm step', async ({ page }) => {
    await toProfile(page)
    await page.getByRole('button', { name: 'Back up and restore' }).click()
    const [dl] = await Promise.all([page.waitForEvent('download'), btn(page, 'Export').click()])
    const file = path.join(OUT, 'export.json'); await dl.saveAs(file)
    const b = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(b.days[today].weight === 70, 'exported the log')
    b.days['2026-09-01'] = aDay(71)
    fs.writeFileSync(file, JSON.stringify(b))
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Import').click()])
    await chooser.setFiles(file)
    await page.getByText('This backup has 2 days', { exact: false }).waitFor()
    await page.waitForTimeout(500) // the sheet's slide-up
    await btn(page, 'Import').last().click()
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('leanplan.v1')).days['2026-09-01'])
    const bad = path.join(OUT, 'not-a-backup.json'); fs.writeFileSync(bad, '{"hello":1}')
    const [c2] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Import').click()])
    await c2.setFiles(bad)
    await page.waitForTimeout(800)
    // the web says "That isn't a valid backup file" in a toast: the store sets it; N1 draws toasts
    expect((await page.getByText('Import backup').count()) === 0, 'not offered for import')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  /* ---------------- delete account ---------------- */

  const toDelete = async (page) => { await toProfile(page); await page.getByRole('button', { name: 'Delete account' }).first().click(); await heading(page, 'Delete your account').waitFor() }

  await run('delete account: happy path', async ({ page, net }) => {
    await toDelete(page)
    await page.getByText('Needs a connection, so it deletes everywhere at once.').waitFor()
    await shot(page, 'delete-native')
    await btn(page, 'Delete account').last().click()
    await heading(page, 'Delete everything?').waitFor()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await shot(page, 'delete-confirm-native')
    await btn(page, 'Delete everything').click()
    await heading(page, 'Welcome back').waitFor({ timeout: 8000 })
    expect(net.fnCalls.length === 1 && net.fnCalls[0].body.confirm === 'delete my account' && net.fnCalls[0].auth.startsWith('Bearer '), 'function called once, confirmed')
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k === 'leanplan.v1' || k.startsWith('sb-') || k.startsWith('tali.')))
    const st = await stored(page)
    expect(!left.some((k) => k.startsWith('sb-')) && (!st || Object.keys(st.days || {}).length === 0), 'device wiped: ' + left.join())
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('delete account: offline, refused with the connection note', async ({ page, ctx, net }) => {
    await toDelete(page)
    await btn(page, 'Delete account').last().click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await ctx.setOffline(true)
    await page.getByText('Deleting your account needs a connection. Nothing has been deleted.').waitFor()
    expect(await btn(page, 'Delete everything').isDisabled(), 'button off offline')
    await btn(page, 'Cancel').last().click()
    expect(await btn(page, 'Delete account').last().isDisabled(), 'Delete account off offline')
    expect(net.fnCalls.length === 0, 'nothing sent')
    expect(Object.keys((await stored(page)).days).length === 1, 'nothing deleted')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('delete account: the wrong word keeps the button off', async ({ page, net }) => {
    await toDelete(page)
    await btn(page, 'Delete account').last().click()
    const b = btn(page, 'Delete everything')
    for (const w of ['', 'DELET', 'delete it', 'REMOVE']) { await page.getByLabel('Type DELETE to confirm').fill(w); expect(await b.isDisabled(), 'off for ' + JSON.stringify(w)) }
    await b.click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
    expect(net.fnCalls.length === 0, 'nothing sent')
  }, { state: deviceState({ days: { [today]: aDay(70) } }) })

  await run('delete account: an old sign-in asks for the password first', async ({ page, net }) => {
    await toDelete(page)
    await btn(page, 'Delete account').last().click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    const b = btn(page, 'Delete everything')
    expect(await b.isDisabled(), 'waits for the password')
    await page.getByLabel('Your password, to confirm it’s you').fill('wrong')
    await b.click()
    await page.getByText('That password doesn’t match this account. Nothing has been deleted.').waitFor()
    expect(net.fnCalls.length === 0, 'nothing sent on a wrong password')
    await page.getByLabel('Your password, to confirm it’s you').fill('right-password')
    await b.click()
    await heading(page, 'Welcome back').waitFor({ timeout: 8000 })
    expect(net.fnCalls.length === 1, 'deleted after re-confirming')
  }, { authAgoS: 3600, state: deviceState({ days: { [today]: aDay(70) } }) })

  /* ---------------- whose data is on this phone ---------------- */

  await sameWords(browser, 'owner choice', { state: deviceState({ days: { [today]: aDay(70) }, owner: OTHER }) }, (p) => p.getByText('This device has another log'))

  await run('owner choice: Start fresh asks twice when the log is in no account, then loads the account', async ({ page }) => {
    await page.getByText('This device has another log').waitFor()
    await btn(page, 'Start fresh with e2e@example.com').click()
    await page.getByText('starting fresh deletes it for good', { exact: false }).waitFor()
    await btn(page, 'Export a copy').waitFor()
    await btn(page, 'Start fresh and delete it').click()
    // a fresh device for this account: its consent comes from the account (none in this stand-in)
    await heading(page, 'Before you start').waitFor()
    const st = await stored(page)
    expect(st._meta.owner === UID && !st.days[today], 'fresh for this account')
  }, { state: deviceState({ days: { [today]: aDay(70) }, dirty: [today], owner: OTHER }) })

  await run('owner choice: keep it, or cancel and sign out', async ({ page }) => {
    await page.getByText('This device has another log').waitFor()
    await btn(page, 'Cancel and sign out').click()
    await heading(page, 'Welcome back').waitFor()
  }, { state: deviceState({ days: { [today]: aDay(70) }, owner: OTHER }) })

  /* ---------------- the 18+ stop ---------------- */

  const AGED = (age) => deviceState({ profile: { ...PROFILE, age } })
  await sameWords(browser, '18+ stop', { state: AGED(16) }, (p) => p.getByText('Tilo is for 18+'))

  await run('launch with a stored age of 16: the stop; nothing syncs; typed wrong clears it', async ({ page, net }) => {
    await page.getByTestId('age-stop').waitFor({ timeout: 20000 })
    for (const n of ['Childline', 'Beat', 'Emergency']) await page.getByText(n, { exact: true }).first().waitFor()
    await page.waitForTimeout(2500)
    expect(net.posts.length === 0 && net.reads.length === 0, `no sync while stopped (writes ${net.posts.length}, reads ${net.reads.length})`)
    await btn(page, 'I typed my age wrong').click()
    await inApp(page)
    const st = await stored(page)
    expect(st.profile.age === null && st._meta.settings.dirty === true, 'stored age cleared as an edit')
  }, { state: AGED(16) })

  await run('launch with the backend unreachable and a stored age of 16: the stop, without waiting', async ({ page }) => {
    const t0 = Date.now()
    await page.getByTestId('age-stop').waitFor({ timeout: 20000 })
    expect(Date.now() - t0 < 6000, 'shown without waiting on the network: ' + (Date.now() - t0) + ' ms')
  }, { state: AGED(16), unreachable: true })

  await run('sync pull of a profile aged 17: the stop, no further uploads', async ({ page, net }) => {
    await page.getByTestId('age-stop').waitFor({ timeout: 20000 })
    const w0 = net.posts.length
    await page.waitForTimeout(2000)
    expect(net.posts.length === w0, 'no uploads after the stop')
    expect((await stored(page)).profile.age === 17, 'the pulled age')
  }, { state: AGED(34), rows: { settings: [{ user_id: UID, profile: { ...PROFILE, age: 17, answeredAt: { age: '2026-09-29T10:00:00.000Z' } }, target: { kcal: 2000, p: 120, c: 220, f: 70 }, schedule: { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Rest', 5: 'Legs', 6: 'Rest' }, updated_at: new Date(Date.now() + 60_000).toISOString() }] } })

  await run('backup with age 15: refused, the stop, nothing on the phone changed', async ({ page }) => {
    await toProfile(page)
    const before = await stored(page)
    const file = path.join(OUT, 'backup-15.json')
    fs.writeFileSync(file, JSON.stringify(deviceState({ profile: { ...PROFILE, name: 'Kid', age: 15 }, days: { '2026-09-01': aDay(null) } })))
    await page.getByRole('button', { name: 'Back up and restore' }).click()
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Import').click()])
    await chooser.setFiles(file)
    await page.getByText('Import backup').waitFor()
    await page.waitForTimeout(500) // the sheet's slide-up
    await btn(page, 'Import').last().click()
    await page.getByTestId('age-stop').waitFor()
    const after = await stored(page)
    expect(JSON.stringify(after) === JSON.stringify(before), 'nothing on the phone changed')
  }, { state: AGED(34) })

  await run('Close and delete: the usual deletion; Cancel comes back to the stop; then it deletes', async ({ page, net }) => {
    await page.getByTestId('age-stop').waitFor({ timeout: 20000 })
    await btn(page, 'Close and delete').click()
    await heading(page, 'Delete everything?').waitFor()
    await btn(page, 'Cancel').click()
    await page.waitForTimeout(400)
    expect((await heading(page, 'Delete everything?').count()) === 0, 'confirm closed, the stop stays')
    await btn(page, 'Close and delete').click()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await btn(page, 'Delete everything').click()
    await heading(page, 'Welcome back').waitFor({ timeout: 8000 })
    expect(net.fnCalls.length === 1 && net.fnCalls[0].body.confirm === 'delete my account', 'delete-account ran once')
  }, { state: AGED(16) })

  await run('Close and delete with an old sign-in asks for the password', async ({ page, net }) => {
    await btn(page, 'Close and delete').click()
    await page.getByLabel('Your password, to confirm it’s you').waitFor()
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    expect(await btn(page, 'Delete everything').isDisabled(), 'waits for the password')
    expect(net.fnCalls.length === 0, 'nothing sent')
  }, { state: AGED(16), authAgoS: 3600 })

  /* ---------------- screenshots of the sheets, both apps, for `design` (no word check: their hosts differ) ---------------- */
  if (!ONLY || ONLY.test('shots')) {
    for (const dark of [false, true]) {
      for (const [side, url] of [['web', WEB], ['native', NATIVE]]) {
        const c = await context(browser, { dark, shots: true, state: deviceState({ days: { [today]: aDay(70, { mood: 3, hunger: 2, sleep: 2 }) } }) })
        const p = c.page, m = dark ? 'dark' : 'light'
        try {
          await p.goto(url); await inApp(p); await btn(p, 'Profile').first().click()
          await p.getByRole('button', { name: /^Health data/ }).first().click()
          await btn(p, 'Stop keeping my health data').waitFor(); await shot(p, `sheet-health-${m}-${side}`)
          await btn(p, 'Stop keeping my health data').click()
          await btn(p, 'Download a copy').waitFor(); await shot(p, `sheet-withdraw-${m}-${side}`)
          await p.goto(url); await inApp(p); await btn(p, 'Profile').first().click()
          await p.getByRole('button', { name: 'Delete account' }).first().click()
          await heading(p, 'Delete your account').waitFor(); await shot(p, `delete-${m}-${side}`)
          await btn(p, 'Delete account').last().click()
          await p.getByLabel('Type DELETE to confirm').fill('DELETE'); await shot(p, `delete-confirm-${m}-${side}`)
        } catch (e) { console.log('shots', side, m, e.message.split('\n')[0]) } finally { await c.ctx.close() }
      }
    }
  }

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : `all ${results.length} passed`, '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
