# Tali compliance register

Owned by the `compliance` agent (`.claude/agents/compliance.md`). This is the working
record of how Tali meets UK GDPR / EU GDPR, PECR and related rules, and what is still open.
It is not legal advice. Before launch to the public, have a UK solicitor or privacy
professional review the legal texts and this register.

Last reviewed: 2026-10-03. Controller: Gravita Creative Ltd (company 08348225), trading as Tali.

## What's in the app

| Requirement | Where |
|---|---|
| Privacy policy (Art. 13), app and website | `src/core/legal/privacy.ts` → https://www.tali.fit/legals/privacy (interim website-only text until the consent release: item 16) |
| Terms and conditions | `src/core/legal/terms.ts` → https://www.tali.fit/legals/terms |
| Cookie policy (PECR reg. 6) | `src/core/legal/cookies.ts` → https://www.tali.fit/legals/cookie-policy |
| Explicit consent for health data (Art. 9(2)(a)), terms, age | `screens/legal/ConsentScreen.tsx`, shown after sign-in until `healthConsentAnswered` (`src/data/consent.ts`): three unticked boxes; Continue records a `health` consent at `CONSENT_VERSIONS.health`. The screen can't be submitted without the terms and age boxes, so the account's first health grant at a version is also the record of those two (no separate `terms`/`age` consent types yet: adding them needs a migration of the `consents` type check). Records are append-only in the `consents` table (owner-only RLS, applied). |
| "Not now" (existing users, decided 2026-09-27) | The live consent screen offers "Not now, keep it on this phone" to someone who already has data on the device (`hasExistingData`). It sets a device-only pause (`consents.healthPause`); `consentLetsSync` stays false, so the whole log stays on the phone (food and workouts are treated as health data here: Art. 4(15), CJEU C-184/20 and C-21/23). The screen comes back once after 2 weeks (`liveConsentDue`); a second "Not now" isn't asked again. New users' "Not now" signs out. What was already in the account is deleted on `UNCONSENTED_DELETION` (28 Oct 2026) if there's still no yes (row below) |
| Server-side enforcement (2026-09-28) | `docs/migrations/2026-09-28-health-consent-server.sql`: a trigger on every log table refuses a signed-in person's insert or update unless their latest health consent is a yes (so a phone that hasn't heard of a withdrawal, or an old app version, can't upload); `clear_log_after_withdrawal()` deletes the account's copy in one transaction, only while the latest answer is a no, serialised with uploads by a per-person lock. `send-supplement-reminders` skips anyone without a current yes. Migration applied and function v4 deployed 2026-09-28 |
| Unconsented cloud copy (decided 2026-09-28) | `docs/migrations/2026-09-28-unconsented-purge.sql`: a daily pg_cron job (`tali-purge-unconsented`, 03:17 UTC) deletes day_logs, custom_foods, recipes, routines, training_plans, push_subscriptions and settings (never consents) for an account with no health answer 30 days after PURGE_FROM or its creation, whichever is later, and for a no over a day old (backstop). Service role only. The app and texts name the date (`UNCONSENTED_DELETION` in `src/core/legal/index.ts`; `npm test` checks it matches). A later first yes re-uploads the log from every phone that has one (`needsReupload`). Applied 2026-09-28 (cron job and ACLs checked) |
| Withdrawal (Art. 7(3); decided 2026-09-27) | Profile → Privacy → Withdraw consent for health data (offers a backup first). A health "no" stops all log sync (`consentLetsSync` needs a current yes) and deletes the account's copy of the log through `clear_log_after_withdrawal()` (day_logs, custom_foods, recipes, routines, training_plans, push_subscriptions, settings), once per withdrawal record on every device (`pendingCloudClear`); consent records stay. On every phone it clears what `HEALTH_FIELDS` in `src/data/consent.ts` lists: weigh-ins, check-ins, weight, body fat, height, `sexAnswer`, daily movement and `activityMult`, the onboarding outcomes, pregnancy flag, motivations, `deficitChosen`, all of `profile.training`, and health-derived reasons (`healthWhy`) in `routines` and `training_plans`. Kept: name, age, legacy `sex`, units, goal, `gentle`, `onboardedAt`. "Give consent again" there afterwards; a later yes re-uploads the phone's log. |
| Resuming after a pause or withdrawal | A day or settings row another device changed since then keeps that device's version; this phone's version is kept (`consents.resumeCopy`) and offered for download in Back up and restore |
| Nothing reaches the cloud before consent | `runSync` in `src/store/store.ts`: until answered, it only reads the account's consent records (so consent given on another device counts) |
| Onboarding wizard (built, off: `ONBOARDING_ENABLED` false in `screens/onboarding/Consent.tsx`; reviewed 2026-09-28) | Health steps (`HEALTH_STEPS` in `core/domain/wizard.ts`) only show, and answers only save, with a local health yes (`canSaveHealthAnswers`); `finishOnboarding` strips health fields without it. Stores outcomes only for readiness, medical and lately (`profile.outcomes`: readiness clear/flagged, medical clear/flagged, baseline ok/low); the raw items live in component state and are never saved or synced (`scripts/e2e-onboarding.cjs` asserts no raw screener answer in any upload). Kept as answered: wellbeing (flagged for Yes, sometimes, clear or undisclosed, plus `gentle` on when flagged; `sometimes` added by Onboarding 9, see item 34) and, from Onboarding 9, the food-range answers tied to it (`profile.foodOptIn`, own merge stamp `answeredAt.foodOptIn`: `today` 'today' | 'food' for the day-14 "Would you like your food range on Today?" after Sometimes, no date kept; `range` 'shown' | 'not-now' with `rangeAt`, a local date, for the week-4 "Would a calorie range help?" after Yes, so "Not now" rests 12 weeks; no separate "asked" flag, closing the sheet saves the second answer; checked in code 2026-10-01, item 34) and the pregnancy flag (`profile.pregnancy`, pregnant and breastfeeding not told apart, with `askedAt`). Also `motivations`, `height`, `sexAnswer`, `movement`, `activityMult`, `deficitChosen`, `training.*`, per-field `answeredAt`. Plan reasons sync in `training_plans.why` (`PLAN_WHY_SYNC` on; column live, checked 2026-09-28). Profile › Health data › Health check answers (`screens/profile/HealthAnswers.tsx`, rows from `healthAnswerRows.ts`, behind the flag) shows what's stored and lets people change or clear pregnancy and conditions, clear the gentler start and change food and weight; the lately baseline has no row (a GAP on the boards; the privacy policy points to export and email for it). A clear or change re-runs routing and targets at once and the plan when the engine loads (`_meta.rerunAnswers`, device-only marker inside `leanplan.v1`). The 12-week re-ask opens once on Today when due (`pregnancyReaskDue`; closing or "Ask me later" sets `snoozedAt`, back in 14 days). The draft (`tali.onboarding`, device only) holds outcomes, never raw items, and is only written with a local yes when it holds health answers. Texts updated 2026-09-28 to cover all of this; items 32 to 38 re-checked 2026-09-28 |
| Under-age stop (behind the wizard; `MIN_AGE` 18) | Age under 18 → kind stop (`NOTES.under16`), draft reset to the age alone, then `deleteUnderAge` records `tali.pendingDelete`, wipes the device only when it's that account's or nobody's (`underAgeWipesDevice`; uid from the live session, else the owner, else the saved session: `underAgeUid`; no uid, nothing recorded or wiped), and calls `delete-account` with `reason: 'under-age'`. That account's sync stays blocked; failures back off (1, 2, 4 min … at most an hour) and stop after 6 tries, and a 403 re-auth stops at once (`underAgeNext`): the device is then signed out and wiped, keeping `tali.pendingDelete`, and the sign-in screen says "Please sign in again to finish removing your account."; the next sign-in of that account finishes it. The function skips re-auth for that reason only when Auth's `created_at` is under 24 hours old (`newAccount`, `UNDER_AGE_WINDOW_S`). `delete-account` v2 deployed 2026-09-28 with this path; security-data reviewed it SAFE (repo comments record both) |
| Wellbeing Phase 1 (built, off: `WELLBEING_ENABLED` in `src/data/wellbeingFlag.ts`; `MIND_REVIEWED` sub-flag for the clinician-pending content; plan `docs/plans/wellbeing-plan.md` §10b) | Data shapes ship with the code whatever the flag says, so sync, merge and withdrawal stay safe across app versions (WP1, 2026-10-08). Synced: the check-in's `night` (`{ source: 'self', band, wakeAt, t }`; device fields `asleepMin`, `bedAt`, `ext` reserved for a later wearable build, which needs its own consent type), `skills` (`{ id, at }`, ids only) and `thing` (`{ key, done? }`, a key from a fixed list, never text), all inside `supps._checkin` on `day_logs` (no migration); `profile.mind` (`off` pillars, `asks`, `wakeAt`, `windDownAt`, `notify`, `halved`, `tz`, `lockNames`, each with an `answeredAt` stamp, merged field by field, `notify` and `halved` as whole objects); `IfThenPlan.kind` ('mind', "Mind plans"). Validated on load (`validCheckin`, `validMindPrefs`, `validPlanKind` in `core/domain/checkin.ts`): bad bands, times that aren't HH:MM, unknown skill ids, text in a thing key and unknown keys are dropped. Health data (cleared on withdrawal by `clearHealthData`, stripped by `withoutHealth`, counted by `healthDataSummary`): the whole check-in with its nested fields, `mind.wakeAt`, `mind.windDownAt` and Mind plans (health by inference, security-data M5). Kept on withdrawal as preferences: `mind.off`, `asks`, `notify`, `halved`, `tz`, `lockNames`. Two phones logging skills on the same day: the day row is last write wins (accepted, security-data M6). Privacy policy updated 2026-10-08 (What we collect, Health data, Automatic calculations); not to be published to Webflow until the flag goes on, except the lighter-session line, which is owed now (build plan C19, compliance to rule). Device-only Unload notes, the low-mood marker and reminder back-off records come in later packages with their own policy and register changes |
| Access and portability (Art. 15, 20) | Profile → Back up and restore → Export |
| Erasure (Art. 17) | Profile → Privacy → Delete account → `delete-account` Edge Function (deployed; recent sign-in required; `USER_TABLES` in `supabase/functions/_shared/account.ts`), then the device is wiped |
| Rectification (Art. 16) | Most fields are editable in the app; the setup health answers in Profile › Health data › Health check answers (with the flag on). The lately baseline, motivations and daily movement change through Profile › Health data › Redo setup (the wizard again, prefilled; skipping a question deletes that answer). Not editable in the app: going back to "prefer not to say" for sex: by email |
| Links from the app | Sign-up line, consent screen and Profile → Privacy open the website pages (`screens/legal/LegalDoc.tsx`); old `app.tali.fit/?doc=…` links redirect there |
| Storage and PECR | Only strictly necessary local storage (see `cookies.ts`). No cookies, analytics, ads or trackers in the app |
| Release gate | `npm run check:legal` (in the deploy workflow) fails on any placeholder the texts print; a missing ICO number only warns |

