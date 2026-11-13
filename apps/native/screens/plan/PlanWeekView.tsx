/**
 * A plan phase's week (the web's PlanWeekView in screens/plan/PlanDayViews.tsx): back to Plan, the
 * phase's name, "plan · n weeks", the seven days, its notes and the foot. Tap a day to edit it.
 */
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { planWeekNotes } from '@/core/domain/plans'
import { planWeekRows } from '@/screens/plan/planModel'
import { BackButton, TitleRow } from '../../lib/ui/primitives'
import { Foot, Sub } from '../../lib/ui/text'
import { useTokens } from '../../lib/theme'
import { PlanNote, WeekList } from './PlanParts'

export function PlanWeekView({ planId, phaseIndex, onBack, onDay }: { planId: string; phaseIndex: number; onBack: () => void; onDay: (d: number) => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const plan = useStore((s) => s.data.trainingPlans?.find((p) => p.id === planId))
  const routines = useStore((s) => s.data.routines)
  if (!plan) return null
  const ph = plan.phases[phaseIndex]
  const week = ph?.week ?? {}
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      {/* .pv-back */}
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 6, marginLeft: -6 }}><BackButton label="Plan" onPress={onBack} /></View>
      <TitleRow title={ph?.name ?? 'Week'} />
      <Sub style={{ marginTop: 2, marginBottom: 16 }}>{plan.name} · {ph?.weeks} {ph?.weeks === 1 ? 'week' : 'weeks'}</Sub>
      <WeekList rows={planWeekRows(week, routines)} onDay={onDay} />
      {planWeekNotes(week, routines).map((n) => <PlanNote key={n}>{n}</PlanNote>)}
      <Foot>Tap a day to change it. Changes repeat every week of {ph?.name ?? 'this phase'}.</Foot>
    </ScrollView>
  )
}
