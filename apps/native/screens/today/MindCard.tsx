/**
 * Summary's Mind card with the wellbeing flag on, ported from src/screens/today/MindCard.tsx (board
 * B2; B9 for the one thing): the same props, store actions and words (summaryCopy, skills). Tapping
 * the card opens Mind; "Check in" opens the sheet; a hard day adds the lighter line; then the day's
 * one thing (chips, "Today:" with Done and Change, the tick and "Make it a plan").
 */
import { Pressable, Text, View } from 'react-native'
import type { CheckIn, IfThenPlan, Pillar } from '@/core/types'
import { thingByKey, thingText, type Thing } from '@/core/data/skills'
import { MIND_REVIEWED } from '@/data/wellbeingFlag'
import { MOODS } from '@/core/domain/insights'
import { useStore } from '@/store/store'
import { SUMMARY_MIND } from '@/screens/today/summaryCopy'
import { checkedIn, checkinTime, makePlanOffered } from '@/screens/today/summary'
import { thingView } from '@/screens/today/summary'
import { BTN, tx, useTokens } from '../../lib/theme'
import { Btn, Card, LinkBtn } from '../../lib/ui/kit'
import { Chevron, Icon } from '../../lib/ui/icons'

export interface MindCardProps {
  checkin: CheckIn | null | undefined
  isToday: boolean
  hard: boolean
  thingSlot: boolean
  options: Thing[]
  windDownAt?: string
  onOpen: () => void
  onCheckIn: () => void
  onMakePlan: (thing: Thing) => void
  /** opens a skill's screen from the "Today:" row (the web calls openMind(view)) */
  onOpenView: (view: NonNullable<ReturnType<typeof thingView>>) => void
  plans?: readonly IfThenPlan[]
  day: string
}

export function MindCard({ checkin: c, isToday, hard, thingSlot, options, windDownAt, onOpen, onCheckIn, onMakePlan, onOpenView, plans, day }: MindCardProps) {
  const t = useTokens()
  const pickThing = useStore((s) => s.pickThing)
  const doneThing = useStore((s) => s.doneThing)
  const clearThing = useStore((s) => s.clearThing)
  const DOT: Record<Pillar, string> = { mind: t.mind, food: t.food, move: t.move }
  const done = checkedIn(c)
  const time = checkinTime(c?.t)
  const mood = c?.mood ? MOODS[c.mood - 1]?.toLowerCase() : undefined
  const title = !done ? (isToday ? SUMMARY_MIND.ask : SUMMARY_MIND.askPast) : mood ? SUMMARY_MIND.feeling(mood) : time ? SUMMARY_MIND.checkedInAt(time) : SUMMARY_MIND.checkedIn
  const sub = !done ? SUMMARY_MIND.askSub : mood && time ? SUMMARY_MIND.checkedInAt(time) : null

  const picked = isToday && done ? thingByKey(c?.thing?.key) : undefined
  const txt = (s: string) => thingText(s, { windDownAt })
  const chips = isToday && done && thingSlot && !picked && options.length > 0
  const opens = picked ? thingView(picked, MIND_REVIEWED) : null
  const lighter = isToday && done && hard
  const dot = (p: Pillar, size = 8) => <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: DOT[p] }} />

  return (
    // .card.pcard.wb-mind (the .pcard gap of 14 wins over .wb-mind's 12 on the web)
    <View accessibilityLabel="Mind"><Card>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.mindFill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mind" size={20} color={t.mindInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[tx(13, 600), { color: t.mindInk }]}>Mind</Text>
          <Text style={[tx(17, 500), { color: t.label }]}>{title}</Text>
          {sub && <Text style={[tx(13, 400), { color: t.label2 }, { marginTop: 1 }]}>{sub}</Text>}
        </View>
        {done ? <Chevron color={t.label3} /> : <Btn title={SUMMARY_MIND.checkIn} small onPress={onCheckIn} style={{ alignSelf: 'center', height: 44, minHeight: 44, borderRadius: 22, paddingHorizontal: 18 }} />}
      </Pressable>
      {(lighter || chips || picked) && <View style={{ height: 1, backgroundColor: t.sep }} />}
      {lighter && <Text style={[tx(15, 400), { color: t.label }]}>{SUMMARY_MIND.lighter}</Text>}
      {chips && (
        <>
          <Text style={[tx(13, 400), { color: t.label2 }, { marginBottom: -4 }]}>{SUMMARY_MIND.thingLead}</Text>
          {/* TODO(N1-followup): `.wb-things .chip` (44 tall, a pillar dot) until N1 has the chip variant */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map((x) => (
              <Pressable key={x.key} accessibilityRole="button" accessibilityState={{ selected: false }} onPress={() => { pickThing(x.key) }}
                style={({ pressed }) => ({ minHeight: 44, borderRadius: 22, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.fill, opacity: pressed ? 0.7 : 1 })}>
                {dot(x.pillar)}
                <Text style={[tx(15, 400, 1.3, BTN), { color: t.label }]}>{txt(x.label)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {picked && !c?.thing?.done && (
        <>
          {opens
            ? <Pressable accessibilityRole="button" onPress={() => onOpenView(opens)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginVertical: -6 }}>
                {dot(picked.pillar, 10)}<Text style={[tx(17, 400), { color: t.label }, { flex: 1, minWidth: 0 }]}>{SUMMARY_MIND.today(txt(picked.label))}</Text><Chevron color={t.label3} />
              </Pressable>
            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{dot(picked.pillar, 10)}<Text style={[tx(17, 400), { color: t.label }, { flex: 1 }]}>{SUMMARY_MIND.today(txt(picked.label))}</Text></View>}
          <View style={{ flexDirection: 'row', gap: 20, marginTop: -8 }}>
            <LinkBtn title={SUMMARY_MIND.done} onPress={() => { doneThing() }} style={[tx(15, 500, 1.3, BTN), { paddingVertical: 12, paddingHorizontal: 0 }]} />
            <LinkBtn title={SUMMARY_MIND.change} onPress={clearThing} style={[tx(15, 500, 1.3, BTN), { paddingVertical: 12, paddingHorizontal: 0 }]} />
          </View>
        </>
      )}
      {picked && c?.thing?.done && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="check" size={20} stroke={2.6} color={t.mindInk} />
            <Text style={[tx(15, 400), { color: t.label2 }, { flex: 1 }]}>{txt(picked.done)}</Text>
          </View>
          {makePlanOffered(picked, plans, day, { windDownAt }) && <View style={{ marginTop: -10 }}><LinkBtn title={SUMMARY_MIND.makePlan} onPress={() => onMakePlan(picked)} style={[tx(15, 500, 1.3, BTN), { paddingVertical: 12, paddingHorizontal: 0 }]} /></View>}
        </>
      )}
    </Card></View>
  )
}
