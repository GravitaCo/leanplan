# Clinical review: hard-week and care-week thresholds (weekly review)

Prepared 23 Oct 2026 for an independent clinical reviewer. Status: **awaiting a reviewer**. Nothing
here has been reviewed by a clinician yet. The thresholds were set by Tali's `mental-performance`
specialist from the research in `docs/research/maintenance-psychology-2026-10.md` (8 Oct 2026) and
are live in the weekly review today.

## Who should review it

Someone qualified to judge disordered-eating and low-mood risk in a self-guided wellness app: for
example a registered dietitian with eating-disorder experience, or a clinical or counselling
psychologist. Tali offers general wellness guidance, never medical advice or therapy, so the
question is whether these rules are safe and sensible for that frame, not whether they diagnose.

## What the reviewer is looking at

Once a week Tali shows a review of the past week across mind, food, movement and body. The person
may answer an optional daily check-in. Its answers are the only inputs to the rules below.

| Check-in question | Answers (stored as 1 to 5 or 1 to 3) |
| --- | --- |
| Mood | Rough, Low, Okay, Good, Great |
| Hunger | Starving, Hungry, Satisfied, Full, Stuffed |
| Sleep | Poor, OK, Good |
| Stress | Low, Some, High |

A **low day** is a day with mood Rough or Low, or with two or more low signals (poor sleep, high
stress, low energy, very sore) against the person's own recent answers.

### Hard week

A week is hard when it has **at least 3 check-ins** and any of:

- poor sleep on 3 or more days,
- high stress on 3 or more days,
- 2 or more low days.

### Care week

A week is a care week when:

- mood is Rough or Low on **4 or more** days, or
- hunger is Starving on **3 or more** days (read as a possible restriction signal).

A care week has no minimum number of check-ins.

### What changes in a hard or care week

- The review leads with mind options (an earlier night, a planned meal for hungry days, a rest day)
  and shows encouragement written for a hard week.
- **No "eat less" or lower calorie range is offered.** In the rest of the review, eating less can
  only ever be suggested after a sustained weight drift, never below the calorie floors, and never
  for people who flagged food and weight worries, are pregnant, are under 18 or ticked the medical
  question.
- No pattern lines (for example "on 4 of your 6 short-sleep days you were hungrier").
- A care week also hides weight and the follow-up sheets.
- The weekly review reminder is skipped after a hard or care week.
- **There is no support pointer in a care week yet.** Separately, Tali already shows a support
  sheet (NHS 111, Samaritans, Beat) when most mood answers over 14 days are Low or Rough, at most
  once a month.

The code is in `src/core/domain/weekPicture.ts` (`mindContext`), `src/core/domain/maintenanceLoop.ts`
(`careWeek`, `allowLess`) and `src/core/domain/loopThresholds.ts` (`mind`).

## Questions for the reviewer

1. Are 3 poor-sleep days, 3 high-stress days or 2 low days in a week reasonable points to stop
   suggesting eating less and lead with rest instead? Too sensitive, or not sensitive enough?
2. Is "at least 3 check-ins" the right minimum before a week can count as hard?
3. Is mood Rough or Low on 4 of 7 days the right point for the care version?
4. Is Starving on 3 or more days a sensible restriction signal, or should it combine with other
   answers (for example fewer foods logged)?
5. Should a care week show a quiet support pointer (NHS 111, Samaritans, Beat), as the research
   proposed? Should it also offer to pause the reminder or offer gentle mode?
6. Is there wording in the hard-week encouragement or options (`src/core/domain/loopCopy.ts`) that
   could land badly for someone struggling?
7. Anything missing: a signal we should watch that isn't here, or a rule that could harm.

## How to record the outcome

Add the reviewer's role (not necessarily their name), the date and their answers to this file,
change any thresholds in `loopThresholds.ts` (and `careWeek` for the care-week counts) with the
tests in `scripts/test-loop.ts`, and update the comment that says "pending clinical review".
