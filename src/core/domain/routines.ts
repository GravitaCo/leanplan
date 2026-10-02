import type { Equipment, Exercise, ExerciseTemplate, Modality, Profile, Routine, RoutineEffort, RoutineSlot, TrainingPrefs, WorkoutTemplate, WorkoutType } from '@/core/types'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { WORKOUTS } from '@/core/data/workouts'
import { TALI_WORKOUTS } from '@/core/data/taliWorkouts'
import { builtinId, isBuiltin } from './sessions'
import { shortTitle } from './week'
import { CARDIO_MET } from '@/core/data/constants'
import { holdTarget } from './library'
import { buildWarmup, PLAN_WARMUP_MINUTES, RAMP_MINUTES, warmupKindOf, warmupMinutesFor, type WarmupBlock } from './warmup'
import { KIT_PROFILES } from './libraryCoverage'

/**
 * The user's own workouts (plan §2.3, P4): what a saved workout shows on the Train screen, how
 * long it is likely to take, whether it counts as hard, and gentle notes for the builder.
 */

/**
 * Whether this person can create and edit workouts. Everyone can today; it is the one place a
 * future tier flag would flip (plan §4.3a). Logging, swaps and built-ins never sit behind it.
 */
export function canBuild(_p?: Profile): boolean {
  return true
}

/** A built-in lift card as a starting point for "Customise" (its exercises and prescriptions). */
export function builtinSlots(type: WorkoutType): RoutineSlot[] {
  return (WORKOUTS[type]?.ex ?? []).filter((e) => e.id).map((e) => ({ exId: e.id!, rx: e.t }))
}

export const slotsOf = (r: Pick<Routine, 'blocks'>): RoutineSlot[] => r.blocks.flatMap((b) => b.slots)

/** The exercise a slot names; a slot whose id isn't in the library (a newer app's) is skipped. */
const exOf = (s: RoutineSlot): Exercise | undefined => EXERCISE_BY_ID[s.exId]

/** A saved workout as a card list for the Train screen, in the same shape as the built-ins. */
export function routineTemplate(r: Routine): WorkoutTemplate {
  const ex: ExerciseTemplate[] = []
  for (const s of slotsOf(r)) {
    const x = exOf(s)
    if (x) ex.push({ id: x.id, n: x.n, t: s.rx || x.defaultRx || '', cue: x.cue, video: x.video, ...(s.restSec != null ? { restSec: s.restSec } : {}) })
  }
  return { title: r.name, ex }
}

/**
 * Sets and reps as typed ("3x10", "3 X 10", "3*10", "3-4 × 8") in the app's own notation
 * ("3 × 10", "3–4 × 8"), so the time estimate and "Shorter" read it the same way as the built-ins.
 */
export function normaliseRx(rx: string | undefined): string | undefined {
  const t = (rx || '').trim().replace(/\s+/g, ' ')
  if (!t) return undefined
  return t
    .replace(/(\d)\s*[xX*×]\s*(?=\d)/g, '$1 × ')
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, '$1–')
}

/** A time estimate for display: whole minutes up to 10, then to the nearest 5 (never shown as exact). */
export function aboutMins(n: number): number {
  return n <= 10 ? Math.max(1, Math.round(n)) : Math.round(n / 5) * 5
}

/** "about 45 min" for a row, or nothing without an estimate. */
export const aboutLine = (m: number | null | undefined): string => (m ? `about ${aboutMins(m)} min` : '')

const avg = (a: string, b?: string) => (b ? (parseInt(a) + parseInt(b)) / 2 : parseInt(a))

/** Sets in a prescription: "3 × 10–12" → 3, "2–3 × 12" → 2.5; anything else is one. */
function setsIn(rx: string): number {
  const m = rx.match(/^\s*(\d+)(?:\s*–\s*(\d+))?\s*×/)
  return m ? avg(m[1], m[2]) : 1
}

/**
 * About how long one slot takes, in minutes (plan §2.9, all judgement calls, unvalidated): about
 * 2.5 min per resistance set including rest, hold seconds + 20 s per hold set (both sides when per
 * side), about 1.5 min per round of a flow, the listed minutes for a timed piece, a minute for a
 * one-off move.
 */
export function slotMins(s: RoutineSlot): number {
  const x = exOf(s)
  if (!x) return 0
  const rx = s.rx || x.defaultRx || ''
  const sets = setsIn(rx)
  switch (x.log) {
    case 'weight-reps':
    case 'reps':
      return sets * 2.5
    case 'hold': {
      const t = holdTarget(rx)
      const sec = t ? (t.lo + t.hi) / 2 : 40
      return (sets * (sec * (x.perSide ? 2 : 1) + 20)) / 60
    }
    case 'duration': {
      const m = rx.match(/(\d+)(?:\s*–\s*(\d+))?\s*min/)
      return m ? avg(m[1], m[2]) : 20
    }
    case 'rounds': {
      const m = rx.match(/(\d+)(?:\s*–\s*(\d+))?\s*rounds?/)
      return (m ? avg(m[1], m[2]) : sets) * 1.5
    }
    default:
      return 1
  }
}

