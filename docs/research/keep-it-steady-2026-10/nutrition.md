# Eating guidance after stopping a GLP-1 (proposal)

nutrition-accuracy, 11 Oct 2026. Proposal only. [E] evidence, [I] inference, [G] judgement.

## 1. What changes after stopping

**Wash-out:** half-life about 7 days (semaglutide) and 5 days (tirzepatide), per the SmPCs, so little remains after 4 to 5 weeks [I]. Internal context only, never user copy.

**Appetite:** the week-by-week time course is **unknown**. One small study (Wang 2026, n=28; unverified, seen only in a secondary summary) reported rebound in 78.5% within 12 weeks. Weight is better documented: about 0.8 kg a month regained, back to baseline around 1.5 years (West, BMJ 2026). STEP 1 extension: two-thirds regained in a year. SURMOUNT-4: +14% over 52 weeks.

**What has evidence for limiting regain:**

| Lever | Evidence | Strength |
|---|---|---|
| Exercise | After stopping liraglutide, the supervised-exercise group regained 6.0 kg less than the drug-only group over a year (Jensen 2024, n=109) | [E] small RCT |
| Protein | A higher-protein diet meant 0.93 kg less regain over 26 weeks (Larsen, NEJM 2010). The joint advisory gives 1.2 to 1.6 g/kg with strength training (Mozaffarian, AJCN 2025). About 40% of loss on semaglutide was lean mass (STEP 1 DXA) | [E] moderate |
| Eating at maintenance, consistently | Consistent eating predicts maintenance (Gorin 2004) | [E] observational |
| Ultra-processed food | Ad libitum intake was +508 kcal/day on an ultra-processed diet (Hall 2019, n=20, 2 weeks, inpatient) | [E] short, small |
| Alcohol | +82 kcal of food and +256 kcal in total per drinking occasion, with no compensation later (Kwok 2019, 22 studies) | [E] acute, ages 18 to 37 |
| Fibre | SACN 2015 recommends 30 g a day for health. Its effect on regain after GLP-1: **unknown** | [E] for health only |
| Meal timing | Breakfast doesn't help weight (Sievert, BMJ 2019). Protein of 25 to 30 g a meal is mechanistic | weak |

**Caveat:** West 2026 found support after stopping **did not** slow regain (moderate certainty), so Tali must not promise to prevent it.

## 2. Tali's numbers (goal: maintain; medication unknown)

**Protein:** keep 1.4 g/kg inside 1.2 to 1.6, on current weight. No separate post-GLP-1 figure.

**Bug.** Today, anyone who ticks "A weight-loss injection" gets `noProteinAnchor`, so protein drops to the 0.75 g/kg minimum (`onboarding.ts` routeSafety). Someone still on or tapering the drug gets the opposite of the advisory. `eatingLine` ignores the flag and still says "protein about 1.4 g per kg … Your Food targets … cover this". That's untrue for them, and the user sees it. Fixes:
- Split the outcome: a current GLP-1 means no eat-less suggestions plus the GP note, and keeps the range. Only kidney disease keeps the minimum.
- Reword the item as "Taking a weight-loss injection now". Someone who has stopped shouldn't tick it.

**Energy:** maintenance at **current** weight (Mifflin, ±15%), with no adaptation deduction (rule 5). This is likely a big step up from what they ate on the drug. That's correct, not a problem.
- The first 1 to 2 kg of a rise is likely glycogen and water [I, Kreitzman 1992; size unmeasured here].
- Copy says this once, neutrally.
- Never nudge someone up to the range: eating below it early isn't flagged.

**Adaptive estimate under a ramp.** I simulated a deterministic energy-balance model with 1.5 kg of glycogen-water and TEE moving 25 kcal per kg [I]. A slow appetite return **gets past the 15% taper check**: the halves differ by only 6 to 12%.
- The estimate runs **100 to 260 kcal/day low**, because the water gain is counted as fat.
- A 12-week ramp is still 140 kcal low at day 84. That's about the size of the 150 kcal eat-less step, so the bias points at the wrong suggestion.

Proposed fix [G]:
1. For the `maintain` start only, start the window 42 days after maintain begins, not 14. Target changes keep 14.
2. In the first 16 weeks of maintain, a learned estimate **below** the starting estimate is shown but never used as the anchor for a step down.
3. Keep the 15% taper withhold.

It applies to everyone on maintain (diet refeeds ramp the same way), so it needs no medication data.

**Drift** will usually fire in months 2 to 3. The first options are protein, strength, sleep and a hungry-days plan. The range step is at most 150 kcal, never below the floors.

## 3. Eating line for an "after medication" plan

`eatingLine` builds `Protein about 1.4 g per kg a day, {eatingExtra}, and energy at about maintenance. Your Food targets for keeping things steady cover this.` Options for `eatingExtra`:

- A (recommended): `at least 25–30 g at each main meal` gives "Protein about 1.4 g per kg a day, at least 25–30 g at each main meal, and energy at about maintenance." It matches the strength plan's existing wording.
- B: `with protein, vegetables or beans at each main meal`
- C: `at regular meals, even on less hungry days`

Gentle mode keeps the existing line. Fix the flag mismatch above before shipping any figure.

**Naming (compliance):** a plan called "After Mounjaro/Ozempic" is a synced choice that reveals medication, against Benn's decision 4. Use a neutral name ("Keep it off", "Hold your progress"); `forWho` may say "including after stopping a weight-loss medicine", via `compliance`. Brand names in marketing may engage the prescription-only medicine advertising ban (Human Medicines Regulations 2012, reg 284) and CAP weight-control rules.

## 3b. Practical lines, in wellness language

Use these in the plan, its tips and the hungry-days plan. Every line is about food, habits or how the person feels. None mentions the medicine. OK = general wellness. **MEDICAL** = crosses the line: don't ship.

| Purpose | Wording | Verdict |
|---|---|---|
| Framing | "Your appetite may feel bigger than it has for a while. That's normal, and it's what this plan is built around." | OK |
| Framing | "Your appetite will come back in about 4 weeks as the medicine wears off." | **MEDICAL** (drug effect, timing) |
| Protein | "Build each main meal around a protein: eggs, yoghurt, fish, chicken, tofu, beans or lentils. It helps meals feel more filling." | OK (Larsen 2010, satiety) |
| Fibre | "Add vegetables, fruit, beans or wholegrains to most meals. Most of us eat less fibre than is good for us." | OK (SACN 2015: 30 g; UK adults average about 20 g, NDNS) |
| Structure | "Regular meals can make hungry evenings easier. Pick a rhythm that suits your day." | OK (rhythm, no rule) |
| Hungry days | "On a hungrier day: a protein snack mid-afternoon and a dinner you've planned ahead." | OK (if-then plan) |
| Processed food | "It's easy to eat more of very processed foods without noticing. Meals from simple ingredients make 'enough' easier to spot." | OK (Hall 2019, small) |
| Alcohol | "Drinks often lead to eating more later. If you're having one, plan the food that goes with it." | OK (Kwok 2019) |
| Weight | "A small rise in the first weeks of eating more is mostly water, not fat." | OK, once, weight opt-in only |
| Weight | "This plan stops the weight coming back." / "Keeps off what the injection took off." | **MEDICAL / unproven** (West 2026) |
| Move | "Strength training twice a week helps keep the muscle you have." | OK (advisory) |
| Medicine | "Speak to your GP or prescriber about anything to do with your medicine." | OK (signpost) |
| Medicine | "Taper slowly to avoid rebound hunger." / "If you're regaining, talk about restarting." / "Eat X when you reduce your dose." | **MEDICAL** |
| Diabetes | "If you have diabetes, adjust carbs as your medicine changes." | **MEDICAL** |

## 4. General wellness only

GP or prescriber topics, never addressed by Tali: stopping, tapering, restarting, doses or switching; diabetes and glucose (hypos on insulin or sulfonylureas); kidney disease; persistent nausea, vomiting or abdominal pain; pregnancy planning. Tali signposts with "Your GP or prescriber can help with anything about the medicine itself", makes no regain-prevention claims or drug comparisons, and shows no regain statistics (expectations copy is `mental-performance`'s).

## Uncertain

When appetite returns; diet vs exercise after stopping; GLP-1-specific fibre and UPF effects; the ramp bias size (one deterministic model, assumed glycogen and TEE slope); protein for larger bodies.

## Top 3 decisions for Benn

1. **Split the medical outcome and reword it to "now"**, so people on or tapering a GLP-1 keep the 1.2 to 1.6 g/kg range. Fix `eatingLine` so it never claims Food targets the person doesn't have.
2. **Protect the adaptive estimate from the appetite ramp**: start the window 42 days after maintain begins, and use no below-start estimate for an eat-less step in the first 16 weeks.
3. **A neutral plan name, with no medication named in anything stored**, with compliance reviewing the plan and any marketing that names Ozempic or Mounjaro.

Sources: West 2026 doi:10.1136/bmj-2025-085304; Wilding 2022 doi:10.1111/dom.14725; Aronne 2024 doi:10.1001/jama.2023.24945; Jensen 2024 eClinicalMedicine (liraglutide/exercise follow-up); Larsen 2010 doi:10.1056/NEJMoa1007137; Mozaffarian 2025 doi:10.1016/j.ajcnut.2025.04.023; Hall 2019 doi:10.1016/j.cmet.2019.05.008; Kwok 2019 Br J Nutr 121:481; Sievert 2019 doi:10.1136/bmj.l42; SACN Carbohydrates and Health 2015; Gorin 2004 doi:10.1038/sj.ijo.0802550; Wegovy and Mounjaro SmPCs (EMC).
