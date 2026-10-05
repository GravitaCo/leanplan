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

Still open: whether weight shows in the review by default for maintain users or is opt-in
(`mental-performance` recommends, Benn decides).

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
