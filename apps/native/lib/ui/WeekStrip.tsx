/** Native ports of src/ui/WeekStrip.tsx: WeekStrip (Summary), DayNav (an eyebrow) and MoveStrip (Train). */
import { Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { DOW, fmtDate, parseYmd, shiftDay, todayStr } from '@/core/domain/date'
import { workoutsOf } from '@/core/domain/sessions'
import { Icon } from './icons'
import { slop } from './kit'
import { dayStat, weekOf } from '@/core/domain/insights'
import { plannedKeys } from '@/core/domain/plans'
import { isBuiltinKey, keyTitle } from '@/core/domain/routines'
import { TALI_SHORT } from '@/core/data/taliWorkouts'
import { Rings } from './charts'
import { BTN, font, num, tx, useTokens } from '../theme'
import { UI } from '@/copy/ui'

/** Monday to Sunday: each day a mini energy ring and its planned session. */
export function WeekStrip() {
  const t = useTokens()
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const setDate = useStore((s) => s.setDate)
  const today = todayStr()
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginHorizontal: -4, marginBottom: 12 }}>
      {weekOf(cur).map((d, i) => {
        const st = dayStat(data, d)
        const keys = plannedKeys(data, d)
        const sched = keys.length ? (isBuiltinKey(keys[0]) ? keys[0] : TALI_SHORT[keys[0]] ?? keyTitle(keys[0], data.routines)) + (keys.length > 1 ? ' +' : '') : UI.rest
        const f = fmtDate(d)
        const sel = d === cur
        return (
          <Pressable key={d} onPress={() => setDate(d)} accessibilityRole="button" accessibilityLabel={`${f.dow} ${f.full}`} accessibilityState={{ selected: sel }}
            style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4, borderRadius: 12, paddingTop: 6, paddingBottom: 5, backgroundColor: sel ? t.card : 'transparent' }}>
            <Text style={[font(600), { fontSize: 12, color: d === today ? t.tint : t.label2 }]}>{DOW[i]}</Text>
            <View style={{ width: 34, height: 34 }}>
              <Rings items={[{ pct: st.t.k / st.r.mid, color: t.energy }]} size={34} stroke={3.5} />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[font(600), num, { fontSize: 14, color: st.future ? t.label2 : t.label }]}>{parseYmd(d).getDate()}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={[font(600), { fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase', color: st.done ? t.activityInk : t.label3, paddingHorizontal: 2 }]}>
              {st.done ? '✓ Done' : sched}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** "‹ Today · 22 Sep ›": the day switcher in a page eyebrow (`.daynav`). */
export function DayNav() {
  const t = useTokens()
  const cur = useStore((s) => s.cur)
  const setDate = useStore((s) => s.setDate)
  const f = fmtDate(cur)
  const short = f.full.split(' ').slice(0, 2).join(' ')
  const btn = (label: string, by: number, icon: 'chevL' | 'chevR') => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setDate(shiftDay(cur, by))} hitSlop={slop(28, 20)}
      style={({ pressed }) => ({ paddingHorizontal: 4, opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={20} stroke={2.6} color={t.tint} />
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {btn(UI.previousDay, -1, 'chevL')}
      <Text style={[tx(13, 500, 1.3, 0), { color: t.label2 }]}>{cur === todayStr() ? UI.today : f.dow} · {short}</Text>
      {btn(UI.nextDay, 1, 'chevR')}
    </View>
  )
}

/**
 * Train's week (Monday to Sunday): the chosen day filled with ink, today's letter in the tint, and
 * a dot on each day with any logged movement. Dots only: no connecting line, no "days in a row".
 */
export function MoveStrip() {
  const t = useTokens()
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const setDate = useStore((s) => s.setDate)
  const today = todayStr()
  return (
    <View accessibilityRole="list" accessibilityLabel={UI.thisWeek} style={{ flexDirection: 'row', gap: 4, marginTop: 4, marginBottom: 18 }}>
      {weekOf(cur).map((d, i) => {
        const f = fmtDate(d)
        const moved = workoutsOf(days[d], d).length > 0
        const sel = d === cur
        const isToday = d === today
        return (
          <Pressable key={d} onPress={() => setDate(d)} accessibilityRole="button" accessibilityLabel={`${f.dow} ${f.full}${moved ? ', moved' : ''}`} accessibilityState={{ selected: sel }}
            style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }}>
            <Text style={[tx(12, isToday ? 600 : 500, 1.3, BTN), { color: isToday ? t.tint : t.label2 }]}>{DOW[i]}</Text>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? t.btn : 'transparent' }}>
              <Text style={[tx(16, sel ? 500 : 400), num, { color: sel ? t.btnInk : t.label2 }]}>{parseYmd(d).getDate()}</Text>
            </View>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: moved ? t.move : 'transparent' }} />
          </Pressable>
        )
      })}
    </View>
  )
}
