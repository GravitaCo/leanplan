# Native app plan: iOS and Android, wearables, micro animations, AI

Started 10 Oct 2026 at Benn's request. Status: **draft for Benn**; nothing is built. Labels: **[E]**
checked against a source, **[I]** inference, **[G]** judgement call.

## 0. Decisions so far (Benn, 9 to 10 Oct 2026)

1. **Native apps for iPhone and Android**, from one codebase, alongside the web app.
2. **Must have:** micro animations, wearable data, AI processing.
3. **Wearables order:** Apple Watch first, then Fitbit.
4. **The stack stays:** Supabase (Postgres, auth, row-level security, edge functions, on AWS
   eu-west-1) and the current hosting. No move to MongoDB or a separate AWS setup (see section 10).

## 1. Framework: React Native with Expo

| Option | Fit for Tali | Why not / why |
|---|---|---|
| **React Native + Expo** (recommended) | Mature HealthKit and Health Connect libraries; Reanimated runs animation on the UI thread; native modules for on-device AI; reuses `src/core/` (TypeScript, no React DOM) | Every screen is rebuilt in native components |
| Capacitor | Fastest to the stores: the current app in a native shell | Wearables, background sync and on-device AI all become custom Swift and Kotlin; animation runs in a web view |
| Flutter | Strong animation | A full rewrite in Dart; nothing reused |

[G] Wearables decide it: HealthKit and Health Connect are native-only APIs, and background delivery
of new data needs native code whichever framework is used. Expo keeps the native parts in managed
config plugins and builds in the cloud (EAS), so no one needs to maintain Xcode projects by hand.

## 2. Architecture

- **One repo.** A new `apps/native` Expo app beside the web app. `src/core/` (domain logic: the
  maintenance loop, targets, the training engine, food data) is shared as it is; CLAUDE.md already
  keeps React and the DOM out of it for this reason.
- **Data layer adapters.** `src/data/` uses `localStorage`, `fetch` and Web Push. Native gets
  adapters behind the same interfaces:
  - **Storage:** SQLite (or MMKV) instead of `localStorage`. iOS can clear a web view's storage under
    pressure; a native store doesn't. The saved shape and the `leanplan.v1` meaning are kept, so a
    backup or a sync moves between web and native unchanged.
  - **Sync:** unchanged (`sync.ts`, per-record dirty flags, last write wins, RLS on the server).
  - **Auth:** supabase-js with the session in the device's secure storage; Google sign-in through a
    native flow and deep links.
- **Offline-first stays the rule:** the app opens, logs and saves with no connection. Files ship
  inside the app, so there's no service worker on native.
- **Design system:** the Studio tokens (`theme.css`) become a shared token file that the web CSS and
  the native styles both read, so the two can't drift. Geist is bundled in the app.
- **Push:** reminders move from Web Push to Apple's and Google's push services (APNs, FCM) on
  native. `send-supplement-reminders` sends to whichever a subscription is; the web keeps Web Push.

## 3. Wearables

### 3.1 Apple Watch (first)

- Read through **HealthKit on the iPhone** with `@kingstinct/react-native-healthkit` (Expo config
  plugin, needs a development build) [E: package docs]. A watchOS app is not needed to read the data;
  an on-wrist app (start a session, log a check-in) would be a later, separate project.
- **Read only what a feature uses** (data minimisation). Proposed first set, each needing a product
  decision and the specialists below:

| HealthKit data | What Tali would do with it | Owner to agree |
|---|---|---|
| Workouts (type, duration, energy) | Appear as sessions in Move, no double logging | fitness-workouts |
| Steps | Daily movement, in place of the onboarding steps band | nutrition-accuracy |
| Sleep (duration, stages) | Context beside the check-in's sleep answer, never instead of the person's own answer | mental-performance |
| Resting heart rate, HRV | Recovery context for the training engine's day-of options | fitness-workouts, mental-performance |
| Body weight | Weigh-ins from a smart scale, only behind the weight opt-in (ml-c4) | nutrition-accuracy |

