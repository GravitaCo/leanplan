# Tilo: Data Protection Impact Assessment (UK GDPR Art. 35)

**Status: for Benn's signature (sections 1 to 7). Refreshed 24 November 2026. Not yet signed.**
First drafted on 30 September 2026 by the `compliance` agent (an AI assistant) for Benn, director
of Gravita Creative Ltd; updated 1 October 2026 (Onboarding 9) and 24 October 2026 (the medical
outcome split). Refreshed between 22 and 24 November 2026 from `main` at `fc3f7c5`, the native
iPhone app and the Cycle and Apple Health plans on `origin/claude/native-build` at `d179ad0`, and the
compliance register (`docs/compliance/README.md`, with its Cycle rows on `claude/native-build`).
Read-only checks on the live Supabase project were made on 22 November and repeated on 24 November
2026 (counts and settings only, no row content); the live website was checked on 22 November.
Sections 8 (Mind) and 9 (label photos and the shared list) were signed by Benn on 10 and 11 October
2026 and are not changed, except for dated status notes marked as such and one renumbering (the
APNs risk in 8.8 was numbered R19, which section 9 already used; it is R30 from 24 November).

**This is not legal advice.** It was drafted with AI help and has not been reviewed by a lawyer:
Benn decided on 16 November 2026 not to seek one for now (section 3). It records how Tilo works and
the judgement calls still open, so that Benn can check it, change it and sign it. Where a fact
could not be checked it says "Unknown:" or "Not verified:" and what would settle it.

The product was called Tali (app.tali.fit, www.tali.fit) until the rename to Tilo on 5 November
2026 (register item 48). The rename changed no controller, purpose, data, processor or transfer.
Anything this document records as checked before 5 November at a tilo.fit address was checked at
the tali.fit address under the name Tali.

Citations name files and functions. The line numbers in the September draft were removed on 22
November because they had drifted from the code.

It follows the structure of the ICO's DPIA template. The register stays the day-to-day record;
this document is the assessment. Keep them in step: a change to one that affects the other
updates both.

---

## Summary for Benn (one page)

**What the processing is.** Tilo is a free health and fitness app run by Gravita Creative Ltd as
controller. People log food, weight, workouts, supplements, sleep, mood and other check-ins, and
Tilo works out ranges, plans and gentle suggestions from them. Almost all of it is health data
(special category, UK GDPR Art. 9), processed on the basis of the contract (Art. 6(1)(b)) and
explicit consent (Art. 9(2)(a)) given on the consent screen. Data lives on the person's phone
first and syncs to Supabase in Ireland only after a yes; the server refuses log uploads without
one. Label photos go to Anthropic to be read, with no identifiers (signed off in section 9). The
web app at app.tilo.fit is used by a small closed group (11 accounts on 24 November 2026). An
iPhone app is in TestFlight internal testing with Benn and Sara (section 2.5). Nothing is sold,
advertised or used for analytics.

**Residual risks after the measures in section 6** (section 5 has the scale):
- **Medium:** R1 a breach of cloud health data (severity can't fall below severe; likelihood
  remote); R3 wrong safety routing, but only once D1 is done; R4 under-18 use; R7 transfers until
  the processor contracts (D4) are recorded; R12 conditional consent, with no legal view sought;
  R31 the iPhone app's data in phone backups, until Benn decides D14.
- **High, and the reason for the conditions below:** R3 if the onboarding wizard reaches people
  beyond closed testers without a clinician's review (D1); R15 (section 8) if the app becomes
  public before the Mind clinician review; R23 and R26 (Cycle, section 10) for anyone beyond Benn
  and Sara.
- **Low:** everything else, including the 28 October purge (done) and withdrawal.
- **No legal advice behind any of this.** Benn decided on 16 November 2026 not to instruct a
  lawyer for now (section 3, D15). Every legal judgement here is the `compliance` agent's,
  unreviewed.

**What your signature on sections 1 to 7 approves.**
1. The processing described in sections 2 to 4 as it runs on 24 November 2026: the web app for
   the closed test group, and the iPhone app in TestFlight for Gravita's core team (Benn and
   Sara), with the measures "in place" in section 6 and the residual risks above.
2. The recommended measures in section 6 that you tick in 7.1, with owners and dates.
3. The view in 7.3 that ICO prior consultation is not needed on the stated conditions.
4. That the DPIA part of the onboarding launch gate (`first-run-onboarding.md` §9 "Launch gate"
   and phase 1 of §10; register items 7 and 34) is met **for closed testers only**: the wizard
   (`ONBOARDING_ENABLED`) may then be switched on, through its own `ship-critic` pass, for people who
   are actually closed testers.
5. Accepting, for now, the risk of having no legal advice (D15).

**What stays conditional (not approved by this signature).**
- **D1, a clinician's review** of the wellbeing question, the readiness and medical questions and
  the routing, before the wizard reaches anyone beyond closed testers. "Closed" has to be real:
  sign-up at app.tilo.fit is open to anyone with the link today (D13).
- Before the wizard goes on at all: the open build fix in register item 34 (copy that says weight
  is hidden, when the weight sheet and Profile still show it), and publishing the onboarding
  version of the texts with that release.
- Section 8.8 (supplement names) and its APNs addendum (R30): unsigned; names stay off.
- Section 10 (Cycle): a separate sign-off, before Cycle reaches anyone beyond Benn and Sara.
- Section 11 (Apple Health, phase 2): planned; nothing is imported or stored, and it needs its own
  addendum signed before any imported data is stored, TestFlight included.
