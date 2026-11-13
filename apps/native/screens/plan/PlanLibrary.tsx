/**
 * Native port of src/screens/plan/PlanLibrary.tsx: every plan in one list with search, goal chips
 * and filters; when a plan starts; a plan before it starts; how maintenance works.
 */
import { useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import type { Goal, PlanPhase, PlanWeek } from '@/core/types'
import { fmtDate, shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import { bestFit, catalogue, eatingLine, filterCatalogue, fitOf, fits, PLAN_TEMPLATES, phaseWeek, planStart, startOn, timeline, totalWeeks, type CatalogueEntry, type PlanFilters } from '@/core/domain/plans'
import { DAYS, EXPERIENCE, GOAL_CHIP, goalLabel, LENGTH, MADE, MAINTENANCE_STEPS, WHERE } from './planShared'
import { planArt, PlanTile, Shade, Timeline, TimelineKey, WeekRows } from './PlanParts'
import { CatSq } from './PlanViews'
import { BackButton, Btn, Card, Chevron, Chip, Chips, DashAdd, Foot, Icon, Li, LinkBtn, List, M, NavBtn, PlanNote, PvBack, Sheet, TitleRow, font, num, useHero, useTokens } from './ui'

const toggle = <T,>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v])

function FilterGroup<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value?: T[]; onChange: (v: T[]) => void }) {
  const t = useTokens()
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[font(500), { fontSize: 14, color: t.label, marginHorizontal: 4, marginBottom: 8 }]}>{label}</Text>
      <Chips>
        {options.map(([k, l]) => <Chip key={k} sm on={!!value?.includes(k)} title={l} onPress={() => onChange(toggle(value, k))} />)}
      </Chips>
    </View>
  )
}

/** The filter sheet: goal, days, experience, where, length and who made it. */
function FilterSheet({ value, onChange, onClose, count }: { value: PlanFilters; onChange: (f: PlanFilters) => void; onClose: () => void; count: number }) {
  return (
    <Sheet title="Filters" onClose={onClose} left={<NavBtn title="Clear" onPress={() => onChange({ q: value.q })} />} right={<NavBtn bold title="Done" onPress={onClose} />}
      footer={<Btn disabled={count === 0} onPress={onClose} title={count === 0 ? 'No plans match' : `Show ${count} ${count === 1 ? 'plan' : 'plans'}`} />}>
      <FilterGroup label="Goal" options={GOAL_CHIP} value={value.goal} onChange={(goal) => onChange({ ...value, goal })} />
      <FilterGroup label="Days a week" options={DAYS} value={value.days} onChange={(days) => onChange({ ...value, days })} />
      <FilterGroup label="Experience" options={EXPERIENCE} value={value.experience} onChange={(experience) => onChange({ ...value, experience })} />
      <FilterGroup label="Where" options={WHERE} value={value.where} onChange={(where) => onChange({ ...value, where })} />
      <FilterGroup label="Length" options={LENGTH} value={value.length} onChange={(length) => onChange({ ...value, length })} />
      <FilterGroup label="Made by" options={MADE} value={value.madeBy} onChange={(madeBy) => onChange({ ...value, madeBy })} />
    </Sheet>
  )
}

/**
 * Every plan in one list (Plans 1, step 2): Tilo's and the person's own, no categories to manage.
 * The plan that fits their goal leads; search, goal chips and filters narrow it.
 */
