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
const path = require('node:path')
const { state, open, check, failures, outDir } = require('./e2e-common.cjs')

const WEB = process.env.WEB_URL || 'http://localhost:4177/'
const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = outDir('tilo-parity-')

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
  console.log(failures() ? `${failures()} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(failures() ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
