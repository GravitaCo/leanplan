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
import { thingView } from '@/screens/today/MindCard'
import { font, useTokens } from '../../lib/theme'
import { Button, Chevron, Link, T, TIcon } from './ui'

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
    // .card.pcard.wb-mind: gap 12
    <View accessibilityLabel="Mind" style={{ backgroundColor: t.card, borderRadius: t.radius, padding: 16, gap: 12 }}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.mindFill, alignItems: 'center', justifyContent: 'center' }}>
          <TIcon name="mind" size={20} color={t.mindInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} s={13} c={t.mindInk}>Mind</T>
          <T w={500} s={17}>{title}</T>
          {sub && <T s={13} c={t.label2} style={{ marginTop: 1 }}>{sub}</T>}
        </View>
        {done ? <Chevron /> : <Button title={SUMMARY_MIND.checkIn} onPress={onCheckIn} h={44} size={15} align="flex-start" />}
      </Pressable>
      {(lighter || chips || picked) && <View style={{ height: 1, backgroundColor: t.sep }} />}
      {lighter && <T s={15}>{SUMMARY_MIND.lighter}</T>}
      {chips && (
        <>
          <T s={13} c={t.label2} style={{ marginBottom: -4 }}>{SUMMARY_MIND.thingLead}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map((x) => (
              <Pressable key={x.key} accessibilityRole="button" accessibilityState={{ selected: false }} onPress={() => { pickThing(x.key) }}
                style={({ pressed }) => ({ minHeight: 44, borderRadius: 22, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.fill, opacity: pressed ? 0.7 : 1 })}>
                {dot(x.pillar)}
                <Text style={[font(400), { fontSize: 15, color: t.label }]}>{txt(x.label)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {picked && !c?.thing?.done && (
        <>
          {opens
            ? <Pressable accessibilityRole="button" onPress={() => onOpenView(opens)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginVertical: -6 }}>
                {dot(picked.pillar, 10)}<T s={17} style={{ flex: 1, minWidth: 0 }}>{SUMMARY_MIND.today(txt(picked.label))}</T><Chevron />
              </Pressable>
            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{dot(picked.pillar, 10)}<T s={17} style={{ flex: 1 }}>{SUMMARY_MIND.today(txt(picked.label))}</T></View>}
          <View style={{ flexDirection: 'row', gap: 20, marginTop: -8 }}>
            <Link title={SUMMARY_MIND.done} onPress={() => { doneThing() }} w={500} style={{ paddingVertical: 12 }} />
            <Link title={SUMMARY_MIND.change} onPress={clearThing} w={500} style={{ paddingVertical: 12 }} />
          </View>
        </>
      )}
      {picked && c?.thing?.done && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TIcon name="check" size={16} stroke={2.6} color={t.mindInk} />
            <T s={15} c={t.label2} style={{ flex: 1 }}>{txt(picked.done)}</T>
          </View>
          {makePlanOffered(picked, plans, day, { windDownAt }) && <View style={{ marginTop: -10 }}><Link title={SUMMARY_MIND.makePlan} onPress={() => onMakePlan(picked)} w={500} style={{ paddingVertical: 12 }} /></View>}
        </>
      )}
    </View>
  )
}
