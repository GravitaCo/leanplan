# Onboarding & data flow — the shared contract

**Status:** DRAFT — assembled from the nutrition and fitness domain specs. This is the
authoritative source for the onboarding questionnaire and how each captured field flows
down into the two engines. The domain docs own the engine internals:
- Nutrition engine → [`personalized-nutrition-targets.md`](./personalized-nutrition-targets.md)
- Fitness recommender → [`workouts-customization-and-library.md`](./workouts-customization-and-library.md) (§4.0)

## Principle: onboarding is the driver

The questionnaire is the upstream **source of truth**. Every downstream number — the daily
calorie/macro target and the recommended training plan — must trace back to a captured
answer. No engine invents inputs; it reads what onboarding stored. Design the questionnaire
first; the engines are consumers.

```
                        ┌─────────────────────────┐
   Onboarding  ───────▶ │  Profile + TrainingPrefs │ ─────────┐
   questionnaire        │  (settings JSON, synced) │          │
                        └─────────────────────────┘          │
                             │                    │           │
              body metrics + │                    │ training  │ goal
              bodyFat + rate │                    │ prefs     │ (shared)
                             ▼                    ▼           ▼
                   ┌───────────────────┐   ┌──────────────────────┐
                   │ Nutrition engine  │   │ Fitness recommender  │
                   │ suggestedTargets  │   │ → active TrainingPlan │
                   │ → daily kcal+macros│  └──────────────────────┘
                   └───────────────────┘
```

## Canonical questionnaire (de-duplicated)

Ordered as a single onboarding flow. **Owner** = which domain owns the field's canonical
definition; **Drives** = every downstream consumer. Shared fields appear ONCE.

| # | Question | Answer type | Field | Owner | Drives |
|---|----------|-------------|-------|-------|--------|
| 1 | Biological sex | Male / Female | `profile.sex` | shared | Nutrition: BMR constant |
| 2 | Age | number (yrs) | `profile.age` | shared | Nutrition: BMR |
| 3 | Height | number (cm; accept ft/in) | `profile.height` | shared | Nutrition: BMR |
| 4 | Current weight | number (kg; accept lb) | `profile.weight` | shared | Nutrition: BMR, protein g/kg, %BW-rate |
| 5 | Day-to-day activity | Sedentary / Light / Moderate / Very active | `profile.activityLevel` | shared | Nutrition: TDEE multiplier + deficit depth |
| 6 | **Main goal** | Lose fat / Build muscle / Increase strength / Improve endurance | `profile.goal` | **fitness (enum), both consume** | Nutrition: energy direction+band · Fitness: rep/rest scheme, split skew |
| 7 | Body-fat % *(optional, skippable)* | number (%) | `profile.bodyFat?` | nutrition | Nutrition: deficit depth within band (absent → 15% fallback) |
| 8 | How fast do you want to go? | Steady / Standard / Aggressive | `profile.targetRate?` | nutrition | Nutrition: deficit within band + the 0.5–1.0 %BW/wk rate the dynamic loop checks |
| 9 | Training experience | Beginner / Intermediate / Advanced | `training.experience` | fitness | Fitness: weekly volume band (MEV→MAV→MRV) |
| 10 | Days/week you can train | 2 / 3 / 4 / 5 / 6 | `training.daysPerWeek` | fitness | Fitness: split (full-body / upper-lower / PPL) |
| 11 | Equipment available | multi: Barbell / Dumbbells / Machines / Cables / Bodyweight / Kettlebell / Bands / Cardio machines | `training.equipment` | fitness | Fitness: exercise selection & substitution |
| 12 | Preferred cardio *(shown for endurance)* | multi: Running / Walking / Cycling / Rowing / Swimming / Elliptical / Stair / Jump rope / HIIT / No pref | `training.cardioPrefs` | fitness | Fitness: cardio-day selection |
| 13 | Anything to train around? | multi: Lower back / Knees / Shoulders / Elbows / Wrists / Neck / None + free-text | `training.limitations` (+ `limitationsNote`) | fitness | Fitness: exclude/substitute contraindicated movements (safety-first) |
| 14 | Focus areas? *(optional, power-user)* | multi: muscle groups | `training.emphasis` | fitness | Fitness: +2–4 sets to chosen muscles, capped at MRV |

## De-dupe rulings (mine, as coordinator)