## Record of processing (Art. 30)

| Data | Purpose | Lawful basis | Where | Kept |
|---|---|---|---|---|
| Email, password hash, Google identity (email, name, avatar URL) | Account and sign-in | 6(1)(b) contract | Supabase Auth, eu-west-1 | Until account deletion |
| Profile: name, sex and `sexAnswer`, age, height, weight, body fat, daily movement and `activityMult`, activity, goal, pace, motivations, training prefs (confidence, moving now, days, weekdays, minutes, place, kit, enjoy, cardio, emphasis, liked/disliked), injuries/limitations and note, supplements, targets, prefs, hand sizes, if-then plans and their `kind` (Mind plans: health data by inference, cleared on withdrawal), Mind settings (`profile.mind`: pillars switched off, how often Tali asks, usual wake and wind-down times (health data, cleared on withdrawal), reminder types, reminder back-off start times, IANA time zone from the device, lock-screen names on or off), `answeredAt` stamps | Run the service, calculate targets | 6(1)(b) + 9(2)(a) explicit consent | `settings` table (profile jsonb) | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Onboarding outcomes: readiness, medical and lately results (outcomes only), wellbeing (flagged for Yes, sometimes, clear, undisclosed), the food-range answers that follow a Yes or Sometimes (`profile.foodOptIn`: `today`, `range`, `rangeAt` for the week-4 answer only; Onboarding 9; health data by inference, since only people who answered Yes or Sometimes are asked), pregnancy flag with `askedAt` and, after an "Ask me later" on the 12-week re-ask, `snoozedAt`, `deficitChosen` | Safety routing: gentler start, no deficit, no calorie number, Gentle mode (wellbeing Yes only; Sometimes gets a maintenance range instead), signposting (`routeSafety`); the 12-week re-ask; the day-14 and week-4 range asks, a range shown only if the person opts in | 6(1)(b) + 9(2)(a) explicit consent (per-question notice on each screen; every question skippable) | `settings` (profile jsonb) | Until changed or cleared in Profile › Health data › Health check answers, health consent is withdrawn (cleared on phones and account, `snoozedAt` with the pregnancy object, `foodOptIn` and its stamp with the profile health fields: checked 2026-10-01, item 34), or the account is deleted |
| Day logs: foods, weight, workout, supplements taken, the check-in (mood, hunger, sleep, stress, energy, soreness, note, and the Mind fields nested in it: `night` sleep band and wake time, `skills` used as id and time, `thing` as a key and when done) | Run the service | 6(1)(b) + 9(2)(a) | `day_logs` (check-in rides in `supps._checkin`) | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Custom foods, recipes, workouts you create (`routines`, with slot reasons in `blocks`), weekly plans (`training_plans`, with plan reasons in `why`) | Run the service | 6(1)(b) + 9(2)(a) (treated as health data) | `custom_foods`, `recipes`, `routines`, `training_plans` | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Push subscription (endpoint, keys) + supplement names/times | Reminders the user turned on | 6(1)(b) + 9(2)(a) | `push_subscriptions`; read by edge function `send-supplement-reminders` with the service role | Until turned off, health consent is withdrawn, or account deletion; dead endpoints (404/410) are removed by the function |
| Consent records (type, version, yes or no, time) | Show what was agreed and when (Art. 7(1), 5(2)) | 6(1)(c); 9(2)(f) if treated as special category | `consents` (append-only) and the device | Until account deletion |
| Pre-consent log already in the account, with no answer yet ("Not now", or not opened since) | None active: kept unused, not read or updated | No Art. 9(2) condition identified. Held unread and unchanged for a fixed 30-day transition so the person can agree or have it deleted (Art. 5(1)(e)); a time-limited risk Benn accepted on 2026-09-28; solicitor's view pending (item 26) | Account tables | Until 30 days after PURGE_FROM (28 Oct 2026) or account creation, whichever is later; then deleted by `purge_unconsented_logs()` (daily pg_cron job `tali-purge-unconsented`, 03:17 UTC). Backups expire on Supabase's cycle (window unknown, item 30) |
| Onboarding draft (`tali.onboarding`), setup card hidden (`tali.setupCardHidden`), pending under-age deletion (`tali.pendingDelete`: uid, time, tries, next try, stage) | Resume the wizard; remember a choice; finish an under-age deletion offline or after a fresh sign-in | 6(1)(b) (+ 9(2)(a) for the draft's health answers); PECR strictly necessary | Device only (`cookies.ts` lists them) | Draft: until setup finishes, a health withdrawal (here or pulled from another device), remove-this-device, or account deletion. Pending: until the deletion succeeds (or the device's data is cleared) |
| IP address, user agent, request logs | Deliver the site, security | 6(1)(f) legitimate interests | GitHub Pages, Supabase logs | Provider's log retention |
| Early access email (website form) | Invite people to try Tali | 6(1)(a) consent | Webflow form submissions | Until invited after launch, or unsubscribed |
| Turnstile signals | Stop bots on the form | 6(1)(f) | Cloudflare | Cloudflare's retention |

