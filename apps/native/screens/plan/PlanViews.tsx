/**
 * The web's src/screens/plan/PlanViews.tsx on lib/ui: the add-workout sheet, a weekday of the
 * repeating week (no plan running), a workout's exercises and the workout page. Words and lines
 * come from planModel (shared, tested); the exercise library, builder and thumbnails are Train's.
 */
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import type { Schedule, WorkoutType } from '@/core/types'
import { LIFTS, firstVideo } from '@/core/data/workouts'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { exById } from '@/core/domain/library'
import { DAY_NAME, todayStr } from '@/core/domain/date'
import { weekOf } from '@/core/domain/insights'
import { plannedKeys } from '@/core/domain/plans'
import { shapeFor } from '@/core/domain/guided'
import { WEEK_ORDER, plannedOn, shortTitle, swapDays, weekWarnings } from '@/core/domain/week'
import { aboutLine, keyTitle, keyVideo, routineEstMins, routineFor, slotsOf, taliWorkouts, templateFor, type WorkoutKey } from '@/core/domain/routines'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { bareName } from '@/screens/train/trainModel'
import { keyLine, plannedDaysLine, workoutKind, workoutSub } from '@/screens/plan/planModel'
import { Btn, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, NavBtn, Row, Sheet, TitleRow } from '../../lib/ui/primitives'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { Icon } from '../../lib/ui/icons'
import { Check } from '../../lib/ui/choices'
import { num, tx, useTokens } from '../../lib/theme'
import { LibrarySheet, Thumb } from '../train'
import { PlanNote } from './PlanParts'


/** Change the repeating week, with a toast that can undo it. */
function useWeekChange() {
  const schedule = useStore((s) => s.data.schedule)
  const setSchedule = useStore((s) => s.setSchedule)
  const showToast = useStore((s) => s.showToast)
  return (next: Schedule, msg: string) => {
    const before: Schedule = { ...schedule }
    setSchedule(next, true)
    showToast(msg, { label: 'Undo', run: () => setSchedule(before, true) })
  }
}

