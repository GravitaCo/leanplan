# Flow (cycle-aware guidance) and demonstrator-matched demo videos: research

Status: research only, Sept 2026. Nothing here is built. Decisions for Benn are in §9.

Sources: five specialist reviews run in parallel (`mental-performance`, `nutrition-accuracy`,
`fitness-workouts`, `security-data`, and a market and inclusion review). Evidence ratings used
throughout: **strong**, **moderate**, **weak**, **contested**, **unknown**. Nothing here is legal or
medical advice; §7 lists what needs a lawyer and a clinician.

## 1. Summary

1. **Follow symptoms, not phases.** All three health reviews agree. On average, cycle phase has a
   trivial effect on strength, endurance, adaptation, energy expenditure and mood, and people vary
   a great deal from each other. Symptoms (cramps, heavy bleeding, fatigue, poor sleep, low mood) are
   common and really do change how a day goes. So Tali asks how someone feels and adapts to that.
   Phase is shown only as soft context ("Day 2 of your period") and never changes a plan by itself.
2. **This fits Tali's mind-first frame better than "cycle syncing" does.** Tali already offers a
   lighter session when two or more check-in answers are low (`core/domain/dayOptions.ts`,
   `lowSignals` / `offerLighter`). Flow symptoms become extra signals in that same rule.
3. **Don't change calorie or macro targets by phase.** Resting energy use rises about +40 kcal/day
   in the luteal phase, which is smaller than the ±170 kcal error of a typical logged day.
4. **The real wins are specific:**
   - neutral copy that says pre-period hunger is normal;
   - iron-rich food suggestions on heavy-flow days;
   - a weight-trend note for water retention during a period;
   - a gentle GP prompt when periods stop while someone is eating in a deficit.
5. **Cycle data is special-category health data.** Store it on the device only by default, with
   explicit consent, a real "delete all" action, and no analytics, AI or lock-screen exposure.
   Tali must stay out of fertility and ovulation prediction, or it becomes a medical device.