## Processors and transfers

| Provider | Role | Location | Action needed |
|---|---|---|---|
| Supabase Inc. | Processor: database, auth, edge functions, scheduled jobs (pg_cron) | Project `exvblofwiwbvycomxvmj`, region eu-west-1 (Ireland) | Accept Supabase's DPA (dashboard or supabase.com/legal/dpa); note Supabase is US-based, so check its transfer terms and record them |
| GitHub Inc. (Pages) | Processor for hosting and request logs | US | Confirm GitHub's DPA covers Pages for your account type; record the transfer mechanism |
| Webflow Inc. | Processor: website hosting, form submissions | US | Accept Webflow's DPA; record transfer mechanism |
| Cloudflare Inc. | Processor: delivers the website (as Webflow's CDN), Turnstile | US / global | Covered through Webflow for delivery; Turnstile has its own terms: confirm and record |
| Bunny.net (BunnyWay d.o.o.) | Processor: exercise demo video CDN (`src/core/data/media.ts`): the videos and their preview images, which load when the app shows an exercise row or entry, not only when a video plays; sees IP addresses. In use (confirmed by Benn, 28 Sept 2026) | BunnyWay d.o.o., Slovenia (EU); global edge network, storage may be outside the EU: confirm in Bunny's DPA and sub-processor list | Accept Bunny's DPA |
| Google (Workspace) | Processor: gravita.co email (rights requests, early-access invites) | US / global | Accept Google Workspace's data processing terms; record |
| Amazon CloudFront | Webflow's sub-processor for page code | US / global | Covered through Webflow |
| Open Food Facts (openfoodfacts.org, non-profit) | Independent controller, not a processor: the phone asks it for a scanned barcode, so it sees the barcode and IP address (privacy policy discloses this; item 23) | France (EU) | None beyond disclosure; proxying would stop the IP reaching it (item 23) |
| Google | Independent controller for Google sign-in | Global | Add the privacy policy and terms URLs to the Google OAuth consent screen |
| Apple / Google / Mozilla push services | Deliver encrypted push payloads | Global | None beyond disclosure (payload is end-to-end encrypted, contains a supplement name) |

## Publishing the legal pages

The text is written in `src/core/legal/` and rendered with `npm run legal:html`
(output `node_modules/.cache/legal-html.json`), then written to the Webflow site "Tali",
collection "Legals" (`content` rich text, `last-updated` date), as drafts via the Webflow MCP.
Publishing is a separate, explicit step. When the full texts get published is still undecided
(Benn, 28 Sept 2026; see item 16). Don't edit the pages in Webflow: the next push from
the repo would overwrite the edit. Webflow item ids: privacy `6ab56fd7d03958d70ceaf976`,
terms `6ab56fd7d03958d70ceaf978`, cookie-policy `6ab56fd7d03958d70ceaf97a`.

## DPIA

**Draft written 2026-09-30: [`dpia.md`](./dpia.md), awaiting Benn's review and sign-off** (and a
solicitor's, if he wants one). It opens with the decisions for Benn. Until it is signed this item
stays open. Scope it had to cover, kept for reference:

A DPIA is very likely required (UK GDPR Art. 35; ICO lists large-scale special-category
data and health apps among the triggers). The consent, minimisation, RLS and deletion work
above feeds it. The onboarding wizard adds
to it and should be covered before `ONBOARDING_ENABLED` goes on: pregnancy status, a medical
flag (diabetes with hypos risk, kidney disease, GLP-1), a disordered-eating proxy (wellbeing; from Onboarding 9 `flagged` for Yes and
`sometimes` stored apart, with the food-range answers after them: `dpia.md` §4.2 updated 2026-10-01, item 34),
automated safety routing from them (Art. 22 not triggered, but record why), the outcomes-only
design, the under-age stop and automatic deletion, and plan reasons now syncing. Also record
on-phone processing (item 27), the purge and the accepted 30-day gap (item 30(d)), and, before
label scanning goes on, the Anthropic processing (item 24).

## Status

Build and test phase. Gravita Creative Ltd is the controller for now (decided 2026-09-24);
a separate company will be formed before public launch (see item 15). Closed-group testing
with the consent screen from 2026-09-27 (which texts are live: item 16).

While testing: anyone other than Benn using Tali with real data is still covered by GDPR.
Keep testers few, tell them it's a test build, and delete their data when testing ends.

## Open items (Benn)

Owed now (processing is happening whether or not the texts are live):

1. Pay the ICO data protection fee for Gravita Creative Ltd and add the number to `LEGAL`
   (the only fact still missing; the new company will need its own later).
2. Early access: every invite email needs a working unsubscribe, and the list must be deleted
   once people are invited (the privacy policy promises both). Webflow forms have no
   unsubscribe of their own. The site says the email is used only for the invite; removal is by
   email request. If an email service is used to send invites, add it as a processor first
   (merged from item 18).
3. Done: account deletion is the `delete-account` Edge Function (deployed); the old
   `delete_my_account()` SQL was never applied and is removed.
4. Accept the Supabase, Webflow and Bunny.net DPAs, confirm GitHub's and Cloudflare Turnstile's
   terms, and record them here.
5. Add https://www.tali.fit/legals/privacy and /legals/terms to the Google OAuth consent screen.
6. Have a solicitor review the privacy policy, terms and this register.

Should fix:

7. Write the DPIA (scope: the DPIA section above). Draft done 2026-09-30 (`dpia.md`); Benn to
   review, decide D1 to D12 and sign.
8. If EU users are targeted, appoint an EU representative (Art. 27) and name them in the policy.
9. Confirm the Beat helpline number in the terms (0808 801 0677) against beateatingdisorders.org.uk.
10. Done, see item 29: `send-supplement-reminders` returned supplement names in its response
    body (possible exposure in function logs); it now returns counts only.
11. Breach response: decide who checks for incidents and how the 72-hour ICO notice (Art. 33)
    would be made.
12. (Superseded 2026-09-27: consents are in the `consents` table; see "What's in the app".)
13. (Superseded 2026-09-27: "keep" now drops the consent log, so a new account answers the
    consent screen itself.)
14. (Superseded 2026-09-27: a missing ICO number now warns, it no longer blocks deploys.)
15. Moving Tali to its own company later changes the controller: update `LEGAL`, the three
    texts, bump `CONSENT_VERSIONS` (`src/data/consent.ts`) so everyone consents to the new company, and tell the
    early-access list.

Added 2026-09-27 (consent release):

16. Interim website-only texts (`src/core/legal/website.ts`, `npm run legal:html -- --site`)
    were live from 2026-09-24. The full texts replace them with the consent release, which
    has the consent screen and account deletion on main.
17. Turnstile loads for every visitor to a page with the early-access form, not only people
    who submit it. Moving the form to its own page (or loading Turnstile only when someone
    starts typing) keeps it strictly necessary under PECR.
18. Merged into item 2 (early-access invites).
19. Push payload verified 2026-09-24 against the deployed `send-supplement-reminders` source
    (Supabase MCP): title, supplement name, tag, icon. The function's source is now in the repo
    (item 29).
20. People who decline consent can ask by email for their account to be deleted (the consent
    screen says so); do it with the `delete-account` flow or the Supabase dashboard.
    Existing testers' data (9 accounts) was synced before consent existed. They see the consent
    screen on their next launch and nothing more syncs until they answer; if anyone declines,
    delete their account on request. Now see item 29 (6 accounts with cloud data, 0 consent
    records, 2026-09-28) and item 30(a) (no notice emails for now, Benn's decision).
21. DECIDED (Benn, 28 Sept 2026): Tali is strictly 18+ (`MIN_AGE` in `src/core/legal/index.ts`,
    one rule: `isUnderAge` in `src/core/domain/age.ts`). Enforced by self-declaration at the consent
    screen ("I'm 18 or over"), the wizard (its age stop), Profile save (an under-18 age saves
    nothing), backup import (a backup with an under-18 age isn't loaded), cloud sync (a pulled
    profile under 18) and launch (a stored age under 18, checked on local data only). Any of the
    last four shows the app's stop screen (`screens/onboarding/AgeStop.tsx`, board "Age 18+ · 1";
    store `underAge`, never persisted): nothing syncs and label reading can't be reached while it
    shows; "Close and delete" opens the usual account deletion (with its re-sign-in); "I typed my
    age wrong" goes back (a stored under-18 age is cleared). The engine keeps an under-18 band as
    a backstop (no AI, words only). The ICO Children's Code is treated as out of scope on the basis
    of a "likely to be accessed by children" assessment that is still to be written into the DPIA
    (OPEN).
    - Supplement reminders stop while the stop shows: this device's push subscription ends through
      the existing unsubscribe path (best-effort, in the background; retried on a later launch or
      connection; device-only marker `_meta.pushHeld` inside `leanplan.v1`). "I typed my age wrong"
      re-registers them without asking, or turns the setting off when it can't. Redo setup (an
      existing account) uses the app's stop, not the first run's automatic deletion.
    - The app stop's Close needs a connection and doesn't retry by itself (only setup's under-age
      deletion retries).
    - OPEN, walk-away: someone who closes the app without choosing keeps their account on the
      server. Benn approved automatic deletion after 30 days unresolved as the next change (not
      built). For the Profile and backup paths the under-18 age isn't saved, so a relaunch returns
      to the normal app; the 30-day design therefore needs a marker, which is new processing
      needing its own privacy text, register line and, if it's a phone key, a `cookies.ts` entry.
    - OPEN: the likely-to-be-accessed assessment in the DPIA.