1. **`goal` lives at top-level `Profile.goal`** — NOT `training.goal`. It is a whole-person
   objective consumed by both domains, so it sits above training-specific prefs; the
   recommender reads `profile.goal`, and nutrition reads the same field. This overrides the
   fitness spec's `training.goal` placement — fitness plan §2.3/§4.0 should align to
   `profile.goal`. One field, one write path.
2. **Body metrics (1–5) stay on `Profile`** where they already live — not duplicated into
   `TrainingPrefs`. Fitness reads them; nutrition owns their use.
3. **Fitness-only prefs (9–14) live in `TrainingPrefs`** (nested in the existing
   `settings.profile` JSON per the workouts plan).

## Unified data model (all additive — no `leanplan.v1` or Supabase renames)

```ts
interface Profile {
  // ...existing: name, sex, age, height, weight?, activityLevel, supplements, notificationsEnabled
  goal?: Goal              // #6 — shared, top-level (de-dupe ruling 1)
  bodyFat?: number         // #7 — nutrition
  targetRate?: TargetRate  // #8 — nutrition
  training?: TrainingPrefs // #9–14 — fitness
}

type Goal = 'lose-fat' | 'build-muscle' | 'increase-strength' | 'increase-endurance'
type TargetRate = 'steady' | 'standard' | 'aggressive'

interface TrainingPrefs {           // all optional/additive
  experience?: 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek?: 2 | 3 | 4 | 5 | 6
  equipment?: Equipment[]
  cardioPrefs?: CardioVariation[]
  limitations?: BodyArea[]
  limitationsNote?: string
  emphasis?: MuscleGroup[]
}
```

Both `Profile` additions and `TrainingPrefs` ride the existing `settings.profile` JSON,
synced like today. No migration, no data backfill. Existing users see the new suggested
target on their next target-edit/onboarding (snapshot model — saved targets aren't
retro-changed, consistent with meals).

## Shared `goal` contract (fitness owns the enum; nutrition aligns energy direction)

| `profile.goal` | Fitness recommender | Nutrition energy direction |
|----------------|---------------------|-----------------------------|
| `lose-fat` | Hypertrophy 6–15 reps (retain muscle) + conditioning | **Deficit** −10…−25%, high protein (2.0 g/kg) |
| `build-muscle` | 6–15 reps, full MEV→MAV, 1–3 min rest | **Lean surplus** +5…+10% |
| `increase-strength` | Main lifts 3–6 reps heavy + accessories 6–12 | **~Maintenance** −5…+5% |
| `increase-endurance` | Cardio-led split, 12–20+/circuits | **Maintenance** −10…0% (never a default surplus) |

This table is the single point where the two engines meet: they key off the *same* enum
values, so the training goal and the calorie direction can never silently disagree (the
original cross-domain bug).

## Decisions

**Locked by Benn (2026-07), implemented in Phases 1+2:**

1. **Body-fat % fallback** — single conservative **15%** for v1 (sex-split deferred).
2. **Unset `goal`** — the engine returns `GoalNeeded` and never silently applies a deficit;
   the UI prompts a goal pick (stopgap: inline picker on the Profile sheet until Phase 3).
3. **`goal` placement** — `Profile.goal`, top-level (de-dupe ruling 1 confirmed).
4. **Injuries/limitations** — captured (`training.limitations`, safety-first: only ever
   excludes/substitutes, never programs a risky move). Types shipped; UI in Phase 3.
5. **`targetRate` default** — `'standard'`.

**Still open:**

- **Onboarding UX placement** — a first-run wizard, or a dismissible "complete your setup"
  card that unlocks recommendations progressively? (Affects both domains — decide when the
  Phase-3 questionnaire is designed, so it can be judged against real screens.)

## Build sequencing

The **data model + questionnaire (this doc)** is the foundation both engines' onboarding
phases depend on. Suggested order, each phase ship-critic-reviewed:

1. **Data model** — add `Profile.goal/bodyFat/targetRate` + `TrainingPrefs` (types only, additive).
2. **Nutrition engine core** — goal-aware `suggestedTargets` (ships standalone as a better default even before onboarding).
3. **Onboarding questionnaire** — the shared flow that populates the model; unlocks both engines.
4. **Fitness recommender** — consumes the model → active `TrainingPlan`.
5. **Dynamic-adjustment loop** — rate-of-loss feedback (needs ≥2 weeks of weigh-ins).
