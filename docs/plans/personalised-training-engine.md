# Personalised training engine: real tailoring, not a quiz in front of a template

**Author:** fitness-workouts · **Status:** DRAFT design, 27 Sept 2026 (no code yet) ·
**Answers:** `first-run-onboarding.md` §9 ("not pick-and-adapt") and §11 (the "not fake" test) ·
**Reviewers:** Benn, ship-critic, mental-performance (guardrails, copy), security-data (new fields)

**In short**
- Real personalisation in the apps that do it well comes from three things: **hard constraints
  honoured** (time, kit, body areas, what you enjoy), **a model of the person's own performance
  per exercise**, and **a feedback loop that changes the next session or week**. The fake kind is
  a long quiz in front of a fixed template, "scores" built from demographics, and "AI" labels.
- The research agrees. People vary hugely in how they respond to the same programme (Hubal 2005,
  Ahtiainen 2016), and age and sex don't predict it. So the only honest way to tailor is to
  **build within the person's constraints on day 1, then adapt to their own logged data**.
- Tali's engine (`core/domain/engine/`, pure TS, offline, deterministic) **generates** each plan
  from the exercise library. Every prescription carries a **why trace**, and property tests fail
  the build if a question we ask doesn't change the plan, or if the plan claims a reason it didn't
  use.
- All wellbeing rules from `workouts-customization-and-library.md` §0 still apply:
  - progression is suggest-only
  - no streaks and no "missed"
  - no earning food
  - load guardrails
  - gentle mode
  - the weekday calendar (never a rotation)
  - Legs → Push → Pull adjacency

---

## 1. What other apps actually do

| App | Real personalisation | Cosmetic or weak |
|---|---|---|
| **Fitbod** | A per-exercise e1RM from logged sets (Epley/Brzycki-type equations), updated every session. A recovery % per muscle steers exercise choice. Equipment filter. Exercises you add, remove or favourite shape later picks. Logged RIR changes the next load. [1] | "Recovery" is modelled from time and load, not measured. Starting weights for a new exercise come from other users. Reviewers say sessions can feel random, with no clear progression week to week (the loudest critic is a competitor, so allow for bias). [2] |
| **RP Hypertrophy** | Volume per muscle moves week to week from post-session feedback (pump, soreness, workload, joint pain, performance), within the MEV → MRV landmarks, then a deload. [3] | "Pump" is a weak stand-in for growth. Hypertrophy and gym only. |
| **JuggernautAI** | A daily readiness check (sleep, soreness, motivation, food) adjusts that day's loads. Per-set RPE against target recalibrates later sets and sessions. [4] | Only as good as honest ratings (their reviewers say so). Built for powerlifting. |
| **Freeletics** | Rating difficulty after each session adjusts the next one. Skill progressions. New users start from a group of similar users. [5] | Reviewers say sessions repeat. "90% accuracy after week one" is a marketing figure with no stated method. |
| **Future, Caliber** | A human coach edits the plan every week (Future also reads Apple Watch heart rate). [6] | Caliber's Strength Score is scored against age, sex and bodyweight norms: a scoring layer, not programming. Cost is about $150–200 a month. |
| **Ladder** | Honest about its model: you choose a team and coach. [7] | Everyone on a team does the same workouts. "Personalised" means which team you picked. |
| **Apple Fitness+, Peloton plans** | A schedule and class picker based on your history, days, durations, trainers and music. [8] | No load or volume progression. It picks content; it doesn't prescribe training. |
| **Quiz-funnel apps (e.g. BetterMe)** | none | A long quiz leads into template plans. Users who compared found identical plans despite different answers. [9] This is the trap Benn's research found. |

**What this means for Tali.** Real personalisation is visible in the output and can be checked:
change an answer or a logged set and the plan changes, and the app can say why. Anything we ask
that changes nothing is fake personalisation, and §3.7 makes that a failing test.

## 2. The evidence: why personalisation has to come from the person's own data

- **Response varies a lot and isn't predicted by bio data.**
  - Hubal 2005 (n = 585, 12 weeks of arm training): muscle size changed −2 to +59%, 1RM 0 to +250%. [10]
  - Ahtiainen 2016 (n = 287, ages 19–78): size −11 to +30%, strength −8 to +60%. **Age and sex
    did not affect the response.** [11]
- **Much of the apparent variation is noise.** Measurement error and day-to-day swings inflate
  "responder" labels. A true individual response needs repeated measures, and whether someone
  looks like a responder depends on the dose and the outcome chosen (Hecksteden 2015). [12] So
  Tali must smooth over several sessions and never label people.
