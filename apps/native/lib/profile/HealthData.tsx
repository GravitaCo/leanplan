/**
 * Profile › Health data, the sheet's main view (src/screens/profile/AccountData.tsx
 * HealthDataSheet): what Tilo keeps and why, Health check answers and Redo setup (behind the
 * wizard flag), Support and helplines for everyone, then agree or stop. Agreeing, the withdraw
 * step and the privacy notice are stream N2's flows (./n2).
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { healthDataSummary, unconsentedCopyLine } from '@/data/consent'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { healthAnswersView } from '@/core/domain/onboarding'
import { HEALTH_ANSWERS_ROW, REDO_ROW, SETUP_ROW, SUPPORT } from '@/screens/onboarding/copyApp'
import { healthStatusOf } from '@/screens/profile/profileModel'
import { font, useTokens } from '../theme'
import { Btn, List, NavBtn, PlainRow, Sheet, Ticks } from './ui'
import { SupportSheet } from './Support'
import { openPrivacyNotice, withdrawHealth } from './n2'

/** onboarding/Consent.tsx HEALTH_TICKS (a TSX file the native bundle can't import; N2 moves them to copy). */
export const HEALTH_TICKS = [
  'It’s private to your account. Nobody else can see it.',
  'It’s never sold or used for ads.',
  'Download it or delete it any time in Profile.',
  'Saved on this phone first, so this works offline too.',
]

export function HealthDataSheet({ onClose, onAgree, onAnswers, onRedo }: { onClose: () => void; onAgree: () => void; onAnswers?: () => void; onRedo?: () => void }) {
  const t = useTokens()
  const status = useStore((s) => healthStatusOf(s.data))
  const [support, setSupport] = useState(false)
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields + h.trainingPrefs > 0 || !!s.data._meta?.lastPull })
  const hasAnswers = useStore((s) => ONBOARDING_ENABLED && healthAnswersView(s.data.profile).rows.some((r) => r.kind !== 'baseline'))
  const onboarded = useStore((s) => !!s.data.profile.onboardedAt)
  const answersRow = hasAnswers && !!onAnswers, redoRow = ONBOARDING_ENABLED && !!onRedo
  return (
    <Sheet title="Health data" onClose={onClose} left={null} right={<NavBtn title="Done" bold onPress={onClose} />}>
      <Text style={[font(), { fontSize: 15, lineHeight: 22, color: t.label2, paddingHorizontal: 4, paddingBottom: 12 }]}>
        {status === 'on' ? 'Tilo keeps your log, including your weight, check-ins and body details, to run the app and build your plan and targets.'
          : status === 'paused' ? 'Your log is on this phone only until you agree: nothing syncs to your account or is backed up there. ' + unconsentedCopyLine()
          : status === 'off' ? 'You’ve said no, so your log is on your phones only: nothing syncs to your account. To build your plan, Tilo uses things like your weight, sleep, stress and health, and needs your OK to keep them.'
          : 'To build your plan, Tilo asks about things like your weight, sleep, stress and health. That’s health data, so we need your OK to keep it.'}
      </Text>
      <Ticks items={HEALTH_TICKS} />
      <Text accessibilityRole="button" onPress={openPrivacyNotice} style={[font(), { fontSize: 15, color: t.tint, paddingVertical: 6, paddingHorizontal: 4, marginTop: 8 }]}>Read the privacy notice</Text>
      {(answersRow || redoRow) && (
        <List style={{ marginTop: 12 }}>
          {answersRow && <PlainRow title={HEALTH_ANSWERS_ROW} onPress={onAnswers} />}
          {redoRow && <PlainRow title={onboarded ? REDO_ROW : SETUP_ROW} onPress={onRedo} />}
        </List>
      )}
      {/* Onboarding 10 (ob9-6): for everyone, whatever their consent or answers */}
      <List style={{ marginTop: 12 }}>
        <PlainRow title={SUPPORT.row} sub={SUPPORT.rowSub} onPress={() => setSupport(true)} />
      </List>
      <View style={{ gap: 8, marginTop: 16 }}>
        {status !== 'on' && <Btn title="Yes, keep it" onPress={onAgree} />}
        {(status === 'on' || (status !== 'off' && canRemove)) && <Btn kind="danger" title="Stop keeping my health data" onPress={withdrawHealth} />}
      </View>
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </Sheet>
  )
}
