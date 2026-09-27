import type { Equipment, Exercise, Experience, MovementPattern } from '@/core/types'

/**
 * Library coverage for the training engine (personalised-training-engine.md §4.2, and the §3.7
 * test 0 gate). A thin library can't make different plans, so before the engine claims to tailor
 * anything, every main movement pattern needs enough candidates for every kit profile at every
 * difficulty. Pure data checks: no React, no DOM.
 */

/** The slot patterns the generator fills (§3.3 step 5). Isolation and carries are optional extras. */
export const SLOT_PATTERNS: MovementPattern[] = [
  'squat', 'lunge', 'hinge', 'horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull', 'core',
]

export type KitProfile = 'none' | 'bands' | 'dumbbells' | 'gym'

/** What each profile has. Home profiles have no bench, but a household prop can stand in (§4.2). */
const HOME: Equipment[] = ['bodyweight', 'mat']
export const KIT_PROFILES: Record<KitProfile, Equipment[]> = {
  none: HOME,
  bands: [...HOME, 'band'],
  dumbbells: [...HOME, 'dumbbell'],
  gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'cardio-machine', 'bench', 'pull-up-bar', 'mat', 'yoga-props'],
}

/** §4.2: "at least 2 candidates" per pattern × kit profile × difficulty. */
export const COVERAGE_MIN = 2

const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced']

/** Whether someone with this kit can do it. Equipment lists alternatives, so any one will do. */
export function usableWith(e: Exercise, profile: KitProfile): boolean {
  const kit = KIT_PROFILES[profile]
  if (!e.equipment.length || e.equipment.some((q) => kit.includes(q))) return true
  // at home a chair, sofa or step does the bench's job when the entry says so
  return profile !== 'gym' && e.equipment.every((q) => q === 'bench') && !!e.props?.length
}

export interface CoverageCell { pattern: MovementPattern; kit: KitProfile; level: Experience; ids: string[] }

export function coverage(lib: Exercise[]): CoverageCell[] {
  const out: CoverageCell[] = []
  for (const pattern of SLOT_PATTERNS) for (const kit of Object.keys(KIT_PROFILES) as KitProfile[]) for (const level of LEVELS) {
    out.push({ pattern, kit, level, ids: lib.filter((e) => e.pattern === pattern && e.difficulty === level && usableWith(e, kit)).map((e) => e.id) })
  }
  return out
}

/** "vertical-push · none · beginner" */
export const cellKey = (c: Pick<CoverageCell, 'pattern' | 'kit' | 'level'>) => `${c.pattern} · ${c.kit} · ${c.level}`

/**
 * The §3.7 test 0 gate: green only when every cell has COVERAGE_MIN candidates. While it's red the
 * engine's "materially different plans" tests are skipped (not passed), and the generator falls
 * back to the nearest cell with a `default` Why.
 */
export function coverageGate(lib: Exercise[]): { ok: boolean; gaps: CoverageCell[] } {
  const gaps = coverage(lib).filter((c) => c.ids.length < COVERAGE_MIN)
  return { ok: gaps.length === 0, gaps }
}
