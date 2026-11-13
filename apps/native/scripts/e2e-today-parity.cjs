/**
 * Today parity (N4), web against native: every Summary state and sheet the Today stream builds,
 * opened from the same seeded account in the real web app and in the native app's code rendered for
 * the web (react-native-web), with the words and figures compared line by line, light and dark.
 * Carries over the web's e2e-loop cases (all), e2e-wellbeing wp7-*, wp10-*, wp14-*, wp15-* (Summary
 * side) and the close-out review cases: each scenario asserts the web script's rule on both apps,
 * then checks the two apps say the same thing. Screenshots of both go to E2E_OUT.
 *
 *   (repo root) npm run build && npx vite preview --port 4177 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   WEB_URL=http://localhost:4177/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-today-parity.cjs
 *   ONLY=wp7 … runs the scenarios whose name starts with it.
 *
 * Every Supabase request is answered by an in-memory stand-in (as scripts/e2e-*.cjs on web); the
 * real project is never reached. A web render is not the phone: this checks words and numbers, and
 * the layout only roughly (the screenshots are for `design`).
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-today-parity-'))
const ONLY = process.env.ONLY || ''
// builds with ONBOARDING_ENABLED on (VITE_ONBOARDING=1 / EXPO_PUBLIC_ONBOARDING=1), for the ob* scenarios
const WEB_OB = process.env.WEB_OB_URL || ''
const NATIVE_OB = process.env.NATIVE_OB_URL || ''
const UID = '11111111-2222-4333-8444-555555555555'

const ymd = (d) => d.toISOString().slice(0, 10)
const shift = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return ymd(x) }
const dowOf = (d) => new Date(d + 'T12:00:00Z').getUTCDay()

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 86400 * 400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400 * 400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 400, refresh_token: 'r', user: USER }
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }

function meta(days, at) {
  const u = at + 'T07:00:00.000Z'
  return { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID }
}

/* ---------------- seeds: e2e-loop.cjs (steadyState), on a fixed day ---------------- */

const LOOP_DAY = '2026-11-12' // a Thursday
const lago = (n) => shift(LOOP_DAY, -n)
const lmeal = (k, p, slot) => ({ n: 'Chicken and rice', k, p, c: Math.round(k / 8), f: Math.round(k / 40), grams: 300, meal: slot })
const strength = (d) => ({ id: 's' + d, modality: 'strength', title: 'Full body', routineId: 'builtin-Legs', at: d + 'T18:00:00.000Z', mins: 30, ex: [] })
const walk = (d) => ({ id: 'w' + d, modality: 'cardio', title: 'Brisk walk', cardio: { key: 'Brisk walk' }, at: d + 'T12:00:00.000Z', mins: 30 })

function steadyState({ gentle = false, reviewWeight = true, hard = false, missed = false, pattern = false } = {}) {
  const days = {}
  const day = (d) => (days[d] ??= { foods: [], supps: {}, weight: null, workout: null, checkin: null })
  if (pattern) for (let i = 42; i >= 8; i--) day(lago(i)).checkin = i % 3 === 0 ? { mood: 3, hunger: 2, sleep: 1, stress: 2, energy: 2 } : { mood: 4, hunger: 3, sleep: 3, stress: 2, energy: 2 }
  for (let i = 50; i >= 1; i -= 2) day(lago(i)).weight = 80 + (i % 3 ? 0.2 : -0.2)
  day(lago(7)).weight = 80.1
  for (let i = 7; i >= 1; i--) {
    if (missed && i > 3) continue
    if (pattern) day(lago(i)).checkin = i % 3 === 0 ? { mood: 3, hunger: 2, sleep: 1, stress: 2, energy: 2 } : { mood: 4, hunger: 3, sleep: 3, stress: 2, energy: 2 }
    else if (i !== 3) day(lago(i)).checkin = hard
      ? { mood: 3, hunger: 2, sleep: i <= 4 ? 1 : 3, stress: i <= 5 && i >= 3 ? 3 : 1, energy: 2, t: lago(i) + 'T08:00:00.000Z' }
      : { mood: 4, hunger: 3, sleep: 3, stress: 1, energy: 3, t: lago(i) + 'T08:00:00.000Z' }
    if (i !== 5) day(lago(i)).foods.push(lmeal(700, 40, 'breakfast'), lmeal(800, 45, 'lunch'), lmeal(i === 2 ? 1200 : 750, 40, 'dinner'))
    if (i === 6 || i === 4 || i === 2) day(lago(i)).sessions = [strength(lago(i))]
    else if (i !== 3) day(lago(i)).sessions = [walk(lago(i))]
  }
  return {
    at: LOOP_DAY,
    state: {
      target: { kcal: 2250, p: 125, c: 260, f: 75 },
      schedule: { 0: 'Rest', 1: 'Rest', 2: 'Rest', 3: 'Rest', 4: 'Rest', 5: 'Rest', 6: 'Rest' },
      profile: {
        name: 'Sam', sex: 'F', sexAnswer: 'female', age: 44, height: 168, activityLevel: 'light', activityMult: 1.45, supplements: [], notificationsEnabled: false,
        goal: 'maintain', maintainFrom: lago(48), motivations: ['Keep up with my kids at the weekend', 'Feel at home in my body'], burnSwitch: '2026-01-01',
        reviewDay: dowOf(LOOP_DAY), ...(reviewWeight === 'unset' ? {} : { reviewWeight }), ...(gentle ? { gentle: true } : {}),
        ...(missed ? { lastReviewAt: lago(21) } : { lastReviewAt: lago(7) }),
        plans: [{ id: 'p1', when: 'I get home hungry', then: 'have a yoghurt before I start cooking', created: lago(30), lastReview: lago(8), reviews: [] }],
      },
      days, customFoods: [], recipes: [], routines: [], trainingPlans: [],
      consents: { records: [CONSENT] },
      _meta: meta(days, LOOP_DAY),
    },
  }
}

