/**
 * The legal documents' names as links and rows show them (the documents themselves are written in
 * src/core/legal/ and published on the website). React-free, shared by the web and native apps.
 */
import type { LegalDocId } from '@/core/legal'

export const LEGAL_LABEL: Record<LegalDocId, string> = {
  privacy: 'Privacy policy',
  terms: 'Terms and conditions',
  cookies: 'Cookie policy',
}
