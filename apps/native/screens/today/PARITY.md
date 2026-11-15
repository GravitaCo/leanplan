# Today (N4): parity checklist

Native must match the web (`src/screens/TodayScreen.tsx`, `today/`, `body/WeightSheet.tsx`,
`review/WeeklyReview.tsx`, the re-asks in `profile/HealthAnswers.tsx`). Each row says how it is
checked. **Auto** means `scripts/e2e-today-parity.cjs` opens the same seed in both apps, runs the
same taps, holds the web e2e script's rule on each and compares the words and figures (light and
dark unless marked light). **Code** means read against the web source only. **Device** means it
still needs a pass on a real phone.

Run: see the script's header. `ONLY=<prefix>` runs a subset; the `ob*` scenarios need builds with
ONBOARDING_ENABLED (`WEB_OB_URL`, `NATIVE_OB_URL`).

## Summary

| State | Web source | Check |
|---|---|---|
| Header, week strip, eyebrow | TodayScreen | Auto (`e2e-summary-parity.cjs`); the connection pill is the shell's |
| Mind card, flag on: before the check-in, "Check in" | MindCard | Auto `wp7-before-checkin` |
| Mind card: feeling, checked in at, lighter line on a hard day | MindCard | Auto `wp7-hard-day` |
| The one thing: chips, picked, Change, Done, Make it a plan | MindCard | Auto `wp7-hard-day`, `wp14-ordinary` |
| The one thing, gentle mode | MindCard | Auto `wp14-gentle` (light) |
| Mind check-in row, flag off | TodayScreen | Code (flag on in every build) |
| Low-mood signpost: shows, the only ask, dismiss stays down | LowMoodBanner | Auto `wp15-signpost` |
| Signpost: within 30 days, Mind off | LowMoodBanner | Auto `wp15-signpost-29-days`, `-mind-off` (light) |
| Weekly review card; held on a hard day | TodayScreen | Auto `loop-summary`, `closeout-review-*` |
| Keep the weekly reminder? | TodayScreen | Auto `loop-keep-reminder`; never in a care week: `loop-care-week` |
| Welcome back banner | TodayScreen | Auto `sum-welcome-back` (light) |
| Activity suggestion, range note banners | TodayScreen | Code |
| Plans banner, held on a hard day | TodayScreen | Auto `wp7-ordinary`, `wp7-hard-day` |
| Food card: numbers, gentle, Yes and Sometimes in words | TodayScreen | Auto `e2e-summary-parity`, `ob9-2-*` |
| Worth a quick check | TodayScreen | Auto `sum-quick-check` |
| Usuals; Same as yesterday on a hard day (adds 306 kcal) | TodayScreen | Auto `wp7-hard-day`, `wp7-gentle` |
| Move card and tile, lighter choices | TodayScreen | Auto `wp7-hard-day` |
| Weight tile: number, words, hard day, never asked | TodayScreen | Auto `loop-summary`, `wp7-hard-day`, `loop-weight-ask` |
| Supplements: tick counts | TodayScreen | Auto `sum-supplements` (light) |
| Pillars off (food; mind and move) | TodayScreen | Auto `wp7-food-off`, `wp7-mind-move-off` (light) |
| This week card | TodayScreen | Auto (every Summary scenario) |
| Asks budget, one sheet at a time | TodayScreen | Auto `ob-medical-then-food-ask`; the rest Code |

## Sheets

| Sheet | Check |
|---|---|
| Check-in, More about sleep, wake prefill, save | Auto `wp10-checkin-sheet` |
| Support from the low-mood banner and from the check-in's "support is here" (N9's sheet; over the check-in) | Auto `wp15-signpost`, `wp10-checkin-sheet` |
| Check-in scale buttons 44 pt tall at least, web and native (approved by Benn in this session, 13 Nov 2026; web commit 0835b5a) | Auto `wp10-scale-44` |
| Wake time | **Open:** a 24-hour text field until N1's TimePicker (the web's time field is iOS's own wheel, so the native picker is parity). Typed times read as the web's field holds them ("730" 07:30, "123" 01:23): `npm run test:today` |
| Weight sheet | Auto `weight-sheet` |
| Food asks (ob9-3, ob9-4) | Auto `ob9-3-day14`, `ob9-4-week4` |
| Pregnancy re-ask, Ask me later, No longer | Auto `ob7-3-pregnancy`, `ob7-4-no-longer` |
| Medical re-ask, then the food ask | Auto `ob-medical-then-food-ask` (light) |
| Weekly review: steady, gentle, hard, pattern, welcome back, lighter | Auto `loop-review-*` |
| Change one thing; gentle chips | Auto `loop-review-steady`, `-gentle`, `-hard` |
| Weight ask (ml-c4) | Auto `loop-weight-ask` |
| What follows Done (review day sheet) | Auto `loop-review-done` (light) |
| 4-week check, Keeping it steady, Your range from your logs | Code (no seed reaches them yet; their decisions are core's, tested in `npm test`) |
| Review day sheet: the reminder | Until N12's push (`pushSupported()` is false on a phone) the review never offers the sheet after Done and the reminder part is hidden, so no "no" is recorded unasked |

## Stand-ins (other streams)

| What | Owner | Now |
|---|---|---|
| Add food, Adjust entry, About this estimate | N5 | "Not in the native app yet" note |
| Plans banner sheet, Make it a plan, Your plan's Change it | N8 | Same note |
| If-then offer (ob5-4) | N8 | Not due on native until FirstPlanSheet lands (never shown or marked by a stand-in) |
| Setup card (ob2-0b) | N11 | Not rendered |
| Primitives (`ui.tsx`), toast host | N1, shell | Local stand-ins, swapped when N1 lands |

## Still to check on a device

Fonts and Intl output on Hermes ("1,840", "Sept"), the keyboard over the check-in note and the
weight field, VoiceOver labels, Dynamic Type at the largest size, Support opened over the check-in (a Modal inside a Modal).