/* ---------------- seeds: e2e-wellbeing.cjs ---------------- */

const HARD_DAY = '2026-10-08'
const ORDINARY_DAY = '2026-10-10'
const PROFILE = { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 81.8, activityLevel: 'light', supplements: [], notificationsEnabled: false }
const SCHEDULE = { 0: 'Rest', 1: 'Push', 2: 'Cardio', 3: 'Pull', 4: 'Legs', 5: 'Cardio', 6: 'Rest' }
const BREAKFAST = [
  { n: 'Porridge, made with milk', grams: 250, k: 210, p: 11.5, c: 30.3, f: 5.8, meal: 'breakfast', src: 'db', how: 'g' },
  { n: 'Banana (1 ~118g)', grams: 118, k: 96, p: 1.4, c: 24, f: 0.1, meal: 'breakfast', src: 'db', how: 'g' },
]
const dayOf = ({ foods = [], weight = null, checkin } = {}) => ({ foods, supps: {}, weight, workout: null, ...(checkin ? { checkin } : {}) })
const ci = (d, mood, sleep, stress, energy, hunger = 3) => ({ mood, hunger, sleep, stress, energy, sore: 0, note: '', t: d + 'T08:30:00.000Z' })
const deviceState = ({ days, profile, schedule, at }) => ({ days, profile, schedule, consents: { records: [CONSENT] }, _meta: meta(days, at) })

function hardDay() {
  const days = {}
  const ordinary = [[4, 2, 2, 2], [3, 2, 2, 2], [4, 3, 1, 3], [3, 2, 2, 2], [4, 2, 1, 2], [3, 3, 2, 2], [4, 2, 2, 3], [3, 2, 2, 2], [4, 3, 1, 2], [3, 2, 2, 2], [4, 2, 2, 2]]
  const checked = [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13]
  checked.forEach((n, i) => { const d = shift(HARD_DAY, -n); days[d] = dayOf({ checkin: ci(d, ...ordinary[i]) }) })
  for (const n of [1, 2, 3, 5, 6, 7, 9, 10, 12, 13]) { const d = shift(HARD_DAY, -n); days[d] = { ...(days[d] || dayOf()), foods: BREAKFAST.map((f) => ({ ...f })) } }
  days[shift(HARD_DAY, -1)].weight = 81.8
  days[HARD_DAY] = dayOf({ checkin: { mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1, sore: 0, note: '', t: HARD_DAY + 'T07:40:00.000Z' } })
  return { at: HARD_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at: HARD_DAY }) }
}
function ordinaryDay() {
  const days = {}
  for (let n = 1; n <= 10; n++) { const d = shift(ORDINARY_DAY, -n); days[d] = dayOf({ foods: n % 3 ? BREAKFAST.map((f) => ({ ...f })) : [], checkin: n % 2 ? ci(d, 4, 3, 1, 3) : undefined }) }
  days[ORDINARY_DAY] = dayOf({ checkin: ci(ORDINARY_DAY, 4, 3, 1, 3) })
  return { at: ORDINARY_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at: ORDINARY_DAY }) }
}
function lowMoodFortnight(at = HARD_DAY) {
  const days = {}
  ;[2, 1, 2, 3, 2, 1, 2].forEach((m, i) => { const d = shift(at, -(i * 2 + 1)); days[d] = dayOf({ checkin: ci(d, m, 2, 2, 2) }) })
  days[at] = dayOf({ checkin: ci(at, 2, 2, 2, 2) })
  return { at, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE }, at }) }
}
const PLAN_DUE = [{ id: 'e2e-plan-1', when: 'after work', then: 'walk home the long way', created: '2026-09-01', reviews: [] }]
const SUPPS = [{ id: 's1', name: 'Vitamin D', time: '08:00' }, { id: 's2', name: 'Creatine', time: '08:00' }]
const wp7Hard = (patch = {}) => { const s = hardDay(); Object.assign(s.state.profile, { plans: PLAN_DUE, supplements: SUPPS, reviewWeight: true, lastReviewAt: HARD_DAY }, patch); return s }
const wp14Ordinary = (patch = {}) => { const o = ordinaryDay(); o.state.schedule = { 0: 'Pull', 1: 'Push', 2: 'Cardio', 3: 'Pull', 4: 'Legs', 5: 'Cardio', 6: 'Pull' }; Object.assign(o.state.profile, patch); return o }
const wp7Ordinary = () => {
  const o = ordinaryDay()
  const d40 = shift(ORDINARY_DAY, -40)
  o.state.days[d40] = dayOf({ foods: BREAKFAST.map((f) => ({ ...f })), weight: 82.4 })
  o.state._meta.days[d40] = { u: ORDINARY_DAY + 'T07:00:00.000Z', dirty: false }
  Object.assign(o.state.profile, { plans: PLAN_DUE, supplements: SUPPS, reviewWeight: true, lastReviewAt: ORDINARY_DAY })
  return o
}
/** Summary's banners: an estimate that moves the total (quick check), welcome back after a day off, the range note. */
const settled = () => { const o = wp7Ordinary(); o.state.profile.plans = []; return o }
const withEstimates = () => {
  const o = settled()
  o.state.days[ORDINARY_DAY].foods = [{ n: 'Takeaway curry', k: 900, p: 40, c: 90, f: 40, meal: 'lunch', how: 'quick', err: 0.25 }, ...BREAKFAST.map((f) => ({ ...f }))]
  o.state._meta.days[ORDINARY_DAY] = { u: ORDINARY_DAY + 'T07:00:00.000Z', dirty: false }
  return o
}
const missedDay = () => { const o = settled(); delete o.state.days[shift(ORDINARY_DAY, -1)]; o.state.days[ORDINARY_DAY].foods = []; return o }