- **"Non-response" is often a dose problem.** In Montero & Lundby 2017, fitness non-response fell
  as weekly minutes rose, and disappeared after +120 min a week. [13] Within the same people,
  moderate volume clearly beat low volume for 13 of 34 (size) and 16 of 34 (strength); the rest
  showed no clear difference (Hammarström 2020). [14] So **volume tolerance and benefit are
  individual**, and can only be found by adjusting and watching.
- **Autoregulation works and needs no sensors.**
  - The RIR-based RPE scale is valid: Zourdos 2016, Helms 2016. [15]
  - RPE-based loading matched or beat percentage loading (Helms 2018). [16]
  - Reviews favour RIR/RPE autoregulation over fixed percentages for strength (Larsen 2021). [17]
  - Caveat: people misjudge reps left, especially far from failure and on light loads (Halperin
    2022). [18] Tali's plain-words `SetFeel` ("lots to spare / about right / a real struggle /
    stopped early") is the right level of precision.
- **Enjoyment and choice matter for sticking with it.** Letting people choose the mode and pace
  raises enjoyment and adherence (Ekkekakis 2008, preference-for-mode studies). [19]

**What this means for the design:**
1. Bio data sets safety edges and energy needs, not the programme.
2. Day 1 is personal through **constraints and preferences**.
3. From week 1, it's personal through **the person's own performance, effort, recovery and
   adherence**, smoothed over several sessions.
4. Dose (volume, days, minutes) is **adjusted and watched**, never fixed from a profile.

---

## 3. Engine design (`src/core/domain/engine/`, pure TS, no React, offline)

### 3.1 Contract
```ts
generatePlan(inputs: PlanInputs, lib: Exercise[], seed: string): GeneratedPlan   // day 1
reviewWeek(plan, person: PersonModel, today): Suggestion[]                        // weekly, suggest-only
nextTargets(slot, person: PersonModel): SlotTarget                                // per session, suggest-only
personModel(days: Record<string, DayLog>, plan, prefs): PersonModel               // derived from logs, never stored
```
- **Deterministic.** The same inputs, logs and seed always give the same plan. The seed is the
  plan id, so variety is reproducible and testable.
- **Output uses shipped shapes.** A `TrainingPlan` (`source: 'recommended'`) plus generated
  `Routine`s (`source: 'recommended'`). No new tables. The trace rides the existing JSON bodies
  (`RoutineSlot.why`, `TrainingPlan.why`), within the 64 KB cap.
- **`PersonModel` is computed from `days`** (sessions, sets, `SetFeel`, `effort`, check-ins).
  Only explicit preferences are stored (`training.exPrefs`: liked or disliked exercise ids).
- **No calendar edits by itself.** Every change is a `Suggestion` the person accepts. The week
  stays weekday-keyed (no rotation, no sequence pointer).

### 3.2 Inputs (day 1)
Taken from `first-run-onboarding.md` §2. Each one has a job below; any without a job gets removed.

| Input | Field | Used by |
|---|---|---|
| Goal | `profile.goal` | budget split, reps, rest, effort, cardio share |
| Confidence / experience | `training.experience` | volume band, difficulty and skill ceiling, calibration length |
| Moving now | `training.movingNow` *(new)* | starting dose (Ease-in length, first volume), cardio starting stage |
| Days, minutes | `daysPerWeek`, `minutesPerSession` | session count, per-session set budget, split |
| Place, equipment | `place`, `equipment` | candidate filter, load increments |
| Enjoyment | `modalities` | the mix within the goal's floor, selection score |
| Body areas | `limitations` | gentler-first selection, `care` filter |
| Readiness outcome, sleep/stress baseline | outcome only | starting dose cap (days, volume at the band's low end), impact filter |
| Age | `profile.age` | edges only: from 55, balance and position rules; 16–17 routing |

### 3.3 Generation pipeline
1. **Weekly budget.** Sessions S = min(days, the guardrail cap). A poor baseline or a readiness
   "yes" caps S at 3 to start (mental-performance rule). Split S into resistance / cardio /
   mind-body using the goal's floor: WHO strength on 2+ days when S ≥ 2 [20]. Fill the rest by
   enjoyment. A goal floor the person didn't pick is **offered once**, never forced (§0.1).
2. **Set capacity.** Per-session working sets C = ⌊(minutes − warm-up) / minutes per set⌋.
   Minutes per set comes from each exercise's `timeCost` and the rest for the goal (supersets of
   opposing movements when minutes ≤ 30). Weekly capacity = R × C.
