# Monetisation plan: costs, pricing and revenue

Owner: CFO agent. First written 24 September 2026 in answer to Benn's question: "How do we keep
a revenue stream, what are our outgoing costs, and where are our revenue opportunities to be very
profitable? Do we charge PTs, or for access to exclusive content?"

**How to read the numbers.** Every figure is one of three things: measured from this repo, cited
from a source (URL and the date checked are in §11), or marked **ASSUMPTION** with a range and the
reasoning. "Unknown" means nobody has measured it yet; the doc says what would find out. Vendor
prices were checked on 24 September 2026 and change often, so re-check them before any budget
decision. Currency: vendors price in US dollars; this doc converts at **ASSUMPTION $1 = £0.75**
(plausible range £0.72 to £0.80). Each figure is derived once, in the section named beside it,
and referenced elsewhere.

## Summary

**Recommendation.** Tali makes money the way a good gym makes money from its classes rather than
its front door: everything that costs us close to nothing stays free, and the paid line is what
has a real running cost.

- **Free forever:** all logging, the built-in and self-built meal and workout plans, reminders,
  on-device trends, sync, export and offline use, and the exercise demo clips (§4.1).
- **Tali Plus:** the AI features in `docs/plans/ai-platform-plan.md`, later guided follow-along
  sessions, at **£4.99 a month or £39.99 a year** (§5.1).
