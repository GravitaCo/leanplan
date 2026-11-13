/**
 * Support and helplines until Mind's Support sheet (N9) lands: never a dead end (mental-performance,
 * 13 Nov 2026). The system alert lists the same services as the web's sheet with no nation picked
 * (supportList(null, { context: 'mind' })), each a button that calls or texts it, with the sheet's
 * own lead, not-a-crisis line and privacy foot. Like the sheet, it records nothing and sends nothing.
 * For internal test builds only: N9's sheet replaces it before any external release.
 */
import { Alert, Linking, type AlertButton } from 'react-native'
import { supportList } from '@/screens/profile/supportRows'
import { SUPPORT } from '@/copy/onboardingApp'
import { SUPPORT_MIND } from '@/copy/mind'

export function openSupportStandIn(): void {
  const rows = supportList(null, { context: 'mind' })
  const buttons: AlertButton[] = rows
    .filter((r) => r.tel || r.sms)
    .map((r) => ({
      text: `${r.name}: ${r.sms ? 'text' : 'call'} ${r.num}`,
      onPress: () => { Linking.openURL(r.sms ?? 'tel:' + r.tel!.replace(/\s/g, '')).catch(() => {}) },
    }))
  Alert.alert(SUPPORT.title, `${SUPPORT.lead}\n\n${SUPPORT_MIND.notCrisis}\n\n${SUPPORT_MIND.foot}`, [...buttons, { text: 'Close', style: 'cancel' }])
}
