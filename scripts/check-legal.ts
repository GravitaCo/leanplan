/**
 * `npm run check:legal` — release gate for the legal texts. Fails while any fact in
 * src/core/legal/index.ts (LEGAL) is unconfirmed, or a document has an empty body or a
 * stray em dash. Run before merging to main.
 */
import { LEGAL, placeholdersIn } from '@/core/legal'
import { privacyPolicy } from '@/core/legal/privacy'
import { termsOfUse } from '@/core/legal/terms'
import { cookiePolicy } from '@/core/legal/cookies'
import { sitePrivacy, siteTerms, siteCookies } from '@/core/legal/website'

let bad = 0
const fail = (m: string) => { bad++; console.log('FAIL', m) }

for (const [k, v] of Object.entries(LEGAL)) if (!v) fail(`LEGAL.${k} is not set`)
for (const doc of [privacyPolicy(), termsOfUse(), cookiePolicy(), sitePrivacy(), siteTerms(), siteCookies()]) {
  const ph = placeholdersIn(doc)
  if (ph.length) fail(`${doc.title}: ${ph.length} placeholder(s): ${ph.join(', ')}`)
  if (!doc.sections.length) fail(`${doc.title}: no sections`)
  const text = JSON.stringify(doc)
  if (text.includes('—')) fail(`${doc.title}: contains an em dash`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.updated)) fail(`${doc.title}: bad updated date`)
}
console.log(bad ? `\n${bad} legal check(s) failed: not ready to go live.` : 'Legal texts OK')
process.exit(bad ? 1 : 0)
