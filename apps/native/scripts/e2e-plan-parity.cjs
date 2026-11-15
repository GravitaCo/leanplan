/**
 * Plan parity, web against native (stream N8; native-build-brief §1: "parity is tested, not
 * eyeballed"). For every Plan state (none, choosing, preview, active, easing in, starting later, a
 * next plan waiting, finished, maintenance, carrying on, an own plan) it opens the same seeded
 * account in the real web app and in the native app's code rendered for the web, walks to the same
 * view in both, and compares every line of words and figures. Screenshots of both, light and dark,
 * go to E2E_OUT for `design` and for Benn and Sara.
 *
 *   (repo root) npm run build && npx vite preview --port 4177 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   WEB_URL=http://localhost:4177/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-plan-parity.cjs
 *
 * Every Supabase request is answered by an in-memory stand-in (as scripts/e2e-*.cjs on web); the
 * real project is never reached. ONLY=<case> runs one case; DUMP=1 prints both texts.
 */
const { chromium } = require('playwright')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-plan-parity-'))
const NOW = new Date(process.env.E2E_NOW || '2026-11-14T12:00:00')
const UID = '11111111-2222-4333-8444-555555555555'
const ROOT = path.resolve(__dirname, '../../..')

// the seeded states, built with the shared core (plan-parity-seed.ts)
const seedOut = path.join(OUT, 'seed.cjs')
execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [path.join(__dirname, 'plan-parity-seed.ts'), '--bundle', '--platform=node', '--alias:@=' + path.join(ROOT, 'src'),
  '--define:import.meta.env={}', '--log-level=error', '--outfile=' + seedOut])
const { states: STATES, rows: ROWS } = JSON.parse(execFileSync('node', [seedOut], { env: { ...process.env, E2E_NOW: NOW.toISOString() } }).toString())

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(NOW.getTime() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 86400, iat: s, amr: [{ method: 'password', timestamp: s - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(NOW.getTime() / 1000) + 86400, refresh_token: 'r', user: USER }
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 1500) : '') }

async function open(browser, url, state, scheme) {
  const st = STATES[state]
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme })
  await ctx.addInitScript(([s, data]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', data)
  }, [JSON.stringify(SESSION), JSON.stringify(st)])
  const rows = { consents: [{ ...CONSENT, user_id: UID, recorded_at: CONSENT.at }], ...ROWS[state] }
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(USER) })
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    if (m && req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows[m[1]] || []) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  // the clip previews and posters (Bunny) aren't part of the comparison
  await ctx.route(/b-cdn\.net|bunnycdn|mediadelivery/, (r) => r.abort())
  await ctx.clock.install({ time: NOW })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // both apps open on Summary and tap the Plan tab (native's shell follows the store's tab, as the web does)
  await page.goto(url)
  await page.getByText('This week', { exact: true }).first().waitFor({ timeout: 30000 })
  await page.getByText('Plan', { exact: true }).last().click()
  await page.getByText('If–then plans', { exact: true }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(400)
  return { ctx, page, errors }
}

// the tab bar's labels and the avatar's initials are the shell's (N0), not Plan's
const CHROME = new Set(['Summary', 'Mind', 'Food', 'Train', 'Plan', 'ST', 'Up to date', 'Synced', 'Saved on this phone', 'Offline'])
const lines = (text) => text.replace(/ /g, ' ').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !CHROME.has(l))

/** The page's words, leaving out what the screen reader can't reach (native keeps inactive tabs mounted, aria-hidden). */
const shown = (page) => page.evaluate(() => {
  const hid = [...document.querySelectorAll('[aria-hidden="true"]')].map((e) => [e, e.style.display])
  hid.forEach(([e]) => { e.style.display = 'none' })
  const text = document.body.innerText
  hid.forEach(([e, d]) => { e.style.display = d })
  return text
})

/** Words and figures in one app and not the other (order-free; a line counts as often as it shows). */
function diff(a, b) {
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())
  const ca = count(a), cb = count(b)
  const only = (x, y) => [...x].flatMap(([k, n]) => Array(Math.max(0, n - (y.get(k) || 0))).fill(k))
  return { webOnly: only(ca, cb), nativeOnly: only(cb, ca) }
}

/** Steps to reach a view: each is a function (page) => Promise. */
const tap = (label) => async (p) => { await p.getByLabel(label).locator('visible=true').first().click(); await p.waitForTimeout(500) }
// an element whose own text is `text`, outside anything aria-hidden (native's inactive tabs stay mounted)
const tapText = (text) => async (p) => {
  await p.locator(`xpath=//*[not(ancestor-or-self::*[@aria-hidden='true'])][text()[normalize-space(.)=${JSON.stringify(text)}]]`).first().click()
  await p.waitForTimeout(500)
}

