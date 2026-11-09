# Native build brief: who builds what

Written 9 Nov 2026 for the lead engineer, at Benn's request. Benn: "I am going to start the
process of native build." This brief turns `native-app-plan.md` into work streams with owners.
Read that plan first (framework, architecture, phases, decisions); this brief doesn't repeat it.

## 0. Benn's direction (9 Nov 2026)

1. **Match the web app exactly.** Every screen, flow, rule, piece of copy and number behaves as it
   does on the web, unless native allows a real improvement.
2. **A native improvement is a proposal, not a decision.** It goes on the Design canvas, past the
   `design` agent, and needs Benn's or Sara's approval before it is built (CLAUDE.md, "No design
   change ships without Benn's or Sara's approval"). Each stream lists its candidates in §4.
3. **Speed through parallel work.** The lead engineer oversees; a sub-engineer owns each feature
   stream (§3) and works only on that stream.
4. **Every specialist agent gives its usual approval** (§5). Nothing reaches TestFlight, Play
   testing or the stores without `ship-critic`.
5. **Recipe sharing is a native feature** (`recipe-sharing.md` §11.5).

## 1. Ground rules for every stream

- **Share, don't fork.** `src/core/` is used as it is. If native needs a change there, it is made
  once, for both apps, with the web's tests still passing. No copy of domain logic in
  `apps/native`.
- **Data never changes shape.** Same Supabase tables and columns, same JSON shapes, same meaning of
  `leanplan.v1`, same consent records. A backup or a sync moves between web and native unchanged.
  Any schema change goes through `security-data` and `compliance` first, as on the web.
- **Offline-first** is the rule on native too: open, search, log and save with no connection.
- **Consent and legal flows are identical**: the consent screen after sign-in, nothing syncs
  without a health yes, withdrawal, deletion, export, the under-18 stop.
- **Flags mirror the web:** `WELLBEING_ENABLED`, `MIND_REVIEWED`, `SUPP_NAMES_ENABLED`,
  `ONBOARDING_ENABLED`, `LABEL_SCAN_ENABLED` read the same values, so a feature is never on in one
  app and off in the other by accident.
- **Tokens, not hardcoded values:** the Studio tokens become one shared file that the web CSS and
  native styles both read (`native-app-plan.md` §2). Light and dark follow the system, as on web.
- **Parity is tested, not eyeballed.** Each stream turns its web screens into a checklist (every
  state, light and dark, gentle mode, offline) and the repo's e2e scripts (`scripts/e2e-*.cjs`)
  into native test cases where they apply. The shared unit tests (`npm test`) run unchanged.
- **Branches:** each stream works on `native/<stream>` and merges into the `native` integration
  branch through the lead engineer. Nothing native merges to `main` until the lead engineer and
  `ship-critic` agree it can't affect the web app.
- **Internal names stay** (`tali` storage keys, `TaliMark`, `taliWorkouts`; CLAUDE.md, rename note).

## 2. Order

1. **Spike (native plan phase 0, about 2 weeks), lead engineer:** the Expo app reusing
   `src/core/`, the storage adapter, sign-in, the Summary screen, one HealthKit read, one
   animation, one on-device AI call. Exit: Benn tries it on his phone and gets a measured estimate
   for the full rebuild.
2. **Foundation (N0, N1, N2, N3) before feature streams:** feature streams need the shell, the
   primitives, sign-in and sync to exist.
3. **Feature streams in parallel (N4 to N12).**
4. **Recipe sharing (N13)** once Food (N5) is in.
5. Then the native plan's later phases (Apple Watch, store launch, Fitbit, AI), not in this brief.

## 3. Streams and owners

The lead engineer creates one sub-engineer per stream (a subagent in its own worktree, or a child
session) with this section, §1 and the named web sources as its brief.

| # | Stream | Web source to match | Owner | Reviewers (§5) |
|---|---|---|---|---|
| N0 | **Foundation:** Expo app in `apps/native`, shared `src/core/`, storage adapter (SQLite or MMKV), navigation shell (tabs including Mind, the Profile avatar beside titles), build setup (EAS), CI | `App.tsx`, `ui/BottomNav.tsx`, `ui/ProfileButton.tsx`, `data/persistence.ts`, `native-app-plan.md` §2 | **Lead engineer** | `security-data`, `ship-critic` |
| N1 | **Design system:** shared token file, Geist, primitives (`Sheet`, `BareSheet`, `Seg`, `Toggle`, `Disclosure`, `SettingRow`, `PageHeader`, `BackButton`), charts (`Rings`, `Meter`, `KcalBar`, `MacroTrio`, `Sparkline`, `WeekBars`), `WeekStrip`, `DayNav`, `MoveStrip`, `TaliMark`, icons | `src/ui/`, `src/styles/theme.css` | Sub-engineer **Design system** | `design` |
| N2 | **Account, consent and legal:** sign-in (email, Google), consent screen, owner check, legal documents and links, privacy sheets, delete account, export and import, the age stop | `AuthScreen.tsx`, `screens/legal/`, `data/consent.ts`, `data/account.ts`, `data/backup.ts`, `onboarding/AgeStop.tsx` | Sub-engineer **Account and consent** | `compliance`, `security-data` |
| N3 | **Sync and data:** `sync.ts` and `supabase.ts` on native (secure session storage), dirty flags, pull and push, resume after withdrawal, connection indicator, device-only data (`deviceOnly.ts`, Unload notes stay on the phone) | `src/data/`, `store/store.ts` | Sub-engineer **Sync** | `security-data` |
| N4 | **Today:** Summary, check-in (with sleep), food ask, Mind card, the one thing, low-mood banner, hard-day changes, weight sheet, weekly review and the maintenance loop | `TodayScreen.tsx`, `screens/today/`, `body/WeightSheet.tsx`, `review/WeeklyReview.tsx` | Sub-engineer **Today** | `mental-performance`, `nutrition-accuracy`, `design` |
| N5 | **Food:** add food (search, portion, quick estimate, create food, duplicates, margin), edit entry, recipes and recipe logging, "What can I make?", gentle mode, the ± margin | `FoodScreen.tsx`, `screens/food/` (except scanning) | Sub-engineer **Food** | `nutrition-accuracy`, `nutrition-db`, `design` |
| N6 | **Scanning:** barcode scan and confirm, Open Food Facts lookup, AI label reading, the shared product list | `food/ScanView.tsx`, `ScanConfirmView.tsx`, `LabelCaptureView.tsx`, `SharedProduct.tsx`, `data/products.ts`, `data/labelReader.ts` | Sub-engineer **Scanning** | `nutrition-accuracy`, `security-data`, `compliance` |
| N7 | **Train:** preview, guided player, demo player with tempo, hold timer and held clips, warm-ups, adjust, finish, manual log, log a session, add something, swaps, library, workout builder | `TrainScreen.tsx`, `screens/train/`, `core/data/media.ts` | Sub-engineer **Train** | `fitness-workouts`, `mental-performance`, `design` |
| N8 | **Plan:** the week, training plans (library, builder, details), if-then plans | `PlanScreen.tsx`, `screens/plan/` | Sub-engineer **Plan** | `fitness-workouts`, `mental-performance` |
| N9 | **Mind:** Mind page, Reset with the pacer (and reduced motion), Unload, Wind down, Get outside, weekly reflection, support | `MindScreen.tsx`, `screens/mind/` | Sub-engineer **Mind** | `mental-performance`, `compliance` |
| N10 | **Profile:** settings, targets, pillars, health answers, notifications settings, feedback, account data | `ProfileScreen.tsx`, `screens/profile/` | Sub-engineer **Profile** | `compliance`, `design` |
| N11 | **Onboarding:** the wizard, signposts, summary, Redo setup, behind `ONBOARDING_ENABLED` as on web | `screens/onboarding/` | Sub-engineer **Onboarding** | `fitness-workouts`, `nutrition-accuracy`, `mental-performance`, `compliance` |
| N12 | **Notifications:** APNs and FCM, the reminder function sending to either, the notification budget and quiet hours, supplement and weekly review reminders | `data/push.ts`, `supabase/functions/send-supplement-reminders`, `public/sw.js` (push parts) | Sub-engineer **Notifications** | `security-data`, `compliance`, `mental-performance` |
| N13 | **Recipe sharing (new, native first):** share sheet, universal and app links (association files on app.tilo.fit), the receive sheet with the acceptance clause, the ingredient check | `recipe-sharing.md` (all, §11 in particular) | Sub-engineer **Food** after N5 | `nutrition-accuracy`, `compliance`, `security-data`, `mental-performance`, `design` |

Cycle is being planned and designed for the web now; it joins native when it lands on the web,
owned by the Today and Profile sub-engineers.

## 4. Native improvement candidates (each needs a board and approval)

Only these kinds of change count as "native allows improvements": the same feature, done better
because the platform offers something the web can't. Each is drawn on the Design canvas first.

- **N0, N3:** sync in the background; storage the system won't clear; the session in secure
  storage (not a visible change: `security-data` approves, no board needed).
- **N1:** native sheets and the swipe-back gesture; haptics on key taps (a visible and felt change:
  board).
- **N6:** the platform's own barcode scanner (faster and more reliable than the web decoder).
- **N7:** native video playback. Check first: the Bunny library refuses requests with no referrer
  (CLAUDE.md), so the native player must send one, or the library setting changes; `security-data`
  decides.
- **N7:** keeping the screen awake during a guided session; a rest timer that keeps running when
  the app is in the background.
- **N12:** reminders through the system's own notifications, with the same budget and copy.
- **N13:** links that open the app directly (already decided).

New patterns that aren't on the web (widgets, Live Activities, watch faces) are not part of parity.
They follow the "no new UX pattern just to reach an outcome" rule (CLAUDE.md) and the Apple Watch
phase.

## 5. Approvals: every agent keeps its usual role

| Agent | Approves |
|---|---|
| `design` | Every screen against the Studio system and the approved boards, light and dark, before Benn or Sara see it |
| Benn or Sara | Any board, and any visible difference from the web app |
| `security-data` | Storage, auth, sessions, sync, push tokens, video access, link handling, anything touching user data |
| `compliance` | Consent, legal texts, store privacy labels and Data safety forms, new processors (Expo/EAS, Apple, Google push), anything collecting data |
| `nutrition-accuracy` | Every number on food screens through the logging path; scanning; recipe ingredient matching |
| `nutrition-db` | Food data and search behaviour |
| `fitness-workouts` | Workouts, exercises, demo players, holds, warm-ups, plans |
| `mental-performance` | All copy and anything touching wellbeing, notifications, check-ins and the Mind pillar |
| `cfo` | Running costs (EAS build minutes, device testing, developer accounts) |
| `ship-critic` | Each stream before it merges into `native`, and every build before TestFlight, Play testing or the stores |

## 6. Before the lead engineer starts

Open in `native-app-plan.md` §9, for Benn: the store name; the developer accounts are approved
(Gravita Creative Ltd) but must exist before the first TestFlight build; test devices (an iPhone
and an Apple Watch first); whether the web app keeps running alongside native; the budget.
