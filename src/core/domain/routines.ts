import type { Exercise, ExerciseTemplate, Modality, Profile, Routine, RoutineEffort, RoutineSlot, WorkoutTemplate, WorkoutType } from '@/core/types'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { WORKOUTS } from '@/core/data/workouts'
import { CARDIO_MET } from '@/core/data/constants'
import { holdTarget } from './library'

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
    if (x) ex.push({ id: x.id, n: x.n, t: s.rx || x.defaultRx || '', cue: x.cue, video: x.video })
  }
  return { title: r.name, ex }
}

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

/** About how long the whole workout takes, rounded to a whole minute (at least one). */
export function estMins(slots: RoutineSlot[]): number {
  return Math.max(1, Math.round(slots.reduce((a, s) => a + slotMins(s), 0)))
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
    out.push('Bigger lifts usually go first, while you are fresh.')
  }
  const lastResist = xs.map(resist).lastIndexOf(true)
  if (xs.some((x, i) => i < lastResist && !!x && (x.modality === 'yoga' || x.modality === 'pilates') && x.log === 'hold')) {
    out.push('Longer stretches and holds usually go at the end. A few moving warm-up exercises suit the start.')
  }
  const seen = new Set<string>()
  for (const s of slots) {
    if (seen.has(s.exId)) { out.push(`${exOf(s)?.n ?? 'An exercise'} is in here twice.`); break }
    seen.add(s.exId)
  }
  const m = estMins(slots)
  if (slots.length && m > 90) out.push(`This one is long, about ${m} minutes. That is fine if it suits you; splitting it across two days is another option.`)
  return out
}
