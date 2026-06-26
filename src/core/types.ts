/**
 * Domain types — pure data shapes, no framework dependencies.
 * This file (and everything under core/) is deliberately UI-agnostic so it can be
 * reused unchanged by a future React Native / Capacitor build.
 */

/** A food as stored in the database, values per 100g (or 100ml when `ml` is set). */
export interface Food {
  /** uuid — present on user-created custom foods, absent on the built-in database */
  id?: string
  /** name */
  n: string
  /** kcal per 100g/ml */
  k: number
  /** protein g per 100g/ml */
  p: number
  /** carbs g per 100g/ml */
  c: number
  /** fat g per 100g/ml */
  f: number
  /** default serving size in grams/ml */
  g: number
  /** true when the food is measured in millilitres rather than grams */
  ml?: boolean
  /** sync metadata (custom foods only) */
  _u?: string
  _dirty?: boolean
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** A single logged food entry for a given day (absolute macros, already scaled to portion). */
export interface LoggedFood {
  n: string
  grams: number
  k: number
  p: number
  c: number
  f: number
  meal?: MealSlot
  unit?: 'g' | 'ml'
}

export interface RecipeItem {
  n: string
  k: number
  p: number
  c: number
  f: number
  grams: number
  ml?: boolean
}

export interface Recipe {
  id: string
  name: string
  servings: number
  items: RecipeItem[]
  _u?: string
  _dirty?: boolean
}

export type WorkoutType = 'Legs' | 'Push' | 'Pull' | 'Cardio'

export interface SetEntry {
  w: string
  reps: string
}

export interface LoggedExercise {
  name: string
  sets: SetEntry[]
}

export interface Workout {
  type: WorkoutType
  /** strength sessions */
  ex?: LoggedExercise[]
  /** cardio sessions */
  cardioType?: string
  mins?: string
}

export interface DayLog {
  foods: LoggedFood[]
  supps: Record<string, boolean>
  weight: number | null
  workout: Workout | null
}

export interface MacroTarget {
  kcal: number
  p: number
  c: number
  f: number
}

export type Sex = 'M' | 'F'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'

export interface Supplement {
  id: string
  name: string
  time: string
}

export interface Profile {
  name: string
  sex: Sex
  age: number | null
  height: number | null
  weight?: number | null
  activityLevel: ActivityLevel
  supplements: Supplement[]
  notificationsEnabled: boolean
}

/** Weekly schedule keyed by weekday index (0 = Sun … 6 = Sat). */
export type Schedule = Record<number, WorkoutType | 'Rest'>

export interface AppState {
  target: MacroTarget
  schedule: Schedule
  profile: Profile
  days: Record<string, DayLog>
  customFoods: Food[]
  recipes: Recipe[]
}

/** A definition for a built-in exercise within a workout template. */
export interface ExerciseTemplate {
  n: string
  /** target sets/reps, e.g. "3 × 10–12" */
  t: string
  cue: string
  title?: string
}

export interface WorkoutTemplate {
  title: string
  ex: ExerciseTemplate[]
}