- **Now, before any AI exists:** a one-off supporter payment and an R&D tax relief claim (§6).
- **With Plus:** a founding-member price, give-a-month-get-a-month referrals, pause beside a
  one-tap cancel, a non-renewing annual pass, and the **"On your side" promise** (money back if
  Tali isn't helping, plus a show-up thank-you month) in place of "don't pay if you succeed" (§4.3).
- **Second:** a Coach plan paid by personal trainers, with clients free (§4.2, §5.2).
- **Never:** ads, selling data, affiliates earning from users' health data, lifetime deals on AI,
  or anything that ties money to a body outcome or to failure (§6.3, §7).

**The numbers that matter** (base case, derived where shown):

| Number | Value | Where |
|---|---|---|
| Infrastructure per MAU at 100k MAU (excluding AI) | about £0.0055 a month (half a penny) | §2.4 |
| Net receipts per payer, web + Stripe, VAT-registered, blended | £3.15 a month | §2.3 |
| Contribution per payer after AI and free-user carry | £2.26 a month | §3.1 |
| Break-even before salaries / paying one person | 89 payers / about 1,858 payers | §3.1 |
| Blended LTV / CAC cap per paying user | about £31 / £10 | §3.2, §8.1 |

**Decisions for Benn (in order).**

1. **Approve the free/paid line** in §4.1.
2. **Legal and VAT set-up:** does Tali sell through Gravita (and is Gravita VAT-registered) or a
   new company? This changes net receipts by up to 17% (§2.3). Then Stripe direct versus a
   merchant of record.
3. **Move Supabase to Pro now** (£18.75 a month, §2.1).
4. **Schedule the incremental-pull sync fix** (§1). Not yet done.
5. **Price points:** £4.99 / £39.99, or £5.99 / £44.99 if evals push AI costs up (§5.1).
6. **Trial type:** no-card 14-day (recommended) or card-on-file with reminders (§4.4).
7. **Free AI taste or none.** A small ongoing free allowance (say 12 AI meal parses a month) costs
   $0.04 to $0.18 per free MAU a month by model (`ai-platform-plan.md` §3.2), about £2,700 to
   £13,500 a month at 100k MAU. Recommend the trial instead, revisited only on the cheapest model.
8. **Solicitor view** on any design that puts users' money at stake, before it is built (§10).
9. **Pilot the "On your side" promise** on one cohort (§4.3).
10. **Coach plan timing:** start PT interviews now, build after Plus has three months of data.
11. **Marketing:** adopt the spend rule and the £500 experiment cap (§8.1).

---

## 1. What actually runs today (measured from the repo, 24 September 2026)

| Component | Status today | Evidence |
|---|---|---|
| App hosting | GitHub Pages, built by GitHub Actions on push to `main` | `.github/workflows/deploy.yml` |
| Database, auth, sync | Supabase project `exvblofwiwbvycomxvmj`; tables `settings`, `custom_foods`, `recipes`, `day_logs`, `push_subscriptions`, RLS per user. **Plan tier (Free or Pro): unknown** | `src/data/supabase.ts`, `docs/security-rls.sql` |
| Push reminders | Web Push subscriptions stored in Supabase; a server-side sender runs with the service role outside this repo. **Where it runs and what it costs: unknown** | `src/data/push.ts`, comment in `docs/security-rls.sql` |
| Exercise video | 2 clips in the app bundle (620 KB and 662 KB, measured) plus 2 clips on a Bunny Stream library (`vz-36841ffb-54c.b-cdn.net`) | `public/videos/`, `src/core/data/media.ts` |
| Service worker | Caches the app shell only; video and Supabase go to the network | `public/sw.js` (`tali-v25`) |
| Marketing site | Webflow on www.tali.fit. **Plan tier: unknown** | `CLAUDE.md` |
| AI | **Not live.** No model calls anywhere in `src/` | grep of `src/` |
| Payments, entitlements, analytics | **None.** No Stripe, no paywall, no analytics code | grep of `src/` |
| Food data | Own curated database, free sources (CoFID, brand figures, USDA fallback); £0 licensing | `docs/plans/nutrition-data-and-sourcing.md` |

**Sync pulls the whole history (fix before growth).** `pullAll` in `src/data/sync.ts` fetches
`day_logs?user_id=eq.<uid>&select=*` with no date or `updated_at` filter, and `runSync` runs
800 ms after each burst of changes and on every return to the app (`src/store/store.ts`,
`syncTimer` and the `visibilitychange` listener). Egress per user therefore grows with how long
they have used Tali multiplied by how often they open it. It is harmless today but becomes the
largest infrastructure line at 100k MAU (§2.4). An incremental pull (only rows changed since the
last sync) removes most of it.

---

## 2. Cost model

### 2.1 Fixed monthly costs

| Item | Price found | Monthly (£) | Status | Notes |
|---|---|---|---|---|
| GitHub Pages hosting | Free for public repos | £0 | Live | **Unknown** whether the repo is private; if it is, Pages needs a paid GitHub plan. Check the org's billing page |
| Supabase Pro | $25/month, includes 100k MAU, 8 GB disk, 250 GB egress, $10 compute credit (one Micro instance) [S1] | £18.75 | Recommended now | Free plan projects pause after a week of inactivity [S1]; not acceptable once anyone pays |
| Supabase compute upgrade | Small ~$15, Medium ~$60, Large ~$110, XL ~$210 a month, less the $10 credit [S2] | £0 to £150 | Later | **ASSUMPTION:** Micro to 10k MAU, Small to Medium near 10k, Large near 100k. Real sizing needs load data |
| Webflow site (marketing) | Premium $25/month billed yearly, $39 monthly (plans merged May 2026) [S3] | £18.75 | Live (tier unknown) | Could be lower if the site is on an older plan |
| Domain tali.fit | not checked | **ASSUMPTION** £1 to £5 | Live | Read the registrar invoice |
| Bunny Stream / CDN | $1 monthly minimum [S4][S5] | £0.75 | Live | Usage beyond the minimum is in §2.2 |
| Transactional email (receipts, renewal and trial reminders) | not checked | **ASSUMPTION** £0 to £15 at 10k MAU, £50 to £100 at 100k | Needed with payments | DMCC renewal reminders must go on a durable medium such as email (§10) |
| Apple Developer Program | $99/year [S6] | £6.20 | Only when native | |
| Google Play registration | $25 once [S7] | £0 | Only when native | |
| Accountant, insurance, company admin | not checked | **ASSUMPTION** £100 to £300 | Needed with revenue | Excluded from "infrastructure", included in break-even |

**Fixed infrastructure today, ASSUMPTION base: about £42 a month** (Supabase Pro £18.75, Webflow
£18.75, domain £3, Bunny £0.75, email £0). Adding £150 of admin overheads gives the **base fixed
cost of about £200 a month** used for break-even in §3.1. Founder time and marketing are excluded
and handled separately.

### 2.2 Variable cost per monthly active user (free or paid)

| Driver | Unit price | Usage per MAU per month | Cost per MAU |
|---|---|---|---|
| Supabase MAU | Included to 100k, then $0.00325 each [S1] | 1 | £0 to 100k, then £0.0024 |
| Database egress, **current full-pull sync** | $0.09/GB beyond 250 GB [S1] | **ASSUMPTION** 50 MB (range 10 to 300 MB). Reasoning: a day row of 1 to 4 KB, a few months of history, 10 to 25 syncs on each active day, unknown compression | £0 until the pool is used, then about £0.0034 base, up to £0.02 |
| Database egress, **with incremental pull** | same | **ASSUMPTION** 1 to 3 MB | Stays inside the included 250 GB up to about 100k MAU |
| Database disk | $0.125/GB beyond 8 GB [S1] | **ASSUMPTION** 1 MB per user-year (range 0.5 to 3), and 3 registered accounts per MAU | about £0.0003 |
| Exercise demo clips (Bunny) | Standard network $0.01/GB Europe and North America; volume network $0.005/GB [S5] | **ASSUMPTION** 20 clip plays × 0.64 MB (measured clip size) = about 13 MB | about £0.0001 |
| Web Push | **ASSUMPTION** no per-message fee from browser push services; sender cost unknown (§1) | a few reminders a day | about £0 |
| Edge Functions (for AI calls, later) | 2M invocations included on Pro, then $2 per million [S1] | | about £0 |

**Guest users cost nothing:** guest mode is local-only and never touches Supabase (`CLAUDE.md`).

### 2.3 Variable cost per paying user and net receipts

| Driver | Amount | Source |
|---|---|---|
| AI usage (planned, not live) | Heavy user $1.20 to $4.00 a month depending on model mix; typical users well below | `docs/plans/ai-platform-plan.md` §3.3 |
| AI, as modelled here | **ASSUMPTION** pessimistic £2.00, base £0.75, optimistic £0.30 a month per paying user | Heavy-user range × £0.75, scaled for typical use; repeat meals resolve locally at £0 |
| VAT (if Tali sells through a VAT-registered business) | 20% of the consumer price; registration compulsory above £90,000 taxable turnover in a rolling 12 months [S8] | **Unknown** whether Tali trades inside a VAT-registered company |
| Stripe, UK cards | 1.5% + 20p standard; 2.8% + 20p premium; 2.5% + 20p EEA; 3.15% + 20p international; +2% currency conversion [S9] | |
| Stripe Billing (subscriptions) | 0.7% of billing volume [S10] | |
| Paddle (merchant of record alternative, handles VAT worldwide) | 5% + 50c per transaction [S11] (third-party summary; verify on paddle.com) | |
| Apple in-app purchase (native only) | 15% under the Small Business Program (under $1M proceeds) [S12]; 30% standard | |
| Google Play (native only) | Subscriptions: 10% + 5% billing fee in the EEA, UK and US from 30 June 2026; previously 15% [S13] | |
| RevenueCat (native only, optional) | Free to $2,500 monthly tracked revenue, then 1% [S14] | |

**Net receipts per subscriber per month, at the proposed prices (§5.1):**

| Channel | Monthly plan £4.99 | Annual plan £39.99 (per month) | Blended, 60% annual (**ASSUMPTION**, range 50 to 70%) |
|---|---|---|---|
| Web + Stripe, VAT-registered | £4.99 ÷ 1.2 = £4.158; fees 1.5%×4.99 + 20p + 0.7%×4.99 = £0.310; **net £3.85** | £39.99 ÷ 1.2 = £33.325; fees £0.600 + £0.200 + £0.280 = £1.080; net £32.245 a year = **£2.69** | 0.6×2.69 + 0.4×3.85 = **£3.15** |
| Web + Stripe, not VAT-registered | £4.99 − £0.31 = **£4.68** | (£39.99 − £1.08) ÷ 12 = **£3.24** | **£3.82** |
| App Store 15%, VAT-registered | £4.158 × 0.85 = **£3.53** | £33.325 × 0.85 ÷ 12 = **£2.36** | **£2.83** |

The annual share is anchored on RevenueCat's 2026 finding that Health and Fitness apps take 59%
of revenue from annual plans [S15]; the share of *subscribers* on annual plans for Tali is unknown
until we sell. Stripe keeps its fees when we refund a payment [S16], which matters for any
refund-based offer.

### 2.4 Scenarios at 1k, 10k and 100k MAU (base case, monthly, £)

Base inputs: 4% of MAU paying (**ASSUMPTION**, range 2 to 6%, see §3.1), web checkout through
Stripe, VAT-registered, blended net £3.15 per payer, AI £0.75 per payer, current full-pull sync at
50 MB per MAU.

| Line | 1k MAU | 10k MAU | 100k MAU |
|---|---|---|---|
| Paying users (4%) | 40 | 400 | 4,000 |
| Supabase plan + compute | 18.75 | 22.50 (Small) | 93.75 (Large) |
| Egress beyond 250 GB | 0 (50 GB) | 16.90 (250 GB over) | 320.60 (4,750 GB over) |
| Disk beyond 8 GB | 0 | 2.10 | 27.40 |
| Bunny video | 0.75 | 0.90 | 9.00 |
| Email | 0 | 15.00 | 75.00 |
| Webflow + domain | 21.75 | 21.75 | 21.75 |
| **Infrastructure excluding AI** | **41.25** | **79.15** | **547.50** |
| Infrastructure per MAU | £0.041 | £0.0079 | £0.0055 |
| AI (payers × £0.75) | 30 | 300 | 3,000 |
| Admin overheads (**ASSUMPTION**) | 150 | 150 | 400 |
| **Total costs** | **221** | **529** | **3,948** |
| **Net revenue** (payers × £3.15, after VAT and Stripe) | **126** | **1,260** | **12,600** |
| **Result before salaries and marketing** | **−95** | **+731** | **+8,652** |

With an incremental pull the 100k egress line drops to about £0, taking infrastructure to about
£227 a month (£0.0023 per MAU). In the pessimistic egress case (300 MB per MAU on the current
design) that line is 29,750 GB × $0.09 = about £2,000 a month at 100k MAU. **AI, not hosting, is
the cost that decides profitability,** which is why it is the paid line.

Guided follow-along video (Bunny Stream HLS) is not costed because it is not built. For scale:
**ASSUMPTION** a 20-minute 720p session is 200 to 300 MB; if 20% of 100k MAU watched four a month
that is about 20 TB, or $100 to $200 a month at $0.005 to $0.01 per GB [S5]. Production (video
generation at about $7 to $24 per generated minute before retakes, per `ai-platform-plan.md` §3.4,
plus human form review) is the real cost, and it is fixed per item rather than per user.

---

## 3. Unit economics

### 3.1 Contribution and break-even

Formula: **break-even payers = fixed monthly costs ÷ contribution per payer**, where contribution =
net receipts − AI − payer infrastructure − the free users each payer carries (free users per payer
× cost per free MAU). Salaries and marketing are excluded here and shown on the last line.

| Input | Pessimistic | Base | Optimistic |
|---|---|---|---|
| Channel and net receipts per payer (§2.3) | App Store 15%, VAT: £2.83 | Web Stripe, VAT: £3.15 | Web Stripe, VAT: £3.15 |
| AI per payer | £2.00 | £0.75 | £0.30 |
| Payer infrastructure | £0.02 | £0.02 | £0.02 |
| Paid share of MAU | 2% (49 free per payer) | 4% (24 free) | 6% (15.7 free) |
| Cost per free MAU | £0.010 (full pull, heavier use) | £0.005 | £0.0025 (incremental pull) |
| Free-user carry per payer | 49 × £0.010 = £0.49 | 24 × £0.005 = £0.12 | 15.7 × £0.0025 = £0.04 |
| **Contribution per payer** | 2.83 − 2.00 − 0.02 − 0.49 = **£0.32** | 3.15 − 0.75 − 0.02 − 0.12 = **£2.26** | 3.15 − 0.30 − 0.02 − 0.04 = **£2.79** |
| Fixed costs a month | £400 (higher admin, Apple fee, bigger compute) | £200 | £120 |
| **Break-even payers** | 400 ÷ 0.32 = **1,250** | 200 ÷ 2.26 = **89** | 120 ÷ 2.79 = **43** |
| MAU needed at that paid share | 62,500 | about 2,200 | about 720 |
| Paying one person **ASSUMPTION** £4,000 a month fully loaded (range £3,000 to £6,000) | 4,400 ÷ 0.32 = 13,750 payers | 4,200 ÷ 2.26 = **1,858 payers** (about 46k MAU) | 4,120 ÷ 2.79 = 1,477 payers (about 25k MAU) |

**By plan (base).** Per-payer costs are £0.75 + £0.02 + £0.12 = £0.89 a month, so a monthly-plan
payer contributes £3.85 − £0.89 = **£2.96 a month** and an annual-plan payer £32.245 − 12 × £0.89
= **£21.57 a year** (£1.80 a month).

**Reference scale for comparing ideas.** At 10k MAU and 4% paying there are 400 payers (240
annual, 160 monthly at 60% annual), contributing 400 × £2.26 = **£904 a month**. "Impact" in §6
means the change in that monthly contribution.

**What drives the result, in order:** AI cost per payer, then the channel (App Store versus web),
then the paid share of MAU. The pessimistic column shows Tali can lose money per subscriber if AI
runs on the most expensive model with no fair-use limit and sales go through the App Store. All
three are choices we control.

**About the paid-share assumption.** The published figures measure something narrower:
RevenueCat's 2026 report gives a 2.1% median download-to-paid rate by day 35 for freemium apps
overall and 2.9% for Health and Fitness across all paywall types [S15]; Adapty reports 1.78%
install-to-paid for Health and Fitness onboarding paywalls with trials [S17]. These count installs
(including people who never come back), are dominated by US App Store apps, and are medians across
very different products. Paid share of *active* users should be higher because the inactive drop
out of the denominator, hence the 2 to 6% range, but **Tali's real figure is unknown** until we
sell.

### 3.2 Lifetime value (base)

- **Annual subscriber:** contribution = £2.69 − £0.75 AI − £0.02 infra = £1.92 a month, so £23.00
  a year. RevenueCat reports 28% of yearly subscribers on freemium apps are retained after 12
  months [S18]; expected paid years = 1 ÷ (1 − 0.28) = 1.39. **LTV ≈ £23.00 × 1.39 = £32.**
- **Monthly subscriber:** contribution £3.85 − £0.77 = £3.08 a month. Monthly churn for Tali is
  unknown; **ASSUMPTION** 10% (range 7 to 15%) gives an expected 10 paid months. **LTV ≈ £31.**
  First-12-month contribution is £3.08 × (1 − 0.9¹²) ÷ 0.1 = £3.08 × 7.18 = £22.
- **Blended LTV ≈ £31**, and about £22 in the first year.

These rest on industry retention, not ours; replace them with our own cohorts after three months
of sales.

---

## 4. Recommended model: generous free, paid where it costs us

### 4.1 The line

| Free forever (never degraded) | Tali Plus | Coach plan (paid by the PT) |
|---|---|---|
| Food logging: search, usuals, recipes, quick estimate, custom foods, barcode when built | Describe a meal in words and have it logged (AI parse) | Coach dashboard: see consenting clients' logs and check-ins |
| Workouts: built-in Push/Pull/Legs, the plan builder, all self-built and templated plans | Photo logging (AI) | Assign plans and templates to clients |
| Weight, body stats, check-ins, supplements and reminders | AI recipe capture (`ai-recipe-capture.md`) | Messaging and notes |
| All history, charts and on-device trends (`insights.ts` runs locally at £0) | Weekly AI summary | Optional: pay for Plus for clients |
| Sync across devices, export and backup, offline use | AI coach conversation (wellness guidance only) | |
| Exercise demo clips and form cues | Later: guided follow-along sessions, voice logging | |
| All wellbeing and safety content | Later: AI-personalised meal plan with shopping list | |

**Why the line sits here.** Fairness rule 2 says charge for what costs money or is clearly extra.
Everything in the left column costs under a penny per user per month (§2.4), so paywalling it would
only create the resentment Benn describes. Sync is free even though it is the main infrastructure
cost, because it is how users keep their own data (rule 1); the incremental pull keeps it cheap.
Demo clips stay free because form guidance is a safety matter (rule 4).

### 4.2 Direct answers

**Meal and workout plans: free.** The built-in plans and the plan builder cost nothing to serve,
and "pay to see a plan" is the most resented pattern in the category. The only plan-shaped thing
in Plus is one the AI generates for you, because each generation is a paid call.

**PT / coach seats: yes, charge PTs, not their clients.** This matches how the PT platforms work:
TrueCoach is "100% free for your clients" [S19]; Everfit says client-facing features are free to
end users [S20]. Each coach brings clients at zero acquisition cost to us. But it needs a coach
dashboard, a consent-based data-sharing model with RLS changes (a `security-data` review) and
support, so it comes **after** Plus proves its conversion rate. Pricing is in §5.2.

**Exclusive / creator content: not now; later as optional one-off extras with a revenue share.**
Programmes from vetted creators (a six-week running plan, a mobility series) sold once or included
in Plus, reviewed by `fitness-workouts` / `nutrition-accuracy`, never marketed on body image,
never replacing a free plan. Economics are in §6.2.

### 4.3 The "On your side" promise (replaces "don't pay if you succeed")

Benn's instinct is right: Tali should visibly win only when users win. The fair core of "don't pay
if you succeed" is "don't pay for what you didn't get", and it can be kept without tying money to
the body:

1. **Money back if Tali isn't helping.** Within 60 days, tell us it isn't working and get a refund,
   no proof needed. It keeps "we win when you win" without judging anyone's results.
2. **Show-up thank-you.** Complete any 8 weekly reviews in your first 12 weeks and get a free month,
   or give it to a charity. It is presented as a surprise thank-you, not a target, because
   unexpected rewards do not crowd out motivation [S21]. It counts weekly reviews only, never
   workouts or food logs, and a missed week never resets it (§7).

**Why not the original idea.** A full refund on reaching a goal leaves us Stripe's £1.08 fee
[S16] plus £9.00 of AI, £0.24 of infrastructure, £1.44 of free-user carry and about £1 of claim
checking (**ASSUMPTION** 3 to 5 minutes at about £15 an hour), so each success costs £12.76 a year
against £21.57 for a payer who does not claim (§3.1): contribution per annual payer = (1 − *s*) ×
£21.57 − *s* × £12.76, down 32% at a 20% success rate, 75% at the 47% who hit target in the Volpp
deposit arm [S22], and zero at 63%. The rate would drift upwards as the offer attracts confident
users and easy goals, so the better Tali works the less it earns; on top of that, weight in Tali
is self-reported and cannot be verified, and a user who gains weight would pay while others did
not (rule 4).

**Cost and pilot.** Each refund keeps Stripe's fee (£1.08 on an annual sale, §2.3) and the AI
already used; each thank-you month gives up about £3.15 of blended net receipts (§6.2, referrals).
Refund take-up is unknown, so pilot on one cohort and measure weekly review completion, retention
at weeks 13 and 26, refund take-up and gentle-mode escalations; the guardrail metric is no rise in
risk-language flags. Most incentive trials run 3 to 6 months and none tested app pricing directly,
so this is evidence-informed, not proven.

### 4.4 Trial, pricing terms and fair billing (fairness rule 3, DMCC)

**Trial.** Recommend a **14-day Plus trial with no card required**: at the end, Plus simply stops
unless the user chooses to subscribe. It cannot surprise-bill anyone and sidesteps the DMCC trial
obligations for the trial itself. RevenueCat reports that long trials (17 to 32 days) convert
about 70% better than trials under 4 days (42.5% vs 25.5%) [S18], though those are card-required
trials, so our no-card figure is unknown. If Benn prefers a card-on-file trial, remind 3 to 7 days
before billing and make cancellation one tap in the app.

**Lifetime deals: no**, for anything containing AI. A lifetime price is a permanent liability
against a per-call cost. A **founding-member price** (£29.99 a year for as long as the subscription
continues, costed in §6.2) is acceptable if it is a flat price with renewal terms stated plainly;
an introductory price that steps up would bring in the DMCC reduced-price rules [S23].

**Fair billing.** Offer **pause** (one to three months on the monthly plan) on the same screen as a
one-tap Cancel, never in front of it, and a **non-renewing annual pass** for people who distrust
subscriptions. Both are costed in §6.2 and should ship before the DMCC regime starts in January
2027 (§10).

---

## 5. Pricing proposal and comparables

### 5.1 Consumer

| App | Monthly | Annual | Free tier? | Source and caveat |
|---|---|---|---|---|
| MyFitnessPal Premium (UK) | £9.99 | £64.99 (Premium+ £79.99) | Yes, heavily limited | [S24] third-party review, not the vendor page |
| Strava (UK) | £8.99 | £54.99 | Yes | [S25] third-party summary |
| MacroFactor (US) | $11.99 | $71.99 (bundle $89.99) | No, 7-day trial | [S26] third-party summary |
| Cronometer Gold (US) | $10.99 | $59.99 | Yes, generous | [S27] third-party; some sources say $49.99 |
| Fitbod (US) | $15.99 | $95.99 | No, 7-day trial | [S28] third-party |
| **Tali Plus (proposed)** | **£4.99** | **£39.99** | **Yes, full core loop** | |

UK prices shown include VAT; US prices exclude sales tax. Treat third-party prices as indicative
and re-check vendor pages before publishing any comparison.

At £39.99 a year Tali Plus is about 27% below Strava, 38% below MyFitnessPal Premium, about 11%
below Cronometer's US price converted (roughly £45) and about 45% below Fitbod (roughly £72). That
is deliberate: Tali's free tier does more than theirs, so Plus sells extras rather than rescuing a
crippled core.

**The price must cover AI.** On the annual plan a VAT-registered web sale nets £2.69 a month
(§2.3). A heavy user on an all-Opus mix costs $3.50 to $4.00 (£2.60 to £3.00) a month
(`ai-platform-plan.md` §3.3), so that user would lose money. Two safeguards: a published fair-use
limit per month (stated up front, never a surprise), and model choice by evals. **If evals require
Opus for meal parsing, raise the annual price to £44.99 or move parsing to a cheaper model before
launch.**

### 5.2 Coach plan

| Plan | Price (incl. VAT) | Clients | Comparables |
|---|---|---|---|
| Coach Free | £0 | up to 3 | Trainerize Basic free for 1 client; Everfit Starter free to 5 [S29][S20] |
| Coach | £19/month | up to 15 | Trainerize Pro $23 from 5 clients; TrueCoach Starter $26.34 for 5; Everfit Pro from $19 [S29][S19][S20] |
| Coach Plus | £39/month | up to 40 | TrueCoach Standard $57.99 for 20, Pro $136.99 for 50 [S19] |

Coach at £19: £19 ÷ 1.2 = £15.83; Stripe 1.5%×19 + 20p + 0.7%×19 = £0.62; **net £15.21 a month**.
Clients cost us about £0.01 each in infrastructure, so margin is above 95% unless the coach buys
Plus for clients, which should be a priced add-on (**ASSUMPTION** £2 per client per month, against
a base AI cost of £0.75). Prices are **ASSUMPTIONS** to test; PT willingness to pay for Tali is
unknown and five or ten coach interviews would tell us more than any benchmark.

---

## 6. Revenue lines

### 6.1 Ranked

Ranked by value to the business within the fairness rules. Build: S = days, M = one to three
weeks, L = more than a month or needs sales and legal work. Impact is at the 10k MAU reference
(£904 a month, §3.1) unless stated.

| Rank | Line | Who pays | Margin or impact (base) | Build | Fairness | When |
|---|---|---|---|---|---|---|
| 1 | **Tali Plus** (AI features) | Users | About 75% of net: (£3.15 − £0.75 − £0.02) ÷ £3.15 | M: Stripe checkout, entitlements, AI proxy per `ai-platform-plan.md` | Pass: pays for a real per-call cost | With the first AI feature |
| 2 | **Coach plan** | PTs | Above 95% without client Plus (§5.2) | L: dashboard, consent sharing, RLS changes, support | Pass if clients stay free and consent is explicit | After Plus has three months of data; interviews now |
| 3 | **Referrals**, give a month get a month | Us, as foregone revenue | CAC about £4 to £6.50 per paying user | S to M | Pass | With Plus launch |
| 4 | **Founding-member price lock** | Early users | −£0.68 a month per founder against full price | S | Pass | At Plus launch |
| 5 | **Pause and non-renewing annual pass** | Users | Pause about +£50 of LTV a month; pass about −3% blended LTV unless it lifts conversion | S | Pass | Before January 2027 |
| 6 | **Supporter payment**, nothing locked | Fans | +£27 to +£134 | S | Pass | Now, before AI |
| 7 | **R&D tax relief and grant check** | Government | About +£270 to +£900 if spend qualifies | S to M | Pass | Now |
| 8 | **Pay-what-you-can with hardship places; gifts and sponsorship** | Users, givers | About neutral (−£65 to +£37); gifts +£23 to +£69 | S to M | Pass; gift copy is a concern | After three months of sales |
| 9 | **AI credit top-ups** | Light and heavy users | About +£30, could be negative | M | Pass | Once fair-use data exists |
| 10 | **Curated creator and one-off programmes** | Users (one-off) | **ASSUMPTION** 40 to 50% after a 50% creator share and fees; about +£53 gross before production | M | Concern | Later; pilot with one vetted creator |
| 11 | **Family plan** | Households | Unknown, probably small | M | Pass with conditions | After Plus conversion is known |
| 12 | **Workplace wellness (B2B)** | Employers | About +£420 per 500-employee client | L | Concern | Not before 10k MAU; one friendly pilot earlier as a learning deal |
| 13 | **Printed annual report** | Users | About +£38 | M | Concern | Later |
| Test | **Idle-month credit** | Us | −£92 unless monthly churn falls to about 8.0% | M | Pass | One cohort only |

**In time order:** the supporter payment and the R&D claim now, because they need no AI and the
supporter payment proves the payments stack; then Plus with the founding price, referrals and the
"On your side" pilot (§4.3); pause and the non-renewing pass before January 2027; pay-what-you-can,
hardship places and gifts after three months of sales; credits once fair-use data exists; then
Coach.

### 6.2 Notes and arithmetic

**Referrals.** The referrer gets a free month when the friend's first payment clears; the friend
gets a 30-day trial instead of 14. Free months are the most common reward in fitness referral
programmes [S30]. The referrer's month gives up £3.85 (monthly) or £2.69 (annual), about £3.15
blended; the friend's 16 extra trial days cost about £0.40 of AI, and at **ASSUMPTION** 15 to 40%
trial-to-paid that is £1.00 to £2.67 per payer. **CAC about £4 to £6.50, inside the £10 cap
(§8.1).** A free user who refers gets a Plus month instead, costing about £0.77. Share link only
(no contact-book upload), a cap of 12 reward months a year, reward only on a real card payment.

**Founding-member price.** £29.99 a year for the first 500 subscribers or first 90 days: net
£24.99 − (£0.45 + £0.20 + £0.21) = £24.13 a year, £2.01 a month; contribution £2.01 − £0.89 =
£1.12 against £1.80, so **−£0.68 a month per founder** against a full-price counterfactual (500
founders = −£340 a month), though most founders would not otherwise have paid that early. On
pessimistic AI (£2.00) a founder loses £0.13 a month, so the fair-use limit applies.

**Pause.** Google Play offers pauses of up to three months, not for annual plans [S31]. 160
monthly payers × 10% churn = 16 cancellations a month; **ASSUMPTION** 20% choose pause (range 10 to
30%) and half resume: 1.6 payers kept a month × £31 = **about £50 of LTV added each month** (range
£25 to £75). Cancel must stay equally prominent, or it breaches the DMCC "as easy as sign-up" rule
[S32][S33].

**Non-renewing annual pass.** Twelve months at £39.99 that simply ends, with an email before it
does; a contract that does not auto-renew falls outside the DMCC subscription definition [S23].
**ASSUMPTION** renewal drops from 28% (§3.2) to 20% for pass buyers: expected paid years 1 ÷ (1 −
0.2) = 1.25 against 1.39, so LTV on that segment falls 10%; if 30% of annual buyers choose it,
blended LTV falls 3%, recovered if it lifts annual conversion by 3% or more.

**Supporter payment.** A one-off £10, £25 or £50, or £20 a year, with cosmetic thanks only (an
alternative app icon, a name in the credits, beta builds). Comparable: Obsidian's Catalyst
licence, a one-off $25, $50 or $100+ that unlocks no features [S34]. £20 a year nets £20 ÷ 1.2 −
(£0.30 + £0.20 + £0.14) = £16.03, about £1.34 a month with no AI cost; a one-off £25 nets £20.83 −
£0.58 = £20.26. **ASSUMPTION** 0.2 to 1% of MAU: at 0.5%, 50 supporters × £1.34 = **£67 a month**
(range £27 to £134). One-off payments are not subscription contracts under the DMCC definition
[S23]; a recurring supporter plan would be. Include the supporter perks in Plus.

**R&D relief and grants.** Innovate UK Smart grants have been paused since January 2025, and their
replacement for new applicants, Growth Catalyst Early Stage: New Innovators, closed on 6 August 2025
[S35]. Knowledge Transfer Partnerships and Innovation Loans run on rolling deadlines, and Frontier
AI competitions are scheduled from October 2026 (third-party pipeline summary) [S36]; a consumer
wellness app is a weak fit for most themed calls, so check the Innovation Funding Service monthly.
The surer money is R&D tax relief: the merged scheme gives a 20% above-the-line credit (about 16.2p
per £1 after tax), and loss-making SMEs spending at least 30% on R&D can claim up to 26.97p per £1
under ERIS [S37]. **ASSUMPTION** £20k to £40k a year of qualifying cost (offline sync, the estimate
model, AI evaluation): £3.2k to £6.5k a year under the merged scheme, £5.4k to £10.8k under ERIS,
**about £270 to £900 a month**. If no one draws a salary, qualifying cost is close to nil; it needs
an adviser and a view on founder salary.

**Pay-what-you-can and hardship places.** Plus at three visible prices, £2.99, £4.99 or £7.99 a
month (annual £24.99, £39.99, £59.99), plus "free for six months, no questions, renewable once".
Contribution at £2.99 = £2.99 ÷ 1.2 − (1.5% × 2.99 + 20p + 0.7% × 2.99) − £0.89 = **£1.34**; at
£7.99 = £6.66 − £0.38 − £0.89 = **£5.39**. **ASSUMPTION** mix 25% low, 65% standard, 10% high:
0.25 × 1.34 + 0.65 × 2.96 + 0.10 × 5.39 = £2.80, about 5% below £2.96. Hardship places capped at 5%
of payers: 20 × £0.77 = £15 a month. With no conversion lift the net is £904 × 0.945 − £15 − £904 =
about −£65 a month; break-even needs about an 8% lift in paying users; a 12% lift gives £854 × 1.12
− £15 − £904 = about +£37. Comparables: Beeminder's discounts for students, jobseekers, seniors and
non-OECD users [S38]; Headspace's free year for unemployed Americans in 2020 [S39]; Ethical
Consumer's pay-it-forward fund [S40]. No mainstream fitness app was found running a visible
sliding scale (searched 24 September 2026), so the mix is unknown.

**Gifts and sponsorship.** A prepaid 12 months of Plus with no auto-renew (so not a subscription
contract [S23]), plus "sponsor a year for someone who cannot afford it", funding the hardship
places. Comparable: Headspace sells 3, 6 and 12-month gifts [S41]. A redeemed gift contributes
about £23 (§3.2). **ASSUMPTION** gifts equal 5 to 15% of annual payers a year: 12 to 36 × £23 =
£276 to £828 a year, **£23 to £69 a month**, concentrated in December and January.

**AI credit top-ups.** Packs such as £2.99 for 150 AI actions, never expiring. Net per pack £2.49 −
(£0.045 + £0.20) = £2.25; 150 meal parses cost about $0.90 (£0.68) on Sonnet 5 or $2.25 (£1.69) on
Opus 5 (`ai-platform-plan.md` §3.2), so contribution **£1.57** (Sonnet) or **£0.56** (Opus) a pack.
**ASSUMPTION** 2% of the 9,600 free users buy one pack a quarter: 192 × £1.57 ÷ 3 = £100 a month;
**ASSUMPTION** 10% of the 400 payers downgrade to one pack a quarter: 40 × (£2.26 − £0.52) = −£70.
Net about **+£30 a month**, possibly negative. Its real value is as a fair-use top-up for heavy
Plus users (§5.1) and a fair option for light users; credits are becoming common for metered AI
features [S42]. The 20p Stripe fee makes packs below about £2.99 poor value to us.

**Curated creator and one-off programmes.** For example an eight-week couch-to-5k with guided
video, sold once and kept. £7.99 nets £6.66 − (£0.12 + £0.20) = £6.34 before any creator share.
Production is fixed: **ASSUMPTION** 20 generated minutes at $7 to $24 a minute (£105 to £360,
`ai-platform-plan.md` §3.4) plus £200 to £500 of expert review, so 48 to 136 sales to break even.
**ASSUMPTION** 1% of 10k MAU buy one a year: 100 × £6.34 ÷ 12 = **£53 a month** gross, before
production. The creator share is in §8.3; "owned forever" commits us to hosting.

**Family plan.** Family Plus at £59.99 a year for up to four separate, private accounts, with fair
use per member. Comparable: Strava Family at £99 a year for up to four against £54.99 for one
[S43]. Net £49.99 − (£0.90 + £0.20 + £0.42) = £48.47; **ASSUMPTION** 2.5 active members × (£9.00
AI + £0.24) = £23.10, so about **£25 a year per family**, against £23 for one annual individual
(§3.2) but £46 for two. It adds money only where it converts households that would not otherwise
pay. No member may see another's data (weight monitoring within couples or of teenagers is a real
harm); needs `security-data` and `mental-performance`.

