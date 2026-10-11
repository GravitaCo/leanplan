# Tali Plus and the native app: the upgrade package plan

**Status:** Plan, first written 11 October 2026. Nothing in it is built. It needs Benn's decisions in §10
before any build starts, and the reviews in §9 before anything ships.
**Owner:** Benn. Money: `cfo`. Legal: `compliance`. Payments, entitlements and the native data layer:
`security-data`. AI output: `nutrition-accuracy` and `mental-performance`. Every screen: `design`, then
Benn's approval on the Design canvas. Every phase: `ship-critic`.

**What Benn decided (11 October 2026):** the AI features are part of a paid upgrade package, the package
needs payment processing, and it ships as part of the native app work.

**What this plan pulls together.** It does not replace the existing specs; it sequences them into one
package and adds the two parts nobody has planned yet (native, payments):

| Area | Canonical doc | State |
|---|---|---|
| Pricing, the free/paid line, unit economics | `monetisation-plan.md` | Plan; decisions open (its §Summary) |
| AI architecture, costs, safety | `ai-platform-plan.md` | Plan; label reading built and switched off |
| "Tell Tali what I cooked" | `ai-recipe-capture.md` | Spec; local groundwork shipped |
| "What can I make?" and meal plans | `meal-suggestions-and-planning.md` | Phase 1 built (no AI) |
| Label reading | `label-scan-and-shared-products.md` | Built, deployed, off (`LABEL_SCAN_ENABLED`) |
| Native app | **this doc, §3** | Not planned before now |
| Payments and entitlements | **this doc, §4** | Not planned before now; `monetisation-plan.md` §1 confirms no payment code exists |

Figures marked **VERIFY** come from memory or from docs dated September 2026 and must be checked
against the vendor or regulator page before money or a release depends on them.

---

## 1. What goes in the package

The free/paid line is the one in `monetisation-plan.md` §4.1: what costs close to nothing stays free;
what has a per-call cost is paid. The package is called **Tali Plus** there; the name is Benn's call.

| Feature | Tier | Source spec | Why |
|---|---|---|---|
| **Tell Tali what you cooked** (describe the meal and how you made it, answer up to three questions, saved to your recipes with its nutrition, logged in one tap next time) | Plus | `ai-recipe-capture.md` | Per-call model cost |
| **Build a meal from what I have** (say or tick your ingredients, get ideas that use them, save one as a recipe) | Plus for AI ideas; free for ideas from your own recipes and the Tali library | `meal-suggestions-and-planning.md` §2, Phase 3 | Ideas from stored recipes cost nothing and work offline |
| **Type or say a meal to log it** ("two eggs and toast") | Plus | `ai-platform-plan.md` §1 A | Per-call cost |
| **Read a nutrition label from a photo** | Plus, or free (decision 4) | `label-scan-and-shared-products.md` | Benn made it free on 26 Sept 2026; on native it can run on the phone at no cost (§3.4), which keeps it free |
| **AI meal plan for a few days, with a shopping list**, built from onboarding answers (goal, diet, allergies, time to cook) | Plus | `meal-suggestions-and-planning.md` §3, `monetisation-plan.md` §4.2 | Each generation is a paid call |
| Meal plans you build yourself, the shopping list from them, built-in plans and guides | **Free** | `monetisation-plan.md` §4.2 | "Pay to see a plan" is the most resented pattern in the category |
| Weekly AI reflection | Plus, later | `ai-platform-plan.md` §1 C | Per-call cost |
| Everything logged today, sync, export, offline, demo clips, safety content | **Free forever** | `monetisation-plan.md` §4.1 | Never paywalled |

**One rule carries over unchanged, and it shapes how the AI features feel.** The model turns words into
ingredients and amounts and matches them to Tali's sourced food database. **The numbers always come
from the database, never from the model** (`ai-platform-plan.md` §0 and §4.2 item 4). An ingredient
the database doesn't have becomes a question or a custom food, never a model estimate. Changing that
would change a core rule and needs `nutrition-accuracy` and Benn to decide it explicitly (decision 9).

**The user always confirms before anything is saved** (`ai-platform-plan.md` §0.3). The AI proposes a
recipe or a log entry; one tap accepts it; every line can be corrected.

