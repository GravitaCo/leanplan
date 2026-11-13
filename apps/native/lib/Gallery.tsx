/**
 * The component gallery (native-build-plan N1): every design-system piece in its main states, for
 * `design` to review against the web. scripts/e2e-gallery-parity.cjs screenshots each section
 * (testID `g-<id>`) beside the same section of the web twin (scripts/web-gallery/Gallery.tsx), in
 * light and dark. Keep the two files' sections, order and props the same.
 *
 * For Benn, Sara and the team only (opened from the Spike sheet); never part of the app.
 */
import { useState, type ReactNode } from 'react'
import { Modal, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { connectionLabel } from '@/core/domain/connection'
import { G } from './galleryData'
import { dayStat, weekOf } from '@/core/domain/insights'
import { Icon, ICON_NAMES } from './ui/icons'
import { Banner, Big, Btn, Card, Chip, Chips, DashAdd, LinkBtn, List, Note, RoundBtn, Stack, Tile, ToastHost, ToastView } from './ui/kit'
import { Scale, Select, Slider, Stepper } from './ui/controls'
import { DateInput, TimeField } from './ui/pickers'
import { CoverImage } from './ui/CoverImage'
import { frac } from '@/core/domain/estimate'
import { AddC, Row, Swatch, XBtn, BackButton, BareSheet, overlayBack, useOverlayOpen, CatHead, ConnectionLineView, ConnectionPillView, Disclosure, NavBtn, PageHeader, Seg, SettingRow, Sheet, Toggle } from './ui/primitives'
import { KcalBar, MacroTrio, Meter, Rings, Sparkline, WeekBars } from './ui/charts'
import { DayNav, MoveStrip, WeekStrip } from './ui/WeekStrip'
import { TabBarView } from './ui/TabBar'
import { Ruler } from './ui/Ruler'
import { Wheel } from './ui/Wheel'
import { CheckTiles, ChoiceTiles } from './ui/Tiles'
import { TaliMark } from './ui/brand'
import { Empty, Foot, GrpH, Lbl, Prose, Sub, TextLink } from './ui/text'
import { Field, FRow, Input, NameField, SearchBar } from './ui/fields'
import { Check, ConsentRow, Opts, Signposts, Ticks } from './ui/choices'
import { supportList } from '@/screens/profile/supportRows'
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

/** `standalone`: opened as its own route (/gallery), outside the tab shell and its toast host. */
export function Gallery({ top, standalone = false }: { top?: number; standalone?: boolean } = {}) {
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
  const [oneOpt, setOneOpt] = useState<string | undefined>('some')
  const [consentA, setConsentA] = useState(true)
  const [consentB, setConsentB] = useState(false)
  const [kitOpts, setKitOpts] = useState<string[]>(['db'])
  const [mult, setMult] = useState(1.5)
  const [serv, setServ] = useState('1')
  const [mood, setMood] = useState(3)
  const [hand, setHand] = useState('palm')
  const [count, setCount] = useState(1.5)
  const [cardio, setCardio] = useState('Brisk walk')
  const [activity, setActivity] = useState('moderate')
  const [wake, setWake] = useState('07:00')
  const [day, setDay] = useState('')
  const [sheet, setSheet] = useState<'sheet' | 'bare' | null>(null)
  // a stand-in for the guided player: a full-screen Modal with an overlay sheet over it
  const [player, setPlayer] = useState(false)
  const [overSheet, setOverSheet] = useState(false)
  const overlayOpen = useOverlayOpen()
  const flip = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

  return (
    <>
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

      <Sec id="chips" title="Chips">
        <Chips>
          <Chip title="Keep it" onPress={() => {}} />
          <Chip title="Turn it off" onPress={() => {}} />
          <Chip title="Breakfast" sub="7 to 10 am" on onPress={() => {}} />
          <Chip title="Lunch" sub="12 to 2 pm" on={false} onPress={() => {}} />
        </Chips>
      </Sec>

      <Sec id="text" title="Lbl · GrpH · Foot · Sub · Prose">
        <GrpH small="3 of 5">This week</GrpH>
        <Lbl>Notifications</Lbl>
        <List><Row title="A row under a label" /></List>
        <Foot>Your review shows how often you weighed in. Change it any time.</Foot>
        <Sub style={{ marginTop: 12 }}>A secondary line at 15 pt.</Sub>
        <View style={{ marginTop: 12 }}>
          <Prose blocks={[{ p: G.prose.p1 }, { ul: G.prose.li }, { h3: G.prose.h3 }, { p: G.prose.p2 }]} />
        </View>
      </Sec>

      <Sec id="rows2" title="Row · act · nested · wrapping rows · sign out">
        <View style={{ gap: 10 }}>
          <List>
            <Row title="Push Pull Legs" sub="3 days a week" onPress={() => {}} />
            <Row title="Monday" value="Push" onPress={() => {}} />
            <Row title="New plan" act icon="plus" onPress={() => {}} />
          </List>
          <List icons wrap>
            <SettingRow icon="bell" color={t.mindFill} soft label="Supplement reminders" sub="On at 8:00 and 20:00, and quiet from 22:00 to 7:00" right={<Toggle on onChange={() => {}} label="Supplement reminders" />} />
            <Row nested title="Show supplement names in reminders" right={<Toggle on={false} onChange={() => {}} label="Show supplement names in reminders" />} />
            <SettingRow icon="moon" color={t.mindFill} soft label="Wind down" value="21:30" onPress={() => {}} />
          </List>
          <Btn kind="signout" title="Sign out" onPress={() => {}} />
        </View>
      </Sec>

      <Sec id="rows3" title="Row: squares, tag, wrapping sub, trailing slots, needsnet, pv">
        <View style={{ gap: 10 }}>
          <List icons>
            <Row square={{ icon: 'wind', fill: t.mindFill, ink: t.mindInk }} title="Reset" sub="Two minutes of slower breathing, whenever you need it" wrapSub onPress={() => {}} />
            <Row square={{ icon: 'fork', fill: t.energy, ink: t.onFood }} title="Oat porridge" sub="158 kcal · 5.4 g protein per 100 g" tag="Mine" right={<AddC label="Add Oat porridge" onPress={() => {}} />} />
            <Row title="Today" value="1,500 kcal" strong />
            <Row title="Shared products" sub="Needs a connection. Search works offline." needsnet onPress={() => {}} />
            <Row title="A note you can hide" right={<XBtn label="Hide this note" onPress={() => {}} />} />
            <Row title="Weekly review" sub="Sunday" right={<Btn small title="Open" onPress={() => {}} />} />
          </List>
          <List>
            <Row pv lead={<View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.fill }} />} title="Full body, a longer name that wraps onto two lines" sub="Strength · 6 exercises · about 35 min" sub2="Last done Tuesday" onPress={() => {}} />
          </List>
        </View>
      </Sec>

      <Sec id="notes" title="Note (info, warn, ok) · Empty">
        <Note status>These numbers look high for this food. Check the label.</Note>
        <Note kind="warn" action={{ title: 'Check again', onPress: () => {} }}>The camera is off for Tilo. You can still type the barcode.</Note>
        <Note kind="ok" status>These numbers are consistent with each other.</Note>
        <Empty>Add what went in. Don't forget the oil.</Empty>
      </Sec>

      <Sec id="chips2" title="Chip sizes and tones · radio and tab roles">
        <View style={{ gap: 10 }}>
          <Chips>
            <Chip size="sm" role="tab" on title="Week 1" onPress={() => {}} />
            <Chip size="sm" role="tab" on={false} title="Week 2" onPress={() => {}} />
            <Chip size="sm" on label="Remove Vegetarian" title="Vegetarian ×" onPress={() => {}} />
          </Chips>
          <Chips>
            <Chip tone="ink" title="Log it" onPress={() => {}} />
            <Chip tone="plain" title="Not today" onPress={() => {}} />
            <Chip role="radio" on title="Small" onPress={() => {}} />
            <Chip role="radio" on={false} title="Large" onPress={() => {}} />
          </Chips>
        </View>
      </Sec>

      <Sec id="links" title="TextLink in a sentence · GrpH link · Lbl style">
        <Text style={[tx(15, 400, 1.45), { color: t.label }]}>
          Today can be lighter. <TextLink onPress={() => {}}>Change what Summary shows</TextLink>, or <TextLink onPress={() => {}} label="Open support" expanded={false}>find support</TextLink>.
        </Text>
        <GrpH link={{ title: 'See all', onPress: () => {} }}>Your workouts</GrpH>
        <Lbl style={{ paddingTop: 4 }}>A label with less space above</Lbl>
      </Sec>

      <Sec id="fields" title="Field · Input · textarea · FRow · NameField · SearchBar">
        <Field label="Email"><Input label="Email" value="sam@example.com" onChangeText={() => {}} keyboardType="email-address" autoCapitalize="none" /></Field>
        <Field label="What would help?"><Input label="What would help?" placeholder="A short walk after lunch" onChangeText={() => {}} /></Field>
        <Field label="Note"><Input label="Note" multiline value={'Felt strong today.\nSlept well.'} onChangeText={() => {}} style={{ minHeight: 80 }} /></Field>
        <List>
          <FRow label="Name" value="Oat porridge" onChangeText={() => {}} />
          <FRow label="Serving" value="40" unit="g" keyboardType="decimal-pad" onChangeText={() => {}} />
          <FRow label="Protein" need placeholder="Needed" unit="g" keyboardType="decimal-pad" onChangeText={() => {}} />
          <FRow label="Energy" value="1250" unit="kcal" flag="Check this against the pack" keyboardType="number-pad" onChangeText={() => {}} />
        </List>
        <View style={{ marginTop: 16 }}><NameField label="Name" value="Strength, 3 days" onChangeText={() => {}} /></View>
        <SearchBar label="Search plans" placeholder="Search plans" onChangeText={() => {}} />
      </Sec>

      <Sec id="opts" title="Opts (one answer; several)">
        <View style={{ gap: 16 }}>
          <Opts label="How often" opts={G.opts} value={oneOpt} onPick={setOneOpt} />
          <Opts label="Your kit" opts={G.kit} value={kitOpts} onPick={(k) => setKitOpts((x) => flip(x, k))} multi />
        </View>
      </Sec>

      <Sec id="ticks" title="Ticks · Check (on, off, small)">
        <Ticks items={G.ticks} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
          <Check on /><Check on={false} /><Check on sm /><Check on={false} sm />
        </View>
      </Sec>

      <Sec id="signposts" title="Signposts">
        <View style={{ gap: 10 }}>
          <Signposts list={supportList('england')} />
          <Signposts list={G.beatLines} />
        </View>
      </Sec>

      <Sec id="extras" title="ConsentRow · Row wrap · BackButton small · Banner, no icon · Btn iconAfter · TaliMark colour">
        <List>
          <ConsentRow on={consentA} onChange={setConsentA} label="I agree to Tilo storing and using my health information, as the privacy policy explains.">
            I agree to Tilo storing and using my health information, as the <TextLink onPress={() => {}}>privacy policy</TextLink> explains.
          </ConsentRow>
          <ConsentRow on={consentB} onChange={setConsentB} label="I’m 18 or over.">I’m 18 or over.</ConsentRow>
        </List>
        <List style={{ marginTop: 10 }}>
          <Row wrap title="Delete your account and everything in it, on every device" sub="This can’t be undone. Download a copy first if you want one." />
          <SettingRow icon="camera" color={t.tint} label="Take a photo" accessibilityLabel="Take a photo of the barcode" onPress={() => {}} />
        </List>
        <View style={{ marginTop: 10, gap: 10 }}>
          <BackButton small onPress={() => {}} label="Profile" />
          <Banner title="Your data is safe on this phone." body="Sign in again to back it up." />
          <Btn title="Continue" iconAfter="chevR" onPress={() => {}} />
          <View style={{ backgroundColor: t.tint, borderRadius: t.radius, padding: 16, alignItems: 'center' }}><TaliMark width={90} color="#ffffff" /></View>
        </View>
      </Sec>

      <Sec id="insets" title="List inset (72: library rows; 0: Today list)">
        <View style={{ gap: 10 }}>
          <List inset={72}>
            <Row lead={<View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.fill }} />} title="Goblet squat" sub="Legs · dumbbell" style={{ minHeight: 64 }} onPress={() => {}} />
            <Row lead={<View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.fill }} />} title="Push-up" sub="Chest · body weight" style={{ minHeight: 64 }} onPress={() => {}} />
          </List>
          <List inset={0} style={{ borderRadius: 20 }}>
            <Row title="Full body" sub="6 exercises" onPress={() => {}} />
            <Row title="Walk" sub="30 min" onPress={() => {}} />
          </List>
        </View>
      </Sec>

      <Sec id="p4" title="Slider · Stepper · Scale (servings; check-in) · chips with hints · Select">
        <Card plain>
          <Big center value={String(Math.round(412 * mult))} unit="kcal" />
          <Slider min={0.25} max={3} step={0.05} value={mult} onChange={setMult} label="Portion size" style={{ marginTop: 12 }} />
        </Card>
        <View style={{ marginTop: 10 }}><Scale items={G.serv} value={serv} onPick={setServ} /></View>
        <View style={{ marginTop: 10 }}><Scale tall items={G.moods} value={mood} onPick={setMood} /></View>
        <View style={{ marginTop: 10 }}>
          <Chips>{G.hands.map(([k, l, h]) => <Chip key={k} title={l} sub={h} on={hand === k} onPress={() => setHand(k)} />)}</Chips>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <Text style={[tx(17), { color: t.label }]}>How many</Text>
          <Stepper value={frac(count)} decLabel="Fewer" incLabel="More" onDec={() => setCount(Math.max(0.5, count - 0.5))} onInc={() => setCount(Math.min(6, count + 0.5))} />
        </View>
        <List style={{ marginTop: 14 }}>
          <FRow label="Type" right={<Select row label="Type" value={cardio} options={G.cardio} onChange={setCardio} />} />
        </List>
        <View style={{ marginTop: 10 }}>
          <Field label="Activity level"><Select label="Activity level" value={activity} options={G.activity} onChange={setActivity} /></Field>
        </View>
      </Sec>

      <Sec id="n5" title="RoundBtn · icon navbtns · DashAdd · link Btn · Note, tinted button · Row key · Big · FRow hint">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <RoundBtn label="Add food" onPress={() => {}} />
          <NavBtn icon="barcode" label="Scan barcode" style={{ paddingHorizontal: 2 }} onPress={() => {}} />
          <NavBtn icon="x" muted label="Delete Oat porridge" onPress={() => {}} />
        </View>
        <DashAdd title="Breakfast" stroke={2.6} onPress={() => {}} />
        <DashAdd title="Add a workout" onPress={() => {}} />
        <View style={{ marginTop: 12 }}><Btn kind="link" title="Save as new" onPress={() => {}} /></View>
        <Note action={{ title: 'Try again', kind: 'tinted', onPress: () => {} }}>The label couldn’t be read. Try again in better light.</Note>
        <List style={{ marginTop: 10 }}>
          <Row k="Yours" title="Oat porridge" />
          <Row k="From the shared list" title="Oats, porridge, made with semi-skimmed milk" />
        </List>
        <Card plain style={{ marginTop: 10 }}><Big value="412" unit="kcal" pm="± 40" /></Card>
        <List style={{ marginTop: 10 }}>
          <FRow label="Palm" hint="Meat, fish, tofu" value="100" unit="g" keyboardType="number-pad" onChangeText={() => {}} />
          <FRow label="Thumb" hint="Oil, butter, nut butter" value="12" unit="g" keyboardType="number-pad" onChangeText={() => {}} />
        </List>
      </Sec>

      <Sec id="pickers" title="Time fields (tap for the wheels; both disabled) · a date in a sheet">
        <List>
          <FRow label="Wake time" right={<TimeField muted label="Wake time" value={wake} onChange={setWake} />} />
          <FRow label="Wind down" right={<TimeField muted label="Wind down" value="21:30" onChange={() => {}} />} />
        </List>
        <List style={{ marginTop: 10 }}>
          <FRow label="Wake up" right={<TimeField muted disabled label="Wake up" value="07:00" onChange={() => {}} />} />
          <FRow label="Wind-down" right={<TimeField muted disabled label="Wind-down" value="21:30" onChange={() => {}} />} />
        </List>
        {/* the web's .pl-date: the button's look with the date input over it */}
        <DateInput mode="date" value={day} onChange={setDay} min="2026-11-13" max="2027-11-13" label="Pick a start date" shown={day || undefined}
          style={{ marginTop: 10, height: 50, borderRadius: 25, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[tx(17, 600, 1.3, 0), { color: t.label }]}>{day ? `Starts ${day}` : 'Pick a date'}</Text>
        </DateInput>
      </Sec>

      <Sec id="kit2" title="Stack · flat links · XBtn with chevrons · Swatch rows">
        <Stack style={{ marginTop: 0 }}>
          <Btn title="Start" onPress={() => {}} />
          <Btn kind="gray" title="Not today" onPress={() => {}} />
        </Stack>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 14 }}>
          <LinkBtn flat title="How to do it" onPress={() => {}} />
          <LinkBtn flat title="+ Add a set" onPress={() => {}} />
          <LinkBtn title="Remove" color={t.red} onPress={() => {}} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
          <XBtn icon="chevL" rotate={90} label="Move Goblet squat up" onPress={() => {}} />
          <XBtn icon="chevR" rotate={90} label="Move Goblet squat down" onPress={() => {}} />
          <XBtn icon="chevR" rotate={90} disabled label="Move Plank down" onPress={() => {}} />
        </View>
        <List style={{ marginTop: 14 }}>
          <Row lead={<Swatch color={t.moveFill} />} title="Strength" sub="Full body, lower, upper" onPress={() => {}} />
          <Row lead={<Swatch sm color={t.foodFill} />} title="Eating" value="Maintenance" />
        </List>
      </Sec>

      <Sec id="cover" title="CoverImage (50% 30%) · GrpH as h2">
        <CoverImage source={require('../assets/auth-hero.jpg')} x={0.5} y={0.3} style={{ height: 160, borderRadius: 16 }} />
        <GrpH h2>This week</GrpH>
        <List><Row title="Monday" value="Push" /></List>
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
          <Btn kind="gray" title="Open a full-screen view" onPress={() => setPlayer(true)} />
        </View>
      </Sec>

      {sheet === 'sheet' && (
        <Sheet title="Edit entry" onClose={() => setSheet(null)} right={<NavBtn title="Save" bold onPress={() => setSheet(null)} />}>
          <List>
            <SettingRow icon="fork" color={t.food} label="Chicken and rice" value="300 g" />
            <SettingRow icon="pill" color={t.mindFill} soft label="Vitamin D" value="1" />
          </List>
          <View style={{ marginTop: 16, gap: 8 }}>
            <Btn kind="gray" title="Show a toast" onPress={() => useStore.getState().showToast('Entry deleted', { label: 'Undo', run: () => {} })} />
            <Btn kind="gray" title="Swap to the bare sheet" onPress={() => { setSheet('bare'); useStore.getState().showToast('Swapped') }} />
            <Btn title="Save" onPress={() => setSheet(null)} />
          </View>
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
    {/* Android's back closes an overlay sheet first, then the view (overlayBack) */}
    <Modal visible={player} animationType="none" onRequestClose={() => { if (!overlayBack()) setPlayer(false) }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* the holder's own content, hidden from TalkBack while an overlay sheet is open */}
        <View importantForAccessibility={overlayOpen ? 'no-hide-descendants' : 'auto'} style={{ flex: 1, padding: 24, paddingTop: 80, gap: 12 }}>
          <Text style={[tx(22, 600), { color: '#fff' }]}>Full-screen view</Text>
          <Btn title="Open a sheet over it" kind="gray" onPress={() => setOverSheet(true)} />
          <Btn title="Close the view" kind="gray" onPress={() => setPlayer(false)} />
        </View>
        {overSheet && (
          <Sheet overlay title="Adjust" onClose={() => setOverSheet(false)} right={<NavBtn title="Done" bold onPress={() => setOverSheet(false)} />}>
            <List icons><SettingRow icon="dumbbell" color={t.moveFill} soft label="Weight" value="20 kg" /></List>
          </Sheet>
        )}
      </View>
    </Modal>
    {standalone && <ToastHost />}
    </>
  )
}
