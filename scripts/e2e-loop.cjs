/**
 * Headless check of the maintenance loop screens (boards ml-a1 to ml-e4, Design canvas section 7):
 * the weekly review in a steady, gentle, harder and missed week, its sheets, the Summary card and
 * tiles, and Profile's Weekly review group, in light and dark. Asserts the rules that matter (no
 * "x of y", weight only with the opt-in, no lower range after a hard week) and writes screenshots
 * to E2E_OUT for comparison with the boards.
 *
 *   npm run build && npx vite preview --port 4177 &
 *   E2E_URL=http://localhost:4177/ node scripts/e2e-loop.cjs
 *
 * Every Supabase request is answered by an in-memory stand-in; the real project is never reached.
 */
const { chromium } = (() => { try { return require('playwright') } catch { return require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright') } })()
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const BASE = process.env.E2E_URL || 'http://localhost:4177/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tali-loop-'))
const UID = '11111111-2222-4333-8444-555555555555'
const ymd = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
const now = new Date()
const today = ymd(now)
const ago = (n) => { const t = new Date(now); t.setDate(t.getDate() - n); return ymd(t) }
const dow = now.getDay()

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 86400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r', user: USER }
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }

const meal = (k, p, slot) => ({ n: 'Chicken and rice', k, p, c: Math.round(k / 8), f: Math.round(k / 40), grams: 300, meal: slot })
const strength = (d) => ({ id: 's' + d, modality: 'strength', title: 'Full body', routineId: 'builtin-Legs', at: d + 'T18:00:00.000Z', mins: 30, ex: [] })
const walk = (d) => ({ id: 'w' + d, modality: 'cardio', title: 'Brisk walk', cardio: { key: 'Brisk walk' }, at: d + 'T12:00:00.000Z', mins: 30 })

/** A maintain person in week 7: 6 check-ins, 3 strength and 3 walks, food on 6 days, weigh-ins every other day for 7 weeks. */
function steadyState({ gentle = false, reviewWeight = true, hard = false, missed = false } = {}) {
  const days = {}
  const day = (d) => (days[d] ??= { foods: [], supps: {}, weight: null, workout: null, checkin: null })
  for (let i = 50; i >= 1; i -= 2) day(ago(i)).weight = 80 + (i % 3 ? 0.2 : -0.2)
  day(ago(7)).weight = 80.1
  for (let i = 7; i >= 1; i--) {
    if (missed && i > 3) continue
    if (i !== 3) day(ago(i)).checkin = hard
      ? { mood: 3, hunger: 2, sleep: i <= 4 ? 1 : 3, stress: i <= 5 && i >= 3 ? 3 : 1, energy: 2, t: ago(i) + 'T08:00:00.000Z' }
      : { mood: 4, hunger: 3, sleep: 3, stress: 1, energy: 3, t: ago(i) + 'T08:00:00.000Z' }
    if (i !== 5) day(ago(i)).foods.push(meal(700, 40, 'breakfast'), meal(800, 45, 'lunch'), meal(i === 2 ? 1200 : 750, 40, 'dinner'))
    if (i === 6 || i === 4 || i === 2) day(ago(i)).sessions = [strength(ago(i))]
    else if (i !== 3) day(ago(i)).sessions = [walk(ago(i))]
  }
  const u = new Date().toISOString()
  return {
    target: { kcal: 2250, p: 125, c: 260, f: 75 },
    schedule: { 0: 'Rest', 1: 'Rest', 2: 'Rest', 3: 'Rest', 4: 'Rest', 5: 'Rest', 6: 'Rest' },
    profile: {
      name: 'Sam', sex: 'F', sexAnswer: 'female', age: 44, height: 168, activityLevel: 'light', activityMult: 1.45, supplements: [], notificationsEnabled: false,
      goal: 'maintain', maintainFrom: ago(48), motivations: ['Keep up with my kids at the weekend', 'Feel at home in my body'], burnSwitch: '2026-01-01',
      reviewDay: dow, ...(reviewWeight === 'unset' ? {} : { reviewWeight }), ...(gentle ? { gentle: true } : {}),
      ...(missed ? { lastReviewAt: ago(21) } : { lastReviewAt: ago(7) }),
      plans: [{ id: 'p1', when: 'I get home hungry', then: 'have a yoghurt before I start cooking', created: ago(30), lastReview: ago(8), reviews: [] }],
    },
    days, customFoods: [], recipes: [], routines: [], trainingPlans: [],
    consents: { records: [CONSENT] },
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}

const XofY = /\b\d+\s+of\s+(your\s+)?\d+\b/i
let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'loop-e2e:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 400) : '') }

async function open(browser, state, scheme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme })
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(SESSION), JSON.stringify(state)])
  const rows = { consents: [{ ...CONSENT, user_id: UID, recorded_at: CONSENT.at }] }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) })
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (m && req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => check('no page error', false, String(e)))
  await page.goto(BASE)
  await page.waitForSelector('text=Summary', { timeout: 15000 })
  return { ctx, page }
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true })