**Workplace wellness.** Employers pay per eligible employee; employees get Plus. Comparables:
Headspace for Work at about $12 to $36 per employee a year (a third-party procurement estimate)
[S44]; Wellhub pays app partners per validated use under contract [S45]. **ASSUMPTION** £1 per
employee a month, 500 employees, 20% activate (range 10 to 30%): £500 − 100 × £0.77 = **about £420
a month per client**, the same as about 186 consumer payers (£420 ÷ £2.26). Build includes admin,
invoicing, a DPIA and security questionnaires; guardrails are in §7.

**Printed annual report.** The digital "year in Tali" is the user's own data and stays free (rule
1); a printed book is an optional extra. Comparable: Day One books from $19.99 for 50 pages plus
$0.10 a page [S46]. **ASSUMPTION** £19.99 price, £8 to £12 print-on-demand and postage (not quoted):
£16.66 − £10 − £0.50 fees = about £6 a book; 0.75% of 10k MAU = 75 books = £450 a year, **about £38
a month**. Health data goes to a print vendor (processor agreement, `security-data`) and weight is
off by default.

**Idle-month credit (test).** On the monthly plan, a month with no Plus requests is credited
against the next bill automatically: rule 2 applied to billing. **ASSUMPTION** 15% of monthly
payer-months are idle (range 10 to 25%): 160 × 0.15 × £3.85 = **£92 a month**. Per monthly payer
that is £0.58, so contribution £2.96 → £2.38, and it pays for itself if monthly churn falls from
10% to about 8.0%. Unknown until tested on one cohort.

