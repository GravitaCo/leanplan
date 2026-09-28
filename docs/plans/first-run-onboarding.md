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

Decisions Benn has made are in §9. Open ones are marked **PENDING BENN** and listed in §13.

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

**How the plan is made:** the personalised training engine generates it; it isn't picked from a
template and adapted (Benn, §9). Split, sessions, weekly sets, exercises, reps, rest and cardio
are all chosen by the engine from the answers above within the person's time and kit, and every
choice carries a "why". The rules, evidence and tests live in
[`personalised-training-engine.md`](./personalised-training-engine.md) §3 (inputs §3.2, pipeline
§3.3, checks §3.7). Calories are separate: BMR (Mifflin–St Jeor) × daily movement + training,
then the goal band, then floors (§5).

**Where AI fits:** it's optional and never the source of the numbers. It explains "why this
plan" in plain words, it can make sense of a coach conversation, and it spots patterns in weeks
2–4. Every AI feature has a non-AI path that works offline.

## 2. The flow

About 10 screens, one question each, with every screen skippable except the goal (age: required
or skippable is **PENDING BENN**, §13). Each screen has a one-line "Why we ask" and a progress
line ("About 2 minutes left"). What happens when a screen is skipped is in §2.1.

| # | Screen | Field | Drives |
|---|---|---|---|
| 0 | Sign up / sign in (needs a connection) | – | Account exists; health consent is recorded (on the device first if offline, §8) before any health question |
| 1 | Age | `profile.age` | Safety routing, BMR, plan ordering |
| 2 | Readiness (PAR-Q+ style, 3 items: chest pain or heart condition; dizziness or fainting; pregnant, breastfeeding or recent surgery) | outcome only | A "yes" gives a gentler start and GP/midwife/NHS 111 signposting. Never blocks |
| 3 | What would make this worth it for you? (your why) | `profile.motivations` | Copy, weekly review |
| 4 | Main goal | `profile.goal` | Both engines |
| 5 | How are things lately? (sleep, stress, room for change) | baseline | Gentler start when poor sleep, high stress or little room (pre-selected, changeable) |
| 6 | Food and weight wellbeing: "Food or weight sometimes feels stressful or all-consuming for me: Yes / Sometimes / Rather not say" **[Q]** | outcome only (gentle mode on/off) | No deficit, weight hidden, signposting |
| 7 | Body: height, current weight (optional **[Q]**), sex (Female / Male / Prefer not to say) | `profile.*` | BMR |
| 8 | Daily movement (steps bands or job type) | `profile.activityLevel` (re-mapped) | TDEE multiplier (training counted separately, no double count) |
| 9 | Setup card: moving now, experience, days, which weekdays, minutes, place, equipment, enjoyment, body areas | `training.*` (weekdays: `training.weekdays`) | Engine inputs (`personalised-training-engine.md` §3.2) |
| 10 | Summary: "Here's a starting point, not a test" (the plan, a target range, why) | – | Confirm → active plan and targets. Only describes a plan the engine actually generated (§10) |

**Weekdays.** The setup card has a weekday picker (Mon–Sun chips) under "days a week"; picking
days sets the count. The week is always weekday-keyed, never a rotation. When days are given but
weekdays aren't, the spread is fixed and deterministic:

| Days | Default weekdays |
|---|---|
| 1 | Wed |
| 2 | Mon, Thu |
| 3 | Mon, Wed, Fri |
| 4 | Mon, Tue, Thu, Fri |
| 5 | Mon, Tue, Wed, Fri, Sat |
| 6 | Mon–Sat |

A 1-day week vs the WHO 2+ strength days is **PENDING BENN** (§13). Engine test: §3.7 test 8.

### 2.1 Skipped answers

A skipped answer never blocks and never guesses in the person's favour: it falls to the safe
side, and the screen that uses it says so in plain words. Defaults carry the `default` WhyCode
(engine §3.6), so the plan never claims a skipped field as a reason.

