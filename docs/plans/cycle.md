# Cycle: symptom-aware guidance for women

Status: plan, revised 29 Oct 2026. Nothing here is built. Replaces the Flow sections of
`docs/plans/flow-and-demonstrator-videos.md` (branch `claude/gender-content-menstrual-cycle-owmfpx`,
26 Sept 2026, never merged). The demonstrator-video part of that doc is out of scope here.

Evidence ratings: **strong**, **moderate**, **weak**, **contested**, **unknown**. Nothing here is
legal or medical advice; §8 lists what needs a lawyer and a clinician.

## 0. Decisions so far

| Date | Decision | By |
|---|---|---|
| 26 Sept | Not called "Flow". Working name **"Cycle"** (in copy, "Your cycle"). "Rhythm" was rejected because of "the rhythm method" (contraception). | Benn |
| 29 Oct | **Only women see it.** The offer appears only when the onboarding answer is female. | Benn |
| 29 Oct | **UK only** for now. US privacy law (FTC, state health-data laws, post-Dobbs subpoena risk) is out of scope until a US launch is planned. | Benn |
| 29 Oct | Demonstrator videos split out of this plan. | Benn |

The Sept plan recommended offering Cycle to anyone. The women-only rule means trans men and
non-binary people who menstruate won't be offered it, and some women who don't menstruate will.
§3 limits the second effect; the first is the accepted cost of the decision.

## 1. Summary

1. **Follow symptoms, not phases.** On average, cycle phase has a trivial effect on strength,
   endurance, adaptation, energy expenditure and mood, and people differ a great deal. Symptoms
   (cramps, heavy bleeding, fatigue, poor sleep) are common and do change how a day goes. Tali asks
   how someone feels and adapts to that. Phase appears only as soft context ("Day 2 of your
   period") and never changes a plan by itself.
2. **It fits the mind-first frame.** Train already offers a lighter session when two or more
   check-in answers are low (`lowSignals` / `offerLighter` in `src/core/domain/dayOptions.ts`).
   Cycle symptoms become extra signals in that same rule.
3. **No calorie or macro change by phase.** Resting energy use rises about +40 kcal/day in the
   luteal phase, well inside the ±170 kcal margin of a typical logged day.
4. **The useful parts are specific:** permission-giving hunger copy, iron-rich food suggestions on
   heavy days, a water-weight note in the weigh-in check, and a gentle GP prompt when periods stop
   while eating in a deficit.
5. **Cycle data is special-category health data.** It stays on the device in v1, behind its own
   explicit consent, with a real "delete all" and no exposure to analytics, AI, push or the lock
   screen. Tali stays out of fertility and ovulation prediction, or it becomes a medical device.

## 2. Evidence (unchanged from Sept; summary)

- **Cycle variation (strong).** In 612,613 tracked cycles the average was 29.3 days; follicular
  10 to 30 days, luteal 7 to 17 days (Bull et al. 2019). A calendar phase is an estimate, never a fact.
- **Mood (contested).** 38% show no link between mood and phase (Romans et al. 2012). A real subgroup
  worsens premenstrually. PMDD affects about 1.6% (confirmed) and is linked to suicidal ideation
  (Reilly et al. 2024). Tali never labels or suggests PMS or PMDD.
- **Expectation shapes symptoms (moderate).** People told they are premenstrual report more
  symptoms (Ruble 1977). Tali never tells someone how they will feel.
- **Energy (moderate direction, weak size).** +40 kcal/day resting in the luteal phase (Löfberg et
  al. 2024, 95% CI −2 to 82); none on the combined pill. Intake rises about +168 kcal/day on
  average (Tucker et al. 2025).
- **Iron (strong).** Heavy periods raise the risk of deficiency; 25% of UK women aged 19 to 64 are
  below the lower reference intake (NDNS years 9 to 11). Food-first copy is safe; doses are not.
- **Training (strong that the average effect is trivial).** McNulty et al. 2020, Colenso-Semple et
  al. 2023. Phase-timed training trials are small and conflicting. Symptoms are near-universal and
  linked to missed or changed training (Bruinvels et al. 2021). Exercise may ease period pain
  (Cochrane 2019, low-quality evidence). Some citations came from memory in the Sept review:
  check each before any figure is quoted in the app.
- **Low energy availability (strong).** Tali's own targets can produce it (a 60 kg, very active
  woman on a 25% deficit lands near 27 kcal/kg lean mass). Periods stopping is the visible sign.
  Never show an energy-availability number.

## 3. Who sees it

