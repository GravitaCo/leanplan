import type { Equipment, Exercise, ExerciseTemplate, LoggedExercise, Modality, Routine, Session } from '@/core/types'
import type { PersistedState } from '@/data/persistence'
import { WORKOUTS } from '@/core/data/workouts'
import { EXERCISES } from '@/core/data/exercises'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { fmtDate, todayStr } from '@/core/domain/date'
import { catchUp, daysMovedThisWeek, welcomeBack } from '@/core/domain/training'
import { lowSignals, offerLighter, roughNight, shorterPrescription, showRoughNightNote, type ShorterKind } from '@/core/domain/dayOptions'
import { sessionsOf, warmupOnly, workoutsOf } from '@/core/domain/sessions'
import { exById, fmtSet } from '@/core/domain/library'
import { fmtTarget, lastTime, parseRx, readyToStepUp, setCount, setsLine, slotsOf, splitLogged, targetFor, working, type Slot } from '@/core/domain/guided'
import { activePlan, isEaseIn, isHardKey, maintainOn, plannedKeys, positionOn } from '@/core/domain/plans'
import { isBuiltinKey, keyOfSession, keyRoutineId, keyTitle, keyVideo, templateFor, type WorkoutKey } from '@/core/domain/routines'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { HARD_DAY_COPY, easierAim, hardDayChoices, roughShorter, swapForWorkout, swapTile } from './hardDay'
import type { Choice } from '@/copy/train'

/**
 * Train's day model: what the Train tab shows for a day (the planned workouts with their versions,
 * swaps, the lighter options, what's done) as pure functions of the saved data and the screen's
 * own choices. Moved unchanged out of TrainScreen so the web and native screens share it.
 */

/** The screen's own state that shapes the model: today's pick, swaps and the slots put back with Undo. */
export interface TrainUi {
  /** the person's pick for today, for the workout it was made on (it never carries into another) */
  pick0: { c: Choice; k: WorkoutKey } | null
  swapsBy: Record<string, Record<number, string>>
  /** slots put back with Undo after a rough night's steadier swap (wellbeing flag): they stay as planned */
  keepBy: Record<string, number[]>
}
export const NO_TRAIN_UI: TrainUi = { pick0: null, swapsBy: {}, keepBy: {} }

/** The library id a logged exercise stands for, when it isn't the workout's own (a swap). */
export function loggedSwap(t: ExerciseTemplate, L: LoggedExercise | undefined): string | undefined {
  if (!L || L.name === t.n) return undefined
  const id = L.exId ?? EXERCISES.find((x) => x.n === L.name)?.id
  return id && id !== t.id ? id : undefined
}

/** A done session's line under its title ("Strength · 9 sets · shorter"). */
export const sessSub = (x: Session) => {
  const n = x.ex ? x.ex.reduce((a, e) => a + working(e.sets).length, 0) : 0
  return [MODALITY_LABEL[x.modality] ?? x.modality, x.ex ? `${n} ${n === 1 ? 'set' : 'sets'}` : '', x.mins != null && !x.ex ? `${x.mins} min` : '', x.cardio?.km ? `${x.cardio.km} km` : '', x.option === 'shorter' ? 'shorter' : '']
    .filter(Boolean).join(' · ')
}

export type TrainDay = ReturnType<typeof trainDay>

