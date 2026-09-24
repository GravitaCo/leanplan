# Monetisation plan: costs, pricing and revenue

Owner: CFO agent. First written 24 September 2026 in answer to Benn's question: "How do we keep
a revenue stream, what are our outgoing costs, and where are our revenue opportunities to be very
profitable? Do we charge PTs, or for access to exclusive content?"

**How to read the numbers.** Every figure is one of three things: measured from this repo, cited
from a source (URL and the date checked are in §9), or marked **ASSUMPTION** with a range and the
reasoning. "Unknown" means nobody has measured it yet; the doc says what would find out. Vendor
prices were checked on 24 September 2026 and change often, so re-check them before any budget
decision. Currency: vendors price in US dollars; this doc converts at **ASSUMPTION $1 = £0.75**
(plausible range £0.72 to £0.80).

## Summary

Tali should make money the way a good gym makes money from its classes rather than its front door:
**everything that costs us close to nothing stays free, and the paid line is the stuff with a real
running cost.** Concretely:

- **Free forever:** all logging, the built-in and self-built meal and workout plans, reminders,
  on-device trends, sync, export and offline use, and the exercise demo clips. A free user costs
  us roughly **half a penny a month** in infrastructure at 100k monthly active users (§1.4), so a
  generous free tier is affordable and is the growth engine.
- **Tali Plus (paid):** the AI features planned in `docs/plans/ai-platform-plan.md` (describe or
  photograph a meal, AI recipe capture, weekly summary, coach conversation), later guided
  follow-along sessions. Proposed at **£4.99 a month or £39.99 a year**, roughly 10 to 45% below
  the comparable apps' annual prices (§3).
- **Coach plan (second):** personal trainers pay, their clients use Tali free. Build after Plus has
  a measured conversion rate.
- **Creator programmes (later, optional):** one-off extras with a revenue share, never a
  replacement for the free plans.
- **No ads, no selling data, no product affiliates earning from users' health data, no lifetime
  deals on AI.**

Meal and workout plans: **free.** Paywalling them is exactly the friction Benn describes, and they
cost us nothing per user to serve. The one exception is an AI-generated, personalised plan, which
sits in Plus because every generation is a paid model call.

---

## 0. What actually runs today (measured from the repo, 24 September 2026)

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

**A cost finding worth fixing before growth.** Every sync pulls the user's *entire* history:
`pullAll` in `src/data/sync.ts` fetches `day_logs?user_id=eq.<uid>&select=*` with no date or
`updated_at` filter, and `runSync` runs 800 ms after each burst of changes and on every return to the app
(`src/store/store.ts`, `syncTimer` and the `visibilitychange` listener). Database egress per user
therefore grows with *how long they have used Tali* multiplied by *how often they open and log*.
It is harmless at today's scale but becomes the largest infrastructure line at 100k users (§1.4).
An incremental pull (only rows changed since the last sync) removes most of it. This is an
engineering item, not a pricing one; it is noted here because it moves the cost model.

---

## 1. Cost model

### 1.1 Fixed monthly costs

| Item | Price found | Monthly (£) | Status | Notes |
|---|---|---|---|---|
| GitHub Pages hosting | Free for public repos | £0 | Live | **Unknown** whether the repo is private; if it is, Pages needs a paid GitHub plan. Check the org's billing page |
| Supabase Pro | $25/month, includes 100k MAU, 8 GB disk, 250 GB egress, $10 compute credit (one Micro instance) [S1] | £18.75 | Recommended now | Free plan projects pause after a week of inactivity [S1]; not acceptable once anyone pays |
| Supabase compute upgrade | Small ~$15, Medium ~$60, Large ~$110, XL ~$210 a month, less the $10 credit [S2] | £0 to £150 | Later | **ASSUMPTION:** Micro to 10k MAU, Small to Medium near 10k, Large near 100k. Real sizing needs load data |
| Webflow site (marketing) | Premium $25/month billed yearly, $39 monthly (plans merged May 2026) [S3] | £18.75 | Live (tier unknown) | Could be lower if the site is on an older plan |
| Domain tali.fit | not checked | **ASSUMPTION** £1 to £5 | Live | Read the registrar invoice |
| Bunny Stream / CDN | $1 monthly minimum [S4][S5] | £0.75 | Live | Usage beyond the minimum is in §1.2 |
| Transactional email (receipts, renewal reminders, trial reminders) | not checked | **ASSUMPTION** £0 to £15 at 10k MAU, £50 to £100 at 100k | Needed with payments | DMCC renewal reminders must be sent on a durable medium such as email (§8) |
| Apple Developer Program | $99/year [S6] | £6.20 | Only when native | |
| Google Play registration | $25 once [S7] | £0 | Only when native | |
| Accountant, insurance, company admin | not checked | **ASSUMPTION** £100 to £300 | Needed with revenue | Excluded from "infrastructure", included in break-even |

**Fixed infrastructure today, ASSUMPTION base: about £42 a month** (Supabase Pro £18.75, Webflow
£18.75, domain £3, Bunny £0.75, email £0). Adding £150 of admin overheads gives the **base fixed
cost of about £200 a month** used for break-even in §6. Founder time and marketing are excluded
and handled separately.

### 1.2 Variable cost per monthly active user (free or paid)

| Driver | Unit price | Usage per MAU per month | Cost per MAU |
|---|---|---|---|
| Supabase MAU | Included to 100k, then $0.00325 each [S1] | 1 | £0 to 100k, then £0.0024 |
| Database egress, **current full-pull sync** | $0.09/GB beyond 250 GB [S1] | **ASSUMPTION** 50 MB (range 10 to 300 MB). Reasoning: a day row of 1 to 4 KB, a few months of history, 10 to 25 syncs on each active day, unknown compression | £0 until the pool is used, then about £0.0034 base, up to £0.02 |
| Database egress, **with incremental pull** | same | **ASSUMPTION** 1 to 3 MB | Stays inside the included 250 GB up to about 100k MAU |
| Database disk | $0.125/GB beyond 8 GB [S1] | **ASSUMPTION** 1 MB per user-year (range 0.5 to 3), and 3 registered accounts per MAU | about £0.0003 |
| Exercise demo clips (Bunny) | Standard network $0.01/GB Europe and North America; volume network $0.005/GB [S5] | **ASSUMPTION** 20 clip plays × 0.64 MB (measured clip size) = about 13 MB | about £0.0001 |
| Web Push | **ASSUMPTION** no per-message fee from browser push services; sender cost unknown (§0) | a few reminders a day | about £0 |
| Edge Functions (for AI calls, later) | 2M invocations included on Pro, then $2 per million [S1] | | about £0 |

**Guest users cost nothing:** guest mode is local-only and never touches Supabase (`CLAUDE.md`).

### 1.3 Variable cost per paying user

| Driver | Amount | Source |
|---|---|---|
| AI usage (planned, not live) | Heavy user $1.20 to $4.00 a month depending on model mix; typical users well below | `docs/plans/ai-platform-plan.md` §3.3 |
| AI, as modelled here | **ASSUMPTION** pessimistic £2.00, base £0.75, optimistic £0.30 a month per paying user | Heavy-user range × £0.75, scaled for typical use; repeat meals resolve locally at £0 |
| VAT (if Tali sells through a VAT-registered business) | 20% of the consumer price; registration compulsory above £90,000 taxable turnover in a rolling 12 months [S8] | **Unknown** whether Tali trades inside a VAT-registered company (see §8) |
| Stripe, UK cards | 1.5% + 20p standard; 2.8% + 20p premium; 2.5% + 20p EEA; 3.15% + 20p international; +2% currency conversion [S9] | |
| Stripe Billing (subscriptions) | 0.7% of billing volume [S10] | |
| Paddle (merchant of record alternative, handles VAT worldwide) | 5% + 50c per transaction [S11] (third-party summary; verify on paddle.com) | |
| Apple in-app purchase (native only) | 15% under the Small Business Program (under $1M proceeds) [S6b]; 30% standard | |
| Google Play (native only) | Subscriptions: 10% + 5% billing fee in the EEA, UK and US from 30 June 2026; previously 15% [S7b] | |
| RevenueCat (native only, optional) | Free to $2,500 monthly tracked revenue, then 1% [S12] | |

**Net receipts per subscriber per month, at the proposed prices (§3):**

| Channel | Monthly plan £4.99 | Annual plan £39.99 (per month) | Blended, 60% annual (**ASSUMPTION**, range 50 to 70%) |
|---|---|---|---|
| Web + Stripe, VAT-registered | £4.99 ÷ 1.2 = £4.158; fees 1.5%×4.99 + 20p + 0.7%×4.99 = £0.310; **net £3.85** | £39.99 ÷ 1.2 = £33.325; fees £0.600 + £0.200 + £0.280 = £1.080; net £32.245 a year = **£2.69** | 0.6×2.69 + 0.4×3.85 = **£3.15** |
| Web + Stripe, not VAT-registered | £4.99 − £0.31 = **£4.68** | (£39.99 − £1.08) ÷ 12 = **£3.24** | **£3.82** |
| App Store 15%, VAT-registered | £4.158 × 0.85 = **£3.53** | £33.325 × 0.85 ÷ 12 = **£2.36** | **£2.83** |

The annual share is anchored on RevenueCat's 2026 finding that Health and Fitness apps take 59%
of revenue from annual plans [S13]; the share of *subscribers* on annual plans for Tali is unknown
until we sell.

### 1.4 Scenarios at 1k, 10k and 100k MAU (base case, monthly, £)

Base inputs: 4% of MAU paying (**ASSUMPTION**, range 2 to 6%, see §6), web checkout through
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

## 2. Recommended model: generous free, paid where it costs us