### 6.3 Rejected, with reasons

- **Full refund on reaching a goal:** loses money as success rises and fails rule 4 (§4.3).
- **Goal-based partial refund:** the same rule 4 problem at a smaller price.
- **Cash consistency rebate on logging:** pays for taps, rewards compulsive logging and fines missed days; the safe form is the show-up thank-you (§4.3).
- **Commitment deposits kept by Tali (Beeminder model):** earns exactly when users struggle [S47]; possible unlicensed betting under s9 of the Gambling Act 2005 [S48].
- **Commitment deposits forfeited to charity:** still money tied to outcomes, and few people take them up (about 14% in [S49]).
- **Charity donation tied to a weight outcome:** gamifies the body; the behaviour form lives in the thank-you month.
- **"Share the win" milestone gift month:** superseded by the show-up thank-you, which counts weekly reviews rather than workouts.
- **Non-AI lifetime deal:** nothing to sell without paywalling something free (rule 2); the honest version is the supporter payment.
- **White-label for gyms:** turns Tali into an agency and makes gyms controllers of members' health data; the Coach plan serves studios.
- **Open creator marketplace:** review cost and rule 5 risk grow with every creator; keep a curated pilot.
- **Product and grocery affiliates:** small revenue for a real trust cost; a basket hand-off can come later as a free, untagged feature.
- **Ads:** fail rules 4 and 6.
- **Selling or licensing data, even anonymised:** fails rule 6; health data is easy to re-identify [S50], as Strava's "anonymised" heatmap showed [S51].

