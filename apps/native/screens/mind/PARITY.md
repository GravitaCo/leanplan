# Mind parity checklist (N9)

The web app is the spec: `src/screens/MindScreen.tsx` and `src/screens/mind/` (10 files), with its
e2e cases in `scripts/e2e-wellbeing.cjs` (wp6, wp11, wp12, wp13, wp15 support side,
closeout-design-reset). Every item below must match the web for the same seeded data. Logic and
words are shared (`src/screens/mind/*.ts`, `src/core`), so most items check wiring and layout, not
values. Status: **logic** = covered by `npm run test:mind` (view models); **e2e** = covered by
`scripts/e2e-mind-parity.cjs` (native rendered for the web against the web build); **phone** =
needs a check on a real phone (VoiceOver, haptics, keyboard, Dynamic Type).

"Every state" means: light and dark; gentle mode on and off (Mind has no numbers, so gentle mode
must change nothing here); wellbeing Yes and Sometimes routing (no change on Mind); offline; flags
on and off as on web (`WELLBEING_ENABLED`, `MIND_REVIEWED`); small (375) and large (430) phones;
Dynamic Type at the largest size.

## 1. Mind page (B5, tab root)

| # | Check | Web source | Status |
|---|---|---|---|
| 1.1 | Eyebrow "Thursday 8 October" (`mindEyebrow`), title "Mind", Profile avatar beside it, no Back | MindPage, wp6-mind | logic, e2e |
| 1.2 | Before a check-in: "How are you today?", "Mood, sleep, stress and energy · 20 seconds", ink "Check in" | wp6-mind-empty | logic, e2e |
| 1.3 | After: Mood, Sleep, Stress, Energy pairs only (no hunger or soreness), 2 by 2, gray "Update" | wp6-mind | logic, e2e |
| 1.4 | Check in / Update open N4's check-in sheet on today (moves the selected day first); with health declined they open Profile › Health. Until N4's sheet merges, an internal-only "not here yet" alert: must be replaced (the `renderCheckin` slot) before any TestFlight or external build (mental-performance) | MindPage openCheckin | logic; sheet when N4 lands |
| 1.5 | "Need support now?" directly under the Today card, above the fold at 390×844, never red or tinted | wp6-mind | e2e |
| 1.6 | Skills (MIND_REVIEWED on only): Reset, Wind down, Unload, Get outside, with icon squares in their pillar fill and ink, subs wrapping | wp6-mind-reviewed | logic, e2e |
| 1.7 | MIND_REVIEWED off: no Skills section | wp6-mind | logic, e2e (EXPO_PUBLIC_MIND_REVIEWED=0 build) |
| 1.8 | "Your week" (section 5) | wp11-* | logic, e2e |
| 1.9 | "If–then plans" row with "On Plan" on the right; opens Plan | wp6-mind | e2e |
| 1.10 | Wellness line at the foot, centred: "For everyday wellbeing. Not a treatment for any condition." | wp6-mind | e2e |
| 1.11 | A one-thing chip with a skill (openMind) arrives on that skill's screen, only with MIND_REVIEWED on | MindPage effect | logic |
| 1.12 | Mind pillar off in Profile: the tab is faded and can't be opened (shell) | TabBar | shell |

## 2. Support sheet (B6 frame 1)

