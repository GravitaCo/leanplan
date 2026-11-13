/**
 * Native port of src/screens/plan/PlanViews.tsx: the add-workout sheet, a weekday of the repeating
 * week (no plan running), a workout's exercises and the workout page.
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import type { Schedule, WorkoutType } from '@/core/types'
import { LIFTS, firstVideo } from '@/core/data/workouts'
import { exById } from '@/core/domain/library'
import { DAY_NAME, todayStr } from '@/core/domain/date'
import { weekOf } from '@/core/domain/insights'
import { plannedKeys } from '@/core/domain/plans'
import { shapeFor } from '@/core/domain/guided'
import { WEEK_ORDER, plannedOn, shortTitle, swapDays, weekWarnings } from '@/core/domain/week'
import { aboutLine, routineEstMins, keyTitle, keyVideo, routineFor, taliWorkouts, slotsOf as routineSlots, templateFor, warmupForKey, type WorkoutKey } from '@/core/domain/routines'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { bareName, kindOf, workoutSub } from './planShared'
import { LibrarySheet, Thumb, WarmupCard } from './trainBridge'
import { BackButton, Btn, Chevron, DashAdd, Foot, Icon, Lbl, Li, LinkBtn, List, M, NavBtn, PlanNote, PvBack, Screen, Sheet, Sub, TitleRow, font, num, useHero, useTokens, type Tokens } from './ui'

export type Planned = WorkoutType | 'Rest'

/** Ready-made workouts by category. Categories with none (Bodyweight, Yoga, Pilates, Mobility) stay hidden. */
const CATEGORIES = (t: Tokens): { id: 'weights' | 'cardio'; label: string; items: WorkoutType[]; color: string }[] => [
  { id: 'weights', label: MODALITY_LABEL.strength, items: LIFTS, color: t.moveFill },
  { id: 'cardio', label: MODALITY_LABEL.cardio, items: ['Cardio'], color: t.mindFill },
]

/** Change the week, with a toast that can undo it. */
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

/** `.pv-row`: a 72 pt row with a thumbnail */
const pv = { paddingVertical: 10, paddingHorizontal: 14, minHeight: 72 }

/** `.catsq` (36, r10) or `.catsq.sm` (30, r8) */
export const CatSq = ({ color, sm }: { color: string; sm?: boolean }) => <View style={{ width: sm ? 30 : 36, height: sm ? 30 : 36, borderRadius: sm ? 8 : 10, backgroundColor: color }} />

/**
 * Choose a category, then a workout, then "Add to Monday" (never "Start": that lives in Train).
 * Without `onAdd` it sets the weekly schedule's one workout; with it (a plan's day, which holds
 * several, own workouts too) it hands the choice back and "My workouts" leads the list (Flow 3).
 */