- **Active energy from a watch is not added to the food range by default.** Wearable calorie burn
  has large errors; `nutrition-accuracy` decides if and how it can count (CLAUDE.md: never invent
  values; the ± margin model).
- **Background delivery** so new workouts and sleep arrive without opening the app [I].

### 3.2 Fitbit (second)

- **The Fitbit Web API is being switched off: support ended 30 Sept 2026, shutdown on 30 Oct 2026**,
  and new registrations have closed [E: Google Health release notes; Validic, Terra]. We build
  straight on its replacement, the **Google Health API** (cloud REST, Google OAuth). Each person
  connects with Google sign-in; tokens can't be migrated silently [E].
- Server side: an edge function holds the OAuth tokens and pulls data, so the phone never stores
  them. Tokens are secrets: `security-data` reviews the design.
- **Android shortcut:** Fitbit can sync into Health Connect, so Android users may get Fitbit data
  through Health Connect with no Fitbit-specific work [I: check on a device].

### 3.3 Android generally

- **Health Connect** through `react-native-health-connect` (Expo plugin) [E: package docs]. Google
  requires a declaration for each permission, with a reason, before release.

## 4. Micro animations

- **Reanimated** for motion on the UI thread, plus **haptics** for confirmations (a set logged, a
  check-in saved).
- **Rules** [G, for `design` and Benn]: short (150 to 300 ms), purposeful (they show a change of
  state, never decorate), and always respect the system "Reduce motion" setting. Never celebratory
  around weight or calories, never a streak flourish (mental-performance rules).
- **Design first:** motion goes on the Design canvas as boards (or short screen recordings) for Benn
  to approve before it's built, like any visual change.

## 5. AI processing

- **Cloud AI** follows `docs/plans/ai-platform-plan.md`: the app calls our edge function, which
  calls Anthropic, with the AI consent (`consents` type `ai`, built, currently switched off), daily
  limits and the safety guardrails in its section 4. The framework doesn't change this.
- **On-device AI** keeps data on the phone and costs nothing per call:
  - **iOS:** Apple's Foundation Models framework (on-device model; iOS 26, Apple Intelligence
    devices only, iPhone 15 Pro and later) [I: check the device list and terms].
  - **Android:** on-device options are uneven across devices [I]; plan for cloud as the default there.
  - **Speech** (voice logging): on-device recognition on both platforms (ai-platform-plan phase 3).
- **Rule** [G]: on-device first where it's good enough; cloud only with the AI consent. Every AI
  feature passes the ai-platform-plan quality gates (section 6) before shipping.

## 6. Compliance (goes past `compliance` before any build that collects new data)

- **New health data:** HealthKit, Health Connect and Google Health data are special-category data
  under the existing explicit consent; the privacy policy, register and DPIA list each type read.
- **Apple's HealthKit rules:** HealthKit data can't be used for advertising or sold, and the app must
  have a privacy policy and explain each permission [I: App Store Review Guidelines 5.1.3; check the
  current text].
- **Google:** the Health Connect permissions declaration; the Google Health API's own terms and
  verification for its OAuth scopes [I].
- **New processors:** Apple (APNs) and Google (FCM, Google Health API); Anthropic for cloud AI,
  already in the AI plan. Each one is added to the policy, the register and `USER_TABLES` if a new
  table is involved (Fitbit tokens would be one: `security-data` and the delete-account function).
- **Store disclosures:** Apple's privacy labels and Google Play's Data safety form; account deletion
  in the app (built).
- **Age:** 18+ as now; the store age ratings set to match.

## 7. Testing

| Layer | How |
|---|---|
| Shared logic | `npm test` as now (`src/core/` is unchanged) |
| Screens | React Native Testing Library for components; Maestro scripts through the real app (sign up, log a meal, open the review) |
| Layout and modes | iOS Simulator and Android Emulator: safe areas, light and dark, small and large phones |
| Wearables | Real devices only: an Apple Watch paired to an iPhone; an Android phone with Health Connect; a Fitbit. Simulators only take hand-entered Health data |
| Animation | A low-end Android phone and an older iPhone, with Reduce motion on and off |
| AI | Fixed test sets per feature and the ai-platform-plan quality gates |
| Testers | iOS: TestFlight (external testers need a short Apple beta review). Android: Play internal testing, then closed testing; new personal developer accounts need a closed test (about 12 testers for 14 days) before production [I: check when registering; an organisation account may differ] |
| Every push | GitHub Actions builds both apps through EAS; testers always have the branch build |
| Before release | `ship-critic` on the release build, as for the web |

