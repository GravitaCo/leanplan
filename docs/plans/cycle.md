# Cycle: symptom-aware guidance for women

Status: plan, revised 29 Oct 2026 after `compliance` and `mental-performance` reviews. Nothing here
is built. Replaces the Flow sections of `docs/plans/flow-and-demonstrator-videos.md` (branch
`claude/gender-content-menstrual-cycle-owmfpx`, 26 Sept 2026, never merged). The demonstrator-video
part of that doc is out of scope here.

Scope: UK first; US later (§7). Evidence ratings: **strong**, **moderate**, **weak**,
**contested**, **unknown**. Nothing here is legal or medical advice; §10 lists what needs a lawyer,
a regulatory adviser and a clinician.

## 0. Decisions so far

| Date | Decision | By |
|---|---|---|
| 26 Sept | Not called "Flow". Working name **"Cycle"** (in copy, "Your cycle"). "Rhythm" was rejected because of "the rhythm method" (contraception). | Benn |
| 29 Oct | **Only women see it.** The offer appears only when the onboarding answer is female. | Benn |
| 29 Oct | **UK first, US later.** v1 meets UK law; nothing in the design may rule out a US launch (§7). | Benn |
| 29 Oct | Demonstrator videos split out of this plan. | Benn |
| 29 Oct | **Prerequisite: switch onboarding on** so people record the sex answer (not a one-off Profile question). | Benn |
| 29 Oct | **UK first means marketing only.** No in-app country gate. | Benn |
| 29 Oct | **No under-18s.** | Benn |
| 29 Oct | **Tali will never claim to be a medical device or give medical advice.** | Benn |
| 29 Oct | Existing users reach the offer through Profile › "Set up my plan" only; Cycle's launch doesn't point them there. | Benn |

The Sept plan recommended offering Cycle to anyone. The women-only rule means trans men and
non-binary people who menstruate won't be offered it, and some women who don't menstruate will.
§3 limits the second effect; the first is the accepted cost of the decision. In-app copy never says
"for women".

## 1. Summary

1. **Follow symptoms, not phases.** On average, cycle phase has a trivial effect on strength,
   endurance, adaptation, energy expenditure and mood, and people differ a great deal. Symptoms
   (cramps, heavy bleeding, fatigue, poor sleep) are common and do change how a day goes. Tali asks
   how someone feels and adapts to that.
2. **No forecasts.** The only cycle context is "Day N of your period", counted from logged bleeding.
   No phase names, no predicted next period, no fertile window. A forecast tells people how they
   will feel (an expectation effect) and is a short step to fertility inference (a medical device).
3. **It fits the mind-first frame.** Train already offers a lighter session when two or more
   check-in answers are low. A painful day adds one signal to that offer, and only to that offer
   (§5).
4. **No calorie or macro change by phase.** Resting energy use may rise about +40 kcal/day in the
   luteal phase, well inside the ±170 kcal margin of a typical logged day.
5. **Cycle data is special-category health data.** The cycle log stays on the device in v1, behind
   its own explicit consent, with a real "delete all", and never reaches analytics, AI, push or the
   lock screen. Only the consent record syncs (§6).

## 2. Evidence

Citations marked † were not re-verified in the Oct review: check each before any figure appears in
the app or on the website.

- **Cycle variation (strong).** In 612,613 tracked cycles the average was 29.3 days; follicular 10
  to 30 days, luteal 7 to 17 days (Bull et al. 2019 †; users of a fertility app, so self-selected).
  A calendar phase is an estimate, never a fact.
- **Mood (contested).** Of 47 prospective studies, 18 (38%) found no link between mood and any
  phase; 7 linked negative mood to the premenstrual phase alone and 18 to premenstrual plus another
  phase (Romans et al. 2012). A real subgroup worsens premenstrually.
- **PMDD.** Pooled prevalence 3.2% confirmed and 7.7% provisional; 1.6% in community samples with
  confirmed diagnosis (Reilly et al. 2024). Its link to suicidal ideation needs its own primary
  source: **unknown** until found. Tali never labels or suggests PMS or PMDD either way.
