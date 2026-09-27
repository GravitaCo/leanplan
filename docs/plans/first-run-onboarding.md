# First-run onboarding: from a short Q&A to a workout plan and nutrition targets

**Status:** DRAFT, 27 Sept 2026. It brings together input from four agents:
- `fitness-workouts`
- `nutrition-accuracy`
- `mental-performance`
- `security-data`

It updates [`onboarding-and-data-flow.md`](./onboarding-and-data-flow.md), whose 14-question list
is now superseded here. The engine internals stay in:
- [`personalized-nutrition-targets.md`](./personalized-nutrition-targets.md)
- [`workouts-customization-and-library.md`](./workouts-customization-and-library.md) §3–4

Decisions Benn still owes are marked **[Q]** and gathered in §9.

---

## 1. How Tali knows the best plan

**What decides it:** the plan comes from rules, not guesswork. Every rule is written in `core/`,
tested and cited. The answers that decide a workout plan are:
- goal
- experience and confidence
- how active you are right now
- days a week and minutes a session
- where you train and what equipment you have
- body areas to go easy on

**What bio data does:** it sets energy needs, not the programme.
- Sex and height barely change how people should train.
- Age only matters at the edges: from about 65, WHO adds balance work, so "Stronger with age"
  leads from 55.

| Decision | Driven by | Evidence |
|---|---|---|
| Sessions a week | days available | WHO 2020 / UK CMO: strength on 2+ days |
| Split | strength sessions: 1–3 → full body, 4 → upper/lower, 5–6 → push/pull/legs | Schoenfeld 2016: each muscle twice a week |
| Weekly sets | experience: about 10 / 12–16 / 16–20 per muscle | Schoenfeld 2017 dose–response |
| Reps, rest, effort | goal | ACSM 2009; Schoenfeld 2016/2021 |
| Session size | minutes | Low volume still works (Androulakis-Korakakis 2020) |
| Exercises | equipment ∩ difficulty, then gentler swaps for body areas | filter |
| Progression | top of the rep range on every set → suggest a little more (never automatic) | ACSM 2009 |
| Cardio | goal, enjoyment, place | WHO: 150–300 min a week |
| Calories | BMR (Mifflin–St Jeor) × daily movement + training, then the goal band, then floors | see §5 |

**v1 approach:** pick one of Tali's plans and adapt it (days, equipment swaps, gentler options,
session length). The plan isn't generated from scratch. **[Q]**

**Where AI fits:** it's optional and never the source of the numbers. It explains "why this
plan" in plain words, it can make sense of a coach conversation, and it spots patterns in weeks
2–4. Every AI feature has a non-AI path that works offline.

## 2. The flow

About 10 screens, one question each, with every screen skippable except the goal. Each screen
has a one-line "Why we ask" and a progress line ("About 2 minutes left").

| # | Screen | Field | Drives |
|---|---|---|---|
| 0 | Sign up / sign in (needs a connection) | – | Account and consent record exist before any health question |
| 1 | Age | `profile.age` | Safety routing, BMR, plan ordering |
| 2 | Readiness (PAR-Q+ style, 3 items: chest pain or heart condition; dizziness or fainting; pregnant, breastfeeding or recent surgery) | outcome only | A "yes" gives a gentler start and GP/midwife/NHS 111 signposting. Never blocks |
| 3 | What would make this worth it for you? (your why) | `profile.motivations` | Copy, weekly review |
| 4 | Main goal | `profile.goal` | Both engines |
| 5 | How are things lately? (sleep, stress, room for change) | baseline | Gentler start when poor sleep, high stress or little room (pre-selected, changeable) |
| 6 | Food and weight wellbeing: "Food or weight sometimes feels stressful or all-consuming for me: Yes / Sometimes / Rather not say" **[Q]** | outcome only (gentle mode on/off) | No deficit, weight hidden, signposting |
| 7 | Body: height, current weight (optional **[Q]**), sex (Female / Male / Prefer not to say) | `profile.*` | BMR |
| 8 | Daily movement (steps bands or job type) | `profile.activityLevel` (re-mapped) | TDEE multiplier (training counted separately, no double count) |
| 9 | Moving now, experience, days, minutes, place, equipment, enjoyment, body areas | `training.*` | Plan pick and adapt |
| 10 | Summary: "Here's a starting point, not a test" (the plan, a target range, why) | – | Confirm → active plan and targets |

