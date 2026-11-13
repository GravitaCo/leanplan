/**
 * The Plan screens' own pieces (the web's src/screens/plan/PlanParts.tsx and Plan's classes in
 * theme.css: `.tl`, `.ptile`, `.pp-hero`, `.plan-note`, `.list.wk`/`.wk-row`). Built on lib/ui's
 * tokens and text; shared pieces (rows, chips, sheets) come from lib/ui, never from here.
 */
import type { ReactNode } from 'react'
import { Pressable, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, Line, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg'
import type { PlanWeek, Routine } from '@/core/types'
import type { WeekCell } from '@/core/domain/plans'
import { planWeekRows, type WeekRowModel } from '@/screens/plan/planModel'
import { keyVideo } from '@/core/domain/routines'
import { useStore } from '@/store/store'
import type { PlanArt } from '@/screens/plan/planArt'
import { List, useSurface } from '../../lib/ui/kit'
import { Chevron, Icon } from '../../lib/ui/icons'
import { CoverImage } from '../../lib/ui/CoverImage'
import { Thumb } from '../train'
import { num, tx, useTokens } from '../../lib/theme'

/* ---------------------------------------------------------------- timeline */

let pid = 0
/**
 * `.tl-c`: one week. Full weeks fill (--sep; done --label; now --tint); easier weeks are striped at
 * 135° (3 on, 3 off) with a 1 px edge; maintenance after is a 1.5 px --dash outline (now: tint).
 */
export function Cell({ kind, state, width, height = 10, radius = 3, opacity = 1 }: {
  kind: WeekCell['kind']; state: WeekCell['state'] | ''; width?: DimensionValue; height?: number; radius?: number; opacity?: number
}) {
  const t = useTokens()
  const c = state === 'done' ? t.label : state === 'now' ? t.tint : t.sep
  const box: ViewStyle = { width, flex: width == null ? 1 : undefined, height, borderRadius: radius, opacity, overflow: 'hidden' }
  if (kind === 'full') return <View style={[box, { backgroundColor: c }]} />
  if (kind === 'after') return state === 'now' ? <View style={[box, { backgroundColor: t.tint }]} /> : <View style={[box, { borderWidth: 1.5, borderColor: t.dash }]} />
  const id = `pl-st${++pid}`
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

/** `.tl`: the weeks strip (maintenance after fades 1, 0.7, 0.4) with Week 1 · Week n · Then maintain. */
export function Timeline({ cells, labels = true, endLabel }: { cells: WeekCell[]; labels?: boolean; endLabel?: string }) {
  const t = useTokens()
  const weeks = cells.filter((c) => c.kind !== 'after').length
  let after = 0
  const small = [tx(12), { color: t.label2 }]
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {cells.map((c, i) => <Cell key={i} kind={c.kind} state={c.state} opacity={c.kind === 'after' ? [1, 0.7, 0.4][after++] ?? 0.4 : 1} />)}
      </View>
      {labels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[...small, num]}>Week 1</Text>
          <Text style={[...small, num]}>{endLabel ?? `Week ${weeks}`}</Text>
          <Text style={small}>Then maintain</Text>
        </View>
      )}
    </View>
  )
}

/** `.tl-key`: the key under a timeline. */
export function TimelineKey() {
  const t = useTokens()
  const k = (kind: WeekCell['kind'], label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Cell kind={kind} state="" width={14} height={8} radius={2} />
      <Text style={[tx(12), { color: t.label2 }]}>{label}</Text>
    </View>
  )
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{k('full', 'Full weeks')}{k('easier', 'Easier weeks')}{k('after', 'Maintenance, after')}</View>
}

/* ---------------------------------------------------------------- photographs */

let gid = 0
/** A vertical shade of black over a photograph: each stop is [offset, alpha] (`.ptile .shade`, `.pp-hero .shade`). */
export function Shade({ stops, color = '#000' }: { stops: [number, number][]; color?: string }) {
  const id = `pl-sh${++gid}`
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops.map(([at, a], i) => <Stop key={i} offset={at} stopColor={color} stopOpacity={a} />)}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

/** The y of a CSS `object-position` ("50% 35%" → 0.35), else `dflt`. */
export const posY = (at: string | undefined, dflt: number) => {
  const m = at?.match(/^\s*[\d.]+%\s+([\d.]+)%\s*$/)
  return m ? Number(m[1]) / 100 : dflt
}

