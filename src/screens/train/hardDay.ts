import type { Exercise, ExerciseTemplate } from '@/core/types'
import { SWAPS, type SwapId } from '@/core/data/workouts'
import { dayTypeOf, roughNightPlan, swapFor, type DayType, type ShorterKind } from '@/core/domain/dayOptions'
import { rirFor } from '@/core/domain/guided'

/**
 * Train's hard-day choices (wellbeing board B3, behind WELLBEING_ENABLED): three equal options,
 * As planned, Shorter and the day-matched swap, with nothing selected. Pure helpers and the copy
 * (deck B3 with fitness-workouts' accepted strings, and B3.17 from new-copy FINAL), kept apart
 * from the screens so the tests can read them without React.
 */
export const HARD_DAY_COPY = {
  /** B3.1, when sleep is one of today's low signals */
  roughNight: 'Rough night? Here are a few options for today. All of them count.',
  /** B3.1b */
  toughDay: 'Tough day? Here are a few options for today. All of them count.',
  planned: 'As planned',
  shorter: 'Shorter',
  swapKicker: 'Swap',
  /** B3.7 detail after the set count */
  easierEffort: 'easier effort',
  /** B3.9 */
  effort: "Shorter means fewer sets and an easier effort: stop each set with three or four reps to spare, at last time's weight or lighter.",
  /** B3.9c, a cardio day */
  effortCardio: 'Shorter means fewer minutes at an easy pace, one where you could chat in full sentences.',
  /** B3.10: a statement, never a button */
  rest: 'Resting today is fine too.',
  /** B3.14 */
  preview: 'Shorter today: fewer sets, three or four reps to spare on each, and no adding weight. Change it any time.',
  /** B3.17 (new-copy FINAL), only when showRoughNightNote */
  roughNote: 'After a rough night, the shorter version swaps running, jump rope and loaded single-leg moves for steadier ones, and keeps cardio at an easy, steady pace.',
  /** the folded row on an ordinary day */
  collapsed: 'Shorter or a gentler swap',
  /** Preview and ManualLog footers on an easier Shorter day */
  spareEasier: 'Stop each set with three or four reps to spare.',
} as const

/** The swap tile's title and detail (B3.8, fitness-workouts: "About 10 min · on a mat"). */
export function swapTile(id: SwapId): { title: string; detail: string } {
  const [title, sub] = SWAPS[id].title.split(' · ')
  if (id === 'walk') return { title, detail: '10–20 min' }
  if (sub) return { title, detail: sub[0].toUpperCase() + sub.slice(1) + ' · on a mat' }
  return { title, detail: 'About 10 min · on a mat' }
}

/** The day-matched swap for a workout's exercises as planned. */
export function swapForWorkout(ex: ExerciseTemplate[], byId: (id: string | undefined) => Exercise | undefined): { day: DayType; swap: SwapId } {
  const day = dayTypeOf(ex.map((e) => byId(e.id)))
  return { day, swap: swapFor(day) }
}

/**
 * The rough-night shorter version of a workout (wellbeing plan §7.5), on top of the person's own
 * swaps: each move shown today (after their swaps) that has a steadier entry swaps to it, and
 * interval moves with none are left out. A slot the person swapped themselves, or put back with
 * Undo (`keep`), stays as they chose. `empty` means every slot would be left out: the swap is
 * offered instead of Shorter.
 */
export function roughShorter(ex: ExerciseTemplate[], own: Record<number, string>, keep: number[], byId: (id: string | undefined) => Exercise | undefined): { swaps: Record<number, string>; leaveOut: number[]; empty: boolean } {
  const xs = ex.map((e, i) => byId(own[i] ?? e.id))
  const p = roughNightPlan(xs)
  const swaps = { ...own }
  for (const [k, id] of Object.entries(p.swaps)) { const i = +k; if (own[i] == null && !keep.includes(i)) swaps[i] = id }
  const leaveOut = p.leaveOut.filter((i) => own[i] == null && !keep.includes(i))
  return { swaps, leaveOut, empty: ex.length > 0 && leaveOut.length >= ex.length }
}

/** The choices on the Train card: Shorter isn't offered when the rough-night version would be empty. */
export function hardDayChoices(shorterEmpty: boolean): ('planned' | 'shorter' | 'swap')[] {
  return shorterEmpty ? ['planned', 'swap'] : ['planned', 'shorter', 'swap']
}

/** "10–12" from a range, "10" when it's one number. */
const span = (lo: number, hi: number) => (lo === hi ? String(lo) : `${lo}–${hi}`)

/**
 * The aim line on an easier Shorter day (B3.16): "Aim for 10–12 reps with 3 or 4 to spare, at
 * 40 kg or lighter", without the weight when there's no last time (or it was assisted).
 */
export function easierAim(reps: { lo: number; hi: number } | undefined, w?: string, kind: ShorterKind = 'easier', assist = false): string {
  const r = rirFor(kind)
  const n = reps ? `${span(reps.lo, reps.hi)} reps` : 'your reps'
  return `Aim for ${n} with ${r.lo} or ${r.hi} to spare${w && +w > 0 && !assist ? `, at ${w} kg or lighter` : ''}`
}

/** Every hard-day string the Train screens show, for the copy lint. */
export const HARD_DAY_STRINGS: string[] = [...Object.values(HARD_DAY_COPY), ...(['mobility', 'walk', 'mobility-lower', 'mobility-upper'] as SwapId[]).flatMap((id) => Object.values(swapTile(id))),
  easierAim({ lo: 10, hi: 12 }, '40'), easierAim({ lo: 10, hi: 12 })]