### 2.1 The line

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
Everything in the left column costs under a penny per user per month (§1.4), so paywalling it would
only create the resentment Benn describes. Sync is on the free side even though it is the main
infrastructure cost, because it is how users keep their own data (rule 1); the incremental pull
keeps it cheap. Demo clips stay free because form guidance is a safety matter (rule 4).

### 2.2 Direct answers

**Meal and workout plans: free.** The built-in plans and the plan builder cost nothing to serve,
and "pay to see a plan" is the single most resented pattern in the category. The only plan-shaped
thing in Plus is one the AI generates for you, because each generation is a paid call.

**PT / coach seats: yes, charge PTs, not their clients.** This matches how the PT platforms work:
TrueCoach is "100% free for your clients" [S16]; Everfit says client-facing features are free to
end users [S17]. It is B2B2C: each coach brings clients at zero acquisition cost to us. But it
needs a coach dashboard, a consent-based data-sharing model with RLS changes (a `security-data`
review) and support, so it comes **after** Plus proves its conversion rate. Proposed pricing is in
§3.2.

**Exclusive / creator content: not now; later as optional one-off extras with a revenue share.**
Programmes from vetted creators (a 6-week running plan, a mobility series) sold as one-off
purchases or included in Plus, reviewed by `fitness-workouts` / `nutrition-accuracy`, never
marketed on body image, never replacing a free plan. It ranks below Plus and Coach because content
quality control is expensive and the audience is not there yet.

### 2.3 Trial and flow (fairness rule 3, DMCC)

Recommend a **14-day Plus trial with no card required**: at the end, Plus simply stops unless the
user chooses to subscribe. This cannot surprise-bill anyone, sidesteps the DMCC trial-reminder and
renewal cooling-off obligations for the trial itself, and is the fairest option. RevenueCat reports
that long trials (17 to 32 days) convert about 70% better than trials under 4 days (42.5% vs
25.5%) [S13b], though those are card-required trials, so our no-card figure is unknown. If Benn
prefers a card-on-file trial, send a reminder at least 3 days before billing and make cancellation
one tap in the app. Never show a paywall mid-log, after a low mood, a weight gain or a missed
streak (rule 4); upsell copy goes through `mental-performance`.

**Lifetime deals: no**, for anything containing AI. A lifetime price is a permanent liability
against a per-call cost. A time-limited "founding member" annual price (for example £29.99 a year
for as long as the subscription continues) is acceptable if its renewal terms are stated plainly.

---

## 3. Pricing proposal and comparables

### 3.1 Consumer

| App | Monthly | Annual | Free tier? | Source and caveat |
|---|---|---|---|---|
| MyFitnessPal Premium (UK) | £9.99 | £64.99 (Premium+ £79.99) | Yes, heavily limited | [S18] third-party review, not the vendor page |
| Strava (UK) | £8.99 | £54.99 | Yes | [S19] third-party summary |
| MacroFactor (US) | $11.99 | $71.99 (bundle $89.99) | No, 7-day trial | [S20] third-party summary |
| Cronometer Gold (US) | $10.99 | $59.99 | Yes, generous | [S21] third-party; some sources say $49.99 |
| Fitbod (US) | $15.99 | $95.99 | No, 7-day trial | [S22] third-party |
| **Tali Plus (proposed)** | **£4.99** | **£39.99** | **Yes, full core loop** | |

UK prices shown include VAT; US prices exclude sales tax. Treat third-party prices as indicative
and re-check vendor pages before publishing any comparison.

At £39.99 a year Tali Plus is about 27% below Strava, 38% below MyFitnessPal Premium, about 11% below
Cronometer's US price converted (roughly £45) and about 45% below Fitbod (roughly £72). That is deliberate: Tali's free tier does more
than theirs, so Plus sells extras rather than rescuing a crippled core.

**The price must cover AI.** On the annual plan a VAT-registered web sale nets £2.69 a month
(§1.3). A heavy user on an all-Opus mix costs $3.50 to $4.00 (£2.60 to £3.00) a month
(`ai-platform-plan.md` §3.3), so that user would lose money. Two safeguards: a published fair-use
limit per month (stated up front, never a surprise), and model choice by evals. **If evals require
Opus for meal parsing, raise the annual price to £44.99 or move parsing to a cheaper model before
launch.**

### 3.2 Coach plan (proposal)

| Plan | Price (incl. VAT) | Clients | Comparables |
|---|---|---|---|
| Coach Free | £0 | up to 3 | Trainerize Basic free for 1 client; Everfit Starter free to 5 [S15][S17] |
| Coach | £19/month | up to 15 | Trainerize Pro $23 from 5 clients; TrueCoach Starter $26.34 for 5; Everfit Pro from $19 [S15][S16][S17] |
| Coach Plus | £39/month | up to 40 | TrueCoach Standard $57.99 for 20, Pro $136.99 for 50 [S16] |

Coach at £19: £19 ÷ 1.2 = £15.83; Stripe 1.5%×19 + 20p + 0.7%×19 = £0.62; **net £15.21 a month**.
Clients cost us about £0.01 each in infrastructure, so margin is above 95% unless the coach buys
Plus for clients, which should be a priced add-on (**ASSUMPTION** £2 per client per month, against
a base AI cost of £0.75). Prices are **ASSUMPTIONS** to test; PT willingness to pay for Tali is
unknown and five or ten coach interviews would tell us more than any benchmark.

---

## 4. Revenue lines ranked

| Rank | Line | Who pays | Margin (base) | Effort to build | Risk | Fit with fairness rules | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **Tali Plus** (AI features) | Users | About 75% of net: (£3.15 − £0.75 − £0.02) ÷ £3.15 | Medium: Stripe checkout, entitlements, AI proxy per `ai-platform-plan.md` | Medium: AI cost overruns, conversion unknown | High: pays for real per-call cost | **Build first, with the first AI feature** |
| 2 | **Coach plan** | PTs | Above 95% without client Plus | High: dashboard, consent sharing, RLS changes, support | Medium: data sharing, coaches drifting into medical advice | High if clients stay free and consent is explicit | **Second, after Plus has data** |
| 3 | **Creator programmes** | Users (one-off) | **ASSUMPTION** about 40 to 50% after a 50% creator share and fees | Medium to high: content pipeline, review, store rules | Medium to high: quality, body-image marketing | Medium: fine as optional extras | **Later; pilot with one vetted creator** |
| 4 | **Workplace wellness (B2B)** | Employers | Unknown | High: sales cycle, admin tools, contracts | Medium | Medium: must stay aggregated and opt-in | **Not before 10k MAU**; pricing unknown |
| 5 | **Supporter / tip** | Users | High | Low | Low | High | Optional early signal before AI ships; small |
| 6 | Product affiliates (Tali earns from recommending scales, supplements, gear) | Brands | High per sale | Low | High: trust, health claims, rule 4 and 6 | Low | **Decline for now**; if ever, only clearly labelled non-supplement gear, never triggered by user data |
| 7 | Ads | Advertisers | n/a | Low | High | Fails rules 4 and 6 | **Decline** |
| 8 | Selling or sharing data | n/a | n/a | n/a | n/a | Fails rule 6 | **Never** |

---

## 5. Marketing, PR, influencer and affiliate spend

### 5.1 What a paying user is worth (base)

- **Annual subscriber:** contribution per month = £2.69 − £0.75 AI − £0.02 infra = £1.92, so
  £23.00 a year. RevenueCat reports 28% of yearly subscribers on freemium apps are retained after
  12 months [S13b]; expected paid years = 1 ÷ (1 − 0.28) = 1.39. **LTV ≈ £23.00 × 1.39 = £32.**
- **Monthly subscriber:** contribution £3.85 − £0.77 = £3.08 a month. Monthly churn for Tali is
  unknown; **ASSUMPTION** 10% (range 7 to 15%) gives an expected 10 paid months. **LTV ≈ £31.**
  Its first-12-month contribution is £3.08 × (1 − 0.9¹²) ÷ 0.1 = £3.08 × 7.18 = £22.
- **Blended gross-margin LTV ≈ £31**, and about £22 in the first year.

These rest on industry retention, not ours; replace them with our own cohorts after three months
of sales.

### 5.2 The spend rule

1. **A channel may scale only when its measured cost per new paying user is at most one third of
   LTV (base £10) and pays back within 12 months (base £22).** Until we have our own LTV, use £10.
2. **Measure before scaling:** a channel needs at least 30 paid conversions attributed through a
   referral code or link before its CAC counts as measured.
3. **Experiment budget cap:** **ASSUMPTION** £500 a month in total across all untested channels
   until the first cohort is measured. This is a cash-safety rule, not a target.
4. **Pay for outcomes where possible:** affiliates and creators on commission per paying user
   rather than flat fees.
5. **Never:** weight-loss or body-image creative, before/after imagery, or targeting by health
   condition (rule 4). Creators must label paid content as advertising under UK ASA/CMA influencer
   rules (check the current guidance before the first deal).

### 5.3 Why paid install ads do not work at Tali's price

A third-party benchmark puts Health and Fitness cost per install at $4.30 to $5.50 [S23]
(aggregator figure, method not published; treat as indicative). RevenueCat's median Health and
Fitness download-to-paid rate within 35 days is 2.9% [S13]. So CAC per paying user ≈ $4.30 ÷
0.029 = **$148 (about £111)**, against an LTV of about £31. Paid install campaigns would lose
roughly £80 per subscriber. Even the healthier "cost per trial" framing ($20 to $40 per trial,
45 to 50% trial-to-paid, [S24], a single-agency view) gives £30 to £67 per subscriber. **Growth has
to come from organic search and content on the Webflow site, word of mouth and referrals, PR,
creators paid on performance, and coaches bringing clients.** Paid ads become viable only if our
own LTV turns out several times higher than modelled.

