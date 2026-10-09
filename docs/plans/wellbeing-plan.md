# Wellbeing plan: sleep, stress and energy as the inputs to food and move

**Authors:** mental-performance (science, safety, load model), marketing-research (market, naming),
compliance (MHRA, GDPR, safeguarding), fitness-workouts (training adaptation); combined by Claude ·
**Status:** DRAFT for Benn, 7 Oct 2026 · **Nothing here is built.** ·
**Reviewers before any phase ships:** Benn (approves boards on the Design canvas), design,
mental-performance (all copy), compliance, security-data (any data change), ship-critic

**In short**
- **Don't build "Headspace inside Tali".** Audio libraries are saturated (Insight Timer claims about
  300k free tracks) and content alone doesn't retain: median 30-day retention for mental-health apps
  was 3.3% (Baumel et al. 2019). Even Calm split sleep into a separate app in Sept 2025.
- **Tali's wedge is the connection.** Tali already collects sleep, stress, energy and mood in one
  short check-in, and Train already offers a lighter session on a hard day. No single-domain
  competitor can say "on rough nights your plan got lighter and your food range had room". Whoop
  links behaviour to recovery, but not to food, and it needs hardware.
- **Answer to "asking too much":** wellbeing is mostly **context that lowers the bar**, not one more
  list of tasks. One shared daily budget of asks covers all three pillars. It tightens on hard days.
  Users choose which pillars they want.
