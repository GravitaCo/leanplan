/**
 * Legal documents (src/screens/legal/LegalDoc.tsx on the web): the texts are written in src/core/legal
 * and published on the website (www.tilo.fit/legals/…). The app opens them there, outside the app,
 * as the web opens a new tab, so reading one never loses the screen the person is on.
 */
import { Linking } from 'react-native'
import { LEGAL_URLS, type LegalDocId } from '@/core/legal'

export const LEGAL_LABEL: Record<LegalDocId, string> = {
  privacy: 'Privacy policy',
  terms: 'Terms and conditions',
  cookies: 'Cookie policy',
}

export function openLegal(id: LegalDocId): void {
  void Linking.openURL(LEGAL_URLS[id]).catch(() => {})
}

/** A phone number or web page from a signpost list (tel: links, Beat's webchat). */
export function openLink(url: string): void {
  void Linking.openURL(url).catch(() => {})
}