### 5.4 Example commission structures

| Programme | Structure | Worked example | Check against the rule |
|---|---|---|---|
| Referral affiliate / creator code | 30% of the first payment's net (ex VAT, before fees) | Annual: 30% × £33.33 = **£10.00**; monthly: 30% × £4.16 = **£1.25** | Annual £10 = the £10 cap; monthly well inside |
| Recurring alternative | 20% of net for the first 12 months | Annual: £6.67; monthly: 20% × £4.16 × 7.18 expected months = £5.97 | Inside the cap |
| Market reference | MacroFactor pays 40% of the first subscription payment [S25]; aggregators put subscription fitness apps at 15 to 25% recurring [S26] | 40% of £33.33 would be £13.33 | Above our cap: do not match MacroFactor at our price |
| Flat-fee micro-influencer post | UK micro-influencers (10k to 50k followers) quote about £150 to £800 per Instagram post and £300 to £1,200 per TikTok [S27] (aggregated agency figures, wide variance) | A £500 post must produce 50 paying users to meet the £10 cap: about 1,700 installs at 2.9% | Rarely met by one micro post. **Test only, then convert to commission** |
| Creator programme revenue share | **ASSUMPTION** 50% of net receipts (after VAT and payment or store fees) to the creator | £9.99 programme on web, VAT-registered: £8.33 − £0.35 Stripe (1.5% + 20p, no Billing fee on a one-off) = £7.98; creator £3.99 | No published comparable found; treat as a negotiating start |
| Coach referral | Free month of Coach per referred coach who pays for 2 months | | Zero cash CAC |
| PR | Agency retainers: **unknown** (not researched) | Judge by referral-code conversions over 60 days | Same £10 test |

---

## 6. Break-even in paying users

Formula: **break-even payers = fixed monthly costs ÷ contribution per payer**, where contribution =
net receipts − AI − payer infrastructure − the free users each payer carries (free users per payer
× cost per free MAU). Salaries and marketing are excluded here and shown on the last line.

| Input | Pessimistic | Base | Optimistic |
|---|---|---|---|
| Channel and net receipts per payer | App Store 15%, VAT: £2.83 | Web Stripe, VAT: £3.15 | Web Stripe, VAT: £3.15 |
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

**What drives the result, in order:** AI cost per payer, then the channel (App Store versus web),
then the paid share of MAU. The pessimistic column shows Tali can lose money per subscriber if AI
runs on the most expensive model with no fair-use limit and sales go through the App Store. Those
three are all choices we control.

**About the paid-share assumption.** The published figures measure something narrower:
RevenueCat's 2026 report gives a 2.1% median download-to-paid rate by day 35 for freemium apps
overall and 2.9% for Health and Fitness across all paywall types [S13]; Adapty reports 1.78%
install-to-paid for Health and Fitness onboarding paywalls with trials [S14]. These count installs
(including people who never come back), are dominated by US App Store apps, and are medians across
very different products. Paid share of *active* users should be higher than install-to-paid
because the inactive drop out of the denominator, hence the 2 to 6% range, but **Tali's real
figure is unknown** until we sell.

---

## 7. Metrics to instrument now

Our own numbers should replace every industry median above within three months of launch. Collect
them first-party and aggregated (no third-party trackers seeing health data; `security-data` to
review the design). Guests stay uncounted beyond an anonymous install count.

| Metric | Definition | Why |
|---|---|---|
| Installs and sign-ups | By source (referral code, UTM, coach invite) | CAC by channel |
| Activation | Share of new users who log on 3 of their first 7 days (**ASSUMPTION**: tune after seeing data) | Leading indicator of retention |
| D1, D7, D30 retention | Returned and logged on that day, by weekly cohort | The single best predictor of paid conversion |
| WAU/MAU | Stickiness | |
| Sync egress per MAU | From Supabase usage and logs | Validates the 50 MB assumption; tracks the incremental-pull fix |
| AI calls and cost per user | Per feature, per model, per day; alert on outliers | The cost that decides profit |
| Trial starts, trial-to-paid | By trial type | Pricing and trial decisions |
| Free-to-paid | Paying users ÷ MAU, and install-to-paid by day 35 | Break-even |
| Plan mix | Monthly versus annual | Net receipts |
| Churn and reason | Monthly churn, annual non-renewal, one-tap optional reason | LTV |
| Refunds and cooling-off exits | Count and value | DMCC and fairness check |
| Coach metrics (later) | Coaches, clients per coach, coach churn | Coach plan viability |

---

## 8. Risks and open decisions

### Risks

- **UK subscription law.** The DMCC Act subscription regime now starts in **January 2027**,
  brought forward from spring 2027 by a government announcement on 9 August 2026 [S28][S29]. It
  requires key pre-contract information shown separately, an express acknowledgement at the final
  step, reminder notices at least every six months on a durable medium, a 14-day renewal
  cooling-off period, and online cancellation as easy as sign-up [S28][S30]. Any paid launch should
  meet it from day one rather than retrofit.
- **App store rules if Tali goes native.** In the US, external purchase links are currently
  commission-free after the April 2025 contempt ruling, but the Ninth Circuit (December 2025)
  vacated the complete commission ban and the Supreme Court has granted Apple's petition, so a
  commission on links may return [S31][S32]. In the UK the CMA consulted on steering (responses
  closed 28 July 2026) and has not decided as of mid-September 2026 [S33][S34]. In the EU, Apple's
  new terms from 1 October 2026 set 15% standard / 10% reduced for link-out and 26% / 15% for
  in-app purchase [S35]. **The PWA with Stripe avoids all of this;** staying web-first for payments
  is the cheapest option until a native app earns its keep.
- **AI cost overrun.** Mitigate with a fair-use limit, per-user daily caps in the AI proxy,
  cheaper models where evals allow, and local resolution of repeat meals.
- **Full-pull sync egress** (§0): fix before growth.
- **VAT.** If Tali sells through a VAT-registered company, 1/6 of every UK consumer payment is VAT.
  EU consumers owe VAT from the first sale regardless of the UK threshold (not researched in detail
  here; an accountant should confirm). A merchant of record such as Paddle removes the admin but
  costs 5% + 50c [S11], which on a £4.99 monthly plan is about 12 to 13% of the price.
- **Conversion unknown.** All revenue lines rest on the 2 to 6% assumption.
- **Coach features and data sharing:** consent, revocation and RLS must be right (`security-data`);
  coaches must stay within wellness guidance (rule 5).
- **Creator content quality and marketing:** body-image risk, unreviewed advice.
- **Supabase Free plan pausing** if the project is still on Free [S1].
- **Industry benchmarks are thin.** RevenueCat and Adapty are vendor datasets skewed to apps using
  their SDKs, mostly native; CPI and influencer rates come from agencies and aggregators with
  undisclosed methods.

### Decisions for Benn (in order)

1. **Approve the free/paid line** in §2.1 (core, plans, sync, demo clips free; AI in Plus).
2. **Legal and VAT set-up:** does Tali sell through Gravita (and is Gravita VAT-registered) or a
   new company? This changes net receipts by up to 17% (§1.3). Then Stripe direct versus a
   merchant of record.
3. **Move Supabase to Pro now** (£18.75 a month) and schedule the incremental-pull fix.
4. **Price points:** £4.99 / £39.99, or £5.99 / £44.99 if evals push AI costs up.
5. **Trial type:** no-card 14-day (recommended) or card-on-file with reminders.
6. **Free AI taste or none.** A small ongoing free allowance (say 12 AI meal parses a month) costs
   $0.04 to $0.18 per free MAU a month by model (§3.2 of the AI plan), which is about £2,700 to £13,500 a
   month at 100k MAU. Recommend the trial instead, and revisit only on the cheapest model.
7. **Coach plan timing:** start PT interviews now, build after Plus has three months of data.
8. **Marketing:** adopt the spend rule in §5.2 and the £500 experiment cap.

---

## 11. Additional revenue ideas (24 September 2026)

Written in answer to Benn's request for more ways to stay profitable without hurting the
experience or users' goals, including his own idea: "don't pay if you succeed in your goals".
Every idea is judged against the unit economics above and the fairness rules in the CFO brief.
Nothing here is built; nothing here changes §2 unless Benn approves it.

### 11.1 Reference numbers used throughout

All inputs come from §1.3, §5.1 and §6 unless marked **ASSUMPTION**.

| Input | Value | Where from |
|---|---|---|
| Net receipts, monthly plan (web, Stripe, VAT-registered) | £3.85 a month | §1.3 |
| Net receipts, annual plan | £32.245 a year (£2.69 a month) | §1.3 |
| AI + payer infrastructure + free-user carry | £0.75 + £0.02 + £0.12 = £0.89 a month | §6 base |
| Contribution, blended payer | £2.26 a month | §6 base |
| Contribution, monthly-plan payer | £3.85 − £0.89 = £2.96 a month | derived |
| Contribution, annual-plan payer | £32.245 − 12 × £0.89 = £21.57 a year (£1.80 a month) | derived |
| LTV, blended | about £31 | §5.1 |
| CAC cap per paying user | £10 | §5.2 |
| Reference scale | 10k MAU, 4% paying = 400 payers (240 annual, 160 monthly at 60% annual) | §1.4 |
| Reference contribution | 400 × £2.26 = **£904 a month** | derived |

"Revenue impact" below means the change in monthly contribution at the 10k MAU reference, so
every idea can be compared with that £904. Stripe keeps its fees when we refund a payment
[S50], which matters for any refund-based model.

### 11.2 Benn's idea: "don't pay if you succeed", and its variants

**What it is.** A Plus subscriber who reaches their goal in the period gets their money back.
The intent is good: it signals confidence, and it frames Tali as on the user's side. The
question is whether it survives the economics, verification, behaviour and law.

