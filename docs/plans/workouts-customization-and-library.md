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

> **Accuracy audit (nutrition-accuracy, September 2026).** The burn and energy sections were
> checked against the code and the 2024 Compendium master list. All 21 new MET codes matched; the
> double count was confirmed and sized; one claim was wrong (an incline code does exist) and has
> been corrected; D5 and D11 are signed off with changes, written into §7.3.

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
- After 10 or more days away (a judgement call): "Welcome back. Want an easier first week?"

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
  Today ("+X kcal of room", `TodayScreen.tsx`) and Train ("That gives you about X kcal more room
  today", `TrainScreen.tsx`). Two accuracy problems, both checked: the `ACTIVITY` multipliers in
  `constants.ts` already count exercise days ("Lightly active (1–3 days/week)"), so logged
  sessions are counted twice (confirmed by nutrition-accuracy: about 135–160 kcal a day for 3 lifts
  and 3 cardio sessions a week); and only `Walk` (3.8), `Incline treadmill` (5.0, but only the
  "very slow" graded code) and the flat strength value (3.5) match a 2024 Compendium code. The
  other four `CARDIO_MET` values differ or have no source, and a blank cardio type silently uses
  4.0, which matches nothing
  (§2.9).
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

## 1a. How training connects to the rest of Tali

Everything in Tali is connected. These are the links, the exact code each one touches today
(checked in the files named), and what this plan changes.

### Mind
| Link | Today (checked in code) | This plan |
|---|---|---|
| Check-in → day-of options | `CheckIn` in `src/core/types.ts` has `mood`, `hunger` (1–5), `note`, `t`. Set in `src/screens/today/CheckinSheet.tsx` through `setCheckin`; labels are `MOODS` and `HUNGER` in `src/core/domain/insights.ts`. Synced inside `day_logs.supps` under `CHECKIN_KEY = '_checkin'` (`src/data/sync.ts`). Nothing in training reads it | Optional `sleep`, `stress`, `energy`, `soreness` (§2.6), read by `dayOptions()` (§4.0.5). Same `_checkin` key, so no schema change |
| Training → mood and sleep in the weekly review | The weekly highlight is built in `src/screens/TodayScreen.tsx` (about line 91) from `weekSummary()` in `insights.ts`: "X of Y planned sessions done". `done` only counts planned days. No mood or sleep in it | `weekSummary` gains session counts across all sessions (as a range, §0.3) and, when there's enough data, a neutral pattern line pairing sessions with the person's own mood and sleep ratings. Wording, the minimum data needed and whether to show it at all are mental-performance's call (HOOK). It describes the person's own pattern, never a claim that exercise treats anything. `profile.motivations` is shown back here |
| Load and risk signals | none | `loadSignals()` (§3.3) feeds mental-performance's risk handling and the supportive script in `ai-platform-plan.md` §4.2 item 3 |

### Nutrition
| Link | Today (checked in code) | This plan |
|---|---|---|
| Goal → targets | `profile.goal` (`Goal` in `types.ts`) → `suggestedTargets(profile, weight)` in `src/core/domain/nutrition.ts`. `goalAdjustPct()` picks the band: `lose-fat` −10…−25%, `build-muscle` +5…+10%, `increase-strength` −5…+5%, `increase-endurance` −10…0% | Unchanged. The training set-up writes the same `profile.goal` (one field, one write path). Plans stamp the goal they were built for. A fifth goal would change both engines (D6) |
| Activity → energy targets | `ACTIVITY` in `src/core/data/constants.ts` sets the TDEE multiplier (1.2 / 1.375 / 1.55 / 1.725), and its labels already count exercise days. `rangeFor()` in `insights.ts` then adds `workoutBurn()` (`src/core/domain/workout.ts`, using `CARDIO_MET` from `constants.ts`, or a flat 3.5 MET × 45 min for strength) to `target.kcal` for the day | Possible double count (§2.9). Recommended (D5): stop adding per-session burn to the range; suggest updating `activityLevel` when a few weeks of logged sessions no longer match it. Energy targets then follow real activity **without "earning food"** (§0.8) |
| Protein per modality and goal | `PROTEIN_PER_KG` in `nutrition.ts`, by goal only: `lose-fat` 2.0, `build-muscle` 1.8, `increase-strength` 1.8, `increase-endurance` 1.6 g/kg (the nutrition plan cites a 1.6–2.2 g/kg consensus, `personalized-nutrition-targets.md` §2.5) | No change proposed. Modality doesn't change protein in Tali; goal already does. A yoga-only or cardio-led plan keeps its goal's anchor. Any change is nutrition-owned (decision D12 in §7.3) |

### Body
| Link | Today (checked in code) | This plan |
|---|---|---|
| Bodyweight for burn | `latestWeight()` in `insights.ts` (the latest logged weight on or before the day, else `profile.weight`); `workoutBurn` falls back to 75 kg | `sessionBurn` uses the same helper |
| Weight trend | `weightWeekDelta()` and `weightSeries()` in `insights.ts`, shown in `TodayScreen.tsx` and `src/screens/body/WeightSheet.tsx`. Gentle mode takes weight off the Summary (copy in `ProfileScreen.tsx`) | Training never comments on weight. Progress in training is sessions a week, reps, holds and load ("last time" by exercise), not body change. The nutrition plan's dynamic-adjustment loop (`personalized-nutrition-targets.md` §3) stays the only thing that reads the weight trend |

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
| any session | session level | minutes (auto from Start/Finish) | effort (Easy / Moderate / Hard / Very hard → RPE 2 / 3 / 5 / 7, the verbal anchors on Foster et al.'s 2001 session-RPE scale) |

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
  /** "easier first week" is on until this date (§4.1b); on Profile so it works with or without a plan */
  easyUntil?: string
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
-- P2: several sessions per day. Additive, nullable; no rename. The row-level policy already
-- covers new columns, but this is new synced data, so it goes through security-data review.
alter table public.day_logs add column if not exists sessions jsonb;

-- P4: routines (the user's own workouts).
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

-- P5: training plans (a weekly arrangement of routines).
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
- **Alternative considered for P2:** carry sessions inside the `workout` JSONB under a reserved
  key, like `_checkin` in `supps`, with no DDL. Rejected as the default because an older
  install that saves a workout that day replaces the whole `workout` value and silently drops
  every session. With a separate column an old client's upsert never touches `sessions`.
  Decision D2.

### 2.9 Calorie burn per session and modality

**First, a problem in today's maths (checked in code).** `ACTIVITY` in
`src/core/data/constants.ts` already describes exercise: "Lightly active (1–3 days/week)",
"Moderately active (3–5 days/week)", "Very active (6–7 days/week)". `suggestedTargets()` in
`src/core/domain/nutrition.ts` multiplies BMR by that factor. Then `rangeFor()` in
`src/core/domain/insights.ts` adds `workoutBurn()` (`src/core/domain/workout.ts`) on top for
every logged session. So someone who says "moderately active" because they train 3–5 days a
week gets those sessions counted twice. This is decision **D5**: the recommendation is
to stop adding per-session burn to the food range, and instead suggest an activity-level update
when logged sessions show the setting is out of date (a suggestion the user accepts, in the
style of the dynamic-adjustment loop in `personalized-nutrition-targets.md` §3). That also meets
§0.8: exercise never "earns" food.

**If burn is still calculated** (for the session card, or if D5 goes the other way), it works
like this. `workoutBurn(workout)` becomes `sessionBurn(session, kg)`; the day is the sum over
`sessionsOf(day)`. The old function stays as a wrapper so callers move one at a time.

- **Formula:** MET × kg × hours, as `workoutBurn` does today. `kg` comes from
  `latestWeight()` (`insights.ts`), falling back to 75 kg as `workoutBurn` does now (the 75 kg
  fallback is an existing unsourced default: judgement call, unvalidated).
- **Minutes:** logged `mins`; else the routine's `estMins`; else a default. Strength 45 and
  cardio 25 are the existing defaults in `workout.ts` (unsourced judgement calls in shipped code);
  yoga 30, pilates 30, calisthenics 30, mobility 10 are new **judgement calls, unvalidated**.
- **Mixed routines** sum per block: Σ block minutes × that block's MET.
- **Effort → MET row:** Easy uses the light code, Moderate (or no answer) the moderate code, Hard
  or Very hard the vigorous code. The mapping is a **judgement call, unvalidated**.

**MET values, from the 2024 Adult Compendium of Physical Activities** (Herrmann et al., 2024),
read from pacompendium.com in September 2026. Codes are given so every value can be checked.

| Tali activity | Light | Moderate (default) | Vigorous |
|---|---|---|---|
| Strength, sets | unknown (no light code) | 02054, 3.5 ("multiple exercises, 8–15 reps") | 02050, 6.0 (vigorous) |
| Strength or calisthenics as a circuit | 02034, 3.5 | 02035, 5.0 | 02040, 7.5 |
| Calisthenics, sets | 02024, 2.8 | 02022, 3.8 | 02020, 7.5 |
| Bodyweight resistance, general | | 02056, 3.0 | 02057, 6.5 |
| Yoga | 02175, 2.3 (general) or 02150, 2.3 (hatha) | 02185, 2.7 (vinyasa) | 02160, 4.0 (power) |
| Sun salutations (flow) | | 02180, 3.5 | |
| Pilates | 02103, 1.8 (traditional, mat) | 02105, 2.8 (general) | unknown |
| Mobility and stretching | 02101, 2.3 ("stretching, mild") | 02101, 2.3 | unknown |

Hot yoga (02155) and high-intensity hatha (02153, 8.0) exist but are not offered in Tali.

**Cardio (`CARDIO_MET`), shipped values checked against the same source:**

| `CARDIO_MET` key | Shipped value | 2024 Compendium | Status |
|---|---|---|---|
| Walk | 3.8 | 17190, 3.8 (2.8–3.4 mph, level, moderate) | **matches** |
| Incline treadmill | 5.0 | 17032, 5.0 (5–20% grade, very slow); 17034, 5.3 (1–5%, moderate to brisk); 17035, 7.0 (6–10%); 17036, 8.8 (11–20%, slow to moderate) | **matches the slowest code only; likely understates typical incline walking by up to ~40%. Split by grade.** |
| Stationary bike | 5.5 | 01200, 6.8 (general); 01216, 5.0 (60 W); 01218, 5.8 (70–80 W) | **no matching code** |
| Cross-trainer | 5.5 | 02048, 5.0 (elliptical, moderate) | **differs** |
| Rower | 6.0 | 02071, 5.0 (< 100 W, moderate); 02070, 7.3 (general, vigorous) | **no matching code** |
| Other | 4.5 | none (a catch-all) | **unsourced, judgement call** |

New keys that can be sourced now: brisk walk 17200, 4.8; jogging 12020, 7.5; running 5 mph
12030, 8.5; running 6 mph 12050, 9.3; outdoor cycling, leisure < 10 mph 01010, 4.0; stair
treadmill 02065, 9.3; elliptical vigorous 02049, 9.0; rowing vigorous 02070, 7.3. Swimming:
18240, 5.8 (freestyle, slow); 18290, 8.0; 18230, 9.8. Jump rope: 15552, 8.3; 15551, 11.8.
Intervals: 02210, 7.0 (HIIT, moderate); 02214, 11.0 (vigorous); 01305, 8.8 (cycling HIIT).
(Codes found by nutrition-accuracy in the 2024 master list; confirm the descriptions before use.)

**Other fixes the audit found:**
- A blank cardio type falls back to **4.0** in `workout.ts`, which is neither `Other` (4.5) nor
  sourced. Use `Other` or show no estimate.
- The Cardio template says "Brisk walk" but defaults to `Walk` (3.8, 17190, 2.8–3.4 mph). Brisk
  is 17200 at 4.8, a mismatch of about 26%. Name and value must agree.
- 02050 (6.0) is "power lifting or body building, vigorous", so treat it as vigorous strength
  with care. There is no light strength code, so "Easy" strength falls back to 3.5.
- Stationary bike: prefer 01216 (5.0) or 01218 (5.8) as the moderate default, not 01200 (6.8).
- **Older users:** the adult Compendium assumes 3.5 mL/kg/min at rest; its companion for adults
  60 and over uses 2.7, so adult values read about 30% high for them. The app has no age
  adjustment today. Open question for implementation.
- Every burn is a group-mean estimate with large individual error (largest for resistance
  training), so copy always says "about".

Correcting the shipped cardio values is decision **D11**.

**`estMins` from a routine** (all **judgement calls, unvalidated**): about 2.5 min per
resistance set including rest, hold seconds + 20 s per hold set, about 1.5 min per
sun-salutation round, listed minutes for duration slots, the video length for guided sessions.

**Gross vs net.** MET × kg × hours is gross: it includes the resting energy (1 MET) the TDEE
already covers for that hour. If burn stays in the range, it should be net (MET − 1). Worked
example, computed: 45 min moderate strength at 75 kg is 3.5 × 75 × 0.75 ≈ 197 kcal gross and
2.5 × 75 × 0.75 ≈ 141 kcal net, about 29% less. The saving is 1/MET, so it varies by activity
(about 56% for mat pilates at 1.8, 26% for walking at 3.8, 13% for jogging at 7.5); never reuse
29% as a blanket figure. Net only removes resting energy: for anyone on a light, moderate or
active level the session is already in the multiplier, so net MET shrinks the double count but
does not remove it. Any change to burn needs **nutrition-accuracy**
sign-off, because it moves the food range.

**Tone (§0.8).** Gentle mode hides burn. No copy presents burn as food room. Phase 1 replaces
the two places that do today.

---

## 3. Recommendation engine (`src/core/domain/recommend.ts`, pure TS)

Maps what the person told us → a recommended weekly plan built from §2.7 blueprints and
built-in routines. Deterministic, framework-agnostic and unit-testable. **Customising to the
person comes first:** every rule below names the input that drives it and where its numbers come
from. A number without a source is labelled **judgement call, unvalidated**. The engine never
invents an input the questionnaire could have asked for (`onboarding-and-data-flow.md`, "onboarding
is the driver").

### 3.1 Rules, their inputs and their sources

| # | Rule | Driven by (field) | Source |
|---|---|---|---|
| 1 | Weekly session count = builder setting, else days a week, else 3 | `training.sessionsPerWeek`, `training.daysPerWeek` | 3 is mental-performance's default: judgement call |
| 2 | Split the count into R / C / M (§3.2) | `profile.goal` + rule 1 | WHO 2020 and UK CMO 2019 for the 2-day strength floor; the rest of the table is a judgement call |
| 3 | Fill R with weights or calisthenics | `training.place`, `training.equipment`, `training.modalities` | Kotarsky et al. 2018; Calatayud et al. 2015 (calisthenics works as resistance training) |
| 4 | Fill C with cardio the person can do | `training.cardioPrefs`, `place`, `equipment` | none needed (a filter) |
| 5 | Fill M with yoga, pilates or mobility, in the order picked | `training.modalities` ("not sure yet" → mobility + gentle yoga) | judgement call |
| 6 | Resistance split: 1–3 R full body, 4 upper/lower, 5–6 PPL (Legs → Push → Pull) | the R count from rule 2 | Schoenfeld et al. 2016 (each muscle ≥ 2× a week); the cut-offs are a judgement call |
| 7 | Session size | `training.minutesPerSession` | §3.5, judgement call |
| 8 | Rep, rest and intensity scheme | `profile.goal` | §3.4 |
| 9 | Weekly sets per muscle | `training.experience` (+ `experienceBy`), skewed by `goal`, plus builder `emphasis` | §3.4 |
| 10 | Exercise choice: kit, then difficulty, then gentler alternatives | `equipment`, `experience`, `training.limitations` | §4.0.4 (preference filtering) |
| 11 | Calendar placement: R spread out, Legs → Push → Pull order, no hard intervals before legs, M after legs or before rest | `daysPerWeek` + the plan's own sessions | charter (L → P → P); the rest is a judgement call |
| 12 | Guardrails, last, only ever lighter (§3.3) | `goal`, `targetRate`, the nutrition deficit, logged sessions | mental-performance; thresholds are judgement calls |
| 13 | "Why this plan" copy lists the inputs used, and the person's `motivations` | all of the above | none needed |

### 3.2 Mixed plans per goal
Counts are weekly sessions. R = resistance (weights or calisthenics), C = cardio, M = yoga,
pilates or mobility. **Driven by** `profile.goal` × session count. **Source:** the 2-a-week
resistance floor follows WHO 2020 (Bull et al.) and the UK CMOs (2019), "muscle strengthening on
2 or more days". Everything else in the table is a **judgement call, unvalidated**.

| Goal | 1 | 2 | 3 | 4 | 5 | 6 days available |
|---|---|---|---|---|---|---|
| `build-muscle` | 1R full body | 2R | 3R | 3R + 1M | 4R + 1M | 5R + 1M |
| `increase-strength` | 1R | 2R | 3R | 3R + 1M | 4R + 1M | 4R + 1C + 1M |
| `lose-fat` | 1R | 1R + 1C | 2R + 1C | 2R + 2C | 2R + 2C + 1M | **5 sessions** (2R + 2C + 1M) + an optional light sixth; never a 6-day default |
| `increase-endurance` | 1C | 1R + 1C | 1R + 2C | 2R + 2C | 2R + 3C | 2R + 3C + 1M |

- Benn's example "2 strength + 1 yoga + 2 cardio" is the `lose-fat` × 5 row, with yoga as M.
- **Preferences are never overruled** (§0.1). If someone picks only yoga and pilates with
  `build-muscle`, the plan is built from their choices and the recommender **offers** two short
  resistance sessions, once: "Yoga and pilates build strength and control. For building muscle,
  two short resistance sessions a week make the biggest difference. Add them?"
- **One session a week is a real start**: a full-body routine (a cardio session for endurance).
- **Doubles** only when `doubles` is on in the builder, and only hard + light (§3.3).

### 3.3 Load guardrails (mental-performance; all thresholds are judgement calls, unvalidated)
| Guardrail | Driven by | Status |
|---|---|---|
| At most one hard session a day; a second is light (walk, mobility, gentle yoga, beginner pilates) | the plan; `Routine.effort` | judgement call |
| Every generated plan has at least one full rest day; days a week tops out at 6 | `daysPerWeek` | judgement call |
| `lose-fat` never defaults to 6 days | `profile.goal` | judgement call |
| Big deficit + high volume → volume at the low end, progression prompts paused ("Hold steady this week") | `profile.goal`, `profile.targetRate`, `suggestedTargets().adjustPct` | judgement call; "big deficit" = `targetRate: 'aggressive'` or `adjustPct` ≤ −20 (the band is −10…−25 in `nutrition.ts`) |
| Soft cap: more than about 6 hard sessions in 7 days, or doubles 3 days running → one gentle note, at most once a week | logged sessions | judgement call, flagged as unvalidated by mental-performance |
| Risk patterns → the supportive script in `ai-platform-plan.md` §4.2 item 3; never coach toward more | `loadSignals()`: hard sessions, doubles run, 4-week minutes trend, intake trend, recent mood, note text | HOOK, owned by mental-performance |
| Gentle mode hides volume meters and burn | `profile.gentle` | §4.1c |

`effort` is derived at save (**judgement call**): strength, calisthenics, circuits, intervals and
moderate-or-harder cardio over 20 minutes are hard; walking, mobility, gentle yoga and beginner
pilates are light. Users can override it. These notes sit **next to the MRV meter** in the
builder (§4.3).

### 3.4 Prescriptions and volume by goal
**Driven by** `profile.goal` (scheme) and `training.experience` (volume).

| Goal | Reps | Rest | Effort | Source |
|---|---|---|---|---|
| `build-muscle` | 6–15 | about 1–3 min | 2–3 reps in reserve | reps: Schoenfeld et al. 2021 (hypertrophy across about 5–30 reps near failure; 6–15 chosen for time, a judgement call); rest: Schoenfeld et al. 2016 (longer rest beat 1 min); RIR: Refalo et al. 2023 |
| `increase-strength` | 3–6 on main compounds, 6–12 accessories | 2–4 min on main lifts | heavier loads | ACSM 2009 position stand (Ratamess et al.): heavy loads (about 1–6 RM) and at least 2–3 min rest on core lifts for strength |
| `lose-fat` | 6–15 | about 1–3 min | 2–3 RIR | same as `build-muscle`; keeping muscle in a deficit relies on resistance training plus protein (see `personalized-nutrition-targets.md` §2.5). Cardio is programmed for fitness, stamina and how everyday effort feels, **not to burn off food** (§0.8) |
| `increase-endurance` | 12–20+, circuits | short | moderate | ACSM 2009: light to moderate loads, higher reps, short rest for local muscular endurance |

- **Calisthenics** uses the same rep bands, taken to within 2–3 reps of failure. When a step
  passes the top of its range on every set, the card offers the next step (incline push-up →
  push-up → decline push-up). Source for counting it as resistance training: Kotarsky et al. 2018,
  Calatayud et al. 2015. The "top of range on every set" trigger is the rule Tali already coaches
  (`TrainScreen.tsx` footer).
- **Stretches and mobility holds:** 10–30 s per hold, building to about 60 s per exercise in
  total (ACSM, Garber et al. 2011). **Yoga holds in breaths** (for example 5 slow breaths) and
  **pilates at about 6–10 controlled reps** are **judgement calls, unvalidated**.
- **Weekly sets per muscle:** about 10 or more sets a week is a productive target (Schoenfeld,
  Ogborn & Krieger 2017, dose–response). The split by confidence (just starting ≈ 10, getting
  comfortable ≈ 12–16, confident ≈ 16–20) follows Israetel's MEV / MAV / MRV practitioner
  guidance: **judgement call, unvalidated**. `lose-fat` trims to the low end; `increase-endurance`
  spends part of the budget on cardio; builder `emphasis` adds 2–4 sets, capped at MRV
  (**judgement call**).
- **Counting sets:** 1.0 toward the `primary` muscle, 0.5 toward each `secondary` (**judgement
  call**, a common practitioner convention). Only resistance modalities count. Pilates shows as
  core work, not hypertrophy volume.
- **Equipment swaps** keep the same `pattern` and `primary` (no barbell → dumbbell RDL).
- **Progressive overload:** "add a little weight at the top of the range" stays, except under the
  big-deficit guardrail (§3.3).

### 3.5 Session size by minutes
**Driven by** `training.minutesPerSession`. The whole table is a **judgement call, unvalidated**,
anchored to today's templates (5–6 exercises at 2–3 sets is about 13–18 sets, roughly 33–45 minutes at the 2.5-minute-a-set estimate in §2.9, before a warm-up).

| Minutes | Resistance session | M or C session |
|---|---|---|
| 10 | 3 exercises as a circuit, 2 rounds | 10-minute mobility or yoga; 10-minute walk |
| 20 | 3–4 exercises × 2 sets, opposing pairs as supersets | 20 minutes |
| 30 | 4–5 exercises × 2–3 sets | 30 minutes |
| 45 | 5–6 exercises × 3 sets + optional 5-minute cool-down | 45 minutes |
| 60+ | 6–7 exercises + warm-up and cool-down | 60 minutes |

When time can't reach the weekly volume band, compounds stay, isolation work goes first, and the
copy says so: "Short sessions still work. Two hard sets per exercise is enough to make progress."
Source: low weekly volume near failure still builds strength (Androulakis-Korakakis et al. 2020).

### 3.6 References (cite in code comments and the "why this plan" copy)
- Schoenfeld, Ogborn & Krieger (2017), J Sports Sci: weekly volume dose–response.
- Schoenfeld, Ogborn & Krieger (2016), Sports Med: training frequency.
- Schoenfeld et al. (2016), J Strength Cond Res: longer rest between sets.
- Schoenfeld et al. (2021), Sports: the repetition continuum.
- Refalo et al. (2023), Sports Med: proximity to failure and hypertrophy.
- Ratamess et al. / ACSM (2009), Med Sci Sports Exerc: progression models in resistance training.
- Garber et al. / ACSM (2011), Med Sci Sports Exerc: quantity and quality of exercise (includes
  flexibility guidance).
- Kotarsky et al. (2018), J Strength Cond Res: progressive push-up training.
- Calatayud et al. (2015), J Strength Cond Res: push-up vs bench press.
- Androulakis-Korakakis et al. (2020), Sports Med: minimum effective dose for strength.
- Behm et al. (2016), Appl Physiol Nutr Metab: short static stretches have a trivial effect on
  performance, so stretch cool-downs are fine and dynamic warm-ups are preferred before lifting.
- Foster et al. (2001), J Strength Cond Res: session RPE.
- Bull et al. / WHO (2020), Br J Sports Med; UK Chief Medical Officers' Physical Activity
  Guidelines (2019): 150–300 min moderate or 75–150 min vigorous aerobic activity a week,
  strength on 2+ days, and any activity beats none.
- Herrmann et al. (2024), J Sport Health Sci: 2024 Adult Compendium of Physical Activities
  (pacompendium.com), for every MET value in §2.9.
- **Yoga and pilates:** reviews suggest gains in flexibility, balance, core endurance and
  wellbeing. **Specific references not yet chosen: to be confirmed and cited at implementation.**
  Until then copy makes no claims beyond "builds strength, control and flexibility", and never a
  treatment or pain claim.
- Author, year and journal above are from the specialist's reference list and must be checked
  against the papers before any of them appear in user-facing copy.

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
| `increase-endurance` | Improve stamina and muscular endurance | Cardio-led mix; 12–20+ reps and circuits | **Maintenance or a small deficit** (`goalAdjustPct` allows −10…0%) |

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
  value counts). The 14 and the one-week cut-off are **judgement calls, unvalidated**. **Never a
  composite "readiness score".** Exact thresholds belong to mental-performance.
- **When 2 or more are low** (mental-performance's threshold, a **judgement call**)**, offer three
  equal choices:** the planned session, a **shorter
  version** (about 60%, a **judgement call**: each exercise keeps its first sets and drops the last ones, minimum one;
  cardio at about 60% of the minutes at an easy pace; flows with fewer rounds; no progression
  prompts that day), or a **swap** to mobility, yoga or a walk matched to the planned day (legs
  day → hips and hamstrings).
- **Always offered, never auto-changed, never locked;** the planned session stays one tap away.
- **Sample copy:** "Short night? Here are a few options for today. All of them count." and "Swap
  to mobility today. Your plan picks up where you left off." Avoid "readiness low", "recovery
  debt" and "you should rest".
- Fitness owns the mechanics (what "shorter" and "swap" contain); mental-performance owns the
  triggers, copy and safety pathways.
- **P1 runs this on today's built-in templates** (planned is `WORKOUTS[type]`); the signature
  above takes routines from P4 onwards. Nothing about the behaviour changes.

### 4.1 Onboarding flow → first plan
A short, skippable flow (or a "Set up my training" card on Plan / Today, see open question)
asks F1–F6, writes `profile.training` and `profile.motivations`, runs the recommender, saves any
recommended routines and the plan, and sets `profile.activePlanId`. Skipped → today's PPL
calendar, unchanged. A plain-English "Why this plan" explains the mix, the days and the rep
ranges, and names what the person said would make it worth it.

### 4.1a Plan lifecycle UX
- **Active plan** is what Train and Plan render from. At most one active at a time.
- **Completion is by sessions done, not calendar weeks.** A plan carries `targetSessions` (for
  example 18 for a 3-a-week plan, six full weeks; the default block length is a **judgement
  call, unvalidated**). When the count of sessions done from its routines since
  `startedAt` reaches it, the plan closes with a **reflection prompt** ("What felt good? What
  would you change?"), stored on the plan, then offers: **Re-use** (clone to a fresh active
  plan), **Adjust** (clone and edit), or **Dismiss** (→ archived, kept in "Past plans"). "Mark
  plan complete" stays available any time.
- **Save as template** keeps any plan as a reusable blueprint; "Use template" clones it.
  Past, archived and template plans live behind a low-key "My plans" surface.

### 4.1b Missed sessions: plans slide, the calendar stays (mental-performance recommendations)
- **No "missed" labels and no red.** An unlogged planned day just looks like a day.
- **The plan slides forward as a choice.** The next time Train opens after an unlogged planned
  session, it offers it alongside today's: "Pick up with Legs whenever you're ready." Only the
  most recent one from the past 6 days is offered (6 is a **judgement call**), so they never pile
  up. Choosing it changes today only. The **calendar does not move**: Tuesday is still Tuesday's
  workout, which keeps the reverted rotation model out (§0.4, D4).
- **Progress is sessions per week in a range, not a streak:** "2 this week, your plan is 2–3."
  The range is the planned count minus one to the planned count (a **judgement call**). No
  streak counters anywhere.
- **Welcome back.** After 10 or more days with no session (mental-performance's figure, a
  **judgement call**): "Welcome back. Want an easier first week?" Yes sets `profile.easyUntil`
  7 days out, which makes the shorter version (§4.0.5) the
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
`CARDIO_MET` key with a Compendium code (§2.9). Swimming, jump rope and intervals now have
candidate codes (§2.9); until each is confirmed and added with its code, they can be logged but show
no burn estimate.

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
  its minutes. At the shipped size (about 0.6 MB for a clip of about 20 s, per CLAUDE.md) a 20-minute class
would be roughly 36 MB (computed), which is why these
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

Phase 1 is **wellbeing-led and needs no database change**, so people feel the difference
quickly. After that, each table lands with the feature that first writes to it. Phases that
touch **Supabase schema or RLS need security-data review** as well as ship-critic. Every phase
must also meet the §0 guardrails listed for it.

| Phase | What people get | Schema / RLS | Extra reviewers |
|---|---|---|---|
| **P1** Wellbeing first | Check-in signals, day-of choices, neutral copy, plans that slide, welcome back | No | mental-performance |
| **P2** Log any movement, several a day | Sessions model; quick log for all six modalities | **Yes:** `day_logs.sessions` column | security-data; nutrition-accuracy (burn) |
| **P3** Exercise library & logging shapes | `exercises.ts`, shapes, hold timer, easier/harder, "last time" by exercise | No | none |
| **P4** Build your own workout | `routines` table, builder, start any workout any day | **Yes:** new table + RLS | security-data |
| **P5** Plans as your week | `training_plans` table, weekly calendar of workouts, lifecycle | **Yes:** new table + RLS | security-data; mental-performance |
| **P6** Tailored plans | Questionnaire, recommender, "Areas to go easy on" | No (settings JSON) | mental-performance; nutrition (shared fields) |
| **P7** Volume readout | Per-muscle meter with load notes, reset to recommended | No | none |
| **M** Media track (parallel) | Hold and flow players, new clips, Bunny move, guided sessions last | No | form review per clip |

### P1. Wellbeing first (no schema change)
Works on today's built-in Legs / Push / Pull / Cardio templates, so it needs none of the new
model. It generalises to routines later without rework.
- **Check-in signals.** `CheckinSheet` gains optional sleep (Poor / OK / Good), stress (Low /
  Some / High) and energy, plus soreness on lifting days. Stored in the existing `_checkin` key
  in `day_logs.supps`.
- **Day-of choices on today's session.** When 2 or more signals are low compared with the
  person's own pattern (`dayOptions`, §4.0.5), Train shows three equal choices: **planned**,
  **shorter** (about 60% of the sets: 3 → 2, 2 → 1, never below 1) or **swap** to a 10-minute
  mobility routine or an easy walk. Two small built-in templates are added for the swap
  ("10-minute mobility", "Easy walk"), written to the usual cue standard. A quiet "Want a lighter
  option?" link is always there too, so nobody has to report a bad night to get one (a
  suggestion for mental-performance to confirm).
- **How it logs today.** Shorter saves the normal `Workout` with an extra `option: 'shorter'`
  field. The swap saves `{ type: 'Cardio', cardioType: 'Mobility' | 'Walk', mins, option:
  'swap' }`. Both are additive fields inside the existing JSONB, and `fromLegacy` maps them
  cleanly in P2. A new `Mobility` `CARDIO_MET` key needs nutrition-accuracy sign-off, because it
  touches the food range.
- **Neutral copy for burn.** The Train banner becomes "**Push** logged for Wednesday." with no
  kcal sentence, and the Today workout tile's "+X kcal of room" becomes "Logged". Final wording
  is mental-performance's call. Whether burn still widens the range quietly is D5.
- **Plans slide.** If the most recent planned session in the last 6 days wasn't logged and
  differs from today's, Train offers "Pick up with Legs whenever you're ready." Choosing it only
  changes today (the existing "it only changes today" behaviour). The calendar never moves.
- **No streaks, no "missed".** Where the week's sessions show, say "2 this week, your plan is
  2–3". Nothing labelled missed, nothing red.
- **Welcome back.** After 10 or more days with no session: "Welcome back. Want an easier first
  week?" Yes sets `profile.easyUntil` 7 days out, which pre-selects the shorter version.
- **Gentle mode** already hides burn on Train and Today; keep it that way.
- **Accuracy checks** (in `npm test`, `scripts/test-core.ts`): `dayOptions` table tests
  (own-pattern comparison, the 2-low rule, and a type with no score field, so a score can't leak
  into the UI); shorter-sets maths on every built-in prescription ("3 × 10–12" → 2 sets,
  "2–3 × 12" → 2, "2 × …" → 1); catch-up picks at most one session and never edits `schedule`;
  a source assert that no screen contains "kcal of room" or "more room today"; every
  `CARDIO_MET` key used by the swap (`Mobility` = 02101, 2.3) has a Compendium code in a new
  `MET_SOURCES` map; old days load unchanged. Bump the SW `CACHE`.

### P2. Log any movement, several a day (schema: `day_logs.sessions`)
`Session`, `DayLog.sessions`, `sessionsOf`/`fromLegacy`, the legacy mirror, defensive loads,
the migration and sync mapping (§2.5, §2.8). Train becomes the Today list: built-ins work as
before but save as sessions, and **"Log something else"** logs any of the six modalities with
minutes, optional effort and, for cardio, distance. Burn sums per session (§2.9). Today's ring and
`insights` read `sessionsOf`. Tests: legacy conversion, the mirror, folding in a non-mirror
`workout`, malformed input.
- **Accuracy checks:** fixtures copied from real stored shapes (strength `{ type, ex }`, cardio
  with string `mins`, plank seconds in `reps`) convert and mirror back losslessly; `sessionBurn`
  of a converted legacy day equals today's `workoutBurn` to the kcal unless D5 or D11 is decided,
  so no number changes silently; every MET used has a `MET_SOURCES` code and value that match
  §2.9, asserted like `check:foods`; the day's burn equals the sum of its sessions.
- **Must ship with:** the soft cap note and the `loadSignals` hook (§3.3), because this is the
  phase that makes doubles possible; day-of choices carried onto sessions (`option`); the
  sessions-per-week range counting sessions; no "earn food" copy on any session; gentle mode
  hiding burn.

### P3. Exercise library & logging shapes (no schema)
The starter library (§5.3), built-ins resolved through it, the log shapes (reps-only with assist
or band, hold timer, rounds, check), "Easier / Harder" on progression chains, a read-only library
browser with filters, and the clip test walking the library.
- **Must ship with:** the §5.4 exclusions; `care` tags with the "Areas to go easy on" disclaimer
  on any swapped exercise (§4.0.4); progression prompts in words in gentle mode; the red-flag
  copy on the hold timer and cue cards.
- **Accuracy checks:** a `check:exercises` script modelled on `check:foods`: unique ids; a
  committed id list so removing or renaming an id fails; every entry has a cue, a valid log
  shape and `defaultRx` in ×/en-dash notation; progression chains have no gaps; `care` uses only
  `BodyArea` values; nothing from the §5.4 list is present; every shipped `WORKOUTS` name maps to
  an id (so "last time" survives the move). The clip test walks the library.

### P4. Build your own workout (schema: `routines` table + RLS)
`routines` with RLS in the same migration and in `docs/security-rls.sql`, local `routines` +
sync, the workout builder (§4.3), "Customise" on built-ins, start any workout on any day,
`canBuild()`.
- **Must ship with:** `effort` (hard / light) set at save for the one-hard-a-day rule; builder
  warnings that never block; "shorter" and "swap" working for any user-built workout.
- **Accuracy checks:** `estMins` against hand-worked examples. Worked check: today's Push template
  is 13–15 working sets (3 + 3 + 3 + 2–3 + 2–3), so about 33–38 min at 2.5 min a set, which is
  shorter than the 45-minute strength default in `workout.ts`; the test pins the estimate, and the
  gap is noted, not hidden; `effort` derivation table tests; RLS verified with the
  queries at the end of `docs/security-rls.sql` for the new table.

### P5. Plans as your week (schema: `training_plans` table + RLS)
`training_plans` with RLS, `trainingPlans` + sync, the Plan screen editing the active plan's
weekday calendar with several workouts a day, the legacy `schedule` mirror, and the lifecycle.
- **Must ship with:** one hard session a day (enforced in generated plans, a gentle warning in
  custom ones); at least one rest day; plans that slide, extended to user workouts; completion by
  sessions done with the reflection prompt; welcome back; the sessions-per-week range.
- **Accuracy checks:** property tests over every blueprint and every edit path: at most one hard
  session a day in generated plans, at least one rest day, `week` keys only 0–6 and no stored
  sequence position (the no-rotation rule as a test); the legacy `schedule` mirror matches the
  rule in §2.4; session-count completion counts only sessions from the plan's routines.

### P6. Tailored plans (no schema: settings JSON)
`TrainingPrefs` and `Profile` additions, the F1–F6 questionnaire (built with the onboarding
contract's questionnaire phase, with `onboarding-and-data-flow.md` updated in the same change),
`recommend.ts` with the mix table, session sizing and guardrails, and "Why this plan".
- **Must ship with:** enjoyment-first questions and the never-ask list (§0.1); "Areas to go easy
  on" wording, disclaimer and red-flag copy (§4.0.4); offer, never force; no 6-day default for
  fat loss; low volume and paused progression in a big deficit; motivations shown back in the
  weekly review.
- **Accuracy checks:** exhaustive tests over every combination of goal × days (1–6) × modalities
  × place × confidence: the resistance floor, no 6-day `lose-fat` default, at least one rest day,
  guardrails only ever lower load, and each plan's "why" lists exactly the input fields that
  drove it (rule 13 in §3.1). A snapshot of the §3.2 table fails if the engine drifts from the
  doc.

### P7. Volume readout (no schema)
Per-muscle MEV / MAV / MRV meter, minutes a week for cardio and M sessions, reset to
recommended.
- **Must ship with:** load notes beside the meter (§3.3); hidden in gentle mode; copy that never
  pushes toward more.
- **Accuracy checks:** volume maths on fixtures (1.0 primary, 0.5 secondary, resistance only);
  band edges match §3.4; gentle mode renders no meter (component test or headless check).

### M. Media track (parallel, per clip; no schema)
Hold and flow modes in `DemoPlayer` and `tempo.ts` (with the first hold clip), clips in priority
order (plank, push-up, bodyweight squat, downward dog, cat-cow, half sun salutation, hundred,
world's greatest stretch), the Bunny move, and guided sessions last (D8).
- **Must ship with:** a frame-by-frame form review of every clip (§5.5); hold timers that work
  offline with no clip; no appearance-focused framing in clips or captions.
- **Accuracy checks:** the §5.5 `npm test` additions (hold run and `loopFrom`, flow pose ids
  exist, per-side clips have L and R), and every clip re-timed from its footage as CLAUDE.md
  requires.

**MVP = P1–P5:** wellbeing-led days, log anything several times a day, a real library, your own
workouts, and a week you arrange. P6 makes it tailored; P7 and the media track add on.

---

## 7. Decisions & open questions

### 7.1 Resolved (Benn's earlier decisions, kept; notes show where this revision refines them)
1. **Plan storage → table-backed.** Dedicated `training_plans` table with a JSONB body and
   promoted `state`/`goal`/`source` columns, owner-RLS in the same migration, `recipes`-style
   sync; `TrainingPrefs` and `activePlanId` ride the settings JSON. *Refined:* the body is now
   `week` (weekday → routine ids), routines get their own table, and the table lands in P5 rather
   than first (see D1).
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

### 7.2 Resolved by this revision (from Benn's brief and direction, and mental-performance's input)
- **Wellbeing first (§0) is binding** on every section and phase; Phase 1 is wellbeing-led.
- Customising to the person comes first: every recommender rule names its input and source (§3.1).
- Every number is sourced or labelled a judgement call; each phase has accuracy checks (§6).
- Six modalities with a `modality` axis and explicit log shapes (§2.1, §2.2).
- Routines are the reusable unit; plans arrange them by weekday (§2.3, §2.4).
- Several sessions a day through additive `DayLog.sessions`, with `workout` kept readable and
  mirrored (§2.5).
- The links to Mind, Nutrition and Body are named against the code (§1a).

### 7.3 Decisions for Benn (with recommendations)
- **D1. Phase order.** Tables just in time (routines in P4, plans in P5) so P1 can be
  wellbeing-led with no schema change, or all tables up front as revision 2 said? **Recommend
  just in time**: each table is reviewed with its real writer, and nothing sits empty in
  production.
- **D2. Where sessions sync (P2).** A new nullable `day_logs.sessions` column, or a reserved key
  inside the `workout` JSONB (no DDL)? **Recommend the column**: an old install saving a workout
  can't wipe it. Costs one additive migration and a security-data review.
- **D3. Routines in their own table** rather than inside the plan's JSONB. **Recommend own
  table** (§2.8: reuse, per-record last-write-wins, ad hoc workouts, the recipes precedent).
- **D4. What "plans slide" means.** Recommended: the missed session is carried forward as a
  choice ("Pick up with Legs whenever you're ready") and the weekday calendar stays put. If you
  meant the calendar itself should shift so the next session is always the missed one, that is the
  rotation schedule that was tried and reverted, so please confirm before anyone builds it.
- **D5. Should logged sessions widen the food range at all?** `ACTIVITY` already counts exercise
  days, so adding session burn on top double counts (§2.9; confirmed by nutrition-accuracy, about
  135–160 kcal a day for 3 lifts and 3 cardio a week, or 36–42% of a typical lose-fat deficit).
  **Recommend: stop adding session burn to the range**, and suggest an activity-level update when
  logged sessions no longer match the setting. nutrition-accuracy **signs off with changes**:
  - **Scope:** for `sedentary` users the right model is target + **net** burn. Either keep net burn
    for sedentary only, or reword the level labels as "daily life, not counting logged training".
    Pick one, so a sedentary person who trains isn't under-fuelled.
  - **The suggestion is computed, not guessed:** logged minutes and MET-hours over 3–4 weeks against
    each level's day band. The user accepts it; it never changes automatically.
  - **History:** `rangeFor` is computed live, so past training days' ranges would drop by about
    119–197 kcal and past "in range" counts would change. Freeze history (old maths before the
    switch date) or accept and explain the shift.
  - **Tell users once**, neutrally: "Your range no longer adds workout estimates, because your
    activity level already includes training. You can update your activity level in Profile."
    Numbers hidden in gentle mode.
  - Stored `target.kcal` is unchanged.
- **D6. A fifth goal, "feel better / move more".** Many people aren't after a body change. It
  touches the shared `Goal` enum, `goalAdjustPct()` (an exhaustive `switch`) and `PROTEIN_PER_KG` (a
  `Record<Goal, number>`) in `nutrition.ts`, plus `GOALS` and `GOAL_TARGET_LABEL` in
  `ProfileScreen.tsx`; TypeScript flags each place that needs the new case. It would map to
  maintenance, and the recommender would build a balanced mix. **Recommend adding it in P6** as a
  coordinated change with the nutrition owner; `motivations` covers the "why" until then.
- **D7. Onboarding changes vs the shipped contract.** Accept F1–F6 (confidence labels, 1 day a
  week allowed, place before equipment, focus areas and cardio preferences out of onboarding) and
  update `onboarding-and-data-flow.md` in the P6 change? And on the nutrition side, take body-fat %
  out of onboarding and `targetRate: 'aggressive'` off the default path? **Recommend yes**, with
  the nutrition items confirmed by the nutrition owner.
- **D8. Guided whole-session videos** (a 20-minute yoga or pilates class). **Recommend deferring**
  to the end of the media track: they need Bunny Stream, cost more to make, and generated
  long-form footage is hard to form-check. Pose-by-pose flows give most of the value first.
- **D9. Pilates reformer and studio kit.** **Recommend mat only** for the starter set; `reformer`
  exists in `Equipment` so it can be added later.
- **D10. Onboarding placement (carried over).** A first-run flow or a dismissible "Set up my
  training" card. **Recommend the card**: lower friction, no gated wall, and it suits skippable
  one-per-screen questions.
- **D11. Fix the shipped `CARDIO_MET` values?** Four of six don't match a 2024 Compendium code,
  and Incline treadmill matches only the slowest graded code (§2.9 table). **Recommend replacing
  them with cited values:** Cross-trainer 5.0 (02048), Rower 5.0 (02071), Stationary bike 5.0
  (01216) or 5.8 (01218), Incline treadmill split by grade (17034 5.3, 17035 7.0, 17036 8.8), the
  silent 4.0 fallback replaced, and "Brisk walk" matched to its value. Record each key's code in
  `MET_SOURCES` and add a test like `check:foods` (there are no tests on `workoutBurn`,
  `CARDIO_MET` or `rangeFor` today). nutrition-accuracy **signs off with these changes**. Ship
  with D5, since both change the same numbers.
- **D12. Protein by modality.** Should a cardio-led or yoga-only plan change protein? **Recommend
  no**: `PROTEIN_PER_KG` is already set by goal, and modality adds nothing we can source. This is
  the nutrition owner's call if it's ever revisited.

### 7.4 Flagged separately (not part of this plan's phases)
- **`onboarding-and-data-flow.md`** still lists the revision-2 fitness questions (9–14) and
  `daysPerWeek` 2–6. It needs updating once D7 is decided.
- **References in §3.6** come from the specialist's reference list. They must be checked against
  the papers before any appears in user-facing copy, and the yoga and pilates references are not
  chosen yet.
- **The "kcal of room" copy** (Train banner and Today tile) is now in P1 at Benn's direction;
  mental-performance still owns the final wording.
