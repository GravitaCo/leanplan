/* Legal parity (compliance close-out 2026-10-09, finding A): with Mind off, the three legal texts
   must render exactly what main publishes, so merging the wellbeing branch changes no published
   wording. The fixture is main's own src/core/legal rendered with no arguments (privacyPolicy(),
   termsOfUse(), cookiePolicy()), committed as scripts/fixtures-legal-main.json. Equal documents
   give equal Webflow HTML (scripts/legal-html.ts renders from the document alone).
   When main's legal text changes on purpose, regenerate the fixture from main: export main's src
   with `git archive origin/main src`, bundle a script that writes those three calls as JSON with
   esbuild aliasing @ to the export, and commit the output. Also checks the Mind-only sentences
   (finding B, C, D). Run from scripts/test-wellbeing.ts; returns the number of failures. */
import { privacyPolicy } from '@/core/legal/privacy'
import { termsOfUse } from '@/core/legal/terms'
import { cookiePolicy } from '@/core/legal/cookies'
import MAIN from '../fixtures-legal-main.json'

const flat = (d: { intro: string; sections: { p?: string[]; ul?: string[] }[] }) =>
  [d.intro, ...d.sections.flatMap((s) => [...(s.p ?? []), ...(s.ul ?? [])])].join('\n')

export function legalSuite(): number {
  let bad = 0
  const ok = (name: string, cond: boolean) => {
    if (!cond) bad++
    console.log(cond ? 'PASS' : 'FAIL', 'legal: ' + name)
  }
  const docs = { privacy: privacyPolicy({ mind: false }), terms: termsOfUse({ mind: false }), cookies: cookiePolicy({ mind: false }) }
  for (const id of ['privacy', 'terms', 'cookies'] as const) {
    const same = JSON.stringify(docs[id]) === JSON.stringify(MAIN[id])
    ok(`${id} with Mind off is exactly main's published text`, same)
    if (!same) {
      const a = flat(docs[id]).split('\n'), b = flat(MAIN[id]).split('\n')
      const i = a.findIndex((l, n) => l !== b[n])
      if (i >= 0) console.log(`  first difference:\n  branch: ${a[i]}\n  main:   ${b[i]}`)
    }
  }
  // the defaults are the Mind-off texts, as main calls them
  ok('defaults equal Mind off', JSON.stringify([privacyPolicy(), termsOfUse(), cookiePolicy()]) === JSON.stringify([docs.privacy, docs.terms, docs.cookies]))

  const tOn = flat(termsOfUse({ mind: true })), tOff = flat(docs.terms)
  ok('terms: Mind paragraph only with Mind on', tOn.includes("It isn't therapy or counselling, and it isn't a crisis service.") && !tOff.includes('crisis service'))
  ok('terms: nobody is alerted, not "doesn\'t monitor how you answer"', tOn.includes('nobody is alerted because of how you answer') && !tOn.includes('monitor how you answer'))
  const pOn = flat(privacyPolicy({ mind: true })), pOff = flat(docs.privacy)
  ok('privacy: low-mood signpost only with Mind on', pOn.includes('at most once a month on each phone') && !pOff.includes('Low or Rough'))
  ok('privacy: time zone saved only while a reminder is on', pOn.includes('saved when you change these reminder settings while one of them is on') && !pOn.includes('saved when you change your reminder settings,'))
  return bad
}
