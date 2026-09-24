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
- Repo: `src/data/sync.ts`, `src/store/store.ts`, `src/data/supabase.ts`, `src/data/push.ts`, `src/core/data/media.ts`, `public/sw.js`, `.github/workflows/deploy.yml`, `docs/security-rls.sql`, `docs/plans/ai-platform-plan.md` §3, `docs/plans/nutrition-data-and-sourcing.md`, `docs/plans/workouts-customization-and-library.md` §5.6.

---

## 10. Changelog

- **2026-09-24:** First version (CFO). Measured today's stack from the repo; found the full-history
  sync pull; verified vendor pricing, store commissions, link-out rules (US, UK, EU), DMCC
  commencement (January 2027) and subscription benchmarks; proposed the free/paid line, Tali Plus
  at £4.99 / £39.99, a Coach plan, the CAC spend rule and break-even scenarios (base 89 payers
  before salaries, about 1,860 to pay one person).
