# Training for keeping it steady after weight loss (GLP-1 audience): proposal

`fitness-workouts`, 11 Oct 2026. Proposal only: no code or repo files changed. Revised for Benn's direction: serve this audience well, keep every in-app word general wellness, and give the plan a neutral name and id. Sections 2 and 4 are internal reasoning, never app copy. Evidence labels: **[strong]**, **[moderate]**, **[weak]**, **unknown**.

## 1. Existing plan or a new one?

**Training content: reuse. Plan: a fourth Tali plan.** Full body system already has the right workouts (a squat or lunge, a hinge, a push and a pull each session, beginner rep ranges, mostly filmed). But 8 weeks is shorter than the window where regain builds, one Ease in week is short for a deconditioned start, its copy and eating line are lose-fat, and it has no safety line.

**Proposed: "Strong and steady"**, id `strong-and-steady`, 12 weeks, tagline "12 weeks · 3 full-body, 3 walks". The name and id say nothing about medication, so a stored `baseTemplateId` reveals only a training choice. It is for anyone keeping weight steady after losing it. The people stopping a GLP-1 reach it through the Maintain goal (it leads there), not through a medication label.

- `goals: ['maintain', 'increase-strength', 'feel-better']`, `nutritionGoal: 'maintain'`, `experience: ['new', 'comfortable']`, `where: ['gym']`.
- No new exercise ids and no new workout ids: it uses `tali-full-body-a/b/c` and the built-in `Cardio` (Light cardio, 20 to 30 min brisk walk or bike).

| Weeks | Phase | Week |
|---|---|---|
| 1 to 2 | Ease in (`maintain: true`, shorter versions) | the Build week, lighter |
| 3 to 7 | Build | Mon Full body A · Tue Light cardio · Wed Full body B · Thu Light cardio · Fri Full body C · Sat Light cardio · Sun rest |
| 8 | Lighter week (`maintain: true`) | the same, shorter |
| 9 to 12 | Build | the same week |
| after | Maintenance (open-ended) | Mon Full body A · Tue Light cardio · Thu Full body B · Sat Light cardio |

**Why this shape.** Three full-body sessions at low volume each suit a beginner better than a split [moderate: ACSM progression models 2009]. Compound first, core last, a push and a pull every session. Rep ranges of 8 to 12 at 2 to 3 reps in reserve in Ease in, 1 to 3 in Build, progressing by reps first and then the smallest load step: safe loads with steady overload. Two Ease in weeks because heavy soreness early puts people off [judgement]. Maintenance keeps two strength days: muscle and strength hold on about a third of the volume in younger adults, less reliably in older ones [moderate: Bickel 2011; Spiering 2021], and the joint advisory pairs protein with strength training 2+ days a week [moderate: Mozaffarian, AJCN 2025]. Always a rest day.

**About copy (draft):** "Three full-body strength sessions and three easy walks a week. You start gently, build back strength and make movement a regular part of your week. A good fit after losing weight, whatever helped you get there." `forWho`: "Keeping things steady; just starting or getting comfortable".

**Copy rules for this plan:** no mention of any medicine, dose, tapering or stopping. No promise that the plan prevents or limits regain or changes weight. Benefits stay general (strength, energy, feeling capable). The evidence below shapes the programming, not the claims.

## 2. What matters physically after stopping

