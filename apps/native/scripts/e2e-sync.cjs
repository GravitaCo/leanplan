/**
 * Sync and data on native (native-build-plan N3), checked against the native app's code rendered for
 * the web (react-native-web), in the style of e2e-summary-parity.cjs. Carries over the web's
 * e2e-foundations pill cases and the mid-upload withdrawal, e2e-onboarding "offline mid-wizard" and
 * e2e-wellbeing wp13-unload-offline, and adds the plan's parity cases: a day logged offline on
 * native reaches the web after reconnect and the reverse, last-write-wins between the two apps, and
 * nothing uploads before the health yes.
 *
 *   (apps/native) EXPO_PUBLIC_E2E=1 npx expo export --platform web --output-dir dist-web
 *                 (cd dist-web && python3 -m http.server 4188) &
 *   (repo root)   npm run build && npx vite preview --port 4177 &      # only for the cross-app cases
 *   NATIVE_URL=http://localhost:4188/ WEB_URL=http://localhost:4177/ node scripts/e2e-sync.cjs
 *
 * EXPO_PUBLIC_E2E=1 exposes the shared store as window.__tiloStore in that web render only
 * (lib/e2eHook.ts), so the cases drive the store's own actions where the native screens for them
 * (the wizard, Unload, food logging) aren't built yet. Without WEB_URL the cross-app cases are skipped.
 *
 * Every Supabase request is answered by an in-memory stand-in (rows per table, as the web's
 * e2e-foundations.cjs); the real project is never reached. The web render keeps the browser's own
 * connection events: the phone's NetInfo wiring (lib/platform/connection.ts) is unit-tested in
 * scripts/test-platform.mjs instead.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const WEB = process.env.WEB_URL || ''
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-n3-'))
const UID = '11111111-2222-4333-8444-555555555555'
const ymd = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
const today = ymd(new Date())
const SENT = 'N3SENTINEL' + Math.random().toString(36).slice(2, 8)

function fakeJwt(uid, authAgoS = 10) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const s = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: s + 3600, iat: s, amr: [{ method: 'password', timestamp: s - authAgoS }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const sessionOf = () => ({ access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: USER })

const GRANTED = { records: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }] }
const NONE = { records: [] }
const CONSENT_ROW = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', user_id: UID, type: 'health', version: '2026-09-v1', granted: true, recorded_at: '2026-09-20T08:00:00.000Z' }
const PROFILE = { name: 'Sam Taylor', sex: 'F', age: 34, height: 170, weight: 70, activityLevel: 'light', activityMult: 1.3, supplements: [], notificationsEnabled: false }
/** A device state as the app saves it (e2e-foundations.cjs deviceState): synced once, owned by UID. */
function deviceState({ days = {}, dirty = [], consents = GRANTED } = {}) {
  const u = new Date().toISOString()
  return {
    profile: PROFILE, days, consents,
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: dirty.includes(d) }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}
const food = (n, k = 100) => ({ n, k, p: 4, c: 18, f: 1, grams: 40 })
const aDay = (foods, weight = null) => ({ foods, supps: {}, weight, workout: null })

let bad = 0
const results = []
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }

