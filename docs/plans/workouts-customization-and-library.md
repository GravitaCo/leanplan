# Workouts: customisation, recommendations & exercise library

**Author:** fitness-workouts specialist · **Status:** plan, revision 3 (no code for this revision yet) ·
**Audience:** Benn + ship-critic (every phase), security-data (the phases flagged in §6),
mental-performance (wellbeing requirements in §0)

**In short**
- **Wellbeing comes first.** §0 lists binding rules that every section and phase must meet.
- **Six kinds of movement:** weights, calisthenics, cardio, yoga, pilates, mobility.
- **Build your own workouts**, do them any day, or place them in a weekly plan.
- **Several sessions a day** can be logged, and old data keeps working.
- **Plans fit the person:** what they enjoy, their time, place, confidence and areas to go easy on.
- **Phase 1 is wellbeing-led:** check-in signals, day-of choices, no "earning food" copy, and
  a gentle catch-up for missed sessions. No database changes.

The rules from the charter still hold: **Legs → Push → Pull order wherever lifting days are
placed, the weekly schedule stays an editable calendar (the reverted rotation is not
reintroduced), and `src/core/` stays framework-agnostic.**

> **Revision note (September 2026).** Benn's brief: "customisation of the workout plans,
> factoring in how our system should be tailored to each user and their goals ... custom plans
> and building out individual workouts ... weights, cardio, calisthenics, yoga, pilates etc."
> Benn then set the direction that **mental wellbeing is primary**, ahead of programming, the
> library and the builder. So this revision opens with §0 and re-sequences the roadmap so
> Phase 1 is wellbeing-led.
>
> **Credit:** §0 and the sections it points to (onboarding questions §4.0.2, "Areas to go easy
> on" §4.0.4, day-of options §4.0.5, missed sessions and restarts §4.1b, gentle mode §4.1c, load
> guardrails §3.3) come from the **mental-performance** agent's recommendations. Their copy is
> used where they supplied it. Thresholds they called judgement calls are marked the same way.
>
> **What this changes from earlier decisions** (Benn to confirm the ones in §7.3):
> 1. **Phase order.** Tables were due first (P0/P1). The table-backed model stands, but each
>    table now lands with the feature that first writes to it, so Phase 1 can be wellbeing-led
>    and schema-free (D1).
> 2. **`PlanDay` is retired.** Content moves to `Routine` (its own table); placement moves to
>    `TrainingPlan.week` (weekday → routine ids). Plans stay table-backed with a JSONB body.
> 3. **`Schedule` is not widened.** It keeps its shipped shape as the no-plan default and a
>    mirror for older installs. The active plan's `week` is the calendar the user edits.
> 4. **Cardio logging** moves to `Session.cardio` with numeric minutes; the old
>    `cardioType`/`mins` shape stays readable and mirrored.
> 5. **`ExerciseKind` and `isHold` are replaced** by `modality` (what it is) and `log` (how it is
>    logged). Neither had shipped.
> 6. **`ExerciseMedia` now matches the shipped code** (`src` required, `tempo`, no
>    `searchFallback`).
> 7. **Onboarding questions change** (confidence not experience labels, 1 day a week allowed,
>    place before equipment, focus areas and cardio preferences out of onboarding). This differs
>    from `onboarding-and-data-flow.md`, which needs a matching update (D7).
> 8. **Limitations are preferences, not clinical exclusions.** "Contraindicated" and "never
>    programs a flagged-risky movement" become "prefers gentler alternatives".
> 9. **"Plans slide", within the calendar.** A missed session is carried forward as a
>    ready-when-you-are choice. The weekday calendar itself does not shift, because shifting it is
>    the reverted rotation model (§0.4, D4).
> 10. **The split is chosen by resistance sessions a week**, not days a week, because days can now
>     hold yoga, cardio or mobility too.
>
> **Earlier revision note (kept for history).** Plans are table-backed in owner-RLS'd Supabase
> tables, not nested in `settings`/`profile` JSON. Four goals (`lose-fat`, `increase-strength`,
> `build-muscle`, `increase-endurance`). Cardio is first-class. Broad library. Explicit plan
> lifecycle (active / completed / archived + templates via clone). Demo video hosting targets
> Bunny CDN. The builder can be gated later; the core stays free; monetization is out of scope.

---

## 0. Wellbeing first: principles and guardrails

**Why this comes first.** Tali's frame is good mental performance → good nutrition → good
fitness. A plan someone enjoys, can fit into a bad week and never feels judged by will be done
far more than a "perfect" plan. So these are **binding requirements**. Every later section and
every phase must meet them, and ship-critic checks each phase against this list. Each phase in
§6 names the ones it must ship with.

### 0.1 Tailor to enjoyment, not appearance
- Ask what people **enjoy or want to try**, how much time they have, and how confident they feel
  (§4.0.2). Enjoyment decides the mix; the goal shapes it.
- Never ask about body-fat %, "problem areas", "tone up", appearance targets or photos.
- Offer, never force. If someone only wants yoga, build yoga and suggest (once) what else would
  help their goal.

### 0.2 Day-of choices from the check-in
- Optional check-in signals: sleep, stress, energy, and soreness on lifting days.
- Compared with the person's own usual pattern. **No "readiness score".**
- When two or more are low, offer three equal choices: **the planned session, a shorter version,
  or a swap to mobility, yoga or a walk.** Always offered, never auto-changed, never locked.
  Detail in §4.0.5.

### 0.3 No streaks, no "missed", no red
- Progress is **sessions per week in a range** ("2 this week, your plan is 2–3").
- Unlogged days are never labelled "missed" and never shown in red.
- After 10 or more days away: "Welcome back. Want an easier first week?"

### 0.4 Plans slide, the calendar stays put
- A missed session is not lost. Next time Train opens it is offered: "Pick up with Legs
  whenever you're ready."
- The weekday calendar does not move (Tuesday is still Tuesday's workout). Moving it would bring
  back the rotation schedule that was tried and reverted. Detail in §4.1b.
- Plans finish by **sessions done**, not weeks passed, and close with a short reflection.

### 0.5 Load guardrails
- At most **one hard session a day**; a second one that day is light (walk, mobility, yoga).
- Every generated plan has **at least one rest day**. Six days is never the default for fat loss.
- In a big calorie deficit with high volume: keep volume low and hold off on progression.
- A gentle, once-a-week note if training gets very heavy. Thresholds are judgement calls, not
  validated.
- Worrying patterns hand over to the supportive script in `ai-platform-plan.md` §4.2 (item 3).
  **Never coach toward more.** Detail in §3.3.

### 0.6 Gentle mode
- Hides burn numbers and volume meters and keeps progress in words. Detail in §4.1c.

### 0.7 "Areas to go easy on"
- Preference filtering, not clinical exclusion. Tali suggests gentler alternatives.
- The disclaimer shows with the question and on every swapped exercise. Red-flag and pregnancy
  copy is fixed. Never diagnose, never offer rehab, never claim a movement is safe for a
  condition. Detail in §4.0.4.

### 0.8 Exercise is never a way to earn food
- No copy says a workout "gives you room" or "earns" calories. Cardio is for fitness and
  enjoyment, not for burning off food.
- Today's copy breaks this in two places: the Train banner ("That gives you about X kcal more
  room today", `TrainScreen.tsx` about line 78) and the Today workout tile ("+X kcal of room",
  `TodayScreen.tsx` about line 180). **Phase 1 replaces both** with neutral copy (§6).
- Whether burn keeps widening the food range behind the scenes is a nutrition decision (D5). It is
  never presented as a reward.

---

## 1. Current-state analysis

### How it works today (checked against the code, September 2026)
- **Templates are fixed.** `WORKOUTS` (`src/core/data/workouts.ts`) is a hardcoded
  `Record<string, WorkoutTemplate>` keyed by the four `WorkoutType`s (`Legs`, `Push`, `Pull`,
  `Cardio`). An `ExerciseTemplate` is `{ n, t, cue, title?, video? }`: name, a free-text
  sets×reps string (`"3 × 10–12"`), a coaching cue and an optional demo clip. There is still
  **no exercise identity** (no id, muscle, equipment or modality).
- **One session per day.** `DayLog.workout` is a single `Workout | null`, and saving replaces
  it (`store.saveWorkout` / `saveCardio`). A strength `Workout` is `{ type, ex }`, a cardio one
  `{ type: 'Cardio', cardioType, mins }` with string values.
- **The schedule is an editable calendar.** `Schedule = Record<number, WorkoutType | 'Rest'>`
  keyed by weekday (0 = Sun … 6 = Sat). `DEFAULT_SCHEDULE` puts Legs/Push/Pull on
  Mon/Wed/Fri with cardio between; `PlanScreen` assigns any `SESSIONS` value to any day. This
  is the deliberate post-revert design. `WeekStrip` and `insights.dayStat` read it for the
  "planned" flag.
- **Train flow** (`TrainScreen.tsx`): a segmented control over the four types. Lifts render the
  fixed template with kg/reps inputs and a "Last time" line found by **exercise index** within
  the same type. The plank is special-cased **by name** to log seconds in the `reps` field.
  Cardio is a type picker over the six `CARDIO_MET` keys (Walk, Incline treadmill, Stationary
  bike, Cross-trainer, Rower, Other) plus minutes. A static footer coaches 2–3 RIR and adding
  weight at the top of the range.
- **Owned demo videos and the tempo player have shipped.** Two clips (barbell curl, Romanian
  deadlift) live in `public/videos/` (vertical 540×960 H.264, no audio, poster JPG) and attach
  through `ExerciseTemplate.video` from `DEMOS` in `src/core/data/media.ts`. The shipped
  `ExerciseMedia` is `{ src, poster?, durationSec, tempo: TempoPhase[] }`, where each phase is
  `{ at, kind: 'ready' | 'lift' | 'squeeze' | 'lower' | 'stretch', rep? }` measured from the
  footage at 8 fps. "Watch example" opens `train/DemoPlayer.tsx`: a full-screen player that
  reads the video clock and overlays phase, rep and a 1-2-3 count (`core/domain/tempo.ts`),
  plus a pace row. Exercises without a clip fall back to a YouTube search (`howToLink`).
  `VIDEO_BASE` is the one switch for moving clips to Bunny CDN. The service worker leaves
  `/videos/` to the network. `npm test` checks every clip file exists and the timeline is
  ordered. Clips are generated from the Seedance prompts in `docs/exercise-video-prompts.md`.