async function run() {
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined })
  for (const scheme of ['light', 'dark']) {
    // Summary: the review card, the week card, the weight tile
    const { ctx, page } = await open(browser, steadyState(), scheme)
    await page.waitForSelector('text=Weekly review')
    const week = await page.locator('section[aria-labelledby=sum-week]').innerText()
    check(`${scheme}: This week has no "x of y"`, !XofY.test(week), week)
    check(`${scheme}: Logged is a count`, /Logged\s*\n?\s*\d+ days?/.test(week), week)
    const tile = await page.locator('.tile', { hasText: 'Weight' }).innerText()
    check(`${scheme}: weight tile has no "vs last week"`, !/vs last week/.test(tile), tile)
    check(`${scheme}: weight tile shows the trend in words`, /steady range|over \d weeks|trend shows/i.test(tile), tile)
    await shot(page, `summary-${scheme}`)
    // the review
    await page.click('.rv-due-b')
    await page.waitForSelector('[data-testid=weekly-review]')
    const rv = await page.locator('[data-testid=weekly-review]').innerText()
    check(`${scheme}: review leads with What you did`, rv.indexOf('What you did') < rv.indexOf('For next week'), rv)
    check(`${scheme}: review has no "x of y"`, !XofY.test(rv), rv)
    check(`${scheme}: steady encouragement`, rv.includes('A steady week. This is what a habit looks like.'), rv)
    check(`${scheme}: weight row in words`, /Weighed in \d+ times/.test(rv) && !/kg/.test(rv), rv)
    await shot(page, `review-steady-${scheme}`)
    await page.click('text=Change one thing')
    await page.click('text=See the options')
    await page.waitForSelector('.lp-sheet')
    await shot(page, `change-one-${scheme}`)
    await ctx.close()
  }

  {
    const { ctx, page } = await open(browser, steadyState({ gentle: true }), 'light')
    await page.click('.rv-due-b')
    const rv = await page.locator('[data-testid=weekly-review]').innerText()
    const did = rv.slice(0, rv.indexOf('For next week'))
    check('gentle: no numbers in What you did', !/\d/.test(did.replace(/^.*\n/, '').replace(/\d+ (Sept|Oct)[^\n]*/g, '')), did)
    check('gentle: no weight', !/Weighed/.test(rv), rv)
    await page.click('text=Change one thing')
    const opts = await page.locator('.rv-chips').innerText()
    check('gentle: options never adjust a range', !/range/i.test(opts), opts)
    await shot(page, 'review-gentle-light')
    await ctx.close()
  }
  {
    const { ctx, page } = await open(browser, steadyState({ hard: true }), 'light')
    await page.click('.rv-due-b')
    const rv = await page.locator('[data-testid=weekly-review]').innerText()
    check('hard: encouragement first', rv.includes('A full-on week, and you still showed up.'), rv)
    await page.click('text=Change one thing')
    await page.click('text=See the options')
    const sheet = await page.locator('.lp-sheet').innerText()
    check('hard: mind first, no lower range', sheet.indexOf('Aim for an earlier night') < sheet.indexOf('Add a strength session') && !/Adjust my range/.test(sheet), sheet)
    await shot(page, 'change-one-hard-light')
    await page.keyboard.press('Escape')
    await shot(page, 'review-hard-light')
    await ctx.close()
  }
  {
    const { ctx, page } = await open(browser, steadyState({ missed: true }), 'light')
    await page.click('.rv-due-b')
    const rv = await page.locator('[data-testid=weekly-review]').innerText()
    check('missed: welcome back, nothing to catch up', rv.includes('Welcome back') && rv.includes('Nothing to catch up on') && rv.includes('Pick up from here'), rv)
    await shot(page, 'review-welcome-light')
    await ctx.close()
  }
  {
    const { ctx, page } = await open(browser, steadyState({ reviewWeight: 'unset' }), 'light')
    const tile = await page.locator('.tile', { hasText: 'Weight' }).innerText()
    check('never asked: the tile shows no number', !/\d/.test(tile), tile)
    await page.click('.rv-due-b')
    await page.waitForSelector('text=Include your weight in reviews?')
    await shot(page, 'weight-ask-light')
    await page.click('text=Leave it out')
    const rv = await page.locator('[data-testid=weekly-review]').innerText()
    check('left out: no weight row', !/Weighed/.test(rv), rv)
    await ctx.close()
  }
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(browser, steadyState(), scheme)
    await page.click('[aria-label=Profile]')
    await page.waitForSelector('text=Weekly review')
    await page.locator('text=Review day').scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(OUT, `profile-${scheme}.png`) })
    await page.click('text=Review day')
    await page.waitForSelector('text=Which day suits you?')
    await shot(page, `review-day-${scheme}`)
    await ctx.close()
  }
  await browser.close()
  console.log('screenshots:', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
