/** Native port of src/ui/WeekStrip.tsx: Monday to Sunday, each day a mini energy ring and its plan. */
import { Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { DOW, fmtDate, parseYmd, todayStr } from '@/core/domain/date'
import { dayStat, weekOf } from '@/core/domain/insights'
import { plannedKeys } from '@/core/domain/plans'
import { isBuiltinKey, keyTitle } from '@/core/domain/routines'
import { TALI_SHORT } from '@/core/data/taliWorkouts'
import { Rings } from './charts'
import { font, num, useTokens } from '../theme'

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
        const sched = keys.length ? (isBuiltinKey(keys[0]) ? keys[0] : TALI_SHORT[keys[0]] ?? keyTitle(keys[0], data.routines)) + (keys.length > 1 ? ' +' : '') : 'Rest'
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