### 1.1 How the two AI flows Benn described work

**Tell Tali what you cooked** (one action, from Food):

1. The user taps the action and types or says: "Chicken curry, four portions. 600 g chicken thighs, a
   tin of coconut milk, an onion, two tablespoons of oil, half a jar of Patak's tikka paste."
2. The server sends only that text to the model, which returns structured items
   (`{phrase, quantity, unit}`) and candidate questions. No name, email or history is sent.
3. `core/` matches each item to the database, computes the totals and the ± margin, and ranks the
   questions by impact. At most three are asked, one at a time; oil and butter are always confirmed
   if not stated. Relaxed accuracy mode asks nothing; gentle mode never shows calories.
4. The user sees the name, servings and per-serving result, adjusts any line, and saves. It lands in
   their recipes (`source: 'conversation'`) and can be logged straight away.
5. Next time, "had my curry" resolves on the phone with no model call and no cost.

**Build a meal from what I have:**

1. The user ticks what's in the kitchen (chips pre-filled from recent logs and recipes; staples
   assumed) or says it ("chicken, rice, peppers, a tin of tomatoes").
2. Free path first: their own recipes and the Tali library, ranked on the phone by what they have,
   what's left of today's range, time to cook and diet filters. Works offline.
3. Plus path: "More ideas" asks the model for two or three meals using those ingredients. Each idea
   comes back as ingredients and steps; `core/` matches the ingredients and computes the numbers.
   Shown as "An idea from Tali AI"; saving it makes it a recipe like any other.

**Hard filters never bend:** allergies and dietary choices exclude a recipe or idea outright. Allergy
filtering is a safety feature, so it ships only once allergen data exists per ingredient
(`meal-suggestions-and-planning.md` §6, decision 3); until then AI ideas carry a plain "check
ingredients for allergens" line and the allergy filter is not offered as a promise.

---

## 2. Why native, and what native changes

Benn wants the package to ship with the native app. That reverses the earlier recommendation in
`monetisation-plan.md` §10 ("stay web-first for payments until a native app earns its keep"), so the
cost of that choice should be explicit:

**What native gains:**
- App Store and Play Store discovery and trust; the PWA install step on iOS is a known drop-off.
- On-device text recognition (Apple Vision, Google ML Kit) for label reading and voice dictation at no
  per-call cost (`label-scan-and-shared-products.md` §2, `ai-platform-plan.md` §2).
- Reliable push (APNs and FCM) and native storage that iOS does not clear the way it can clear web
  data for a site that hasn't been opened in a while (**VERIFY** current WebKit eviction rules).
- Later: HealthKit and Health Connect (steps, workouts, weight). That is new data and a compliance
  change in its own right (§6), not part of the first release.

**What native costs:**
- **Store fees.** Apple's Small Business Program takes 15% (under $1M proceeds); Google Play
  subscriptions take 10% plus a 5% billing fee in the UK, EEA and US from 30 June 2026
  (`monetisation-plan.md` §2.3, sources S12, S13; **VERIFY**). Net per payer drops from £3.15 (web,
  Stripe, VAT-registered) to about £2.83 through the App Store (`monetisation-plan.md` §2.3).
- **Apple Developer Program** $99 a year; Google Play $25 once (`monetisation-plan.md` §2.1).
- **Release cadence.** Today a push to `main` is live in minutes. Store builds go through review
  (typically a day or two; **VERIFY**). §3.6 covers how to keep fixes fast.
- **More to keep in sync:** three surfaces (web, iOS, Android) and three payment channels.

**Recommendation:** go native, but keep the web app live and keep web sign-up and web payments, so
users who never install from a store can still subscribe and the PWA keeps working offline as today.

---

## 3. The native app

### 3.1 Approach: Capacitor around the existing React app

Two realistic routes. Measured from the repo on 11 October 2026:

| | Capacitor (wrap the current React + DOM app in a native shell) | React Native (rewrite the UI in native components) |
|---|---|---|
| Reused as is | `core/` (≈50,700 lines), `data/` (≈3,200), `store/` (≈2,400), **and** `screens/`, `ui/`, `styles/` (≈16,200) | `core/`, most of `data/` and `store/` |
| Rewritten | Nothing; platform modules swapped behind interfaces (§3.2) | All of `screens/`, `ui/`, `styles/` (≈16,200 lines) and the Studio design system in RN styling |
| One codebase for web and native | Yes | No (or React Native Web, a second rewrite risk) |
| Feel | Web view; good with care (scroll, keyboard, safe areas) | Native controls |
| Time to a store build | Weeks | Months |