22. Resolved 2026-09-27 (as built: the Withdrawal row above). Withdrawal used to clear
    weigh-ins, check-ins and body details but keep food and workout logs, which the policy also
    calls health data; it now keeps the whole log on the phone and deletes the account's copy.
23. Open Food Facts: barcode lookups go from the phone, so OFF sees users' IP addresses
    (disclosed). Proxying them through an Edge Function would stop that.
24. Label photo scanning (Anthropic) is off. Before turning it on: Anthropic DPA, transfer
    mechanism and TIA, retention/zero retention, consent copy fix, withdrawal toggle, privacy
    policy section, DPIA update, and schedule the `ai_usage` 60-day clean-up.
25. Repo markers: `docs/migrations/2026-09-consents.sql` and `2026-09-owner-fks.sql` still say
    NOT APPLIED but are live (checked 2026-09-27). The `delete-account` function's comments are
    now right (v2 deployed, item 36). `docs/migrations/2026-09-ai-usage.sql` was applied
    on 2026-09-28 (owner postgres, verified) and its header now says so.

Added 2026-09-28 (server-side enforcement):

26. DECIDED (Benn, 28 Sept 2026): a pre-consent log with no yes is deleted from the account 30
    days after PURGE_FROM (the release) or account creation, whichever is later (the server
    can't see when someone was actually asked). They're offered consent again when they return.
    As built, with the withdrawal backstop and re-upload: the "Unconsented cloud copy" row above.
    Still worth a solicitor's view on whether the 30-day hold itself needs a basis.
27. On-phone processing while phone-only is still processing by Tali's code (CJEU C-25/17,
    C-210/16; Recital 18), so "phone-only" lowers risk but may not take it outside GDPR. Record
    this in the DPIA; it's also why withdrawal still clears weigh-ins, check-ins and body details.