/* ---------------- seeds: e2e-onboarding.cjs (ob9, ob7-3, the medical re-ask), on a fixed day ---------------- */

const OB_DAY = '2026-11-12'
const obIso = (n) => new Date(new Date(OB_DAY + 'T09:00:00Z').getTime() - n * 86400000).toISOString()
const MEALS_TODAY = [
  { n: 'Porridge with milk', k: 420, p: 16, c: 60, f: 10, meal: 'breakfast', g: 300 }, { n: 'Chicken sandwich', k: 650, p: 32, c: 60, f: 26, meal: 'lunch', g: 260 },
  { n: 'Flapjack', k: 570, p: 4, c: 70, f: 28, meal: 'snack', g: 120 }, { n: 'Apple', k: 80, p: 0, c: 20, f: 0, meal: 'snack', g: 150 },
]
const ob9 = (wb, x = {}) => ({ outcomes: { readiness: 'clear', wellbeing: wb, baseline: 'ok' }, onboardedAt: obIso(x.ago ?? 3), answeredAt: { 'outcomes.wellbeing': obIso(x.ago ?? 3) }, ...(wb === 'flagged' ? { gentle: true } : {}), ...(x.p || {}) })
function obSeed(profile, { meals = false } = {}) {
  const days = { [OB_DAY]: { foods: meals ? MEALS_TODAY.map((f) => ({ ...f })) : [], supps: {}, weight: 70, workout: null } }
  return { at: OB_DAY, state: { target: { kcal: 2000, p: 150, c: 200, f: 70 }, days, consents: { records: [CONSENT] }, _meta: meta(days, OB_DAY),
    profile: { name: 'Sam', sex: 'F', sexAnswer: 'female', age: 34, height: 168, weight: 70, activityLevel: 'light', activityMult: 1.3, supplements: [], notificationsEnabled: false, goal: 'feel-better', onboardedAt: '2026-09-20T08:00:00.000Z', ...profile } } }
}
const obWeeksAgo = (w) => shift(OB_DAY, -7 * w)
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1')))

/* ---------------- runner ---------------- */

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'today-parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 900) : '') }

async function open(browser, url, seed, scheme, tall) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: tall ? 2400 : 844 }, deviceScaleFactor: 2, colorScheme: scheme, timezoneId: 'Europe/London', locale: 'en-GB' })
  await ctx.addInitScript(([s, data]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', data)
  }, [JSON.stringify(SESSION), JSON.stringify(seed.state)])
  const rows = { consents: [{ ...CONSENT, user_id: UID, recorded_at: CONSENT.at }] }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(USER) })
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    if (m && req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  await ctx.clock.install({ time: new Date(seed.at + 'T09:00:00') })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => d.dismiss().catch(() => {}))
  await page.goto(url)
  await page.getByText('This week', { exact: true }).first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(700)
  return { ctx, page, errors }
}

/** Lines of text, whitespace normalised (the two renderers break lines in different places). */
const norm = (s) => s.replace(/[\u00a0\u2009\u202f]/g, ' ').split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').replace(/(\d) kg\b/g, '$1kg')

