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
  /** default serving: grams/ml, or a count of items when `each` is set */
  g: number
  /** true when the food is measured in millilitres rather than grams */
  ml?: boolean
  /** values are per one item (e.g. a chain's burger, as the chain publishes it), not per 100 */
  each?: boolean
  /** where the values come from: a key in `core/data/sources.ts` */
  src?: string
  /** the source's own published figure for an amount (a chain's per-portion or per-item line),
   *  kept so the app can prove one serving reproduces it exactly (see validateFoods) */
  ref?: FoodRef
  /** category — sets the default hand portion */
  cat?: FoodCategory
  /** plain food usually cooked in fat (pan, roast, grill) — gets the cooking-fat question */
  cook?: boolean
  /** sync metadata (custom foods only) */
  _u?: string
  _dirty?: boolean
}

export type FoodUnit = 'g' | 'ml' | 'item'

export type DietPattern = 'none' | 'pescatarian' | 'vegetarian' | 'vegan'

/** A published figure: `k` kcal (and macros, when published) for `g` of the food's unit. */
export interface FoodRef { g: number; k: number; p?: number; c?: number; f?: number }

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
  /** unit of `grams`: grams (default), millilitres, or a count of items */
  unit?: FoodUnit
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
  /** amount in the item's unit: grams, ml, or a count when `each` is set */
  grams: number
  ml?: boolean
  each?: boolean
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

/**
 * How an exercise is logged (plan §2.2): kg × reps; reps only (bodyweight, optional added load,
 * assistance or band); seconds held; minutes (optional km); a count of rounds; or done / not done.
 */
export type LogShape = 'weight-reps' | 'reps' | 'hold' | 'duration' | 'rounds' | 'check'

export type BandLevel = 'light' | 'medium' | 'heavy' | 'extra-heavy'

/** One logged set. `w`/`reps` stay strings ('' when unused); the rest is additive (plan §2.2). */
export interface SetEntry {
  /** kg; with `assist`, kg of assistance */
  w: string
  /** reps; for 'rounds', the round count */
  reps: string
  /** 'hold': seconds held */
  sec?: string
  /** 'duration' */
  mins?: string
  km?: string
  /** `w` (or `band`) is assistance, not load */
  assist?: boolean
  band?: BandLevel
  side?: 'L' | 'R'
  /** 'check' */
  done?: boolean
}

export interface LoggedExercise {
  /** snapshot of the display name: history never depends on the library */
  name: string
  /** library id, so "last time" follows the exercise across workouts */
  exId?: string
  /** the shape used, so history renders correctly later */
  log?: LogShape
  sets: SetEntry[]
}

export interface Workout {
  type: WorkoutType
  /** strength sessions */
  ex?: LoggedExercise[]
  /** cardio sessions */
  cardioType?: string
  mins?: string
  /** the day-of choice taken instead of the plan as written (plan §0.2); absent = as planned */
  option?: 'shorter' | 'swap'
  /** written by this version as a copy of the day's first session, for older installs */
  _mirror?: boolean
}

/** The discipline a session belongs to (workout plan §2.1). */
export type Modality = 'strength' | 'calisthenics' | 'cardio' | 'yoga' | 'pilates' | 'mobility'

/** Optional session effort (Foster et al. 2001 session-RPE verbal anchors). */
export type Effort = 'easy' | 'moderate' | 'hard' | 'very-hard'

/** One session on a day; a day can hold several (workout plan §2.5). */
export interface Session {
  id: string
  modality: Modality
  /** snapshot shown in history: "Push · chest / shoulders / triceps", "Evening yoga", "Brisk walk" */
  title: string
  /** the routine it came from: 'builtin-Legs', 'builtin-Cardio', … ; absent for a quick log */
  routineId?: string
  /** ISO time it was saved; orders sessions within the day */
  at?: string
  /** minutes; when absent the modality's default is used for estimates */
  mins?: number
  effort?: Effort
  ex?: LoggedExercise[]
  /** cardio: a CARDIO_MET key, and optional distance */
  cardio?: { key: string; km?: number }
  option?: 'shorter' | 'swap'
}

/** Optional daily mood + hunger check-in (1–5 scales; 0 = not answered). */
export interface CheckIn {
  mood: number
  hunger: number
  /** optional day-of signals (1–3; 0 or absent = not answered); see insights SLEEP/STRESS/… */
  sleep?: number
  stress?: number
  energy?: number
  /** only asked on lifting days */
  sore?: number
  note?: string
  t?: string
}

export interface DayLog {
  foods: LoggedFood[]
  supps: Record<string, boolean>
  weight: number | null
  /** legacy single session: read through sessionsOf(); still written as a mirror for older installs */
  workout: Workout | null
  /** every session this day, in order; absent on days logged before sessions existed */
  sessions?: Session[]
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
export type Goal = 'lose-fat' | 'build-muscle' | 'increase-strength' | 'increase-endurance' | 'feel-better'

/** How fast the user wants to progress (onboarding #8). Default: 'standard'. */
export type TargetRate = 'steady' | 'standard' | 'aggressive'

export type Experience = 'beginner' | 'intermediate' | 'advanced'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band'
  | 'cardio-machine'
  | 'bench' | 'pull-up-bar' | 'mat' | 'yoga-props' | 'reformer'

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
  /** diet pattern for suggestions: meals are never hidden, conflicting ingredients get swaps */
  diet?: DietPattern
  /**
   * Date (YYYY-MM-DD) from which logged workouts stop widening the food range, because the
   * activity level already counts training (workout plan D5). Earlier days keep the old maths
   * so history never shifts. Set once on load; absent only on data from older app versions.
   */
  burnSwitch?: string
  /** the one-time note explaining the burnSwitch change has been dismissed */
  burnNoteSeen?: boolean
  /** date the "welcome back" question was last answered, so it's asked once per break */
  welcomeAsked?: string
  /** an accepted "easier first week" pre-selects the shorter version up to this date */
  easyUntil?: string
  /** and from this date (absent = from when "welcome back" was answered) */
  easyFrom?: string
  /** the planned day whose "pick up" offer was waved off with "Not this time" */
  pickUpDismissed?: string
  /** date the activity-level suggestion was last answered (28-day cool-down) */
  activityAsked?: string
  /** date it was first shown; left unanswered for 3 days it counts as "Keep as is" */
  activityShown?: string
  /** date the "you've been training a lot lately" note was last dismissed (once a week at most) */
  loadNoteSeen?: string
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
  /** the user's own workouts (plan P4); built-ins stay static core data */
  routines: Routine[]
}