**Economics (full refund, annual plan).** A successful payer is refunded £39.99. The VAT portion
comes back to us through a credit note, so we give up the £33.325 net, but Stripe keeps its
£1.08 of fees [S50], and the AI and infrastructure have already been spent. **ASSUMPTION:**
checking each claim takes 3 to 5 minutes of staff time at about £15 an hour, so about £1 a claim
(HealthyWage uses staff-reviewed video weigh-ins [S42]). A successful payer therefore costs
£1.08 + £9.00 AI + £0.24 infrastructure + £1.44 free-user carry + £1.00 checking = **−£12.76 a
year**, against **+£21.57** for a payer who does not claim. With a success rate *s*:

contribution per annual payer = (1 − *s*) × £21.57 − *s* × £12.76

| Success rate *s* | Contribution per annual payer | Change |
|---|---|---|
| 20% | 0.8 × 21.57 − 0.2 × 12.76 = £14.70 | −32% |
| 40% | 0.6 × 21.57 − 0.4 × 12.76 = £7.84 | −64% |
| 47% (the share hitting target in the Volpp deposit-contract arm [S44]) | 0.53 × 21.57 − 0.47 × 12.76 = £5.44 | −75% |
| 63% | about £0 | break-even point: 21.57 ÷ (21.57 + 12.76) |

The rate would drift upwards over time, because the offer attracts people who are confident
they will succeed and rewards choosing easy goals. The business then earns most from the users
it fails, which is the opposite of what Benn wants: the better Tali works, the less it earns.

**Verification and gaming.** Weight is typed into `WeightSheet` by the user, the data is
offline-first and editable, and history syncs last-write-wins (`src/data/sync.ts`). Nothing in
Tali can prove a weight, and two of the five goals in `src/core/types.ts` ("feel-better",
"build-muscle") have no measurable end point at all. Making it verifiable means
HealthyWage-style filmed weigh-ins [S42]: videos of bodies are sensitive health data that we
would then have to store and review, which cuts across rule 6. Pact, an app that paid people for
meeting exercise goals and charged them for missing, settled with the US FTC for $1.5 million
after users who met their goals were charged anyway and its verification failed to recognise
their workouts [S43]. Verification is where these models break.

**Does it reward the wrong behaviour?** Yes, when the outcome is weight. Paying on the number
on a given day rewards short-term cutting around the deadline rather than habits. The research
is consistent: financial incentives moved weight in the short run (deposit-contract arm lost
14.0 lb against 3.9 lb for controls over 16 weeks), but participants rapidly regained weight
once the incentives stopped [S44][S44b]. A meta-analysis of 128 experiments found that expected,
tangible, performance-contingent rewards reduce intrinsic motivation (d = −0.28) [S47], and
intrinsic motivation is what keeps someone logging after the reward ends. Worst of all, under
rule 4: a user who gains weight or has a bad month pays full price while their successful peers
pay nothing. That is charging someone more because of a weight gain. **Fairness: fail.**

**Law.** The DMCC subscription regime [S28][S30] does not forbid refunds, so the model is not
unlawful in itself. The risks sit elsewhere. A headline like "free if you succeed" with
conditions behind it is exposed under the DMCC Act unfair commercial practices rules as a
misleading action or omission, now enforced directly by the CMA with fines of up to 10% of
global turnover [S49]; the conditions would have to be objective, shown up front and not at our
discretion. If the user puts money at stake that we keep on failure, it starts to look like
"betting" on "the likelihood of anything occurring or not occurring" under the Gambling Act 2005
s9(1) [S48], which needs a Gambling Commission licence. DietBet argues its games are skill
contests and not gambling [S41], but that is a US position. **A solicitor must look at any
money-at-stake design before it is built.**

**Revenue predictability.** Revenue from each payer cannot be treated as earned until their goal
window closes, cash may have to be returned up to 12 months after it was taken, and *s* is
unknown until the first cohort finishes. That is a year-long blind spot in the P&L at exactly
the stage we need our own numbers (§7).

**The variants.**

| Variant | Mechanics | Economics (arithmetic) | Fairness | Verdict |
|---|---|---|---|---|
| Goal-based partial refund | 25% of the annual price back, as a credit on renewal, if the goal is met | Cost per success 0.25 × £33.325 = £8.33; at *s* = 30%, £2.50 a payer a year, contribution £21.57 → £19.07 (−12%) | Fail when the goal is weight (same rule 4 problem, smaller); same verification gap | **Reject** in outcome form |
| Consistency rebate | Log or check in on 20 of 30 days, next month half price (monthly plan) | A half-price month gives up about £2.02 net (£2.495 ÷ 1.2, less the smaller Stripe percentage). **ASSUMPTION:** 40% of monthly payers qualify (range 25 to 60%): £0.81 a month, contribution £2.96 → £2.15 (−27%). LTV holds only if monthly churn falls from 10% to 10% × 2.15 ÷ 2.96 = 7.3% | Concern, close to fail: a quick tap counts as a log, so it pays for taps; it rewards compulsive logging (an eating-disorder risk); missing days costs money, which is monetising a missed streak (rule 4). Engagement-contingent rewards also lowered self-reported interest (d = −0.15) [S47] | **Reject in cash form**; non-cash recognition only, via `mental-performance` |
| Commitment deposit, Tali keeps the forfeit (Beeminder model) | User pledges money and loses it on a missed goal | Beeminder keeps derailment pledges and says collecting them is its business model; pledges step $5, $10, $30, $90, $270 and up; premium plans $8, $16 and $81 a month [S36][S37][S38]. Illustration: **ASSUMPTION** 3% of 10k MAU opt in, 30% of their months fail, £10 average forfeit: 300 × 0.3 × £10 = £900 a month, about the whole Plus contribution | Fail by construction: we earn precisely when the user struggles (rule 4); betting risk (s9) | **Reject** |
| Commitment deposit, forfeit to charity (stickK model) | Stake goes to a chosen charity, "anti-charity" or friend; optional human referee | stickK is free to users, minimum stake $5 per reporting period [S39][S40]; Tali earns nothing directly. Refunding a £20 deposit on success loses £0.50 of Stripe fees [S50] | Concern: still money tied to outcomes; charity fundraising rules may apply (not researched) | **Not now.** Evidence is real but narrow: 11% of smokers offered a deposit contract took it, and it raised quit rates by 3 points, lasting to 12 months [S45]; commitment contracts after a gym incentive produced long-run change [S46]; stickK's 78% vs 35% success is self-selected, not causal [S40] |
| Donate to charity on success | Tali gives, for example, £2 per user who reaches a milestone | 400 payers × 30% × £2 = £240 a year, £20 a month (2% of £904). Charity Miles shows the sponsor-funded version (brands pay per mile) [S70], which brings advertisers in | Concern: tied to weight it gamifies body outcomes | **Reject in outcome form.** A flat pledge (a fixed share of revenue) is fine if Benn wants it; it is values, not revenue |

**What I would do instead with Benn's instinct.** The fair core of "don't pay if you succeed" is
"don't pay for what you didn't get". Two versions keep that spirit without tying money to the
body:

1. **Idle-month credit.** On the monthly plan, a month in which the subscriber made no Plus
   requests is credited against the next bill automatically. Idle months cost us almost nothing
   in AI, so this is rule 2 applied to billing, and it is the opposite of the forgotten
   subscription that the DMCC regime targets. Cost: **ASSUMPTION** 15% of monthly payer-months
   are idle (range 10 to 25%): 160 × 0.15 × £3.85 = **£92 a month** (10% of £904). Per monthly
   payer that is £0.58, so contribution £2.96 → £2.38, and it pays for itself if monthly churn
   falls from 10% to about 8.0%. Unknown until tested; **test on one cohort**, do not launch
   blind. Build: M (usage counter in the AI proxy, Stripe customer-balance credit).
