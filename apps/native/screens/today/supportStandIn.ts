/**
 * Support and helplines until Mind's Support sheet (N9) lands: never a dead end (mental-performance,
 * 13 Nov 2026). A system alert holds the web sheet's services with no nation picked
 * (supportList(null, { context: 'mind' })), each with its number, the sheet's lead, not-a-crisis
 * line and privacy foot, and buttons that call or text (supportAlert.ts: what fits each platform).
 * It can always be closed. Like the sheet, it records nothing and sends nothing. Internal test
 * builds only: N9's sheet replaces it before any external release.
 */
import { Alert, Linking, Platform } from 'react-native'
import { supportList } from '@/screens/profile/supportRows'
import { SUPPORT } from '@/copy/onboardingApp'
import { SUPPORT_MIND } from '@/copy/mind'
import { supportAlert } from './supportAlert'

export function openSupportStandIn(): void {
  const a = supportAlert(supportList(null, { context: 'mind' }), Platform.OS, { lead: SUPPORT.lead, notCrisis: SUPPORT_MIND.notCrisis, foot: SUPPORT_MIND.foot })
  Alert.alert(SUPPORT.title, a.message, a.buttons.map((b) => (b.cancel
    ? { text: b.text, style: 'cancel' as const }
    : { text: b.text, onPress: () => { Linking.openURL(b.href!).catch(() => {}) } })), { cancelable: true })
}
