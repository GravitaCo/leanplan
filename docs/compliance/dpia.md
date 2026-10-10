# Tali: Data Protection Impact Assessment (UK GDPR Art. 35)

**Status: DRAFT for review. Not signed.** Prepared on 30 September 2026 by the `compliance` agent
(an AI assistant) for Benn, director of Gravita Creative Ltd, from the code on branch
`claude/pensive-ramanujan-j4k1ie` at commit `86eddbc` (current `main` plus the unmerged onboarding
legal texts) and the compliance register (`docs/compliance/README.md`).
Updated 1 October 2026 for Onboarding 9 (section 4.2, the wellbeing answer, and R3) from the
code at `6430472` (`claude/onboarding-release`).

**This is not legal advice.** It was drafted with AI help and has not been reviewed by a lawyer.
It records how Tali works and the judgement calls still open, so that Benn, and his solicitor if
he wants one, can check it, change it and sign it. Where a fact could not be checked it says
"Unknown:" and what would settle it.

It follows the structure of the ICO's DPIA template. The register stays the day-to-day record;
this document is the assessment. Keep them in step: a change to one that affects the other
updates both.

---

## Decisions for Benn

Open judgement calls, each with a recommendation. Section 7 has the sign-off table.

| # | Decision | Recommendation |
|---|---|---|
| D1 | Clinical review of the onboarding wellbeing question and the safety routing (`routeSafety`) before `ONBOARDING_ENABLED` goes on. The onboarding plan already says the wellbeing question "gets clinical review before wider launch" (`docs/plans/first-run-onboarding.md` §9). | **Do it before the wizard is switched on for anyone but closed testers.** A qualified clinician (for example a registered dietitian with eating-disorder experience) reviews the wording, the routing and the signposting. Without it, risk R3 stays high and prior consultation (D9) would need to be considered. |
| D2 | Notice emails before the 28 October purge. Benn decided on 28 Sept not to send them (register item 30(a)). On 30 Sept only **2** accounts had a cloud log and no current yes (checked, section 2.2). | **Send the two emails** (register item 30(a) has the wording). It costs little and removes most of R5 for those two people. If they go out after 28 Sept, move PURGE_FROM and `UNCONSENTED_DELETION` as the register says. |
| D3 | Pay the ICO data protection fee for Gravita Creative Ltd. | **Pay it now.** Processing of real people's health data is already happening; the fee is owed now, not at launch. Add the number to `LEGAL.icoNumber`. |
| D4 | Processor contracts (Art. 28) and transfer terms: Supabase, Webflow, Bunny.net, Google Workspace, GitHub, Cloudflare Turnstile (register item 4). | **Accept or confirm each DPA now, and record the transfer mechanism for each US provider in the register.** Real health data is already stored with Supabase. |
| D5 | `ai-read-label` (Anthropic) is deployed, but label reading is switched off in the app and not in the privacy policy. A signed-in person who writes their own label-photo consent record could still call it. | **Disable the function (or add a server-side off switch) until register item 24 is done**, and route the change through `security-data`. Low risk (it sends a pack photo, not health data), but it is an undisclosed processor that can be reached. |
| D6 | Dormant accounts: after a purge, or when someone stops using Tali, the account (email, consent records) is kept with no end date (register item 30(c)). | **Set an inactivity period with notice before public launch.** A starting point to discuss with the solicitor: delete accounts with no sign-in for 24 months, after one email 30 days before. The length is a judgement for Benn, not a legal fixed figure. |
| D7 | New users who choose "Not now" can only sign out (`ConsentScreen.tsx:64`), so health consent is a condition of using Tali. Art. 7(4) asks whether consent is freely given when a service depends on it. | **Keep the design** (the log is the service, and no other Art. 9(2) condition fits a consumer wellness app), **but ask the solicitor to confirm** this is defensible, and keep the unbundling from terms and marketing as it is. |
| D8 | Age assurance: the live app relies on a self-declared "I'm 18 or over" box (`ConsentScreen.tsx:48`); the stronger age question and stop are behind the wizard flag. | **Accept self-declaration for now**, and record a short "likely to be accessed by children" assessment for the ICO Children's Code before public launch (marketing, app store listing, content). Revisit if the marketing could appeal to teenagers. |
| D9 | ICO prior consultation (Art. 36). | **Not needed, on the conditions in section 7.3**: the measures marked "recommended" for R1, R3 and R7 are done before the relevant feature or launch, and D1 is done before the wizard goes on. If Benn decides to switch the wizard on for the public without D1, the residual risk for R3 is high and prior consultation should be considered. |
| D10 | Legal basis for the consent records: the register says 6(1)(c) (and 9(2)(f) if a record counts as special category); the privacy policy says "legal obligation" (`privacy.ts:82`). | **Keep it, but ask the solicitor.** Art. 7(1) requires the controller to be able to show consent, which supports 6(1)(c); some advisers prefer 6(1)(f). A record that someone said yes to health processing may itself reveal health information, hence 9(2)(f) (legal claims). |
| D11 | Breach response (register item 11): no named person or process for the 72-hour ICO notice (Art. 33) and telling users (Art. 34). | **Name Benn as the responsible person and write a one-page procedure** (who checks Supabase and GitHub alerts, how to assess, how to report) before public launch. |
| D12 | EU users (Art. 27 representative) and a DPO (Art. 37). | **No DPO for now** (processing is not yet large scale; revisit at public launch). **Decide whether EU users are targeted**; if yes, appoint an EU representative and name it in the policy (register item 8). |

---

## 1. Need for a DPIA

A DPIA is required. Art. 35(1) applies where processing is "likely to result in a high risk", and
the ICO's list of processing likely to result in high risk (checked on ico.org.uk, 30 Sept 2026:
"Examples of processing likely to result in high risk", based on EDPB WP248rev01) names
"Hardware/software offering fitness/lifestyle/health monitoring" under **Tracking**. The ICO says a
DPIA is needed where an item on its list combines with another WP248 criterion. Several apply:

| Screening criterion (ICO list / WP248rev01) | Applies? | Evidence |
|---|---|---|
| Tracking: software offering fitness, lifestyle or health monitoring | Yes | The whole product: food, weight, workouts, mood and hunger check-ins, supplements (`src/core/types.ts:224` `DayLog`). |
| Sensitive data (special category, Art. 9) | Yes | Health data throughout; the diet pattern may reveal beliefs (`privacy.ts:65`). Food and workout logs are treated as health data (register, "Not now" row; CJEU C-184/20 and C-21/23 as cited there). |
| Data about vulnerable people | Possibly | People with or recovering from eating disorders, pregnant or breastfeeding people and people with conditions such as diabetes may use a diet and weight app. The wizard asks about all three (section 2.2). |
| Evaluation or scoring, including from health aspects | Yes, in a limited form | The safety routing evaluates onboarding answers and changes what Tali suggests (`routeSafety`, `src/core/domain/onboarding.ts:286`). Behind `ONBOARDING_ENABLED` (off: `src/screens/onboarding/Consent.tsx:22`). |
| Automated decision with legal or similarly significant effect | No (reasoned in 4.7) | The routing only makes suggestions more cautious; it denies nothing and the person can change the inputs. |
| Innovative technology (including AI) | Partly | A client-side training and nutrition engine; an AI label reader is built but off (`LABEL_SCAN_ENABLED`, `src/data/labelReader.ts:16`); further AI features are planned (`docs/plans/ai-platform-plan.md`). |
| Large scale | Not yet | 10 accounts on 30 Sept 2026 (section 2.2). Expected to grow at public launch. |
| Denial of service based on special category data | No | Under-18s are refused, but by age, not health. Declining health consent limits the service (D7). |
| Children | Not intended | 18+ (`MIN_AGE`, `src/core/legal/index.ts:34`). Risk of use by under-18s is R4. |