export function PlanLibrary({ onBack, onOpen, onNew }: { onBack: () => void; onOpen: (e: CatalogueEntry) => void; onNew: () => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const trainingPlans = useStore((s) => s.data.trainingPlans)
  const profile = useStore((s) => s.data.profile)
  const fit = fitOf(profile)
  const [f, setF] = useState<PlanFilters>({})
  const [sheet, setSheet] = useState(false)
  const [viaSheet, setViaSheet] = useState(false)
  // built to grow: tiles come in pages as you scroll, with a quiet placeholder tile (Plans 1)
  const PAGE = 12
  const [shown, setShown] = useState(PAGE)
  const all = useMemo(() => catalogue({ trainingPlans }, fit), [trainingPlans, fit.goal, fit.age, fit.experience])
  const list = filterCatalogue(all, f)
  const filtered = !!(f.days?.length || f.experience?.length || f.where?.length || f.length?.length || f.madeBy?.length || (f.goal?.length ?? 0) > 1 || (viaSheet && f.goal?.length))
  const narrowed = filtered || !!f.q || !!f.goal?.length
  const best = bestFit(PLAN_TEMPLATES, fit)
  const lead = !narrowed ? list.find((e) => e.template === best && !!best) : undefined
  const rest = list.filter((e) => e !== lead)
  const chipsOn: { label: string; clear: () => void }[] = filtered ? [
    ...(f.goal ?? []).map((g) => ({ label: goalLabel(g) ?? g, clear: () => setF({ ...f, goal: f.goal!.filter((x) => x !== g) }) })),
    ...(f.days ?? []).map((d) => ({ label: `${DAYS.find(([k]) => k === d)?.[1]} days a week`, clear: () => setF({ ...f, days: f.days!.filter((x) => x !== d) }) })),
    ...(f.experience ?? []).map((x) => ({ label: EXPERIENCE.find(([k]) => k === x)![1], clear: () => setF({ ...f, experience: f.experience!.filter((y) => y !== x) }) })),
    ...(f.where ?? []).map((x) => ({ label: WHERE.find(([k]) => k === x)![1], clear: () => setF({ ...f, where: f.where!.filter((y) => y !== x) }) })),
    ...(f.length ?? []).map((x) => ({ label: LENGTH.find(([k]) => k === x)![1], clear: () => setF({ ...f, length: f.length!.filter((y) => y !== x) }) })),
    ...(f.madeBy ?? []).map((x) => ({ label: MADE.find(([k]) => k === x)![1], clear: () => setF({ ...f, madeBy: f.madeBy!.filter((y) => y !== x) }) })),
  ] : []
  const tile = (e: CatalogueEntry, big = false) => (
    <PlanTile key={e.key} name={e.name} line={e.line} art={planArt(e.template?.id ?? e.plan?.baseTemplateId)} fits={!!best && e.template === best} big={big} onPress={() => onOpen(e)}
      style={big ? { marginBottom: 12 } : { width: '48.5%' }} />
  )
  const goalChip = (g: Goal | null, label: string) => {
    const on = g ? f.goal?.length === 1 && f.goal[0] === g : !f.goal?.length
    return <Chip key={label} role="tab" ink={on} plain={!on} size={14} pad={[8, 14]} title={label} onPress={() => setF({ ...f, goal: g ? [g] : undefined })} />
  }
  const page = rest.slice(0, shown)
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: 12 }} scrollEventThrottle={200}
        onScroll={(ev) => { const { layoutMeasurement: l, contentOffset: o, contentSize: c } = ev.nativeEvent; if (rest.length > shown && l.height + o.y >= c.height - 240) setShown((n) => n + PAGE) }}>
        <PvBack><BackButton label="Plan" onPress={onBack} /></PvBack>
        <TitleRow title="Plans" />
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.card, height: 40, borderRadius: 12, paddingHorizontal: 8 }}>
            <Icon name="search" size={17} color={t.label2} />
            <TextInput value={f.q ?? ''} placeholder="Search plans" accessibilityLabel="Search plans" placeholderTextColor={t.label2} onChangeText={(q) => setF({ ...f, q })}
              style={[font(400), { flex: 1, fontSize: 17, color: t.label, height: 40, padding: 0 }]} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setSheet(true)}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: filtered ? t.tint : t.card, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sliders" size={18} color={filtered ? t.onTint : t.label} />
          </Pressable>
        </View>
        {filtered ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {chipsOn.map((c) => <Chip key={c.label} sm on title={`${c.label} ×`} label={`Remove ${c.label}`} onPress={c.clear} />)}
            <LinkBtn title="Clear all" onPress={() => { setViaSheet(false); setF({ q: f.q }) }} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Goal" style={{ marginRight: -16, marginBottom: 16 }} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
            {goalChip(null, 'All')}
            {GOAL_CHIP.map(([g, l]) => goalChip(g, l))}
          </ScrollView>
        )}
        {narrowed && <Foot style={{ paddingTop: 0, paddingHorizontal: 4, marginBottom: 8 }}>{list.length} {list.length === 1 ? 'plan' : 'plans'}</Foot>}
        {lead && tile(lead, true)}
        {rest.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 12 }}>
            {page.map((e) => tile(e))}
            {rest.length > shown && <View style={{ width: '48.5%', height: 196, borderRadius: 22, backgroundColor: t.sep }} />}
          </View>
        )}
        {list.length === 0 && (
          <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: t.dash, borderRadius: 20, padding: 16 }}>
            <Text style={[font(400), { fontSize: 14, color: t.label2 }]}>{f.q && !filtered && !f.goal?.length ? `No plans called “${f.q}”.` : 'No plans match yet. Try removing a filter, or build your own.'}</Text>
          </View>
        )}
        <DashAdd title="New plan" onPress={onNew} />
      </ScrollView>
      {sheet && <FilterSheet value={f} onChange={(v) => { setViaSheet(true); setF(v) }} onClose={() => setSheet(false)} count={filterCatalogue(all, f).length} />}
    </View>
  )
}

/**
 * The start-date picker. The web uses the browser's date input; on native this stand-in steps a day
 * at a time between today and a year ahead until N1's picker lands (told the lead).
 */
