/**
 * The component gallery (native-build-plan N1): every design-system piece in its main states, for
 * `design` to review against the web. scripts/e2e-gallery-parity.cjs screenshots each section
 * (testID `g-<id>`) beside the same section of the web twin (scripts/web-gallery/Gallery.tsx), in
 * light and dark. Keep the two files' sections, order and props the same.
 *
 * For Benn, Sara and the team only (opened from the Spike sheet); never part of the app.
 */
import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { connectionLabel } from '@/core/domain/connection'
import { G } from './galleryData'
import { dayStat, weekOf } from '@/core/domain/insights'
import { Icon, ICON_NAMES } from './ui/icons'
import { Banner, Btn, Card, List, Tile, ToastView } from './ui/kit'
import { BackButton, BareSheet, CatHead, ConnectionLineView, ConnectionPillView, Disclosure, NavBtn, PageHeader, Seg, SettingRow, Sheet, Toggle } from './ui/primitives'
import { KcalBar, MacroTrio, Meter, Rings, Sparkline, WeekBars } from './ui/charts'
import { DayNav, MoveStrip, WeekStrip } from './ui/WeekStrip'
import { TabBarView } from './ui/TabBar'
import { Ruler } from './ui/Ruler'
import { Wheel } from './ui/Wheel'
import { CheckTiles, ChoiceTiles } from './ui/Tiles'
import { TaliMark } from './ui/brand'
import { num, tx, useTokens } from './theme'

function Sec({ id, title, children, pad = true }: { id: string; title: string; children: ReactNode; pad?: boolean }) {
  const t = useTokens()
  return (
    <View testID={`g-${id}`} style={{ paddingVertical: 12, paddingHorizontal: pad ? 16 : 0, backgroundColor: t.bg }}>
      <Text style={[tx(13, 500), { color: t.label2, marginBottom: 8, paddingHorizontal: pad ? 0 : 16 }]}>{title}</Text>
      {children}
    </View>
  )
}

