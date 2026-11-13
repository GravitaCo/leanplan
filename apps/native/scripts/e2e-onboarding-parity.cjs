/**
 * Onboarding parity, web against native (native-build-plan §4 N11: every route, and the summary's
 * numbers equal startingTargets). Drives the same answers through the web app built with the
 * onboarding flag on and through this app's code rendered for the web (react-native-web), then
 * compares, route by route:
 *   - every screen's words (each screen's visible lines, in order), web against native;
 *   - the wizard draft (`tali.onboarding`) at the summary: outcomes only, and the same answers;
 *   - the summary's Food numbers against startingTargets from the core (e2e-onboarding-expect.ts);
 *   - what Start saves: the profile, the targets, the active plan's shape and today's weigh-in.
 * Screenshots of both, per screen, go to E2E_OUT for `design` (light, and dark for the main route).
 * Carries over the wizard, safety, summary and redo cases of scripts/e2e-onboarding.cjs. The native
 * render reaches the wizard at /onboarding-e2e (app/onboarding-e2e.tsx: useOnboardingGate, in
 * EXPO_PUBLIC_E2E builds only) until the lead wires it into the gate; Redo setup opens through the
 * store (lib/e2eHook.ts) until Profile has its row. N1's pickers on a web render take no keys and
 * show no aria value, so native runs first and the web is given the values its pickers landed on.
 *
 *   (repo root) VITE_ONBOARDING=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4185 &
 *   (apps/native) EXPO_PUBLIC_ONBOARDING=1 EXPO_PUBLIC_E2E=1 npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   (apps/native, flag off) EXPO_PUBLIC_E2E=1 npx expo export --platform web --output-dir dist-web-off && npx serve -s dist-web-off -l 4189 &
 *   WEB_URL=http://localhost:4185/ NATIVE_URL=http://localhost:4188/ NATIVE_OFF_URL=http://localhost:4189/ node scripts/e2e-onboarding-parity.cjs
 *
 * Every Supabase request is answered by an in-memory stand-in; the real project is never reached.
 * A web render is not the phone: this checks words, routes and numbers, and the layout only roughly.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync } = require('node:child_process')

const WEB = process.env.WEB_URL || 'http://localhost:4185/'
const NATIVE = (process.env.NATIVE_URL || 'http://localhost:4188/') + 'onboarding-e2e'
const NATIVE_OFF = process.env.NATIVE_OFF_URL ? process.env.NATIVE_OFF_URL + 'onboarding-e2e' : ''
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-ob-parity-'))
fs.mkdirSync(OUT, { recursive: true })
const UID = '11111111-2222-4333-8444-555555555555'
const SEED = '0b0b0b0b-1111-4222-8333-444444444444'

// the core's own numbers, bundled for node (as scripts/e2e-onboarding.cjs does)
const ROOT = path.resolve(__dirname, '../../..')
const EXPECT = path.join(ROOT, 'node_modules/.cache/e2e-onboarding-expect.cjs')
execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), ['scripts/e2e-onboarding-expect.ts', '--bundle', '--platform=node', '--alias:@=./src', '--define:import.meta.env={}', '--log-level=error', '--format=cjs', '--outfile=' + EXPECT], { cwd: ROOT })
const { expected } = require(EXPECT)

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400, iat: now, amr: [{ method: 'password', timestamp: now - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user: USER }
const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
const todayWd = new Date().getDay()
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function newAccount() {
  const u = new Date().toISOString()
  return { days: {}, consents: GRANTED, _meta: { settings: { u, dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID } }
}
/** onboarded before, for Redo setup (as e2e-onboarding's redoState) */
const redoState = () => ({ ...newAccount(), target: { kcal: 2000, p: 150, c: 200, f: 70 }, days: { [today]: { foods: [], supps: {}, weight: 70, workout: null } },
  profile: { name: 'Sam', sex: 'F', sexAnswer: 'female', age: 34, height: 168, weight: 70, activityLevel: 'light', activityMult: 1.3, supplements: [], notificationsEnabled: false, goal: 'feel-better', onboardedAt: '2026-09-20T08:00:00.000Z',
    outcomes: { readiness: 'clear', baseline: 'low' }, motivations: ['energy'], movement: { kind: 'steps', band: '5k-7.5k' }, units: { weight: 'kg', height: 'cm' },
    training: { daysPerWeek: 3, minutesPerSession: 30, place: ['home'], equipment: ['dumbbell'], limitations: ['knees', 'hips'], exPrefs: { liked: ['goblet-squat'] } } } })
/** used Tilo before onboarding, for Set up my plan */
const usedBefore = () => ({ ...newAccount(), target: { kcal: 1800, p: 140, c: 180, f: 60 }, days: { [today]: { foods: [{ n: 'Toast', k: 100, p: 4, c: 18, f: 1, grams: 40 }], supps: {}, weight: 70, workout: null } },
  profile: { name: 'Pat', sex: 'F', age: 44, height: 168, activityLevel: 'light', supplements: [], notificationsEnabled: false, goal: 'lose-fat' } })

let bad = 0
const results = []
const check = (name, ok, detail) => { if (!ok) bad++; results.push([ok, name]); console.log(ok ? 'PASS' : 'FAIL', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 900) : '') }

