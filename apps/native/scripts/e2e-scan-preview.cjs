/**
 * The scan screens in every state (app/scan-preview, EXPO_PUBLIC_E2E builds only), light and dark:
 * screenshots for `design` and for Benn and Sara, plus checks of the words each state shows (the
 * web's, from src/copy/scan.ts) and of the barcode screen's own behaviour (a bad check digit, a
 * lookup). The camera isn't available in a browser, so the camera states show the web's "No camera
 * is available here" note; the live camera, the quality line and the review are device checks.
 *
 *   (apps/native) EXPO_PUBLIC_E2E=1 npx expo export --platform web --output-dir dist-web && npx serve -s dist-web -l 4188 &
 *   NATIVE_URL=http://localhost:4188/ node scripts/e2e-scan-preview.cjs
 *
 * Every Supabase request and Open Food Facts are answered in memory; nothing real is reached.
 */
const { chromium } = require('playwright')
const path = require('node:path')
const { state, open, check, failures, outDir } = require('./e2e-common.cjs')

const NATIVE = process.env.NATIVE_URL || 'http://localhost:4188/'
const OUT = outDir('tilo-scan-')

const STATES = {
  scan: ['Scan barcode', 'No camera is available here. Take a photo of the barcode, or type the number below.', 'Take a photo', 'Or type the number', 'Look up', 'Values come from Open Food Facts, a shared database. You’ll check them against your pack before saving.'],
  label: ['Scan the label', 'Before your first photo', 'OK, take a photo', 'Type it in instead', 'Nothing else about you is sent.'],
  'label-share': ['Scan the label', 'Before your first photo', 'OK, take a photo'],
  'confirm-off': ['Check the label', 'Pack label via Open Food Facts: check against your pack.', 'Barcode 5000157024671', 'Photo of the label', 'Nutrition', 'Save food', 'Grams unless shown. The per 100 g column is what’s saved.'],
  'confirm-label': ['Check the label', 'Your pack label (read from your photo).', 'Barcode 5012345678900', 'These numbers are consistent with each other.'],
  'confirm-misread': ['Check the label', 'Did you mean', 'Accept'],
  'confirm-unchecked': ['Check the label', 'Report this product', 'One serving'],
  'confirm-counted': ['Check the label', 'Read from the pack 3 times', 'One serving'],
  'confirm-verified': ['Check the label', 'Checked by Tilo, Oct 2026', 'Only Tilo’s own checks set this.'],
  'share-label': ['Check the label', 'Share this product', 'Barcode, name and figures only, never who added them.', 'Your saved Oat & raisin flapjack takes these figures too.'],
  optin: ['Add new products you scan to Tilo’s shared list?', 'Yes, share new products', 'Not now', 'Terms and conditions'],
  report: ['Report this product', 'What’s wrong?', 'Figures don’t match the pack', 'Wrong product', 'Offensive or personal details in the name', 'Something else', 'Send'],
  inoff: ['Open Food Facts already has this product', 'Anyone who scans it gets it, so there’s nothing to share.', 'OK'],
  'row-on': ['Share this product', 'Helps others who scan this barcode'],
  'row-offline': ['Share this product', 'Needs a connection.'],
}

async function shows(page, text) {
  try { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 }); return true } catch { return false }
}

;(async () => {
  const browser = await chromium.launch()
  for (const scheme of ['light', 'dark']) {
    for (const [s, words] of Object.entries(STATES)) {
      const { ctx, page, errors } = await open(browser, `${NATIVE}scan-preview?s=${s}`, state(), scheme, (p) => p.getByTestId(`scan-preview-${s}`).waitFor({ timeout: 20000 }))
      const missing = []
      for (const w of words) if (!(await shows(page, w))) missing.push(w)
      check(`${s} (${scheme}): the web's words`, missing.length === 0, missing)
      check(`${s} (${scheme}): no page errors`, errors.length === 0, errors)
      await page.screenshot({ path: path.join(OUT, `${s}-${scheme}.png`) })
      await ctx.close()
    }
  }

  // the barcode screen's behaviour: a bad check digit says so; a valid code shows "Looking up"
  const { ctx, page } = await open(browser, `${NATIVE}scan-preview?s=scan`, state(), 'light', (p) => p.getByTestId('scan-preview-scan').waitFor({ timeout: 20000 }))
  await ctx.route(/openfoodfacts\.org/, (r) => new Promise((res) => setTimeout(() => res(r.fulfill({ status: 404, body: '{"status":0}' })), 1500)))
  await page.getByRole('textbox', { name: 'Barcode' }).fill('5000157024672')
  await page.getByRole('button', { name: 'Look up' }).click()
  check('scan: a bad check digit says so', await shows(page, 'That number doesn’t look right'))
  await page.getByRole('textbox', { name: 'Barcode' }).fill('5000157024671')
  await page.getByRole('button', { name: 'Look up' }).click()
  check('scan: a valid code shows Looking up', await shows(page, 'Looking up'))
  await page.screenshot({ path: path.join(OUT, 'scan-looking-up-light.png') })
  await ctx.close()

  await browser.close()
  console.log(failures() ? `${failures()} failed · screenshots in ${OUT}` : `all passed · screenshots in ${OUT}`)
  process.exit(failures() ? 1 : 0)
})()