export function Gallery({ top }: { top?: number } = {}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const [seg, setSeg] = useState('week')
  const [tg, setTg] = useState(true)
  const [open, setOpen] = useState(true)
  const [ruler, setRuler] = useState<number | undefined>(70)
  const [ruler2, setRuler2] = useState<number | undefined>(undefined)
  const [age, setAge] = useState<number | undefined>(34)
  const [age2, setAge2] = useState<number | undefined>(undefined)
  const [goal, setGoal] = useState<string | undefined>('maintain')
  const [areas, setAreas] = useState<string[]>(['knees'])
  const [enjoy, setEnjoy] = useState<string[]>(['walk'])
  const [often, setOften] = useState<string | undefined>('2')
  const [sheet, setSheet] = useState<'sheet' | 'bare' | null>(null)
  const flip = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

  return (
    <ScrollView testID="gallery" style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top ?? insets.top, paddingBottom: insets.bottom + 24 }}>
      <Sec id="header" title="PageHeader · DayNav · ConnectionPill · ProfileButton">
        <PageHeader eyebrow={<DayNav />} title="Summary" top={18} />
      </Sec>

      <Sec id="pill" title="ConnectionPill and its line, every state">
        <View style={{ gap: 10 }}>
          {G.conn.map((c) => (
            <View key={c.kind} style={{ alignItems: 'flex-start' }}>
              <ConnectionPillView kind={c.kind} label={connectionLabel(c)} open />
              <ConnectionLineView state={c} />
            </View>
          ))}
        </View>
      </Sec>

      <Sec id="icons" title="Icons (20 pt, stroke 2)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {ICON_NAMES.map((n) => <View key={n} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><Icon name={n} color={t.label} /></View>)}
        </View>
      </Sec>

      <Sec id="tabbar" title="Tab bar (Summary on; Mind switched off, Food on)" pad={false}>
        <View style={{ gap: 12 }}>
          <TabBarView active="index" mindOff={false} onPress={() => {}} bottom={0} />
          <TabBarView active="food" mindOff onPress={() => {}} bottom={0} />
        </View>
      </Sec>

      <Sec id="cathead" title="CatHead">
        <Card plain>
          <CatHead color="energy" icon="fork" label="Food" />
          <CatHead color="activity" icon="dumbbell" label="Move" />
          <CatHead color="body" icon="scale" label="Weight" />
          <CatHead color="mind" icon="target" label="Worth a quick check" />
        </Card>
      </Sec>

      <Sec id="seg" title="Seg">
        <Seg options={G.seg} value={seg} onChange={setSeg} />
      </Sec>

      <Sec id="toggle" title="Toggle (on, off, disabled on, disabled off)">
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Toggle on={tg} onChange={() => setTg((x) => !x)} label="Reminders" />
          <Toggle on={!tg} onChange={() => setTg((x) => !x)} label="Quiet hours" />
          <Toggle on disabled onChange={() => {}} label="Always on" />
          <Toggle on={false} disabled onChange={() => {}} label="Not available" />
        </View>
      </Sec>

      <Sec id="rows" title="List · SettingRow · Disclosure">
        <List icons>
          <SettingRow icon="dumbbell" color={t.moveFill} soft label="Training" value="3 days a week" onPress={() => {}} />
          <SettingRow icon="bell" color={t.mindFill} soft label="Notifications" sub="Supplements and the weekly review" onPress={() => {}} />
          <SettingRow icon="fork" color={t.food} label="Solid square" value="On" />
          <Disclosure icon="scale" color={t.foodFill} soft label="Body and goal" value="80 kg · Maintain" open={false} onToggle={() => {}} >{null}</Disclosure>
          <Disclosure icon="target" color={t.foodFill} soft label="Daily targets" value="2,250 kcal" open={open} onToggle={() => setOpen((x) => !x)}>
            <Text style={[tx(15, 400, 1.45), { color: t.label }]}>Targets are ranges. Change them whenever you like.</Text>
          </Disclosure>
        </List>
      </Sec>

      <Sec id="nav" title="BackButton · sheet header buttons">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          <BackButton onPress={() => {}} />
          <BackButton onPress={() => {}} label="Plan" />
          <NavBtn title="Cancel" onPress={() => {}} />
          <NavBtn title="Done" bold onPress={() => {}} />
        </View>
      </Sec>

      <Sec id="buttons" title="Buttons">
        <View style={{ gap: 8 }}>
          <Btn title="Save" onPress={() => {}} />
          <Btn kind="tinted" title="Add a plan" onPress={() => {}} />
          <Btn kind="gray" title="Add food" icon="plus" onPress={() => {}} />
          <Btn kind="danger" title="Delete entry" onPress={() => {}} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small title="Start" onPress={() => {}} />
            <Btn small kind="gray" title="Later" onPress={() => {}} />
            <Btn small title="Off" disabled onPress={() => {}} />
          </View>
        </View>
      </Sec>

      <Sec id="cards" title="Card · Tile">
        <View style={{ gap: 10 }}>
          <Card plain><Text style={[tx(17), { color: t.label }]}>A plain card, 14 by 16 padding.</Text></Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tile style={{ flex: 1 }} onPress={() => {}}><Text style={[tx(13, 600), { color: t.label2 }]}>Weight</Text><Text style={[tx(26, 600, 1.1, -0.02), num, { letterSpacing: -0.52, color: t.label, marginTop: 2 }]}>80.2</Text></Tile>
            <Tile style={{ flex: 1 }}><Text style={[tx(13, 600), { color: t.label2 }]}>Steps</Text><Text style={[tx(26, 600, 1.1, -0.02), num, { letterSpacing: -0.52, color: t.label, marginTop: 2 }]}>6,240</Text></Tile>
          </View>
        </View>
      </Sec>

      <Sec id="charts" title="Rings · Meter · KcalBar · Sparkline">
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Rings size={64} items={[{ pct: 0.8, color: t.food }, { pct: 0.45, color: t.move }, { pct: 1.2, color: t.mind }]} />
            <Rings size={34} stroke={3.5} items={[{ pct: 0.6, color: t.energy }]} />
            <Sparkline values={G.spark} w={96} h={32} color={t.body} />
          </View>
          <Meter pct={0.4} />
          <KcalBar k={1620} lo={1900} hi={2400} />
        </Card>
      </Sec>

      <Sec id="macro" title="MacroTrio">
        <Card><MacroTrio p={92} c={180} f={51} tp={125} tc={260} tf={75} /></Card>
      </Sec>

      <Sec id="weekbars" title="WeekBars (numbers; gentle)">
        <Card>
          <WeekBars rows={rows} lo={1900} hi={2400} cur={cur} />
          <WeekBars rows={rows} lo={1900} hi={2400} cur={cur} numbers={false} />
        </Card>
      </Sec>

      <Sec id="weekstrip" title="WeekStrip">
        <WeekStrip />
      </Sec>

      <Sec id="movestrip" title="MoveStrip">
        <MoveStrip />
      </Sec>

      <Sec id="ruler" title="Ruler (70 kg; not set)">
        <Ruler label="Weight" min={25} max={350} initial={70} value={ruler} onChange={setRuler} valueText={(v) => `${v} kilograms`} />
        <Ruler label="Height" min={100} max={250} initial={170} value={ruler2} onChange={setRuler2} valueText={(v) => `${v} centimetres`} />
      </Sec>

      <Sec id="wheel" title="Wheel (34 years; not set)">
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}><Wheel label="Age in years" unit="years" min={18} max={100} initial={30} value={age} onChange={setAge} valueText={(v) => `${v} years`} rows={5} /></View>
          <View style={{ flex: 1 }}><Wheel label="Age" min={18} max={100} initial={30} value={age2} onChange={setAge2} rows={5} /></View>
        </View>
      </Sec>

      <Sec id="choice" title="ChoiceTiles">
        <ChoiceTiles label="Your goal" opts={G.goal} value={goal} onPick={setGoal} />
      </Sec>

      <Sec id="check" title="CheckTiles (stacked; grid)">
        <View style={{ gap: 16 }}>
          <CheckTiles label="Anything to go easy on" opts={G.areas} value={areas} onToggle={(k) => setAreas((x) => flip(x, k))} />
          <CheckTiles label="What you enjoy" opts={G.enjoy} value={enjoy} onToggle={(k) => setEnjoy((x) => flip(x, k))} grid tall />
          <ChoiceTiles label="How often" opts={G.three} value={often} onPick={setOften} three />
        </View>
      </Sec>

      <Sec id="banner" title="Banner">
        <View style={{ gap: 10 }}>
          <Banner icon="leaf" iconColor={t.mindInk} title="Welcome back." body="A day off logging doesn't undo anything. Pick up from here." onDismiss={() => {}} />
          <Banner icon="bulb" iconColor={t.mindInk} title="How are your plans going?" body="A 10-second check-in on your plan. Plans work best when you revisit them." onPress={() => {}} />
        </View>
      </Sec>

      <Sec id="toast" title="Toast (plain; with an action)">
        <View style={{ gap: 12, alignItems: 'center' }}>
          <ToastView text="Saved" />
          <View style={{ alignSelf: 'stretch', paddingHorizontal: 16, alignItems: 'center' }}><ToastView text="Entry deleted" action={{ label: 'Undo', run: () => {} }} /></View>
        </View>
      </Sec>

      <Sec id="mark" title="TaliMark">
        <View style={{ alignItems: 'center' }}><TaliMark /></View>
      </Sec>

      <Sec id="sheets" title="Sheet · BareSheet">
        <View style={{ gap: 8 }}>
          <Btn kind="gray" title="Open a sheet" onPress={() => setSheet('sheet')} />
          <Btn kind="gray" title="Open a bare sheet" onPress={() => setSheet('bare')} />
        </View>
      </Sec>

      {sheet === 'sheet' && (
        <Sheet title="Edit entry" onClose={() => setSheet(null)} right={<NavBtn title="Save" bold onPress={() => setSheet(null)} />}>
          <List>
            <SettingRow icon="fork" color={t.food} label="Chicken and rice" value="300 g" />
            <SettingRow icon="pill" color={t.mindFill} soft label="Vitamin D" value="1" />
          </List>
          <View style={{ marginTop: 16 }}><Btn title="Save" onPress={() => setSheet(null)} /></View>
        </Sheet>
      )}
      {sheet === 'bare' && (
        <BareSheet label="How did it go?" onClose={() => setSheet(null)}>
          <Text accessibilityRole="header" style={[tx(22, 600, 28, -0.01), { color: t.label, marginTop: 12 }]}>How did it go?</Text>
          <Text style={[tx(17, 400, 1.45), { color: t.label2, marginTop: 8 }]}>A word or two is plenty.</Text>
          <View style={{ marginTop: 16 }}><Btn title="Done" onPress={() => setSheet(null)} /></View>
        </BareSheet>
      )}
    </ScrollView>
  )
}
