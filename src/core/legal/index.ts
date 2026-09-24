/**
 * Legal texts and the facts they depend on. Pure data, no React, so a native build can
 * reuse it. Owned by the `compliance` agent: see docs/compliance/README.md.
 */

/**
 * Who runs Tali. `null` means not yet confirmed: it renders as a visible placeholder and
 * `npm run check:legal` fails until every value is filled. Never guess these.
 */
export const LEGAL = {
  /** registered legal name of the data controller */
  controller: 'Gravita Creative Ltd' as string | null,
  /** Companies House number (shown on the site: Companies (Trading Disclosures) Regs 2008) */
  companyNumber: '08348225' as string | null,
  /** registered office, as Companies House lists it */
  address: '64 Carlton Lane, Rothwell, Leeds, LS26 0SX' as string | null,
  /** inbox for privacy requests and complaints; must be monitored */
  contactEmail: 'benn@gravita.co' as string | null,
  /** ICO data protection fee registration number (ico.org.uk/fee). Not printed in the
   *  policies, but Tali must not go public until the fee is paid, so check:legal needs it. */
  icoNumber: null as string | null,
  /** law and courts that govern the terms (the company is registered in England and Wales) */
  jurisdiction: 'England and Wales' as string | null,
}

/** Minimum age to use Tali. */
export const MIN_AGE = 18

/**
 * Bump only when what people consent to changes materially (new data type, new
 * recipient, new purpose). Every user is asked again on their next launch.
 */
export const CONSENT_VERSION = '2026-09-24'

/** Where the documents are published: the Webflow site's "Legals" collection. The text is
 *  written here and pushed there (see docs/compliance/README.md, "Publishing"). */
export const SITE = 'https://www.tali.fit'
export const LEGAL_URLS: Record<LegalDocId, string> = {
  privacy: SITE + '/legals/privacy',
  terms: SITE + '/legals/terms',
  cookies: SITE + '/legals/cookie-policy',
}

export interface LegalSection {
  h: string
  p?: string[]
  ul?: string[]
}

export interface LegalDoc {
  title: string
  /** ISO date of the last change */
  updated: string
  intro: string
  sections: LegalSection[]
}

export type LegalDocId = 'privacy' | 'terms' | 'cookies'

/** A value from LEGAL, or a visible placeholder so a gap can't pass unnoticed. */
export function fact(key: keyof typeof LEGAL, label: string): string {
  return LEGAL[key] ?? `[to confirm: ${label}]`
}

/** Placeholders still left in a document's text (used by `npm run check:legal`). */
export function placeholdersIn(doc: LegalDoc): string[] {
  const all = [doc.intro, ...doc.sections.flatMap((s) => [s.h, ...(s.p ?? []), ...(s.ul ?? [])])].join('\n')
  return [...new Set(all.match(/\[to confirm: [^\]]+\]/g) ?? [])]
}