---

## 7. Psychological safety guardrails

Reviewed by the `mental-performance` agent on 24 September 2026; the two agents agree that nothing
should tie money to an outcome or to failure. Findings summarise the papers cited; confirm effect
sizes before quoting any of them publicly.

| Idea | Verdict | Key guardrail |
|---|---|---|
| Free if you hit your goal (outcome, e.g. weight) | **Avoid** | Contingent rewards undermine intrinsic motivation [S21]; weight was regained after incentives stopped [S22]; workplace weight incentives had high dropout [S52]; dieting predicts later disordered eating [S53]. Never make the outcome weight |
| Consistency reward for behaviours | Safe with guardrails | Behaviour incentives raise activity modestly while they run [S54]. Count weekly reviews or check-ins only, never workout volume or calorie logging [S55][S56]; generous threshold (8 of 12 weeks) that a miss never resets; gain framing only |
| Commitment deposits | **Avoid** | Works for the few who opt in [S57][S49], but losing money after a bad week is punishment |
| Charity donation on a goal | Safe with guardrails | Prosocial incentives can sustain effort [S58]. Behaviours only, never weight; Tali pays, not the user |
| Pay what you can, free hardship option | Safe | Pairing price with a social cause raised uptake and revenue [S59]. No means-testing, no questions |
| Supporter tier, nothing locked | Safe | Adds no pressure |
| AI credits | Safe with guardrails | Metering creates a "taxi meter" feeling [S60]. Flat Plus stays the default; no countdown mid-conversation; crisis responses never draw on credits |
| Referral months | Safe with guardrails | No leaderboards, no "invite 3 or lose access"; friends see no stats about the referrer |
| Pause instead of cancel | Safe | Cancel stays one tap, as the DMCC Act 2024 requires [S61] |
| Employer wellness | Safe with guardrails, lowest priority | Large trials found no health effect [S62][S63]. Employer sees only groups of 50 or more; voluntary, no payment tied to participation; no team leaderboards; DPIA treats it as special category data |
| Gifting or sponsoring | Safe with guardrails | Frame as general wellbeing, never "for someone who needs to lose weight"; the giver sees nothing; the recipient sets their own goals |
| Creator programmes | **Avoid** body-focused creators | Fitspiration imagery worsens mood and body image [S64]. No before-and-after photos, physique marketing or weight claims; plans stay free |
| Trial and renewal reminders, upsell timing | Safe with guardrails | Remind 3 to 7 days before any charge; no fake countdowns |

