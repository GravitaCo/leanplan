/**
 * The Plan tab's main view (the web's PlanScreen.tsx, its last return): the plan card or the
 * suggestion, the end card and the next plan, This week, the tiles, if–then plans (and Mind plans),
 * and the guides. Everything it shows comes from usePlanTab (planTabModel, shared and tested); it
 * only composes lib/ui and Plan's own pieces. Where it opens another view it calls `go`.
 */
import { ScrollView, Text, View } from 'react-native'
import { shortDateOf } from '@/core/domain/date'
import { Btn, Chip, Chips, Card, List, Tile } from '../../lib/ui/kit'
import { PageHeader, Row, SettingRow, Sheet, NavBtn } from '../../lib/ui/primitives'
import { Foot, GrpH, Prose, Sub } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { MIND_PLAN, PLAN_GUIDES } from '@/copy/plan'
import { PlanCardView, PlanNote, PlanTile, WeekList } from './PlanParts'
import { usePlanTab, type IfThenRow } from './usePlanTab'

export type PlanGo =
  | { v: 'details' | 'end'; planId: string }
  | { v: 'preview-suggested' }
  | { v: 'library' }
  | { v: 'day'; d: number }
  | { v: 'ifthen'; id?: string }
  | { v: 'workouts' }
  | { v: 'exercises' }

type GuideId = (typeof PLAN_GUIDES)[number]['id']

export function PlanHome({ go, guide, setGuide }: { go: (to: PlanGo) => void; guide: GuideId | null; setGuide: (g: GuideId | null) => void }) {
  const t = useTokens()
  const m = usePlanTab()
  const row = (r: IfThenRow) => (
    <Row key={r.id} title={r.title} sub={r.sub} sub2={r.backup ? `Backup: ${r.backup}` : undefined} onPress={() => go({ v: 'ifthen', id: r.id })} />
  )
  const g = guide ? PLAN_GUIDES.find((x) => x.id === guide) : undefined
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <PageHeader title="Plan" />

      {!m.card && (
        <>
          <Sub style={{ marginTop: -4, marginBottom: 16 }}>No plan running. Your week below repeats until you choose one.</Sub>
          {m.suggested && (
            <>
              {/* .grp-h.sm */}
              <Text accessibilityRole="header" style={[tx(13, 500), { color: t.label2, paddingHorizontal: 4, marginTop: 4, marginBottom: 8 }]}>Suggested for your goal</Text>
              <View style={{ marginBottom: 12 }}>
                <PlanTile name={m.suggested.name} line={m.suggested.tagline} art={m.suggestedArt} fits big onPress={() => go({ v: 'preview-suggested' })} />
              </View>
            </>
          )}
          {/* .pl-browse: a 48 pt gray pill */}
          <Btn kind="gray" title="Browse all plans" onPress={() => go({ v: 'library' })} style={{ minHeight: 48, borderRadius: 24, marginBottom: 8 }} textStyle={tx(16, 600, 1.3, 0)} />
        </>
      )}
      {m.card && (
        <PlanCardView name={m.card.plan.name} art={m.cardArt} big={m.card.big} small={m.card.small} cells={m.card.cells} endLabel={m.card.endLabel} note={m.card.note}
          onPress={() => go({ v: m.card!.opensEnd ? 'end' : 'details', planId: m.card!.plan.id })} />
      )}
      {m.ended && m.card && (
        <Card plain style={{ marginBottom: 10 }}>
          <Text style={[tx(17, 600, 1.3), { color: t.label, marginBottom: 10 }]}>You've reached the end of {m.card.plan.name}.</Text>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 0, paddingBottom: 10 }}>When you're ready, you can look back and choose what's next. Until then, your week carries on as it is.</Foot>
          <Chips><Chip title="See what's next" onPress={() => go({ v: 'end', planId: m.card!.plan.id })} /></Chips>
        </Card>
      )}
      {m.next && (
        <List style={{ marginBottom: 8 }}>
          <Row title={`Next: ${m.next.name}`} sub={`Starts ${shortDateOf(m.next.startedAt!)}. Until then, this week carries on.`} onPress={() => go({ v: 'details', planId: m.next!.id })} />
        </List>
      )}

      {/* the web's <h2 class="grp-h"> keeps the browser's h2 margins (about 16.6 pt), collapsing with the card's above */}
      <View style={{ marginTop: 5, marginBottom: 16 }}><GrpH>This week</GrpH></View>
      <WeekList rows={m.week} onDay={(d) => go({ v: 'day', d })} />
      {/* a note's 8 above collapses into the week list's 8 below */}
      {m.notes.map((n, i) => <PlanNote key={n} style={i === 0 ? { marginTop: 0 } : undefined}>{n}</PlanNote>)}
      <Foot>
        {m.planWeek
          ? "Tap a day to change this phase's week. Daily steps burn more across a week than the gym sessions do."
          : 'Tap a day to change it. Changes repeat every week. Aim for three lifts a week with a rest day between where you can. Legs, then Push, then Pull means back-to-back sessions train different muscles. Daily steps burn more across a week than the gym sessions do.'}
      </Foot>

      {/* .tiles.plantiles: two columns */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {([['workouts', m.workouts, 'Workouts'], ['exercises', m.exercises, 'Exercise library']] as const).map(([k, n, label]) => (
          <Tile key={k} onPress={() => go({ v: k })} style={{ flex: 1, gap: 2 }}>
            <Text style={[tx(26, 400, 1.1, 0), num, { color: t.label }]}>{n}</Text>
            <Text style={[tx(15, 500, 1.3, 0), { color: t.label }]}>{label}</Text>
          </Tile>
        ))}
      </View>

      <GrpH>If–then plans</GrpH>
      <List style={{ marginBottom: 8 }}>
        {m.ifThen.map(row)}
        <Row act icon="plus" title="New plan" onPress={() => go({ v: 'ifthen' })} />
      </List>
      <Foot>
        Pick a moment that trips you up and decide ahead of time what you'll do. For example: when I get home hungry, I'll have yoghurt before I cook. We'll check in weekly, because the follow-up is what makes plans stick.
      </Foot>

      {m.mind.length > 0 && (
        <>
          <GrpH>{MIND_PLAN.group}</GrpH>
          <List style={{ marginBottom: 8 }}>{m.mind.map(row)}</List>
        </>
      )}

      <GrpH>Guides</GrpH>
      <List icons style={{ marginBottom: 8 }}>
        {PLAN_GUIDES.map((x) => (
          <SettingRow key={x.id} icon={x.id === 'split' ? 'dumbbell' : 'info'} color={x.id === 'split' ? t.activity : t.mind} label={x.title} onPress={() => setGuide(x.id)} />
        ))}
      </List>

      {g && (
        <Sheet title={g.title} tall left={null} onClose={() => setGuide(null)} right={<NavBtn bold title="Done" onPress={() => setGuide(null)} />}>
          <Prose blocks={g.paras.map((p) => ({
            p: p.muted
              ? <Text style={{ color: t.label2 }}>{p.runs.map(([s]) => s).join('')}</Text>
              : <>{p.runs.map(([s, b], i) => (b ? <Text key={i} style={tx(15, 700, 1.45)}>{s}</Text> : s))}</>,
          }))} />
        </Sheet>
      )}
    </ScrollView>
  )
}
