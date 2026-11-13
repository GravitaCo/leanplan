# Native build plan

Written 9 Nov 2026 by the lead engineer, from `native-build-brief.md` (streams, owners,
approvals), `native-app-plan.md` (framework, architecture, phases) and `recipe-sharing.md` §11.
Status: **spike done (13 Nov 2026): it runs on Benn's iPhone; results and the estimate in §3.1. Foundation streams next.**

Labels: **[E]** checked in the code or a source on 9 Nov; **[I]** inference to confirm; **[G]**
judgement call.

## 1. What the code tells us before we start

These findings change how much is shared and how much is rebuilt.

1. **`src/core/` is ready to share as it is.** 49 domain modules and the legal texts, about 51,000
   lines with the data, have no React and no browser calls. The only mentions of `window`,
   `navigator` and `localStorage` there are in comments [E].
2. **`src/data/` is not.** 14 of its 17 files use browser features: `localStorage`, `fetch`
   details, `navigator`, IndexedDB (the reminder log), the service worker, `import.meta.env` (Vite's
   flags) [E]. Each needs a native adapter behind the same function names, so the callers don't
   change.
3. **The store should be shared, not rebuilt.** `src/store/store.ts` is 2,420 lines of app
   behaviour (sync timing, consent gates, the asks budget wiring, rerunning plans after an answer
   changes). Zustand and Immer both run in React Native. Rebuilding it per platform would be the
   largest single source of drift, which breaks the brief's "share, don't fork". [G] Recommendation:
   N0 makes the store platform-neutral (it touches `localStorage` in 2 places and the data layer
   everywhere), and both apps import it.
4. **The words live in the screens folder.** Seven copy files hold the approved wording as plain
   data (`onboarding/copy.ts`, `onboarding/copyApp.ts`, `mind/copy.ts`, `mind/resetCopy.ts`,
   `today/summaryCopy.ts`, `profile/notifyCopy.ts`, `profile/pillarsCopy.ts`) [E]. Other screens
   keep their words inline in JSX. [G] N0 moves the seven files to a shared `src/copy/` (a web
   change with no visible effect, tests still passing), and each feature stream lifts its inline
   strings there before rebuilding a screen. Both apps then read the same words, and the copy lint
   (`copyIssues`) covers native for free.
5. **Unit tests already reach into screens.** 13 test files import screen copy or read screen
   source [E]. Moving copy to `src/copy/` updates their imports; `npm test` must pass unchanged in
   meaning before and after.
6. **Flags read Vite's environment** (`onboardingFlag.ts`, `wellbeingFlag.ts`) [E]. Native needs
   the same flags from its build config, so a feature is never on in one app and off in the other.
7. **The app is now Tilo** (CLAUDE.md). `native-app-plan.md` still says Tali in places, including
   the store name proposal in §9.1. That section needs updating before anything is reserved.

## 2. Order and dependencies

```
Spike (lead, ~2 weeks)  ─┐
                         ▼  Benn tries it; measured estimate
N0 Foundation (lead) ────┬──► N1 Design system
                         ├──► N2 Account, consent, legal   (needs N1 primitives for screens)
                         └──► N3 Sync and data
                                   │
          ┌────────────────────────┴───────────────────────────────┐
          ▼ (parallel, each needs N0 to N3)                         │
 N4 Today   N5 Food   N7 Train   N8 Plan   N9 Mind   N10 Profile   │
          │           │                                             │
          │           ├──► N6 Scanning (needs N5's add-food flow)   │
          │           └──► N13 Recipe sharing (after N5)            │
          ├──► N11 Onboarding (needs N10 health answers, N4 Summary) │
          └──► N12 Notifications (needs N3, N10's settings) ◄───────┘
                         ▼
       Parity build: ship-critic, TestFlight and Play internal testing
```

- **Within the foundation**, N1, N2 and N3 start together once N0's shell runs; N2's screens wait
  for N1's primitives, but its logic (consent, owner check, export) doesn't.