**Recommendation: Capacitor.** The architecture was built for this (`CLAUDE.md`: core kept free of
React and the DOM "so a future React Native / Capacitor build can reuse it"), and Capacitor reuses
the whole app, not just the core. Revisit React Native only if store review or user testing shows the
web view is not good enough.

**App Store risk to manage:** Apple rejects apps that are a thin wrapper around a website (Guideline
4.2, minimum functionality; **VERIFY** current wording). Tali bundles its code and runs offline, and
the first native build should use native features that justify it: native push, on-device label
reading, Sign in with Apple, and in-app purchase.

### 3.2 What changes module by module

The rule from `CLAUDE.md` holds: platform code lives behind small interfaces in `data/` (and the camera
in `screens/food/camera.ts`); `core/` doesn't change. Each row below is one adapter with a web and a
native implementation, picked at start-up.

| Area | Web today | Native | Notes |
|---|---|---|---|
| Local store (`persistence.ts`) | `localStorage`, key `leanplan.v1` | A native key-value or SQLite store | **The key name `leanplan.v1` and the data shape stay exactly the same** (`CLAUDE.md`). A user who moves from the PWA to the app signs in and syncs; there's no on-device migration between them (separate storage), so the first native sign-in must run the same owner check (`ownerCheck`) and sync as a new device does today. |
| Device-only data (`deviceOnly.*`: unload notes, reminder log) | `localStorage` | Same native store | These never sync, so moving from the PWA to the app leaves them behind. Say so in the "moving to the app" help text, and offer the JSON export (`backup.ts`), which already includes them. |
| Push (`push.ts`) | Web Push (VAPID) | APNs (iOS) and FCM (Android) via a push plugin | The reminder functions (`send-supplement-reminders` and the generalised one) gain a second sender. Payloads stay the fixed, health-free text recorded in the register. New device-token storage needs `security-data` and the register. |
| Camera and barcode (`camera.ts`, `barcodeDecoder.ts`) | `getUserMedia`, `barcode-detector`, `zxing-wasm` | Native camera and barcode plugin | Faster and more reliable than the web path on iOS. |
| Label reading (`labelReader.ts`) | Photo to the `ai-read-label` function (Anthropic) | On-device text recognition, then a table parser in `core/` | Free and offline; the photo never leaves the phone. Keeps the server path as a fallback. |
| Voice input | None | On-device speech recognition | Feeds the same text path as typing. Needs microphone and speech permissions with specific purpose strings. |
| Sign-in (`AuthScreen.tsx`) | Email and password, Google OAuth by redirect | Same, with native deep links for the OAuth return and password-reset links; **add Sign in with Apple** | Apple requires an equivalent privacy-focused login option when an app offers a third-party login such as Google (Guideline 4.8; **VERIFY**). Sign in with Apple is a new identity provider and a register change. |
| Demo clips (Bunny Stream) | Plays because the browser sends the `app.tali.fit` referrer | **Will be refused** unless fixed | The library refuses requests with no referrer (`core/data/media.ts`). A native web view's origin is `capacitor://localhost` or `https://localhost`. Add the app origins to Bunny's allowed referrers, or switch to signed URLs (token authentication). Test on a device before release. |
| Service worker (`public/sw.js`) | Caches the shell for offline | Not used | Assets are bundled in the app, so offline works without it. The web build keeps it. |
| Fonts (Geist, bundled) | `public/fonts/` | Bundled the same way | No change. |
| Links out (legal pages, "Watch how to do it") | New tab | In-app browser | |
| Account deletion (`account.ts`) | In Profile | Same | Apple requires in-app account deletion for apps with sign-up (Guideline 5.1.1(v); **VERIFY**). Already built. The flow must also explain how to cancel a store subscription, because deleting the account doesn't cancel it (§4.5). |

### 3.3 Repo and build

- Add Capacitor to this repo (an `ios/` and an `android/` project beside `src/`), building from the same
  `dist/`. One codebase, one test suite.