/**
 * About how long the whole workout takes, rounded to a whole minute (at least one): the warm-up
 * block every session opens with (the ready-made 6 minutes unless given), about 90 s of lighter
 * sets when there's a weighted lift, then the slots.
 */
export function estMins(slots: RoutineSlot[], warmMins: number = PLAN_WARMUP_MINUTES): number {
  if (!slots.length) return 1
  const ramp = slots.some((s) => exOf(s)?.log === 'weight-reps') ? RAMP_MINUTES : 0
  return Math.max(1, Math.round(warmMins + ramp + slots.reduce((a, s) => a + slotMins(s), 0)))
}

/** The headline kind: the one with the most minutes (the first listed wins a tie). */
export function headlineModality(slots: RoutineSlot[]): Modality {
  const mins = new Map<Modality, number>()
  for (const s of slots) {
    const x = exOf(s)
    if (x) mins.set(x.modality, (mins.get(x.modality) ?? 0) + slotMins(s))
  }
  let best: Modality = 'strength', top = -1
  for (const [m, v] of mins) if (v > top) { best = m; top = v }
  return best
}

/**
 * Hard or light, derived at save (plan §3.3, a judgement call the user can change): any
 * resistance work (weights or bodyweight), intervals, a hard pilates move, or vigorous cardio
 * (6+ MET, the same line the load note uses in sessions.ts) for over 20 minutes is hard; walks,
 * mobility, yoga and beginner pilates are light.
 */
export function deriveEffort(slots: RoutineSlot[]): RoutineEffort {
  for (const s of slots) {
    const x = exOf(s)
    if (!x) continue
    if (x.modality === 'strength' || x.modality === 'calisthenics') return 'hard'
    if (x.modality === 'pilates' && x.difficulty === 'advanced') return 'hard'
    if (x.modality === 'cardio') {
      if (x.cardioVariation === 'hiit') return 'hard'
      const met = x.cardioKey ? CARDIO_MET[x.cardioKey] : undefined
      if (met != null && met >= 6 && slotMins(s) > 20) return 'hard'
    }
  }
  return 'light'
}

/** Gentle notes for the builder. They never stop a save (plan §2.3). */
export function builderNotes(slots: RoutineSlot[]): string[] {
  const out: string[] = []
  const xs = slots.map(exOf)
  const resist = (x?: Exercise) => !!x && (x.modality === 'strength' || x.modality === 'calisthenics')
  const firstBig = xs.findIndex((x) => resist(x) && x!.pattern !== 'isolation' && x!.pattern !== 'core')
  if (xs.some((x, i) => resist(x) && x!.pattern === 'isolation' && firstBig > i)) {
    out.push("Bigger lifts usually go first, while you're fresh.")
  }
  const lastResist = xs.map(resist).lastIndexOf(true)
  if (xs.some((x, i) => i < lastResist && !!x && (x.modality === 'yoga' || x.modality === 'pilates') && x.log === 'hold')) {
    out.push('Long stretches and holds usually suit the end, and a few moving warm-ups suit the start.')
  }
  const seen = new Set<string>()
  for (const s of slots) {
    if (seen.has(s.exId)) { out.push(`${exOf(s)?.n ?? 'An exercise'} is in here twice. Keep it if you meant to.`); break }
    seen.add(s.exId)
  }
  // a hard session estimated at 75+ minutes (warm-up included) runs longer in practice; a
  // 90-minute yoga class is ordinary (both judgement calls, unvalidated)
  const m = estMins(slots)
  if (slots.length && m > (deriveEffort(slots) === 'hard' ? 75 : 90)) {
    out.push(`This one runs about ${aboutMins(m)} minutes. That's fine if it suits you, or you could split it into two shorter workouts.`)
  }
  return out
}

/**
 * A workout wherever the app opens one (Train, Plan): a built-in's type ('Legs', 'Push', 'Pull',
 * 'Cardio') or the id of one of the user's own workouts.
 */
export type WorkoutKey = string

// own property only: a synced key like "constructor" is never taken for a built-in
export const isBuiltinKey = (key: WorkoutKey): boolean => typeof key === 'string' && Object.prototype.hasOwnProperty.call(WORKOUTS, key)

/** Tali's own workouts for its plans, with their time estimates worked out like the user's. */
const TALI: Record<string, Routine> = Object.fromEntries(TALI_WORKOUTS.map((r) => [r.id, { ...r, estMins: estMins(slotsOf(r)) }]))

/** One of Tali's plan workouts (Full body A, Strength & Balance A…): built in, never edited. */
export const isTaliKey = (key: WorkoutKey): boolean => typeof key === 'string' && Object.prototype.hasOwnProperty.call(TALI, key)
export const taliWorkouts = (): Routine[] => Object.values(TALI)