/** The in-memory server, shared by every page in a scenario (so the two apps can meet in it). */
function server(seed = {}) {
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [], routines: [], training_plans: [], ...seed }
  const net = { mode: 'ok', block: false, posts: [], bodies: [], release: null }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  const handler = async (route) => {
    const req = route.request()
    const url = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (net.block) return route.abort('internetdisconnected')
    net.bodies.push(url + ' ' + (req.postData() || ''))
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
    if (url.includes('/auth/v1/token')) return json(200, sessionOf())
    if (url.includes('/auth/v1/user')) return json(200, USER)
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204, headers: cors })
    if (url.includes('/rest/v1/rpc/clear_log_after_withdrawal')) {
      net.posts.push({ t: 'rpc/clear_log_after_withdrawal', list: [] })
      const h = rows.consents.filter((r) => r.type === 'health').sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at))).pop()
      if (!h || h.granted) return json(200, { cleared: false })
      for (const t of ['day_logs', 'custom_foods', 'recipes', 'routines', 'training_plans', 'settings']) rows[t] = []
      return json(200, { cleared: true })
    }
    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return json(200, {})
    const t = m[1]
    if (req.method() === 'GET') return json(200, rows[t] || [])
    if (req.method() === 'DELETE') return route.fulfill({ status: 204, headers: cors })
    const body = JSON.parse(req.postData() || '[]')
    const list = Array.isArray(body) ? body : [body]
    net.posts.push({ t, list })
    if (net.mode === 'hang') await new Promise((r) => { net.release = r })
    if (net.mode === 'fail') return json(500, {})
    // another phone withdraws while this one uploads (e2e-foundations.cjs): the no lands, the
    // account's copy is cleared, and the server's consent guard refuses this write
    if (net.mode === 'withdrawn-elsewhere' && t !== 'consents') {
      net.mode = 'ok'
      rows.consents.push({ id: 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee', user_id: UID, type: 'health', version: '2026-09-v1', granted: false, recorded_at: new Date().toISOString() })
      for (const x of ['day_logs', 'custom_foods', 'recipes', 'routines', 'training_plans', 'settings']) rows[x] = []
      return json(400, { code: 'TL001', message: 'tali: health consent required' })
    }
    const now = new Date().toISOString()
    for (const row of list) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      const stamped = { ...row, updated_at: now }
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...stamped }; else rows[t].push(stamped)
    }
    return route.fulfill({ status: 201, headers: cors, body: '' })
  }
  return { rows, net, handler }
}

/** One app on one device: `url` the native render or the web app, `state` its saved data (none:
 *  a new device with only the sign-in). */
async function device(browser, srv, url, state, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('e2e.seeded')) return // a reload keeps what the app saved
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    if (st) localStorage.setItem('leanplan.v1', st)
  }, [JSON.stringify(sessionOf()), state ? JSON.stringify(state) : null])
  await ctx.route(/supabase\.co\//, srv.handler)
  await ctx.route(/openfoodfacts\.org/, (r) => r.abort())
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  return { ctx, page, errors, name }
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
const store = (page, fn, arg) => page.evaluate(fn, arg)
/** The native app past its gate (Summary). */
const nativeUp = (page) => page.getByText('This week', { exact: true }).first().waitFor({ timeout: 20000 })
/** The stand-in pill, in the lab sheet the avatar opens (lib/ConnectionStandIn.tsx). */
async function openPill(page) {
  await page.getByRole('button', { name: 'Profile' }).first().click()
  await page.locator('[data-testid^="cpill-"]').first().waitFor()
}
const pillIs = (page, kind, timeout = 15000) => page.locator(`[data-testid="cpill-${kind}"]`).first().waitFor({ timeout })
const pillText = (page) => page.locator('[data-testid^="cpill-"]').first().innerText()
const synced = (page, d = today) => page.waitForFunction((d) => { const s = JSON.parse(localStorage.getItem('leanplan.v1') || 'null'); return s && s._meta?.days?.[d] && !s._meta.days[d].dirty }, d, { timeout: 15000 })

async function scenario(browser, name, fn, { seed, state, before, needsWeb } = {}) {
  if (needsWeb && !WEB) { console.log('SKIP', name, '(no WEB_URL)'); return }
  const srv = server(seed)
  if (before) before(srv.net)
  const opened = []
  const open = async (url, st, label) => { const d = await device(browser, srv, url, st, label); opened.push(d); return d }
  try {
    await fn({ srv, rows: srv.rows, net: srv.net, open })
    const errs = opened.flatMap((d) => d.errors.map((e) => d.name + ': ' + e))
    if (errs.length) throw new Error('page errors: ' + errs.join(' | '))
    console.log('PASS', name)
    results.push(true)
  } catch (e) {
    bad++
    results.push(false)
    for (const d of opened) await d.page.screenshot({ path: path.join(OUT, 'FAIL-' + name.replace(/\W+/g, '-') + '-' + d.name + '.png'), fullPage: true }).catch(() => {})
    console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0], '\n   screenshots in', OUT)
  } finally {
    if (srv.net.release) srv.net.release()
    for (const d of opened) await d.ctx.close().catch(() => {})
  }
}