export function AddWorkoutSheet({ idx, onClose, onAdd, have = [], notesFor }: {
  idx: number
  onClose: () => void
  onAdd?: (k: WorkoutKey) => void
  have?: WorkoutKey[]
  notesFor?: (k: WorkoutKey) => string[]
}) {
  const t = useTokens()
  const schedule = useStore((s) => s.data.schedule)
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const change = useWeekChange()
  type Cat = { id: string; label: string; items: WorkoutKey[]; color: string; sub?: string }
  const mine = (routines || []).filter((r) => !r.archived && !have.includes(r.id))
  const cats: Cat[] = [
    ...(onAdd && mine.length ? [{ id: 'mine', label: 'My workouts', items: mine.map((r) => r.id), color: t.btn, sub: 'Ones you made or saved' }] : []),
    ...CATEGORIES(t).map((c) => ({ ...c, items: c.items.filter((x) => !have.includes(x)) as WorkoutKey[] })).filter((c) => c.items.length),
  ]
  if (onAdd) {
    const tali = taliWorkouts().filter((r) => !have.includes(r.id))
    const weights = cats.find((c) => c.id === 'weights')
    const lifts = tali.filter((r) => r.modality === 'strength').map((r) => r.id)
    if (weights) weights.items = [...weights.items, ...lifts]
    else if (lifts.length) cats.push({ id: 'weights', label: MODALITY_LABEL.strength, items: lifts, color: t.moveFill })
    const mob = tali.filter((r) => r.modality === 'mobility').map((r) => r.id)
    if (mob.length) cats.push({ id: 'mobility', label: MODALITY_LABEL.mobility, items: mob, color: t.mindFill })
  }
  const [cat, setCat] = useState<Cat | null>(null)
  const [sel, setSel] = useState<WorkoutKey | null>(null)
  const [see, setSee] = useState<WorkoutKey | null>(null)
  const day = DAY_NAME[idx]
  const cancel = <NavBtn title="Cancel" onPress={onClose} />
  const warn = !sel ? [] : notesFor ? notesFor(sel)
    : weekWarnings({ ...schedule, [idx]: sel as WorkoutType }).filter((w) => w.kind === 'back-to-back' && w.days.includes(idx)).map((w) => w.text)
  const subOf = (k: WorkoutKey) => {
    const r = routineFor(k, routines)
    if (!r) return workoutSub(k as WorkoutType)
    const n = routineSlots(r).length
    return [MODALITY_LABEL[r.modality], `${n} ${n === 1 ? 'exercise' : 'exercises'}`, aboutLine(routineEstMins(r, routines, training, ONBOARDING_ENABLED))].filter(Boolean).join(' · ')
  }

  if (see) {
    return (
      <Sheet title={keyTitle(see, routines)} onClose={onClose} tall left={<BackButton label={cat?.label ?? 'Back'} onPress={() => setSee(null)} />} right={cancel}>
        <ExerciseList type={see} />
      </Sheet>
    )
  }
  if (cat) {
    return (
      <Sheet title={cat.label} onClose={onClose} tall left={<BackButton label="Categories" onPress={() => { setCat(null); setSel(null) }} />} right={cancel}
        footer={<Btn title={`Add to ${day}`} disabled={!sel} onPress={() => {
          if (!sel) return
          if (onAdd) onAdd(sel)
          else change({ ...schedule, [idx]: sel as WorkoutType }, `${shortTitle(sel)} added to ${day}`)
          onClose()
        }} />}>
        <List>
          {cat.items.map((k) => (
            <Li key={k} role="radio" selected={sel === k} onPress={() => setSel(k)} style={pv} label={keyTitle(k, routines)}>
              <Thumb video={keyVideo(k, routines)} shape={k === 'Cardio' ? 'duration' : undefined} />
              <M wrap t={keyTitle(k, routines)} s={subOf(k) + (!onAdd && schedule[idx] === k ? ' · on ' + day + ' now' : '')} />
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: sel === k ? t.tint : t.dash, backgroundColor: sel === k ? t.tint : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {sel === k && <Icon name="check" size={14} stroke={3} color={t.onTint} />}
              </View>
            </Li>
          ))}
        </List>
        {sel && sel !== 'Cardio' && <LinkBtn title={`See what's in ${keyTitle(sel, routines)}`} onPress={() => setSee(sel)} style={{ alignSelf: 'flex-start' }} />}
        {warn.map((w) => <PlanNote key={w}>{w}</PlanNote>)}
      </Sheet>
    )
  }
  const ready = cats.filter((c) => c.id !== 'mine')
  const own = cats.find((c) => c.id === 'mine')
  const row = (c: Cat) => (
    <Li key={c.id} onPress={() => setCat(c)} style={pv}>
      <CatSq color={c.color} />
      <M wrap t={c.label} s={c.sub ?? `${c.items.length} ${c.items.length === 1 ? 'workout' : 'workouts'} · ${c.items.map((k) => keyTitle(k, routines)).join(', ')}`} />
      <Chevron />
    </Li>
  )
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

/** Pick another weekday (copy from it, or swap with it). */
function DayPick({ idx, title, onPick, onClose }: { idx: number; title: string; onPick: (d: number) => void; onClose: () => void }) {
  const schedule = useStore((s) => s.data.schedule)
  return (
    <Sheet title={title} onClose={onClose}>
      <List>
        {WEEK_ORDER.filter((d) => d !== idx).map((d) => {
          const v = plannedOn(schedule, d)
          return (
            <Li key={d} onPress={() => onPick(d)}>
              <M t={DAY_NAME[d]} s={v === 'Rest' ? 'Rest' : shortTitle(v)} />
              <Chevron />
            </Li>
          )
        })}
      </List>
    </Sheet>
  )
}

/** One weekday: what's on it and the ways to change it. Changes repeat every week. */
export function DayView({ idx, onBack, onOpenWorkout }: { idx: number; onBack: () => void; onOpenWorkout: (t: WorkoutType) => void }) {
  const schedule = useStore((s) => s.data.schedule)
  const change = useWeekChange()
  const [sheet, setSheet] = useState<null | 'add' | 'copy' | 'swap'>(null)
  const v: Planned = plannedOn(schedule, idx)
  const day = DAY_NAME[idx]
  const warns = weekWarnings(schedule).filter((w) => w.kind === 'no-rest' || w.days.includes(idx))

  return (
    <Screen>
      <PvBack><BackButton label="My week" onPress={onBack} /></PvBack>
      <TitleRow title={day} />
      <Sub style={{ marginTop: 2, marginBottom: 16 }}>{v === 'Rest' ? 'Rest day · recovery counts too' : 'Every week'}</Sub>

      {v !== 'Rest' && (
        <List>
          <Li onPress={() => onOpenWorkout(v)} style={pv}>
            <Thumb video={firstVideo(v)} shape={v === 'Cardio' ? 'duration' : undefined} />
            <M wrap t={shortTitle(v)} s={`${kindOf(v)} · ${workoutSub(v)}`} />
            <ViewLink />
          </Li>
        </List>
      )}
      <DashAdd title={v === 'Rest' ? 'Add a workout' : 'Change workout'} onPress={() => setSheet('add')} />

      {v === 'Rest' && <Lbl>Or</Lbl>}
      <List style={{ marginTop: v === 'Rest' ? 0 : 12 }}>
        {v !== 'Rest' && (
          <Li onPress={() => change({ ...schedule, [idx]: 'Rest' }, `${day} is a rest day now`)}>
            <M t={`Make ${day} a rest day`} s="Rest is part of the plan" />
          </Li>
        )}
        <Li onPress={() => setSheet('copy')}><M t="Copy another day" s="Pick a day to copy from" /><Chevron /></Li>
        <Li onPress={() => setSheet('swap')}><M t="Swap with another day" /><Chevron /></Li>
      </List>
      {warns.map((w) => <PlanNote key={w.text}>{w.text}</PlanNote>)}
      <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>Changes here repeat every week. To change just this {day}, use the Train tab.</Foot>

      {sheet === 'add' && <AddWorkoutSheet idx={idx} onClose={() => setSheet(null)} />}
      {sheet === 'copy' && <DayPick idx={idx} title="Copy from" onClose={() => setSheet(null)} onPick={(d) => {
        const from = plannedOn(schedule, d)
        change({ ...schedule, [idx]: from }, `${day} now matches ${DAY_NAME[d]}`); setSheet(null)
      }} />}
      {sheet === 'swap' && <DayPick idx={idx} title="Swap with" onClose={() => setSheet(null)} onPick={(d) => {
        change(swapDays(schedule, idx, d), `${day} and ${DAY_NAME[d]} swapped`); setSheet(null)
      }} />}
    </Screen>
  )
}

/** The row's "View" (a `.linkbtn` drawn as text inside the row's own button) */
export function ViewLink({ title = 'View' }: { title?: string }) {
  const t = useTokens()
  return <Text style={[font(400), { fontSize: 15, color: t.tint, paddingVertical: 6, paddingHorizontal: 4 }]}>{title}</Text>
}

/** A workout's exercises, read only; each opens its library entry. */
export function ExerciseList({ type }: { type: WorkoutKey }) {
  const t = useTokens()
  const [lib, setLib] = useState<string | null>(null)
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const warm = ONBOARDING_ENABLED ? warmupForKey(type, routines, training) : null
  return (
    <>
      {warm && <WarmupCard block={warm} />}
      <List>
        {(templateFor(type, routines)?.ex ?? []).map((e, i) => {
          const x = exById(e.id)
          return (
            <Li key={i} onPress={x ? () => setLib(x.id) : undefined} style={pv}>
              <Thumb video={e.video} shape={shapeFor(e, x)} play={!!e.video} />
              <M wrap t={bareName(e.n)} />
              <Text style={[font(400), num, { fontSize: 14, color: t.label2 }]}>{e.t}</Text>
            </Li>
          )
        })}
      </List>
      {lib && <LibrarySheet initial={lib} onClose={() => setLib(null)} />}
    </>
  )
}

/**
 * A workout (Plan, p1-workout): its exercises and where it sits in the week. Ready-made workouts
 * stay as they are; "Make your own copy" starts one of the user's own from it (plan P4), which can
 * then be edited. "Do this today" hands over to Train, which owns Start.
 */
export function WorkoutView({ type, onBack, onCopy, onEdit }: { type: WorkoutKey; onBack: () => void; onCopy?: () => void; onEdit?: () => void }) {
  const hero = useHero()
  const insets = useSafeAreaInsets()
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const openTrain = useStore((s) => s.openTrain)
  const setDate = useStore((s) => s.setDate)
  const r = routineFor(type, routines)
  const own = r && r.source === 'custom' ? r : undefined
  const data = useStore((s) => s.data)
  const thisWeek = weekOf(todayStr())
  const on = WEEK_ORDER.filter((d) => plannedKeys(data, thisWeek[(d + 6) % 7]).includes(type)).map((d) => DAY_NAME[d] + 's')
  const when = on.length ? on.length === 1 ? on[0] : on.slice(0, -1).join(', ') + ' and ' + on[on.length - 1] : 'Not in your week'
  const sub = r
    ? [`${ONBOARDING_ENABLED ? 'warm-up and ' : ''}${routineSlots(r).length} ${routineSlots(r).length === 1 ? 'exercise' : 'exercises'}`, aboutLine(routineEstMins(r, routines, training, ONBOARDING_ENABLED))].filter(Boolean).join(' · ')
    : workoutSub(type as WorkoutType)
  // `.wv-hero.plain`: the poster comes with N7's media access (Bunny wants a referrer); until then
  // the hero is the plain one the web shows when the poster can't load
  return (
    <Screen top={false} pad={24}>
      <View style={{ height: insets.top + 190, marginHorizontal: -16, backgroundColor: hero }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
          style={{ position: 'absolute', left: 16, top: insets.top + 54, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} stroke={2.6} color="#1d1d1f" />
        </Pressable>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
          <Text accessibilityRole="header" style={[font(600), { fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: '#fff' }]}>{keyTitle(type, routines)}</Text>
          <Text style={[font(400), num, { fontSize: 15, color: 'rgba(255,255,255,0.85)' }]}>{own ? `Your workout · ${sub}` : r ? `Tilo workout · ${sub}` : `${when} · ${sub}`}</Text>
        </View>
      </View>
      <View style={{ paddingTop: 16 }}>
        <ExerciseList type={type} />
        {own ? (
          <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>Do it today with Do this today, or on any day from Add something in Train. With a plan running, you can add it to any day of the plan's week.</Foot>
        ) : (
          <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>Ready-made workouts stay as they are.{onCopy ? ' Make your own copy to change the exercises.' : ''} To change a move for one day, use Swap in Train.</Foot>
        )}
        <View style={{ gap: 8, marginTop: 16 }}>
          <Btn kind="gray" title="Do this today" onPress={() => { setDate(todayStr()); openTrain(type) }} />
          {own && onEdit && <Btn kind="gray" title="Edit workout" onPress={onEdit} />}
          {!own && onCopy && <Btn kind="gray" title="Make your own copy" onPress={onCopy} />}
        </View>
      </View>
    </Screen>
  )
}
