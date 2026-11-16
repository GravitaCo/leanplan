/**
 * Wind down's "Your routine" save rule (board B12), shared by the web sheet (WindDownScreen.tsx)
 * and the native one. The routine is health data, so it is written only when the picks change.
 */
import { DEFAULT_ROUTINE, routineToSave } from '@/core/data/skills'

/**
 * What Done saves: the picks as keys (routineToSave), or null when they equal what's stored (or
 * the default, when nothing is stored yet), so an unchanged Done writes nothing.
 */
export function routineSave(picked: readonly string[], stored: string[] | undefined): string[] | null {
  const next = routineToSave(picked, stored)
  return JSON.stringify(next) === JSON.stringify(stored ?? DEFAULT_ROUTINE) ? null : next
}