- The iPhone app beyond the core team (an external TestFlight group or the App Store): the items in
  section 2.5 (Apple's terms, the `native` policy text, Sign in with Apple revocation deployed, D14).
- Public launch: D3, D4, D6, D8, D11, D12, the security test, the Mind clinician review, and
  reconsidering legal advice (D15).

---

## Decisions for Benn

Open judgement calls, each with a recommendation and its status on 24 November 2026. Section 7
has the sign-off table.

| # | Decision | Status on 24 Nov 2026 | Recommendation |
|---|---|---|---|
| D1 | Clinical review of the onboarding wellbeing question and the safety routing (`routeSafety`) before `ONBOARDING_ENABLED` goes on beyond closed testers (`docs/plans/first-run-onboarding.md` §9: the wellbeing question "gets clinical review before wider launch"). | Not done. The wizard is still off on `main`. Benn's order (22 Nov, `apple-health-gate1.md`): Cycle, then onboarding on, then Apple Health. | **Before the wizard reaches anyone beyond closed testers.** A qualified clinician (for example a registered dietitian with eating-disorder experience) reviews the wording, the routing and the signposting. Without it, R3 stays high and 7.3 applies. |
| D2 | Notice emails before the 28 October purge. | **Closed.** Benn decided not to send them (28 Sept, revisited 1 Oct; register item 30(a)); the register records no emails sent. The purge job ran on 28 and 29 October with status "succeeded" and runs daily since (last run checked: 24 Nov, succeeded). On 24 Nov no account had a cloud log without a current health yes. | None. Which of the two accounts were purged and which agreed first was not checked (no row content read). |
| D3 | Pay the ICO data protection fee for Gravita Creative Ltd. | **Still owed, as far as the repo shows:** `LEGAL.icoNumber` is null and `check:legal` warns. Unknown whether it has been paid without the number being recorded. | **Pay it now** and add the number. Register Tilo as a trading name (register item 48(f)). |
| D4 | Processor contracts (Art. 28) and transfer terms: Supabase, Webflow, Bunny.net, Google Workspace, GitHub, Cloudflare Turnstile (register item 4). Anthropic is done (section 9.4). Apple's terms for APNs and Sign in with Apple are open (section 2.5). | **Open.** The register still lists item 4 as to do. | **Accept or confirm each DPA now and record the mechanism for each US provider.** Real health data is stored with Supabase. |
| D5 | `ai-read-label` deployed while label reading was off. | **Superseded** by section 9 (signed 11 Oct 2026): label reading is on (`LABEL_SCAN_ENABLED` true) and disclosed. | None. |
| D6 | Dormant accounts: accounts kept with no end date. | **Decided by Benn (1 Oct 2026, register item 30(c)): 12 months of inactivity, then deletion with notice. Not built.** On 24 Nov, 4 accounts had not signed in for 60 days and 4 accounts had never answered the consent screen (not checked whether these are the same accounts). | Build it before public launch: it needs a way to send notices (an email service is a new processor), a scheduled job, privacy text and a register row. |
| D7 | New users who choose "Not now" can only sign out (`ConsentScreen.tsx`), so health consent is a condition of using Tilo (Art. 7(4)). | Design kept. No legal view sought (D15). | **Keep the design** (the log is the service and no other Art. 9(2) condition fits), and accept the residual medium risk knowingly. Consider letting a new user who says no keep a phone-only log, as a withdrawn user can. |
| D8 | Age assurance: self-declared "I'm 18 or over" on the consent screen; the wizard's age question and stop are behind its flag. | Open. The "likely to be accessed by children" assessment is still not written (register item 21). | **Accept self-declaration for now**, and write the short assessment before public launch or an App Store listing (the store age rating must be 18+). |
| D9 | ICO prior consultation (Art. 36). | Reasoned view in 7.3, updated for sections 8, 10 and 11. | **Not needed, on the conditions in 7.3.** |
| D10 | Legal basis for consent records: 6(1)(c), and 9(2)(f) if special category. | Kept. No legal view sought (D15). | Keep. Art. 7(1) requires the controller to show consent; a record of a yes to health or Cycle processing may itself reveal health information, so treat it as special category. |
| D11 | Breach response (Art. 33, 34): no named person or written process. | Open (register item 11). | **Name Benn as responsible and write a one-page procedure before public launch.** It should cover the Apple Developer account and the APNs and Sign in with Apple keys too. |
| D12 | EU users (Art. 27 representative) and a DPO (Art. 37). | Open (register item 8). | **No DPO for now**; decide whether EU users are targeted before public launch or an App Store listing in EU storefronts. |
| D13 | Is closed testing enforced? Sign-up at app.tilo.fit is open to anyone with the link (`AuthScreen.tsx`, plain sign-up; section 8.9). Several conditions here (R3, R15, Cycle) rely on "closed". | **New.** Not verified whether "Allow new users to sign up" is off in Supabase Auth (the setting can't be read with the checks used here); 1 account was created after 30 Sept, on 16 Nov 2026. | **Turn off open sign-up and add testers by invite** before the wizard goes on, or treat every "closed testers" condition as not met. |
| D14 | iPhone backups: the iPhone app keeps its data (the whole log, the Unload notes and, once used, the Cycle log) in the app's container, included in the phone's backups (`apps/native/lib/platform/storage.ts`), so a copy goes wherever the person's backups go (iCloud or a computer). | **New, open** (also open as item 9 of `native-app-plan.md` §3.5 and `apple-health-gate1.md` §3). | **Exclude the whole store from iPhone backups** before the iPhone app reaches anyone beyond the core team, or record why not and say so in the policy. Apple guideline 5.1.3(ii) bars HealthKit data in iCloud, which settles it for section 11 in any case. |
| D15 | Legal advice. Several calls here are legal judgements made by an AI agent (D7, D10, 4.7, 7.3, the Cycle basis in section 10, the Equality Act point in `cycle.md` §10 item 4). | **Decided by Benn, 16 Nov 2026: no lawyer at this time.** His words: "We do not need lawyer at this time" (recorded in `docs/plans/cycle.md` §10 item 4, where it was given about Cycle; this DPIA applies it to all legal review, as Benn asked for this refresh). Every "solicitor" row here reads "not sought yet". | Accept for the closed test, knowingly: the risk is that a judgement here is wrong and nobody qualified catches it before a regulator or a user does (most exposed: D7 conditional consent, R12; the Art. 22 reasoning, 4.7; the prior-consultation view, 7.3; Cycle's women-only offer under the Equality Act). **Reconsider before public launch, an App Store listing, the new company or any paid tier**, and before Cycle goes beyond Benn and Sara if the Cycle residuals in 10.6 stay high. |

---

## 1. Need for a DPIA

A DPIA is required. Art. 35(1) applies where processing is "likely to result in a high risk", and
the ICO's list of processing likely to result in high risk (checked on ico.org.uk, 30 Sept 2026:
"Examples of processing likely to result in high risk", based on EDPB WP248rev01) names
"Hardware/software offering fitness/lifestyle/health monitoring" under **Tracking**. The ICO says a
DPIA is needed where an item on its list combines with another WP248 criterion. Several apply:

| Screening criterion (ICO list / WP248rev01) | Applies? | Evidence |
|---|---|---|
| Tracking: software offering fitness, lifestyle or health monitoring | Yes | The whole product: food, weight, workouts, mood and hunger check-ins, supplements (`src/core/types.ts` `DayLog`). |
| Sensitive data (special category, Art. 9) | Yes | Health data throughout; the diet pattern may reveal beliefs (`privacy.ts`). Food and workout logs are treated as health data (register, "Not now" row; CJEU C-184/20 and C-21/23 as cited there). |
| Data about vulnerable people | Possibly | People with or recovering from eating disorders, pregnant or breastfeeding people and people with conditions such as diabetes may use a diet and weight app. The wizard asks about all three (section 2.2). Cycle (section 10) adds people at risk from a coercive partner. |
| Evaluation or scoring, including from health aspects | Yes, in a limited form | The safety routing evaluates onboarding answers and changes what Tilo suggests (`routeSafety`, `src/core/domain/onboarding.ts`). Behind `ONBOARDING_ENABLED` (off on 22 Nov 2026: `src/data/onboardingFlag.ts`). Since 8 Oct the maintenance loop and the lighter-session offer also profile check-ins on the phone (register, "Lighter-session offer"). |
| Automated decision with legal or similarly significant effect | No (reasoned in 4.7) | The routing only makes suggestions more cautious; it denies nothing and the person can change the inputs. |
| Innovative technology (including AI) | Partly | A client-side training and nutrition engine; AI label reading with Anthropic, on since October (`LABEL_SCAN_ENABLED` true, `src/data/labelReader.ts`; section 9); further AI features are planned (`docs/plans/ai-platform-plan.md`). The iPhone app's internal lab screen tries Apple's on-device model on a typed meal (`apps/native/lib/Lab.tsx`; nothing leaves the phone). |
| Large scale | Not yet | 11 accounts on 22 Nov 2026 (10 on 30 Sept; section 2.2). Expected to grow at public launch or an App Store release. |
| Denial of service based on special category data | No | Under-18s are refused, but by age, not health. Declining health consent limits the service (D7). |
| Children | Not intended | 18+ (`MIN_AGE`, `src/core/legal/index.ts`). Risk of use by under-18s is R4. |

The register reached the same view (`docs/compliance/README.md`, "DPIA" section) and listed what
the DPIA must cover. This document covers each item: the onboarding wizard (pregnancy, the medical
flag, the wellbeing question, safety routing, outcomes-only storage, the under-age stop), plan
reasons syncing, on-phone processing (register item 27), the purge and the accepted 30-day gap
(item 30(d)), and the Anthropic processing (item 24, section 9). Since then: Mind (section 8), the
rename (item 48), the iPhone app (section 2.5), Cycle (item 49, section 10) and the planned Apple
Health import (section 11).

---

## 2. Describe the processing

### 2.1 Nature of the processing

**Surfaces.** The app at app.tilo.fit (a PWA built from this repo, hosted on GitHub Pages:
`public/CNAME`, `.github/workflows/deploy.yml`) and the website at www.tilo.fit (Webflow, delivered
through Cloudflare, with an early-access email form protected by Cloudflare Turnstile). Since the
rename, app.tali.fit answers with a redirect to app.tilo.fit (checked 22 Nov 2026: HTTP 302);
www.tali.fit did not answer the check that day (not verified whether its 301s to the legal pages,
register item 48(e), are in place). A third surface, the iPhone app, is in closed testing
(section 2.5). This DPIA is mainly about the app. The website's processing (early-access emails,
`_cfuvid`, Turnstile) is low risk and recorded in the register; it is included in R7 for
transfers.

**Collection.** Everything in the app is entered by the person: sign-up, the consent screen, the
log, Profile, and (when switched on) the onboarding wizard. Nothing is collected from third
parties except the Google identity for people who choose Google sign-in
(`src/screens/AuthScreen.tsx`), the Apple identity for people who choose Sign in with Apple in the
iPhone app (section 2.5), and product data from Open Food Facts when someone scans a barcode (an
independent controller; the phone asks it directly, so it sees the barcode and IP address:
`privacy.ts`).

**Storage on the phone.** The app is offline-first. The whole log, profile, settings and consent
records live in the browser's local storage under `leanplan.v1` (`src/data/persistence.ts`),
including the device-only Mind data (`deviceOnly`, section 8.1), with a few other device-only keys
listed in the cookie policy (`src/core/legal/cookies.ts`): the kitchen list (`tali.kitchen`, never
uploaded), the onboarding draft (`tali.onboarding`, outcomes only, never uploaded), a pending
under-age deletion (`tali.pendingDelete`), the shared-product cache and outbox (`tali.products`,
`tali.productOutbox`, section 9), the reminder log (`tali-notify`) and the Supabase session
(`sb-…`). Local storage is not encrypted by the app; it relies on the phone's own protection.

**Consent gate.** After sign-in the consent screen (`src/screens/legal/ConsentScreen.tsx`) shows
three unticked boxes (health data, terms, 18 or over). Continue records a `health` consent at
`CONSENT_VERSIONS.health` (`2026-09-v1`, `src/data/consent.ts`; not bumped since, including for
the rename: register item 48). Nothing but consent records syncs until there is a current yes:
`consentLetsSync` (`src/data/consent.ts`), checked in the store's sync loop (`src/store/store.ts`).
Someone who already had data on the phone may choose "Not now, keep it on this phone"; a new
user's "Not now" signs out.

**Sync.** With a current yes, the phone syncs per record with last-write-wins
(`src/data/sync.ts`) to Supabase tables `settings` (profile JSON), `day_logs`, `custom_foods`,
`recipes`, `routines`, `training_plans`, `push_subscriptions`; consent records go to the
append-only `consents` table; `ai_usage` holds daily label-read counts (3 rows on 24 Nov, deleted
after 60 days); `notify_sent` is written only by the reminder service (section 8.1). Plan reasons
sync in `training_plans.why` (`PLAN_WHY_SYNC`, `src/data/sync.ts`). The shared product list
(`products` and two helper tables) holds no personal data (section 9.3; 0 rows on 24 Nov).

**Server enforcement.** A trigger on each log table refuses a signed-in person's insert or update
unless their latest health answer is a yes
(`docs/migrations/2026-09-28-health-consent-server.sql`, and `notify_sent` from
`2026-10-09-notify-sent.sql`). Checked live on 22 and 24 Nov 2026: 8 `require_health_consent` triggers
(7 on 30 Sept, plus `notify_sent`).

**Access control.** Row Level Security gives each person access only to rows where `user_id`
equals `auth.uid()` (`docs/security-rls.sql`); `consents`, `ai_usage` and `notify_sent` have
narrower policies, and the three shared-list tables have RLS on with no policies and no table
grants (section 9). Since 23 Oct every table's grants are written out
(`docs/migrations/2026-10-23-core-grants.sql`). Checked live on 22 and 24 Nov 2026: RLS is on for all 13
public tables. The publishable (anon) key in `src/data/supabase.ts` is public by design and reaches
no rows without a session. The service role key is used only inside Edge Functions and database
jobs.

**Server-side processing** (Edge Functions listed live on 24 Nov 2026; all six last deployed on
5 Nov 2026, the rename).
- `delete-account` (`supabase/functions/delete-account/index.ts`): verifies the caller's token with
  Auth, requires a sign-in in the last 5 minutes (waived only for an account under 24 hours old
  with `reason: 'under-age'`), signs out every session, deletes the rows in every table in
  `USER_TABLES` (`supabase/functions/_shared/account.ts`: ten tables, `notify_sent` included), then
  the login. It accepts requests from app.tilo.fit and, during the hand-over, app.tali.fit. The
  Sign in with Apple revocation step is on `main` (`_shared/apple.ts`, built 15 Nov) but **not
  deployed**: the live function dates from 5 Nov (section 2.5).
- `send-supplement-reminders` (`index.ts` with `_shared/reminders.ts`): run by a cron job with a
  secret (constant-time check), reads push subscriptions and the profile with the service role,
  skips anyone without a current health yes, and sends encrypted Web Push with fixed text
  (supplement, weekly review and the Mind reminders; section 8). The APNs path for the iPhone app
  (`_shared/apns.ts`) is on `main` but not live: its migration (`docs/migrations/2026-11-13-native-push.sql`) is not applied (checked 24 Nov:
  `push_subscriptions` has no `platform` column) and the APNs key secrets are not set as far as the
  repo shows.
- `ai-read-label`, `submit-product`, `lookup-product`, `report-product`: label reading and the
  shared product list, live since October (section 9).
- `purge_unconsented_logs()` (daily pg_cron job `tali-purge-unconsented`, 03:17 UTC) and the
  `ai_usage` 60-day clean-up (`tali-ai-usage-cleanup`).

**Withdrawal.** Profile → Privacy → Withdraw. The phone records a no, clears every item in
`HEALTH_FIELDS` (`clearHealthData`, `src/data/consent.ts`), deletes the onboarding draft, and calls
`clear_log_after_withdrawal()` (`src/data/sync.ts`), which deletes the account's copy of the log
tables (and `notify_sent`) in one transaction, only while the latest answer is a no
(`2026-09-28-health-consent-server.sql`, `2026-10-10-notify-sent-remaining.sql`). Every other
phone of the account applies the clear the next time it connects (`applyHealthWithdrawal`,
`pendingCloudClear`, `consent.ts`). Consent records and the account stay.

**Deletion.** Delete account (above) and then the phone is wiped; or "Sign out and remove this
device's log" for the phone only.

**The purge (done).** Some accounts synced data before the consent screen existed (register item
20). For an account with no health answer, the account's log is deleted 30 days after the later of
PURGE_FROM (28 Sept 2026) and the account's creation, so on 28 October 2026 for existing accounts
(`UNCONSENTED_DELETION`, `src/core/legal/index.ts`; `npm test` checks the two dates agree:
`scripts/test-consent.ts`). A no more than a day old is also purged, as a backstop to the
withdrawal clear. Consent records are never purged. The phone keeps its own copy, and a later yes
re-uploads it (`needsReupload`, `consent.ts`). **What happened:** no notice emails (D2); the job
ran on 28 and 29 October with status "succeeded" and has run daily since (last run checked 24 Nov);
on 24 Nov no account had a cloud log without a current health yes (checked with counts only). The job
keeps running for new accounts that never answer. The 30-day gap that Benn accepted on 28 Sept is
now closed for the pre-consent accounts.

**Processors and recipients** (register, "Processors and transfers"; locations as recorded there
and checked where noted):

| Recipient | Role | Location | What it sees |
|---|---|---|---|
| Supabase Inc. | Processor: database, Auth, account emails, Edge Functions, pg_cron | Project region eu-west-1, Ireland (checked with the Supabase API, 22 Nov 2026). Supabase Inc. is a US company. | Everything synced, account email and password hash, request logs |
| GitHub Inc. (Pages) | Processor: app hosting | US | IP address, user agent, request times |
| Webflow Inc., with Cloudflare and Amazon CloudFront | Processor: website, early-access form; delivery and Turnstile | US / global | Early-access emails, website request data, Turnstile signals |
| Bunny.net (BunnyWay d.o.o.) | Processor: exercise demo videos and their preview images (Bunny Stream; `src/core/data/media.ts`; `public/videos/` is empty) | Slovenia per Bunny's published details (register: confirm) | IP address and request data when the app shows a demo's preview image or plays the video |
| Anthropic (Anthropic Ireland, Limited under the Commercial Terms) | Processor: reads label photos (section 9) | US processing likely | The photos only, no identifiers |
| Google (Workspace) | Processor: email for feedback and rights requests | US / global | Emails sent to benn@gravita.co, including feedback (the app opens the person's own mail app: `src/core/domain/feedback.ts`) |
| Google (sign-in) | Independent controller | Global | Only for people who choose Google |
| Apple (Sign in with Apple, iPhone app) | Independent controller for the sign-in (register) | Apple Inc., US | Only for people who choose it; 2 Apple identities existed on 24 Nov 2026 (who they belong to was not checked; Benn reported a Hide My Email account of his own, `native-build-plan.md` §10) |
| Apple, Google, Mozilla push services (web) | Deliver reminders | Global | An encrypted payload with fixed text |
| Apple Push Notification service (iPhone app) | Delivers iPhone reminders: **not live** | Apple Inc., US | Would see the device token, timing and the fixed text (section 8.8, R30) |
| Apple (TestFlight, App Store Connect, the phone's own backups) | Platform; role and terms not recorded | Apple Inc., US | Section 2.5 |
| Open Food Facts | Independent controller | France | Barcode and IP address |

**Data flow in one line each.**
1. Phone → local storage: everything the person enters.
2. Phone → Supabase (eu-west-1), over HTTPS, only with a current health yes: the log tables above.
3. Phone → Supabase: consent records, always (needed to show the answer on other phones).
4. Supabase → phone: pulls of the same data for the account's other phones.
5. Supabase job → push service → phone: reminders the person turned on.
6. Phone → Open Food Facts: a scanned barcode.
7. Phone → `ai-read-label` → Anthropic: label photos the person takes (section 9).
8. Phone → GitHub Pages / Bunny: requests for app files and videos (technical data only).
9. Person's mail app → Google Workspace: feedback and requests.
10. iPhone app: the same flows 1 to 7, plus Apple for sign-in, and the phone's backups (section
    2.5).

### 2.2 Scope of the processing

**Data categories.**

- **Account:** email, password hash (Supabase Auth); for Google sign-in, email, name and avatar
  URL; for Sign in with Apple (iPhone app), the email or a Hide My Email relay address and Apple's
  user identifier, no name (register, Record of processing).
- **Profile** (`Profile`, `src/core/types.ts`): name, `sex` (legacy M/F) and `sexAnswer`
  (female, male, prefer not to say), age, height, weight, body fat, activity level, goal, pace,
  diet pattern, supplements, targets and ranges, display preferences including Gentle mode,
  accuracy preferences, hand-portion sizes, if-then plans, and training preferences
  (`profile.training`: confidence, how much they move now, days and weekdays, session length,
  place, equipment, what they enjoy, cardio, focus areas, likes and dislikes, **body areas to go
  easy on (`limitations`) and a free-text note (`limitationsNote`)**).
- **Log** (`DayLog`, `src/core/types.ts`): foods and portions, supplements taken, body weight,
  workouts and sessions (exercises, sets, time, effort, how it felt), and check-ins (mood, hunger,
  sleep, stress, energy, soreness, note). Custom foods, recipes, the person's own workouts
  (`routines`) and weekly plans (`training_plans`).
- **Every `HEALTH_FIELDS` item** (`src/data/consent.ts`), which withdrawal clears:
  `day.weight`, `day.checkin`, `profile.weight`, `profile.bodyFat`, `profile.height`,
  `profile.sexAnswer`, `profile.movement`, `profile.activityMult`, `profile.activityLevel` (reset to
  the default), `profile.outcomes`, `profile.pregnancy`, `profile.motivations`,
  `profile.deficitChosen`, `profile.training`. Also stripped: health-derived plan reasons
  (`healthWhy`, `consent.ts`).
- **Onboarding outcomes** (wizard, behind `ONBOARDING_ENABLED`; `OnboardingOutcomes`,
  `src/core/types.ts`): readiness `clear`/`flagged` (from the health check: heart, dizziness,
  pregnancy, recent surgery), medical `clear`/`flagged` (diabetes treated with insulin or tablets
  that can cause lows, kidney disease, a weight-loss injection), baseline `ok`/`low` (sleep, stress,
  room for change). Medical is `clear`/`flagged`/`no-deficit` since 24 Oct 2026; `flagged` can
  suggest kidney disease (4.2). **Only the outcome is stored, never which item applied**; the raw items stay in
  component state, and the end-to-end test checks no raw screener answer is ever uploaded
  (`scripts/e2e-onboarding.cjs`).
- **Pregnancy** (`PregnancyFlag`, `src/core/types.ts`): `flagged` (pregnant and breastfeeding
  not told apart), `askedAt`, and `snoozedAt` after "Ask me later" on the 12-week re-ask.
- **The wellbeing answer** ("how food and weight feel"): `flagged` (yes), `sometimes` (from
  Onboarding 9, 2026-10-01), `clear` or `undisclosed`, and whether it turned Gentle mode on (a yes
  only). After it, `profile.foodOptIn` (`src/core/types.ts`): for a sometimes, the answer to
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
  as `readiness`, `wellbeing`, `gentle`, `deficit`: `consent.ts`).
- **Derived but not stored:** a BMI under 18.5 is used as a gate only (no deficit), never shown or
  stored (`lowBmi`, `src/core/domain/onboarding.ts`; `LOW_BMI` line 74).
- **Reminders:** push subscription endpoint and keys, supplement names and times.
- **Consent records:** type, version, yes or no, time on the phone and arrival time.
- **Technical:** IP address, user agent, request times in provider logs.
- **Website:** early-access email; Turnstile signals; `_cfuvid`.
- **iPhone app only:** the APNs device token (not live), the reminder delivery list the
  Notification Service Extension writes to the App Group, and short-lived label photo files
  (section 2.5). The Cycle log (built, off: section 10). Nothing from Apple Health is stored
  (section 11).

**Volume** (read-only count queries on the live Supabase project, 24 November 2026; no row content
was read; the 30 September figures in brackets):
- 11 accounts in Auth (10), the first created on 24 June 2026 and the newest on 16 November 2026;
  9 Google and 2 Apple sign-in identities;
- 4 accounts with any `day_logs` row (6); 7 accounts whose latest health answer is a yes (5);
  4 accounts that have never answered the consent screen; **0 accounts with a cloud log and no
  current yes** (2 on 30 Sept, before the 28 October purge);
- 4 accounts not signed in for 60 days (0); 1 push subscription (1); 3 `ai_usage` rows (0);
  0 rows on the shared product list; 0 `cycle` consent records (the type doesn't exist on the
  server yet: section 10).

What I could not verify: who the accounts belong to (the register says Benn and a few closed
testers), how much data is on phones only (by design the server cannot see it), how many
early-access emails Webflow holds (Unknown: count them in the Webflow form submissions), and the
expected number of users at public launch (Unknown: Benn's launch plan).

**Retention** (`privacy.ts`; register, "Record of processing"):
- Account data: while the account exists; deleted from the live database at once on Delete
  account.
- Log, profile, settings, reminders in the account: until withdrawal (cleared at once, or when a
  phone next connects), the purge (for no answer), or account deletion.
- Consent records: until account deletion.
- Accounts themselves: no end date (R11, D6).
- Supabase backups: expire on Supabase's cycle. **Unknown, still on 24 Nov:** the backup window for
  this project's plan (Pro since 28 Sept, register item 39). Check the Supabase dashboard (Database,
  Backups) and record it (register item 30(b)).
- Provider logs: each provider's own retention. Unknown for each; recorded as such in the policy.
- On the phone: until the person deletes it, clears browser data or removes the app. In the iPhone
  app the store is also copied into the phone's backups (section 2.5, D14), so a copy can outlive
  the app's own deletion until the backup is replaced.
- Early access emails: until invited and early access ends, or on request.

### 2.3 Context of the processing

- **Who the users are:** adults (18+) who want to track food, training and body measures. Today, a
  closed group of testers (register, "Status").
- **Relationship and control:** a direct consumer relationship with a free service
  (`terms.ts`). People enter everything themselves, can see and edit most of it, export it, and
  delete it from the app.
- **Expectations:** people using a health app expect their data to be private, not sold, and not
  used for ads. The policy says there are no ads, analytics or tracking (`privacy.ts`), and the
  code has none (no analytics SDK found; the register's "Storage and PECR" row agrees). They will
  probably expect sync across phones; they may not expect that data they logged before being asked
  had already synced, which is why the purge exists.
- **Vulnerable people:** likely to include some. A diet and weight app attracts people with a
  difficult relationship with food. Pregnant and breastfeeding people may use it. People with
  diabetes on insulin or sulfonylureas are at risk of hypoglycaemia if they eat less. The terms tell
  these groups to see a GP and not to use Tilo to guide their eating (`terms.ts`). The
  wizard, when on, detects some of them and makes Tilo more cautious (section 4.7).
- **Children:** not intended (18+), but a diet app can appeal to teenagers (R4, D8).
- **State of the art and concerns:** health and fitness apps are a known area of public concern
  about data sharing with advertisers and data brokers. Tilo shares with neither. Offline-first
  storage with owner-only RLS and consent enforced on the server is above the norm for a small
  app. Weaker than the state of the art: no client-side encryption of local data or exports, no
  multi-factor sign-in option, no independent security test yet.
- **Relevant codes and guidance:** ICO guidance on special category data and on DPIAs; ICO
  Children's Code (not applicable while under-18s are excluded and the service is not likely to be
  accessed by them: D8); MHRA guidance on software as a medical device (Tilo positions itself as
  general wellness: `terms.ts`); ASA/CAP Code sections 12 and 15 for marketing claims.
- **The iPhone app and Apple:** the iPhone app reaches people through Apple (TestFlight now, the App
  Store later), runs on Apple's platform and backups, and will use Apple's push service. Apple's
  rules (App Store Review Guidelines 5.1.1 and 5.1.3, the privacy label and manifest) add duties
  of their own (section 2.5).
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


### 2.5 The iPhone app (TestFlight, core team only)

**Status.** A native iPhone app (`apps/native`, React Native with Expo; bundle `fit.tilo.app`) is
built on `claude/native-build` (not on `main`) and reuses the web app's shared code (`src/core`,
`src/data`, `src/store`) unchanged, so it talks to the same Supabase project with the same consent
gate, sync, server enforcement, withdrawal and deletion as the web. Benn reported on 16 Nov that
build 16 ran on his iPhone (`native-build-plan.md` §10). **Since 18 November 2026 it is in TestFlight
internal testing with Benn and Sara** (as reported to compliance for this refresh; the date is not
recorded in the repo). An App Store Connect app record exists (`ascAppId` in `apps/native/eas.json`).
Benn and Sara are Gravita's core team, informed about how the app works, so the policy text for the
iPhone app (`privacyPolicy({ native })`, written on `main`, off) may wait until anyone else gets a
build. The phase 1 exit is not reached: push, the privacy manifest's collected-data types, the App
Store label and the `native` text are open (`native-build-plan.md` §10).

