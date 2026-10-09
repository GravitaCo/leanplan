# Maintenance loop: the numbers

Author: `nutrition-accuracy` agent, 5 Oct 2026, for `docs/plans/maintenance-loop.md`.
Labels: **[E]** evidence, **[I]** inference, **[G]** judgement call. Simulation scripts:
`docs/research/maintenance-sims/` (AR(1) noise, SD 0.5%, phi 0.4, plus the weekly pattern;
real life adds slow genuine wander, so real false-alarm rates will be higher).

## Benn's question: why do weeks look flat or worse?

For someone truly holding steady, about half of all weeks show a small rise by chance. Simulated
90 kg person, true weight flat:

| Weighs | Week-to-week noise (SD) | Weeks showing a "gain" of 0.5 kg or more |
|---|---|---|
| Daily | 0.34 kg (0.53 with a cycle swing) | 7% (19%) |
| 3 a week | 0.43 kg (0.60) | 12% (21%) |
| Weekly | 0.64 kg (0.79) | 25% (28%) |

Someone really losing 0.5 kg a week still sees "no loss" in 7% to 26% of weeks. Judge a trend over
about 4 weeks against a range, never one week against the last.

## Rules for engineering and design

1. **No week-over-week weight number. A 28-day trend, in words, against a range.** Least-squares
   fit over the last 28 days, dropping readings more than 3% from the window median; extend to 42
   then 56 days until there are at least 6 weigh-ins. Output level, slope and its standard error.
   Not an EMA (it lagged 2 to 8 weeks in simulation). Level ("about 84 kg") after 3 weigh-ins over
   7+ days; trend words only after 6+ weigh-ins over 21+ days. Changes smaller than the noise never
   appear as numbers; shown changes round to 0.5 kg [G]. None of it in gentle mode. Today's
   `weightWeekDelta` (week vs week to 0.1 kg) is mostly noise; replacing it on Today is a visible
   change needing Benn's approval.
2. **Steady range.** Reference = mean of weigh-ins in the first 14 days of maintain (at least 4).
   Width ±3% for the first 6 weeks, then ±2%, drawn in `--band` grey [G, anchored to Stevens 2006:
   maintenance = under 3% change]. Drift = the 28-day trend level outside the range at 2 weekly
   checks in a row with 6+ weigh-ins, either direction. Simulated: 0 to 2% false flags over 26
   flat weeks; 0.8 kg/month regain flagged around week 10, 0.4 kg/month around week 18; a
   Christmas-sized bump (+1.35%) stays inside. Most people stopping semaglutide or tirzepatide
   regain about 0.8 kg a month on average, so most will cross within 2 to 3 months: copy presents
   that as the early signal working, not failure.
3. **Adaptive maintenance.** Maintenance = mean logged intake on qualifying days minus 7,000 x
   trend slope (kg/day). Needs 28+ days with 20+ qualifying days (2+ meals logged) and 6+
   weigh-ins; excludes the first 14 days after maintain starts or any target change; never fills
   unlogged days. Range = ±1.645 x SE, rounded to 50 kcal, never narrower than ±150; shown only
   once narrower than the starting ±15% (about week 5 to 6). Withheld if intake in the two halves of
   the window differs by more than 15% (tapering). Wording: "Based on what you've logged and your
   weight trend"; never "your metabolism", never framed as under-logging. Expected widths: 4 weeks
   about ±275 to 300 kcal; 6 weeks about ±200; 8 weeks about ±165.
4. **7,000 kcal per kg for trend maths, not 7,700** (Heymsfield 2012; Hall 2008). At typical slopes
   the difference is under 50 kcal/day, below the statistical error.
5. **Maintain targets.** Energy at estimated maintenance as a range, no "metabolic adaptation"
   deduction (measured −54 to −210 kcal/day, inconsistent; the adaptive estimate corrects it).
   Protein 1.2 to 1.6 g/kg with strength training 2+ days a week (Mozaffarian et al., AJCN 2025).
   Any eat-less suggestion at most about 150 kcal/day, only after a drift, never past a safety gate
   or below the floors (0.8 kg/month regain is about a 190 kcal/day surplus).
6. **Ask the medical question for maintain too, split by what each answer changes.** Kidney
   disease: protein at the minimum (KDIGO 2024, 0.8 g/kg in CKD 3 to 5). Insulin or sulfonylureas,
   or *currently* taking a GLP-1: no eat-less suggestions and a GP note, but keep the protein range.
   Store outcomes only (an additive outcome such as `protein: 'minimum'` still goes past
   `compliance`). Today a person tapering who ticks the GLP-1 item loses the protein anchor, and
   because `asksMedical` is true only for lose-fat, someone with kidney disease who picks
   build-muscle or strength is never asked and gets 1.6 to 2.2 g/kg.
