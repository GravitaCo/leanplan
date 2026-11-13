# Plan (stream N8): parity checklist

What the native Plan tab must match, taken from the web source (`src/screens/PlanScreen.tsx` and
`src/screens/plan/`). The web is the spec. Words come from `src/copy/plan.ts`; what each view shows
comes from `src/screens/plan/planModel.ts` (tested in `scripts/test-plan.ts`). Native screens compose
N1's primitives only.

**Checked by** `apps/native/scripts/e2e-plan-parity.cjs`: the same seeded account (states built
with the shared core in `plan-parity-seed.ts`) in the web app and in native rendered for the web,
every line of words and figures compared, screenshots light and dark. Cases are named below as
`[case]`. "Every state" also means: light and dark; gentle mode on and off; the wellbeing flag on
and off; offline; small and large phones; the largest Dynamic Type.

Status key: ☑ built on lib/ui and matched by a parity case (words and figures, light and dark screenshots); ◑ built on lib/ui, checked by code review against the web and the specialist reviews but no parity case yet; ☐ not built.

## 1. The Plan tab

| # | What | Web source | Check |
|---|---|---|---|
| 1.1 | Header "Plan", the Profile avatar beside it (wellbeing on), the connection pill | `PageHeader` | ☑ `[none · the week]` |
| 1.2 | No plan: "No plan running…" line, "Suggested for your goal" with the best-fit tile (Fits your goal), Browse all plans | `bestFit`, `PlanTile big` | ☑ `[none · the week]` |
| 1.3 | Running plan card: photo or the dot, "Your plan", name, chevron; the big figure (`planCardFigure`): Starts / Week n of N · phase / Maintenance week n / Carrying on week n / N weeks done; the timeline; the note (`planCardNote`) | `pl-card` | ☑ `[active]` `[easing]` `[later]` `[maintenance]` `[carrying]` `[own]` `[finished]` (the week cases) |
| 1.4 | The card opens Plan details, or the end of the plan when it has ended and nothing is chosen (`awaitingNext`) | `setFlow` | ☑ `[active · details]`, `[finished · look back]` |
| 1.5 | Ended, nothing chosen: "You've reached the end of …" card with See what's next | `dayopt` | ☑ `[finished · the week]` |
| 1.6 | A next plan waiting: "Next: …" row, "Starts …. Until then, this week carries on." | `upcomingPlan` | ☑ `[next · the week]` |
| 1.7 | This week: with a plan, its week (`planWeekRows`, "Today · shorter" on a lighter week); without, the repeating week (`scheduleWeekRows`). Today's row tinted, its day in tint; rest rows "Rest · recovery counts too"; a thumbnail, or the cardio dot | `WeekRows`, `wk-row` | ☑ `[none · the week]`, `[active · the week]` |
| 1.8 | Week notes as cards (`planWeekNotes` / `weekWarnings`), then the foot (plan or no-plan wording) | ☑ (the week cases) |
| 1.9 | Tiles: Workouts (count) and Exercise library (count), side by side (`.tiles.plantiles`, theme.css:913) | `plantiles` | ☑ (the week cases) |
| 1.10 | If–then plans: rows (`whenLine`, "I'll … · Worked", "Backup: …"), + New plan, the foot | `planGroups` | ☑ `[none · the week]` |
| 1.11 | Mind plans group, only with WELLBEING_ENABLED and at least one Mind plan | `MIND_PLAN.group` | ☑ wellbeing on (the week cases); ◑ flag off (planGroups unit-tested) |
| 1.12 | Guides: How the split works, The honest basics (icon squares activity and mind), each opens a tall sheet with Done | `PLAN_GUIDES` | ☑ `[none · guide: the honest basics]` |
| 1.13 | Build my plan card (ob6-4): ONBOARDING_ENABLED only (off on the web), stream N11 | `BuildPlanCard` | n/a while the flag is off (N11) |
| 1.14 | Train's "Edit … in Plan" opens that workout (`planOpen`, `clearOpen`) | ◑ code review (no case: needs Train to open it) |