- **Answer to "meditation is hippy":** offer short, practical **skills** named for what they do
  (Reset, Wind down, Unload, Get outside). Each has a one-line mechanism ("long exhales slow your
  breathing and heart rate"). The labels never say meditation, mindfulness, zen or journey.
- **Hard lines** (MHRA medical-device boundary): no CBT-I or sleep restriction, no PHQ-9/GAD-7 or
  any clinical scoring, no condition names as targets (insomnia, anxiety, depression), no risk
  detection. The only exception is a static support link, which stays visible at all times.

---

## 1. What exists today

Tali already has more of this pillar than it looks.

- **Check-in** (`screens/today/CheckinSheet.tsx`, `CheckIn` in `core/types.ts:214`). It asks:
  - mood (1-5), hunger (1-5);
  - sleep last night, stress, energy (1-3 each);
  - soreness (1-3, lifting days only);
  - a free-text note.

  Every question is skippable. The answers sync under `day_logs.supps._checkin` and are
  consent-gated as health data (`data/consent.ts`).
- **Lighter day offer** (`core/domain/dayOptions.ts`). `lowSignals()` compares today's answers with
  the person's own 14-answer median. With 2 or more low signals, Train offers three equal choices:
  planned, shorter (about 60% of the sets) or a swap (mobility or walk). There is no score, and it
  never changes the plan by itself. This is the right pattern to build on.
- **Onboarding "lately"** (sleep, stress, room for change). A poor answer sets `gentleStart`: fewer
  days, lower volume, no high-impact moves, a longer ease-in (`engine/generate.ts:310-360`).
- **If-then plans with a weekly review** (`screens/plan/PlanSheets.tsx`), gentle mode, the
  wellbeing screener outcome, a verified signpost table (`core/data/signposts.ts`), and the
  training-load note (`core/domain/load.ts`).

**Gaps**
1. **Check-in data is only used to adjust training.** Nothing reflects it back to the user, and
   nothing links it to food. The weekly summary covers calories, protein and sessions only.
2. **No tools.** After "Stress: High" the app has nothing to offer except a lighter workout.
3. **Sleep is one 3-step rating.** There is no duration or timing, and no data shape a wearable can
   fill later.
4. **No shared budget of asks.** The check-in, plan review, food prompts and notes each decide on
   their own whether to appear.
5. **No way to choose pillars.** Someone who only wants Mind and Move still sees Food everywhere.
6. **No visible support link** in the Mind area. The free-text note has no safety handling.
7. **Gaps in the training side:**
   - The lighter offer's swap isn't matched to the day (legs day should get hips and hamstrings).
   - The shorter session cuts sets but keeps the effort target.
   - Nothing looks across weeks.

---

## 2. Principles

1. **Mind first, but never a gate.** Every check-in question and every skill is optional. Food and
   Move work fully without them.
2. **Context, not homework.** A wellbeing answer should usually *remove* asks (lighter session,
   usuals first, fewer prompts), not add them.
3. **Patterns, not grades.** Weekly patterns in the person's own words. No sleep score, no mood
   score, no red/amber, no streaks, no "missed".
4. **Honest evidence.** Say what a practice is, not what it cures. Use "many people find", never
   "proven to reduce anxiety".
5. **Wellness, not treatment.** Stay on the general-wellbeing side of the MHRA line (§8) in the app,
   on the website, in store listings and on social media. The MHRA reads all of them for intended
   purpose.

---

## 3. Naming and positioning

- **In the app:** keep the pillar called **Mind**. It already maps to `--mind` and sits next to Food
  and Move. The tools inside it are **skills**.
- **In marketing:** "sleep, stress and energy". Avoid "Wellbeing" as a product name: it sounds
  generic and pulls towards clinical claims.
- **Draft positioning line:** "Tali notices how you slept and how you're feeling, and shapes today's
  food and movement around it. Rough night? Smaller asks, more room, and a two-minute reset if you
  want one."
- **Words to use:**
  - energy, rest, sleep, wind down, reset, breathe, recharge
  - "a rough night", "a busy head", "a stressful day"
- **Words to avoid as gym-bro:** recovery score, readiness, optimise, NSDR, biohack, grind, peak
  performance.
- **Words to avoid as hippy:** mindfulness, meditation, journey, zen, manifest, sound bath.
- **Words to avoid as clinical:** see §8.

None of this naming has been tested with UK users. The cheapest test is a headline A/B on
www.tali.fit (a new site script is a policy change, so it goes past compliance first).

---

## 4. Sleep, before wearables

### 4.1 What Tali offers (general wellness)

| Habit | Evidence | How Tali frames it |
|---|---|---|
| A consistent wake time, weekends included | Sleep regularity was more strongly associated with mortality than duration in UK Biobank (Windred et al. 2024, observational) | "Same wake time most days" as an if-then plan |
| A caffeine cut-off | Caffeine cut total sleep by about 45 min (Gardiner et al. 2023, meta-analysis). The modelled cut-off is about 8.8 h before bed for a coffee and about 13 h for a typical pre-workout | "An afternoon cut-off", not an exact time |
| Alcohol timing | Helps people fall asleep but disrupts the second half of the night (Ebrahim et al. 2013) | Neutral note in Wind down |
| Morning daylight, dimmer evenings | Strong lab evidence on the body clock (Gooley 2011; Blume 2019). The effect of everyday screen curfews is smaller and less certain | "Get outside" in the morning; dim lights in Wind down |
| 7 or more hours' opportunity | AASM/SRS consensus (Watson et al. 2015); NHS says 7 to 9 | Shown as a range, never a target to hit |
| Evening exercise | Fine for sleep, except vigorous work ending within about 1 hour of bed (Stutz et al. 2019) | Late evening: suggest a walk or the wind-down flow, as a choice |
| A bedtime to-do list | Helped people fall asleep faster (Scullin et al. 2018, n=57, weak) | Part of Unload |

**Out of scope:**
- sleep restriction or sleep window compression;
- stimulus control as a protocol;
- any insomnia "programme", score or diagnosis;
- sleep apnoea, beyond a GP signpost for loud snoring, gasping or very sleepy days;
- melatonin or supplement dosing.

NICE recommends Sleepio (digital CBT-I) as a regulated medical technology (MTG70, 2022). If Tali
offered the same techniques, its intended purpose would point towards a medical device. Persistent
poor sleep gets a GP signpost: "If sleep has been hard going for a few weeks, it's worth talking to
your GP." The exact wording is to be checked against NHS copy.

### 4.2 Self-report design

- **Tier 0 (exists):** "Sleep last night", Poor / OK / Good. Stays the default.
- **Tier 1 (optional, behind a "More about sleep" disclosure):**
  - "Roughly how long?" as bands: under 5, 5-6, 6-7, 7-8, 8+.
  - "Woke up around", pre-filled from yesterday.
  - Bands, not minutes: self-estimates are imprecise and precise numbers mislead.
- **Never asked daily:** time to fall asleep and night waking. That is CBT-I diary detail, and it
  feeds the anxious over-focus on sleep data known as orthosomnia (Baron et al. 2017).
- **When wearables arrive:**
  - Show total sleep and timing only. Consumer sleep staging is weak (Chinoy et al. 2021).
  - The person's own quality rating is always kept, and a device never overrules it.

### 4.3 Data shape (wearable-ready)

```ts
export type SleepSource = 'self' | 'healthkit' | 'health-connect'
export type SleepBand = 'lt5' | '5-6' | '6-7' | '7-8' | '8+'

/** One night, keyed to the day you woke up on. Self-report and device records sit side by side. */
export interface SleepNight {
  source: SleepSource
  band?: SleepBand        // self-report only
  asleepMin?: number      // device only; shown rounded, never staged
  bedAt?: string          // local "HH:MM"
  wakeAt?: string
  ext?: string            // device record id, so a re-import is a no-op
  t: string
}
```

Quality stays in `CheckIn.sleep` (1-3), so existing data and `lowSignals` are untouched. A pure
`nightFor(day)` in core picks what to display: the device duration if present, otherwise the self
band, always with the person's own rating.

---

## 5. Mind skills (no meditation framing)

Each skill is a text card plus a visual pacer: an expanding shape synced to the breath, the same
idea as the tempo timeline. A tick or haptic is optional. Phase 1 has no audio. Skills work fully
offline, and their copy and timings live in `core/data/skills.ts` with sources cited, as foods do.

| Skill | What it is | Evidence | Confidence |
|---|---|---|---|
| **Reset** (1-5 min) | Cyclic sighing (double inhale, long exhale) or slow breathing at about 6 a minute | 5 min a day of cyclic sighing for a month improved mood more than mindfulness meditation (Balban et al. 2023, RCT, n of about 110). Breathwork meta-analysis: small-to-medium reductions in self-reported stress (Fincham et al. 2023) | Moderate. Best of the set for a 2-minute tool |
| **Wind down** (self-paced) | A routine the user builds: dim lights, caffeine cut-off, Unload, Reset, optional floor stretches | Components supported (§4.1). The bundle itself isn't tested | Moderate (components) |
| **Unload** (2-5 min) | "Write what's on your mind, and one next step for each." Or a set "worry time" earlier in the evening | Expressive writing: small effect (Frattaroli 2006). Worry postponement helped high worriers (McGowan & Behar 2013) | Weak to small. A tidy-up, not therapy |
| **Get outside** | Daylight, green space, a walk if you like | 120+ min a week in nature linked to better wellbeing (White et al. 2019, observational) | Moderate association, weak causal |
| **Move for mood** (links to Move) | Any activity; walking counts | Medium reductions in depression and anxiety symptoms (Singh et al. 2023 umbrella review). Half the recommended walking dose still linked to about 18% lower depression risk (Pearce et al. 2022, observational) | **Strong.** The best-evidenced lever in the app |
| **Reach out** | Message or call someone | Social connection strongly associated with health (Holt-Lunstad 2010, observational) | Moderate association, weak intervention |
| **Focus** (3-10 min, later) | Eyes-open attention training: count breaths, notice, return | Better than nothing; generally no better than other active practices (Galante 2021; Goldberg 2018) | Moderate vs nothing. Lowest priority |

**Safety rules for every skill:**
- Meditation-style practice has side effects: about 8.3% of participants report adverse effects,
  mostly anxiety or low mood (Farias et al. 2020). So keep skills short and eyes-open friendly, and
  show "Stop any time. If this makes you feel worse, try a walk instead."
- No breath-holding or hyperventilation protocols (Wim Hof style). Add "If you feel dizzy, breathe
  normally."
- **Never offered as a way to manage hunger.** No "breathe instead of snacking", no "Reset to beat
  cravings".
- Gratitude is weak once compared with active controls (Davis et al. 2016). Offer it only as an
  optional Unload prompt ("one thing that went OK today"), never as "be grateful" copy.

---

## 6. "One thing" a day (wellbeing tasks without a to-do list)

Guilt and rewards are controlled motivation, and controlled motivation fades; autonomy and a sense
of competence sustain behaviour (Ntoumanis et al. 2021). A to-do list with ticks and incomplete
counts is controlled motivation. So:

- **At most one suggested thing a day.** The user picks it from 2 or 3 options; it is never
  assigned. Options come from today's check-in, the user's chosen pillars and their "why", e.g.
  "Reset before your session", "Get outside at lunch", "Wind down from 10:30".
- **No incomplete state.** An undone thing disappears at midnight. A done thing gets a quiet tick.
  No counts, no rings to close, no streaks.
- **One tap turns a thing that worked into an if-then plan** ("After lunch, I'll get outside for 10
  minutes"). Implementation intentions have a medium-to-large effect (Gollwitzer & Sheeran 2006,
  d = 0.65). Habits form over a median of about 66 days, and a missed day doesn't matter (Lally et
  al. 2010).