;(async () => {
  const browser = await chromium.launch()
  const run = (...a) => scenario(browser, ...a)
  const seedConsent = { consents: [CONSENT_ROW] }

  /* ---------- the connection pill (e2e-foundations, 4 cases) ---------- */

  await run('pill: up to date', async ({ open }) => {
    const { page } = await open(NATIVE, deviceState(), 'native')
    await nativeUp(page)
    await openPill(page)
    await pillIs(page, 'up-to-date')
    expect((await pillText(page)) === 'Up to date', 'label: ' + (await pillText(page)))
    await page.screenshot({ path: path.join(OUT, 'pill-up-to-date.png') })
  }, { seed: seedConsent })

  await run('pill: saved on this phone, will sync (n)', async ({ open }) => {
    const { page } = await open(NATIVE, deviceState({ days: { [today]: aDay([food('Toast')]) }, dirty: [today] }), 'native')
    await nativeUp(page)
    await openPill(page)
    await pillIs(page, 'pending')
    const txt = await pillText(page)
    expect(txt === 'Saved on this phone, will sync (1)', 'label: ' + txt)
  }, { seed: seedConsent, before: (net) => { net.mode = 'hang' } })

  await run('pill: offline, and back', async ({ open }) => {
    const d = await open(NATIVE, deviceState(), 'native')
    await nativeUp(d.page)
    await openPill(d.page)
    await pillIs(d.page, 'up-to-date')
    await d.ctx.setOffline(true)
    await pillIs(d.page, 'offline')
    expect((await pillText(d.page)) === 'Offline', 'label')
    await d.ctx.setOffline(false)
    await pillIs(d.page, 'up-to-date')
  }, { seed: seedConsent })

  await run('pill: sync problem, tap tries again', async ({ open, net }) => {
    const { page } = await open(NATIVE, deviceState({ days: { [today]: aDay([food('Toast')]) }, dirty: [today] }), 'native')
    await nativeUp(page)
    await openPill(page)
    await pillIs(page, 'problem')
    expect((await pillText(page)) === 'Sync problem', 'label')
    net.mode = 'ok'
    await page.locator('[data-testid="cpill-problem"]').first().click()
    await pillIs(page, 'up-to-date')
  }, { seed: seedConsent, before: (net) => { net.mode = 'fail' } })

  /* ---------- consent and withdrawal ---------- */

  await run('a withdrawal on another phone mid-upload: this phone keeps its saved foods', async ({ open, rows }) => {
    const st = { ...deviceState({ days: { [today]: aDay([food('Toast')]) }, dirty: [today] }), customFoods: [{ id: '11111111-2222-4333-8444-555555555555', n: 'My granola', k: 450, p: 10, c: 60, f: 18, _dirty: false }] }
    const { page } = await open(NATIVE, st, 'native')
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('leanplan.v1')).consents.cloudClearedFor, null, { timeout: 20000 })
    const s = await stored(page)
    const latest = (s.consents.records || []).filter((r) => r.type === 'health').sort((a, b) => a.at.localeCompare(b.at)).pop()
    expect((s.customFoods || []).some((f) => f.n === 'My granola'), 'the saved food stays on the phone')
    expect((s.days[today]?.foods || []).length === 1, 'the day stays on the phone')
    expect(latest?.granted === false, "the other phone's withdrawal is here")
    expect(rows.custom_foods.length === 0 && rows.day_logs.length === 0, 'the account copy stays cleared')
    // the native gate: the app isn't shown without a current yes (N2 builds the screen)
    await page.getByText('One more step on the web').waitFor().catch(() => {})
    const conn = await store(page, () => { const st = window.__tiloStore.getState(); return { phoneOnly: !st.data.consents.records.filter((r) => r.type === 'health').sort((a, b) => a.at.localeCompare(b.at)).pop().granted } })
    expect(conn.phoneOnly, 'phone only')
  }, {
    seed: { consents: [CONSENT_ROW], custom_foods: [{ id: '11111111-2222-4333-8444-555555555555', user_id: UID, name: 'My granola', kcal: 450, protein: 10, carbs: 60, fat: 18 }] },
    before: (net) => { net.mode = 'withdrawn-elsewhere' },
  })

  await run('nothing uploads before the health yes; then consent first, the log after', async ({ open, net, rows }) => {
    const { page } = await open(NATIVE, deviceState({ days: { [today]: aDay([food('Toast')], 70) }, dirty: [today], consents: NONE }), 'native')
    await page.getByText('One more step on the web').waitFor({ timeout: 20000 })
    await page.waitForTimeout(2500)
    expect(!net.posts.some((p) => p.t !== 'consents'), 'nothing but consent before the answer: ' + net.posts.map((p) => p.t).join())
    expect(!net.bodies.some((b) => b.includes('Toast')), 'no request carried the log')
    await store(page, () => window.__tiloStore.getState().grantConsent('health'))
    await nativeUp(page)
    await synced(page)
    expect(rows.consents.some((r) => r.type === 'health' && r.granted === true), 'the answer synced')
    expect(rows.day_logs.some((x) => x.log_date === today), 'then the log')
    const i = net.posts.findIndex((p) => p.t === 'consents'), j = net.posts.findIndex((p) => p.t === 'day_logs')
    expect(i >= 0 && j > i, 'consent before data: ' + net.posts.map((p) => p.t).join())
  })

  /* ---------- offline ---------- */

  await run('offline mid-onboarding: finish offline, reload offline, sync on reconnect', async ({ open, net, rows }) => {
    // e2e-onboarding "offline mid-wizard" at the data layer (the native wizard is N2): finishing
    // with no connection saves on the phone, survives a reload with no server, and syncs later
    const d = await open(NATIVE, deviceState({ consents: GRANTED }), 'native')
    await nativeUp(d.page)
    await d.ctx.setOffline(true)
    const ok = await store(d.page, (p) => window.__tiloStore.getState().finishOnboarding({ profile: p, weightKg: 71.5 }), { ...PROFILE, age: 41, goal: 'increase-strength', onboardedAt: new Date().toISOString() })
    expect(ok === true, 'finished with consent')
    let s = await stored(d.page)
    expect(s.profile.age === 41 && s._meta.settings.dirty && s.days[today]?.weight === 71.5, 'saved on the phone, waiting to sync')
    // reload with no connection to Tilo's server (the app itself still loads)
    net.block = true
    await d.ctx.setOffline(false)
    await d.page.reload()
    await nativeUp(d.page)
    await d.ctx.setOffline(true)
    s = await stored(d.page)
    expect(s.profile.age === 41 && s._meta.settings.dirty, 'kept over the reload')
    expect(!net.posts.some((p) => p.t === 'settings' || p.t === 'day_logs'), 'nothing sent while offline')
    net.block = false
    await d.ctx.setOffline(false)
    await d.page.waitForFunction(() => !JSON.parse(localStorage.getItem('leanplan.v1'))._meta.settings.dirty, null, { timeout: 20000 })
    expect(rows.settings.length > 0 && rows.day_logs.some((x) => x.log_date === today && x.weight === 71.5), 'synced on reconnect')
  }, { seed: seedConsent })

  await run('wp13-unload-offline: a note saves offline and never leaves the phone', async ({ open, net }) => {
    const d = await open(NATIVE, deviceState({ days: { [today]: aDay([food('Toast')]) } }), 'native')
    await nativeUp(d.page)
    await d.ctx.setOffline(true)
    // the note written as UnloadSheet's addUnloadNote would, through the store's own device-only save
    const r = await store(d.page, (text) => window.__tiloStore.getState().writeNotes((s, ctx) => {
      if (!ctx.signedIn) return false
      s.deviceOnly = { ...s.deviceOnly, unload: { owner: s._meta.owner, notes: [{ id: 'n1', at: new Date().toISOString(), pairs: [{ mind: text }] }] } }
      return true
    }), 'Offline thought ' + SENT)
    expect(r.result === true && r.stored === true, 'saved offline: ' + JSON.stringify(r))
    expect(JSON.stringify((await stored(d.page)).deviceOnly).includes('Offline thought'), 'on the phone')
    // something to sync after reconnecting, so a sync really runs
    await store(d.page, () => window.__tiloStore.getState().logEntries([{ n: 'Banana', k: 90, p: 1, c: 23, f: 0, grams: 100 }]))
    await d.ctx.setOffline(false)
    await synced(d.page)
    await d.page.waitForTimeout(1000)
    expect(net.posts.some((p) => p.t === 'day_logs'), 'a sync ran')
    expect(!net.bodies.some((b) => b.includes(SENT)), 'no request carried the note after reconnecting')
  }, { seed: seedConsent })

  /* ---------- the two apps on one account ---------- */

  await run('a day logged offline on native appears on the web after reconnect', async ({ open, rows }) => {
    const n = await open(NATIVE, deviceState(), 'native')
    await nativeUp(n.page)
    await n.ctx.setOffline(true)
    await store(n.page, () => window.__tiloStore.getState().logEntries([{ n: 'Native porridge', k: 310, p: 11, c: 54, f: 6, grams: 250 }]))
    await n.page.waitForTimeout(1500)
    expect(!rows.day_logs.length, 'nothing uploaded offline')
    await n.ctx.setOffline(false)
    await synced(n.page)
    const w = await open(WEB, null, 'web') // a new web device: only the sign-in
    await w.page.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('leanplan.v1') || 'null'); return !!s?._meta?.lastPull }, null, { timeout: 20000 })
    await w.page.waitForFunction((d) => (JSON.parse(localStorage.getItem('leanplan.v1')).days[d]?.foods || []).some((f) => f.n === 'Native porridge'), today, { timeout: 15000 })
  }, { seed: seedConsent, needsWeb: true })

  await run('a day logged offline on the web appears on native after reconnect', async ({ open, rows }) => {
    // the web's own logging path is checked by its e2e scripts; here a day edited offline, as the web
    // app saves it, uploading when the web device is back
    const w = await open(WEB, deviceState({ days: { [today]: aDay([food('Web toast', 120)]) }, dirty: [today] }), 'web')
    await synced(w.page)
    expect(rows.day_logs.some((x) => x.log_date === today), 'on the server')
    const n = await open(NATIVE, null, 'native') // a new phone: only the sign-in
    await nativeUp(n.page)
    await n.page.waitForFunction((d) => (JSON.parse(localStorage.getItem('leanplan.v1')).days[d]?.foods || []).some((f) => f.n === 'Web toast'), today, { timeout: 15000 })
  }, { seed: seedConsent, needsWeb: true })

  await run('last write wins between the apps, as between two web devices', async ({ open, rows }) => {
    // both apps edit the same day offline; native reconnects first, the web after: the web's
    // version is the last write, and native takes it on its next sync
    const n = await open(NATIVE, deviceState(), 'native')
    await nativeUp(n.page)
    await n.ctx.setOffline(true)
    await store(n.page, () => window.__tiloStore.getState().logEntries([{ n: 'Native lunch', k: 500, p: 30, c: 50, f: 15, grams: 300 }]))
    await n.ctx.setOffline(false)
    await synced(n.page)
    expect(JSON.stringify(rows.day_logs).includes('Native lunch'), 'native first')
    const w = await open(WEB, deviceState({ days: { [today]: aDay([food('Web lunch', 450)]) }, dirty: [today] }), 'web')
    await synced(w.page)
    await w.page.waitForTimeout(500)
    const row = rows.day_logs.find((x) => x.log_date === today)
    expect(JSON.stringify(row).includes('Web lunch') && !JSON.stringify(row).includes('Native lunch'), 'the later write is on the server')
    // native's next sync (coming back to the app)
    await store(n.page, () => window.__tiloStore.getState().runSync())
    await n.page.waitForFunction((d) => { const f = JSON.parse(localStorage.getItem('leanplan.v1')).days[d]?.foods || []; return f.some((x) => x.n === 'Web lunch') && !f.some((x) => x.n === 'Native lunch') }, today, { timeout: 15000 })
  }, { seed: seedConsent, needsWeb: true })

  await browser.close()
  const passed = results.filter(Boolean).length
  console.log(bad ? `${bad} failed, ${passed} passed` : `all ${passed} passed`, '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
