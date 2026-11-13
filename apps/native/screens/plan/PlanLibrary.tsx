/**
 * The web's src/screens/plan/PlanLibrary.tsx on lib/ui: every plan in one list with search, goal
 * chips and filters (Plans 1, step 2); when a plan starts; a plan before it starts (step 3).
 */
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import type { Goal, PlanPhase, PlanWeek } from '@/core/types'
import { shortDateOf, todayStr } from '@/core/domain/date'
import { bestFit, catalogue, eatingLine, filterCatalogue, fitOf, fits, PLAN_TEMPLATES, phaseWeek, planStart, timeline, totalWeeks, type CatalogueEntry, type PlanFilters } from '@/core/domain/plans'
import { GOAL_CHIP, PLAN_FILTER_DAYS as DAYS, PLAN_FILTER_EXPERIENCE as EXPERIENCE, PLAN_FILTER_LENGTH as LENGTH, PLAN_FILTER_MADE as MADE, PLAN_FILTER_WHERE as WHERE } from '@/copy/plan'
import { goalLabel } from '@/screens/plan/planModel'
import { planArt } from '@/screens/plan/planArt'
import { Btn, Chip, Chips, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, NavBtn, Row, Sheet, TitleRow } from '../../lib/ui/primitives'
import { SearchBar } from '../../lib/ui/fields'
import { Empty, Foot } from '../../lib/ui/text'
import { Icon } from '../../lib/ui/icons'
import { num, tx, useTokens } from '../../lib/theme'
import { FitsBadge, PlanHero, PlanNote, PlanTile, Timeline, TimelineKey, WeekRows } from './PlanParts'
import { AddRow, PlanPage, PvBack } from './PlanViews'

const toggle = <T,>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v])

function FilterGroup<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value?: T[]; onChange: (v: T[]) => void }) {
  const t = useTokens()
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[tx(14, 500), { color: t.label, marginHorizontal: 4, marginBottom: 8 }]}>{label}</Text>
      <Chips>{options.map(([k, l]) => <Chip key={k} size="sm" on={!!value?.includes(k)} title={l} onPress={() => onChange(toggle(value, k))} />)}</Chips>
    </View>
  )
}

/** The filter sheet: goal, days, experience, where, length and who made it. */
function FilterSheet({ value, onChange, onClose, count }: { value: PlanFilters; onChange: (f: PlanFilters) => void; onClose: () => void; count: number }) {
  return (
    <Sheet title="Filters" onClose={onClose} left={<NavBtn title="Clear" onPress={() => onChange({ q: value.q })} />} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <FilterGroup label="Goal" options={GOAL_CHIP} value={value.goal} onChange={(goal) => onChange({ ...value, goal })} />
      <FilterGroup label="Days a week" options={DAYS} value={value.days} onChange={(days) => onChange({ ...value, days })} />
      <FilterGroup label="Experience" options={EXPERIENCE} value={value.experience} onChange={(experience) => onChange({ ...value, experience })} />
      <FilterGroup label="Where" options={WHERE} value={value.where} onChange={(where) => onChange({ ...value, where })} />
      <FilterGroup label="Length" options={LENGTH} value={value.length} onChange={(length) => onChange({ ...value, length })} />
      <FilterGroup label="Made by" options={MADE} value={value.madeBy} onChange={(madeBy) => onChange({ ...value, madeBy })} />
      <View style={{ paddingTop: 12 }}><Btn disabled={count === 0} onPress={onClose} title={count === 0 ? 'No plans match' : `Show ${count} ${count === 1 ? 'plan' : 'plans'}`} /></View>
    </Sheet>
  )
}

/**
 * Every plan in one list: Tilo's and the person's own. The plan that fits their goal leads; search,
 * goal chips and filters narrow it. Built to grow: tiles come in pages as you scroll.
 */
