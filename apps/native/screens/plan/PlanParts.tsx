/**
 * Native port of src/screens/plan/PlanParts.tsx: each Tilo plan's photograph, the week timeline
 * strip and its key, the plan tiles, and a week as the Plan tab lists it.
 */
import { Image, Pressable, Text, View, type DimensionValue } from 'react-native'
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg'
import type { PlanWeek, Routine } from '@/core/types'
import { DAY_NAME } from '@/core/domain/date'
import { WEEK_ORDER } from '@/core/domain/week'
import { isBuiltinKey, keyTitle, keyVideo, routineFor, templateFor } from '@/core/domain/routines'
import type { WeekCell } from '@/core/domain/plans'
import pureMuscle from '@/assets/plans/pure-muscle-growth.jpg'
import strongerAge from '@/assets/plans/stronger-with-age.jpg'
import fullBody from '@/assets/plans/full-body-system.jpg'
import { Thumb } from './trainBridge'
import { List, font, num, useTokens } from './ui'

/** Each Tilo plan's photograph, bundled with the app (so it shows offline). Own plans have none. */
const ART: Record<string, number> = {
  'pure-muscle-growth': pureMuscle,
  'stronger-with-age': strongerAge,
  'full-body-system': fullBody,
}
export const planArt = (templateId: string | undefined): number | undefined => (templateId ? ART[templateId] : undefined)

/**
 * `.tl-c`: a week cell. Full weeks fill (sep, done label, now tint); easier weeks are striped at
 * 135° (3 on, 3 off) with a 1 px edge; maintenance after is a 1.5 px dashed-colour outline.
 */
