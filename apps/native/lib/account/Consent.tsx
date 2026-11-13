/**
 * Explicit consent before Tilo stores anyone's health data (UK/EU GDPR Art. 9(2)(a)), as
 * src/screens/legal/ConsentScreen.tsx on the web: shown after sign-in until the person has answered
 * the current version; sync waits for it (the shared store's rule). Each statement is its own
 * unticked box: never pre-ticked or bundled. The records are the web's, through the shared store and
 * src/data/consent.ts. Works offline: the record saves on the phone first.
 *
 * Also the privacy sheets (src/screens/legal/PrivacySheets.tsx, onboarding/Consent.tsx PrivacySheet).
 * Words: src/copy/account.ts. Pieces: lib/ui (N1).
 */
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LEGAL, MIN_AGE } from '@/core/legal'
import { useStore } from '@/store/store'
import { useConsent } from '@/store/hooks'
import { hasExistingData, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { CONSENT, PRIVACY_SHEET, REGRANT } from '@/copy/account'
import { tx, useTokens } from '../theme'
import { Btn, Card, LinkBtn, List } from '../ui/kit'
import { NavBtn, Sheet } from '../ui/primitives'
import { Icon } from '../ui/icons'
import { openLegal } from './legal'

export function ConsentScreen({ fromProfile = false }: { fromProfile?: boolean }) {
  const t = useTokens()
  const ins = useSafeAreaInsets()
  const grantConsent = useStore((s) => s.grantConsent)
  const signOut = useStore((s) => s.signOut)
  const notNow = useStore((s) => s.notNowHealth)
  const setConsentOpen = useStore((s) => s.setConsentOpen)
  // someone who used Tilo before consent was asked may say "Not now": everything stays on this
  // phone and nothing syncs until they agree (asked once more after 2 weeks); for someone new,
  // "Not now" is signing out, since there's nothing to keep
  const existing = useStore((s) => hasExistingData(s.data) && !latestConsent(s.data, 'health'))
  const reasked = useStore((s) => healthSyncPaused(s.data))
  const [health, setHealth] = useState(false)
  const [terms, setTerms] = useState(false)
  const [adult, setAdult] = useState(false)
  // .consent-screen .foot: 13 pt, centred
  const foot = [tx(13, 400, 1.38), { color: t.label2, textAlign: 'center' as const, paddingTop: 7, paddingHorizontal: 16 }]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Math.max(24, ins.top), paddingBottom: 24 + ins.bottom }}>
      <Text accessibilityRole="header" style={[tx(28, 700, 1.2), { color: t.label }]}>{CONSENT.title}</Text>
      <Text style={[tx(15, 400, 1.45), { color: t.label2, marginBottom: 4 }]}>{CONSENT.lead}</Text>

      <List>
        <ConsentBox id="c_health" on={health} onChange={setHealth}>
          {CONSENT.health.before}<Link onPress={() => openLegal('privacy')}>{CONSENT.health.link}</Link>{CONSENT.health.after}
        </ConsentBox>
        <ConsentBox id="c_terms" on={terms} onChange={setTerms}>
          {CONSENT.terms.before}<Link onPress={() => openLegal('terms')}>{CONSENT.terms.link}</Link>{CONSENT.terms.after}
        </ConsentBox>
        <ConsentBox id="c_age" on={adult} onChange={setAdult}>{CONSENT.adult(MIN_AGE)}</ConsentBox>
      </List>

      <Btn title={CONSENT.cont} disabled={!(health && terms && adult)} onPress={() => { grantConsent('health'); if (fromProfile) setConsentOpen(false) }} />
      {fromProfile ? (
        <Btn kind="gray" title={CONSENT.back} onPress={() => setConsentOpen(false)} />
      ) : existing ? (
        <>
          <Btn kind="gray" title={CONSENT.notNowKeep} onPress={notNow} />
          <Text style={foot}>
            {CONSENT.notNowFoot} {unconsentedCopyLine()}{' '}
            {reasked ? CONSENT.reasked : CONSENT.askAgain}
          </Text>
          <View style={{ alignItems: 'center' }}><LinkBtn title={CONSENT.signOut} muted onPress={() => void signOut()} /></View>
        </>
      ) : (
        <Btn kind="gray" title={CONSENT.notNowSignOut} onPress={() => void signOut()} />
      )}
      <Text style={foot}>{CONSENT.deleteFoot(LEGAL.contactEmail)}</Text>
      <Text style={foot}>{CONSENT.gpFoot}</Text>
    </ScrollView>
  )
}

/**
 * Giving health consent again after a withdrawal: the same explicit statement and unticked box as
 * the consent screen, never a bare tap (Art. 7: consent must be specific and informed).
 */
export function RegrantHealthSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const { grant } = useConsent('health')
  const [on, setOn] = useState(false)
  return (
    <Sheet title={REGRANT.title} onClose={onClose}>
      <View style={{ gap: 10 }}>
        <Card plain><Text style={[tx(15, 400, 1.45), { color: t.label }]}>{REGRANT.lead}</Text></Card>
        <List>
          <ConsentBox id="c_regrant" on={on} onChange={setOn}>
            {REGRANT.box.before}<Link onPress={() => openLegal('privacy')}>{REGRANT.box.link}</Link>{REGRANT.box.after}
          </ConsentBox>
        </List>
        <Btn title={REGRANT.cta} disabled={!on} onPress={() => { grant(); onClose() }} />
      </View>
    </Sheet>
  )
}

/** "Read the privacy notice" / "What's sent, and where": the short privacy text, and the policy. */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  return (
    <Sheet title={PRIVACY_SHEET.title} onClose={onClose} left={null} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <View style={{ paddingHorizontal: 4, gap: 10 }}>
        <P color={t.label2}>{PRIVACY_SHEET.p1}</P>
        <P color={t.label2}>{PRIVACY_SHEET.p2.before}<Link onPress={() => openLegal('privacy')}>{PRIVACY_SHEET.p2.link}</Link>{PRIVACY_SHEET.p2.after}</P>
      </View>
    </Sheet>
  )
}

/** `.prose` paragraph: 15 pt, 1.45. */
export function P({ children, color }: { children: ReactNode; color?: string }) {
  const t = useTokens()
  return <Text style={[tx(15, 400, 1.45), { color: color ?? t.label }]}>{children}</Text>
}

/** An `<a>` inside a sentence: the tint colour, its own tap (the website's legal pages). */
export function Link({ children, onPress, underline }: { children: ReactNode; onPress: () => void; underline?: boolean }) {
  const t = useTokens()
  return <Text accessibilityRole="link" onPress={onPress} suppressHighlighting style={[{ color: t.tint }, underline && { textDecorationLine: 'underline' }]}>{children}</Text>
}

/**
 * `.li.consent-row`: a statement and its own unticked box (22 pt, the browser's checkbox margins),
 * tapping the box or the words ticks it, a link inside opens the link.
 * TODO(N1-followup): a checkbox row in lib/ui (fields); this is the web markup as the spec.
 */
function ConsentBox({ on, onChange, id, children }: { on: boolean; onChange: (v: boolean) => void; id: string; children: ReactNode }) {
  const t = useTokens()
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={id} onPress={() => onChange(!on)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
      <View style={{ width: 22, height: 22, marginTop: 1, marginLeft: 4, marginRight: 3, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: t.label3 }}>
        {on && <Icon name="check" size={16} stroke={2.8} color={t.onTint} />}
      </View>
      <Text style={[tx(15, 400, 1.4), { flex: 1, color: t.label }]}>{children}</Text>
    </Pressable>
  )
}