2. **Share the win.** When a user reaches a milestone they chose themselves (for example "trained
   12 times this month", never a weight), offer them a free Plus month to give to a friend. It
   costs about £0.77 if the friend uses it, charges nobody more for failing, and works as a
   referral (idea 8). Needs `mental-performance` to confirm milestones cannot become pressure.

### 11.3 The candidate list

Each entry gives: what it is; who pays; revenue impact at the 10k MAU reference; build effort
(S = days, M = one to three weeks, L = more than a month or needs sales and legal work); fit
with the fairness rules; risks.

**1. Pay-what-you-can with a free hardship option.** Plus at three visible prices, £2.99, £4.99
or £7.99 a month (annual £24.99, £39.99, £59.99), plus "free for six months, no questions,
renewable once". Who pays: users, at a level they choose. Impact: contribution at £2.99 =
£2.99 ÷ 1.2 − (1.5% × 2.99 + 20p + 0.7% × 2.99) − £0.89 = **£1.34**; at £7.99 = £6.66 − £0.38 −
£0.89 = **£5.39**. **ASSUMPTION** mix 25% low, 65% standard, 10% high: 0.25 × 1.34 + 0.65 × 2.96
+ 0.10 × 5.39 = £2.80, about 5% below £2.96, so it breaks even if it lifts conversion by about
6%. Hardship places, capped at 5% of payers: 20 × £0.77 = £15 a month. Net impact: with no
conversion lift, £904 × 0.945 − £15 − £904 = about −£65 a month; break-even needs about an 8%
lift in paying users; a 12% lift gives £854 × 1.12 − £15 − £904 = about +£37. Roughly neutral.
Comparables: Beeminder gives students, jobseekers,
seniors and non-OECD users a buy-one-get-one discount [S37]; Headspace gave unemployed Americans a
free year in 2020 [S52]; Ethical Consumer runs a pay-it-forward subscription fund [S53]. No
mainstream fitness app found running a visible sliding scale (searched 24 September 2026), so
the mix is unknown. Build: S. Fairness: **pass**. Risks: the price anchors downwards; honour
system can be abused (the cap bounds it).

**2. Supporter tier, nothing locked.** A one-off "support Tali" payment (£10, £25 or £50) or £20
a year, with cosmetic thanks only: an alternative app icon, name in the credits, access to beta
builds. Comparable: Obsidian's Catalyst licence, a one-off $25, $50 or $100+ that unlocks no
features [S51]. Who pays: fans. Impact: £20 a year nets £20 ÷ 1.2 − (£0.30 + £0.20 + £0.14) =
£16.03, about £1.34 a month with no AI cost; a one-off £25 nets £20.83 − £0.58 = £20.26.
**ASSUMPTION** 0.2 to 1% of MAU: at 0.5%, 50 supporters × £1.34 = **£67 a month** (range £27 to
£134). Small, but it can go live **before any AI exists**, proves the payments stack, and one-off
payments are not subscription contracts under the DMCC definition [S72]; a recurring supporter
plan would be. Build: S. Fairness: **pass**. Risks: small numbers; mild overlap with Plus
(include the supporter perks in Plus).

**3. AI usage credits (pay as you go).** Packs such as £2.99 for 150 AI actions, alongside Plus,
never expiring. Who pays: light users and people whose trial ended. Impact: net per pack £2.49 −
(£0.045 + £0.20) = £2.25; 150 meal parses cost about $0.90 (£0.68) on Sonnet 5 or $2.25 (£1.69)
on Opus 5 (`ai-platform-plan.md` §3.2), so contribution **£1.57** (Sonnet) or **£0.56** (Opus) a
pack. **ASSUMPTION** 2% of the 9,600 free users buy one pack a quarter: 192 × £1.57 ÷ 3 = £100 a
month; **ASSUMPTION** 10% of the 400 payers downgrade to one pack a quarter: 40 × (£2.26 − £0.52)
= −£70. Net about **+£30 a month**, and could be negative. Its real value is as a fair-use top-up
for heavy Plus users (the §3.1 safeguard) and a fair option for light users. The 20p Stripe fee
makes packs below about £2.99 poor value to us. Credits are becoming common for metered AI
features [S73]. Build: M (ledger, proxy checks). Fairness: **pass** if prices are shown per
action and credits never expire. Risks: a visible meter can make people ration a feature that
would help them; unused credits are a liability on the books.

**4. One-off programme purchases, owned forever.** Extra programmes (for example an eight-week
couch-to-5k with guided video) sold once and kept, never replacing the free plans (§2.2). Who
pays: users. Impact: £7.99 nets £6.66 − (£0.12 + £0.20) = £6.34 before any creator share.
Production is fixed: **ASSUMPTION** 20 generated minutes at $7 to $24 a minute (£105 to £360,
`ai-platform-plan.md` §3.4) plus £200 to £500 of expert review, so 48 to 136 sales to break
even. **ASSUMPTION** 1% of 10k MAU buy one a year: 100 × £6.34 ÷ 12 = **£53 a month** gross,
before production. Build: M. Fairness: **concern**: must stay optional extras, reviewed by
`fitness-workouts` / `nutrition-accuracy`, general wellness only (rule 5). Risks: content cost
before demand is proven; "owned forever" commits us to hosting.

**5. Non-AI lifetime deal.** Under §2.1 everything without AI is already free, so a non-AI
lifetime deal has nothing to sell unless we lock something that is free today, which breaks
rule 2. Who pays: nobody, as designed. Impact: £0. The honest version is idea 2 (a one-off
supporter payment). Build: n/a. Fairness: **fail** if it means paywalling, **pass** as supporter.
Risks: pressure later to invent paid non-AI features to give the deal meaning.

**6. Household or family plan.** Family Plus at £59.99 a year for up to four separate, private
accounts, with fair use per member. Comparable: Strava Family at £99 a year for up to four
against £54.99 for one [S55]. Who pays: one household member. Impact: net £49.99 − (£0.90 +
£0.20 + £0.42) = £48.47; **ASSUMPTION** 2.5 active members × (£9.00 AI + £0.24) = £23.10, so
about **£25 a year per family**, against £23 for one annual individual (§5.1) but £46 for two.
It adds money only where it converts households that would not otherwise pay; otherwise it
cannibalises. Net impact: unknown, probably small either way. Build: M (invites, shared
entitlement). Fairness: **pass** only if no member can see another's data (weight monitoring
within couples or of teenagers is a real harm); needs `security-data` and `mental-performance`.
Risks: cannibalisation; AI cost scales with members.

**7. Gifting and "sponsor a membership".** A prepaid 12 months of Plus with no auto-renew (so the
gift itself is not a subscription contract [S72]), plus a "sponsor a year for someone who cannot
afford it" option that funds the hardship places in idea 1. Comparable: Headspace sells 3, 6 and
12-month gifts [S56]; Ethical Consumer's pay-it-forward fund [S53]. Who pays: givers. Impact: a
redeemed gift contributes about £23 (annual net less AI and infrastructure). **ASSUMPTION** gifts
equal 5 to 15% of annual payers a year: 12 to 36 × £23 = £276 to £828 a year, **£23 to £69 a
month**, concentrated in December and January. Build: S to M (codes, redemption, email).
Fairness: **concern**: giving someone a diet and fitness app can say "you should change your
body", so gift copy must be neutral, never mention weight, and the recipient can decline or pass
it on (`mental-performance`). Risks: seasonal; unredeemed gifts.

**8. Earned free months via referrals.** Give a month, get a month: the referrer gets a free
month when the friend's first payment clears; the friend gets a 30-day trial instead of 14.
Free months are the most common reward in fitness referral programmes [S71]. Who pays: us, in
foregone revenue. Impact as CAC per paying user: the referrer's free month gives up £3.85
(monthly) or £2.69 (annual), about £3.15 blended; the friend's 16 extra trial days cost about
£0.40 of AI, and at **ASSUMPTION** 15 to 40% trial-to-paid that is £1.00 to £2.67 per payer.
**CAC about £4 to £6.50, well inside the £10 cap.** A free user who refers gets a Plus month
instead, costing about £0.77. Every 10 referred payers a month add about 10 × £31 = £310 of LTV
each month. Build: S to M (codes, attribution, reward ledger). Fairness: **pass** with a share
link only (no contact-book upload), a cap of 12 reward months a year, and no nagging. Risks:
self-referral with second accounts (reward only on a real card payment).

**9. Founding-member price lock.** £29.99 a year for as long as the subscription continues, for
the first 500 subscribers or first 90 days (already allowed in §2.3). Who pays: early users.
Impact: net £24.99 − (£0.45 + £0.20 + £0.21) = £24.13 a year, £2.01 a month; contribution
£2.01 − £0.89 = £1.12 against £1.80, so **−£0.68 a month per founder** against a full-price
counterfactual; 500 founders = −£340 a month, but most founders would not otherwise have paid
that early. On pessimistic AI (£2.00) a founder loses £0.13 a month, so the same fair-use limit
applies. It must be a flat price, not an introductory price that steps up, or DMCC trial and
reduced-price rules apply [S72]. Build: S. Fairness: **pass** if the renewal price is stated
plainly. Risks: a long tail of low-margin subscribers if AI costs rise.

**10. Pause instead of cancel.** Pause the monthly plan for one to three months, offered on the
same screen as a one-tap Cancel, never in front of it. Google Play offers pauses of up to three
months and not for annual plans [S54]. Who pays: nobody during the pause. Impact: 160 monthly
payers × 10% churn = 16 cancellations a month; **ASSUMPTION** 20% choose pause (range 10 to 30%)
and half of those resume: 1.6 payers kept a month × £31 = **about £50 of LTV added each month**
(range £25 to £75). Build: S. Fairness: **pass** only if cancel stays equally prominent; a pause
offer that slows cancellation is exactly what the DMCC "as easy as sign-up" rule forbids
[S28][S30]. Risks: few.

**11. Workplace / employer wellness (B2B).** Employers pay per eligible employee; employees get
Plus. Comparables: Headspace for Work at about $12 to $36 per employee a year (a third-party
procurement estimate) [S57]; Wellhub pays app partners per validated use under contract [S58].
Impact: **ASSUMPTION** £1 per employee a month (about £12 a year, the low end of Headspace),
500 employees, 20% activate (range 10 to 30%): £500 − 100 × £0.77 = **about £420 a month per
client**, the same as about 186 consumer payers (£420 ÷ £2.26). One client roughly adds half the
reference contribution. Build: L (admin, invoicing, DPIA, security questionnaires, sales time).
Fairness: **concern**: employers must only ever see aggregates with a minimum group size, never
individuals, and no weight-loss challenges (rules 4 and 6, `security-data`). Risks: long sales
cycles; employer pressure on employees. Keep §4's "not before 10k MAU", with one small friendly
pilot allowed earlier as a learning deal.

**12. Gyms or PT studios, white-label.** A gym-branded copy of Tali. Comparable: Virtuagym
bundles white-label apps into $59 to $489 a month packages (third-party figure) [S59]. Who pays:
gyms. Impact: unknown; pricing would need interviews. Build: L (per-client branding, store
accounts, support). Fairness: **concern**: the gym becomes a controller of members' health data
(rule 6). Risks: it turns Tali into an agency. The Coach plan (§3.2) with multi-coach seats
serves studios without forking the product.

