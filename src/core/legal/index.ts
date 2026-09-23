/**
 * Legal texts and the facts they depend on. Pure data, no React, so a native build can
 * reuse it. Owned by the `compliance` agent: see docs/compliance/README.md.
 */

/**
 * Who runs Tali. `null` means not yet confirmed: it renders as a visible placeholder and
 * `npm run check:legal` fails until every value is filled. Never guess these.
 */
export const LEGAL = {
  /** registered legal name of the data controller (company or sole trader) */
  controller: null as string | null,
  /** registered or trading address for legal notices */
  address: null as string | null,
  /** inbox for privacy requests and complaints; must be monitored */
  contactEmail: null as string | null,
  /** ICO data protection fee registration number (ico.org.uk/fee) */
  icoNumber: null as string | null,
  /** law and courts that govern the terms, e.g. "England and Wales" */
  jurisdiction: null as string | null,
  /** how long the database provider keeps backups after deletion, e.g. "7 days" */
  backupRetention: null as string | null,
}

/** Minimum age to use Tali. */
export const MIN_AGE = 18

/**
 * Bump only when what people consent to changes materially (new data type, new
 * recipient, new purpose). Every user is asked again on their next launch.
 */
export const CONSENT_VERSION = '2026-09-23'

export const LEGAL_URLS = {
  privacy: 'https://tali.fit/?doc=privacy',
  terms: 'https://tali.fit/?doc=terms',
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

export type LegalDocId = 'privacy' | 'terms'

/** A value from LEGAL, or a visible placeholder so a gap can't pass unnoticed. */
export function fact(key: keyof typeof LEGAL, label: string): string {
  return LEGAL[key] ?? `[to confirm: ${label}]`
}

/** Placeholders still left in a document's text (used by `npm run check:legal`). */
export function placeholdersIn(doc: LegalDoc): string[] {
  const all = [doc.intro, ...doc.sections.flatMap((s) => [s.h, ...(s.p ?? []), ...(s.ul ?? [])])].join('\n')
  return [...new Set(all.match(/\[to confirm: [^\]]+\]/g) ?? [])]
}