**Leave out of onboarding:**
- body-fat % (Profile later, if ever)
- "Aggressive" pace
- focus muscles
- cardio preferences (asked when cardio is first added)
- goal weight
- photos
- injury free text

## 3. Safety routing (nobody is blocked; the plan gets safer)

| Signal | Result |
|---|---|
| Under 16 **[Q]** | Kind stop: "Tali is for 16+" |
| 16–17 | No deficit, weight hidden, no AI features |
| Pregnant or breastfeeding | Maintenance only with no calorie number shown, gentle training, signpost midwife/GP |
| BMI under 18.5 (safety gate only, never used for targets) **[Q]** | No deficit |
| Wellbeing question Yes or Sometimes | No deficit, gentle mode on, weight hidden, calm signposting (Beat, NHS 111, Samaritans 116 123, 999; verify numbers) |
| Readiness yes | Gentler start plus signposting |
| Diabetes on insulin or sulfonylureas, kidney disease, GLP-1 **[Q]** | Maintenance allowed, no high-protein anchor, GP note |

## 4. Mind first

- Poor sleep or high stress in the last two weeks means the plan starts at the low end of days
  (2–3), calories near maintenance, no fast pace, and the check-in comes forward. Short sleep
  raises appetite and slows recovery (Chaput 2023).
- The first week is easy on purpose: one or two short sessions, logging optional, a check-in, and
  a reflection on day 7.
- One optional if–then plan ("After ___, I'll ___"), using the existing `IfThenPlan`.
- Tone: second person, warm, offering rather than instructing. No "ideal", "problem areas",
  "burn off", "earn", "cheat", "clean", "missed", "streak" or red.

## 5. Nutrition targets: honest numbers

- The starting estimate is about ±15%: Mifflin is within ±10% for about 70–80% of adults, and the
  activity multiplier adds the most error.
- **Show a range:** "About 1,650 kcal a day to start (likely maintenance 1,630–2,200). Tali checks
  this against your weigh-ins after 3–4 weeks." Never show 1-kcal precision. **[Q]**
- **Units:** kg, stone/lb and lb; cm and ft/in.
- **Floors:** max(BMR, 1,500 men / 1,200 women) **[Q]**, and never below 800. "Prefer not to say"
  uses the midpoint constant with a wider margin.
- **Endurance:** warn if energy availability is under about 30 kcal per kg of fat-free mass.
- **Weight loss:** at most 1% of body weight a week.
- **Feedback loop (`suggestRateAdjustment`):** the first suggestion comes after 3 weeks and at
  least 6 weigh-ins. It's a suggestion only.

## 6. The plan after week 1

- **Week 1:** easier (Ease in).
- **Progression:** per exercise, suggest only, paused in a big deficit.
- **Fewer than half the planned sessions for 2 weeks:** offer fewer days or shorter sessions,
  without blame.
- **Lighter option chosen 3 or more times in 2 weeks:** offer a lighter week.
- **Week 4:** "How's it going?" → keep, adjust or swap.
- Tali never adds days or volume by itself.

## 7. Offline vs connection

| Capability | Offline | Notes |
|---|---|---|
| Sign up, first sign-in, password reset, email confirmation | Needs a connection | Onboarding comes after sign-up |
| Onboarding questions, plan and target calculation | Works | Pure `core/`; answers upload later |
| Opening Tali when signed in, logging, search, plans, workouts | Works | |
| Barcode | Partly | A saved product or the decoder after first use works; a new product needs Open Food Facts, otherwise type it in |
| Label photo, AI meal parsing, recipe chat, AI coach, "why this plan" wording | Needs a connection | Always a non-AI path next to it; AI requests are never queued (no photos or health text kept to send later); "Try again" when back online |
| Weekly reflection | Partly | Generated online, kept once fetched |
| Sync | Waits | Changes upload when back online |
| Push reminders | Partly | Subscribing needs a connection |
| Exercise videos | Needs a connection | |

**UX:**
- **One indicator in the header:** "Up to date" / "Saved on this phone, will sync (n)" /
  "Offline" / "Sign in to sync" / "Sync problem".
- **Online-only features stay visible,** with a short note next to them: "Needs a connection.
  Search works offline."

## 8. Data protection (these block launch)

- **Explicit consent** for health data (weight, readiness, sleep, stress, mood, the wellbeing
  outcome, limitations), plus a separate AI consent that can be withdrawn.