**What is different from the web app.**

| Area | As built on `claude/native-build` at `d179ad0` | Status |
|---|---|---|
| Storage | The same keys as the web (`leanplan.v1` and the rest) in the app's own store (`modules/tilo-store`, namespace `tali-local`): files in the app container, protected until the first unlock after a restart (`completeUntilFirstUserAuthentication`), and **included in the phone's backups** so a restored phone keeps unsynced days (`apps/native/lib/platform/storage.ts`). The Supabase session is in the Keychain, this device only. | Live in TestFlight. Backups: D14, R31. |
| Sign in with Apple | Email scope only, no name (`modules/tilo-auth`; register Processors). Apple is an independent controller for the sign-in. A Hide My Email address makes a separate account. Revoking Apple's token when an account is deleted (App Store guideline 5.1.1(v)) is written in `delete-account` with `_shared/apple.ts` on `main` (15 Nov) but **not deployed**: the live function dates from 5 Nov (checked 24 Nov), and whether the four `APPLE_*` secrets are set is unknown. Until it is, deleting an account doesn't revoke Tilo's Apple link; the person can remove it in their Apple Account settings. | Live in TestFlight (2 Apple identities on 24 Nov). Revocation owed before anyone beyond the core team. |
| Reminders through APNs | The push function's APNs path (`_shared/apns.ts`) and the migration `2026-11-13-native-push.sql` (the device token in `push_subscriptions.endpoint`, a `platform` column) are written. **Not deployed:** the migration is not applied (no `platform` column, checked 24 Nov) and the APNs key steps (`native-build-plan.md` §9.1) are not recorded as done. APNs is TLS only, so Apple could read the alert text and sees the device token and timing (8.8 APNs addendum, R30). The phone keeps the token and pending row deletions in `tali-push` (device only). | Not processing. Needs the 8.8 APNs addendum signed. |
| Notification Service Extension and App Group | An extension (`plugins/withNotifyExtension.js`, `targets/notify-extension/NotificationService.swift`) runs as each Mind reminder arrives and records `{id, kind, at}` (no text, at most 60) in the App Group `group.fit.tilo.app`, shared only by the app and its extension; the app reads and empties it into the device-only delivery log (`lib/platform/notifyStore.ts`, `tali-notify`), as the web's service worker does. Never synced. It hands the alert back unchanged, so it does not decrypt anything (an encrypted payload decrypted here is the noted alternative that would remove R30). | Built; inert until APNs reminders are live. |
| Label photos | The same `ai-read-label` path as the web (section 9). The photos live only in the app's `Caches/TiloCamera` folder with complete file protection, are re-encoded without metadata before sending, and are deleted once the read answers, when the screen closes or at the next launch (`modules/tilo-camera/ios/TemporaryPhotos.swift`; register, label photo row on `claude/native-build`). The register says the folder is excluded from backups; not checked in code for this refresh. | Live in TestFlight. No new risk beyond section 9. |
| Export | The same JSON file as the web, written to the app's cache and handed to the share sheet (`lib/account/backupFile.ts`). Unencrypted (R1b). | Live in TestFlight. |
| Internal lab screen | `/lab` (`apps/native/lib/Lab.tsx`), for Benn, Sara and the lead engineer: reads last night's sleep and today's walking from Apple Health on request and shows it, keeping nothing (`lib/health.ts`); runs Apple's on-device model on a typed meal (nothing leaves the phone); shows sync and label-read error lines from memory in builds with `EXPO_PUBLIC_DIAG=1`, which the `testflight` profile sets (`lib/platform/diag.ts`). The app carries the HealthKit entitlement and a read purpose string for this. How a tester reaches `/lab` in the TestFlight build was not checked. | Processing on the phone only (register item 27); nothing stored or sent. Must not reach anyone beyond the core team. |
| Cycle | Built behind `CYCLE_ENABLED` (native screens only, section 10). | Off unless a build sets `VITE_CYCLE=1`; not verified which builds do. |