async function open(browser, url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: opts.dark ? 'dark' : 'light' })
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(SESSION), JSON.stringify(opts.state ?? newAccount())])
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], routines: [], training_plans: [], consents: [{ id: GRANTED.records[0].id, user_id: UID, type: 'health', version: '2026-09-v1', granted: true, recorded_at: GRANTED.records[0].at }], ...(opts.rows || {}) }
  const net = { fnCalls: [] }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/functions/v1/delete-account')) { net.fnCalls.push(JSON.parse(req.postData() || '{}')); return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"ok":true}' }) }
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(USER) })
    if (u.includes('/auth/v1/logout')) return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/auth/v1/token')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(SESSION) })
    if (u.includes('/rest/v1/rpc/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' })
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' })
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    const body = JSON.parse(req.postData() || '[]')
    for (const row of Array.isArray(body) ? body : [body]) {
      const list = (rows[m[1]] ||= []), i = list.findIndex((r) => keyOf(m[1]).every((k) => r[k] === row[k]))
      if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row)
    }
    return route.fulfill({ status: 201, headers: cors, body: '' })
  })
  await ctx.route(/openfoodfacts\.org|b-cdn\.net/, (r) => r.abort())
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url + (opts.query ?? ''))
  return { ctx, page, errors, net }
}

/* ---------------- driving, by role, the same on both ---------------- */

