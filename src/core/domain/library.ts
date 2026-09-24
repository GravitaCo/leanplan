import type { DayLog, Exercise, LoggedExercise, LogShape, SetEntry } from '@/core/types'
import { EXERCISES, EXERCISE_BY_ID } from '@/core/data/exercises'
import { sessionsOf } from './sessions'

/**
 * The exercise library in use (plan §2.1, P3): swaps that keep the slot, easier and harder steps on
 * a progression chain, and "last time" that follows an exercise across workouts.
 */

const RESIST = ['strength', 'calisthenics']
const LEVEL = { beginner: 0, intermediate: 1, advanced: 2 } as const

export function exById(id: string | undefined): Exercise | undefined {
  return id ? EXERCISE_BY_ID[id] : undefined
}

/** One step easier or harder on the same progression chain (the first entry at that step). */
export function stepOf(e: Exercise, dir: -1 | 1): Exercise | undefined {
  const p = e.progression
  if (!p) return undefined
  return EXERCISES.find((x) => x.progression?.chain === p.chain && x.progression.step === p.step + dir)
}

export interface Alternatives {
  easier?: Exercise
  harder?: Exercise
  /** same slot: same movement pattern and main muscle for resistance work, a shared target otherwise */
  similar: Exercise[]
}

/**
 * Other ways to fill the same slot. It only ever swaps like for like; the gentler alternative (if
 * the entry names one) comes first, then easier before harder.
 */
export function alternativesFor(e: Exercise): Alternatives {
  const easier = stepOf(e, -1)
  const harder = stepOf(e, 1)
  const skip = new Set([e.id, easier?.id, harder?.id])
  const resist = RESIST.includes(e.modality)
  const similar = EXERCISES.filter((x) => {
    if (skip.has(x.id)) return false
    if (resist) return RESIST.includes(x.modality) && x.pattern === e.pattern && x.primary === e.primary
    if (RESIST.includes(x.modality) || x.modality === 'cardio' || e.modality === 'cardio') return e.modality === 'cardio' && x.modality === 'cardio'
    return !!x.targets?.some((t) => e.targets?.includes(t))
  }).sort((a, b) => Number(b.id === e.gentler) - Number(a.id === e.gentler) || LEVEL[a.difficulty] - LEVEL[b.difficulty] || a.n.localeCompare(b.n))
  return { easier, harder, similar: similar.slice(0, 8) }
}

/** Whether a set has anything in it for this shape (blank rows are not saved). */
export function setHasData(s: SetEntry, shape: LogShape): boolean {
  if (shape === 'hold') return !!(s.sec || s.reps)
  if (shape === 'check') return !!s.done
  if (shape === 'duration') return !!(s.mins || s.km)
  return s.w !== '' || s.reps !== ''
}

/**
 * The most recent earlier day this exercise was logged with sets, from any workout: by library id,
 * or by name for logs from before ids existed.
 */
export function lastLogged(days: Record<string, DayLog>, before: string, exId: string | undefined, name: string): LoggedExercise | null {
  const ds = Object.keys(days).filter((d) => d < before).sort().reverse()
  for (const d of ds) {
    for (const s of sessionsOf(days[d], d)) {
      const hit = s.ex?.find((x) => x.sets?.length && ((exId && x.exId === exId) || (!x.exId && x.name === name)))
      if (hit) return hit
    }
  }
  return null
}

/** A set in words, e.g. "40 kg × 8", "8 reps (assisted 20 kg)", "30 sec", "Done". */
export function fmtSet(s: SetEntry, shape: LogShape): string {
  if (shape === 'hold') { const v = s.sec || s.reps; return v ? `${v} sec` : '' }
  if (shape === 'check') return s.done ? 'Done' : ''
  if (shape === 'duration') return [s.mins && `${s.mins} min`, s.km && `${s.km} km`].filter(Boolean).join(', ')
  if (shape === 'rounds') return s.reps ? `${s.reps} rounds` : ''
  const load = s.band ? `${s.band} band` : s.w ? `${s.w} kg` : ''
  if (shape === 'reps') return s.reps ? `${s.reps} reps${load ? ` (${s.assist ? 'assisted ' : '+'}${load})` : ''}` : ''
  return (s.w ? s.w + ' kg' : '') + (s.w && s.reps ? ' × ' : '') + (s.reps || '')
}

/**
 * The hold a prescription asks for, in seconds: "3 × 20–40 sec" → 20 to 40, "45 sec each side" → 45.
 * Null when it isn't timed in seconds ("5 slow breaths").
 */
export function holdTarget(rx: string | undefined): { lo: number; hi: number } | null {
  const m = rx?.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*(sec|s\b|min)/)
  if (!m) return null
  const k = m[3] === 'min' ? 60 : 1
  const lo = parseInt(m[1]) * k
  return { lo, hi: (m[2] ? parseInt(m[2]) : parseInt(m[1])) * k }
}

/**
 * Where a running hold timer is. Per-side holds with a target run both sides in one go: the first
 * side to the target, then "Switch sides" and the count restarts for the second. `logSec` is what
 * the set records when stopped now: one number means "each side", so it is the shorter side.
 */
export function holdAt(elapsedSec: number, target: { lo: number; hi: number } | null, perSide = false) {
  const t = Math.max(0, Math.floor(elapsedSec))
  const goal = target?.lo ?? 0
  const split = perSide && goal > 0
  const side: 1 | 2 = split && t >= goal ? 2 : 1
  const sec = side === 2 ? t - goal : t
  return {
    side,
    /** seconds on the current side */
    sec,
    /** the current side has reached the target */
    reached: goal > 0 && sec >= goal,
    /** the moment to swap sides (the first few seconds of side two) */
    switchNow: side === 2 && sec < 4,
    logSec: side === 2 ? sec : t,
  }
}
