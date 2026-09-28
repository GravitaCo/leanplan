/**
 * Headless end-to-end check of the first-run onboarding (Design canvas rows Onboarding 1–5),
 * behind ONBOARDING_ENABLED. Tested on a build with the flag on, and the flag-off build for
 * "nothing new shows":
 *
 *   VITE_ONBOARDING=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4185 &
 *   npm run build && npx vite preview --port 4186 &
 *   E2E_URL_ON=http://localhost:4185/ E2E_URL=http://localhost:4186/ node scripts/e2e-onboarding.cjs
 *
 * Needs Playwright (global install is fine; browsers in PLAYWRIGHT_BROWSERS_PATH). Every Supabase
 * request goes to an in-memory PostgREST stand-in; the real project is never reached. The numbers
 * on the summary are checked against startingTargets from the core itself (e2e-onboarding-expect.ts,
 * bundled here with esbuild). Screenshots of every screen go to E2E_OUT.
 */
const { chromium } = (() => { try { return require('playwright') } catch { return require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright') } })()
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync } = require('node:child_process')

const ON = process.env.E2E_URL_ON || 'http://localhost:4185/'
const OFF = process.env.E2E_URL || 'http://localhost:4186/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-ob-e2e-'))
fs.mkdirSync(OUT, { recursive: true })
const UID = '11111111-2222-4333-8444-555555555555'
const KEY = 'sb-exvblofwiwbvycomxvmj-auth-token'

// the core's own numbers, bundled for node
const ROOT = path.resolve(__dirname, '..')
const EXPECT = path.join(ROOT, 'node_modules/.cache/e2e-onboarding-expect.cjs')
execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), ['scripts/e2e-onboarding-expect.ts', '--bundle', '--platform=node', '--alias:@=./src', '--define:import.meta.env={}', '--log-level=error', '--format=cjs', '--outfile=' + EXPECT], { cwd: ROOT })
const { expected, finished } = require(EXPECT)

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400, iat: now, amr: [{ method: 'password', timestamp: now - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const sessionOf = (authAgoS) => ({ access_token: fakeJwt(UID, authAgoS), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user: USER })
const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
/** Someone new, just past the live consent screen: nothing logged, health consent given and synced. */
function newAccount() {
  const u = new Date().toISOString()
  return { days: {}, consents: GRANTED, _meta: { settings: { u, dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID } }
}

async function scenario(browser, name, fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: opts.dark ? 'dark' : 'light' })
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    if (st) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(sessionOf(opts.authAgoS ?? 10)), JSON.stringify(opts.state ?? newAccount())])
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [{ id: GRANTED.records[0].id, user_id: UID, type: 'health', version: '2026-09-v1', granted: true, recorded_at: GRANTED.records[0].at }], routines: [], training_plans: [], ...(opts.rows || {}) }
  const net = { posts: [], fnCalls: [], block: false }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (net.block) return route.abort('internetdisconnected')
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/functions/v1/delete-account')) {
      net.fnCalls.push({ body: JSON.parse(req.postData() || '{}') })
      // opts.fnReply: what the function answers instead of { ok: true } (e.g. the re-auth refusal)
      const r = opts.fnReply || { status: 200, body: { ok: true } }
      return route.fulfill({ status: r.status, contentType: 'application/json', headers: cors, body: JSON.stringify(r.body) })
    }
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) })
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (url.includes('/auth/v1/token')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionOf(1)) })
    // clear_log_after_withdrawal() (docs/migrations/2026-09-28-health-consent-server.sql): only
    // while the latest health answer is a no
    if (url.includes('/rest/v1/rpc/clear_log_after_withdrawal')) {
      net.posts.push({ t: 'rpc/clear_log_after_withdrawal', list: [] })
      const h = (rows.consents || []).filter((r) => r.type === 'health').sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at))).pop()
      if (!h || h.granted) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ cleared: false }) })
      for (const x of ['day_logs', 'custom_foods', 'recipes', 'routines', 'training_plans', 'push_subscriptions', 'settings']) rows[x] = []
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ cleared: true }) })
    }
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    const t = m[1]
    // opts.pullDelay: a slow first pull (ms)
    if (req.method() === 'GET' && opts.pullDelay && t === 'settings') await new Promise((r) => setTimeout(r, opts.pullDelay))
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows[t] || []) })
    const body = JSON.parse(req.postData() || '[]')
    const list = Array.isArray(body) ? body : [body]
    net.posts.push({ t, list })
    for (const row of list) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...row }; else rows[t].push(row)
    }
    return route.fulfill({ status: 201, body: '' })
  })
  await ctx.route(/openfoodfacts\.org|b-cdn\.net/, (r) => r.abort())
  // opts.block: assets that fail to load (a cold cache offline)
  if (opts.block) await ctx.route(opts.block, (r) => r.abort())
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const logs = []
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()) })
  try {
    await page.goto(opts.url || ON)
    await fn({ page, ctx, net, rows })
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '))
    console.log('PASS', name)
    return true
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, 'FAIL-' + name.replace(/\W+/g, '-') + '.png'), fullPage: true }).catch(() => {})
    const dump = await page.evaluate(() => localStorage.getItem('tali.onboarding')).catch(() => null)
    if (dump) fs.writeFileSync(path.join(OUT, 'FAIL-' + name.replace(/\W+/g, '-') + '.draft.json'), dump)
    console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 6).join(' ¶ '), '\n   screenshot in', OUT, logs.length ? '\n   console: ' + logs.slice(0, 3).join(' | ').slice(0, 600) : '')
    return false
  } finally {
    await ctx.close()
  }
}

