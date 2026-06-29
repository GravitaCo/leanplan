# Workouts: customisation, recommendations & exercise library

**Author:** fitness-workouts specialist · **Status:** plan (no code yet) · **Audience:** Benn + ship-critic

This plan turns Tali's fixed Push/Pull/Legs split into a flexible, science-backed
training system: goal-based recommendations across **four goals**, full customisation, a
broad exercise library (cardio as a first-class category), an explicit plan lifecycle, and
a data model that anticipates per-exercise demo videos. It is written to be shipped in
independently reviewable phases. The headline rule from the charter holds throughout:
**Legs → Push → Pull ordering is preserved, the rotation-based schedule is never
reintroduced, and `src/core/` stays framework-agnostic.**

> **Revision note (Benn's decisions, this pass).** Plan-building is a major part of the
> platform, so the data model is **table-backed from the foundation** — plans/exercises
> live in dedicated, owner-RLS'd Supabase tables, **not** nested in `settings`/`profile`
> JSON. The phases are re-sequenced so the table model is foundational (P0/P1), not
> deferred. Goals are **four** (`lose-fat`, `increase-strength`, `build-muscle`,
> `increase-endurance`) with science-backed programming per goal. Cardio is a first-class
> workout category with typed sub-variations. The library targets the **broad** breadth
> (~40–60+). Plans have an explicit **lifecycle** (active / completed / archived + reusable
> templates via clone). Demo video hosting targets **Bunny CDN**. The plan builder is
> designed so it *can* be feature-gated later, while the core experience stays free —
> **monetization strategy itself is out of scope here** and planned separately.

---

## 1. Current-state analysis

### How it works today
- **Templates are fixed.** `WORKOUTS` (`src/core/data/workouts.ts`) is a hardcoded
  `Record<string, WorkoutTemplate>` keyed by the four `WorkoutType`s (`Legs`, `Push`,
  `Pull`, `Cardio`). Each `WorkoutTemplate` is `{ title, ex: ExerciseTemplate[] }`, and an
  `ExerciseTemplate` is `{ n, t, cue, title? }` — name, a free-text sets×reps string
  (`"3 × 10–12"`), and a coaching cue. There is **no exercise identity** (no id, no muscle
  group, no equipment) — an exercise is just a string baked into a template.
- **The schedule is an editable calendar.** `Schedule = Record<number, WorkoutType | 'Rest'>`
  keyed by weekday (0=Sun…6=Sat). `DEFAULT_SCHEDULE` puts Legs/Push/Pull on Mon/Wed/Fri
  with cardio between. `PlanScreen` lets the user assign any `SESSIONS` value to any day.
  This is the deliberate post-revert design — **do not touch its shape.**
- **Train flow** (`TrainScreen.tsx`): a segmented control over the four types; for lifts it
  renders the fixed template's exercises with weight/reps inputs, shows "last session" for
  progressive-overload reference, and a static "How to progress" footer (keep 2–3 RIR, add
  weight at top of range). "Watch how to perform" is a `howToLink()` YouTube **search**
  URL built from the exercise name — the current stand-in for demo video.
- **Logged data is separate from templates.** `Workout`/`LoggedExercise`/`SetEntry` capture
  what was actually performed and live inside `DayLog.workout`. Templates only seed the
  Train UI; they are never persisted per-user.
- **Cardio already exists in the type system but is under-modelled.** `WorkoutType`
  includes `'Cardio'`, and a logged `Workout` carries `cardioType?: string` + `mins?` for
  cardio sessions (vs `ex?: LoggedExercise[]` for strength). So cardio logging is partly
  there, but cardio has **no library, no typed sub-variations** (running/swimming/etc.), and
  no place in the recommender. We promote it to a first-class category (see §2.1, §5).
- **"Goal" does not exist as a concept.** The only stated-intent signal today is
  `suggestedTargets()` (`nutrition.ts`), which hardcodes a **−500 kcal fat-loss deficit**.
  `Profile` carries `name, sex, age, height, weight?, activityLevel, supplements,
  notificationsEnabled` — no training goal, experience level, equipment access, or
  preferred days/week.

### Persistence & sync (the constraints we design around)
- localStorage key `leanplan.v1` (`persistence.ts`) holds `PersistedState` = `AppState`
  (`target, schedule, profile, days, customFoods, recipes`) + `_meta`. **Never rename the
  key.**
- Supabase tables: `settings` (one row/user: JSON `target`, `schedule`, `profile`),
  `custom_foods`, `recipes`, `day_logs`, `push_subscriptions`. Sync is offline-first,
  per-record dirty flags, last-write-wins (`sync.ts`). RLS locks every row to
  `auth.uid()` (`docs/security-rls.sql`). Guest mode is local-only (`authed=false`).
- **Implication (revised decision).** Plan-building is a major, growing part of the
  platform, so we do **not** nest plans in `settings`/`profile` JSON — that doesn't scale to
  many plans, lifecycle states, reusable templates, or future sharing. Instead the model is
  **table-backed from the foundation**: dedicated, owner-RLS'd Supabase tables for
  user-authored plans, with the offline-first dirty-flag sync pattern already proven by
  `recipes`. Lightweight scalar *preferences* (the user's training goal/experience/equipment
  choices) still ride the existing `settings.profile` JSON since they're a small fixed
  shape; only the unbounded plan content gets its own tables (see §2).

### The specific gaps
1. No exercise identity → can't build a library, can't swap exercises, can't attach a video.
2. No training goal/experience/equipment captured → nothing to recommend *from*.
3. Templates aren't editable or per-user → no customisation, no build-your-own.
4. No volume model → we can't reason about weekly sets per muscle (the core hypertrophy lever).
5. Video is a YouTube search guess, not an owned asset with a stable reference.

---

## 2. Data model design

Design priorities: (a) give exercises a real identity in framework-agnostic core data;
(b) capture goal/experience/equipment on the existing `profile` JSON (small fixed shape, so
it syncs for free); (c) make user plans **first-class and table-backed from the foundation**
— their own owner-RLS'd Supabase tables, not nested in `settings`/`profile` JSON — so the
model scales to many plans, an explicit lifecycle, and reusable templates without a later
re-architecture. The core domain types stay framework-agnostic; the table mapping/sync lives
in `src/data/` exactly as it does for `recipes`.

### 2.1 Exercise library (new core data — `src/core/data/exercises.ts`)
Static, app-shipped, framework-agnostic. Keyed by stable id so templates and logs can
reference exercises without embedding strings.

```ts
// src/core/types.ts  (additions)

export type MuscleGroup =
  | 'chest' | 'back' | 'quads' | 'hamstrings' | 'glutes' | 'shoulders'
  | 'biceps' | 'triceps' | 'calves' | 'core' | 'forearms'

export type MovementPattern =
  | 'horizontal-push' | 'vertical-push' | 'horizontal-pull' | 'vertical-pull'
  | 'squat' | 'hinge' | 'lunge' | 'isolation' | 'carry' | 'core'
  | 'cardio'                      // first-class: cardio entries use this pattern

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band'
  | 'cardio-machine'              // treadmill/rower/bike/elliptical etc.

export type Experience = 'beginner' | 'intermediate' | 'advanced'

/** Cardio is a first-class category with typed sub-variations (see §5). */
export type CardioVariation =
  | 'running' | 'walking' | 'cycling' | 'rowing' | 'swimming'
  | 'elliptical' | 'stair' | 'jump-rope' | 'hiit' | 'other'

/** What kind of exercise this is — drives logging shape (reps/weight vs duration/distance). */
export type ExerciseKind = 'strength' | 'cardio'

/** A library exercise — the canonical definition referenced by plans and logs. */
export interface Exercise {
  /** stable slug id, e.g. 'leg-press' or 'cardio-rowing'. NEVER reused or renamed (logs reference it). */
  id: string
  n: string                       // display name (en-GB)
  kind: ExerciseKind              // 'strength' | 'cardio' — defaults to 'strength'
  pattern: MovementPattern        // cardio entries use 'cardio'
  equipment: Equipment[]          // any of these can perform it (e.g. ['machine','dumbbell'])
  difficulty: Experience
  cue: string                     // the signature coaching cue (en-GB)
  /** FUTURE VIDEO: per-exercise demo media; src empty until we produce our own clip (§5). */
  video?: ExerciseMedia

  // --- strength-only fields (present when kind === 'strength') ---
  primary?: MuscleGroup           // the muscle this is "counted" against for volume
  secondary?: MuscleGroup[]       // assisting muscles (half-credit for volume, see §3)
  /** default programming hint; overridable per plan entry */
  defaultReps?: string            // "3 × 10–12" — keeps the existing ×/en-dash notation
  /** isometric/time-based (planks, carries) → log seconds not reps */
  isHold?: boolean
  /** when true the exercise is unilateral (log per-side); informational for now */
  unilateral?: boolean

  // --- cardio-only fields (present when kind === 'cardio') ---
  cardioVariation?: CardioVariation
  /** default prescription hint for cardio, e.g. "20–30 min" or "5 × 400m" */
  defaultCardio?: string
}

/** Per-exercise demo media. Designed now, populated later. Hosted on Bunny CDN (§5). */
export interface ExerciseMedia {
  /**
   * Owned clip on Bunny CDN. Either a full https URL or a Bunny pull-zone-relative path
   * resolved against a configured base (e.g. `${BUNNY_BASE}/exercises/leg-press.mp4`).
   * Undefined until we produce our own clip.
   */
  src?: string
  poster?: string                 // still frame (Bunny-hosted) shown before play / when offline
  /** interim fallback while we have no owned clip: a YouTube search query string */
  searchFallback?: string
  durationSec?: number
}
```

`howToLink()` stays as the fallback resolver: if `exercise.video?.src` is set, play the
owned Bunny-hosted clip; else build the YouTube search link from
`video?.searchFallback ?? exercise.n`. This means **no UI regression** while the asset
library is empty. Bunny CDN keeps clips off the app bundle, so the PWA stays light and the
clips scale independently (see §5 for the hosting rationale).

### 2.2 Plan & template model (revised core types)
Today `ExerciseTemplate` embeds a name string. We move to **referencing** library
exercises by id, while keeping a per-entry override for sets/reps so a plan can deviate from
the exercise default. Plans are owner-authored rows (table-backed, §2.5) with an explicit
**lifecycle**.

```ts
/** One slot in a workout day: a library exercise + this plan's prescription. */
export interface PlanExercise {
  exId: string                    // -> Exercise.id
  /** strength: override of Exercise.defaultReps; cardio: override of defaultCardio */
  t?: string
  note?: string                   // optional user/coach note for this slot
}

/** A single training day within a plan (e.g. the "Push" day, or a "Rowing" cardio day). */
export interface PlanDay {
  id: string                      // stable within the plan
  label: WorkoutType | string     // 'Legs'|'Push'|'Pull'|'Cardio' OR a custom name
  kind: ExerciseKind              // 'strength' | 'cardio' — a day is one or the other
  /** strength days: muscles targeted — drives Legs→Push→Pull rationale & volume calc */
  focus?: MuscleGroup[]
  /** cardio days: which variation this day is built around */
  cardioVariation?: CardioVariation
  ex: PlanExercise[]
}

export type PlanSource = 'recommended' | 'custom' | 'edited-recommended'

/**
 * Plan lifecycle (Benn's decision):
 *  - 'active'    — the plan the user is currently training. At most one active per user.
 *  - 'completed' — the user finished it; can be dismissed (→ archived) or re-used (→ clone).
 *  - 'archived'  — dismissed/retired; kept for history, not shown in the active surface.
 *  - 'template'  — a reusable blueprint the user saved; re-use = clone into a new active plan.
 */
export type PlanState = 'active' | 'completed' | 'archived' | 'template'

/** A complete training plan: the set of day-templates the user trains from. */
export interface TrainingPlan {
  id: string
  name: string                    // "Push / Pull / Legs", or user-named
  source: PlanSource
  state: PlanState
  /** which built-in recommendation this derived from, for "reset to recommended" */
  baseTemplateId?: string
  /** if this plan was cloned (re-used) from another, the source plan id — provenance only */
  clonedFromId?: string
  goal?: TrainingGoal             // the goal this plan was built/recommended for
  days: PlanDay[]                 // the day-templates (NOT the weekday calendar)
  /** when the plan was marked completed (lifecycle audit / "reuse" UX) */
  completedAt?: string
  _u?: string                     // sync metadata, mirrors Food/Recipe convention
  _dirty?: boolean
}
```

Key separation, unchanged by this work: **`TrainingPlan.days` are reusable day-templates;
`Schedule` still maps weekdays → which day to train.** `Schedule`'s value type widens from
`WorkoutType | 'Rest'` to `string | 'Rest'` so it can name a `PlanDay.label` (a custom
"Upper A" or "Rowing" day), but the **default and shape stay identical** and the
editable-calendar model is untouched. Legacy schedules using bare `WorkoutType` values keep
working.

**Lifecycle mechanics.** Onboarding produces one `state:'active'` plan. When the user marks
a plan complete it becomes `'completed'`, from which they can **dismiss** (→ `'archived'`,
hidden from the active surface but retained for history) or **re-use** (clone → a fresh
`state:'active'` plan with a new `id`, `clonedFromId` set, `_dirty` for sync). Re-use is
always a **clone**, never a mutation of the original, so history stays immutable. Saving a
plan as a reusable blueprint sets `state:'template'`; "use this template" clones it the same
way. At most one `'active'` plan exists per user (enforced in the store/domain, not the DB).

### 2.3 Profile additions (the *preferences* ride existing `settings.profile` JSON — no migration)

The four goals (Benn's decision). The app's overall focus stays hypertrophy, but all four
are supported properly with distinct programming (see §3):

```ts
export type TrainingGoal =
  | 'lose-fat'             // hypertrophy retention in a deficit + conditioning emphasis
  | 'increase-strength'    // lower reps, higher intensity, longer rest on key compounds
  | 'build-muscle'         // hypertrophy — the app's headline focus
  | 'increase-endurance'   // higher reps / circuits + cardio emphasis (may map to cardio plans)

export interface TrainingPrefs {
  goal: TrainingGoal
  experience: Experience
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  equipment: Equipment[]          // what they can access; filters the library
  /** muscles to bias extra volume toward (optional power-user knob) */
  emphasis?: MuscleGroup[]
  /** preferred cardio variations (esp. for increase-endurance), drives cardio-day selection */
  cardioPrefs?: CardioVariation[]
}

export interface Profile {
  // ...existing fields unchanged...
  /** optional so existing rows/migrations load fine; absent = not yet onboarded */
  training?: TrainingPrefs
  /**
   * Pointer to the user's active plan ROW (see §2.5). The plan content itself is NOT
   * stored here — it lives in the `training_plans` table. Absent = no active plan yet.
   */
  activePlanId?: string
}
```

`TrainingPrefs` is a small, fixed shape, so it stays in `settings.profile` JSON and syncs
for free — no migration. Only the unbounded plan *content* is table-backed (§2.5).

### 2.4 Built-in plan blueprints (new core data — `src/core/data/plans.ts`)
A vetted, app-shipped set of `TrainingPlan` blueprints the recommender chooses from and
clones into a user-owned row (full-body ×2–3, upper/lower ×4, PPL ×3 and ×6). These
reference library exercise ids and **preserve the Legs→Push→Pull adjacency** wherever a PPL
ordering applies. Blueprints are static data (`state` is irrelevant on the blueprint; a
chosen blueprint is cloned into a `state:'active'` user row).

For `increase-endurance` the blueprints lean on **cardio-first / circuit** structures and
include first-class cardio days (typed by `CardioVariation`, honouring `cardioPrefs`),
alongside higher-rep resistance work — cardio is not a bolt-on day appended to a lifting
plan but can be the spine of the plan.

### 2.5 Supabase schema — table-backed from the foundation (Benn's decision)

Plans are user-authored content that will grow (multiple plans, lifecycle states, reusable
templates, future sharing), so they get **dedicated owner-RLS'd tables from P1**, not nested
JSON. Decision on normalisation: **one `training_plans` table with the plan body as a JSONB
column**, not fully-normalised day/exercise tables. Rationale: a plan is always read and
written as a whole unit (we never query "all exercises across all plans"), the offline-first
last-write-wins sync in `sync.ts` operates per-record, and JSONB keeps the `to/fromServer`
mapper as simple as `recipes` (which already stores `items` as JSON). Promotable columns
(`state`, `goal`, `source`) are lifted out of the JSON so we can filter/list cheaply.

```sql
-- training_plans: one row per user-authored plan (active/completed/archived/template).
create table public.training_plans (
  id          uuid primary key,                 -- client-generated, mirrors recipes
  user_id     uuid not null,
  name        text not null,
  source      text not null,                     -- 'recommended' | 'custom' | 'edited-recommended'
  state       text not null default 'active',    -- 'active' | 'completed' | 'archived' | 'template'
  goal        text,                              -- TrainingGoal this plan serves
  base_template_id text,                          -- blueprint provenance ("reset to recommended")
  cloned_from_id   uuid,                          -- re-use provenance (nullable)
  days        jsonb not null,                     -- PlanDay[] body (the day-templates)
  completed_at timestamptz,
  updated_at  timestamptz not null default now()
);

-- RLS in the SAME migration (charter hard rule: every new table is owner-locked).
alter table public.training_plans enable row level security;
create policy "owner_full_access" on public.training_plans
  for all to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);
```

- **The RLS policy ships in the same migration as the table** — copy the exact
  `owner_full_access` block from `docs/security-rls.sql` (the `auth.uid()::text = user_id::text`
  pattern that works whether the column is uuid or text), and add `training_plans` to that
  file's `tablename in (...)` arrays so the canonical lockdown script stays complete.
- **Sync (`src/data/sync.ts`):** add `to/fromServerPlan` mappers and a per-record dirty-flag
  loop **mirroring `recipes`** exactly — `_u`/`_dirty` on `TrainingPlan`, last-write-wins,
  gated behind `authed` so guest mode stays local-only. Plans persist locally in
  `leanplan.v1` (a new `plans: TrainingPlan[]` field on `AppState`) so offline-first holds;
  the localStorage key and existing column names are **untouched** (additive only).
- **`activePlanId` lives in `settings.profile`** (a pointer, not the body) so "which plan am
  I training" rides the existing settings sync; the plan body comes from `training_plans`.
- **`persistence.ts > loadStateFrom()`** gets defensive defaults: `plans: []`,
  `profile.training`/`activePlanId` undefined; never crash on absence (older installs).
- **The exercise library and plan blueprints stay app-shipped static data** (like the
  ~336-item food DB) — never user rows, so no table, no RLS. Owned demo videos are hosted on
  **Bunny CDN** (§5), not Supabase Storage.

A future **shared/community template library** (templates authored by us or other users) is
the natural extension of `state:'template'`; not built now, but the schema doesn't preclude
it (add a `visibility`/`author_id` column later). Noted, not assumed.

---

## 3. Recommendation engine (`src/core/domain/recommend.ts`, pure TS)

Maps `TrainingPrefs` → a recommended `TrainingPlan` cloned from §2.4 blueprints, then
tunes split/volume/rep/rest per goal. Deterministic, framework-agnostic, unit-testable. It
must map **all four goals** with science-backed programming.

### Decision logic
1. **Split by days/week** (frequency drives split, evidence below):
   - 2–3 days → **full-body** blueprint (hits each muscle 2–3×/week).
   - 4 days → **upper/lower** (each muscle ~2×/week).
   - 5–6 days → **PPL** (Legs→Push→Pull order preserved; 6 days = ×2 rotation across the
     week via the *calendar*, never a rotation-schedule data structure).
   - For `increase-endurance`, the split is **cardio-led**: more cardio days (typed by
     `cardioPrefs`/`CardioVariation`) plus higher-rep resistance / circuit days, rather than
     a pure lifting split.
2. **Rep / rest / intensity by goal** (the four-goal mapping — science-backed):
   - **`build-muscle`** (headline focus): hypertrophy bands **6–15 reps**, ~1–3 min rest,
     2–3 RIR. The default lens for everything else.
   - **`increase-strength`**: **3–6 reps** on the main compounds at higher relative intensity
     (heavier load), **longer rest ~2–4 min** for full neural recovery; accessory work stays
     in 6–12 for hypertrophy support. Fewer reps × heavier load, more rest.
   - **`lose-fat`**: keep **hypertrophy bands (6–15)** to *retain* muscle in a deficit (you
     don't "tone" with light weights — you preserve muscle and lose fat via the deficit),
     plus added **conditioning/cardio** for energy expenditure. Volume trimmed toward the
     lower end of the band because recovery is harder in a deficit. (The calorie deficit
     itself is a nutrition concern — see the deferred cross-domain note in §7.)
   - **`increase-endurance`**: **higher reps (12–20+) / circuits with short rest** for
     muscular endurance, plus a genuine **cardio emphasis** using first-class cardio days
     (progressive duration/intervals by experience).
3. **Volume by experience** (sets per muscle per week — the central hypertrophy dial):
   - beginner ≈ **10 sets/muscle/week**, intermediate ≈ **12–16**, advanced ≈ **16–20**,
     all within an MEV→MAV band. `lose-fat` trims toward the lower end; `increase-endurance`
     spends part of the weekly budget on cardio rather than added resistance volume;
     `emphasis` muscles get +2–4 sets, capped at MRV.
4. **Equipment filter:** drop/auto-substitute library exercises whose `equipment` doesn't
   intersect `prefs.equipment` (e.g. no barbell → swap barbell RDL for dumbbell RDL — both
   already in the library, same `pattern`/`primary`). Cardio days respect available
   `cardio-machine` equipment and `cardioPrefs` (no pool access → not swimming).
5. **Volume accounting (strength days):** a set on an exercise counts **1.0 toward
   `primary`** and **0.5 toward each `secondary`** muscle. The recommender assembles days
   until each targeted muscle lands in its weekly band, respecting Legs→Push→Pull adjacency.
   Cardio days are accounted separately (duration/sessions, not muscle-set volume).

### Evidence base (cite in code comments + the "why this plan" UI)
- **Weekly set volume / MEV–MAV–MRV:** Schoenfeld, Ogborn & Krieger (2017) dose–response
  meta-analysis — more weekly sets → more growth, ~10+ sets/muscle/week as a productive
  target; Israetel's volume-landmark framework (MEV/MAV/MRV) for the bands.
- **Frequency:** Schoenfeld, Ogborn & Krieger (2016) — training a muscle **≥2×/week** beats
  1×/week at matched volume. This is *why* higher frequencies get full-body/upper-lower.
- **Proximity to failure:** training within ~1–3 reps of failure (RIR) drives hypertrophy
  without the fatigue cost of going to failure every set (Robinson/Refalo et al. reviews).
- **Rep range:** hypertrophy occurs across ~5–30 reps if sets are taken close to failure
  (Schoenfeld et al., 2021 review) — we centre 6–15 for time-efficiency, widen to 12–20+ for
  `increase-endurance` and tighten to 3–6 on main lifts for `increase-strength`.
- **Strength vs. hypertrophy loading:** lower reps at higher relative intensity with longer
  rest favour maximal-strength adaptations (Schoenfeld et al., 2017 strength/hypertrophy
  comparison; ACSM resistance-training position stand) — this is why `increase-strength`
  diverges from the hypertrophy default rather than just adding weight.
- **Muscle retention in a deficit:** resistance training + adequate protein preserves lean
  mass during fat loss (energy-restriction body-composition literature) — `lose-fat` keeps
  hypertrophy-style training rather than switching to "toning"; the deficit is nutritional.
- **Progressive overload:** Tali already coaches "add weight at top of range" — keep it.

All citations live as comments in `recommend.ts` and as plain-English "why" copy in the UI
(no jargon-as-posturing — matches the gender-neutral, no-gym-bro tone).

---

## 4. Customisation & plan-builder UX (progressive disclosure)

Two audiences, one surface, governed by progressive disclosure: **the recommended plan is
the default; building/editing is opt-in and never blocks the simple path.**

### 4.1 Onboarding → goal capture + first plan (new, lightweight)
Users **set a plan during onboarding** (Benn's decision). A short, skippable flow (or a "Set
up my training" card on `PlanScreen` / Today) collects `TrainingPrefs`: goal (one of the
four), experience, days/week, equipment, and — when relevant — cardio preferences. It writes
`profile.training`, calls the recommender, persists the recommended plan as a
`training_plans` row (`source:'recommended'`, `state:'active'`), and sets
`profile.activePlanId`. If skipped, fall back to today's PPL default (no regression). Reuses
existing `field`/`select` primitives and the design tokens.

### 4.1a Plan lifecycle UX (Benn's decision)
- **Active plan** is what Train/Plan render from. At most one active at a time.
- **Mark complete:** when the user finishes a plan (e.g. a block of weeks), a "Mark plan
  complete" action moves it to `state:'completed'` and surfaces a choice:
  - **Dismiss** → `state:'archived'`; removed from the active surface, kept in a
    "Past plans" list for history. (Re-startable later via re-use.)
  - **Re-use** → clones the plan into a fresh `state:'active'` row (`clonedFromId` set) so
    the user repeats it without editing the completed record.
- **Save as template:** any plan can be saved as a reusable blueprint (`state:'template'`);
  "Use template" clones it to active. This is how power users keep a library of their own
  plans. Past/archived/template plans live behind a low-key "My plans" surface so the
  primary experience stays focused on the one active plan.

### 4.2 Assisted path (audience A — "help me")
- `PlanScreen` shows the **recommended plan** with a plain-English "Why this plan for you"
  explainer (frequency, weekly sets/muscle, rep range — sourced from §3).
- Per exercise: **Swap** (offers same-`pattern`/`primary` library alternatives filtered to
  their equipment), **Watch demo** (owned video or fallback), and an at-a-glance volume
  readout ("Chest: 14 sets/week — in range").
- "Reset to recommended" restores from `baseTemplateId`. Editing flips `source` to
  `edited-recommended` but keeps the base link.

### 4.3 Power path (audience B — "I've got this")
- "Build your own plan" enters the **plan builder**: add days, name them, add exercises from
  the library (filter by muscle/pattern/equipment/difficulty), set per-slot sets/reps.
- A live **weekly volume meter per muscle** with MEV/MAV/MRV bands gives science-backed
  guardrails without forcing choices — warns (doesn't block) when a muscle is under MEV or
  over MRV. This is the feature that serves power users *without* dumbing down. Cardio days
  use a duration/sessions readout rather than muscle-set volume.
- Saving writes a `training_plans` row with `source:'custom'` (`state:'active'` when made the
  current plan, or `state:'template'` when saved as a reusable blueprint).

### 4.3a Premium-gating readiness (architecture only — monetization is OUT OF SCOPE here)
The plan **builder** (the audience-B power path) is a candidate premium-tier feature. This
plan does **not** decide monetization — that's planned separately — but the architecture must
not preclude gating later:
- Keep the builder entry point and its create/edit/save mutations behind a single
  capability check (e.g. a `canBuildPlans()` predicate) so a future tier flag flips one place,
  not scattered call sites.
- The **core experience stays free and accessible**: recommended plans, swap/substitute,
  watch-demo, the lifecycle (complete/dismiss/re-use), and all logging. Gating, if it ever
  lands, falls on bespoke from-scratch building, not on getting and following a good plan.
- Nothing in the data model is tier-specific, so gating is purely a UI/capability concern.

### 4.4 Schedule unchanged
`PlanScreen`'s weekday calendar keeps working; its dropdown options become the active
plan's `PlanDay.label`s (strength *and* cardio days, plus `Rest`). `TrainScreen` resolves the
day from the calendar → plan day-template → library exercises, instead of the fixed
`WORKOUTS` map. Cardio days resolve to the cardio logging shape (duration/`cardioType`) that
already exists on `Workout`, so a cardio day is a first-class trainable day, not a special
case bolted onto the calendar.

---

## 5. Workout / exercise library

### Taxonomy (the axes that power filtering & the recommender)
`ExerciseKind` (strength vs cardio) · `MuscleGroup` (volume accounting) · `MovementPattern`
(swaps & balance) · `Equipment` (access filter) · `Experience` difficulty · `CardioVariation`
(cardio sub-type). Strength exercises carry a `primary` muscle (+optional `secondary[]`), a
`pattern`, `equipment[]`, `difficulty`, default reps, the signature cue, and a `video` slot.
Cardio exercises carry a `cardioVariation`, `equipment[]` (often `cardio-machine` or
`bodyweight`), `difficulty`, a default duration/interval hint, the cue, and a `video` slot.

### Cardio as a first-class category (Benn's decision)
Cardio is modelled as its own `kind:'cardio'` slice of the same library — running, walking,
cycling, rowing, swimming, elliptical, stair, jump-rope, HIIT, other — typed by
`CardioVariation`. This makes `increase-endurance` plans able to map to cardio-variation days,
and lets any plan include a genuine cardio day. Logging already supports it: a cardio
`Workout` uses `cardioType` + `mins` (vs `ex[]` for strength), so cardio days flow into the
existing logging shape with no schema break — we just feed them from typed library entries
instead of free text.

### Breadth — the broad library (Benn's decision)
Go with the **comprehensive library (~40–60+ exercises)**, broad coverage across muscle
groups, movement patterns, equipment, and cardio variations — not the minimal curated set.
- **Seed (P2):** migrate every exercise already in `WORKOUTS` into `exercises.ts` with full
  metadata (they're vetted and carry good cues), then fill out the breadth: for each
  `MuscleGroup`/`MovementPattern` provide barbell/dumbbell/machine/cable/bodyweight variants
  where they exist (so the equipment filter always has a substitute), plus the cardio slice.
- **Growth:** purely additive — new entries get a new stable `id`; **ids are never reused or
  renamed** (logs and plans reference them). Every exercise must clear the charter quality
  bar: safe, balanced, a beginner-friendly cue covering setup/movement/common-mistake, no
  ego-lifting novelty. Growth is a fitness-specialist task, reviewable in isolation.

### Video slot — Bunny CDN (Benn's decision)
`ExerciseMedia.src` is the owned demo clip hosted on **Bunny CDN** (a Bunny Stream / pull-zone
URL, or a path resolved against a configured Bunny base). Bunny is chosen for scalability:
clips stay **off the app bundle and out of Supabase**, served from a cheap global CDN, so the
PWA stays light and video scales independently as the library grows. Until clips exist,
`searchFallback`/name drives the existing YouTube link, so **the field exists now and the
pipeline lights up later with zero model changes**. Asset-pipeline thinking: since clips are
remote (not bundled), the `public/sw.js` `CACHE` bump is *not* needed for new clips — instead
plan an offline/poster story (Bunny-hosted `poster` still, lazy-load, optional runtime
caching of viewed clips). The owned-clip rollout is its own phase (§6).

---

## 6. Phased roadmap (each phase independently shippable & ship-critic-reviewable)

Re-sequenced so the **table-backed model is foundational (P0/P1)**, not deferred.

- **Phase 0 — Library data model & types (no UI change).** Add the §2.1–2.2 core types
  (`Exercise` with `kind` + cardio fields, `PlanExercise`/`PlanDay`/`TrainingPlan` with
  lifecycle, the four-goal `TrainingGoal`, `CardioVariation`); create the **broad**
  `exercises.ts` (seeded from `WORKOUTS` + breadth + cardio slice) and `plans.ts` blueprints
  referencing exercise ids. `TrainScreen` reads through a resolver but renders identically.
  Pure groundwork; `npm run typecheck` green; zero behaviour change. *Ships invisibly.*
- **Phase 1 — Table-backed plans (foundation).** Create the `training_plans` table **with its
  owner-RLS policy in the same migration** (§2.5); add `training_plans` to
  `docs/security-rls.sql`; add `plans: TrainingPlan[]` to `AppState`/`persistence.ts`;
  add `to/fromServerPlan` + dirty-flag sync to `sync.ts` mirroring `recipes`; add the
  `activePlanId` pointer to `profile`. No rich UI yet — this is the data backbone everything
  else builds on. *Foundational; security-reviewed before anything writes to it.*
- **Phase 2 — Goal capture + recommendation engine + onboarding plan.** Add `TrainingPrefs`
  to profile, the onboarding/setup flow (sets a plan during onboarding), and `recommend.ts`
  mapping **all four goals**. Recommended plan written as an `active` `training_plans` row.
  Falls back cleanly to today's PPL if skipped. *First user-visible value, on the real model.*
- **Phase 3 — Library surfacing + Swap + Watch demo + plan lifecycle.** Surface the library
  on Train/Plan; per-exercise swap (equipment-filtered, same pattern); the video slot wired
  to the YouTube fallback (Bunny `src` empty for now); and the **complete / dismiss / re-use**
  lifecycle UX (§4.1a). *MVP of customisation for audience A + the lifecycle.*
- **Phase 4 — Edit recommended plan + volume readout.** Per-muscle weekly-set meter with
  MEV/MAV/MRV bands; cardio duration readout; reset-to-recommended. *Closes the assisted loop.*
- **Phase 5 — Build-your-own plan builder.** Full custom plans (`source:'custom'`), live
  volume guardrails, save-as-template. Built behind the `canBuildPlans()` capability check so
  it *can* be gated later (§4.3a). *Serves audience B.*
- **Phase 6 — Owned demo videos on Bunny CDN.** Produce clips, host on Bunny, populate
  `ExerciseMedia.src`/`poster`, swap the fallback for owned playback, add the offline/poster
  story. *Asset work, model already ready; no SW cache bump needed (remote clips).*

MVP = **Phases 0–3** (model + tables + recommendation + customisation/lifecycle).
Everything after is additive and independently reviewable.

---

## 7. Decisions & remaining open questions

### Resolved (Benn's decisions, baked into this revision)
1. **Plan storage → table-backed from the foundation.** Dedicated `training_plans` table
   (JSONB body + promoted `state`/`goal`/`source` columns), owner-RLS in the same migration,
   `recipes`-style sync — built in **P1**, not deferred (§2.5). Plans are *not* nested in
   `settings`/`profile` JSON; only the small `TrainingPrefs` + `activePlanId` pointer ride
   the settings JSON.
2. **Plan lifecycle → explicit states.** `active` / `completed` / `archived` / `template`.
   A plan is set during onboarding; once complete the user can **dismiss** (→ archived) or
   **re-use** (clone → new active). Re-use is always a clone, never a mutation (§2.2, §4.1a).
3. **Four goals, fully supported.** `lose-fat`, `increase-strength`, `build-muscle`,
   `increase-endurance`, each with distinct science-backed programming in the recommender
   (§2.3, §3). App focus stays hypertrophy; all four are first-class.
4. **Video hosting → Bunny CDN.** Owned clips on Bunny, off the app bundle and out of
   Supabase; `searchFallback` stays until owned clips exist (§2.1, §5). Rolls out in P6.
5. **Cardio is first-class.** Its own `kind:'cardio'` library slice with typed
   `CardioVariation`s; first-class cardio `PlanDay`s; `increase-endurance` can map to
   cardio-led plans; logging reuses the existing `cardioType`/`mins` shape (§2.1, §5).
6. **Library breadth → broad (~40–60+).** Comprehensive coverage across muscle groups,
   patterns, equipment, and cardio variations, not the minimal set (§5).
7. **Builder is gating-ready, monetization is out of scope here.** The builder sits behind a
   `canBuildPlans()` capability check so it *can* be feature-gated later; the core experience
   (recommended plans, basic edits, lifecycle, logging) stays free. **Monetization strategy
   itself is planned separately and not decided in this plan** (§4.3a).

### Still open
1. **Goal vs. nutrition coupling (deferred cross-domain integration).** Should
   `training.goal = 'lose-fat'` also drive the nutrition `suggestedTargets` deficit (currently
   always −500 kcal)? This crosses from the fitness domain into nutrition and is a genuine
   cross-domain integration point — **deliberately deferred and documented here, not designed
   now.** Owned jointly with the nutrition specialist when picked up.
2. **Onboarding placement (minor UX).** Dedicated first-run flow vs. a dismissible "Set up
   training" card on Plan/Today. The plan is set during onboarding either way; the card is
   lower-friction and avoids a gated wall — leaning that way, but a UX call to confirm.