/** The workout a key names beyond the four built-in cards: the user's own (archived ones too, so a logged day still opens), or one of Tali's plan workouts. */
export function routineFor(key: WorkoutKey, routines: Routine[] | undefined): Routine | undefined {
  if (isBuiltinKey(key)) return undefined
  return (routines || []).find((r) => r.id === key) ?? (isTaliKey(key) ? TALI[key] : undefined)
}

/** The cards for a key; null when it names nothing this device knows. */
export function templateFor(key: WorkoutKey, routines: Routine[] | undefined): WorkoutTemplate | null {
  if (isBuiltinKey(key)) return WORKOUTS[key]
  const r = routineFor(key, routines)
  return r ? routineTemplate(r) : null
}

/** The `routineId` its sessions carry. */
export const keyRoutineId = (key: WorkoutKey): string => (isBuiltinKey(key) ? builtinId(key) : key)

/** Its short name: "Push", or the name the person gave it. */
export function keyTitle(key: WorkoutKey, routines: Routine[] | undefined): string {
  return isBuiltinKey(key) ? shortTitle(key) : routineFor(key, routines)?.name ?? 'Workout'
}

/** The workout a logged session came from, when this device still has it (a swap is not one). */
export function keyOfSession(x: { routineId?: string; option?: string }, routines: Routine[] | undefined): WorkoutKey | null {
  if (x.option === 'swap' || !x.routineId) return null
  if (isBuiltin(x)) { const t = x.routineId.replace(builtinId(''), ''); return isBuiltinKey(t) ? t : null }
  return routineFor(x.routineId, routines) ? x.routineId : null
}

/** The first demo clip in a workout, for its thumbnail. */
export function keyVideo(key: WorkoutKey, routines: Routine[] | undefined) {
  return templateFor(key, routines)?.ex.find((e) => e.video)?.video
}

/** The kit a person has, for the warm-up's swaps: what they ticked, plus a gym's own. */
export function kitOf(t: TrainingPrefs | undefined): Equipment[] {
  return [...(t?.equipment ?? []), ...(t?.place?.includes('gym') ? KIT_PROFILES.gym : [])]
}

/**
 * A workout the engine generated for the person: one of their own stored routines marked
 * 'recommended' (the engine's are the only ones it writes that way; their ids are seeded uuids, so
 * the stored row is the mark). Tali's plan workouts are 'recommended' too but are built-ins, never
 * stored, and Push/Pull/Legs aren't routines at all.
 */
export function isEngineKey(key: WorkoutKey, routines: Routine[] | undefined): boolean {
  if (isBuiltinKey(key) || isTaliKey(key)) return false
  return (routines || []).some((r) => r.id === key && r.source === 'recommended')
}

/** A workout's warm-up minutes: the engine's follow the session length, everything else gets 6. */
export const warmupMinsForKey = (key: WorkoutKey, routines: Routine[] | undefined, training: TrainingPrefs | undefined): number =>
  isEngineKey(key, routines) ? warmupMinutesFor(training?.sessionRange, training?.minutesPerSession) : PLAN_WARMUP_MINUTES

/**
 * The warm-up block a workout opens with (s-ob8 point 4): a generated workout's follows the
 * person's session length, the same minutes onboarding promised (warmupMinutesFor); the
 * Push/Pull/Legs cards, Tali's plan workouts and the person's own get the ready-made 6. Kit from
 * the person's answers, plus anything the workout itself uses.
 */
export function warmupForKey(key: WorkoutKey, routines: Routine[] | undefined, training: TrainingPrefs | undefined): WarmupBlock | null {
  const ids = isBuiltinKey(key) ? WORKOUTS[key].ex.map((e) => e.id).filter((x): x is string => !!x) : (() => { const r = routineFor(key, routines); return r ? slotsOf(r).map((x) => x.exId) : null })()
  if (!ids) return null
  return warmupForSlots(ids, warmupMinsForKey(key, routines, training), training)
}

/**
 * A routine's minutes for a list row, from its slots and its own warm-up (null with no slots).
 * Worked out when shown, never read from the stored estMins, which older saves wrote without the
 * warm-up.
 */
export function routineEstMins(r: Routine, routines: Routine[] | undefined, training: TrainingPrefs | undefined): number | null {
  const slots = slotsOf(r)
  if (!slots.length) return null
  return estMins(slots, warmupMinsForKey(r.id, routines, training))
}

/** The block for a session's exercises at these minutes (the summary's day sheet uses it too). */
export function warmupForSlots(ids: readonly string[], mins: number, training: TrainingPrefs | undefined): WarmupBlock {
  const kit = new Set<Equipment>(kitOf(training))
  for (const id of ids) for (const q of EXERCISE_BY_ID[id]?.equipment ?? []) kit.add(q)
  return buildWarmup({ ...warmupKindOf(ids), mins, kit: [...kit], avoid: ids })
}