## 2. The repeating week (no plan)

| # | What | Check |
|---|---|---|
| 2.1 | A weekday: back "My week", the day, "Every week" or "Rest day · recovery counts too"; the workout row with View; Change workout / Add a workout; Or; Make … a rest day; Copy another day; Swap with another day; notes; the foot | ☑ `[none · a day of the week]` `[none · a rest day]` |
| 2.2 | Add-workout sheet: categories (Weights, Cardio; empty ones hidden), the category list with radio rows and a check, "See what's in …", back-to-back notes, Add to Monday; every change shows an Undo toast | ☑ `[none · add-workout sheet]` `[none · add-workout category]` |
| 2.3 | Copy from / Swap with sheets: the other six days with what's on them | ☑ `[none · copy from sheet]` (swap: ◑ same component) |

## 3. A running plan's week

| # | What | Check |
|---|---|---|
| 3.1 | Tapping a day edits the phase's build week (`weekSource`) | ☑ `[active · a plan day]` |
| 3.2 | Day editor: several workouts (up to 4), each with View and Remove; Add another; rest, copy, swap; notes for that day; the foot ("…and the lighter weeks after it" when they follow) | ☑ `[active · a plan day]` (Remove: VoiceOver fix pending N1 Row actions) |
| 3.3 | Add-workout sheet with My workouts first and Tilo's plan workouts (strength, mobility) | ☑ `[active · plan day add sheet]` |
| 3.4 | A phase's week from Plan details: name, "plan · n weeks", the rows, notes, the foot | ☑ `[active · phase week]` |

## 4. Training plans