**Across everything.** Users must be 18 or over, and anyone the screener routes to gentle mode is
excluded from any contingent mechanic. Never upsell during a crisis script, in gentle mode, after a
low mood or bad check-in, after a weight gain or missed streak, or mid-log; offer upgrades after a
moment of competence such as a completed weekly review. All paywall, upsell, trial and
notification copy goes through `mental-performance`.

---

## 8. Go-to-market spend

### 8.1 The spend rule

1. **A channel may scale only when its measured cost per new paying user is at most one third of
   LTV (base £10, from §3.2) and pays back within 12 months (base £22).** Until we have our own
   LTV, use £10.
2. **Measure before scaling:** a channel needs at least 30 paid conversions attributed through a
   referral code or link before its CAC counts as measured.
3. **Experiment budget cap:** **ASSUMPTION** £500 a month in total across all untested channels
   until the first cohort is measured. This is a cash-safety rule, not a target.
4. **Pay for outcomes where possible:** affiliates and creators on commission per paying user
   rather than flat fees.
5. **Never:** weight-loss or body-image creative, before/after imagery, or targeting by health
   condition (rule 4). Creators must label paid content as advertising under UK ASA/CMA influencer
   rules (check the current guidance before the first deal).

### 8.2 Why paid install ads do not work at Tali's price

A third-party benchmark puts Health and Fitness cost per install at $4.30 to $5.50 [S65]
(aggregator figure, method not published; treat as indicative). RevenueCat's median Health and
Fitness download-to-paid rate within 35 days is 2.9% [S15]. So CAC per paying user ≈ $4.30 ÷
0.029 = **$148 (about £111)**, against an LTV of about £31: roughly £80 lost per subscriber. Even
the healthier "cost per trial" framing ($20 to $40 per trial, 45 to 50% trial-to-paid [S66], a
single-agency view) gives £30 to £67 per subscriber. **Growth has to come from organic search and
content on the Webflow site, word of mouth and referrals (§6.2), PR, creators paid on performance,
and coaches bringing clients.** Paid ads become viable only if our own LTV turns out several times
higher than modelled.

### 8.3 Commission structures

| Programme | Structure | Worked example | Check against the rule |
|---|---|---|---|
| Referral affiliate / creator code | 30% of the first payment's net (ex VAT, before fees) | Annual: 30% × £33.33 = **£10.00**; monthly: 30% × £4.16 = **£1.25** | Annual £10 = the £10 cap; monthly well inside |
| Recurring alternative | 20% of net for the first 12 months | Annual: £6.67; monthly: 20% × £4.16 × 7.18 expected months = £5.97 | Inside the cap |
| Market reference | MacroFactor pays 40% of the first subscription payment [S67]; aggregators put subscription fitness apps at 15 to 25% recurring [S68] | 40% of £33.33 would be £13.33 | Above our cap: do not match MacroFactor at our price |
| Flat-fee micro-influencer post | UK micro-influencers (10k to 50k followers) quote about £150 to £800 per Instagram post and £300 to £1,200 per TikTok [S69] (aggregated agency figures, wide variance) | A £500 post must produce 50 paying users to meet the £10 cap: about 1,700 installs at 2.9% | Rarely met by one micro post. **Test only, then convert to commission** |
| Creator programme revenue share | **ASSUMPTION** 50% of net receipts (after VAT and payment or store fees) to the creator | £9.99 programme on web, VAT-registered: £8.33 − £0.35 Stripe (1.5% + 20p, no Billing fee on a one-off) = £7.98; creator £3.99 | No published comparable found; treat as a negotiating start |
| Coach referral | Free month of Coach per referred coach who pays for 2 months | | Zero cash CAC |
| PR | Agency retainers: **unknown** (not researched) | Judge by referral-code conversions over 60 days | Same £10 test |

