import type { DemoKind, ExerciseDemo, ExerciseMedia, Profile } from '@/core/types'

/** Who the user sees in demos: their own choice, else following the energy-formula `sex`. */
export function demoPrefOf(p: Pick<Profile, 'demos' | 'sex'>): DemoKind {
  return p.demos ?? (p.sex === 'F' ? 'f' : 'm')
}

/** The clip to show: the chosen demonstrator's, else the other one (a demo beats no demo). */
export function pickDemo(video: ExerciseDemo | undefined, pref: DemoKind): ExerciseMedia | undefined {
  if (!video) return undefined
  return video[pref] ?? video[pref === 'f' ? 'm' : 'f']
}

/** Every clip an exercise has, for checks that must cover both demonstrators. */
export function demoClips(video: ExerciseDemo | undefined): ExerciseMedia[] {
  return video ? (['f', 'm'] as const).flatMap((k) => (video[k] ? [video[k]] : [])) : []
}

/** Whether any exercise has a clip with this demonstrator yet (Profile says so when not). */
export function anyDemoWith(videos: (ExerciseDemo | undefined)[], kind: DemoKind): boolean {
  return videos.some((v) => !!v?.[kind])
}
