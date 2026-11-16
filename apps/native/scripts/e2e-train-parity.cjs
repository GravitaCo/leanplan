/**
 * Train parity, web against native (native-build-plan N7; brief §1 "parity is tested, not
 * eyeballed"). Opens the same seeded account in the real web app and in the native app's code
 * rendered for the web (react-native-web), walks the same Train journeys in both, and checks that
 * every line the web shows is shown by native and the reverse, and that what a session saves is
 * identical. Screenshots of both, light and dark, go to E2E_OUT for `design`, Benn and Sara.
 *
 * Carries over e2e-wellbeing's wp8-* cases (train hard day, rough night, cardio day, ordinary day)
 * and adds the preview, the guided player (a set logged, rest, leave), Log sets by hand, Log a
 * session and the library.
 *
 *   (repo root)   npm run build && npx vite preview --port 4177 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   WEB_URL=http://localhost:4177/ NATIVE_URL=http://localhost:4188/ node scripts/e2e-train-parity.cjs [--only=name]
 *
 * The warm-up block is behind ONBOARDING_ENABLED, so its case runs only with ONBOARDING=1 against
 * builds with the flag on in both apps (VITE_ONBOARDING=1 npm run build; EXPO_PUBLIC_ONBOARDING=1
 * npx expo export …); the other cases then check the flag-on Train as well.
 *
 * The Train tab must be wired to screens/train (app/(tabs)/train.tsx). Every Supabase request is
 * answered by an in-memory stand-in; the real project is never reached. Clips are not fetched (the
 * Bunny CDN is answered with a 404 in both apps, so both show their offline fallbacks the same way):
 * this checks words, numbers and saved data, not video.
 */