- A `platform` flag at start-up chooses the adapters in §3.2. Feature flags (`LABEL_SCAN_ENABLED`,
  `ONBOARDING_ENABLED`, the new `PLUS_ENABLED`) work the same way on every surface.
- CI: `checks.yml` gains a native build job (Android on Linux runners; iOS needs macOS runners or a
  build service such as Xcode Cloud or Codemagic; cost is decision 12).
- Signing keys and store credentials live in CI secrets only, never in the repo.

### 3.4 Native-only quality work

- Safe areas, the keyboard pushing content up, the iOS swipe-back gesture, status-bar colours following
  light and dark (the app always follows the device appearance), haptics on key taps.
- Performance on older phones: the food database search and the guided player are the heaviest screens.
- Accessibility: Dynamic Type and VoiceOver/TalkBack checks on every screen.

### 3.5 Store listings

App name, subtitle, keywords, screenshots and preview video go through `design` and Benn. Health and
fitness category. The listing makes **no medical claims** (MHRA intended-purpose rule;
`ai-platform-plan.md` §4.1). Age rating 18+ to match Tali's minimum age (Benn, 28 Sept 2026).

### 3.6 Keeping releases fast

Store review means a fix can't go live in minutes. Options: keep the web app as the fastest channel;
add over-the-air updates for web-layer code (Capacitor live-update services exist; Apple allows
interpreted code updates that don't change the app's primary purpose, **VERIFY** current guideline
3.3.1(B)/4.7 wording); and keep data changes (foods, exercises) shipping in the app bundle with each
release as today. `ship-critic` stays the gate for every channel.

---

## 4. Payments and entitlements

### 4.1 Three channels, one entitlement

| Channel | Who pays | Fee (`monetisation-plan.md` §2.3, **VERIFY**) | Required? |
|---|---|---|---|
| iOS in-app purchase (StoreKit) | Apple | 15% (Small Business Program) | **Yes** for anything bought inside the iOS app: Apple requires in-app purchase for digital subscriptions sold in the app (Guideline 3.1.1). UK steering rules were still undecided by the CMA in mid-September 2026 |
| Google Play Billing | Google | 10% + 5% billing fee | Yes for purchases inside the Android app (with exceptions in some regions; **VERIFY**) |
| Web (Stripe) | Tali (Gravita, or a new company: decision 2) | 1.5% + 20p and 0.7% Billing for UK cards | For web sign-ups; cheapest channel |

A subscription bought on any channel unlocks Plus everywhere the user signs in. Apple allows an app to
give access to a subscription bought elsewhere (Guideline 3.1.3(b), multiplatform services) as long as
it is also offered by in-app purchase in the app (**VERIFY**). What the iOS app may say about the
cheaper web price depends on the steering rules in force at launch (`monetisation-plan.md` §10):
plan for the strictest case (no link out) and relax it if the CMA's decision allows.

### 4.2 Entitlement layer: RevenueCat (recommended) or our own

| | RevenueCat | Our own (Supabase + store server APIs + Stripe webhooks) |
|---|---|---|
| Receipt validation, renewals, refunds, grace periods, family sharing | Handled | We build and maintain each, per store |
| Stripe web subscriptions in the same entitlement | Supported | We merge three sources ourselves |
| Cost | Free to $2,500 monthly tracked revenue, then 1% (`monetisation-plan.md` S14, **VERIFY**) | Engineering time; ongoing maintenance as store APIs change |
| New processor | Yes (§6) | No new processor beyond Stripe, Apple, Google |

**Recommendation: RevenueCat.** At Tali's scale it costs nothing until about $2,500 a month of revenue
and removes the riskiest code (store receipt handling). It must not become the source of truth on its
own; see §4.3.

### 4.3 The source of truth is our server

- A new table, **`entitlements`** (one row per user: `plan`, `status`, `expires_at`, `channel`,
  `updated_at`). **Written only by a server-side webhook function** (RevenueCat and Stripe webhooks,
  signature checked). The app can read its own row (RLS: `auth.uid()`); it can never write it.
- **Every AI Edge Function checks the entitlement server-side** before calling the model, next to the
  existing consent check and daily caps in `ai_usage_take`. The client-side flag only decides what to
  show; it is never trusted to unlock a paid call.
