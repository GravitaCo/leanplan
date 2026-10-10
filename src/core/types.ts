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
  /** the pack's barcode (EAN-13 / EAN-8 digits), on foods saved from a scan or a label with one */
  barcode?: string
  /** eaten as it comes (a ready meal, crisps, a drink): logged by the serving, never offered as a
   *  "What can I make?" ingredient and ranked after ingredients in the recipe builder */
  eat?: true
  /** other names people search for this food by ("dhal", "lamb curry"), never shown. Built-in
   *  foods only (not synced). A query that is exactly one of them ranks this food first; otherwise
   *  their words match like the name's, after foods whose name matches (core/domain/search.ts) */
  aka?: string[]
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
  /** a warm-up set: shown, but never counted towards targets or "last time" */
  warmup?: boolean
  /** optional "How was that set?" answer (guided player) */
  feel?: SetFeel
}

/** "How was that set?": had lots to spare, about right (two or three left), a real struggle, stopped early. */
export type SetFeel = 'spare' | 'right' | 'struggle' | 'stopped'

export interface LoggedExercise {
  /** snapshot of the display name: history never depends on the library */
  name: string
  /** library id, so "last time" follows the exercise across workouts */
  exId?: string
  /** the shape used, so history renders correctly later */
  log?: LogShape
  /** the prescription it was logged against ("3 × 10–12"); "last time" only counts the same rep range */
  rx?: string
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
  /** a time estimate (an own workout's, plan §2.9), used when `mins` wasn't logged; never shown as logged */
  estMins?: number
  effort?: Effort
  ex?: LoggedExercise[]
  /** cardio: a CARDIO_MET key, and optional distance */
  cardio?: { key: string; km?: number }
  option?: 'shorter' | 'swap'
  /** optional note from the finish sheet */
  note?: string
  /** a guided session left part-way ("Leave for now"): Train offers Resume; cleared by Finish or any other save */
  open?: boolean
  /** the warm-up block (guided player): whole minutes done of the block's `of`; never sets, so it
   *  stays out of the exercise rows, targets and "last time" */
  warmup?: { mins: number; of: number }
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
  /** last night (wellbeing plan §4.3): the self-reported band now, a device's record later */
  night?: SleepNight
  /** Mind skills used this day, by key and time (never text) */
  skills?: { id: SkillId; at: string }[]
  /** the day's one thing: a key from core/data/skills.ts THINGS (never text), and when it was done */
  thing?: { key: ThingKey; done?: string }
}

export type SleepSource = 'self' | 'healthkit' | 'health-connect'
export type SleepBand = 'lt5' | '5-6' | '6-7' | '7-8' | '8+'
/** One night, keyed to the day the person woke up on. Self-report and device records sit side by side. */
export interface SleepNight {
  source: SleepSource
  /** self-report only */
  band?: SleepBand
  /** device only; shown rounded, never staged */
  asleepMin?: number
  /** local "HH:MM" */
  bedAt?: string
  wakeAt?: string
  /** device record id, so a re-import is a no-op */
  ext?: string
  t: string
}
export type SkillId = 'reset' | 'wind-down' | 'unload' | 'outside'
/** a key from core/data/skills.ts THINGS; never text */
export type ThingKey = string
export type Pillar = 'mind' | 'food' | 'move'
export type NotifyKind = 'checkin' | 'wind-down' | 'plan'

/**
 * Mind settings (wellbeing plan §9), on `profile.mind`, merged field by field with `answeredAt`
 * stamps ('mind.off', 'mind.asks' …). `wakeAt`, `windDownAt` and `routine` are health data (cleared
 * on withdrawal); the rest are preferences, kept.
 */
