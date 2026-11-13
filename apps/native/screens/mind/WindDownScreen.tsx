/**
 * Wind down (board B12), ported from src/screens/mind/WindDownScreen.tsx: a pushed card screen in
 * mind tokens, Back "Mind", no tab bar. The routine, its time line and where "Change your routine"
 * goes come from windDownModel; Done saves through the shared routineSave rule (saveRoutine).
 */
import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import type { SkillId } from '@/core/types'
import { MIND, MIND_UI, SHARED, WIND_DOWN } from '@/copy/mind'
import type { IconName } from '../../lib/ui/icons'
import { List } from '../../lib/ui/kit'
import { NavBtn, Row, Sheet, Toggle } from '../../lib/ui/primitives'
import { Foot, Lbl } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { flipPick, routineSheetRows, routineStart, saveRoutine, useWindDown } from './model'
import { PushedTop } from './PushedTop'
import { SupportSheet } from './SupportSheet'

const foot = { paddingTop: 0, paddingHorizontal: 4, lineHeight: 18.2 }

export function WindDownScreen({ onBack, onSkill, children }: {
  onBack: () => void
  /** a routine step with a skill screen (Unload, Reset) */
  onSkill: (id: Extract<SkillId, 'reset' | 'unload'>) => void
  children?: ReactNode
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const m = useWindDown()
  const stored = useStore((s) => s.data.profile.mind?.routine)
  const openProfile = useStore((s) => s.openProfile)
  const [sheet, setSheet] = useState<'routine' | 'support' | null>(null)
  const sq = (icon: string) => ({ icon: icon as IconName, fill: t.mindFill, ink: t.mindInk })
  return (
    <View testID="screen-wind-down" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
        <PushedTop back={MIND.title} onBack={onBack} title={m.title} />
        {/* .wd-main: a column 10 apart, 6 from the title */}
        <View style={{ gap: 10, paddingTop: 6 }}>
          <Text style={[tx(17), { color: t.label2, marginTop: 2, marginHorizontal: 4, marginBottom: 4 }]}>{m.sub}</Text>
          <Lbl right={m.from ? <Text style={[tx(13, 500), num, { color: t.label2 }]}>{m.from}</Text> : undefined} style={{ paddingTop: 10, paddingBottom: 0 }}>{m.routineLabel}</Lbl>
          <List icons style={{ marginBottom: 8 }}>
            {m.steps.map((s) => (
              <Row key={s.key} title={s.name} sub={s.sub} wrapSub square={sq(s.icon)} onPress={s.opens ? () => onSkill(s.opens!) : undefined} />
            ))}
            <Row title={WIND_DOWN.change} act icon="sliders" onPress={() => (m.change === 'health' ? openProfile('health') : setSheet('routine'))} />
          </List>
          {m.foots.map((f) => <Foot key={f} style={foot}>{f}</Foot>)}
          <List style={{ marginBottom: 8 }}><Row title={SHARED.support} onPress={() => setSheet('support')} /></List>
          <Foot style={{ textAlign: 'center', paddingTop: 6, paddingHorizontal: 4 }}>{SHARED.wellness}</Foot>
        </View>
      </ScrollView>
      {sheet === 'routine' && <RoutineSheet time={m.time} stored={stored} onClose={() => setSheet(null)} />}
      {sheet === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
      {children}
    </View>
  )
}

/** "Your routine": a toggle per ready step, Cancel and Done (saves keys only, only when changed). */
function RoutineSheet({ time, stored, onClose }: { time: string | undefined; stored: string[] | undefined; onClose: () => void }) {
  const t = useTokens()
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const openProfile = useStore((s) => s.openProfile)
  const [picked, setPicked] = useState<string[]>(() => routineStart(stored))
  const done = () => { saveRoutine({ setMindPrefs }, picked, stored); onClose() }
  return (
    <Sheet title={WIND_DOWN.sheetTitle} onClose={onClose} right={<NavBtn title={MIND_UI.done} bold onPress={done} />}>
      <Text style={[tx(15, 400, 1.4), { color: t.label, paddingHorizontal: 4, paddingBottom: 12 }]}>{WIND_DOWN.sheetLead}</Text>
      <List icons>
        {routineSheetRows().map((i) => (
          <Row key={i.key} title={i.name} square={{ icon: i.icon as IconName, fill: t.mindFill, ink: t.mindInk }}
            right={<Toggle label={i.name} on={picked.includes(i.key)} onChange={() => setPicked((p) => flipPick(p, i.key))} />} />
        ))}
      </List>
      <View style={{ marginTop: 8 }}>
        {time
          ? <Foot style={{ paddingTop: 0, paddingHorizontal: 4, lineHeight: 18.2 }}>{WIND_DOWN.timeLine(time)}</Foot>
          : <List><Row title={WIND_DOWN.setTime} act onPress={() => { onClose(); openProfile('notifications') }} chevron /></List>}
      </View>
    </Sheet>
  )
}
