# Cycle v1: build spec

**Source of truth: the master Design canvas, page "Cycle v1 (draft for Benn)"** ([claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb](https://claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb), opens only for people the canvas is shared with). **Approved by Benn on 22 Nov 2026.** Build from the canvas and from this spec, which was extracted from it.

The PNGs in this folder are an **older 29 Oct draft**: they still say "Tali" and predate the 4 Nov changes (C1 row, B2 answers, G1/G2 "This is usual for me"). Do not build from them; they are kept only as a record.

- Plan: [`docs/plans/cycle.md`](../../plans/cycle.md)
- Copy below is verbatim from the canvas (light boards; each board also has a dark twin with identical copy). "UNKNOWN" marks anything the canvas does not state.
- Dashed "pend" tags on the canvas are design notes, not UI. They are summarised here as **Notes (not on screen)**.
- Sample data on boards (the name "Jo", weights, dates such as "Thursday 29 October" and "Tuesday 27 Oct") is illustrative.

## Overrides from Sara, 22 Nov 2026 (where a board predates them)

1. **B2 option** reads **"My periods often stop or skip"**, with no contraception example. (The canvas boards B2 and B3b already show this wording.)
2. After **"This is usual for me"** (G1, G2), the line "Got it. Tilo won't show this again unless things change. 'When to get help' is in Cycle settings." is **the app's existing toast** (with Undo), not a new component.
3. **No X / close button on the G1 and G2 cards.** The canvas boards still draw one, and their note says "The X closes the card for now and records nothing": both are superseded. Dismissal is only "This is usual for me" (or the card going away when its condition no longer holds).
4. **G1 keeps "If this is new for you…"** (the board copy: "You know what's usual for your periods. If this is new for you, bleeding that lasts more than a week is worth mentioning to a GP.").
5. **Profile › Privacy gets a "Cycle" row beside "Delete all cycle data"** that lets anyone **18+ with a health yes** turn Cycle on. **This is not on any board**: it comes from Sara's answer. Label, icon, value text and exact behaviour beyond "turn Cycle on" are UNKNOWN; per A1's note, turning it on from Profile goes A2, then B1, then B2, the same as the offer.

## Shared building blocks (all boards)

- Tokens only, from `src/styles/theme.css`: `--bg`, `--card`, `--elev` (cards inside sheets), `--sheet`, `--label/2/3`, `--sep`, `--fill/2/3`, `--tint`, `--tint-soft`, `--on-tint`, `--btn`/`--btn-ink`, `--red` (destructive), `--scrim`.
- Pillar: **--mind** (`--mind-ink`) is the only pillar colour used, for the check marks in A2 and the info icon in the safety banners. No status red or amber for eating or for the safety cards (neutral card).
- Primitives: `PageHeader`/`BackButton` (pushed pages, large title 32), `Sheet` (full) and `BareSheet` (short, `grab` handle, title 24, lead 16 grey), `Seg` (`.scale`, 5-up or 3-up), `.chip` (multi-select), `.list`/`.li` (inset grouped rows, `.act` rows in `--tint`), `.card`, `.lbl`, `.foot`, `.banner`, `.btn` (`big`, `sm`, `gray`, `danger`, `red`), link buttons (`.linkbtn`), the wizard option list (`.wz-opts`, as in onboarding), the consent layout (`ConsentScreen.tsx` pattern), `.ticks` cards, `BottomNav`.
- Offline-first: every screen works with no connection. The cycle log is **device-only** (not in `leanplan.v1`'s synced day log, never uploaded).

---

## A. Offer

### A1 Profile: the quiet row
- **Where:** Profile tab, tab bar shows Summary, Mind, Food, Train, Plan.
- **On screen:** Title "Profile". Profile row: "Jo", "Lose fat · 1,750–1,950 kcal a day", "jo@example.com". Groups: "You and your goal" (Body and goal "68.2 kg · Lose fat"; Daily targets "1,750–1,950 kcal"; Training "3 days a week"), **"Tracking"** (Supplements "1"; Diet "None"; Hand portions "palm 120 g"; Accuracy "Balanced"; Display "Standard"; **Your cycle "Off"**), "Weekly review" (Review day "Sunday"). Row icons exist on the board; the Your cycle icon is UNKNOWN (use the existing icon set).
- **New row:** "Your cycle", value "Off", chevron, the last row in Tracking. No banner, never a modal.
- **Behaviour:** tap opens A2 (when Off). After setup the value reads "On" and the row opens D1/D2. After "I don't have periods" the row disappears.
- **Notes (not on screen):** The offer (A2) shows only when the onboarding answer is Female. The row shows to anyone 18+ with health consent (not advertised) and always while Your cycle is on, except after "I don't have periods" (A3). Turning it on from here goes A2, then B1, then B2, the same as the offer.
- **Leads to:** A2.

### A2 The offer: what it is
- **Where:** pushed page from Profile › Your cycle (when Off). Back button reads "Profile".
- **Copy:**
  - Title: "Your cycle"
  - Lead: "Log your period and how it feels, if you'd like to. On a painful day, Tilo can offer a lighter session."
  - Card heading "What Tilo will do" (check marks, `--mind-ink`):
    - "Ask "Period today?" in your check-in around your period. If your periods are regular, Tilo uses the starts you've logged to bring the question back a few days early. Skip it whenever you like."
    - "Show which day of your period it is, counted from what you log."
    - "Offer a lighter session on a painful day, if you want one."
    - "Point you to the NHS or a GP if something is worth checking."
  - Card heading "What Tilo won't do" (dash marks, grey):
    - "Show you a date for your next period, or predict fertile days."
    - "Name phases, or tell you how you'll feel."
    - "Change your food targets."
    - "Put your log in a notification, or share it with anyone."
  - Footnote: "Off until you turn it on. Nothing is kept from this page."
  - Buttons: "Set it up" (primary ink pill, big); "Not now" (link, centred); "I don't have periods" (link, centred, muted grey).
- **Behaviour:** "Set it up" goes to B1. "Not now" returns to Profile with nothing kept (Off). "I don't have periods" closes the offer before any consent and keeps no reason (A3).
- **Leads to:** B1 (Set it up), A3 (I don't have periods), Profile (Not now).
- **Components:** `PageHeader`/`BackButton`, two `.ticks` cards.

### A3 "I don't have periods" closes it
- **Where:** short sheet over the A2 page (title "Your cycle" visible behind, scrim).
- **Copy:** Title "Got it". Body "Your cycle won't show in Profile any more. Tilo hasn't kept a reason." Button "Done". Footnote (centred): "Changed your mind? It's in Profile, then Privacy."
- **Behaviour:** "Done" closes the sheet and returns to Profile with the Your cycle row gone. Re-entry is the Privacy "Cycle" row (see D6 and override 5).
- **Notes (not on screen):** Synced: a plain "offer hidden" flag, no reason.
- **Components:** `BareSheet`, `.btn.big`.

---

## B. Setup

### B1 Cycle consent
- **Where:** after A2 "Set it up". Full-screen consent layout (same pattern as `ConsentScreen.tsx`), vertically centred, no back button drawn (UNKNOWN whether one is wanted).
- **Copy:**
  - Title: "Before you turn it on"
  - Sub: "What you log in Your cycle, like bleeding, period pain and symptoms, and your answer about your periods, is health information. It stays on this phone. It isn't synced to your account, sold, shared or used for ads."
  - Checkbox (unticked): "I agree to Tilo storing and using my period and symptom log, and my answer about my periods, on this phone to run Your cycle for me, as the privacy policy explains. This can show things about my sexual and reproductive health. I can turn it off any time in Profile, then Your cycle, and the log is deleted." ("privacy policy" is a link.)
  - Buttons: "Continue" (disabled until ticked); "Not now" (gray).
  - Footnote (centred): "Your account keeps only the fact that you agreed, and when, so there's a record you said yes."
- **Behaviour:** the box is never pre-ticked. "Continue" enables only when ticked and goes to B2. "Not now" leaves Cycle off.
- **Notes (not on screen):** A separate "cycle" consent, never pre-ticked; needs a current health yes. Wording: compliance OK, 20 Nov. Recorded through `src/data/consent.ts` (the account stores only that consent and its time).
- **Leads to:** B2.

### B2 The one question
- **Where:** wizard-style page after B1. Back button "Back".
- **Copy:** Eyebrow "Your cycle" (tint). Title "Which fits you best?" Lead "You can change this any time." Single-select list (selected row `--tint-soft` with a filled tint dot and check):
  1. "Periods, usually regular"
  2. "Irregular or unpredictable periods"
  3. "Periods changing with age (perimenopause)"
  4. "My periods often stop or skip"
  5. "I don't have periods"
  6. "Prefer not to say"
  - Button: "Continue" (primary, big). Board shows option 1 preselected as an example; whether any option is preselected in the build is UNKNOWN (do not pre-select if "Continue" should require a choice).
- **Behaviour:** "Continue" with options 1 to 4 or 6 goes to B3. Option 5 "I don't have periods" closes Your cycle (A3 "Got it" sheet, B3b). The answer is stored on the phone only and is changeable later (D1 "Which fits you best").
- **Components:** wizard option list (`.wz-opts`/`.wz-opt`/`.wz-dot`), `.btn.big`.
- **Leads to:** B3 (A3 for option 5).

### B3 Here's how it works
- **Where:** wizard-style page after B2. Back button "Back".
- **Copy:** Eyebrow "Your cycle". Title "Here's how it works".
  - Card: label "You chose", the chosen answer (board: "Periods, usually regular"), link "Change"; then the per-answer line from B3b (board shows: "Tilo counts the days of a period from what you log, never from a calendar. If you keep checking in and no period is logged for about 3 months, Tilo will ask if one came.").
  - Card heading "On this phone only"; paragraphs: "Your cycle log stays on this phone. It isn't synced to your account or backed up by Tilo, so if this phone is lost, wiped or replaced, the log goes with it unless you've exported a copy." and "Signing out keeps it on this phone. Choosing Remove from this device when you sign out deletes it."
  - Button: "Turn on Your cycle" (primary, big).
- **Behaviour:** "Change" returns to B2. "Turn on Your cycle" turns it on, the Profile row reads "On", and the user lands on the Cycle page (which one: D1 or D2 depending on a logged period; landing target is UNKNOWN on the board).
- **Leads to:** D2 or D1 (landing UNKNOWN), B2 (Change).

### B3b The line for each answer
- **Where:** reference board for the top card of B3. "Everything else on that screen is the same for every answer." Lead on the board: "The card at the top of "Here's how it works" (B3)."
- **Card text per answer** (each card has "You chose", the answer, "Change", then the line):
  - Periods, usually regular: "Tilo counts the days of a period from what you log, never from a calendar. If you keep checking in and no period is logged for about 3 months, Tilo will ask if one came."
  - Irregular or unpredictable periods: "Nothing here depends on a regular cycle. Log days as they come. If you keep checking in and no period is logged for about 6 months, Tilo will ask if one came."
  - Periods changing with age (perimenopause): "Periods can change a lot at this stage. Log what happens, when it happens. Tilo won't guess what comes next, and won't ask about gaps between periods."
  - My periods often stop or skip: "Bleeding can be lighter, come at odd times or stop for a while. Log what happens, if anything. Tilo won't ask about gaps, so if your periods stop and that's new for you, it's worth mentioning to a GP."
  - I don't have periods: no card with a line. Board text: "Closes Your cycle: no "how it works" screen. The "Got it" sheet (A3) shows instead."
  - Prefer not to say: "That's fine. Log what happens. If you keep checking in and no period is logged for about 3 months, Tilo will ask if one came."
- **Notes (not on screen):** Lines: compliance wording, approved by Sara 20 Nov. Long-gap ask (G4), Sara 20 Nov: about 3 months for regular and prefer not to say, about 6 months for irregular, never for perimenopause or stop or skip.

---

## C. Check-in

### C1 Check-in: one row
- **Where:** the existing Check-in sheet (Today/Mind), only with Your cycle on. Title "Check-in", "Cancel" left, "Done" right.
- **Existing fields (unchanged):** "How are you feeling?" (Rough, Low, Okay, Good, Great); "Sleep last night" (Poor, OK, Good); "Stress" (Low, Some, High); "Energy" (Low, OK, Good); "Hunger right now" (Starving, Hungry, Satisfied, Full, Stuffed).
- **New group:** label "Cycle", one `.list` row "Period today?" with a chevron. Placed after Hunger, before Note.
- **Then, unchanged:** label "Note", field placeholder "Anything worth remembering? Optional."; footnote "Tilo doesn't read your notes. If you're struggling, support is here." ("support is here" links to support); footnote "Answer what you like, and leave the rest. There's no right answer. Sleep and stress often show up in hunger and energy, so these help you spot patterns. On a tough day, Tilo asks for less and offers lighter options."
- **Behaviour:** tap on the row opens C2 (inline expansion). The row is optional and skippable.
- **Visibility rules (notes, not on screen):** shows during a logged period and for 3 days after it. A period ends at the first "Stopped", or after 2 days with no menstrual flow answer. A dry day mid-period does not end it: flow logged again within 2 days of "Stopped" carries on the same period, so "Day N" and the safety prompts are not reset. "Usually regular" with 2+ logged starts: hidden between periods, back from 7 days before their usual start until a period is logged (worked out on the phone, never shown as a date). No history yet, or any other answer: every check-in, as before. "Period started" is always on the Cycle page (D2).
- **Leads to:** C2.

### C2 Check-in: opened
- **Where:** same sheet as C1 with the Cycle row opened (the row stays, "Period today?").
- **Copy added below the row:**
  - "Menstrual flow": Stopped, Spotting, Light, Medium, Heavy (5-up Seg; board has Light selected)
  - "Pain": No pain, A bit, A lot (3-up Seg; board has A bit selected)
  - "Anything else?": chips Cramps, Bloating, Headache, Breast tenderness, Upset stomach (multi-select; board has Cramps selected)
  - Footnote: "Kept on this phone only. Skip anything."
- **Behaviour:** Seg selections are optional. Answers go to the device-only cycle store, never the day log. Safety cards (G1, G2) can appear inside this group on the day they first apply.
- **Components:** `Seg`, `.chip`.

---

## D. Your cycle page

Entry: Profile › Your cycle (when On). Pushed page, back button "Profile", title "Your cycle". Dark twins exist for every D board.

### D1 Your cycle: during a period
- **Copy:**
  - Card: "Day 2 of your period" (28, tabular numbers); "Counted from what you've logged."
  - Label "Recent days". List: "Today" / "Light · A bit of pain · Cramps"; "Yesterday" / "Medium · No pain"; action row (tint, with plus icon) "Add or change a past day".
  - Separate list row: "When to get help" (chevron).
  - Label "Settings". List: "Which fits you best" with value "Periods, usually regular" (chevron); action row (tint, icon) "Export my cycle log".
  - Footnote: "Your cycle log is only on this phone. Export a copy now and then. The file isn't encrypted, so keep it somewhere private."
  - Destructive button (red text, no fill): "Delete all cycle data".
- **Behaviour:** Today and Yesterday rows open D3 on that day. "Add or change a past day" opens D3 on the picked day. "When to get help" opens D4. "Which fits you best" reopens the B2 question (UNKNOWN whether as the wizard page or a sheet). "Export my cycle log" exports a file (format UNKNOWN beyond "isn't encrypted"). "Delete all cycle data" opens D5. G1/G2 cards sit at the top of this page when they apply.
- **Notes (not on screen):** "Period started" shows here between periods (D2).
- **Components:** `PageHeader`, `.card`, `.list`/`.li`, `.btn.danger`.

### D1g Gentle mode: no day number
- **Where:** D1 in gentle mode. Differs from D1 only in the top card; everything below is the same.
- **Copy:** Card: "Your period" (no number); "Started yesterday, going by what you've logged."
- **Notes (not on screen):** Gentle mode: no day number (plan 5.3); wording pending Benn and mental-performance. (Approval status of this wording on 22 Nov: UNKNOWN beyond the board's approval.)

### D2 Between periods: Period started
- **Copy:**
  - Card: "Nothing logged today"; "When a period starts, log the first day here or in your check-in."; button "Period started" (small primary pill).
  - Label "Recent days". List: plain row "Nothing logged in the last two weeks."; action row "Add or change a past day".
  - Then "When to get help"; "Settings" with "Which fits you best" value (board example: "Irregular or unpredictable periods") and "Export my cycle log"; same footnote and "Delete all cycle data" as D1.
- **Behaviour:** "Period started" opens D3 on today.
- **Notes (not on screen):** No forecast, no "days since", no last-period date.

### D3 Log a day (back-fill or edit)
- **Where:** `Sheet` over the Cycle page. Title "Log a day", "Cancel" left, "Done" right.
- **Copy:** Row "Day" with value (board: "Tuesday 27 Oct") and a chevron (date picker). Labels and controls as C2: "Menstrual flow" (Stopped, Spotting, Light, Medium, Heavy); "Pain" (No pain, A bit, A lot); "Anything else?" chips (Cramps, Bloating, Headache, Breast tenderness, Upset stomach). Button (red text): "Clear this day". Footnote: "Fill in a day you missed, or fix one. Skip anything."
- **Behaviour:** "Done" saves to the device-only store; "Clear this day" removes that day's entries. Date picker control style is UNKNOWN beyond the chevron row.
- **Notes (not on screen):** "Period started" opens this sheet on today; "Add or change a past day" on the day picked.
- **Leads to:** back to D1/D2. Also opened from G4 "Yes, add it".

### D4 When to get help
- **Where:** pushed from D1/D2 "When to get help" (back button "Your cycle"). Static page, shown to everyone, never switched off.
- **Copy:**
  - Title "When to get help". Lead: "Tilo logs what you tell it. It can't check your cycle, so these are worth knowing."
  - List of four rows (bold line, then grey text):
    - "Bleeding between periods, or after sex" / "See your GP."
    - "Feeling faint or breathless with heavy bleeding" / "Call NHS 111. In Scotland, NHS 24 on 111. In Northern Ireland, contact your GP."
    - "Periods that stop, if that's new for you" / "It's worth mentioning to a GP. Periods can stop for lots of reasons, including eating less than your body needs, a lot of training or stress."
    - "Sudden, severe pain" / "Call NHS 111, or 999 if it's an emergency."
  - Contact list: "NHS 111" / "Medical help when it isn't an emergency · 24 hours" with tappable "111" (`tel:111`); "Emergency services" / "If you or someone else is in danger now" with tappable "999" (`tel:999`).
  - Footnote: "Heavy periods and period pain that get in the way of things are worth raising with a GP too." followed by links "NHS: heavy periods" and "NHS: period pain" (URLs UNKNOWN).
  - Footnote: "If you're struggling, support is here." (link to support)
- **Notes (not on screen):** clinician to check every line at beta.

### D5 Delete all cycle data
- **Where:** `BareSheet` over the D1 page, opened by "Delete all cycle data" (D1/D2, and D6).
- **Copy:** Title "Delete all cycle data?". Body "Your period and symptom log, and your answer to "Which fits you best", are deleted from this phone, and Your cycle turns off. This can't be undone." Buttons: "Export a copy first" (gray, big); "Delete all cycle data" (red fill, big); "Cancel" (link, centred).
- **Behaviour:** "Export a copy first" runs the export (then returns to the sheet, UNKNOWN). Delete clears the log and the answer, turns Cycle off, and works offline.
- **Notes (not on screen):** Also records a cycle withdrawal (Art. 7(3)); works offline.

### D6 Profile › Privacy: delete for everyone
- **Where:** Profile tab; the Privacy section expanded (the canvas draws it as an open "Privacy" row under "About Tilo").
- **Copy:**
  - Rows: "About Tilo"; "Privacy" (open).
  - Privacy body: "You agreed to Tilo using your health information on 2 October. Your data is stored on this phone and in your private account database. It's never sold or used for ads." Then "Your cycle log is only on this phone."
  - Links list: "Privacy policy"; "Terms and conditions"; "Cookie policy".
  - Buttons: "Withdraw consent for health data" (gray); "Delete all cycle data" (gray); "Delete account" (red text).
  - Label "If Your cycle was hidden with "I don't have periods"" with action row "Show Your cycle in Profile again".
- **Behaviour:** "Delete all cycle data" opens D5.
- **Notes (not on screen):** "Delete all cycle data" shows whenever there is cycle data or a cycle consent on this phone, whatever the sex answer. The "Show again" row is a proposal (plan gap).
- **Sara 22 Nov update (not on the board):** a **"Cycle" row** sits beside "Delete all cycle data" in Privacy. It lets anyone 18+ with a health yes turn Cycle on (A2, then B1, then B2). This replaces the board's proposed "Show Your cycle in Profile again" row; whether both remain is UNKNOWN. Copy, icon and placement are UNKNOWN and need a board or Sara's wording before build.

---

## E. Train

### E1 Train on a pain "A lot" day
- **Where:** Train tab (eyebrow date example "Thursday 29 October"), only when pain "A lot" was logged and is the one low signal.
- **Copy:**
  - Card lead: "A lighter session is here if you want it."
  - Three option tiles: "As planned" / "Legs & Core" / "5 exercises · 14–15 sets"; "Shorter" / "Legs & Core" / "10 sets · easier effort"; "Swap" / "Hips, hamstrings and calves" / "About 10 min · on a mat".
  - Footnote: "Shorter means fewer sets and an easier effort: stop each set with three or four reps to spare, at last time's weight or lighter."
  - Footnote: "Resting today is fine too."
  - Below, the usual "Today" list: "Legs & Core" / "5 exercises · 14–15 sets" with "Start"; action row "Add something".
- **Behaviour:** tiles pick the version of the session; the offer never names the period or the cycle.
- **Notes (not on screen):** Lead line only when pain "A lot" is the one signal; with other low answers the approved "Tough day?" line stays. "As planned" stays as planned.

### E2 Summary the same day
- **Where:** Summary tab, same day as E1.
- **Copy:** "Mind" card: "Checked in this morning." "Move" card: "Legs & Core" / "5 exercises · lighter choices today" with "Start".
- **Notes (not on screen):** Unchanged approved copy (B2): nothing on Summary names the period.

---

## F. Weigh-in

### F1 4-week check with the weigh-in note
- **Where:** `BareSheet`, "Your 4-week check", "Close" top right.
- **Copy:** Lead "Your 4-week average is in. Some options, if you want them." Card "The last 4 weeks": Sleep "Mostly OK, two short nights last week"; Stress "Some on most days"; Mood "Steady"; Hunger "Higher on a few days"; Move "9 sessions done"; Food "Averaged 1,880 kcal, with 19 days in your range"; Weight "Weighed in 9 times. Over 4 weeks, a little slower than the pace you chose." and, new for Cycle, the note **"Weight can read a bit higher around a period. It's mostly water and settles within days."** Option list (radio): "Mind" "Aim for an earlier night"; "Mind and food" "Plan for hungry days"; "Move" "Add a strength session"; "Food" "Build meals around protein". Button "Keep things as they are". Footnote "Nothing changes unless you choose it."
- **Notes (not on screen):** The weigh-in note shows only when bleeding was logged that week and the change is upwards; never in gentle or quiet modes. "Adjust my range" is left out of this check and the next (no deeper deficit after a logged bleed).

---

## G. Safety prompts

Neutral `.banner` card (info icon in `--mind-ink`, `--card` fill), generic signposting, no condition names. Shown only in the check-in's Cycle group and at the top of the Cycle page; never on Summary, never a notification. **No X button on G1/G2 (Sara, 22 Nov).** There is no G3 board.

### G1 More than a week of bleeding
- **Where:** inside the C2 check-in Cycle group (after the "Anything else?" chips, before "Kept on this phone only. Skip anything.") and at the top of the Cycle page until dismissed. Board shows the check-in with flow "Medium" selected.
- **Copy:** "You know what's usual for your periods. If this is new for you, bleeding that lasts more than a week is worth mentioning to a GP." Link "NHS: heavy periods" (external, URL UNKNOWN). Button (link): "This is usual for me".
- **Behaviour:** once per episode. "This is usual for me" stops it unless a period lasts 2+ days longer than the one marked usual, or 14+ days (alpha rule, plan 5.1). After tapping, the app's **existing toast** with Undo: "Got it. Tilo won't show this again unless things change. 'When to get help' is in Cycle settings." No close button.
- **Notes (not on screen):** Never on Summary, never a notification.

### G2 Heavy and pain prompts
- **Where:** top of the Cycle page (and in the check-in's Cycle group the day they first apply), above the "Day 2 of your period" card. Board caption: "Where they show: the top of the Cycle page (and in the check-in's Cycle group the day they first apply)".
- **Copy:**
  - Heavy days in two or more periods: "You know what's usual for your periods. If they've got heavier, or they're getting in the way of things, they're worth raising with a GP." Link "NHS: heavy periods". Button "This is usual for me".
  - Pain "A lot" in two or more periods: "If the pain is worse than usual, or stops you doing things, it's worth raising with a GP. You don't have to put up with it." Link "NHS: period pain". Button "This is usual for me".
- **Behaviour:** "This is usual for me" stops that prompt until the pattern changes (alpha rules, plan 5.1) and shows the same existing toast as G1. Shown together, only the first card opens with "You know what's usual…". Otherwise at most once in 3 months each. Same copy in gentle mode (no numbers in it). No close button.
- **Notes (not on screen):** Generic signposting, no condition names; clinician to set every threshold.

### G4 No period logged: ask first
- **Where:** inside the check-in, in the Cycle group under the "Period today?" row.
- **Copy:** Banner text "You haven't logged a period for a while. Has a period come that isn't logged?" Buttons (gray, small): "Yes, add it"; "No".
- **Behaviour:** "Yes, add it" opens Log a day (D3). "No" leads to G5.
- **Notes (not on screen):** Only after a long stretch of check-ins with no period logged: about 3 months for regular and prefer not to say, about 6 months for irregular, never for perimenopause or stop or skip (alpha defaults, Sara 20 Nov; clinician to confirm before beta). Variant: banner with two buttons (a small new variant); a two-option sheet would also work.
- **Leads to:** D3 (Yes), G5 (No).

### G5 After "No": blame-free signposting
- **Where:** `BareSheet` after G4 "No".
- **Copy:** Title "Thanks for letting us know". Body "Periods can stop for lots of reasons, including eating less than your body needs or stress. Pregnancy is another. A GP can help you find out why." Card: "Until a period is logged, Tilo won't suggest eating less. You can still set your own target in Profile." List: "Your GP" / "Surgery hours"; "Beat" / "Eating disorder support · 3pm–8pm, Monday to Friday" with tappable "0808 801 0677" (`tel:08088010677`). Button "Done" (primary, big).
- **Notes (not on screen):** The deficit line only for people in a deficit; regulatory view needed. Beat only with wellbeing Yes or gentle mode. Copy: clinician and mental-performance to sign off.

---

## Still open (from the canvas and plan)

- `compliance` and `mental-performance` sign-off on consent wording and answer lines (compliance wording noted OK on 20 Nov); a clinician on every safety threshold and line (D4, G).
- D1g wording, G5 copy and the Beat/deficit conditions carry their own sign-off notes on the canvas.
- The Profile › Privacy "Cycle" row (Sara, 22 Nov) needs its copy and placement confirmed (UNKNOWN above).