export interface MindPrefs {
  /** pillars switched off; absent = all on; never all three */
  off?: Pillar[]
  /** how often Tali asks */
  asks?: 'usual' | 'fewer'
  /** usual wake time, "HH:MM" */
  wakeAt?: string
  /** wind-down time, "HH:MM" */
  windDownAt?: string
  /** reminder types turned on */
  notify?: Partial<Record<NotifyKind, boolean>>
  /** ISO time a reminder type's back-off started (after two ignored in a row) */
  halved?: Partial<Record<NotifyKind, string>>
  /** IANA time zone, from the device, so reminders follow the person's own clock */
  tz?: string
  /**
   * Wind down's "Your routine" (board B12): keys from core/data/skills.ts WIND_DOWN_ITEMS, never
   * text. Absent = the default routine; an empty list = nothing picked. A key this version doesn't
   * know is kept (a later version's step). Health data (it reveals sleep behaviour): cleared on
   * withdrawal, like windDownAt.
   */
  routine?: string[]
  /** "Show supplement names in reminders" (board B11b); absent or false = reminders stay generic */
  lockNames?: boolean
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
 * The onboarding sex answer (first-run-onboarding §2 screen 7). 'unspecified' is "Prefer not to
 * say" or skipped: Mifflin midpoint constant, the lower floor and a wider range. Stored alongside
 * the legacy `sex` (which stays 'M' | 'F' for older consumers), never in place of it.
 */
export type SexAnswer = 'female' | 'male' | 'unspecified'

export type WeightUnit = 'kg' | 'st-lb' | 'lb'
export type HeightUnit = 'cm' | 'ft-in'
/** Display and entry units only: values are always stored in kg and cm. */
export interface UnitPrefs {
  weight: WeightUnit
  height: HeightUnit
}

/** Everyday steps, in the Tudor-Locke & Bassett (2004) bands. */
export type StepsBand = 'under-5k' | '5k-7.5k' | '7.5k-10k' | '10k-12.5k' | 'over-12.5k'
/** The alternative to steps: what a working day asks of the body. */
export type JobType = 'desk' | 'standing' | 'on-feet' | 'manual'
/**
 * Daily movement outside training (onboarding screen 8). Training is counted separately from the
 * plan's sessions, so this never includes exercise (no double count).
 */
export type DailyMovement = { kind: 'steps'; band: StepsBand } | { kind: 'job'; job: JobType }

/**
 * Screener outcomes only (onboarding §8: raw answers, diagnoses and medication are never stored).
 * Absent = skipped (or, for `medical`, not asked). `baseline` is the sleep/stress screen.
 */
export interface OnboardingOutcomes {
  /** PAR-Q+ style readiness: any "yes" is 'flagged' */
  readiness?: 'clear' | 'flagged'
  /** diabetes on insulin or sulfonylureas, kidney disease or a GLP-1 medicine: 'flagged' */
  medical?: 'clear' | 'flagged'
  /**
   * Yes → 'flagged' (the name predates the split: stored data keeps its meaning, never rename it);
   * Sometimes → 'sometimes' (Onboarding 9, from Oct 2026); No → 'clear'; "Rather not say" → 'undisclosed'
   */
  wellbeing?: 'flagged' | 'sometimes' | 'clear' | 'undisclosed'
  /** poor sleep, high stress or little room for change → 'low' */
  baseline?: 'ok' | 'low'
}

/**
 * Onboarding 9: each is the person's own answer, never set by time passing, and undone in one
 * tap from Profile › Health check answers.
 */
export interface FoodOptIn {
  /** Sometimes, the day-14 ask (ob9-3): 'today' = the range on Today too, 'food' = kept on Food. Asked once. */
  today?: 'today' | 'food'
  /** Yes, the week-4 ask (ob9-4): 'shown' = a maintenance range on Food; 'not-now' = asked again 12 weeks after `rangeAt` */
  range?: 'shown' | 'not-now'
  /** local date (YYYY-MM-DD) of the last `range` answer */
  rangeAt?: string
}

/** Pregnant or breastfeeding, re-asked gently every 12 weeks and clearable in Profile (§13, §14). */
export interface PregnancyFlag {
  flagged: boolean
  /** ISO date (YYYY-MM-DD) the question was last answered */
  askedAt: string
  /** ISO date "Ask me later" was tapped on the 12-week re-ask; it comes back 2 weeks later */
  snoozedAt?: string
}

/**
 * The user's main goal (onboarding question #6). Canonical enum owned by the fitness
 * domain; nutrition consumes the same values to set energy direction. Lives at the top
 * level of Profile (not TrainingPrefs) because both domains read it — one field, one
 * write path, so training plan and calorie direction can never silently disagree.
 */
export type Goal = 'lose-fat' | 'maintain' | 'build-muscle' | 'increase-strength' | 'increase-endurance' | 'feel-better'

/** How fast the user wants to progress (onboarding #8). Default: 'standard'. */
export type TargetRate = 'steady' | 'standard' | 'aggressive'

export type Experience = 'beginner' | 'intermediate' | 'advanced'

/**
 * Kit an exercise can use. `trap-bar` is its own type (not `barbell`): someone with a straight bar
 * and plates doesn't necessarily have a trap bar, so the engine never suggests one to them.
 */
export type Equipment =
  | 'barbell' | 'trap-bar' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band'
  | 'cardio-machine'
  | 'bench' | 'pull-up-bar' | 'mat' | 'yoga-props' | 'reformer'

/** Cardio as a first-class category with typed sub-variations. */
export type CardioVariation =
  | 'running' | 'walking' | 'cycling' | 'rowing' | 'swimming'
  | 'elliptical' | 'stair' | 'jump-rope' | 'hiit' | 'other'

/** Body areas the user needs to train around (onboarding #13, safety-first). */
export type BodyArea = 'lower-back' | 'knees' | 'hips' | 'ankles' | 'shoulders' | 'elbows' | 'wrists' | 'neck'

/** "Are you moving much at the moment?" (onboarding setup card; engine §3.2 starting dose). */
export type MovingNow = 'not-at-all' | 'some' | 'regularly'

/** "Where will you usually move?" (multi: plan §4.0.2 F4). */
export type TrainingPlace = 'home' | 'gym' | 'outdoors'

export type MuscleGroup =
  | 'chest' | 'back' | 'quads' | 'hamstrings' | 'glutes' | 'shoulders'
  | 'biceps' | 'triceps' | 'calves' | 'core' | 'forearms'

/** Session length as a range of minutes (board ob2-4; core/domain/warmup.ts). */
export type SessionRange = '15-20' | '20-30' | '30-45' | '45-60' | '60+'

/**
 * Fitness-only onboarding preferences (questions #9–14). All optional/additive —
 * rides the existing settings.profile JSON, no migration needed.
 */
export interface TrainingPrefs {
  experience?: Experience
  /** 1 is allowed: one full-body session (onboarding §13.3) */
  daysPerWeek?: 1 | 2 | 3 | 4 | 5 | 6
  /** the weekdays picked (0 = Sun … 6 = Sat); picking days sets the count. Never a rotation. */
  weekdays?: number[]
  minutesPerSession?: 10 | 20 | 30 | 45 | 60
  /** the session length as picked (board ob2-4): a range; minutesPerSession is the engine's length for it */
  sessionRange?: SessionRange
  place?: TrainingPlace[]
  movingNow?: MovingNow
  /** what they enjoy or want to try (F1); absent = "not sure yet" */
  modalities?: Modality[]
  /** explicit thumbs up / down on exercises (library ids); the only stored engine preference */
  exPrefs?: { liked?: string[]; disliked?: string[] }
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
  /** a Mind plan (group "Mind plans"); health data by inference, cleared on withdrawal. Absent on other plans. */
  kind?: 'mind'
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
  /** The weight last set on Profile, a fallback only: the current weight is `latestWeight` (day logs first). */
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
  /** Mind settings (wellbeing Phase 1) */
  mind?: MindPrefs
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
  /** the look-back note (its `at`) the person hid when setting up a next plan */
  planNoteHidden?: string
  /** the weekly schedule from before the first plan started, put back when plans stop (never lost to the mirror) */
  weekBeforePlan?: Schedule
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
  /** Today's once-only "Plan when you'll do it" (ob5-4) was used or waved off: never shown again */
  ifThenOffered?: boolean
  // First-run onboarding (first-run-onboarding.md). All optional and additive: `name` above is
  // the optional first name and `age` the required age; weight stays optional.
  /** the onboarding sex answer; absent on older profiles, read through `sexOf` */
  sexAnswer?: SexAnswer
  /** entry and display units (values stay kg and cm) */
  units?: UnitPrefs
  /** daily movement outside training; `activityLevel` is re-mapped from it plus training */
  movement?: DailyMovement
  /** screener outcomes only, never raw answers */
  outcomes?: OnboardingOutcomes
  pregnancy?: PregnancyFlag
  /** ISO time the wizard finished; a device that sees it doesn't show the wizard */
  onboardedAt?: string
  /**
   * Maintenance ÷ BMR from onboarding (daily movement plus planned training, `startingTargets`
   * `effectiveMultiplier`, unrounded). Every target computation uses it when set, so Profile and
   * the summary match; `activityLevel` stays for legacy display. Cleared when the person picks an
   * activity level themselves, and before onboarding is re-run.
   */
  activityMult?: number
  /** after "Rather not say" on wellbeing, the person chose their goal's deficit over maintenance */
  deficitChosen?: boolean
  /** the food steps up a wellbeing Yes or Sometimes person said yes to (Onboarding 9, core/domain/foodMode) */
  foodOptIn?: FoodOptIn
  /** "What would make this worth it for you?" (onboarding screen 3): chip keys, or their own words (≤ 60 chars) */
  motivations?: string[]
  /**
   * When each onboarding answer was last set on some device (ISO time), keyed by field path
   * ('goal', 'outcomes.readiness', 'training.daysPerWeek' …). Sync merges `profile` field by field
   * with these (latest wins) so answers given on two devices don't overwrite each other (plan §12).
   */
  answeredAt?: Record<string, string>
  // The maintenance loop (docs/plans/maintenance-loop.md). All optional and additive.
  /** include weight in the weekly review and on Summary (board ml-c4): asked once, absent = never asked = left out */
  reviewWeight?: boolean
  /** local date (YYYY-MM-DD) the calorie target last changed: the weigh-in check skips the 14 days after it */
  targetSetAt?: string
  /** local date the goal became maintain ("Keep it steady"): the steady range is read from the 14 days after it */
  maintainFrom?: string
  /** "Make this my new starting point" (board ml-c3): the steady range's reference weight and the date it was set */
  steadyRef?: { kg: number; from: string }
  /** the weekday the weekly review is waiting on Summary from (0 = Sunday), and the last date it was opened */
  reviewDay?: number
  lastReviewAt?: string
  /** the review day whose Summary card was hidden with its cross (ml-e3): it comes back the next review day */
  reviewHidden?: string
  /** when each pattern line last showed (weekPicture PatternCode → YYYY-MM-DD): health data by inference */
  patternShown?: Record<string, string>
  /** the last "For next week" choice and its date: health data by inference (it follows from the log) */
  loopChoice?: { d: string; choice: 'keep' | 'ease-off' | 'change-one' | 'pick-up' | 'ease-back'; option?: string }
  /** the weekly review reminder (ml-d1), switched on separately from supplement reminders, and its time (HH:MM) */
  reviewPush?: boolean
  reviewPushTime?: string
  /** the date the reminder was turned on (or kept after "Keep the weekly reminder?"): unopened reviews count from here */
  reviewPushFrom?: string
  /** a review day the reminder skips: a week a safety signal fired (set on the phone; no reason is stored) */
  reviewPushSkip?: string
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
  /** weekly plans (plan P5): at most one active; the rest completed, archived or templates */
  trainingPlans: TrainingPlan[]
}

/** Weekday (0 = Sunday … 6 = Saturday) → workout keys for that day, in order; none = rest. */
export type PlanWeek = Record<number, string[]>

/**
 * A block of weeks in a plan (plan P5, Benn's model): a build phase has its own week; a
 * maintain phase reuses the previous phase's week with its workouts opening lighter.
 */
export interface PlanPhase {
  id: string
  name: string
  weeks: number
  /** a lighter week: the week before it on the shorter version */
  maintain?: boolean
  /** an easier block with its own week (a first week or two to find your weights); drawn striped */
  easier?: boolean
  /**
   * maintenance after the plan, when the person chooses it: open-ended (weeks is ignored), its
   * own week (or the last build week) on the shorter version (design canvas, Plans 4)
   */
  after?: boolean
  /** YYYY-MM-DD: when maintenance was chosen (its weeks count from here) */
  since?: string
  /** after the plan, the last week carrying on at the full version ("Keep going without a plan"), not maintenance */
  full?: boolean
  week?: PlanWeek
}

export type PlanState = 'active' | 'completed' | 'archived' | 'template'

/**
 * A weekly plan that runs for a set number of weeks in phases. The current week comes from
 * `startedAt` by the calendar and is never stored (no sequence position, plan §2.4).
 */
export interface TrainingPlan {
  id: string
  name: string
  /** 'community' is reserved for marketplace plans later */
  source: 'recommended' | 'custom'
  state: PlanState
  phases: PlanPhase[]
  /** YYYY-MM-DD: week 1 is the 7 days from here */
  startedAt?: string
  completedAt?: string
  reflection?: { at: string; good?: string; change?: string }
  /** the Tali plan it came from ("Suggested next" skips it) */
  baseTemplateId?: string
  /** a generated plan's reasons (engine §3.6): codes and data only, text rendered at display time */
  why?: Why[]
  clonedFromId?: string
  _u?: string
  _dirty?: boolean
}

/** One exercise in a workout, with its own prescription (plan §2.3). */
export interface RoutineSlot {
  /** library id (`core/data/exercises.ts`) */
  exId: string
  /** this slot's prescription; the library's `defaultRx` when absent */
  rx?: string
  /** rest between sets in seconds; the pattern default (guided.restFor) when absent */
  restSec?: number
  note?: string
  /** why the engine chose this exercise, sets, reps and rest (codes and data only) */
  why?: Why[]
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
  /** a generated workout's reasons (its day and focus); codes and data only */
  why?: Why[]
  archived?: boolean
  _u?: string
  _dirty?: boolean
}

/**
 * Movement pattern. The resistance patterns follow the NSCA / ExRx-style split into push and pull
 * (horizontal and vertical), squat (knee-dominant, both feet), lunge (knee-dominant, split stance),
 * hinge (hip-dominant), carry, core and single-joint isolation. `mobility` (stretches, yoga poses
 * and flows, pilates spine and hip work) and `cardio` are engine buckets for everything else: they
 * never count toward weekly muscle volume, so those entries carry `targets`, not `primary`.
 */
export type MovementPattern =
  | 'horizontal-push' | 'vertical-push' | 'horizontal-pull' | 'vertical-pull'
  | 'squat' | 'hinge' | 'lunge' | 'isolation' | 'carry' | 'core'
  | 'mobility' | 'cardio'

/**
 * Time one exercise takes, before rest (personalised-training-engine.md §3.3 step 2). `setupSec` is
 * paid once per exercise (loading a bar ~120 s, a machine or cable ~45 s, dumbbells ~30 s, getting
 * down to the floor ~15 s); `setSec` is one working set, both sides for `perSide` entries, at a
 * controlled ~3 s a rep (about 2 s down, 1 s up) plus ~5 s to get set, a hold's mid-range time, or
 * ~6 s a slow breath. For `duration` entries one "set" is one minute (60), so the prescribed minutes
 * are the cost. Rest is added by the engine from the goal. Judgement calls, unvalidated.
 */
export interface TimeCost { setupSec: number; setSec: number }

/**
 * The smallest next step the kit allows (engine §3.5 A, double progression per ACSM 2009: add reps
 * inside the range, then load). The engine takes the step that matches the kit in use.
 * - `plate-2.5`: barbell or landmine, +2.5 kg total (1.25 kg a side)
 * - `next-weight`: the next dumbbell or kettlebell up
 * - `next-stack`: the next pin on a machine or cable stack
 * - `next-band`: the next band (or, for assisted moves, a lighter one)
 * - `chain`: the next step on its `ladders` once the top of the range is reached
 * - `reps` / `time`: no load to add; more reps, seconds or minutes inside the range
 */
export type LoadStep = 'plate-2.5' | 'next-weight' | 'next-stack' | 'next-band' | 'chain' | 'reps' | 'time'

/**
 * Household things that stand in for kit (a chair or sofa for a bench, a step, a wall, a door
 * frame). Kept apart from `Equipment` on purpose: `Equipment` drives the library's kit filter and
 * labels, so these never change what the library shows.
 */
export type HouseholdProp = 'chair' | 'sofa' | 'step' | 'wall' | 'doorway' | 'table' | 'towel'

/** Where the body is for most of the set (floor transitions matter in short sessions and from 55). */
export type BodyPosition = 'standing' | 'seated' | 'bench' | 'floor' | 'hanging' | 'water'

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
  /** a steadier library entry for the same slot after a rough night (high-impact or loaded single-leg
   *  moves, and machine intervals): used only by the shorter version, never by "As planned"
   *  (wellbeing plan §7.5; dayOptions.roughNightPlan) */
  steadier?: string
  cardioVariation?: CardioVariation
  /** CARDIO_MET key for burn */
  cardioKey?: string
  video?: ExerciseMedia