let pid = 0
export function Cell({ kind, state, width, height = 10, radius = 3, opacity = 1 }: { kind: WeekCell['kind']; state: WeekCell['state'] | ''; width?: DimensionValue; height?: number; radius?: number; opacity?: number }) {
  const t = useTokens()
  const c = state === 'done' ? t.label : state === 'now' ? t.tint : t.sep
  const box = { width, flex: width == null ? 1 : undefined, height, borderRadius: radius, opacity, overflow: 'hidden' as const }
  if (kind === 'full') return <View style={[box, { backgroundColor: c }]} />
  if (kind === 'after') return state === 'now' ? <View style={[box, { backgroundColor: t.tint }]} /> : <View style={[box, { borderWidth: 1.5, borderColor: t.dash }]} />
  const id = `st${++pid}`
  return (
    <View style={[box, { borderWidth: 1, borderColor: c }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={6} stroke={c} strokeWidth={6} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

/** The weeks strip: full weeks, easier weeks striped, maintenance after outlined (fading). */
export function Timeline({ cells, labels = true, endLabel }: { cells: WeekCell[]; labels?: boolean; endLabel?: string }) {
  const t = useTokens()
  const weeks = cells.filter((c) => c.kind !== 'after').length
  let after = 0
  const small = [font(400), { fontSize: 12, color: t.label2 }]
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {cells.map((c, i) => <Cell key={i} kind={c.kind} state={c.state} opacity={c.kind === 'after' ? [1, 0.7, 0.4][after++] ?? 0.4 : 1} />)}
      </View>
      {labels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[...small, num]}>Week 1</Text><Text style={[...small, num]}>{endLabel ?? `Week ${weeks}`}</Text><Text style={small}>Then maintain</Text>
        </View>
      )}
    </View>
  )
}

/** The key under a timeline. */
export function TimelineKey() {
  const t = useTokens()
  const k = (kind: WeekCell['kind'], label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Cell kind={kind} state="" width={14} height={8} radius={2} />
      <Text style={[font(400), { fontSize: 12, color: t.label2 }]}>{label}</Text>
    </View>
  )
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{k('full', 'Full weeks')}{k('easier', 'Easier weeks')}{k('after', 'Maintenance, after')}</View>
}

/** The photograph's bottom shade (`.ptile .shade`: clear to 45%, then to 72% black). */
export function Shade({ stops }: { stops: [number, number][] }) {
  // a vertical gradient drawn as thin bands, so no gradient library is needed
  const bands = 24
  const at = (y: number) => {
    for (let i = 1; i < stops.length; i++) {
      const [y0, a0] = stops[i - 1], [y1, a1] = stops[i]
      if (y <= y1) return a0 + ((a1 - a0) * (y - y0)) / Math.max(1e-6, y1 - y0)
    }
    return stops[stops.length - 1][1]
  }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {Array.from({ length: bands }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${at((i + 0.5) / bands).toFixed(3)})` }} />)}
    </View>
  )
}

/** A plan tile: its photograph with the name on it, or (an own plan) a plain card with a dot. */
export function PlanTile({ name, line, art, fits, big, onPress, style }: {
  name: string; line: string; art?: number; fits?: boolean; big?: boolean; onPress: () => void; style?: object
}) {
  const t = useTokens()
  const h = big ? 230 : 196
  if (art == null) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${line}`} onPress={onPress}
        style={({ pressed }) => [{ height: h, borderRadius: 22, backgroundColor: t.card, padding: 14, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 }, style]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.tint }} />
        <View>
          <Text style={[font(600), { fontSize: big ? 20 : 16, lineHeight: (big ? 20 : 16) * 1.2, color: t.label }]}>{name}</Text>
          <Text style={[font(400), num, { fontSize: 12, color: t.label2, marginTop: 2 }]}>{line}</Text>
        </View>
      </Pressable>
    )
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${line}${fits ? ', fits your goal' : ''}`} onPress={onPress}
      style={({ pressed }) => [{ height: h, borderRadius: 22, overflow: 'hidden', backgroundColor: t.sep, opacity: pressed ? 0.85 : 1 }, style]}>
      <Image source={art} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <Shade stops={[[0, 0], [0.45, 0], [1, 0.72]]} />
      {fits && (
        <View style={{ position: 'absolute', left: 12, top: 12, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.tint }}>
          <Text style={[font(600), { fontSize: 12, color: '#fff' }]}>Fits your goal</Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 11 }}>
        <Text style={[font(600), { fontSize: big ? 20 : 16, lineHeight: (big ? 20 : 16) * 1.2, color: '#fff' }]}>{name}</Text>
        <Text style={[font(400), num, { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }]}>{line}</Text>
      </View>
    </Pressable>
  )
}

/** `.wk-row`: a weekday row (day, what's on, thumbnail or the cardio dot); today in tint-soft. */
export function WeekRow({ d, names, sub, first, video, today, emptyAdd, onPress, label }: {
  d: number; names: string[]; sub?: string; first?: string; video?: ReturnType<typeof keyVideo>; today?: boolean; emptyAdd?: boolean; onPress?: () => void; label: string
}) {
  const t = useTokens()
  const body = (
    <>
      <Text style={[font(today ? 600 : 400), { width: 36, fontSize: 13, color: today ? t.tint : t.label2 }]}>{DAY_NAME[d].slice(0, 3)}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        {names.length === 0
          ? emptyAdd
            ? <Text style={[font(500), { fontSize: 17, color: t.tint }]}>+ Add</Text>
            : <Text numberOfLines={1} style={[font(400), { fontSize: 17, lineHeight: 22, color: t.label2 }]}>Rest · recovery counts too</Text>
          : <>
            <Text numberOfLines={1} style={[font(today ? 600 : 400), { fontSize: 17, lineHeight: 22, color: t.label, letterSpacing: -0.17 }]}>{names.join(' + ')}</Text>
            {!!sub && <Text numberOfLines={1} style={[font(400), { fontSize: 13, color: t.label2, marginTop: 2 }]}>{sub}</Text>}
          </>}
      </View>
      {names.length > 0 && (first === 'Cardio'
        ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.move, marginRight: 4 }} />
        : <Thumb row video={video} />)}
    </>
  )
  const s = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: today ? t.tintSoft : undefined }
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && !today && { backgroundColor: t.fill }]}>{body}</Pressable>
    : <View accessibilityLabel={label} style={s}>{body}</View>
}

/**
 * A week as the Plan tab lists it (Option A): day, workouts ("Legs & Core + Pull"), the exercise
 * count for one workout, a thumbnail or the cardio dot; rest days say recovery counts too.
 */
export function WeekRows({ week, routines, todayIdx, todayNote, onDay, emptyAdd }: {
  week: PlanWeek; routines: Routine[] | undefined; todayIdx?: number; todayNote?: string; onDay?: (d: number) => void
  /** a week being built: empty days read "+ Add" rather than rest */
  emptyAdd?: boolean
}) {
  return (
    <List radius={20} inset={14}>
      {WEEK_ORDER.map((d) => {
        const keys = (week[d] || []).filter((k) => isBuiltinKey(k) || !!routineFor(k, routines))
        const names = keys.map((k) => keyTitle(k, routines))
        const today = d === todayIdx
        const n = keys.length === 1 && keys[0] !== 'Cardio' ? templateFor(keys[0], routines)?.ex.length ?? 0 : 0
        const sub = [n ? `${n} ${n === 1 ? 'exercise' : 'exercises'}` : '', today ? todayNote ?? 'Today' : ''].filter(Boolean).join(' · ')
        return (
          <WeekRow key={d} d={d} names={names} sub={sub} first={keys[0]} video={keys[0] ? keyVideo(keys[0], routines) : undefined} today={today} emptyAdd={emptyAdd}
            onPress={onDay ? () => onDay(d) : undefined}
            label={`${DAY_NAME[d]}: ${names.length ? names.join(' and ') : 'Rest'}${today ? ', today' : ''}`} />
        )
      })}
    </List>
  )
}