/** `.pv-back`: the back row under the status bar. */
export function PvBack({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return <View style={{ paddingTop: insets.top + 16, paddingBottom: 6, marginLeft: -6 }}>{children}</View>
}

/** A pushed Plan view: the scrolling `.screen` with the page colour. */
export function PlanPage({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const t = useTokens()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>{children}</ScrollView>
      {footer != null && <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>{footer}</View>}
    </View>
  )
}

/** `.linkbtn` drawn inside a row's own button ("View", "Read"): words, not a second button. */
export function RowLink({ title }: { title: string }) {
  const t = useTokens()
  return <Text style={[tx(15, 500, 1.3, 0), { color: t.tint, paddingVertical: 6, paddingHorizontal: 4 }]}>{title}</Text>
}

/**
 * `.dash-add`. TODO(N1-P3): lib/ui's dashed add button. Until it lands, the same action as lib/ui's
 * action row, so the view works.
 */
export function AddRow({ title, onPress }: { title: string; onPress: () => void }) {
  return <List style={{ marginTop: 12 }}><Row act icon="plus" title={title} onPress={onPress} /></List>
}

type Cat = { id: string; label: string; items: WorkoutKey[]; sub?: string }

/**
 * Choose a category, then a workout, then "Add to Monday" (never "Start": that lives in Train).
 * Without `onAdd` it sets the weekly schedule's one workout; with it (a plan's day, which holds
 * several, own workouts too) it hands the choice back and "My workouts" leads the list (Flow 3).
 */
export function AddWorkoutSheet({ idx, onClose, onAdd, have = [], notesFor }: {
  idx: number; onClose: () => void; onAdd?: (k: WorkoutKey) => void; have?: WorkoutKey[]; notesFor?: (k: WorkoutKey) => string[]
}) {
  const schedule = useStore((s) => s.data.schedule)
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const change = useWeekChange()
  const mine = (routines || []).filter((r) => !r.archived && !have.includes(r.id))
  const cats: Cat[] = [
    ...(onAdd && mine.length ? [{ id: 'mine', label: 'My workouts', items: mine.map((r) => r.id), sub: 'Ones you made or saved' }] : []),
    ...([{ id: 'weights', label: MODALITY_LABEL.strength, items: LIFTS }, { id: 'cardio', label: MODALITY_LABEL.cardio, items: ['Cardio'] }] as Cat[])
      .map((c) => ({ ...c, items: c.items.filter((x) => !have.includes(x)) })).filter((c) => c.items.length),
  ]
  if (onAdd) {
    const tali = taliWorkouts().filter((r) => !have.includes(r.id))
    const weights = cats.find((c) => c.id === 'weights')
    const lifts = tali.filter((r) => r.modality === 'strength').map((r) => r.id)
    if (weights) weights.items = [...weights.items, ...lifts]
    else if (lifts.length) cats.push({ id: 'weights', label: MODALITY_LABEL.strength, items: lifts })
    const mob = tali.filter((r) => r.modality === 'mobility').map((r) => r.id)
    if (mob.length) cats.push({ id: 'mobility', label: MODALITY_LABEL.mobility, items: mob })
  }
  const [cat, setCat] = useState<Cat | null>(null)
  const [sel, setSel] = useState<WorkoutKey | null>(null)
  const [see, setSee] = useState<WorkoutKey | null>(null)
  const day = DAY_NAME[idx]
  const cancel = <NavBtn title="Cancel" onPress={onClose} />
  const warn = !sel ? [] : notesFor ? notesFor(sel)
    : weekWarnings({ ...schedule, [idx]: sel as WorkoutType }).filter((w) => w.kind === 'back-to-back' && w.days.includes(idx)).map((w) => w.text)
  const subOf = (k: WorkoutKey) => keyLine(k, routines, training, ONBOARDING_ENABLED)

  if (see) {
    return (
      <Sheet title={keyTitle(see, routines)} onClose={onClose} tall animate={false} left={<BackButton label={cat?.label ?? 'Back'} onPress={() => setSee(null)} />} right={cancel}>
        <ExerciseList type={see} />
      </Sheet>
    )
  }
  if (cat) {
    return (
      <Sheet title={cat.label} onClose={onClose} tall animate={false} left={<BackButton label="Categories" onPress={() => { setCat(null); setSel(null) }} />} right={cancel}>
        <List>
          {cat.items.map((k) => (
            <Row key={k} pv title={keyTitle(k, routines)} sub={subOf(k) + (!onAdd && schedule[idx] === k ? ' · on ' + day + ' now' : '')} onPress={() => setSel(k)}
              lead={<Thumb video={keyVideo(k, routines)} shape={k === 'Cardio' ? 'duration' : undefined} />}
              right={<Check on={sel === k} />} />
          ))}
        </List>
        {sel && sel !== 'Cardio' && <View style={{ alignSelf: 'flex-start' }}><LinkBtn title={`See what's in ${keyTitle(sel, routines)}`} onPress={() => setSee(sel)} /></View>}
        {warn.map((w) => <PlanNote key={w}>{w}</PlanNote>)}
        {/* .sheet-cta */}
        <View style={{ paddingTop: 12, marginTop: 8 }}>
          <Btn title={`Add to ${day}`} disabled={!sel} onPress={() => {
            if (!sel) return
            if (onAdd) onAdd(sel)
            else change({ ...schedule, [idx]: sel as WorkoutType }, `${shortTitle(sel)} added to ${day}`)
            onClose()
          }} />
        </View>
      </Sheet>
    )
  }
  const row = (c: Cat) => (
    // TODO(N1): `.catsq` (a plain colour square, 36 radius 10) leads this row once lib/ui has it (asked N1)
    <Row key={c.id} pv title={c.label} sub={c.sub ?? `${c.items.length} ${c.items.length === 1 ? 'workout' : 'workouts'} · ${c.items.map((k) => keyTitle(k, routines)).join(', ')}`} onPress={() => setCat(c)} />
  )
  const ready = cats.filter((c) => c.id !== 'mine')
  const own = cats.find((c) => c.id === 'mine')
  return (
    <Sheet title={`Add to ${day}`} onClose={onClose} tall left={null} right={cancel}>
      {own && <List style={{ marginBottom: 4 }}>{row(own)}</List>}
      <Lbl style={own ? undefined : { paddingTop: 0 }}>Ready-made</Lbl>
      <List>{ready.map(row)}</List>
      <Foot style={{ paddingTop: 14, paddingHorizontal: 4 }}>
        {cats.some((c) => c.id === 'mobility') ? 'Bodyweight, Yoga and Pilates' : 'Bodyweight, Yoga, Pilates and Mobility'} appear here once they have ready-made workouts.
      </Foot>
    </Sheet>
  )
}

/** Pick another weekday of the repeating week (copy from it, or swap with it). */
function DayPick({ idx, title, onPick, onClose }: { idx: number; title: string; onPick: (d: number) => void; onClose: () => void }) {
  const schedule = useStore((s) => s.data.schedule)
  return (
    <Sheet title={title} onClose={onClose}>
      <List>
        {WEEK_ORDER.filter((d) => d !== idx).map((d) => {
          const v = plannedOn(schedule, d)
          return <Row key={d} title={DAY_NAME[d]} sub={v === 'Rest' ? 'Rest' : shortTitle(v)} onPress={() => onPick(d)} />
        })}
      </List>
    </Sheet>
  )
}

/** One weekday of the repeating week: what's on it and the ways to change it. Changes repeat every week. */
export function DayView({ idx, onBack, onOpenWorkout }: { idx: number; onBack: () => void; onOpenWorkout: (k: WorkoutKey) => void }) {
  const schedule = useStore((s) => s.data.schedule)
  const change = useWeekChange()
  const [sheet, setSheet] = useState<null | 'add' | 'copy' | 'swap'>(null)
  const v = plannedOn(schedule, idx)
  const day = DAY_NAME[idx]
  const warns = weekWarnings(schedule).filter((w) => w.kind === 'no-rest' || w.days.includes(idx))
  return (
    <PlanPage>
      <PvBack><BackButton label="My week" onPress={onBack} /></PvBack>
      <TitleRow title={day} />
      <Sub style={{ marginTop: 2, marginBottom: 16 }}>{v === 'Rest' ? 'Rest day · recovery counts too' : 'Every week'}</Sub>
      {v !== 'Rest' && (
        <List>
          <Row pv title={shortTitle(v)} sub={`${workoutKind(v)} · ${workoutSub(v)}`} onPress={() => onOpenWorkout(v)}
            lead={<Thumb video={firstVideo(v)} shape={v === 'Cardio' ? 'duration' : undefined} />} right={<RowLink title="View" />} />
        </List>
      )}
      <AddRow title={v === 'Rest' ? 'Add a workout' : 'Change workout'} onPress={() => setSheet('add')} />
      {v === 'Rest' && <Lbl>Or</Lbl>}
      <List style={{ marginTop: v === 'Rest' ? 0 : 12 }}>
        {v !== 'Rest' && <Row title={`Make ${day} a rest day`} sub="Rest is part of the plan" chevron={false} onPress={() => change({ ...schedule, [idx]: 'Rest' }, `${day} is a rest day now`)} />}
        <Row title="Copy another day" sub="Pick a day to copy from" onPress={() => setSheet('copy')} />
        <Row title="Swap with another day" onPress={() => setSheet('swap')} />
      </List>
      {warns.map((w) => <PlanNote key={w.text}>{w.text}</PlanNote>)}
      <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>Changes here repeat every week. To change just this {day}, use the Train tab.</Foot>

      {sheet === 'add' && <AddWorkoutSheet idx={idx} onClose={() => setSheet(null)} />}
      {sheet === 'copy' && <DayPick idx={idx} title="Copy from" onClose={() => setSheet(null)} onPick={(d) => {
        change({ ...schedule, [idx]: plannedOn(schedule, d) }, `${day} now matches ${DAY_NAME[d]}`); setSheet(null)
      }} />}
      {sheet === 'swap' && <DayPick idx={idx} title="Swap with" onClose={() => setSheet(null)} onPick={(d) => {
        change(swapDays(schedule, idx, d), `${day} and ${DAY_NAME[d]} swapped`); setSheet(null)
      }} />}
    </PlanPage>
  )
}

/** A workout's exercises, read only; each opens its library entry. */
export function ExerciseList({ type }: { type: WorkoutKey }) {
  const t = useTokens()
  const [lib, setLib] = useState<string | null>(null)
  const routines = useStore((s) => s.data.routines)
  return (
    <>
      {/* TODO(N7): Train's WarmupCard here when ONBOARDING_ENABLED (off, as on the web) */}
      <List>
        {(templateFor(type, routines)?.ex ?? []).map((e, i) => {
          const x = exById(e.id)
          return (
            <Row key={i} pv title={bareName(e.n)} onPress={x ? () => setLib(x.id) : undefined} chevron={false}
              lead={<Thumb video={e.video} shape={shapeFor(e, x)} play={!!e.video} />}
              right={<Text style={[tx(14, 400, 1.3, 0), num, { color: t.label2 }]}>{e.t}</Text>} />
          )
        })}
      </List>
      {lib && <LibrarySheet initial={lib} onClose={() => setLib(null)} />}
    </>
  )
}

/**
 * A workout (Plan, p1-workout): its exercises and where it sits in the week. Ready-made workouts
 * stay as they are; "Make your own copy" starts one of the user's own from it, which can then be
 * edited. "Do this today" hands over to Train, which owns Start.
 */
export function WorkoutView({ type, onBack, onCopy, onEdit }: { type: WorkoutKey; onBack: () => void; onCopy?: () => void; onEdit?: () => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const openTrain = useStore((s) => s.openTrain)
  const setDate = useStore((s) => s.setDate)
  const { routines } = data
  const training = data.profile.training
  const r = routineFor(type, routines)
  const own = r && r.source === 'custom' ? r : undefined
  const thisWeek = weekOf(todayStr())
  const when = plannedDaysLine(WEEK_ORDER.filter((d) => plannedKeys(data, thisWeek[(d + 6) % 7]).includes(type)))
  const n = r ? slotsOf(r).length : 0
  const sub = r
    ? [`${ONBOARDING_ENABLED ? 'warm-up and ' : ''}${n} ${n === 1 ? 'exercise' : 'exercises'}`, aboutLine(routineEstMins(r, routines, training, ONBOARDING_ENABLED))].filter(Boolean).join(' · ')
    : workoutSub(type as WorkoutType)
  return (
    <PlanPage>
      {/* `.wv-hero.plain`. TODO(N7): the clip's poster (300 pt hero) once Train exports its poster image */}
      <View style={{ height: insets.top + 190, marginHorizontal: -16, backgroundColor: t.hero }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
          style={({ pressed }) => ({ position: 'absolute', left: 16, top: insets.top + 54, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Icon name="chevL" size={18} stroke={2.6} color="#1d1d1f" />
        </Pressable>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
          <Text accessibilityRole="header" style={[tx(34, 600, 40, -0.025), { color: '#fff' }]}>{keyTitle(type, routines)}</Text>
          <Text style={[tx(15), num, { color: 'rgba(255,255,255,0.85)' }]}>{own ? `Your workout · ${sub}` : r ? `Tilo workout · ${sub}` : `${when} · ${sub}`}</Text>
        </View>
      </View>
      <View style={{ paddingTop: 16 }}>
        <ExerciseList type={type} />
        <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>
          {own
            ? "Do it today with Do this today, or on any day from Add something in Train. With a plan running, you can add it to any day of the plan's week."
            : `Ready-made workouts stay as they are.${onCopy ? ' Make your own copy to change the exercises.' : ''} To change a move for one day, use Swap in Train.`}
        </Foot>
        <View style={{ gap: 8, marginTop: 16 }}>
          <Btn kind="gray" title="Do this today" onPress={() => { setDate(todayStr()); openTrain(type) }} />
          {own && onEdit && <Btn kind="gray" title="Edit workout" onPress={onEdit} />}
          {!own && onCopy && <Btn kind="gray" title="Make your own copy" onPress={onCopy} />}
        </View>
      </View>
    </PlanPage>
  )
}
