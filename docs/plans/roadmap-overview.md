# Tali roadmap overview: every planned phase, its status and what gates it

First compiled 11 Oct 2026; **updated 28 and 29 Oct 2026** (Cycle added 29 Oct) with Benn's scheduling decisions and the state
of `main` at f29c826. Sources: the plans in `docs/plans/`, the compliance register
(`docs/compliance/README.md`), the DPIA, the code, and `npm run check:foods` /
`check:exercises`. Status is what the docs state or the code shows; "unclear" means neither
settles it. No plan sets effort estimates (the native spike's "about 2 weeks" is the only one),
so the **Target** columns stay blank until Benn sets dates.

## Benn's scheduling decisions (28 Oct 2026)

1. **No public launch date.** Tali stays an **invited alpha**, nothing official, until every
   workout has its demo videos in a woman's and a man's version (clarified 29 Oct: all clips so
   far show a woman; see "Alpha gate" below).
2. **A paid tier before Jan 2027 is unlikely.** So the DMCC subscription features (pause, a
   non-renewing pass) are off the critical path, and monetisation waits.
3. **Solicitor and clinician:** the connections have to be made first. No budget or date yet.
4. **Next build stream: food data clean-up and making it more robust.**

## Proposed order (Now, Next, Later)

| When | Stream | Why now | Target |
|---|---|---|---|
| Now | Food data clean-up and robustness (§1 below) | Benn's choice; 3,737 foods now ship in the main bundle | |
| Now, alongside | Demo clips: men's versions, plus the workout moves with no clip yet (§2); boards for choosing which version shows | The alpha gate | |
| Now, admin | ICO fee; republish the privacy page on Webflow (register #1, #43) | Owed now, whatever the schedule | |
| Now, admin | Find a solicitor and a clinician (register #6, #44, DPIA D1) | Both gate onboarding-on beyond testers and any public launch | |
| Next | Sign DPIA §§1–7, fix register #34, then turn onboarding on for the alpha | Brings the training engine (E1) to testers | |
| Next | Training engine E2, then E3 | Builds on onboarding being on | |
| Later | AI Phase 0 close-out, then AI Phase 1 (type a meal) | Paid plans wait on this | |
| Later | Native spike, then wearables | Unlocks wellbeing Phase 3 and on-device reading | |
| Later | Monetisation | After AI Phase 1; not before Jan 2027 | |
| Not yet placed | Cycle (§3, "Cycle") | Plan only; demand research and a clinician first; Benn to place it | |

## Fixed dates

| Date | What | Source |
|---|---|---|
| 28 Oct 2026 (today) | `UNCONSENTED_DELETION`: the daily purge of logs with no health consent starts (03:17 UTC) | `src/core/legal/index.ts`, register #26 |
| 2 Dec 2026 | EU AI Act Art. 50 transitional marking deadline (AI output, AI voices) | ai-platform-plan |
| Jan 2027 | DMCC subscription regime (only matters once a paid tier exists) | monetisation-plan |

## Flags on `main`

| Flag | Value | Gates |
|---|---|---|
| `WELLBEING_ENABLED` | on | Mind tab, wellbeing Phase 1 |
| `MIND_REVIEWED` | on | Mind skills and low-mood signpost (clinician review before public launch) |
| `SUPP_NAMES_ENABLED` | off | Supplement names (waits on DPIA 8.8) |
| `LABEL_SCAN_ENABLED` | **on** (since 11 Oct, DPIA §9 signed) | AI label reading and the shared product list |
| `ONBOARDING_ENABLED` | off | First-run wizard, training engine E1, warm-ups, Redo setup, medical re-ask |
| `AI_FEATURES_LIVE` | false | AI rows in Profile |

---

## 1. Food data clean-up and robustness (next stream)

**Where it stands.** `check:foods` passes: 3,737 foods, all with a cited source, 2,778 checked
against a published figure, 0 "not yet checked", 17 warnings (spices whose kcal sit below their
macros, drinks whose kcal sit above). The plan doc `food-data-offline.md` is out of date: it still
says 547 foods and 48 unchecked. The production build's main script is 1.69 MB raw, 446 KB
gzipped; `nutrition-data-and-sourcing.md` Phase 4 planned scale and search work once the database
passed about 1,000 to 1,500 foods.

| Item | Source | Status | Target |
|---|---|---|---|
| Bring `food-data-offline.md` and `nutrition-data-and-sourcing.md` up to date | this review | Not started | |
| `nutrition-accuracy` audit of the 3,737 foods: the 17 warnings, chain items, takeaway composites, and what "robust" should cover | food-data-offline §7 | Not started | |
| Split one-row-many-products foods (spread, soya milk, porridge, bacon, chapati) | food-data-offline §7.3 | Unclear; to check in the audit | |
| `cook`-flagged vegetables holding raw values | food-data-offline §7.4 | Unclear; to check in the audit | |
| Per-item custom foods ("1 bar") in the create form | food-data-offline §7.5 | Partly: syncs, but `CreateFoodView.tsx` offers grams or millilitres only | |
| Measure what the food data costs the main bundle and launch, and how fast search is on a low-end phone | nutrition-data-and-sourcing Phase 4 | Not started | |
| If needed: split foods out of the main bundle (food packs in IndexedDB, a local search index) | food-data-offline §3 | Designed, not built | |
| Move day history older than 90 days to IndexedDB before logs reach ~3 MB | food-data-offline §4 | Not started | |
| Accuracy research round 2 | nutrition-accuracy-research §4 | Not started; needs a local session or allowed domains | |
| Locale scope (UK only?) and target library size | nutrition-data-and-sourcing §8 | Open for Benn | |

Every food change needs `nutrition-accuracy` and `ship-critic`; a schema change needs
`security-data`.

## 2. Alpha gate: a woman's and a man's demo clip for every workout

**Benn, 29 Oct 2026:** "done for men and women" means the videos for each workout. Every clip so
far shows a woman; the male audience needs male versions. So the gate is two clips per exercise,
one with a woman and one with a man.

**Counts (29 Oct, `main` f29c826).** The library has 163 exercises; 37 have a clip, all with a
woman. Tali's own workouts (the plans in `taliWorkouts.ts`, Legs / Push / Pull and Cardio in
`workouts.ts`, and the hard-day swaps) plus the warm-ups use 59 of them.

| Scope | Exercises | Women's clips done | Women's clips to make | Men's clips to make | Clips to make |
|---|---|---|---|---|---|
| **Tali's workouts and warm-ups** (proposed alpha gate) | 59 | 35 | 24 | 59 | **83** |
| Rest of the library (used only in workouts people build themselves) | 104 | 2 | 102 | 104 | 206 |
| **Whole library** | 163 | 37 | 126 | 163 | **289** |

The 24 workout and warm-up moves with no clip at all: leg-curl, dead-bug, calf-raise,
cable-crunch, cardio-walk, cardio-easy-walk, supine-hamstring-stretch, lying-knee-rolls,
reclined-figure-four, childs-pose, wall-calf-stretch, open-book, thread-the-needle,
doorway-chest-stretch, cross-body-shoulder, leg-swings, bodyweight-squat, worlds-greatest-stretch,
hip-circles, hip-90-90, arm-circles, band-pull-apart, scapular-wall-slide, inchworm.

Each clip also needs its tempo timeline measured from the footage, and the house rules
(`docs/exercise-video-prompts.md`) apply: a checked prompt before generating, no retake without
Benn's OK. The men's prompt lists in `docs/video-prompts/` already exist for every exercise.

**Build work this needs (not started; needs boards and Benn's approval before any code):**

1. **Data model:** an exercise holds one `video` today. It needs a woman's and a man's clip,
   each with its own tempo timeline, and the `npm test` clip checks extended to both.
2. **Which clip a person sees:** a design decision for the Design canvas, not made here. Options
   include a "Demo videos" choice in Profile (women, men, or a mix) or following the onboarding sex
   answer. Using the sex answer would put a health-adjacent field to a new use, so it goes past
   `compliance` first; a plain preference does not.
3. **When the engine builds plans** (once onboarding is on), it can pick any library exercise, so
   the 104 library-only moves matter then too.

**To confirm with Benn:** is the alpha gate Tali's workouts and warm-ups (83 clips) or the whole
library (289 clips)?

---

## 3. Status by stream

### Workouts (`workouts-customization-and-library.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| P1–P5 | Wellbeing-first training, any movement, library, own workouts, plans as a week | Done | |
| After P5 | Builders per kind (yoga, pilates, mobility, cardio) | Not started; not designed in depth | |
| P6 | Tailored plans | Replaced by the training engine | |
| P7 | Per-muscle volume readout | Not started | |
| M | Media track: clips, hold and flow players, guided whole sessions last | In progress (see §2) | |

Open for Benn: no endurance plan, no heavy low-rep strength plan, mobility and walk are swaps only.

### Training engine (`personalised-training-engine.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| E1 | Day-1 plan, "find your weight", Starter week, "why" | Built, behind `ONBOARDING_ENABLED` (off) | |
| E2 | Person model, per-exercise `nextTargets`, likes, "Why this?" | Partly (`nextTargets` not built) | |
| E3 | `reviewWeek`: volume, schedule reshaping, lighter weeks | Not started | |
| E4 | Walk-to-run stages, optional AI wording | Not started | |

### First-run onboarding (`first-run-onboarding.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | Foundations | Done except DPIA §§1–7 (unsigned) | |
| 2 | Boards | Approved (Protein split 1–3 added 24 Oct) | |
| 3–4 | Questionnaire, safety routing, engine day 1 | Built, flag off; medical question for every goal and its re-ask approved 26 Oct | |
| 5 | Nutrition ranges | Built; full status unclear | |
| 6 | Learning loop | Partly (rate adjustment built via the maintenance loop) | |
| 7 | New plans as generator fixtures | Unclear | |
| 8 | Optional AI wording | Not started | |

To turn the flag on for anyone but closed testers: DPIA §§1–7 signed, register #34 fixed, the
onboarding legal texts published, and a clinician review of the wellbeing question and routing
(DPIA D1).

### Wellbeing / Mind (`wellbeing-plan.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | Asks budget, hard days, reflection, support, skills, the one thing, sleep tier 1, notifications | Built and on; supplement names off | |
| 2 | A few guided audio tracks | Not started; draft scripts on `claude/wellbeing-phase2` | |
| 3 | Wearable sleep | Not started; needs the native app | |
| 4 | AI coach | Not started; after evals, red-team, regulatory opinion, ICO decision | |

### Maintenance loop (`maintenance-loop.md`)

Built and on `main`: weekly review, 4-week weigh-in check, adaptive maintenance, "Keep it steady"
goal, weekly review reminder. The safety tiers wait on the clinical review; `loopThresholds.ts`
holds placeholders.

### Label scan and shared products (`label-scan-and-shared-products.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | AI label photo reading | **On** (11 Oct) | |
| 2 | Shared product list | **Built and on** (anonymous, own consent, DPIA §9 signed) | |
| 3 | On-device reading (native) | Not started | |

### Meals (`meal-suggestions-and-planning.md`)

"What can I make?" is done. The Tali recipe library, AI ideas, meal planning with a shopping list,
and voice or photo input are not started. Open for Benn: who writes the recipes; whether allergy
filters wait for allergen data.

### Nutrition targets (`personalized-nutrition-targets.md`)

Engine and capture done; the adjustment loop lives in the maintenance loop. Open refinements and
Benn questions (lean-mass protein cap, push for the weekly suggestion) unchanged.

### AI platform (`ai-platform-plan.md`, `ai-recipe-capture.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 0 | Consents, function pattern, spend caps, DPIA, privacy section, eval harness | Partly (label reading's DPIA §9 and privacy section done; general DPIA and eval harness open) | |
| 1 | Type the meal, parse, confirm | Not started | |
| 2–5 | Recipe by conversation, AI reflection, photo logging, voice, coach, audio and video | Not started | |

### Monetisation (`monetisation-plan.md`)

Not started, and deferred (decision 2). The incremental-pull sync fix (`pullAll` still fetches
every row) is listed there but is a robustness fix worth doing before the alpha grows.

### Native app (`native-app-plan.md`, now on `main`)

Draft; nothing built. Phases: spike (about 2 weeks), parity, Apple Watch, store launch, Fitbit, AI.

---

### Cycle (`cycle.md`, on branch `claude/cycle-plan-uk` at 7f69d8f, not on `main`)

Symptom-aware guidance for women: a one-row "Period today?" check-in that can soften what Tali asks
of training and food on symptom days. Plan only, nothing built; it replaces the never-merged "Flow"
sections of the Sept plan. Reviewed by `compliance` and `mental-performance`; still needs `design`,
`security-data`, `nutrition-accuracy` (for v1.1) and `ship-critic`.

Benn's decisions (29 Oct 2026): only women see it (the onboarding sex answer is female, plus a
current health consent yes), and it stays opt-in; UK first, with nothing in v1 that rules out the
US; the name is "Cycle"; demonstrator videos are split out of this plan (they are the alpha gate in
§2).

| Step | Scope | Status | Target |
|---|---|---|---|
| 1 | Design boards for Benn: Profile offer, setup and consent, check-in row, "Period started", lighter offer, weigh-in note, safety prompts, delete and export | Not started | |
| 2 | v1, device-only: gate, setup, its own consent (a migration widening `consents_type_check`), check-in row, pain signal feeding Train's lighter offer only, hunger copy, weigh-in note and guard, safety signposting, delete, export, withdrawal, privacy policy, register and DPIA addendum | Not started | |
| 3 | v1.1: patterns on request, a symptom-triggered if-then plan, an iron label, comfort-swap tags | Not started | |
| 4 | Later: optional `cycle_days` sync, the US, life stages, Apple Health and Health Connect | Not started | |

Blockers before the build (plan §10): demand research (two requests so far; a survey or interviews
proposed); a clinician for the safety thresholds (unknown who); an MHRA view on the intended
purpose; a lawyer on the Equality Act question and the GB iron claim thresholds; whether "UK first"
is an in-app gate or marketing only; under-18 eligibility.

Dependency found in this review: the gate reads `profile.sexAnswer`, which the onboarding wizard
sets (off for users). Profile sets it only when someone changes their sex there, so most current
alpha users have no answer and would not see the offer until onboarding is on or Profile asks.

## 4. Compliance items that affect the schedule

| Item | Status | Blocks | Target |
|---|---|---|---|
| #1 ICO fee | Owed now | A legal duty, not a build | |
| #43 Republish the privacy page on Webflow | Owed now | The live policy is behind `main` | |
| #6 Solicitor | Contact to be found | Public launch, any paid feature, Cycle (Equality Act, iron claims) | |
| #44, DPIA D1 Clinician | Contact to be found, unfunded | Onboarding beyond testers, public launch of Mind and loop safety tiers, Cycle safety thresholds | |
| #7 DPIA §§1–7, 8.8 | Unsigned (§8 and §9 signed) | Onboarding flag, supplement names, AI Phase 0 | |
| #34 Onboarding copy fixes | Open | Onboarding flag | |
| #4 Processor DPAs | Open | Public launch | |
| #21 Under-18 auto-delete and DPIA assessment | Open | Wellbeing Phase 2, public launch | |
| #2, #5, #8, #11, #15, #23, #30c | Open | Public launch | |

While the alpha runs on real data (register, "Status"): keep testers few, tell them it's a test
build, and delete their data when testing ends.

## 5. Still needed to put dates in

1. Confirm the alpha gate scope in §2: Tali's workouts and warm-ups (83 clips) or the whole library (289).
2. Clip throughput: how many clips a week Benn can generate and approve (each is then timed and
   reviewed), which sets the alpha date.
3. Build capacity per week, or ask Claude to propose dates from the scope above as estimates.