| # | Check | Web source | Status |
|---|---|---|---|
| 2.1 | Title "Support and helplines", Done on the right, nothing on the left; lead line | SupportSheet | logic, e2e |
| 2.2 | No nation: "Showing services for the whole UK", "Choose"; rows Samaritans, Shout, Your GP, Beat, Emergency services; no 111 anywhere; footnote "Choose your nation above…" | wp6-mind | logic, e2e |
| 2.3 | England: Samaritans, Shout, NHS 111 option 2, NHS 111, Beat, Emergency services; "Change"; no footnote | wp6-mind | logic, e2e |
| 2.4 | Scotland: Samaritans, Shout, NHS 24 (111) mental health option, NHS 24 (111), Beat, Emergency services | wp6-mind | logic, e2e |
| 2.5 | Wales: same shape as England with Wales's routes and Beat's Wales number | supportRows | logic, e2e |
| 2.6 | Northern Ireland: Samaritans, Shout, Lifeline (calls 0808 808 8000), Your GP with the out-of-hours words, Beat, Emergency services; no 111 | wp6-mind | logic, e2e |
| 2.7 | Shout opens a text (`sms:85258?&body=SHOUT`) and its words say "Text SHOUT to 85258"; others call (`tel:`); a row with a web link keeps the number as its own target | SupportRows | logic; phone (dialler, Messages on iOS and Android: some Android Messages apps don't pre-fill the body, which the words cover) |
| 2.8 | The GP row has no number on the right | wp6-mind | logic, e2e |
| 2.9 | Accessibility labels equal the web's aria labels: "Samaritans: call 116 123", "Shout: text 85258" | SupportRows | logic, phone (VoiceOver) |
| 2.10 | Not-a-crisis line and the private foot, verbatim, last | wp6-mind | logic, e2e |
| 2.11 | Opening, picking a nation and closing write nothing, count nothing, send nothing (the nation is forgotten on close) | wp6-mind, wp15-signpost | e2e (state and request diff) |
| 2.12 | Opens from: the Mind page, Reset, Wind down, Get outside, Unload (link and row, over the Unload sheet), Summary's low-mood banner (N4) | all screens | e2e for Mind; N4 for the banner |

## 3. Reset (B7, P6 Glow pacer)

| # | Check | Web source | Status |
|---|---|---|---|
| 3.1 | Pushed card screen: Back "Mind" (or "Wind down" from its routine), title, avatar; no tab bar while open, back on return | closeout-design-reset | logic, e2e |
| 3.2 | Ready: sub-line, 1/2/5 min with 2 picked, how-to, sphere at rest (scale 0.8), Start; no count or time | wp12-reset | logic, e2e |
| 3.3 | Running: intro hidden; count 112/200 tabular in --label, word 17/500 in --mind-ink; "m:ss left"; Stop (gray). Screen readers hear the word only (web: word `aria-live="polite"`, count `aria-hidden`): `accessibilityLiveRegion="polite"` on Android, an announcement or live label for the word on iOS, the count hidden | wp12-reset | logic, e2e, phone (VoiceOver, TalkBack) |
| 3.4 | Words Breathe in → And in again → Breathe out; counts start at 1 and go up within each phase; timings from `RESET_PATTERN` only | wp12-reset | logic, e2e |
| 3.5 | Sphere grows on the breath in, more on the second, settles on the breath out; rings spread and thin (shared `glow.ts` keyframes), on the UI thread | Pacer | logic (ease equals pacerAt), phone (smoothness) |
| 3.6 | Reduce Motion: B7.10 line above the card; sphere and rings hold the middle frame (0.9, `pacerGlow`) and pacer segments are ignored; words and count still step; follows a change while open (`useReduceMotion`: AccessibilityInfo's reduceMotionChanged, not Reanimated's launch-time value); switched off mid-run, the sphere moves at once from the current breath (`segmentNow`) | wp12-reset-reduced | logic, e2e, phone |
| 3.7 | Stop early: B7.15 only, never a time done; nothing logged | wp12-reset | logic, e2e |
| 3.8 | Finish: "That's 1 minute." (straight apostrophe) and B7.15; logged once (`logSkill`); today's thing ticked only when it's a Reset thing; check-in answers untouched. Stop in the run's last second never logs: `onPacerDone` finishes only a run still running (the screen keeps the stage in a ref, set before Stop dispatches) and reads the store at that moment | wp12-reset-finish | logic, e2e |
| 3.9 | Picking a length after a run goes back to ready | ResetScreen | logic |
| 3.10 | Safety lines, support row and wellness line at the foot in every stage; the wellness line clears the bottom | closeout-design-reset | e2e |
| 3.11 | Done and Back return to where Reset was opened from | ResetScreen | logic |
| 3.12 | App backgrounded mid-run: the clock reads elapsed time, so the count is right on return (web: same) | Pacer | phone |

## 4. Unload (B8)

| # | Check | Web source | Status |
|---|---|---|---|
| 4.1 | Tall sheet, Cancel and Done; Done off while empty; one pair to start | wp13-unload | logic, e2e |
| 4.2 | "Add another" adds a pair until the cap; next-step-only and "went OK"-only notes are enough | wp13-unload | logic, e2e |
| 4.3 | "One thing that went OK today" starts closed (expanded state reported), opens a field that takes focus | wp13-unload | logic, e2e, phone (keyboard) |
| 4.4 | Device-only foot, "Tilo doesn't read your notes…" with "support is here" opening Support over the sheet, crisis line, support row | wp13-unload | e2e |
| 4.5 | Done saves on this device only, logs the skill (id and time, never text), toast "Saved on this device" (N1 toast) | wp13-unload | e2e |
| 4.6 | Note text never in any request and only under `deviceOnly`; reaches notes only through `unloadNotes.ts` (import graph checked in `npm test`) | wp13-unload, data-device | npm test, e2e |
| 4.7 | Earlier notes: no count on the row; newest first; "Tuesday 6 October"; thought ". Next step: …"; Delete per note (label "Delete, Tuesday 6 October"); row goes with the last note | wp13-unload-earlier | logic, e2e |
| 4.8 | Back from Earlier notes swaps in place (no slide) | wp13-unload-earlier | logic |
| 4.9 | Offline and signed in: still saves; nothing sent on reconnect | wp13-unload-offline | e2e |
| 4.10 | Signed out, owner question pending, no owner or health off: Done stays off with no message | unloadBlocked | npm test |
| 4.11 | Opens over the Mind page and over Wind down (Back returns there) | MindPage | logic |

## 5. Your week (B4, B5.16)

| # | Check | Web source | Status |
|---|---|---|---|
| 5.1 | Held back in the first two weeks and on a low-mood signpost day; hidden with Mind off | wp11-reflection-held | logic (shared reflectionFor), e2e |
| 5.2 | State A: "5–11 Oct", "4 check-ins this week", "Not enough answers yet", no band strip, no observation, the later line, no Skills/Plans/Food/Weight lines, never "of 7" | wp11-reflection-a | logic, e2e |
| 5.3 | State B: "Mostly 6 to 7 hours" with 5 segments, the 6–7 one in --band (never a pillar colour), "Reset twice, Unload once", "1 plan reviewed", the observation (heading, line, sub), no later line | wp11-reflection-b | logic, e2e |
| 5.4 | Food off: no "See your whole week" | wp11-reflection-food-off | logic, e2e |
| 5.5 | "See your whole week" opens Summary on today (scroll to This week is N4's) | wp11-reflection-a | e2e (tab), N4 |
| 5.6 | Span across a month end: "28 Sept – 4 Oct" | reflectionSpan | npm test |

## 6. Wind down (B12)

| # | Check | Web source | Status |
|---|---|---|---|
| 6.1 | Pushed card screen, Back "Mind", no tab bar; sub-line; "Your routine" with "From 22:30" only when a valid time is set | WindDownScreen | logic, e2e |
| 6.2 | Default routine until changed; Unload and Reset rows open their screens (chevron), others don't | WindDownScreen | logic, e2e |
| 6.3 | "Change your routine" opens the sheet; with health declined it opens Profile › Health | WindDownScreen | logic |
| 6.4 | Sheet: toggle per ready step, Cancel leaves it, Done saves keys only and only when changed; time line or "Set a wind-down time" (Profile › Notifications) | RoutineSheet | logic, e2e |
| 6.5 | "Do as much…" and GP lines, support row, wellness line | WindDownScreen | e2e |

## 7. Get outside (B13)

| # | Check | Web source | Status |
|---|---|---|---|
| 7.1 | Pushed card screen in move tokens, Back "Mind", no tab bar; lead card with the sun square | OutsideScreen | e2e |
| 7.2 | "If you'd like a walk": Easy walk, "10–20 min", Start opens Train today with the Easy walk log sheet; this screen logs nothing | OutsideScreen | e2e (tab and store), N7 for the sheet |
| 7.3 | Walk foot, support row, wellness line | OutsideScreen | e2e |

## 8. Across the tab

- Light and dark from the device, tokens only (mind, move, band, sep, fill); never --red, never --tint
  for a pillar. Screenshots side by side in both schemes for `design`.
- Android back pops the newest view (sheet or screen) before leaving the tab. (phone)
- Dynamic Type at the largest size: rows grow, nothing truncates mid-word on the Mind page, Support
  rows wrap. (phone)
- 44 pt targets: Choose/Change, Delete, "support is here", "See your whole week", the pill buttons.
- No haptics (not on an approved board).
- Native differences from the web, if any appear, go to the lead as proposals; none planned
  (plan §4 N9: "Improvements: none planned").

## Dependencies

N1 (`lib/ui`: Sheet, Seg, Toggle, list rows, icons incl. wind, moon, pen, sun, cup, bulb, mat, leaf,
sliders, plus, check, chevrons; toast; Geist 200 for the pacer count), N4 (check-in sheet, Summary
scroll to This week, low-mood banner), N7 (Train's Easy walk log sheet), N10 (Profile › Health and
Notifications).
