/**
 * Explicit consent before Tilo stores anyone's health data (UK/EU GDPR Art. 9(2)(a)), as
 * src/screens/legal/ConsentScreen.tsx on the web: shown after sign-in until the person has answered
 * the current version; sync waits for it (the shared store's rule). Each statement is its own
 * unticked box: never pre-ticked or bundled. The records are the web's, through the shared store
 * and src/data/consent.ts. Works offline: the record saves on the phone first.
 *
 * Also the privacy sheets (src/screens/legal/PrivacySheets.tsx, onboarding/Consent.tsx PrivacySheet).
 */
import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LEGAL, MIN_AGE } from '@/core/legal'
import { useStore } from '@/store/store'
import { useConsent } from '@/store/hooks'
import { hasExistingData, healthSyncPaused, latestConsent, unconsentedCopyLine } from '@/data/consent'
import { CONSENT, PRIVACY_SHEET, REGRANT } from '@/copy/account'
import { useTokens } from '../theme'
import { Button, CheckRow, Foot, InlineLink, LinkButton, List, NavButton, Sheet, T } from './kit'
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Math.max(24, ins.top), paddingBottom: 24 + ins.bottom }}>
      <T role="heading" size={28} w={700}>{CONSENT.title}</T>
      <T size={15} lh={1.45} color={t.label2} style={{ marginBottom: 4 }}>
        {CONSENT.lead}
      </T>

      <List>
        <CheckRow first id="c_health" on={health} onChange={setHealth}>
          {CONSENT.health.before}<InlineLink onPress={() => openLegal('privacy')}>{CONSENT.health.link}</InlineLink>{CONSENT.health.after}
        </CheckRow>
        <CheckRow id="c_terms" on={terms} onChange={setTerms}>
          {CONSENT.terms.before}<InlineLink onPress={() => openLegal('terms')}>{CONSENT.terms.link}</InlineLink>{CONSENT.terms.after}
        </CheckRow>
        <CheckRow id="c_age" on={adult} onChange={setAdult}>{CONSENT.adult(MIN_AGE)}</CheckRow>
      </List>

      <Button title={CONSENT.cont} disabled={!(health && terms && adult)} onPress={() => { grantConsent('health'); if (fromProfile) setConsentOpen(false) }} />
      {fromProfile ? (
        <Button kind="gray" title={CONSENT.back} onPress={() => setConsentOpen(false)} />
      ) : existing ? (
        <>
          <Button kind="gray" title={CONSENT.notNowKeep} onPress={notNow} />
          <Foot center>
            {CONSENT.notNowFoot} {unconsentedCopyLine()}{' '}
            {reasked ? CONSENT.reasked : CONSENT.askAgain}
          </Foot>
          <LinkButton title={CONSENT.signOut} muted onPress={() => void signOut()} />
        </>
      ) : (
        <Button kind="gray" title={CONSENT.notNowSignOut} onPress={() => void signOut()} />
      )}
      <Foot center>{CONSENT.deleteFoot(LEGAL.contactEmail)}</Foot>
      <Foot center>{CONSENT.gpFoot}</Foot>
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
    <Sheet title={REGRANT.title} onClose={onClose} gap={10}>
      <View style={{ backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16 }}>
        <T size={15} lh={1.45}>{REGRANT.lead}</T>
      </View>
      <List bg={t.elev}>
        <CheckRow first id="c_regrant" on={on} onChange={setOn}>
          {REGRANT.box.before}<InlineLink onPress={() => openLegal('privacy')}>{REGRANT.box.link}</InlineLink>{REGRANT.box.after}
        </CheckRow>
      </List>
      <Button title={REGRANT.cta} disabled={!on} onPress={() => { grant(); onClose() }} />
    </Sheet>
  )
}

/** "Read the privacy notice" / "What's sent, and where": the short privacy text, and the policy. */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  return (
    <Sheet title={PRIVACY_SHEET.title} onClose={onClose} left={null} right={<NavButton bold title="Done" onPress={onClose} />}>
      <View style={{ paddingHorizontal: 4, gap: 10 }}>
        <P color={t.label2}>{PRIVACY_SHEET.p1}</P>
        <P color={t.label2}>{PRIVACY_SHEET.p2.before}<InlineLink onPress={() => openLegal('privacy')}>{PRIVACY_SHEET.p2.link}</InlineLink>{PRIVACY_SHEET.p2.after}</P>
      </View>
    </Sheet>
  )
}

/** `.prose` paragraph. */
export function P({ children, color }: { children: ReactNode; color?: string }) {
  return <T size={15} lh={1.45} color={color}>{children}</T>
}
