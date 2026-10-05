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
2. **Weigh-in check.** `suggestRateAdjustment` as specified (3 weeks and 6 weigh-ins minimum,
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

## Open decisions (Benn)

1. A new `maintain` goal, or fold into "feel better"? Recommended: add `maintain` (additive).
2. Weekly review in-app only, or an optional reminder? Recommended: in-app only at first.
3. Weight in the review by default for this group, or opt-in? Ask `mental-performance`.
4. Store "I'm coming off medication", or only the goal it leads to? Recommended: goal only (avoids
   new special category data).