- **This reuses `IfThenPlan` and its weekly review.**
  - Add an optional `kind` so the review can say "Your sleep plan" and the Plan tab can group plans.
  - Starter plans are editable and never pre-saved, e.g. "When I get into bed, I'll put my phone
    across the room."
- The basis is behavioural activation, which improves wellbeing in non-clinical groups too
  (Mazzucchelli et al. 2010, g = 0.52). Frame it as "a small thing you'd enjoy". Never say "for low
  mood": behavioural activation for depression is treatment.

---

## 7. Not asking too much: how the pillars connect and share one budget

### 7.1 The connections (direction confident, size varies)

| Link | Evidence | What Tali does with it | What Tali never does |
|---|---|---|---|
| Sleep → eating | Short sleep raised next-day intake by about 385 kcal (Al Khatib et al. 2017, 11 small lab studies). Extending sleep cut intake by about 270 kcal/day (Tasali et al. 2022) | "Rough night: your range has room today" | Show the kcal figure as a prediction, or pair poor sleep with calorie advice |
| Sleep → training | Acute sleep loss cuts performance by about 7.6% on average (Craven et al. 2022). Effort feels harder; multi-set work suffers before a single max lift | Lighter session offered (exists), effort target eased | Say "skip", "readiness low", "recovery debt" |
| Stress → eating | Small effect (g of about 0.11). Many people eat *less* when stressed (Hill et al. 2022) | "Stress can change appetite either way" | Assume stress eating, or frame food as a coping failure |
| Stress → training | High stress slows recovery after resistance training (Stults-Kolehmainen & Bartholomew 2012) and makes people less consistent about staying active | Swap points to a walk or slow-breathing flow | Push a hard session |
| Exercise → mood and sleep | §5 (Singh 2023; Kredlow 2015) | "Move for mood" as a skill, respecting the `load.ts` guardrail | Frame movement as "earning" anything |
| Mind skills → logging or training consistency | **No trial tests this chain** | Measure it (§11) | Claim it |

### 7.2 Users choose their pillars

- A setting in onboarding and Profile asks "What do you want Tali for?" Mind, Food and Move each
  switch on or off, with at least one on.
- A pillar that is off disappears from Today and from prompts. Its data stays reachable from Profile.
- **Food off** means no calorie framing, while the lighter-day offers still work. Coordinate with
  gentle mode and `foodMode`, so that switching Food off is never the only route out of food
  tracking for an at-risk user.

### 7.3 One daily budget of asks

- **An "ask" is anything Tali starts that needs a response:**
  - the check-in prompt;
  - the suggested thing;
  - the plan review;
  - activity and food-range suggestions;
  - the welcome-back note;
  - a logging nudge;
  - a notification.

  Anything the user opens themselves is not an ask.
- **The module.** A new pure module, `core/domain/asks.ts`, ranks candidates in this order:
  1. safety;
  2. time-sensitive items (the plan review);
  3. the one thing;
  4. the rest.

  It returns at most **3 a day on "Usual" or 1 on "Fewer prompts"**, chosen in Profile. (Not
  "Light": that collides with "Lighter day", "Lighter week" and gentle mode.) It replaces the ad
  hoc `prompt` priority in `TodayScreen.tsx`.
- **Hard-day dial-down.** It triggers on the existing `lowSignals` count of 2 or more, or on mood
  Rough or Low. Mood counts here only, not in the training offer. On a hard day:
  - the budget drops to 1;
  - Train offers its lighter choices;
  - the suggested thing becomes a 2-minute Reset or Get outside;
  - Food shows usuals and "same as yesterday" first;
  - optional precision prompts are skipped (nutrition-accuracy to confirm which ones count as
    optional);
  - non-safety banners wait for another day.

  The calorie numbers themselves never change, and copy reads "A lighter day is still a good day."
- **First 90 days:**
  - weeks 1-2: the check-in and the one thing only;
  - weeks 3-8: plans and the weekly reflection come in;
  - after about day 90: suggestions fade unless the user asks for them.
- All thresholds are judgement calls, unvalidated, and flagged in code as `dayOptions.ts` does.

### 7.4 Notifications

- **Opt-in by type:** supplements (exists), check-in, wind-down, plan review.
- **At most 1 Tali-initiated notification a day** across all types.
- **Quiet hours:** none inside the wind-down window or before the user's wake time.
- **Back-off:** after 2 ignored in a row, the frequency halves, and Profile says so.
- **Rationale:** prompts habituate. HeartSteps' walking prompts added about 271 steps early on, but
  the effect could no longer be detected by about day 29 (Klasnja et al. 2019).
- **Copy:** never guilt. No "You haven't logged", no "Don't break your...".
- **Backend:** the server push function needs a per-user daily cap (security-data).