**13. Creator marketplace.** Open marketplace where any creator sells programmes. Comparable:
Playbook creators keep 80% of revenue from audiences they bring [S60]; §5.4 assumes 50%. Impact:
at 50%, £3.17 to us per £7.99 sale; the same demand as idea 4, shared. Build: L. Fairness:
**concern to fail** at open scale: every item needs expert review for rule 5 and body-image
marketing, and that cost grows with the number of creators. Risks: quality, claims, moderation.
A curated pilot (§4 rank 3) captures most of the value.

**14. Ethical affiliates.** A "send this week's meal plan to my grocery basket" button with an
affiliate tag, or labelled links to kitchen scales. Who pays: retailers. Impact: Ocado pays at
least 3% on first-time shoppers [S61]; Amazon UK kitchen items pay about 3 to 4% (third-party
summaries of the schedule) [S62]. **ASSUMPTION** 1% of 10k MAU are new Ocado customers with a
£60 first basket: 100 × £1.80 = £180 a year; 1% buy a £20 scale at 3.5%: 100 × £0.70 = £70 a
year. Total **about £20 a month**. It can be done without sharing identifiable data: the list is
built on the device and handed over through a deep link carrying product IDs only (the pattern
Samsung Food / Whisk uses with grocers [S63]); the affiliate network sees a click, not a user.
The retailer does see the basket, as it would if the user shopped anyway. Build: M (product
matching is the hard part). Fairness: **concern**: scales promote weighing food, which is
unhelpful for some users; placement must never be triggered by user data. Risks: trust cost is
far larger than £20 a month. Build the basket hand-off one day as a free feature, untagged.

**15. Printed or exported annual report.** The digital "year in Tali" summary is the user's own
data and stays free (rule 1); a printed book is an optional extra. Comparable: Day One books from
$19.99 for 50 pages plus $0.10 a page [S64]. Impact: **ASSUMPTION** £19.99 price, £8 to £12
print-on-demand and postage (not quoted): £16.66 − £10 − £0.50 fees = about £6 a book; 0.75% of
10k MAU = 75 books = £450 a year, **about £38 a month**. Build: M (layout, print-vendor
integration). Fairness: **concern**: health data goes to a print vendor (processor agreement,
`security-data`), and weight should be off by default. Risks: low volume, fulfilment support.

**16. Non-dilutive funding.** Innovate UK Smart grants have been paused since January 2025 [S65].
Their replacement for new applicants, Growth Catalyst Early Stage: New Innovators (£25k to £50k,
limited to five "critical technologies"), closed on 6 August 2025 [S65]. Knowledge Transfer
Partnerships (a subsidised graduate placement with a university) and Innovation Loans run on
rolling deadlines, and Frontier AI competitions are scheduled from October 2026 (third-party
pipeline summary) [S66]. A consumer wellness app is a weak fit for most themed calls; check the
Innovation Funding Service monthly. The surer money is R&D tax relief: the merged scheme gives
a 20% above-the-line credit (about 16.2p per £1 after tax), and loss-making SMEs spending at
least 30% on R&D can claim up to 26.97p per £1 under ERIS [S67]. **ASSUMPTION** £20k to £40k a
year of qualifying staff and contractor cost (offline sync, the estimate model, AI evaluation):
£3.2k to £6.5k a year under the merged scheme, £5.4k to £10.8k under ERIS, that is **about £270
to £900 a month**. If no one draws a salary, qualifying cost is close to nil. Build: S (a claim
through an adviser) to M (a grant bid). Fairness: **pass**. Risks: HMRC's R&D definition is
strict; adviser fees; grant writing time with low odds.

**17. Anonymised research data.** Selling or licensing aggregated user data to researchers or
companies. Impact: unknown, and small at our scale because buyers want large samples. Build: M
to L. Fairness: **fail**. The ICO's 2025 guidance judges anonymisation by whether a "motivated
intruder" could re-identify people, and for health data it treats capable intruders as likely
[S68]. Strava's heatmap was "aggregated and anonymised" and still exposed military bases and
patrol routes [S69]. A small user base makes re-identification easier, not harder. Rule 6 allows
aggregated, opt-in use cleared by `security-data`; that fits an unpaid, ethics-approved academic
study, not a revenue line.

**Ideas added from research.**

**18. Idle-month credit** (see §11.2): **test on one cohort**, M, pass.

**19. Non-renewing annual pass.** Twelve months of Plus at £39.99 that simply ends, with an email
before it does. A contract that does not auto-renew falls outside the DMCC subscription
definition [S72] and suits people who distrust subscriptions. Impact: **ASSUMPTION** renewal
drops from the 28% industry figure (§5.1) to 20% for pass buyers: expected paid years 1 ÷ (1 −
0.2) = 1.25 against 1.39, so LTV on that segment falls 10%; if 30% of annual buyers choose it,
blended LTV falls 3%, recovered if it lifts annual conversion by 3% or more. Build: S. Fairness:
**pass**. Risks: slightly lower LTV.

**20. Share the win** (see §11.2): a user-chosen, non-weight milestone unlocks a free month to
give away. S, pending `mental-performance`.

### 11.4 Summary table

| # | Idea | Who pays | Impact at 10k MAU (contribution a month) | Build | Fairness |
|---|---|---|---|---|---|
| B | Full refund on success | us | −32% to −75% of Plus contribution at *s* = 20 to 47% | M | Fail |
| B | Partial refund on goal | us | −12% at *s* = 30% | M | Fail (weight) |
| B | Consistency rebate (cash) | us | −27% unless churn falls to 7.3% | M | Concern, near fail |
| B | Deposit kept by Tali | users who fail | about +£900, extracted from struggling users | M | Fail |
| B | Deposit to charity | users who fail (to charity) | £0 direct | M | Concern |
| B | Charity on success | us | −£20 | S | Concern (outcome form) |
| 1 | Pay-what-you-can + hardship | users | about neutral (−£65 to +£37) | S | Pass |
| 2 | Supporter, one-off | fans | +£27 to +£134 | S | Pass |
| 3 | AI credits | light users | about +£30, could be negative | M | Pass |
| 4 | One-off programmes | users | +£53 gross before production | M | Concern |
| 5 | Non-AI lifetime | nobody | £0 | n/a | Fail / fold into 2 |
| 6 | Family plan | households | unknown, small | M | Pass with conditions |
| 7 | Gifts + sponsor | givers | +£23 to +£69 | S to M | Concern (copy) |
| 8 | Referral month | us | CAC £4 to £6.50; +£31 LTV per referred payer | S to M | Pass |
| 9 | Founding price lock | early users | −£0.68 per founder vs full price | S | Pass |
| 10 | Pause | nobody | +£25 to +£75 of LTV a month | S | Pass |
| 11 | Workplace | employers | +£420 per 500-employee client | L | Concern |
| 12 | White-label | gyms | unknown | L | Concern |
| 13 | Creator marketplace | users | shares idea 4 | L | Concern to fail |
| 14 | Affiliates | retailers | about +£20 | M | Concern |
| 15 | Printed report | users | about +£38 | M | Concern |
| 16 | R&D relief, grants | government | about +£270 to +£900 if eligible | S to M | Pass |
| 17 | Research data sale | buyers | unknown, small | M to L | Fail |
| 18 | Idle-month credit | us | −£92 unless churn falls to 8.0% | M | Pass |
| 19 | Non-renewing annual pass | users | −3% blended LTV, offset by conversion | S | Pass |
| 20 | Share the win | us | about £0.77 per gift used | S | Pending review |