/** Summary's pillars: from the first pillar to the end of This week (the header, week strip and tab bar differ by design). */
async function pillarsText(page, web) {
  if (web) return norm(await page.locator('.pillars').innerText())
  const all = await page.innerText('body')
  const start = all.search(/\n(Mind|Food|Move|Weight|Supplements|This week)\n/)
  const wk = all.indexOf('\nThis week\n', start)
  const tail = all.slice(wk)
  const m = tail.match(/\nLogged\n[^\n]+\n/) || tail.match(/\nWorkouts\n[^\n]+\n[^\n]+\n/)
  return norm(all.slice(start, wk + (m ? m.index + m[0].length : tail.length)))
}

/** The open sheet's text (the web's .sheet; the native Modal's dialog). */
async function sheetText(page, web) {
  const loc = web ? page.locator('.sheet').last() : page.locator('[aria-modal="true"]').last()
  await loc.waitFor({ timeout: 5000 })
  return norm(await loc.innerText())
}

const reviewText = async (page) => norm(await page.locator('[data-testid=weekly-review]').innerText())

function same(name, w, n) {
  if (w === n) return check(name, true)
  let i = 0
  while (i < w.length && w[i] === n[i]) i++
  check(name, false, { at: i, web: w.slice(Math.max(0, i - 80), i + 160), native: n.slice(Math.max(0, i - 80), i + 160) })
}

const click = async (page, text, opts = {}) => page.getByText(text, { exact: true, ...opts }).last().click()

/**
 * One scenario on both apps: `steps(page, web)` runs the same taps on each and returns the texts to
 * compare (and lets the scenario assert the web script's rules on each).
 */
async function scenario(browser, name, seed, steps, { schemes = ['light', 'dark'], ob = false } = {}) {
  if (ONLY && !name.startsWith(ONLY)) return
  if (ob && !(WEB_OB && NATIVE_OB)) return console.log('SKIP today-parity:', name, '(needs WEB_OB_URL and NATIVE_OB_URL)')
  for (const scheme of schemes) {
    const w = await open(browser, ob ? WEB_OB : WEB, seed, scheme)
    const n = await open(browser, ob ? NATIVE_OB : NATIVE, seed, scheme)
    try {
      const tw = await steps(w.page, true, `${name} ${scheme} web`)
      const tn = await steps(n.page, false, `${name} ${scheme} native`)
      for (const k of Object.keys(tw)) same(`${name} ${scheme}: ${k} matches`, tw[k], tn[k])
      await w.page.waitForTimeout(500); await n.page.waitForTimeout(500)
      await w.page.screenshot({ path: path.join(OUT, `${name}-${scheme}-web.png`), fullPage: true })
      await nativeShot(n.page, path.join(OUT, `${name}-${scheme}-native.png`))
    } catch (e) {
      check(`${name} ${scheme}: ran`, false, String(e).slice(0, 600))
      await w.page.screenshot({ path: path.join(OUT, `${name}-${scheme}-web-FAIL.png`) }).catch(() => {})
      await n.page.screenshot({ path: path.join(OUT, `${name}-${scheme}-native-FAIL.png`) }).catch(() => {})
    }
    check(`${name} ${scheme}: no page errors on web`, !w.errors.length, w.errors)
    check(`${name} ${scheme}: no page errors on native`, !n.errors.length, n.errors)
    await w.ctx.close(); await n.ctx.close()
  }
}

/**
 * The native page scrolls inside its ScrollView, so a full-page shot would stop at the viewport:
 * grow the viewport to the content's height first (only when no sheet is open, so a sheet stays
 * where the person would see it).
 */
async function nativeShot(page, file) {
  const sheet = await page.locator('[aria-modal="true"]').count()
  if (!sheet) {
    const h = await page.evaluate(() => Math.max(...[...document.querySelectorAll('div')].map((d) => (d.scrollHeight > d.clientHeight + 4 ? d.scrollHeight : 0))))
    if (h > 844) { await page.setViewportSize({ width: 390, height: Math.min(h + 120, 6000) }); await page.waitForTimeout(300) }
  }
  await page.screenshot({ path: file, fullPage: true })
}

/** A rule from the web's e2e scripts, held on both apps. */
const rule = (label, name, ok, detail) => check(`${label}: ${name}`, ok, detail)

const XofY = /\b\d+\s+of\s+(your\s+)?\d+\b/i