const shot = async (page, name, full) => { await page.waitForTimeout(350); const f = path.join(OUT, name + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); await page.screenshot({ path: f, fullPage: !!full }) }
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const draft = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tali.onboarding') || 'null'))
const h1 = (page, text) => page.getByRole('heading', { name: text, exact: true }).waitFor()
const btn = (page, name) => page.getByRole('button', { name, exact: true })
const cont = (page) => btn(page, 'Continue').click()
/** a radio by the start of its name (a row's name includes its line underneath) */
const radio = (page, name) => page.getByRole('radio', { name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
const check = (page, name) => page.getByRole('checkbox', { name, exact: true }).click()
const tab = (page, name) => page.locator('nav.tabbar').getByRole('button', { name }).click()
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayWd = new Date().getDay()
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

/** The wizard from the intro to the handoff, with `a` choosing the answers; screenshots when `snap`. */
async function wizard(page, a = {}, snap) {
  const s = async (n) => { if (snap != null) await shot(page, snap + n) }
  await h1(page, 'A few questions, so Tali fits you'); await s('ob1-0-intro')
  await btn(page, 'Let’s go').click()
  await h1(page, 'What do you like to be called?')
  await page.getByPlaceholder('Sam').fill(a.name ?? 'Sam'); await s('ob1-0c-name'); await cont(page)
  await h1(page, 'How old are you?')
  await page.getByLabel('Age in years').fill(String(a.age ?? 34)); await s('ob1-1-age'); await cont(page)
  if ((a.age ?? 34) < 18) return
  await h1(page, 'A quick health check')
  const yes = a.ready ?? [false, false, false]
  const groups = page.getByRole('radiogroup')
  for (let i = 0; i < 3; i++) await groups.nth(i).getByRole('radio', { name: yes[i] ? 'Yes' : 'No', exact: true }).click()
  if (yes[2]) await page.getByRole('radiogroup', { name: 'Which of these is it?' }).getByRole('radio', { name: a.pregnant ? 'Pregnant' : 'Recent surgery', exact: true }).click()
  await s('ob1-2-ready'); await cont(page)
  if (a.pregnant) { await h1(page, 'We’ll keep things gentle'); await s('ob4-4-pregnancy'); await cont(page) }
  else if (yes.some(Boolean)) { await h1(page, 'We’ll start gently'); await s('ob4-3-readiness'); await cont(page) }
  await h1(page, 'What would make this worth it for you?')
  await check(page, 'More energy'); await check(page, 'Feel stronger'); await s('ob1-3-why'); await cont(page)
  await h1(page, 'What’s your main goal?')
  await radio(page, a.goal ?? 'Lose fat'); await s('ob1-4-goal'); await cont(page)
  await h1(page, 'How are things lately?')
  await page.getByRole('radiogroup', { name: 'Sleep' }).getByRole('radio', { name: a.sleep ?? 'Mixed' }).click()
  await page.getByRole('radiogroup', { name: 'Stress' }).getByRole('radio', { name: 'Some' }).click()
  await page.getByRole('radiogroup', { name: 'Room for change right now' }).getByRole('radio', { name: 'A little' }).click()
  await s('ob1-5-lately'); await cont(page)
  await h1(page, 'How food and weight feel for you')
  await radio(page, a.wellbeing ?? 'No'); await s('ob1-6-wellbeing'); await cont(page)
  if (a.wellbeing === 'Yes' || a.wellbeing === 'Sometimes') {
    await h1(page, 'Thanks for telling us')
    // Beat: every nation's number, labelled, and the webchat (Benn)
    for (const [l, n] of [['England', '0808 801 0677'], ['Scotland', '0808 801 0432'], ['Wales', '0808 801 0433'], ['Northern Ireland', '0808 801 0434']]) await page.getByRole('link', { name: `Beat, ${l}: call ${n}` }).waitFor()
    await page.getByRole('link', { name: /Webchat and email/ }).waitFor()
    await s('ob4-2-wellbeing'); await cont(page)
  }
  await h1(page, 'About your body')
  await page.getByLabel('Height in centimetres').fill('172')
  await radio(page, 'Female'); await s('ob1-7-body'); await cont(page)
  if ((a.goal ?? 'Lose fat') === 'Lose fat') {
    await h1(page, 'Does any of this apply to you?')
    await check(page, a.medical ? 'Kidney disease' : 'None of these'); await s('ob4-5-medical-q'); await cont(page)
    if (a.medical) { await h1(page, 'Food stays at maintenance for now'); await s('ob4-6-medical'); await cont(page) }
  }
  await h1(page, 'What do you weigh?')
  if (a.noWeight) { await s('ob1-7b-weight'); await btn(page, 'Skip').click() }
  else {
    await radio(page, 'st lb'); await page.getByLabel('Stone').fill('13'); await page.getByLabel('Pounds').fill('10')
    await s('ob1-7b-weight-stlb')
    await radio(page, 'kg'); await page.getByLabel('Weight in kilograms').fill('87'); await s('ob1-7b-weight'); await cont(page)
  }
  await h1(page, 'How much do you move on a normal day?')
  await radio(page, '5,000 to 7,500 steps'); await s('ob1-8-move')
  await btn(page, 'Not sure? Describe your day instead').click(); await h1(page, 'What’s a normal day like?'); await s('ob1-8b-job')
  await btn(page, 'Use steps instead').click(); await radio(page, '5,000 to 7,500 steps'); await btn(page, 'Done').click()
  await h1(page, 'Thanks. Now, how you like to train.'); await s('ob2-0-handoff')
}

/** The setup card, from "Finish setup" (or Continue setup) to Build my week. */
async function setup(page, a = {}, snap) {
  const s = async (n) => { if (snap != null) await shot(page, snap + n) }
  await h1(page, 'Are you moving much at the moment?'); await radio(page, 'A little, now and then'); await s('ob2-1-moving'); await cont(page)
  await h1(page, 'How confident do you feel with workouts?'); await radio(page, 'Just starting'); await s('ob2-2-confidence'); await cont(page)
  await h1(page, 'How many days a week?')
  if (a.oneDay) {
    await radio(page, '1'); await page.getByText('One day is a good start. A second day adds more when you’re ready, if you’d like.').waitFor()
    await page.getByRole('checkbox', { name: 'Wednesday' }).click(); await s('ob2-3b-oneday')
  } else {
    await radio(page, '3'); await page.getByText('Not sure? Leave these and we’ll spread them out: Monday, Wednesday, Friday.').waitFor()
    if (a.weekdays) for (const w of a.weekdays) await page.getByRole('checkbox', { name: DAYS[w] }).click()
    await s('ob2-3-days')
  }
  await cont(page)
  await h1(page, 'How long can a session be?'); await radio(page, '30'); await s('ob2-4-minutes'); await cont(page)
  await h1(page, 'Where will you train?'); await radio(page, 'At home'); await s('ob2-5-where'); await cont(page)
  await h1(page, 'What do you have at home?'); await check(page, 'Dumbbells'); await check(page, 'Mat'); await s('ob2-6-kit'); await cont(page)
  await h1(page, 'What do you enjoy?'); await check(page, 'Lifting weights'); await check(page, 'Walking'); await s('ob2-7-enjoy'); await cont(page)
  await h1(page, 'Any areas to go easy on?'); await check(page, 'Knees'); await s('ob2-8-areas')
  await btn(page, 'Build my week').click()
}
const summaryUp = (page) => h1(page, 'Here’s a starting point, not a test')

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const only = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY) : null
  const run = async (...a) => { if (!only || only.test(a[0])) results.push(await scenario(browser, ...a)) }

  await run('full wizard → summary equals startingTargets → Start accepts the plan', async ({ page, rows, net }) => {
    // three days, today among them, so the first session is here to check (below)
    const pick = [todayWd, (todayWd + 2) % 7, (todayWd + 4) % 7]
    await wizard(page, {}, '')
    await btn(page, 'Finish setup').click()
    await setup(page, { weekdays: pick }, '')
    await summaryUp(page)
    await page.getByText('Built from your answers').waitFor()
    await shot(page, 'ob3-1-summary', true)
    const dr = await draft(page)
    expect(dr && !JSON.stringify(dr).match(/"sleep"|"stress"|"room"|chest|dizz/i), 'the draft keeps outcomes only: ' + JSON.stringify(dr?.outcomes))
    const e = expected(dr, today)
    const kcal = +(await page.locator('[data-kcal]').getAttribute('data-kcal'))
    const low = +(await page.locator('[data-low]').getAttribute('data-low')), high = +(await page.locator('[data-high]').getAttribute('data-high'))
    expect(kcal === e.kcal && low === e.low && high === e.high && e.kcal === e.summaryKcal, `summary ${kcal} ${low}–${high} vs startingTargets ${e.kcal} ${e.low}–${e.high}`)
    await page.getByText(`About ${e.kcal.toLocaleString('en-GB')} kcal a day to start`).waitFor()
    // tap a day: why each part is here
    await page.locator('.sm-day').filter({ hasText: 'min' }).first().click()
    await page.getByText('Why each part is here').waitFor(); await shot(page, 'ob3-2-why')
    await btn(page, 'Done').click()
    await page.locator('.sm-row').filter({ hasText: 'Easy on your knees' }).click()
    await page.getByRole('dialog', { name: 'Easy on your knees' }).waitFor(); await shot(page, 'ob3-2b-why-row')
    await btn(page, 'Done').click()
    await btn(page, 'How we worked this out').click(); await page.getByRole('dialog', { name: 'How we worked this out' }).waitFor(); await shot(page, 'ob3-2c-how')
    await btn(page, 'Done').click()
    const before = net.posts.filter((p) => p.t === 'training_plans' || p.t === 'settings').length
    expect(before === 0, 'nothing saved or synced before Start')
    await btn(page, 'Start').click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    const plan = (st.trainingPlans || []).find((p) => p.state === 'active')
    expect(plan && plan.id === e.planId && plan.source === 'recommended' && plan.why?.length && plan.startedAt === today, 'the generated plan is the active plan: ' + JSON.stringify(plan && { id: plan.id, s: plan.startedAt }))
    expect(e.routines.every((id) => st.routines.some((r) => r.id === id)), 'its workouts are the person’s routines')
    expect(st.target.kcal === e.kcal && st.profile.onboardedAt && st.profile.activityMult === e.mult, 'targets, onboardedAt and activityMult saved')
    expect(JSON.stringify(st.profile.outcomes) === JSON.stringify({ readiness: 'clear', medical: 'clear', wellbeing: 'clear', baseline: 'ok' }), 'outcomes only: ' + JSON.stringify(st.profile.outcomes))
    expect(st.days[today]?.weight === 87, 'today’s weigh-in')
    expect(!(await page.evaluate(() => localStorage.getItem('tali.onboarding'))), 'the draft is gone')
    await page.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('leanplan.v1')); return !s._meta.settings.dirty && s.trainingPlans.every((p) => !p._dirty) }, null, { timeout: 8000 })
    expect(rows.training_plans.some((p) => p.id === e.planId) && rows.routines.length >= e.routines.length && rows.settings[0]?.profile?.onboardedAt, 'synced: the plan, its workouts and the profile')
    expect(Array.isArray(rows.training_plans[0].why), 'plan why syncs (PLAN_WHY_SYNC on, 2026-09-plan-why.sql applied)')
    const posted = JSON.stringify(net.posts)
    expect(!/"sleep":|"stress":|"room":|chest pain|dizziness|kidney/i.test(posted), 'no raw screener answer ever leaves the phone')
    await shot(page, 'after-start-today')
    // the first session (ob5): thumbs on the preview, find your weight, how was that set
    await tab(page, 'Train')
    await page.locator('.hdr .ltitle', { hasText: 'Train' }).waitFor()
    // the week's first full-body day (a lose-fat week puts cardio on some days)
    for (let i = 0; i < 6 && !(await page.getByText(/^Full body/).count()); i++) await page.getByRole('button', { name: 'Next day' }).click()
    await page.getByText(/^Full body/).first().click()
    await page.getByText('Like or not for me: tap the thumbs on any exercise. No reason needed.').waitFor()
    await shot(page, 'ob5-3-thumbs-preview')
    const firstName = await page.locator('.pv-row .t').first().textContent()
    await page.getByRole('button', { name: `Not for me: ${firstName}` }).click()
    await page.getByText('Got it. We’ll pick something else.').waitFor()
    await shot(page, 'ob5-3-thumbs')
    const st2 = await stored(page)
    expect(st2.profile.training.exPrefs.disliked.length === 1, 'the dislike is kept')
    await page.getByRole('button', { name: 'Undo' }).click()
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('leanplan.v1')).profile.training.exPrefs?.disliked || []).length === 0)
    await btn(page, 'Start').click()
    let found = false
    for (let i = 0; i < 8 && !found; i++) {
      found = (await page.locator('.gp-find').count()) > 0
      if (!found) await page.getByRole('button', { name: 'Next exercise' }).click().catch(() => {})
    }
    expect(found, 'a loaded move starts with Find your weight')
    await page.getByText('No wrong answer. Pick something that feels comfortable. We’ll adjust from how it felt.').waitFor()
    for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Heavier' }).click()
    await shot(page, 'ob5-1-findweight')
    await btn(page, 'Start set 1').click()
    for (let i = 0; i < 6 && !(await page.getByRole('dialog', { name: 'How was that set?' }).count()); i++) {
      await page.getByRole('button', { name: 'Done as planned' }).click()
      await page.waitForTimeout(300)
      if (await page.getByRole('dialog', { name: 'How was that set?' }).count()) break
      if (await page.getByRole('button', { name: 'Skip rest' }).count()) await page.getByRole('button', { name: 'Skip rest' }).click()
    }
    await page.getByRole('dialog', { name: 'How was that set?' }).waitFor()
    await radio(page, 'About right, 2 or 3 left')
    await shot(page, 'ob5-2-howset')
    await btn(page, 'Done').click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).days[Object.keys(JSON.parse(localStorage.getItem('leanplan.v1')).days).sort().pop()].sessions?.some((s) => s.ex?.some((e) => e.sets.some((x) => x.feel === 'right'))))
  })

  await run('dark mode: intro, age, body, weight, days, summary', async ({ page }) => {
    await h1(page, 'A few questions, so Tali fits you'); await shot(page, 'dark-ob1-0-intro')
    await btn(page, 'Let’s go').click(); await cont(page)
    await page.getByLabel('Age in years').fill('34'); await shot(page, 'dark-ob1-1-age'); await cont(page)
    for (let i = 0; i < 3; i++) await page.getByRole('radiogroup').nth(i).getByRole('radio', { name: 'No', exact: true }).click()
    await cont(page); await cont(page); await radio(page, 'Build muscle'); await cont(page); await cont(page); await radio(page, 'No'); await cont(page)
    await page.getByLabel('Height in centimetres').fill('180'); await radio(page, 'Male'); await shot(page, 'dark-ob1-7-body'); await cont(page)
    await page.getByLabel('Weight in kilograms').fill('80'); await shot(page, 'dark-ob1-7b-weight'); await cont(page)
    await btn(page, 'Done').click(); await btn(page, 'Finish setup').click()
    await cont(page); await cont(page); await radio(page, '4'); await shot(page, 'dark-ob2-3-days'); await cont(page)
    await btn(page, 'Skip').click(); await btn(page, 'Skip').click(); await btn(page, 'Skip').click(); await btn(page, 'Skip').click()
    await btn(page, 'Build my week').click()
    await summaryUp(page); await shot(page, 'dark-ob3-1-summary', true)
  }, { dark: true })

  await run('skip on the intro → age → Starter week, no calorie numbers', async ({ page }) => {
    await h1(page, 'A few questions, so Tali fits you')
    await btn(page, 'Skip, I’ll figure it out myself').click()
    await h1(page, 'No problem. Just your age, then you’re in.')
    await page.getByLabel('Age in years').fill('30'); await shot(page, 'ob1-0b-skip')
    await btn(page, 'Start using Tali').click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.getByLabel('Finish your setup').waitFor(); await shot(page, 'ob2-0b-card')
    const st = await stored(page)
    const plan = st.trainingPlans.find((p) => p.state === 'active')
    expect(plan?.name === 'Starter week' && plan.why?.some((w) => w.code === 'starter'), 'the Starter week')
    expect(st.profile.age === 30 && st.profile.onboardedAt && !st.profile.activityMult, 'age kept, no estimate')
    await tab(page, 'Food'); await page.locator('.hdr .ltitle', { hasText: 'Food' }).waitFor()
    expect((await page.getByText('kcal eaten').count()) === 0 && (await page.getByText(/\d[\d,]* kcal/).count()) === 0, 'no calorie numbers on Food')
    await tab(page, 'Summary'); await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    expect((await page.getByText(/\d[\d,]* kcal/).count()) === 0, 'none on Summary either')
    // Continue setup: the setup card on its own, then a generated week
    await btn(page, 'Continue setup').click()
    await setup(page)
    await summaryUp(page); await page.getByText('Built from your answers').waitFor()
    expect((await page.locator('.sm-food').count()) === 0, 'the setup card alone never changes targets')
    await btn(page, 'Start').click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st2 = await stored(page)
    expect(st2.trainingPlans.find((p) => p.state === 'active')?.why?.every((w) => w.code !== 'starter'), 'the personalised week replaced the Starter week')
    expect((await page.getByLabel('Finish your setup').count()) === 0, 'and the card is gone')
  })

  await run('Later on the handoff → Starter week summary', async ({ page }) => {
    await wizard(page)
    await btn(page, 'Later').click()
    await summaryUp(page); await page.getByText('Starter week: tell us more to personalise it').waitFor()
    await shot(page, 'ob3-4-starter', true)
    expect(await page.locator('[data-kcal]').count() === 1, 'numbers shown: weight, height and age are known')
  })

  await run('no weight → summary without numbers → Add weight', async ({ page }) => {
    await wizard(page, { noWeight: true })
    await btn(page, 'Finish setup').click(); await setup(page)
    await summaryUp(page)
    await page.getByText('Add your weight any time for a starting estimate.').waitFor()
    expect((await page.locator('[data-kcal]').count()) === 0 && (await page.getByText(/\d[\d,]* kcal/).count()) === 0, 'no calorie or protein number')
    await shot(page, 'ob3-3-noweight', true)
    await btn(page, 'Add weight').click()
    await page.getByLabel('Weight in kilograms').fill('80'); await cont(page)
    await summaryUp(page); await page.locator('[data-kcal]').waitFor()
  })

  await run('safety: wellbeing yes → gentle, maintenance, no number', async ({ page }) => {
    await wizard(page, { wellbeing: 'Yes' }, 'route-wellbeing/')
    await btn(page, 'Later').click(); await summaryUp(page)
    await page.getByText('Eating at maintenance').waitFor(); await shot(page, 'ob4-7-maint', true)
    expect(fs.existsSync(path.join(OUT, 'route-wellbeing/ob4-2-wellbeing.png')), 'signposting shown')
    await btn(page, 'Start').click(); await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(st.profile.gentle === true && st.profile.outcomes.wellbeing === 'flagged', 'gentle on, outcome only')
  })

  await run('safety: readiness yes → gentler start and signposting', async ({ page }) => {
    await wizard(page, { ready: [true, false, false] }, 'route-readiness/')
    await btn(page, 'Finish setup').click(); await setup(page); await summaryUp(page)
    await page.locator('.sm-row').filter({ hasText: /gentle first/i }).waitFor()
    expect((await stored(page)) && (await draft(page)).outcomes.readiness === 'flagged', 'flagged')
  })

  await run('safety: pregnant → maintenance, no number, midwife', async ({ page }) => {
    await wizard(page, { ready: [false, false, true], pregnant: true }, 'route-pregnancy/')
    await btn(page, 'Later').click(); await summaryUp(page)
    await page.getByText('Eating at maintenance').waitFor()
    await btn(page, 'Start').click(); await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(st.profile.pregnancy?.flagged === true && st.profile.pregnancy.askedAt === today, 'pregnancy flag and its date')
    await tab(page, 'Food'); await page.locator('.hdr .ltitle', { hasText: 'Food' }).waitFor()
    expect((await page.getByText('kcal eaten').count()) === 0, 'no calorie numbers while pregnant')
  })

  await run('safety: medical (goal lose fat) → held at maintenance', async ({ page }) => {
    await wizard(page, { medical: true }, 'route-medical/')
    await btn(page, 'Later').click(); await summaryUp(page)
    await page.getByText('Tali keeps this at maintenance for now, to keep things safe.').waitFor()
    const dr = await draft(page)
    expect(dr.outcomes.medical === 'flagged' && !JSON.stringify(dr).match(/kidney/i), 'outcome only')
  })

  await run('safety: build muscle → no medical question', async ({ page }) => {
    await wizard(page, { goal: 'Build muscle' })
  })

  await run('safety: under 18 → kind stop → Close deletes the account and this device’s data', async ({ page, net }) => {
    await wizard(page, { age: 17 }, 'route-under18/')
    await h1(page, 'Tali is for 18+'); await shot(page, 'ob4-1-under18')
    await btn(page, 'I typed my age wrong').click(); await h1(page, 'How old are you?')
    await page.getByLabel('Age in years').fill('16'); await cont(page)
    await btn(page, 'Close').click()
    await page.getByRole('button', { name: /Sign in|Log in/ }).first().waitFor({ timeout: 8000 })
    expect(net.fnCalls.length === 1 && net.fnCalls[0].body.reason === 'under-age', 'the delete-account function ran once, as the under-age deletion')
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k === 'leanplan.v1' || k.startsWith('sb-') || k.startsWith('tali.')))
    const st = await stored(page)
    expect(!left.some((k) => k.startsWith('sb-') || k === 'tali.onboarding') && (!st || !Object.keys(st.days || {}).length), 'device wiped: ' + left.join())
  })

  await run('safety: under 18, account over 24 h (re-auth refused) → stops, wipes, asks to sign in again', async ({ page, net }) => {
    await wizard(page, { age: 15 })
    await h1(page, 'Tali is for 18+')
    await btn(page, 'Close').click()
    await page.getByText('Please sign in again to finish removing your account.').waitFor({ timeout: 8000 })
    await shot(page, 'route-under18/reauth-sign-in')
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k === 'leanplan.v1' || k.startsWith('sb-') || k.startsWith('tali.')))
    const pend = await page.evaluate(() => JSON.parse(localStorage.getItem('tali.pendingDelete') || 'null'))
    expect(!left.some((k) => k.startsWith('sb-') || k === 'tali.onboarding' || k === 'leanplan.v1'), 'device wiped and signed out: ' + left.join())
    expect(pend && pend.uid === UID && pend.stage === 'sign-in', 'kept to finish at the next sign-in: ' + JSON.stringify(pend))
    await page.waitForTimeout(2500)
    expect(net.fnCalls.length === 1, 'no automatic retries: ' + net.fnCalls.length)
  }, { fnReply: { status: 403, body: { ok: false, error: 'reauth' } } })

  await run('safety: under 18 offline → device wiped now, account deleted on the next connection', async ({ page, ctx, net }) => {
    await wizard(page, { age: 14 })
    await h1(page, 'Tali is for 18+')
    await ctx.setOffline(true)
    await btn(page, 'Close').click()
    await page.waitForFunction(() => !!localStorage.getItem('tali.pendingDelete'))
    const st = await stored(page)
    expect(!st.profile.age && !st.consents.records.length, 'the device’s data is gone at once')
    expect((await btn(page, 'Close').count()) === 0, 'the stop stays, with nothing to press')
    expect(net.fnCalls.length === 0, 'nothing sent offline')
    await ctx.setOffline(false)
    await page.getByRole('button', { name: /Sign in|Log in/ }).first().waitFor({ timeout: 15000 })
    expect(net.fnCalls.length === 1 && !(await page.evaluate(() => localStorage.getItem('tali.pendingDelete'))), 'deleted once back online')
  })

  await run('safety: recent surgery → the gentle-start screen, not the pregnancy one', async ({ page }) => {
    await wizard(page, { ready: [false, false, true], pregnant: false }, 'route-surgery/')
    const dr = await draft(page)
    expect(dr.pregnant === false && dr.outcomes.readiness === 'flagged', 'readiness flagged, not pregnant')
    expect(fs.existsSync(path.join(OUT, 'route-surgery/ob4-3-readiness.png')) && !fs.existsSync(path.join(OUT, 'route-surgery/ob4-4-pregnancy.png')), 'the readiness route')
  })

  await run('a pending under-18 deletion for another account doesn’t block this one', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.evaluate(() => localStorage.setItem('tali.pendingDelete', JSON.stringify({ uid: '99999999-9999-4999-8999-999999999999', at: new Date().toISOString() })))
    await page.reload()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(500)
    expect((await page.getByText('Tali is for 18+').count()) === 0, 'no stop screen for another account')
  }, { state: { ...newAccount(), profile: { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 70, activityLevel: 'light', supplements: [], notificationsEnabled: false, onboardedAt: '2026-09-20T08:00:00.000Z', activityMult: 1.3 } } })

  await run('health data off: a height saved on Profile says it isn’t kept', async ({ page }) => {
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Body and goal/ }).click()
    await page.getByPlaceholder('178').fill('180')
    await btn(page, 'Save metrics').click()
    await page.getByText('Height isn’t kept while health data is off. Turn it back on in Profile, then Privacy.').waitFor()
    expect((await stored(page)).profile.height == null, 'not kept')
    await shot(page, 'height-not-kept')
  }, { state: { ...newAccount(), consents: { records: [GRANTED.records[0], { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000ab', type: 'health', version: '2026-09-v1', granted: false, at: '2026-09-21T08:00:00.000Z' }], healthCleared: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000ab' },
    profile: { name: 'Sam', sex: 'F', age: 34, height: null, activityLevel: 'light', supplements: [], notificationsEnabled: false, onboardedAt: '2026-09-20T08:00:00.000Z' } } })

  await run('a 1-day week', async ({ page }) => {
    await wizard(page, { goal: 'Feel better and move more' })
    await btn(page, 'Finish setup').click(); await setup(page, { oneDay: true }, 'oneday/')
    await summaryUp(page)
    expect((await page.locator('.sm-day').filter({ hasText: 'min' }).count()) === 1, 'one session')
    await page.locator('.sm-day').filter({ hasText: 'Wed' }).filter({ hasText: 'min' }).waitFor()
    await page.locator('.sm-row').filter({ hasText: 'One day is a good start' }).waitFor()
  })

  await run('offline mid-wizard, reload, resume, finish offline, sync on reconnect', async ({ page, ctx, net }) => {
    await h1(page, 'A few questions, so Tali fits you'); await btn(page, 'Let’s go').click(); await cont(page)
    await page.getByLabel('Age in years').fill('41'); await cont(page)
    await ctx.setOffline(true)
    for (let i = 0; i < 3; i++) await page.getByRole('radiogroup').nth(i).getByRole('radio', { name: 'No', exact: true }).click()
    await cont(page); await cont(page); await radio(page, 'Increase strength'); await cont(page)
    await h1(page, 'How are things lately?')
    // reload with no connection to Tali's server (the app shell itself comes from the preview)
    net.block = true
    await ctx.setOffline(false)
    await page.reload()
    await ctx.setOffline(true)
    await h1(page, 'How are things lately?')
    const dr = await draft(page)
    expect(dr.age === 41 && dr.goal === 'increase-strength' && dr.outcomes.readiness === 'clear', 'answers kept: ' + JSON.stringify(dr))
    await cont(page); await radio(page, 'No'); await cont(page)
    await page.getByLabel('Height in centimetres').fill('165'); await radio(page, 'Prefer not to say'); await cont(page)
    await page.getByLabel('Weight in kilograms').fill('70'); await cont(page)
    await btn(page, 'Done').click(); await btn(page, 'Later').click()
    await summaryUp(page)
    await btn(page, 'Start').click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(st.profile.onboardedAt && st._meta.settings.dirty && st.trainingPlans.some((p) => p._dirty), 'saved on the phone, waiting to sync')
    expect(!net.posts.some((p) => p.t === 'settings' || p.t === 'training_plans'), 'nothing sent while offline')
    net.block = false
    await ctx.setOffline(false)
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1'))._meta.settings.dirty, null, { timeout: 15000 })
    expect(net.posts.some((p) => p.t === 'settings') && net.posts.some((p) => p.t === 'training_plans'), 'synced on reconnect')
  })

  await run('existing user (flag on): no wizard, Build my plan opens the setup card, current week kept until Start', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await tab(page, 'Plan'); await page.locator('.buildplan').waitFor()
    await shot(page, 'ob6-4-buildplan')
    const before = JSON.stringify((await stored(page)).schedule)
    await page.locator('.buildplan').getByRole('button', { name: 'Build my plan' }).click()
    await h1(page, 'Are you moving much at the moment?')
    expect(JSON.stringify((await stored(page)).schedule) === before, 'nothing changes until Start')
    await setup(page); await summaryUp(page)
    await btn(page, 'Start').click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(st.trainingPlans.some((p) => p.state === 'active' && p.source === 'recommended') && st.target.kcal === 1800, 'plan accepted; targets untouched')
  }, { state: { ...newAccount(), target: { kcal: 1800, p: 140, c: 180, f: 60 }, days: { [today]: { foods: [{ n: 'Toast', k: 100, p: 4, c: 18, f: 1, grams: 40 }], supps: {}, weight: 70, workout: null } }, profile: { name: 'Pat', sex: 'F', age: 44, height: 168, activityLevel: 'light', supplements: [], notificationsEnabled: false, goal: 'lose-fat' } } })

  await run('second device: onboarded elsewhere → no wizard', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    expect((await page.getByText('A few questions, so Tali fits you').count()) === 0, 'no wizard')
  }, { state: { ...newAccount(), _meta: { ...newAccount()._meta, lastPull: null } }, rows: { settings: [{ user_id: UID, target: { kcal: 2000, p: 150, c: 200, f: 70 }, schedule: {}, profile: { name: 'Sam', sex: 'F', age: 34, height: 172, activityLevel: 'light', supplements: [], notificationsEnabled: false, onboardedAt: '2026-09-20T08:00:00.000Z' } }] } })

  // ─── Onboarding 7: Health check answers and the 12-week check-in (boards ob7-1 to ob7-4) ───
  const weeksAgo = (w) => { const d = new Date(); d.setDate(d.getDate() - w * 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const answered = ({ dark, ...x } = {}) => ({ state: { ...newAccount(), target: { kcal: 2000, p: 150, c: 200, f: 70 }, days: { [today]: { foods: [], supps: {}, weight: 70, workout: null } },
    profile: { name: 'Sam', sex: 'F', sexAnswer: 'female', age: 34, height: 168, weight: 70, activityLevel: 'light', activityMult: 1.3, supplements: [], notificationsEnabled: false, goal: 'feel-better', onboardedAt: '2026-09-20T08:00:00.000Z', ...x } }, ...(dark ? { dark: true } : {}) })
  const BOARD = { outcomes: { readiness: 'flagged', medical: 'flagged', wellbeing: 'flagged', baseline: 'ok' }, pregnancy: { flagged: true, askedAt: today }, gentle: true }
  const toAnswers = async (page) => {
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).first().click()
    await btn(page, 'Health check answers').click()
    await h1(page, 'Health check answers')
  }
  const rowTexts = (page) => page.locator('.ha-row').allInnerTexts()

  for (const dark of [false, true]) {
    await run(`ob7-1 health check answers${dark ? ' (dark)' : ''}: every answer kept, with what it changes`, async ({ page }) => {
      await toAnswers(page)
      await shot(page, 'ob7/ob7-1-answers' + (dark ? '-dark' : ''))
      const rows = await rowTexts(page)
      expect(rows.length === 4 && /^Pregnant or breastfeeding\nYes\nFood stays at maintenance/.test(rows[0]) && /^Conditions or medicines\nYes/.test(rows[1]) && /^Health check\nGentler start/.test(rows[2]) && /^Food and weight\nYes or sometimes/.test(rows[3]), rows.join(' ¶ '))
      expect((await page.getByRole('button', { name: /^Change/ }).count()) === 3 && (await page.getByRole('button', { name: /^Clear/ }).count()) === 3, 'Change ×3, Clear ×3 (health check Clear only, food and weight Change only)')
      await page.getByText('Clearing these changes your plan and targets straight away.').waitFor()
    }, answered({ ...BOARD, dark }))
  }

  await run('ob7-2 clear pregnancy: asks first, then the row goes and targets show again', async ({ page }) => {
    await toAnswers(page)
    await page.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click()
    await h1(page, 'Clear pregnant or breastfeeding?')
    await page.getByText('Your food targets will show calorie numbers again, and training goes back to your usual pace.').waitFor()
    await shot(page, 'ob7/ob7-2-confirm')
    await btn(page, 'Keep it').click()
    expect(!!(await stored(page)).profile.pregnancy, 'Keep it keeps it')
    await page.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click()
    await page.locator('.sheet .btn', { hasText: 'Clear' }).click()
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1')).profile.pregnancy)
    const st = await stored(page)
    expect(!st.profile.pregnancy && !!st.profile.answeredAt.pregnancy, 'cleared and stamped')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).target.kcal !== 2000)
    { const t = (await stored(page)).target.kcal; expect(t !== 2000 && t > 1200, 'targets re-run: ' + t) }
    expect((await rowTexts(page)).length === 1, 'one row left')
  }, answered({ outcomes: { readiness: 'clear' }, pregnancy: { flagged: true, askedAt: today } }))

  await run('ob7-2 variant: numbers stay hidden while gentle mode is on', async ({ page }) => {
    await toAnswers(page)
    await page.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click()
    await page.getByText('Your plan goes back to your usual pace. Calorie numbers stay hidden while gentle mode is on.').waitFor()
    await shot(page, 'ob7/ob7-2b-confirm-hidden')
  }, answered(BOARD))

  await run('ob7-2 a gentler start remains: says it stays', async ({ page }) => {
    await toAnswers(page)
    await page.getByRole('button', { name: 'Clear pregnant or breastfeeding' }).click()
    await page.getByText('Your food targets will show calorie numbers again. Your gentler start stays until you clear it too.').waitFor()
    await shot(page, 'ob7/ob7-2c-confirm-gentler')
  }, answered({ outcomes: { readiness: 'flagged' }, pregnancy: { flagged: true, askedAt: today } }))

  await run('ob7-1b clear everything: nothing kept', async ({ page }) => {
    await toAnswers(page)
    await page.getByRole('button', { name: 'Clear health check' }).click()
    await page.getByRole('button', { name: 'Clear conditions or medicines' }).click()
    await page.locator('.sheet .btn', { hasText: 'Clear' }).click()
    await page.getByText('Nothing kept from your health check.').waitFor()
    await shot(page, 'ob7/ob7-1b-empty')
    const p = (await stored(page)).profile
    expect(!p.outcomes, 'no outcomes left: ' + JSON.stringify(p.outcomes))
  }, answered({ outcomes: { readiness: 'flagged', medical: 'flagged' } }))

  await run('change conditions and food and weight: outcomes only, gentle mode follows', async ({ page }) => {
    await toAnswers(page)
    await page.getByRole('button', { name: 'Change conditions or medicines' }).click()
    await check(page, 'None of these')
    await shot(page, 'ob7/change-conditions')
    await btn(page, 'Done').click()
    await page.getByRole('button', { name: 'Change food and weight' }).click()
    await shot(page, 'ob7/change-wellbeing')
    await radio(page, 'No')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.outcomes.wellbeing === 'clear')
    const p = (await stored(page)).profile
    expect(p.outcomes.medical === 'clear' && p.outcomes.wellbeing === 'clear' && p.gentle === false, JSON.stringify(p.outcomes) + ' gentle ' + p.gentle)
    const rows = await rowTexts(page)
    expect(/^Conditions or medicines\nNone of these/.test(rows[0]) && /^Food and weight\nNo\n/.test(rows[1]), rows.join(' ¶ '))
    expect(!JSON.stringify(p).match(/insulin|kidney|semaglutide/i), 'no condition kept')
  }, answered({ outcomes: { medical: 'flagged', wellbeing: 'flagged' }, gentle: true }))

  for (const dark of [false, true]) {
    await run(`ob7-3 12-week check-in on Today${dark ? ' (dark)' : ''}: once; Ask me later snoozes 2 weeks`, async ({ page }) => {
      await h1(page, 'Does this still apply?')
      await shot(page, 'ob7/ob7-3-checkin' + (dark ? '-dark' : ''))
      await page.getByRole('button', { name: 'Ask me later' }).click()
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.pregnancy.snoozedAt)
      const p = (await stored(page)).profile.pregnancy
      expect(p.flagged && p.snoozedAt === today && p.askedAt === weeksAgo(13), JSON.stringify(p))
      await page.reload(); await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor(); await page.waitForTimeout(600)
      expect((await page.getByText('Does this still apply?').count()) === 0, 'not again until the snooze ends')
    }, answered({ pregnancy: { flagged: true, askedAt: weeksAgo(13) }, dark }))
  }

  await run('ob7-3 closing the sheet counts as Ask me later', async ({ page }) => {
    await h1(page, 'Does this still apply?')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.pregnancy.snoozedAt)
  }, answered({ pregnancy: { flagged: true, askedAt: weeksAgo(13) } }))

  await run('ob7-3 Breastfeeding now: closes quietly and restarts the 12 weeks', async ({ page }) => {
    await h1(page, 'Does this still apply?')
    await radio(page, 'Breastfeeding now')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.pregnancy.askedAt !== undefined && document.querySelectorAll('.sheet').length === 0)
    const p = (await stored(page)).profile.pregnancy
    expect(p.flagged && p.askedAt === today && !p.snoozedAt, JSON.stringify(p))
  }, answered({ pregnancy: { flagged: true, askedAt: weeksAgo(13) } }))

  await run('ob7-4 No longer: thanks, then the answers', async ({ page }) => {
    await h1(page, 'Does this still apply?')
    await radio(page, 'No longer')
    await page.getByRole('heading', { name: 'Thanks. Your plan and targets will update.' }).waitFor()
    await shot(page, 'ob7/ob7-4-nolonger')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).target.kcal !== 2000)
    const st = await stored(page)
    expect(!st.profile.pregnancy && st.target.kcal !== 2000, 'flag gone, targets re-run: ' + st.target.kcal)
    await btn(page, 'See your health check answers').click()
    await h1(page, 'Health check answers')
    await page.getByText('Nothing kept from your health check.').waitFor()
  }, answered({ pregnancy: { flagged: true, askedAt: weeksAgo(13) } }))

  // offline-first: a changed answer re-runs routing and targets at once; the plan rebuild needs the
  // engine chunk, prefetched while online (warm), or pending until it can load (cold)
  const planState = () => {
    const f = finished({ v: 1, mode: 'first', step: 'summary', seed: 'e2e-ob7', name: 'Sam', age: 34, goal: 'feel-better', motivations: [],
      outcomes: { readiness: 'flagged', wellbeing: 'clear', baseline: 'ok', medical: 'clear' }, height: 168, heightUnit: 'cm', sexAnswer: 'female', weight: 70, weightUnit: 'kg',
      movement: { kind: 'steps', band: '5k-7.5k' }, moving: 'now-and-then', experience: 'beginner', daysPerWeek: 3, minutes: 30, where: 'home', kit: ['dumbbell', 'mat'], enjoy: ['walking'] }, today, '2026-09-20T08:00:00.000Z')
    return { state: { ...newAccount(), target: { kcal: 2000, p: 150, c: 200, f: 70 }, days: { [today]: { foods: [], supps: {}, weight: 70, workout: null } }, profile: f.profile, trainingPlans: f.trainingPlans.map((p) => ({ ...p, _dirty: true })), routines: f.routines.map((r) => ({ ...r, _dirty: true })) } }
  }
  const readinessGuard = (st) => /"code":"guardrail","about":"[a-z-]+","field":"readiness"/.test(JSON.stringify([st.trainingPlans.find((p) => p.state === 'active').why, st.routines.filter((r) => !r.archived)]))
  const clearHealthCheck = async (page) => {
    await toAnswers(page)
    await page.getByRole('button', { name: 'Clear health check' }).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).target.kcal !== 2000)
  }

  await run('offline, warm cache: clearing an answer re-runs targets and the plan with no connection', async ({ page, ctx }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    expect(readinessGuard(await stored(page)), 'the plan starts with the readiness guardrail')
    await page.waitForTimeout(1500) // the prefetch (App) while online
    await ctx.setOffline(true)
    await clearHealthCheck(page)
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1'))._meta.rerunAnswers)
    const st = await stored(page)
    expect(!st.profile.outcomes.readiness && !readinessGuard(st), 'plan rebuilt offline without the guardrail')
  }, planState())

  await run('offline, cold cache: targets at once, the plan rebuild pending until the engine loads', async ({ page, ctx }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await ctx.setOffline(true)
    await clearHealthCheck(page)
    await page.waitForTimeout(800)
    const st = await stored(page)
    expect(st.target.kcal !== 2000 && st._meta.rerunAnswers === true && readinessGuard(st), 'targets re-run, plan pending: ' + st.target.kcal + ' ' + st._meta.rerunAnswers)
    await ctx.unroute(/\/assets\/(wizard|Wizard)-/)
    await ctx.setOffline(false)
    await page.reload()
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1'))._meta.rerunAnswers, null, { timeout: 15000 })
    expect(!readinessGuard(await stored(page)), 'plan rebuilt at the next launch')
  }, { ...planState(), block: /\/assets\/(wizard|Wizard)-/ })

  // ─── Redo setup (compliance item 32): prefilled, replaces the answers, the rebuild is offered ───
  const toRedo = async (page) => {
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).first().click()
    await btn(page, 'Redo setup').click()
    await h1(page, 'What do you like to be called?')
  }
  /** Continue through every (prefilled) screen to the summary */
  const toSummary = async (page) => {
    for (let i = 0; i < 40; i++) {
      if (await page.getByRole('heading', { name: 'Here’s a starting point, not a test', exact: true }).count()) return
      for (const n of ['Continue', 'Done', 'Finish setup', 'Build my week']) {
        const b = btn(page, n).first()
        if (await b.count() && await b.isVisible() && await b.isEnabled()) { await b.click(); break }
      }
      await page.waitForTimeout(120)
    }
    throw new Error('never reached the summary')
  }
  const redoState = () => answered({ outcomes: { readiness: 'clear', baseline: 'low' }, motivations: ['energy'], movement: { kind: 'steps', band: '5k-7.5k' }, units: { weight: 'kg', height: 'cm' },
    training: { daysPerWeek: 3, minutesPerSession: 30, place: ['home'], equipment: ['dumbbell'], limitations: ['knees', 'hips'], exPrefs: { liked: ['goblet-squat'] } } })
  await run('redo setup: prefilled from the current answers; back from the first question closes it', async ({ page }) => {
    await toRedo(page)
    expect((await page.getByLabel('First name').inputValue()) === 'Sam', 'name prefilled')
    await shot(page, 'redo/redo-1-name')
    await page.getByRole('button', { name: 'Back' }).click()
    await page.locator('.hdr .ltitle', { hasText: 'Profile' }).waitFor()
    expect(!(await draft(page)), 'draft gone')
  }, redoState())
  for (const rebuild of [false, true]) {
    await run(`redo setup: a changed answer replaces the old one; ${rebuild ? '"Rebuild my week" rebuilds' : '"Keep my current week" keeps the plan'}`, async ({ page }) => {
      const before = await stored(page)
      await toRedo(page)
      await cont(page) // name
      expect((await page.getByLabel('Age in years').inputValue()) === '34', 'age prefilled')
      await cont(page) // age
      await h1(page, 'A quick health check')
      await cont(page)
      await h1(page, 'What would make this worth it for you?')
      expect((await page.getByRole('checkbox', { name: 'More energy', exact: true }).getAttribute('aria-checked')) === 'true', 'why prefilled')
      await cont(page)
      await h1(page, 'What’s your main goal?')
      await radio(page, 'Build muscle')
      await cont(page)
      await toSummary(page)
      await shot(page, 'redo/redo-2-summary', true)
      await btn(page, 'Start').click()
      await h1(page, 'Rebuild your week too?')
      await shot(page, 'redo/redo-3-offer')
      await btn(page, rebuild ? 'Rebuild my week' : 'Keep my current week').click()
      await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
      const st = await stored(page)
      expect(st.profile.goal === 'build-muscle' && st.profile.onboardedAt === before.profile.onboardedAt, 'goal replaced, onboardedAt kept')
      expect(st.profile.outcomes.baseline === 'low' && st.profile.motivations.join() === 'energy' && st.profile.movement.band === '5k-7.5k', 'unchanged answers kept: ' + JSON.stringify({ o: st.profile.outcomes, m: st.profile.motivations, mv: st.profile.movement }))
      expect(st.profile.training.limitations.slice().sort().join() === 'hips,knees' && st.profile.training.exPrefs.liked.join() === 'goblet-squat', 'hips kept, likes kept: ' + JSON.stringify(st.profile.training))
      expect(Object.keys(st.days).length === Object.keys(before.days).length && st.days[today].weight === 70, 'no new weigh-in')
      const n0 = (before.trainingPlans || []).length, n1 = (st.trainingPlans || []).length
      expect(rebuild ? n1 === n0 + 1 : n1 === n0, `plans ${n0} → ${n1}`)
      expect(!(await draft(page)), 'draft gone')
    }, redoState())
  }

  // ─── the first-run wait (Benn's device test): no flash of the wizard before the first pull ───
  const usedBeforeRows = { settings: [{ user_id: UID, target: { kcal: 1800, p: 140, c: 180, f: 60 }, schedule: {}, profile: { name: 'Pat', sex: 'F', age: 44, height: 168, activityLevel: 'light', supplements: [], notificationsEnabled: false, goal: 'lose-fat' } }] }
  const unpulled = { ...newAccount(), _meta: { ...newAccount()._meta, lastPull: null } }
  const wizardUp = (page) => page.getByRole('heading', { name: 'A few questions, so Tali fits you', exact: true }).count()
  await run('slow pull (4 s), used before: loading, then the app; the wizard never shows', async ({ page }) => {
    for (let i = 0; i < 60; i++) {
      expect((await wizardUp(page)) === 0, 'the wizard flashed up at ' + i * 100 + ' ms')
      if (await page.locator('.hdr .ltitle', { hasText: 'Summary' }).count()) break
      await page.waitForTimeout(100)
    }
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    expect((await wizardUp(page)) === 0, 'no wizard after the pull')
  }, { state: unpulled, rows: usedBeforeRows, pullDelay: 4000 })
  await run('pull slower than the wait (13 s): the wizard shows; untouched, the pull switches to the app', async ({ page }) => {
    await h1(page, 'A few questions, so Tali fits you')
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor({ timeout: 20000 })
  }, { state: unpulled, rows: usedBeforeRows, pullDelay: 13000 })
  await run('pull slower than the wait (13 s): once started, the wizard stays', async ({ page }) => {
    await h1(page, 'A few questions, so Tali fits you')
    await btn(page, 'Let’s go').click()
    await h1(page, 'What do you like to be called?')
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('leanplan.v1'))._meta.lastPull, null, { timeout: 20000 })
    await page.waitForTimeout(800)
    expect((await page.getByRole('heading', { name: 'What do you like to be called?', exact: true }).count()) === 1, 'still in the wizard after the pull')
    expect((await stored(page)).profile.goal === 'lose-fat', 'the pulled profile is in')
  }, { state: unpulled, rows: usedBeforeRows, pullDelay: 13000 })

  // ─── Set up my plan: someone who used Tali before and never onboarded ───
  await run('set up my plan: prefilled from Profile; Start offers the rebuild; setup is then done', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const before = await stored(page)
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).first().click()
    expect((await btn(page, 'Redo setup').count()) === 0, 'not Redo setup before a first run')
    await btn(page, 'Set up my plan').click()
    await h1(page, 'What do you like to be called?')
    expect((await page.getByLabel('First name').inputValue()) === 'Pat', 'name prefilled')
    await cont(page)
    expect((await page.getByLabel('Age in years').inputValue()) === '44', 'age prefilled')
    await toSummary(page)
    await btn(page, 'Start').click()
    await h1(page, 'Rebuild your week too?')
    await btn(page, 'Keep my current week').click()
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    const st = await stored(page)
    expect(!!st.profile.onboardedAt && st.profile.goal === 'lose-fat' && st.profile.sexAnswer === 'female' && st.profile.height === 168 && st.profile.age === 44, 'answers kept, setup done: ' + JSON.stringify(st.profile))
    expect((st.trainingPlans || []).length === (before.trainingPlans || []).length && st.days[today].weight === 70, 'week and weigh-ins as they were')
  }, { state: { ...newAccount(), target: { kcal: 1800, p: 140, c: 180, f: 60 }, days: { [today]: { foods: [{ n: 'Toast', k: 100, p: 4, c: 18, f: 1, grams: 40 }], supps: {}, weight: 70, workout: null } }, profile: { name: 'Pat', sex: 'F', age: 44, height: 168, activityLevel: 'light', supplements: [], notificationsEnabled: false, goal: 'lose-fat' } } })

  await run('flag off: no Health check answers row, no check-in', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(600)
    expect((await page.getByText('Does this still apply?').count()) === 0, 'no check-in')
    await tab(page, 'Profile')
    await page.getByRole('button', { name: /Health data/ }).first().click()
    await page.waitForTimeout(300)
    expect((await btn(page, 'Health check answers').count()) === 0, 'no row')
    expect((await btn(page, 'Redo setup').count()) === 0 && (await btn(page, 'Set up my plan').count()) === 0, 'no Redo setup or Set up my plan row')
  }, { ...answered({ ...BOARD, pregnancy: { flagged: true, askedAt: weeksAgo(13) } }), url: OFF })

  await run('flag off: nothing new shows', async ({ page }) => {
    await page.locator('.hdr .ltitle', { hasText: 'Summary' }).waitFor()
    await page.waitForTimeout(600)
    expect((await page.getByText('A few questions, so Tali fits you').count()) === 0, 'no wizard')
    expect((await page.getByLabel('Finish your setup').count()) === 0, 'no setup card')
    await tab(page, 'Plan'); await page.locator('.hdr .ltitle', { hasText: 'Plan' }).waitFor()
    expect((await page.locator('.buildplan').count()) === 0, 'no Build my plan card')
  }, { url: OFF })

  await browser.close()
  const bad = results.filter((r) => !r).length
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