- **Expectation shapes symptoms (weak to moderate).** People told they are premenstrual report more
  symptoms (Ruble 1977 †, a single small deception study). Tali never tells someone how they will
  feel.
- **Energy (moderate direction, weak size).** About +40 kcal/day resting in the luteal phase
  (Löfberg et al. 2024 †, 95% CI −2 to 82); none on the combined pill. Intake rises about +168
  kcal/day on average (Tucker et al. 2025 †).
- **Iron (strong that heavy periods raise risk).** The share of UK women aged 19 to 64 below the
  lower reference intake is **unknown** for NDNS years 9 to 11 (other years show 21% to 30%): check
  the GOV.UK tables. Food-first copy is safe; doses are not.
- **Training (strong that the average effect is trivial).** McNulty et al. 2020 †, Colenso-Semple
  et al. 2023 †. Phase-timed training trials are small and conflicting.
- **Symptoms and training (moderate).** In a retrospective survey of 6,812 Strava users not on
  combined hormonal contraception, symptoms were very common (mood changes or anxiety 90.6%,
  fatigue 86.2%, cramps 84.2%) and a higher symptom index went with missing or changing training
  (OR 1.09 per point; the index isn't validated; self-report) (Bruinvels et al., BJSM 2021).
- **Exercise and period pain (weak).** Cochrane 2019 †, low-quality evidence. Tali makes no claim
  that it eases pain.
- **Low energy availability (strong that it happens; thresholds debated).** Tali's own targets can
  produce it (illustration: a 60 kg, very active woman on a 25% deficit lands near 27 kcal/kg lean
  mass; the 30 kcal/kg cut-off is itself debated). Periods stopping is the visible sign. Never show
  an energy-availability number.

## 3. Who sees it

- **The gate is `profile.sexAnswer === 'female'` and a current health consent yes.** Not `sexOf`,
  and never the legacy `sex` field. "Prefer not to say" is stored in legacy `sex` as `'F'`
  (`legacySex`, `src/core/domain/onboarding.ts`), and a health withdrawal clears `sexAnswer`
  (it is in `HEALTH_FIELDS`, `src/data/consent.ts`) while legacy `sex` stays, so `sexOf` would then
  return female for someone who chose not to say. Older profiles with no onboarding answer don't
  see the offer until they answer.
- **Prerequisite: switch onboarding on (Benn, 29 Oct).** Most current users have no `sexAnswer`:
  only the onboarding wizard sets it, and that is off (`ONBOARDING_ENABLED`,
  `src/data/onboardingFlag.ts`). Profile sets it only when someone changes Male/Female
  (`ProfileScreen.tsx`). Benn chose to switch onboarding on rather than add a one-off Profile
  question. Switching it on is its own change, with its own `ship-critic` pass, before Cycle ships.
  - **New users** answer it in the wizard (Female / Male / Prefer not to say).
  - **Existing users** answer it only through Profile › "Set up my plan" (`first-run-onboarding.md`
    §15). Until they run it they don't see the Cycle offer, and Cycle's launch doesn't prompt them (Benn, 29 Oct). That screen is prefilled from the
    legacy M/F field, which defaulted to `'M'`; the person sees and confirms it, so it counts as
    their answer, but the wizard's sex step must show it as a choice they can change, not a
    silent default.
  - Inferring the answer from the legacy `sex` field without asking is not an option (it defaulted
    to `'M'` and stores "prefer not to say" as `'F'`).
- **Seeing it collects nothing.** Women see one quiet offer in Profile (not a modal, not repeated).
  It is off until they turn it on.
- **Setup, after the cycle consent, asks one question** (answer changeable any time; never asks why):
  - Periods, no hormonal contraception
  - On hormonal contraception (pill, coil, implant, injection)
  - Irregular or unpredictable periods
  - Periods changing with age (perimenopause)
  - I don't have periods
  - Prefer not to say
- **The answer is stored only in the device `cycle` store**, never in a synced field: it is health
  data, and contraception may touch "sex life" (Art. 9(1)). "I don't have periods" closes the offer;
  the most a synced field may hold is a plain "offer hidden" flag with no reason.
- **Every answer gets the same features** (logging, the lighter offer, safety prompts and "Day N of
  your period"), since none of them forecasts. Each answer says plainly what Tali will and won't do.
- **Pregnancy and breastfeeding** (the existing `profile.pregnancy` flag) pause Cycle's prompts;
  data is kept.
- **If `sexAnswer` changes away from female,** the entry disappears but the data stays until
  deleted. "Delete all cycle data" lives under Privacy for everyone.
- **Under-18s: no** (Benn, 29 Oct). Tali already requires 18+ (`MIN_AGE`, `src/core/legal`), so the
  gate needs no extra age check; a test confirms Cycle is never offered below `MIN_AGE`.

## 4. Check-in: one optional row, not a second check-in

For people who turned Cycle on, `CheckinSheet` gets a "Cycle" group, **collapsed to one row:
"Period today?"** Pain and chips appear only after a bleeding answer or when the group is opened.

- **Bleeding:** none / spotting / light / medium / heavy.
- **Pain:** No pain / A bit / A lot (same wording as the soreness scale).
- **Optional chips:** cramps, bloating, headache, breast tenderness, upset stomach. No "PMS" or
  "moody" chip; mood is already asked.
- **The check-in isn't the only way in:** a "Period started" action on the Cycle page, and
  back-filling or editing of past days, so a missed check-in doesn't corrupt the log or trigger a
  false safety prompt.

The answers are **not** stored on `CheckIn`: check-ins live on day logs, which sync to `day_logs`.
They go to the device-only store in §6.

## 5. How it adapts

| Area | Change |
|---|---|
| Train | Pain "A lot" adds **one absolute signal** to Train's lighter offer only, through a separate optional argument such as `offerLighter(today, recent, cycle?)`. `lowSignals` itself is unchanged, because it also feeds `hardDay` (`mind.ts`) and `DayMind.low` (`weekPicture.ts`), which drive the synced weekly picture: a cycle signal there would label period weeks as hard weeks and leak cycle data. Heavy bleeding alone doesn't count; low energy is already asked. The offer copy never names the period ("A lighter session is here if you want it"), on Train and on Today. "As planned" stays exactly as planned: the step-up hint and +1 rep are hidden only when the person chooses Shorter or the swap, as today. |
| Food | Targets unchanged. Hunger copy is triggered by the person's own hunger answer (Hungry or Starving), never by phase, and never mentions the period. Under or in range: "Hungry today? Your range has room." Above range: "Hungry today? Eating to your hunger is fine. One day doesn't change your week." Gentle or quiet modes: no range wording. Never a compensating deficit later. |
| Body | In the maintenance loop's weigh-in check (`suggestRateAdjustment`, `maintenanceLoop.ts`): when bleeding was logged that week and the change is upwards, a note "Weight can read a bit higher around a period. It's mostly water and settles within days." Only where weight is already shown (never gentle or quiet modes). The loop never suggests a deeper deficit from that week or the next weigh-in check after a logged bleed (retention starts before bleeding). |
| Patterns (v1.1) | Only when asked: a "Look for patterns" action on the Cycle page. Past tense, from the person's own log, with a consistency rule (held in every cycle and differed from their other days) and an honest "no clear pattern". No forecast ("want a lighter option ready then?" is out). Never food, hunger or weight patterns by cycle (they invite pre-emptive restriction). No mood patterns in v1.1. |
| If-then (v1.1) | An optional template triggered by a symptom ("If I wake up with bad cramps, then..."), never by a date. Template-made plans live in synced `profile.plans`, so they carry no cycle wording beyond what the person types, or they wait for cycle sync. |
| Food data (v1.1) | Additive copy, "foods with iron", never "swap". See §5.2. |

### 5.1 Safety prompts

Generic signposting, never an assessment of the person's cycle (§6, medical-device line). Once per
episode, through `src/core/data/signposts.ts`, shown in gentle mode too (without numbers). All
thresholds need clinician sign-off.

- **Bleeding for more than 7 days** → NHS heavy periods page.
- **Heavy days across 2 or more cycles**, framed around impact ("if it's getting in the way of
  things"), at most once per 3 months. A single heavy cycle doesn't fire it: self-rated "heavy"
  would otherwise medicalise ordinary periods.
- **Pain "A lot" across 2 or more cycles** → "Period pain that stops you doing things is worth
  raising with a GP. You don't have to put up with it." No condition names.
- **No logged period for a long stretch** (proposed 90 days; NHS says see a GP after missing three
  in a row, which is longer for long cycles: clinician to set it):
  - fires only if the person kept checking in through that time, and first asks "Has a period come
    that isn't logged?";
  - blame-free copy that allows for pregnancy: "Periods can stop for lots of reasons, including
    eating less than your body needs or stress.";
  - Beat alongside the GP for people with wellbeing Yes or gentle mode;
  - for people in a deficit, the loop stops suggesting a deficit until a period is logged, and says
    so plainly; the person can still set their own target. Whether that change to nutrition stays
    outside medical-device rules needs a regulatory view (§10);
  - whether "irregular" users get this prompt (they're equally at risk of low energy availability)
    is a clinician call.
- **A static "When to get help" page** in Cycle settings for what Tali must not detect itself:
  bleeding between periods or after sex (GP); feeling faint or breathless with heavy bleeding
  (NHS 111); sudden severe pain (111 or 999).
- Self-harm language uses the existing crisis script.

### 5.2 Iron (v1.1)

`Food` stores only kcal, protein, carbs and fat; there is no iron. Most base foods cite CoFID, whose
inorganics sheet has iron, but the importer reads only proximates. Options: an optional `fe` field
imported from CoFID, or a curated tag. Name the tag to match the threshold used: **"source of iron"**
at 15% of the NRV per 100 g (about 2.1 mg), or "high in iron" at twice that; check the current GB
figures (retained Reg. 1924/2006) on legislation.gov.uk. Whether the claims rules bind an app's
labels is unknown, but use the authorised conditions anyway. Show a label, never a mg figure. Liver
needs a pregnancy caveat (vitamin A). Needs `nutrition-accuracy` sign-off.

### 5.3 Wellbeing and eating-disorder rules

- No numbers from Cycle in gentle mode.
- The no-period prompt is not wired to `restrictionSignal` (`foodMode.ts`) without a separate
  `mental-performance` and Benn decision.
- No praise for training through a period, no badges, no streaks, no "log every day", no "x of y".

### 5.4 Copy rules

- **Good:** "Period today? Skip anything." / "A lighter session is here if you want it." /
  "Hungry today? Your range has room."
- **Never:** phase names; "expect cravings"; "your hormones are peaking, so crush a PR"; "bloated?
  cut salt and carbs"; anything with "should feel"; "avoid heavy lifting"; fertile windows,
  ovulation or a predicted next period; a diagnosis (PCOS, endometriosis, PMDD, REDs); "take iron"
  or any dose; "for women".
- No pink or floral styling: the `--mind` pillar and the neutral `--band` for ranges, per Studio.

## 6. Storage, consent and privacy (UK)

### Storage

- **The cycle log is device-only in v1.** It lives in a new additive `cycle` field inside
  `leanplan.v1` (never rename the key), registered with `src/data/deviceOnly.ts` like the Unload
  notes. Never in `profile` or `settings` (which sync whole) and never on day logs.
- **What does sync:** the cycle consent record (in `consents`), and at most a reason-free "offer
  hidden" flag. The privacy policy says the account holds the fact that the person agreed to Cycle
  (kept to show consent was given, Art. 7(1)).
- **Sign-out:** a plain sign-out keeps `leanplan.v1` on the device behind the owner check (another
  account signing in is asked before seeing it); "remove from this device" (`signOut({ remove:
  true })`, `store.ts`) wipes it. Setup tells people this, and that a lost or wiped phone loses the
  cycle log unless exported.
- **Never carried across:** the old-guest "move into account" path and a different-account sign-in
  never move cycle data.
- **Backup import** never loads cycle data without a current cycle yes, and respects the owner check.

### Consent

- **A separate `cycle` consent type**, not a change to the health wording: Art. 9(2)(a) needs
  explicit, specific consent, and rewording the health consent would bump `CONSENT_VERSIONS.health`
  and re-ask every user, including those who never see Cycle.
- Needs: a new `ConsentType` and `CONSENT_VERSIONS` entry, and **a migration widening
  `consents_type_check`** (`docs/migrations/2026-10-10-shared-products.sql` allows only `health`,
  `ai`, `label-photo`, `shared-products`). Written in the same file style as the other migrations.
- The cycle consent requires a current health yes.
- **A health withdrawal deletes the device cycle data** (add `device.cycle` to `HEALTH_FIELDS` and to
  `clearHealthData` / `applyHealthWithdrawal`) and writes a cycle withdrawal record.
- **Turning Cycle off records a withdrawal** (Art. 7(3)) and deletes the cycle data, offering the
  export first.

### Privacy policy, register, DPIA

- `src/core/legal/privacy.ts`: a Cycle section; a line that the sex answer also decides whether
  Cycle is offered (a new purpose: Art. 5(1)(b), 6(4), 13; it currently says "used for your energy
  estimate"); bump `updated`. Publish the Cycle text only when Cycle ships (flag it or hold it), so
  the policy never describes a feature that isn't live. Then `npm run check:legal`, `npm run
  legal:html`, Webflow drafts, publish on Benn's go-ahead after `ship-critic`.
- Register (`docs/compliance/README.md`): Cycle under "What's in the app" and a record-of-processing
  row (device-only log, cloud consent record, retention, deletion paths).
- DPIA: a §10 addendum in `docs/compliance/dpia.md` following the §8 and §9 pattern, covering
  reproductive and contraception data; a shared phone or coercive partner (only the phone lock
  protects it; there is no app lock); the unencrypted export; the setup answer; PMDD and
  disordered-eating safety. Update the §7.3 view on ICO prior consultation (Art. 36); whether
  residual risk stays below "high" is unknown until the addendum is written.

### Medical device line (MHRA, UK MDR 2002)

**Benn's position (29 Oct): Tali will never claim to be a medical device or give medical advice.**
Under UK MDR 2002, intended purpose is read from what the maker says (labelling, instructions,
marketing), so this position does most of the work. It doesn't settle it alone: a regulator can
also look at what the software does, so the features have to match the claim.
Logging plus symptom-based wellness suggestions is probably general wellness. Forecasting, fertility
or ovulation prediction, or assessing a cycle as "abnormal" moves towards device territory. v1
needs a written **intended-purpose statement**: Tali logs what the person reports and signposts to
the NHS or a GP; it makes no assessment, diagnosis or fertility claim. Whether the §5.1 rules,
especially the one that changes nutrition, stay outside UK MDR 2002 and MHRA software guidance is
**unknown**: get a regulatory view.

### Advertising (ASA/CAP)

Any Cycle marketing on www.tali.fit needs documentary evidence for objective claims (CAP 12.1). No
claim that Tali eases period pain or symptoms; no "train with your cycle" performance claims; iron
copy only in authorised GB health-claim wording, if at all. Verify every † citation before it is
used in copy.

### Must-haves before shipping

1. DPIA addendum, reviewed by counsel.
2. The intended-purpose statement, and a written position that Tali makes no fertility or ovulation
   claims.
3. Separate cycle consent with version and timestamp, the `consents` migration, and withdrawal that
   deletes.
4. "Delete all cycle data", working offline, reachable for everyone under Privacy.
5. Cycle data in the JSON export, with a note that the file isn't encrypted.
6. No cycle data in analytics, logs, push payloads, URLs, AI prompts, the weekly picture or any
   synced field; extend §5 of `ai-platform-plan.md` to name it.
7. Notifications never mention periods.
8. Privacy policy, register and website pages updated.
9. Tests:
   - "remove from this device" wipes cycle data; a plain sign-out keeps it behind the owner check;
   - a different-account sign-in and the guest move never carry it across;
   - a health withdrawal deletes it;
   - a backup round-trip keeps it, and import needs a current cycle yes;
   - no cycle field in any `day_logs`, `settings` or `profile` payload, or in `weekPicture`;
   - the gate: prefer-not-to-say, then a health withdrawal, never sees the offer;
   - `lowSignals`, `hardDay` and `weekPicture` give the same results with Cycle on or off.
10. Sign-off from `compliance`, `security-data`, `mental-performance`, `nutrition-accuracy`,
    `design` (and Benn on the boards) and `ship-critic`.

## 7. US later: keeping it open

UK first means marketing only (Benn, 29 Oct): there is no in-app country gate, so anyone can turn
Cycle on. For people in the EU, EU GDPR applies (close to UK GDPR, so v1 already meets most of it);
whether Tali then needs an EU representative (Art. 27) depends on whether it offers the app to
the EU, which is a `compliance` question before any EU marketing. v1 ships to the UK, but the US will follow, so v1 avoids anything that would have to be undone:

- **No third parties ever see cycle data:** no analytics or ad SDKs, no AI prompts, no push
  payloads. The FTC acted against Flo (2021) and Premom (2023) for sharing cycle data, and the
  Health Breach Notification Rule treats an unauthorised disclosure (for example to an analytics
  SDK) as a breach.
- **Device-only by default and minimal fields**, which also limits what a US subpoena could reach
  after Dobbs; HIPAA doesn't cover Tali.
- **Sync, when built, keeps an opaque `data` column** so client-side encryption can be switched on
  without a schema change.
- **Consent and deletion already follow the stricter US state laws' shape** (separate opt-in,
  deletion that reaches every device). Washington's My Health My Data Act, and Nevada and
  Connecticut, need a separate consumer health data privacy policy and their own consent wording.

Before marketing in the US: a US health-data privacy policy; a review against the FTC Act and the
Health Breach Notification Rule; the state laws above (and any newer ones); whether to turn on
client-side encryption for sync; the FDA general-wellness line. Unknown: which states' laws will
apply then; check with counsel.

## 8. Optional sync (later)

A separate consent writing to a dedicated `cycle_days` table. Per the current rules, one migration
holds: owner-only RLS; `revoke all ... from anon`; grants to `authenticated` and `service_role`; the
`require_health_consent` trigger plus a server check of the cycle consent (the existing trigger
checks health only); lines in `clear_log_after_withdrawal()` and `purge_unconsented_logs()`; a place
in `USER_TABLES`; a purge marker so deletes reach every device; the opaque `data` column (§7).

## 9. Build order

1. **Design boards** on the Design canvas for Benn: the Profile offer, setup and consent, the
   one-row check-in group, "Period started" and back-fill, the lighter offer, the weigh-in note,
   the safety prompts and "When to get help", delete and export.
2. **Cycle v1 (device-only):** onboarding switched on first (§3); gate, setup and consent (with the `consents` migration); check-in row
   and store; Train's cycle signal; hunger copy; weigh-in note and guard; safety prompts; delete,
   export, withdrawal; legal, register and DPIA.
3. **Cycle v1.1:** "Look for patterns"; symptom-triggered if-then template; iron label; comfort-swap
   exercise tags.
4. **Later:** optional sync (§8); US (§7); life-stage depth (perimenopause, postpartum); Apple Health
   and Health Connect once there is a native build.

## 10. Open questions

1. **Demand.** Two women asked for this. Before the build, a short survey or a few interviews. Since
   v1 has no analytics, the same people measure success afterwards: did they keep training (a
   session or a swap rather than a skip) on symptom days; did the check-in feel like more work;
   how many turned Cycle off; did anyone feel judged by the prompts.
2. **Clinician review** of the §5.1 thresholds and copy. Not decided yet (Benn, 29 Oct); it blocks
   the safety prompts, not the boards.
3. **Regulatory view** on whether the §5.1 rules, especially the one that changes nutrition, fit
   the no-medical-device position (§6). Recommended, not yet agreed.
4. **Lawyer:** Equality Act 2010 s.29 and a women-only offer gated on a self-declared answer
   (unknown whether the Sch. 3 single-sex exceptions fit); the GB iron claim thresholds.
5. **Unknown:** the Supabase backup retention window (matters only once sync exists).