3. **Volume target per muscle.**
   - Start: V₀ comes from experience (≈10 / 12–16 / 16–20 weekly sets [21]), trimmed by
     `lose-fat`, `movingNow = no` and a poor baseline to the band's low end.
   - Fit to time: if R × C can't reach V₀ for every muscle, allocate by priority. Big movement
     patterns come first (squat or lunge, hinge, push, pull), then the goal's emphasis, then
     isolation. The trace records "time-limited".
4. **Structure (split).** Choose the split that, for this R and C:
   1. hits each main muscle at least 2× a week when R ≥ 2 [22]
   2. keeps any muscle at about 8 or fewer hard sets per session (judgement call)
   3. keeps Legs → Push → Pull adjacency and one hard session a day

   Candidates: full body A/B/C, upper/lower, PPL, and hybrids. They're scored and picked
   deterministically, not looked up by days. So someone with 4 days × 20 min gets full body
   ×4, while 4 days × 60 min gets upper/lower.
5. **Slots.** Each session gets pattern slots (for example squat, hinge, horizontal push,
   vertical pull, core). Compounds go first, and cardio comes after lifting.
6. **Exercise selection** for each slot:
   - **Hard filters:**
     - equipment ⊆ available kit
     - skill and difficulty ≤ ceiling
     - nothing from the §5.4 exclusions
     - `impact` off with a readiness "yes", knees flagged or age 55+ (unless chosen)
     - disliked exercises never picked
   - **Score:**
     - enjoyment of its modality
     - liked exercises
     - gentler alternative when `care` ∩ `limitations` isn't empty
     - fewer equipment changes and floor transitions in short sessions or for 55+
     - variety: the same slot differs across the week's sessions, except the main lifts for
       `increase-strength`, where repetition is the point
   - **Tie-break:** a seeded hash.
7. **Prescription.**
   - Reps, rest and RIR come from the goal (plan §3.4).
   - Sets per slot come from the step 3 allocation.
   - **Starting load isn't guessed from anyone else.** Sessions 1–2 are "find your weight": pick
     a weight that leaves about 3–4 reps to spare, then log how it felt. This is honest where
     Fitbod-style population seeding isn't.
8. **Placement and guardrails.**
   - Spread the resistance days out.
   - Mind-body sessions go after legs or before rest.
   - At least one rest day, and no 6-day `lose-fat` default.
   - Guardrails only ever lighten (plan §3.3). A big deficit sets volume to the low end and holds
     progression.
9. **Why trace.** This is written as each step decides (§3.6).

### 3.4 Person model (derived from logs)
```ts
interface ExerciseState {
  exId: string
  exposures: number                       // sessions with ≥1 working set
  e1rm?: number                           // weight-reps: w × (1 + (reps + rir)/30), sets ≤ 12 reps only
  bestReps?: number; bestHoldSec?: number // reps-only / holds at the current progression step
  trend: 'up' | 'flat' | 'down' | 'new'   // over the last 3–4 exposures, smoothed (median of best sets)
  lastFeel?: SetFeel; stalledSince?: string; swappedAway: number
}
interface PersonModel {
  ex: Record<string, ExerciseState>
  muscle: Record<MuscleGroup, { setsDone7: number; trend: 'up'|'flat'|'down'; highSore: number }>
  adherence: { planned: number; done: number; byWeekday: Record<number, { planned: number; done: number }>; minsVsPlan: number }
  recovery: { lowDays14: number }         // days with ≥2 low signals vs own median (dayOptions.lowSignals)
  effort: { hardShare: number }           // share of sessions rated hard / very hard (Foster sRPE)
  deficit: 'none' | 'moderate' | 'big'
}
```
- **RIR from `SetFeel`:** spare ≈ 4, right ≈ 2.5, struggle ≈ 0.5, stopped = 0 (judgement calls,
  unvalidated). Sets marked "stopped" count as a warning sign, not a performance point.
- **Equation limits:** e1RM equations drift past about 10 reps and far from failure [23]. So Tali
  shows trends only, never an absolute "1RM" number.

### 3.5 Adaptation rules (all suggest-only; thresholds are judgement calls unless cited)

