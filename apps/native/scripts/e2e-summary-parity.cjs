/**
 * Summary parity, web against native (native-build-brief §1: "parity is tested, not eyeballed").
 * Opens the same seeded account and data in the real web app and in the native app's code rendered
 * for the web (react-native-web), compares the Summary's figures and words, and writes screenshots
 * of both, light and dark, to E2E_OUT for `design` and for Benn and Sara.
 *
 *   (repo root) npm run build && npx vite preview --port 4177 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   WEB_URL=http://localhost:4177/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-summary-parity.cjs
 *
 * Every Supabase request is answered by an in-memory stand-in (as scripts/e2e-*.cjs on web); the
 * real project is never reached. A web render is not the phone: fonts, safe areas and native
 * controls differ there, so this checks the numbers and words, and the layout only roughly.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-parity-'))
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

async function open(browser, url, st, scheme) {
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
  await page.getByText('This week', { exact: true }).first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(600)
  return { ctx, page, errors }
}

/** The figures and words both apps must agree on, read from the page's text. */
function facts(text) {
  const t = text.replace(/ /g, ' ').replace(/[ \t]+/g, ' ')
  const g = (re) => { const m = t.match(re); return m ? m.slice(1).map((x) => (x ?? '').replace(/\s+/g, ' ').trim()).join('|') : null }
  return {
    eyebrow: g(/((?:Today|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w* · \d{1,2} \w+)/),
    kcal: g(/\n?([\d,]+)\s*\n?\s*of ([\d,]+)–([\d,]+) kcal/),
    status: g(/\n([^\n]*?) · give or take ([\d,]+)/),
    protein: g(/Protein\s*\n\s*(\d+)\s*g\s*\n?[^\n]*\n?\s*of (\d+) g/),
    carbs: g(/Carbs\s*\n\s*(\d+)\s*g\s*\n?[^\n]*\n?\s*of (\d+) g/),
    fat: g(/Fat\s*\n\s*(\d+)\s*g\s*\n?[^\n]*\n?\s*of (\d+) g/),
    move: g(/Move\s*\n([^\n]+)\n([^\n]+)/),
    weight: g(/Weight\s*\n\s*([\d.]+)\s*\n?\s*kg\s*\n([^\n]+)/),
    energy: g(/(You averaged [^\n]+ in your range\.|You logged on [^\n]+\.)/),
    range: g(/(Your range(?:\s*\n?\s*[\d,]+–[\d,]+)?[^\n]*)/),
    weekProtein: g(/Protein\s*\n\s*(\d+ g)\s*\n\s*(a day[^\n]*)/),
    workouts: g(/Workouts\s*\n\s*([^\n]+)\n\s*([^\n]+)/),
    logged: g(/Logged\s*\n\s*(\d+ days?)/),
  }
}

async function run() {
  const browser = await chromium.launch()
  for (const [label, opts] of [['numbers', {}], ['gentle', { gentle: true }]]) {
    for (const scheme of ['light', 'dark']) {
      const st = state(opts)
      const w = await open(browser, WEB, st, scheme)
      const n = await open(browser, NATIVE, st, scheme)
      await w.page.screenshot({ path: path.join(OUT, `summary-${label}-${scheme}-web.png`), fullPage: true })
      await n.page.screenshot({ path: path.join(OUT, `summary-${label}-${scheme}-native.png`), fullPage: true })
      if (scheme === 'light') {
        const tw = await w.page.innerText('body'), tn = await n.page.innerText('body')
        if (process.env.DUMP) console.log(JSON.stringify({ web: tw, native: tn }))
        const fw = facts(tw), fn = facts(tn)
        for (const k of Object.keys(fw)) {
          if (fw[k] == null && fn[k] == null) continue
          check(`${label}: ${k} matches`, fw[k] === fn[k], { web: fw[k], native: fn[k] })
        }
      }
      check(`${label} ${scheme}: no page errors on web`, !w.errors.length, w.errors)
      check(`${label} ${scheme}: no page errors on native`, !n.errors.length, n.errors)
      await w.ctx.close(); await n.ctx.close()
    }
  }
  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
