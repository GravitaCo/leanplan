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
  /** category — sets the default hand portion */
  cat?: FoodCategory
  /** plain food usually cooked in fat (pan, roast, grill) — gets the cooking-fat question */
  cook?: boolean
  /** sync metadata (custom foods only) */
  _u?: string
  _dirty?: boolean
}

export type FoodCategory =
  | 'meat' | 'fish' | 'eggs' | 'dairy' | 'grains' | 'potato' | 'veg' | 'fruit'
  | 'fats' | 'sauces' | 'ready' | 'fastfood' | 'snacks' | 'drinks'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/**
 * How a logged amount was captured. Each has a typical relative error, so the app can
 * show an honest ± margin instead of false precision (see core/domain/estimate.ts).
 */
export type CaptureMethod = 'g' | 'serv' | 'usual' | 'recipe' | 'hand' | 'quick' | 'fat'

export type HandPortion = 'palm' | 'cupped' | 'fist' | 'thumb'

/** Where an entry's numbers came from. */
export type EntrySource = 'db' | 'custom' | 'recipe' | 'quick' | 'fat'

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
  /** capture metadata — all optional so entries logged before it existed stay valid */
  src?: EntrySource
  how?: CaptureMethod
  /** typical relative error of this entry, 0–1 */
  err?: number
  hand?: { type: HandPortion; count: number }
  /** servings, for serving- and recipe-based entries */
  serv?: number
  /** the user confirmed or corrected this entry, so it isn't flagged again */
  ok?: boolean
  /** cooking fat: the food it was cooked with */
  fatFor?: string
  /** the cooking-fat answer given for this food, remembered as its next default */
  fatChoice?: FatChoice
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

/** Optional daily mood + hunger check-in (1–5 scales; 0 = not answered). */
export interface CheckIn {
  mood: number
  hunger: number
  note?: string
  t?: string
}

export interface DayLog {
  foods: LoggedFood[]
  supps: Record<string, boolean>
  weight: number | null
  workout: Workout | null
  checkin?: CheckIn | null
}

export interface MacroTarget {
  kcal: number
  p: number
  c: number
  f: number
}

export type Sex = 'M' | 'F'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'

/**
 * The user's main goal (onboarding question #6). Canonical enum owned by the fitness
 * domain; nutrition consumes the same values to set energy direction. Lives at the top
 * level of Profile (not TrainingPrefs) because both domains read it — one field, one
 * write path, so training plan and calorie direction can never silently disagree.
 */
export type Goal = 'lose-fat' | 'build-muscle' | 'increase-strength' | 'increase-endurance'

/** How fast the user wants to progress (onboarding #8). Default: 'standard'. */
export type TargetRate = 'steady' | 'standard' | 'aggressive'

export type Experience = 'beginner' | 'intermediate' | 'advanced'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band'
  | 'cardio-machine'

/** Cardio as a first-class category with typed sub-variations. */
export type CardioVariation =
  | 'running' | 'walking' | 'cycling' | 'rowing' | 'swimming'
  | 'elliptical' | 'stair' | 'jump-rope' | 'hiit' | 'other'

/** Body areas the user needs to train around (onboarding #13, safety-first). */
export type BodyArea = 'lower-back' | 'knees' | 'shoulders' | 'elbows' | 'wrists' | 'neck'

export type MuscleGroup =
  | 'chest' | 'back' | 'quads' | 'hamstrings' | 'glutes' | 'shoulders'
  | 'biceps' | 'triceps' | 'calves' | 'core' | 'forearms'

/**
 * Fitness-only onboarding preferences (questions #9–14). All optional/additive —
 * rides the existing settings.profile JSON, no migration needed.
 */
export interface TrainingPrefs {
  experience?: Experience
  daysPerWeek?: 2 | 3 | 4 | 5 | 6
  /** what the user can access; filters exercise selection & substitution */
  equipment?: Equipment[]
  /** preferred cardio variations (esp. for increase-endurance) */
  cardioPrefs?: CardioVariation[]
  /** areas to train around; only ever excludes/substitutes movements, never programs risky ones */
  limitations?: BodyArea[]
  /** optional free-text detail on limitations (informational; not parsed) */
  limitationsNote?: string
  /** muscles to bias extra volume toward (optional power-user knob) */
  emphasis?: MuscleGroup[]
}

/** How much the app asks to tighten estimates. */
export type AccuracyMode = 'relaxed' | 'balanced' | 'precise'

export type ThemePref = 'system' | 'light' | 'dark'

/** Cooking-fat answer, remembered as the next default. */
export type FatChoice = 'none' | 'spray' | 'tsp' | 'tbsp' | 'butter' | 'unsure'

/** An if–then (implementation intention) plan, revisited weekly. */
export interface IfThenPlan {
  id: string
  when: string
  then: string
  /** optional barrier-coping plan */
  cope?: string
  created: string
  lastReview?: string
  reviews: { d: string; r: 'worked' | 'mixed' | 'no' }[]
}

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
  /** main goal (#6) — shared by nutrition & fitness; absent = not yet chosen */
  goal?: Goal
  /** body-fat % (#7) — optional; nutrition assumes 15% when absent */
  bodyFat?: number
  /** desired pace (#8) — nutrition; treated as 'standard' when absent */
  targetRate?: TargetRate
  /** fitness-only onboarding preferences (#9–14) */
  training?: TrainingPrefs
  /** tracking preferences — all optional, read through core/domain/prefs defaults */
  accuracy?: AccuracyMode
  /** hides calorie numbers and body weight; shows the day in words */
  gentle?: boolean
  /** ± kcal around the calorie target that counts as "in range" */
  rangeWidth?: number
  /** personal hand-portion calibration in grams */
  hands?: Partial<Record<HandPortion, number>>
  plans?: IfThenPlan[]
  theme?: ThemePref
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