28. Done 2026-09-28: `ai-read-label` is deployed with a server-side consent check. `ai_usage_take`
    refuses (the function answers 403 `consent`) unless the caller's latest `label-photo` consent is a
    yes; the app sends a new yes just before a read. Health consent is checked in the app only
    (`consentLetsSync`): a label read sends a pack photo and uses the caller's own allowance, nothing
    about their health (security-data, 2026-09-28). When the `ai` switch ships, decide whether it also
    governs label reading. When an AI feature ships and the AI features row comes back (item 31),
    bump `CONSENT_VERSIONS.ai`. Label scanning itself stays off in the app until item 24 is done.
29. Item 10 is done: the deployed reminder function returns counts only. Its source is now in the
    repo (`supabase/functions/send-supplement-reminders`). Item 20: 6 accounts have cloud data, 0
    consent records (checked 2026-09-28).

30. Open from the 30-day deletion (compliance, 2026-09-28):
    (a) DECIDED (Benn, 2026-09-28): no notice emails for now. Accepted risk: someone who doesn't
        open the app before 28 Oct, and no longer has the phone that holds their log, loses it.
        Revisit before 28 Oct. If emails are sent later: each account with cloud data and no
        consent (6 on 2026-09-28), before the first purge, one by one from Google Workspace, no health details: "We've changed how Tali
        handles health data: we now ask before keeping it in your account. Open Tali and choose
        whether it's OK. If you haven't agreed by 28 October 2026, we'll delete the copy in your
        account. What's on your phone stays there. To have your account deleted instead, reply to
        this email." If they go out after release day, move PURGE_FROM (and
        `UNCONSENTED_DELETION`) to the email date.
    (b) Find Supabase's backup retention window for this plan and record it.
    (c) Dormant accounts: after a purge the account and email stay with no end date. Set an
        inactivity period, with notice.
    (d) The DPIA should record the purge and the accepted 30-day gap.

