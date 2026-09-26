import type { ExerciseDemo, ExerciseMedia } from '@/core/types'
import { demoPrefOf, pickDemo } from '@/core/domain/demo'
import { useStore } from '@/store/store'

/** The clip this user sees for an exercise, following their "Exercise demos" choice. */
export function useDemo(video: ExerciseDemo | undefined): ExerciseMedia | undefined {
  const pref = useStore((s) => demoPrefOf(s.data.profile))
  return pickDemo(video, pref)
}