| Field | Default when skipped | Safe-side routing | "Why" text |
|---|---|---|---|
| Age **PENDING BENN** (required vs skippable) | none | If skippable: the 16–17 rules (no deficit, weight hidden, no AI) and no calorie number, until age is added | "You haven't told us your age, so we're keeping things gentle and not showing a calorie number." |
| Readiness | treated as a "yes" for dose only | Gentler start and low-impact; signposting shown quietly, not as an alert | "You haven't told us about your health, so we've started gently." |
| Your why | none | Generic, neutral copy | – (nothing claims it) |
| Goal | required | – | – |
| Sleep / stress baseline | treated as poor | Low end of days (2–3), calories near maintenance | "You haven't told us how things are lately, so we've kept week 1 light." |
| Wellbeing ("Rather not say" or skipped) | no gentle mode | No deficit pre-selected; gentle mode offered, not switched on | "You haven't told us, so we've started at maintenance. You can change this any time." |
| Weight | none | **No calorie or protein numbers** until weight is added; logging, search and training all still work. (A sex/age/height estimate can't give an honest range without weight.) | "Add your weight any time for a starting estimate." |
| Height | none | No calorie or protein numbers until height is added | "Add your height any time for a starting estimate." |
| Sex "Prefer not to say" or skipped | midpoint | Mifflin midpoint constant, the lower floor (1,200), a wider margin on the range | "You haven't told us, so we've used a middle estimate with a wider range." |
| Daily movement | lowest band | Lowest multiplier (the estimate errs low) | "You haven't told us how much you move day to day, so we've assumed not much." |
| Training details (none answered) | **Starter week** | 3 days full body (Mon/Wed/Fri), bodyweight plus any equipment already known, 30 min, beginner dose, no jumping | Labelled "**Starter week: tell us more to personalise it**". Never described as personalised or "built from your answers". |
| Training details (some answered) | per field: moving now → not at all; experience → beginner; days → 3; weekdays → table above; minutes → 30; place/kit → bodyweight + known kit; enjoyment → none (goal mix); body areas → none flagged, low-impact | Generated plan; skipped fields fall back as listed | Each default shows as "You haven't told us your ___, so we've assumed ___." |

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
- **Consent offline.** Consent is recorded on the device first, with its type, version and
  timestamp, and synced to the `consents` table when back online. Health answers are never
  saved, locally or remotely, until that local consent record exists. If consent is withdrawn
  before sync, the withdrawal syncs too (latest timestamp per type wins).
- **A DPIA and a privacy notice** naming Anthropic.
- **Minimise:**
  - age, not date of birth
  - no diagnoses or medication stored beyond the routing outcome
  - no injury free text
  - screener raw answers not stored
- **Storage:** plan inputs go in `settings.profile`. Mood and screener answers don't belong there.
  Check-ins already travel in `day_logs.supps._checkin`.
- **Why traces are stored as codes, not text.** Each `Why` is saved as its `WhyCode` plus small
  data (field, exercise id, date, value); the sentence is rendered at display time (engine §3.6).
  This keeps generated plans well inside the 64 KB settings cap and lets copy change without a
  data migration.
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
- **Weight:** optional, with a fallback range. (Refined by review, §2.1: without weight there's
  no honest range, so no calorie or protein numbers are shown until weight is added.)
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
Each build is then reviewed by the relevant agents and `ship-critic`. A phase is done only when
its done-tests pass in `npm test` (or the e2e run named).

**Order rule:** phases 3 and 4 ship together, or phase 3 ships behind a flag that stays off
until phase 4 is in. The summary screen never describes a plan the engine didn't generate; until
then it shows nothing about a plan.

| # | Phase | Done-tests |
|---|---|---|
| 1 | **Foundations:** consents table; account deletion; privacy notice and DPIA; connection indicator; exercise-library gaps filled (movement pattern, muscles, time cost, skill, impact, home-friendly, progression chains; engine §4.2) | RLS test: `consents` rows readable only by owner; deletion removes every table's rows, the login and the device data; `check:exercises` passes with the new attributes; engine coverage test (§4.2) passes |
| 2 | **Design boards:** the wizard, the setup card (with weekday picker), the summary / "why this plan", the signposting screens, the Starter week label | Benn's approval on the canvas (no code test) |
| 3 | **Questionnaire UI and safety routing** (gentle and maintenance paths, §2.1 skipped-answer defaults) | Unit test per §3 routing row and per §2.1 row (skip → default, routing, `default` why); copy lint (engine §3.7 test 7) on every onboarding screen; offline e2e: answer the whole wizard in airplane mode, reload, answers and local consent are kept, then sync on reconnect |
| 4 | **Personalised training engine, day 1:** see [`personalised-training-engine.md`](./personalised-training-engine.md) (E1) | Engine §3.7 tests 1–3 and 5–9; summary-screen test: with the engine flag off, no plan copy renders |
| 5 | **Nutrition:** target range output, units and sex-split floors | Unit tests: floors per sex and "prefer not to say" (1,200, wider margin); no kcal/protein shown with weight or height missing; ranges rounded, never 1-kcal precision |
| 6 | **Learning loop:** per-exercise strength estimate; load and swap suggestions; schedule fitted to adherence; `suggestRateAdjustment` | Engine §3.7 test 4 and the §3.5 G guardrail tests; `suggestRateAdjustment` never fires before 3 weeks and 6 weigh-ins |
| 7 | **New plans:** home with no equipment, walk-to-run, 4-day upper/lower | Generator reproduces each as a fixture for matching inputs (engine §4.3) |
| 8 | **Later:** optional AI wording for "why this plan" | Copy lint on AI output; offline e2e shows the rules-based text with AI off |

Re-running onboarding (§12) and multi-device (§12) are tested in phase 3.

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

## 12. Lifecycle: existing users, re-runs, more than one device

**Existing users who never onboarded: PENDING BENN.** *Recommended default:* a one-time consent
prompt (health data, then AI separately) on next open; their current plan and targets stay
exactly as they are; a quiet "Build my plan" offer on Plan runs the setup card and engine only
if they tap it. Nothing is regenerated for them automatically.

**Re-running onboarding or changing the goal.**
- Rebuilding the plan is always an offer ("Build a new plan from this?"), never automatic.
  Changing an answer in Profile updates targets and copy at once; the plan waits for the tap.
- A rebuild keeps: the person model (it's derived from logs, engine §3.1), `training.exPrefs`,
  "find your weight" calibration, and any suggestions already accepted. Exercise history carries
  over.
- Test (phase 3): change goal → no plan change until accepted; after accepting, `exPrefs`,
  calibrated loads and accepted suggestions are unchanged.

**More than one device.**
- `profile.onboardedAt` (ISO time) is stored when the wizard finishes; a device that sees it
  doesn't show the wizard.
- When online, settings are pulled before deciding to show the wizard, so a second device
  doesn't ask again. Offline with no local settings, the wizard runs and merges on sync.
- **Merge per field.** `sync.ts` today upserts the whole `settings` row (`target`, `schedule`,
  `profile`) and pull replaces it: last-write-wins for the row. Onboarding needs per-field merge
  for `profile.*` and `training.*` answers (each field carries its own updated time; latest per
  field wins), so answers given on two devices don't overwrite each other. This is a sync change
  that ships with phase 3.
- Test (phase 3): two devices answer different fields offline, both sync, and every answer
  survives; `onboardedAt` on one device suppresses the wizard on the other.

## 13. Decisions on the last open points (Benn, 27 Sept 2026)

1. **Age is required.** It's asked first: "Why we ask: it keeps your plan safe and sets energy
   needs." Everything else stays skippable.
2. **Existing users** get a one-time consent prompt for the health data already held. Their
   current week stays, and a "Build my plan" card offers the new Q&A (§12).
3. **1-day week is allowed** as one full-body session, with the note: "One day is a great start.
   Two gets you the full benefit when you're ready." It never pushes.
4. **Legal and clinical sign-off: invited beta first.** Onboarding goes to a small invited group
   before a UK lawyer (age rules, GDPR, DPIA, privacy notice) and a clinician (the wellbeing
   question and routing) are brought in. That happens once the app works, because it costs money.
   "Wider launch" means opening beyond the invited beta, and it needs both sign-offs.
5. **Pregnancy flag:** re-asked gently every 12 weeks, and the user can clear it any time in
   Profile. (Default, not yet confirmed by Benn.)
6. **16–17 no-AI rule:** enforced from self-declared age during the beta. This is flagged for the
   legal review. (Default.)

## 14. Build decisions after design sign-off (Benn, 27 Sept 2026)

The designs are on the Design canvas (https://claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb),
rows "Onboarding 1" to "Onboarding 6". The notes s-ob1 … s-ob6 are the approved defaults.

- **Under-16s:** after the kind stop, the new account and everything on the device are deleted
  automatically. They're welcome back at 16.
- **Declining health consent** ("Not now"): the person can still use Tali (food, workouts) with a
  Starter week. There are no health questions, weight, check-ins or calorie numbers until they
  agree, and they can agree later from Profile.
- **Existing users who tap "Not now"** on the one-time sheet: their health data stays on the phone,
  its sync is paused, and they're asked again once after 2 weeks. This needs a `security-data`
  review.
- **Pregnancy flag:** re-asked every 12 weeks and can be cleared any time in Profile. Confirmed.
- **Draft option lists** (your-why chips, step bands, job types, minutes, enjoy options): approved
  for the beta.
- **Helplines** (checked 27 Sept 2026):
  - **Beat:** England 0808 801 0677, Scotland 0808 801 0432, Wales 0808 801 0433, Northern Ireland
    0808 801 0434. Open 3pm–8pm Monday to Friday; webchat and email too.
  - **Others:** Samaritans 116 123 (free, 24/7), Childline 0800 1111 (free, 24/7), NHS 111
    (England, Wales, Scotland; in Northern Ireland, your GP), 999.

## 15. Redo setup, and the under-age residuals (28 Sept 2026, compliance items 32 and 37)

**Redo setup (built, behind `ONBOARDING_ENABLED`).** Profile › Health data › "Redo setup" (shown
once `onboardedAt` is set) reopens the first run from the name question, prefilled with the
current answers (`draftFromProfile`; health answers only with a local health yes). Finishing
replaces the answers, as a first run does (a skipped question clears its answer), and keeps
`onboardedAt`. An answer left as it was keeps its stored value exactly (training prefs the
options can't show, the pregnancy date and "ask me later"), areas the screen doesn't offer
(hips, ankles) are never dropped unseen, and an unchanged weight isn't logged as a new weigh-in.
The summary's Start then asks "Rebuild your week too?": the plan changes only on "Rebuild my
week" (§12: never automatic); the person model, `training.exPrefs` and "find your weight"
calibration stay either way, as they're derived from the log. The wizard's edit promises now
point here ("You can redo setup any time from Profile.", "You can update this by redoing setup.").

**Residuals fixed.** (b) With no uid, the under-age stop clears the `tali.onboarding` draft too
(nothing else is recorded or wiped), so "We haven't kept any of your answers" holds. (c) A device
wipe keeps `tali.pendingDelete` (`WIPE_KEEPS` in `data/account.ts`), and "Sign out and remove
this device's log" clears the draft and the setup-card choice but keeps the pending record.
Clearing site data in the browser still drops it; (a) covers that case too.

**Proposal, not built: a server-side record of refused under-age requests (residual a).** Today
the only record that an account must go is `tali.pendingDelete` on one device. If the person
never signs in again (or clears the browser), the account, its email, consent records and
anything synced stay on the server with nothing there knowing it's under-age.
- When `delete-account` is called with `reason: 'under-age'` and refuses (re-auth outside the
  24-hour window) or fails part-way, it writes one row to a new service-role-only table
  `under_age_requests` (`user_id`, `requested_at`, `last_error`, `attempts`), with RLS on and no
  client policies (the client can't read or write it, so no new client data flow).
- Every under-age call first upserts the row, and a success deletes it with the account (it
  joins `USER_TABLES` so the delete-account function covers it, and cascades on the auth user).
- A daily pg_cron job (next to `tali-purge-unconsented`) deletes, through the same code path as
  `delete-account`, any account whose row is older than 7 days, and alerts Benn if it can't.
  The client stays as it is: the device path still finishes it sooner when it can.
- The account's own request is the basis: the person said they're under 18, so keeping the
  account has no lawful basis (Art. 5(1)(c), (e)). The row holds no health data.
- Needs: a migration, the function change and redeploy, a `security-data` review (service-role
  deletion without a fresh sign-in), the privacy policy's "Age" section and the register
  updated, and `compliance` sign-off. Open question for Benn: 7 days, or sooner.

**Follow-ups from Benn's device test (28 Sept 2026).**
- *No flash of the wizard.* The first run waits for the first pull for up to 10 s counted from
  when the wait starts (`FIRST_PULL_WAIT_MS`, `data/firstRun.ts wizardDueFor`); it used to be 6 s
  from launch, which the sign-in and consent screens could use up. Offline it runs at once. If the
  wait runs out and the pull then shows someone who used Tali before (or onboarded elsewhere),
  the wizard gives way to the app only while nothing has been tapped; once the person has
  started, it stays and the answers merge per field.
- *Set up my plan.* Someone who used Tali before onboarding and never ran it gets a Profile ›
  Health data row "Set up my plan" (Benn approved), in Redo setup's place: the same prefilled
  first run (age, height, weight, sex from the older M/F field, goal), and the same "Rebuild your
  week too?" offer. Finishing sets `onboardedAt`, after which the row reads "Redo setup".
- *Plan reasons sync.* A plan with no reasons on this device leaves the server's copy alone (no
  `why` sent); an empty list still clears it. Plans with and without `why` go in separate requests.
- *Pending under-age record.* A normal account deletion that succeeds clears it when it's that
  account's; another account's stays through the wipe.