function DateSheet({ value, onPick, onClose }: { value: string; onPick: (d: string) => void; onClose: () => void }) {
  const t = useTokens()
  const today = todayStr()
  const [d, setD] = useState(value < today ? today : value)
  const max = shiftDay(today, 365)
  const f = fmtDate(d)
  const step = (n: number) => { const x = shiftDay(d, n); if (x >= today && x <= max) setD(x) }
  const b = (label: string, n: number, sym: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => step(n)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[font(400), { fontSize: 20, color: t.label }]}>{sym}</Text>
    </Pressable>
  )
  return (
    <Sheet title="Pick a start date" onClose={onClose} right={<NavBtn bold title="Done" onPress={() => { onPick(startOn(today, d)); onClose() }} />}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        {b('Day before', -1, '−')}
        <Text style={[font(500), num, { flex: 1, textAlign: 'center', fontSize: 20, color: t.label }]}>{f.dow} {f.full}</Text>
        {b('Day after', 1, '+')}
      </Card>
    </Sheet>
  )
}

/** When a plan starts: today, next Monday, or a date the person picks. */
export function StartChoice({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const t = useTokens()
  const today = todayStr()
  const monday = planStart(today, 'monday')
  const picked = value !== today && value !== monday
  const [pick, setPick] = useState(false)
  const c = (on: boolean, title: string, onPress: () => void, label?: string) =>
    <Chip role="radio" ink={on} plain={!on} size={14} pad={[8, 14]} title={title} label={label} onPress={onPress} />
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Starts" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text style={[font(400), { fontSize: 14, color: t.label2, marginRight: 4 }]}>Starts</Text>
      {c(value === today, 'Today', () => onChange(today))}
      {c(value === monday, shortDateOf(monday), () => onChange(monday))}
      {c(picked, picked ? shortDateOf(value) : 'Pick a date', () => setPick(true), 'Pick a start date')}
      {pick && <DateSheet value={value} onPick={onChange} onClose={() => setPick(false)} />}
    </View>
  )
}

/** The build weeks a plan has, by name (Foundation, Build), for the preview's week switch. */
function buildWeeks(phases: Omit<PlanPhase, 'id'>[]): { name: string; week: PlanWeek }[] {
  const out: { name: string; week: PlanWeek }[] = []
  phases.forEach((ph, i) => {
    if (ph.maintain || ph.after) return
    if (!out.some((x) => x.name === ph.name)) out.push({ name: ph.name, week: phaseWeek({ phases: phases as PlanPhase[] }, i) })
  })
  return out
}