export function PlanLibrary({ onBack, onOpen, onNew }: { onBack: () => void; onOpen: (e: CatalogueEntry) => void; onNew: () => void }) {
  const t = useTokens()
  const trainingPlans = useStore((s) => s.data.trainingPlans)
  const profile = useStore((s) => s.data.profile)
  const fit = fitOf(profile)
  const [f, setF] = useState<PlanFilters>({})
  const [sheet, setSheet] = useState(false)
  const [viaSheet, setViaSheet] = useState(false)
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
    // .pl-goals .chip: 14 pt, padding 8 14
    return <Chip key={label} role="tab" on={on} tone={on ? 'ink' : 'plain'} title={label} onPress={() => setF({ ...f, goal: g ? [g] : undefined })} />
  }
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} scrollEventThrottle={200}
        onScroll={(ev) => { const { layoutMeasurement: l, contentOffset: o, contentSize: c } = ev.nativeEvent; if (rest.length > shown && l.height + o.y >= c.height - 240) setShown((n) => n + PAGE) }}>
        <PvBack><BackButton label="Plan" onPress={onBack} /></PvBack>
        <TitleRow title="Plans" />
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
          {/* .pl-search .searchbar: --card, 40 high, radius 12 */}
          <SearchBar label="Search plans" placeholder="Search plans" value={f.q ?? ''} onChangeText={(q) => setF({ ...f, q })}
            style={{ flex: 1, backgroundColor: t.card, height: 40, borderRadius: 12 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setSheet(true)}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: filtered ? t.tint : t.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Icon name="sliders" size={18} color={filtered ? t.onTint : t.label} />
          </Pressable>
        </View>
        {filtered ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {chipsOn.map((c) => <Chip key={c.label} size="sm" on title={`${c.label} ×`} label={`Remove ${c.label}`} onPress={c.clear} />)}
            <LinkBtn title="Clear all" onPress={() => { setViaSheet(false); setF({ q: f.q }) }} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Goal" style={{ marginRight: -16, marginBottom: 16 }} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
            {goalChip(null, 'All')}
            {GOAL_CHIP.map(([g, l]) => goalChip(g, l))}
          </ScrollView>
        )}
        {narrowed && <Foot style={{ paddingTop: 0, paddingHorizontal: 4, marginBottom: 8 }}>{`${list.length} ${list.length === 1 ? 'plan' : 'plans'}`}</Foot>}
        {lead && tile(lead, true)}
        {rest.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 12 }}>
            {rest.slice(0, shown).map((e) => tile(e))}
            {rest.length > shown && <View style={{ width: '48.5%', height: 196, borderRadius: 22, backgroundColor: t.sep }} />}
          </View>
        )}
        {/* TODO(N1-P3): `.dash-empty`, the dashed empty box; lib/ui's Empty stands in */}
        {list.length === 0 && <Empty>{f.q && !filtered && !f.goal?.length ? `No plans called “${f.q}”.` : 'No plans match yet. Try removing a filter, or build your own.'}</Empty>}
        <AddRow top={list.length === 0 ? 12 : 0} title="New plan" onPress={onNew} />
      </ScrollView>
      {sheet && <FilterSheet value={f} onChange={(v) => { setViaSheet(true); setF(v) }} onClose={() => setSheet(false)} count={filterCatalogue(all, f).length} />}
    </View>
  )
}