export function trainDay(data: PersistedState, cur: string, ui: TrainUi) {
  const { pick0, swapsBy, keepBy } = ui
  const day = data.days[cur]
  // the workouts done: a warm-up on its own is movement, not a workout done (workoutsOf)
  const sessions = workoutsOf(day, cur)
  const logged = sessions.length > 0
  const routines = data.routines
  /** the session a workout saved on this day, if any: a warm-up on its own only while it's open (Resume) */
  const builtin = (t: WorkoutKey) => sessionsOf(day, cur).find((x) => x.routineId === keyRoutineId(t) && (!warmupOnly(x) || x.open === true))
  const fd = fmtDate(cur)
  // what's planned: the active plan's day (several workouts, own ones too) or the schedule's one
  const planned = plannedKeys(data, cur)
  const restDay = planned.length === 0
  // a maintenance week of the plan: planned workouts open on the lighter version (Benn's model)
  const maintain = maintainOn(data, cur)
  // the plan in charge on this day, for the line above Today
  const planNow = activePlan(data, cur)
  const planPos = planNow ? positionOn(planNow, cur) : null
  const isToday = cur === todayStr()
  const dayName = fd.dow

  // day-of choices: offered when two or more check-in signals are low for this person, and
  // always available from a quiet row; never applied automatically
  const recent = Object.keys(data.days).filter((d) => d < cur).sort().reverse().map((d) => data.days[d]?.checkin)
  const low = lowSignals(day?.checkin, recent)
  // not on rest days: rest is the plan, and a lighter option than rest would nudge movement
  const offer = !logged && !restDay && offerLighter(day?.checkin, recent)
  // an accepted "easier first week" pre-selects the shorter version (still just a choice), and so
  // does a maintenance week
  const easyWeek = !logged && !restDay && !!data.profile.easyUntil && cur >= (data.profile.easyFrom || data.profile.welcomeAsked || '') && cur <= data.profile.easyUntil
  // lighter weeks shorten the hard workouts only: light cardio and mobility stay as planned
  // (the maintenance evidence is about resistance volume; fitness-workouts)
  const easyFor = (k: WorkoutKey) => easyWeek || (maintain && isHardKey(k, routines))
  const easy = easyWeek || (!restDay && maintain && planned.some((k) => isHardKey(k, routines)))

  const pick = isToday ? catchUp(data, cur) : null
  const pickUp = pick?.type
  const weekCount = daysMovedThisWeek(data, cur)
  const back = isToday && welcomeBack(data, cur)

  /** today's version of a workout: its own saved session wins, then the person's pick, then the day's default */
  const choiceFor = (t: WorkoutKey): Choice => {
    if (pick0 && pick0.k === t) return pick0.c
    const own = builtin(t)
    if (own) return own.option === 'shorter' ? 'shorter' : 'planned'
    return easyFor(t) ? 'shorter' : 'planned'
  }
  const swapsFor = (t: WorkoutKey): Record<number, string> => {
    if (swapsBy[t]) return swapsBy[t]
    const out: Record<number, string> = {}
    const L = builtin(t)?.ex
    const ex = templateFor(t, routines)?.ex ?? []
    // an own workout can be reordered after it was logged: an entry that is one of its own planned
    // exercises has only moved, so it isn't read as a swap (the sets follow it; see splitLogged)
    const own = !isBuiltinKey(t)
    const plannedIds = new Set(ex.map((e) => e.id))
    ex.forEach((e, i) => { const id = loggedSwap(e, L?.[i]); if (id && exById(id) && !(own && plannedIds.has(id))) out[i] = id })
    return out
  }
  /** the screen's state after a swap in slot `i` (Undo puts a slot back and, with the wellbeing flag, keeps it as planned) */
  const withSwap = (t: WorkoutKey, i: number, id: string): Pick<TrainUi, 'swapsBy' | 'keepBy'> => {
    const n = { ...swapsFor(t) }
    const isBack = id === templateFor(t, routines)?.ex[i]?.id
    if (isBack) delete n[i]; else n[i] = id
    return {
      swapsBy: { ...swapsBy, [t]: n },
      keepBy: WELLBEING_ENABLED && isBack ? { ...keepBy, [t]: [...(keepBy[t] || []).filter((k) => k !== i), i] } : keepBy,
    }
  }
  // the hard-day choices (board B3, wellbeing flag): after a rough night the shorter version
  // swaps to steadier moves and leaves intervals out; "As planned" never changes
  const rough = WELLBEING_ENABLED && roughNight(low)
  /** a workout's version for today: the swaps, and the slots it leaves out */
  const versionOf = (t: WorkoutKey, shorter: boolean): { swaps: Record<number, string>; leaveOut: number[]; empty: boolean } => {
    const own = swapsFor(t)
    if (!rough || !shorter) return { swaps: own, leaveOut: [], empty: false }
    return roughShorter(templateFor(t, routines)?.ex ?? [], own, keepBy[t] || [], exById)
  }
  /** B3.17: a rough night and something in the workout (as shown) that the shorter version changes */
  const roughNoteFor = (t: WorkoutKey): boolean => {
    if (!rough) return false
    const own = swapsFor(t)
    return showRoughNightNote(low, (templateFor(t, routines)?.ex ?? []).map((e, i) => exById(own[i] ?? e.id)))
  }
  /** which shorter version: a maintenance week keeps the usual effort; every other Shorter is easier */
  const shorterKindFor = (t: WorkoutKey, shorter: boolean): ShorterKind | null =>
    !WELLBEING_ENABLED || !shorter ? null
      : maintain && !easyWeek && !offer && isHardKey(t, routines) && planPos?.maintenanceWeek != null ? 'maintain' : 'easier'

  // what kind of shorter week the plan is in: easing in, a lighter week, or maintenance after it
  const planShortKind = planPos?.maintenanceWeek != null ? 'maintenance' : planNow && planPos && isEaseIn(planNow, planPos.phaseIndex) ? 'ease' : 'lighter'
  const easyNote = !easyWeek && maintain ? (planShortKind === 'maintenance' ? 'Maintenance: the shorter version is selected. Change it any time.' : planShortKind === 'ease' ? 'Easing in: the shorter version is selected while you find your weights. Change it any time.' : 'Lighter week: the shorter version is selected. Change it any time.')
    : easy ? (data.profile.easyFrom && data.profile.easyFrom === data.profile.easyUntil
    ? 'Lighter day: the shorter version is selected for today. Change it any time.'
    : `Easier week: shorter sessions are selected until ${fmtDate(data.profile.easyUntil!).dow}. Change it any time.`) : null

  /** a workout opened: its version for today, the slots shown and the notes the preview and player take */
  const openView = (open: WorkoutKey) => {
    const tplEx = templateFor(open, routines)?.ex ?? []
    // a rough night that leaves nothing in the shorter version offers the swap instead
    const noShorter = rough && versionOf(open, true).empty
    const choice0 = choiceFor(open)
    const choice: Choice = noShorter && choice0 === 'shorter' ? 'swap' : choice0
    const shorter = choice === 'shorter'
    const v = versionOf(open, shorter)
    const swaps = v.swaps
    const slots = slotsOf(tplEx, swaps, shorter, exById).filter((x) => !v.leaveOut.includes(x.i))
    const option = shorter ? 'shorter' as const : undefined
    const kind = shorterKindFor(open, shorter)
    const swapDay = WELLBEING_ENABLED ? swapForWorkout(tplEx, exById) : null
    const shorterNote = shorter ? easyNote ?? (WELLBEING_ENABLED ? (swapDay?.day === 'cardio' ? HARD_DAY_COPY.effortCardio : HARD_DAY_COPY.preview) : null) : null
    // a workout the engine generated (behind the onboarding flag): thumbs, find your weight, how was that set
    const generated: Routine | undefined = ONBOARDING_ENABLED ? (routines || []).find((r) => r.id === open && r.source === 'recommended' && r.blocks.some((b) => b.slots.some((x) => x.why?.length))) : undefined
    return { choice, shorter, swaps, slots, option, kind, swapDay, shorterNote, noShorter, generated, roughNote: roughNoteFor(open), session: builtin(open) }
  }

  // ---------- the today list ----------
  const rowOf = (k: WorkoutKey) => {
    const tpl = templateFor(k, routines)
    const session = builtin(k)
    const shorterK = choiceFor(k) === 'shorter'
    const cardio = k === 'Cardio'
    const vk = versionOf(k, shorterK)
    const kSlots = tpl ? slotsOf(tpl.ex, vk.swaps, shorterK, exById).filter((x) => !vk.leaveOut.includes(x.i)) : []
    const sets = !cardio ? kSlots.reduce((a, x) => a + x.sets, 0) : 0
    const done = session?.ex ? session.ex.reduce((a, e) => a + working(e.sets).length, 0) : 0
    // left part-way in the player ("Leave for now", or closed mid-session): offer Resume
    const inProgress = !!session && !cardio && session.open === true
    const n = WELLBEING_ENABLED && tpl ? kSlots.length : tpl?.ex.length ?? 0
    // a plan's lighter week or maintenance opens hard workouts shorter, with a way back to the full one (Plans 3)
    const planShort = maintain && !easyWeek && shorterK && !cardio
    const sub = cardio ? WORKOUTS.Cardio.ex[0].t
      : planShort ? `Shorter version · ${setCount(tpl?.ex ?? [], true)}`
      : `${n} ${n === 1 ? 'exercise' : 'exercises'} · ${setCount(WELLBEING_ENABLED ? kSlots.map((x) => x.shown) : tpl?.ex ?? [], shorterK)}${shorterK ? ' · shorter' : ''}`
    return { k, session, inProgress, show: !session || inProgress, sets, done, sub, planShort, video: keyVideo(k, routines) }
  }
  const rows = planned.map(rowOf)
  // the lighter options apply to the day's first workout; on a lighter week, its first hard one (the one shortened)
  const first = ((maintain ? planned.find((k) => isHardKey(k, routines)) : undefined) ?? planned[0]) as WorkoutKey | undefined
  const allDone = rows.length > 0 && rows.every((r) => !r.show)
  const showPick = !back && data.profile.welcomeAsked !== cur && !logged && !!pick && !!pickUp && !planned.includes(pickUp)
  const lighterShown = !logged && !restDay
  // a plan's lighter week says so on the workout itself, so the options card stays folded
  const lighterUp = lighterShown && (offer || easyWeek)

  /** board B3's three equal options for the day's first workout (As planned, Shorter, the day-matched swap) */
  const hardDay = () => {
    const k = first
    const tpl = k ? templateFor(k, routines) : null
    const cardio = k === 'Cardio'
    const short = k ? versionOf(k, true) : null
    const swapDay = tpl ? swapForWorkout(tpl.ex, exById) : null
    const title = k ? keyTitle(k, routines) : ''
    const sSlots = tpl && short ? slotsOf(tpl.ex, short.swaps, true, exById).filter((x) => !short.leaveOut.includes(x.i)) : []
    const tiles = hardDayChoices(!!short?.empty).map((c) => {
      if (c === 'planned') {
        const n = tpl?.ex.length ?? 0
        return { c, k: HARD_DAY_COPY.planned, t: title, d: cardio ? WORKOUTS.Cardio.ex[0].t : `${n} ${n === 1 ? 'exercise' : 'exercises'} · ${setCount(tpl?.ex ?? [])}` }
      }
      if (c === 'shorter') {
        return { c, k: HARD_DAY_COPY.shorter, t: title, d: `${cardio ? shorterPrescription(WORKOUTS.Cardio.ex[0].t) : setCount(sSlots.map((x) => x.shown), true)} · ${HARD_DAY_COPY.easierEffort}` }
      }
      const sw = swapTile(swapDay?.swap ?? 'mobility')
      return { c, k: HARD_DAY_COPY.swapKicker, t: sw.title, d: sw.detail }
    })
    return {
      k, tiles,
      heading: offer ? (roughNight(low) ? HARD_DAY_COPY.roughNight : HARD_DAY_COPY.toughDay) : easyNote,
      effort: swapDay?.day === 'cardio' ? HARD_DAY_COPY.effortCardio : HARD_DAY_COPY.effort,
      roughNote: k ? roughNoteFor(k) : false,
    }
  }
  /** the plain lighter card's heading (flag off) */
  const lighterHeading = offer ? (low.includes('sleep') ? 'Short night? ' : 'Tough day? ') + 'Here are a few options for today. All of them count.' : easyNote

  const routineOf = (x: Session): WorkoutKey | null => keyOfSession(x, routines)

  return {
    day, sessions, logged, routines, builtin, planned, restDay, maintain, planNow, planPos, isToday, dayName,
    low, offer, easyWeek, easy, pick, pickUp, weekCount, back,
    choiceFor, swapsFor, withSwap, rough, versionOf, roughNoteFor, shorterKindFor, planShortKind, easyNote, openView,
    rows, first, allDone, showPick, lighterShown, lighterUp, hardDay, lighterHeading, routineOf,
  }
}

