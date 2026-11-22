/**
 * The Your cycle page (boards D1, D1g, D2, D3, D4, D5; approved by Benn 22 Nov 2026; native only).
 * During a period: "Day N of your period" (D1), or in gentle mode no number (D1g); otherwise
 * "Nothing logged today" with "Period started" (D2). No forecast, no "days since", no last-period
 * date. The safety cards (G1, G2) sit at the top. Recent days, "Add or change a past day" (D3),
 * "When to get help" (D4), "Which fits you best" (B2 again), export, and "Delete all cycle data"
 * (D5). Everything works offline; the log is on this phone only (deviceOnly.ts).
 */
import { useState } from 'react'
import { Linking, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { selectCycle, useStore } from '@/store/store'
import { hasConsent } from '@/data/consent'
import { currentPeriod, daysFrom, logDay, periodDay, type CycleDay } from '@/core/domain/cycle'
import { shortDateOf, shiftDay, todayStr } from '@/core/domain/date'
import { GLYPH_ROOM, num, tx, useTokens } from '../../lib/theme'
import { Btn, Card, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, BareSheet, NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { DateInput } from '../../lib/ui/pickers'
import { Foot, Lbl } from '../../lib/ui/text'
import { SupportSheet } from '../mind/SupportSheet'
import { CycleSetupFlow } from './CycleSetup'
import { CycleFields } from './Fields'
import { SafetyCards, usePromptFacts } from './Prompts'
import { exportCycleFile } from './exportFile'
import { CY, NHS, dayLine, setupLabel } from './text'

const dayName = (d: string, today: string) => (d === today ? CY.page.today : d === shiftDay(today, -1) ? CY.page.yesterday : shortDateOf(d))

/** D3: log or fix one day. "Done" saves; "Clear this day" removes it. */
export function LogDaySheet({ day: start, onClose }: { day: string; onClose: () => void }) {
  const t = useTokens()
  const today = todayStr()
  const log = useStore(selectCycle)
  const editCycle = useStore((s) => s.editCycle)
  const [day, setDay] = useState(start)
  const [v, setV] = useState<CycleDay>(() => log?.days[start] ?? {})
  const pickDay = (d: string) => { setDay(d); setV(log?.days[d] ?? {}) }
  const save = () => { editCycle((l) => { logDay(l, day, v, today) }); onClose() }
  return (
    <Sheet title={CY.log.title} onClose={onClose} right={<NavBtn title="Done" bold onPress={save} />}>
      <List>
        <DateInput mode="date" value={day} max={today} label={CY.log.day} shown={shortDateOf(day)} onChange={pickDay}>
          <Row title={CY.log.day} value={<Text style={[tx(17), num, { color: t.label2 }]}>{shortDateOf(day)}</Text>} chevron />
        </DateInput>
      </List>
      <CycleFields value={v} onChange={setV} />
      <Btn kind="danger" title={CY.log.clear} style={{ marginTop: 20 }} onPress={() => { editCycle((l) => { logDay(l, day, {}, today) }); onClose() }} />
      <Foot>{CY.log.foot}</Foot>
    </Sheet>
  )
}

/** D5: delete all cycle data, offering the export first. Turning Cycle off records a withdrawal. */
export function DeleteCycleSheet({ onClose, onDeleted, alsoHide }: { onClose: () => void; onDeleted: () => void; alsoHide?: boolean }) {
  const t = useTokens()
  const log = useStore(selectCycle)
  const withdraw = useStore((s) => s.withdrawConsent)
  const wipe = useStore((s) => s.deleteCycleData)
  const hide = useStore((s) => s.hideCycleOffer)
  const consented = useStore((s) => hasConsent(s.data, 'cycle'))
  const del = () => {
    // a withdrawal deletes the log too (consent.ts withdraw); with no yes on record, just delete
    if (consented) withdraw('cycle'); else wipe()
    if (alsoHide) hide(true)
    onDeleted()
  }
  return (
    <BareSheet label={CY.del.title} onClose={onClose}>
      <Text accessibilityRole="header" style={[tx(24, 600, 1.2), GLYPH_ROOM, { color: t.label, marginBottom: 8 }]}>{CY.del.title}</Text>
      <Text style={[tx(16, 400, 1.45), { color: t.label2, marginBottom: 20 }]}>{CY.del.body}</Text>
      {log && <Btn kind="gray" title={CY.del.export} onPress={() => { void exportCycleFile(log) }} />}
      {/* board D5 draws a red fill; the system has no filled red button (only .btn.danger), so the
          existing destructive style is used: flagged for the design review */}
      <Btn kind="danger" title={CY.del.confirm} style={{ marginTop: 8 }} onPress={del} />
      <View style={{ alignItems: 'center', marginTop: 8 }}><LinkBtn title={CY.del.cancel} onPress={onClose} /></View>
    </BareSheet>
  )
}

/** D4: when to get help. Static, shown to everyone, never switched off. */
function HelpPage({ onBack }: { onBack: () => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const [support, setSupport] = useState(false)
  const call = (n: string) => { void Linking.openURL('tel:' + n) }
  const contact = ([title, sub, n]: readonly [string, string, string]) => (
    <Row key={n} title={title} sub={sub} wrapSub right={<LinkBtn title={n} onPress={() => call(n)} label={`Call ${n}`} />} />
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ marginLeft: -6 }}><BackButton label={CY.help.back} onPress={onBack} /></View>
        <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), GLYPH_ROOM, { color: t.label }]}>{CY.help.title}</Text>
        <Text style={[tx(16, 400, 1.45), { color: t.label2, marginTop: -8 }]}>{CY.help.lead}</Text>
        <List>
          {CY.help.rows.map(([b, s]) => <Row key={b} title={b} bold wrap sub={s} wrapSub />)}
        </List>
        <List>{contact(CY.help.nhs111)}{contact(CY.help.emergency)}</List>
        <View>
          <Foot style={{ paddingTop: 0 }}>{CY.help.foot}</Foot>
          <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingTop: 6 }}>
            <LinkBtn title={CY.help.heavyLink} flat size={13} onPress={() => { void Linking.openURL(NHS.heavy) }} />
            <LinkBtn title={CY.help.painLink} flat size={13} onPress={() => { void Linking.openURL(NHS.pain) }} />
          </View>
          <Foot>{CY.help.support.before}<Text accessibilityRole="link" onPress={() => setSupport(true)} style={{ color: t.tint }}>{CY.help.support.link}</Text>{CY.help.support.after}</Foot>
        </View>
      </ScrollView>
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </View>
  )
}

