# N11 Onboarding: parity checklist (native against web)

The web is the spec: `src/screens/onboarding/` (Wizard, Summary, AgeStop, Signposts, Opts,
Consent), `src/screens/plan/PlanSheets.tsx` (FirstPlanSheet), `src/screens/train/GuidedPlayer.tsx`
(find your weight, how was that set), `src/App.tsx` (the gate). Decisions are the shared core's
(`core/domain/wizard.ts`, `onboarding.ts`), words are `src/copy/onboarding.ts` and
`onboardingApp.ts`. Behind `ONBOARDING_ENABLED`, the same flag value as web (`babel.config.js`).

"Every state" means: light and dark; health consent given and "Not now"; first run, Redo setup,
Set up my plan and the setup card alone; offline; small and large phones; Dynamic Type at the
largest setting; VoiceOver labels equal to the web's `aria` labels.

Checked by `scripts/e2e-onboarding-parity.cjs` (web flag-on build against the native web render,
in-memory Supabase stand-in): **[S]** each screen's words, **[D]** the draft, **[N]** the summary's
numbers against `startingTargets`, **[V]** what Start saves. The screenshots it writes go to `design`.

## State of the stream (13 Nov 2026, evening)

- M1 (shared logic and words, the flow hook): SHIP, merged into claude/native-build (53904e1).
- M2 (the screens on N1's lib/ui): built; parity 638/638 through `app/onboarding-e2e.tsx`
  (EXPO_PUBLIC_E2E builds only) until the lead wires `useOnboardingGate` into `lib/gate.tsx`.
  Waiting for the gate: Redo setup's own 18+ stop (`useUnderAgeInWizard`), compared with
  `GATE_WIRED=1`.
- Waiting for N2: the 18+ stop (passed in as `ageStop`), the pending-deletion check, Redo setup's
  "Close and delete".
- For N1 (web render only): aria-checked / aria-valuenow / aria-valuetext on tiles and pickers
  (react-native-web drops accessibilityState and accessibilityValue), arrow keys on the pickers,
  and a second mouse drag on a picker. The parity driver works around them (PARITY driver notes in
  the script's header).
- For N7: Find your weight and How was that set? (core/domain/guided.ts findWeightStep, findWeightAim).

## Routes

| Route | Web source | Checks |
|---|---|---|
| Intro → name → age → health questions → why → goal → lately → wellbeing → body → medical → weight → move → handoff | Wizard.tsx | S D V N |
| Setup card: moving, confidence, days (count, weekdays, 1-day note, default spread), minutes (ranges, warm-up line), where (gym clears kit), kit, enjoy ("Not sure yet" link), areas, Build my week, Part 3 intro | Wizard.tsx | S D V |
| Summary: hero (built / starter / chosen plan), week strip, reasons (4 chips, All reasons), Food card, See other plans, Change my answers, Start | Summary.tsx | S N V |
| Sheets: Why we ask, How we worked this out, All reasons, a reason, a day ("Why each part is here"), Other plans, Eating at maintenance, Rebuild your week too? | Summary.tsx, Wizard.tsx | S |
| Readiness yes → "We'll start gently" + GP, NHS 111, 999 | Wizard.tsx Note | S D V |
| Pregnant → "We'll keep things gentle" + midwife; maintenance card, no number; What this means → See your health check answers → a new yes shows its note first | Wizard.tsx, Summary.tsx | S D V N |
| Recent surgery → the readiness note, not pregnancy | Wizard.tsx | S D |
| Wellbeing Yes → note with Beat (every nation, webchat), NHS 111, Samaritans, 999; Yes card, no number | Wizard.tsx, Summary.tsx | S D V N |
| Wellbeing Sometimes → the same note; Sometimes card, no number on the summary | Wizard.tsx, Summary.tsx | S D V N |
| Medical kidney → "Your food range stays at maintenance" (protein wording) | Wizard.tsx | S D V |
| Medical injection → the no-deficit note (no protein wording), outcome `no-deficit` only | Wizard.tsx | S D V |
| Quick change of goal inside the 280 ms beat: the latest tap is saved | Wizard.tsx useAdvance | D |
| Under 18 (first run) → kind stop → I typed my age wrong → Close deletes the account (once, `under-age`) and wipes the device | AgeStop.tsx Under16 | S, deletion and wipe equal |
| Under 18 (Redo setup) → the app's stop; no under-18 age kept in the draft; `underAge.inWizard` | AgeStop.tsx UnderAgeStop | S D |
| Skip on the intro → age only → Starter week, no estimate | Wizard.tsx SkipAge | S V |
| Skip for now on the handoff → Starter week summary with "Personalise it" | Summary.tsx | S V N |
| No weight → no numbers → Add weight → numbers | Summary.tsx FoodCard | S N |
| Imperial: 5 ft 8 in and 13 st 10 lb saved as 172.7 cm (ft-in) and 87.1 kg (st-lb) | Wizard.tsx Body, Weight | V |
| No health data consent ("Not now"): no health question, nothing health-related in the draft, "Targets need your OK" | Wizard.tsx stepsFor, Summary.tsx | S D V |
| A reload mid-wizard resumes on the same question, answers kept | Wizard.tsx loadDraft | S |
| Redo setup: prefilled (name, age, why); Keep my current week / Rebuild my week | Wizard.tsx draftFromProfile, Summary.tsx | S V |
| Set up my plan (used Tilo before): prefilled from Profile; no new weigh-in | same | S V |
| Flag off: no wizard | App.tsx | no wizard, no draft |
| Moments: Finish your setup card (setupCardDue), Build my plan card (buildCardDue), if-then sheet (ifThenOfferDue), Find your weight, How was that set? | Consent.tsx, PlanSheets.tsx, GuidedPlayer.tsx | placed by N4, N8, N7; words by review |

Not here: the picker drag and VoiceOver checks of e2e-onboarding ("pickers", "VoiceOver") are N1's.
Each new screen must still focus its heading for VoiceOver (checked on the Part 3 intro).

## Review findings to apply when the screens are rebuilt on N1

From the reviews of the stand-in version (13 Nov). Fitness-workouts and compliance (for the
integration branch) approved; design, nutrition-accuracy and mental-performance asked for these:

- design: body text tracking -0.01em (web `body`); icons at the web's rendered 20 px (goal
  pictograms, tile check, week dumbbells, Back chevron, Other plans tick), Opts check and chevron
  stay 14; weight figure `marginTop: 18`; photos keep the web's object-position (part photos 50% 40%,
  plan `artAt`); no extra margin above "Personalise it"; links with padding 0 where the web has it
  (All reasons, Food card links, Maint sheet link); the day sheet subtitle at -6; the Other plans
  selected outline must not change layout; sheets fully on screen; "Start set 1" is the video
  screen's white button (`.gp-main`) in both modes; `.gp-name` 600, gap 12; Build my plan card
  bottom margin 10; three tiles keep -0.01em, tall grid tiles line height 21.25, a chosen tile's
  subtitle at 0.75 opacity.
- design, needs Benn or Sara: cards inside sheets in dark mode (web keeps `--card`, which has no
  edge on a `--card` sheet; native used `--elev`). Until decided, native follows the web.
- nutrition-accuracy: the Ruler must read min, max and px fresh after a unit switch (a stale range
  while dragging in ft in or lb). For N1's Ruler.
- mental-performance: no developer text anywhere a person can see (the old Redo-stop alert); the
  Redo setup and Set up my plan rows (N10) must not be wired before N2's stop is passed in.
- compliance (before any build reaches users, N2): Redo setup's stop needs the account deletion;
  the gate needs the web's pending-deletion check before the stop.
- fitness-workouts, for N7: the find-your-weight step rule (1 kg up to 10 kg, then 2.5 kg) and the
  "Aim for" line should be shared, not built in each player; Preview's thumbs are N7's.
