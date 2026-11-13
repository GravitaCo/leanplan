/**
 * Profile's pure helpers, React-free so the web screens and the native app (apps/native) share
 * them instead of copying them. Moved unchanged from ProfileScreen.tsx, profile/PillarsSettings.tsx,
 * profile/AccountData.tsx and review/WeeklyReview.tsx, which import or re-export them from here.
 */
import type { Goal, MindPrefs, Pillar, Profile } from '@/core/types'
import { PILLARS } from '@/core/domain/checkin'
import { wellbeingRouted } from '@/core/domain/onboarding'
import { healthSyncPaused, latestConsent } from '@/data/consent'
import type { PersistedState } from '@/data/persistence'

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose-fat', label: 'Lose fat' },
  { value: 'maintain', label: 'Keep it steady' },
  { value: 'build-muscle', label: 'Build muscle' },
  { value: 'increase-strength', label: 'Increase strength' },
  { value: 'increase-endurance', label: 'Improve endurance' },
  { value: 'feel-better', label: 'Feel better and move more' },
]
export const GOAL_TARGET_LABEL: Record<Goal, string> = {
  'lose-fat': 'Fat loss', maintain: 'Steady', 'build-muscle': 'Muscle gain', 'increase-strength': 'Strength', 'increase-endurance': 'Endurance', 'feel-better': 'Feel better',
}
export function directionLabel(pct: number): string {
  if (pct < 0) return `${-pct}% below maintenance`
  if (pct > 0) return `${pct}% above maintenance`
  return 'at maintenance'
}

/** Someone the at-risk route (B1.16) is for: Gentle display on, or wellbeing routing from onboarding. */
export const atRiskRoute = (p: Pick<Profile, 'gentle' | 'outcomes'>): boolean => !!p.gentle || wellbeingRouted(p.outcomes?.wellbeing)

/** The pillars still on, in board order. Absent `off` means all on. */
export const pillarsOn = (m: MindPrefs | undefined): Pillar[] => PILLARS.filter((p) => !m?.off?.includes(p))

/** `off` after flipping one pillar; null (the key removed) when all are on again. */
export function offAfter(m: MindPrefs | undefined, p: Pillar): Pillar[] | null {
  const off = new Set(m?.off ?? [])
  if (off.has(p)) off.delete(p); else off.add(p)
  const next = PILLARS.filter((x) => off.has(x))
  return next.length ? next : null
}

/** Review days, Monday first: [day number, initial, name]. */
export const DAYS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]
export const dayName = (d: number) => DAYS.find((x) => x[0] === d)![2]

export type HealthStatus = 'on' | 'paused' | 'off' | 'unasked'
/** Health data's state for Profile's row: the latest health record, else paused or not asked. */
export function healthStatusOf(data: PersistedState): HealthStatus {
  const r = latestConsent(data, 'health')
  return r ? (r.granted ? 'on' : 'off') : healthSyncPaused(data) ? 'paused' : 'unasked'
}
export const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = { on: 'On', paused: 'Paused', off: 'Off', unasked: 'Not asked yet' }