| # | What | Check |
|---|---|---|
| 4.1 | Library (choosing): back Plan, Plans, search, filter button (tint when filtered), goal chips (ink when on) or the filter chips with ×, count line, lead tile, the two-column grid with paging and its placeholder tile, empty text, + New plan | ☑ `[choosing · the library]` `[choosing · a goal chosen]` |
| 4.2 | Filter sheet: six groups, Clear, Done, "Show n plans" / "No plans match" | ☑ `[choosing · filters]` |
| 4.3 | Preview: hero photo or plain, round back, Fits your goal: …, name, line; last plan's note; about; How the n weeks go with timeline and key; a build week with its switch chips; maintenance and eating rows (`eatingLine`, gentle when numbers are quiet); For, Kit, Time; the beginner note; the safety foot; Starts (Today, next Monday, Pick a date) and Start plan fixed at the bottom | ☑ `[preview · suggested plan]` `[preview · another plan]` |
| 4.4 | Pick a date: the platform date picker (N1's DateTimePicker), today to a year ahead (`startOn`) | ◑ N1 DateInput (system picker: device check) |
| 4.5 | Maintenance card: title, Close, heading, the two bars, five numbered steps, Got it | ☑ `[preview · maintenance card]` |
| 4.6 | Builder: step header (Cancel / Back, "n of 3", three bars); 1 How long? (the last plan's note with hide, Name, length stepper 1 to 26, timeline, maintenance row, foot, Next); 2 Your week ("Start from the week you have now?" Copy it, rows with + Add, foot, no-rest note, counts, Next disabled when empty, day editor over the draft); 3 Ready to start (summary card, Starts, easier-week toggle, Ends …, Start plan) | ☑ `[build · step 1]` `[build · step 2]` `[build · step 3]` |
| 4.7 | Details: hero (220), started/ends line, timeline and where (`detailsLines`), The weeks (rows open their week; lighter rows don't), Then maintenance / Carrying on with Read, actions (edit, choose a new plan in maintenance, add a week, rename, save a copy, stop), the foot | ☑ `[active · details]` `[maintenance · details]` `[own · details]` `[later · details]` |
| 4.8 | Add a week sheet (easier first week only before the start; lighter week at `lighterWeekAt`), Rename sheet, Stop sheet (week-before wording) | ☑ `[active · rename sheet]` `[active · add a week sheet]` `[active · stop sheet]` |
| 4.9 | End of plan, step 1: photo fading into the page, name, "n weeks, done.", dates and workouts, done timeline, the two look-back fields (500 max), Skip, Continue | ☑ `[finished · look back]` |
| 4.10 | End, step 2: What's next?, Recommended maintenance (not after maintenance), the suggested plan tile, Run again, Build your own, Keep going without a plan | ☑ `[finished · what next]` |
| 4.11 | Starting from an end: the reflection is kept (finish now, or note it when the new plan starts later) | ◑ code review (`begin` identical; store unit-tested) |

## 5. Workouts

| # | What | Check |
|---|---|---|
| 5.1 | Workouts sheet: Ready-made, Yours (`routineLine`), Build a workout (when `canBuild`), foot | ☑ `[none · workouts sheet]` |
| 5.2 | Workout page: hero (poster or plain), back, title, "Mondays · …" (`plannedDaysLine`) or "Your workout · …" / "Tilo workout · …", the exercises (each opens the library), the foot, Do this today, Edit workout / Make your own copy | ☑ `[none · a workout]` (poster: Bunny blocked in capture; device check) |
| 5.3 | Workout builder and library: N7's components | N7 |

## 6. If–then plans

| # | What | Check |
|---|---|---|
| 6.1 | New / Edit plan sheet: When…, I'll…, If something gets in the way… with their placeholders (none for a Mind plan, "Optional" for its third), Save (the "Fill in when and what you'll do" toast when empty), the Mind lines, Delete plan | ☑ `[none · new if-then plan]` `[none · edit if-then plan]` |
| 6.2 | Plan check-in sheet (Today opens it): due plans, Worked / Mixed / Didn't work chips, Done disabled until one is answered | ◑ code review (N4 opens it) |
| 6.3 | "Plan when you'll do it" (ob5-4, Today opens it): IF_THEN words, three cues, Save, Not now | ◑ code review (N4 opens it; off on native for now) |
| 6.4 | A Mind plan is refused while health data is off (the store's toast) | store (unit-tested) |

## 7. Carried over from the web e2e scripts (Plan side)

- e2e-onboarding "a 1-day week" and "set up my plan" (Plan's views of the plan the wizard made), the
  if-then cases: to add as parity cases once N11 seeds them.

## Known behaviour notes

- Remove on a plan day: VoiceOver can't reach it inside the pressable row on iOS until lib/ui's `Row` takes accessibility actions (asked N1); blocks SHIP.
- The add-workout rows don't announce a checked state (the web's radio role); needs a `checked` option on lib/ui's `Row` (N1).
- Not covered by any case: swap, `planOpen` from Train, flag-off wellbeing, Android back.

## Words still inline in the web JSX

`src/copy/plan.ts` holds the outcome labels, Mind plans' words, goal chips, filters, maintenance steps
and guides. The other sentences in the Plan screens (headings, row titles, foot notes, buttons) are
still inline in `PlanScreen.tsx` and `screens/plan/*.tsx`. They move to `src/copy/plan.ts` as each
screen is rebuilt on N1, in the same commit, so both apps read one copy.

## Tracked follow-ups (accepted by `design` for the first Plan milestone)

- Builder steps 1 and 2: the title and everything below sit 4 pt low; an empty day's "+ Add" sits 3 pt below its day label.
- Plan home tiles (Workouts, Exercise library): 2 pt short; number and label 2 to 3 pt high.
- Week rows: the day label and a two-line title sit 2 pt high inside the row (single-line rows match).
- Library goal chips: 15 pt on native against the web's 14 (`.pl-goals .chip`); needs a size option on N1's `Chip` (asked).
- The big plan tile's caption is bold on the web because `.ptile.big` also matches the global `.big` (theme.css:194). Native matches it; whether the web means it is Benn's or Sara's call.
