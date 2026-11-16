# Monetisation plan: a path to financial stability and profit

Owner: CFO agent. First written 24 September 2026 for the web app; rewritten 16 November 2026 for
the native app at Benn's request: "Now we have the native app in development we need to build out a
plan to financial stability and profit in the app."

**How to read the numbers.** Every figure is one of three things: measured from this repo, cited
from a source (URL and date checked in §13), or marked **ASSUMPTION** with a range and the
reasoning. "Unknown" means nobody has measured it; the doc says what would find out. "Quote needed"
means only Benn can replace the figure, by asking a supplier. Vendor terms were re-checked on
16 November 2026 unless §13 says otherwise. Vendors price in US dollars; this doc converts at
**ASSUMPTION $1 = £0.75** (plausible range £0.72 to £0.80). Each figure is derived once, in the
section named beside it. The model behind §4 is reproducible from the inputs in §4.1.

## Summary

**Recommendation.** Tilo should reach stability the slow, cheap way: keep running costs near £70 a
month while it is an invited alpha, launch free in both stores once the roadmap gates are met,
then sell **Tilo Plus** (the AI features, starting with typing a meal) through Apple's and
Google's own in-app purchase at **£4.99 a month or £39.99 a year**. Everything that costs close to
nothing stays free (§7.1). Web checkout is not worth building at launch: after VAT and Stripe it
adds about 3p a payer a month in the base case (§3.2). The two things that decide whether Tilo
ever pays a salary are the **AI cost per payer** and the **share of active users who pay**, and
neither is known yet. So the job before Plus is to measure both cheaply, not to spend on growth.

**The path, tied to the roadmap gates (no invented dates):**

| Phase | Starts when | Cash burn a month (base, excluding founder time) | Revenue | Unlocks the next phase |
|---|---|---|---|---|
| 0. Alpha, now | Today | about £66 | £0 | Alpha gate clips, native parity, solicitor #6 and clinician #44 engaged, one-off costs funded |
| 1. Store launch, free | Native plan phase 3, after the public-launch gates | about £300 to £525, plus about £10.3k one-off | £0 | AI Phase 1 passes its quality gate; about 1,000 MAU; D30 retention measured on three monthly cohorts |
| 2. Plus | AI Phase 1 live, DMCC-compliant purchase flow, solicitor has reviewed the terms | falls as payers grow; covers running and launch costs at about 470 payers | payers × £2.82 | Three months of Plus data; about 470 payers |
| 3. Coach | Plus measured; 5 to 10 PT interviews positive; consent-sharing design cleared | as Phase 2, plus support time | adds about £15 net a coach a month | About 2,550 payers (one salary) |
| 4. Stable and profitable | One salary covered | | | About 3,640 payers for a 20% margin |

**The numbers that matter** (base case):

| Number | Value | Where |
|---|---|---|
| Net receipts per payer, store in-app purchase (15%), blended | £2.79 a month | §3.2 |
| Payers / MAU to cover infrastructure | about 50 / 1,200 | §4.2 |
| Payers / MAU to cover running, launch and compliance costs | about 470 / 11,700 | §4.2 |
| Payers / MAU to pay one salary of £4,000 a month | about 2,550 / 64,000 | §4.2 |
| Payers / MAU for a 20% margin after that salary | about 3,640 / 91,000 | §4.2 |
| One-off launch and compliance costs (quotes needed) | about £10.3k (range £3.8k to £22.8k) | §2.3 |
| Blended LTV per payer / CAC cap | about £26 / £9 | §4.4 |

The low case never reaches a 20% margin and needs about 79,500 MAU just to cover infrastructure
(§4.2): with the most expensive AI model, no fair-use limit and 2% paying, Tilo loses money on
growth. All three of those inputs are ours to control.

**Decisions for Benn, first ones first** (full list in §12):