  // ─── Engine attributes (personalised-training-engine.md §4.2). Data only: nothing on screen
  // reads them yet. `npm run check:exercises` requires them on every entry.
  /** setup once, then per working set, before rest */
  timeCost?: TimeCost
  /** technical demand, separate from `difficulty` (how hard it is): 1 simple, 2 some coordination
   *  or balance, 3 a lift worth coaching (barbell squat, swing, dip) */
  skill?: 1 | 2 | 3
  /** jumping, running or landing: `high` is filtered out with a readiness "yes", knees flagged or
   *  from 55 unless chosen; `low` is stepping or marching */
  impact?: 'none' | 'low' | 'high'
  position?: BodyPosition
  /** one side at a time (the other side rests or balances) */
  unilateral?: boolean
  /** how much it tires the whole body, not just the working muscle */
  systemicCost?: 'low' | 'medium' | 'high'
  /** fine indoors in a small space without disturbing anyone, given the kit it lists */
  homeFriendly?: boolean
  /** household props that do the job of the listed kit (a sofa for the bench) */
  props?: HouseholdProp[]
  /** the next steps the kit allows; see LoadStep */
  increment?: LoadStep[]
  /**
   * The engine's progression ladders: one exercise can sit on several (split squat is on the
   * no-kit squat and lunge ladders). Steps run easier (1) to harder, with no gaps; two entries may
   * share a step. `progression` above stays the swap sheet's chain, so these change nothing on
   * screen.
   */
  ladders?: { chain: string; step: number }[]
}