- **Calorie burn** (`core/domain/workout.ts > workoutBurn`): cardio uses `CARDIO_MET[type]` ×
  kg × hours (25 min when blank); any strength session is a flat 3.5 MET × 45 min. Both use
  **gross** MET. The result extends the day's calorie range (`insights.rangeFor`) and shows on
  Today and Train.
- **The goal and onboarding contract types have shipped; the questionnaire has not.**
  `Profile.goal` (the four-value `Goal`), `bodyFat`, `targetRate` and `training?: TrainingPrefs`
  exist in `src/core/types.ts`. `TrainingPrefs` holds `experience`, `daysPerWeek` (2–6),
  `equipment`, `cardioPrefs`, `limitations` (`BodyArea[]`), `limitationsNote` and `emphasis`.
  `Equipment`, `CardioVariation`, `BodyArea`, `MuscleGroup` and `Experience` are shipped types.
  `suggestedTargets()` is goal-aware. The only capture UI is the goal chip row in Profile's
  "Body metrics & goal" section; `TrainingPrefs` has no UI yet.
- **Check-in** (`today/CheckinSheet.tsx`) records mood and hunger (1–5) and a note. It travels
  inside the `day_logs.supps` JSONB under the reserved `_checkin` key (no schema change).
- **Naming clash to avoid:** `Profile.plans` already holds **if–then plans** (`IfThenPlan[]`).
  Training plans must use a different field name (`trainingPlans`, §2.8).

### Persistence & sync (the constraints we design around)
- localStorage key `leanplan.v1` (`persistence.ts`) holds `PersistedState` = `AppState`
  (`target, schedule, profile, days, customFoods, recipes`) + `_meta`. `loadStateFrom()` fills
  defaults defensively. **Never rename the key.**
- Supabase tables: `settings` (one row per user: JSON `target`, `schedule`, `profile`),
  `custom_foods`, `recipes`, `day_logs` (`foods`, `supps`, `weight`, `workout` JSONB),
  `push_subscriptions`. Sync is offline-first with per-record dirty flags and last-write-wins
  (`sync.ts`). RLS locks every row to `auth.uid()` (`docs/security-rls.sql`). Guest mode is
  local-only (`authed = false`). **Never rename existing tables or columns.**
- `recipes` is the proven pattern for a reusable user-authored unit: its own table, a JSON
  body column, client-generated ids, `_u`/`_dirty`, a delete queue in `SyncMeta`.

### The specific gaps
1. No exercise identity: no library, no swaps, no progressions, no per-exercise history.
2. Only two logging shapes (kg × reps, cardio minutes), with holds hacked by name.
3. One session per day; a yoga class after a run cannot both be logged.
4. No reusable workouts: nothing can be built, saved, or done ad hoc.
5. Plans are a fixed four-type calendar; nothing tailors to the person.
6. No goal, time, place, confidence or limitation inputs in use.
7. Burn is one flat strength estimate and six cardio types.

---

## 2. Data model design

Design priorities: (a) give exercises a real identity in framework-agnostic core data;
(b) model **what** an exercise is (modality) separately from **how it is logged** (shape);
(c) make the individual workout (routine) the reusable unit, and a plan a weekly arrangement
of routines; (d) keep every change **additive** so old data, old installs and guests keep
working; (e) keep logging fast.

**Names used in this plan.** `Routine` is the code name for what users see as a **workout**
(a planned, reusable list of exercises). `Session` is one **logged** occurrence (what was
actually done on a day). The shipped `Workout` type stays as the legacy logged shape. We avoid
reusing "workout" in new type names because `Workout` already means "logged session" in code.

### 2.1 Modalities & the exercise library (new core data: `src/core/data/exercises.ts`)
Static, app-shipped, framework-agnostic, keyed by stable id.

```ts
// src/core/types.ts (additions; all additive)

/** The discipline an exercise or session belongs to. Drives library filters, the
 *  recommender's mix, default logging shape and default burn. */
export type Modality = 'strength' | 'calisthenics' | 'cardio' | 'yoga' | 'pilates' | 'mobility'

/** Resistance modalities: count toward weekly muscle volume and the strength floor (§3). */
export const RESISTANCE: Modality[] = ['strength', 'calisthenics']

export type MovementPattern =
  | 'horizontal-push' | 'vertical-push' | 'horizontal-pull' | 'vertical-pull'
  | 'squat' | 'hinge' | 'lunge' | 'isolation' | 'carry' | 'core'

/** What a mobility, yoga or pilates movement mostly works on (filters, cool-down matching). */
export type MobilityTarget =
  | 'hips' | 'hamstrings' | 'spine' | 'shoulders' | 'chest' | 'ankles' | 'calves' | 'balance' | 'breath'

/** Equipment (shipped type, extended additively; old saved values stay valid). */
export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band'
  | 'cardio-machine'
  | 'bench' | 'pull-up-bar' | 'mat' | 'yoga-props' | 'reformer'   // new

export interface Exercise {
  /** stable slug, e.g. 'leg-press', 'incline-push-up', 'downward-dog'. NEVER reused or renamed. */
  id: string
  n: string                       // display name (en-GB)
  modality: Modality              // primary discipline
  also?: Modality[]               // also listed under (cat-cow: yoga + mobility; plank: strength, calisthenics, pilates)
  log: LogShape                   // default logging shape (§2.2)
  perSide?: boolean               // prescribed and optionally logged per side
  equipment: Equipment[]          // any one of these can do it; [] = nothing needed
  difficulty: Experience
  cue: string                     // the signature cue: setup, movement, the common mistake
  defaultRx?: string              // "3 × 10–12", "3 × 20–40 sec", "5 slow breaths", "20–30 min", "3 rounds"
  // resistance
  pattern?: MovementPattern
  primary?: MuscleGroup           // counted 1.0 toward weekly volume
  secondary?: MuscleGroup[]       // counted 0.5
  // mobility, yoga, pilates
  targets?: MobilityTarget[]
  // calisthenics and pilates progressions: easier = step − 1, harder = step + 1 in the same chain
  progression?: { chain: string; step: number }
  // "Areas to go easy on" (§4.0.4): body areas this loads a lot
  care?: BodyArea[]
  // cardio
  cardioVariation?: CardioVariation
  cardioKey?: string              // CARDIO_MET key for burn (legacy-compatible)
  video?: ExerciseMedia           // owned demo clip (§5.5)
}
```

`kind` and `isHold` from the earlier draft are dropped: `modality` says what it is, `log` says
how it is logged. `howToLink(exercise.n)` stays as the fallback when `video` is absent, so there
is no regression for exercises without a clip.

### 2.2 Logging shapes (fast by default, detail only when it helps)

```ts
export type LogShape =
  | 'weight-reps'   // kg × reps: barbell, dumbbell, machine, cable, kettlebell
  | 'reps'          // reps only: bodyweight; optional added load, assistance or band
  | 'hold'          // seconds held: plank, side plank, yoga and pilates holds; per side when set
  | 'duration'      // minutes, optional distance: a cardio piece or a timed block
  | 'rounds'        // a count of rounds: sun salutations, a circuit done for rounds
  | 'check'         // done or not: a pose inside a follow-along flow

export type BandLevel = 'light' | 'medium' | 'heavy' | 'extra-heavy'

/** Shipped type, extended additively. `w`/`reps` stay strings ('' when unused), as today. */
export interface SetEntry {
  w: string            // kg; with `assist`, kg of assistance (assisted pull-up machine)
  reps: string         // reps; for 'rounds', the round count
  sec?: string         // 'hold': seconds held
  mins?: string        // 'duration'
  km?: string          // 'duration', optional
  assist?: boolean     // `w` (or `band`) is assistance, not load
  band?: BandLevel     // band used as resistance, or as assistance with `assist`
  side?: 'L' | 'R'     // only when the user chooses to log sides separately
  done?: boolean       // 'check', and the one-tap "done as planned" tick
}

/** Shipped type, extended additively. */
export interface LoggedExercise {
  name: string         // snapshot of the display name: history never depends on the library
  exId?: string        // library id: "last time" follows the exercise across routines
  log?: LogShape       // the shape used, so history renders correctly later
  sets: SetEntry[]
}
```

| Modality | Default shape | Fields shown per set | Optional, one tap away |
|---|---|---|---|
| strength | `weight-reps` | kg, reps | none |
| calisthenics | `reps` | reps | "Added weight" or "Assisted" (kg or band level) |
| cardio | `duration` | minutes | distance; effort |
| yoga | `hold` (poses), `rounds` (flows) | a hold timer that fills seconds | per side |
| pilates | `reps` or `hold` per exercise | reps or timer | per side |
| mobility | `hold` or `reps` per exercise | timer or reps | per side |
| any session | session level | minutes (auto from Start/Finish) | effort (Easy / Moderate / Hard / Very hard → RPE 3/5/7/9) |

**Keeping it fast.**
- Every set row pre-fills from last time (by `exId`), so a repeat session is mostly taps.
- **"Done as planned"** ticks every set at its prescription in one tap; the user edits only the
  exceptions.
- Holds use a timer that writes `sec` itself; nobody types seconds.
- Per side is off by default: one number means "each side". Sides split only if the user asks.
- A **quick log** needs only modality, activity and minutes. Detail is always optional.
- Effort is one optional four-chip row at the end, never a 1–10 slider mid-session.

### 2.3 Routines: individual workouts as reusable units

A routine is an ordered list of exercise slots with prescriptions. It can mix modalities (a
strength circuit plus a stretch cool-down), be done ad hoc on any day, or be placed in a plan.