- **The gate is `sexOf(profile) === 'female'`** (`src/core/domain/onboarding.ts`). Never the legacy
  `sex` field: "Prefer not to say" is stored there as `'F'` (`legacySex`), so gating on it would
  show Cycle to people who chose not to say. Older profiles with no onboarding answer fall back to
  the legacy field through `sexOf`, which is acceptable.
- **Seeing it collects nothing.** Women see one offer in Profile (and optionally one line after
  onboarding, never a modal or repeated nudge). It is off until they turn it on.
- **Setup asks one question:** natural cycle / hormonal contraception / irregular /
  perimenopause / **I don't have periods** / prefer not to say. "I don't have periods" closes the
  offer and removes it from Profile, with a way back under Privacy. Each other answer says plainly
  what Tali will and won't do.
- **Phase context stays off** for hormonal contraception, irregular, perimenopause, prefer not to
  say, and anyone with fewer than two logged cycles. They get symptoms-only mode.
- **Pregnancy and breastfeeding** (the existing `profile.pregnancy` flag) pause Cycle: no prompts,
  no phase context, data kept.
- **If the sex answer changes away from female,** Cycle's entry disappears but the data stays until
  deleted. "Delete all cycle data" lives under Privacy for everyone, so nobody keeps data they
  can't remove.

## 4. Design

### Check-in: one optional group, not a second check-in

For women who turned Cycle on, `CheckinSheet` gets a collapsible "Cycle" group:

- **Bleeding today:** none / spotting / light / medium / heavy. This is the only way a period start
  is recorded.
- **Pain:** none / some / a lot, in the same three-step style as the other questions.
- **Optional chips:** cramps, bloating, headache, breast tenderness, digestion. No "PMS" or "moody"
  chip; mood is already asked.

The answers are **not** stored on `CheckIn`: check-ins live on day logs, which sync to `day_logs`.
They go to the separate device-only store in §6.

### How it adapts

| Area | Change |
|---|---|
| Train | Heavy bleeding or pain "a lot" adds one signal to `lowSignals`, so the existing two-signal rule offers planned / shorter / gentle swap as equal choices. On those days, hide the step-up hint and the +1 rep target, as on shorter days. Later: optional exercise tags for comfort swaps (positions that suit a cramp day). |
| Food | Targets unchanged. Hunger copy gives permission ("Hungrier than usual? Your range has room."), never lowers the range and never adds a compensating deficit later. On heavy days and a few after, suggest iron-rich foods (v1.1, needs the food-data work below). |
| Body | In the maintenance loop's weigh-in check (`suggestRateAdjustment` in `maintenanceLoop.ts`): on weeks with logged bleeding, a neutral note ("Weight often reads a little higher around a period. It's mostly water and settles within days.") and no suggestion of a deeper deficit from that week. The 4-week trend already smooths most of the swing. |
| Mind | After two or three logged cycles, personal patterns from the user's own log ("Your log shows lower energy on the first days of your last three periods. Want a lighter option ready then?"). An optional if-then template in `PlanSheets`. |
| Safety | Rule-based prompts in `core/`, once per episode, linking out through `src/core/data/signposts.ts`: heavy bleeding 3+ days or bleeding over 7 days → NHS heavy periods page; pain "a lot" across 2+ cycles → suggest mentioning it to a GP; no period for 90+ days on a natural cycle → GP prompt and the loop moves from deficit to maintenance. Self-harm language uses the existing crisis script. Thresholds need clinician sign-off. |

### Copy rules

- **Good:** "How's your body today? Skip anything." / "A lighter session is here if you want it." /
  "Hungrier than usual? Your range has room."
- **Never:** "Luteal phase: expect cravings"; "your hormones are peaking, so crush a PR"; "bloated?
  cut salt and carbs"; anything with "should feel"; "avoid heavy lifting" in any phase; fertile
  windows or ovulation; a diagnosis (PCOS, endometriosis, PMDD, REDs); "take iron" or any dose.
- No streaks or "log every day". No "x of y". No pink or floral styling: the `--mind` pillar and the
  neutral `--band` for ranges, per the Studio system.

### Food data gap (v1.1)

`Food` stores only kcal, protein, carbs and fat; there is no iron. Most base foods cite CoFID, whose
inorganics sheet has iron, but the importer reads only proximates. Two options: an optional `fe`
field imported from CoFID, or a curated "iron-rich" tag at the GB "source of iron" claim threshold
(check the current figure in GB law). Either way show a label, never a mg figure. Liver needs a
pregnancy caveat (vitamin A). Needs `nutrition-accuracy` sign-off.