const { chromium } = (() => { try { return require('playwright') } catch { return require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright') } })()
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tilo-train-parity-'))
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const UID = '11111111-2222-4333-8444-555555555555'

const ymd = (d) => d.toISOString().slice(0, 10)
const shift = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return ymd(x) }
const HARD_DAY = '2026-10-08' // Thursday (e2e-wellbeing deck 0.1)
const ORDINARY_DAY = '2026-10-10' // Saturday (deck B9)

function fakeJwt(uid) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 86400 * 400, iat: now, amr: [{ method: 'password', timestamp: now - 10 }] })}.sig`
}
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: fakeJwt(UID), token_type: 'bearer', expires_in: 86400 * 400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 400, refresh_token: 'r', user: USER }
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }

/* ---------------- seeds (as e2e-wellbeing.cjs) ---------------- */

const PROFILE = { name: 'Sam', sex: 'F', age: 34, height: 170, weight: 81.8, activityLevel: 'light', supplements: [], notificationsEnabled: false }
const SCHEDULE = { 0: 'Rest', 1: 'Push', 2: 'Cardio', 3: 'Pull', 4: 'Legs', 5: 'Cardio', 6: 'Rest' }
const dayOf = ({ foods = [], weight = null, checkin } = {}) => ({ foods, supps: {}, weight, workout: null, ...(checkin ? { checkin } : {}) })
const ci = (d, mood, sleep, stress, energy, hunger = 3) => ({ mood, hunger, sleep, stress, energy, sore: 0, note: '', t: d + 'T08:30:00.000Z' })
function deviceState({ days = {}, profile, schedule, at, routines }) {
  const u = at + 'T07:00:00.000Z'
  return {
    days, profile, schedule, consents: { records: [CONSENT] }, ...(routines ? { routines } : {}),
    _meta: { settings: { u, dirty: false }, days: Object.fromEntries(Object.keys(days).map((d) => [d, { u, dirty: false }])), foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}
function hardDay({ schedule = SCHEDULE } = {}) {
  const days = {}
  const ordinary = [[4, 2, 2, 2], [3, 2, 2, 2], [4, 3, 1, 3], [3, 2, 2, 2], [4, 2, 1, 2], [3, 3, 2, 2], [4, 2, 2, 3], [3, 2, 2, 2], [4, 3, 1, 2], [3, 2, 2, 2], [4, 2, 2, 2]]
  ;[1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13].forEach((n, i) => { const d = shift(HARD_DAY, -n); days[d] = dayOf({ checkin: ci(d, ...ordinary[i]) }) })
  days[HARD_DAY] = dayOf({ checkin: { mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1, sore: 0, note: '', t: HARD_DAY + 'T07:40:00.000Z' } })
  return { at: HARD_DAY, state: deviceState({ days, profile: { ...PROFILE }, schedule: { ...schedule }, at: HARD_DAY }) }
}
function hardDayWithLastTime() {
  const seed = hardDay()
  const d = shift(HARD_DAY, -7)
  seed.state.days[d].sessions = [{ id: 'e2e-legs-1', modality: 'strength', title: 'Legs & Core', routineId: 'builtin-Legs', at: d + 'T18:00:00.000Z',
    ex: [{ name: 'Barbell squat', exId: 'back-squat', log: 'weight-reps', rx: '3 × 10–12', sets: [{ w: '40', reps: '10' }, { w: '40', reps: '10' }, { w: '40', reps: '10' }] }] }]
  return seed
}
function roughNightOwnWorkout() {
  const seed = hardDay()
  seed.state.routines = [{ id: '99999999-8888-4777-8666-555555555555', name: 'Hill legs', modality: 'strength', effort: 'hard', source: 'custom', _dirty: true, _u: HARD_DAY + 'T07:00:00.000Z',
    blocks: [{ id: 'b1', kind: 'sets', slots: [{ exId: 'step-up', rx: '3 × 10–12' }, { exId: 'cardio-run', rx: '20–30 min' }, { exId: 'mountain-climber', rx: '3 × 20–30' }, { exId: 'back-squat', rx: '3 × 10–12' }] }] }]
  return seed
}
function ordinaryDay() {
  const days = {}
  for (let n = 1; n <= 10; n++) { const d = shift(ORDINARY_DAY, -n); days[d] = dayOf({ checkin: n % 2 ? ci(d, 4, 3, 1, 3) : undefined }) }
  days[ORDINARY_DAY] = dayOf({ checkin: ci(ORDINARY_DAY, 4, 3, 1, 3) })
  const s = deviceState({ days, profile: { ...PROFILE }, schedule: { ...SCHEDULE, 6: 'Push' }, at: ORDINARY_DAY })
  // something done on Friday, for "Done on" and the week dots
  s.days[shift(ORDINARY_DAY, -1)].sessions = [{ id: 'e2e-walk', modality: 'cardio', title: 'Brisk walk', at: shift(ORDINARY_DAY, -1) + 'T09:00:00.000Z', mins: 30, cardio: { key: 'Brisk walk', km: 2.5 } }]
  return { at: ORDINARY_DAY, state: s }
}

/* ---------------- the two apps ---------------- */

let bad = 0
const check = (name, ok, detail) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'train parity:', name, !ok && detail !== undefined ? JSON.stringify(detail).slice(0, 900) : '') }

async function open(browser, url, seed, scheme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, timezoneId: 'Europe/London' })
  await ctx.addInitScript(([s, data]) => {
    if (sessionStorage.getItem('e2e.seeded')) return
    sessionStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('sb-exvblofwiwbvycomxvmj-auth-token', s)
    localStorage.setItem('tali.mode', 'account')
    localStorage.setItem('leanplan.v1', data)
  }, [JSON.stringify(SESSION), JSON.stringify(seed.state)])
  // the in-memory PostgREST stand-in (as e2e-wellbeing.cjs): what the app uploads, it reads back
  const rows = { settings: [], day_logs: [], custom_foods: [], recipes: [], routines: [], training_plans: [], consents: [{ ...CONSENT, user_id: UID, recorded_at: CONSENT.at }] }
  const keyOf = (t) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request(), u = req.url()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (u.includes('/auth/v1/token')) return json(200, SESSION)
    if (u.includes('/auth/v1/user')) return json(200, USER)
    if (u.includes('/functions/v1/') || u.includes('/rest/v1/rpc/')) return json(200, {})
    const m = u.match(/\/rest\/v1\/([a-z_]+)/)
    if (!m) return json(200, {})
    const t = m[1]
    if (req.method() === 'GET') return json(200, rows[t] || [])
    for (const row of [].concat(JSON.parse(req.postData() || '[]'))) {
      const i = (rows[t] ||= []).findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) rows[t][i] = { ...rows[t][i], ...row }; else rows[t].push(row)
    }
    return route.fulfill({ status: 201, headers: cors, body: '' })
  })
  await ctx.route(/b-cdn\.net\//, (route) => route.fulfill({ status: 404, body: '' }))
  await ctx.clock.install({ time: new Date(seed.at + 'T12:00:00') })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  return { ctx, page, errors }
}

const isWeb = (p) => p.__web
/** a tab in the bottom bar */
async function tab(page, name) {
  if (isWeb(page)) await page.locator('nav.tabbar').getByRole('button', { name, exact: true }).click()
  else await page.getByRole('tab', { name }).or(page.locator('[role="tablist"]').getByText(name, { exact: true })).first().click()
}
const tap = (page, name) => page.getByRole('button', { name, exact: true }).or(page.getByRole('radio', { name, exact: true })).first().click()
const tapText = (page, text) => page.getByText(text, { exact: true }).first().click()

/** the screen's words, one per line, with spacing tidied (the native build nests text differently) */
async function lines(page) {
  // only what's on screen: expo-router keeps the other tabs mounted, hidden; a select's options aren't shown
  const t = await page.evaluate(() => {
    const out = []
    let last = null
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement
      // the web's screen-reader-only live region (.sr): native announces the same words instead
      if (!el || el.closest('option, script, style, [aria-hidden="true"], .sr')) continue
      if (el.closest('select')) continue
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      // text nodes of one element are one line ("Weights · Good place to start" is three nodes on the web)
      if (el === last) out[out.length - 1] += n.textContent; else out.push(n.textContent)
      last = el
    }
    // a select shows its chosen option
    for (const sel of document.querySelectorAll('select')) if (sel.checkVisibility()) out.push(sel.options[sel.selectedIndex]?.text ?? '')
    return out.join('\n')
  })
  return t.replace(/\u00a0/g, ' ').split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s && s.length > 1)
}
const flat = (ls) => ' ' + ls.join(' ').replace(/\s+/g, ' ') + ' '
/** Every web line shows on native and every native line on web (bar the tab bar, which N0 owns). */
async function same(name, w, n, ignore = []) {
  await Promise.all([w.waitForTimeout(500), n.waitForTimeout(500)])
  const lw = (await lines(w)).filter((l) => !ignore.some((r) => r.test(l)))
  const ln = (await lines(n)).filter((l) => !ignore.some((r) => r.test(l)))
  const fw = flat(lw), fn = flat(ln)
  if (process.env.DUMP && name.includes(process.env.DUMP)) console.log(JSON.stringify({ web: lw, native: ln }, null, 1))
  const missing = lw.filter((l) => !fn.includes(l))
  const extra = ln.filter((l) => !fw.includes(l))
  check(`${name}: native shows every web line`, !missing.length, missing)
  check(`${name}: native shows nothing the web doesn't`, !extra.length, extra)
}
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('leanplan.v1') || 'null'))
/** a saved session without its random id and clock times */
const sessionShape = (s) => s && ({ ...s, id: undefined, at: undefined, _u: undefined, mins: undefined })
/** the tab bar (N0) and the web's connection pill (N3), not Train's */
const TABBAR = [/^(Summary|Mind|Food|Train|Plan|Profile)$/, /^(Up to date|Offline|Syncing…|Saved on this device)$/]