### 7.5 Training on a hard day (fitness-workouts)

- **Three equal choices, always:** planned, shorter or swap. Rest stays a choice the person can
  always make, never one Tali pushes.
- **Shorter:**
  - about 60% of the sets, as now;
  - **one more rep in reserve** on the effort target (2-3 becomes 3-4, capped at 4);
  - last time's weight or lighter, and no step-up prompt;
  - cardio becomes about 60% of the minutes at a talking pace.

  Cutting volume costs very little for a day or a week, provided effort is kept (Bickel 2011;
  Spiering 2021).
- **Poor sleep:**
  - high-impact, jumping and balance-under-load moves swap to their `gentler` alternative;
  - no intervals and no calibration sets that day.

  The idea is to avoid what goes wrong when tired. That is a judgement call, not proven: the injury
  evidence is observational (Milewski 2014).
- **High stress:** the swap points to a walk or a slow-breathing floor flow.
- **Day-matched swaps** (10-20 min each):
  - legs day: hips, hamstrings and calves;
  - Push or Pull day: thoracic spine, chest and shoulders;
  - cardio day: the easy walk.

  New `SWAPS` templates are `mobility-lower`, `mobility-upper` and `wind-down` (floor holds only,
  built from existing library ids such as `childs-pose`, `supine-twist`, `legs-up-the-wall`,
  `cat-cow`).
- **Across weeks:** when 5 or more of the last 14 check-ins have 2 or more low signals, *offer* a
  lighter week, reusing the `maintain` phase. Never apply it automatically.
- **Code:**
  - Move the decision out of `TrainScreen.tsx` into `dayOptions()` returning `DayChoice[]`, as the
    engine spec §4.0.5 already describes.
  - Add `targetFor(..., { hold: true })` in `guided.ts`, so the "hold progression" rule lives in
    core and not in screens.
  - Add "skip", "readiness", "recovery debt" and "you should rest" to `BANNED_COPY`.

---

## 8. Safety and the medical-device line

### 8.1 MHRA boundary (MHRA digital mental health technology guidance, updated 29 July 2026)

A product is software as a medical device (SaMD) if it has **both** a medical purpose **and**
sufficient functionality. Wearables, adaptive recommendations and an AI coach put Tali's
functionality in the "high" bracket. So Tali's protection rests almost entirely on **intended
purpose and wording**, everywhere it appears.

| Stays wellness | Tips into device |
|---|---|
| Self-reported sleep, mood, stress logs; neutral weekly patterns | Treating, curing or "helping with" insomnia, anxiety, depression, burnout |
| Breathing, wind-down, Unload, Get outside, one thing | CBT-I, sleep restriction or compression |
| A simple, visible "you said sleep was poor, so here's a lighter option" rule | PHQ-9, GAD-7, ISI, PSS or any scoring against clinical cut-offs |
| A static support link everyone can reach | Mood labels ("signs of anxiety"), risk detection or crisis prediction |
| | Tailoring wellbeing *for* people with a diagnosed condition (Tali asks about diabetes, kidney disease and GLP-1: never target skills at those groups) |

- **Copy, do say:**
  - "wind down for sleep", "a few slow breaths", "a small thing you'd enjoy today";
  - "For everyday wellbeing. Not a treatment for any condition."
  - "If sleep, mood or stress has been hard for a while, talk to your GP."
- **Copy, don't say:**
  - condition names as targets;
  - treat, cure, therapy, therapeutic, clinical, prescribe;
  - "manage your anxiety", "reduce symptoms";
  - diagnose, screen, detect, risk score, severity;
  - CBT, CBT-I;
  - "measures stress", "accurate sleep stages".
- **ASA/CAP:**
  - Objective claims ("breathing lowers stress") need trial evidence for the method as presented,
    so describe the activity instead.
  - Never discourage seeking treatment.
  - Any sleep or mood claim about a food or supplement falls under nutrition-claim rules
    (nutrition-accuracy).

### 8.2 Safeguarding

1. **An always-visible "Need support now?" link** in the Mind area and at the foot of every skill,
   mood and Unload screen. It reads from `SIGNPOSTS`:
   - 999 for immediate danger;
   - Samaritans 116 123 (24/7, free);
   - NHS 111 option 2 (with the nation equivalents already modelled);
   - Beat;
   - Shout (text SHOUT to 85258), which is not in `signposts.ts` yet.

   Verify Shout, and re-verify every number at launch.
2. **A run of low mood:**
   - Trigger: mood Rough or Low on most check-ins over 14 days.
   - Shown once, kindly: "Things seem to have been hard for a while. Talking to your GP or calling
     NHS 111 can help, and Samaritans are there any time on 116 123."
   - At most once a month, and then the budget drops to 1.
   - It is a signpost, not an assessment.
3. **Free text (the check-in note and Unload):**
   - **Phase 1 doesn't scan it.** The footer says plainly: "Tali doesn't read your notes. If you're
     struggling, [support]."
   - A later on-device keyword check is possible. It would only *show* the same support card, with
     nothing recorded or sent, and it needs clinician review of the word list. Even that is a grey
     area under the MHRA test, so it goes into the regulatory-opinion question (ai-platform-plan
     §8).
4. **Tali never monitors, triages or contacts anyone.** The terms and the screens near Unload say
   it isn't a crisis service, and that the user should call 999 in an emergency.
5. **Age:** stays 18+. Sleep and journaling content appeals more to teenagers than calorie
   tracking does. Write the DPIA's "likely to be accessed by children" assessment (register item
   21) before Phase 2. No exam-stress style marketing.
6. **Disordered eating and compulsive exercise:**
   - gentle mode and the `outcomes.wellbeing` routing outrank every Mind suggestion;
   - "Move for mood" respects the `load.ts` guardrail.

---

## 9. Data and compliance

- **Health data:** every new item is special-category health data, by nature or by inference:
  - sleep times and bands;
  - skill completions;
  - the one thing;
  - adaptive-load outputs;
  - Unload text.
