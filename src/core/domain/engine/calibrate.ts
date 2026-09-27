import type { SetFeel, Why } from '@/core/types'
import type { PlannedSlot, Range } from './generate'

/**
 * "Find your weight" (engine §3.3 step 7, §5): sessions 1–2 of a loaded exercise start from no
 * number at all. Tali never guesses a starting load from anyone else. The person picks a weight
 * that leaves about 3–4 reps to spare and logs how it felt; from session 3 the usual targets
 * (guided.targetFor, and nextTargets in E2) take over from their own sets.
 */
export interface CalibrationTarget {
  sets: number
  reps: Range | null
  /** never a number: there's nothing honest to guess from */
  w: null
  /** reps to spare to aim for while finding the weight (judgement call) */
  rir: Range
  /** session 1: pick one; session 2: from how session 1 felt (a skipped rating holds it) */
  step: 'pick' | 'same' | 'lighter' | 'heavier'
  why: Why[]
}

const SPARE: Range = { lo: 3, hi: 4 }

/**
 * The target for a calibrating slot on its `exposures`-th time (0 = the first session). Null once
 * it has two sessions of the person's own data, or for anything not loaded (bodyweight moves step
 * along their ladder instead).
 */
export function calibrationTarget(slot: Pick<PlannedSlot, 'exId' | 'sets' | 'reps' | 'calibrate'>, exposures: number, lastFeel?: SetFeel): CalibrationTarget | null {
  if (!slot.calibrate || exposures >= 2) return null
  const why: Why[] = [{ code: 'calibration', about: 'reps', data: { exId: slot.exId, n: exposures + 1 } }]
  if (exposures === 0) return { sets: slot.sets, reps: slot.reps, w: null, rir: SPARE, step: 'pick', why }
  // spare → a little heavier; about right → the same; a struggle or stopped → a little lighter
  const step = lastFeel === 'spare' ? 'heavier' : lastFeel === 'struggle' || lastFeel === 'stopped' ? 'lighter' : 'same'
  if (lastFeel) why.push({ code: 'feel', about: 'reps', data: { exId: slot.exId, value: lastFeel } })
  return { sets: slot.sets, reps: slot.reps, w: null, rir: SPARE, step, why }
}
