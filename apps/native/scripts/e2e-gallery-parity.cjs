/**
 * Component gallery parity, web against native (native-build-plan N1: "every component in every
 * state against the web's rendering, side by side, light and dark").
 *
 * Opens the web twin of the gallery (scripts/web-gallery: the web's own src/ui components and
 * style sheets) and the native gallery (lib/Gallery.tsx at /gallery, rendered for the web by
 * react-native-web) on the same seeded account, then for every section, light and dark:
 *  - writes web.png, native.png and a side-by-side side.png to E2E_OUT for `design`;
 *  - checks the words match, the accessibility labels match (aria-label on web, accessibilityLabel
 *    on native), the icons draw at the same sizes, and the section's height is within 2 px.
 * The two sheets are opened and captured full screen the same way.
 *
 *   (repo root) npx vite --config apps/native/scripts/web-gallery/vite.config.mjs --port 4179 &
 *   (apps/native) npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   NODE_PATH=$(npm root -g) node scripts/e2e-gallery-parity.cjs
 *
 * A web render is not the phone (fonts rasterise differently and there are no safe areas), so the
 * pictures are for review and the numbers check what a browser can measure.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const { state, open, check, failures, outDir } = require('./e2e-common.cjs')

const WEB = process.env.WEB_GALLERY_URL || 'http://localhost:4179/'
const NATIVE = (process.env.NATIVE_URL || 'http://localhost:4188/') + 'gallery'
const OUT = outDir('tilo-gallery-')
const SECTIONS = ['header', 'pill', 'icons', 'tabbar', 'cathead', 'seg', 'toggle', 'rows', 'nav', 'buttons', 'cards', 'charts', 'macro', 'weekbars',
  'weekstrip', 'movestrip', 'ruler', 'wheel', 'choice', 'check', 'banner', 'toast', 'mark', 'sheets']
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

const webSec = (id) => `[data-g="${id}"]`
const natSec = (id) => `[data-testid="g-${id}"]`

/** What a browser can measure about one section: its words, labels, icon sizes and height. */
async function measure(page, sel) {
  return page.locator(sel).evaluate((el) => {
    const r = el.getBoundingClientRect()
    const words = el.innerText.replace(/\s+/g, ' ').trim()
    const labels = [...el.querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')).filter(Boolean)
    if (el.getAttribute('aria-label')) labels.unshift(el.getAttribute('aria-label'))
    // icons: the 24-unit line icons only (charts and the mark have other viewBoxes)
    const icons = [...el.querySelectorAll('svg')].filter((s) => s.getAttribute('viewBox') === '0 0 24 24')
      .map((s) => { const b = s.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}` }).filter((x) => x !== '0x0')
    return { h: Math.round(r.height), words, labels: [...new Set(labels)].sort(), icons: icons.sort() }
  })
}

async function sideBySide(browser, a, b, out, title) {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  const src = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
  await page.setContent(`<body style="margin:0;font:13px system-ui;background:#888;display:flex;gap:12px;padding:12px;align-items:flex-start">
    <figure style="margin:0"><figcaption style="color:#fff;margin-bottom:4px">Web · ${title}</figcaption><img src="${src(a)}" style="width:390px;display:block"></figure>
    <figure style="margin:0"><figcaption style="color:#fff;margin-bottom:4px">Native · ${title}</figcaption><img src="${src(b)}" style="width:390px;display:block"></figure></body>`)
  await page.screenshot({ path: out, fullPage: true })
  await page.close()
}

async function run() {
  const browser = await chromium.launch()
  for (const scheme of ['light', 'dark']) {
    const st = state()
    const w = await open(browser, WEB, st, scheme, (p) => p.locator(webSec('sheets')).waitFor({ timeout: 20000 }))
    const n = await open(browser, NATIVE, st, scheme, (p) => p.locator(natSec('sheets')).waitFor({ timeout: 30000 }))
    await Promise.all([w.page.evaluate(() => document.fonts.ready), n.page.evaluate(() => document.fonts.ready)])
    await w.page.waitForTimeout(400); await n.page.waitForTimeout(400)
    for (const id of SECTIONS) {
      if (ONLY && !ONLY.includes(id)) continue
      const dir = path.join(OUT, id)
      fs.mkdirSync(dir, { recursive: true })
      const fw = path.join(dir, `${scheme}-web.png`), fn = path.join(dir, `${scheme}-native.png`)
      await w.page.locator(webSec(id)).screenshot({ path: fw })
      await n.page.locator(natSec(id)).screenshot({ path: fn })
      await sideBySide(browser, fw, fn, path.join(dir, `${scheme}-side.png`), `${id} · ${scheme}`)
      if (scheme !== 'light') continue
      const mw = await measure(w.page, webSec(id)), mn = await measure(n.page, natSec(id))
      check(`${id}: words match`, mw.words === mn.words, { web: mw.words, native: mn.words })
      check(`${id}: accessibility labels match`, JSON.stringify(mw.labels) === JSON.stringify(mn.labels), { web: mw.labels, native: mn.labels })
      check(`${id}: icon sizes match`, JSON.stringify(mw.icons) === JSON.stringify(mn.icons), { web: mw.icons, native: mn.icons })
      check(`${id}: height within 2 px (web ${mw.h}, native ${mn.h})`, Math.abs(mw.h - mn.h) <= 2, { web: mw.h, native: mn.h })
    }
    // the sheets, full screen
    for (const [btn, name, close] of [['Open a sheet', 'sheet', 'Cancel'], ['Open a bare sheet', 'baresheet', null]]) {
      if (ONLY && !ONLY.includes('sheets')) break
      const dir = path.join(OUT, name)
      fs.mkdirSync(dir, { recursive: true })
      for (const [x, tag] of [[w, 'web'], [n, 'native']]) {
        await x.page.getByText(btn, { exact: true }).click()
        await x.page.waitForTimeout(700)
        await x.page.screenshot({ path: path.join(dir, `${scheme}-${tag}.png`) })
        if (close) await x.page.getByText(close, { exact: true }).last().click()
        else await x.page.mouse.click(195, 60)
        await x.page.waitForTimeout(300)
      }
      await sideBySide(browser, path.join(dir, `${scheme}-web.png`), path.join(dir, `${scheme}-native.png`), path.join(dir, `${scheme}-side.png`), `${name} · ${scheme}`)
    }
    check(`${scheme}: no page errors on web`, !w.errors.length, w.errors)
    check(`${scheme}: no page errors on native`, !n.errors.length, n.errors)
    await w.ctx.close(); await n.ctx.close()
  }
  await browser.close()
  console.log(failures() ? `${failures()} failed` : 'all passed', '· screenshots in', OUT)
  process.exit(failures() ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