const CASES = [
  ['none · the week', 'none', []],
  ['none · a day of the week', 'none', [tap(/^Monday: /)]],
  ['none · a rest day', 'none', [tap(/^Sunday: /)]],
  ['none · workouts sheet', 'none', [tapText('Workouts')]],
  ['none · a workout', 'none', [tap(/^Monday: /), tapText('View')]],
  ['none · new if-then plan', 'none', [tapText('New plan')]],
  ['none · edit if-then plan', 'none', [tapText('When I get home from work hungry')]],
  ['none · guide: the honest basics', 'none', [tapText('The honest basics')]],
  ['choosing · the library', 'none', [tapText('Browse all plans')]],
  ['choosing · filters', 'none', [tapText('Browse all plans'), tap('Filters')]],
  ['preview · suggested plan', 'none', [tapText('Full body system')]],
  ['preview · another plan', 'none', [tapText('Browse all plans'), tapText('Pure muscle growth')]],
  ['preview · maintenance card', 'none', [tapText('Full body system'), tapText('After the plan: maintenance')]],
  ['build · step 1', 'none', [tapText('Browse all plans'), tapText('New plan')]],
  ['build · step 2', 'none', [tapText('Browse all plans'), tapText('New plan'), tapText('Next: your week')]],
  ['none · add-workout sheet', 'none', [tap(/^Monday: /), tapText('Change workout')]],
  ['none · add-workout category', 'none', [tap(/^Monday: /), tapText('Change workout'), async (p) => { await p.getByRole('button', { name: /^Weights/ }).locator('visible=true').last().click(); await p.waitForTimeout(500) }]],
  ['none · copy from sheet', 'none', [tap(/^Monday: /), tapText('Copy another day')]],
  ['choosing · a goal chosen', 'none', [tapText('Browse all plans'), tapText('Get stronger')]],
  ['build · step 3', 'none', [tapText('Browse all plans'), tapText('New plan'), tapText('Next: your week'), tapText('Copy it'), tapText('Next: when to start')]],
  ['active · rename sheet', 'active', [tapText('Your plan'), tapText('Rename')]],
  ['active · add a week sheet', 'active', [tapText('Your plan'), tapText('Add an easier or lighter week')]],
  ['active · stop sheet', 'active', [tapText('Your plan'), tapText('Stop plan')]],
  ['active · plan day add sheet', 'active', [tap(/^Monday: /), tapText('Add another')]],
  ['active · the week', 'active', []],
  ['active · details', 'active', [tapText('Your plan')]],
  ['active · a plan day', 'active', [tap(/^Monday: /)]],
  ['active · phase week', 'active', [tapText('Your plan'), tap(/Edit its week$/)]],
  ['easing · the week', 'easing', []],
  ['later · the week', 'later', []],
  ['later · details', 'later', [tapText('Your plan')]],
  ['next · the week', 'next', []],
  ['finished · the week', 'finished', []],
  ['finished · look back', 'finished', [tapText("See what's next")]],
  ['finished · what next', 'finished', [tapText("See what's next"), tapText('Continue')]],
  ['maintenance · the week', 'maintenance', []],
  ['maintenance · details', 'maintenance', [tapText('Your plan')]],
  ['carrying · the week', 'carrying', []],
  ['own · the week', 'own', []],
  ['own · details', 'own', [tapText('Your plan')]],
]

async function run() {
  const browser = await chromium.launch()
  const only = process.env.ONLY
  for (const [name, state, steps] of CASES) {
    if (only && !name.includes(only)) continue
    for (const scheme of ['light', 'dark']) {
      const w = await open(browser, WEB, state, scheme)
      const n = await open(browser, NATIVE, state, scheme)
      let stepErr = null
      for (const s of steps) {
        try { await s(w.page) } catch (e) { stepErr = 'web: ' + String(e).split('\n')[0] }
        try { await s(n.page) } catch (e) { stepErr = (stepErr ? stepErr + '; ' : '') + 'native: ' + String(e).split('\n')[0] }
      }
      const file = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      // native scrolls inside its own view (and sheets inside theirs), so both pages are opened up to their
      // tallest scroller before the full-page shot
      for (const p of [w.page, n.page]) {
        const h = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll('*')].map((e) => (e.scrollHeight > e.clientHeight + 4 && getComputedStyle(e).overflowY !== 'visible' ? e.scrollHeight + 120 : 0))))
        await p.setViewportSize({ width: 390, height: Math.min(Math.max(844, h), 6000) })
        // photos framed after their size is known (CoverImage on react-native-web asks for it)
        await p.waitForTimeout(1500)
      }
      await w.page.screenshot({ path: path.join(OUT, `plan-${file}-${scheme}-web.png`), fullPage: true })
      await n.page.screenshot({ path: path.join(OUT, `plan-${file}-${scheme}-native.png`), fullPage: true })
      if (scheme === 'light') {
        check(`${name}: reached`, !stepErr, stepErr)
        const tw = await shown(w.page), tn = await shown(n.page)
        if (process.env.DUMP) console.log(JSON.stringify({ web: tw, native: tn }))
        const d = diff(lines(tw), lines(tn))
        check(`${name}: words and figures match`, !d.webOnly.length && !d.nativeOnly.length, d)
      }
      check(`${name} ${scheme}: no page errors`, !w.errors.length && !n.errors.length, { web: w.errors, native: n.errors })
      await w.ctx.close(); await n.ctx.close()
    }
  }
  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
