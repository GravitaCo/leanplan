# Onboarding & data flow — the shared contract

**Status:** DRAFT, assembled from the nutrition and fitness domain specs (July 2026). The
questionnaire below is **superseded** by [`first-run-onboarding.md`](./first-run-onboarding.md)
(§2 the flow, §2.1 skipped answers, §9 and §13 Benn's decisions). This file stays canonical for
the principle, the field placement rulings, the shared `profile.goal` contract and the July 2026
decisions. The domain docs own the engine internals:
- Nutrition engine → [`personalized-nutrition-targets.md`](./personalized-nutrition-targets.md)
- Fitness recommender → [`workouts-customization-and-library.md`](./workouts-customization-and-library.md) (§4.0)
- Training engine (replaces pick-and-adapt) → [`personalised-training-engine.md`](./personalised-training-engine.md)

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

## Original questionnaire (superseded as a question list)

Kept for the field ownership it records. For the questions themselves, `first-run-onboarding.md`
§2 and `src/core/types.ts` win: they add "Prefer not to say", 1 day a week and the `feel-better`
goal, and leave body-fat %, pace, cardio preferences, focus areas and injury free text out of
onboarding. Ordered as a single onboarding flow. **Owner** = which domain owns the field's canonical
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

The types are in `src/core/types.ts` (`Profile`, `Goal`, `TargetRate`, `TrainingPrefs`), which is
canonical and has moved on from this July sketch (`feel-better`, 1 day a week, `weekdays`,
`minutesPerSession`, `place`, `exPrefs`, and onboarding fields such as `onboardedAt` and
`motivations`).

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
| `feel-better` | See workouts plan D6 ("Feel better and move more") | **Maintenance** 0%, whatever the pace |

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

**Decided since (Benn, 27 Sept 2026):**

- **Onboarding UX placement:** both. A short wizard, then a "finish your setup" card for the
  training details (`first-run-onboarding.md` §9).

## Build sequencing

Superseded by `first-run-onboarding.md` §10 (build phases). Of the July order, steps 1 (data
model) and 2 (goal-aware `suggestedTargets`) shipped in Phases 1+2; the questionnaire, the engine
and the rate-of-loss loop are phased there. The loop's minimum changed: this plan said at least
2 weeks of weigh-ins; `first-run-onboarding.md` §5 says 3 weeks and at least 6 weigh-ins (not
built yet).