The register reached the same view (`docs/compliance/README.md`, "DPIA" section) and listed what
the DPIA must cover. This document covers each item: the onboarding wizard (pregnancy, the medical
flag, the wellbeing question, safety routing, outcomes-only storage, the under-age stop), plan
reasons syncing, on-phone processing (register item 27), the purge and the accepted 30-day gap
(item 30(d)), and the Anthropic processing to come (item 24).

---

## 2. Describe the processing

### 2.1 Nature of the processing

**Surfaces.** The app at app.tali.fit (a PWA built from this repo, hosted on GitHub Pages:
`public/CNAME`, `.github/workflows/deploy.yml`) and the website at www.tali.fit (Webflow, delivered
through Cloudflare, with an early-access email form protected by Cloudflare Turnstile). This DPIA
is mainly about the app. The website's processing (early-access emails, `_cfuvid`, Turnstile) is
low risk and recorded in the register; it is included in R7 for transfers.

**Collection.** Everything in the app is entered by the person: sign-up, the consent screen, the
log, Profile, and (when switched on) the onboarding wizard. Nothing is collected from third
parties except the Google identity for people who choose Google sign-in
(`src/screens/AuthScreen.tsx:70`) and product data from Open Food Facts when someone scans a
barcode (an independent controller; the phone asks it directly, so it sees the barcode and IP
address: `privacy.ts:110`).

**Storage on the phone.** The app is offline-first. The whole log, profile, settings and consent
records live in the browser's local storage under `leanplan.v1` (`src/data/persistence.ts`), with
a few other device-only keys listed in the cookie policy (`src/core/legal/cookies.ts`): the kitchen
list (`tali.kitchen`, never uploaded), the onboarding draft (`tali.onboarding`, outcomes only,
never uploaded), a pending under-age deletion (`tali.pendingDelete`) and the Supabase session
(`sb-…`). Local storage is not encrypted by the app; it relies on the phone's own protection.

**Consent gate.** After sign-in the consent screen (`src/screens/legal/ConsentScreen.tsx`) shows
three unticked boxes (health data, terms, 18 or over: lines 25 to 27, 48). Continue records a
`health` consent at `CONSENT_VERSIONS.health` (`src/data/consent.ts:32`). Nothing but consent
records syncs until there is a current yes: `consentLetsSync` (`src/data/consent.ts:254`), checked
in the store's sync loop (`src/store/store.ts:1131`, `1150`). Someone who already had data on the
phone may choose "Not now, keep it on this phone" (line 56); a new user's "Not now" signs out
(line 64).

**Sync.** With a current yes, the phone syncs per record with last-write-wins
(`src/data/sync.ts`) to Supabase tables `settings` (profile JSON), `day_logs`, `custom_foods`,
`recipes`, `routines`, `training_plans`, `push_subscriptions`; consent records go to the
append-only `consents` table; `ai_usage` holds daily AI allowance counts (0 rows on 30 Sept).
Plan reasons sync in `training_plans.why` (`PLAN_WHY_SYNC`, `src/data/sync.ts:106`).

**Server enforcement.** A trigger on each of the seven log tables refuses a signed-in person's
insert or update unless their latest health answer is a yes
(`docs/migrations/2026-09-28-health-consent-server.sql:45` to `82`). Checked live on 30 Sept: 7
`require_health_consent` triggers exist.

**Access control.** Row Level Security gives each person access only to rows where `user_id`
equals `auth.uid()` (`docs/security-rls.sql:30` to `44`); `consents` and `ai_usage` have narrower
policies (lines 69 to 71). Checked live on 30 Sept: RLS is on for all nine public tables. The
publishable (anon) key in `src/data/supabase.ts:10` is public by design and reaches no rows
without a session. The service role key is used only inside Edge Functions and a database job.

**Server-side processing.**
- `delete-account` (`supabase/functions/delete-account/index.ts`): verifies the caller's token with
  Auth, requires a sign-in in the last 5 minutes (line 116; waived only for an account under 24
  hours old with `reason: 'under-age'`), signs out every session (line 122), deletes the rows in
  every table in `USER_TABLES` (`supabase/functions/_shared/account.ts:10`), then the login.
- `send-supplement-reminders` (`supabase/functions/send-supplement-reminders/index.ts`): run by a
  cron job with a secret (constant-time check), reads push subscriptions and supplement names with
  the service role, skips anyone without a current health yes, and sends an encrypted Web Push
  with the fixed text "Time for your supplements" (no supplement name, from 2026-10-09).
- `ai-read-label`: sends a food-label photo to Anthropic and returns the values. Deployed, but
  switched off in the app (`LABEL_SCAN_ENABLED` false) and not described in the privacy policy
  (D5).
- `purge_unconsented_logs()`: a daily pg_cron job at 03:17 UTC
  (`docs/migrations/2026-09-28-unconsented-purge.sql:175` to `221`; checked live: the job exists).

**Withdrawal.** Profile → Privacy → Withdraw. The phone records a no, clears every item in
`HEALTH_FIELDS` (`src/data/consent.ts:304`, `clearHealthData` at line 348), deletes the onboarding
draft, and calls `clear_log_after_withdrawal()` (`src/data/sync.ts:389`), which deletes the
account's copy of all seven log tables in one transaction, only while the latest answer is a no
(`2026-09-28-health-consent-server.sql:85` to `114`). Every other phone of the account applies the
clear the next time it connects (`applyHealthWithdrawal`, `consent.ts:410`; `pendingCloudClear`,
line 435). Consent records and the account stay.

**Deletion.** Delete account (above) and then the phone is wiped; or "Sign out and remove this
device's log" for the phone only.

**The purge.** Some accounts synced data before the consent screen existed (register item 20).
For an account with no health answer, the account's log is deleted 30 days after the later of
PURGE_FROM (28 Sept 2026) and the account's creation, so on 28 October 2026 for existing accounts
(`UNCONSENTED_DELETION`, `src/core/legal/index.ts:32`; `npm test` checks the two dates agree:
`scripts/test-consent.ts:767`). A no more than a day old is also purged, as a backstop to the
withdrawal clear. Consent records are never purged. The phone keeps its own copy, and a later yes
re-uploads it (`needsReupload`, `consent.ts:444`).

**Processors and recipients** (register, "Processors and transfers"; locations as recorded there
and checked where noted):

