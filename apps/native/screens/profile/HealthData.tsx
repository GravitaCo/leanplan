/**
 * Profile › Health data, the sheet's main view (src/screens/profile/AccountData.tsx
 * HealthDataSheet): what Tilo keeps and why, Health check answers and Redo setup (behind the
 * wizard flag), Support and helplines for everyone, then agree or stop. Agreeing, the withdraw
 * step and the privacy notice are stream N2's flows (./n2).
 */
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { healthDataSummary, unconsentedCopyLine } from '@/data/consent'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { healthAnswersView } from '@/core/domain/onboarding'
import { HEALTH_DATA as HD, HEALTH_TICKS } from '@/copy/account'
import { HEALTH_ANSWERS_ROW, REDO_ROW, SETUP_ROW, SUPPORT } from '@/copy/onboardingApp'
import { healthStatusOf } from '@/screens/profile/profileModel'
import { tx, useTokens } from '../../lib/theme'
import { Btn, LinkBtn, List } from '../../lib/ui/kit'
import { NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { Ticks } from '../../lib/ui/choices'
import { openPrivacyNotice, withdrawHealth } from './n2'

export function HealthDataSheet({ onClose, onAgree, onAnswers, onRedo, onSupport }: {
  onClose: () => void; onAgree: () => void; onAnswers?: () => void; onRedo?: () => void; onSupport: () => void
}) {
  const t = useTokens()
  const status = useStore((s) => healthStatusOf(s.data))
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields + h.trainingPrefs > 0 || !!s.data._meta?.lastPull })
  const hasAnswers = useStore((s) => ONBOARDING_ENABLED && healthAnswersView(s.data.profile).rows.some((r) => r.kind !== 'baseline'))
  const onboarded = useStore((s) => !!s.data.profile.onboardedAt)
  const answersRow = hasAnswers && !!onAnswers, redoRow = ONBOARDING_ENABLED && !!onRedo
  return (
    <Sheet title={HD.title} onClose={onClose} left={null} right={<NavBtn title="Done" bold onPress={onClose} />}>
      <Text style={[tx(15, 400, 1.45), { color: t.label2, paddingHorizontal: 4, paddingBottom: 12 }]}>
        {status === 'on' ? HD.on : status === 'paused' ? HD.paused + unconsentedCopyLine() : status === 'off' ? HD.off : HD.unasked}
      </Text>
      <Ticks items={[...HEALTH_TICKS]} />
      <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><LinkBtn title={HD.readPrivacy} onPress={openPrivacyNotice} style={tx(15)} /></View>
      {(answersRow || redoRow) && (
        <List style={{ marginTop: 12 }}>
          {answersRow && <Row title={HEALTH_ANSWERS_ROW} onPress={onAnswers} />}
          {redoRow && <Row title={onboarded ? REDO_ROW : SETUP_ROW} onPress={onRedo} />}
        </List>
      )}
      {/* Onboarding 10 (ob9-6): for everyone, whatever their consent or answers */}
      <List style={{ marginTop: 12 }}>
        <Row title={SUPPORT.row} sub={SUPPORT.rowSub} onPress={onSupport} />
      </List>
      <View style={{ gap: 8, marginTop: 16 }}>
        {status !== 'on' && <Btn title={HD.agree} onPress={onAgree} />}
        {(status === 'on' || (status !== 'off' && canRemove)) && <Btn kind="danger" title={HD.stop} onPress={withdrawHealth} />}
      </View>
    </Sheet>
  )
}