## 8. Phases

| Phase | What | Exit |
|---|---|---|
| 0. Spike (about 2 weeks) | Expo app reusing `src/core/`; native storage adapter; sign-in; the Summary screen rebuilt; one HealthKit read (sleep, steps, workouts) on a real iPhone with an Apple Watch; one micro animation; one on-device AI call | Benn tries it on his phone; a measured estimate for the full rebuild |
| 1. Parity | Every screen rebuilt to the approved boards; sync, push (APNs/FCM), offline; TestFlight and Play internal testing | The native app does everything the web app does |
| 2. Apple Watch | The agreed HealthKit types (section 3.1), background delivery, compliance changes | Approved by the specialists; in TestFlight |
| 3. Store launch | Store listings, privacy labels, Data safety, review submissions | Live in both stores |
| 4. Fitbit | Google Health API connection through an edge function; Health Connect on Android | Live |
| 5. AI features | In ai-platform-plan order, on-device first | Each passes its quality gate |

Micro animations run through phases 1 to 3, board by board.

## 9. Decisions for Benn

1. **Store name:** "Tali" clashes in the stores (a different "Tali" medical app appeared when a tester
   searched, 9 Oct). A distinct listing name, and a trademark check, before submission.
2. **Developer accounts** under Gravita Creative Ltd: Apple Developer Program (about $99 a year) and
   Google Play (about $25 once) [I: check current prices].
3. **Test devices** to have: an Apple Watch and iPhone, a low-end Android phone, a Fitbit.
4. **Which HealthKit data** to read first (section 3.1), with the owners named there.
5. **Watch calories:** whether workout energy from a watch may ever widen the food range
   (`nutrition-accuracy` to advise).
6. **The web app:** kept running alongside native for good, or retired once native is in both stores.
7. **Budget:** EAS build minutes, a device cloud (for example BrowserStack) for phones we don't own,
   and AI costs per the ai-platform-plan (`cfo` to cost).

## 10. Why the database and hosting stay (decided 10 Oct)

Supabase already runs on AWS (`eu-west-1`). Moving to MongoDB would mean rebuilding the per-row
privacy locks (Postgres row-level security has no direct MongoDB equivalent), the server-side
health-consent rules and purge (written in SQL), sign-in, sync, account deletion and the reminders
function, and redoing the privacy policy, register and DPIA. Our data is relational, which suits
Postgres; loosely shaped data already sits in JSON columns. If scale or a contract ever required it,
the usual step would be AWS's own Postgres service, not a different database type.

## 11. Reviews this plan needs

`compliance` (sections 3, 5, 6), `security-data` (auth, token storage, Fitbit tokens, storage
adapter), `nutrition-accuracy` (steps, watch calories, weigh-ins), `fitness-workouts` (workouts,
recovery signals), `mental-performance` (sleep data beside the check-in, motion, AI tone), `design`
(native components, motion), `cfo` (costs), then `ship-critic` before anything reaches the stores.

## Sources

- Google Health API release notes (Fitbit Web API support end and shutdown dates):
  https://developers.google.com/health/release-notes
- Validic, Fitbit to Google Health API developer transition guide:
  https://help.validic.com/space/VCS/5513478151/Fitbit+to+Google+Health+API+Developer+Transition+Guide
- Terra, Fitbit API migration: https://tryterra.co/blog/fitbit-api-shutdown-september-2026-migration
- `@kingstinct/react-native-healthkit`: https://classic.yarnpkg.com/en/package/@kingstinct/react-native-healthkit
- `react-native-health-connect`: https://github.com/matinzd/react-native-health-connect/wiki
- AI platform plan: `docs/plans/ai-platform-plan.md`
