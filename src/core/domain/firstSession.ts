import type { DayLog, Equipment, SetFeel, TrainingPrefs } from '@/core/types'
import { KIT_PROFILES } from './libraryCoverage'
import { alternativesFor } from './library'
import { sessionsOf } from './sessions'
import { EXERCISE_BY_ID } from '@/core/data/exercises'

/**
 * First-session moments (Design canvas row Onboarding 5): "Find your weight" and the thumbs-down
 * swap. Kept apart from wizard.ts so the guided player and the store don't pull the training
 * engine into the main bundle.
 */

/**
 * For "Find your weight" (engine calibrationTarget): how many earlier days logged working sets of
 * this exercise, and how the last working set felt on the most recent of them.
 */
export function exposureOf(days: Record<string, DayLog> | undefined, before: string, exId: string): { n: number; last?: { w: string; feel?: SetFeel } } {
  let n = 0
  let lastDay = ''
  let last: { w: string; feel?: SetFeel } | undefined
  for (const [d, day] of Object.entries(days || {})) {
    if (d >= before) continue
    for (const s of sessionsOf(day, d)) for (const e of s.ex || []) {
      if (e.exId !== exId) continue
      const work = (e.sets || []).filter((x) => !x.warmup && (x.reps || x.w))
      if (!work.length) continue
      n++
      if (d >= lastDay) { lastDay = d; const x = work[work.length - 1]; last = { w: x.w, ...(x.feel ? { feel: x.feel } : {}) } }
    }
  }
  return { n, ...(last ? { last } : {}) }
}


/** The kit a person has, as the engine reads it: bodyweight, a mat at home or the gym, what's ticked, the gym's own. */
export function kitOf(t: TrainingPrefs | undefined): Set<Equipment> {
  const kit = new Set<Equipment>(['bodyweight'])
  const place = t?.place
  if (place?.includes('gym')) KIT_PROFILES.gym.forEach((q) => kit.add(q))
  if (!place || place.includes('home') || place.includes('gym')) kit.add('mat')
  for (const q of t?.equipment ?? []) kit.add(q)
  return kit
}

/**
 * What replaces a thumbed-down exercise: the first like-for-like alternative (same pattern and
 * main muscle, gentler first) the person has the kit for, that isn't disliked or already in the
 * workout. Null when there's nothing suitable: the exercise then stays, and only the dislike is kept.
 */
export function replacementFor(exId: string, t: TrainingPrefs | undefined, inWorkout: string[]): string | null {
  const e = EXERCISE_BY_ID[exId]
  if (!e) return null
  const kit = kitOf(t)
  const disliked = new Set([...(t?.exPrefs?.disliked ?? []), exId])
  const alt = alternativesFor(e)
  const pool = [...alt.similar, ...(alt.easier ? [alt.easier] : [])]
  const ok = pool.find((x) => !disliked.has(x.id) && !inWorkout.includes(x.id) && (!x.equipment.length || x.equipment.some((q) => kit.has(q))))
  return ok?.id ?? null
}