/**
 * The training engine's reasons (personalised-training-engine.md §3.6). Stored as a code plus small
 * data, never as text: `whyText` in `core/domain/engine/why.ts` renders the sentence at display
 * time, so plans stay well inside the 64 KB settings cap and copy can change without a migration.
 * `perf-*`, `feel`, `recovery` and `adherence` belong to the learning loop (engine E2/E3).
 */
export type WhyCode = 'goal' | 'experience' | 'moving-now' | 'days' | 'minutes' | 'kit' | 'enjoy' | 'body-area'
  | 'baseline' | 'age-edge' | 'guardrail' | 'time-limited' | 'variety' | 'liked' | 'disliked'
  | 'perf-top-of-range' | 'perf-below-range' | 'perf-stalled' | 'feel' | 'recovery' | 'adherence' | 'evidence'
  /** a skipped answer fell back to its safe default (first-run-onboarding.md §2.1) */
  | 'default'
  /** "find your weight" sessions 1–2 */
  | 'calibration'
  /** the Starter week: claims nothing about the person */
  | 'starter'

/** What a reason is about, so a card can show the right one next to the right thing. */
export type WhyAbout = 'plan' | 'split' | 'mix' | 'days' | 'dose' | 'ease-in' | 'exercise' | 'sets' | 'reps' | 'rest' | 'safety' | 'offer'