- **A DPIA and a privacy notice** naming Anthropic.
- **Minimise:**
  - age, not date of birth
  - no diagnoses or medication stored beyond the routing outcome
  - no injury free text
  - screener raw answers not stored
- **Storage:** plan inputs go in `settings.profile`. Mood and screener answers don't belong there.
  Check-ins already travel in `day_logs.supps._checkin`.
- **New:** a `consents` table (owner-only RLS: type, version, time), with label consent moving
  there from `tali.labelConsent` on the device.
- **New:** account deletion (a server function that deletes all tables and the login and clears
  the device). This blocks shipping onboarding.
- **Export:** the existing JSON backup.

## 9. Decisions (Benn, 27 Sept 2026)

**Flow and safety**
- **Flow:** a short wizard (age, readiness, why, goal, body), then a "finish your setup" card for
  the training details.
- **Age:** 16+. Under-16s get a kind stop; 16–17s get no deficit, no AI and weight hidden. Needs a
  quick legal check.
- **Wellbeing:** the one non-diagnostic food and weight question, with routing. Only the outcome is
  stored, and it gets clinical review before wider launch.
- **BMI under 18.5:** used as a safety gate only (no deficit). Never shown, never used for targets.
- **Readiness check, medical conditions question and sleep/stress baseline:** all included.

**Body and nutrition**
- **Weight:** optional, with a fallback range.
- **Target:** a rounded number plus the likely maintenance range, and a weigh-in check after
  3–4 weeks.
- **Activity:** steps bands, with job type as the alternative. Training is counted separately.
- **Floors:** split by sex, 1,500 men / 1,200 women, plus the BMR floor and never below 800.

**Training**
- **Progression:** suggest only.
- **New plans first:** Home with no equipment, walk-to-run, and 4-day upper/lower.
- **Plan engine:** **not** pick-and-adapt. Benn: "workouts tailored to that specific person are
  the goal; in our early research the pain point was faked personalisation. I do not want us
  falling into that trap. Let's do the work to figure the best plan for this." The engine design
  is being researched: see §11.

**Launch gate:** all four of these block launch:
- consents table
- account deletion
- privacy notice and DPIA
- connection indicator

## 10. Build phases

Each screen is drafted on the claude.ai Design canvas and approved by Benn before it's built.
Each build is then reviewed by the relevant agents and `ship-critic`.

1. **Foundations:**
   - consents table
   - account deletion
   - privacy notice and DPIA
   - connection indicator
   - exercise-library data gaps filled (movement pattern, muscles, time cost, skill, impact,
     home-friendly, progression chains; see the engine doc)
2. **Design boards:** the wizard, the setup card, the summary / "why this plan", and the
   signposting screens.
3. **Questionnaire UI and safety routing** (gentle and maintenance paths).
4. **Personalised training engine, day 1:** constraint-based generation with a "why" trace and
   "find your weight" sessions. See [`personalised-training-engine.md`](./personalised-training-engine.md).
5. **Nutrition:** target range output, units and sex-split floors.
6. **Learning loop:**
   - per-exercise strength estimate
   - load and swap suggestions
   - schedule fitted to adherence
   - `suggestRateAdjustment`
7. **New plans:** home with no equipment, walk-to-run, 4-day upper/lower.
8. **Later:** optional AI wording for "why this plan".

## 11. Real personalisation

**Test for "not fake":**
- Two people with different answers get materially different plans.
- Every choice in a plan (split, days, exercises, sets, reps, rest, cardio, progression) traces
  to one of their answers or their own logged data, and the app can say which.
- The plan changes because of what that person did, not on a fixed calendar.

Design: [`personalised-training-engine.md`](./personalised-training-engine.md). This replaces
pick-and-adapt.

**Engine decisions (Benn, 27 Sept 2026):**
- **Plans:** the generated plan is the recommendation. Tali's hand-made plans stay browsable,
  marked "made by Tali".
- **Starting weights:** "Find your weight" sessions 1–2, with an optional "I know my weights".
- **Effort:** "How was that set?" is asked on the last set of each exercise only.
- **Likes:** a quiet thumbs up/down on exercises. Swapping an exercise away twice counts as a
  dislike.
- **Volume increases:** optional and rare. At most every 2 weeks, never during a deficit or after
  a load note. Reductions are always offered first.
- **Aggregate log data:** not used in v1. Revisit after the consents table and DPIA.
- **"Why this plan":** rules-based in v1. AI wording comes later.