- **Cross-stream links** (owners agree a stub, then swap it for the real screen):
  Today opens Train (Move tile), Mind (Mind card), Food (Food card), the weight sheet and the
  weekly review; Plan opens Train's builder and library; Profile opens Health answers, Notifications
  and Support (shared with Mind).
- **Shared components** found by more than one stream go to N1, never into a feature stream.

## 3. Spike (lead engineer; native plan phase 0)

Purpose: prove the architecture and measure. Not shipped to anyone but Benn and Sara.

1. Expo app in `apps/native` (TypeScript, Expo Router or React Navigation [G: decide in the spike]),
   resolving `@/core` to the shared `src/core/`.
2. Storage adapter for `leanplan.v1`: MMKV or SQLite, measured on load and save time with a real
   backup file; the same JSON shape as the web.
3. Sign-in with email (Supabase), session in secure storage.
4. Summary rebuilt from a real backup: the week strip, the food card and rings, the weight tile,
   from the shared store.
5. One HealthKit read (sleep, steps, a workout) on Benn's iPhone with the Apple Watch.
6. One micro animation (Reanimated) and one haptic, with Reduce motion respected.
7. One on-device AI call (Apple Foundation Models) on a supported iPhone, or a note that the test
   device doesn't support it.
8. EAS build to Benn's phone (internal distribution).

Exit: Benn and Sara try it; I report the measured estimate per stream (from how long the Summary
rebuild took against its size), and anything the spike proved wrong in this plan.

### 3.1 Spike status (9 Nov 2026)

Built on `claude/native-build`, in `apps/native` (how it is wired: `apps/native/README.md`).

