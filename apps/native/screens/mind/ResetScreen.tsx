/**
 * Reset (board B7 with the P6 Glow pacer), ported from src/screens/mind/ResetScreen.tsx: a pushed
 * card screen in mind tokens with Back "Mind" (or "Wind down" from its routine), the title and the
 * Profile avatar, and no tab bar (the Mind tab hides it while a skill screen is open). Stages,
 * logging and what each stage shows come from the shared resetStages.ts and model.ts resetView;
 * this file only composes lib/ui. Only a run still running when the pacer's done lands is logged.
 */
import { useReducer, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RESET_PATTERN } from '@/core/data/skills'
import { fmtLeft, runMs } from '@/core/domain/pacer'
import { SHARED } from '@/copy/mind'
import { RESET } from '@/copy/mindReset'
import { onPacerDone, resetInitial, resetReducer, type ResetLength } from '@/screens/mind/resetStages'
import { Row, Seg } from '../../lib/ui/primitives'
import { Btn, Card, List } from '../../lib/ui/kit'
import { Foot } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { resetView } from './model'
import { PacerCard } from './PacerCard'
import { PushedTop } from './PushedTop'
import { SupportSheet } from './SupportSheet'
import { useReduceMotion } from './useReduceMotion'

export function ResetScreen({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const reduced = useReduceMotion()
  const [rs, dispatch] = useReducer(resetReducer, resetInitial)
  // the stage as of now, for the pacer's done (Stop sets it before dispatching)
  const cur = useRef(rs)
  cur.current = rs
  const [left, setLeft] = useState('')
  const [support, setSupport] = useState(false)
  const v = resetView(rs, reduced, left)

  const start = () => { setLeft(fmtLeft(runMs(RESET_PATTERN, rs.len))); dispatch({ type: 'start' }) }
  const stop = () => { cur.current = resetReducer(cur.current, { type: 'stop' }); dispatch({ type: 'stop' }) }
  const finish = () => { const next = onPacerDone(cur.current); if (next !== cur.current) { cur.current = next; dispatch({ type: 'finish' }) } }
  const press = v.button.does === 'start' ? start : v.button.does === 'stop' ? stop : onBack

  return (
    <View testID="screen-reset" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
        <PushedTop back={backLabel} onBack={onBack} title={RESET.title} />
        {/* .reset-main: a column 10 apart, 6 from the title */}
        <View style={{ gap: 10, paddingTop: 6 }}>
          {v.intro && (
            <>
              <Text style={[tx(17), { color: t.label2, marginTop: 2, marginHorizontal: 4, marginBottom: 4 }]}>{RESET.sub}</Text>
              {/* TODO(N1-followup): `.reset-main .seg button { min-height: 32px }` needs a Seg min-height option */}
              <Seg options={v.lengths} value={String(rs.len)} onChange={(x) => dispatch({ type: 'length', len: Number(x) as ResetLength })} />
              <Text style={[tx(15, 400, 1.45), { color: t.label, paddingTop: 4, paddingHorizontal: 4 }]}>{RESET.how}</Text>
            </>
          )}
          {v.reducedLine && <Foot style={{ color: t.label, paddingTop: 0, paddingHorizontal: 4 }}>{v.reducedLine}</Foot>}
          {v.pacer && <PacerCard pattern={RESET_PATTERN} minutes={rs.len} run={rs.stage === 'running' ? rs.run : null} reduced={reduced} onLeft={setLeft} onDone={finish} />}
          {v.left && <View testID="reset-left"><Foot style={[num, { textAlign: 'center', paddingTop: 0, paddingHorizontal: 4 }]}>{v.left}</Foot></View>}
          {v.end && (
            <Card plain style={{ alignItems: 'center', gap: 12, paddingVertical: 40, paddingHorizontal: 16 }}>
              {v.end.title
                ? <><Text accessibilityLiveRegion="polite" style={[tx(22, 600), { color: t.label, textAlign: 'center' }]}>{v.end.title}</Text><Text style={[tx(15), { color: t.label2, textAlign: 'center' }]}>{v.end.line}</Text></>
                : <Text accessibilityLiveRegion="polite" style={[tx(17), { color: t.label, textAlign: 'center' }]}>{v.end.line}</Text>}
            </Card>
          )}
          <Btn title={v.button.title} kind={v.button.kind} onPress={press} />
          <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>{RESET.stopAnyTime}</Foot>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>{RESET.dizzy}</Foot>
          <List style={{ marginBottom: 8 }}><Row title={SHARED.support} onPress={() => setSupport(true)} /></List>
          <Foot style={{ textAlign: 'center', paddingTop: 6, paddingHorizontal: 4 }}>{SHARED.wellness}</Foot>
        </View>
      </ScrollView>
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </View>
  )
}