| Recipient | Role | Location | What it sees |
|---|---|---|---|
| Supabase Inc. | Processor: database, Auth, account emails, Edge Functions, pg_cron | Project region eu-west-1, Ireland (checked with the Supabase API, 30 Sept). Supabase Inc. is a US company. | Everything synced, account email and password hash, request logs |
| GitHub Inc. (Pages) | Processor: app hosting | US | IP address, user agent, request times |
| Webflow Inc., with Cloudflare and Amazon CloudFront | Processor: website, early-access form; delivery and Turnstile | US / global | Early-access emails, website request data, Turnstile signals |
| Bunny.net (BunnyWay d.o.o.) | Processor: some exercise demo videos (`src/core/data/media.ts:57`; others are served from the app itself, `VIDEO_BASE` line 8) | Slovenia per Bunny's published details (register: confirm) | IP address and request data when the app shows a demo's preview image or plays the video |
| Google (Workspace) | Processor: email for feedback and rights requests | US / global | Emails sent to benn@gravita.co, including feedback (the app opens the person's own mail app: `src/core/domain/feedback.ts:46`) |
| Google (sign-in) | Independent controller | Global | Only for people who choose Google |
| Apple, Google, Mozilla push services | Deliver reminders | Global | An encrypted payload with no supplement name (fixed text) |
| Open Food Facts | Independent controller | France | Barcode and IP address |
| Anthropic | Would be a processor for label reading | US | Nothing today in the app (off); see D5 |

**Data flow in one line each.**
1. Phone → local storage: everything the person enters.
2. Phone → Supabase (eu-west-1), over HTTPS, only with a current health yes: the log tables above.
3. Phone → Supabase: consent records, always (needed to show the answer on other phones).
4. Supabase → phone: pulls of the same data for the account's other phones.
5. Supabase job → push service → phone: supplement reminders.
6. Phone → Open Food Facts: a scanned barcode.
7. Phone → GitHub Pages / Bunny: requests for app files and videos (technical data only).
8. Person's mail app → Google Workspace: feedback and requests.

### 2.2 Scope of the processing

**Data categories.**

- **Account:** email, password hash (Supabase Auth); for Google sign-in, email, name and avatar
  URL.
- **Profile** (`Profile`, `src/core/types.ts:387`): name, `sex` (legacy M/F) and `sexAnswer`
  (female, male, prefer not to say), age, height, weight, body fat, activity level, goal, pace,
  diet pattern, supplements, targets and ranges, display preferences including Gentle mode,
  accuracy preferences, hand-portion sizes, if-then plans, and training preferences
  (`profile.training`: confidence, how much they move now, days and weekdays, session length,
  place, equipment, what they enjoy, cardio, focus areas, likes and dislikes, **body areas to go
  easy on (`limitations`) and a free-text note (`limitationsNote`)**).
- **Log** (`DayLog`, `src/core/types.ts:224`): foods and portions, supplements taken, body weight,
  workouts and sessions (exercises, sets, time, effort, how it felt), and check-ins (mood, hunger,
  sleep, stress, energy, soreness, note). Custom foods, recipes, the person's own workouts
  (`routines`) and weekly plans (`training_plans`).
- **Every `HEALTH_FIELDS` item** (`src/data/consent.ts:304`), which withdrawal clears:
  `day.weight`, `day.checkin`, `profile.weight`, `profile.bodyFat`, `profile.height`,
  `profile.sexAnswer`, `profile.movement`, `profile.activityMult`, `profile.activityLevel` (reset to
  the default), `profile.outcomes`, `profile.pregnancy`, `profile.motivations`,
  `profile.deficitChosen`, `profile.training`. Also stripped: health-derived plan reasons
  (`healthWhy`, `consent.ts:403`).
- **Onboarding outcomes** (wizard, behind `ONBOARDING_ENABLED`; `OnboardingOutcomes`,
  `src/core/types.ts:274`): readiness `clear`/`flagged` (from the health check: heart, dizziness,
  pregnancy, recent surgery), medical `clear`/`flagged` (diabetes treated with insulin or tablets
  that can cause lows, kidney disease, a weight-loss injection), baseline `ok`/`low` (sleep, stress,
  room for change). **Only the outcome is stored, never which item applied**; the raw items stay in
  component state, and the end-to-end test checks no raw screener answer is ever uploaded
  (`scripts/e2e-onboarding.cjs:268`).
- **Pregnancy** (`PregnancyFlag`, `src/core/types.ts:286`): `flagged` (pregnant and breastfeeding
  not told apart), `askedAt`, and `snoozedAt` after "Ask me later" on the 12-week re-ask.
- **The wellbeing answer** ("how food and weight feel"): `flagged` (yes), `sometimes` (from
  Onboarding 9, 2026-10-01), `clear` or `undisclosed`, and whether it turned Gentle mode on (a yes
  only). After it, `profile.foodOptIn` (`src/core/types.ts:292`): for a sometimes, the answer to
  the day-14 "Would you like your food range on Today?" (`today`, no date); for a yes, the answer
  to the week-4 "Would a calorie range help?" (`range`) with `rangeAt`, the date, for the 12-week
  rest after "Not now". Closing either ask saves the second answer, so no separate "asked" flag is
  kept; the merge stamp `answeredAt.foodOptIn` records when it last changed. Health data by
  inference (only a yes or sometimes is asked). This is a proxy for disordered eating and is the
  most sensitive single item.
- **Other onboarding answers:** motivations (chips or up to 60 characters of own words), daily
  movement and the multiplier from it, `deficitChosen`, per-field `answeredAt` stamps.
- **Plan reasons:** `why` entries on `training_plans` and on workout slots in `routines`, some of
  which come from health answers (codes `body-area`, `baseline`, `feel`, `recovery` and fields such
  as `readiness`, `wellbeing`, `gentle`, `deficit`: `consent.ts:400` to `403`).
- **Derived but not stored:** a BMI under 18.5 is used as a gate only (no deficit), never shown or
  stored (`lowBmi`, `src/core/domain/onboarding.ts:267`; `LOW_BMI` line 74).
- **Reminders:** push subscription endpoint and keys, supplement names and times.
- **Consent records:** type, version, yes or no, time on the phone and arrival time.
- **Technical:** IP address, user agent, request times in provider logs.
- **Website:** early-access email; Turnstile signals; `_cfuvid`.

**Volume** (checked with read-only count queries on the live Supabase project, 30 Sept 2026; no
row content was read):
- 10 accounts in Auth, the first created on 24 June 2026;
- 6 accounts with any cloud log row; 5 accounts whose latest health answer is a yes; **2 accounts
  with a cloud log and no current yes** (these are what the 28 October purge will delete);
- 1 push subscription; 0 `ai_usage` rows; 0 accounts not signed in for 60 days.

What I could not verify: who the accounts belong to (the register says Benn and a few closed
testers), how much data is on phones only (by design the server cannot see it), how many
early-access emails Webflow holds (Unknown: count them in the Webflow form submissions), and the
expected number of users at public launch (Unknown: Benn's launch plan).

**Retention** (`privacy.ts:122` to `130`; register, "Record of processing"):
- Account data: while the account exists; deleted from the live database at once on Delete
  account.
- Log, profile, settings, reminders in the account: until withdrawal (cleared at once, or when a
  phone next connects), the purge (for no answer), or account deletion.
- Consent records: until account deletion.
- Accounts themselves: no end date (R11, D6).
- Supabase backups: expire on Supabase's cycle. **Unknown:** the backup window for this project's
  plan (Pro since 28 Sept, register item 39). Check the Supabase dashboard (Database, Backups) and
  record it (register item 30(b)).
- Provider logs: each provider's own retention. Unknown for each; recorded as such in the policy.
- On the phone: until the person deletes it, clears browser data or removes the app.
- Early access emails: until invited and early access ends, or on request.

### 2.3 Context of the processing

- **Who the users are:** adults (18+) who want to track food, training and body measures. Today, a
  closed group of testers (register, "Status").
- **Relationship and control:** a direct consumer relationship with a free service
  (`terms.ts:85`). People enter everything themselves, can see and edit most of it, export it, and
  delete it from the app.
- **Expectations:** people using a health app expect their data to be private, not sold, and not
  used for ads. The policy says there are no ads, analytics or tracking (`privacy.ts:34`), and the
  code has none (no analytics SDK found; the register's "Storage and PECR" row agrees). They will
  probably expect sync across phones; they may not expect that data they logged before being asked
  had already synced, which is why the purge exists.
- **Vulnerable people:** likely to include some. A diet and weight app attracts people with a
  difficult relationship with food. Pregnant and breastfeeding people may use it. People with
  diabetes on insulin or sulfonylureas are at risk of hypoglycaemia if they eat less. The terms tell
  these groups to see a GP and not to use Tali to guide their eating (`terms.ts:26` to `37`). The
  wizard, when on, detects some of them and makes Tali more cautious (section 4.7).
- **Children:** not intended (18+), but a diet app can appeal to teenagers (R4, D8).
- **State of the art and concerns:** health and fitness apps are a known area of public concern
  about data sharing with advertisers and data brokers. Tali shares with neither. Offline-first
  storage with owner-only RLS and consent enforced on the server is above the norm for a small
  app. Weaker than the state of the art: no client-side encryption of local data or exports, no
  multi-factor sign-in option, no independent security test yet.
- **Relevant codes and guidance:** ICO guidance on special category data and on DPIAs; ICO
  Children's Code (not applicable while under-18s are excluded and the service is not likely to be
  accessed by them: D8); MHRA guidance on software as a medical device (Tali positions itself as
  general wellness: `terms.ts:28`); ASA/CAP Code sections 12 and 15 for marketing claims.
- **Controller change ahead:** a separate company is planned before public launch (register item
  15). That means a new controller, new texts, re-consent, and a review of this DPIA.

### 2.4 Purposes

- Provide the service the person asked for: store and sync their log, calculate targets, ranges
  and trends, suggest meals and workouts, build weekly plans, send the reminders they turned on.
- Keep people safe within a wellness service: make suggestions more cautious for people who say
  they are pregnant, have certain conditions, have a difficult relationship with food, or are
  low on sleep or room for change (the safety routing), and signpost to the GP, midwife, NHS 111,
  Beat and Samaritans.
- Show what people agreed to and when (consent records).
- Keep accounts and the service secure; answer requests; meet legal duties.
- Invite people on the early-access list (website).

The benefit to the person is a private, offline-capable log with suggestions that respect their
health situation. The benefit to Gravita is a product it can launch. No purpose involves selling,
advertising, research or profiling for anyone else.

---

## 3. Consultation

**Done (recorded in the repo):**
- `security-data` reviews of the consent sync, the "Not now" pause, the server enforcement, the
  purge, the under-age deletion and `delete-account` (commits `fafea2f`, `fe08c04`, `c0024c5`,
  `d719e65`; the review notes in `supabase/functions/_shared/account.ts:46` and
  `delete-account/index.ts:19`; register items 36 and 37). The client side of the under-age stop
  (sign-out and wipe) has no recorded `security-data` review (register item 37).
- `mental-performance` review of the onboarding copy and routing (commit `d719e65`: pregnancy
  follow-up wording, recent surgery routed to readiness, NHS 111 wording) and of engine copy
  (commits `01b4ecb`, `c187c3f`, `71e2e04`).
- `nutrition-accuracy` review of the onboarding targets (commit `f9eb261`) and earlier target and
  energy work.
- `ship-critic` on the onboarding build (commit `a9f0fcc`).
- Benn's decisions as controller, recorded with dates in the register (items 21, 26, 30(a), 31)
  and the onboarding plan §9.

Note: these reviews were by AI agents working on the codebase. They are useful and recorded, but
they are not independent professional reviews.

**Not done, and should be:**
- **A clinician** on the wellbeing question, the readiness and medical questions and the routing
  (D1). The onboarding plan requires this before wider launch.
- **A solicitor or privacy professional** on the texts, the register and this DPIA (register item
  6), with the specific questions in D7, D10 and register item 26 (the 30-day hold).
- **Users.** No one outside the build has been asked. Before public launch, a short test with a
  handful of people (including, if possible, someone with lived experience of an eating disorder,
  through a charity such as Beat rather than by recruiting patients) on whether the consent screen
  and the health questions are clear and acceptable. Art. 35(9) asks for data subjects' views
  "where appropriate"; record the decision either way.
- **Processors:** confirm their DPAs and security terms (D4).
- **A DPO:** none appointed (D12).

---

## 4. Necessity and proportionality

### 4.1 Lawful basis

| Data | Art. 6 basis | Art. 9 condition | Notes |
|---|---|---|---|
| Account (email, password hash, Google identity) | 6(1)(b) contract | None needed | |
| Profile, log, custom foods, recipes, workouts, plans, plan reasons | 6(1)(b) contract | 9(2)(a) explicit consent | Food and workouts treated as health data (conservative, register "Not now" row). |
| Onboarding outcomes, pregnancy, wellbeing, motivations, movement | 6(1)(b) | 9(2)(a); each question optional, with a notice on its screen | Only asked after a local health yes (`canSaveHealthAnswers`, `consent.ts:201`). |
| Reminders (push subscription, supplement names) | 6(1)(b) | 9(2)(a) | The server also checks consent before sending. |
| Consent records | 6(1)(c) legal obligation (Art. 7(1)) | 9(2)(f) if a record counts as special category | D10. |
| Pre-consent log held for the 30-day transition | Unclear | **None identified** (register "Record of processing") | A time-limited risk Benn accepted on 28 Sept; data held unread and unchanged; solicitor's view pending (register item 26). |
| Security and request logs | 6(1)(f) | None | |
| Feedback emails | 6(1)(f) | 9(2)(a) at most if someone volunteers health details; the app asks them not to (`privacy.ts:51`) | |
| Early access email | 6(1)(a) consent | None | Website. |

**Is explicit consent valid?** The screen is explicit (a separate, unticked box for health data),
specific, and unbundled from marketing (there is no marketing). It is bundled in one screen with
the terms and the age box, but as separate boxes. It is as easy to withdraw as to give (Profile →
Privacy). Informed: the live privacy policy at www.tali.fit/legals/privacy (checked 30 Sept) is
the consent-release text and matches what the live app does; the onboarding sections on this
branch are not yet published, which is right while the wizard is off, and must go live with the
release that turns it on (register item 38). The open question is conditionality (D7).

### 4.2 Data minimisation

- **Outcomes-only storage** for the readiness, medical and lately questions: Tali stores "flagged"
  or "clear", never the condition, medicine or symptom. This is the single most important
  minimisation measure and it is tested (`scripts/e2e-onboarding.cjs:268`).
- Pregnant and breastfeeding are stored as one flag.
- BMI is computed for a gate and never stored.
- The kitchen list and the onboarding draft never leave the phone.
- Everything in onboarding is optional except age and goal (`canSkip`,
  `src/core/domain/wizard.ts:217`); a skipped answer leads to cautious defaults, not a prompt to
  answer.
- Kept after withdrawal on the phone only: name, age, legacy `sex`, units, goal, Gentle mode,
  `onboardedAt` (`consent.ts:321`). Note that Gentle mode being on can hint at the wellbeing answer;
  it stays only on the person's own phones.
- Things Tali could keep but doesn't: no location, no contacts, no device identifiers, no
  analytics.
- Could go further: the wellbeing answer is stored as given (flagged, sometimes, clear or undisclosed) because
  the Profile screen shows and edits it and routing depends on it. That is justified, but it
  should be named in the clinician review (D1).

### 4.3 Accuracy

People enter and correct their own data; most fields are editable in the app, and the health
answers in Profile › Health data (register "Rectification"). Nutrition values cite a source and
show a margin (CLAUDE.md "Food data"; `terms.ts:49` to `55`). The multi-phone merge uses per-field
timestamps so an older answer does not overwrite a newer one (`answeredAt`). The 12-week pregnancy
re-ask keeps that flag from going stale (register item 33). Not editable in the app: going back to
"prefer not to say" for sex (by email).

### 4.4 Retention

Set out in 2.2. Strong points: withdrawal and the purge delete the cloud copy automatically.
Gaps: no end date for dormant accounts (R11, D6); backup window unknown; provider log retention
unknown.

### 4.5 Transparency

Privacy policy, terms and cookie policy (`src/core/legal/`), published on the website and linked
from sign-up, the consent screen and Profile. The consent screen, each health question and the
withdrawal prompt (`HEALTH_WITHDRAW_PROMPT`, `consent.ts:770`) say what happens in context.
`npm run check:legal` blocks deploys on placeholders. The policy describes the safety routing
(`privacy.ts:87` to `93`).

### 4.6 Rights

Access and portability: Export (JSON, `src/data/backup.ts`). Rectification: in app, else email.
Erasure: Delete account, or remove the phone's log. Withdrawal: Profile → Privacy. Restriction and
objection: by email. Requests by email to benn@gravita.co within one month (`privacy.ts:161`).
Gap: no written internal process for email requests or identity checks.

### 4.7 Automated decisions (Art. 22)

The safety routing (`routeSafety`, `src/core/domain/onboarding.ts:286` to `350`) is automated
processing of health data that changes what the person is offered: a gentler start, no calorie
deficit, no calorie number, Gentle mode, and signposting. It is not a decision "based solely on
automated processing which produces legal effects or similarly significantly affects" the person,
because: it only ever makes Tali more cautious; it refuses no service, product or price; the
person can see, change or clear the answers that drive it (Profile › Health data); and the policy
says it has no legal or similarly significant effect and nobody makes decisions about them from it
(`privacy.ts:91`). Even so, it relies on 9(2)(a) explicit consent, which is also the Art. 22(4)
condition if a regulator took a different view. This reasoning should be confirmed by the
solicitor.

### 4.8 Medical device boundary

The routing does not diagnose, predict disease or adjust medication; it withholds a deficit and
signposts. That keeps Tali on the general-wellness side (terms "Not medical advice",
`terms.ts:26`). Unknown: whether MHRA would agree for this exact design; a short qualification
note against MHRA's software and AI as a medical device guidance before public launch would
settle it. Any future feature that interprets symptoms, flags a condition or suggests medication
changes needs a fresh assessment.

### 4.9 Processors and transfers

Supabase stores the data in Ireland, but Supabase Inc. is US-based and may access it from the US;
GitHub, Webflow, Cloudflare and Google are US or global. The policy relies on the UK IDTA or UK
Addendum, EU SCCs or the UK-US and EU-US Data Privacy Framework (`privacy.ts:114` to `118`).
**Unknown:** which mechanism each provider actually offers for this account, and whether each DPA
has been accepted (register item 4 says not yet for Supabase, Webflow and Bunny). Resolve by
accepting each DPA, checking each company on the DPF list, and recording the result in the
register (D4). A transfer risk assessment is only needed where the IDTA or Addendum is relied on;
Unknown until the mechanisms are known.

---

## 5. Risks

Scoring follows the ICO template: likelihood (remote, possible, probable) and severity (minimal,
significant, severe), giving overall risk (low, medium, high). These are inherent risks, before
the measures in section 6.

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R1 | **Breach or unauthorised access to health data in the cloud**: an RLS mistake, a leaked service role key, a flaw in an Edge Function, a compromised admin account, or a stolen user session exposes logs, pregnancy status or the wellbeing answer. The anon key is public by design, so RLS is the only barrier for API access. | Possible | Severe | High |
| R1b | **Exposure on the phone or in exports**: a shared or lost phone, or a backup JSON file (unencrypted, in Downloads or shared by mistake) reveals the log. | Possible | Significant | Medium |
| R2 | **Health data reaching the cloud without consent**: a bug, an old app version, or a second phone that hasn't heard of a withdrawal uploads data; and data that synced before the consent screen existed is held without an Art. 9 condition. | Possible (historically it happened) | Significant | Medium |
| R3 | **Wrong safety routing or advice harms someone**: a person with an eating disorder is given a deficit or weight focus; a pregnant person or someone on insulin or sulfonylureas is steered to eat less; someone treats Tali as medical advice. Routing depends on self-report and on the wizard being on (it is off today, so the live app has no screener at all and relies on the terms' warning). | Possible | Severe | High |
| R4 | **An under-18 uses Tali**: diet and weight features used by a child, whose data then needs the Children's Code protections. | Possible | Significant | Medium |
| R5 | **Data loss for users**: data kept only on a phone (after "Not now", withdrawal, or before sync) is lost with the phone; the 28 October purge deletes the account copy of the 2 accounts with no answer, with no email to warn them; no user-level restore from backups. | Possible | Significant | Medium |
| R6 | **Withdrawal not fully honoured**: other phones keep health fields until they next connect; Supabase backups keep deleted rows until they expire (window unknown); exported files and a `resumeCopy` on the phone keep a copy; some fields are kept by design. | Possible | Significant | Medium |
| R7 | **Transfers to US processors** without a recorded mechanism or DPA, leaving data open to access under laws with weaker protection and no enforceable contract terms. | Possible | Significant | Medium |
| R8 | **Function creep, including AI**: planned AI features send health data to an AI provider, or data is reused for purposes people didn't agree to. `ai-read-label` is already deployed. | Possible | Significant | Medium |
| R9 | **On-phone processing treated as outside the GDPR**: Tali's code processes data on the phone even when nothing syncs (register item 27: CJEU C-25/17, C-210/16; Recital 18), so the phone-only paths still need a basis, notice and rights. If treated as out of scope, those protections could be missed. | Possible | Minimal | Low |
| R10 | **No ICO fee paid**: a legal requirement for the controller, not a direct harm to individuals, but a sign of weak governance and a regulatory exposure. | Probable (it is unpaid today) | Minimal | Medium (compliance) |
| R11 | **Dormant accounts kept with no end date**: email and consent records (which reveal use of a health app) kept indefinitely after someone stops using Tali or after a purge. | Probable | Minimal | Low |
| R12 | **Consent not freely given**: new users can only use Tali if they agree (D7), which a regulator could see as conditional consent. | Possible | Significant | Medium |
| R13 | **Controller change**: when the new company takes over, consents given to Gravita Creative Ltd do not carry over automatically and data could be moved without a basis. | Probable (planned) | Significant | Medium |

---

## 6. Measures to reduce the risks

"In place" items were checked in the code on 30 Sept 2026 (and live where noted). "Recommended"
items are not done.

### R1 Breach or unauthorised access
- **In place:** owner-only RLS on every table (`docs/security-rls.sql:30` to `44`; live check: RLS
  on for all 9 tables); `consents` insert and select only, `ai_usage` select only; the anon key
  reaches no rows without a session (`src/data/supabase.ts:10`); the service role key only in
  Edge Function environments and the pg_cron job (`delete-account/index.ts:32`); `delete-account`
  verifies the token with Auth, requires a recent sign-in, and revokes all sessions first
  (`delete-account/index.ts:105` to `123`); the reminder function checks a secret in constant time;
  functions log counts only, no ids or content; outcomes-only storage limits what a breach could
  reveal; leaked password protection on (register item 39); HTTPS throughout. Supabase security
  advisor on 30 Sept: two warnings, `pg_net` in the public schema (register item 39, low) and
  `ai_usage_take` being a security definer callable by signed-in users (intended: it is how the
  allowance is taken, `docs/security-rls.sql:70`).
- **Recommended:** a written breach procedure and named owner (D11); MFA on every Supabase, GitHub,
  Webflow and Google admin account (Unknown: whether it is on; Benn to confirm); an independent
  security test of RLS and the Edge Functions before public launch; offer MFA or passkeys to users
  later; move `pg_net` out of `public`.
- **Residual:** likelihood remote, severity severe: **medium**. Severity cannot fall below severe for
  this data, which is why the measures matter.

### R1b Phone and exports
- **In place:** data on the phone is sandboxed to the app's origin; "Sign out and remove this
  device's log"; the owner check stops a different account on the same phone seeing the data
  (`ownerCheck`, `src/data/persistence.ts:272`).
- **Recommended:** a line on the Export screen that the file contains health data and should be
  kept private (a copy change, so it needs Benn's approval).
- **Residual:** possible, minimal to significant: **low**.

### R2 Cloud without consent
- **In place:** unticked boxes on the consent screen; the phone syncs nothing but consent records
  without a current yes (`consentLetsSync`, `consent.ts:254`; `store.ts:1150`); the server refuses
  log writes without a current yes (trigger on 7 tables, live check 30 Sept); reminders skip anyone
  without a yes; health questions only shown and saved after a local yes (`canSaveHealthAnswers`,
  `consent.ts:201`; `HEALTH_STEPS`, `wizard.ts:149`); the pre-consent cloud copy is purged
  automatically (`purge_unconsented_logs`, live job checked).
- **Recommended:** solicitor's view on the 30-day hold (register item 26); keep the purge job
  monitored after 28 October (check that the two accounts' rows are gone).
- **Residual:** remote, significant: **low**.

### R3 Wrong routing or advice
- **In place:** terms say Tali is not medical advice and list who should see a GP and not use Tali
  to guide their eating (`terms.ts:26` to `47`); the routing only ever makes Tali more cautious
  (`routeSafety`); skipped answers give cautious defaults (a gentler start, maintenance pre-selected,
  quiet signposting: `onboarding.ts:322` to `346`); pregnancy holds food at maintenance with no
  calorie number; the medical flag removes the deficit and the high-protein anchor and adds a GP
  note; a wellbeing yes turns on Gentle mode (no calorie target, totals in words, a maintenance range
  on Food only if the person asks for one at week 4) and a sometimes gives a maintenance range
  only (never a deficit, Today in words until the person opts in at day 14); both take the weight
  number off Today, stop automatic training increases and signpost Beat, NHS 111, Samaritans and
  emergency help (gaps as built, register item 34: a pregnant yes who opts into the range sees
  calorie numbers on Food, and the weight sheet and Profile still show weight); BMI under 18.5 blocks a deficit; targets are ranges with
  neutral copy (CLAUDE.md design system); `mental-performance` and `nutrition-accuracy` reviews
  (section 3); the pregnancy flag is re-asked every 12 weeks.
- **Recommended:** clinical review before the wizard goes on (D1); confirm the Beat number (0808 801
  0677) against beateatingdisorders.org.uk (register item 9); decide what the live app, which has
  no screener while the wizard is off, shows new users about these groups (today only the terms);
  a short MHRA qualification note (4.8); keep marketing free of health claims (ASA/CAP 12 and 15).
- **Residual:** with D1 done, possible and significant: **medium**. Without D1, **high**: the
  routing's thresholds and wording would rest on AI reviews alone.

### R4 Under-18s
- **In place:** 18+ in the terms and policy (`MIN_AGE`); a required "I'm 18 or over" box on the
  consent screen; behind the wizard, an age question that stops under-18s kindly, wipes the phone
  and deletes the new account (`delete-account` under-age path, register "Under-age stop" row); the
  policy says how to report a child's use (`privacy.ts:166`).
- **Recommended:** a written "likely to be accessed by children" assessment (D8); fix register item
  37(a): an under-age account that never signs in again stays on the server with nothing marking
  it; a `security-data` review of the client stop path.
- **Residual:** possible, significant: **medium**, falling to **low** once the wizard's age stop is
  live.

### R5 Data loss
- **In place:** Export at any time; the terms and cookie policy warn that phone-only data is lost
  with the phone or browser data (`terms.ts:61`; `cookies.ts:61`); the "Not now" and withdrawal
  screens say where the data is and offer a backup first (`HEALTH_WITHDRAW_PROMPT`); the purge keeps
  the phone's copy and a later yes re-uploads it (`needsReupload`); "Start fresh" needs a second
  tap with "Export a copy" beside it (register item 31).
- **Recommended:** send the two notice emails before 28 October (D2); record the backup window.
- **Residual:** with D2 done, remote, significant: **low**. Without it, possible, significant:
  **medium**, for the two accounts affected (an accepted risk, register item 30(a)).

### R6 Withdrawal not fully honoured
- **In place:** the phone clears all `HEALTH_FIELDS` and health-derived plan reasons at once
  (`clearHealthData`, `consent.ts:348`), and the `resumeCopy` is stripped too (`stripResumeCopy`);
  the account's copy is deleted in one transaction (`clear_log_after_withdrawal`); every other phone
  clears on next connection, once per withdrawal (`applyHealthWithdrawal`, `pendingCloudClear`); the
  server refuses uploads after a no, so a stale phone cannot put data back; the purge deletes any
  log left more than a day after a no; the onboarding draft is deleted; the policy tells people
  exactly what stays (`privacy.ts:69` to `70`).
- **Recommended:** record the Supabase backup window (register item 30(b)) and say it in the policy
  if it is long; note in the policy that exported files are the person's own copy.
- **Residual:** remote, significant: **low**. What stays by design (name, age, goal, legacy sex,
  Gentle mode on the phone; consent records in the account) is disclosed.

### R7 Transfers to US processors
- **In place:** the database is in eu-west-1, Ireland (checked 30 Sept); push payloads are
  encrypted end to end; the policy names each provider and the safeguards relied on.
- **Recommended:** D4 (accept the DPAs and record the mechanism per provider); proxy Open Food
  Facts lookups through an Edge Function so the IP address no longer reaches it (register item 23,
  optional).
- **Residual:** once D4 is done, remote, significant: **low**. Until then **medium**, and the
  missing Art. 28 contracts are a compliance gap in their own right.

### R8 Function creep and AI
- **In place:** label reading is off in the app (`LABEL_SCAN_ENABLED`) and the AI features row is
  hidden (`AI_FEATURES_LIVE`, `src/screens/ProfileScreen.tsx:44`); the policy comment forbids
  switching label reading on before it is described (`privacy.ts:9` to `12`); `ai-read-label` checks
  a separate label-photo consent on the server and logs no content; purposes are listed and no
  secondary use exists; the register lists AI, analytics, error tracking, email marketing and paid
  tiers as changes that need the compliance agent first.
- **Recommended:** D5 (disable the deployed function until item 24 is done); update this DPIA before
  any AI feature goes on, covering the provider's DPA, zero retention, the transfer and TIA, an AI
  disclosure to users (EU AI Act Art. 50) and no solely automated decisions (register item 24;
  `docs/plans/ai-platform-plan.md` §4 and §5).
- **Residual:** remote, significant: **low**.

### R9 On-phone processing
- **In place:** the policy and cookie policy describe device-only data and how long it stays
  (`privacy.ts:47` to `48`; `cookies.ts:35` to `37`); the same consent gate applies to the health
  questions on the phone (`canSaveHealthAnswers`); withdrawal clears health fields on the phone too;
  rights (export, delete on this device) cover the phone.
- **Recommended:** none beyond keeping this in the register (item 27) and treating any new
  device-only store as a policy change.
- **Residual:** **low**.

### R10 ICO fee
- **In place:** `check:legal` warns while `LEGAL.icoNumber` is empty (`src/core/legal/index.ts:21`).
- **Recommended:** pay now (D3). The new company will need its own registration.
- **Residual after payment:** **low**.

### R11 Dormant accounts
- **In place:** none (no inactivity rule). The purge removes the log, not the account.
- **Recommended:** D6.
- **Residual after D6:** **low**.

### R12 Conditional consent
- **In place:** separate unticked boxes; no marketing bundled; withdrawal is easy and keeps the
  app usable on the phone for food and workouts (`healthDeclined`, `consent.ts:229`); existing users
  can say "Not now" without losing anything.
- **Recommended:** solicitor's view (D7); consider whether a new user who says no could also keep
  a phone-only log, as a withdrawn user can (a product and design decision for Benn).
- **Residual:** possible, significant: **medium** until the solicitor confirms.

### R13 Controller change
- **In place:** the register plans it (item 15): update `LEGAL`, the texts, bump
  `CONSENT_VERSIONS` so everyone consents to the new company, and tell the early-access list.
- **Recommended:** review this DPIA at that point; a transfer agreement between the two companies;
  new ICO registration; new processor contracts in the new company's name.
- **Residual:** **low** if the plan is followed.

---

## 7. Sign-off and outcomes

### 7.1 Sign-off table (for Benn to fill in)

| Item | Name and date | Notes |
|---|---|---|
| Measures approved by | | Which "recommended" measures in section 6 are approved, with owners and dates. Integrate them back into the project plan. |
| Residual risks approved by | | Any residual high risk (R3 without D1) needs Art. 36 prior consultation before going ahead. |
| DPO advice | Not applicable: no DPO appointed (D12) | |
| Solicitor advice | | Summary of advice on D7, D10, the 30-day hold (register item 26), Art. 22 reasoning (4.7), and the texts. If advice is overruled, say why. |
| Clinician advice | | Summary of the clinical review (D1). |
| ICO prior consultation needed? | | See 7.3 for the reasoned view. |
| Consultation responses (users) | | Whether users were consulted, and if not, why (section 3). |
| This DPIA kept under review by | | Normally Benn, with the `compliance` agent. |

### 7.2 Outcomes summary

- Processing can continue in the closed test with the measures in place, provided D3 (ICO fee) and
  D4 (processor contracts) are done promptly: both are owed now.
- Before `ONBOARDING_ENABLED` goes on beyond closed testers: D1, the Beat number check, publishing
  the onboarding texts, and an update of this DPIA confirming the routing as reviewed.
- Before public launch: D2 is time-limited (before 28 Oct); D6, D8, D11, D12, the security test,
  the solicitor review, and the controller change if the new company exists by then.
- Before any AI feature: D5 and the R8 recommendations.

### 7.3 ICO prior consultation: reasoned view

Art. 36(1) requires prior consultation only where the DPIA shows the processing "would result in a
high risk in the absence of measures taken by the controller to mitigate the risk", that is, where
a high residual risk remains after mitigation. On this draft:

- R1 has severe severity, but with RLS, server enforcement, outcomes-only storage and the
  recommended breach procedure and admin MFA, its likelihood is remote: residual medium.
- R3 is the only risk that stays high, and only if the wizard's safety routing is released to the
  public without a clinician's review. With D1 done it is medium.
- No other risk is high after the measures.

So my view is that **prior consultation is not needed**, on condition that D1 is done before the
wizard goes to the public and the R1 and R7 recommendations are in place before public launch. If
Benn chooses not to do D1, or a future AI feature adds a residual high risk, consult the ICO first.
This is a judgement, not a certainty; the solicitor should confirm it.

### 7.4 Review date and triggers

Review by: **Unknown: Benn to set a date** (suggestion: before public launch, and at least yearly).
Review earlier when any of these happens:
- `ONBOARDING_ENABLED` is turned on for anyone beyond closed testers;
- label reading, the `ai` consent or any other AI feature is turned on (`LABEL_SCAN_ENABLED`,
  `AI_FEATURES_LIVE`, `docs/plans/ai-platform-plan.md`);
- public launch, or a marked change in the number of users;
- the new company becomes controller;
- a new processor, SDK, font CDN, analytics or error tracker; a new data field or table; a change to
  what syncs;
- paid tiers or a native app store release;
- a breach or a complaint;
- a change in the law or ICO guidance on health apps or AI.

---

## 8. Addendum: wellbeing Phase 1 (Mind)

**Signed off by Benn, 10 October 2026**, with the risk scores in 8.4 as proposed. Drafted 9 October 2026 from the compliance close-out of
`claude/confident-maxwell-ihd64e` at `b7df11c`. The Mind features are built but off
(`WELLBEING_ENABLED` in `src/data/wellbeingFlag.ts`; the skill screens and the signpost also sit
behind `MIND_REVIEWED`). Benn signs this section before the flag goes on. The register row
"Wellbeing Phase 1" and items 42 to 44 hold the detail; plan: `docs/plans/wellbeing-plan.md` §9.

### 8.1 Processing

- **Synced inside the check-in** (`supps._checkin` on `day_logs`): the sleep band and wake time
  (`night`), the Mind skills used as ids and times (`skills`), and the one thing for the day as a
  key from a fixed list and when it was done (`thing`).
- **Synced in `profile.mind`:** which pillars are on, how often Tali asks (`asks`), usual wake and
  wind-down times, which reminder types are on and their back-off (`notify`, `halved`), and the
  IANA time zone (`tz`). Mind plans are if-then plans marked with `IfThenPlan.kind`.
- **Server:** `notify_sent` (the last day a Mind reminder was sent, and the last day per type),
  so the reminder service keeps to one a day (`docs/migrations/2026-10-09-notify-sent.sql`).
- **Device only** (`deviceOnly` in `leanplan.v1`, `src/data/deviceOnly.ts`): Unload notes, the
  low-mood marker (`lowMoodShown`), the reminder delivery log (from the `tali-notify` IndexedDB,
  moved into `leanplan.v1` by the app) and the "More about sleep" open state.

### 8.2 Lawful basis

Art. 6(1)(b) with Art. 9(2)(a) explicit consent, as for the rest of the log (section 4.1). No
re-consent is needed: the consent wording already names sleep, stress and mood
(`ConsentScreen.tsx:40`), and no `CONSENT_VERSION` bump is required. Reminders and the server
record only run with a current health yes. The time zone is not health data and stays on the
phones after a withdrawal; the account copy goes with `settings`.

### 8.3 Minimisation

- No free text is synced: skills, the one thing, sleep bands and plan kinds are keys, checked by
  shape on load and on every pull (`validCheckin`, `validMindPrefs`, `validPlanKind`).
- Unload notes stay on the phone: never synced, never sent to an AI service, never shown in a
  notification.
- Push text is fixed, with no mood or sleep word in any payload (`_shared/reminders.ts`).
- The low-mood check runs on the phone and tells no one.

### 8.4 New risks

Scores using the scale in section 5, confirmed by Benn at sign-off (10 October 2026).

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R14 | **Unload notes exposed** on a shared or lost phone, or in an export file. | Possible | Significant | Medium |
| R15 | **People treat Tali as a crisis service**, and rely on it when they need urgent help. | Possible | Severe | High |
| R16 | **Which reminders someone gets reveals Mind use**, for example on a lock screen or through the server record. | Possible | Minimal | Low |
| R17 | **Inaccurate signposting by nation**: a person in Northern Ireland is told to call NHS 111, which doesn't run there (register item 44). | Probable (as built) | Significant | Medium |

### 8.5 Measures

- **R14 Unload notes.** In place: the owner stamp (`_meta.owner`), and notes hidden when the
  phone asks whose data it is (`ownerCheck`); cleared on withdrawal of health consent; the privacy
  policy warns that exports include them. Residual: **low**.
- **R15 Crisis service.** In place: the B6.7 copy in the app (the Support and Unload sheets say
  Tali isn't a crisis service and to call 999 in danger); the terms paragraph on the Mind part
  (`termsOfUse({ mind: true })`); 999 first in the Support sheet; the low-mood signpost;
  clinician review before `MIND_REVIEWED` goes on. Residual: **medium**, and
  only with the clinician review done; without it, treat as high (see 7.3).
- **R16 Reminders reveal Mind use.** In place: every Mind reminder is off by default and opt-in
  per type; the server only sends with a current health yes; `notify_sent` is cleared on
  withdrawal and on account deletion (`clear_log_after_withdrawal()`, `USER_TABLES`); the
  function's logs are counts only; push text is generic. Residual: **low**.
- **R17 Signposting by nation.** Recommended (register item 44): show the nation-neutral line to
  everyone until a nation is known, or, if Benn chooses a stored nation, collect it in Profile only
  on the conditions in item 44. Must be settled before `MIND_REVIEWED` goes on. Residual: **low**
  once settled.

### 8.6 Medical device boundary

The skills are general wellness (breathing, journalling, wind-down). Tali shows no diagnosis,
score or risk prediction, and the low-mood rule only signposts (most mood answers Low or Rough
over two weeks, at least five answers, at most once a month on each phone; `lowMoodDue` in
`src/core/domain/mind.ts`). This view stays subject to the clinician review (the Mind analogue of
D1), as in section 4.8.

### 8.7 Sign-off

| Item | Name and date | Notes |
|---|---|---|
| Section 8 approved by | Benn, 10 October 2026 | Scores in 8.4 confirmed as proposed. The flag still waits on the rows below. |
| Clinician advice (Mind) | | Before `MIND_REVIEWED` goes on. |
| Register item 42 deployed | | Before or with the flag. `notify_sent` migration applied in full 10 October 2026; the reminder function is still to deploy. |
| Register item 44 decided | | Benn with mental-performance. |

### 8.8 Note for Benn: B12 and B11b (proposed 10 October 2026, not signed)

Sections 8.1 to 8.7 above are as signed and are not changed by this note. It records two later
settings (register item 45, branch `claude/wellbeing-b12-b13`), both behind `WELLBEING_ENABLED`.

- **Wind down routine** (`profile.mind.routine`, B12): keys from a fixed list, never text. Health
  data by inference (sleep behaviour). Same basis as 8.2, same measures as the wake and wind-down
  times: not saved without a current health yes, cleared on withdrawal (`HEALTH_FIELDS`), checked
  by shape (`validRoutine`). No new risk; it falls under 8.3.
- **"Show supplement names in reminders"** (`profile.mind.lockNames`, B11b): off by default. When
  the person turns it on, supplement reminders carry the names due, which can reveal a condition
  or a medicine. This qualifies two signed lines: 8.3 "Push text is fixed" and R16 "push text is
  generic" now hold unless the person has turned names on. Proposed new risk:

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R18 | **A supplement name on the lock screen reveals health information**, for example a prescription medicine someone has added as a supplement, to anyone who can see the phone. | Possible (only for people who turn it on) | Significant | Medium |

  Proposed measures, all built: off by default (Art. 25(2)); the person's own choice, with the
  footer under the toggle saying anyone who can see the screen may read the name, even when it's
  locked; the privacy policy (Mind version) says the same; with it off the names are not read and
  never reach the payload (`suppPayload`); the payload is encrypted end to end, so the push
  service can't read it; the function logs counts only; names cut to 60 characters, at most 6.
  Proposed residual: **low**. Open: whether the footer should also say a name can reveal
  something about your health (a copy change for Benn).

| Item | Name and date | Notes |
|---|---|---|
| 8.8 approved by | | Before `WELLBEING_ENABLED` goes on with B11b. |

---

## Sources checked

- Code on `claude/pensive-ramanujan-j4k1ie` at `86eddbc`: files cited inline.
- Register: `docs/compliance/README.md` (last reviewed 2026-09-28).
- Live Supabase project `exvblofwiwbvycomxvmj`, 30 Sept 2026: region, RLS status, trigger count,
  cron job, security advisors, and row counts only (no row content read).
- Live privacy page, www.tali.fit/legals/privacy, 30 Sept 2026: the consent-release text, without
  the onboarding sections.
- ICO, "Examples of processing likely to result in high risk" (ico.org.uk), 30 Sept 2026.
- UK GDPR Arts. 5, 6, 7, 9, 22, 27, 28, 30, 33 to 37 (legislation.gov.uk); not re-read for this
  draft beyond the articles cited.