7. **Mind and food pattern lines.** Sleep to hunger and logged intake has decent evidence; stress to
   intake only as the person's own pattern (general evidence weak, g = 0.11); no mood lines; never
   weight against mind data day by day. Bar: 6+ days in each group within 28 to 42 days and a
   difference bigger than 2 standard errors of the person's own spread; at most one line a week.
8. **Progress beyond the scale, measurable today:** days with protein in range, days logged (never a
   streak), weekday vs weekend evenness (consistency predicts maintenance, Gorin 2004), planned
   sessions done, a strength trend (new pure function over logged sets). Waist needs a new stored
   field, so `compliance` first.

## Problems found in existing plans and code

1. **The specified rate check (`personalized-nutrition-targets.md` §3.3 to §3.4) misfires**: one week
   vs the last with ±0.2% tolerance suggests a change in 60% to 75% of weeks for someone exactly on
   target. Fix: 28-day regression, ±0.35%/week tolerance, 4+ weeks of data, skip the first 2 weeks
   of a new deficit (misfires 0% to 7%). "3 weeks and 6 weigh-ins" is too short.
2. `KCAL_PER_KG_LOST = 7700` in `nutrition.ts` lets loss exceed 1% a week for leaner people; about
   6,500 would hold the cap [I].
3. The lose-fat protein range (1.6 to 2.2 g/kg) passes the joint advisory's caution against 2 g/kg+
   long term in obesity; review with the lean-mass cap.

## Key evidence

- Weight noise: day-to-day SD 0.53%, 0.69% over 7 days; within-person CV 0.66 to 0.71%
  (Pirklbauer 2023); 86.6% of daily changes within ±0.5 kg in young women (Br J Nutr 1965); weekly
  0.35% swing and Christmas +1.35% (Orsama 2014, Turicchi 2020); glycogen holds 3 to 4 times its
  weight in water (Kreitzman 1992); luteal intake +168 kcal/day (Nutr Rev 2025). Unknown: measured
  cycle weight swing from a primary study; size of sodium, bowel, soreness and sleep effects.
- After GLP-1: West et al., BMJ 7 Jan 2026 (37 studies, 9,341 people): semaglutide and tirzepatide
  regain 0.8 kg/month, about 9.9 kg in year 1, back to baseline around 1.5 years; support after
  stopping didn't slow it (moderate certainty, data to 12 months). STEP 1 extension: two-thirds
  regained in a year. SURMOUNT-4: +14.0% over 52 weeks on placebo. SURMOUNT-MAINTAIN (Lancet,
  Jun 2026): tapering to 5 mg still drifts (25% needed rescue). Unknown: weeks 0 to 8 time course.
- Under-reporting 11 to 41% vs doubly labelled water (Burrows 2019); about 31 days to estimate
  intake within ±10% (Basiotis 1987).
- Sleep loss +385 kcal/day (Al Khatib 2017); sleep extension −270 kcal/day in a real-world RCT
  (Tasali 2022); stress-intake g = 0.11 (Hill 2022); hunger ratings weakly predict intake
  (Sadoul 2014); self-weighing not linked to depression or anxiety in adults (Zheng 2015).
- Protein: joint advisory 1.2 to 1.6 g/kg plus resistance training (Mozaffarian et al., AJCN 2025);
  higher protein meant 0.93 kg less regain (Larsen, NEJM 2010); lean mass about 40% of loss in the
  STEP 1 DXA substudy.

## Open questions

- Reference weight: fixed until the person taps "make this my steady weight", or reset every 6
  months? Benn's call.
- Weekly weighers need 6 weeks for trend words: acceptable, or say "not enough weigh-ins yet"?
- Protein for larger bodies: actual weight or capped? Evidence unsettled.
- Recalibrate the noise model from Tali's own anonymised weigh-in variance, if `compliance` allows.

Full source list with DOIs is in the agent's report as delivered to the Marketing session; key
references: West 2026 doi:10.1136/bmj-2025-085304; Wilding 2022 doi:10.1111/dom.14725; Aronne 2024
doi:10.1001/jama.2023.24945; Stevens 2006 doi:10.1038/sj.ijo.0803175; Turicchi 2020
doi:10.1371/journal.pone.0232152; Hall 2008 doi:10.1038/sj.ijo.0803720; Heymsfield 2012
doi:10.1016/j.metabol.2011.11.012; Burrows 2019 doi:10.3389/fendo.2019.00850; Mozaffarian 2025
doi:10.1016/j.ajcnut.2025.04.023; Al Khatib 2017 doi:10.1038/ejcn.2016.201; Tasali 2022
doi:10.1001/jamainternmed.2021.8098; Gorin 2004 doi:10.1038/sj.ijo.0802550.
