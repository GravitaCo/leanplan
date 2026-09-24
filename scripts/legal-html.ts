/**
 * `npm run legal:html` — renders the legal documents in src/core/legal as HTML for the
 * Webflow "Legals" collection (rich-text `content` + `last-updated`), one entry per slug.
 * Writes node_modules/.cache/legal-html.json and prints a summary. The repo text is the
 * source of truth: publish from here, don't edit the pages in Webflow.
 */
import { writeFileSync } from 'node:fs'
import { LEGAL_URLS, type LegalDoc, type LegalDocId } from '@/core/legal'
import { privacyPolicy } from '@/core/legal/privacy'
import { termsOfUse } from '@/core/legal/terms'
import { cookiePolicy } from '@/core/legal/cookies'

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** escape, then turn URLs, emails and bare domains we name into links */
const inline = (t: string) =>
  esc(t)
    .replace(/https:\/\/[^\s,;)]+[^\s,;.)]/g, (u) => `<a href="${u}">${u.replace('https://', '')}</a>`)
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, (e) => `<a href="mailto:${e}">${e}</a>`)
    .replace(/(^|[\s(])(ico\.org\.uk)/g, '$1<a href="https://ico.org.uk">$2</a>')

export function toHtml(doc: LegalDoc): string {
  const out = [`<p>${inline(doc.intro)}</p>`]
  for (const s of doc.sections) {
    if (s.h) out.push(`<h2>${esc(s.h)}</h2>`)
    for (const p of s.p ?? []) out.push(`<p>${inline(p)}</p>`)
    if (s.ul) out.push(`<ul>${s.ul.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`)
  }
  return out.join('\n')
}

const docs: Record<LegalDocId, LegalDoc> = { privacy: privacyPolicy(), terms: termsOfUse(), cookies: cookiePolicy() }
const items = (Object.keys(docs) as LegalDocId[]).map((id) => ({
  id,
  name: docs[id].title,
  slug: LEGAL_URLS[id].split('/').pop()!,
  'last-updated': docs[id].updated + 'T00:00:00.000Z',
  content: toHtml(docs[id]),
}))
writeFileSync('node_modules/.cache/legal-html.json', JSON.stringify(items, null, 2))
for (const i of items) console.log(`${i.slug.padEnd(14)} ${i.name.padEnd(22)} ${i['last-updated'].slice(0, 10)}  ${i.content.length} chars`)
