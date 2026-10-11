# After weight-loss medication: psychology, safety and wording

`mental-performance`, 11 Oct 2026. Proposal only. Labels: **[E]** evidence, **[I]** inference, **[U]** unknown.

**Scope.** General guidance on keeping habits steady after a big change. Never advice on stopping, tapering or restarting a medicine, and never targeted at people *because* of one (wellbeing plan §8.1).

## 1. What this moment is like

- **Food noise comes back.** Quieter food thoughts are central to how people describe these medicines [E: De Vere Hunt et al., JAMA Netw Open 2026]. How fast it returns after stopping is **[U]**: no primary time-course data found. Copy must not promise a timeline.
- **Regain is the expected average, not a personal failure.** About 0.8 kg a month, near baseline by about 1.5 years, and in that review support after stopping did not slow it [E: West et al., BMJ 2026; SURMOUNT-4; STEP 1 extension]. Real-world regain looks smaller and more varied [E, weaker: Epic Research 2025]. Fear of regain is realistic; Tali can't honestly promise to prevent it.
- **Identity and competence.** People may feel "the drug did it, not me". Under self-determination theory, low perceived competence predicts poor maintenance [E: Teixeira et al., BMC Med 2015]. Whether attributing loss to the drug lowers self-efficacy is **[I/U]**. Competence is the lever: show people the skills they are already using.
- **Shame and stigma.** Internalised weight bias predicts poorer maintenance [E, mixed: Olson et al., Obesity 2018, men only; Puhl & Quinn 2017, cross-sectional]. Public "jab" talk adds "cheating" stigma **[I]**.
- **Disordered eating risk.** 10.1% of people with eating disorders report misusing GLP-1s [E: Peiper et al., JAMA Psychiatry 2026]. Binge symptoms are expected to return when the drug stops [I: NEDC Australia guidance, no trial data]. Fear of regain can push people towards tight restriction, compulsive exercise or unofficial supply **[I]**.
- **All-or-nothing thinking.** One "bad" day turns into "I've blown it" (abstinence violation) [E: Polivy & Herman 1985; Westenhoefer 1999]. Rigid control goes with more disinhibition, flexible control with less.

## 2. How Tali speaks to it

**Finding it without being asked.** Tali never asks about medication and stores only the goal (decision 4).
- The way in is the **Keep it steady** goal. Its explainer (ml-c2) gets one line: "Stepping down from a weight-loss medicine, finishing a programme or happy where you are? This is built for that."
- An optional **guide**, "Keeping it steady after a big change", sits under the goal and in the Plan library. Reading it saves nothing.
- **The plan's stored name and id must be neutral** (for example `steady-12`, "Steady start: 12 weeks"). A plan called "Coming off Mounjaro" turns a stored plan choice into medication data. Medicine names stay in the guide's text only, are never stored and never appear in notifications.
- **Marketing:** the ASA treats indirect promotion of weight-loss injections ("weight-loss jab", pen images) as a breach [E: ASA rulings, Dec 2025]. Tali promotes no medicine, but website or store copy naming Mounjaro or Ozempic goes past `compliance` first. Safest: "after weight-loss medication", no brands, no pens.

**First weeks (guide copy options).**
- "Your appetite may feel louder for a while. That's your body adjusting. It says nothing about you." *(no timeline)*
- "Most people regain some weight after stopping. Tali can't prevent that. It helps you keep the habits that make the biggest difference: protein at meals, strength training and enough sleep."
- "Hungry days will come. A plan for them works better than trying to hold out."
- "If anything about stopping, tapering or restarting your medicine is on your mind, your GP or prescriber is the person to ask."
- Week 1 to 4 review opener: "A steady start: 2 strength sessions, and protein in your range on 4 days."

**Framing a regain trend** (opted-in weight only, never in gentle mode). Lead with what the person did, then mind context, then body (existing rule).
- Drift: "Your trend has moved above your steady range. After a big change that's common, and spotting it early is the point of the range. Nothing to fix tonight. Options for next week:"
- After a hard week: "More short nights and stress than usual lately. Your trend is a little above your range, which often happens in weeks like this."
- "Make this my new starting point" stays, as a valid choice, not giving up.

**Avoid:** off the jab, quit, cheating, jab or pen imagery, rebound, "lose the weight again", "protect your results", "don't undo", willpower, discipline, slip, back on track, earned, damage, and every word on the existing never-say list. No body talk, and no drug names in pushes or on lock screens.

## 3. Safety

Existing routing outranks everything; no new detection.
- **Wellbeing Yes** (flagged): the guide opens in gentle form with no weight, calories, drift or protein numbers. It covers hungry-days plans, sleep, strength and support only.
- **Sometimes / Rather not say:** normal guide, weight off by default, support line visible.
- **Care version** (existing): any concern signal hides numbers and adjust-down options.
- **Support sheet** from every guide screen ("Need support now?"), with Beat first in this context. Re-verify numbers at launch.
- **Never** suggest eating less in the first 4 weeks of Keep it steady, after a hard week, or with the medical flag. Never frame exercise as compensation, and keep the `load.ts` guardrail.
- **GP or prescriber lines belong** in four places. 1) The guide's first screen. 2) The medical-flag outcome (currently on a GLP-1, insulin or sulfonylureas, kidney disease). 3) A static guide line, not detection: "If eating feels out of control or food thoughts are distressing, talk to your GP. Beat can help too." 4) The low-mood signpost (existing). Never repeated on every review.
- **Tali never** comments on medication choices, restarting, dose, microdosing or supply. A free-text or AI path must deflect: "That's one for your prescriber."
- Clinician review of the guide copy is a launch gate (as for skills, wellbeing plan §12.5).

## 4. Habits and plans

**If-then plans to offer** (person picks, never pre-set):
- "When I feel hungry between meals, I'll have a protein snack I like and check back in 20 minutes." *(nutrition-accuracy to confirm the snack wording)*
- "When I've had a short night, I'll plan my meals at breakfast."
- "When food thoughts get loud, I'll do a 2-minute Reset or get outside for 10 minutes."
- "When I have a day that didn't go to plan, I'll start again at the next meal." *(directly targets all-or-nothing)*

Follow-up happens in the weekly review (`plansDue`), which is the active ingredient [E: Gollwitzer & Sheeran 2006].

**Check-in signals:** hunger, sleep and stress already exist and feed the approved pattern lines (sleep→hunger, stress→hunger). Short sleep adds about 385 kcal a day [E: Al Khatib 2017] and sleep extension cut intake [E: Tasali 2022], so sleep is the first lever on hungry weeks.
- The open question of an optional **"Food thoughts: quiet / some / loud"** item fits this moment best. It must be optional, appear in no pattern line ending in weight, and be hidden for wellbeing Yes. Its usefulness is **[U]**: pilot it.
- **Measure:** 8 and 12 week retention for Keep it steady users, if-then plans used, the share choosing "new starting point" against drop-out after a drift, and the safety-signal rate. Whether app guidance changes post-medication regain is **[U]** (West 2026 found support didn't), so success is retention and habits, not the scale.

## Top 3 decisions for Benn

1. **Neutral naming:** a stored plan and goal never name a medicine ("Steady start: 12 weeks"). Medicine names live only in the guide's text, and no brand names appear in marketing until `compliance` clears the ASA question.
2. **Honest promise:** the guide says plainly that most people regain some weight and that Tali supports habits, not a result. A drift is framed as the early signal working, with "new starting point" offered as a valid choice.
3. **Launch gates:** no eat-less suggestion in the first 4 weeks, the gentle guide for wellbeing Yes, Beat first on the support sheet, and clinician review of the guide copy before public launch.