- **Offline:** the app caches the entitlement with its expiry, so Plus screens render offline. AI
  features need a connection anyway; everything free works offline exactly as today.
- **Lapse is graceful.** When Plus ends, recipes made with AI stay the user's (they are ordinary
  recipes); logging them is free. Only new AI calls stop. Nothing the user created is locked.
- RLS stays locked: the webhook uses the service role inside the function only; no client path gets
  service-role access (`docs/security-rls.sql`).
- `entitlements` joins `USER_TABLES` in `supabase/functions/_shared/account.ts`, with one caveat:
  payment and invoice records may need keeping for tax (HMRC: 6 years, **VERIFY**). Keep those with the
  payment provider (Stripe, Apple, Google hold them), not in our database, so account deletion can
  still delete everything of ours.

### 4.4 Trial, prices and fair billing

From `monetisation-plan.md` §4.4 and §5.1, still Benn's decisions (§10):

- **Price:** £4.99 a month or £39.99 a year (or £5.99 / £44.99 if AI costs need it). Whether store prices
  match web prices or carry the store fee is decision 6.
- **Trial:** 14 days, no card, recommended. On iOS and Android a no-card trial means the trial is ours
  (an entitlement row with an expiry), not the store's free-trial offer, which needs payment details
  (**VERIFY** per store). That's simpler and can't surprise-bill anyone.
- **Fair use:** a published monthly limit on AI calls, stated up front, enforced by the existing
  `ai_usage` caps. Repeat meals never count (they resolve on the phone).
- **Cancel in one tap, pause beside it** (never in front), and a non-renewing annual pass. On iOS and
  Android, cancelling happens in the store's subscription settings; the app links straight there.
- **DMCC subscription rules** (`monetisation-plan.md` §10 gives January 2027; **VERIFY** the date):
  reminder before renewal, easy cancellation, cooling-off. Build to them from day one.
- **No lifetime deals** on anything with AI (`monetisation-plan.md` §4.4).

### 4.5 Account and subscription edge cases (each needs a test)

- Deleting the account doesn't cancel a store subscription: the delete flow says so and links to the
  store first. (Apple and Google bill the user, not us.)
- A user subscribed on iOS opens the web app: Plus works; "Manage subscription" says "Manage in the App
  Store".
- Two accounts on one device, and the owner check (`ownerCheck`): an entitlement belongs to the account,
  never to the device.
- Refunds and chargebacks: the webhook ends the entitlement; recipes stay.
- Restore purchases button (Apple requires one; **VERIFY**).
- Family Sharing on iOS: on or off (decision 7).

---

## 5. The AI side of the package

### 5.1 Build order inside Plus

| Step | What | AI? | Spec |
|---|---|---|---|
| 1 | "Tell Tali what you ate" field on Food that resolves names locally (`findRecipe`) | No, free | `ai-recipe-capture.md` §7.1 |
| 2 | **Tell Tali what you cooked**: `ai-parse-meal` function, database matching, one question | Yes | `ai-recipe-capture.md` §7.2 |
| 3 | Up to three impact-ranked questions, aliases learned, "save these as a recipe?" nudge | Yes | `ai-recipe-capture.md` §7.3 |
| 4 | Voice input (on-device on native) into the same text path | No per-call cost on native | `ai-recipe-capture.md` §7.4 |
| 5 | Tali recipe library (start with 50 simple UK meals) | No, free | `meal-suggestions-and-planning.md` Phase 2 |
| 6 | **Build a meal from what I have**: AI ideas, reusing the step 2 pipeline | Yes | `meal-suggestions-and-planning.md` Phase 3 |
| 7 | **AI meal plan for a few days + shopping list**, seeded from onboarding answers | Yes | `meal-suggestions-and-planning.md` §3 |
| 8 | Weekly AI reflection | Yes (batch) | `ai-platform-plan.md` §1 C |

Steps 1 and 5 are free and can ship to the web app before native; they make the paid steps better.

### 5.2 Onboarding feeds the plans