/** One exercise in a workout, with its own prescription (plan §2.3). */
export interface RoutineSlot {
  /** library id (`core/data/exercises.ts`) */
  exId: string
  /** this slot's prescription; the library's `defaultRx` when absent */
  rx?: string
  note?: string
}

/** sets: each exercise's sets in turn · circuit: one of each, repeated · flow: follow along in order. */
export type BlockKind = 'sets' | 'circuit' | 'flow'

export interface RoutineBlock {
  id: string
  label?: string
  kind: BlockKind
  rounds?: number
  slots: RoutineSlot[]
}

/** For the one-hard-session-a-day guard (plan §3.3); derived at save, the user can change it. */
export type RoutineEffort = 'light' | 'hard'

/**
 * A workout the user built (plan §2.3, P4). Stored in its own `routines` table, like recipes.
 * Never hard-deleted: `archived` hides it, and logged sessions keep their own snapshot of names.
 */
export interface Routine {
  id: string
  name: string
  modality: Modality
  effort: RoutineEffort
  blocks: RoutineBlock[]
  /** computed at save from the prescriptions (plan §2.9), minutes */
  estMins?: number
  source: 'custom' | 'recommended'
  /** the built-in it was customised from, e.g. 'builtin-Push' */
  baseId?: string
  archived?: boolean
  _u?: string
  _dirty?: boolean
}

export type MovementPattern =
  | 'horizontal-push' | 'vertical-push' | 'horizontal-pull' | 'vertical-pull'
  | 'squat' | 'hinge' | 'lunge' | 'isolation' | 'carry' | 'core'

/** What a mobility, yoga or pilates movement mostly works on (filters, swaps). */
export type MobilityTarget =
  | 'hips' | 'hamstrings' | 'spine' | 'shoulders' | 'chest' | 'ankles' | 'calves' | 'balance' | 'breath'

/**
 * One entry in the exercise library (`core/data/exercises.ts`, plan §2.1). `id` is a stable slug:
 * never reused or renamed (`npm run check:exercises` guards it).
 */
export interface Exercise {
  id: string
  /** display name (en-GB) */
  n: string
  modality: Modality
  /** also listed under these (cat-cow: yoga and mobility) */
  also?: Modality[]
  log: LogShape
  /** prescribed per side; one logged number means "each side" */
  perSide?: boolean
  /** any one of these can do it; [] = nothing needed */
  equipment: Equipment[]
  difficulty: Experience
  /** setup, the movement and the most common mistake */
  cue: string
  /** "3 × 10–12", "3 × 20–40 sec", "5 slow breaths", "20–30 min" */
  defaultRx?: string
  pattern?: MovementPattern
  /** counted 1.0 toward weekly volume */
  primary?: MuscleGroup
  /** counted 0.5 */
  secondary?: MuscleGroup[]
  targets?: MobilityTarget[]
  /** easier = step − 1, harder = step + 1 in the same chain */
  progression?: { chain: string; step: number }
  /** body areas this loads a lot ("Areas to go easy on") */
  care?: BodyArea[]
  /** a gentler library entry for the same slot */
  gentler?: string
  cardioVariation?: CardioVariation
  /** CARDIO_MET key for burn */
  cardioKey?: string
  video?: ExerciseMedia
}

/** A definition for a built-in exercise within a workout template. */
export interface ExerciseTemplate {
  /** library id (`core/data/exercises.ts`) */
  id?: string
  n: string
  /** target sets/reps, e.g. "3 × 10–12" */
  t: string
  cue: string
  title?: string
  /** owned demo clip; without one the card falls back to a YouTube search link */
  video?: ExerciseMedia
}

/** What the lifter is doing during one stretch of a demo clip. */
export type TempoPhaseKind = 'ready' | 'lift' | 'squeeze' | 'lower' | 'stretch'

/** One phase of a demo clip, measured from the footage. `at` is seconds from the clip start. */
export interface TempoPhase {
  at: number
  kind: TempoPhaseKind
  /** 1-based rep number; absent for the set-up before the first rep */
  rep?: number
}

/** Per-exercise demo media (see docs/plans/workouts-customization-and-library.md §2.1). */
export interface ExerciseMedia {
  /** path relative to the video base (see core/data/media.ts), or a full https URL */
  src: string
  poster?: string
  durationSec: number
  /** phases in time order; each runs until the next one starts, the last until durationSec */
  tempo: TempoPhase[]
}

export interface WorkoutTemplate {
  title: string
  ex: ExerciseTemplate[]
}