---

## 9. Metrics to instrument now

Our own numbers should replace every industry median above within three months of launch. Collect
them first-party and aggregated (no third-party trackers seeing health data; `security-data` to
review the design). Guests stay uncounted beyond an anonymous install count.

| Metric | Definition | Why |
|---|---|---|
| Installs and sign-ups | By source (referral code, UTM, coach invite) | CAC by channel |
| Activation | Share of new users who log on 3 of their first 7 days (**ASSUMPTION**: tune after seeing data) | Leading indicator of retention |
| D1, D7, D30 retention | Returned and logged on that day, by weekly cohort | The best predictor of paid conversion |
| WAU/MAU | Stickiness | |
| Sync egress per MAU | From Supabase usage and logs | Validates the 50 MB assumption; tracks the incremental-pull fix |
| AI calls and cost per user | Per feature, per model, per day; alert on outliers | The cost that decides profit |
| Trial starts, trial-to-paid | By trial type | Pricing and trial decisions |
| Free-to-paid | Paying users ÷ MAU, and install-to-paid by day 35 | Break-even |
| Plan mix | Monthly versus annual | Net receipts |
| Churn and reason | Monthly churn, annual non-renewal, one-tap optional reason | LTV |
| Refunds and cooling-off exits | Count and value | DMCC, fairness and the "On your side" pilot |
| Coach metrics (later) | Coaches, clients per coach, coach churn | Coach plan viability |

---

## 10. Risks

- **UK subscription law.** The DMCC Act subscription regime starts in **January 2027**, brought
  forward from spring 2027 by a government announcement on 9 August 2026 [S32][S70]. It requires
  key pre-contract information shown separately, an express acknowledgement at the final step,
  reminder notices at least every six months on a durable medium, a 14-day renewal cooling-off
  period, and online cancellation as easy as sign-up [S32][S33]. Any paid launch should meet it
  from day one rather than retrofit.
- **User money at stake.** Any design where users stake money that Tali keeps on failure starts to
  look like "betting" on "the likelihood of anything occurring or not occurring" under the
  Gambling Act 2005 s9(1) [S48], which needs a Gambling Commission licence. A solicitor must look
  at any such design before it is built.
- **App store rules if Tali goes native.** In the US, external purchase links are currently
  commission-free after the April 2025 contempt ruling, but the Ninth Circuit (December 2025)
  vacated the complete commission ban and the Supreme Court has granted Apple's petition, so a
  commission on links may return [S71][S72]. In the UK the CMA consulted on steering (responses
  closed 28 July 2026) and had not decided as of mid-September 2026 [S73][S74]. In the EU, Apple's
  terms from 1 October 2026 set 15% standard / 10% reduced for link-out and 26% / 15% for in-app
  purchase [S75]. **The PWA with Stripe avoids all of this;** stay web-first for payments until a
  native app earns its keep.
- **AI cost overrun.** Mitigate with a fair-use limit, per-user daily caps in the AI proxy,
  cheaper models where evals allow, and local resolution of repeat meals (§5.1).
- **Full-pull sync egress** (§1).
- **VAT.** If Tali sells through a VAT-registered company, 1/6 of every UK consumer payment is VAT.
  EU consumers owe VAT from the first sale regardless of the UK threshold (not researched in detail;
  an accountant should confirm). A merchant of record such as Paddle removes the admin but costs
  5% + 50c [S11], about 12 to 13% of a £4.99 monthly plan.
- **Conversion unknown.** All revenue lines rest on the 2 to 6% assumption (§3.1).
- **Coach features and data sharing:** consent, revocation and RLS must be right (`security-data`);
  coaches must stay within wellness guidance (rule 5).
- **Creator content:** body-image risk and unreviewed advice (§7).
- **Supabase Free plan pausing** if the project is still on Free [S1].
- **Industry benchmarks are thin.** RevenueCat and Adapty are vendor datasets skewed to apps using
  their SDKs, mostly native; CPI and influencer rates come from agencies and aggregators with
  undisclosed methods.

---

## 11. Sources (all checked 24 September 2026)