async function run() {
  const browser = await chromium.launch()

  /* ---------- e2e-loop: Summary, the review in every week, its sheets ---------- */
  await scenario(browser, 'loop-summary', steadyState(), async (page, web, l) => {
    await page.getByText('Weekly review', { exact: true }).first().waitFor()
    const s = await pillarsText(page, web)
    const week = s.slice(s.lastIndexOf('This week'))
    rule(l, 'This week has no "x of y"', !XofY.test(week), week)
    rule(l, 'Logged is a count', /Logged \d+ days?/.test(week), week)
    rule(l, 'weight tile has no "vs last week" and shows the trend in words', !/vs last week/.test(s) && /steady range|over \d weeks|trend shows/i.test(s), s)
    return { summary: s }
  })
  await scenario(browser, 'loop-review-steady', steadyState(), async (page, web, l) => {
    await click(page, 'A two-minute look back')
    await page.locator('[data-testid=weekly-review]').waitFor()
    const rv = await reviewText(page)
    rule(l, 'review leads with What you did', rv.indexOf('What you did') < rv.indexOf('For next week'), rv)
    rule(l, 'review has no "x of y"', !XofY.test(rv), rv)
    rule(l, 'steady encouragement', rv.includes('A steady week. This is what a habit looks like.'), rv)
    rule(l, 'weight row in words', /Weighed in \d+ times/.test(rv) && !/kg/.test(rv), rv)
    await click(page, 'Change one thing')
    await click(page, 'See the options')
    const change = await sheetText(page, web)
    return { review: rv, change }
  })
  await scenario(browser, 'loop-review-done', steadyState(), async (page, web) => {
    await click(page, 'A two-minute look back')
    await page.locator('[data-testid=weekly-review]').waitFor()
    await click(page, 'Done')
    await page.waitForTimeout(500)
    // whichever loop sheet follows the review (the 4-week check, drift, the learned range or the review day)
    const after = await sheetText(page, web).catch(() => 'none')
    check(`${web ? 'web' : 'native'}: a loop sheet follows the review`, after !== 'none')
    return { after }
  }, { schemes: ['light'] })
  await scenario(browser, 'loop-review-gentle', steadyState({ gentle: true }), async (page, web, l) => {
    await click(page, 'A two-minute look back')
    const rv = await reviewText(page)
    const did = rv.slice(0, rv.indexOf('For next week'))
    rule(l, 'gentle: no weight', !/Weighed/.test(rv), rv)
    rule(l, 'gentle: no numbers in What you did', !/\d/.test(did.replace(/^.*?What you did/, '').replace(/\d+ (Sept|Oct|Nov)/g, '')), did)
    await click(page, 'Change one thing')
    const after = await reviewText(page)
    const opts = after.slice(after.indexOf('Change one thing'), after.lastIndexOf('Done'))
    rule(l, 'gentle: options never adjust a range', !/range/i.test(opts), opts)
    return { review: rv, options: after }
  })
  await scenario(browser, 'loop-review-hard', steadyState({ hard: true }), async (page, web, l) => {
    await click(page, 'A two-minute look back')
    const rv = await reviewText(page)
    rule(l, 'hard: encouragement first', rv.includes('A full-on week, and you still showed up.'), rv)
    await click(page, 'Change one thing')
    await click(page, 'See the options')
    const sheet = await sheetText(page, web)
    rule(l, 'hard: mind first, no lower range', sheet.indexOf('Aim for an earlier night') < sheet.indexOf('Add a strength session') && !/Adjust my range/.test(sheet), sheet)
    return { review: rv, change: sheet }
  }, { schemes: ['light'] })
  await scenario(browser, 'loop-review-pattern', steadyState({ pattern: true }), async (page, web, l) => {
    await click(page, 'A two-minute look back')
    await page.waitForTimeout(1500)
    const rv = await reviewText(page)
    rule(l, 'pattern line visible after effects run', rv.includes('Something in your data') && rv.includes('On your short-sleep days, hunger tended to be higher.'), rv)
    return { review: rv }
  }, { schemes: ['light'] })
  await scenario(browser, 'loop-review-welcome', steadyState({ missed: true }), async (page, web, l) => {
    await click(page, 'A two-minute look back')
    const rv = await reviewText(page)
    rule(l, 'missed: welcome back, nothing to catch up', rv.includes('Welcome back') && rv.includes('Nothing to catch up on') && rv.includes('Pick up from here'), rv)
    return { review: rv }
  }, { schemes: ['light'] })
  await scenario(browser, 'loop-weight-ask', steadyState({ reviewWeight: 'unset' }), async (page, web, l) => {
    const s = await pillarsText(page, web)
    const tile = s.slice(s.indexOf('Weight'), s.indexOf('This week'))
    rule(l, 'never asked: the tile shows no number', !/\d/.test(tile), tile)
    await click(page, 'A two-minute look back')
    await page.getByText('Include your weight in reviews?').first().waitFor()
    const ask = await sheetText(page, web)
    await click(page, 'Leave it out')
    await page.waitForTimeout(400)
    const rv = await reviewText(page)
    rule(l, 'left out: no weight row', !/Weighed/.test(rv), rv)
    return { summary: s, ask, review: rv }
  })

  // the reminder paused itself after 3 unopened reviews: Summary asks once (ml-d2)
  await scenario(browser, 'loop-keep-reminder', (() => { const o = steadyState(); Object.assign(o.state.profile, { reviewPush: true, reviewPushFrom: lago(30), lastReviewAt: lago(22) }); return o })(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Keep the weekly reminder? with its two chips', s.includes('Keep the weekly reminder? It’s paused for now. Some weeks you won’t need it, and that’s fine. Keep it Turn it off'), s)
    return { summary: s }
  })
  // a care week (mood low on 4 or more days): the review card waits (the asks budget holds it on a
  // low-mood week) and the reminder ask never shows; the review's own variant is core's (tested there)
  await scenario(browser, 'loop-care-week', (() => { const o = steadyState(); Object.assign(o.state.profile, { reviewPush: true, reviewPushFrom: lago(30), lastReviewAt: lago(22) }); for (let i = 7; i >= 1; i--) { const c = o.state.days[lago(i)]?.checkin; if (c) c.mood = 2 } return o })(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'care week: no reminder ask', !s.includes('Keep the weekly reminder?'), s)
    return { summary: s }
  }, { schemes: ['light'] })
  // a lighter week (1 to 3 active days): no praise for a habit, no range change
  await scenario(browser, 'loop-review-lighter', (() => { const o = steadyState(); for (let i = 4; i <= 7; i++) { delete o.state.days[lago(i)]; delete o.state._meta.days[lago(i)] } return o })(), async (page, web, l) => {
    await click(page, 'A two-minute look back')
    const rv = await reviewText(page)
    rule(l, 'lighter: not the steady encouragement', !rv.includes('A steady week. This is what a habit looks like.'), rv)
    return { review: rv }
  }, { schemes: ['light'] })

  /* ---------- e2e-wellbeing wp7: Summary on a hard day and the one prompt slot ---------- */
  await scenario(browser, 'wp7-hard-day', wp7Hard(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Feeling low, checked in at, lighter line', /Feeling low Checked in at \d\d:\d\d A lighter day is still a good day\./.test(s), s)
    rule(l, 'plan review held on a hard day', !s.includes('How are your plans going?'), s)
    rule(l, 'no quick check', !s.includes('Worth a quick check'), s)
    rule(l, 'Same as yesterday leads the usuals', s.includes('Your usual breakfast Same as yesterday Porridge, made with milk and Banana (1 ~118g) · 306 kcal'), s)
    rule(l, 'Move names the lighter choices', s.includes('5 exercises · lighter choices today'), s)
    rule(l, 'weight: the day it was, no trend', /81\.8 ?kg Wednesday Supplements/.test(s), s)
    // one tap on Same as yesterday adds exactly 306 kcal; then the one thing: pick, Change, pick, Done
    await click(page, 'Same as yesterday')
    await page.waitForTimeout(500)
    const after = await pillarsText(page, web)
    rule(l, 'Same as yesterday added 306 kcal', /Food Open 306 of/.test(after), after)
    await click(page, 'Get outside for 10 minutes')
    await page.getByText('Today: Get outside for 10 minutes').first().waitFor()
    const picked = await pillarsText(page, web)
    await click(page, 'Done')
    await page.waitForTimeout(400)
    const done = await pillarsText(page, web)
    rule(l, 'done line and Make it a plan', /Got outside/.test(done) && done.includes('Make it a plan'), done)
    return { summary: s, afterSame: after, picked, done }
  })
  await scenario(browser, 'wp7-before-checkin', (() => { const s = wp7Hard(); delete s.state.days[HARD_DAY].checkin; return s })(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'asks, no lighter line or chips', s.includes('How are you today? Mood, sleep, stress and energy · 20 seconds Check in') && !s.includes('A lighter day'), s)
    await click(page, 'Check in')
    const sheet = await sheetText(page, web)
    return { summary: s, checkin: sheet }
  })
  await scenario(browser, 'wp7-gentle', wp7Hard({ gentle: true }), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'gentle: no kcal on the usual rows', s.includes('Same as yesterday Porridge, made with milk and Banana (1 ~118g) Usual') || !/Usual[^]*kcal/.test(s.slice(s.indexOf('Your usual'), s.indexOf('Move'))), s)
    return { summary: s }
  }, { schemes: ['light'] })
  await scenario(browser, 'wp7-food-off', wp7Hard({ mind: { off: ['food'] } }), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'no Food card, usuals or weight tile; supplements and Move stay', !s.includes('Add food') && !s.includes('Your usual') && !/\bWeight\b/.test(s) && s.includes('Supplements') && s.includes('Move'), s)
    return { summary: s }
  }, { schemes: ['light'] })
  await scenario(browser, 'wp7-mind-move-off', wp7Hard({ mind: { off: ['mind', 'move'] } }), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'no Mind card, no Move', !s.includes('Feeling low') && !/\bMove\b/.test(s), s)
    return { summary: s }
  }, { schemes: ['light'] })
  await scenario(browser, 'wp7-ordinary', wp7Ordinary(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'plans banner within the budget, ordinary chips, no Same as yesterday', s.includes('How are your plans going?') && s.includes('Lunch somewhere you like') && s.includes('Get outside at lunch') && !s.includes('Same as yesterday'), s)
    return { summary: s }
  })

  /* ---------- wp10: the check-in with More about sleep ---------- */
  await scenario(browser, 'wp10-checkin-sheet', (() => { const s = hardDay(); const y = shift(HARD_DAY, -1); s.state.days[y].checkin.night = { source: 'self', band: '7-8', wakeAt: '07:10', t: y + 'T08:30:00.000Z' }; delete s.state.days[HARD_DAY].checkin; return s })(), async (page, web, l) => {
    await click(page, 'Check in')
    const closed = await sheetText(page, web)
    await click(page, 'More about sleep')
    await page.waitForTimeout(300)
    const opened = await sheetText(page, web)
    rule(l, 'the wake time is prefilled from yesterday once opened', web ? (await page.locator('input[type=time]').inputValue()) === '07:10' : (await page.locator('input').filter({ hasNot: page.locator('textarea') }).first().inputValue()) === '07:10')
    // answer: mood Good, sleep OK, a band; Done saves, and the Mind card says so
    await page.getByText('Good', { exact: true }).first().click()
    await click(page, '6–7')
    await click(page, 'Done')
    await page.waitForTimeout(500)
    const s = await pillarsText(page, web)
    rule(l, 'saved: Feeling good', s.startsWith('Mind Feeling good Checked in at'), s)
    return { closed, opened, summary: s }
  })

  /* ---------- wp14: the one thing on an ordinary day ---------- */
  await scenario(browser, 'wp14-ordinary', wp14Ordinary(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'one chip per pillar', s.includes("One thing for today, if you'd like: Reset before your session Lunch somewhere you like Get outside at lunch"), s)
    await click(page, 'Get outside at lunch')
    await page.getByText('Today: Get outside at lunch').first().waitFor()
    const picked = await pillarsText(page, web)
    await click(page, 'Done')
    await page.waitForTimeout(400)
    const done = await pillarsText(page, web)
    rule(l, 'done: Got outside at lunch, Make it a plan', done.includes('Got outside at lunch') && done.includes('Make it a plan'), done)
    return { summary: s, picked, done }
  })
  await scenario(browser, 'wp14-gentle', wp14Ordinary({ gentle: true }), async (page, web) => ({ summary: await pillarsText(page, web) }), { schemes: ['light'] })

  /* ---------- wp15: the low-mood signpost ---------- */
  await scenario(browser, 'wp15-signpost', lowMoodFortnight(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'the signpost line, no NHS, no chips', s.includes('Things seem to have been hard for a while. Talking to your GP can help, and Samaritans are there any time on 116 123.') && !/NHS/.test(s) && !s.includes("One thing for today"), s)
    await page.getByRole('button', { name: 'Dismiss', exact: true }).first().click()
    await page.waitForTimeout(400)
    const after = await pillarsText(page, web)
    rule(l, 'dismissed, still the only ask (no chips)', !after.includes('Things seem to have been hard') && !after.includes('One thing for today'), after)
    return { summary: s, dismissed: after }
  })
  await scenario(browser, 'wp15-signpost-29-days', (() => { const s = lowMoodFortnight(shift(HARD_DAY, 29)); s.state.deviceOnly = { lowMoodShown: HARD_DAY }; return s })(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'not shown within 30 days', !s.includes('Things seem to have been hard'), s)
    return { summary: s }
  }, { schemes: ['light'] })
  await scenario(browser, 'wp15-signpost-mind-off', (() => { const s = lowMoodFortnight(); s.state.profile.mind = { off: ['mind'] }; return s })(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Mind off: no signpost', !s.includes('Things seem to have been hard'), s)
    return { summary: s }
  }, { schemes: ['light'] })

  /* ---------- close-out: the review card goes through the asks budget ---------- */
  await scenario(browser, 'closeout-review-held-hard-day', wp7Hard({ lastReviewAt: undefined, reviewDay: dowOf(HARD_DAY) }), async (page, web) => ({ summary: await pillarsText(page, web) }), { schemes: ['light'] })
  await scenario(browser, 'closeout-review-shows-ordinary', (() => { const o = wp7Ordinary(); Object.assign(o.state.profile, { lastReviewAt: undefined, reviewDay: dowOf(ORDINARY_DAY) }); return o })(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'the review card shows on an ordinary review day', s.includes('Weekly review Your week A two-minute look back'), s)
    return { summary: s }
  }, { schemes: ['light'] })

  /* ---------- Summary's other states: quick checks, welcome back, supplements, weight sheet ---------- */
  await scenario(browser, 'sum-quick-check', withEstimates(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Worth a quick check lists the estimate', s.includes('Worth a quick check') && s.includes('Takeaway curry'), s)
    return { summary: s }
  })
  await scenario(browser, 'sum-welcome-back', missedDay(), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Welcome back after a day off logging', s.includes("Welcome back. A day off logging doesn't undo anything. Pick up from here."), s)
    return { summary: s }
  }, { schemes: ['light'] })
  await scenario(browser, 'sum-supplements', wp7Ordinary(), async (page, web, l) => {
    await click(page, 'Vitamin D')
    await page.waitForTimeout(300)
    const s = await pillarsText(page, web)
    rule(l, 'ticking a supplement counts it', s.includes('Supplements 1 of 2'), s)
    return { summary: s }
  }, { schemes: ['light'] })
  await scenario(browser, 'weight-sheet', steadyState(), async (page, web) => {
    await page.getByText('80.2', { exact: false }).first().click()
    const sheet = await sheetText(page, web)
    return { sheet }
  })


  /* ---------- e2e-onboarding: ob9-2 food in words, ob9-3 and ob9-4 asks, the re-asks (ONBOARDING_ENABLED builds) ---------- */
  await scenario(browser, 'ob9-2-yes', obSeed(ob9('flagged'), { meals: true }), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Yes: meals in words, no kcal or room left', s.includes('3 meals logged') && s.includes('With protein at 2 of them.') && !/Food Open[^]*?kcal[^]*?Add food|room left/.test(s.slice(0, s.indexOf('Log a meal') + 10)), s)
    return { summary: s }
  }, { ob: true })
  await scenario(browser, 'ob9-2-sometimes', obSeed(ob9('sometimes'), { meals: true }), async (page, web, l) => {
    const s = await pillarsText(page, web)
    rule(l, 'Sometimes: in words, the range on Food, weight without a number', s.includes('In your range') && s.includes('Breakfast, lunch and a snack logged. Protein at 2 meals.') && s.includes('See your range on Food') && /Weight Logged/.test(s), s)
    return { summary: s }
  }, { ob: true })
  await scenario(browser, 'ob9-3-day14', obSeed(ob9('sometimes', { ago: 14 }), { meals: true }), async (page, web, l) => {
    await page.getByText('Would you like your food range on Today?').first().waitFor()
    const ask = await sheetText(page, web)
    await click(page, 'Show it')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.foodOptIn?.today === 'today')
    await page.waitForTimeout(400)
    const s = await pillarsText(page, web)
    rule(l, 'Show it: the range on Today', /of [\d,]+–[\d,]+ kcal/.test(s), s)
    return { ask, summary: s }
  }, { ob: true })
  await scenario(browser, 'ob9-4-week4', obSeed(ob9('flagged', { ago: 28 }), { meals: true }), async (page, web, l) => {
    await page.getByText('Would a calorie range help?').first().waitFor()
    const ask = await sheetText(page, web)
    await click(page, 'Not now')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.foodOptIn?.range === 'not-now')
    rule(l, 'Not now rests it', (await stored(page)).profile.foodOptIn.range === 'not-now')
    return { ask }
  }, { ob: true })
  await scenario(browser, 'ob-medical-then-food-ask', (() => { const a = obSeed(ob9('sometimes', { ago: 14 }), { meals: true }); a.state.profile.outcomes = { ...a.state.profile.outcomes, medical: 'flagged' }; return a })(), async (page, web, l) => {
    await page.getByText('Does any of this apply to you?').first().waitFor()
    await page.waitForTimeout(800)
    rule(l, 'one sheet at a time: no food ask under the re-ask', !(await page.getByText('Would you like your food range on Today?').count()))
    const medical = await sheetText(page, web)
    await click(page, 'None of these')
    await click(page, 'Done')
    await page.getByText('Would you like your food range on Today?').first().waitFor()
    rule(l, 'the re-ask has gone', !(await page.getByText('Does any of this apply to you?').count()))
    const st = await stored(page)
    rule(l, 'asked once on this phone', st.deviceOnly?.ui?.medicalReasked === true, st.deviceOnly)
    return { medical, ask: await sheetText(page, web) }
  }, { ob: true, schemes: ['light'] })
  await scenario(browser, 'ob7-3-pregnancy', obSeed({ pregnancy: { flagged: true, askedAt: obWeeksAgo(13) } }), async (page, web, l) => {
    await page.getByText('Does this still apply?').first().waitFor()
    const ask = await sheetText(page, web)
    await click(page, 'Ask me later')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('leanplan.v1')).profile.pregnancy.snoozedAt)
    const p = (await stored(page)).profile.pregnancy
    rule(l, 'Ask me later snoozes', p.flagged && p.snoozedAt === OB_DAY, p)
    return { ask }
  }, { ob: true })
  await scenario(browser, 'ob7-4-no-longer', obSeed({ pregnancy: { flagged: true, askedAt: obWeeksAgo(13) } }), async (page, web, l) => {
    await page.getByText('Does this still apply?').first().waitFor()
    await click(page, 'No longer')
    await page.getByText('Thanks. Your plan and targets will update.').first().waitFor()
    const thanks = await sheetText(page, web)
    rule(l, 'thanks, with a link to the answers', thanks.includes('See your health check answers'), thanks)
    return { thanks }
  }, { ob: true, schemes: ['light'] })

  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