/** The photograph filling its box, cropped where the web puts it (`object-position`: tiles 50% 40%, heroes 50% 45%). */
export const Photo = ({ art, y = 0.4 }: { art: PlanArt; y?: number }) => (
  <CoverImage source={art} y={y} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
)

/** `.ptile`: a plan's photograph with its name (Fits your goal on the best fit), or an own plan's card with a dot. */
export function PlanTile({ name, line, art, artAt, fits, big, onPress, style }: {
  name: string; line: string; art?: PlanArt
  /** a template's own `object-position` ("50% 35%"); the CSS default is 50% 40% */
  artAt?: string; fits?: boolean; big?: boolean; onPress: () => void; style?: StyleProp<ViewStyle>
}) {
  const t = useTokens()
  const surface = useSurface(t)
  const h = big ? 230 : 196
  // a tile is a web <button>: no letter spacing
  const nameText = tx(big ? 20 : 16, 600, 1.2, 0)
  if (art == null) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}
        style={({ pressed }) => [{ height: h, borderRadius: 22, backgroundColor: surface, padding: 14, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 }, style]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.tint }} />
        <View>
          <Text style={[nameText, { color: t.label }]}>{name}</Text>
          <Text style={[tx(12), num, { color: t.label2, marginTop: 2 }]}>{line}</Text>
        </View>
      </Pressable>
    )
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [{ height: h, borderRadius: 22, overflow: 'hidden', backgroundColor: t.sep, opacity: pressed ? 0.85 : 1 }, style]}>
      <Photo art={art} y={posY(artAt, 0.4)} />
      <Shade stops={[[0, 0], [0.45, 0], [1, 0.72]]} />
      {fits && <FitsBadge big={big} text="Fits your goal" style={{ position: 'absolute', left: 12, top: 12 }} />}
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 11 }}>
        <Text style={[nameText, { color: '#fff' }]}>{name}</Text>
        {/* `.ptile.big` also matches the global `.big` (600, line-height 1.1) on the web, so a big tile's line is bold */}
        <Text style={[big ? tx(12, 600, 1.1) : tx(12), num, { color: 'rgba(255,255,255,0.85)', marginTop: 2 }]}>{line}</Text>
      </View>
    </Pressable>
  )
}

/** `.fits`: the tint badge on a plan's photograph. */
export function FitsBadge({ text, style, big }: { text: string; style?: StyleProp<ViewStyle>; big?: boolean }) {
  const t = useTokens()
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.tint }, style]}>
      <Text style={[tx(12, 600, big ? 1.1 : 1.3), { color: '#fff' }]}>{text}</Text>
    </View>
  )
}

/**
 * `.pp-hero`: a plan's photograph (380 pt; details 220) or the plain --hero block (240), with the
 * round back button (`.pp-back`) and its caption at the bottom. Full bleed: it sits outside the
 * screen's 16 pt gutter.
 */
export function PlanHero({ art, artAt, height, onBack, children }: { art?: PlanArt; artAt?: string; height?: number; onBack: () => void; children: ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ height: height ?? (art != null ? 380 : 240), marginHorizontal: -16, marginBottom: 18, backgroundColor: art != null ? t.sep : t.hero }}>
      {art != null && <Photo art={art} y={posY(artAt, 0.45)} />}
      {art != null && <Shade stops={[[0, 0.3], [0.22, 0], [0.5, 0], [1, 0.65]]} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
        style={({ pressed }) => ({ position: 'absolute', left: 16, top: insets.top + 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
        <Icon name="chevL" size={18} stroke={2.6} color="#1d1d1f" />
      </Pressable>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 18 }}>{children}</View>
    </View>
  )
}

/* ---------------------------------------------------------------- notes */