```ts
export interface RoutineSlot {
  exId: string           // -> Exercise.id
  rx?: string            // this slot's prescription; overrides Exercise.defaultRx
  restSec?: number       // optional rest hint
  note?: string
}

/** sets: finish each exercise's sets in turn · circuit: one set of each, repeat for rounds ·
 *  flow: follow along in order (yoga flows, pilates sequences, cool-downs). */
export type BlockKind = 'sets' | 'circuit' | 'flow'

export interface RoutineBlock {
  id: string
  label?: string         // "Warm-up", "Main", "Cool-down"
  kind: BlockKind
  rounds?: number        // circuit and flow
  slots: RoutineSlot[]
}

export type Effort = 'light' | 'hard'   // for the one-hard-session-a-day guard (§3.3)

export interface Routine {
  id: string
  name: string           // "Push", "Bodyweight full body", "20-minute yoga reset"
  modality: Modality     // headline modality; defaults to the main block's
  effort: Effort         // derived at save (§3.3), user can override
  blocks: RoutineBlock[] // most workouts have one 'sets' block; blocks appear in the UI only when a second is added
  estMins?: number       // computed at save from the prescriptions (§2.9)
  source: 'builtin' | 'custom' | 'recommended'
  baseId?: string        // cloned from (built-in or another routine): "reset to original"
  guide?: ExerciseMedia  // optional whole guided session video (§5.5), later phase
  archived?: boolean     // soft delete: plans and history stay intact
  _u?: string
  _dirty?: boolean
}
```

- **Built-in routines** are static core data (§2.7): `builtin-legs`, `builtin-push`,
  `builtin-pull`, `builtin-cardio` converted from `WORKOUTS`, plus starter routines in the new
  modalities. They cannot be edited; "Customise" clones one into a user row with `baseId` set.
- **Blocks are progressive disclosure.** A user who adds five exercises never sees the word
  "block". Adding a warm-up or cool-down, or choosing "Do as a circuit", introduces a second
  block.
- **Ordering rules the builder nudges toward (warns, never blocks):** warm-up first, compound
  resistance before isolation, circuits pair opposing movements, stretches and holds last.

### 2.4 Plans: a weekly arrangement of routines

```ts
/** Weekday (0 = Sun … 6 = Sat) → routine ids for that day, in order. Missing or [] = rest.
 *  An editable calendar: no sequence pointer, no cycle index, no "next workout" state. */
export type PlanWeek = Record<number, string[]>

export type PlanSource = 'recommended' | 'custom' | 'edited-recommended'
export type PlanState = 'active' | 'completed' | 'archived' | 'template'

export interface TrainingPlan {
  id: string
  name: string
  source: PlanSource
  state: PlanState               // at most one 'active' per user (store/domain rule)
  baseTemplateId?: string        // blueprint provenance, for "reset to recommended"
  clonedFromId?: string          // re-use provenance
  goal?: Goal
  week: PlanWeek                 // replaces the earlier PlanDay[] body
  /** completion is by sessions done, not calendar weeks (§4.1a); e.g. 18 */
  targetSessions?: number
  startedAt?: string
  /** date until which the "easier first week" is on (§4.1b) */
  easyUntil?: string
  completedAt?: string
  reflection?: { at: string; note?: string }
  _u?: string
  _dirty?: boolean
}
```

**The calendar rule (the reverted rotation stays reverted).** A plan says "Monday: Legs;
Tuesday: yoga reset + walk". What you train is decided by the weekday, exactly as today.
Nothing in the model tracks "where you are in a sequence". Missed sessions are handled by a
catch-up offer (§4.1b), not by shifting the calendar.

**`Schedule` stays as shipped.** With no active plan (guests, anyone who skips set-up) the
calendar is `settings.schedule`, unchanged. With an active plan, the Plan screen edits
`plan.week`, and the app mirrors `settings.schedule[d]` for older installs and the week strip:
the first built-in Legs/Push/Pull routine that day → that `WorkoutType`; any other session →
`'Cardio'`; none → `'Rest'`. The mirror is written, never read, while a plan is active.

**Lifecycle mechanics (unchanged in substance).** Onboarding or set-up produces one
`state: 'active'` plan. Completing moves it to `'completed'`, from which the user can dismiss
(→ `'archived'`) or re-use (clone → a fresh active plan with `clonedFromId`). Saving as a
blueprint sets `'template'`; "Use template" clones it. Re-use is always a clone. Plans reference
routines by id and do **not** deep-copy them: editing a routine updates every plan that uses it,
which is what "reusable" means. History is safe because sessions snapshot names (§2.5).

### 2.5 Sessions: several a day (additive migration)

```ts
export interface Session {
  id: string
  modality: Modality          // headline discipline
  title: string               // snapshot: "Push", "Evening yoga", "Run"
  routineId?: string          // the routine it was done from, if any
  at?: string                 // ISO time; orders sessions within the day
  mins?: number               // duration; estimated from the routine when absent (§2.9)
  rpe?: number                // optional session effort, 1–10 (Foster's session RPE)
  ex?: LoggedExercise[]       // per-exercise detail; a quick log has none
  cardio?: { key: string; variation?: CardioVariation; km?: number }  // key = CARDIO_MET key
  blocks?: { modality: Modality; mins?: number }[]  // mixed routines: per-block time for burn
  option?: 'shorter' | 'swap' // chosen from a day-of offer (§4.0.5); informational
}

export interface DayLog {
  foods: LoggedFood[]
  supps: Record<string, boolean>
  weight: number | null
  /** legacy single session. New code reads through sessionsOf(); still written as a mirror */
  workout: Workout | null
  /** every session done this day, in order. Absent on days logged before this change */
  sessions?: Session[]
  checkin?: CheckIn | null
}
```

**Reading (`core/domain/sessions.ts`, pure):**
```ts
export function sessionsOf(day: DayLog): Session[]
// day.sessions (when an array) wins; otherwise day.workout?.type → [fromLegacy(day.workout)]; else [].
```
`fromLegacy` maps `Legs/Push/Pull` to a strength session titled from `WORKOUTS[type].title`
with `routineId: 'builtin-<type>'`, resolves each `LoggedExercise.name` to an `exId` through a
static map of the shipped names, and moves plank `reps` into `sec`. `Cardio` maps to a cardio
session with `mins: parseFloat(mins)` and `cardio.key = cardioType`. The legacy id is
deterministic (`legacy-<date>`), so repeated conversions are stable. Conversion is **lazy**:
`loadStateFrom()` does not rewrite old days, so no mass dirty-flag upload happens on update.

**Writing.** Every save writes `sessions` and a best-effort legacy mirror into `workout`, so
older installs still see something sensible: the first built-in Legs/Push/Pull session →
`{ type, ex }`; otherwise the first session → `{ type: 'Cardio', cardioType: <key or 'Other'>,
mins }`; no sessions → `null`. The mirror carries `_mirror: true`. Old installs would crash on
an unknown `type` (`WORKOUTS[logged.type].title`), which is why the mirror never writes a new
type.

**Older installs editing the same day.** If a day has `sessions` and a `workout` **without**
`_mirror`, an older install wrote it after us: `sessionsOf` folds it in as an extra session
rather than dropping it. Bumping the service-worker `CACHE` with this phase moves installs on
quickly anyway.

**Persistence (`persistence.ts`).** `loadStateFrom()` stays defensive: a `sessions` value that
is not an array is treated as absent; entries without `id` or `modality` are skipped, never
thrown on. New `AppState` fields get defaults (§2.8). `ensureMeta()` backfills the new delete
queues.

**Readers to move to `sessionsOf`:** `insights.dayStat` (`done`), `insights.rangeFor` (burn),
`TodayScreen` (ring and burn), `TrainScreen` (banner, last time), `workoutBurn` callers.

### 2.6 Profile & preference additions (ride `settings.profile` JSON: no migration)

`goal` stays at top-level `Profile.goal` (de-dupe ruling 1). Additions, all optional:

```ts
export type Place = 'home' | 'gym' | 'outdoors'
export type Motivation = 'energy' | 'sleep' | 'stress' | 'stronger' | 'enjoy' | 'specific'

export type BodyArea =           // shipped, extended additively
  | 'lower-back' | 'knees' | 'shoulders' | 'elbows' | 'wrists' | 'neck'
  | 'hips' | 'ankles'            // new

export interface TrainingPrefs {
  // shipped: experience, equipment, cardioPrefs, limitations, limitationsNote, emphasis
  daysPerWeek?: 1 | 2 | 3 | 4 | 5 | 6          // widened to allow 1; default 3
  modalities?: Modality[]                      // enjoy or want to try; absent = "not sure yet"
  minutesPerSession?: 10 | 20 | 30 | 45 | 60   // 60 means "60+"
  place?: Place[]                              // maps to default equipment (§4.0.2)
  experienceBy?: Partial<Record<Modality, Experience>>  // asked inline the first time a new modality is added
  // builder only, never in onboarding:
  sessionsPerWeek?: number                     // default = daysPerWeek
  doubles?: boolean                            // two sessions on one day; default false
  mix?: Partial<Record<Modality, number>>      // "Adjust the mix"
}

export interface Profile {
  // ...shipped fields unchanged...
  /** "What would make this feel worth it?" (optional); shown back in the weekly review */
  motivations?: Motivation[]
  motivationNote?: string
  /** pointer to the active training_plans row; absent = no plan yet */
  activePlanId?: string
}

export interface CheckIn {       // shipped: mood, hunger, note, t. New optional signals:
  sleep?: 1 | 2 | 3              // Poor / OK / Good
  stress?: 1 | 2 | 3             // Low / Some / High
  energy?: 1 | 2 | 3             // Low / OK / Good
  soreness?: 1 | 2 | 3           // None / A little / Very; asked on lifting days only
}
```

`motivations` sits on `Profile`, not `TrainingPrefs`, because the weekly review and the
mental-performance features read it too. The check-in signals ride the existing `_checkin`
key in `day_logs.supps`, so they need no schema change.

### 2.7 Built-in routines & plan blueprints (static core data)
- `src/core/data/routines.ts`: the four converted built-ins, plus starter routines such as
  `builtin-bodyweight-a` / `-b` (full body, no equipment), `builtin-yoga-reset-20`,
  `builtin-pilates-core-20`, `builtin-mobility-10`, `builtin-cooldown-legs`,
  `builtin-cooldown-upper`, `builtin-walk-20`. Ids never change.