- **Consent:** the existing health consent already names sleep, stress and mood, so Phase 1 needs
  **no `CONSENT_VERSIONS.health` bump**. The privacy policy and register must still list the new
  fields **in the same change**; if the policy doesn't match the code, that blocks the change.
- **Storage:**
  - **Nest** `nights`, `skills` and `thing` inside `CheckIn`, so they ride the existing
    `supps._checkin` path. That path is already consent-gated, held back without consent and
    cleared on withdrawal, so there is no new table, trigger or `USER_TABLES` change.
  - `setCheckin` must **merge, not replace**, so logging a skill never wipes the mood answers.
  - The rule that turns an empty check-in into `null`, and `healthDataSummary`, must count the new
    fields.
- **Unload text is the exception: on the device only.**
  - It is unbounded free text that can name any special category, and it can name other people.
  - It is stored outside the synced payload, never sent to AI, kept out of logs and push payloads,
    included in export, and cleared on withdrawal and on "delete this device's log".
  - Cloud sync would need its own opt-in, its own table and an encryption decision (security-data).
    Encryption may not be workable with Google sign-in, because there is no password to derive a
    key from.
- **Open decision on the check-in note:** it already syncs, and the policy discloses that, so it is
  lawful. Two free-text fields with different rules will confuse people, though. Benn to decide
  whether the note moves to the Unload rules.
- **`MindPrefs`** (pillars, asks level, wake and wind-down times, notification types,
  `lowMoodShown`) rides `settings.profile` like `TrainingPrefs`, with `answeredAt` keys for the
  field-by-field merge.
- **Wearables (native build only):**
  - A PWA can't read HealthKit or Health Connect, so this phase needs the native shell. Avoid vendor
    cloud APIs (each one is a new recipient).
  - It needs a new `wearables` consent type (a migration of the `consents` type check, plus
    `CONSENT_TYPES` and `CONSENT_VERSIONS`).
  - Read sleep only, read-only, summaries only, a bounded backfill (14-30 days), and an off switch
    that offers to delete the imported data.
  - Apple 5.1.2(vi) and 5.1.3: no marketing use, the exact data types disclosed, no iCloud storage
    of health data.
  - Play: Health Connect declarations and the Data safety form.
  - Inferring stress from heart rate or HRV may count as emotion recognition under the EU AI Act.
    Get advice before building it.
- **Audio:**
  - Host it on Bunny (an existing processor) or bundle it, with neutral file names (not
    `anxiety-relief.mp3`).
  - No third-party player embeds.
  - Listening history stays on the device or isn't kept.
- **Existing gap, owed now:** `privacy.ts` "Automatic calculations" should already say that sleep,
  stress and energy answers can make Tali suggest a lighter session, because `offerLighter` does
  this today. Fix it in the Phase 1 change at the latest.

The full checklist per phase (policy, register, DPIA, triggers, purge functions) is in the
compliance brief behind this plan. Phase 1 needs the following:

- [ ] `privacy.ts`: add the new fields to "Your log", add the adaptive suggestions to "Automatic
      calculations", add a line saying Unload text stays on the device, and bump `updated`.
- [ ] Register: update the "Day logs" row, and add a row for Unload text (on the device only).
- [ ] `terms.ts`: extend "Not medical advice" to cover skills, and add "not a crisis service".
- [ ] `cookies.ts`: list the device storage key used for Unload.
- [ ] `consent.ts`: the new fields join `HEALTH_FIELDS` and the withdrawal clearing; export covers
      them; tests prove both.
- [ ] DPIA: an addendum covering more frequent mood and sleep data, free text, and the MHRA
      analysis.
- [ ] `npm run check:legal`, then compliance, security-data, mental-performance and ship-critic.

---

## 10. Roadmap

### Phase 1: connected Mind, no wearables, no audio

The phase is ordered so each step stands alone and the cheapest, most valuable step comes first.

1. **Asks budget and pillar choice.** Pure `asks.ts` with unit tests, and Profile settings. The
   risk is low, and it is the direct answer to "asking too much".
2. **Hard-day dial-down plus the training changes in §7.5.** These build on `dayOptions.ts`.
3. **Weekly reflection card** (no AI, all on the device):
   - check-ins this week, as a plain count ("4 check-ins this week", never "4 of 7");
   - sleep band most nights;
   - skills used;
   - plans reviewed;
   - at most one neutral observation once there are at least 8 data points, e.g. "On nights over 7
     hours you more often rated energy OK or Good". Always "often", never "because".
4. **Support link** everywhere in Mind, and the low-mood signpost.
5. **Skills:** Reset, Wind down, Unload and Get outside first. Reach out and Focus can follow.
6. **The one thing**, with one-tap conversion to an if-then plan; plan `kind`; starter plans.
7. **Sleep tier 1** (band and wake time).
8. **Notification budget** (1 a day, quiet hours, back-off).

**Feature flag:** ship 3 and 4 first behind a flag, and measure before building 5 to 8 (§11).

### Phase 2: guided audio (small)

- A few reviewed tracks for Reset and Wind down, 3-10 minutes each, generated once per track (not
  per user), with transcripts.
- AI voices are labelled (EU AI Act Art. 50).
- No library, no sleep stories, no celebrity voices.

### Phase 3: wearables (native shell)

- Import sleep from HealthKit and Health Connect into `SleepNight`.
- The device can **pre-fill** the sleep band, but the quality rating is always the person's own.
- `lowSignals` gains a "short night" signal: device total more than 1 hour under the person's own
  14-night median (a judgement call).
- Heart rate and HRV come later, if ever: as context only, never a score.

### Phase 4: AI coach

- This is ai-platform-plan capability E, rated high risk.
- It comes after evals, a red-team pass, the regulatory opinion and an ICO prior-consultation
  decision.
- The AI consent is rewritten, and the server gates on both the `ai` and the `health` consent.
- Unload text is never sent unless the user picks a single entry to share.