Plans and guides "based on onboarding" need the onboarding wizard on (`ONBOARDING_ENABLED` is off; its
open review items are in `docs/compliance/README.md`, "onboarding wizard review"). The meal plan uses
only goal, diet, allergies, cooking time and household size, and the calorie and protein ranges `core/`
already computes. The model receives the ranges and preferences, **not** weight, body measurements or
check-in data (data minimisation, `ai-platform-plan.md` §5). Gentle mode removes calorie numbers from
the plan.

### 5.3 Cost per payer

From `ai-platform-plan.md` §3.3 (prices checked September 2026, **VERIFY**): a heavy user costs about
$1.20 to $4.00 a month depending on the model mix. At an App Store net of about £2.83 a month, an
all-Opus heavy user loses money. Before launch: run the eval harness (not built yet;
`ai-platform-plan.md` §6) to pick the cheapest model that holds quality per task, set the fair-use
limit, and confirm `cfo` signs off the margin per channel.

### 5.4 Safety

Unchanged from `ai-platform-plan.md` §4: AI disclosure on every surface, wellness scope only, no
calorie floors breached, disordered-eating language checks with UK signposting, gentle mode respected,
confirmation before writes, 18+. Every AI feature goes past `mental-performance` for tone and
`nutrition-accuracy` for the numbers.

---

## 6. Legal and compliance (all before launch)

Every row is a change to what data is collected, where it goes or who processes it, so each updates the
privacy policy (`src/core/legal/`) and the register (`docs/compliance/README.md`) in the same change, and
goes past `compliance` (`CLAUDE.md`).

| Item | Why | Status |
|---|---|---|
| Anthropic DPA, transfer mechanism (IDTA) and TIA, zero data retention per model, privacy section, DPIA update | Meal text and plans go to Anthropic; register item 24 already lists these for label reading | Open |
| Separate AI consent on native, specific about what is sent | UK GDPR Art. 9 explicit consent; Apple requires apps to disclose and get permission before sharing personal data with third-party AI (June 2026 guidelines, `ai-platform-plan.md` §5; **VERIFY**) | `ai` consent exists (`consent.ts`), row hidden behind `AI_FEATURES_LIVE` |
| New processors: RevenueCat, Stripe; Apple and Google as payment providers | Payment and purchase data | New |
| Sign in with Apple | New identity provider | New |
| APNs and FCM device tokens | New identifiers | New |
| `entitlements` table | New user-data table: RLS, `USER_TABLES` | New |
| Subscription terms in `terms.ts`: price, renewal, cancellation, refunds, the "On your side" promise if adopted | Consumer law, DMCC | New |
| Company and VAT: which entity sells (decision 2) | Controller name in the policies; VAT changes net receipts by up to 17% | Open |
| App Store privacy labels and Google Play Data safety form | Required for listing; must match the privacy policy | New |
| HealthKit / Health Connect (later release only) | Health data from the OS, with its own store rules (no use for advertising, purpose strings) | Not in v1 |
| MHRA: listing and in-app copy make no diagnostic or treatment claims | Intended purpose decides device status | Ongoing |
| EU AI Act Art. 50 disclosure for EU users | AI interaction disclosed at first contact | In `ai-platform-plan.md` §4.1 |
| `npm run check:legal` passes | Required before merge to `main` | Gate |

---

## 7. Phased roadmap

Each phase is `ship-critic` reviewable and shippable on its own. Design boards go to Benn before build.

| Phase | Scope | Ships to | Gate |
|---|---|---|---|
| **0. Groundwork** (no user-visible change) | Decisions in §10; company and VAT; Anthropic DPA and zero retention; DPIA; eval harness; `entitlements` table and webhook design reviewed by `security-data` | Nothing live | Compliance items in §6 started; `cfo` margin per channel |
| **1. Free foundations on the web** | "Tell Tali what you ate" local name field; recipe library (50 meals, `check:recipes`); onboarding wizard on | Web | `nutrition-accuracy`, `design`, Benn |
| **2. Native shell** | Capacitor iOS and Android builds; adapters in §3.2 (storage, push, camera, deep links, Sign in with Apple, Bunny referrers); internal TestFlight and Play internal testing | Testers only | Device test matrix; `security-data` on storage and tokens |
| **3. Payments** | RevenueCat + StoreKit + Play Billing + Stripe web; `entitlements` webhook; trial, cancel, pause, restore; Plus paywall screens | Testers, sandbox purchases | Every §4.5 case tested; `compliance` on terms; `cfo` |
| **4. AI in Plus** | Tell Tali what you cooked (steps 2 to 4); on-device label reading; voice | Testers, then launch | Evals pass; `mental-performance`, `nutrition-accuracy`; all §6 items closed |
| **5. Launch** | Store listings, review submission, web pricing page, founding-member offer | App Store, Play, web | `ship-critic` SHIP on each channel; `check:legal` |
| **6. More Plus** | Build a meal from what I have; AI meal plan + shopping list; weekly reflection | All | Per-feature reviews |
| **Later** | HealthKit / Health Connect; Coach plan (`monetisation-plan.md` §5.2) | | New compliance review |