- `src/core/data/plans.ts`: blueprints the recommender starts from (full body ×1–3,
  upper/lower ×4, PPL ×5–6, and cardio-led and mixed variants). They reference routine ids and
  **preserve Legs → Push → Pull adjacency** wherever lifting days are placed.
- `WORKOUTS` stays exported until Train reads through the library, so nothing breaks mid-way.
  The `npm test` clip check moves to walk the library instead of `WORKOUTS`.

### 2.8 Storage & sync

**Decision: routines get their own table; plans keep their own table with a small JSONB
`week`.** Why not keep routines inside the plan's JSONB:
1. **Routines are reused.** The same "Push" or "Yoga reset" sits in several plans, in
   templates and in ad hoc sessions. Embedded copies drift apart; one row means one edit
   updates everywhere.
2. **Last-write-wins is per record.** With routines embedded, the plan row becomes a hot spot:
   editing a routine on the phone and moving a day on the laptop are two writes to one record,
   and one is lost. Separate rows shrink each conflict to the thing actually edited.
3. **Ad hoc workouts need a home without any plan.** A guest or a user with no plan can still
   build and save workouts.
4. **It is the `recipes` pattern.** A reusable unit, its own owner-RLS'd table, its body in one
   JSON column, snapshots in the log. The sync loop is a copy of a proven one.

Costs, and how they are handled: one more table, RLS policy and sync loop (a copy of recipes);
references can dangle, so routines in use are **soft-deleted** (`archived`) and sessions
snapshot titles and names so history never depends on a routine existing. Inside a routine,
`blocks` stay JSONB: they are always read and written whole, the same reasoning as the earlier
plan-body decision.

```sql
-- P1: several sessions per day. Additive, nullable; no rename. The row-level policy already
-- covers new columns, but this is new synced data, so it goes through security-data review.
alter table public.day_logs add column if not exists sessions jsonb;

-- P3: routines (the user's own workouts).
create table public.routines (
  id          uuid primary key,                 -- client-generated, mirrors recipes
  user_id     uuid not null,
  name        text not null,
  modality    text not null,
  effort      text not null default 'hard',
  source      text not null default 'custom',   -- 'custom' | 'recommended'
  base_id     text,                             -- built-in or routine it was cloned from
  blocks      jsonb not null,                   -- RoutineBlock[]
  est_mins    integer,
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);
alter table public.routines enable row level security;
create policy "owner_full_access" on public.routines
  for all to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);

-- P4: training plans (a weekly arrangement of routines).
create table public.training_plans (
  id               uuid primary key,
  user_id          uuid not null,
  name             text not null,
  source           text not null,                -- 'recommended' | 'custom' | 'edited-recommended'
  state            text not null default 'active',
  goal             text,
  base_template_id text,
  cloned_from_id   uuid,
  week             jsonb not null,               -- PlanWeek
  target_sessions  integer,
  started_at       timestamptz,
  easy_until       date,
  reflection       jsonb,
  completed_at     timestamptz,
  updated_at       timestamptz not null default now()
);
alter table public.training_plans enable row level security;
create policy "owner_full_access" on public.training_plans
  for all to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);
```

- **RLS ships in the same migration as each table**, copied from `docs/security-rls.sql`, and
  both tables are added to that file's `tablename in (...)` arrays. Match `recipes`' column
  defaults and any `updated_at` handling exactly.
- **Local-first.** `AppState` gains `routines: Routine[]` and `trainingPlans: TrainingPlan[]`
  (not `plans`, which would read like `profile.plans`). `SyncMeta` gains `routineDeletes` and
  `planDeletes`. `loadStateFrom()` defaults both arrays to `[]`; `ensureMeta(migrate)` marks them
  dirty for first upload exactly as it does recipes.
- **`sync.ts`.** `to/fromServerRoutine` and `to/fromServerPlan` mappers plus dirty loops
  mirroring recipes; `toServerDay` adds `sessions: x.sessions ?? null` and `fromServerDay`
  reads `row.sessions`. All behind `authed`, so guests stay local-only. Local dirty records win
  on pull, as today.
- **`activePlanId`** rides `settings.profile` (a pointer, not the body).
- **The exercise library, built-in routines and blueprints stay app-shipped static data**: no
  table, no RLS. Owned demo videos are hosted on Bunny CDN (§5.6), not Supabase Storage.
- **Alternative considered for P1:** carry sessions inside the `workout` JSONB under a reserved
  key, like `_checkin` in `supps`, with no DDL. Rejected as the default because an older
  install that saves a workout that day replaces the whole `workout` value and silently drops
  every session. With a separate column an old client's upsert never touches `sessions`.
  Decision D2.

### 2.9 Calorie burn per session and modality

`workoutBurn(workout)` becomes `sessionBurn(session, kg)`, and the day's burn is the sum over
`sessionsOf(day)`. The legacy function stays as a wrapper over `fromLegacy` so callers move one
at a time.

**Per session:** burn = MET × kg × hours, where:
- **MET** comes from the session's modality and effort. Cardio uses `CARDIO_MET[cardio.key]`
  (existing keys unchanged; new keys such as Run, Cycle, Swim, Stair, Jump rope and Intervals
  added). Other modalities use the table below. No effort given → moderate.
- **Hours** come from `mins` if logged, else the routine's `estMins`, else a modality default
  (strength 45, cardio 25 as today, yoga and pilates 30, mobility 10, calisthenics 30).
- **Mixed routines** (for example a circuit plus a stretch cool-down) sum per block:
  Σ block minutes × that block's MET. Block minutes are measured when the session was run with
  Start/Finish, or estimated.

| Modality | Light (Easy, RPE ≤ 4) | Moderate (default) | Vigorous (Hard or Very hard, RPE ≥ 7) |
|---|---|---|---|
| strength (sets) | 3.0 | 3.5 | 5.0 |
| strength or calisthenics as a circuit block | 4.3 | 4.3 | 8.0 |
| calisthenics (sets) | 2.8 | 3.8 | 8.0 |
| yoga | 2.5 | 2.5 | 4.0 (power or vinyasa) |
| pilates | 3.0 | 3.0 | 3.0 |
| mobility and stretching | 2.3 | 2.3 | 2.3 |

Values are approximate from the Compendium of Physical Activities (2024 adult update,
Herrmann et al.) and must be confirmed against its activity codes before shipping.

**Estimating minutes (`estMins`)** from a routine: about 2.5 min per resistance set (work plus
rest), hold seconds + 20 s per hold set, about 1.5 min per sun-salutation round, the listed
minutes for duration slots, the video length for guided sessions.

**Gross vs net MET (decision D5).** Today's formula uses gross MET, which counts the resting
energy the TDEE already includes for that hour. Net MET (MET − 1) is the accurate figure for
extending a budget: a 45-minute moderate strength session at 75 kg is about 197 kcal gross,
141 kcal net. Because burn widens the food range, any change to MET values or to net/gross
needs **nutrition-accuracy** sign-off as well as ship-critic.

**Tone.** Gentle mode hides burn numbers (§4.1c). The current Train banner copy that frames
burn as "more room today" is being raised with Benn separately (§7.4); this plan does not add
new "earn food" framing anywhere.

---

## 3. Recommendation engine (`src/core/domain/recommend.ts`, pure TS)

Maps `goal` + `TrainingPrefs` → a recommended `TrainingPlan` (weekly arrangement) built from
§2.7 blueprints and built-in routines, then tunes the mix, split, prescriptions and volume.
Deterministic, framework-agnostic, unit-testable, and every decision traces to an answer.

### 3.1 Decision logic (in order)
1. **Weekly session count** = `sessionsPerWeek ?? daysPerWeek ?? 3`.
2. **Mix by goal** (the table in §3.2): split the count into **R** (resistance: strength or
   calisthenics), **C** (cardio) and **M** (yoga, pilates or mobility).
3. **Fill each class from preferences.** R uses calisthenics when `place` has no gym (or the
   user prefers calisthenics) and weights when it does; a mix is fine (bodyweight upper body,
   dumbbell legs). C uses `cardioPrefs` ∩ what `place` and `equipment` allow (no pool → no
   swimming; outdoors → walking, running, cycling). M uses yoga, then pilates, then mobility,
   in the order the user picked them; "not sure yet" gives mobility plus one gentle yoga.
4. **Resistance split by R count:** 1–3 → full body; 4 → upper/lower; 5–6 → PPL (Legs → Push →
   Pull adjacency preserved). This used to key off days per week.
5. **Prescriptions by goal** (§3.4) and **session size by minutes** (§3.5).
6. **Volume by confidence** (sets per muscle per week, §3.4 step 3), trimmed to what the time
   allows.
7. **Filters:** equipment and place; "Areas to go easy on" prefers gentler same-slot
   alternatives (§4.0.4); `difficulty` ≤ confidence (per modality via `experienceBy`).
8. **Placement on the calendar:** spread R sessions with a day between where possible; keep
   Legs → Push → Pull order; no hard intervals the day before legs; an M session suits the day
   after legs or the day before a rest day; at least one full rest day (§3.3).
9. **Guardrails** (§3.3) run last and can only make a plan lighter, never harder.

### 3.2 Mixed plans per goal
Counts are weekly sessions. R = resistance, C = cardio, M = yoga, pilates or mobility.

| Goal | 1 | 2 | 3 | 4 | 5 | 6 days available |
|---|---|---|---|---|---|---|
| `build-muscle` | 1R full body | 2R | 3R | 3R + 1M | 4R + 1M | 5R + 1M |
| `increase-strength` | 1R | 2R | 3R | 3R + 1M | 4R + 1M | 4R + 1C + 1M |
| `lose-fat` | 1R | 1R + 1C | 2R + 1C | 2R + 2C | 2R + 2C + 1M | **5 sessions** (2R + 2C + 1M) + an optional light sixth; never a 6-day default |
| `increase-endurance` | 1C | 1R + 1C | 1R + 2C | 2R + 2C | 2R + 3C | 2R + 3C + 1M |