**Not building:**
- an audio library;
- meditation courses;
- an AI emotional-support chat before Phase 4;
- CBT-I;
- clinical questionnaires;
- mood or sleep scores;
- streaks;
- more mandatory logging.

The check-in stays one sheet, about 10 seconds long, and optional.

---

## 10a. Design direction (design agent review: CHANGES NEEDED until these are settled)

- **Where Mind lives:** no sixth tab. The Mind card on Summary opens a **Mind page**: check-in,
  skills, the weekly reflection and the support row. If-then plans stay in Plan.
- **Today stays uncluttered.** Today has one prompt slot plus the plan-review banner, and `asks.ts`
  decides what fills the slot.
  - The one thing is not a new card. It sits inside the Mind card once the check-in is done: 2 or 3
    `.chip` options, and a quiet tick when done.
  - "A lighter day is still a good day" goes in the same place, not in a banner.
- **Breathing pacer:** a card screen, not a video screen.
  - It follows light and dark, with no full-bleed black.
  - It is drawn in `--mind` / `--mind-fill`, not `--tint`.
  - The reduced-motion rule (`theme.css`) freezes the shape, so it needs a text fallback ("In...
    out..." plus the count).
- **Colour:**
  - Skills, reflection and the one thing use mind.
  - Get outside and Move for mood use move, because they lead into Move.
  - Sleep bands and the 7+ range use the neutral `--band`.
  - Support never uses `--red`.
  - The low-mood signpost is a mind-coloured `.banner`, not a warning.
- **Support row:** a quiet `.li` row, "Need support now?", at the foot of the Mind page and of every
  skill and Unload screen, reusing `profile/supportRows.ts`. Not on the Summary card (compliance to
  confirm that's enough).
- **Icons:** plain and functional (wind, moon, pen, sun). No lotus or zen glyphs.
- **If-then plans** need a visible group name per `kind`, because "Plan" already covers training
  plans too.
- **Phase 1 boards, in order:**
  1. pillars and asks settings;
  2. Summary on a hard day;
  3. Train hard-day choices;
  4. weekly reflection (under 8 data points, and with one observation);
  5. Mind page;
  6. support and low-mood signpost;
  7. Reset skill with pacer, including reduced motion;
  8. Unload;
  9. one thing;
  10. check-in with sleep tier 1;
  11. notification settings.

---

## 10b. Phase 1 boards drafted (7 Oct 2026, all Pending Benn)

The 11 boards are on the Design canvas, section "8 · Wellbeing Phase 1"
(https://claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb). Each board has a light, a dark and an
"options and states" artboard, and a dashed Pending tag. The copy went past `mental-performance`
and `compliance` before it was drawn; both returned CHANGES NEEDED and every required change is in
the boards. The `design` agent's verdict is CHANGES NEEDED, only because Benn's decisions and the
reviews below are still open. Nothing here changes app code.

### Copy and decisions changed from the sections above

- **Skills (§3, §5):** no mechanism lines on screen in Phase 1 ("long exhales slow your heart rate"
  is an objective claim, CAP 12.1). Skill rows describe the activity only. Safety line: "If you feel
  dizzy or uncomfortable, breathe normally." Pacer timings come from `skills.ts` with a source; the
  boards show placeholders. If someone stops early: "Come back to this whenever you like.", never a
  partial time.
- **One thing (§6):** on a hard day it is Mind-led under either option, with no food chip. The food
  option reads "Lunch somewhere you like": never about amount, timing or eating rules, and never
  shown in gentle mode or wellbeing routing. A plan made from it is saved under "Mind plans".
- **§7.1:** "Rough night: your range has room today" is dropped (it pairs poor sleep with the
  calorie range). The "room" lines in the positioning need the same look.
- **Pillars (§7.2):** the Food-off line reads "Finding food tracking hard? Gentle display hides the
  numbers, and support is here." (each one tap). With Mind off, Support stays in Profile and the
  low-mood signpost can't show (an accepted limit). Switching Food off never resets gentle mode.
- **Hard day (§7.3):** the one thing is the single ask. A due plan review waits a day on any
  hard day (Benn, 9 Oct; see Build decisions). The weight tile shows "Last weigh-in", not the weekly change.
  Usuals start with "Same as yesterday".
- **Notifications (§7.4):** new types are opt-in, off by default, and need a current health yes.
  Back-off notice: "The last 2 check-in reminders went unopened, so Tali now sends them half as
  often. Nothing you need to do." The open count stays on the device.
- **Train (§7.5):** three equal options (as planned, shorter, the day-matched swap); rest is a plain
  line, "Resting today is fine too." Shorter note: "fewer sets, 3 or 4 reps to spare on each, and no
  adding weight." Poor-sleep note says "rough night"; app copy "Short night?" becomes "Rough night?".
- **Support (§8.2):** Shout (text SHOUT to 85258, 24 hours) checked by compliance on 7 Oct 2026
  against Shout's FAQ; not yet in `signposts.ts`. Footer: "Opening this page is private. Tali doesn't
  record it or tell anyone. Calls to these numbers are free. Texting Shout is free from the main UK
  networks." Opening Support is never counted, logged or synced. In the Mind context Samaritans come
  first. On the Mind page the "Need support now?" row sits under the Today card (the foot is below
  the fold). The low-mood signpost needs a minimum number of answered check-ins (e.g. 5) and is the
  only ask that day.
- **Unload (§9):** "Your notes stay on this device only. They aren't synced or sent anywhere, so if
  you remove Tali or clear this device's data, they're gone." Toast: "Saved on this device". No
  "worry time" in Phase 1. Earlier notes: a quiet row with delete and no count.
- **Reflection (§10):** "Mostly 6 to 7 hours"; "Over the last two weeks, on nights over 7 hours you
  more often rated energy OK or Good."; "Just a pattern in your own answers, not a rule." Empty
  lines are left out. An observation needs paired answers, at least 8 in 14 days and at least 3 on
  each side (judgement calls), and pairs sleep with energy or stress only: never food, weight or a
  skill's effect.
- **Sleep (§4.2):** "A rough idea is plenty. Leave it blank if you like." The wake time pre-fills
  only once "More about sleep" is opened. No 7+ target zone is marked. Check-in footer: "Answer what
  you like, and leave the rest. There's no right answer. Sleep and stress often show up in hunger
  and energy, so these help you spot patterns. On a tough day, Tali asks for less and offers lighter
  options."

### Navigation (Benn, 8 Oct 2026)

**Decided:** Mind is its own tab. The tab bar is Summary, Mind, Food, Train, Plan; Profile leaves
the tab bar. The Profile icon (today's Summary avatar button) always sits next to the screen title
on every screen that has a title, tab roots and pushed screens alike, and it is the only way into
Profile. It aligns to the top of the title, so on a title that wraps it sits level with the first
line. Benn approved the drawing (canvas section 9) on 8 Oct 2026. Screens with no title (sheets, the guided player) don't carry it. The Mind tab root is the
Mind page; the Summary Mind card switches to it. This supersedes §10a's "no sixth tab, Mind page
from the Summary card". Earlier options (an avatar on root screens only; Train and Plan merged into
Move) were rejected: Profile must be reachable from everywhere and Plan must not be buried.

### Reset pacer direction (Benn, 8 Oct 2026)

Benn rejected the plain circle and chose a soft glowing sphere from a reference: canvas 8c,
"P6 · Glow", **approved by Benn on 8 Oct 2026** (the visual; the timings are not yet sourced). A radial gradient from `--card` at the centre to `--mind-fill` and `--mind` at the
rim, four fine `--mind` rings fading outwards, in light and dark. The 1-2-3 phase count sits in the
centre in the guided player's count style (`.gp-count`), in `--label` with the phase word in
`--mind-ink`; it counts up within each phase, never down the session. The sphere grows on the
in-breath, a little more on the second, and settles slowly on the out-breath; reduced motion holds
it still while the word and count step. The demo timing on the board (2 s, 1 s, 6 s) is not final:
real timings come from `skills.ts` with a source. In the build, the count and phase word must be
driven from JS, because the app's reduced-motion rule cuts CSS animations short. The P1 to P5
explorations have been taken off the canvas.

### Boards approved for now (Benn, 8 Oct 2026)

Benn approved B1 to B11 "for now", with the recommended picks: the pillar is called **Mind**; the
Mind card on Summary opens the **Mind page**; the one thing is **Mind-led on hard days** and offers
**one option from every pillar on ordinary days** (the food option stays context-only, "Lunch
somewhere you like", never in gentle mode or wellbeing routing); **no food or weight lines** on the
weekly reflection; the **support row sits under the Today card** on the Mind page. On (c) Benn chose **C1**: a pillar the person switches off
disappears from Today and the reflection (their switch wins over the weight-and-food rule); the
log is kept and comes back when the pillar is switched on. Still open: the items below that the boards do not settle.

### Build decisions (Benn, 8 Oct 2026)

- **Unload stays on the device only** (§12.3: yes). Included in JSON export, cleared on consent
  withdrawal and on delete-device-log.
- **Build all of Phase 1 behind a feature flag** that stays off for users; nothing merges to `main`
  until Benn and `ship-critic` say so. The low-mood signpost and the skill copy stay off until the
  clinician review (§12.5).
- **Reminders never show supplement names on the lock screen by default** ("Time for your
  supplements"); a Profile setting "Show names on the lock screen", off by default, brings them
  back. This fixes a live issue security-data found; the setting goes to the canvas for approval.
- **Reminders follow each person's own time zone**: an IANA time zone (from the device) is stored
  with the reminder settings. A new data item, so the privacy policy and register change with it.
- **Mind pillar off:** the Mind tab stays in the tab bar, faded and disabled. Food, Train and Plan
  tabs always stay; a switched-off Food or Move only disappears from Today and the reflection.
- **Train copy:** fitness-workouts' corrected B3 strings are accepted (three or four reps to spare,
  day-matched swap names, the rough-night note); the B3 board is updated to match.
- **Not drawn yet, so not in this build:** the Wind down and Get outside screens and the "Show
  names on the lock screen" setting. Boards are being drafted for approval.
- **The supplement lock-screen fix ships ahead of Phase 1** once `ship-critic` passes; Benn is asked
  before anything is applied to the live database.
- **Reset timings: 3 s in, 1 s in again, 6 s out** (about 6 breaths a minute), Tali's own pacing
  choice. Balban et al. 2023 used self-paced cyclic sighing with no fixed counts, so the timings
  are never attributed to the study.
- **A due plan review waits a day on any hard day** (not only a low-mood one), so the Mind-led one
  thing shows; it comes back the next ordinary day and is never dropped.
- **Wording:** the weekly pattern line says "on nights of 7 hours or more"; the done ticks read "Got
  outside" and "Lunch somewhere you like"; the sleep words "Mostly under 5 hours / 5 to 6 hours /
  6 to 7 hours / 7 to 8 hours / 8 hours or more" are approved.
- **Supplement reminders sit outside the one-a-day limit**; check-in, wind-down and plan reminders
  share one a day.

### Open for Benn (on the boards)

- (a) Mind, Rest or Recharge; and the skill names.
- (b) Mind page (recommended) or the other two placements.
- (c) C1 or C2 when a pillar is switched off, against the weight-and-food rule.
- (d) one thing from every pillar or Mind-led on ordinary days (mental-performance recommends
  Mind-led).
- Food and weight lines on the reflection (recommended off).
- Support row under the Today card, or at the foot with the plan's "always visible" reworded.
- New `.chip.mind` / `.chip.move` selected colours; sleep bands selected in `--band` while the
  sheet's other scales select in `--tint`.
- Plus §12.3 (Unload on the device only: the B8 line is only true if approved), §12.5 (clinician
  review), supplement reminders outside the one-a-day cap.

### Still to do before build

- Sign-offs: `fitness-workouts` (B3 effort note, which swap on a high-stress day),
  `nutrition-accuracy` (usuals first, the optional "Rough night? Your usuals are first today."),
  `security-data` (Unload storage, server reminder cap, supplement name on the lock screen).
- Compliance's pre-build list: `privacy.ts` (log, settings, automatic calculations, reminders),
  `cookies.ts` (Unload and "More about sleep" keys), `terms.ts` (not a crisis service, doesn't
  monitor what you write), `signposts.ts` (Shout), register rows 42 and 63, DPIA addendum,
  `lowMoodShown` in `HEALTH_FIELDS` and withdrawal clearing. No health consent version bump.
- Follow-ups moved off the boards' old Pending tags (for reviewers and the build, not Benn):
  B1 the new Profile group, and "3 and 1 a day" are judgement calls; B3 `mobility-lower` isn't
  built and the shorter effort target needs fitness-workouts; B4 observation thresholds and the
  empty-state wording; B6 the exact NHS wording and the minimum check-ins before the signpost;
  B9 the plan `kind`, its group name and the Mind plan placeholder; B11 the halving rule is a
  judgement call.
- The maintenance-loop boards still say "4 of 7 nights" and "3 of 7 check-ins"; they need the same
  plain-count fix.
- App issues seen while drawing: Toggle (31 px) and Seg (32 px) are under the 44 px target;
  placeholder text colour in the app not yet checked for contrast.

---

## 11. How we'll know it works

All of these are aggregated and need consent. Adding new analytics is itself a privacy-policy
change.

- **First, use data Tali already holds:** how often the check-in is completed now. If it is under
  about 30% of active days, fix the check-in before adding anything else.
- **Primary measures:**
  - weeks with any food logging;
  - planned sessions done;
  - check-in completion;
  - retention at 30, 60 and 90 days;
  - logging continuity in the 3 days after a "Poor" sleep answer, before and after the dial-down
    ships.
- **Harm signals, watched as closely as benefits:**
  - gentle mode switched on;
  - support-link taps;
  - notifications turned off;
  - pillars switched off;
  - a fall in check-in mood after the Mind features launch.
- **Caveat:** these comparisons are observational, because people who use skills differ from people
  who don't. A causal claim needs a randomised rollout.

---

## 12. Decisions for Benn

1. **Pillar name:** keep **Mind** (recommended), or Rest or Recharge? The skill names (Reset, Wind
   down, Unload, Get outside, Reach out, Focus) also need approval.
2. **Asks budget:** 3 on "Usual" and 1 on "Fewer prompts", and 1 notification a day. These are
   judgement calls.
3. **Unload text on the device only** (recommended). Should the existing check-in note follow the
   same rule?
4. **Phase 1 order and flag:** ship the reflection card and support link first, then measure.
5. **Clinical review:** pay for a clinician to review the low-mood signpost, the skill copy and the
   Unload prompts (DPIA D1 already asks for this for onboarding).
6. **Design:**
   - Approve the Mind card opening a Mind page, with no new tab.
   - Decide whether a pillar the user switches off overrides your rule that every board shows weight
     and food.
   - Decide whether the one thing must offer an option from every pillar (your maintenance-loop
     rule) or can be Mind-led.
   - Then the 11 boards in §10a.

## 13. Open questions nobody could answer yet

- Whether the MHRA would see an on-device keyword safety net as a clinical task.
- Whether AI inference of stress from wearable HR or HRV counts as emotion recognition under the EU
  AI Act.
- Whether journal encryption is workable with Google sign-in.
- Whether a Health Connect security assessment applies.
- Per-country EU crisis-line coverage.
- UK data on attitudes to meditation by gender.
- How the names test with real users.
- Citations not re-checked this session, to verify before any appears in product copy: Craven 2022,
  Windred 2024, Pearce 2022, Snyder 2018, Milewski 2014, and the exact NHS low-mood wording.

## Key sources

- Balban et al. 2023, cyclic sighing: https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947
- Fincham et al. 2023, breathwork meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC9828383/
- Gardiner et al. 2023, caffeine and sleep: https://eprints.leedsbeckett.ac.uk/id/eprint/9625/
- Al Khatib et al. 2017, sleep loss and intake: https://nutrition-evidence.com/article/264447/the-effects-of-partial-sleep-deprivation-on-energy-balance-a-systematic-review-and-meta-analysis
- Tasali et al. 2022, sleep extension: https://www.uchicagomedicine.org/en/forefront/research-and-discoveries-articles/2022/february/getting-more-sleep-reduces-caloric-intake
- Hill et al. 2022, stress and eating: https://eprints.whiterose.ac.uk/174287/
- Mazzucchelli et al. 2010, behavioural activation for wellbeing: https://pubmed.ncbi.nlm.nih.gov/20539837
- Farias et al. 2020, meditation adverse events: https://pureportal.coventry.ac.uk/en/publications/adverse-events-in-meditation-practices-and-meditation-based-thera/
- Klasnja et al. 2019, HeartSteps: https://pmc.ncbi.nlm.nih.gov/articles/PMC6401341
- Baumel et al. 2019, mental-health app retention: https://www.jmir.org/2019/9/e14567
- NICE MTG70 (Sleepio): https://nice.org.uk/guidance/MTG70/chapter/the-technology
- MHRA, digital mental health technology qualification and classification: https://www.gov.uk/government/publications/digital-mental-health-technology-qualification-and-classification
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Health Connect policy: https://support.google.com/googleplay/android-developer/answer/12991134
- Calm Sleep launch: https://www.calm.com/blog/calm-sleep-press-release
- Sleep Cycle annual report 2025: https://www.inderes.fi/en/releases/sleep-cycle-ab-publ-publishes-annual-report-for-2025

Other citations (Windred, Watson, Gooley, Blume, Stutz, Kredlow, Singh, Pearce, Craven, Bickel,
Spiering, Gollwitzer & Sheeran, Lally, Ntoumanis, Holt-Lunstad, White, Davis, Frattaroli, McGowan &
Behar, Galante, Goldberg, Baron, Chinoy, Milewski, Stults-Kolehmainen) are cited from the literature
and were not re-fetched for this plan.