(B = variants of Benn's idea in §11.2.)

### 11.5 Ranked shortlist: what I would do, in order

1. **One-off supporter payment (idea 2), now.** The only line that can earn before AI ships. It
   builds and tests Stripe checkout, receipts and VAT handling without subscription obligations.
   Small money (£27 to £134 a month at 10k MAU), high learning.
2. **R&D tax relief claim and a monthly grant check (idea 16), now.** No product work; up to
   £270 to £900 a month equivalent if the spend qualifies. Needs an adviser and a view on
   founder salary.
3. **Founding-member price lock (idea 9), at Plus launch.** Early cash and loyalty at a known,
   bounded cost (−£0.68 a month per founder), with the fair-use limit.
4. **Give a month, get a month referrals (idea 8), with Plus launch.** The cheapest acquisition
   channel modelled anywhere in this plan (£4 to £6.50 per paying user against a £10 cap).
   "Share the win" (idea 20) can reuse the same mechanism once `mental-performance` agrees.
5. **Fair-billing bundle (ideas 10 and 19), before the DMCC regime starts in January 2027.**
   Pause shown beside a one-tap cancel, plus a non-renewing annual pass. Both are S effort and
   make "no dark patterns" visible.
6. **Pay-what-you-can floor, hardship places, gifts and sponsorship (ideas 1 and 7), after three
   months of sales data.** Roughly revenue-neutral; they widen access and turn goodwill into
   paid sponsorships. Needs data to set the floor price.
7. **AI credit top-ups (idea 3), once fair-use data exists.** Primarily a safety valve for
   heavy users above the Plus limit, and a fair option for light users.

To **test, not launch**: the idle-month credit (idea 18), on one cohort. **Later, on
conditions:** family plan (after Plus conversion is known), a single workplace pilot (idea 11),
curated programmes (idea 4, as in §4), printed report (idea 15).

### 11.6 Rejected, with reasons

- **Full refund on success:** loses 32 to 75% of Plus contribution at plausible success rates,
  cannot be verified without filming users' bodies, rewards short-term weight cutting, charges
  people more after a weight gain (rule 4), and hides a year of revenue.
- **Goal-based partial refund:** the same rule 4 problem at a smaller price.
- **Cash consistency rebate:** pays for taps, rewards compulsive logging and fines missed days.
- **Commitment deposits kept by Tali (Beeminder model):** earns exactly when users struggle;
  possible unlicensed betting under s9 of the Gambling Act 2005.
- **Charity donation tied to outcomes:** gamifies body outcomes; a flat revenue pledge is the
  acceptable form.
- **Non-AI lifetime deal:** nothing to sell without paywalling something free (rule 2).
- **White-label for gyms:** turns Tali into an agency and moves health data to third-party
  controllers; the Coach plan does the job.
- **Open creator marketplace:** review cost scales with creators and rule 5 risk scales with it;
  keep a curated pilot.
- **Affiliates as revenue:** about £20 a month at 10k MAU for a real trust cost.
- **Anonymised research data for money:** fails rule 6; re-identification risk is high for
  health data and higher for a small user base.

### 11.7 Psychological safety review

Reviewed by the `mental-performance` agent on 24 September 2026. Findings are summarised from the
papers cited (P1 to P16 below); confirm effect sizes before quoting any of them publicly.

**Verdicts.** The two agents agree: nothing that ties money to an outcome or to failure.

| Idea | Verdict | Why, and the guardrails |
|---|---|---|
| Free if you hit your goal (outcome, e.g. weight) | **Avoid** | Expected, contingent rewards undermine intrinsic motivation [P1]; weight incentives worked for 16 weeks and weight was then regained [P2]; workplace weight incentives had high dropout [P3]; dieting predicts later binge eating and disordered eating [P4]. It invites rapid loss, gaming the weigh-in and restriction, charges people at the moment of relapse, and means Tali earns more when users fail. Never make the outcome weight |
| Consistency rebate for behaviours | Safe with guardrails | Behaviour incentives raise activity modestly while they run [P5]. Count weekly reviews or check-ins only, never workout volume or calorie logging (compulsion risk [P6][P7]); a generous threshold (any 8 of 12 weeks) that a miss never resets; gain framing only; gentle mode qualifies |
| Commitment deposits | **Avoid** | Loss framing works for the few who opt in [P8][P9], but take-up is low (about 14% in [P9]), losing money after a bad week is punishment, and it suits compulsive and restrictive users most |
| Charity donation on a goal | Safe with guardrails | Prosocial incentives can sustain effort [P10]. Behaviours only, never weight; Tali pays, not the user |
| Pay what you can, free hardship option | Safe | Pairing price with a social cause raised both uptake and revenue [P11]. No means-testing, no questions |
| Supporter tier, nothing locked | Safe | Supports autonomy, adds no pressure |
| AI credits | Safe with guardrails | Metering creates a "taxi meter" feeling and people overpay for flat rates to avoid it [P12]; users would ration the weekly review, the feature that helps most. Flat Plus stays the default; credits only as a small add-on; no countdown mid-conversation; crisis responses never draw on credits |
| Referral months | Safe with guardrails | No leaderboards, no "invite 3 or lose access", and friends see no stats about the person who referred them |
| Pause instead of cancel | Safe | Fits habit research (a lapse does not break a habit). Cancel stays one tap, as the DMCC Act 2024 subscription rules require [P13] |
| Employer wellness | Safe with guardrails, lowest priority | Large trials found no health effect [P14][P15]. The employer sees only groups of 50 or more, never individuals; participation is voluntary with no payment tied to it; no team leaderboards; the DPIA treats this as special category health data |
| Gifting or sponsoring | Safe with guardrails | An unsolicited weight-loss app can read as a comment on someone's body. Frame it as general wellbeing, never "for someone who needs to lose weight"; the giver sees nothing; the recipient sets their own goals |
| Creator programmes | **Avoid** body-focused creators; others safe with guardrails | Fitspiration imagery worsens mood and body image [P16]. No before-and-after photos, physique marketing or weight claims; content reviewed for disordered-eating safety; plans stay free |
| Trial and renewal reminders, upsell timing | Safe with guardrails | Remind 3 to 7 days before any charge. Never upsell during a crisis script, in gentle mode, after a bad check-in or mid-log. Offer upgrades after a moment of competence (a completed weekly review). No fake countdowns |

**Across everything:** users must be 18 or over, and anyone the screener routes to gentle mode is
excluded from any contingent mechanic.

**The safe version of Benn's idea: the "On your side" promise.**

1. **Money back if Tali isn't helping.** Within 60 days, tell us it isn't working and get a refund,
   no proof needed. It keeps "we win when you win" without judging anyone's results.
2. **Show-up thank-you.** Complete any 8 weekly reviews in your first 12 weeks and get a free month,
   or give it to a charity. It is presented as a surprise thank-you, not a target, because
   unexpected rewards do not crowd out motivation [P1].

Pilot it on one cohort and measure weekly review completion, retention at weeks 13 and 26, refund
take-up and gentle-mode escalations; the guardrail metric is no rise in risk-language flags. Cost
this against §11.2 before launch: a refund keeps Stripe's fee and the AI already used, so the CFO
figures there apply to the refund rate. Most incentive trials run 3 to 6 months and none tested
app pricing directly, so this is evidence-informed, not proven.

**Sources for this subsection**

- [P1] Deci, Koestner and Ryan 1999: https://doi.org/10.1037/0033-2909.125.6.627
- [P2] Volpp et al. 2008, JAMA: https://doi.org/10.1001/jama.2008.804
- [P3] Cawley and Price 2013: https://doi.org/10.1016/j.jhealeco.2013.04.005
- [P4] Neumark-Sztainer et al. 2006: https://doi.org/10.1016/j.jada.2006.01.003
- [P5] Mitchell et al. 2020, BJSM: https://doi.org/10.1136/bjsports-2019-100633
- [P6] Simpson and Mazzeo 2017: https://doi.org/10.1016/j.eatbeh.2017.02.002
- [P7] Levinson et al. 2017: https://doi.org/10.1016/j.eatbeh.2017.08.003
- [P8] Royer, Stehr and Sydnor 2015: https://doi.org/10.1257/app.20130327
- [P9] Halpern et al. 2015, NEJM: https://doi.org/10.1056/NEJMoa1414293
- [P10] Imas 2014: https://doi.org/10.2139/ssrn.2343445
- [P11] Gneezy et al. 2010, Science: https://doi.org/10.1126/science.1186744
- [P12] Lambrecht and Skiera 2006: https://doi.org/10.1509/jmkr.43.2.212
- [P13] DMCC Act 2024: https://www.legislation.gov.uk/ukpga/2024/13
- [P14] Song and Baicker 2019, JAMA: https://doi.org/10.1001/jama.2019.3307
- [P15] Jones, Molitor and Reif 2019: https://doi.org/10.1093/qje/qjz023
- [P16] Tiggemann and Zaccardo 2015: https://doi.org/10.1016/j.bodyim.2015.06.003

---

## 9. Sources (all checked 24 September 2026)

- [S1] Supabase pricing: https://supabase.com/pricing
- [S2] Supabase compute sizes: https://supabase.com/docs/guides/platform/compute-and-disk
- [S3] Webflow May 2026 pricing (Premium plan): https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026 and https://www.memberstack.com/blog/new-webflow-pricing-in-2026-what-every-plan-costs-and-how-to-choose (vendor page could not be fetched; figures from search summaries)
- [S4] Bunny Stream pricing: https://bunny.net/pricing/stream/
- [S5] Bunny CDN pricing: https://bunny.net/pricing/cdn/
- [S6] Apple Developer Program fee: https://developer.apple.com/programs/whats-included/ (fee figure via https://www.revenuecat.com/blog/engineering/small-business-program)
- [S6b] Apple App Store Small Business Program: https://developer.apple.com/app-store/small-business-program/
- [S7] Google Play registration: https://support.google.com/googleplay/android-developer/answer/6112435
- [S7b] Google Play service fees: https://support.google.com/googleplay/android-developer/answer/112622
- [S8] UK VAT threshold £90,000: https://commonslibrary.parliament.uk/research-briefings/sn00963/
- [S9] Stripe UK pricing: https://stripe.com/gb/pricing
- [S10] Stripe Billing pricing: https://stripe.com/gb/billing/pricing
- [S11] Paddle fees (third-party summary): https://dodopayments.com/blogs/paddle-fees-explained
- [S12] RevenueCat pricing: https://www.revenuecat.com/pricing/
- [S13] RevenueCat, State of Subscription Apps 2026 (115,000+ apps, $16B revenue): https://www.revenuecat.com/state-of-subscription-apps
- [S13b] RevenueCat 2026 benchmarks summary (published 19 March 2026): https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- [S14] Adapty, Health and Fitness subscription benchmarks (16,000+ apps, published 27 March 2026): https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- [S15] Trainerize pricing: https://www.trainerize.com/pricing/
- [S16] TrueCoach pricing: https://truecoach.co/pricing/
- [S17] Everfit pricing: https://everfit.io/pricing/
- [S18] MyFitnessPal UK prices (third-party): https://home-cooks.co.uk/pages/review-myfitnesspal
- [S19] Strava UK prices (third-party): https://biketips.com/strava-free-vs-paid/
- [S20] MacroFactor prices (third-party): https://hronikka.com/blog/macrofactor-pricing
- [S21] Cronometer Gold prices (third-party): https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201
- [S22] Fitbod prices (third-party): https://www.sensai.fit/blog/fitbod-review-2026
- [S23] Health and Fitness CPI benchmark (aggregator): https://insertaffiliate.com/blog/mobile-app-user-acquisition-cost-benchmarks/
- [S24] Cost per trial benchmark (agency view): https://www.airbridge.io/en/blog/cost-per-trial-cost-per-subscription-subscription-app-ua-metrics
- [S25] MacroFactor partnership / affiliate terms: https://macrofactor.com/macrofactor-partnership/
- [S26] Fitness app affiliate commission ranges (aggregator): https://insertaffiliate.com/blog/affiliate-commission-models-subscription-fitness-apps-percentage/
- [S27] UK influencer rates 2026 (agency aggregates): https://www.augmentum-media.com/blog/influencer-pricing-uk and https://whito.co.uk/research/influencer-ugc-rates-uk/
- [S28] TLT, DMCC subscription regime brought forward (11 August 2026): https://www.tlt.com/insights-and-events/insight/dmcc-act-subscription-contracts-regime-brought-forward-by-the-pm-what-do-businesses-need-to-know
- [S29] Bates Wells, subscription regime set for January 2027: https://bateswells.co.uk/updates/subscription-regime-set-for-january-2027/
- [S30] Taylor Wessing, DMCC subscription obligations: https://www.taylorwessing.com/en/insights-and-events/insights/2026/04/subscription-contracts
- [S31] Ninth Circuit opinion, Epic v Apple, 11 December 2025: https://cdn.ca9.uscourts.gov/datastore/opinions/2025/12/11/25-2935.pdf
- [S32] Supreme Court grants certiorari (30 June 2026): https://ipwatchdog.com/2026/06/30/high-court-grants-cert-in-apples-challenge-to-ninth-circuit-contempt-ruling-in-app-store-dispute/
- [S33] CMA consultation on Apple and Google steering: https://www.gov.uk/government/news/cma-consults-on-new-requirements-for-apple-and-googles-mobile-platforms
- [S34] CMA decision still pending, mid-September 2026: https://www.macobserver.com/news/apple-uk-steering-conduct-requirement-cma-no-decision/
- [S35] Apple EU fees from 1 October 2026, US link-out status (FunnelFox, 25 August 2026): https://blog.funnelfox.com/apple-app-store-fees-2026-eu-dma/
- [S36] Beeminder pricing and premium plans: https://www.beeminder.com/money and https://www.beeminder.com/premium
- [S37] Beeminder pledge schedule and discounts: https://help.beeminder.com/article/20-how-much-do-i-pledge-on-my-goals and https://help.beeminder.com/article/19-how-much-does-beeminder-cost
- [S38] Beeminder keeps derailment pledges as its business model: https://help.beeminder.com/article/114-can-i-specify-a-beneficiary-for-my-derailments and https://blog.beeminder.com/derail/ (via search summaries)
- [S39] stickK stakes, recipients and referees: https://www.stickk.com/faq/stakes/Commitment+Contracts and https://www.stickk.com/faq/referees/Commitment+Contracts (vendor pages blocked automated fetch; figures from search summaries)
- [S40] stickK overview, free for individuals, 78% vs 35% success figure: https://en.wikipedia.org/wiki/StickK
- [S41] DietBet fees (10 to 25% of pot) and its "not gambling" position: https://support.waybetter.com/hc/en-us/articles/360011677974-DietBet-Fees and https://www.dietbet.com/dietbet-not-gambling
- [S42] HealthyWage video weigh-in verification: https://www.healthywage.com/healthywager/rules/ and https://www.healthywage.com/healthywager/faq/
- [S43] FTC settlement with Pact, Inc. (September 2017): https://www.ftc.gov/news-events/news/press-releases/2017/09/mobile-app-settles-ftc-allegations-it-failed-deliver-promised-cash-rewards-meeting-exercise-diet
- [S44] Volpp et al., financial incentive-based approaches for weight loss, JAMA 2008: https://pubmed.ncbi.nlm.nih.gov/19066383/
- [S44b] Follow-up trial noting rapid regain once incentives were removed: https://pmc.ncbi.nlm.nih.gov/articles/PMC3583583/
- [S45] Giné, Karlan and Zinman, commitment contract for smoking cessation, AEJ Applied 2010: https://www.aeaweb.org/articles?id=10.1257%2Fapp.2.4.213
- [S46] Royer, Stehr and Sydnor, incentives, commitments and habit formation in exercise, AEJ Applied 2015: https://www.aeaweb.org/articles?id=10.1257%2Fapp.20130327
- [S47] Deci, Koestner and Ryan, meta-analysis of extrinsic rewards and intrinsic motivation, Psychological Bulletin 1999: https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf
- [S48] Gambling Act 2005, section 9 (meaning of betting): https://www.legislation.gov.uk/ukpga/2005/19/section/9
- [S49] CMA unfair commercial practices guidance under the DMCC Act: https://connect.cma.gov.uk/unfair-commercial-practices-guidance and penalties summary https://www.womblebonddickinson.com/uk/insights/articles-and-briefings/digital-markets-competition-and-consumers-act-2024-explained-cmas
- [S50] Stripe keeps processing fees on refunded payments: https://support.stripe.com/questions/understanding-fees-for-refunded-payments
- [S51] Obsidian Catalyst licence: https://help.obsidian.md/catalyst
- [S52] Headspace free year for unemployed Americans (May 2020): https://www.businesswire.com/news/home/20200514005286/en/Headspace-Announces-Free-One-Year-Subscriptions-for-All-Unemployed-Americans
- [S53] Ethical Consumer pay-it-forward subscriptions: https://www.ethicalconsumer.org/about-us/pay-it-forward
- [S54] Google Play subscription pause: https://developer.android.com/google/play/billing/lifecycle/subscriptions and https://android-developers.googleblog.com/2020/06/new-features-to-acquire-and-retain-subscribers.html
- [S55] Strava Family plan: https://support.strava.com/hc/en-us/articles/26013043116173-Strava-s-Family-Plan (UK £99 price from search summaries; verify)
- [S56] Headspace gift subscriptions: https://www.headspace.com/buy/gift and https://help.headspace.com/hc/en-us/articles/215057718-How-can-I-gift-a-Headspace-subscription
- [S57] Headspace for Work pricing estimate (third-party procurement data): https://www.vendr.com/marketplace/headspace
- [S58] Wellhub partner payments: https://support.gympass.com/hc/en-us/articles/17135742388755-How-does-payment-for-partners-work
- [S59] Virtuagym white-label pricing (third-party): https://www.fitbudd.com/post/white-label-fitness-apps and vendor page https://business.virtuagym.com/custom-mobile-app/
- [S60] Playbook creator payments: https://playbookapp.io/handbook/how-payments-work
- [S61] Ocado affiliate programme: https://www.ocado.com/content/ocado-affiliate-programme-39129 and Awin advertiser fees https://www.awin.com/gb/pricing/advertisers
- [S62] Amazon UK Associates rates (third-party summaries; official schedule at https://affiliate-program.amazon.co.uk/help/operating/schedule not fetched): https://azonpress.com/amazon-affiliate-commission-rates/
- [S63] Samsung Food / Whisk grocer basket integration: https://support.samsungfood.com/hc/en-us/articles/360042276852-Grocer-Integration-Overview
- [S64] Day One book printing: https://dayoneapp.com/book-printing/ (price from search summaries; verify)
- [S65] Innovate UK Smart grants paused and Growth Catalyst Early Stage closed: https://www.ukri.org/opportunity/growth-catalyst-early-stage-new-innovators/ and https://casrai.org/guides/innovate-uk-smart-grants
- [S66] Innovate UK Q3/Q4 2026 pipeline (third-party): https://venturenomix.com/innovate-uk-grants-q3-q4-2026/ and live list https://apply-for-innovation-funding.service.gov.uk/competition/search
- [S67] R&D merged scheme and ERIS rates (adviser summary): https://forrestbrown.co.uk/knowledge-bank/merged-r-and-d-scheme/
- [S68] ICO anonymisation guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/about-this-guidance/
- [S69] Strava heatmap exposed military bases (January 2018): https://www.nbcnews.com/tech/security/strava-fitness-tracking-map-reveals-military-bases-movements-war-zones-n841871
- [S70] Charity Miles sponsor model: https://charitymiles.org/how-it-works/
- [S71] Fitness referral programme examples (aggregator): https://growsurf.com/examples/fitness-app-referral-programs/
- [S72] DMCC Act definition of a subscription contract (auto-renewal or trial/reduced-price period): https://brodies.com/insights/technology/the-dmcc-act-changes-to-rules-surrounding-subscription-contracts/
- [S73] Credits for metered AI features in consumer apps (trend piece): https://aichatcompanions.com/blog/ai-companion-pricing-shift-credits-2026/
- Repo: `src/data/sync.ts`, `src/store/store.ts`, `src/data/supabase.ts`, `src/data/push.ts`, `src/core/data/media.ts`, `public/sw.js`, `.github/workflows/deploy.yml`, `docs/security-rls.sql`, `docs/plans/ai-platform-plan.md` §3, `docs/plans/nutrition-data-and-sourcing.md`, `docs/plans/workouts-customization-and-library.md` §5.6.

---

## 10. Changelog

- **2026-09-24:** First version (CFO). Measured today's stack from the repo; found the full-history
  sync pull; verified vendor pricing, store commissions, link-out rules (US, UK, EU), DMCC
  commencement (January 2027) and subscription benchmarks; proposed the free/paid line, Tali Plus
  at £4.99 / £39.99, a Coach plan, the CAC spend rule and break-even scenarios (base 89 payers
  before salaries, about 1,860 to pay one person).
- **2026-09-24 (later):** Added §11, additional revenue ideas (CFO). Evaluated Benn's "don't pay if
  you succeed" idea and four variants (rejected in outcome form: −32% to −75% of Plus
  contribution at 20 to 47% success, unverifiable, fails rule 4), 17 candidate ideas and three
  found in research; ranked a shortlist of seven (supporter payment, R&D relief, founding price,
  referrals, pause plus non-renewing pass, pay-what-you-can with hardship and gifts, AI
  top-ups). Added sources S36 to S73. §11.7 then awaited `mental-performance`.
- **24 September 2026 (later):** filled §11.7 with the `mental-performance` review: verdicts per idea, cross-cutting guardrails and the "On your side" promise as the safe version of Benn's idea.
