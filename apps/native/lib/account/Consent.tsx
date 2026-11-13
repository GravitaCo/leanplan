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
      <T role="heading" size={28} w={700}>Before you start</T>
      <T size={15} lh={1.45} color={t.label2} style={{ marginBottom: 4 }}>
        What you log in Tilo, like your weight, food, workouts, sleep, stress, mood and any injuries, is health
        information. It’s stored on this phone and in a database in Ireland (EU) that’s private to your
        account. It’s never sold, shared for marketing or used for ads.
      </T>

      <List>
        <CheckRow first id="c_health" on={health} onChange={setHealth}>
          I agree to Tilo storing and using my health information to run the app for me, as the <InlineLink onPress={() => openLegal('privacy')}>privacy policy</InlineLink> explains. I can withdraw this at any time in Profile, then Privacy.
        </CheckRow>
        <CheckRow id="c_terms" on={terms} onChange={setTerms}>
          I accept the <InlineLink onPress={() => openLegal('terms')}>terms and conditions</InlineLink>, and understand Tilo gives general wellness information, not medical advice.
        </CheckRow>
        <CheckRow id="c_age" on={adult} onChange={setAdult}>I’m {MIN_AGE} or over.</CheckRow>
      </List>

      <Button title="Continue" disabled={!(health && terms && adult)} onPress={() => { grantConsent('health'); if (fromProfile) setConsentOpen(false) }} />
      {fromProfile ? (
        <Button kind="gray" title="Back" onPress={() => setConsentOpen(false)} />
      ) : existing ? (
        <>
          <Button kind="gray" title="Not now, keep it on this phone" onPress={notNow} />
          <Foot center>
            Until you agree, nothing you log syncs to your account or is backed up there. {unconsentedCopyLine()}{' '}
            {reasked ? 'We won’t ask again: you can agree any time in Profile, then Privacy.' : 'We’ll ask once more in 2 weeks.'}
          </Foot>
          <LinkButton title="Sign out" muted onPress={() => void signOut()} />
        </>
      ) : (
        <Button kind="gray" title="Not now, sign out" onPress={() => void signOut()} />
      )}
      <Foot center>Already have data in Tilo and would rather it was deleted? Email {LEGAL.contactEmail} and we’ll delete your account.</Foot>
      <Foot center>If you’re pregnant, have a medical condition, or have had an eating disorder, talk to a GP before using Tilo to guide your eating.</Foot>
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
    <Sheet title="Health data" onClose={onClose} gap={10}>
      <View style={{ backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16 }}>
        <T size={15} lh={1.45}>Turning this back on lets Tilo save your weigh-ins, check-ins and body details again, and uploads your whole log from this phone to your account.</T>
      </View>
      <List bg={t.elev}>
        <CheckRow first id="c_regrant" on={on} onChange={setOn}>
          I agree to Tilo storing and using my health information to run the app for me, as the <InlineLink onPress={() => openLegal('privacy')}>privacy policy</InlineLink> explains. I can withdraw this at any time.
        </CheckRow>
      </List>
      <Button title="Turn health data back on" disabled={!on} onPress={() => { grant(); onClose() }} />
    </Sheet>
  )
}

/** "Read the privacy notice" / "What's sent, and where": the short privacy text, and the policy. */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  return (
    <Sheet title="Privacy" onClose={onClose} left={null} right={<NavButton bold title="Done" onPress={onClose} />}>
      <View style={{ paddingHorizontal: 4, gap: 10 }}>
        <P color={t.label2}>Your log is stored on this phone and, once you agree, synced to a private database tied to your account. It’s never sold or used for ads.</P>
        <P color={t.label2}>The full details are in the <InlineLink onPress={() => openLegal('privacy')}>privacy policy</InlineLink>.</P>
      </View>
    </Sheet>
  )
}

/** `.prose` paragraph. */
export function P({ children, color }: { children: ReactNode; color?: string }) {
  return <T size={15} lh={1.45} color={color}>{children}</T>
}
