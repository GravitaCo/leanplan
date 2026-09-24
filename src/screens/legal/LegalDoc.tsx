import type { ReactNode } from 'react'
import { LEGAL_URLS, type LegalDocId } from '@/core/legal'

export const LEGAL_LABEL: Record<LegalDocId, string> = {
  privacy: 'Privacy policy',
  terms: 'Terms and conditions',
  cookies: 'Cookie policy',
}

/**
 * Link to a legal document on the website (www.tali.fit/legals/…). Opens outside the app,
 * so reading it never loses the screen the person is on. The text is written in
 * src/core/legal and published to Webflow (docs/compliance/README.md, "Publishing").
 */
export function LegalLink({ id, className, children }: { id: LegalDocId; className?: string; children?: ReactNode }) {
  return (
    <a href={LEGAL_URLS[id]} target="_blank" rel="noopener" className={className}>
      {children ?? LEGAL_LABEL[id]}
    </a>
  )
}

/** Old in-app links (/?doc=privacy, /?doc=terms) now live on the website. */
export function legalRedirect(): string | null {
  const d = new URLSearchParams(window.location.search).get('doc')
  return d === 'privacy' || d === 'terms' || d === 'cookies' ? LEGAL_URLS[d] : null
}