/**
 * The preview's exercise rows: what to aim for today (or what's logged), from the last time and
 * the version chosen. Shared by the web and native previews.
 */
export function previewRows(slots: Slot[], days: PersistedState['days'], cur: string, session: Session | undefined, shorter: boolean, shorterKind: ShorterKind | null | undefined) {
  const easier = shorter && shorterKind === 'easier'
  const { bySlot } = splitLogged(session?.ex, slots)
  return slots.map((s) => {
    const last = lastTime(days, cur, s.x?.id, s.shown.n, s.fullRx)
    const mine = working(bySlot[s.i])
    const t = targetFor(s.shape, s.rx, last, 0, [], { shorter: shorterKind })
    // a passive hint only, never on a shorter day, and nothing changes by itself
    const up = !shorter && !mine.length && readyToStepUp(last, s.fullRx) ? ' · Top of the range last time: try a little more weight if it felt steady' : ''
    const reps = parseRx(s.rx).reps
    const detail = mine.length ? `Logged: ${setsLine(mine, s.shape)}`
      : easier && reps && (s.shape === 'weight-reps' || s.shape === 'reps') ? easierAim(reps, t?.w, 'easier', !!t?.assist)
      : t && (s.shape === 'weight-reps' || s.shape === 'reps') ? `Aim for ${fmtTarget(t, s.shape)}${up}`
      : last ? `Last time: ${last.sets.map((r) => fmtSet(r, last.log ?? s.shape)).filter(Boolean).join(', ')}` : ''
    return { s, detail, done: mine.length }
  })
}

/* ---------------- small pure helpers the Train screens share ---------------- */

/** "Romanian deadlift (dumbbell or barbell)" → "Romanian deadlift" */
export const bareName = (n: string) => n.replace(/\s*\(.*\)\s*$/, '')
/** The first sentence of a cue, for the line under the name. */
export const firstLine = (cue: string) => (cue.match(/^.*?[.!?](\s|$)/)?.[0] ?? cue).trim()

/** The library's kit filter (LIB_KIT's keys). */
export function fitsKit(x: Exercise, kit: Equipment | 'none' | null): boolean {
  if (!kit) return true
  if (kit === 'none') return x.equipment.length === 0 || x.equipment.every((q) => q === 'bodyweight' || q === 'mat')
  if (kit === 'machine') return x.equipment.some((q) => q === 'machine' || q === 'cable' || q === 'cardio-machine')
  return x.equipment.includes(kit)
}

export const inModality = (x: Exercise, m: Modality) => x.modality === m || !!x.also?.includes(m)
