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

// The ICO fee number isn't printed in any text, so it warns rather than blocks: a missing number
// must not hold back a compliance fix (like the consent screen). The fee is still owed: see the
// register's open items. Every fact the texts print is a hard failure.
for (const [k, v] of Object.entries(LEGAL)) {
  if (v) continue
  if (k === 'icoNumber') console.log('WARN LEGAL.icoNumber is not set: pay the ICO data protection fee (ico.org.uk/fee) and add the number')
  else fail(`LEGAL.${k} is not set`)
}
// every version of the gated texts: onboarding and Mind (wellbeing) each off, as now, and on, as
// published once ONBOARDING_ENABLED or WELLBEING_ENABLED goes on (scripts/legal-html.ts publishes
// with onboarding = ONBOARDING_ENABLED and mind = WELLBEING_ENABLED)
const combos = [false, true].flatMap((onboarding) => [false, true].map((mind) => ({ onboarding, mind })))
const gated = combos.flatMap((o) => [privacyPolicy(o), cookiePolicy(o), termsOfUse(o)])
const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b)
// each flag must change each document it gates, whatever the other flag is
for (const other of [false, true]) {
  const onb = (onboarding: boolean) => ({ onboarding, mind: other })
  const mnd = (mind: boolean) => ({ onboarding: other, mind })
  const tag = (f: string) => `(${f} ${other ? 'on' : 'off'})`
  if (same(privacyPolicy(onb(false)), privacyPolicy(onb(true)))) fail(`Privacy policy: the onboarding gate changes nothing ${tag('Mind')}`)
  if (same(cookiePolicy(onb(false)), cookiePolicy(onb(true)))) fail(`Cookie policy: the onboarding gate changes nothing ${tag('Mind')}`)
  if (same(termsOfUse(onb(false)), termsOfUse(onb(true)))) fail(`Terms: the onboarding gate changes nothing ${tag('Mind')}`)
  if (same(privacyPolicy(mnd(false)), privacyPolicy(mnd(true)))) fail(`Privacy policy: the Mind gate changes nothing ${tag('onboarding')}`)
  if (same(cookiePolicy(mnd(false)), cookiePolicy(mnd(true)))) fail(`Cookie policy: the Mind gate changes nothing ${tag('onboarding')}`)
  if (same(termsOfUse(mnd(false)), termsOfUse(mnd(true)))) fail(`Terms: the Mind gate changes nothing ${tag('onboarding')}`)
}
for (const doc of [...gated, sitePrivacy(), siteTerms(), siteCookies()]) {
  const ph = placeholdersIn(doc)
  if (ph.length) fail(`${doc.title}: ${ph.length} placeholder(s): ${ph.join(', ')}`)
  if (!doc.sections.length) fail(`${doc.title}: no sections`)
  const text = JSON.stringify(doc)
  if (text.includes('—')) fail(`${doc.title}: contains an em dash`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.updated)) fail(`${doc.title}: bad updated date`)
}
console.log(bad ? `\n${bad} legal check(s) failed: not ready to go live.` : 'Legal texts OK')
process.exit(bad ? 1 : 0)
