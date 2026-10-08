# The maintenance loop: weekly review, weigh-in check, maintenance mode

Brief from the Marketing session, 5 Oct 2026, for Design II and Engineering II. Context: the market
research (`docs/research/market-wedge-2026-09.md`) recommends leading with "keeping it": people
stepping down from or coming off weight-loss medication who want to keep their habits without
strict counting. Maintenance is the heart of that, and today it's promised but not built.

## Benn's rule: all data is connected, including the mind

Nothing in this loop reads one pillar on its own. The weekly review, the weigh-in check and
maintenance mode all draw on the whole picture: **mind** (check-in mood, hunger, sleep, stress,
energy, soreness; if-then plans; the person's "what would make this worth it" answers), **food**
(intake, days in range, protein, the ± margin), **movement** (sessions done, walks, planned vs
done) and **body** (the weight trend). In practice:

- A weight or intake signal is never shown or acted on without its mind context. A drift after a
  week of short sleep and high stress is a different conversation from the same drift in a calm
  week, and the first suggestion may be about sleep, stress or a hungry-days plan, not calories.
- Suggestions offer options from every pillar (a hungry-days plan, a protein range, a strength
  session, an earlier night), not only a lower calorie target.
- Pattern lines describe the person's own data ("hunger was higher on your short-sleep days"),
  with a minimum amount of data before they appear. Never a causal or clinical claim.
  `mental-performance` owns the wording, thresholds and whether a line shows at all.
- The engine and nutrition code read one shared weekly picture rather than each building their own.

## What exists today

| Piece | State |
|---|---|
| Weigh-ins, week-vs-week weight delta | Built: `weightWeekDelta()`, `weightSeries()` in `src/core/domain/insights.ts`; Today and `src/screens/body/WeightSheet.tsx` |
| Weekly food picture (average, days in range, sessions done) | Built: `weekSummary()` in `insights.ts`, Today |
| Check-in: mood, hunger, sleep, stress, energy, sore | Built: `CheckIn` in `src/core/types.ts` |
| If-then plan weekly review | Built: `plansDue()` |
| Training load signals | `src/core/domain/load.ts` (`loadSignals`) |
| Weekly review tying it together | **Not built** |
| 3 to 4 week weigh-in check (`suggestRateAdjustment`) | **Specified, not built**: `personalized-nutrition-targets.md` §3; `first-run-onboarding.md` §5 and §10 phase 6 (never before 3 weeks and 6 weigh-ins). Promised in `src/screens/onboarding/Summary.tsx:161`, which is off behind `ONBOARDING_ENABLED` |
| Maintenance estimate checked against real intake and weight | **Not built**; the starting estimate (about ±15%) never improves |
| A maintenance goal | **Missing**: `Goal` has no `maintain`; the weigh-in check is specified for loss and gain only |
| `profile.motivations` shown back in the weekly review | Promised in plans, not built |

## What to build

1. **Weekly review.** A short look back on a day the person picks, in-app (no push by default).
   The week in plain words across all four pillars, the weight trend as a band (none in gentle
   mode), one neutral mind-to-food-or-move pattern line when there's enough data, the person's own
   "why" shown back, if-then plans due, and one choice for next week: keep, ease off, or adjust.
   A missed week gets "welcome back", nothing to catch up.
2. **Weigh-in check.** `suggestRateAdjustment` rebuilt to the `nutrition-accuracy` rules below (28-day trend, 4+ weeks of data,
   averages not spot readings, at most weekly, suggest never apply), plus an adaptive maintenance
   estimate from logged intake and the weight trend, only with enough logged days, shown as a
   range with its ± margin. Before suggesting a change it checks the mind context (sleep, stress,
   hunger, wellbeing flags). `nutrition-accuracy` sets the thresholds and energy-per-kg figure.
3. **Maintenance mode.** Hold-steady check: weight trend against a band around the starting
   point; a drift beyond it for 2+ weeks offers options from every pillar. Band width from
   `nutrition-accuracy`.

**Safety:** gentle mode hides every number; nothing below the existing floors; no "eat less"
suggestion when wellbeing is flagged, for teenagers, or during pregnancy; weigh-in frequency is
the person's choice, never nagged; no streaks.

## Order and owners

1. **Engineering II:** pure `src/core/domain` functions with unit tests: one shared weekly
   picture (all pillars), the weekly review model, `suggestRateAdjustment`, adaptive maintenance,
   the maintenance band check. No UI, no new stored fields until decisions below land. Offline,
   framework-agnostic.
2. **Design II:** boards on the Design canvas for the weekly review, the suggestion card and the
   maintenance path, showing how the mind context sits alongside food, movement and weight.
   Benn approves before any UI is built.
3. **Engineering II:** wire the approved boards.
4. Reviews: `nutrition-accuracy` (thresholds), `mental-performance` (wording, pattern lines,
   safety), `compliance` (any new stored field), then `ship-critic` before `main`.

## Decisions (Benn, 5 Oct 2026)

1. **Maintain is a first-class goal**, not a tack-on: a new `maintain` value in `Goal` and an
   option in `GOAL_OPTIONS` (`src/core/domain/wizard.ts`), designed into onboarding alongside the
   others. People coming off Ozempic or Mounjaro will pick it, so onboarding must understand that
   moment (wording, starting at maintenance, protein and strength, the weekly rhythm) without
   asking for or storing medication status. Note the conflict to resolve: the medical question is
   only asked when the goal means eating less, and a ticked GLP-1 medicine today removes the
   high-protein anchor (`OnboardingOutcomes.medical`). `nutrition-accuracy` advises.
2. **Push notification reminder** for the weekly review that opens the app at the review. Opt-in,
   on the day the person picks. Extends the existing Web Push (`src/data/push.ts`,
   `supabase/functions/send-supplement-reminders`); a new reminder type is a privacy policy and
   register change and goes past `compliance` (PECR, consent wording).
3. **The science of "no improvement" weeks is owned by `nutrition-accuracy` (the numbers) and
   `mental-performance` (the psychology and abandonment risk).** Weeks will often look flat or
   worse because of water, sleep, stress, cycle and many other factors. Their findings set how the
   loop smooths data, when it says anything, what it shows instead of a scale number, and how a
   flat or worse week is framed so it doesn't drive people away. Their rules are added below as
   they land; nothing is built against guessed thresholds.
4. **Store only the goal**, never medication status.

Resolved 8 Oct: weight is opt-in (see below).

## Specialist rules

### Psychology and safety (`mental-performance`, 5 Oct 2026)

Full findings: `docs/research/maintenance-psychology-2026-10.md`. Binding rules for design and
engineering: steady is success (band over 2 to 4 week averages, never a 0.1 kg weekly delta as the
maintain headline); review order is actions, then mind context, then body; weight in the review is
an explicit opt-in asked once when Maintain is picked (never in gentle mode or wellbeing flagged);
a missed week is "welcome back" with no catch-up; the push reminder is offered after the first
review, generic lock-screen text, backs off after unopened reminders and pauses in safety weeks;
pattern lines are a fixed v1 set, minimum data, never ending in weight or kcal; suggestions lead
with "keep as is" and mind options after hard weeks; two safety tiers (care version, support
sheet) pending clinical review.

### Numbers (`nutrition-accuracy`, 5 Oct 2026)

Full findings: `docs/research/maintenance-numbers-2026-10.md` (simulations in
`docs/research/maintenance-sims/`). Binding rules: no week-over-week weight number; a 28-day
least-squares trend in words against a range (level after 3 weigh-ins, trend words after 6 over
21+ days); steady range = ±3% of the first-14-day mean for 6 weeks, then ±2%, drift = outside at 2
weekly checks in a row; adaptive maintenance only after 28 days, 20 logged days and 6 weigh-ins,
shown as a range, using 7,000 kcal/kg; maintain protein 1.2 to 1.6 g/kg with strength 2+ days a
week; any eat-less suggestion at most about 150 kcal/day and only after a drift; ask the medical
question for maintain too and split it so a current GLP-1 keeps the protein range while kidney
disease keeps the minimum.

**This replaces the old weigh-in check spec.** The `suggestRateAdjustment` rules in
`personalized-nutrition-targets.md` §3.3 to §3.4 misfire in 60% to 75% of weeks; use the 28-day
regression, ±0.35%/week tolerance, 4+ weeks of data and skip the first 2 weeks of a new deficit.

### Where the two agree and how conflicts resolve

Both say steady is success and a single week means little. Pattern lines take the stricter of the
two bars: a fixed v1 pair list, 6+ days in each group within 28 to 42 days, a difference beyond 2
standard errors, repeated in two windows before first showing, at most one a week, no pairs ending
in weight or kcal, no mood lines.

## Design approved, decisions of 8 Oct 2026 (Benn): build this

Benn approved every maintenance loop board on 8 Oct 2026 ("loops all approved, push to
engineering for implementation"). The boards are section 7 of the Design canvas "Tali App ·
Train & Plan review" (https://claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb), note `s-ml-principles`:

| Board | What it is |
|---|---|
| `ml-a1-review` (+ `-dark`) | Weekly review, a steady week |
| `ml-a2-review-gentle` | Weekly review in gentle mode: words only, no numbers, no weight |
| `ml-a3-review-rough` | Weekly review after a harder week (mind options first) |
| `ml-a4-welcome-back` | After a missed review: what you did since, nothing to catch up |
| `ml-a5-change-one` | "Change one thing" sheet |
| `ml-b1` to `ml-b3` | The 3-week check: calm, stressed, on pace |
| `ml-b4-maintenance-learned` | Adaptive range learned from logs |
| `ml-c1-goal`, `ml-c2-steady-explainer` | "Keep it steady" goal and its explainer |
| `ml-c3-drift` | Keeping it steady: drift, in words, weight opt-in only |
| `ml-c4-weight-ask` | The one-time ask: include weight in reviews? |
| `ml-d1-review-day`, `ml-d2-notification` | Review day, opt-in reminder, lock-screen text |

These decisions override anything above that disagrees:

1. **Outcome, not a scoreboard.** The review opens with "What you did": plain statements of what
   the person did (check-ins, sessions and walks, strength progress from logged sets, days logged,
   days in range, protein), with one line of encouragement, then the pattern line, their "why",
   their if-then plan, and "For next week". The day-by-day grid is dropped: it pointed at gaps and
   drives abandonment.
2. **No "x of y" anywhere in the loop.** "8 sessions done", "5 days in your range", "Short nights
   on 4 days last week"; never "8 of 9", "5 of 6" or "all 3 planned". Goals are what people work
   towards, not pass marks; the loop reinforces repeatable habits. Ranges stay: they give tolerance
   instead of a single target.
3. **Weight is opt-in and never assumed** (asked once, `ml-c4`; changeable any time). For people
   who turn it on: how often they weighed in, and after 4 weeks the trend in words (the 28-day
   regression and thresholds in the numbers rules above). No chart, no sparkline, no
   week-to-week number, never in gentle mode or when wellbeing is flagged. People who don't weigh
   in get the loop from the other signals. Basis: `nutrition-accuracy` and `fitness-workouts`,
   8 Oct: week-to-week scale changes are mostly water, glycogen, sodium, the menstrual cycle and
   training; recomposition can hide fat loss for weeks; a 4-week trend is still usable.
4. **Encouragement first**, including in a hard week ("A full-on week, and you still showed up").

**Also in scope (the live app breaks rules 2 and 3 today):** the Summary's This week card
(`src/screens/TodayScreen.tsx`) says "Workouts 3 of 5" and "Logged 5 of 6", and the Weight tile
shows a sparkline and "x kg vs last week" (`weightWeekDelta`). Change them to counts without a
denominator and the latest weigh-in plus the 4-week trend in words, behind the same weight opt-in.
These are visible changes: put the resulting screens on the canvas for Benn before shipping, and
re-render the website's "whole day" loop (it shows both) before the Webflow publish.

**Existing work:** `origin/claude/brave-pascal-lxryw1` commit 7619a33 has a domain-only first pass
(`weekPicture.ts`, `maintenanceLoop.ts`, `loopThresholds.ts`, 64 tests). It predates the numbers
rules (uses 3 weeks and 6 weigh-ins and a week-on-week threshold) and these decisions: build on it,
bring it in line, add `maintain` to `Goal`.

**Order for Engineering II:** (1) domain functions and tests to the rules here; (2) the weight
opt-in setting and the Summary fixes; (3) the screens, board by board, checked in a headless
browser against the boards in light and dark; (4) the reminder (a new push type is a privacy policy
and register change: `compliance` first). Reviews: `nutrition-accuracy`, `mental-performance`,
`compliance` for any new stored field or reminder, `design` for every screen, then `ship-critic`
before anything reaches `main`.

## Engineering II: how the rules were read (8 Oct 2026)

Asked of `nutrition-accuracy` and `mental-performance` on 8 Oct; their answers are what step 1
builds (`weightTrend.ts`, `weekPicture.ts`, `maintenanceLoop.ts`, `loopCopy.ts`,
`loopThresholds.ts`; tests in `scripts/test-loop.ts`).

- **Trend:** the level is the fitted value at yesterday, not the window mean. Outliers are dropped
  once against the median of the window in use. Standard errors are multiplied by 1.5 for
  correlated day-to-day noise (untested in the simulations). Trend words need 6 weigh-ins spanning
  21+ days with the first 28+ days back. Goals with no pace or range read "about level" within
  0.25% a week or 2 SE.
- **Weigh-in check:** lose-fat only; build-muscle waits (gain rates unsourced and the size of the
  tolerance). Off pace = beyond ±0.35% a week and beyond 2 SE. 28 days of data starting 14 days
  after the last target change (a new `targetSetAt` field). One step is 100 kcal at both ends of the
  range; floors at 7,000 kcal/kg.
- **Adaptive maintenance:** SE = sqrt(SE intake² + (7,000 × SE slope)²); qualifying day = 2+ meal
  slots; the same window for intake and trend.
- **Steady range:** fewer than 4 weigh-ins in the first 14 days takes the first 4 within 28 days;
  "Make this my new starting point" sets the reference to the trend level and restarts the 6-week
  ±3% period. Drift is computed statelessly at yesterday and 8 days ago.
- **Maintain:** energy at maintenance, protein anchor 1.4 g/kg inside 1.2 to 1.6, the medical
  question asked (nutrition-accuracy recommends asking it for every goal: kidney disease on
  build-muscle or strength gets 1.6 to 2.2 g/kg today; that changes the question's copy, so it waits
  for a board).
- **Mind:** one "hard week" predicate (3+ check-ins and 3+ poor-sleep, 3+ high-stress or 2+ low
  days) drives the hard encouragement line, mind options first, and no eat-less option. Row words,
  protein and strength lines follow mental-performance's rule set in `loopCopy.ts`.
- **Pattern lines:** v1 pairs sleep→hunger, stress→hunger, sleep→energy, energy→sessions,
  calm→sessions; "plan used → hungry days" dropped (no per-day data); the full 42 days must pass
  and each 21-day half must agree; one line a review, a pair at most once in 4 weeks; gentle mode
  gets mind and movement lines only (board ml-a2), none with wellbeing flagged or in a hard week.
- **Ease off:** the shorter sessions pre-selected for 7 days (`easyFrom`/`easyUntil`); the food
  range is not widened.

## Benn's answers to Engineering II (8 Oct 2026)

1. **No lower range after a hard week.** "Adjust my range" down is hidden after a hard week (the
   one hard-week predicate above) and comes back the next calm week. Boards ml-b2 and ml-a5 showed
   it; the build follows the safety rule.
2. **Weight opt-in applies to everyone**, asked once at the first review. Until someone says yes,
   the Summary Weight tile still logs a weigh-in but shows no number or trend.
3. **Weight-based checks need the opt-in**: the weigh-in check, drift and "your range from your
   logs" only run for people who chose to include weight.
4. **"Your 4-week check"** replaces "Your 3-week check" (ml-b1 to ml-b3), with "The last 4 weeks".
5. **Ease off** pre-selects the shorter sessions for 7 days and leaves food alone; its line becomes
   "A lighter week: shorter sessions, more room."
6. **Reminder back-off as on ml-d2**: weekly until 3 in a row go unopened, then it pauses and Tali
   asks once in the app, "Keep the weekly reminder?"
7. **The medical question for every goal**: reworded on a new board for Benn's approval (it mentions
   eating less today); the flag keeps protein at the minimum.
8. **Boards ml-e1 to ml-e4 approved** (drafted 8 Oct for the screens the first boards didn't cover):
   This week card with counts only and no logged-day dots (ml-e1); the Weight tile with the latest
   weigh-in and the 4-week trend in words, words only for people who left weight out (ml-e2); the
   review card on Summary under Mind on review day, gone once opened, a cross hides it until next
   week (ml-e3); Profile's "Weekly review" group, with the reminder under Notifications (ml-e4).
   ml-e5 and ml-e5b (the medical question for every goal) await Benn.