- **Lean mass lost during the drug-assisted loss.** About 40% of weight lost was lean mass on semaglutide (STEP 1 DXA substudy, Wilding, NEJM 2021) and about 25% on tirzepatide (SURMOUNT-1 substudy, Jastreboff, NEJM 2022) [moderate: small substudies]. Whether this lean loss reduces everyday strength or function in people under 60: **unknown**.
- **Regain may be more fat than muscle.** In older women, weight regained after a diet was proportionally more fat than the weight lost (Beavers, AJCN 2011) [weak: one cohort, not GLP-1]. For GLP-1 regain specifically: **unknown**.
- **Strength training preserves lean mass and function during loss** [strong for diet-led loss in older adults: Villareal, NEJM 2017; joint advisory 2025]. Strength training *after stopping a GLP-1*: no trial, **unknown**.
- **Exercise and regain after stopping.** The best direct evidence is S-LITE: one year after treatment ended, the liraglutide-only group had regained more than the groups who had exercised (Lundgren, NEJM 2021; Jensen, eClinicalMedicine 2024) [moderate: one RCT, liraglutide not semaglutide or tirzepatide, follow-up observational]. Against that, West et al. (BMJ 2026) found support after stopping did not slow average regain [moderate]. So: probably helps, no guarantee.
- **Daily movement.** People who keep weight off tend to be active about 200 to 300 minutes a week (Donnelly, ACSM position stand 2009; Jakicic, Arch Intern Med 2008) [weak to moderate: mostly observational]. A step number that limits regain: **unknown** (step evidence is for mortality: Paluch, Lancet Public Health 2022). So the plan says "an easy walk on most days", never a step target.
- **Deconditioned start.** The UK CMO floor (150 minutes moderate activity plus strength 2 days a week, 2019) is the target to grow into, not week one.

## 3. Safety lines (plan `safety` field and preview)

General wellness wording only; `mental-performance` and `compliance` to check.

- "Had chest pain, fainting, a heart condition, recent surgery or illness, or not sure exercise is right for you? Speak to your GP first."
- "Take any regular medicine? Your GP or pharmacist can tell you if anything changes when you exercise." (Generic on purpose: it names no medicine. The reason is the low-blood-sugar risk with insulin or sulfonylureas.)
- In-session: "Feeling dizzy, sick or unusually out of breath? Stop, sit, sip some water. Come back another day." "Have something to eat and drink in the few hours before."
- Never: anything about a medicine or its dose; any claim about preventing regain; "burn off"; "earn"; framing weight change as failure. Exercise is for strength and feeling well (§0.8).
- No medication question in the plan and nothing stored (Benn, 5 Oct).

## 4. Fit with Maintain and the 28-day loop

- It leads for `maintain`; its eating line is the engine's maintain line (protein about 1.4 g/kg inside 1.2 to 1.6, energy at about maintenance).
- Ease in (weeks 1 to 2) matches the steady range's first 14 days: food and training both start gently, and nothing is judged yet.
- 12 weeks is three 28-day windows. Internally, that is when many people who have stopped a GLP-1 cross their band (about 0.8 kg a month). The review's "What you did" gets a non-scale signal right then: sessions, walks and the strength trend from logged sets.
- A drift offers a walk or keeping the plan as is, never an extra hard session (§0.5: never coach toward more). "Ease off" uses the same shorter versions as Ease in.

## 5. Gaps

- **Clips missing** in the three workouts: `seated-cable-row`, `leg-curl`, `dead-bug`, `one-arm-db-row`.
- **No home version.** A home sibling from existing exercises: A `goblet-squat`, `incline-push-up`, `one-arm-db-row`, `glute-bridge`, `bird-dog`, `farmer-carry`; B `split-squat`, `db-shoulder-press`, `romanian-deadlift`, `step-up`, `side-plank-knees` (new workout ids, no new exercises; clips missing for `one-arm-db-row` and `step-up`).
- **Walking is not plannable on its own.** An "Easy walk" item would fit better. Step tracking does not exist and would need `compliance`.
- **Missing exercises:** none essential.

## Top 3 decisions for Benn

1. **A fourth Tali plan, "Strong and steady"** (12 weeks: 2 Ease in, 5 Build, 1 Lighter, 4 Build, then 2-day maintenance), reusing Full body A, B and C, rather than stretching Full body system.
2. **Neutral in the app, specific outside it:** the plan, its id and its copy never name a medicine. Speaking to people coming off GLP-1 medicines is for marketing and the website, with the same no-claims rule (no regain prevention, no dosing).
3. **Home version and walks:** approve a home sibling (two new workouts from existing exercises) and a plannable "Easy walk", and prioritise the four missing clips.
