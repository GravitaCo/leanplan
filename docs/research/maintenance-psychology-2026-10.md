# Maintenance loop: psychology and safety

Author: `mental-performance` agent, 5 Oct 2026, for the maintenance loop
(`docs/plans/maintenance-loop.md`). Labels: **[E]** evidence, **[I]** inference, **[G]** guess to test.

## Benn's question: will flat or worse weeks make people quit?

Yes, it is a real dropout risk, and the evidence converges on it (mostly correlational): people
avoid feedback they expect to be bad (the "ostrich problem"), gaps in self-weighing go with weight
gain, and small early losses predict programme dropout **[E]**. No trial tests whether careful
framing of a weekly review keeps people in an app **[I don't know]**. The strongest lever is to
redefine success: for a maintain user a steady week *is* the goal, change is judged against a
band over several weeks, and the review leads with what the person did, not the scale **[I]**.

## Rules for design and engineering

1. **Steady is success.** For `maintain`, compare weight to a steady band using 2 to 4 week
   averages, never a 0.1 kg week-on-week delta (`weightWeekDelta()` stays internal, not the
   maintain headline). Inside the band reads "steady". Band width: `nutrition-accuracy`.
2. **Review order: what you did, then context, then outcome.** Actions first (days logged,
   sessions, plans used), then sleep, stress and routine, body last and only if opted in. A weight
   or intake line never appears without its mind context.
3. **Weight in the review is opt-in.** Asked once when someone picks Maintain, two equal choices,
   nothing pre-selected: "Show my weight trend in my weekly look back" / "Keep weight out of it".
   Skipped = out. Never in gentle mode or when wellbeing is flagged. Shown in words against the
   band, chart one tap away, changeable in Profile.
4. **A missed week is never "missed".** "Welcome back", fresh week, no catch-up, no streaks, no
   weight comparison across the gap on the first review back.
5. **Push reminder is offered, not on by default.** Offered at the end of the first completed
   review; once a week at the person's chosen day and time; generic lock-screen text with no data
   (3 to 4 rotating wordings); after 2 unopened go fortnightly, after 4 stop and ask once in the
   app; never in a week a safety signal fired; never promotional.
6. **Pattern lines (v1).** A small fixed set of pairs (sleep to hunger, stress to hunger, sleep to
   energy, energy to sessions, if-then plan used to hungry days); none ending in weight or kcal.
   Nothing before 3 weeks and 5 days on each side; the pattern must hold in two separate windows
   before it first shows; at most one per review; worded as frequency ("on 4 of your 6 short-sleep
   days..."), never "because", "caused", "made you", "trigger", "binge"; ends with an optional
   offer. Suppressed in gentle mode, wellbeing flagged, or distress weeks (the data still informs
   which suggestions are offered).
7. **Suggestions from every pillar.** "Keep as is" first and equal. After short-sleep or
   high-stress weeks, mind options lead. No "eat less" or lower-target option when wellbeing is
   flagged, in pregnancy, or when most check-ins that week were short sleep or high stress.
8. **Two safety tiers.** *Concern* switches the review to a care version: no numbers, no
   adjust-down option, gentle mode offered, a quiet support pointer. *Risk language* opens the
   support sheet (`src/core/data/signposts.ts`) at once, no coaching, offer to pause reminders.
   Thresholds and scripts need clinical review before shipping.

## Key evidence

- Ostrich problem (Webb, Chang & Benn 2013); weighing gaps and gain (Helander et al., PLoS One
  2014, n = 40, observational); NWCR maintainers who weigh less regain more (Butryn 2007, Thomas
  2014); dropout predictors (Moroshko et al., Obesity Reviews 2011); app abandonment about 70% by
  100 days, incl. "perceived ineffectiveness" and annoying notifications (Kidman et al., JMIR 2024).
- Over a third of feedback interventions worsened performance, especially self-focused feedback
  (Kluger & DeNisi 1996), but monitoring progress helps (Harkin et al. 2016): framing is the issue.
- Abstinence violation / rigid control and disinhibition (Polivy & Herman 1985; Westenhoefer 1999).
  Lapses and restarts are normal (Epstein et al. 2015, 2016; Lally et al. 2010).
- Weight moves about 0.35% within a week, weekends higher (Turicchi et al., PLoS One 2020).
- Self-weighing: STOP Regain benefit with coaching (Wing et al., NEJM 2006); meta-analysis shows
  no overall link with mood or disordered eating but a small negative link with self-esteem
  (Benn et al., HPR 2016); harm concentrated in young women; 73% of MFP users with an eating
  disorder felt it contributed (Levinson et al. 2017).
- After GLP-1: substantial regain in trials (STEP 1 extension, SURMOUNT-4, West et al. BMJ 2026);
  smaller and variable in real-world data (Epic Research 2025); "food noise" central in patient
  interviews (De Vere Hunt et al., JAMA Netw Open 2026); 10.1% GLP-1 misuse among people with
  eating disorders (Peiper et al., JAMA Psychiatry 2026).
- Self-compassion improved eating behaviour in 15 of 18 studies (Brenton-Peters et al. 2021);
  short sleep adds about 385 kcal a day (Al Khatib et al., EJCN 2017); NICE NG246 (2025)
  non-stigmatising language.
- Push: +3.9% next-day engagement (Bidargaddi et al., JMIR mHealth 2018); effect fades
  (Klasnja et al. 2019); reminders can block habit formation (Stawarz et al., CHI 2015).
- PECR (for `compliance` to confirm): push is "electronic mail"; a neutral service message the
  user switched on is not marketing, any promotion makes it marketing. Storing the review day and
  time server-side is new data (privacy policy, register, `USER_TABLES` if a new table). iOS PWA
  push needs the app on the Home Screen.

## Example copy (numbers hidden in gentle mode, nothing on the lock screen)

- Flat week: "A steady week. When you're keeping things where you want them, steady is the goal."
- Flat week: "Your weight trend stayed in your steady range. You logged on 5 days and fitted in 2 sessions."
- Small regain after a hard week: "A full-on week: more short nights and more stress than usual.
  Your trend is a little above your steady range, which is common in weeks like this."
- Then: "Nothing to fix tonight. For next week, keep things as they are, try an earlier night, or
  set up a plan for hungry days. Your call."
- Missed week: "Welcome back. Nothing to catch up on. Here's this week, from today."
- Good week: "Your hungry-days plan worked twice this week. Noticing what helped makes it easier to do again."
- Push: "Your week in Tali is ready when you are." / "A two-minute look back at your week, whenever suits."
- Pattern line: "On 4 of your 6 short-sleep days, you felt hungrier. Want a plan for days like that?"

**Never say:** missed, failed, slip, cheat, back on track, undo, damage, earn, burn it off, streak,
should, need to, willpower, "you gained X.X kg", "don't lose your progress", "you haven't checked
in". No red or amber, no exclamation marks on hard weeks, no drug names in reminders.

## Open questions

1. Band width and averaging window: `nutrition-accuracy`.
2. "Rather not say" on wellbeing: offer weight in the review with the choice pre-set to off? [G]
3. Benn chose push reminders; recommendation is to offer after the first review, not switch on.
4. Clinical review of safety thresholds and risk-language detection.
5. A "food thoughts: quiet, some, loud" check-in item? Wording and scope to decide.
6. Measuring success without new analytics: use the concierge pilot; key metric is the 4 and 8
   week retention gap between "above band" and "steady" weeks (aim to shrink it), plus reviews
   completed, reminder opt-outs, gentle-mode switches and safety-signal rate.
7. Whether mind-to-weight or mind-to-kcal pattern lines are ever safe: unknown; revisit with pilot data.

Not verified in this pass: full texts of Kluger, Webb, Butryn, Thomas, Teixeira, Adams & Leary;
the exact HeartSteps decay rate; the primary ICO page (a law-firm summary was read).