## 5. What changed on main since Sept

- **Account deletion exists** (`src/data/account.ts`, `supabase/functions/_shared/account.ts`), a
  Sept must-have now met.
- **The onboarding sex answer** (`female` / `male` / `unspecified`) is the gate in §3. The legacy
  default `sex: 'M'` (`src/core/data/constants.ts`) remains for profiles that never answered.
- **The pregnancy flag** exists and is re-asked; Cycle pauses on it (§3).
- **The maintenance loop** exists; the period-week guard and the water note belong in its weigh-in
  check (§4).
- **Server-side health consent and explicit grants** now apply to any new table. That raises the
  cost of sync (§6) and supports device-only for v1.
- **Clips are on Bunny Stream**; irrelevant to Cycle now that videos are split out.

## 6. Storage and privacy (UK)

- **v1 is device-only.** Cycle data lives in a new additive `cycle` field inside `leanplan.v1`
  (never rename the key). Never in `profile` or `settings` (which sync whole) and never on day logs.
  Keeping it in `leanplan.v1` means sign-out, "Start fresh", the owner check and backup cover it.
- **Trade-off, stated plainly to the user at setup:** a lost or wiped phone loses the cycle log
  unless it was exported.
- **Optional sync (later)** is a separate consent writing to a dedicated `cycle_days` table. Per the
  current rules it needs, in one migration: owner-only RLS; `revoke all ... from anon`; grants to
  `authenticated` and `service_role`; the `require_health_consent` trigger; lines in
  `clear_log_after_withdrawal()` and `purge_unconsented_logs()`; a place in `USER_TABLES`; a purge
  marker so deletes reach every device; and an opaque `data` column so client-side encryption can
  follow without a schema change.
- **UK GDPR / DPA 2018.** Special-category data (Art. 9) on explicit consent, separate from the
  general health consent, withdrawable, with version and timestamp recorded through
  `src/data/consent.ts`. Update the DPIA (`docs/compliance/dpia.md`), the register, and the privacy
  policy in `src/core/legal/privacy.ts` in the same change; `npm run check:legal` must pass.
- **Medical device line (MHRA, UK MDR 2002).** Logging plus symptom-based wellness suggestions is
  probably general wellness. Fertility or ovulation prediction, or flagging "abnormal" cycles or
  conditions, moves towards device territory. Signpost to a GP or the NHS instead.
- **Must-haves before shipping:**
  1. DPIA update reviewed by counsel.
  2. A written position: Tali makes no fertility or ovulation claims.
  3. Separate consent with version and timestamp.
  4. "Delete all cycle data", working offline, reachable for everyone under Privacy.
  5. Cycle data in the JSON export, with a note that the file isn't encrypted.
  6. No cycle data in analytics, logs, push payloads, URLs or AI prompts; extend §5 of
     `ai-platform-plan.md` to name it.
  7. Notifications never mention periods.
  8. Privacy policy and register updated.
  9. Tests: sign-out wipes cycle data; a backup round-trip keeps it; no cycle field appears in any
     `day_logs` or `settings` payload; the gate uses `sexOf`, so "prefer not to say" never sees it.
  10. Sign-off from `compliance`, `security-data`, `mental-performance`, `nutrition-accuracy`,
      `design` (and Benn on the boards) and `ship-critic`.

## 7. Build order

1. **Design boards** on the Design canvas for Benn: the Profile offer, setup, the check-in group,
   the Train lighter offer with a cycle signal, the weigh-in note, delete and export.
2. **Cycle v1 (device-only):** gate, setup and consent; check-in group and store; symptom signals in
   `dayOptions`; hunger copy; weigh-in note and period-week guard; safety prompts; delete and
   export; legal updates.
3. **Cycle v1.1:** iron-rich food label; personal patterns after two or three cycles; if-then
   template; comfort-swap tags.
4. **Later:** optional sync (`cycle_days`); life-stage modes (perimenopause depth, postpartum);
   reading cycle data from Apple Health / Health Connect once there is a native build.

## 8. Open questions

1. **Demand.** Two women asked for this. A short survey or a few interviews before the build would
   test how much people want it and what they'd use.
2. **Clinician review** of the safety thresholds and copy before launch. Unknown: who will do it.
3. **The onboarding line.** Offer Cycle once at the end of onboarding for women, or only in
   Profile? Recommendation: Profile only in v1, which is the least pressure.
4. **Unknown:** the Supabase backup retention window (matters only once sync exists).