- Benn's example "2 strength + 1 yoga + 2 cardio" is the `lose-fat` × 5 row with yoga as M.
- **Resistance floor:** at least 2 R sessions a week whenever there are 2 or more sessions
  (1 for endurance at 2 sessions), following the WHO and UK guidance on muscle strengthening
  on 2+ days. Two full-body R sessions still train each muscle twice a week.
- **Preferences never force a modality.** If someone picks only yoga and pilates with
  `build-muscle`, the plan is built from their choices and the recommender **offers** two short
  resistance sessions with plain copy ("Yoga and pilates build strength and control. For
  building muscle, two short resistance sessions a week make the biggest difference. Add
  them?"). Declining is fine and never asked again that month.
- **One session a week is a real start.** A 1-day plan is a full-body routine (or a cardio
  session for endurance) with the copy "One session a week is a real start."
- **Doubles** only when `doubles` is on in the builder, and only as hard + light (§3.3).

### 3.3 Load guardrails (mental-performance recommendations)
- **At most one hard session a day.** A second session that day must be light: a walk,
  mobility, gentle yoga or beginner pilates. `effort` is derived at save: strength,
  calisthenics, circuits, intervals and moderate-or-harder cardio over 20 minutes are hard;
  walking, mobility, gentle yoga and beginner pilates are light. Users can override it.
- **Every generated plan has at least one full rest day.** Days-per-week tops out at 6.
- **`lose-fat` never defaults to 6 days** (see §3.2).
- **Large deficit plus high volume:** with `lose-fat` and a large deficit (`targetRate:
  'aggressive'`, or the nutrition engine's deficit at the top of its band), recommended volume
  sits at the low end (about MEV) and progression prompts pause ("Hold steady this week"
  instead of "add a little weight").
- **Soft cap note** (thresholds are **unvalidated judgement calls**, to be reviewed with data):
  more than about 6 hard sessions in 7 days, or doubles 3 days running, shows one gentle note,
  at most once a week: "You've been training a lot lately. How's your energy? A lighter day can
  help."
- **Risk patterns hook (HOOK, owned by mental-performance).** `loadSignals(state)` in core
  returns facts only: hard sessions in the last 7 days, doubles run, a 4-week minutes trend,
  intake trend, recent mood. Rising volume with falling intake and low mood, or notes such as
  "burn off" or "make up for", hand over to the supportive script in `ai-platform-plan.md`
  §4.2 (item 3). The app **never coaches toward more** in response.
- **Gentle mode** hides volume meters and burn numbers (§4.1c).
- These notes sit **next to the MRV meter** in the builder (§4.3): the meter warns about a
  muscle; the guardrails talk about the week as a whole.

### 3.4 Prescriptions and volume by goal (science-backed; kept from revision 2)
1. **Rep / rest / intensity by goal:**
   - **`build-muscle`** (headline focus): **6–15 reps**, about 1–3 min rest, 2–3 RIR.
   - **`increase-strength`**: **3–6 reps** on the main compounds at higher relative intensity,
     **2–4 min rest**; accessories stay in 6–12.
   - **`lose-fat`**: keep **6–15** to *retain* muscle in a deficit (light "toning" weights
     don't preserve muscle), volume toward the low end because recovery is harder in a
     deficit, plus **cardio for fitness**: heart and lung fitness, stamina and how everyday
     effort feels. Cardio is programmed for fitness, not as a way to burn off food.
   - **`increase-endurance`**: **12–20+ reps**, circuits with short rest, plus a genuine cardio
     emphasis with progressive duration or intervals by confidence.
   - **Calisthenics** uses the same bands, measured in reps to within 2–3 of failure. When a
     step passes the top of the range on every set, the card offers the next step in the chain
     (incline push-up → push-up → decline push-up).
   - **Yoga, pilates, mobility** use holds in slow breaths (about 20–45 s, or 5–8 breaths),
     rounds for flows and reps for pilates exercises (about 6–10 controlled reps).
2. **Volume by confidence** (sets per muscle per week): just starting ≈ **10**, getting
   comfortable ≈ **12–16**, confident ≈ **16–20**, within MEV → MAV. `lose-fat` trims low;
   `increase-endurance` spends part of the budget on cardio; builder `emphasis` adds 2–4 sets,
   capped at MRV. A set counts **1.0 toward `primary`** and **0.5 toward each `secondary`**;
   only resistance modalities count. Pilates shows as core work, not hypertrophy volume.
3. **Equipment filter:** swap to the same `pattern`/`primary` with available kit (no barbell →
   dumbbell RDL; no gym → a calisthenics step at the right difficulty).

### 3.5 Session size by minutes
| Minutes | Resistance session shape | M or C session |
|---|---|---|
| 10 | 3 exercises as a circuit, 2 rounds | a 10-minute mobility or yoga routine; a 10-minute walk |
| 20 | 3–4 exercises × 2 sets, opposing pairs as supersets | 20-minute flow or cardio |
| 30 | 4–5 exercises × 2–3 sets | 30 minutes |
| 45 | 5–6 exercises × 3 sets (today's templates) + optional 5-minute cool-down | 45 minutes |
| 60+ | 6–7 exercises + warm-up and cool-down blocks | 60 minutes |

When the time budget can't reach the weekly volume band, the recommender keeps compounds,
drops isolation work first, and says so plainly: "Short sessions still work. Two hard sets per
exercise is enough to make progress."

### 3.6 Evidence base (cite in code comments and the "why this plan" copy)
- **Weekly set volume / MEV–MAV–MRV:** Schoenfeld, Ogborn & Krieger (2017) dose–response
  meta-analysis; Israetel's volume landmarks for the bands.
- **Frequency:** Schoenfeld, Ogborn & Krieger (2016): training a muscle ≥ 2× a week beats 1×
  at matched volume.
- **Proximity to failure:** training about 1–3 reps from failure drives hypertrophy without the
  fatigue cost of failure every set (Robinson, Refalo et al. reviews).
- **Rep range:** hypertrophy occurs across about 5–30 reps when sets go close to failure
  (Schoenfeld et al., 2021).
- **Strength vs hypertrophy loading:** lower reps, higher intensity and longer rest favour
  maximal strength (Schoenfeld et al., 2017; ACSM resistance-training position stand).
- **Muscle retention in a deficit:** resistance training plus adequate protein preserves lean
  mass during fat loss.
- **Calisthenics counts as resistance training:** progressive push-up training gave strength
  and muscle-thickness gains similar to bench press (Kotarsky et al., 2018); push-ups and bench
  press at matched muscle activation gave similar strength gains (Calatayud et al., 2015).
- **Minimum doses work:** low weekly volume taken close to failure still builds strength,
  especially early on (Androulakis-Korakakis et al., 2020), which is why 10- and 20-minute
  sessions are offered rather than dismissed.
- **Activity guidelines:** WHO 2020 guidelines (Bull et al.) and the UK Chief Medical
  Officers' guidelines (2019): 150–300 min moderate or 75–150 min vigorous aerobic activity a
  week, muscle strengthening on 2+ days, and any activity is better than none.
- **Yoga and pilates:** reviews support gains in flexibility, balance, core endurance and
  wellbeing; they do not replace progressive resistance for building muscle or cardio for
  endurance. Specific references to be confirmed and cited at implementation. No treatment or
  pain-relief claims are made in copy.
- **Stretching and warm-ups:** short static stretches (under about 60 s per muscle) have a
  trivial effect on performance (Behm et al., 2016), so a stretch cool-down is fine and a
  dynamic warm-up is preferred before lifting.
- **Session effort:** session RPE × minutes as a simple load measure (Foster et al., 2001).
- **Progressive overload:** Tali already coaches "add weight at the top of the range". Keep it,
  subject to the deficit guardrail in §3.3.

---

## 4. Customisation & plan-builder UX (progressive disclosure)

Two audiences, one surface: **the recommended plan is the default; building and editing are
opt-in and never block the simple path.** Logging something that isn't in any plan is always
one tap away.

## 4.0 Onboarding is the driver (input → recommender → plan)

Every recommender decision traces to a captured answer. Data flows down the chain: *answer →
field → recommender decision → plan.* All additions are optional fields on the existing
`settings.profile` JSON: no `leanplan.v1` rename, no column rename.

### 4.0.1 The shared `goal` contract (fitness owns; nutrition consumes)

| `goal` value | Meaning | What the recommender does | Energy-balance direction (for nutrition) |
|---|---|---|---|
| `lose-fat` | Reduce body fat while keeping muscle | 6–15 reps to keep muscle; volume toward the low end; cardio for fitness; never a 6-day default | **Deficit**; high protein |
| `build-muscle` | Add muscle (headline focus) | 6–15 reps, 1–3 min rest, 2–3 RIR; full MEV → MAV volume | **Slight surplus** or maintenance |
| `increase-strength` | Get stronger on key lifts | Main compounds 3–6 reps, 2–4 min rest; accessories 6–12 | **About maintenance** |
| `increase-endurance` | Improve stamina and muscular endurance | Cardio-led mix; 12–20+ reps and circuits | **Maintenance** |

This coupling is wired: `suggestedTargets()` reads `profile.goal`. A possible fifth goal
("feel better / move more") would change this shared enum and the nutrition engine, so it is a
decision for Benn (D6), not assumed here.

### 4.0.2 Fitness onboarding questions (mental-performance recommendations)

Five or six skippable questions, **one per screen**, after the shared goal question. Skipping
any of them falls back to a sensible default, never a blocker.

| # | Question | Answer type / options | Populates | Drives |
|---|---|---|---|---|
| F1 | "What kinds of movement do you enjoy or want to try?" | Multi: Weights · Cardio · Calisthenics · Yoga · Pilates · Mobility · Not sure yet | `training.modalities` ("Not sure yet" = absent) | How each class in the mix is filled (§3.1 step 3) |
| F2 | "How many days a week suits you?" and "About how long per session?" (one screen) | Days 1–6, default 3 · Time 10 / 20 / 30 / 45 / 60+ min | `training.daysPerWeek`, `training.minutesPerSession` | Session count and mix (§3.2); session size (§3.5) |
| F3 | "How confident do you feel with exercise?" | Just starting · Getting comfortable · Confident | `training.experience` (`beginner` / `intermediate` / `advanced`; enum unchanged) | Volume band, exercise difficulty, progression steps |
| F4 | "Where will you usually move?" | Multi: Home · Gym · Outdoors, then an optional "What do you have at home?" (dumbbells, kettlebell, bands, pull-up bar, bench, mat) | `training.place`, `training.equipment` | Weights vs calisthenics, cardio options, substitutions |
| F5 | "Anything to go easy on?" | Multi: Lower back · Knees · Hips · Ankles · Shoulders · Elbows · Wrists · Neck · Nothing right now, + optional note | `training.limitations`, `limitationsNote` | Prefers gentler alternatives (§4.0.4) |
| F6 | "What would make this feel worth it?" *(optional)* | Multi: More energy · Sleep better · Less stress · Feel stronger · Enjoy moving · A specific goal (+ note) | `profile.motivations`, `motivationNote` | Shown back in the weekly review; tunes "why this plan" copy. Never changes the prescription |

- **Place → default equipment:** home = bodyweight + mat (plus whatever is ticked); gym = the
  full list; outdoors = bodyweight + walking, running and cycling.
- **Never asked in onboarding:** body-fat %, "problem areas", "tone up", appearance targets,
  photos.
- **Moved out of onboarding:** muscle focus areas (`emphasis`) live in the builder only;
  cardio preferences are picked when a cardio session is first added (or inferred from place);
  sessions per week, doubles and the mix are builder settings.
- **Nutrition-owned items flagged for the coordinator** (decision D7): mental-performance
  recommends body-fat % leaves onboarding (it is currently shared question 7) and that
  `targetRate: 'aggressive'` comes off the default path.
- **Body metrics stay shared** (sex, age, height, weight, activity on `Profile`), are not
  re-asked, and are not duplicated into `TrainingPrefs`.

### 4.0.3 Recommender consumption map
- **Session count** ← `daysPerWeek` (+ builder `sessionsPerWeek`, `doubles`).
- **Mix (R / C / M)** ← `goal` (§3.2), then filled from `modalities`, `place`, `equipment`,
  `cardioPrefs`.
- **Resistance split** ← the R count: 1–3 full body · 4 upper/lower · 5–6 PPL.
- **Session size** ← `minutesPerSession`.
- **Volume** ← `experience` (and `experienceBy`), skewed by `goal`, plus builder `emphasis`.
- **Prescriptions** ← `goal`, by modality (§3.4).
- **Exercise choice** ← equipment ∩ difficulty, then "Areas to go easy on" prefers gentler
  alternatives.
- **Guardrails** ← §3.3 (can only lighten).
- **Output** → a `TrainingPlan` (`source: 'recommended'`, `state: 'active'`, `goal` stamped),
  any new recommended routines, and `profile.activePlanId`.

### 4.0.4 Areas to go easy on (wording and safety from mental-performance)
- **Label:** "Areas to go easy on". It is **preference filtering, not clinical exclusion.**
- **Behaviour:** for each flagged area the recommender and the Swap sheet **prefer gentler
  alternatives** for exercises whose `care` includes it, keeping the same slot (pattern or
  target). It only ever swaps or leaves out; it never adds. Examples: knees → split squat with
  support instead of walking lunges, reclined figure-four instead of pigeon; wrists → incline
  push-up on handles, dolphin (forearms) instead of downward dog; lower back → dead bug and
  bird-dog instead of loaded spinal flexion, supported rows; neck → head-down version of the
  hundred; shoulders → landmine or incline press instead of overhead press, no dips.
- **Disclaimer, shown with the question and on every swapped exercise:** "Tali will suggest
  gentler alternatives for these areas. This is general fitness guidance, not medical advice. If
  you have pain, an injury or a health condition, check with your GP or a physiotherapist before
  starting or changing exercise. Stop any movement that causes pain."
- **Red flags** (chest pain, dizziness or faintness, sudden severe pain during exercise): "Please
  stop and get checked. Call NHS 111, or 999 in an emergency."
- **Pregnancy and postnatal:** no special programme; copy says "check with your midwife or GP".
- **Never:** diagnose, offer rehab programmes, claim a movement is safe for a condition, or parse
  `limitationsNote` into a prescription (it is shown back to the user only).

### 4.0.5 Day-of adjustment (HOOK: signals and copy owned by mental-performance)

```ts
// src/core/domain/dayOptions.ts (pure)
export interface DaySignals { sleep?: 1|2|3; stress?: 1|2|3; energy?: 1|2|3; soreness?: 1|2|3 }
export type DayChoice =
  | { kind: 'planned'; routineIds: string[] }
  | { kind: 'shorter'; routineIds: string[] }      // same routines at about 60%
  | { kind: 'swap'; routineId: string }            // mobility, yoga or a walk, 15–20 min
/** Returns the three choices when 2 or more signals are low for this person, else null.
 *  Never computes or exposes a score. */
export function dayOptions(planned: Routine[], today: DaySignals, recent: DaySignals[]): DayChoice[] | null
```

- **Signals:** optional check-in fields sleep (Poor / OK / Good), stress (Low / Some / High),
  energy, and soreness on lifting days only (§2.6).
- **Compared against the person's own recent pattern** (for example worse than their median of
  the last 14 check-ins with that signal; with under a week of history, only the scale's worst
  value counts). **Never a composite "readiness score".** Exact thresholds belong to
  mental-performance.
- **When 2 or more are low, offer three equal choices:** the planned session, a **shorter
  version** (about 60%: each exercise keeps its first sets and drops the last ones, minimum one;
  cardio at about 60% of the minutes at an easy pace; flows with fewer rounds; no progression
  prompts that day), or a **swap** to mobility, yoga or a walk matched to the planned day (legs
  day → hips and hamstrings).
- **Always offered, never auto-changed, never locked;** the planned session stays one tap away.
- **Sample copy:** "Short night? Here are a few options for today. All of them count." and "Swap
  to mobility today. Your plan picks up where you left off." Avoid "readiness low", "recovery
  debt" and "you should rest".
- Fitness owns the mechanics (what "shorter" and "swap" contain); mental-performance owns the
  triggers, copy and safety pathways.

### 4.1 Onboarding flow → first plan
A short, skippable flow (or a "Set up my training" card on Plan / Today, see open question)
asks F1–F6, writes `profile.training` and `profile.motivations`, runs the recommender, saves any
recommended routines and the plan, and sets `profile.activePlanId`. Skipped → today's PPL
calendar, unchanged. A plain-English "Why this plan" explains the mix, the days and the rep
ranges, and names what the person said would make it worth it.

### 4.1a Plan lifecycle UX
- **Active plan** is what Train and Plan render from. At most one active at a time.
- **Completion is by sessions done, not calendar weeks.** A plan carries `targetSessions` (for
  example 18 for a 3-a-week plan). When the count of sessions done from its routines since
  `startedAt` reaches it, the plan closes with a **reflection prompt** ("What felt good? What
  would you change?"), stored on the plan, then offers: **Re-use** (clone to a fresh active
  plan), **Adjust** (clone and edit), or **Dismiss** (→ archived, kept in "Past plans"). "Mark
  plan complete" stays available any time.
- **Save as template** keeps any plan as a reusable blueprint; "Use template" clones it.
  Past, archived and template plans live behind a low-key "My plans" surface.

### 4.1b Missed sessions, restarts and progress (mental-performance recommendations)
- **No "missed" labels and no red.** An unlogged planned day just looks like a day.
- **Catch-up, not sliding.** The next time Train opens after an unlogged planned session, it
  offers it alongside today's: "Pick up with Legs whenever you're ready." Only the most recent
  one from the past 6 days is offered, so they never pile up. The **calendar does not move**:
  Tuesday is still Tuesday's workout. This keeps the reverted rotation model out (decision D4).
- **Progress is sessions per week in a range, not a streak:** "2 this week, your plan is 2–3."
  The range is the planned count minus one to the planned count. No streak counters anywhere.
- **Welcome back.** After 10 or more days with no session: "Welcome back. Want an easier first
  week?" Yes sets `easyUntil` 7 days out, which makes the shorter version (§4.0.5) the
  pre-selected choice for each planned session that week; the full session stays one tap away.

### 4.1c Gentle mode
Gentle mode (`profile.gentle`) already hides calorie numbers and body weight. For training it
also hides volume meters and burn numbers, shows sessions in words ("Two sessions this week"),
and keeps progression prompts in words ("Felt easy? Try a little more next time"). Nothing else
about the plan changes.

### 4.2 Assisted path (audience A: "help me")
- `PlanScreen` shows the recommended week with "Why this plan for you".
- Per exercise: **Swap** (same pattern or target, filtered by equipment and "Areas to go easy
  on"), **Easier / Harder** for progressions, and **Watch example**.
- Per day: add a session from "My workouts", built-ins or the library, within the
  one-hard-session-a-day guard.
- "Reset to recommended" restores from `baseTemplateId`. Editing flips `source` to
  `edited-recommended`.

### 4.3 Power path (audience B: "I've got this")
- **Workout builder:** name it, add exercises from the library (filter by modality, muscle,
  pattern, target, equipment, difficulty), set each slot's prescription, reorder, optionally
  add a warm-up or cool-down, or "Do as a circuit". Saves a `routines` row. "Start now" runs it
  ad hoc on any day.
- **Plan builder:** arrange routines on the weekday calendar (several per day allowed, with the
  hard + light rule), set the target session count, save as active or as a template.
- **Weekly volume meter per muscle** with MEV / MAV / MRV bands warns, never blocks. **Load
  guardrail notes sit next to it** (§3.3). Cardio and M sessions show minutes a week against the
  WHO range instead. Gentle mode hides the meter.
- `emphasis` (focus areas) lives here, not in onboarding.

### 4.3a Premium-gating readiness (architecture only; monetization is out of scope)
- Both builders' create, edit and save mutations sit behind one capability check (`canBuild()`,
  renamed from `canBuildPlans()` because it now covers workouts too), so a future tier flag
  flips one place.
- **Always free:** recommended plans, swap, easier/harder, watch example, the lifecycle, quick
  logging of any modality, several sessions a day, day-of options and all logging.
- Nothing in the data model is tier-specific.

### 4.4 Train screen flow
- The Legs/Push/Pull/Cardio segmented control becomes a **Today list**: planned routines for this
  weekday (active plan, or the legacy schedule), then any catch-up offer, then what has been
  logged. Each logged session can be opened, edited or deleted.
- **Start** a routine → the session editor, using each exercise's log shape (§2.2), with Start
  and Finish setting `mins`. **Log something else** → My workouts, built-ins, or a quick log
  (modality, activity, minutes, optional effort and distance).
- "Doing something else? It only changes today." stays true: ad hoc sessions never edit the
  plan.
- "Last time" is found by `exId` across every session, so progress follows the exercise into any
  routine. The plank name hack goes away (the plank is a `hold`).

---

## 5. Workout / exercise library

### 5.1 Taxonomy (the axes that power filtering and the recommender)
`Modality` (discipline) · `LogShape` (how it is logged) · `MuscleGroup` (volume) ·
`MovementPattern` (resistance swaps and balance) · `MobilityTarget` (mobility, yoga and pilates
swaps, cool-down matching) · `Equipment` (access) · `Experience` (difficulty) · progression chain
and step (calisthenics and pilates) · `care` areas · `CardioVariation`.

### 5.2 Quality bar (every entry)
Safe, balanced, beginner-friendly cue covering setup, the movement and the most common mistake;
gender-neutral, no gym-bro language; en-GB; ×-notation and en-dash ranges (`"3 × 10–12"`,
`"20–40 sec"`). Ids are never reused or renamed. Growth is additive and reviewable per batch.

### 5.3 Starter list with ids
Existing strength entries keep their display names (logs match on them) and gain ids. Combined
entries are split, and the built-in routine keeps the second as its default swap.

**Strength (existing, 17):** `leg-press`, `romanian-deadlift`, `leg-extension`, `calf-raise`,
`plank`, `chest-press`, `incline-db-press`, `db-shoulder-press`, `lateral-raise`,
`triceps-pushdown`, `lat-pulldown`, `seated-cable-row`, `chest-supported-row`, `face-pull`,
`biceps-curl`, `cable-crunch`, `dead-bug`.
**Strength breadth targets:** `goblet-squat`, `back-squat` (confident), `db-split-squat`,
`hip-thrust`, `leg-curl`, `step-up`, `db-bench-press`, `one-arm-db-row`, `cable-fly`,
`overhead-triceps-extension`, `hammer-curl`, `farmer-carry`, `pallof-press`, `kb-swing` (getting
comfortable), `landmine-press`.

**Calisthenics (log `reps` unless noted; chain: step):**
- push: `wall-push-up` (1), `incline-push-up` (2), `push-up` (3), `decline-push-up` (4)
- pull: `inverted-row-high` (1), `inverted-row` (2), `band-assisted-pull-up` (3, band assist),
  `negative-pull-up` (3), `chin-up` (4), `pull-up` (5)
- squat: `sit-to-stand` (1), `bodyweight-squat` (2), `split-squat` (3, per side),
  `bulgarian-split-squat` (4, per side, bench); plus `reverse-lunge` (per side)
- bridge: `glute-bridge` (1), `single-leg-glute-bridge` (2, per side), `bw-hip-thrust` (3, bench)
- dip: `assisted-dip` (1, band or machine), `dip` (2, confident; care: shoulders)
- side plank: `side-plank-knees` (1, hold, per side), `side-plank` (2, hold, per side)
- core: `bird-dog` (per side), `hollow-hold` (hold, getting comfortable), `hanging-knee-raise`
  (getting comfortable, pull-up bar)
- conditioning (modality cardio, `hiit`): `step-jacks`, `mountain-climber`, `squat-thrust`
  (no jump)

**Yoga (log `hold` unless noted):** `mountain-pose`, `downward-dog` (care: wrists, shoulders;
gentler: `dolphin`), `dolphin`, `childs-pose`, `cat-cow` (rounds; also mobility), `low-lunge`
(per side; care: knees), `warrior-2` (per side), `triangle` (per side), `chair-pose`,
`tree-pose` (per side; balance), `bridge-pose`, `sphinx` (then `cobra`), `cobra`,
`seated-forward-fold` (knees bent), `supine-twist` (per side), `reclined-figure-four` (per side),
`pigeon` (getting comfortable; care: knees, hips; gentler: `reclined-figure-four`),
`legs-up-the-wall`, `rest-pose` (savasana).
**Yoga flows (log `rounds`):** `half-sun-salutation` (just starting), `sun-salutation-a`,
`sun-salutation-b` (confident).

**Pilates, mat (log `reps` unless noted; chain where marked):** `pelvic-curl`, `toe-taps`,
`hundred` (breath count; care: neck, head-down option), roll-up chain: `half-roll-back` (1) →
`roll-up` (2, getting comfortable), `single-leg-stretch`, `double-leg-stretch` (getting
comfortable), `single-leg-circles` (per side), `spine-stretch-forward`, `swan-prep`,
`swimming` (prone), `side-lying-leg-series` (per side), `clam` (per side, band optional), `saw`,
`teaser` (confident only). Reformer work is out of the starter set (decision D9).

**Mobility (log `hold` or `reps`):** `worlds-greatest-stretch` (per side), `hip-90-90` (reps),
`open-book` (per side), `half-kneeling-hip-flexor` (per side), `supine-hamstring-stretch` (per
side, strap optional), `wall-calf-stretch` (per side), `knee-to-wall` (reps, per side),
`doorway-chest-stretch`, `cross-body-shoulder` (per side), `thread-the-needle` (per side),
`neck-side-stretch` (gentle; care: neck), `supported-deep-squat` (hold, holding a support),
`band-pull-apart` (reps; also strength), `leg-swings` (per side; warm-up). Plus `cat-cow`
(shared with yoga).

**Cardio (log `duration`):** `cardio-walk`, `cardio-incline-walk`, `cardio-run`,
`cardio-cycle` (outdoor), `cardio-bike` (stationary), `cardio-row`, `cardio-swim`,
`cardio-cross-trainer`, `cardio-stair`, `cardio-jump-rope`, `cardio-intervals`. Each maps to a
`CARDIO_MET` key (existing six unchanged; new keys need nutrition-accuracy sign-off).

That is roughly 120 entries, beyond the earlier 40–60+ target, spread across all six
modalities so every filter always has a substitute.

### 5.4 Left out on purpose (safety over novelty)
Kipping pull-ups; bench dips (end-range shoulder stress); headstand, shoulder stand and plough
(neck load); full lotus (knee torque); wheel and other deep backbends; pilates rollover,
jackknife and neck pull (loaded neck flexion); weighted sit-ups and loaded Russian twists;
behind-the-neck press and pulldown; box and depth jumps in the starter set; pistol squats in
the starter set. `teaser`, `dip` and `pigeon` stay with difficulty and `care` tags.

### 5.5 Demo media for holds, flows and guided sessions
The shipped `ExerciseMedia`/`TempoPhase` model extends additively; both existing clips stay in
the default `reps` mode untouched.

```ts
export type TempoPhaseKind =
  | 'ready' | 'lift' | 'squeeze' | 'lower' | 'stretch'          // shipped
  | 'enter' | 'hold' | 'switch' | 'inhale' | 'exhale' | 'rest'  // new

export interface TempoPhase {
  at: number
  kind: TempoPhaseKind
  rep?: number        // reps mode: rep number; flow mode: round number
  side?: 'L' | 'R'    // per-side clips
  pose?: string       // flow mode: the library id of the pose on screen
}

export interface ExerciseMedia {
  src: string
  poster?: string
  durationSec: number
  tempo: TempoPhase[]
  mode?: 'reps' | 'hold' | 'flow'   // absent = 'reps' (both shipped clips)
  loopFrom?: number                 // hold mode: after the set-up plays once, loop from here
  stream?: boolean                  // guided sessions: HLS from Bunny Stream, never public/videos
}
```

- **reps** (shipped): phase, rep and a 1-2-3 count from the clip's own clock.
- **hold:** the clip shows getting into the pose (`ready` → `enter`) then the steady `hold`,
  which loops from `loopFrom`. The overlay swaps the rep counter for a **hold timer** that counts
  to the slot's prescription (from `rx`, such as 30 s or 5 breaths), with an optional breath
  pacer. The timer runs on the device clock, not the clip clock, because the length comes from
  the prescription, not the footage. Per-side holds show "Switch sides" halfway. When it
  finishes, the timer writes `sec` into the set. **The timer works offline with no clip.**
- **flow:** phases carry `pose` and `inhale` / `exhale`. The overlay shows the pose name and
  "Breathe in" / "Breathe out", and counts rounds instead of reps.
- **guided session** (routine-level `guide`): a long follow-along class, streamed with HLS from
  Bunny Stream. The overlay shows elapsed and total time only; finishing logs the session with
  its minutes. At the shipped bitrate a 20-minute class would be about 35 MB, which is why these
  never go in `public/videos/` and wait for the Bunny move (decision D8).
- **`tempo.ts`:** new labels for the new kinds; a `holdAt(elapsed, targetSec)` helper beside
  `tempoAt`.
- **`npm test` additions:** a hold clip has one `hold` run and `loopFrom` inside it; a flow
  clip's `pose` ids exist in the library; a per-side clip has both `L` and `R`; mode-specific
  kinds only appear in their mode.
- **Form review before any clip is attached.** Clips are generated (Seedance). Generated yoga
  and pilates footage can show unsafe alignment (knee collapsing past the ankle, locked or
  hyperextended joints, a strained neck). Each clip gets a frame-by-frame form check by the
  fitness specialist and is regenerated if it fails, then re-timed as CLAUDE.md requires.

### 5.6 Video hosting: Bunny CDN (kept)
Owned clips move to **Bunny CDN** by changing `VIDEO_BASE` in `core/data/media.ts`: off the app
bundle and out of Supabase, served from a cheap global CDN, so the PWA stays light and video
scales independently. Guided sessions use Bunny Stream (HLS). Remote clips don't need a
`public/sw.js` `CACHE` bump; the service worker keeps leaving video to the network, and logging
never waits on it.

---

## 6. Phased roadmap (each phase independently shippable and ship-critic-reviewable)

Re-sequenced so the first phase ships visible value, and each table lands with the feature that
first writes to it. **Schema / RLS phases need security-data review** as well as ship-critic.

| Phase | Ships | Schema / RLS | Extra reviewers |
|---|---|---|---|
| **P1** Log any movement, as often as you like | Sessions model, several a day, quick log for all six modalities | **Yes:** `day_logs.sessions` column | security-data; nutrition-accuracy (burn) |
| **P2** Exercise library & logging shapes | `exercises.ts`, shapes, hold timer, progressions, "last time" by exercise | No | none |
| **P3** Build your own workout | `routines` table + builder + ad hoc start | **Yes:** new table + RLS | security-data |
| **P4** Plans as your week | `training_plans` table + weekly calendar of routines + lifecycle | **Yes:** new table + RLS | security-data; mental-performance (adherence copy) |
| **P5** Tailored plans | Questionnaire slice + recommender + guardrails + "Areas to go easy on" | No (settings JSON) | mental-performance; nutrition (shared goal fields) |
| **P6** Day-of options | Check-in signals + three choices + soft cap note + risk hook | No (`_checkin` in supps) | mental-performance |
| **P7** Volume readout & builder guardrails | MRV meter, load notes, reset to recommended | No | none |
| **M** Media track (parallel, per clip) | Hold and flow player modes, new clips, Bunny move, guided sessions last | No | fitness form review per clip |

- **P1 (first visible value).** Add `Session`, `DayLog.sessions`, `sessionsOf`/`fromLegacy`,
  the legacy mirror and defensive loads; the `day_logs.sessions` migration and sync mapping.
  Train gets the Today list: the built-in Legs/Push/Pull flows work as now but save as sessions,
  and **"Log something else"** logs weights, calisthenics, cardio, yoga, pilates or mobility with
  minutes and optional effort (and distance for cardio). Several sessions a day, each editable.
  Burn sums per session using the §2.9 table (net vs gross per D5). Today's ring and
  `insights` read `sessionsOf`. Bump the SW `CACHE`. Tests: legacy conversion, mirror, fold-in of
  a non-mirror `workout`, malformed input.
- **P2.** The starter library (§5.3) with ids, built-in routines resolved through it, the log
  shapes in the session editor (reps-only with assist or band, hold timer, rounds, check), "Easier
  / Harder" on progression chains, a read-only library browser with filters, and the clip test
  moved to walk the library. Pure core data plus UI.
- **P3.** `routines` table with RLS in the same migration and in `docs/security-rls.sql`; local
  `routines` + sync loop; the workout builder (§4.3) and "Customise" on built-ins; ad hoc start on
  any day; `canBuild()`.
- **P4.** `training_plans` table with RLS; `trainingPlans` + sync; Plan screen edits the active
  plan's weekday calendar with several routines per day and the hard + light rule; the legacy
  `schedule` mirror; lifecycle with session-count completion and reflection; catch-up offer,
  welcome back and sessions-per-week range (§4.1b).
- **P5.** `TrainingPrefs`/`Profile` additions; the F1–F6 questionnaire (built with the onboarding
  contract's questionnaire phase, and with `onboarding-and-data-flow.md` updated in the same
  change); `recommend.ts` with the mix table, session sizing and guardrails; "Why this plan";
  "Areas to go easy on" with its disclaimer on swapped exercises.
- **P6.** Check-in signals (sleep, stress, energy, soreness on lifting days), `dayOptions`,
  shorter and swap routines, the soft cap note and the `loadSignals` hook.
- **P7.** Per-muscle volume meter with MEV / MAV / MRV bands and the load notes beside it,
  minutes-a-week readout for cardio and M, reset to recommended; hidden in gentle mode.
- **M.** Hold and flow modes in `DemoPlayer` and `tempo.ts` (ships with the first hold clip);
  clips per modality in priority order (plank, push-up, bodyweight squat, downward dog, cat-cow,
  half sun salutation, hundred, world's greatest stretch); the Bunny move; guided sessions last.

**MVP = P1–P4** (log anything, several a day; a real library; build workouts; arrange a week).
P5 makes it tailored; P6–P7 and the media track are additive.

---

## 7. Decisions & open questions

### 7.1 Resolved (Benn's earlier decisions, kept; notes show where this revision refines them)
1. **Plan storage → table-backed.** Dedicated `training_plans` table with a JSONB body and
   promoted `state`/`goal`/`source` columns, owner-RLS in the same migration, `recipes`-style
   sync; `TrainingPrefs` and `activePlanId` ride the settings JSON. *Refined:* the body is now
   `week` (weekday → routine ids), routines get their own table, and the table lands in P4 rather
   than P1 (see D1).
2. **Plan lifecycle → explicit states.** `active` / `completed` / `archived` / `template`;
   dismiss or re-use after completion; re-use is always a clone. *Refined:* completion is by
   sessions done and closes with a reflection (§4.1a).
3. **Four goals, fully supported**, each with distinct programming; app focus stays
   hypertrophy. *Open addition:* a fifth "feel better / move more" goal (D6).
4. **Video hosting → Bunny CDN.** Owned clips off the bundle and out of Supabase. *Refined:*
   clips currently ship in `public/videos/` behind `VIDEO_BASE`; the move is one switch.
5. **Cardio is first-class.** Typed variations, first-class cardio days, cardio-led endurance
   plans. *Refined:* new sessions log cardio as `Session.cardio` + numeric minutes; the legacy
   `cardioType`/`mins` shape stays readable and mirrored.
6. **Library breadth → broad.** *Refined:* about 120 entries across six modalities (§5.3).
7. **Builder is gating-ready; monetization is out of scope.** *Refined:* one `canBuild()` check
   covers the workout builder and the plan builder; quick logging and several sessions a day are
   always free.

### 7.2 Resolved by this revision (from Benn's brief and mental-performance's input)
- Six modalities with a `modality` axis and explicit log shapes (§2.1, §2.2).
- Routines are the reusable unit; plans arrange them by weekday (§2.3, §2.4).
- Several sessions a day through additive `DayLog.sessions`, `workout` kept readable and
  mirrored (§2.5).
- Burn is per session and per modality, summed per day (§2.9).
- Onboarding F1–F6, "Areas to go easy on", day-of options, adherence, gentle mode and load
  guardrails as recommended by mental-performance (§3.3, §4.0.2–§4.1c).

### 7.3 Decisions for Benn (with recommendations)
- **D1. Phase order.** Tables just in time (routines in P3, plans in P4) so P1 ships visible value,
  or all tables up front as revision 2 said? **Recommend just in time**: every table is reviewed
  with its real writer, and nothing sits empty in production.
- **D2. Where sessions sync.** A new nullable `day_logs.sessions` column, or a reserved key inside
  the `workout` JSONB (no DDL)? **Recommend the column**: an old install saving a workout can't
  wipe it, at the cost of one additive migration and a security-data review.
- **D3. Routines in their own table** rather than inside the plan's JSONB. **Recommend own
  table** (§2.8: reuse, per-record last-write-wins, ad hoc workouts, the recipes precedent).
- **D4. Missed sessions.** A catch-up offer on a fixed calendar, or "the plan slides" to the next
  session in sequence? **Recommend the catch-up offer.** Sliding is a rotation pointer, which was
  tried and reverted; the offer gives the same "pick up whenever you're ready" feeling.
- **D5. Net vs gross MET for burn.** **Recommend net (MET − 1)**, so the budget isn't widened by
  energy the TDEE already counts (about 30% less for a typical strength session). Needs
  nutrition-accuracy sign-off; could ship in P1 or separately.
- **D6. A fifth goal, "feel better / move more".** Many people aren't after a body change. It
  touches the shared `Goal` enum and the nutrition engine (it would map to maintenance), and the
  recommender would build a balanced mix (for 4 sessions: 2R + 1C + 1M). **Recommend adding it in
  P5** as a coordinated cross-domain change, with `motivations` covering the "why" in the
  meantime.
- **D7. Onboarding changes vs the shipped contract.** Accept F1–F6 (confidence labels, 1 day a
  week allowed, place before equipment, focus areas and cardio preferences out of onboarding)
  and update `onboarding-and-data-flow.md` in the P5 change? Also for the nutrition side:
  body-fat % out of onboarding and `targetRate: 'aggressive'` off the default path.
  **Recommend yes to all**, with the nutrition items confirmed by the nutrition owner.
- **D8. Guided whole-session videos** (a 20-minute yoga or pilates class). **Recommend deferring**
  to the end of the media track: they need Bunny Stream, cost more to produce, and generated
  long-form footage is hard to form-check. Pose-by-pose flows deliver most of the value first.
- **D9. Pilates reformer and studio equipment.** **Recommend mat only** for the starter set;
  `reformer` exists in `Equipment` so it can be added later without a model change.
- **D10. Onboarding placement (carried over).** A first-run flow or a dismissible "Set up my
  training" card. **Recommend the card**: lower friction, no gated wall, and it suits skippable
  one-per-screen questions.

### 7.4 Flagged separately (not part of this plan's phases)
- **Train banner copy.** `TrainScreen.tsx` (about line 78) says "That gives you about X kcal more
  room today", which frames exercise as earning food. mental-performance is raising this with
  Benn directly; this plan adds no new framing like it.
- **`onboarding-and-data-flow.md`** still lists the revision-2 fitness questions (9–14) and
  `daysPerWeek` 2–6. It needs updating once D7 is decided.
- **`CARDIO_MET` values** for the new cardio keys and the §2.9 table need nutrition-accuracy
  sign-off before they affect anyone's food range.