6. **All four current demo clips already show a woman.** The shared prompt block in
   `docs/exercise-video-prompts.md:71` says "Woman in her 30s" (from the prompt doc; the footage
   hasn't been watched to confirm). Matching demos to the user therefore means making **male**
   versions.
7. **Identity:** don't collect sexual orientation. It serves no feature and is explicitly special
   category data. Keep the demo-video choice separate from any identity question.
8. **The market claim needs softening.** At least ten products adapt training or nutrition to the
   cycle. What looks open is Tali's specific combination (§6).

## 2. What the evidence says

### Mind (mental-performance)

- **Cycles vary more than apps assume (strong).** In 612,613 tracked cycles the average was 29.3
  days, the follicular phase ran 10 to 30 days and the luteal phase 7 to 17 days (Bull et al. 2019,
  *npj Digit Med*). A phase predicted from a calendar is an estimate and must never be shown as fact.
- **Mood (contested).** A review of 47 studies that tracked mood daily found 38% of people showed
  no link between mood and any phase (Romans et al. 2012, *Gend Med*). A real subgroup gets worse
  before their period, including people whose existing depression or anxiety worsens then.
- **PMDD (strong).** About 1.6% have confirmed PMDD and 3.2% a provisional diagnosis (Reilly et al.
  2024). It is linked to raised suicidal ideation and attempts. Tali must not label, score or
  suggest PMS or PMDD.
- **Expectation shapes symptoms (moderate).** People told they are premenstrual report more
  symptoms (Ruble 1977, *Science*; AuBuchon & Calhoun 1985; Marván & Escobedo 1999). Tali must never
  tell someone how they will feel.
- **Sleep (moderate).** Sleep is worse late in the luteal phase and early in a period, mainly for
  people with symptoms (Baker & Lee 2018).
- **Pain sensitivity (contested)** across phases. Period pain itself is common and real.
- **Perimenopause (strong).** Depression risk is about 40% higher (Badawy et al. 2024), and
  irregular cycles make phase prediction fail.

### Food (nutrition-accuracy)

- **Energy expenditure.** Resting energy use rises about +40 kcal/day in the luteal phase (95% CI
  −2 to 82; Löfberg et al. 2024, *MSSE*, n=38). A meta-analysis confirms the direction but couldn't
  size it (Benton et al. 2020). Evidence: moderate for direction, weak for size. Combined-pill users
  show no change.
- **Compared with Tali's margin.** Using `core/domain/estimate.ts`, a realistic mixed day of about
  1,950 kcal is ±170 kcal, and a fully weighed day is ±60 kcal. The Mifflin formula itself is only
  within ±10% for most people. **No phase adjustment.**
- **Intake (moderate for direction).** Intake rises about +168 kcal/day in the luteal phase on
  average (Tucker et al. 2025, *Nutr Rev*). The size for any one person is unknown.
- **Cravings (weak to moderate).** Chocolate craving is partly cultural (Hormes & Niemiec 2017).
  Tali must never say a craving means the body "needs" something.
- **Iron (strong).** Heavy periods raise the risk of iron deficiency. 25% of UK women aged 19 to 64
  have iron intakes below the lower reference level (NDNS years 9 to 11). Food-first copy is safe.
  Dose advice is not.
- **Other nutrients.**
  - Calcium: moderate (one trial, at supplement doses).
  - Vitamin D, magnesium, B6 and omega-3: weak for PMS.
  - Tali may repeat general UK advice (for example, vitamin D from October to March) but must not
    suggest supplements or doses.
- **Protein and carbohydrate by phase.** ISSN 2023 suggests more in the luteal phase. The evidence
  is contested (Colenso-Semple 2025 found no phase effect on muscle protein synthesis). Tali's
  existing protein ranges already cover this.
- **Low energy availability (strong).** Tali's own targets can produce it. Worked example:
  - a 60 kg woman, very active, on a 25% deficit, burning 500 kcal in training;
  - she ends up at about 27 kcal/kg lean mass per day, below the 30 threshold;
  - the BMR floor does not prevent this.

  Periods stopping is the visible sign. Never show an energy availability number; the measurement
  error is too large.

### Move (fitness-workouts)

Two of the reviews verified the McNulty and Colenso-Semple citations online. The fitness review
cited the others from memory, so check them before quoting any figure in the app.

- **Performance across phases (strong that the average effect is trivial).** McNulty et al. 2020
  (*Sports Med*, 78 studies) found at most a trivial dip in the early follicular phase (ES ≈ −0.06),
  mostly from low-quality studies. The authors recommend individual approaches.
- **Strength (moderate to strong).** Colenso-Semple et al. 2023 (umbrella review) found no effect
  of phase on strength or strength gains.
- **Phase-timed training trials (contested / weak).** Sung 2014, Wikström-Frisén 2017 and Kissow
  2022 are small and conflicting. They can't support "cycle syncing" your lifting.
- **Study methods (strong).** Most studies assume phases from calendar counting instead of
  confirming them with hormone tests (Elliott-Sale et al. 2021). Tali would have the same flaw.
- **Symptoms (strong).** Symptoms are near-universal and linked to missed or changed training
  (Bruinvels et al. 2021, *BJSM*, n=6,812).
- **Exercise and period pain (moderate).** Regular exercise may reduce period pain (Armour et al.
  2019, Cochrane; low-quality evidence).
- **ACL laxity (weak).** It would matter mainly for cutting and landing in field sports, not gym
  lifting. No programming change.
- **Heat (moderate).** Core temperature rises 0.3 to 0.5 °C in the luteal phase, with little effect
  on performance.
- **Contraception (strong).** Combined-pill, implant and hormonal-coil users have no natural
  cycle, so they get a symptoms-only mode.
- **Perimenopause (moderate to strong).** Resistance training is well supported for bone and
  function.

## 3. Proposed design: Flow

### Opt-in and setup

- Flow is offered to **anyone** in Profile, whatever their sex or identity. Trans men and
  non-binary people may menstruate, and some women don't. It is off by default, and nothing nudges
  it on because of the `sex` field.
- Setup asks one question: natural cycle / hormonal contraception (type) / irregular /
  perimenopause / prefer not to say. Each answer explains honestly what Tali will and won't do.
- Phase prediction stays off for:
  - hormonal contraception;
  - irregular / perimenopause / not sure;
  - anyone with fewer than two logged cycles.

  Those users get symptoms-only mode. Pregnancy, postpartum and breastfeeding should pause phase
  logic and deficit targets. That needs its own design pass.

### Check-in (extend it; don't build a second one)

For opted-in users, add one optional, collapsible "Cycle" group to `CheckinSheet`:

- **Bleeding today:** none / spotting / light / medium / heavy. This is the only way a cycle start
  is recorded.
- **Pain:** none / some / a lot, on the same three-step style as the other questions.
- **Optional chips:** cramps, bloating, headache, breast tenderness, digestion. There is no "PMS"
  or "moody" chip; mood is already asked.

### How it adapts

| Area | Change |
|---|---|
| Train | Heavy bleeding or pain "a lot" counts as one extra low signal in `lowSignals`, so the existing two-signal rule offers planned / shorter / gentle swap as equal choices. On symptom days, hide the step-up hint and the +1 rep target (as on shorter days). Optional `position` and `impact` exercise tags let Tali offer comfort swaps (for example, the plank on a cramp day). |
| Food | Targets unchanged. On heavy-flow days and a few days after, suggest iron-rich foods. Hunger copy gives permission: "Hungrier than usual? Your range has room." It never lowers the range and never adds a compensating deficit later. When energy is low or someone feels nauseous, "easy options first" (already in the meal plan). |
| Body | On days the user has logged bleeding, a neutral note on the weight trend: "Weight often reads a little higher around a period. It's mostly water and settles within days." The rate-adjustment loop never suggests a deeper deficit from period-week data. |
| Mind | After two or three logged cycles, personal patterns such as "Your log shows lower energy on the first days of your last three periods. Want a lighter option ready then?" An optional if-then plan template in `PlanSheets`. |
| Safety | Gentle, rule-based prompts in `core/`, at most once per episode: heavy bleeding for 3 or more days or bleeding for more than 7 days leads to the NHS heavy-periods page; pain "a lot" across 2 or more cycles suggests mentioning it to a GP; no period for 90 or more days with a natural cycle leads to a GP prompt and moves nutrition from deficit to maintenance. Self-harm language uses the existing crisis script. Thresholds need clinician sign-off. |

### Copy rules

- **Good:**
  - "How's your body today? Skip anything."
  - "A lighter session is here if you want it."
  - "Hungrier than usual? Your range has room."
- **Never:**
  - "Luteal phase: expect cravings. Stay strong!"
  - "Your hormones are peaking, so crush a PR."
  - "Bloated? Cut salt and carbs."
  - Anything with "should feel".
  - Any "avoid heavy lifting" in a phase.
  - Fertile windows or ovulation.
  - A diagnosis (PCOS, endometriosis, PMDD, REDs).
  - "Take iron", or any dose.
- No streaks or "log every day" counts. No pink or floral styling: use the `--mind` pillar colour
  and the neutral `--band` for ranges.

### Food data gap

`Food` stores only kcal, protein, carbs and fat (`src/core/types.ts`); there is no iron. 251 of the
281 base foods cite a CoFID code, and CoFID's "1.4 Inorganics" sheet has iron, but
`scripts/import/cofid-ingredients.py` only reads the proximates sheet. There are two options:

- an optional `fe` field imported from CoFID;
- a simpler curated "iron-rich" tag using the UK claim threshold (≥2.1 mg/100 g for "source of
  iron"; check this against current GB law).

Either way, show a label, never a precise mg figure. Liver needs a pregnancy caveat (vitamin A).
This needs `nutrition-accuracy` sign-off.

## 4. Proposed design: demo videos

Benn's decision: identity options may be offered, but videos only ever come in two formats, a
female demonstrator and a male one.

- **Data.**
  - `video` on `Exercise` and `ExerciseTemplate` becomes `{ f?: ExerciseMedia; m?: ExerciseMedia }`.
  - The four existing clips go under `f`.
  - Each clip keeps its own tempo timeline measured from its own footage; timings are never copied
    between the two versions.
  - `npm test` checks every version.
- **Resolver.** A pure `pickDemo(video, pref)` in `core/domain` returns the chosen version, else the
  other one, else nothing. Use it everywhere a clip is read:
  - `slotsOf`;
  - `GuidedPlayer`;
  - `DemoPlayer`;
  - `firstVideo`;
  - Preview thumbnails.

  A missing version falls back silently, because a demo beats no demo.
- **Setting.** "Exercise demos: Woman / Man" in Profile, worded as a choice about the video, not
  the user. Never inferred from identity. Changing one never changes the other.
- **Production.** About 0.6 MB per clip, and at most 44 clips for 22 exercises, which strengthens
  the case for finishing the planned Bunny CDN move (`VIDEO_BASE`). Storage doubles, but each user
  streams only one version. Offline behaviour is unchanged.
- **Prompts (`docs/exercise-video-prompts.md`).**
  - One shared scene and framing block plus two demonstrator lines.
  - A pronoun placeholder so the two prompts stay word for word the same.
  - A fixed reference still per demonstrator.
  - A more modest female outfit: a fitted top covering the midriff, replacing the current sports
    bra and cropped tank.
  - Ordinary, non-idealised builds.
  - File names `name.f.mp4` / `name.m.mp4`.
- **Technique.** No lift in the plan needs different technique by sex. The differences in stance
  and depth are individual, not by sex.

## 5. Identity, sex and the calorie formula

- **Keep three things separate:**
  1. sex for physiology, which exists today and drives the BMR constant;
  2. optional gender identity;
  3. the demo-video choice.
- **Sexual orientation: don't collect it.** "Gay" is an orientation, not a gender identity. GDPR
  Art. 9 names orientation explicitly, Norway fined Grindr NOK 65m in 2021, and no Tali feature
  uses it. Consent doesn't make collecting unnecessary data lawful.
- **Gender identity** should get the same treatment as special-category data, because it can
  reveal trans status and, indirectly, health data (CJEU C-184/20). Tali's copy is already
  gender-neutral, so no feature needs it today. If it is offered: optional, own consent, device
  only by default like Flow, never in analytics, AI or push, and not offered to under-18s.
- **Suggested alternative:** relabel the `sex` field as "Energy estimate formula: female / male"
  with a short explanation. This works for trans users on HRT and for non-binary users without
  recording identity. The stored field name stays `sex`.
- **Existing bug worth fixing on its own:** `sex` defaults to `'M'` (`src/core/data/constants.ts:7`).
  Anyone who never sets it gets the male BMR, about 166 kcal/day more than the female formula
  (`src/core/domain/nutrition.ts:212`). It should be an explicit choice.

## 6. Market

| Group | Products | Gap |
|---|---|---|
| Wearable-based coaching | WHOOP (contraception support since July 2025), Oura, Garmin | Needs hardware |
| Athlete apps | Wild.AI, FitrWoman | Athlete focus |
| Content and phase apps | 28, Nya, DROP IT, Moody Month (closest to mind-first), Hormona, Natural Cycles | Generic phase plans, not tied to what the user logs |
| Mainstream loggers | MyFitnessPal, Fitbod, Strava, Peloton | Nothing |

"Almost no fitness apps do this" is overstated. What the review found nobody doing is joining
mood, sleep and stress with actual food logging, a target range and a guided session in one offline
app, with honesty about the science ("your pattern, not a rulebook"). No web app can read Apple
Health or Google Health Connect cycle data; that waits for a native build.

## 7. Privacy, legal and regulatory

- **UK / EU GDPR.**
  - Cycle data is special-category health data (Art. 9), so it needs explicit, separate,
    withdrawable consent.
  - A DPIA is effectively required.
  - The ICO reviewed period apps in 2023 to 2024.
- **US.**
  - Subpoena risk since the Dobbs ruling; HIPAA doesn't cover Tali.
  - FTC actions against Flo (2021) and Premom (2023) over sharing cycle data with third parties.
  - The Health Breach Notification Rule treats unauthorised disclosure, for example to an
    analytics SDK, as a breach.
  - Washington's My Health My Data Act (and Nevada and Connecticut) apply if Tali markets in the
    US.
- **Medical device line.**
  - Fertility or ovulation prediction for contraception or conception is a medical device (EU
    MDR Rule 11 / Rule 15; MHRA).
  - Logging plus symptom-based wellness suggestions is probably general wellness.
  - Flagging "abnormal" cycles or suggesting conditions would move Tali towards device territory.
    Signpost to a GP instead.
- **Storage (recommended by `security-data`).**
  - Flow lives in a new additive `flow` field inside the `leanplan.v1` state. Never in `profile`,
    which syncs whole, and never on day logs, whose rows can't be deleted and could be restored
    from a second device.
  - Device only by default.
  - Optional "keep in sync across devices" is a separate consent, writing to a dedicated
    `cycle_days` table with owner-only RLS. It has a purge marker so deletes reach every device,
    and an opaque `data` column so client-side encryption can be added later without a schema
    change.
  - Keeping it inside `leanplan.v1` means sign-out, "Start fresh", the owner check and backup
    cover it automatically.
- **Must-haves before shipping.**
  1. A DPIA reviewed by counsel.
  2. A written position that Tali makes no fertility or ovulation claims.
  3. Granular consent, with its version and timestamp stored.
  4. A "delete all Flow data" action that works offline and on every device.
  5. **In-app account deletion.** It doesn't exist yet, GDPR requires it, and it should ship
     before or alongside Flow.
  6. Flow data in the JSON export, with a note that the file isn't encrypted.
  7. No Flow data in analytics, logs, push payloads, URLs or AI prompts. Extend §5 of
     `ai-platform-plan.md` to name cycle data explicitly.
  8. Lock-screen notifications never mention periods.
  9. An updated privacy notice.
  10. Tests for:
      - sign-out wipes Flow data;
      - deleted data doesn't come back after a pull;
      - a backup round-trip keeps Flow data;
      - no Flow field in any `day_logs` or `settings` payload.
  11. Sign-off from `security-data`, `mental-performance`, `nutrition-accuracy` and `ship-critic`.
- **Unknown:** the Supabase hosting region, the backup retention window, and whether US state laws
  reach a UK company that doesn't target those states.

## 8. Suggested build order

1. **Fix the `sex` default**, relabel it as the energy formula, and add a fallback when it isn't
   set. Small and independent.
2. **In-app account deletion.** Needed regardless.
3. **Demo videos.** Build the variant data model and `pickDemo`, add the setting, update the
   prompts, then make male clips of the four existing exercises, alongside the Bunny move.
4. **Flow v1**, device only:
   - setup and consent;
   - check-in group;
   - symptom signals in `dayOptions`;
   - weight-trend note;
   - hunger copy;
   - red-flag prompts;
   - delete and export.
5. **Flow v1.1:**
   - iron-rich food tag;
   - personal patterns after two or three cycles;
   - if-then template;
   - rate-loop guard for period weeks.
6. **Optional sync** (the `cycle_days` table), then life-stage modes.

## 9. Decisions

### Made (26 Sept 2026)

- **Name: not "Flow".** The feature needs a name that feels considerate to the people using it.
  Benn is happy with "Cycle" or "Rhythm". Recommendation: **"Cycle"** (in copy, "Your cycle").
  It is plain, descriptive and doesn't centre bleeding, so it still fits people on contraception
  or in perimenopause. "Rhythm" is warmer, but "the rhythm method" is a well-known name for
  calendar-based contraception, and Tali has to stay clearly away from contraception and
  fertility claims (§7). Wherever this doc says "Flow", read the chosen name.
- **Demo videos: the user chooses.** Built on this branch as "Exercise demos: Woman / Man" in
  Profile, stored as `profile.demos`. Until the user chooses, it follows the energy-formula `sex`
  field. All current clips show a woman, so choosing "Man" plays the woman's clip and says the
  man's versions are on the way. Each new clip is added under its demonstrator key in `DEMOS`,
  with its own measured tempo.
- **Demand signal:** two women asked for the cycle feature. That's worth following up, but two
  requests are a small sample. A short survey or interviews with more users before the build
  would test how much they want it and what they'd want it to do.

### Still open

1. **Gender identity.** Collect it (optional, handled as sensitive data), or rely on the relabelled
   energy formula plus the demo choice and collect nothing. Sexual orientation is recommended out
   either way.
2. **Sync.** Is device-only acceptable for Flow v1, knowing a lost phone loses the log unless it
   was exported?
3. **Scope.** UK only at first, or US too? US launch raises the privacy bar (encryption, state-law
   policies).
4. **Clinician review** of the red-flag thresholds and copy before launch.
