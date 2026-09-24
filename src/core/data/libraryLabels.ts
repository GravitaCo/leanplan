import type { BodyArea, Equipment, Experience, LogShape, MobilityTarget } from '@/core/types'

/** Words for the exercise library's tags (en-GB, plain). */
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  'cardio-machine': 'Cardio machine',
  bench: 'Bench',
  'pull-up-bar': 'Pull-up bar',
  mat: 'Mat',
  'yoga-props': 'Yoga props',
  reformer: 'Reformer',
}

/** Difficulty in the questionnaire's own words (plan §4.0.2). */
export const LEVEL_LABEL: Record<Experience, string> = {
  beginner: 'Just starting',
  intermediate: 'Getting comfortable',
  advanced: 'Confident',
}

export const CARE_LABEL: Record<BodyArea, string> = {
  'lower-back': 'the lower back',
  knees: 'the knees',
  shoulders: 'the shoulders',
  elbows: 'the elbows',
  wrists: 'the wrists',
  neck: 'the neck',
}

export const TARGET_LABEL: Record<MobilityTarget, string> = {
  hips: 'Hips',
  hamstrings: 'Hamstrings',
  spine: 'Spine',
  shoulders: 'Shoulders',
  chest: 'Chest',
  ankles: 'Ankles',
  calves: 'Calves',
  balance: 'Balance',
  breath: 'Breath',
}

export const SHAPE_LABEL: Record<LogShape, string> = {
  'weight-reps': 'Weight and reps',
  reps: 'Reps',
  hold: 'Timed hold',
  duration: 'Minutes',
  rounds: 'Rounds',
  check: 'Done',
}