/** `.card.plan-note`: 14 pt words on a card, radius 16, 8 pt above (a week's notes, the last plan's note). */
export function PlanNote({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTokens()
  const surface = useSurface(t)
  return (
    <View style={[{ backgroundColor: surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 8 }, style]}>
      {typeof children === 'string' ? <Text style={[tx(14, 400, 1.4), { color: t.label }]}>{children}</Text> : children}
    </View>
  )
}

/* ---------------------------------------------------------------- the week */

/**
 * `.wk-row`: day, what's on ("Legs & Core + Pull") and its line, then the first workout's thumbnail
 * or the cardio dot. Today's row is --tint-soft with its day in tint. `emptyAdd`: "+ Add" for a
 * week being built.
 */
export function WeekRow({ row, onPress, emptyAdd }: { row: WeekRowModel; onPress?: () => void; emptyAdd?: boolean }) {
  const t = useTokens()
  const routines = useStore((s) => s.data.routines)
  const { day, names, sub, today, keys, label } = row
  const body = (
    <>
      <Text style={[tx(13, today ? 600 : 400), { width: 36, color: today ? t.tint : t.label2 }]}>{day}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        {names.length === 0
          ? emptyAdd
            ? <Text style={[tx(17, 500), { color: t.tint }]}>+ Add</Text>
            : <Text numberOfLines={1} style={[tx(17, today ? 600 : 400, 1.3, onPress ? 0 : undefined), { color: t.label2 }]}>Rest · recovery counts too</Text>
          : <>
            <Text numberOfLines={1} style={[tx(17, today ? 600 : 400, 1.3, onPress ? 0 : undefined), { color: t.label }]}>{names.join(' + ')}</Text>
            {!!sub && <Text numberOfLines={1} style={[tx(13), { color: t.label2, marginTop: 2 }]}>{sub}</Text>}
          </>}
      </View>
      {keys.length > 0 && (keys[0] === 'Cardio'
        ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.move, marginRight: 4 }} />
        // `.wk-row .thumb`: 36 × 44, radius 8
        : <Thumb video={keyVideo(keys[0], routines)} size={{ width: 36, height: 44, radius: 8 }} />)}
    </>
  )
  const s: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: today ? t.tintSoft : undefined }
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && !today && { backgroundColor: t.fill }]}>{body}</Pressable>
    : <View accessibilityLabel={label} style={s}>{body}</View>
}

/** `.list.wk` (radius 20): the seven rows, Monday first. */
export function WeekList({ rows, onDay, emptyAdd }: { rows: WeekRowModel[]; onDay?: (d: number) => void; emptyAdd?: boolean }) {
  return (
    <List style={{ borderRadius: 20, marginBottom: 8 }}>
      {rows.map((r) => <WeekRow key={r.d} row={r} emptyAdd={emptyAdd} onPress={onDay ? () => onDay(r.d) : undefined} />)}
    </List>
  )
}

/** A plan week as the Plan tab lists it (Option A). */
export function WeekRows({ week, routines, todayIdx, todayNote, onDay, emptyAdd }: {
  week: PlanWeek; routines: Routine[] | undefined; todayIdx?: number; todayNote?: string; onDay?: (d: number) => void; emptyAdd?: boolean
}) {
  return <WeekList rows={planWeekRows(week, routines, todayIdx, todayNote)} onDay={onDay} emptyAdd={emptyAdd} />
}

/* ---------------------------------------------------------------- the plan card */

/**
 * `.card.pl-card`: the running plan. Its photograph (56, radius 14) or the soft dot, "Your plan" and
 * its name, the big figure (`.pl-big`: 40 pt Geist 300) and its line, the timeline, the note.
 */
export function PlanCardView({ name, art, big, small, cells, endLabel, note, onPress }: {
  name: string; art?: PlanArt; big: string; small: string; cells: WeekCell[]; endLabel: string; note: string | null; onPress: () => void
}) {
  const t = useTokens()
  const surface = useSurface(t)
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: surface, borderRadius: t.radius, overflow: 'hidden', marginBottom: 12, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: 'row', gap: 14, paddingTop: 16, paddingHorizontal: 16, alignItems: 'center' }}>
        {art != null
          ? <CoverImage source={art} y={0.4} style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden' }} />
          : <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.tint }} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={[tx(13, 600, 1.3, 0), { color: t.tint }]}>Your plan</Text>
          <Text style={[tx(20, 600, 1.3, 0), { color: t.label }]}>{name}</Text>
        </View>
        <Chevron color={t.label3} />
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={[tx(40, 300, 1, -0.03), num, { color: t.label }]}>{big}</Text>
          <Text style={[tx(15, 400, 1.3, 0), num, { color: t.label2 }]}>{small}</Text>
        </View>
        <Timeline cells={cells} endLabel={endLabel} />
        {note != null && <Text style={[tx(13, 400, 1.3, 0), { color: t.label2 }]}>{note}</Text>}
      </View>
    </Pressable>
  )
}