31. Benn approved (2026-09-28, in the build session) two changes shipped with the consent release:
    the AI features row in Profile is hidden until an AI feature ships (`AI_FEATURES_LIVE`), and
    "Start fresh" on the sign-in owner choice needs a second tap, with "Export a copy" beside it.
    Also approved: the wording for Not now, the 28 October deletion date and the withdrawal prompt.

Added 2026-09-28 (onboarding wizard review, before `ONBOARDING_ENABLED` goes on):

32. Mostly done (re-checked 2026-09-28): Health check answers as built in the "Onboarding
    wizard" row above (the lately baseline has no row there: it changes through Redo setup).
    `NOTES.pregnancy` and `NOTES.medical` are now true. Privacy policy updated to name the screen
    and the exception. Done 2026-09-28 (Benn's wording): the copy now says "You can redo setup any time from
    Profile." and "You can update this by redoing setup.", the answers screen's lead is "Answers
    from your health check, and what each one changes.", and Profile › Redo setup (behind the
    flag) changes the lately baseline, motivations and daily movement. Privacy policy updated.
33. Done (re-checked 2026-09-28): the 12-week re-ask as in the "Onboarding wizard" row
    (`TodayScreen.tsx`, only for a yes); "Still pregnant" or "Breastfeeding now" re-dates
    `askedAt`, "No longer" clears the flag and re-runs the plan. `snoozedAt` syncs with the profile
    and goes with the pregnancy object on withdrawal (`PROFILE_HEALTH`). The privacy policy
    describes the re-ask and the date. Tests in `scripts/test-wizard.ts`.