**A. Load and reps per exercise (`nextTargets`), double progression [24]:**
- **Every working set at the top of the range** and none a struggle or stopped: suggest the next
  increment. That's the smallest available step: 2.5 kg barbell, the next dumbbell, the next stack
  plate or band, or the next step in the progression chain.
- **Within the range:** same load, and aim for one more rep.
- **Below the bottom of the range in 2 exposures, or any "stopped":** suggest about 5–10% less,
  or the easier step.
- **Held steady instead:** in a big deficit, on a low-signal day, in an Ease-in or lighter week,
  and in gentle mode (where it's shown in words).

**B. Volume per muscle (`reviewWeek`):** at most every 2 weeks, ±2 sets, inside the experience band.
- **Offer less:** 2 or more of the muscle's exercises trend down, or it's often very sore, or
  recovery is often low. Offer −2 sets or a lighter week. This is where Tali acts first: it
  lightens.
- **Offer more (optional):** trend flat for 3 or more weeks, and all of these hold:
  - adherence ≥ 75%
  - feel mostly "about right" or "spare"
  - recovery not low
  - no deficit guardrail
  - time allows

  Copy is neutral ("Want to try two more sets for legs? Optional."). This is never offered while
  the load note (§3.3) is showing. Tali never adds volume by itself.

**C. Swaps:**
- **Stalled** (3 exposures flat or down, with good adherence): offer a variation with the same
  pattern and primary muscle.
- **Disliked** (thumbs down, or swapped away twice): replace it in the plan and remember the
  preference.
- **"Stopped" with a pain note:** offer the gentler alternative, with the §4.0.4 disclaimer.

**D. Reshaping the schedule to actual adherence:**
- **A weekday done under a third of the time over 4 weeks** while another day gets unplanned
  sessions: offer to move it. This is a calendar edit the person accepts.
- **Under half of planned sessions for 2 weeks:** offer to rebuild with one day fewer, or shorter
  sessions if logged minutes run under plan. Exercise history carries over.
- **Nothing "missed" and no blame.** Plans still slide (plan §4.1b).

**E. Lighter weeks from data, not only the calendar:** offer one when recovery is low on 5 or
more of the last 14 days, or several lifts trend down together. Only the week 1 Ease-in is fixed,
because there's no data yet.

**F. Cardio:**
- Walk-to-run and other stage plans move up a stage when the last 2 sessions felt easy or
  moderate (session RPE plus the talk test), and repeat the stage otherwise.
- Minutes go up by no more than about 10% a week (judgement call).
- Without distance or heart rate, progress is minutes at an effort, never pace claims.

### 3.6 The why trace
```ts
type WhyCode = 'goal' | 'experience' | 'moving-now' | 'days' | 'minutes' | 'kit' | 'enjoy' | 'body-area'
  | 'baseline' | 'age-edge' | 'guardrail' | 'time-limited' | 'variety' | 'liked' | 'disliked'
  | 'perf-top-of-range' | 'perf-below-range' | 'perf-stalled' | 'feel' | 'recovery' | 'adherence' | 'evidence'
interface Why { code: WhyCode; field?: string; data?: { exId?: string; date?: string; value?: string }; text: string }
```
- Every split, day, exercise, sets, reps, rest and suggestion carries a non-empty `why[]`.
- Examples of what the UI shows:
  - "Dumbbell RDL, not barbell: you train at home with dumbbells."
  - "3 sets, not 4: 30-minute sessions."
  - "Try 22.5 kg: you hit 12 reps on every set last Tuesday and Thursday."
- AI may reword a `Why` online but never adds one. The deterministic text is always there
  offline.

### 3.7 Fairness and honesty checks (`npm test`, property-based)
1. **No fake questions.** For every onboarding field the UI claims to use, there are two inputs
   differing only in that field whose plans differ materially. "Materially" means any of:
   - a different split
   - exercise-set Jaccard below 0.8
   - total weekly sets differing by 2 or more
   - different rest or rep bands

   A field that fails is either used or removed from the questionnaire.
2. **Reasons are real.** Inputs are wrapped in a recording proxy. Every `Why.field` must have been
   read, and every read field that changes the output must appear in some `Why`.
3. **Different people, different plans.** Across a sampled grid of goal × days × minutes × kit ×
   experience × body areas, at least 95% of pairs differing in days, kit, minutes or goal are
   materially different.
4. **Data drives change.** The same plan with different synthetic logs gives different
   suggestions. With no new logs, nothing changes over time except the week 1 Ease-in and phases
   the person accepted.
5. **Constraint soundness.**
   - never unavailable kit
   - never a `care`-flagged exercise when a gentler one exists for a flagged area
   - no §5.4 exclusions
   - one hard session a day, at least one rest day, Legs → Push → Pull adjacency
   - no 6-day `lose-fat` default
   - guardrails only lower load
   - progression is never applied without acceptance
6. **Determinism.** The same inputs, logs and seed give identical output.
7. **Copy lint.** Screens using the engine contain none of: "AI-powered", "learns your body",
   "optimal", "perfect for you", "just for you" (unless a data `Why` backs it), "earn", "streak",
   "missed".

---

## 4. Data, library and build order

### 4.1 Capture in onboarding vs learn later
- **Capture:** the §3.2 inputs, plus **"moving now"** (not at all / some / regularly) and
  **minutes** (10/20/30/45/60+). These are the two inputs the engine needs that aren't typed yet.
  `TrainingPrefs` needs `modalities`, `minutesPerSession`, `place`, `movingNow`, `daysPerWeek` 1,
  `exPrefs`, and `BodyArea` hips and ankles. All additive in the settings JSON.
- **Learn:**
  - loads and rep capacity per exercise
  - how the person rates effort
  - volume tolerance per muscle
  - which weekdays actually happen, and real session length
  - liked and disliked exercises
  - their usual recovery pattern
  - cardio stage
- **Never ask:** favourite exercises up front (people rarely know yet), injuries in free text,
  body-fat %.

### 4.2 Gaps in the exercise library (`core/data/exercises.ts`, 127 entries)
- `pattern` and `primary` are set on 58 entries. Every strength and calisthenics entry needs both.
- **New attributes, each checked by `check:exercises`:**
  - `timeCost` (setup plus minutes per set)
  - `skill` (1–3 technical demand, separate from `difficulty`)
  - `increment` (kg step, band levels, or "progression chain")
  - `impact` (jumping or landing)
  - `position` (standing / bench / floor)
  - `unilateral`
  - `systemicCost` (low / medium / high)
  - `homeFriendly` (quiet, small space)
  - household props (`chair`, `step`, `wall`) as `Equipment`
- **Coverage test:** every pattern × kit profile (gym / dumbbells / bands / none) × difficulty
  has at least 2 candidates. Otherwise the generator falls back and the trace says so.
- **Progression chains:** only 23 entries have `progression`. Chains are needed for push, row,
  squat, hinge, lunge and core in bodyweight and band versions, for the home/no-kit plan.

### 4.3 Phases (each reviewed by ship-critic; mental-performance for copy and guardrails)
| Phase | Ships | Personal on |
|---|---|---|
| **E1** | Library attributes and coverage; `generatePlan` (budget, capacity, structure, selection, prescription, placement, trace); "find your weight" calibration; the §3.7 tests 1–3 and 5–7 | **Day 1**: constraints, preferences, dose |
| **E2** | `personModel`; per-exercise `nextTargets` (A); like/dislike; swaps (C); "Why this?" on every card | **Week 1–2**: their own sets |
| **E3** | `reviewWeek`: volume (B), schedule (D), lighter weeks from data (E); test 4 | **Week 3–4**: trends, recovery, adherence |
| **E4** | Cardio stages (F) for walk-to-run; optional AI rewording of `Why` | Ongoing |

This replaces step 3 of `first-run-onboarding.md` §10 ("pick and adapt"). The three new plans
Benn asked for (home/no-kit, walk-to-run, 4-day upper/lower) become **test fixtures the generator
must reproduce** for matching inputs, rather than templates people are routed into. The existing
Tali plans stay in the library for anyone who wants to choose one.

## 5. Honest limits and copy

- **What Tali can't know without wearables or a coach:**
  - heart rate and zones, HRV, sleep stages
  - form and technique (no camera)
  - pain versus normal soreness (we signpost, never judge)
  - real muscle growth
  - whether someone is a "responder": weeks of noisy logs can't tell, so we never say it [12]
- **Early data is thin.** Beginners' e1RM rises fast from learning the movement, and RIR is off by
  about a rep or more [18]. That's why rules use trends over 3–4 exposures and move in small,
  capped steps.
- **Honest labels:**
  - Day 1 copy says "**Built from your answers**"; data-driven changes say "**Based on your last
    3 sessions**".
  - Never "AI coach", "learns your body", "optimal" or "the best plan for you". Say "a good
    starting point, and it changes with you".
- **Unvalidated thresholds stay unvalidated.** Every threshold marked judgement call is shown
  that way in code comments. The §3.4 RIR mapping and the ±2-set step are the first ones to
  validate against real logs (aggregate only, with consent).
- **Checking references.** All references below must be checked against the papers before any
  appears in user-facing copy (as plan §3.6 requires).

## 6. Questions for Benn (recommended defaults)
1. **Generated plans only, or Tali's hand-made plans alongside?** *Default:* generated is the
   recommended plan; hand-made plans stay browsable and choosable, marked "made by Tali".
2. **Starting loads: "find your weight" sessions, or ask for known weights?** *Default:* find your
   weight (sessions 1–2), with an optional "I know my weights" field for confident lifters.
3. **Per-set feel: ask on every set, or only the last set of each exercise?** *Default:* last set
   only (one tap). It's enough for progression and keeps logging fast.
4. **Volume increases: offer them at all?** *Default:* yes, optional and rare (at most every 2
   weeks, never with a load note or a deficit guardrail). Decreases are offered first.
5. **Explicit like/dislike on exercises?** *Default:* yes, a quiet thumbs up/down on the card.
   Swapping away twice counts as a dislike.
6. **Aggregate, consented log data to validate thresholds later?** *Default:* not in v1; revisit
   after the consents table and the DPIA ship.

## References (check each against the paper before it reaches users)
1. Fitbod, "How Fitbod generates your personalized workouts" — https://fitbod.me/blog/fitbod-algorithm/
2. Dr Muscle, Fitbod review (competitor) — https://dr-muscle.com/fitbod-workout-app-review/
3. RP Strength, RP Hypertrophy app — https://rpstrength.com/pages/hypertrophy-app ; Boostcamp comparison — https://www.boostcamp.app/vs/rp-hypertrophy
4. Garage Gym Reviews, JuggernautAI — https://www.garagegymreviews.com/juggernautai-review
5. Freeletics, "How the Freeletics Coach gets you" — https://www.freeletics.com/en/blog/posts/how-freeletics-coach-gets-you/ ; Agent Finder review — https://agent-finder.co/reviews/freeletics
6. Garage Gym Reviews, Caliber — https://www.garagegymreviews.com/caliber-app-review ; Agent Finder, Future — https://agent-finder.co/reviews/future
7. Garage Gym Reviews, Ladder — https://www.garagegymreviews.com/ladder-app-review
8. Apple Support, Custom Plans — https://support.apple.com/en-gb/guide/fitness-plus/apdf222051d8/ios ; Peloton — https://www.onepeloton.com/blog/personalized-workout-plan
9. Unstar, BetterMe 1-star review analysis — https://unstar.app/blog/is-betterme-legit-worth-it-fitness-app-reviews-2026
10. Hubal MJ et al. (2005) Med Sci Sports Exerc 37(6):964–972.
11. Ahtiainen JP et al. (2016) GeroScience/AGE 38:10 — https://pubmed.ncbi.nlm.nih.gov/26767377/
12. Hecksteden A et al. (2015) J Appl Physiol 118(12):1450–1459; see also Atkinson & Batterham (2015) Exp Physiol.
13. Montero D, Lundby C (2017) J Physiol 595:3377–3387.
14. Hammarström D et al. (2020) J Physiol 598(3):543–565.
15. Zourdos MC et al. (2016) J Strength Cond Res 30(1):267–275; Helms ER et al. (2016) Strength Cond J 38(4):42–49.
16. Helms ER et al. (2018) Front Physiol 9:247.
17. Larsen S et al. (2021) PeerJ 9:e10663.
18. Halperin I et al. (2022) Sports Med 52:377–390.
19. Ekkekakis P et al. (2008) in *Exercise, affect and adherence: a case for self-paced exercise*; preference-for-mode study — https://pubmed.ncbi.nlm.nih.gov/41368562/
20. Bull FC et al. / WHO (2020) Br J Sports Med 54:1451–1462.
21. Schoenfeld BJ, Ogborn D, Krieger JW (2017) J Sports Sci 35(11):1073–1082.
22. Schoenfeld BJ, Ogborn D, Krieger JW (2016) Sports Med 46(11):1689–1697.
23. e1RM equation accuracy by reps and proximity to failure: summary sources in the research notes; to be replaced with a primary validation paper before use in copy.
24. Ratamess NA et al. / ACSM (2009) Med Sci Sports Exerc 41(3):687–708.