1. **Get quotes** from a solicitor (#6) and a clinician (#44), plus an insurance quote. They are the
   largest costs before any revenue, and every later figure in §4 moves with them.
2. **Confirm Gravita's VAT status and whether Tilo stays inside Gravita.** VAT changes web net
   receipts by about 21%; the entity decides SEIS eligibility (§6) and is hard to change once the
   apps and subscriptions sit under Gravita's developer accounts.
3. **Check the Supabase plan tier and the EAS plan**, and read last month's EAS and Seedance bills
   (§2.5). Move Supabase to Pro before store launch if it is on Free.
4. **Ask the accountant about an R&D claim** for Gravita's current period before the claim
   notification deadline (§6).
5. **Drop the supporter payment for now** (§8): at alpha scale it raises close to nothing, and the
   payments stack it was meant to prove is now the stores', not Stripe's.

---

## 1. What changed since September

### 1.1 Product and roadmap

- **Native is the main channel.** The Expo / React Native app in `apps/native` (Expo SDK 58, EAS
  project under the `gravita-co` Expo organisation, bundle `fit.tilo.app`) is being built stream by
  stream (`native-build-plan.md`). Benn decided on 9 November that the web app runs alongside native
  only until native is live on iPhone and Android, then it is retired (`native-app-plan.md` §9.6).
  The September plan's premise, a PWA taking card payments through Stripe, is therefore gone.
- **Developer accounts sit under Gravita Creative Ltd** (Benn, 10 October). Apple approved the
  membership on 12 November; Google Play waits for the Android phase.
- **AI label reading is built and on.** `ai-read-label` has been live since 11 October behind
  `LABEL_SCAN_ENABLED` (on), defaults to Claude Opus 5.5, and is capped at 30 reads per user and 500
  in total per UTC day (`docs/migrations/2026-09-ai-usage.sql`). Benn decided on 26 September that
  label reading is **free for everyone for now** (`label-scan-and-shared-products.md`). The native
  scanner (stream N6) calls the same function; on-device reading is planned for later (label plan
  phase 3) and would cost nothing per read.
- **Guest mode is retired.** Everyone has an account, so every active user is a Supabase MAU.
- **The app is now Tilo** (`rename-tilo.md`); the store name is "Tilo: Food, Move, Mind".
- **Roadmap gates** (`roadmap-overview.md`, 28 October): Tilo stays an invited alpha with no public
  launch date until every workout has a woman's and a man's demo clip (83 clips for Tilo's own
  workouts and warm-ups, 289 for the whole library; scope still to confirm). A paid tier before
  January 2027 is unlikely; monetisation comes after AI Phase 1. A solicitor (#6) and a clinician
  (#44, DPIA D1) gate public launch and any paid feature; neither has been found yet. Other open
  register items (#4 processor agreements, #21 and others) also gate public launch. For Cycle, Benn
  decided on 16 November that no lawyer is needed now and a clinician signs off before beta.

### 1.2 Store and legal terms (re-checked 16 November 2026)

| Topic | Where it stands | Source |
|---|---|---|
| Apple commission | 15% on in-app purchases and paid apps for Small Business Program members (proceeds up to $1M in the prior and current calendar year; enrolment required). Outside the programme, 30% in a subscriber's first paid year and 15% after | [S7][S8] |
| Google Play commission | From 30 June 2026 in the US, UK and EEA: auto-renewing subscriptions pay a 10% service fee plus a 5% billing fee when Google Play Billing is used (15% in total). One-time purchases on new installs: 20% + 5% (15% + 5% in the Apps Experience programme) | [S9] |
| Google, paying outside Play | The 10% service fee applies whatever the payment method; only the 5% billing fee is avoided (third-party summaries; Google's own page is ambiguous on links) | [S9][S10] |
| US link-out (Apple) | Apple cannot currently charge a commission on purchases made through an external link in US apps. It has proposed a fee (reported as 15% in a subscriber's first year, 10% after) that awaits the district court, and the Supreme Court hears Apple's appeal (No. 25-1311) on 11 January 2027 | [S11][S12] |
| UK steering (CMA) | Proposed only. The CMA consulted on a steering conduct requirement from 30 June 2026 and published responses on 14 August; no requirement had been imposed as of the case page's latest update (5 November 2026). Until then the standard rules apply in the UK: no link or button to a web price | [S13][S14] |
| EU (DMA) | Apple's terms from 1 October 2026: in-app purchase 26% standard, 15% for small developers and subscriptions after year one; link-out 15% standard, 10% for small developers | [S15] |
| UK subscription law (DMCC) | Go-live still 1 January 2027. The draft Consumer Subscription Contracts (Cancellation and Information) Regulations 2026 were laid on 19 October 2026 with draft guidance; no commencement order seen | [S16] |
| App Store refunds | Only Apple can refund an App Store purchase; the developer can only supply consumption information when asked | [S29] |

### 1.3 What runs today (measured from the repo, 16 November 2026)

| Component | Status | Evidence |
|---|---|---|
| Web app hosting | GitHub Pages via GitHub Actions, until the web app is retired | `.github/workflows/deploy.yml` |
| Database, auth, sync, functions | Supabase. Edge functions: `ai-read-label`, `delete-account`, `lookup-product`, `report-product`, `send-supplement-reminders`, `submit-product`. **Plan tier: unknown** | `supabase/functions/` |
| Sync | `pullAll` still fetches every `day_logs` row for the user, with no date or `updated_at` filter (`src/data/sync.ts`, line 566), so egress grows with history × opens | `src/data/sync.ts` |
| Push | Web Push live. Native APNs sending is built in the reminder function but **not deployed** (needs the APNs key) | `native-build-plan.md` §4 (N12) |
| Exercise video | All clips now on Bunny Stream (no clips left in the app bundle); `expo-video` plays them on native | `src/core/data/media.ts` |
| AI | Label reading live; nothing else | `supabase/functions/ai-read-label` |
| Native build | EAS profiles `development`, `spike` (iOS on `m-medium` workers) and `production`; **no `expo-updates`** (so no over-the-air update costs yet); **no RevenueCat, no purchases code** | `apps/native/eas.json`, `apps/native/package.json` |
| Analytics | None. The iOS privacy manifest declares no tracking | `apps/native/app.json` |
| Paid libraries | None (`native-dependencies.md` rule 4) | |

---

## 2. Cost model

### 2.1 Fixed monthly running costs

| Item | Price found | Low (worst) | Base | High (best) | Notes |
|---|---|---|---|---|---|
| Supabase Pro | $25 a month: 100k MAU, 8 GB disk, 250 GB egress, $10 compute credit [S1] | £18.75 | £18.75 | £18.75 | Free projects pause after a week of inactivity [S1]; not acceptable for a store app |
| Webflow (marketing site) | Premium $25 a month yearly [S3] (24 Sept price, not re-checked) | £18.75 | £18.75 | £18.75 | Tier unknown |
| Domain tilo.fit | not checked | £5 | £3 | £1 | **ASSUMPTION** £1 to £5; read the registrar invoice |
| Bunny Stream | $1 monthly minimum [S4] | £0.75 | £0.75 | £0.75 | Usage in §2.2 |
| Apple Developer Program | $99 a year, or the local-currency price [S19] | £6.19 | £6.19 | £6.19 | Paid; the GBP amount is on Gravita's invoice |
| Expo EAS | Free: up to 15 iOS and 15 Android builds a month. Starter: $19 a month with $45 of build credit; iOS builds $2 (medium) or $4 (large), Android $1 or $2 [S5] | £14.25 + £22.50 overage | £14.25 | £0 (Free) | **Unknown** which plan Gravita is on; twelve parallel streams can pass 15 iOS builds a month |
| Device cloud for phones we don't own | BrowserStack App Live $39 a month yearly, $49 monthly (third-party) [S26] | £36.75 | £0 | £0 | Optional; a second-hand Android phone may do instead (not priced) |
| ICO data protection fee | £52 a year, tier 1 [S23] | £4.33 | £4.33 | £4.33 | Owed now (register #1) |
| Transactional email | not checked | £15 | £0 | £0 | **ASSUMPTION**. Needed for DMCC reminders only if Tilo, not the store, is the trader (§3.3) |
| **Infrastructure total** | | **£142** | **£66** | **£50** | |
| Accountant, company admin | not checked | £300 | £150 | £100 | **ASSUMPTION**; may be lower if Gravita's accountant absorbs it |
| Insurance (professional indemnity, cyber, product liability) | **quote needed** | £208 | £83 | £42 | **ASSUMPTION** placeholder of £500 to £2,500 a year until Benn has a quote |

Push costs nothing to send: Firebase lists Cloud Messaging as no-cost on every plan [S21], and we
found no per-message charge for Apple's APNs [S22]. HealthKit and Health Connect have no fee. The
Google Health API (the Fitbit route, native phase 4) publishes no price and is not onboarding new
projects; if its health scopes are "restricted", Google requires an annual security assessment,
reported at about $540 a year for Tier 2 [S27][S28]. That is a phase 4 cost, not in the model.
RevenueCat is free below $2,500 of monthly tracked revenue and 1% of all tracked revenue above it
[S6]; it is costed per payer in §3.2.

### 2.2 Variable costs per monthly active user

| Driver | Unit price | Usage per MAU per month | Cost per MAU (low / base / high) |
|---|---|---|---|
| Infrastructure (MAU, egress with the current full-pull sync, disk, video) | Supabase overages: $0.00325 per MAU above 100k, $0.09/GB egress, $0.125/GB disk [S1]; Bunny $0.005 to $0.01/GB [S4] | **ASSUMPTION** 50 MB sync egress (range 10 to 300), 20 clip plays of about 0.64 MB | £0.010 / £0.005 / £0.0025 (the high case assumes the incremental-pull fix) |
| AI label reading (free for everyone) | $0.005 to $0.02 a read (`label-scan-and-shared-products.md`) | **ASSUMPTION** 6 / 2 / 0 reads (new packaged products only; repeat products come from the shared list at £0; 0 = on-device reading) | £0.09 / £0.0225 / £0 |
| Label reading global cap | 500 reads a day × 30.4 days | | at most £228 / £171 / £0 a month in total |
| Supabase compute | Small about $15, Medium about $60, Large about $110 a month, less the $10 credit [S2] (24 Sept) | **ASSUMPTION** Micro to 10k MAU, Small to 30k, Medium to 70k, Large above | £0, £3.75, £37.50, £75 a month |
| Expo Updates (only if over-the-air updates are added) | 1,000 MAU free, 3,000 on Starter, 50,000 on Production; then $0.005 per MAU [S5] | | £0 today |

**The label cap matters both ways.** It bounds what free label reading can cost (about £171 a
month in the base case), but at 2 reads per MAU it starts refusing reads at about 7,600 MAU (15,200
reads ÷ 2), and at about 2,500 MAU in the low case. Before store launch, either raise the cap
knowingly, move reading on-device, or accept that busy days will show "try again later".

**AI for Plus** (the paid line, not live): `ai-platform-plan.md` §3.3 puts a heavy user at $1.20 to
$4.00 a month depending on the model mix. AI Phase 1 is meal parsing only (about $0.003 to $0.015 a
meal, §3.2 there), so typical Phase 1 users should sit well below. Modelled per payer as
**ASSUMPTION** £2.00 / £0.75 / £0.30 a month (low / base / high). Model prices are from September
and need re-checking before pricing Plus.

### 2.3 One-off launch and compliance costs (quotes needed)

| Item | Gate | Low (worst) | Base | High (best) | Basis |
|---|---|---|---|---|---|
| Solicitor: privacy policy, terms, register, subscription terms, the 30-day hold question (#6) | Public launch and any paid feature | £14,500 | £6,000 | £2,000 | **ASSUMPTION** 7 to 25 hours. Anchor: the 2026 court guideline hourly rates for a solicitor of 8+ years are £288 (National 2) to £579 (London 1) [S24]; market and fixed-fee rates differ. Quote needed |
| Clinician review: wellbeing question and routing, Mind skills, loop safety tiers, Cycle thresholds (#44, DPIA D1) | Onboarding beyond testers, public launch | £8,000 | £4,000 | £1,500 | **ASSUMPTION** 15 to 40 hours at £100 to £200 an hour; no source. Quote needed |
| UK trade mark "Tilo", two classes | Before store submission (`native-app-plan.md` §9.1) | £265 | £265 | £265 | £205 online plus £60 a class from 1 April 2026 [S25] |
| Google Play registration | Android phase | £19 | £19 | £19 | $25 once [S20] |
| **Total** | | **£22,784** | **£10,284** | **£3,784** | Amortised over 24 months in §4 (**ASSUMPTION**) |
| DPIA | Onboarding flag, AI Phase 0 | £0 | £0 | £0 | Written in-house by `compliance`; signed by Benn |
| Alpha-gate demo clips (83 or 289) | Alpha gate | unknown | unknown | unknown | **Measure:** cost per clip from Benn's Seedance bill for the 37 made, × clips to make |
| Insurance | Public launch | in §2.1 | | | Annual, so in running costs |

### 2.4 Founder and team time

Cash burn understates the real cost. Benn should fill in this line; every phase in §5 shows burn
without it, and §4.2 (c) assumes the first salary is **ASSUMPTION** £4,000 a month fully loaded
(range £3,000 to £6,000).

| Line | Amount a month | Who supplies it |
|---|---|---|
| Benn's hours on Tilo × the rate he would pay someone else | £____ | Benn |
| Sara's hours on Tilo × rate | £____ | Benn |
| Share of Gravita's Claude plan used for Tilo (the build runs on it, Benn 9 November) | £____ | Benn, from the invoice |
| **F: founder and team time** | **£____** | |

True monthly burn = cash burn (§5) + F.

### 2.5 Unknowns we can measure from our own accounts

Supabase plan tier and last month's usage (MAU, egress, disk); EAS plan and builds used; Seedance
spend per clip; Anthropic spend on label reading and the monthly spend limit Benn decided to set on
26 September (set or not); label reads per active user (from `ai_usage`, in aggregate); Webflow
tier; domain renewal price; Gravita's VAT status, accounting period end and corporation tax rate.
Each replaces an ASSUMPTION above.

---

## 3. Channels and net receipts per payer

### 3.1 What each channel allows (UK first, per the Cycle and wedge decisions)

- **UK App Store and Google Play:** in-app purchase is the way to sell Plus inside the app. Tilo may
  not link or point to a web price in the UK app until the CMA imposes a steering requirement
  (§1.2). Someone who finds a web offer on www.tilo.fit by themselves may buy there and use it in
  the app (the store rules on multiplatform access need checking by `compliance` before relying on
  this).
- **US:** linking out to a web checkout is currently commission-free on iOS, but that may end
  after the January 2027 hearing or a district court fee ruling (§1.2). On Android, Google's 10%
  applies anyway.
- **EU:** link-out costs 10% (small developer) on iOS, plus card fees, so it saves nothing against
  15% in-app.

### 3.2 Net receipts per subscriber per month

Prices include 20% UK VAT. Apple and Google collect and remit VAT on store sales and pay proceeds on
the price excluding VAT, so store receipts do not depend on Gravita's VAT status (third-party
summaries; confirm in Apple's Paid Applications Agreement, Exhibit B) [S30]. On the web, VAT comes
off only if Gravita is VAT-registered (registration is compulsory above £90,000 taxable turnover
[S18]). Stripe UK: 1.5% + 20p on standard UK cards, plus 0.7% for Stripe Billing [S17]. RevenueCat
1% applies to all tracked revenue once it passes $2,500 a month (about 470 payers), included below
to be conservative.

| Channel | Monthly £4.99 | Annual £39.99, per month | Blended, 60% annual |
|---|---|---|---|
| Store in-app, 15%, with RevenueCat | £4.99 ÷ 1.2 × 0.85 − £0.05 = **£3.48** | £39.99 ÷ 1.2 × 0.85 ÷ 12 − £0.03 = **£2.33** | 0.6 × 2.33 + 0.4 × 3.48 = **£2.79** |
| Web, Stripe, VAT-registered, with RevenueCat | £4.158 − £0.31 − £0.05 = **£3.80** | (£33.325 − £1.08) ÷ 12 − £0.03 = **£2.65** | **£3.11** |
| Web, Stripe, not VAT-registered, with RevenueCat | £4.99 − £0.31 − £0.05 = **£4.63** | (£39.99 − £1.08) ÷ 12 − £0.03 = **£3.21** | **£3.78** |

The 60% annual share is **ASSUMPTION** (range 50 to 70%), anchored on RevenueCat's finding that
Health and Fitness apps take 59% of revenue from annual plans [S31].

**Channel mix** (share of payers buying on the web): **ASSUMPTION** 0% (low), 10% (base), 30%
(high). Web share stays small because the UK app cannot mention it. Blended: low £2.79; base 0.9 ×
2.79 + 0.1 × 3.11 = **£2.82**; high 0.7 × 2.79 + 0.3 × 3.11 = **£2.89**.

### 3.3 Recommendation: in-app purchase only at Plus launch

**Web checkout moves break-even by under 3% in the base case** (475 payers with in-app only against
452 with 30% on the web, §4.3). Once VAT comes off both, Stripe plus Billing take about half of
what the stores do on the monthly plan (£0.31 against £0.62) and about a fifth on the annual
(£1.08 against £5.00), but RevenueCat's 1% applies to both and the UK app cannot send anyone to the
web, so few payers ever take the cheaper route. Building and
running it means a second purchase flow, entitlements merged across channels (`security-data`), a
new processor (`compliance`), our own VAT and DMCC duties, and a web surface after the PWA is
retired. **The exceptions:** if Gravita is not VAT-registered, the web nets 35% more per web payer
(break-even falls to about 411 payers at 30% web share), and if the CMA imposes a cheap steering
requirement, UK web share could rise. Revisit at either event. Coach is different: it is sold to
businesses on a web console, so it uses Stripe from the start (§7.3).

**RevenueCat or direct StoreKit / Play Billing.** RevenueCat is free until about 470 payers, then
1% of revenue (about £0.04 a payer a month), and gives subscription analytics without any health
data. It is a new processor (purchase records and an app user ID), so `compliance` and
`security-data` review it first. Writing StoreKit 2 and Play Billing directly costs nothing per
payer but more build and maintenance. Recommend RevenueCat, subject to those reviews.

**Fair billing on the stores (fairness rule 3).** Cancellation happens in Apple's and Google's
subscription settings; the app should open that screen in one tap from Profile. Two things change
from the September plan:

- **Refunds:** on iOS only Apple can refund [S29], so the "money back if Tilo isn't helping"
  promise (§7.4) cannot be a guarantee there. It can become "tell us and we'll give you free months
  and help you ask Apple for a refund", or Plus for that person moves to a goodwill extension.
  Google Play lets developers refund.
- **Trials:** store free trials are introductory offers that convert to a paid subscription
  unless cancelled, which is the card-on-file pattern the September plan avoided. A no-card trial
  needs entitlements granted by us (RevenueCat supports promotional access) rather than a store
  offer; whether that fits App Review rules needs checking by `compliance`.

**Unknown, for `compliance` and the solicitor before Phase 2:** whether the DMCC regime treats Tilo
or the store as the trader for a store-billed subscription, and so who owes the reminder notices,
the cooling-off period and the "easy exit" duties.

---

## 4. Break-even model

### 4.1 Formula and inputs

For M monthly active users and a paid share s, with P = s × M payers:

**monthly result = P × (N − A − 0.02) − (M − P) × i − min(M × L, C) − compute(M) − fixed**

| Input | Low | Base | High |
|---|---|---|---|
| N, net receipts per payer (§3.2) | £2.79 (in-app only) | £2.82 (10% web) | £2.89 (30% web) |
| A, AI per payer (§2.2) | £2.00 | £0.75 | £0.30 |
| Payer infrastructure | £0.02 | £0.02 | £0.02 |
| s, paid share of MAU | 2% | 4% | 6% |
| i, infrastructure per free MAU (§2.2) | £0.010 | £0.005 | £0.0025 |
| L, label reading per MAU / C, cap (§2.2) | £0.09 / £228 | £0.0225 / £171 | £0 / £0 |
| Fixed (a): infrastructure (§2.1) | £142 | £66 | £50 |
| Fixed (b): (a) + admin + insurance + one-offs ÷ 24 | £1,600 | £728 | £349 |
| Fixed (c): (b) + one salary £4,000 (§2.4) | £5,600 | £4,728 | £4,349 |
| (d): (c) and a result of at least 20% of net revenue (**ASSUMPTION** target) | | | |

**Contribution per payer** = N − A − 0.02 − L − (free users per payer) × (i + L) while label reads
are paid per read, and drops the L terms once the cap binds:

- Base: 2.82 − 0.75 − 0.02 − 0.0225 − 24 × 0.0275 = **£1.37**; above about 7,600 MAU, 2.82 − 0.77
  − 24 × 0.005 = **£1.93**.
- Low: 2.79 − 2.02 − 0.09 − 49 × 0.10 = **−£4.22**; above about 2,500 MAU, 2.79 − 2.02 − 49 × 0.010
  = **£0.28**.
- High: 2.89 − 0.32 − 15.7 × 0.0025 = **£2.53**.

The paid share is the weakest input. Published medians count installs, not active users: 2.9%
download-to-paid by day 35 for Health and Fitness [S31] and 1.78% install-to-paid for Health and
Fitness onboarding paywalls with trials [S32]. Paid share of active users should be higher, hence
2 to 6%, but **Tilo's figure is unknown** until Plus sells.

### 4.2 The four thresholds

Solved by stepping M until the result reaches the target.

| Threshold | Low | Base | High |
|---|---|---|---|
| (a) Covers infrastructure | 1,590 payers, 79,520 MAU | **48 payers, 1,210 MAU** | 20 payers, 330 MAU |
| (b) Also covers admin, insurance and launch and compliance one-offs | 6,796 payers, 339,810 MAU | **467 payers, 11,680 MAU** | 139 payers, 2,310 MAU |
| (c) Also pays one salary (£4,000) | 21,082 payers, about 1.05M MAU | **2,555 payers, 63,880 MAU** | 1,723 payers, 28,720 MAU |
| (d) (c) at a 20% margin | Never: the margin cannot pass 10% (0.28 ÷ 2.79) | **3,637 payers, 90,930 MAU** | 2,250 payers, 37,500 MAU |

Monthly result in the base case before any salary: −£673 at 1,000 MAU, −£454 at 5,000, −£126 at
10,000, +£2,928 at 50,000 and +£6,754 at 100,000.

**What drives it, in order:** AI cost per payer and the paid share (together they separate the low
case from the base case by a factor of about 29 in the MAU needed for threshold (b)), then the price, then free label
reading, then the channel.

### 4.3 Sensitivity of threshold (b) in the base case

| Change | Payers for (b) | Against 467 |
|---|---|---|
| In-app only (no web) | 475 | +2% |
| 30% web, VAT-registered | 452 | −3% |
| 30% web, not VAT-registered | 411 | −12% |
| Label reading on-device (L = 0) | 377 | −19% |
| Plus at £5.99 / £44.99, in-app only (net £3.24) | 382 | −18% |

### 4.4 Lifetime value and the CAC cap (base, in-app)

- **Annual subscriber:** £2.33 − £0.75 − £0.02 = £1.56 a month, £18.69 a year. RevenueCat reports
  28% of yearly subscribers on freemium apps retained after 12 months [S33]; expected paid years =
  1 ÷ (1 − 0.28) = 1.39. **LTV ≈ £26.**
- **Monthly subscriber:** £3.48 − £0.77 = £2.71 a month. **ASSUMPTION** 10% monthly churn (range 7
  to 15%) gives 10 expected paid months. **LTV ≈ £27**; first-12-month value £2.71 × (1 − 0.9¹²) ÷
  0.1 = £19.
- **Blended LTV ≈ £26, about £19 in the first year. CAC cap = one third of LTV ≈ £9.**

These rest on industry retention, not ours; replace them after three months of Plus sales.

---

## 5. The phased path

Each phase starts when its roadmap gate is met, not on a date. The only fixed dates that touch
money: DMCC regime 1 January 2027 [S16]; US Supreme Court hearing 11 January 2027 [S11]; R&D claim
notifications abolished for claims made from 1 April 2027 [S36].

### Phase 0: invited alpha (now)

- **Burn:** about £66 a month cash (low £142, high £50), plus F (§2.4), plus one-offs as they
  fall (demo clips, trade mark). Label reading for a few testers costs pennies.
- **Revenue:** none. The supporter payment is dropped for now (§8).
- **Do now:** the incremental-pull sync fix (it is a robustness fix as well as a cost one); check
  the Supabase and EAS plans; confirm the Anthropic spend limit is set; pay the ICO fee; measure
  Seedance cost per clip; get the solicitor, clinician and insurance quotes; ask the accountant
  about an R&D claim (§6).
- **Instrument now** (§11): sign-ups, activation, D1/D7/D30 retention by weekly cohort, label
  reads per active user, sync egress per MAU, all first-party and aggregated.
- **Unlocks Phase 1:** the roadmap's public-launch gates (alpha-gate clips, solicitor #6,
  clinician #44, DPIA, processor agreements and the other register items), native parity and
  store review, and the one-offs funded (§2.3: about £10.3k base).
- **Decision for Benn:** commission the quotes, and confirm the entity and VAT status.

### Phase 1: free in both stores

- **Burn:** cash running costs about £327 a month at 1,000 MAU and £437 at 5,000 MAU (base;
  low £751 to £929, high £194 to £204), plus the one-offs. **Cash to set aside for 12 months of
  Phase 1, one-offs included: about £15.5k base (£6.2k high, £33.9k low), excluding F.**
- **Revenue:** none. Free launch is right: Plus has nothing to sell until AI Phase 1, and the store
  launch is where activation and retention get measured.
- **Unlocks Phase 2:** AI Phase 1 passes its quality gate with a model chosen by evals (so A is
  measured, not assumed); at least about 1,000 MAU (below 1,210 Plus cannot cover even
  infrastructure in the base case); D30 retention measured on three monthly cohorts; the purchase
  flow meets DMCC and store rules, reviewed by the solicitor; RevenueCat cleared by `compliance` and
  `security-data`; paywall and trial copy cleared by `mental-performance`.
- **Decision for Benn:** the label-reading cap (raise it, move on-device, or accept refusals) and
  whether to list in the US storefront at all.

### Phase 2: Plus, with AI Phase 1

- **Burn and revenue:** follow §4.2. Base: −£454 a month at 5,000 MAU, break-even including
  amortised launch costs at about 467 payers (11,680 MAU).
- **Offer:** §7: £4.99 / £39.99, founding-member price, a fair-use limit stated up front, pause
  where the store supports it, one-tap route to the store's cancel screen.
- **Unlocks Phase 3:** three months of Plus data (paid share, plan mix, churn, AI cost per payer);
  about 470 payers; 5 to 10 PT interviews run during Phase 2.
- **Decision for Benn:** price points once A is measured (§7.2), and whether the measured paid
  share supports any paid acquisition (§10; at a £9 cap, almost certainly not).

### Phase 3: Coach

- **Revenue:** £19 a month per coach, net £15.21 through Stripe if VAT-registered (§7.3); ten
  coaches add about £152 a month, the same as about 79 Plus payers at £1.93.
- **Build:** coach web console, consent-based sharing with RLS changes (`security-data`), support.
- **Unlocks Phase 4:** about 2,555 Plus payers or the coach-equivalent (one salary, §4.2 c).
- **Decision for Benn:** build Coach only if interviews show PTs will pay and Plus conversion is at
  or above base; otherwise put the time into retention.

### Phase 4: stable, then profitable

One salary at about 2,555 payers (63,880 MAU); a 20% margin after it at about 3,637 payers (90,930
MAU). Workplace wellness and curated programmes (§8) belong here, not earlier. Revenue-based
financing becomes available once net revenue passes about £10,000 a month (§6), which in the base
case is about 3,550 payers (£10,000 ÷ £2.82).

---

## 6. Funding to bridge until break-even

| Option | Available now? (16 November 2026) | Fit for Tilo | Value |
|---|---|---|---|
| **Gravita's own cash** | Yes | The realistic bridge for Phases 0 and 1 | Needs about £15.5k for 12 months of Phase 1 (base, §5) |
| **R&D tax relief** | Yes. Merged scheme: 20% taxable expenditure credit; ERIS for loss-making SMEs whose R&D is at least 30% of total spend: 86% extra deduction and a payable credit of up to 14.5% of the surrenderable loss [S34]. Data and cloud computing costs have qualified since April 2023, apportioned to R&D use [S35]. A first claim (or the first in three years) needs a claim notification within 6 months of the period end [S36]; notifications are being abolished for claims from 1 April 2027 [S36] | Good if real qualifying costs exist: staff time on technical uncertainty (offline sync, the estimate model, AI evaluation), and an apportioned share of the Claude plan, Anthropic, Supabase and EAS. ERIS needs Gravita's whole spend to be 30% R&D, which a creative business may not meet | About 16p per £1 under the merged scheme at a 19% tax rate (20% × 0.81), about 27p per £1 under ERIS (186% × 14.5%). Status: **no claim found in the repo; unknown.** An adviser decides |
| **SEIS / EIS** | Yes. SEIS: up to £250k, gross assets up to £350k, under 25 employees, trade under 3 years old, and the company must not have carried on another trade before [S37]. EIS: from April 2026, £10m a year and gross assets up to £30m before issue; the schemes run to 2035 [S38] | **Poor inside Gravita:** Gravita already trades, so it fails SEIS's "no other trade before" rule. A new Tilo company could qualify, but the apps, accounts and any subscribers would then need moving. Equity also only makes sense if Benn wants investors and a bigger outcome than §4.2 models | Tax relief for investors, not cash for Tilo |
| **Innovate UK grants** | Smart grants paused; Growth Catalyst Early Stage last ran July to August 2025 [S39]. Of the open and upcoming competitions listed on 16 November 2026, none is open to any sector or covers health, wellbeing or consumer apps; BridgeAI Deployment Catalyst is for AI in operational systems [S40] | Weak. Check the Innovation Funding Service monthly | £0 expected |
| **Revenue-based financing** | Yes, but UK providers typically want £10,000+ monthly revenue and 6+ months of trading (lender and broker figures) [S41] | Not before Phase 4 | |
| British Business Bank Start Up Loans | not researched | | |

---

## 7. The offer

### 7.1 The free/paid line

| Free forever (never degraded) | Tilo Plus | Coach plan (paid by the PT) |
|---|---|---|
| Food logging: search, usuals, recipes, quick estimate, custom foods, barcode, **label reading** (Benn, 26 September) | Describe a meal in words and have it logged (AI Phase 1) | Coach web console: consenting clients' logs and check-ins |
| Workouts: built-in plans, the plan builder, the training engine | Later: photo logging, AI recipe capture, weekly AI summary, AI coach conversation (wellness only) | Assign plans and templates |
| Weight, body stats, check-ins, supplements, reminders | Later: guided follow-along sessions, voice logging | Messaging and notes |
| All history, charts and on-device trends | Later: AI-personalised meal plan with shopping list | Optional: Plus for clients as a priced add-on |
| Sync, export and backup, offline use; wearable data (HealthKit, Health Connect) | | |
| Exercise demo clips and form cues; all wellbeing and safety content; Cycle | | |

**Why the line sits here.** Fairness rule 2: everything on the left costs under a penny per user a
month (§2.2) except label reading, which Benn chose to give away and which the cap bounds. Wearable
data is free because it costs nothing to read and is the user's own data (rule 1). Demo clips and
safety content stay free (rule 4).

### 7.2 Price and comparables

| App (GB App Store, 30 September 2026) | Price | Free tier? |
|---|---|---|
| MyFitnessPal | £7.99 to £15.99 a month, £39.99 to £64.99 a year | Yes, limited |
| MacroFactor | £8.49 a month, £51.99 a year | No |
| Yazio / Lifesum | £35.90 a year / £34.99 to £99.99 a year | Yes |
| Lose It! | £9.99 to £75.99 (incl. lifetime £59.99) | Yes |
| **Tilo Plus (proposed)** | **£4.99 a month, £39.99 a year** | **Yes, the full core loop** |

Prices from `docs/research/market-wedge-2026-09.md` §4 (marketing-research, checked 30 September
2026); store listings show price points, not which plan each belongs to. The research suggested £4
to £6 a month for the wedge, noting many people stopped weight-loss medication because of cost.

**The price must cover AI.** On the annual plan an in-app sale nets £2.33 a month (§3.2). A heavy
user on an all-Opus mix costs about £2.60 to £3.00 a month (`ai-platform-plan.md` §3.3), so needs a
published fair-use limit and a model chosen by evals. **If evals need Opus for meal parsing, move to
£5.99 / £44.99 (§4.3) or a cheaper model before launch.**

### 7.3 Coach plan

| Plan | Price (incl. VAT) | Clients | Comparables |
|---|---|---|---|
| Coach Free | £0 | up to 3 | Trainerize Basic free for 1 client; Everfit Starter free to 5 [S42][S43] |
| Coach | £19 a month | up to 15 | Trainerize Pro $23 from 5 clients; TrueCoach Starter $26.34 for 5; Everfit Pro from $19 [S42][S44][S43] |
| Coach Plus | £39 a month | up to 40 | TrueCoach Standard $57.99 for 20, Pro $136.99 for 50 [S44] |

Sold on a web console through Stripe: £19 ÷ 1.2 = £15.83, less 1.5% × £19 + 20p + 0.7% × £19 =
£0.62, **net £15.21** (VAT-registered); through the stores it would be £13.46. Clients stay free,
as on TrueCoach and Everfit. Whether a coach who paid on the web can use coach features in the
iOS app without an in-app option is a store-rules question for `compliance`; a web-only console
avoids it. Prices are **ASSUMPTIONS** to test in interviews (comparables checked 24 September).

### 7.4 Plus terms

- **Founding-member price:** £29.99 a year for as long as the subscription continues, stated
  plainly (a stepped introductory price brings in the DMCC reduced-price rules [S45]). In-app it
  nets £29.99 ÷ 1.2 × 0.85 − £0.30 = £20.94 a year, **£0.58 a month less** than a full-price annual
  payer; worth it for the first cohort.
- **No lifetime deal on anything with AI:** a permanent liability against a per-call cost.
- **Fair-use limit** published up front; never a surprise, never mid-conversation.
- **Pause:** Google Play supports pauses of up to three months on non-annual plans [S46]; Apple's
  equivalent is to verify. Pause sits beside Cancel, never in front of it.
- **"On your side" promise**, adapted for the stores: a show-up thank-you month after any 8 weekly
  reviews in the first 12 weeks (a miss never resets it), and "not helping? tell us" answered with
  free months and help asking the store for a refund, since only Apple can refund on iOS (§3.3).
  Pilot on one cohort; the guardrail metric is no rise in risk-language flags.
- **Trial:** prefer a no-card 14-day Plus period granted by us; if a store introductory offer is
  used instead, the reminder before billing is a must (§3.3).

---

## 8. Other revenue lines

| Rank | Line | Who pays | Margin or effect (base) | When |
|---|---|---|---|---|
| 1 | Tilo Plus | Users | Contribution £1.37 to £1.93 on £2.82 net (§4.1) | Phase 2 |
| 2 | Coach plan | PTs | Above 95% of £15.21 net without client Plus (§7.3) | Phase 3 |
| 3 | Referrals, give a month get a month | Us, as foregone revenue | About £2.80 of receipts per reward month in-app; needs store offer codes, so a little more build | With Plus |
| 4 | Founding-member price | Early users | −£0.58 a month each against full price (§7.4) | Plus launch |
| 5 | R&D relief | Government | §6 | Now |
| 6 | Pay-what-you-can tiers and hardship places | Users | About neutral unless it lifts conversion about 8% (September arithmetic; re-cost on store nets) | Three months after Plus |
| 7 | AI credit packs | Light and heavy users | £2.99 pack nets £2.12 (Apple) or £1.87 (Google, 20% + 5%), less about £0.68 of AI on Sonnet: £1.19 to £1.44 a pack | Once fair-use data exists |
| 8 | Curated one-off programmes | Users | **ASSUMPTION** 40 to 50% after a 50% creator share; production is a fixed cost | Phase 4 |
| 9 | Workplace wellness | Employers | About £420 a month per 500-employee client (£1 per employee, 20% activate, £0.77 AI and infra each); invoiced, so no store fee | Phase 4 |
| 10 | Family plan, gifts, printed annual report | Users | Small; gifts and families need store support to check | Later |
| Dropped for now | **Supporter payment** | Fans | At alpha scale close to £0. In the app it would have to be an in-app purchase (Google one-time purchases on new installs pay 20% + 5%), and its job of proving a payments stack has gone | Revisit at Phase 1 if Benn wants it |

**Rejected, with reasons** (unchanged from September): full or partial refunds on reaching a goal
(loses money as success rises, and ties money to the body, rule 4); cash rebates on logging;
commitment deposits kept by Tilo (earns when users struggle; possible unlicensed betting under s9 of
the Gambling Act 2005 [S47]) or forfeited to charity; charity donations tied to weight; non-AI
lifetime deals; white-label for gyms; an open creator marketplace; product and grocery affiliates;
ads (rules 4 and 6); selling or licensing data, even anonymised (health data is easy to re-identify
[S48], as Strava's heatmap showed [S49]).

---

## 9. Psychological safety guardrails

Reviewed by `mental-performance` on 24 September 2026; nothing ties money to an outcome or to
failure. Confirm effect sizes before quoting any paper publicly.

| Idea | Verdict | Key guardrail |
|---|---|---|
| Free if you hit your goal (weight) | **Avoid** | Contingent rewards undermine intrinsic motivation [P1]; weight was regained after incentives stopped [P2]; workplace weight incentives had high dropout [P3]; dieting predicts later disordered eating [P4] |
| Consistency reward for behaviours | Safe with guardrails | Incentives raise activity modestly while they run [P5]. Count weekly reviews or check-ins only, never workout volume or calorie logging [P6][P7]; a miss never resets it |
| Commitment deposits | **Avoid** | Works for the few who opt in [P8][P9], but losing money after a bad week is punishment |
| Charity donation on a goal | Safe with guardrails | Prosocial incentives can sustain effort [P10]. Behaviours only; Tilo pays |
| Pay what you can, hardship option | Safe | Pairing price with a social cause raised uptake and revenue [P11]. No means-testing |
| AI credits | Safe with guardrails | Metering creates a "taxi meter" feeling [P12]. Flat Plus stays the default; crisis responses never draw on credits |
| Referral months | Safe with guardrails | No leaderboards, no "invite 3 or lose access" |
| Pause instead of cancel | Safe | Cancel stays one tap away, as the DMCC Act requires [P13] |
| Employer wellness | Safe with guardrails, lowest priority | Large trials found no health effect [P14][P15]. Employer sees only groups of 50 or more; DPIA |
| Gifting | Safe with guardrails | Never "for someone who needs to lose weight"; the giver sees nothing |
| Creator programmes | **Avoid** body-focused creators | Fitspiration imagery worsens mood and body image [P16] |
| Trial and renewal reminders, upsell timing | Safe with guardrails | Remind 3 to 7 days before any charge; no fake countdowns |

**Across everything.** Users are 18 or over; anyone in gentle mode is excluded from any contingent
mechanic. Never upsell in a crisis script, in gentle mode, after a low mood or bad check-in, after a
weight gain or missed streak, or mid-log; offer upgrades after a moment of competence such as a
completed weekly review. All paywall, upsell, trial and notification copy goes through
`mental-performance`. Wearable data (sleep, steps) never triggers an upsell.

---

## 10. Go-to-market spend

**The spend rule.** A channel may scale only when its measured cost per new paying user is at most
one third of LTV (**£9** until we have our own LTV, §4.4) and pays back within 12 months (£19). A
channel needs at least 30 attributed paid conversions before its CAC counts as measured.
**ASSUMPTION** experiment cap: £500 a month across all untested channels until the first Plus
cohort is measured, and **£0 before Phase 2**, because a free user brought in by spend costs money
and earns nothing until Plus exists. Pay creators on commission, not flat fees. Never weight-loss
or body-image creative, before/after imagery or targeting by health condition; the wedge research
warns that ads mentioning GLP-1 or weight-loss injections fall under the ASA's prescription-medicine
rules (`market-wedge-2026-09.md` §1).

**Why paid install ads do not work at Tilo's price.** Health and Fitness cost per install is put at
$4.30 to $5.50 (aggregator figure) [S50]; at a 2.9% download-to-paid rate [S31] that is about $148
(£111) per payer against an LTV of £26. Growth has to come from store search (App Store and Play
listings now matter as much as the website), communities and partners in the wedge, word of mouth,
referrals, PR and coaches bringing clients.

**Commissions.** 30% of our first-payment proceeds: annual £33.33 × 0.85 × 0.3 = **£8.50**, inside
the £9 cap; monthly £1.06. MacroFactor pays 40% of the first payment [S51]; at our price that breaks
the cap. Attribution in the stores needs offer codes or custom product page links, not URL codes;
`compliance` checks any attribution tool first. UK micro-influencer posts are quoted at £150 to £800
on Instagram (agency aggregates) [S52]; a £500 post must produce 56 payers to meet the £9 cap, so test
only, then convert to commission.

---

## 11. Metrics to instrument

First-party and aggregated, no third-party trackers seeing health data (`security-data` and
`compliance` review the design). The stores supply installs and conversion; RevenueCat (if chosen)
supplies trials, conversion, churn and refunds; our own database supplies activation and retention.

| Metric | Definition | Why |
|---|---|---|
| Installs and sign-ups | By source: store search, custom product page, offer code, coach invite | CAC by channel |
| Activation | Logs on 3 of the first 7 days (**ASSUMPTION**: tune on data) | Leading indicator |
| D1, D7, D30 retention | Returned and logged that day, by weekly cohort | Predicts conversion; gates Phase 2 |
| Label reads per active user | From `ai_usage`, aggregated | Replaces the 2-reads assumption; sets the cap |
| Sync egress per MAU | Supabase usage | Validates 50 MB; tracks the incremental pull |
| AI cost per payer | Per feature and model, daily, with outlier alerts | The input that decides profit |
| Free-to-paid | Payers ÷ MAU, and install-to-paid by day 35 | Break-even |
| Plan mix, trial-to-paid, churn and reason | Monthly vs annual; one-tap optional reason | Net receipts, LTV |
| Refunds and cooling-off exits | Count and value, by store | DMCC, fairness, "On your side" |
| Coach metrics (Phase 3) | Coaches, clients per coach, coach churn | Coach viability |

---

## 12. Decisions

### Open, in order

1. **Quotes:** solicitor (#6), clinician (#44) and insurance (§2.3, §2.1).
2. **Entity and VAT:** confirm Gravita's VAT status, and that Tilo stays inside Gravita (§6, §3.2).
3. **Supabase tier and EAS plan:** check both; Supabase Pro before store launch (§2.1).
4. **Incremental-pull sync fix** (§1.3): still not done.
5. **R&D claim:** ask the accountant before Gravita's claim notification deadline (§6).
6. **Label-reading cap** before store launch: raise, on-device, or accept refusals (§2.2).
7. **US storefront:** list in the US or UK only at launch (§3.1).
8. **Price points** after evals measure AI cost: £4.99 / £39.99 or £5.99 / £44.99 (§7.2).
9. **Trial type** on the stores: our own no-card period or a store introductory offer (§3.3).
10. **RevenueCat or direct store billing** (§3.3), after `compliance` and `security-data`.
11. **Coach timing:** interviews during Phase 2, build only on evidence (§5).
12. **Spend rule:** £0 experiments before Phase 2, then the £9 cap and the £500 test budget (§10).

### Settled since September (by Benn or by docs in the repo)

- **Label reading is free for everyone for now** (Benn, 26 September; `label-scan-and-shared-products.md`),
  which settled the old "free AI taste" decision for label reading. A free taste of AI Phase 1 is
  still open within decision 9.
- **Developer accounts under Gravita Creative Ltd** (Benn, 10 October; `native-app-plan.md` §9.2).
- **Solicitor before any paid feature:** now a roadmap gate (#6, `roadmap-overview.md` §4).
- **No paid tier before January 2027; monetisation after AI Phase 1** (Benn, 28 October).
- **Web app retired once native is live on both stores** (Benn, 9 November), which settles "Stripe
  direct or a merchant of record" for consumers: neither at launch.
- **Store name** "Tilo: Food, Move, Mind" (Benn, 9 November).
- **No paid native libraries without Benn's approval** (`native-dependencies.md`).

### Superseded

The free/paid line (decision 1 in September) stands as §7.1 with label reading moved to free; the
"On your side" pilot and the pause and non-renewing pass move to Phase 2 and are adapted for the
stores (§7.4); the £10 CAC cap becomes £9 on store nets.

---

## 13. Sources

Checked 16 November 2026 unless marked (24 September 2026) or (30 September 2026).

- [S1] Supabase pricing: https://supabase.com/pricing
- [S2] Supabase compute sizes (24 September 2026): https://supabase.com/docs/guides/platform/compute-and-disk
- [S3] Webflow May 2026 pricing (24 September 2026): https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026
- [S4] Bunny Stream and CDN pricing (24 September 2026): https://bunny.net/pricing/stream/ and https://bunny.net/pricing/cdn/
- [S5] Expo pricing: https://expo.dev/pricing
- [S6] RevenueCat pricing: https://www.revenuecat.com/pricing/
- [S7] Apple Small Business Program: https://developer.apple.com/app-store/small-business-program/
- [S8] App Store fees, including 15% after a subscriber's first paid year (RevenueCat): https://www.revenuecat.com/blog/engineering/app-store-fees
- [S9] Google Play service fees: https://support.google.com/googleplay/android-developer/answer/112622
- [S10] Google Play 2026 billing changes, fees on alternative billing and links (third-party): https://adapty.io/blog/google-play-billing-changes-subscriptions-fees/ and https://bluethrone.io/blog/google-play-fees-2026
- [S11] Apple v. Epic at the Supreme Court, argument 11 January 2027, no link-out commission until the district court approves one (Tech Times, 16 November 2026): https://www.techtimes.com/articles/330796/20261116/apple-supreme-court-contempt-epic-says-27-link-fee-defied-order-solicitor-general-disagrees.htm and docket https://www.oyez.org/cases/2026/25-1311
- [S12] Apple's proposed link-out fee (Subscription Insider): https://www.subscriptioninsider.com/blog/apple-proposes-15-year-one-link-out-fee-10-on-subscription-renewals
- [S13] CMA case page, Apple's mobile platform (latest update 5 November 2026): https://www.gov.uk/cma-cases/sms-investigation-into-apples-mobile-platform
- [S14] CMA consultation on steering requirements (30 June 2026): https://www.gov.uk/government/news/cma-consults-on-new-requirements-for-apple-and-googles-mobile-platforms
- [S15] Apple, changes for apps in the EU (August 2026, effective 1 October): https://www.apple.com/newsroom/2026/08/apple-announces-changes-for-apps-in-the-european-union/
- [S16] TLT, DMCC subscription regime (updated October 2026; draft regulations laid 19 October 2026; go-live 1 January 2027): https://www.tlt.com/insights-and-events/insight/dmcc-act-subscription-contracts-regime-brought-forward-by-the-pm-what-do-businesses-need-to-know
- [S17] Stripe UK pricing: https://stripe.com/gb/pricing
- [S18] UK VAT threshold £90,000 (24 September 2026): https://commonslibrary.parliament.uk/research-briefings/sn00963/
- [S19] Apple Developer Program fee (99 USD or local currency): https://developer.apple.com/support/fee-waiver
- [S20] Google Play registration $25 (24 September 2026): https://support.google.com/googleplay/android-developer/answer/6112435
- [S21] Firebase pricing, Cloud Messaging no-cost: https://firebase.google.com/pricing
- [S22] APNs and FCM cost comparison (third-party; no APNs fee found): https://www.courier.com/integrations/compare/apple-push-notification-vs-firebase-fcm
- [S23] ICO data protection fee £52, tier 1 (Acuity Law): https://acuitylaw.com/rise-in-ico-fees-data-protection-fees-february/
- [S24] Guideline hourly rates 2026 (Judiciary): https://www.judiciary.uk/guideline-hourly-rates-2026/
- [S25] UKIPO fees from 1 April 2026 (D Young & Co): https://www.dyoung.com/en/knowledgebank/articles/ukipo-fees-apr2026
- [S26] BrowserStack pricing (third-party): https://bug0.com/knowledge-base/browserstack-pricing
- [S27] Google restricted-scope security assessment and Tier 2 cost (third-party): https://support.google.com/cloud/answer/13465431 and https://nango.dev/docs/api-integrations/google-shared/google-security-review
- [S28] Google Health API status (Sahha, 29 October 2026): https://sahha.ai/blog/fitbit-api-sunset-migration/
- [S29] Only Apple refunds App Store purchases: https://developer.apple.com/forums/thread/123329 and https://www.revenuecat.com/blog/company/handle-apple-refund-requests-automatically
- [S30] App Store VAT handling (third-party; confirm in Exhibit B): https://appsops.store/blog/app-store-tax-vat-gst-territories
- [S31] RevenueCat, State of Subscription Apps 2026 (24 September 2026): https://www.revenuecat.com/state-of-subscription-apps
- [S32] Adapty, Health and Fitness benchmarks (24 September 2026): https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- [S33] RevenueCat 2026 benchmarks summary (24 September 2026): https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- [S34] HMRC, merged scheme and ERIS (updated 8 January 2026): https://www.gov.uk/guidance/research-and-development-rd-tax-relief-the-merged-scheme-and-enhanced-rd-intensive-support
- [S35] HMRC CIRD82100, data licence and cloud computing costs: https://www.gov.uk/hmrc-internal-manuals/corporate-intangibles-research-and-development-manual/cird82100
- [S36] Claim notification deadline (PKF Francis Clark, 14 April 2026) and abolition from 1 April 2027 (Azets, 5 November 2026): https://pkf-francisclark.co.uk/insights/rd-claim-notification-form-deadlines-when-and-how-to-submit/ and https://www.azets.com/en-uk/resources/randd-claim-notification-is-being-abolished-what-does-this-mean-if-youve-missed-a-deadline
- [S37] SEIS conditions: https://www.gov.uk/guidance/seed-enterprise-investment-scheme and HMRC VCM34020 https://www.gov.uk/hmrc-internal-manuals/venture-capital-schemes-manual/vcm34020
- [S38] EIS changes from April 2026 (Saffery): https://www.saffery.com/insights/articles/eis-seis-vct-and-uk-investment-tax-reliefs-explained/
- [S39] Innovate UK Smart grants paused (24 September 2026): https://www.ukri.org/opportunity/growth-catalyst-early-stage-new-innovators/
- [S40] Innovation Funding Service, open competitions: https://apply-for-innovation-funding.service.gov.uk/competition/search
- [S41] Revenue-based financing thresholds (broker): https://capitalise.com/gb/business-finance/revenue-based-financing
- [S42] Trainerize pricing (24 September 2026): https://www.trainerize.com/pricing/
- [S43] Everfit pricing (24 September 2026): https://everfit.io/pricing/
- [S44] TrueCoach pricing (24 September 2026): https://truecoach.co/pricing/
- [S45] DMCC Act subscription contract definition (24 September 2026): https://brodies.com/insights/technology/the-dmcc-act-changes-to-rules-surrounding-subscription-contracts/
- [S46] Google Play subscription pause (24 September 2026): https://developer.android.com/google/play/billing/lifecycle/subscriptions
- [S47] Gambling Act 2005, s9: https://www.legislation.gov.uk/ukpga/2005/19/section/9
- [S48] ICO anonymisation guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/about-this-guidance/
- [S49] Strava heatmap (January 2018): https://www.nbcnews.com/tech/security/strava-fitness-tracking-map-reveals-military-bases-movements-war-zones-n841871
- [S50] Health and Fitness CPI benchmark (aggregator, 24 September 2026): https://insertaffiliate.com/blog/mobile-app-user-acquisition-cost-benchmarks/
- [S51] MacroFactor partnership terms (24 September 2026): https://macrofactor.com/macrofactor-partnership/
- [S52] UK influencer rates 2026 (agency aggregates, 24 September 2026): https://www.augmentum-media.com/blog/influencer-pricing-uk
- Psychology (from the 24 September review): [P1] Deci, Koestner and Ryan 1999 https://doi.org/10.1037/0033-2909.125.6.627; [P2] Volpp et al. 2008 https://doi.org/10.1001/jama.2008.804; [P3] Cawley and Price 2013 https://doi.org/10.1016/j.jhealeco.2013.04.005; [P4] Neumark-Sztainer et al. 2006 https://doi.org/10.1016/j.jada.2006.01.003; [P5] Mitchell et al. 2020 https://doi.org/10.1136/bjsports-2019-100633; [P6] Simpson and Mazzeo 2017 https://doi.org/10.1016/j.eatbeh.2017.02.002; [P7] Levinson et al. 2017 https://doi.org/10.1016/j.eatbeh.2017.08.003; [P8] Royer, Stehr and Sydnor 2015 https://doi.org/10.1257/app.20130327; [P9] Halpern et al. 2015 https://doi.org/10.1056/NEJMoa1414293; [P10] Imas 2014 https://doi.org/10.2139/ssrn.2343445; [P11] Gneezy et al. 2010 https://doi.org/10.1126/science.1186744; [P12] Lambrecht and Skiera 2006 https://doi.org/10.1509/jmkr.43.2.212; [P13] DMCC Act 2024 https://www.legislation.gov.uk/ukpga/2024/13; [P14] Song and Baicker 2019 https://doi.org/10.1001/jama.2019.3307; [P15] Jones, Molitor and Reif 2019 https://doi.org/10.1093/qje/qjz023; [P16] Tiggemann and Zaccardo 2015 https://doi.org/10.1016/j.bodyim.2015.06.003
- Repo: `apps/native/app.json`, `apps/native/eas.json`, `apps/native/package.json`, `src/data/sync.ts`, `src/core/data/media.ts`, `supabase/functions/`, `docs/migrations/2026-09-ai-usage.sql`, `docs/plans/roadmap-overview.md`, `native-app-plan.md`, `native-build-plan.md`, `native-dependencies.md`, `ai-platform-plan.md` §3, `label-scan-and-shared-products.md`, `cycle.md` §10, `docs/research/market-wedge-2026-09.md`.

---

## 14. Changelog

- **2026-09-24:** First version (CFO): measured the stack, found the full-history sync pull,
  verified vendor pricing, store rules and DMCC commencement; proposed the free/paid line, Plus at
  £4.99 / £39.99, a Coach plan, the CAC spend rule and break-even scenarios. Same day: additional
  revenue ideas, the `mental-performance` safety review and the "On your side" promise, then
  consolidated into one plan.
- **2026-10-06:** Brought onto `main` with the `cfo` agent; status note that label reading is built
  and free and guest mode is retired. Not re-modelled.
- **2026-11-16:** Rewritten for the native app as a plan to stability and profit. Re-verified store
  commissions (Apple Small Business Program, Google's 30 June 2026 fee split), US, UK and EU
  link-out rules, RevenueCat, Expo EAS, Supabase, Stripe, developer fees and the DMCC start date.
  Added the native cost model, one-off launch and compliance costs (quotes needed), a founder-time
  line, net receipts by channel, a reproducible break-even model with four thresholds in three
  scenarios, the phased path tied to roadmap gates, and verified funding options. Recommended
  in-app purchase only at Plus launch, dropping the supporter payment for now, and treating free
  label reading and its cap as an explicit cost line. Removed the web-only Stripe material, the
  detailed September arithmetic for minor lines (to be re-costed on store nets at Phase 2) and the
  superseded "What runs today" snapshot. Renamed Tali to Tilo.
