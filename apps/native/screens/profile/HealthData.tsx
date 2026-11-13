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
import { HEALTH_DATA as HD } from '@/copy/profile'
import { healthStatusOf } from '@/screens/profile/profileModel'
import { tx, useTokens } from '../../lib/theme'
import { Btn, LinkBtn } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { openPrivacyNotice, withdrawHealth } from './n2'

export function HealthDataSheet({ onClose, onAgree, onAnswers, onRedo, onSupport }: {
  onClose: () => void; onAgree: () => void; onAnswers?: () => void; onRedo?: () => void; onSupport: () => void
}) {
  const t = useTokens()
  const status = useStore((s) => healthStatusOf(s.data))
  const canRemove = useStore((s) => { const h = healthDataSummary(s.data); return h.weighIns + h.checkins + h.profileFields + h.trainingPrefs > 0 || !!s.data._meta?.lastPull })
  const hasAnswers = useStore((s) => ONBOARDING_ENABLED && healthAnswersView(s.data.profile).rows.some((r) => r.kind !== 'baseline'))
  const onboarded = useStore((s) => !!s.data.profile.onboardedAt)
  // the rows these drive wait on N1 (below); kept so the wiring is in place when they land
  void hasAnswers; void onboarded; void onAnswers; void onRedo; void onSupport
  return (
    <Sheet title={HD.title} onClose={onClose} left={null} right={<NavBtn title={HD.done} bold onPress={onClose} />}>
      <Text style={[tx(15, 400, 1.45), { color: t.label2, paddingHorizontal: 4, paddingBottom: 12 }]}>
        {status === 'on' ? HD.on : status === 'paused' ? HD.paused + unconsentedCopyLine() : status === 'off' ? HD.off : HD.unasked}
      </Text>
      {/* TODO(N1-followup) item 4, Ticks: HEALTH_TICKS (src/screens/onboarding/Consent.tsx Ticks; N2 moves the words to src/copy) */}
      <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><LinkBtn title={HD.privacyNotice} onPress={openPrivacyNotice} style={tx(15)} /></View>
      {/* TODO(N1-followup) item 6, plain rows: "Health check answers" (hasAnswers && onAnswers) and "Redo setup" / "Set up my plan"
          (ONBOARDING_ENABLED && onRedo; onboarded picks the words), then a list with "Support and helplines" (SUPPORT.row, SUPPORT.rowSub) that
          calls onSupport (src/screens/profile/AccountData.tsx HealthDataSheet, the two `.list` blocks) */}
      <View style={{ gap: 8, marginTop: 16 }}>
        {status !== 'on' && <Btn title={HD.agree} onPress={onAgree} />}
        {(status === 'on' || (status !== 'off' && canRemove)) && <Btn kind="danger" title={HD.stop} onPress={withdrawHealth} />}
      </View>
    </Sheet>
  )
}