34. Re-opened 2026-10-01 for Onboarding 9 ("Food: less emphasis to start, never hidden"). Code
    checked 2026-10-01 on `claude/onboarding-release` at 6430472 (behind `ONBOARDING_ENABLED`, off).
    `COPY.ready.note` still matches `outcomes.readiness` plus `profile.pregnancy`.
    - Stored values (as built): `outcomes.wellbeing` is 'flagged' (Yes, name kept) | 'sometimes' |
      'clear' | 'undisclosed' (`core/types.ts:283`, `wellbeingOutcome`). New `profile.foodOptIn`
      (`core/types.ts:292`): `today?: 'today' | 'food'` (Sometimes, day-14 ask, no date of its own),
      `range?: 'shown' | 'not-now'` with `rangeAt` (Yes, week-4 ask; a local date, for the 12-week
      rest after "Not now" or a Profile "Turn off"). There is no separate "asked" flag: closing the
      sheet saves the second answer (`FoodAskSheet.tsx`). Its merge stamp is `answeredAt.foodOptIn`
      (an ISO time, set on every answer: `answerFoodOptInIn`, `foodMode.ts:137`; in `MERGED_FIELDS`,
      `profileMerge.ts:14`), covered by the policy's "when each answer was last changed". These are
      **health data by inference** (Art. 9; only Yes or Sometimes are asked), under the same 6(1)(b)
      + 9(2)(a) basis and purpose. Privacy policy reworded 2026-10-01 to match (no "when" for the
      day-14 answer; closing counts as the second answer).
    - Routing as built (`routeSafety`, `onboarding.ts:334` to `339`; `foodView`, `foodMode.ts:68`):
      Yes: `gentle` on, no calorie or protein target, no deficit ever, Today and Food in words, a
      maintenance range on Food only after "Show a range" (never on Today). Sometimes: `gentle` NOT
      turned on, a ±15% maintenance range on Food from day one, no deficit whatever the goal, protein
      as a range, Today in words until the person says "Show it" at day 14. Both: the weight tile on
      Today shows "Logged"/"Add", not the number (`TodayScreen.tsx:321`); the same signposts; the
      training engine treats both as gentle (no automatic volume increase, trends in words:
      `engine/generate.ts:962` to `970`). Privacy and DPIA now say Gentle mode is for Yes only.
    - Requirements (a) to (f), checked 2026-10-01: (a) met: `foodOptIn` is in `HEALTH_FIELDS` and
      `PROFILE_HEALTH` (`consent.ts:305`, `320`), not in `KEPT_ON_WITHDRAWAL` (`:322`), so its stamp
      and `outcomes.wellbeing`'s are re-stamped on clear; the server copy goes with the `settings`
      row (`clear_log_after_withdrawal()` deletes the row). (b) met: `withoutHealth()` drops it
      (`consent.ts:326`); `answerFoodOptIn` saves only with `canSaveHealthAnswers` (`store.ts:1581`).
      (c) met: `foodAskDue(..., healthYes)` returns null without it (`foodMode.ts:123`; Today passes
      `canSaveHealthAnswers`). (d) met: Health check answers shows Yes and Sometimes as separate
      values with Change, and a "Turn off" row for each range yes (`healthAnswerRows.ts:45`, `:69`).
      (e) met: `scripts/test-wizard.ts:312` to `327` (withdrawal, stamps, `withoutHealth`, export,
      asks only with a yes) and `scripts/test-onboarding.ts` "onboarding 9". (f) met: export carries
      `foodOptIn` (test above).
    - Still open on the build (before the flag goes on):
      - Should fix (policy and safety): a Yes who is also pregnant or breastfeeding and says "Show a
        range" sees calorie numbers on Food: the Yes branch of `FoodScreen.tsx:77` to `85` ignores
        `quietNumbers` and `rangeAskDue` doesn't check pregnancy. The policy, the pregnancy note and
        `HEALTH_ANSWERS.does.pregnancy` all say "no calorie number". Fix in code (don't ask, or keep
        it in words, while `pregnancy.flagged`), not in the texts.
      - Should fix (copy untrue, Art. 5(1)(a), 13): weight is only off Today. Tapping the Today tile
        opens `WeightSheet` with a 30-entry trend, "kg vs last week" and a list of weights
        (`WeightSheet.tsx:35`, `50` to `76`), and Profile › Body and goal shows "NN kg"
        (`ProfileScreen.tsx:190`). So "Tali hides your weight" (`COPY.wellbeing.why`), "no weight on
        screen" (`NOTES.wellbeing.lead`), "no weight" (`FOOD9`/`ob9-1` `yesS`, `sometimesS`,
        `HEALTH_ANSWERS.does.wellbeing`) and "weight is hidden" (`does.wellbeingSometimes`) are
        untrue as built. Either hide weight in those places for Yes and Sometimes (with
        `mental-performance`) or reword to "your weight is off Today"; Benn approves the wording.
      - Note: "protein is shown in words" holds for the day's totals only; food rows and sheets still
        show grams of protein in Gentle mode. "No calorie number" for Yes holds only while Gentle mode
        stays on: Profile › Display lets a Yes turn it off (`ProfileScreen.tsx:305`), and then food
        rows show kcal (there's still no target). Consider "no calorie target" in the copy.
    - "Why we ask" link (judgement 2026-10-01, not legal advice): moving the "what we keep" lines
      one tap behind a "Why we ask" link is acceptable as a layered, just-in-time notice (UK GDPR
      Art. 12(1) and 13; ICO guidance on the right to be informed, layered and just-in-time
      approaches; EDPB transparency guidelines WP260 rev.01 on layering), because the consent
      itself was already given on `ConsentScreen` with the full policy, and each question stays
      optional. Conditions: the link is on the same screen as the question, visible without
      scrolling or a gesture, labelled plainly ("Why we ask" is fine), styled as a link or button
      with an accessible name; it opens the full lines (what we keep, what it changes, that it is
      optional, where to change or clear it) in one tap, without leaving the flow or needing a
      connection; the screen itself still says the question is optional (a skip is visible); the
      wellbeing result note (`NOTES.wellbeing.note`) stays on screen, not behind a link; and the
      same pattern does not move the consent wording or the age line. If testers miss the link,
      put the one-line "what we keep" back on screen.
      Checked 2026-10-01 (`Wizard.tsx:148` to `176`): a `<button>` named "Why we ask" in the lead
      line under the title, Skip in the top bar, a local sheet (no network); `Note` keeps
      `NOTES.wellbeing.note` on screen (`Wizard.tsx:619`); the age line stays on screen (`line`).
      One gap: the wellbeing sheet says what we keep and what it changes but not where to change it
      (only the Yes/Sometimes note screen says "change this in Profile"); a No or Rather not say
      never sees it. Should fix: add "You can change it in Profile any time." to
      `COPY.wellbeing.why` (Benn's wording). Whether the link is visible without scrolling on a
      small phone was not tested here.
35. Done (re-checked 2026-09-28): `withdraw()` and `applyHealthWithdrawal()` (a withdrawal
    pulled from another device) both call `clearDraft()`. Privacy and cookie texts say so.
36. Done (re-checked 2026-09-28): the comments in `supabase/functions/_shared/account.ts` and
    `delete-account/index.ts` record the security-data SAFE review and the v2 deploy (28 Sept).
37. Done, with residual risks (re-checked 2026-09-28): the stop path is as built in the
    "Under-age stop" row above; `runSync` checks the pending record before the consent gate.
    Texts updated (privacy "Age", cookie `tali.pendingDelete`).
    Residual, should fix: (a) if the person never signs in again, the account (email, consent
    records, anything synced) stays on the server with nothing there knowing it's under-age:
    consider having `delete-account` record a refused under-age request so a job or Benn can
    delete it (Art. 5(1)(c), (e)); (b) with no uid, the draft is kept too, though `NOTES.under16`
    says "We haven't kept any of your answers" (near-unreachable: the wizard runs after sign-in);
    (c) "remove this device's log" or clearing site data drops the pending record. The client
    stop path (sign-out and wipe) has no recorded `security-data` review.
    Update 2026-09-28: `tali.pendingDelete` now survives the in-app wipes (Delete account, and
    sign out and remove this device's log) so an under-age deletion can finish; it goes once that
    under-age deletion finishes (`clearPendingDeletion` when `underAgeNext` is done) or when
    browser data is cleared; the cookie policy says only that. Fixed on main a9fc1bd (checked
    2026-09-28): the record is also cleared when an ordinary Delete account removes that account,
    when the function answers already:true, when a token refresh answers user_not_found (the
    account is gone), and after 30 days (`PENDING_MAX_DAYS`, removed the next time it's read). Any other refresh failure keeps it,
    signs the device out, and the next sign-in finishes the deletion. The cookie policy says so.
38. Note, re-checked 2026-09-28: still no `CONSENT_VERSIONS.health` bump. The Profile controls,
    the re-ask and `snoozedAt` serve the same purpose, add no new category and no recipient, and
    the consent wording is unchanged. The solicitor question (item 6) stands. Publish the texts
    to Webflow with the release that turns the wizard on, not before.

39. Done (2026-09-28): Supabase leaked password protection is on (HaveIBeenPwned check on new
    passwords). The organisation moved to the Pro plan for it; Supabase stays the same processor,
    so no policy change. The security advisor no longer flags it. Open, low: `pg_net` sits in the
    public schema (advisor 0014); move it when convenient.

Future changes that need the compliance agent first: any AI feature
(`docs/plans/ai-platform-plan.md`), analytics or error tracking, email marketing (PECR
opt-in), paid plans (consumer and subscription law), native app store release (Apple and
Google privacy labels), or any feature that could look like diagnosis or treatment
(MHRA medical device rules).
