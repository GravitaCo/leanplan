import type { DayLog, Effort, Session, Workout, WorkoutType } from '@/core/types'
import { CARDIO_MET } from '@/core/data/constants'
import { DEFAULT_MINS, MODALITY_MET } from '@/core/data/modalities'
import { WORKOUTS, LIFTS } from '@/core/data/workouts'

/**
 * Built-in routines are stored as `routineId: 'builtin-' + type` ('builtin-Legs', 'builtin-Cardio').
 * The stored string never changes (synced data depends on it); these are the one place that reads
 * or writes it.
 */
const BUILTIN = 'builtin-'
export const builtinId = (type: string): string => BUILTIN + type
/** The built-in type a session came from ('Legs', 'Cardio'…): its routineId with the 'builtin-' tag removed. */
export const builtinType = (x: Pick<Session, 'routineId'>): string => (x.routineId || '').replace(BUILTIN, '')
export const isBuiltin = (x: Pick<Session, 'routineId'>): boolean => (x.routineId || '').startsWith(BUILTIN)
export const isBuiltinLift = (x: Pick<Session, 'routineId'>): boolean => LIFTS.includes(builtinType(x) as WorkoutType)

/**
 * Sessions: a day can hold several (workout plan §2.5). Days logged before this change only
 * have the single `workout`; they are read through `fromLegacy` without being rewritten, so no
 * old day changes or re-uploads on update. Every save also writes a legacy mirror into
 * `workout` so older installs still show something sensible.
 */

/** A session for a day logged with the old single `workout` (stable id, so repeat reads agree). */
export function fromLegacy(wk: Workout, date: string): Session {
  if (wk.type === 'Cardio') {
    const typed = parseFloat(wk.mins || '')
    const mobility = wk.cardioType === 'Mobility'
    return {
      id: 'legacy-' + date, modality: mobility ? 'mobility' : 'cardio',
      title: wk.cardioType || 'Cardio', routineId: builtinId('Cardio'),
      // blank minutes on the Cardio card always meant 25; keep that for Mobility too
      mins: Number.isFinite(typed) ? typed : mobility ? 25 : undefined,
      cardio: { key: wk.cardioType || '' }, option: wk.option,
    }
  }
  return {
    id: 'legacy-' + date, modality: 'strength', title: WORKOUTS[wk.type]?.title || wk.type,
    routineId: builtinId(wk.type), ex: wk.ex, option: wk.option,
  }
}

/**
 * The day's sessions, in order. `sessions` wins when it is an array; otherwise the legacy
 * `workout` becomes one session. If an older install wrote a `workout` after us (no `_mirror`
 * flag), it is folded in rather than lost.
 */
export function sessionsOf(day: DayLog | undefined, date: string): Session[] {
  if (!day) return []
  const wk = day.workout
  if (!Array.isArray(day.sessions)) return wk?.type ? [fromLegacy(wk, date)] : []
  const list = day.sessions.filter((x) => x && typeof x.id === 'string' && typeof x.modality === 'string')
  if (!wk?.type || wk._mirror) return list
  // an older install wrote this after us: it's the newer edit of the same card, so it replaces
  // that card's session (keeping its id); a different card is added, never counted twice
  const incoming = fromLegacy(wk, date)
  const i = list.findIndex((x) => x.routineId === incoming.routineId)
  if (i >= 0) return list.map((x, j) => (j === i ? { ...incoming, id: x.id, at: x.at } : x))
  return [...list, { ...incoming, id: 'legacy-extra-' + date }]
}

/** Which session the mirror is written from: the first built-in lift, else the first (-1 when none). */
export function mirroredIndex(sessions: Session[]): number {
  const i = sessions.findIndex(isBuiltinLift)
  return i >= 0 ? i : sessions.length ? 0 : -1
}

/**
 * The single-workout copy older installs read: the first built-in lift as `{ type, ex }`,
 * otherwise the first session as cardio (older installs only know the four types), or null.
 */
export function mirrorOf(sessions: Session[]): Workout | null {
  const lift = sessions.find(isBuiltinLift)
  if (lift) return { type: builtinType(lift) as WorkoutType, ex: lift.ex || [], ...(lift.option ? { option: lift.option } : {}), _mirror: true }
  const first = sessions[0]
  if (!first) return null
  const key = first.cardio?.key && CARDIO_MET[first.cardio.key] != null ? first.cardio.key : first.modality === 'mobility' ? 'Mobility' : 'Other'
  return { type: 'Cardio', cardioType: key, mins: first.mins != null ? String(first.mins) : '', ...(first.option ? { option: first.option } : {}), _mirror: true }
}

const level = (e?: Effort) => (e === 'easy' ? 'light' : e === 'hard' || e === 'very-hard' ? 'vigorous' : 'moderate')

/** MET and minutes for a session (Compendium values; see modalities.ts and constants.ts). */
export function sessionMetMins(x: Session): { met: number; mins: number } {
  // capped at 4 hours so a typo ("300" for 30) can't add a day's worth (a judgement call)
  const mins = x.mins != null && Number.isFinite(x.mins) ? Math.min(240, Math.max(0, x.mins)) : DEFAULT_MINS[x.modality] ?? 30
  if (x.modality === 'cardio') return { met: CARDIO_MET[x.cardio?.key || ''] ?? CARDIO_MET.Other, mins }
  const m = MODALITY_MET[x.modality]
  return { met: m ? m[level(x.effort)] : CARDIO_MET.Other, mins }
}

/** Gross estimate (MET × kg × hours). */
export function sessionBurn(x: Session, kg: number | null): number {
  const { met, mins } = sessionMetMins(x)
  return Math.round(met * (kg || 75) * (mins / 60))
}

/** Net estimate (the resting 1 MET removed); only used for sedentary users (plan D5a). */
export function sessionNetBurn(x: Session, kg: number | null): number {
  const { met, mins } = sessionMetMins(x)
  return Math.round(Math.max(met - 1, 0) * (kg || 75) * (mins / 60))
}

/** Counts toward the activity-level suggestion: 20+ minutes at 3.0+ MET (plan P1.5). */
export function isTrainingSess(x: Session): boolean {
  const { met, mins } = sessionMetMins(x)
  return met >= 3.0 && mins >= 20
}

/**
 * A hard session for the load guardrails (plan §3.3, a judgement call): weights and bodyweight
 * work, anything logged as Hard or Very hard, and cardio at vigorous intensity (6+ MET, the 2018
 * Physical Activity Guidelines for Americans threshold) for over 20 minutes. Walks, mobility,
 * yoga and pilates are light unless logged as hard. Only the 6.0 MET threshold is sourced;
 * "over 20 minutes" is a judgement call.
 */
export function isHardSession(x: Session): boolean {
  if (x.effort === 'hard' || x.effort === 'very-hard') return true
  if (x.modality === 'strength' || x.modality === 'calisthenics') return x.effort !== 'easy'
  if (x.modality === 'cardio') { const { met, mins } = sessionMetMins(x); return met >= 6 && mins > 20 }
  return false
}

/**
 * Fields a re-save of a built-in session carries over from the earlier save when the caller
 * doesn't set them. An explicit null effort or an explicitly empty note clears that field
 * (the finish sheet), so a note can be removed.
 */
export function keptOnSave(extra?: { effort?: Effort | null; note?: string }): ('effort' | 'note' | 'mins')[] {
  return (['effort', 'note', 'mins'] as const).filter((k) => !(k === 'effort' && extra?.effort === null) && !(k === 'note' && extra?.note === ''))
}
