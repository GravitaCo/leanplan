/**
 * What the parity scripts share (scripts/e2e-*-parity.cjs): the seeded account and week, the
 * in-memory Supabase stand-in, a fixed clock, and the PASS/FAIL tally. The real project is never
 * reached.
 */
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const UID = '11111111-2222-4333-8444-555555555555'
// both browsers run on a fixed Saturday, so the week has six days of data whatever day this runs
const NOW = new Date(process.env.E2E_NOW || '2026-11-14T12:00:00')
const ymd = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
const now = NOW
const ago = (n) => { const t = new Date(now); t.setDate(t.getDate() - n); return ymd(t) }

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(NOW.getTime() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 86400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(NOW.getTime() / 1000) + 86400, refresh_token: 'r', user: USER }
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }

const meal = (k, p, slot) => ({ n: 'Chicken and rice', k, p, c: Math.round(k / 8), f: Math.round(k / 40), grams: 300, meal: slot, how: 'search' })
const strength = (d) => ({ id: 's' + d, modality: 'strength', title: 'Full body', routineId: 'builtin-Legs', at: d + 'T18:00:00.000Z', mins: 30, ex: [] })

/** Week 7 of maintaining: food on most days (today too), weigh-ins, two strength sessions. */
function state({ gentle = false } = {}) {
  const days = {}
  const day = (d) => (days[d] ??= { foods: [], supps: {}, weight: null, workout: null, checkin: null })
  for (let i = 50; i >= 1; i -= 2) day(ago(i)).weight = 80 + (i % 3 ? 0.2 : -0.2)
  for (let i = 6; i >= 0; i--) {
    if (i !== 5) day(ago(i)).foods.push(meal(700, 40, 'breakfast'), meal(800, 45, 'lunch'))
    if (i !== 0 && i !== 5) day(ago(i)).foods.push(meal(i === 2 ? 1200 : 750, 40, 'dinner'))
    if (i === 4 || i === 2) day(ago(i)).sessions = [strength(ago(i))]
    if (i > 0) day(ago(i)).checkin = { mood: 4, hunger: 3, sleep: 3, stress: 1, energy: 3, t: ago(i) + 'T08:00:00.000Z' }
  }
  const u = new Date().toISOString()
  return {
    target: { kcal: 2250, p: 125, c: 260, f: 75 },
    schedule: { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Rest', 5: 'Legs', 6: 'Rest' },
    profile: {
      name: 'Sam Taylor', sex: 'F', sexAnswer: 'female', age: 44, height: 168, activityLevel: 'light', activityMult: 1.45, supplements: [], notificationsEnabled: false,
      goal: 'maintain', maintainFrom: ago(48), burnSwitch: '2026-01-01', reviewDay: (now.getDay() + 3) % 7, reviewWeight: true, lastReviewAt: ago(4), ...(gentle ? { gentle: true } : {}),
    },
    days, customFoods: [], recipes: [], routines: [], trainingPlans: [],
    consents: { records: [CONSENT] },
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 600) : '') }

async function open(browser, url, st, scheme, ready = (page) => page.getByText('This week', { exact: true }).first().waitFor({ timeout: 20000 })) {
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
    if (m && req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  await ctx.clock.install({ time: NOW })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  await ready(page)
  await page.waitForTimeout(600)
  return { ctx, page, errors }
}

const outDir = (prefix) => process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), prefix))
const failures = () => bad

module.exports = { NOW, UID, SESSION, CONSENT, state, open, check, failures, outDir }
