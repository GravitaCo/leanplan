/**
 * Train's header pieces, ported from src/ui/WeekStrip.tsx and primitives' PageHeader: the day
 * navigator in the eyebrow (DayNav) and the week of movement dots (MoveStrip). Local to the Train
 * stream until N1 brings the shared ones.
 */
import { Pressable, Text, View } from 'react-native'
import { useContext } from 'react'
import { useStore } from '@/store/store'
import { DOW, fmtDate, parseYmd, shiftDay, todayStr } from '@/core/domain/date'
import { weekOf } from '@/core/domain/insights'
import { workoutsOf } from '@/core/domain/sessions'
import { initials } from '../../lib/ui/kit'
import { Icon, TrainNav, font, num, useTokens } from './ui'

/** `.daynav`: ‹ Today · 13 Nov › */
export function DayNav() {
  const t = useTokens()
  const cur = useStore((s) => s.cur)
  const setDate = useStore((s) => s.setDate)
  const f = fmtDate(cur)
  const short = f.full.split(' ').slice(0, 2).join(' ')
  const btn = (d: -1 | 1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={d < 0 ? 'Previous day' : 'Next day'} hitSlop={10} onPress={() => setDate(shiftDay(cur, d))} style={{ paddingHorizontal: 4 }}>
      <Icon name={d < 0 ? 'chevL' : 'chevR'} size={20} stroke={2.6} color={t.tint} />
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {btn(-1)}
      <Text style={[font(500), { fontSize: 13, color: t.label2 }]}>{cur === todayStr() ? 'Today' : f.dow} · {short}</Text>
      {btn(1)}
    </View>
  )
}

/** `.hdr`: the DayNav eyebrow, the 34 pt title and the Profile avatar beside it */
export function TrainHeader({ title, top }: { title: string; top: number }) {
  const t = useTokens()
  const name = useStore((s) => s.data.profile.name)
  const onProfile = useContext(TrainNav).onProfile
  // `.hdr-top` (the eyebrow; the connection pill on its right is N3's) over `.hdr-row.av` (the title, the avatar top-aligned beside it)
  return (
    <View style={{ paddingTop: top + 18, paddingBottom: 12 }}>
      <View style={{ minHeight: 20, flexDirection: 'row', alignItems: 'center' }}><DayNav /></View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Text accessibilityRole="header" style={[font(600), { flex: 1, minWidth: 0, fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: t.label, marginTop: 2 }]}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onProfile} hitSlop={2}
          style={{ marginTop: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[font(600), { fontSize: 16, color: t.tint }]}>{initials(name) || '·'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

/** `.mstrip`: Monday to Sunday, the chosen day filled, today's letter in the tint, a dot on each day with movement */
export function MoveStrip() {
  const t = useTokens()
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const setDate = useStore((s) => s.setDate)
  const today = todayStr()
  return (
    <View accessibilityRole="list" accessibilityLabel="This week" style={{ flexDirection: 'row', gap: 4, marginTop: 4, marginBottom: 18 }}>
      {weekOf(cur).map((d, i) => {
        const f = fmtDate(d)
        const moved = workoutsOf(days[d], d).length > 0
        const sel = d === cur
        return (
          <Pressable key={d} accessibilityRole="button" accessibilityLabel={`${f.dow} ${f.full}${moved ? ', moved' : ''}`} accessibilityState={{ selected: sel }}
            onPress={() => setDate(d)} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }}>
            <Text style={[font(d === today ? 600 : 500), { fontSize: 12, color: d === today ? t.tint : t.label2 }]}>{DOW[i]}</Text>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? t.btn : 'transparent' }}>
              <Text style={[font(sel ? 500 : 400), num, { fontSize: 16, color: sel ? t.btnInk : t.label2 }]}>{parseYmd(d).getDate()}</Text>
            </View>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: moved ? t.move : 'transparent' }} />
          </Pressable>
        )
      })}
    </View>
  )
}
