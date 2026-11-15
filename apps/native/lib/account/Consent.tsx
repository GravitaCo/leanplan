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
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LEGAL, MIN_AGE } from '@/core/legal'
import { useStore } from '@/store/store'
import { useConsent } from '@/store/hooks'
import { hasExistingData, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { CONSENT, PRIVACY_SHEET, REGRANT } from '@/copy/account'
import { BTN, tx, useTokens } from '../theme'
import { Btn, Card, LinkBtn, List } from '../ui/kit'
import { Sub } from '../ui/text'
import { ConsentRow } from '../ui/choices'
import { NavBtn, Sheet } from '../ui/primitives'
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
        <ConsentRow label={CONSENT.health.before + CONSENT.health.link + CONSENT.health.after} on={health} onChange={setHealth}>
          {CONSENT.health.before}<Link onPress={() => openLegal('privacy')}>{CONSENT.health.link}</Link>{CONSENT.health.after}
        </ConsentRow>
        <ConsentRow label={CONSENT.terms.before + CONSENT.terms.link + CONSENT.terms.after} on={terms} onChange={setTerms}>
          {CONSENT.terms.before}<Link onPress={() => openLegal('terms')}>{CONSENT.terms.link}</Link>{CONSENT.terms.after}
        </ConsentRow>
        <ConsentRow label={CONSENT.adult(MIN_AGE)} on={adult} onChange={setAdult}>{CONSENT.adult(MIN_AGE)}</ConsentRow>
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
          <View style={{ alignItems: 'center' }}><LinkBtn title={CONSENT.signOut} muted onPress={() => void signOut()} style={tx(15, 400, 1.3, BTN)} /></View>
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
          <ConsentRow label={REGRANT.box.before + REGRANT.box.link + REGRANT.box.after} on={on} onChange={setOn}>
            {REGRANT.box.before}<Link onPress={() => openLegal('privacy')}>{REGRANT.box.link}</Link>{REGRANT.box.after}
          </ConsentRow>
        </List>
        <Btn title={REGRANT.cta} disabled={!on} onPress={() => { grant(); onClose() }} />
      </View>
    </Sheet>
  )
}

/** "Read the privacy notice" / "What's sent, and where": the short privacy text, and the policy. */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={PRIVACY_SHEET.title} onClose={onClose} left={null} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <View style={{ paddingHorizontal: 4, gap: 10 }}>
        <Sub style={tx(15, 400, 1.45)}>{PRIVACY_SHEET.p1}</Sub>
        <Sub style={tx(15, 400, 1.45)}>{PRIVACY_SHEET.p2.before}<Link onPress={() => openLegal('privacy')}>{PRIVACY_SHEET.p2.link}</Link>{PRIVACY_SHEET.p2.after}</Sub>
      </View>
    </Sheet>
  )
}

/**
 * An `<a>` inside a sentence (LegalLink: the website's legal pages), a link for VoiceOver.
 * TODO(N1-followup): lib/ui's TextLink with a link role (it's a button, for the web's `.linkbtn.inl`).
 */
export function Link({ children, onPress, underline }: { children: ReactNode; onPress: () => void; underline?: boolean }) {
  const t = useTokens()
  return <Text accessibilityRole="link" onPress={onPress} suppressHighlighting style={[{ color: t.tint }, underline && { textDecorationLine: 'underline' }]}>{children}</Text>
}