/** When a plan starts: today, next Monday, or a date the person picks. */
export function StartChoice({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const t = useTokens()
  const today = todayStr()
  const monday = planStart(today, 'monday')
  const picked = value !== today && value !== monday
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Starts" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text style={[tx(14), { color: t.label2, marginRight: 4 }]}>Starts</Text>
      <Chip role="radio" on={value === today} tone={value === today ? 'ink' : 'plain'} title="Today" onPress={() => onChange(today)} />
      <Chip role="radio" on={value === monday} tone={value === monday ? 'ink' : 'plain'} title={shortDateOf(monday)} onPress={() => onChange(monday)} />
      {/* TODO(N1-P4): "Pick a date" opens tilo-pickers' date picker (today to a year ahead, startOn); until then only a chosen date shows */}
      {picked && <Chip role="radio" on tone="ink" title={shortDateOf(value)} onPress={() => onChange(value)} />}
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

/** A plan before it starts: its photograph, what it is, how the weeks go, a build week, maintenance, eating, who it's for, when to start. */
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
  const fact = [tx(14), { color: t.label }]
  return (
    <PlanPage footer={
      // .pp-cta: fixed at the bottom on --bg with a top rule
      <View style={{ borderTopWidth: 1, borderTopColor: t.sep, marginHorizontal: -16, marginTop: -12, paddingHorizontal: 16, paddingTop: 12, gap: 10, backgroundColor: t.bg }}>
        <StartChoice value={start} onChange={setStart} />
        <Btn title="Start plan" onPress={() => onStart(start)} style={{ minHeight: 54, borderRadius: 27 }} />
      </View>
    }>
      <PlanHero art={art} onBack={onBack}>
        {fitsHere && <FitsBadge text={`Fits your goal: ${goalLabel(profile.goal)}`} style={{ marginBottom: 8 }} />}
        <Text accessibilityRole="header" style={[tx(34, 600, 40, -0.02), { color: '#fff' }]}>{entry.name}</Text>
        <Text style={[tx(15), num, { color: 'rgba(255,255,255,0.92)' }]}>{entry.line}</Text>
      </PlanHero>
      {note && <PlanNote>{`From your last plan: “${note}”`}</PlanNote>}
      {tp && <Text style={[tx(16, 400, 1.5), { color: t.label, marginBottom: 16 }]}>{tp.about}</Text>}
      <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 12, marginBottom: 16 }}>
        <Text style={[tx(13, 600), { color: t.label2 }]}>How the {n} weeks go</Text>
        <Timeline cells={timeline({ phases: phases as PlanPhase[] })} endLabel={`Week ${n}`} />
        <TimelineKey />
        {tp && <Text style={[tx(14, 400, 1.5), { color: t.label }]}>{tp.weeksText}</Text>}
      </View>
      {weeks.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
            <Text accessibilityRole="header" style={[tx(17, 600), { color: t.label }]}>{weeks.length > 1 ? `A ${weeks[shown].name.toLowerCase()} week` : 'The week'}</Text>
            {weeks.length > 1 && <View style={{ flexDirection: 'row', gap: 6 }}>{weeks.map((w, i) => <Chip key={w.name} size="sm" on={i === shown} title={w.name} onPress={() => setShown(i)} />)}</View>}
          </View>
          <WeekRows week={weeks[shown].week} routines={routines} />
        </>
      )}
      {/* TODO(N1): `.catsq.sm` leads these rows once lib/ui has it (asked N1) */}
      <List style={{ marginBottom: 8 }} wrap>
        <Row wrapSub title="After the plan: maintenance" sub="When the plan ends, you can switch to maintenance: the same workouts with fewer sets, to keep what you've built for as long as you need." onPress={onMaintenance} />
        {tp && <Row wrapSub title="Eating for this plan" sub={eatingLine(tp, profile.goal, quiet)} />}
      </List>
      {tp && (
        <List style={{ marginBottom: 8 }}>
          {([['For', tp.forWho], ['Kit', tp.kit], ['Time', tp.time]] as const).map(([k, v]) => (
            // .pp-facts .li: 14 pt, padding 12 16, the key 72 wide
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
              <Text style={[...fact, { color: t.label2, width: 72 }]}>{k}</Text>
              <Text style={[...fact, { flex: 1 }]}>{v}</Text>
            </View>
          ))}
        </List>
      )}
      {tp?.id === 'pure-muscle-growth' && (!profile.training?.experience || profile.training.experience === 'beginner') && (
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 8 }}>New to lifting? Full body system is a better first plan.</Foot>
      )}
      <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>{tp?.safety ? tp.safety + ' ' : ''}General fitness information only, not medical advice. Talk to a GP before starting a new exercise programme.</Foot>
    </PlanPage>
  )
}