export interface WhyData {
  /** the exercise chosen */
  exId?: string
  /** the exercise it was chosen over */
  alt?: string
  value?: string
  n?: number
  /** the number before a change (sets before a time trim) */
  was?: number
  /** a rep or time range, "8–12" */
  range?: string
  date?: string
}

export interface Why {
  code: WhyCode
  about?: WhyAbout
  /** the onboarding field it came from (engine inputs), when it came from one */
  field?: string
  data?: WhyData
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
  /** rest between sets in seconds; overrides the default for the movement pattern */
  restSec?: number
}

/** What the lifter is doing during one stretch of a demo clip. */
/** `pull` and `return` are for pulling and cable moves (face pull, pulldown, row), where "Lift" and "Lower" mislead;
 *  `push` is for pushing out to the side (hip abduction), with `return` on the way back. */
export type TempoPhaseKind = 'ready' | 'lift' | 'squeeze' | 'lower' | 'stretch' | 'pull' | 'push' | 'return'

/** One phase of a demo clip, measured from the footage. `at` is seconds from the clip start. */
export interface TempoPhase {
  at: number
  kind: TempoPhaseKind
  /** 1-based rep number; absent for the set-up before the first rep and for a closing pause (a "ready" between reps carries the next rep) */
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
  /**
   * The clip shows a held position (a stretch, a plank, a yoga pose) or a move done for time (a
   * march): no reps and no count over it, since the person's own time comes from the hold timer.
   * Its tempo is one rep-less phase. The value sets the words: "Hold the stretch", "Hold the
   * position", or "Keep moving" (and "Keep going" on the timer).
   */
  hold?: 'stretch' | 'position' | 'move'
}

export interface WorkoutTemplate {
  title: string
  ex: ExerciseTemplate[]
}
