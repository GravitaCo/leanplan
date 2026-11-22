/**
 * The check-in's Cycle group (boards C1, C2, G1, G2 in the group, G4, G5; approved by Benn 22 Nov
 * 2026; native only). One optional row, "Period today?", shown only when core's rowShows says so
 * (around a period; every check-in with no history or for most answers). Tapping it opens the
 * day's fields; the answers go to the device-only Cycle log when the check-in is saved (the sheet
 * owns `value`), never to the day log. A safety card shows here only on the day it first applies.
 * G4 asks after a long stretch with no period logged; "No" leads to G5, blame-free signposting.
 */
import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { foodModeOf } from '@/core/domain/foodMode'
import { promptsToShow, rowShows, markShown, type CycleDay, type CycleStore } from '@/core/domain/cycle'
import { todayStr } from '@/core/domain/date'
import { tx, useTokens } from '../../lib/theme'
import { Btn, Card, List, useSurface } from '../../lib/ui/kit'
import { BareSheet, Row } from '../../lib/ui/primitives'
import { Chevron, Icon } from '../../lib/ui/icons'
import { Foot, Lbl } from '../../lib/ui/text'
import { GLYPH_ROOM } from '../../lib/theme'
import { CycleFields } from './Fields'
import { SafetyCards, usePromptFacts } from './Prompts'
import { LogDaySheet } from './CyclePage'
import { CY } from './text'

/** Whether the group shows on `day` for this log (and the sheet should keep a value for it). */
export function cycleRowShows(log: CycleStore | undefined, day: string, paused: boolean): boolean {
  return !!log?.setup && log.setup !== 'none' && rowShows(log, day, { paused })
}

/** G5: after "No". The deficit line only for someone in a deficit; Beat only with wellbeing Yes or gentle. */
function GapSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const deficit = useStore((s) => s.data.profile?.goal === 'lose-fat')
  const beat = useStore((s) => !!s.data.profile?.gentle || foodModeOf(s.data.profile ?? {}) === 'yes')
  const [name, sub, phone] = CY.gap.beat
  return (
    <BareSheet label={CY.gap.title} onClose={onClose}>
      <Text accessibilityRole="header" style={[tx(24, 600, 1.2), GLYPH_ROOM, { color: t.label, marginBottom: 8 }]}>{CY.gap.title}</Text>
      <Text style={[tx(16, 400, 1.45), { color: t.label2, marginBottom: 16 }]}>{CY.gap.body}</Text>
      {deficit && <Card style={{ marginBottom: 16 }}><Text style={[tx(15, 400, 1.4), { color: t.label }]}>{CY.gap.deficit}</Text></Card>}
      <List style={{ marginBottom: 20 }}>
        <Row title={CY.gap.gp[0]} sub={CY.gap.gp[1]} />
        {beat && <Row title={name} sub={sub} wrapSub right={<Text accessibilityRole="link" onPress={() => { void Linking.openURL('tel:' + phone.replace(/ /g, '')) }} style={[tx(15, 600), { color: t.tint }]}>{phone}</Text>} />}
      </List>
      <Btn title={CY.gap.done} onPress={onClose} />
    </BareSheet>
  )
}

export function CycleCheckinGroup({ log, day, value, onChange }: { log: CycleStore; day: string; value: CycleDay; onChange: (v: CycleDay) => void }) {
  const t = useTokens()
  const facts = usePromptFacts()
  const surface = useSurface(t)
  const editCycle = useStore((s) => s.editCycle)
  const [open, setOpen] = useState(() => Object.keys(value).length > 0)
  const [addDay, setAddDay] = useState<string | null>(null)
  const [gapNo, setGapNo] = useState(false)
  const today = todayStr()
  const ask = day === today && promptsToShow(log, today, facts).includes('no-period')
  const answerGap = (yes: boolean) => {
    editCycle((l) => { markShown(l, ['no-period'], today); l.gapAnswered = today })
    if (yes) setAddDay(today); else setGapNo(true)
  }
  return (
    <View>
      <Lbl>{CY.checkin.group}</Lbl>
      <List>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: pressed ? t.fill : 'transparent' })}>
          <Text style={[tx(17), { color: t.label, flex: 1 }]}>{CY.checkin.row}</Text>
          <Chevron color={t.label3} rotate={open ? 90 : 0} />
        </Pressable>
      </List>
      {ask && (
        // G4: a banner with two small buttons under the row
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: surface, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14, marginTop: 10 }}>
          <Icon name="info" color={t.mindInk} />
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={[tx(15, 400, 1.4), { color: t.label }]}>{CY.gap.ask}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small kind="gray" title={CY.gap.yes} onPress={() => answerGap(true)} />
              <Btn small kind="gray" title={CY.gap.no} onPress={() => answerGap(false)} />
            </View>
          </View>
        </View>
      )}
      {open && (
        <View>
          <CycleFields value={value} onChange={onChange} />
          {day === today && <View style={{ marginTop: 12 }}><SafetyCards log={log} facts={facts} dueOnly /></View>}
          <Foot>{CY.checkin.foot}</Foot>
        </View>
      )}
      {addDay && <LogDaySheet day={addDay} onClose={() => setAddDay(null)} />}
      {gapNo && <GapSheet onClose={() => setGapNo(false)} />}
    </View>
  )
}