- [S1] Supabase pricing: https://supabase.com/pricing
- [S2] Supabase compute sizes: https://supabase.com/docs/guides/platform/compute-and-disk
- [S3] Webflow May 2026 pricing (Premium plan): https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026 and https://www.memberstack.com/blog/new-webflow-pricing-in-2026-what-every-plan-costs-and-how-to-choose (vendor page could not be fetched; figures from search summaries)
- [S4] Bunny Stream pricing: https://bunny.net/pricing/stream/
- [S5] Bunny CDN pricing: https://bunny.net/pricing/cdn/
- [S6] Apple Developer Program fee: https://developer.apple.com/programs/whats-included/ (fee figure via https://www.revenuecat.com/blog/engineering/small-business-program)
- [S7] Google Play registration: https://support.google.com/googleplay/android-developer/answer/6112435
- [S8] UK VAT threshold £90,000: https://commonslibrary.parliament.uk/research-briefings/sn00963/
- [S9] Stripe UK pricing: https://stripe.com/gb/pricing
- [S10] Stripe Billing pricing: https://stripe.com/gb/billing/pricing
- [S11] Paddle fees (third-party summary): https://dodopayments.com/blogs/paddle-fees-explained
- [S12] Apple App Store Small Business Program: https://developer.apple.com/app-store/small-business-program/
- [S13] Google Play service fees: https://support.google.com/googleplay/android-developer/answer/112622
- [S14] RevenueCat pricing: https://www.revenuecat.com/pricing/
- [S15] RevenueCat, State of Subscription Apps 2026 (115,000+ apps, $16B revenue): https://www.revenuecat.com/state-of-subscription-apps
- [S16] Stripe keeps processing fees on refunded payments: https://support.stripe.com/questions/understanding-fees-for-refunded-payments
- [S17] Adapty, Health and Fitness subscription benchmarks (16,000+ apps, published 27 March 2026): https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- [S18] RevenueCat 2026 benchmarks summary (published 19 March 2026): https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- [S19] TrueCoach pricing: https://truecoach.co/pricing/
- [S20] Everfit pricing: https://everfit.io/pricing/
- [S21] Deci, Koestner and Ryan, meta-analysis of extrinsic rewards and intrinsic motivation, Psychological Bulletin 1999: https://doi.org/10.1037/0033-2909.125.6.627
- [S22] Volpp et al., financial incentive-based approaches for weight loss, JAMA 2008: https://pubmed.ncbi.nlm.nih.gov/19066383/ (DOI https://doi.org/10.1001/jama.2008.804)
- [S23] DMCC Act definition of a subscription contract (auto-renewal or trial/reduced-price period): https://brodies.com/insights/technology/the-dmcc-act-changes-to-rules-surrounding-subscription-contracts/
- [S24] MyFitnessPal UK prices (third-party): https://home-cooks.co.uk/pages/review-myfitnesspal
- [S25] Strava UK prices (third-party): https://biketips.com/strava-free-vs-paid/
- [S26] MacroFactor prices (third-party): https://hronikka.com/blog/macrofactor-pricing
- [S27] Cronometer Gold prices (third-party): https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201
- [S28] Fitbod prices (third-party): https://www.sensai.fit/blog/fitbod-review-2026
- [S29] Trainerize pricing: https://www.trainerize.com/pricing/
- [S30] Fitness referral programme examples (aggregator): https://growsurf.com/examples/fitness-app-referral-programs/
- [S31] Google Play subscription pause: https://developer.android.com/google/play/billing/lifecycle/subscriptions and https://android-developers.googleblog.com/2020/06/new-features-to-acquire-and-retain-subscribers.html
- [S32] TLT, DMCC subscription regime brought forward (11 August 2026): https://www.tlt.com/insights-and-events/insight/dmcc-act-subscription-contracts-regime-brought-forward-by-the-pm-what-do-businesses-need-to-know
- [S33] Taylor Wessing, DMCC subscription obligations: https://www.taylorwessing.com/en/insights-and-events/insights/2026/04/subscription-contracts
- [S34] Obsidian Catalyst licence: https://help.obsidian.md/catalyst
- [S35] Innovate UK Smart grants paused and Growth Catalyst Early Stage closed: https://www.ukri.org/opportunity/growth-catalyst-early-stage-new-innovators/ and https://casrai.org/guides/innovate-uk-smart-grants
- [S36] Innovate UK Q3/Q4 2026 pipeline (third-party): https://venturenomix.com/innovate-uk-grants-q3-q4-2026/ and live list https://apply-for-innovation-funding.service.gov.uk/competition/search
- [S37] R&D merged scheme and ERIS rates (adviser summary): https://forrestbrown.co.uk/knowledge-bank/merged-r-and-d-scheme/
- [S38] Beeminder pledge schedule and discounts: https://help.beeminder.com/article/20-how-much-do-i-pledge-on-my-goals and https://help.beeminder.com/article/19-how-much-does-beeminder-cost
- [S39] Headspace free year for unemployed Americans (May 2020): https://www.businesswire.com/news/home/20200514005286/en/Headspace-Announces-Free-One-Year-Subscriptions-for-All-Unemployed-Americans
- [S40] Ethical Consumer pay-it-forward subscriptions: https://www.ethicalconsumer.org/about-us/pay-it-forward
- [S41] Headspace gift subscriptions: https://www.headspace.com/buy/gift and https://help.headspace.com/hc/en-us/articles/215057718-How-can-I-gift-a-Headspace-subscription
- [S42] Credits for metered AI features in consumer apps (trend piece): https://aichatcompanions.com/blog/ai-companion-pricing-shift-credits-2026/
- [S43] Strava Family plan: https://support.strava.com/hc/en-us/articles/26013043116173-Strava-s-Family-Plan (UK £99 price from search summaries; verify)
- [S44] Headspace for Work pricing estimate (third-party procurement data): https://www.vendr.com/marketplace/headspace
- [S45] Wellhub partner payments: https://support.gympass.com/hc/en-us/articles/17135742388755-How-does-payment-for-partners-work
- [S46] Day One book printing: https://dayoneapp.com/book-printing/ (price from search summaries; verify)
- [S47] Beeminder keeps derailment pledges as its business model: https://help.beeminder.com/article/114-can-i-specify-a-beneficiary-for-my-derailments and https://blog.beeminder.com/derail/ (via search summaries)
- [S48] Gambling Act 2005, section 9 (meaning of betting): https://www.legislation.gov.uk/ukpga/2005/19/section/9
- [S49] Halpern et al. 2015, NEJM: https://doi.org/10.1056/NEJMoa1414293
- [S50] ICO anonymisation guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/about-this-guidance/
- [S51] Strava heatmap exposed military bases (January 2018): https://www.nbcnews.com/tech/security/strava-fitness-tracking-map-reveals-military-bases-movements-war-zones-n841871
- [S52] Cawley and Price 2013: https://doi.org/10.1016/j.jhealeco.2013.04.005
- [S53] Neumark-Sztainer et al. 2006: https://doi.org/10.1016/j.jada.2006.01.003
- [S54] Mitchell et al. 2020, BJSM: https://doi.org/10.1136/bjsports-2019-100633
- [S55] Simpson and Mazzeo 2017: https://doi.org/10.1016/j.eatbeh.2017.02.002
- [S56] Levinson et al. 2017: https://doi.org/10.1016/j.eatbeh.2017.08.003
- [S57] Royer, Stehr and Sydnor, incentives, commitments and habit formation in exercise, AEJ Applied 2015: https://doi.org/10.1257/app.20130327
- [S58] Imas 2014: https://doi.org/10.2139/ssrn.2343445
- [S59] Gneezy et al. 2010, Science: https://doi.org/10.1126/science.1186744
- [S60] Lambrecht and Skiera 2006: https://doi.org/10.1509/jmkr.43.2.212
- [S61] DMCC Act 2024: https://www.legislation.gov.uk/ukpga/2024/13
- [S62] Song and Baicker 2019, JAMA: https://doi.org/10.1001/jama.2019.3307
- [S63] Jones, Molitor and Reif 2019: https://doi.org/10.1093/qje/qjz023
- [S64] Tiggemann and Zaccardo 2015: https://doi.org/10.1016/j.bodyim.2015.06.003
- [S65] Health and Fitness CPI benchmark (aggregator): https://insertaffiliate.com/blog/mobile-app-user-acquisition-cost-benchmarks/
- [S66] Cost per trial benchmark (agency view): https://www.airbridge.io/en/blog/cost-per-trial-cost-per-subscription-subscription-app-ua-metrics
- [S67] MacroFactor partnership / affiliate terms: https://macrofactor.com/macrofactor-partnership/
- [S68] Fitness app affiliate commission ranges (aggregator): https://insertaffiliate.com/blog/affiliate-commission-models-subscription-fitness-apps-percentage/
- [S69] UK influencer rates 2026 (agency aggregates): https://www.augmentum-media.com/blog/influencer-pricing-uk and https://whito.co.uk/research/influencer-ugc-rates-uk/
- [S70] Bates Wells, subscription regime set for January 2027: https://bateswells.co.uk/updates/subscription-regime-set-for-january-2027/
- [S71] Ninth Circuit opinion, Epic v Apple, 11 December 2025: https://cdn.ca9.uscourts.gov/datastore/opinions/2025/12/11/25-2935.pdf
- [S72] Supreme Court grants certiorari (30 June 2026): https://ipwatchdog.com/2026/06/30/high-court-grants-cert-in-apples-challenge-to-ninth-circuit-contempt-ruling-in-app-store-dispute/
- [S73] CMA consultation on Apple and Google steering: https://www.gov.uk/government/news/cma-consults-on-new-requirements-for-apple-and-googles-mobile-platforms
- [S74] CMA decision still pending, mid-September 2026: https://www.macobserver.com/news/apple-uk-steering-conduct-requirement-cma-no-decision/
- [S75] Apple EU fees from 1 October 2026, US link-out status (FunnelFox, 25 August 2026): https://blog.funnelfox.com/apple-app-store-fees-2026-eu-dma/
- Repo: `src/data/sync.ts`, `src/store/store.ts`, `src/data/supabase.ts`, `src/data/push.ts`, `src/core/data/media.ts`, `public/sw.js`, `.github/workflows/deploy.yml`, `docs/security-rls.sql`, `docs/plans/ai-platform-plan.md` §3, `docs/plans/nutrition-data-and-sourcing.md`, `docs/plans/workouts-customization-and-library.md` §5.6.

---

## 12. Changelog

- **2026-09-24:** First version (CFO): measured today's stack, found the full-history sync pull,
  verified vendor pricing, store rules and DMCC commencement; proposed the free/paid line, Tali
  Plus at £4.99 / £39.99, a Coach plan, the CAC spend rule and break-even scenarios.
- **2026-09-24:** Added additional revenue ideas, including an evaluation of Benn's "don't pay if
  you succeed" (rejected in outcome form) and a ranked shortlist.
- **2026-09-24:** `mental-performance` psychological safety review: verdicts per idea,
  cross-cutting guardrails and the "On your side" promise.
- **2026-09-24:** Consolidated into one plan: merged the additional ideas into the recommended
  model and revenue ranking, stated each figure once, removed superseded and duplicate material,
  renumbered sections and sources.