/** `.pp-hero`: the photograph (380 pt; 220 in details) or the plain hero, with the round back button. */
export function PlanHero({ art, height, onBack, children }: { art?: number; height?: number; onBack: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const hero = useHero()
  const t = useTokens()
  return (
    <View style={{ height: height ?? (art != null ? 380 : 240), marginHorizontal: -16, marginBottom: 18, backgroundColor: art != null ? t.sep : hero }}>
      {art != null && <Image source={art} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />}
      {art != null && <Shade stops={[[0, 0.3], [0.22, 0], [0.5, 0], [1, 0.65]]} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
        style={{ position: 'absolute', left: 16, top: insets.top + 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevL" size={18} stroke={2.6} color="#1d1d1f" />
      </Pressable>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 18 }}>{children}</View>
    </View>
  )
}

/**
 * A plan before it starts (Plans 1, step 3): its photograph, what it is, how the weeks go, a build
 * week, maintenance after, eating for it, who it's for, and when to start.
 */
export function PlanPreview({ entry, onBack, onStart, onMaintenance, note }: {
  entry: CatalogueEntry; onBack: () => void; onStart: (startedAt: string) => void; onMaintenance: () => void; note?: string
}) {
  const t = useTokens()
  const routines = useStore((s) => s.data.routines)
  const profile = useStore((s) => s.data.profile)
  const quiet = useStore((s) => quietNumbers(s.data))
  const tp = entry.template
  const phases = tp?.phases ?? entry.plan?.phases ?? []
  const weeks = buildWeeks(phases)
  const [shown, setShown] = useState(Math.min(1, Math.max(0, weeks.length - 1)))
  const [start, setStart] = useState(todayStr())
  const n = totalWeeks({ phases })
  const art = planArt(tp?.id ?? entry.plan?.baseTemplateId)
  const fitsHere = !!tp && fits(tp, fitOf(profile))
  const s14 = [font(400), { fontSize: 14, lineHeight: 19, color: t.label }]
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <PlanHero art={art} onBack={onBack}>
          {fitsHere && (
            <View style={{ alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.tint, marginBottom: 8 }}>
              <Text style={[font(600), { fontSize: 12, color: '#fff' }]}>Fits your goal: {goalLabel(profile.goal)}</Text>
            </View>
          )}
          <Text accessibilityRole="header" style={[font(600), { fontSize: 34, lineHeight: 40, letterSpacing: -0.68, color: '#fff' }]}>{entry.name}</Text>
          <Text style={[font(400), num, { fontSize: 15, color: 'rgba(255,255,255,0.92)' }]}>{entry.line}</Text>
        </PlanHero>
        {note && <PlanNote>{`From your last plan: “${note}”`}</PlanNote>}
        {tp && <Text style={[font(400), { fontSize: 16, lineHeight: 24, color: t.label, marginBottom: 16 }]}>{tp.about}</Text>}
        <Card style={{ gap: 12, marginBottom: 16 }}>
          <Text style={[font(600), { fontSize: 13, color: t.label2 }]}>How the {n} weeks go</Text>
          <Timeline cells={timeline({ phases: phases as PlanPhase[] })} endLabel={`Week ${n}`} />
          <TimelineKey />
          {tp && <Text style={[font(400), { fontSize: 14, lineHeight: 21, color: t.label }]}>{tp.weeksText}</Text>}
        </Card>
        {weeks.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
              <Text accessibilityRole="header" style={[font(600), { fontSize: 17, color: t.label }]}>{weeks.length > 1 ? `A ${weeks[shown].name.toLowerCase()} week` : 'The week'}</Text>
              {weeks.length > 1 && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {weeks.map((w, i) => <Chip key={w.name} sm on={i === shown} title={w.name} onPress={() => setShown(i)} />)}
                </View>
              )}
            </View>
            <WeekRows week={weeks[shown].week} routines={routines} />
          </>
        )}
        <List>
          <Li onPress={onMaintenance}>
            <CatSq sm color={t.fill} />
            <M wrap t="After the plan: maintenance" s="When the plan ends, you can switch to maintenance: the same workouts with fewer sets, to keep what you've built for as long as you need." />
            <Chevron />
          </Li>
          {tp && (
            <Li>
              <CatSq sm color={t.foodFill} />
              <M wrap t="Eating for this plan" s={eatingLine(tp, profile.goal, quiet)} />
            </Li>
          )}
        </List>
        {tp && (
          <List>
            {([['For', tp.forWho], ['Kit', tp.kit], ['Time', tp.time]] as const).map(([k, v]) => (
              <Li key={k} style={{ gap: 12, minHeight: 0, paddingVertical: 12, alignItems: 'flex-start' }}>
                <Text style={[...s14, { color: t.label2, width: 72 }]}>{k}</Text>
                <Text style={[...s14, { flex: 1 }]}>{v}</Text>
              </Li>
            ))}
          </List>
        )}
        {tp?.id === 'pure-muscle-growth' && (!profile.training?.experience || profile.training.experience === 'beginner') && (
          <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 8 }}>New to lifting? Full body system is a better first plan.</Foot>
        )}
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>{tp?.safety ? tp.safety + ' ' : ''}General fitness information only, not medical advice. Talk to a GP before starting a new exercise programme.</Foot>
      </ScrollView>
      <View style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.sep, gap: 10 }}>
        <StartChoice value={start} onChange={setStart} />
        <Btn tall title="Start plan" onPress={() => onStart(start)} />
      </View>
    </View>
  )
}

/** How maintenance works (Plans 1, full-screen card): reached from the preview, details and the end. */
export function MaintenanceCard({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const bar = (label: string, outline: boolean, flex: number) => (
    <View style={{ flex, paddingTop: 16 }}>
      <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, borderRadius: 3 }, outline ? { borderWidth: 1.5, borderColor: t.dash } : { backgroundColor: t.sep }]} />
      <Text style={[font(400), { fontSize: 12, color: t.label2 }]}>{label}</Text>
    </View>
  )
  return (
    <Sheet title="After your plan" onClose={onClose} tall left={null} right={<NavBtn title="Close" onPress={onClose} />} footer={<Btn title="Got it" onPress={onClose} />}>
      <Text accessibilityRole="header" style={[font(600), { fontSize: 28, lineHeight: 34, letterSpacing: -0.56, color: t.label, marginHorizontal: 4, marginBottom: 14 }]}>Keeping what you've built</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 4, marginBottom: 18 }}>
        {bar('Your plan: building', false, 3)}{bar('Maintenance: holding steady', true, 2)}
      </View>
      <View style={{ gap: 16 }}>
        {MAINTENANCE_STEPS.map(([h, p], i) => (
          <View key={h} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[font(600), num, { fontSize: 14, color: t.tint }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font(600), { fontSize: 17, color: t.label, marginBottom: 4 }]}>{h}</Text>
              <Text style={[font(400), { fontSize: 15, lineHeight: 21.75, color: t.label2 }]}>{p}</Text>
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  )
}
