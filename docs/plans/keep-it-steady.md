# Keep it steady: the plan and guidance for people coming off weight-loss medication

Proposal, 11 Oct 2026, for Benn's decisions. Benn's ask: "a workout plan and guidance for people
coming off Mounjaro and Ozempic", with "we never give medical advice, so be smart about our
language", "our target audience is these people, so marketing needs to work towards that
audience" and "the app should really help them".

Specialist reports (sources, evidence grades, exact copy): `docs/research/keep-it-steady-2026-10/`
(`fitness.md`, `nutrition.md`, `mind.md`, `compliance.md`, `marketing.md`). Builds on
`docs/plans/maintenance-loop.md` and its research. Nothing here is built yet.

## The shape: a small addition, not a change to the app

Everything below is added to the app as it is: every other goal, plan and screen stays the same.
People coming off weight-loss medication are the niche Tali leads with to break into the market
(Benn, 18 Oct 2026); the app stays for everyone.

- **Goal: Maintain** (Benn, 5 Oct: a first-class goal; people coming off these medicines will
  pick it). No new goal. The goal's explainer gets one line:
  "Stepping down from a weight-loss medicine, finishing a programme or happy where you are? This
  is built for that." (mind; compliance: fine inside the app, not in ads.)
- **Plan: "Strong and steady"** (`strong-and-steady`), a fourth Tali plan, shown first for
  Maintain. Neutral name and id, so choosing it reveals nothing about medication. 12 weeks:
  weeks 1 to 2 easier start, 3 to 7 build, 8 lighter, 9 to 12 build; then maintenance with two
  strength days. Week: Mon, Wed, Fri Full body A, B, C (existing workouts); Tue, Thu, Sat light
  cardio or an easy walk; Sun rest. No new exercise or workout ids. Description: "Three
  full-body strength sessions and three easy walks a week. You start gently, build back strength
  and make movement a regular part of your week. A good fit after losing weight, whatever helped
  you get there." (fitness)
- **Guide: "Keeping it steady after a big change"**, optional reading from the Maintain goal and
  the plan. Reading it stores nothing. Honest: most people regain some weight after a big change,
  and Tali helps with habits, not a promised result. A gentle version with no numbers for anyone
  who answered yes to the eating-worries question. (mind)
- **No medication status anywhere**: not asked for this, not stored, not in push text, AI
  prompts or analytics. Picking a plan *named* after a medicine would itself be health data
  (UK GDPR Art. 9), so names stay neutral. (compliance)

## Why these pieces (the evidence in one line each)

- Regain after stopping averages about 0.8 kg a month, back to the start around 1.5 years, and
  support after stopping didn't slow it (West, BMJ 2026). So: no promises, and steady is success.
- A large share of weight lost on these medicines is lean mass (about 40% semaglutide, 25%
  tirzepatide in trial substudies). So: strength first.
- Exercise has the best evidence after stopping a similar medicine: the supervised-exercise
  group regained 6 kg less over a year (liraglutide, Jensen 2024; not tested for semaglutide or
  tirzepatide).
- Protein 1.2 to 1.6 g/kg with strength training (joint advisory, AJCN 2025). The same for
  everyone on Maintain, so no separate post-medication number.
- How fast appetite returns is unknown, so no timeline is ever promised.

## Language: general wellness, never medical advice

Allowed in the app (examples; full lists in the reports):
- "Appetite back? That's normal. Plan for the hungry days."
- "Steady is success." Weight shown as a range over weeks, never a weekly number.
- "Two short strength sessions a week help you keep muscle."
- "Short nights can make hunger louder. Pick a wind-down time."
- "Any change to a medicine is for you and your prescriber. Tali helps with food, movement and
  sleep around it."

Never: dose or tapering schedules, restarting, side-effect tips, "rebound", "your appetite will
come back in about 4 weeks", "this plan stops the weight coming back", diabetes or glucose advice,
"prevent regain", "clinically proven", "obesity". GP or prescriber lines go in four places only
(the guide's first screen, the medical outcome, an "eating feels out of control" line, the
existing low-mood signpost). A clinician reviews the guide copy before public launch.

## Marketing: market the moment, never the medicine

UK law bans anything "likely to lead to the use of" a prescription-only medicine (Human Medicines
Regulations 2012 reg. 284; CAP 12.12), and the ASA has ruled against ads that only implied these
medicines, including "GLP-1", "jab", "pen" and pen images, and a coaching app's "GLP-1" ad.

- OK: "Keep what's working." "Steady is the goal." "Hungry days happen. Have a plan for them."
- Check with CAP Copy Advice first: "When the extra help stops, keep the habits that help."
  "Food noise back?" (fine in the app, risky in ads).
- Not OK: any medicine or brand name, "GLP-1", jab, injection, pen, before and after photos, weight
  promises, paid targeting by medicine interest, bidding on "coming off Ozempic" (Google limits
  drug terms to certified pharmacies and telemedicine).
- Channels, in order: disclosed participation in communities (r/mounjarouk about 59k,
  r/mounjaromaintenanceuk about 9k, where moderators allow it); independent dietitians and PTs
  handing Tali to clients; a free in-browser hungry-days plan tool (no sign-up, nothing stored);
  SEO on habit topics; the app store listing. Prescriber or pharmacy tie-ups wait for compliance.
- Audience: about 1.5 to 1.6 million UK users (IQVIA 2025; UCL 2026), mostly private, mostly women
  aged 45 to 55. How many stop each year in the UK is unknown and is the number to firm up.
- Success is retention and habits (weekly reviews opened at weeks 4, 8, 12; day-30 and day-90
  active; strength sessions; protein days in range), never kg.

## Fixes needed before onboarding launches (found in this work)

1. The health question's weight-loss injection item drops protein to the 0.75 g/kg minimum
   (`routeSafety`, `src/core/domain/onboarding.ts`), the opposite of the advice for someone on or
   tapering the medicine. Reword to "taking … now" and keep 1.2 to 1.6 g/kg; only kidney disease
   keeps the minimum. The stored outcome must not name the medicine. (nutrition, compliance)
2. `eatingLine` can promise protein the person's Food targets don't give them. (nutrition)
3. The learned maintenance range reads 100 to 260 kcal/day too low while appetite rises slowly.
   For Maintain: start learning at day 42, not 14, and in the first 16 weeks never base an
   eat-less step on an estimate below the starting one. No eat-less suggestion in the first
   4 weeks. (nutrition, mind)

All three are behind `ONBOARDING_ENABLED`, so nobody sees them today.

## Decisions for Benn

1. Approve the shape: Maintain goal, the "Strong and steady" plan, the optional guide, no
   medication data, neutral names.
2. Approve the language rules and the clinician review of the guide before public launch.
3. Marketing: market the moment, never the medicine; pick a lead line ("Keep what's working" is
   the recommendation) for CAP Copy Advice; no paid targeting of this group.
4. Approve the three fixes above.
5. Optional now or later: a home version of the plan (two new workouts from existing exercises),
   a plannable easy walk, and clips for `seated-cable-row`, `leg-curl`, `dead-bug`,
   `one-arm-db-row`.
6. Research: 15 interviews and one dietitian or PT pilot (research data goes past `compliance`).

## Next steps once approved

Design canvas boards (Maintain explainer line, the plan tile and preview, the guide, the gentle
version) past the `design` agent, then Benn; build with `fitness-workouts`, `nutrition-accuracy`,
`mental-performance` and `compliance` reviews; `ship-critic` before `main`.