**Apple as a party.** Apple appears in four roles, none of them recorded in a contract review:
(1) independent controller for Sign in with Apple; (2) the APNs service, which would process the
device token, timing and alert text (role and data terms under the Apple Developer Program
License Agreement not recorded; Apple Inc. is in the US, so a transfer mechanism is needed: D4);
(3) the distribution platform (TestFlight, App Store Connect), which can send the developer crash
reports and tester feedback (not checked what this build sends, or whether anything has been
received); (4) the phone's own backups, where iCloud Backup is Apple's service under the person's
own contract with Apple, not Tilo's processor, but which Tilo's storage choice puts health data
into (D14). Apple's App Store Review Guidelines 5.1.1 and 5.1.3 apply to the app (5.1.3(ii): no
personal health information in iCloud from HealthKit, which section 11 must meet).

**Owed before the iPhone app reaches anyone beyond Benn and Sara** (an external TestFlight group
or the App Store): the `native` policy text switched on and republished (`npm run legal:html`,
Webflow drafts, `ship-critic`, Benn's go-ahead); Sign in with Apple revocation deployed with its
secrets; D14 decided and built; the privacy manifest's collected-data types and the App Store
privacy label; the 8.8 APNs addendum signed before APNs reminders go live; the Apple terms
recorded (D4); the `/lab` screen and diagnostics kept out of that build; the store age rating 18+
(D8); and the provisioning profile's unused HealthKit `health-records` access dropped
(`native-build-plan.md` §10).
---

## 3. Consultation

**Done (recorded in the repo):**
- `security-data` reviews of the consent sync, the "Not now" pause, the server enforcement, the
  purge, the under-age deletion and `delete-account` (commits `fafea2f`, `fe08c04`, `c0024c5`,
  `d719e65`; the review notes in `supabase/functions/_shared/account.ts` and
  `delete-account/index.ts`; register items 36 and 37). The client side of the under-age stop
  (sign-out and wipe) has no recorded `security-data` review (register item 37).
- `mental-performance` review of the onboarding copy and routing (commit `d719e65`: pregnancy
  follow-up wording, recent surgery routed to readiness, NHS 111 wording) and of engine copy
  (commits `01b4ecb`, `c187c3f`, `71e2e04`).
- `nutrition-accuracy` review of the onboarding targets (commit `f9eb261`) and earlier target and
  energy work.
- `ship-critic` on the onboarding build (commit `a9f0fcc`).
- Benn's decisions as controller, recorded with dates in the register (items 21, 26, 30(a), 31)
  and the onboarding plan §9; since 30 Sept, the rename (item 48), the Cycle decisions of Benn and
  Sara (`cycle.md` §0, register item 49), Benn's Apple Health decisions (`native-app-plan.md` §3.5)
  and his decision not to seek legal advice for now (D15).
- Since 30 Sept: `compliance`, `security-data`, `mental-performance` and `design` reviews of the
  Cycle build (register item 49, 16 and 22 Nov), `compliance` and `security-data` drafts approval
  of the Apple Health gate 1 design (`apple-health-gate1.md`, 22 Nov), `security-data` and
  `ship-critic` on the iPhone app's streams (`native-build-plan.md` §10).

Note: these reviews were by AI agents working on the codebase. They are useful and recorded, but
they are not independent professional reviews.

**Not done, and should be:**
- **A clinician** on the wellbeing question, the readiness and medical questions and the routing
  (D1). The onboarding plan requires this before wider launch.
- **A solicitor or privacy professional** on the texts, the register and this DPIA (register item
  6), with the specific questions in D7, D10, 4.7, 7.3 and the Cycle offer under the Equality Act.
  **Not sought yet: Benn decided on 16 November 2026 "We do not need lawyer at this time" (D15).**
  The reason recorded is his call for the closed test; the risk is that the legal judgements in
  this document, all made by an AI agent, go unchecked until a regulator, a user or the App Store
  review tests them. The 30-day hold question (item 26) is now historical: the hold ended with the
  28 October purge. Reconsider at public launch, an App Store listing, the new company or paid
  tiers.
- **Apple's terms** for APNs, TestFlight and Sign in with Apple, read for their data protection
  terms (D4, section 2.5).
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
| Onboarding outcomes, pregnancy, wellbeing, motivations, movement | 6(1)(b) | 9(2)(a); each question optional, with a notice on its screen | Only asked after a local health yes (`canSaveHealthAnswers`, `consent.ts`). |
| Reminders (push subscription, supplement names) | 6(1)(b) | 9(2)(a) | The server also checks consent before sending. |
| Consent records | 6(1)(c) legal obligation (Art. 7(1)) | 9(2)(f) if a record counts as special category | D10. |
| Pre-consent log held for the 30-day transition (ended) | Unclear | **None identified** (register "Record of processing") | A time-limited risk Benn accepted on 28 Sept; data held unread and unchanged. **Ended:** the purge ran on 28 Oct and no such log remained on 22 or 24 Nov. No legal view was sought (D15); the question is now historical. |
| Apple sign-in identity (iPhone app) | 6(1)(b) | None needed | Apple is an independent controller for the sign-in. |
| Cycle log and the `cycle` consent record (built, off) | 6(1)(b); records 6(1)(c) | 9(2)(a), a separate `cycle` consent; records 9(2)(f) | Section 10. |
| Apple Health summaries (planned) | 6(1)(b) | 9(2)(a), a separate `wearables` consent | Section 11. Not processing. |
| Security and request logs | 6(1)(f) | None | |
| Feedback emails | 6(1)(f) | 9(2)(a) at most if someone volunteers health details; the app asks them not to (`privacy.ts`) | |
| Early access email | 6(1)(a) consent | None | Website. |

**Is explicit consent valid?** The screen is explicit (a separate, unticked box for health data),
specific, and unbundled from marketing (there is no marketing). It is bundled in one screen with
the terms and the age box, but as separate boxes. It is as easy to withdraw as to give (Profile →
Privacy). Informed: the live privacy policy at www.tilo.fit/legals/privacy (checked 30 Sept, and
republished under the Tilo name with the rename, register item 48(e); not re-read for this refresh)
is the consent-release text and matches what the live app does; the onboarding sections on this
branch are not yet published, which is right while the wizard is off, and must go live with the
release that turns it on (register item 38). The open question is conditionality (D7).

### 4.2 Data minimisation

- **Outcomes-only storage** for the readiness, medical and lately questions: Tilo stores "flagged"
  or "clear" (and, for medical, "no-deficit"), never the condition, medicine or symptom. This is the
  single most important minimisation measure and it is tested (`scripts/e2e-onboarding.cjs`).
  Residual inference (24 Oct 2026, register item 47): the medical "flagged" setting comes from a
  kidney disease tick, or from an answer given before the split, so it can suggest kidney disease.
  It is needed to work out the protein figure (storing the figure would reveal the same), it is
  treated as health data like the rest, and the per-question notice and privacy policy say so.
- Pregnant and breastfeeding are stored as one flag.
- BMI is computed for a gate and never stored.
- The kitchen list and the onboarding draft never leave the phone.
- Everything in onboarding is optional except age and goal (`canSkip`,
  `src/core/domain/wizard.ts`); a skipped answer leads to cautious defaults, not a prompt to
  answer.
- Kept after withdrawal on the phone only: name, age, legacy `sex`, units, goal, Gentle mode,
  `onboardedAt` (`consent.ts`). Note that Gentle mode being on can hint at the wellbeing answer;
  it stays only on the person's own phones.
- Things Tilo could keep but doesn't: no location, no contacts, no device identifiers, no
  analytics.
- Could go further: the wellbeing answer is stored as given (flagged, sometimes, clear or undisclosed) because
  the Profile screen shows and edits it and routing depends on it. That is justified, but it
  should be named in the clinician review (D1).

### 4.3 Accuracy

People enter and correct their own data; most fields are editable in the app, and the health
answers in Profile › Health data (register "Rectification"). Nutrition values cite a source and
show a margin (CLAUDE.md "Food data"; `terms.ts`). The multi-phone merge uses per-field
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
withdrawal prompt (`HEALTH_WITHDRAW_PROMPT`, `consent.ts`) say what happens in context.
`npm run check:legal` blocks deploys on placeholders. The policy describes the safety routing
(`privacy.ts`).

### 4.6 Rights

Access and portability: Export (JSON, `src/data/backup.ts`). Rectification: in app, else email.
Erasure: Delete account, or remove the phone's log. Withdrawal: Profile → Privacy. Restriction and
objection: by email. Requests by email to benn@gravita.co within one month (`privacy.ts`).
Gap: no written internal process for email requests or identity checks.

### 4.7 Automated decisions (Art. 22)

The safety routing (`routeSafety`, `src/core/domain/onboarding.ts`) is automated
processing of health data that changes what the person is offered: a gentler start, no calorie
deficit, no calorie number, Gentle mode, and signposting. It is not a decision "based solely on
automated processing which produces legal effects or similarly significantly affects" the person,
because: it only ever makes Tilo more cautious; it refuses no service, product or price; the
person can see, change or clear the answers that drive it (Profile › Health data); and the policy
says it has no legal or similarly significant effect and nobody makes decisions about them from it
(`privacy.ts`). Even so, it relies on 9(2)(a) explicit consent, which is also the Art. 22(4)
condition if a regulator took a different view. This reasoning has not been checked by a lawyer
(D15).

### 4.8 Medical device boundary

The routing does not diagnose, predict disease or adjust medication; it withholds a deficit and
signposts. That keeps Tilo on the general-wellness side (terms "Not medical advice",
`terms.ts`). Unknown: whether MHRA would agree for this exact design; a short qualification
note against MHRA's software and AI as a medical device guidance before public launch would
settle it. Any future feature that interprets symptoms, flags a condition or suggests medication
changes needs a fresh assessment.

For the kidney answer Tilo withholds higher protein targets and shows the general adult reference
(0.75 g/kg, "the everyday amount for adults"); it does not set a condition-specific intake, and no
condition or guideline is named next to the figure. For diabetes or a weight-loss injection the
protein range is presented as Tilo's ordinary range, never as something for the medicine
(24 Oct 2026, register item 47).

Cycle (section 10) and the planned Apple Health import (section 11) each carry their own
intended-purpose statement (general wellness: no forecast, fertility, contraception or diagnosis of
a sleep or menstrual disorder). An optional MHRA borderline enquiry before public launch would settle
both, with the onboarding routing.

### 4.9 Processors and transfers

Supabase stores the data in Ireland, but Supabase Inc. is US-based and may access it from the US;
GitHub, Webflow, Cloudflare and Google are US or global; Apple Inc. (APNs, once live; TestFlight) is
in the US. The policy relies on the UK IDTA or UK
Addendum, EU SCCs or the UK-US and EU-US Data Privacy Framework (`privacy.ts`).
**Unknown:** which mechanism each provider actually offers for this account, and whether each DPA
has been accepted (register item 4 still says not yet for Supabase, Webflow and Bunny on 24 Nov;
Anthropic is recorded, section 9.4; Apple is not recorded). Resolve by
accepting each DPA, checking each company on the DPF list, and recording the result in the
register (D4). A transfer risk assessment is only needed where the IDTA or Addendum is relied on;
Unknown until the mechanisms are known.

---

## 5. Risks

Scoring follows the ICO template: likelihood (remote, possible, probable) and severity (minimal,
significant, severe), giving overall risk (low, medium, high). These are inherent risks, before
the measures in section 6. R1 to R13 are from the September draft (wording updated where the facts
changed); R14 to R22 are in sections 8 and 9, R23 to R29 in section 10 (Cycle), R30 in 8.8 (APNs),
and R31 and R32 are new on 24 November (the iPhone app).

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R1 | **Breach or unauthorised access to health data in the cloud**: an RLS mistake, a leaked service role key, a flaw in an Edge Function, a compromised admin account, or a stolen user session exposes logs, pregnancy status or the wellbeing answer. The anon key is public by design, so RLS is the only barrier for API access. | Possible | Severe | High |
| R1b | **Exposure on the phone or in exports**: a shared or lost phone, or a backup JSON file (unencrypted, in Downloads or shared by mistake) reveals the log. | Possible | Significant | Medium |
| R2 | **Health data reaching the cloud without consent**: a bug, an old app version, or a second phone that hasn't heard of a withdrawal uploads data; and data that synced before the consent screen existed is held without an Art. 9 condition. | Possible (historically it happened) | Significant | Medium |
| R3 | **Wrong safety routing or advice harms someone**: a person with an eating disorder is given a deficit or weight focus; a pregnant person or someone on insulin or sulfonylureas is steered to eat less; someone treats Tilo as medical advice. Routing depends on self-report and on the wizard being on (it is still off on 24 Nov, on the web and in the iPhone app, so neither has a screener and both rely on the terms' warning). | Possible | Severe | High |
| R4 | **An under-18 uses Tilo**: diet and weight features used by a child, whose data then needs the Children's Code protections. | Possible | Significant | Medium |
| R5 | **Data loss for users**: data kept only on a phone (after "Not now", withdrawal, or before sync) is lost with the phone; the 28 October purge deleted the account copy of the accounts with no answer, with no email to warn them (done; their phones kept their own copy); no user-level restore from backups. | Possible | Significant | Medium |
| R6 | **Withdrawal not fully honoured**: other phones keep health fields until they next connect; Supabase backups keep deleted rows until they expire (window unknown); exported files and a `resumeCopy` on the phone keep a copy; some fields are kept by design. | Possible | Significant | Medium |
| R7 | **Transfers to US processors** without a recorded mechanism or DPA, leaving data open to access under laws with weaker protection and no enforceable contract terms. | Possible | Significant | Medium |
| R8 | **Function creep, including AI**: planned AI features send health data to an AI provider, or data is reused for purposes people didn't agree to. Label reading (pack photos only) is live since October (section 9); the iPhone lab tries an on-device model. | Possible | Significant | Medium |
| R9 | **On-phone processing treated as outside the GDPR**: Tilo's code processes data on the phone even when nothing syncs (register item 27: CJEU C-25/17, C-210/16; Recital 18), so the phone-only paths still need a basis, notice and rights. If treated as out of scope, those protections could be missed. | Possible | Minimal | Low |
| R10 | **No ICO fee paid**: a legal requirement for the controller, not a direct harm to individuals, but a sign of weak governance and a regulatory exposure. | Probable (it is unpaid today) | Minimal | Medium (compliance) |
| R11 | **Dormant accounts kept with no end date**: email and consent records (which reveal use of a health app) kept indefinitely after someone stops using Tilo or after a purge. | Probable | Minimal | Low |
| R12 | **Consent not freely given**: new users can only use Tilo if they agree (D7), which a regulator could see as conditional consent. | Possible | Significant | Medium |
| R13 | **Controller change**: when the new company takes over, consents given to Gravita Creative Ltd do not carry over automatically and data could be moved without a basis. | Probable (planned) | Significant | Medium |
| R31 | **iPhone backups carry the whole log**: the iPhone app's store (log, Unload notes, and the Cycle log once used) is copied into the phone's iCloud or computer backups, where it outlives withdrawal, account deletion and deleting the app until the backup is replaced, and is exposed if the backup account or computer is. Apple guideline 5.1.3(ii) bars HealthKit-derived data in iCloud. | Possible | Significant | Medium |
| R32 | **Sign in with Apple not revoked on deletion**: until the revocation step is deployed, a deleted account leaves Tilo listed in the person's Apple Account and the Apple relay address active (no Tilo data stays). | Probable (as deployed) | Minimal | Low |

---

## 6. Measures to reduce the risks

"In place" items were checked in the code on 30 Sept 2026 (and live where noted). "Recommended"
items are not done.

### R1 Breach or unauthorised access
- **In place:** owner-only RLS on every table (`docs/security-rls.sql`; live check: RLS
  on for all 9 tables); `consents` insert and select only, `ai_usage` select only; the anon key
  reaches no rows without a session (`src/data/supabase.ts`); the service role key only in
  Edge Function environments and the pg_cron job (`delete-account/index.ts`); `delete-account`
  verifies the token with Auth, requires a recent sign-in, and revokes all sessions first
  (`delete-account/index.ts`); the reminder function checks a secret in constant time;
  functions log counts only, no ids or content; outcomes-only storage limits what a breach could
  reveal; leaked password protection on (register item 39); HTTPS throughout. Supabase security
  advisor on 30 Sept: two warnings, `pg_net` in the public schema (register item 39, low) and
  `ai_usage_take` being a security definer callable by signed-in users (intended: it is how the
  allowance is taken, `docs/security-rls.sql`).
- **Recommended:** a written breach procedure and named owner (D11); MFA on every Supabase, GitHub,
  Webflow and Google admin account (Unknown: whether it is on; Benn to confirm); an independent
  security test of RLS and the Edge Functions before public launch; offer MFA or passkeys to users
  later; move `pg_net` out of `public`.
- **Residual:** likelihood remote, severity severe: **medium**. Severity cannot fall below severe for
  this data, which is why the measures matter.

### R1b Phone and exports
- **In place:** data on the phone is sandboxed to the app's origin; "Sign out and remove this
  device's log"; the owner check stops a different account on the same phone seeing the data
  (`ownerCheck`, `src/data/persistence.ts`).
- **Recommended:** a line on the Export screen that the file contains health data and should be
  kept private (a copy change, so it needs Benn's approval).
- **Residual:** possible, minimal to significant: **low**.

### R2 Cloud without consent
- **In place:** unticked boxes on the consent screen; the phone syncs nothing but consent records
  without a current yes (`consentLetsSync`, `consent.ts`; `store.ts`); the server refuses
  log writes without a current yes (trigger on 7 tables, live check 30 Sept); reminders skip anyone
  without a yes; health questions only shown and saved after a local yes (`canSaveHealthAnswers`,
  `consent.ts`; `HEALTH_STEPS`, `wizard.ts`); the pre-consent cloud copy is purged
  automatically (`purge_unconsented_logs`, live job checked).
- **Recommended:** solicitor's view on the 30-day hold (register item 26); keep the purge job
  monitored after 28 October (check that the two accounts' rows are gone).
- **Residual:** remote, significant: **low**.

### R3 Wrong routing or advice
- **In place:** terms say Tilo is not medical advice and list who should see a GP and not use Tilo
  to guide their eating (`terms.ts`); the routing only ever makes Tilo more cautious
  (`routeSafety`); skipped answers give cautious defaults (a gentler start, maintenance pre-selected,
  quiet signposting: `onboarding.ts`); pregnancy holds food at maintenance with no
  calorie number; the medical flag removes the deficit and adds a GP note, with protein at the
  everyday amount after a kidney tick or a capped 1.2 to 1.6 g/kg range otherwise (register item 47); a wellbeing yes turns on Gentle mode (no calorie target, totals in words, a maintenance range
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
  policy says how to report a child's use (`privacy.ts`).
- **Recommended:** a written "likely to be accessed by children" assessment (D8); fix register item
  37(a): an under-age account that never signs in again stays on the server with nothing marking
  it; a `security-data` review of the client stop path.
- **Residual:** possible, significant: **medium**, falling to **low** once the wizard's age stop is
  live.

### R5 Data loss
- **In place:** Export at any time; the terms and cookie policy warn that phone-only data is lost
  with the phone or browser data (`terms.ts`; `cookies.ts`); the "Not now" and withdrawal
  screens say where the data is and offer a backup first (`HEALTH_WITHDRAW_PROMPT`); the purge keeps
  the phone's copy and a later yes re-uploads it (`needsReupload`); "Start fresh" needs a second
  tap with "Export a copy" beside it (register item 31).
- **Recommended:** send the two notice emails before 28 October (D2); record the backup window.
- **Residual:** with D2 done, remote, significant: **low**. Without it, possible, significant:
  **medium**, for the two accounts affected (an accepted risk, register item 30(a)).

### R6 Withdrawal not fully honoured
- **In place:** the phone clears all `HEALTH_FIELDS` and health-derived plan reasons at once
  (`clearHealthData`, `consent.ts`), and the `resumeCopy` is stripped too (`stripResumeCopy`);
  the account's copy is deleted in one transaction (`clear_log_after_withdrawal`); every other phone
  clears on next connection, once per withdrawal (`applyHealthWithdrawal`, `pendingCloudClear`); the
  server refuses uploads after a no, so a stale phone cannot put data back; the purge deletes any
  log left more than a day after a no; the onboarding draft is deleted; the policy tells people
  exactly what stays (`privacy.ts`).
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
  hidden (`AI_FEATURES_LIVE`, `src/screens/ProfileScreen.tsx`); the policy comment forbids
  switching label reading on before it is described (`privacy.ts`); `ai-read-label` checks
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
  (`privacy.ts`; `cookies.ts`); the same consent gate applies to the health
  questions on the phone (`canSaveHealthAnswers`); withdrawal clears health fields on the phone too;
  rights (export, delete on this device) cover the phone.
- **Recommended:** none beyond keeping this in the register (item 27) and treating any new
  device-only store as a policy change.
- **Residual:** **low**.

### R10 ICO fee
- **In place:** `check:legal` warns while `LEGAL.icoNumber` is empty (`src/core/legal/index.ts`).
- **Recommended:** pay now (D3). The new company will need its own registration.
- **Residual after payment:** **low**.

### R11 Dormant accounts
- **In place:** none (no inactivity rule). The purge removes the log, not the account.
- **Recommended:** D6.
- **Residual after D6:** **low**.

### R12 Conditional consent
- **In place:** separate unticked boxes; no marketing bundled; withdrawal is easy and keeps the
  app usable on the phone for food and workouts (`healthDeclined`, `consent.ts`); existing users
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
- **Synced in `profile.mind`:** which pillars are on, how often Tilo asks (`asks`), usual wake and
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
(`ConsentScreen.tsx`), and no `CONSENT_VERSION` bump is required. Reminders and the server
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
| R15 | **People treat Tilo as a crisis service**, and rely on it when they need urgent help. | Possible | Severe | High |
| R16 | **Which reminders someone gets reveals Mind use**, for example on a lock screen or through the server record. | Possible | Minimal | Low |
| R17 | **Inaccurate signposting by nation**: a person in Northern Ireland is told to call NHS 111, which doesn't run there (register item 44). | Probable (as built) | Significant | Medium |

### 8.5 Measures

- **R14 Unload notes.** In place: the owner stamp (`_meta.owner`), and notes hidden when the
  phone asks whose data it is (`ownerCheck`); cleared on withdrawal of health consent; the privacy
  policy warns that exports include them. Residual: **low**.
- **R15 Crisis service.** In place: the B6.7 copy in the app (the Support and Unload sheets say
  Tilo isn't a crisis service and to call 999 in danger); the terms paragraph on the Mind part
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

The skills are general wellness (breathing, journalling, wind-down). Tilo shows no diagnosis,
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

**Proposed APNs addendum to 8.8 (compliance, 13 November 2026, not signed; native-build-plan N12).**
The iPhone app gets its reminders through Apple's push service (APNs), where the alert is protected
in transit (TLS) but not end to end: Apple can read it. So 8.8's measure "the payload is encrypted
end to end, so the push service can't read it" holds for the web only. Proposed new risk:

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R19 | **Through Apple's push service the reminder text** (and supplement names, if they were sent) **and its timing are readable by Apple**, which can link them to the person's Apple ID. The wind-down reminder's timing says something about the person's sleep routine. | Remote | Significant | Low to medium |

  Proposed measures, all built on `native/n12-notifications`: fixed copy only, the same as the web
  (`_shared/apns.ts` `shownCopy`, checked against `public/sw.js` in `npm test`); supplement names are
  never sent to APNs (`forApns`) unless the function's `APNS_SUPP_NAMES` secret is set to "on",
  which waits for this addendum to be signed and for the toggle's footer to say that in the iPhone
  app Apple's push service can read the names (copy for Benn or Sara, through `design`);
  `apns-expiration` one hour, so Apple stops trying to deliver an undelivered reminder after an hour (what Apple logs is governed by its own terms: open item); the function
  logs status codes only; the privacy policy says Apple can read iPhone reminders (gated on
  `native`). Open: Apple's role and data terms for APNs under the Apple Developer Program License
  Agreement, and the transfer mechanism (Apple Inc., US). An alternative that removes R19 is a
  Notification Service Extension that decrypts an encrypted payload on the phone (noted only).

| Item | Name and date | Notes |
|---|---|---|
| APNs addendum approved by | | Before the iPhone app reaches anyone outside Gravita's core team, and before `APNS_SUPP_NAMES` is set. |

### 8.9 Mind on, then skills on for testing (compliance, 10 October 2026; approved by Benn the same day)

Sections 8.1 to 8.7 are as signed and are not changed by this note. On 10 October 2026 Benn turned
`WELLBEING_ENABLED` on for everyone, with `MIND_REVIEWED` and `SUPP_NAMES_ENABLED` off and the
reminder function deploying with the release (register item 42). Later the same day Benn turned
`MIND_REVIEWED` on by default too (branch `claude/wellbeing-flag-on`): the skill screens (Reset,
Wind down, Unload, Get outside) and the low-mood signpost, for testing while the app isn't public,
with the clinician review moved to a gate before public launch. Four things to record:

- **Which rows gate which flag.** 8.7 says "The flag still waits on the rows below". Read with
  each row's note, `WELLBEING_ENABLED` waited only on item 42. The clinician advice row said
  "Before `MIND_REVIEWED` goes on"; Benn's decision moves it to "before public launch". This note
  records that change; it needs Benn's initials below to stand against the signed 8.7.
- **R15 while testing is closed.** 8.5 says R15's residual is medium "only with the clinician
  review done; without it, treat as high". With the skills and the signpost on and no review yet,
  the measures are the B6.7 copy (Support and Unload sheets), the terms' Mind paragraph (which
  names the skills and the low-mood signpost again from 10 October), "Need support now?" on the
  Mind page and in the check-in, the Support sheet with 999 and the not-a-crisis-service line, and
  the low-mood signpost. Proposed residual: **medium, only while testing is closed**: a small
  group of known testers who have been told Tilo isn't a crisis service, which lowers the
  likelihood to unlikely. That reasoning holds only if sign-up is not open to the public in
  practice; Benn to confirm who can create an account at app.tilo.fit today. If anyone can, the
  closed-testing argument doesn't hold and R15 stays high, so 7.3 (Art. 36 prior consultation)
  applies until the clinician review is done. Before public launch: the clinician review, then
  Benn confirms a residual for what is live; if R15 is still high then, 7.3 applies.
- **R17 settled for the Mind sheet** (register item 44): the Mind Support sheet opens on the whole
  UK with the GP in NHS 111's place and no 111 line until a nation is picked; the low-mood banner
  uses the nation-neutral line. Residual **low** for the Mind context. Open, for Benn with
  mental-performance: Northern Ireland's crisis line (Lifeline, 0808 808 8000, 24 hours, the line
  nidirect's "Mental health emergency" page leads with) and Scotland's NHS 24 mental health option
  (111, NHS inform) are not listed; Profile's own Support sheet still opens on England, labelled
  as such.
- **8.1 and the reminder cap.** Since 10 October the wind-down reminder sits outside the one a
  day cap, at most once a day of its own (register Record of processing, push row; the privacy
  policy says so). `notify_sent` keeps the last day per type for that. No new risk.

| Item | Name and date | Notes |
|---|---|---|
| 8.9 noted by | Benn, 10 October 2026 (in the build conversation) | Benn's words: "switch on once live then update the DPIA and when we have the money a clinician will review. again no public access yet". Benn rates R15 medium while access stays non-public. Recorded fact: sign-up at app.tilo.fit is technically open to anyone with the link (`src/screens/AuthScreen.tsx`, plain sign-up); the app isn't publicised. Recommended, not done: turn off "Allow new users to sign up" in Supabase Auth and add testers by invite, so "non-public" is enforced rather than relied on. If the app is publicised or sign-ups from unknown people appear before the clinician review, R15 is high and 7.3 applies. |

## 9. Addendum: label photos (Anthropic) and the shared product list

**Drafted 10 October 2026 by compliance; approved by Benn (Gravita Creative Ltd, controller) on
11 October 2026.** Covers `origin/shared-products` at
`e8ac601`, which turns on label scanning (`LABEL_SCAN_ENABLED`) and with it the shared product
list (`SHARED_PRODUCTS_ENABLED`). Register items 24 and 46 hold the detail and the open points.
This section supersedes D5 and the Anthropic row in section 2.1 once signed.

### 9.1 Processing

- **Label photos.** The person photographs a pack's nutrition table (and, optionally, its front).
  The phone downscales the photos and sends them, with the pack's barcode if one was scanned, to
  `ai-read-label`. The function checks the session, the daily cap and the `label-photo` record
  (`ai_usage_take`), sends **only the photos** to Anthropic's API (no user id, email or barcode),
  validates the transcription and returns it. Nothing about the photo or its values is stored or
  logged (counts, sizes and timings only). `ai_usage` keeps a per-person daily count.
- **Signing.** If the read parses cleanly and a barcode came with it, the function signs the
  barcode (GTIN-14), the parsed values and the time with `PRODUCT_SIGNING_KEY`. No user id is in
  the signature. The token goes back to the phone only.
- **Sharing.** With a yes to `shared-products` (asked once, at the first save of a new label-read
  product; a toggle in Profile › Privacy) and a current health yes, a product saved with the name
  and figures unchanged joins `tali.productOutbox` on the phone, which records which account
  queued it (device only). It's sent later, after a random delay, to `submit-product`, which
  checks the JWT and both consents as the caller (`shared_products_allowed()`), applies an
  in-memory rate limit keyed on `sub` (held up to an hour, never logged or stored), verifies the
  signature, asks Open Food Facts from the server whether it has the barcode, and calls
  `submit_product()` with the service role. That function receives **no identity**.
- **Stored.** `products` (barcode, version, name, figures, counters, first-of-month dates),
  `product_sigs_seen` (SHA-256 of each accepted signature, with its month, purged after two
  months, so one read counts once) and `product_quota` (global daily counters).
- **Lookups and reports.** Signed-in users look a barcode up through the `lookup-product` Edge
  Function (POST body, so the barcode isn't in a logged URL) and report a version through
  `report-product`. Each checks the session with Auth and limits each caller in memory (the
  account id is held for at most an hour, never logged or stored), then calls `lookup_product()`
  or `report_product()` with the service role; neither RPC receives or keeps who asked.
  Moderation: `shared-products-moderation.md`.
- **Device.** `tali.products` caches up to 200 looked-up products for offline use, noting (on the
  device only) which account filled it; it is cleared when another account signs in.

### 9.2 Lawful basis

- **Label photos:** Art. 6(1)(b). The person asks Tilo to read a label; a pack photo is not health
  data and nothing about the person goes with it. The `label-photo` record is the notice and the
  server's gate, not consent in the Art. 7 sense, so no withdrawal toggle is owed: not taking a
  photo is the opt-out, and typing the label in is always offered.
- **Contributing to the list:** Art. 6(1)(a) consent, separate from everything else
  (`shared-products`, its own version), with Art. 9(2)(a) health consent also required by the
  server, because the request shows that a named account saved that food. It is unbundled (either
  answer saves the food), specific, and as easy to withdraw as to give (one toggle).
- **The stored list:** not personal data (9.3). Moderation of anything that turns out to be
  personal (a person's details typed into a pack name is refused by `product_name_refused`, but a
  name read from a photo could still carry one): Art. 6(1)(f).

### 9.3 Why the stored list is anonymous, and the rule that keeps it so

The test is whether a person is identifiable by means reasonably likely to be used, by Tilo or
anyone else, taking account of cost, time and technology (UK GDPR Recital 26; ICO guidance on
anonymisation, identifiability).

- **Nothing in the rows points to a person.** No user id, pseudonym, hash of an id, device id or
  IP; dates are the month only; the signature hash is over the product and time, not the
  person, and is kept two months. The rows describe a product, not anyone's behaviour.
- **The write path can't carry identity.** `submit_product()` is service-role only and takes no
  identity argument; the function's logs hold outcome and timings only; the `sub` used for rate
  limiting lives in memory for an hour at most.
- **Timing is blurred.** The phone sends after a random delay, not at the moment of the save, and
  a product can be confirmed by several people over a month, so a row's counters don't map to one
  request.
- **The one route back is a join Tilo must never make.** A person's own `custom_foods` row holds
  the same barcode, name and figures (it's their copy). Matching `products` against
  `custom_foods` would suggest who probably added a product. **Rule: Tilo never joins `products`
  (or `product_sigs_seen`) with `custom_foods` or any other user table, by barcode, name, figures
  or time, in SQL, scripts, analytics or support work.** Even if someone did, it would tell them
  only that a person has that food in their log, which Tilo already holds with their consent:
  the list adds nothing new about them. That is why the residual risk is low, not why the join
  is allowed.
- **Closed (register item 46).** `products.id` was a sequential identity that, with
  `product_quota.new_rows` per day, could give the day a version was added. It is now a random
  UUID, so "month only" is true in full.

Consequences: account deletion, health withdrawal and the purge don't touch the list (by design;
not in `USER_TABLES`, `clear_log_after_withdrawal()` or `purge_unconsented_logs()`); withdrawing
`shared-products` stops future sharing and drops the outbox but can't recall what was added
(Art. 7(3) affects only processing of personal data); and rights requests about contributions
fall under Art. 11(2), since Tilo can't identify whose they were. The opt-in copy and the
privacy policy say so. A version can still be taken down after a report.

### 9.4 Transfer to Anthropic (short TIA)

- **What goes:** one or two downscaled photos of a food pack. No identifiers. Incidental content
  in the frame (a hand, a kitchen) is possible but not sought.
- **Who and where:** the `ANTHROPIC_API_KEY` in `ai-read-label` was created in the Anthropic
  Console, in a workspace called "Tilo" in an API organisation, not a consumer Claude.ai account
  (Benn, 11 Oct 2026). The Commercial Terms (effective 17 June 2025) "govern Customer's use of
  Anthropic API keys", and "Anthropic" means Anthropic Ireland, Limited where the customer
  resides in the EEA, Switzerland or UK. They incorporate the DPA (s. C) and say Anthropic "may
  not train models on Customer Content" (s. B). Processing is likely in the US. Retention:
  deleted within 30 days of receipt, unless kept longer to enforce the usage policy or by law
  (Anthropic privacy centre, checked 10 Oct 2026).
- **Mechanism (Anthropic DPA, effective 24 Feb 2025, read 11 Oct 2026 at
  https://www.anthropic.com/legal/data-processing-addendum):** the EU SCCs (Decision 2021/914),
  Module Two (controller to processor) and/or Module Three, incorporated by reference and deemed
  executed "to the extent required" (s. I.1), Irish law and courts (Sch. 3 A.1.c, A.1.d); for
  UK GDPR data, the ICO's International Data Transfer Addendum to the SCCs (template B.1.0)
  is incorporated (s. I.2, Sch. 3 Part B), and Anthropic as importer may end it under its
  Table 4 terms. The importer is "the Anthropic entity that executed the Agreement" (Sch. 1
  A.2). The DPA does not mention the Data Privacy Framework, its UK Extension (the UK-US data
  bridge) or the IDTA itself; Tilo does not rely on them for Anthropic. Anthropic must give the
  information needed for a TIA (s. I.4); subprocessors listed at anthropic.com/subprocessors
  (Sch. 4; not read: the page didn't render without a browser).
- **Gap noted, accepted at this risk level:** the UK to Ireland leg is covered by UK adequacy
  for the EEA; the onward transfer from Anthropic Ireland to Anthropic, PBC or its US
  subprocessors is Anthropic's under s. C.2 (subprocessor terms substantially as protective),
  and its own mechanism was not seen. For a pack photo with no identifiers this does not change
  the outcome.
- **Risk in the destination:** public-authority access to a pack photo with no link to a person
  would reveal nothing about anyone. Remote likelihood, minimal severity.
- **Closed 11 Oct 2026:** the organisation is on the Commercial Terms (Benn's confirmation
  above) and the mechanism is recorded. One small check left, not a gate: the organisation's
  billing country in the Console should be the UK, so the contracting entity is Anthropic
  Ireland, Limited. Zero data retention is optional at this risk level.

### 9.5 New risks

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R19 | **Label photos kept or reused by the AI provider**, or incidental personal content in a photo exposed. | Remote | Minimal | Low |
| R20 | **A contribution traced back to a person** (a join with `custom_foods`, timing, logs). | Remote | Minimal | Low |
| R21 | **Personal or abusive text in a shared product name**, shown to every user who scans that barcode. | Possible | Significant | Medium |
| R22 | **Wrong figures on the shared list** lead someone to log the wrong amount (accuracy, not data protection; with `nutrition-accuracy`). | Possible | Minimal | Low |

### 9.6 Measures

- **R19.** Photos only, no identifiers; DPA (SCCs with the UK Addendum) and no-training terms;
  30-day deletion; nothing stored by Tilo. Residual: **low**.
- **R20.** The design in 9.3, the no-join rule, the random send delay; to do: the `security-data`
  fix in item 46. Residual: **low**.
- **R21.** Name rules refuse links, `@`, markup, long digit runs and claims before storage; a name
  report hides a version at once; review within 2 working days; deletion of personal data at
  once (`shared-products-moderation.md`); terms forbid false or abusive entries. Residual:
  **low**.
- **R22.** Only signed label reads, unchanged; tiers and margins on screen; three reports hide a
  version; "verified" only by an audit. Residual: **low**.

### 9.7 Sign-off

| Item | Name and date | Notes |
|---|---|---|
| Section 9 approved by | Benn, Gravita Creative Ltd, 11 Oct 2026 | Approves label photo scanning and the shared product list. Before `LABEL_SCAN_ENABLED` reaches `main`. |
| Anthropic DPA and transfer mechanism recorded | Compliance, 11 Oct 2026 (API organisation confirmed by Benn the same day) | EU SCCs Module Two/Three with the UK Addendum (DPA s. I, Sch. 3); see 9.4. Register item 24. |
| `security-data` fix for day-level ordering | | Register item 46; should fix, not a gate. |

---

## Sources checked

- Code on `claude/pensive-ramanujan-j4k1ie` at `86eddbc`: files cited inline.
- Register: `docs/compliance/README.md` (last reviewed 2026-09-28).
- Live Supabase project `exvblofwiwbvycomxvmj`, 30 Sept 2026: region, RLS status, trigger count,
  cron job, security advisors, and row counts only (no row content read).
- Live privacy page, www.tilo.fit/legals/privacy, 30 Sept 2026: the consent-release text, without
  the onboarding sections.
- ICO, "Examples of processing likely to result in high risk" (ico.org.uk), 30 Sept 2026.
- Section 9 (10 Oct 2026): code on `shared-products-legal` (from `e8ac601`); Anthropic Commercial
  Terms (anthropic.com/legal/commercial-terms: DPA incorporated by reference, no training on
  Customer Content, Anthropic Ireland, Limited for UK/EEA customers) and the Anthropic privacy
  centre article on API retention (privacy.claude.com), both 10 Oct 2026. Anthropic DPA
  (anthropic.com/legal/data-processing-addendum, effective 24 Feb 2025) and the Commercial Terms
  preamble (effective 17 June 2025) read 11 Oct 2026; anthropic.com/subprocessors not readable. UK GDPR Recital 26 and Arts. 7(3), 11 not re-read for this draft.
- UK GDPR Arts. 5, 6, 7, 9, 22, 27, 28, 30, 33 to 37 (legislation.gov.uk); not re-read for this
  draft beyond the articles cited.
