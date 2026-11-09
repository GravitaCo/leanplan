/**
 * The spike's one HealthKit read (native-app-plan §3.4, phase 0): last night's sleep and today's
 * walking, read only, on the phone. Nothing here is saved or synced: the spike shows it and forgets
 * it, so no new data is collected (compliance signs off the import before phase 2 stores any).
 *
 * The specialists' rules are kept even here: sleep as a band with a wake time, never stages,
 * minutes or a score (mental-performance); steps and walks counted once, never active energy
 * (nutrition-accuracy).
 */
import { Platform } from 'react-native'
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryCategorySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  CategoryValueSleepAnalysis,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit'
import { bandOfMinutes, bandWords } from '@/core/domain/sleep'
import type { SleepBand } from '@/core/types'

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis' as const
const STEPS = 'HKQuantityTypeIdentifierStepCount' as const

export const healthAvailable = (): boolean => Platform.OS === 'ios' && isHealthDataAvailable()

/** Asks once for read access to sleep, steps and workouts (iOS shows its own sheet). */
export async function askHealth(): Promise<boolean> {
  return requestAuthorization({ toRead: [SLEEP, STEPS, 'HKWorkoutTypeIdentifier'] })
}

export interface NightRead {
  band: SleepBand
  /** "about 6 to 7 hours" */
  words: string
  /** "07:10", the end of the last asleep stretch */
  wakeAt: string
  /** how many samples (diagnostics only) */
  samples: number
}

const ASLEEP = new Set<number>([
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
])

/** Last night: asleep stretches from 18:00 yesterday to 14:00 today, overlaps merged (a watch and
 *  a phone can both record the same night). Stages are only summed into "asleep", never shown. */
export async function lastNight(now = new Date()): Promise<NightRead | null> {
  const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(18, 0, 0, 0)
  const end = new Date(now); end.setHours(14, 0, 0, 0)
  const rows = await queryCategorySamples(SLEEP, { limit: 0, ascending: true, filter: { date: { startDate: start, endDate: end } } })
  const spans = rows
    .filter((r) => ASLEEP.has(Number(r.value)))
    // clipped to the window, so a stretch that began before 18:00 (a long nap) doesn't count in full
    .map((r) => [Math.max(new Date(r.startDate).getTime(), start.getTime()), Math.min(new Date(r.endDate).getTime(), end.getTime())] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
  if (!spans.length) return null
  const merged: [number, number][] = []
  for (const s of spans) {
    const last = merged[merged.length - 1]
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1])
    else merged.push([...s])
  }
  const min = merged.reduce((a, [s, e]) => a + (e - s) / 60000, 0)
  const band = bandOfMinutes(Math.round(min))
  const wake = new Date(merged[merged.length - 1][1])
  return {
    band,
    words: 'about ' + bandWords(band),
    wakeAt: wake.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    samples: rows.length,
  }
}

export interface WalkingRead {
  /** today's steps so far (HealthKit's own de-duplicated sum across watch and phone) */
  steps: number | null
  /** walking workouts in the last 7 days */
  walks: { day: string; mins: number }[]
}

export async function walking(now = new Date()): Promise<WalkingRead> {
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0)
  const stat = await queryStatisticsForQuantity(STEPS, ['cumulativeSum'], { filter: { date: { startDate: midnight, endDate: now } }, unit: 'count' })
  const weekAgo = new Date(midnight); weekAgo.setDate(weekAgo.getDate() - 7)
  const ws = await queryWorkoutSamples({ limit: 0, ascending: false, filter: { workoutActivityType: WorkoutActivityType.walking, date: { startDate: weekAgo, endDate: now } } })
  return {
    steps: stat.sumQuantity ? Math.round(stat.sumQuantity.quantity) : null,
    walks: ws.map((w) => ({
      day: new Date(w.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      mins: Math.round((new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60000),
    })),
  }
}