const btn = (page, name) => page.getByRole('button', { name, exact: true })
const h1 = (page, text) => page.getByRole('heading', { name: text, exact: true }).first().waitFor({ timeout: 15000 })
const radio = (page, name) => page.getByRole('radio', { name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
const tick = (page, name) => page.getByRole('checkbox', { name, exact: true }).click()
const tap = async (page, name) => { await radio(page, name); await page.waitForTimeout(450) }
const draft = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tali.onboarding') || 'null'))
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
/**
 * Set a wheel or ruler (role=slider): by keyboard as the web's e2e does (one nudge so it counts as
 * picked, then the arrow keys); a picker that doesn't take keys (N1's on a web render) is dragged
 * with the mouse instead, one row (48 px) or tick (9.2 px) a step, as a finger would.
 */
/**
 * The values N1's pickers actually landed on in the native run, by route and order, so the web run
 * is given the same answers (a drag on a web render isn't exact; the pickers' own checks are N1's).
 */
const landed = new Map()
let slideCtx = { key: '', n: 0, native: false }
async function slide(page, name, want) {
  const k = `${slideCtx.key}#${slideCtx.n++}`
  const target = !slideCtx.native && landed.has(k) ? landed.get(k) : want
  const got = await slideTo(page, name, target)
  if (slideCtx.native) landed.set(k, got)
}
async function slideTo(page, name, target) {
  const sl = page.getByRole('slider', { name, exact: true }).first()
  const hasValue = (await sl.getAttribute('aria-valuenow')) != null
  const now = async () => (hasValue ? +(await sl.getAttribute('aria-valuenow')) : shownValue(page, name))
  if (hasValue) {
    await sl.focus()
    await sl.press('ArrowUp'); await sl.press('ArrowDown')
    let v = await now()
    for (let i = 0; i < 400 && v !== target; i++) { await sl.press(v < target ? 'ArrowUp' : 'ArrowDown'); v = await now() }
    if (v !== target) throw new Error(`slider ${name} stuck at ${v}, wanted ${target}`)
    return v
  }
  // N1's pickers on a web render take no keys and expose no aria value (TODO(N1-followup)), and
  // react-native-web's responder takes only the first mouse drag after a picker mounts. So, as a
  // finger would: tap wheel rows (each tap moves up to 3 rows; taps always register), and set a
  // ruler with one drag the exact length, from whichever edge leaves room. Values are read off screen.
  const box = await sl.boundingBox()
  if (/years/i.test(name)) {
    for (let i = 0; i < 40; i++) {
      const v = await now()
      if (v === target && i > 0) return v
      const r = Math.max(-3, Math.min(3, target - v))
      // rows are 48 tall, the middle (row 3 of 7) is the value shown; a tap on row 3 + r picks v + r
      await page.mouse.click(box.x + box.width / 2, box.y + (3 + r) * 48 + 24)
      await page.waitForTimeout(260)
    }
  } else {
    for (let i = 0; i < 1; i++) {
      const v = await now()
      if (process.env.DEBUG_SLIDE) console.log('ruler', name, i, v, target)
      if (v === target && i > 0) break
      if (i > 0) {
        // a fresh ruler for the next drag: the unit away and back (each unit's ruler is its own, keyed)
        const grp = page.getByRole('radiogroup', { name: name + ' unit', exact: true })
        const cur = grp.getByRole('radio', { checked: true }).first()
        const other = grp.getByRole('radio', { checked: false }).first()
        await other.click(); await page.waitForTimeout(150); await cur.click(); await page.waitForTimeout(200)
      }
      const b = await sl.boundingBox()
      const d = -((target - (await now())) || 1) * 9.2
      const x0 = d < 0 ? b.x + b.width - 12 : b.x + 12, y = b.y + b.height / 2
      await page.mouse.move(x0, y); await page.mouse.down()
      for (let k = 1; k <= 12; k++) { await page.mouse.move(x0 + (d * k) / 12, y); await page.waitForTimeout(12) }
      await page.mouse.up(); await page.waitForTimeout(300)
    }
  }
  const v = await now()
  // a ruler on a web render lands near, not on, the value: within 10 ticks, the native run keeps
  // what it got and the web run is given the same
  if (!Number.isFinite(v) || Math.abs(v - target) > 10) throw new Error(`slider ${name} stuck at ${v}, wanted ${target}`)
  return v
}
/** The value a picker shows: the wheel's bold middle number; a ruler's figure above it (cm, kg, lb, st lb, ft in). */
async function shownValue(page, name) {
  return page.evaluate((nm) => {
    const el = document.querySelector(`[role=slider][aria-label="${nm}"]`)
    if (!el) return NaN
    if (/years/i.test(nm)) {
      const bold = [...el.querySelectorAll('div')].find((d) => d.children.length === 0 && /SemiBold/.test(getComputedStyle(d).fontFamily))
      return bold ? +bold.textContent : NaN
    }
    // the figure is the text just before the ruler: "172 cm", "5′8", "87 kg", "192 lb", "13 st 10 lb"
    const txt = document.body.innerText.replace(/\u00a0/g, ' ')
    const st = txt.match(/(\d+) st (\d+) lb/); if (st) return +st[1] * 14 + +st[2]
    const ft = txt.match(/(\d)′(\d+)/); if (ft) return +ft[1] * 12 + +ft[2]
    const m = txt.match(/(?:^|\n)(\d+) (cm|kg|lb)(?:\n|$)/); return m ? +m[1] : NaN
  }, name)
}
const sliderNow = async (page, name) => { const sl = page.getByRole('slider', { name, exact: true }).first(); if ((await sl.getAttribute('aria-valuenow')) == null) return shownValue(page, name); return (await sl.getAttribute('aria-valuetext')) === 'Not set' ? null : +(await sl.getAttribute('aria-valuenow')) }

/** The screen's visible lines, for comparing words: no dialog content, whitespace normalised. */
async function lines(page) {
  await page.waitForTimeout(150)
  const txt = await page.evaluate(() => document.body.innerText)
  return txt.replace(/ /g, ' ').split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/**
 * One run of a route on one app: `steps` is a list of [label, async (page) => {}], each ending on a
 * screen whose words and screenshot are recorded under `label`.
 */
async function drive(browser, url, which, route, opts) {
  const o = await open(browser, url, opts)
  const { page } = o
  slideCtx = { key: route.name, n: 0, native: which === 'native' }
  const shots = {}
  const rec = async (label) => {
    shots[label] = await lines(page)
    const f = path.join(OUT, route.name.replace(/\W+/g, '-').slice(0, 60), `${label}-${which}${opts.dark ? '-dark' : ''}.png`)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    await page.screenshot({ path: f })
  }
  o.which = which
  let err = null
  try { await route.fn(page, rec, o) } catch (e) { err = e; await page.screenshot({ path: path.join(OUT, route.name.replace(/\W+/g, '-') + `-FAIL-${which}.png`) }).catch(() => {}) }
  const out = { shots, draft: route.keepDraft ?? await draft(page).catch(() => null), state: await stored(page).catch(() => null), errors: o.errors, err, net: o.net, extra: o.extra }
  await o.ctx.close()
  return out
}

/** Set the engine seed the same on both runs (the plan id seeds the engine), then reload into it. */
async function fixSeed(page) {
  await page.waitForFunction(() => !!localStorage.getItem('tali.onboarding'), null, { timeout: 8000 })
  await page.evaluate((seed) => { const d = JSON.parse(localStorage.getItem('tali.onboarding')); d.seed = seed; localStorage.setItem('tali.onboarding', JSON.stringify(d)) }, SEED)
  await page.reload()
}

/** The first run from the intro to the handoff (e2e-onboarding's wizard()), recording each screen. */
async function wizard(page, rec, a = {}) {
  await h1(page, 'A few questions, so Tilo fits you'); await rec('01-intro')
  await btn(page, 'Let’s go').click()
  await h1(page, 'What do you like to be called?')
  await fixSeed(page)
  await h1(page, 'What do you like to be called?')
  await page.getByPlaceholder('Sam').fill(a.name ?? 'Sam'); await rec('02-name'); await btn(page, 'Continue').click()
  await h1(page, 'How old are you?')
  await rec('03-age-unset')
  await slide(page, 'Age in years', a.age ?? 34); await rec('03-age'); await btn(page, 'Continue').click()
  if ((a.age ?? 34) < 18) return
  await h1(page, 'A few health questions')
  const yes = a.ready ?? [false, false, false]
  const groups = page.getByRole('radiogroup')
  for (let i = 0; i < 3; i++) await groups.nth(i).getByRole('radio', { name: yes[i] ? 'Yes' : 'No', exact: true }).click()
  if (yes[2]) await page.getByRole('radiogroup', { name: 'Which of these is it?' }).getByRole('radio', { name: a.pregnant ? 'Pregnant' : 'Recent surgery', exact: true }).click()
  await rec('04-ready'); await btn(page, 'Continue').click()
  if (a.pregnant) { await h1(page, 'We’ll keep things gentle'); await rec('04b-pregnancy-note'); await btn(page, 'Continue').click() }
  else if (yes.some(Boolean)) { await h1(page, 'We’ll start gently'); await rec('04b-readiness-note'); await btn(page, 'Continue').click() }
  await h1(page, 'What would make this worth it for you?')
  await tick(page, 'More energy'); await tick(page, 'Feel stronger'); await rec('05-why'); await btn(page, 'Continue').click()
  await h1(page, 'What’s your main goal?'); await rec('06-goal')
  if (a.quickChange) { await radio(page, a.quickChange); await radio(page, a.goal); await page.waitForTimeout(450) } else await tap(page, a.goal ?? 'Lose fat')
  await h1(page, 'How are things lately?')
  await page.getByRole('radiogroup', { name: 'Sleep' }).getByRole('radio', { name: a.sleep ?? 'Mixed' }).click()
  await page.getByRole('radiogroup', { name: 'Stress' }).getByRole('radio', { name: 'Some' }).click()
  await page.getByRole('radiogroup', { name: 'Room for change right now' }).getByRole('radio', { name: 'A little' }).click()
  await rec('07-lately'); await btn(page, 'Continue').click()
  await h1(page, 'How food and weight feel for you'); await rec('08-wellbeing'); await tap(page, a.wellbeing ?? 'No')
  if (a.wellbeing === 'Yes' || a.wellbeing === 'Sometimes') {
    await h1(page, 'Thanks for telling us')
    for (const [l, n] of [['England', '0808 801 0677'], ['Scotland', '0808 801 0432'], ['Wales', '0808 801 0433'], ['Northern Ireland', '0808 801 0434']]) await page.getByRole('link', { name: `Beat, ${l}: call ${n}` }).waitFor()
    await page.getByRole('link', { name: /Webchat and email/ }).first().waitFor()
    await rec('08b-wellbeing-note'); await btn(page, 'Continue').click()
  }
  await h1(page, 'About your body')
  await rec('09-body-unset')
  await slide(page, 'Height', 172); await radio(page, 'Female'); await rec('09-body')
  await radio(page, 'ft in'); await rec('09-body-ftin')
  // imperial: 5 ft 8 in (68 in) is saved as 172.7 cm in ft in, as on web
  if (a.imperial) await slide(page, 'Height', 68); else await radio(page, 'cm')
  await btn(page, 'Continue').click()
  await h1(page, 'Does any of this apply to you?')
  const injection = a.medical === 'injection'
  await tick(page, injection ? 'A weight-loss injection, like semaglutide or tirzepatide' : a.medical ? 'Kidney disease' : 'None of these'); await rec('10-medical'); await btn(page, 'Continue').click()
  if (a.medical) { await h1(page, 'Your food range stays at maintenance'); await rec('10b-medical-note'); await btn(page, 'Continue').click() }
  await h1(page, 'What do you weigh?')
  if (a.noWeight) { await rec('11-weight'); await btn(page, 'Skip').click() }
  else {
    await radio(page, 'st lb'); await slide(page, 'Weight', 13 * 14 + 10); await rec('11-weight-stlb')
    if (!a.imperial) { await radio(page, 'kg'); await slide(page, 'Weight', 87); await rec('11-weight') }
    await btn(page, 'Continue').click()
  }
  await h1(page, 'How much do you move on a normal day?'); await rec('12-move')
  await btn(page, 'Not sure? Describe your day instead').click(); await h1(page, 'What’s a normal day like?'); await rec('12b-job')
  await btn(page, 'Use steps instead').click(); await tap(page, '5,000 to 7,500 steps')
  await h1(page, 'How you like to train'); await rec('13-handoff')
}

/** The setup card (e2e-onboarding's setup()), to the summary. */
async function setup(page, rec, a = {}) {
  await h1(page, 'Are you moving much at the moment?'); await rec('20-moving'); await tap(page, 'A little, now and then')
  await h1(page, 'How confident do you feel with workouts?'); await rec('21-confidence'); await tap(page, 'Just starting')
  await h1(page, 'How many days a week would you like to train?')
  if (a.oneDay) { await radio(page, '1'); await page.getByRole('checkbox', { name: 'Wednesday' }).click(); await rec('22-days-one') }
  else {
    await radio(page, '3'); await rec('22-days')
    for (const w of a.weekdays ?? []) await page.getByRole('checkbox', { name: DAYS[w] }).click()
    await rec('22-days-picked')
  }
  await btn(page, 'Continue').click()
  await h1(page, 'How long can a session be?'); await radio(page, '20–30'); await rec('23-minutes'); await btn(page, 'Continue').click()
  await h1(page, 'Where will you train?'); await rec('24-where'); await tap(page, 'At home')
  await h1(page, 'What do you have at home?'); await tick(page, 'Dumbbells'); await tick(page, 'Mat'); await rec('25-kit'); await btn(page, 'Continue').click()
  await h1(page, 'What do you enjoy?'); await tick(page, 'Lifting weights'); await tick(page, 'Walking'); await rec('26-enjoy'); await btn(page, 'Continue').click()
  await h1(page, 'Any areas to go easy on?'); await tick(page, 'Knees'); await rec('27-areas')
  await btn(page, 'Build my week').click()
  const intro = page.getByRole('heading', { name: 'Your plan is ready', exact: true })
  const sum = page.getByRole('heading', { name: /^(Your first week|A simple first week)$/ })
  await intro.or(sum).first().waitFor()
  if (await intro.count()) {
    await rec('28-plan-intro')
    // each new screen starts VoiceOver (and the keyboard) at its heading
    const f = await page.evaluate(() => document.activeElement?.textContent ?? null)
    if (f !== 'Your plan is ready') throw new Error('Build my week should focus the Part 3 heading, focused: ' + f)
    await btn(page, 'See my week').click()
  }
}
const summaryUp = (page) => page.getByRole('heading', { name: /^(Your first week|A simple first week)$/ }).first().waitFor({ timeout: 15000 })
/** The summary, its sheets, and numbers, recorded; returns the Food card's numbers. */
async function summary(page, rec, { sheets } = {}) {
  await summaryUp(page); await page.waitForTimeout(300); await rec('30-summary')
  const nums = await page.evaluate(() => {
    const g = (a) => { const el = document.querySelector(`[data-${a}]`); return el ? +el.getAttribute(`data-${a}`) : null }
    return { kcal: g('kcal'), estimate: g('estimate'), diff: g('diff') }
  })
  if (sheets) {
    if (await btn(page, 'How we worked this out').count()) { await btn(page, 'How we worked this out').click(); await page.getByRole('heading', { name: 'How we worked this out' }).first().waitFor(); await page.waitForTimeout(450); await rec('31-how'); await btn(page, 'Done').click() }
    await btn(page, 'All reasons').click(); await page.getByRole('heading', { name: 'Why this week', exact: true }).first().waitFor(); await page.waitForTimeout(450); await rec('32-all-reasons'); await btn(page, 'Done').click()
    await btn(page, 'See other plans').click(); await page.getByRole('heading', { name: 'Other plans', exact: true }).first().waitFor(); await page.waitForTimeout(450); await rec('33-others'); await btn(page, 'Close').click()
    await page.getByRole('button', { name: /Why each part is here$/ }).first().click(); await page.getByText('Why each part is here', { exact: true }).waitFor(); await page.waitForTimeout(450); await rec('34-day'); await btn(page, 'Done').click()
  }
  return nums
}
/** Start my week, then wait for the store to have finished (both apps: onboardedAt set, the draft gone). */
async function startWeek(page, offer) {
  await btn(page, 'Start my week').click()
  if (offer) { await h1(page, 'Rebuild your week too?'); await btn(page, offer).click() }
  await page.waitForFunction(() => !localStorage.getItem('tali.onboarding') && !!JSON.parse(localStorage.getItem('leanplan.v1') || '{}').profile?.onboardedAt, null, { timeout: 10000 })
}

/* ---------------- comparing ---------------- */

/** Lines a web render can't share: the web app's own chrome (nothing in the wizard has any). */
const ignoreLine = (l) => l === 'Done' && false
function compareShots(route, w, n) {
  for (const k of Object.keys(w.shots)) {
    const a = (w.shots[k] || []).filter((l) => !ignoreLine(l)), b = (n.shots[k] || []).filter((l) => !ignoreLine(l))
    const A = a.join(' ¶ '), B = b.join(' ¶ ')
    const same = A === B
    // words first: when the lines differ only in where they break, compare the words in order
    const wordsSame = a.join(' ').replace(/\s+/g, ' ') === b.join(' ').replace(/\s+/g, ' ')
    check(`${route}: ${k} words match`, a.length >= 2 && (same || wordsSame), { web: A.slice(0, 700), native: B.slice(0, 700) })
  }
  const missing = Object.keys(w.shots).filter((k) => !n.shots[k])
  check(`${route}: native reached every screen web did`, !missing.length, missing)
}
const noSeed = (d) => d && JSON.stringify({ ...d, seed: undefined })
/** The parts of the saved state that must be equal (timestamps and ids made by the run aside). */
function savedFacts(st) {
  if (!st) return null
  const p = { ...st.profile }
  delete p.onboardedAt; delete p.answeredAt
  const plan = (st.trainingPlans || []).find((x) => x.state === 'active')
  const routines = Object.fromEntries((st.routines || []).map((r) => [r.id, r]))
  const shape = plan && {
    name: plan.name, source: plan.source, startedAt: plan.startedAt, baseTemplateId: plan.baseTemplateId,
    why: (plan.why || []).map((w) => w.code + ':' + (w.about ?? '')).sort(),
    phases: JSON.stringify((plan.phases || []).map((ph) => ({ weeks: ph.weeks, days: Object.fromEntries(Object.entries(ph.week || ph.days || {}).map(([d, keys]) => [d, (keys || []).map((k) => routines[k]?.name ?? k)])) }))),
  }
  const exs = (st.routines || []).map((r) => r.name + ':' + (r.exercises || r.ex || []).map((e) => e.exId ?? e.id ?? e.n).join(',')).sort()
  return { profile: p, target: st.target, plan: shape, plans: (st.trainingPlans || []).length, routines: exs, weight: st.days?.[today]?.weight ?? null, consents: st.consents }
}

async function route(browser, r) {
  const nativeUrl = r.native ?? NATIVE
  // native first: the web run is then given the values native's pickers landed on
  const n = await drive(browser, nativeUrl, 'native', r, r.opts ?? {})
  const w = await drive(browser, WEB, 'web', r, r.opts ?? {})
  check(`${r.name}: web run completes`, !w.err, w.err && w.err.message.split('\n')[0])
  check(`${r.name}: native run completes`, !n.err, n.err && n.err.message.split('\n')[0])
  check(`${r.name}: no page errors`, !w.errors.length && !n.errors.length, { web: w.errors, native: n.errors })
  if (r.words !== false) compareShots(r.name, w, n)
  else console.log('SKIP', `${r.name}: words (waits for the gate wiring; GATE_WIRED=1 to compare)`)
  if (r.compareDraft !== false) check(`${r.name}: the draft is the same`, noSeed(w.draft) === noSeed(n.draft), { web: noSeed(w.draft), native: noSeed(n.draft) })
  if (n.draft) check(`${r.name}: the draft keeps outcomes only`, !JSON.stringify(n.draft).match(/"sleep"|"stress"|"room"|chest|dizz|kidney|semaglutide/i), n.draft.outcomes)
  if (r.saved !== false) {
    const a = savedFacts(w.state), b = savedFacts(n.state)
    for (const k of Object.keys(a || {})) check(`${r.name}: saved ${k} is the same`, JSON.stringify(a[k]) === JSON.stringify(b?.[k]), { web: a[k], native: b?.[k] })
  }
  if (r.after) await r.after(w, n)
}

/* ---------------- the routes ---------------- */

const ROUTES = []
const later = async (page) => { await btn(page, 'Skip for now, start with a simple week').click() }
/** A full first run; `a` the wizard answers, then setup or Later, the summary, and Start. */
const firstRun = (name, a = {}, o = {}) => ROUTES.push({
  name, opts: o.opts,
  fn: async (page, rec, ctx) => {
    await wizard(page, rec, a)
    if (o.later) await later(page)
    else { await btn(page, 'Continue').click(); await setup(page, rec, o.setup) }
    const nums = await summary(page, rec, { sheets: o.sheets })
    const dr = await draft(page)
    ctx.extra = { nums, expect: expected(dr, today), draft: dr }
    if (o.pre) await o.pre(page, rec)
    await startWeek(page)
  },
  keepDraft: undefined,
  after: async (w, n) => {
    const e = n.extra?.expect, x = n.extra?.nums
    if (!e || !x) return check(`${name}: summary numbers read`, false, { e, x })
    // the summary's Food card equals startingTargets from the core, on native and on web
    if (o.noNumber) check(`${name}: no number on the summary, by design (startingTargets ${e.kcal})`, x.kcal == null && w.extra?.nums?.kcal == null, { native: x, web: w.extra?.nums })
    else check(`${name}: native summary kcal equals startingTargets`, x.kcal === e.kcal && (e.kcal == null || x.estimate === e.estimate) && (e.kcal == null || x.diff === e.estimate - e.kcal), { native: x, startingTargets: { kcal: e.kcal, estimate: e.estimate }, hidden: e.hidden })
    check(`${name}: web and native show the same numbers`, JSON.stringify(w.extra?.nums) === JSON.stringify(x), { web: w.extra?.nums, native: x })
    // Start saves the kcal the card shows (nutrition-accuracy): a number shown is the target saved
    if (x.kcal != null) check(`${name}: the saved target is the kcal shown`, n.state?.target?.kcal === x.kcal, { shown: x.kcal, saved: n.state?.target })
    if (o.expect) o.expect(e, x, n)
  },
})
// drive() keeps the context's `extra`: route functions write it on the open() result
const pick3 = [todayWd, (todayWd + 2) % 7, (todayWd + 4) % 7]

firstRun('main route: no flags, three picked days', {}, { setup: { weekdays: pick3 }, sheets: true,
  expect: (e, x) => check('main route: a calorie number is shown', x.kcal != null && x.kcal === e.summaryKcal, { x, e }) })
firstRun('dark mode: the main route', {}, { setup: { weekdays: pick3 }, opts: { dark: true } })
firstRun('readiness yes → gentler start and signposting', { ready: [true, false, false] })
firstRun('pregnant → maintenance, no number, midwife', { ready: [false, false, true], pregnant: true }, { later: true,
  expect: (e, x) => check('pregnant: no number on the summary', x.kcal == null && e.hidden === 'pregnancy', { x, hidden: e.hidden }) })
firstRun('recent surgery → the gentle-start screen', { ready: [false, false, true], pregnant: false }, { later: true })
firstRun('wellbeing Yes → note, no number', { wellbeing: 'Yes' }, { later: true,
  expect: (e, x) => check('wellbeing Yes: no number', x.kcal == null, x) })
firstRun('wellbeing Sometimes → note, a range on Food only', { wellbeing: 'Sometimes' }, { later: true, noNumber: true })
firstRun('medical kidney (lose fat) → held at maintenance', { medical: true }, { later: true })
firstRun('medical injection (build muscle) → no deficit, its own note', { goal: 'Build muscle', medical: 'injection' }, { later: true })
firstRun('quick change of goal inside the beat: the second tap is saved', { goal: 'Build muscle', quickChange: 'Lose fat' }, { later: true })
firstRun('no weight → no numbers → Add weight', { noWeight: true }, {
  pre: async (page, rec) => {
    await page.getByText('Add your weight any time for a starting estimate.').first().waitFor(); await rec('35-noweight')
    await btn(page, 'Add weight').click(); await slide(page, 'Weight', 80); await btn(page, 'Continue').click()
    await summaryUp(page); await page.locator('[data-kcal]').first().waitFor(); await rec('36-weight-added')
  },
})
firstRun('Later on the handoff → Starter week', {}, { later: true })
firstRun('a 1-day week', {}, { setup: { oneDay: true } })

firstRun('imperial: 5 ft 8 in and 13 st 10 lb are saved as on web', { imperial: true }, {
  expect: (e, x, n) => {
    const p = n.state?.profile
    check('imperial: saved in ft in and st lb, rounded to 0.1 as on web', p?.units?.height === 'ft-in' && p?.units?.weight === 'st-lb' && Math.round(p.height * 10) === p.height * 10 && Math.round(n.state.days?.[today]?.weight * 10) === n.state.days?.[today]?.weight * 10, { height: p?.height, units: p?.units, weight: n.state?.days?.[today]?.weight })
  },
})

// "Not now" on the consent screen: no health question is asked or kept; Food asks for the OK
const NOT_NOW_AT = new Date().toISOString()
const declined = () => ({ ...newAccount(), consents: { records: [{ ...GRANTED.records[0], granted: false, at: NOT_NOW_AT }] } })
ROUTES.push({
  name: 'no health data consent: no health questions, nothing health-related kept, Food asks for the OK',
  opts: { state: declined(), rows: { consents: [{ id: GRANTED.records[0].id, user_id: UID, type: 'health', version: '2026-09-v1', granted: false, recorded_at: NOT_NOW_AT }] } },
  fn: async (page, rec, o) => {
    await h1(page, 'A few questions, so Tilo fits you'); await btn(page, 'Let’s go').click()
    await h1(page, 'What do you like to be called?'); await fixSeed(page); await h1(page, 'What do you like to be called?')
    await page.getByPlaceholder('Sam').fill('Sam'); await btn(page, 'Continue').click()
    await h1(page, 'How old are you?'); await slide(page, 'Age in years', 34); await btn(page, 'Continue').click()
    await h1(page, 'What would make this worth it for you?'); await tick(page, 'More energy'); await rec('80-why'); await btn(page, 'Continue').click()
    await h1(page, 'What’s your main goal?'); await tap(page, 'Lose fat')
    await h1(page, 'How you like to train'); await rec('81-handoff')
    await later(page)
    await summaryUp(page); await page.getByText('Targets need your OK').first().waitFor(); await rec('82-summary')
    o.extra = { draft: await draft(page) }
    await startWeek(page)
  },
  after: async (w, n) => {
    const dr = n.extra?.draft
    check('no consent: the draft holds no health answer', dr && !Object.keys(dr.outcomes || {}).length && ['pregnant', 'height', 'weight', 'sexAnswer', 'movement', 'areas'].every((k) => dr[k] === undefined), dr)
  },
})

ROUTES.push({
  name: 'redo setup into the 18+ stop: no under-18 age kept, the app stop raised',
  opts: { state: redoState() }, saved: false, compareDraft: false,
  // until the lead wires useUnderAgeInWizard into lib/gate.tsx, the root gate draws its own 18+
  // notice over Redo setup's stop on native (App.tsx shows the wizard's): compare its words then
  words: !!process.env.GATE_WIRED,
  fn: async (page, rec, o) => {
    if (o.which === 'native') await openRedoNative(page); else { await toRedoWeb(page); await btn(page, 'Redo setup').click() }
    await h1(page, 'What do you like to be called?'); await btn(page, 'Continue').click()
    await h1(page, 'How old are you?'); await slide(page, 'Age in years', 17); await btn(page, 'Continue').click()
    await h1(page, 'Tilo is for 18+'); await rec('90-redo-stop')
    const dr = await draft(page)
    o.extra = { age: dr?.age ?? null, step: dr?.step ?? null, stored: (await stored(page))?.profile?.age }
    if (o.which === 'native') o.extra.inWizard = await page.evaluate(() => globalThis.__tiloStore.getState().underAge?.inWizard ?? null)
  },
  after: async (w, n) => {
    check('redo stop: the draft keeps no under-18 age, on both', w.extra?.age == null && n.extra?.age == null && n.extra?.step === 'age', { web: w.extra, native: n.extra })
    check('redo stop: the app stop is raised from the wizard (native)', n.extra?.inWizard === true, n.extra)
    check('redo stop: the stored age is unchanged, as on web', w.extra?.stored === n.extra?.stored, { web: w.extra, native: n.extra })
  },
})

ROUTES.push({
  name: 'a reload mid-wizard resumes on the same question with the answers kept',
  saved: false,
  fn: async (page, rec) => {
    await h1(page, 'A few questions, so Tilo fits you'); await btn(page, 'Let’s go').click()
    await h1(page, 'What do you like to be called?'); await fixSeed(page)
    await page.getByPlaceholder('Sam').fill('Robin'); await btn(page, 'Continue').click()
    await h1(page, 'How old are you?'); await slide(page, 'Age in years', 41); await btn(page, 'Continue').click()
    await h1(page, 'A few health questions')
    await page.reload()
    await h1(page, 'A few health questions'); await rec('70-resumed')
    await page.getByRole('button', { name: 'Back' }).click(); await h1(page, 'How old are you?')
    if ((await sliderNow(page, 'Age in years')) !== 41) throw new Error('age not kept')
    await page.getByRole('button', { name: 'Back' }).click(); await h1(page, 'What do you like to be called?')
    if ((await page.getByPlaceholder('Sam').inputValue()) !== 'Robin') throw new Error('name not kept')
  },
})

ROUTES.push({
  name: 'under 18 → kind stop → I typed my age wrong → Close deletes',
  saved: false,
  fn: async (page, rec, o) => {
    await wizard(page, rec, { age: 17 })
    await h1(page, 'Tilo is for 18+'); await rec('40-under18')
    await btn(page, 'I typed my age wrong').click(); await h1(page, 'How old are you?')
    await slide(page, 'Age in years', 16); await btn(page, 'Continue').click()
    await h1(page, 'Tilo is for 18+')
    await btn(page, 'Close').click()
    await page.waitForFunction(() => !localStorage.getItem('tali.onboarding') && !Object.keys(localStorage).some((k) => k.startsWith('sb-')), null, { timeout: 10000 })
    o.extra = { fn: o.net.fnCalls.map((c) => c.reason), left: await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sb-') || k.startsWith('tali.')).sort()) }
  },
  compareDraft: false,
  after: async (w, n) => {
    check('under 18: the same deletion on both (once, as under-age)', JSON.stringify(w.extra?.fn) === JSON.stringify(n.extra?.fn) && n.extra?.fn?.join() === 'under-age', { web: w.extra?.fn, native: n.extra?.fn })
    check('under 18: the device is wiped the same way', JSON.stringify(w.extra?.left) === JSON.stringify(n.extra?.left), { web: w.extra?.left, native: n.extra?.left })
  },
})

ROUTES.push({
  name: 'skip on the intro → age → Starter week, no calorie numbers',
  compareDraft: false,
  fn: async (page, rec) => {
    await h1(page, 'A few questions, so Tilo fits you')
    await btn(page, 'Skip, I’ll set things up myself').click()
    await h1(page, 'No problem. Just your age, then you’re in.'); await rec('50-skip-age')
    await slide(page, 'Age in years', 30); await rec('50-skip-age-set')
    await btn(page, 'Start using Tilo').click()
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('leanplan.v1') || '{}').profile?.onboardedAt, null, { timeout: 10000 })
  },
  after: async (w, n) => {
    const plan = (n.state?.trainingPlans || []).find((p) => p.state === 'active')
    check('skip: the Starter week, no estimate', plan?.name === 'Starter week' && n.state.profile.age === 30 && !n.state.profile.activityMult, { plan: plan?.name, p: n.state?.profile })
  },
})

// Redo setup (Profile's row on web; the store's openRedo on the native render until N10 has the row)
const toRedoWeb = async (page) => {
  const avatar = page.locator('.hdr').getByRole('button', { name: 'Profile', exact: true }).or(page.locator('nav.tabbar').getByRole('button', { name: 'Profile', exact: true })).first()
  await avatar.click()
  await page.getByRole('button', { name: /Health data/ }).first().click()
}
/** Profile's Redo setup / Set up my plan row, on the native render: the store's own action */
const openRedoNative = async (page) => {
  await page.waitForFunction(() => !!globalThis.__tiloStore?.getState().signedIn, null, { timeout: 15000 })
  await page.evaluate(() => globalThis.__tiloStore.getState().openRedo(true))
}
/**
 * Whether a tile is chosen: aria-checked where the app sets it; N1's tiles on a web render don't
 * (react-native-web drops accessibilityState; TODO(N1-followup)), so there the ink fill of a chosen tile.
 */
const isOn = (loc) => loc.evaluate((el) => {
  const a = el.getAttribute('aria-checked'); if (a != null) return a === 'true'
  // light mode's --btn (#1D1D1F); the routes that need this run in light mode
  return getComputedStyle(el).backgroundColor === 'rgb(29, 29, 31)'
})
const chosenTile = async (page) => {
  const all = page.locator('[role=radiogroup] [role=radio]')
  for (let i = 0; i < await all.count(); i++) if (await isOn(all.nth(i))) return all.nth(i)
  return null
}
const toSummary = async (page) => {
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('heading', { name: /^(Your first week|A simple first week)$/ }).count()) return
    let pressed = false
    for (const nm of ['Continue', 'See my week', 'Build my week']) {
      const b = btn(page, nm).first()
      if (await b.count() && await b.isVisible() && await b.isEnabled()) { await b.click(); pressed = true; break }
    }
    if (!pressed) {
      const on = await chosenTile(page)
      if (on) { await on.click(); await page.waitForTimeout(450) }
      else if (await btn(page, 'Skip').count()) await btn(page, 'Skip').click()
    }
    await page.waitForTimeout(150)
  }
  throw new Error('never reached the summary')
}
for (const [label, rowName, offer, st] of [
  ['redo setup, Keep my current week', 'Redo setup', 'Keep my current week', redoState],
  ['redo setup, Rebuild my week', 'Redo setup', 'Rebuild my week', redoState],
  ['set up my plan (used Tilo before)', 'Set up my plan', 'Keep my current week', usedBefore],
]) {
  const redoFn = (native) => async (page, rec, o) => {
    if (!native) { await toRedoWeb(page); await btn(page, rowName).click() }
    else await openRedoNative(page)
    await h1(page, 'What do you like to be called?')
    await rec('60-redo-name')
    o.extra = { name: await page.getByPlaceholder('Sam').inputValue() }
    await btn(page, 'Continue').click()
    // the same engine seed on both: the draft is saved from the first answer; reopen Redo setup into it
    await fixSeed(page)
    if (!native) { await toRedoWeb(page); await btn(page, rowName).click() } else await openRedoNative(page)
    await h1(page, 'How old are you?')
    o.extra.age = await sliderNow(page, 'Age in years')
    await btn(page, 'Continue').click()
    await h1(page, 'A few health questions'); await rec('61-redo-ready'); await btn(page, 'Continue').click()
    if (rowName === 'Redo setup') {
      await h1(page, 'What would make this worth it for you?')
      o.extra.why = String(await isOn(page.getByRole('checkbox', { name: 'More energy', exact: true })))
      await btn(page, 'Continue').click()
      await h1(page, 'What’s your main goal?'); await tap(page, 'Build muscle')
    }
    await toSummary(page); await rec('62-redo-summary')
    await startWeek(page, offer)
  }
  ROUTES.push({ name: label, opts: { state: st() }, compareDraft: false,
    fn: async (page, rec, o) => redoFn(o.which === 'native')(page, rec, o),
    after: async (w, n) => check(`${label}: prefilled the same`, JSON.stringify(w.extra) === JSON.stringify(n.extra), { web: w.extra, native: n.extra }),
  })
}

;(async () => {
  const browser = await chromium.launch()
  const only = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY) : null
  for (const r of ROUTES) {
    if (only && !only.test(r.name)) continue
    // drive() opens the URL; native routes may add a query (Redo setup)
    await route(browser, r)
  }
  // flag off: the same flag value means no wizard on native either
  if (NATIVE_OFF && (!only || only.test('flag off'))) {
    const o = await open(browser, NATIVE_OFF)
    await o.page.getByText('Onboarding isn’t due', { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {})
    const up = await o.page.getByRole('heading', { name: 'A few questions, so Tilo fits you', exact: true }).count()
    const notDue = await o.page.getByText('Onboarding isn’t due', { exact: true }).count()
    check('flag off: no wizard on native', notDue === 1 && up === 0 && !(await o.page.evaluate(() => localStorage.getItem('tali.onboarding'))))
    await o.ctx.close()
  }
  await browser.close()
  console.log(`\n${results.length - bad} of ${results.length} checks pass. Screenshots in ${OUT}`)
  process.exit(bad ? 1 : 0)
})()