Phases 1 and 2 can run in parallel. Phase 4 can't launch before Phase 3 (no way to pay) and before
the §6 compliance items are closed (no lawful way to send meal text to Anthropic).

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Apple rejects the app as a web wrapper (4.2) | Native push, on-device label reading and voice, Sign in with Apple, in-app purchase, offline-first; a pre-submission review against the guidelines |
| AI cost per heavy user exceeds the App Store net | Evals pick the model; fair-use limit; repeat meals free; price at £44.99 if needed (`monetisation-plan.md` §5.1) |
| Three payment channels drift out of sync | One server-side `entitlements` row written only by webhooks; RevenueCat as the aggregator |
| Users lose device-only notes moving from the PWA to the app | Clear help text and the JSON export (§3.2) |
| Demo clips fail in the app (Bunny referrer) | Allowed referrers or signed URLs, tested on devices in Phase 2 |
| Slower releases through store review | Web stays the fast channel; over-the-air web-layer updates where the guidelines allow |
| Steering rules change after launch (UK CMA, US courts, EU fees) | Build for the strictest case; revisit when decisions land (`monetisation-plan.md` §10) |
| Paywalling something people rely on causes resentment | The free line in §1 never moves backwards; lapse keeps everything the user made |
| AI says something unsafe about food or bodies | `ai-platform-plan.md` §4 guardrails; `mental-performance` review; output checks in the function |

---

## 9. Reviews this plan needs before Phase 0 ends

- `cfo`: margin per channel at the chosen prices and model mix; RevenueCat versus our own; price parity.
- `compliance`: §6 list complete; consent copy for native; subscription terms; entity and VAT.
- `security-data`: `entitlements` table and webhook; native storage; device tokens; Bunny tokens.
- `design`: paywall, trial, manage-subscription and the two AI flows as Design canvas boards for Benn.
- `mental-performance`: paywall copy (no pressure, no shame), AI tone, plan framing.
- `nutrition-accuracy`: recipe library, AI ideas pipeline, the numbers-from-the-database rule.

---

## 10. Decisions for Benn

1. **Approve the package contents and the free line** in §1 (from `monetisation-plan.md` §4.1).
2. **Which company sells, and is it VAT-registered?** (`monetisation-plan.md` decision 2.) Blocks Stripe,
   the store accounts and the policies.
3. **Capacitor (recommended) or React Native** (§3.1).
4. **Label reading: free or Plus?** It was made free on 26 Sept 2026; on-device reading on native costs
   nothing, which supports keeping it free.
5. **Price points:** £4.99 / £39.99, or £5.99 / £44.99.
6. **Store prices:** same as web (we absorb the store fee), or higher in the stores?
7. **Trial:** 14 days with no card (recommended) or the stores' card-on-file trials; Family Sharing on iOS.
8. **RevenueCat (recommended) or our own entitlement service** (§4.2).
9. **Keep "numbers only from the database, never from the AI"** (recommended), or allow AI estimates for
   unknown ingredients with a wide ± margin?
10. **Package name:** Tali Plus, or another.
11. **Start the Anthropic DPA and zero-retention request now.** It gates every AI feature, label reading
    included, and it sits with the controller.
12. **CI for iOS builds:** macOS runners or a build service (a running cost; `cfo`).
13. **Web stays live after native launch** (recommended), and web sign-up and payment stay available.

---

## Changelog

- 11 October 2026: first written, from Benn's brief (AI meal capture in two versions, meal plans from
  onboarding, AI in a paid upgrade with payment processing, shipped with the native app).