async function both(browser, name, seed, steps) {
  if (ONLY && !name.startsWith(ONLY)) return
  for (const scheme of ['light', 'dark']) {
    const w = await open(browser, WEB, seed, scheme), n = await open(browser, NATIVE, seed, scheme)
    w.page.__web = true
    try {
      await steps(w.page, n.page, scheme, async (label) => {
        await w.page.screenshot({ path: path.join(OUT, `${name}-${label}-${scheme}-web.png`) })
        await n.page.screenshot({ path: path.join(OUT, `${name}-${label}-${scheme}-native.png`) })
      })
    } catch (e) {
      check(`${name} ${scheme}: ran to the end`, false, String(e).split('\n')[0])
      await w.page.screenshot({ path: path.join(OUT, `${name}-FAIL-${scheme}-web.png`) }).catch(() => {})
      await n.page.screenshot({ path: path.join(OUT, `${name}-FAIL-${scheme}-native.png`) }).catch(() => {})
    }
    check(`${name} ${scheme}: no page errors on web`, !w.errors.length, w.errors)
    check(`${name} ${scheme}: no page errors on native`, !n.errors.length, n.errors)
    await w.ctx.close(); await n.ctx.close()
  }
}

async function run() {
  const browser = await chromium.launch()
  const each = async (w, n, f) => { await f(w); await f(n) }
  const toTrain = (w, n) => each(w, n, async (p) => { await tab(p, 'Train'); await p.getByText('Done today', { exact: true }).or(p.getByText(/^Done on /)).first().waitFor({ timeout: 20000 }) })

  // wp8-ordinary-day: the lighter options folded, then open; the preview; Log sets by hand
  await both(browser, 'ordinary', ordinaryDay(), async (w, n, scheme, shot) => {
    await toTrain(w, n)
    await same('ordinary: Train', w, n, TABBAR)
    await shot('train')
    if (scheme !== 'light') return
    await each(w, n, (p) => tapText(p, 'Lighter options'))
    await same('ordinary: lighter options open', w, n, TABBAR)
    await each(w, n, (p) => tap(p, 'Start'))
    await each(w, n, (p) => p.getByText('Log sets by hand', { exact: true }).waitFor())
    await same('ordinary: preview', w, n, TABBAR)
    await shot('preview')
    await each(w, n, (p) => tapText(p, 'Log sets by hand'))
    await each(w, n, (p) => p.getByText("Type in what you did. Blank sets aren't saved.").waitFor())
    await same('ordinary: log sets by hand', w, n, TABBAR)
    await shot('manual')
  })

  // wp8-train-hard-day: the three tiles; Shorter's preview; the player, a set logged, rest, leave
  await both(browser, 'hard-day', hardDayWithLastTime(), async (w, n, scheme, shot) => {
    await toTrain(w, n)
    await each(w, n, (p) => p.getByText('Rough night? Here are a few options for today. All of them count.').waitFor())
    await same('hard day: Train', w, n, TABBAR)
    await shot('train')
    if (scheme !== 'light') return
    await each(w, n, (p) => p.getByText('10 sets · easier effort').first().click())
    await each(w, n, (p) => p.getByText('Shorter today: fewer sets, three or four reps to spare on each, and no adding weight. Change it any time.').waitFor())
    await same('hard day: Shorter preview', w, n, TABBAR)
    await shot('preview-shorter')
    await each(w, n, (p) => tap(p, 'Start'))
    // with the onboarding flag on, the session opens on the warm-up block: skip it (as e2e-wellbeing)
    await each(w, n, async (p) => {
      await p.getByText('Done as planned', { exact: true }).or(p.getByText('Skip warm-up', { exact: true })).first().waitFor()
      if (await p.getByText('Skip warm-up', { exact: true }).count()) await tapText(p, 'Skip warm-up')
      await p.getByText('Done as planned', { exact: true }).waitFor()
    })
    // the elapsed clock ticks on its own in each app: compare without it
    const clock = [/^\d+ of \d+( · \d\d:\d\d)?$/, ...TABBAR]
    await same('hard day: player', w, n, clock)
    await shot('player')
    await each(w, n, (p) => tapText(p, 'Done as planned'))
    await each(w, n, (p) => p.getByText('Skip rest', { exact: true }).waitFor())
    await same('hard day: rest', w, n, [...clock, /^\d:\d\d$/, /^of \d:\d\d$/])
    await shot('rest')
    await each(w, n, (p) => tapText(p, 'Skip rest'))
    await each(w, n, (p) => p.getByRole('button', { name: 'Leave the workout' }).first().click())
    await each(w, n, (p) => tapText(p, 'Leave for now'))
    // leaving keeps the preview open (as the web), with Continue
    await each(w, n, (p) => p.getByText('Continue', { exact: true }).waitFor())
    await same('hard day: preview after leaving', w, n, TABBAR)
    await each(w, n, (p) => tap(p, 'Today'))
    await each(w, n, (p) => p.getByText(/^In progress · 1 of \d+ sets$/).first().waitFor())
    const [sw, sn] = await Promise.all([stored(w), stored(n)])
    const a = sw?.days?.[HARD_DAY]?.sessions?.map(sessionShape), b = sn?.days?.[HARD_DAY]?.sessions?.map(sessionShape)
    check('hard day: the saved session is identical (exercises, sets, option, open)', JSON.stringify(a) === JSON.stringify(b) && !!a?.length, { web: a, native: b })
    await same('hard day: Train with the session in progress', w, n, TABBAR)
  })

  // wp8-rough-night: an own workout's Shorter swaps to steadier moves and leaves intervals out
  await both(browser, 'rough-night', roughNightOwnWorkout(), async (w, n, scheme, shot) => {
    if (scheme !== 'light') return
    await toTrain(w, n)
    await each(w, n, (p) => tapText(p, 'Add something'))
    await each(w, n, (p) => p.getByText('Hill legs', { exact: true }).waitFor())
    await same('rough night: Add something', w, n, TABBAR)
    await shot('add')
    await each(w, n, (p) => tapText(p, 'Hill legs'))
    await each(w, n, (p) => p.getByRole('radio', { name: 'Shorter' }).click())
    await each(w, n, (p) => p.getByText(/After a rough night, the shorter version swaps running/).waitFor())
    await same('rough night: Shorter preview', w, n, TABBAR)
    await shot('preview')
  })

  // wp8-cardio-day: the swap is 10-minute mobility and the effort note is the cardio one
  await both(browser, 'cardio-day', hardDay({ schedule: { ...SCHEDULE, 4: 'Cardio' } }), async (w, n, scheme, shot) => {
    await toTrain(w, n)
    await each(w, n, (p) => p.getByText('Shorter means fewer minutes at an easy pace, one where you could chat in full sentences.').waitFor())
    await same('cardio day: Train', w, n, TABBAR)
    await shot('train')
  })

  // Log a session (cardio, 30 min, 2 km): the saved session is the same
  await both(browser, 'log-session', ordinaryDay(), async (w, n, scheme, shot) => {
    if (scheme !== 'light') return
    await toTrain(w, n)
    await each(w, n, (p) => tapText(p, 'Add something'))
    await each(w, n, (p) => tapText(p, 'Log a session'))
    // a chip is a radio on the web and a selectable button in N1's Chip
    await each(w, n, (p) => p.getByRole('radio', { name: 'Cardio', exact: true }).or(p.getByRole('button', { name: 'Cardio', exact: true })).first().click())
    await same('log a session: sheet', w, n, TABBAR)
    await shot('sheet')
    await each(w, n, async (p) => { await p.getByLabel('Minutes').fill('30'); await p.getByLabel('Distance (km)').fill('2') })
    await each(w, n, (p) => p.getByRole('button', { name: 'Save', exact: true }).click())
    await each(w, n, (p) => p.getByText('Cardio · 30 min · 2 km').first().waitFor())
    const [sw, sn] = await Promise.all([stored(w), stored(n)])
    const a = sw?.days?.[ORDINARY_DAY]?.sessions?.map(sessionShape), b = sn?.days?.[ORDINARY_DAY]?.sessions?.map(sessionShape)
    check('log a session: the saved session is identical', JSON.stringify(a) === JSON.stringify(b) && !!a?.length, { web: a, native: b })
  })

  // the library: search, an entry with its steps, and the Back stack
  await both(browser, 'library', ordinaryDay(), async (w, n, scheme, shot) => {
    if (scheme !== 'light') return
    await toTrain(w, n)
    await each(w, n, (p) => tapText(p, 'Add something'))
    await each(w, n, (p) => tapText(p, 'Exercise library'))
    await each(w, n, (p) => p.getByLabel('Search exercises').fill('goblet'))
    await same('library: search', w, n, TABBAR)
    await each(w, n, (p) => p.getByText('Goblet squat', { exact: true }).first().click())
    await each(w, n, (p) => p.getByText(/Stop if you get chest pain/).first().waitFor())
    await same('library: entry', w, n, TABBAR)
    await shot('entry')
  })

  // the player's harder paths: Adjust with Stopped early and the pain check, the Stopped sheet, a
  // swap, Finish now with effort, minutes and a note; then Log sets by hand: the saved sessions match
  await both(browser, 'player-paths', ordinaryDay(), async (w, n, scheme, shot) => {
    if (scheme !== 'light') return
    const clock = [/^\d+ of \d+( · \d\d:\d\d)?$/, /^\d:\d\d$/, /^of \d:\d\d$/, ...TABBAR]
    await toTrain(w, n)
    await each(w, n, (p) => tap(p, 'Start'))
    await each(w, n, (p) => p.getByText('Log sets by hand', { exact: true }).waitFor())
    await each(w, n, (p) => tap(p, 'Start'))
    await each(w, n, async (p) => {
      await p.getByText('Done as planned', { exact: true }).or(p.getByText('Log set', { exact: true })).or(p.getByText('Skip warm-up', { exact: true })).first().waitFor()
      if (await p.getByText('Skip warm-up', { exact: true }).count()) await tapText(p, 'Skip warm-up')
    })
    await each(w, n, (p) => tapText(p, 'Adjust weight or reps'))
    await each(w, n, (p) => p.getByRole('radio', { name: 'Stopped early' }).click())
    await each(w, n, (p) => tapText(p, 'When to get help'))
    await each(w, n, (p) => p.getByText(/speak to a GP or physiotherapist/).first().waitFor())
    await same('player: Adjust, stopped early, when to get help', w, n, clock)
    await shot('adjust-stopped')
    await each(w, n, async (p) => { const f = p.locator('input:visible').and(p.getByLabel('Weight', { exact: true })).first(); if (await f.count()) await f.fill('22,5'.replace(',', isWeb(p) ? '.' : ',')) })
    await each(w, n, async (p) => { await p.locator('input:visible').and(p.getByLabel('Reps', { exact: true })).first().fill('6') })
    await each(w, n, (p) => p.getByRole('button', { name: 'Log set', exact: true }).last().click())
    await each(w, n, (p) => p.getByText("That's fine. If something hurt, leave this one for today.").waitFor())
    await same('player: the Stopped sheet', w, n, clock)
    await shot('stopped')
    await each(w, n, (p) => tapText(p, 'Move to the next exercise'))
    await each(w, n, (p) => p.getByRole('button', { name: 'More: swap, do this later, skip, sound' }).click())
    await each(w, n, (p) => p.getByText('Do this later', { exact: true }).waitFor())
    await same('player: the menu', w, n, clock)
    await each(w, n, (p) => tapText(p, 'Finish now'))
    await each(w, n, (p) => p.getByText('Back to workout', { exact: true }).waitFor())
    await same('player: Finish', w, n, clock)
    await shot('finish')
    await each(w, n, async (p) => {
      await p.getByRole('radio', { name: 'Hard', exact: true }).click()
      await p.locator('input:visible').and(p.getByLabel('Minutes', { exact: true })).last().fill('25')
      await p.locator('input:visible').and(p.getByLabel('Note', { exact: true })).first().fill('Felt the left knee')
      await p.getByRole('button', { name: 'Finish', exact: true }).last().click()
    })
    await each(w, n, (p) => p.getByText('Continue', { exact: true }).or(p.getByText(/^Done today$/)).first().waitFor())
    let [sw, sn] = await Promise.all([stored(w), stored(n)])
    const shape = (st) => st?.days?.[ORDINARY_DAY]?.sessions?.map((x) => ({ ...sessionShape(x), mins: x.mins }))
    check('player: the finished session is identical (stopped set, effort, minutes, note)', JSON.stringify(shape(sw)) === JSON.stringify(shape(sn)) && !!shape(sw)?.length, { web: shape(sw), native: shape(sn) })
    // Log sets by hand: edit the same session and save
    // Finish goes back to the list, where the session is in Done today: open it from there
    await each(w, n, (p) => p.getByRole('button', { name: /^Open Push/ }).first().click())
    await each(w, n, (p) => tapText(p, 'Edit sets by hand'))
    await each(w, n, (p) => p.getByText("Type in what you did. Blank sets aren't saved.").waitFor())
    await same('manual: editing a logged session', w, n, TABBAR)
    await each(w, n, async (p) => {
      await p.locator('input:visible').and(p.getByLabel('Set 2 weight', { exact: true })).first().fill('20')
      await p.locator('input:visible').and(p.getByLabel('Set 2 reps', { exact: true })).first().fill('10')
      await p.getByRole('button', { name: /^Save / }).first().click()
    })
    await each(w, n, (p) => p.getByText(/^(Continue|Start)$/).first().waitFor())
    ;[sw, sn] = await Promise.all([stored(w), stored(n)])
    check('manual: the saved session is identical', JSON.stringify(shape(sw)) === JSON.stringify(shape(sn)) && !!shape(sw)?.length, { web: shape(sw), native: shape(sn) })
  })

  // e2e-onboarding's warm-up cases (flag on): the day block in the preview, the warm-up player, a
  // move skipped, the block skipped, and the session records it (never as sets)
  if (process.env.ONBOARDING === '1') await both(browser, 'warmup', hardDayWithLastTime(), async (w, n, scheme, shot) => {
    await toTrain(w, n)
    await each(w, n, (p) => tap(p, 'Start'))
    await each(w, n, (p) => p.getByText('First', { exact: true }).waitFor())
    await same('warm-up: preview with the block', w, n, TABBAR)
    await shot('preview')
    if (scheme !== 'light') return
    await each(w, n, (p) => tap(p, 'Start'))
    await each(w, n, (p) => p.getByText('Skip warm-up', { exact: true }).waitFor())
    const clocks = [/^\d:\d\d$/, /^of \d:\d\d/, /^then /, ...TABBAR]
    await same('warm-up: the player', w, n, clocks)
    await shot('player')
    await each(w, n, (p) => tapText(p, 'Skip this move'))
    await each(w, n, (p) => p.getByText('Get ready', { exact: true }).waitFor())
    await same('warm-up: get ready for the next move', w, n, clocks)
    await each(w, n, (p) => tapText(p, 'Skip warm-up'))
    await each(w, n, (p) => p.getByText('Done as planned', { exact: true }).waitFor())
    await each(w, n, (p) => p.getByRole('button', { name: 'Leave the workout' }).first().click())
    await each(w, n, (p) => tapText(p, 'Leave for now'))
    await each(w, n, (p) => p.getByText('Continue', { exact: true }).or(p.getByText('Start', { exact: true })).first().waitFor())
    const [sw, sn] = await Promise.all([stored(w), stored(n)])
    const a = sw?.days?.[HARD_DAY]?.sessions?.map(sessionShape), b = sn?.days?.[HARD_DAY]?.sessions?.map(sessionShape)
    check('warm-up: what the session saved is identical', JSON.stringify(a) === JSON.stringify(b), { web: a, native: b })
  })

  await browser.close()
  console.log(bad ? `${bad} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(bad ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
