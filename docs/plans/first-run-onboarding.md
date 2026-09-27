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

## 9. Open questions for Benn

These are asked in rounds. The recommended default is in brackets.

1. Wizard or card? (A short wizard for age, readiness, why, goal and body; then a "finish your
   setup" card for the training details.)
2. Minimum age? (16+, with under-18s getting no deficit and no AI; needs a legal check.)
3. Is the one-question wellbeing check with routing OK before a clinically validated screener?
   (Yes, non-diagnostic, pending clinical review.)
4. Is BMI under 18.5 OK as a safety gate only? (Yes.)
5. Remove body-fat % and "Aggressive" from onboarding? (Yes.)
6. Is current weight required? (Optional, with a fallback target.)
7. Show a target range rather than a single number? (Yes.)
8. Should poor sleep or high stress set the gentler start automatically? (Pre-select it with
   "change".)
9. Pick-and-adapt a Tali plan in v1? (Yes.)
10. Floors split by sex, 1,500 / 1,200? (Yes.)
11. Daily movement as steps bands? (Yes, with job type as an alternative.)
12. Medical conditions question (diabetes medication, kidney disease, GLP-1): include it? (Yes,
    routing only, nothing stored beyond the outcome.)
13. Which plans come next? (Home with no kit, walk-to-run, 4-day upper/lower.)
14. Should account deletion and the consent table block the onboarding launch? (Yes.)
15. Does AI "why this plan" wording ship in v1, or does it come later with the rules-based copy
    first? (Rules-based copy first.)

## 10. Build phases (each reviewed by the relevant agents and `ship-critic`)

1. Consent table, account deletion and the connection indicator.
2. Questionnaire UI and safety routing (the gentle and maintenance paths).
3. `recommend.ts`: pick and adapt a plan, with the summary screen.
4. Target range output, units and floors.
5. `suggestRateAdjustment` and the plan adaptation loop.
6. New plans, and the optional AI "why this plan".