| Spike item | State |
|---|---|
| 1. Expo app reusing `src/core` | **Done.** Expo SDK 58 with Expo Router [G: Router, as Expo recommends; the brief's tab shell maps onto its tab layout]. The app runs the web's `src/core`, `src/data` **and `src/store`** unchanged (finding 3 confirmed: the store needed no refactor to run, only two browser touchpoints moved into `src/data/platform.ts`, with web behaviour unchanged and the web's 2,135 tests passing). Not an npm workspace, so the web's lockfile is untouched. The iOS bundle holds 96 shared files and nothing from the web's `node_modules` (one React). |
| 2. Storage adapter | **Done, timings to measure on the phone.** MMKV, chosen over SQLite because it is synchronous like `localStorage`, so `persistence.ts` runs as it is: same keys, same JSON, a backup moves between web and native unchanged. The lab screen measures load and save on Benn's real data. |
| 3. Sign-in, session in secure storage | **Done (email).** The Supabase session sits in an encrypted MMKV store whose key is in the Keychain, this device only (`security-data` reviewing). Google sign-in, sign-up and reset are N2. |
| 4. Summary from the shared store | **Done for the main cards:** header, week strip, Mind row, Food (all three food views), Move and Weight, This week. `scripts/e2e-summary-parity.cjs` compares it with the web for the same account: 31 of 31 checks pass (figures and words, normal and gentle, light and dark). Left for N1 and N4: icons, the connection pill, the wellbeing Mind card, banners and the asks budget, quick checks, usuals, supplements, the review, every sheet. |
| 5. HealthKit read | **Built, not yet run on a phone.** Last night's sleep as a band with a wake time ("Your watch: about 6 to 7 hours, up around 7:10."), today's steps and the week's walks, in the lab screen only; nothing saved or synced, so nothing new is collected. |
| 6. Micro animation and haptic | **Built.** The Food bar's fill moves over 0.3 s like the web's transition, on the UI thread, still with Reduce Motion. The haptic is only in the lab screen until a board approves it (brief §4). |
| 7. On-device AI | **Built, not yet run.** A small Swift module calling Apple's Foundation Models, tried on ai-platform-plan task A (parse a typed meal into foods), on the phone only. Needs iOS 26 on an Apple Intelligence iPhone (iPhone 15 Pro or later [I]); the lab says why when it can't run. |
| 8. EAS build to Benn's phone | **Waiting for Apple** to approve Gravita's Developer Program enrolment (Benn enrolled 9 Nov). Bundle identifier **`fit.tilo.app` approved by Benn (9 Nov)**; test iPhone is an iPhone 18 Pro Max on iOS 27.0.1; Benn has created the Expo token (it reaches a new cloud session, not the one it was added in) and the Expo organisation **`gravita-co`** (Sara invited as Admin); the project is created under it (`owner` in `apps/native/app.json`). Apple approved Gravita's Developer Program membership (12 Nov); Apple team M8R77TCYF8 (`appleTeamId` in app.json). The App Store Connect API key for builds is Key ID 3QZ9J5XSGW (issuer eccd7781-71a7-47f7-bf0d-a67ecaa2dc1e, Admin); its private key lives only in Gravita's records and the cloud environment's settings (`EXPO_ASC_API_KEY`), never in the repo. Developer Mode and phone registration come with the first build. `eas.json` has `development` and `spike` profiles, both internal distribution. |

Not in the spike, by design: the owner question, the 18+ stop and the consent screen (N2). The
native gate stops at a plain message for each and never goes past them, and the store's own rules
still keep sync off until the health yes.

CI: `.github/workflows/native.yml` runs the native typecheck (which covers every shared file the app
imports), the token check and a full iOS bundle on the native branches.

**On Benn's iPhone (12 Nov, build 0.1.0 (1) and (2), iPhone 18 Pro Max, iOS 27.0.1):** installed through
Expo internal distribution (the phone registered by UDID; the web registration link failed on iOS
with "An unknown error occurred"). Google sign-in works (after `tilo://auth-callback` was added to
Supabase's redirect list); Summary shows his real data and matches the web apart from the missing
icons (N1); sync reads "synced". Storage on his real data (19.5 KB, 22 days): load with migrations
1.4 ms, save 0.8 ms, 20 raw reads 4.2 ms. HealthKit: steps read (4,542 today); no sleep yet because
sleep tracking was off (switched on 12 Nov, to re-test the next morning). On-device AI: Apple
Intelligence available; "two eggs and a slice of toast with butter" parsed correctly into eggs 2
item, toast 1 slice, butter 1 tsp in 2.4 s, on the phone. Haptic felt. 13 Nov: the sleep read works too (sleep tracking switched on). Sara's phone follows when Benn sets
her up; it doesn't hold the build.

**Estimate (13 Nov, after the spike; [G] extrapolated from one screen, to be re-measured after N1):**
- *What it took:* the spike (app, shared store running unchanged, storage, sign-in, Summary cards, HealthKit,
  on-device AI, parity script) was written in one working session on 9 Nov; getting it onto the phone
  took longer than writing it, because of Apple enrolment and set-up.
- *What is left to rebuild:* the screens and UI kit, about 13,500 lines of TSX and 1,900 of CSS on the web.
  The Summary cards ran at about one native line per web line, so roughly 35 Summary-sized pieces remain.
- *Revised 13 Nov after Benn's challenge:* the first figures (5 to 6 weeks) assumed human-paced review
  cycles, which isn't how this team works: the specialist reviews run in minutes inside each stream, the
  designs exist, and only visible differences from the web need Benn's or Sara's approval. The web app
  was designed and built in about 3 weeks; native reuses all its logic and its designs.
- *Calendar (revised):* foundation (N0 to N3) a few days; feature streams in parallel about 1 to 2 weeks
  after that; parity build in TestFlight in about **2 to 3 weeks**. The parts that are genuinely new work
  rather than ports, and most likely to run over: the guided player with video and timers (N7), barcode
  scanning with the camera (N6), push through APNs with the reminder function (N12), and anything that
  only shows up on a real phone. Re-measured when N1 lands. Store launch then needs Sign in with Apple, the
  store listings, privacy labels and Apple's review (days to weeks); Android adds Play's closed test
  (about 14 days with about 12 testers [I]).
- *Running costs* (EAS build minutes, developer accounts): `cfo` to cost; builds so far fit Expo's plan.

## 4. Streams

Each stream below has: tasks, web sources, the parity checklist, the e2e scenarios it carries over
(as Maestro flows or component tests), native improvement candidates (each one a board first),
reviewers, and dependencies. "Every state" in a checklist always means: light and dark; gentle
mode on and off; wellbeing Yes and Sometimes routing; offline; flags on and off as on the web; small
and large phones; Dynamic Type at the largest setting.

### N0 Foundation (lead engineer)

Tasks:
1. `apps/native` Expo app, shared `src/core/`, TypeScript paths, Metro config for the monorepo.
2. Platform adapters behind the existing function names: storage (`persistence.ts`), network and
   connection state (`navigator.onLine` to NetInfo), environment flags, crypto and ids, file export
   and import (share sheet), timers in the background.
3. Make `store.ts` platform-neutral (finding 3) with web behaviour unchanged.
4. Move the seven copy files to `src/copy/` (finding 4); update imports and tests.
5. Shared token file generated from `theme.css` (both apps read it), Geist bundled.
6. Navigation shell: tabs Summary, Mind, Food, Train, Plan (and the Mind-off layout), the Profile
   avatar beside every title, Profile reachable from everywhere.
7. CI: GitHub Actions runs `npm test`, typecheck for both apps, and an EAS build per push to
   `native/*`.
8. EAS project under the Gravita Expo account; internal distribution.

Web sources: `App.tsx`, `ui/BottomNav.tsx`, `ui/ProfileButton.tsx`, `data/persistence.ts`,
`data/*Flag.ts`, `store/store.ts`.
Parity: the tab bar and avatar behave as `e2e-wellbeing` wp5-nav, wp5-mind-off,
wp5-flag-off-headers describe; a backup exported from the web imports on native unchanged, and the
reverse.
Carries over: e2e-wellbeing wp5-*.
Improvements (no board, `security-data` approves): storage the system won't clear, session in
secure storage, background sync.
Reviewers: `security-data`, `ship-critic`. Depends on: the spike.

### N1 Design system

Tasks: tokens to native styles; primitives (`Sheet`, `BareSheet`, `Seg`, `Toggle`, `Disclosure`,
`SettingRow`, `CatHead`, `PageHeader`, `BackButton`, pressable states, scroll lock equivalents);
charts (`Rings`, `Meter`, `KcalBar`, `MacroTrio`, `Sparkline`, `WeekBars`); `WeekStrip`, `DayNav`,
`MoveStrip`; `Ruler` and `Wheel` pickers; `Tiles`; `TaliMark`; icons; `ConnectionPill`; toast and
banner; a component gallery screen in the dev build for `design` to review.
Web sources: `src/ui/` (11 files), `src/styles/theme.css` and the other style sheets.
Parity: every component in every state against the web's rendering, side by side, light and
dark; 44 point touch targets; VoiceOver and TalkBack labels match the web's `aria` labels.
Carries over: the picker checks in e2e-onboarding ("pickers", "VoiceOver").
Improvements (boards): native sheets and swipe-back; haptics on key taps.
Reviewers: `design`. Depends on: N0.

### N2 Account, consent and legal

Tasks: sign-in (email, Google native flow), password reset; the consent screen after sign-in and
the server-side consent records; the owner check when another account's data is on the phone;
legal documents and links; privacy sheets; withdraw health consent (export first); delete account
(including offline refusal and re-auth); export and import; the age stop in all its entry points.
Web sources: `AuthScreen.tsx`, `screens/legal/`, `data/consent.ts`, `data/account.ts`,
`data/backup.ts`, `data/firstRun.ts`, `onboarding/AgeStop.tsx`, `onboarding/Consent.tsx`.
Parity: every consent state (unanswered, yes, no, Not now, the 2-week return); withdrawal and its
clear on other phones; deletion paths; the under-18 stop from Profile, launch, sync pull and
backup.
Carries over: e2e-foundations (consent, withdrawal, existing user, delete account: 12 of 18);
e2e-under-age (all 14, with N12 for the reminder cases).
Improvements: none planned (identical by the brief).
Reviewers: `compliance`, `security-data`. Depends on: N0, N1 for screens.
**Store blocker (security-data, 12 Nov):** with Google sign-in in the app, App Store guideline 4.8 requires Sign in with Apple as well (a Supabase OAuth provider, same flow as Google); `compliance` to note it. The spike's Google sign-in returns to `tilo://auth-callback` (exactly that entry in Supabase's redirect list) with PKCE S256.

### N3 Sync and data

Tasks: `supabase.ts` and `sync.ts` on native (secure session, dirty flags, pull and push, resume
after withdrawal, the consent-first upload); the connection indicator and its four states;
device-only data (`deviceOnly.ts`: Unload notes, markers, the reminder log moved off IndexedDB);
shared products and label reader network calls; offline behaviour throughout.
Web sources: `src/data/` (sync, supabase, persistence, deviceOnly, notifyLog, products,
sharedProducts, labelReader), `store/store.ts` sync loop.
Parity: a day logged offline on native appears on the web after reconnect and the reverse;
conflicts resolve last-write-wins as on the web; nothing uploads before the health yes.
Carries over: e2e-foundations pill cases (4) and the mid-upload withdrawal; e2e-onboarding "offline
mid-wizard"; e2e-wellbeing wp13-unload-offline.
Improvements (no board, `security-data`): background sync.
Reviewers: `security-data`. Depends on: N0.

### N4 Today

Tasks: Summary (week strip, cards for Mind, Food, Move, Weight, This week); the check-in with
sleep; food asks (day-14, week-4); the Mind card and the one thing; the low-mood banner; hard-day
changes; the asks budget (one sheet at a time); the weight sheet; the weekly review and the whole
maintenance loop (4-week check, steady range, drift, reminder ask); the medical and pregnancy
re-asks.
Web sources: `TodayScreen.tsx`, `screens/today/` (8 files), `body/WeightSheet.tsx`,
`review/WeeklyReview.tsx`.
Parity: every card state; every review variant (calm, gentle, hard, care, welcome back, lighter,
too soon); gentle mode and wellbeing routing hide what the web hides; numbers equal the web for
the same backup.
Carries over: e2e-loop (all); e2e-wellbeing wp7-*, wp10-*, wp14-*, wp15-* (Summary side),
closeout-review-*; e2e-onboarding ob9-2, ob9-3, ob9-4, the medical re-ask cases, if-then on Today.
Improvements: none planned.
Reviewers: `mental-performance`, `nutrition-accuracy`, `design`. Depends on: N0 to N3; stubs for
Mind, Food, Train.

### N5 Food

Tasks: the Food screen (day view, meals, totals, ± margin); add food (search, usuals, portion,
quick estimate, create food, duplicates and merge); edit entry; meals and recipes, recipe logging;
"What can I make?"; the margin sheet; gentle mode and the food range; the ingredient check from
`recipe-sharing.md` §11.3 if it has landed on the web first.
Web sources: `FoodScreen.tsx`, `screens/food/` except scanning (AddFoodSheet, PortionView,
QuickEstimateView, CreateFoodView, DuplicateViews, EditEntrySheet, MealsSheet, RecipeLogView,
MarginSheet, SuggestSheet, common).
Parity: one serving logged on native equals the web and the published figure for every chain item
(the same check `npm test` runs on the data); search returns the same results in the same order;
offline search and logging.
Carries over: e2e-onboarding ob9 Food cases and "ob9-4 Show a range"; the duplicate-food flows
(component tests from `test-duplicates.ts` cases with screens).
Improvements: none planned.
Reviewers: `nutrition-accuracy`, `nutrition-db`, `design`. Depends on: N0 to N3.

### N6 Scanning

Tasks: barcode scan and confirm; Open Food Facts lookup; the shared product list (lookup, submit,
report, opt-in); AI label reading with its consent; offline behaviour (asks to try later).
Web sources: `food/ScanView.tsx`, `ScanConfirmView.tsx`, `LabelCaptureView.tsx`,
`SharedProduct.tsx`, `barcodeDecoder.ts`, `camera.ts`, `data/products.ts`,
`data/sharedProducts.ts`, `data/labelReader.ts`.
Parity: the same lookups, the same request bodies to the edge functions, the same confirm screens
and figures.
Carries over: e2e-label-scan (all); e2e-shared-products (all).
Improvements (board): the platform's own barcode scanner.
Reviewers: `nutrition-accuracy`, `security-data`, `compliance`. Depends on: N5.

### N7 Train

Tasks: the Train screen; preview; guided player with tempo count; demo player with the clip's rep
and pace row; held clips and the hold timer; warm-up card and player; adjust, finish, stopped;
manual log; log a session; add something; swaps; library; the workout builder; hard-day options.
Web sources: `TrainScreen.tsx`, `screens/train/` (17 files), `core/data/media.ts`.
Parity: every exercise's clip, timeline and cue as on the web; video screens look the same in both
modes; logged sets sync identically.
Carries over: e2e-wellbeing wp8-* (train hard day, rough night, cardio, ordinary); e2e-onboarding
warm-up cases and "flag off: nothing new shows" (Train preview part).
Improvements (boards): native video playback; screen kept awake in a guided session; a rest timer
that keeps running in the background. **Check first:** the Bunny library refuses requests with no
referrer, so the native player must send one or the setting changes; `security-data` decides.
Reviewers: `fitness-workouts`, `mental-performance`, `design`. Depends on: N0 to N3.

### N8 Plan

Tasks: the week view and day views; training plans (library, details, builder, active plan, end
of plan); if-then plans (sheets, starter plans, Mind plans).
Web sources: `PlanScreen.tsx`, `screens/plan/` (7 files).
Parity: every plan state (none, choosing, preview, active, maintenance, finished); the week matches
the web for the same data.
Carries over: e2e-onboarding "a 1-day week", "set up my plan", if-then cases (Plan side).
Improvements: none planned.
Reviewers: `fitness-workouts`, `mental-performance`. Depends on: N0 to N3; N7 for the builder.

### N9 Mind

Tasks: the Mind page; Reset with the glow pacer (count driven from code, Reduce motion holds it
still); Unload (on the phone only); Wind down; Get outside; the weekly reflection; the support
sheet with nations.
Web sources: `MindScreen.tsx`, `screens/mind/` (10 files).
Parity: timings from `skills.ts`; every reflection variant; support numbers and order per nation.
Carries over: e2e-wellbeing wp6-*, wp11-*, wp12-*, wp13-*, wp15 (support side),
closeout-design-reset.
Improvements: none planned.
Reviewers: `mental-performance`, `compliance`. Depends on: N0 to N3.

### N10 Profile

Tasks: grouped settings; body and targets (suggested targets, protein lines); pillars; Health
check answers (change, clear, the re-ask); notifications settings; feedback; account data and
privacy; support rows; Redo setup entry.
Web sources: `ProfileScreen.tsx`, `screens/profile/` (11 files).
Parity: every row and its states; targets equal the web for the same profile.
Carries over: e2e-onboarding ob7-*, ob10-*, "fix" cases, health data off; e2e-wellbeing wp9-*,
wp17 (settings side).
Improvements: none planned.
Reviewers: `compliance`, `design`. Depends on: N0 to N3.

### N11 Onboarding

Tasks: the wizard (all steps, pickers, notes and signposts), the summary, the first-session
moments, Redo setup, Set up my plan; behind `ONBOARDING_ENABLED` exactly as on the web.
Web sources: `screens/onboarding/` (9 files), `core/domain/wizard.ts`, `onboarding.ts`.
Parity: every route (readiness, pregnancy, wellbeing Yes and Sometimes, medical both outcomes,
under 18, skips); summary numbers equal `startingTargets`.
Carries over: e2e-onboarding (the wizard, safety, summary and redo cases, roughly half its 81).
Improvements: none planned.
Reviewers: `fitness-workouts`, `nutrition-accuracy`, `mental-performance`, `compliance`.
Depends on: N1, N2, N4 (Summary), N10 (Health answers).

### N12 Notifications

Tasks: APNs and FCM registration; the reminder function sending to native tokens as well as Web
Push; supplement, check-in, wind-down, plan and weekly review reminders; the one-a-day budget,
quiet hours and back-off; lock-screen wording as approved; opening the right screen from a tap;
unsubscribe on the age stop and on deletion.
Web sources: `data/push.ts`, `data/notifyLog.ts`,
`supabase/functions/send-supplement-reminders`, `public/sw.js` (push parts).
Parity: the same reminders at the same local times with the same words; the same budget.
Carries over: e2e-wellbeing wp17-*; e2e-under-age reminder cases.
Improvements (board): reminders through the system's own notifications.
Reviewers: `security-data`, `compliance`, `mental-performance`. Depends on: N3, N10.
Note: the edge function change also affects the web; it ships through `ship-critic` on `main`.

### N13 Recipe sharing (native first)

Tasks: the share sheet; universal links (iPhone) and app links (Android) with the association
files on app.tilo.fit; the receive sheet with the acceptance clause and the confirm tap; the
ingredient check (§11.3), built once in `src/core/` so the web can use it too.
Web sources: `recipe-sharing.md` (all, §11 in particular).
Parity: none on the web yet; boards come first.
Carries over: nothing; new Maestro flows (send, receive with and without the app installed).
Reviewers: `nutrition-accuracy`, `compliance`, `security-data`, `mental-performance`, `design`.
Depends on: N5. Open decisions in `recipe-sharing.md` §10 and §11 come first.

## 5. Testing parity

- **Shared logic:** `npm test` unchanged, run on every push of every branch.
- **Screens:** React Native Testing Library for component states; Maestro flows for the journeys
  the e2e scripts check. Each Playwright scenario listed above becomes a Maestro flow with the same
  name, so the two lists can be compared line by line.
- **Backend stand-in:** the e2e scripts answer Supabase calls from an in-memory stand-in; native
  tests use the same stand-in served locally, so tests never touch the real project.
- **Side-by-side screenshots:** the same seeded backup on web and native, captured per screen and
  state, for `design` and for Benn and Sara.
- **Not carried over:** service-worker caching, the PWA install, and Vite build flags as such (the
  flag behaviour is carried over).

## 6. How the sub-engineers work

- One sub-engineer per stream, each in its own git worktree on `native/<stream>`, briefed with
  brief §1, its row in §3 and its section here. They change only their stream's files; anything in
  `src/core/`, `src/copy/`, `src/data/` or N1's components goes through me.
- I merge each stream into `native` after its reviewers and `ship-critic`. Nothing native merges to
  `main` until `ship-critic` and I agree it can't change the web app; shared-code changes go to
  `main` on their own, through `ship-critic`, with the web's tests passing.
- Weekly, I report each stream's state against its checklist.

## 7. Before the spike: needed from Benn (and Sara)

From `native-app-plan.md` §9, updated for the rename:

1. **Store name.** The app is now Tilo; §9.1 still proposes "Tali Wellbeing". A new choice is
   needed (for example "Tilo Wellbeing" or "Tilo: Food, Move, Mind"), then a trademark check and
   reserving it in App Store Connect.
2. **Developer accounts** (approved 10 Oct) must exist: Apple Developer Program and Google Play
   Console as Gravita Creative Ltd. Organisation accounts usually need a D-U-N-S number [I: check
   when registering]. Also an Expo account for Gravita (EAS builds).
3. **Test devices.** Which iPhone (on-device AI needs an Apple Intelligence model, iPhone 15 Pro or
   later [I]); the Apple Watch (have); an Android phone for phase 1; a Mac for the iOS Simulator (I
   assume yours).
4. **The web app.** Kept running alongside native for good, or retired once native is in both
   stores. This decides how strictly every web change must be mirrored.
5. **Budget** for `cfo` to cost: EAS plan and build minutes, developer accounts, a device cloud for
   phones we don't own, AI costs per the ai-platform-plan.
6. **Who tests the spike:** you and Sara on your own phones, through EAS internal distribution.

Also needed before the related streams (not before the spike): the Bunny referrer decision
(`security-data`, N7); recipe-sharing decisions in its §10 and §11 (N13); boards for every
improvement candidate in brief §4.

### 7.1 Benn's answers (9 Nov 2026) and the account set-up

Answers: store name **"Tilo: Food, Move, Mind"**; test devices Benn's iPhone and Apple Watch, with a
MacBook Pro and Xcode; the web app runs alongside native until native is live on iPhone and
Android, then it is retired; the build work comes from Gravita's existing Claude plan and other
costs are as originally planned; testers are Benn and Sara. The build moves to a fresh lead-engineer
session.

Benn is signed in to the Apple Developer account. Steps for Benn (items marked [I] to confirm on
the screen):

1. **Membership.** developer.apple.com › Account › Membership details should show the Apple
   Developer Program, entity type **Organization**, name **Gravita Creative Ltd**, active. If it
   shows an individual or no programme, enrol as an organisation: it needs Gravita's D-U-N-S number
   (Apple offers a free look-up and request; it can take some days) and the yearly fee [I].
2. **Agreements.** App Store Connect › Business: accept any pending agreements. A free app needs no
   paid-apps agreement [I].
3. **Sara.** App Store Connect › Users and Access: invite sara@gravita.co (role Developer or App
   Manager), so she can test.
4. **An API key for the builds.** App Store Connect › Users and Access › Integrations › App Store
   Connect API: create a team key (role App Manager [I]), download the .p8 file (Apple shows it
   once) and note the Key ID and Issuer ID. Never paste it into a chat. It goes into Expo (step 5),
   so builds don't need Benn's phone for two-factor codes each time.
5. **Expo.** Create an Expo account and an organisation for Gravita at expo.dev; add the API key from
   step 4 to its iOS credentials; create an access token for builds. The token goes into the Claude
   cloud environment's settings (the environment menu in the session title bar, then Edit), under
   Network secrets where offered, otherwise as the environment variable **`EXPO_TOKEN`**. The lead
   engineer confirms the environment can reach expo.dev.
6. **The Mac.** Open Xcode once, accept the licence, and install the iOS platform and Simulator
   (Xcode › Settings › Components). With cloud builds (EAS) the Mac is for the Simulator and for
   watching the app on a cable when debugging, not for building.
7. **The iPhone (Benn's and Sara's).** Settings › Privacy & Security › Developer Mode on (needed for
   internal test builds). Each phone is registered once through a link the lead engineer sends
   (`eas device:create`). Benn to say which iPhone model it is: on-device AI needs iPhone 15 Pro or
   later [I].
8. **Bundle identifier.** The lead engineer proposes one (for example `fit.tilo.app`); Benn approves.
   It can't be changed after the first store submission. Then the app record is created in App
   Store Connect with the name "Tilo: Food, Move, Mind", which reserves it.

Google Play waits for the Android phase: a Play Console organisation account for Gravita (also
needs the D-U-N-S number).

## 8. Risks

- **Parity drift while the web keeps moving.** Every web change during the build becomes native
  work. Mitigation: shared store and copy (findings 3 and 4) and the paired test lists.
- **The store refactor** (finding 3) touches the web's busiest file; it ships in small steps behind
  the web's full test suites.
- **App review time** and Play's closed-testing requirement for new developer accounts (about 12
  testers for 14 days [I]) add calendar time before any store release.
- **On-device AI availability** depends on the test iPhone; Android falls back to cloud AI with the
  AI consent.
