/**
 * Get outside (board B13), ported from src/screens/mind/OutsideScreen.tsx: a pushed card screen in
 * move tokens, Back "Mind", no tab bar. "Easy walk" Start goes to Train, today, with its "Log a
 * session" sheet set to an Easy walk (openTrain(TRAIN_LOG_WALK)); this screen logs nothing.
 */
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore, TRAIN_LOG_WALK } from '@/store/store'
import { todayStr } from '@/core/domain/date'
import { skillById } from '@/core/data/skills'
import { MIND, OUTSIDE, SHARED } from '@/copy/mind'
import { Btn, Card, List } from '../../lib/ui/kit'
import { Row } from '../../lib/ui/primitives'
import { Foot, Lbl } from '../../lib/ui/text'
import { tx, useTokens } from '../../lib/theme'
import { GoSquare } from './GoSquare'
import { PushedTop } from './PushedTop'
import { SupportSheet } from './SupportSheet'

export function OutsideScreen({ onBack }: { onBack: () => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const openTrain = useStore((s) => s.openTrain)
  const setDate = useStore((s) => s.setDate)
  const [support, setSupport] = useState(false)
  const skill = skillById('outside')!
  return (
    <View testID="screen-outside" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
        <PushedTop back={MIND.title} onBack={onBack} title={skill.name} />
        <View style={{ gap: 10, paddingTop: 6 }}>
          <Text style={[tx(17), { color: t.label2, marginTop: 2, marginHorizontal: 4, marginBottom: 4 }]}>{skill.sub}</Text>
          {/* .card.go-lead */}
          <Card plain style={{ padding: 16, paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <GoSquare icon="sun" size={20} />
            <Text style={[tx(17, 400, 1.4), { flex: 1, color: t.label }]}>{OUTSIDE.lead}</Text>
          </Card>
          <Lbl style={{ paddingTop: 10, paddingBottom: 0 }}>{OUTSIDE.walkHeading}</Lbl>
          <List style={{ marginBottom: 8 }}>
            {/* .li.go-walk: the Start pill 44 tall. TODO(N1-followup): the row's 76 pt minimum height
                and its title at weight 600 (`.li.go-walk .t`) need a Row option */}
            <Row title={OUTSIDE.walk} sub={OUTSIDE.walkTime} lead={<GoSquare icon="leaf" size={20} />}
              right={<Btn title={OUTSIDE.start} small style={{ height: 44, minHeight: 44, borderRadius: 22, paddingHorizontal: 18 }} onPress={() => { setDate(todayStr()); openTrain(TRAIN_LOG_WALK) }} />} />
          </List>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 4, lineHeight: 18.2 }}>{OUTSIDE.walkFoot}</Foot>
          <List style={{ marginBottom: 8 }}><Row title={SHARED.support} onPress={() => setSupport(true)} /></List>
          <Foot style={{ textAlign: 'center', paddingTop: 6, paddingHorizontal: 4 }}>{SHARED.wellness}</Foot>
        </View>
      </ScrollView>
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </View>
  )
}