/** D1/D1g/D2. `onBack` returns to Profile (also after Cycle is deleted or closed). */
export function CyclePage({ onBack }: { onBack: () => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const log = useStore(selectCycle)
  const gentle = useStore((s) => !!s.data.profile?.gentle)
  const facts = usePromptFacts()
  const [view, setView] = useState<'page' | 'help' | 'fits'>('page')
  const [logDayOpen, setLogDayOpen] = useState<string | null>(null)
  const [delOpen, setDelOpen] = useState<false | 'delete' | 'none'>(false)
  const today = todayStr()

  if (view === 'help') return <HelpPage onBack={() => setView('page')} />
  if (view === 'fits') return <CycleSetupFlow change onClose={() => setView('page')} onOn={() => setView('page')} onNone={() => { setView('page'); setDelOpen('none') }} />
  if (!log) return null

  const period = currentPeriod(log.days, today)
  const n = periodDay(log.days, today)
  const recent = Object.keys(log.days).filter((d) => d <= today && daysFrom(d, today) < 14).sort().reverse()
  const started = period ? (period.start === today ? 'today' : period.start === shiftDay(today, -1) ? 'yesterday' : 'on ' + shortDateOf(period.start)) : ''

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ marginLeft: -6 }}><BackButton label={CY.page.back} onPress={onBack} /></View>
        <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), GLYPH_ROOM, { color: t.label }]}>{CY.page.title}</Text>

        <SafetyCards log={log} facts={facts} />

        <Card>
          {period && n != null ? (
            gentle
              ? (<>
                  <Text style={[tx(28, 600, 1.2), GLYPH_ROOM, { color: t.label }]}>{CY.page.gentle}</Text>
                  <Text style={[tx(15), { color: t.label2, marginTop: 4 }]}>{CY.page.gentleStarted(started)}</Text>
                </>)
              : (<>
                  <Text style={[tx(28, 600, 1.2), GLYPH_ROOM, num, { color: t.label }]}>{CY.page.day(n)}</Text>
                  <Text style={[tx(15), { color: t.label2, marginTop: 4 }]}>{CY.page.dayFoot}</Text>
                </>)
          ) : (<>
            <Text style={[tx(20, 600, 1.25), { color: t.label }]}>{CY.page.none}</Text>
            <Text style={[tx(15, 400, 1.4), { color: t.label2, marginTop: 4, marginBottom: 12 }]}>{CY.page.noneFoot}</Text>
            <Btn small title={CY.page.started} style={{ alignSelf: 'flex-start' }} onPress={() => setLogDayOpen(today)} />
          </>)}
        </Card>

        <View>
          <Lbl>{CY.page.recent}</Lbl>
          <List>
            {recent.length
              ? recent.map((d) => <Row key={d} title={dayName(d, today)} sub={dayLine(log.days[d])} onPress={() => setLogDayOpen(d)} />)
              : <Row title={CY.page.empty} />}
            <Row act icon="plus" title={CY.page.addPast} onPress={() => setLogDayOpen(shiftDay(today, -1))} />
          </List>
        </View>

        <List><Row title={CY.page.help} onPress={() => setView('help')} /></List>

        <View>
          <Lbl>{CY.page.settings}</Lbl>
          <List>
            {/* the answer under the label: beside it, the longer answers cut the label off */}
            <Row title={CY.page.fits} sub={setupLabel(log.setup)} wrapSub onPress={() => setView('fits')} />
            <Row act icon="cloudUp" title={CY.page.export} onPress={() => { void exportCycleFile(log) }} />
          </List>
          <Foot>{CY.page.foot}</Foot>
        </View>

        <Btn kind="danger" title={CY.page.delete} onPress={() => setDelOpen('delete')} />
      </ScrollView>
      {logDayOpen && <LogDaySheet day={logDayOpen} onClose={() => setLogDayOpen(null)} />}
      {delOpen && <DeleteCycleSheet alsoHide={delOpen === 'none'} onClose={() => setDelOpen(false)} onDeleted={() => { setDelOpen(false); onBack() }} />}
    </View>
  )
}
