# Tali compliance register

Owned by the `compliance` agent (`.claude/agents/compliance.md`). This is the working
record of how Tali meets UK GDPR / EU GDPR, PECR and related rules, and what is still open.
It is not legal advice. Before launch to the public, have a UK solicitor or privacy
professional review the legal texts and this register.

Last reviewed: 2026-09-28. Controller: Gravita Creative Ltd (company 08348225), trading as Tali.

## What's in the app

| Requirement | Where |
|---|---|
| Privacy policy (Art. 13), app and website | `src/core/legal/privacy.ts` → https://www.tali.fit/legals/privacy (the live page is the interim website-only text until the app release that carries the consent screen; publish the full text with that release) |
| Terms and conditions | `src/core/legal/terms.ts` → https://www.tali.fit/legals/terms |
| Cookie policy (PECR reg. 6) | `src/core/legal/cookies.ts` → https://www.tali.fit/legals/cookie-policy |
| Explicit consent for health data (Art. 9(2)(a)), terms, age | `screens/legal/ConsentScreen.tsx`, shown after sign-in until `healthConsentAnswered` (`src/data/consent.ts`): three unticked boxes; Continue records a `health` consent at `CONSENT_VERSIONS.health`. The screen can't be submitted without the terms and age boxes, so the account's first health grant at a version is also the record of those two (no separate `terms`/`age` consent types yet: adding them needs a migration of the `consents` type check). Records are append-only in the `consents` table (owner-only RLS, applied). |
| "Not now" (existing users, decided 2026-09-27) | The live consent screen offers "Not now, keep it on this phone" to someone who already has data on the device (`hasExistingData`). It sets a device-only pause (`consents.healthPause`); `consentLetsSync` stays false, so the whole log stays on the phone (food and workouts are treated as health data here: Art. 4(15), CJEU C-184/20 and C-21/23). The screen comes back once after 2 weeks (`liveConsentDue`); a second "Not now" isn't asked again. New users' "Not now" signs out. What was already in the account is deleted on `UNCONSENTED_DELETION` (28 Oct 2026) if there's still no yes (row below) |
| Server-side enforcement (2026-09-28) | `docs/migrations/2026-09-28-health-consent-server.sql`: a trigger on every log table refuses a signed-in person's insert or update unless their latest health consent is a yes (so a phone that hasn't heard of a withdrawal, or an old app version, can't upload); `clear_log_after_withdrawal()` deletes the account's copy in one transaction, only while the latest answer is a no, serialised with uploads by a per-person lock. `send-supplement-reminders` skips anyone without a current yes. Migration applied and function v4 deployed 2026-09-28 |
| Unconsented cloud copy (decided 2026-09-28) | `docs/migrations/2026-09-28-unconsented-purge.sql`: a daily pg_cron job (`tali-purge-unconsented`, 03:17 UTC) deletes day_logs, custom_foods, recipes, routines, training_plans, push_subscriptions and settings (never consents) for an account with no health answer 30 days after PURGE_FROM or its creation, whichever is later, and for a no over a day old (backstop). Service role only. The app and texts name the date (`UNCONSENTED_DELETION` in `src/core/legal/index.ts`; `npm test` checks it matches). A later first yes re-uploads the log from every phone that has one (`needsReupload`). Applied 2026-09-28 (cron job and ACLs checked) |
| Withdrawal (decided 2026-09-27) | A health "no" stops all log sync (`consentLetsSync` needs a current yes) and deletes the account's copy of the log through `clear_log_after_withdrawal()` (day_logs, custom_foods, recipes, routines, training_plans, push_subscriptions, settings), once per withdrawal record on every device (`pendingCloudClear`); consent records stay. Weigh-ins, check-ins and body details are cleared on the phones too. A later yes re-uploads the phone's log. |
| Resuming after a pause or withdrawal | A day or settings row another device changed since then keeps that device's version; this phone's version is kept (`consents.resumeCopy`) and offered for download in Back up and restore |
| Nothing reaches the cloud before consent | `runSync` in `src/store/store.ts`: until answered, it only reads the account's consent records (so consent given on another device counts) |
| Withdrawal (Art. 7(3)) | Profile → Privacy → Withdraw consent for health data (offers a backup first; clears on every device what `HEALTH_FIELDS` in `src/data/consent.ts` lists: weigh-ins, check-ins, weight, body fat, height, `sexAnswer`, daily movement and `activityMult`, the onboarding outcomes, pregnancy flag, motivations, `deficitChosen`, all of `profile.training`, and health-derived reasons (`healthWhy`) in `routines` and `training_plans`). Kept: name, age, legacy `sex`, units, goal, `gentle`, `onboardedAt`. "Give consent again" there afterwards |
| Onboarding wizard (built, off: `ONBOARDING_ENABLED` false in `screens/onboarding/Consent.tsx`; reviewed 2026-09-28) | Health steps (`HEALTH_STEPS` in `core/domain/wizard.ts`) only show, and answers only save, with a local health yes (`canSaveHealthAnswers`); `finishOnboarding` strips health fields without it. Stores outcomes only for readiness, medical and lately (`profile.outcomes`: readiness clear/flagged, medical clear/flagged, baseline ok/low); the raw items live in component state and are never saved or synced (`scripts/e2e-onboarding.cjs` asserts no raw screener answer in any upload). Kept as answered: wellbeing (flagged/clear/undisclosed, plus `gentle` on when flagged) and the pregnancy flag (`profile.pregnancy`, pregnant and breastfeeding not told apart, with `askedAt`). Also `motivations`, `height`, `sexAnswer`, `movement`, `activityMult`, `deficitChosen`, `training.*`, per-field `answeredAt`. Plan reasons sync in `training_plans.why` (`PLAN_WHY_SYNC` on; column live, checked 2026-09-28). Profile › Health data › Health check answers (`screens/profile/HealthAnswers.tsx`, rows from `healthAnswerRows.ts`, behind the flag) shows what's stored and lets people change or clear pregnancy and conditions, clear the gentler start and change food and weight; the lately baseline has no row (a GAP on the boards; the privacy policy points to export and email for it). A change re-runs targets at once and the plan when the engine loads (`_meta.rerunAnswers`, device-only marker inside `leanplan.v1`). The 12-week re-ask opens once on Today when due (`pregnancyReaskDue`; closing or "Ask me later" sets `snoozedAt`, back in 14 days). The draft (`tali.onboarding`, device only) holds outcomes, never raw items, and is only written with a local yes when it holds health answers. Texts updated 2026-09-28 to cover all of this; items 32 to 38 re-checked 2026-09-28 |
| Under-age stop (behind the wizard; `MIN_AGE` 18) | Age under 18 → kind stop (`NOTES.under16`), draft reset to the age alone, then `deleteUnderAge` records `tali.pendingDelete`, wipes the device only when it's that account's or nobody's (`underAgeWipesDevice`; uid from the live session, else the owner, else the saved session: `underAgeUid`; no uid, nothing recorded or wiped), and calls `delete-account` with `reason: 'under-age'`. That account's sync stays blocked; failures back off (1, 2, 4 min … at most an hour) and stop after 6 tries, and a 403 re-auth stops at once (`underAgeNext`): the device is then signed out and wiped, keeping `tali.pendingDelete`, and the sign-in screen says "Please sign in again to finish removing your account."; the next sign-in of that account finishes it. The function skips re-auth for that reason only when Auth's `created_at` is under 24 hours old (`newAccount`, `UNDER_AGE_WINDOW_S`). `delete-account` v2 deployed 2026-09-28 with this path; security-data reviewed it SAFE (repo comments record both) |
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
| Profile: name, sex and `sexAnswer`, age, height, weight, body fat, daily movement and `activityMult`, activity, goal, pace, motivations, training prefs (confidence, moving now, days, weekdays, minutes, place, kit, enjoy, cardio, emphasis, liked/disliked), injuries/limitations and note, supplements, targets, prefs, hand sizes, if-then plans, `answeredAt` stamps | Run the service, calculate targets | 6(1)(b) + 9(2)(a) explicit consent | `settings` table (profile jsonb) | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Onboarding outcomes: readiness, medical and lately results (outcomes only), wellbeing (flagged/clear/undisclosed), pregnancy flag with `askedAt` and, after an "Ask me later" on the 12-week re-ask, `snoozedAt`, `deficitChosen` | Safety routing: gentler start, no deficit, no calorie number, Gentle mode, signposting (`routeSafety`); the 12-week re-ask | 6(1)(b) + 9(2)(a) explicit consent (per-question notice on each screen; every question skippable) | `settings` (profile jsonb) | Until changed or cleared in Profile › Health data › Health check answers, health consent is withdrawn (cleared on phones and account, `snoozedAt` with the pregnancy object), or the account is deleted |
| Day logs: foods, weight, workout, supplements taken, mood/hunger check-in and note | Run the service | 6(1)(b) + 9(2)(a) | `day_logs` (check-in rides in `supps._checkin`) | Until health consent is withdrawn (account copy cleared) or the account is deleted |
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
| Bunny.net (BunnyWay d.o.o.) | Processor: exercise demo video CDN, sees IP addresses | Slovenia (EU) per Bunny's published details: confirm | Accept Bunny's DPA |
| Google (Workspace) | Processor: gravita.co email (rights requests, early-access invites) | US / global | Accept Google Workspace's data processing terms; record |
| Amazon CloudFront | Webflow's sub-processor for page code | US / global | Covered through Webflow |
| Google | Independent controller for Google sign-in | Global | Add the privacy policy and terms URLs to the Google OAuth consent screen |
| Apple / Google / Mozilla push services | Deliver encrypted push payloads | Global | None beyond disclosure (payload is end-to-end encrypted, contains a supplement name) |

## Publishing the legal pages

The text is written in `src/core/legal/` and rendered with `npm run legal:html`
(output `node_modules/.cache/legal-html.json`), then written to the Webflow site "Tali",
collection "Legals" (`content` rich text, `last-updated` date), as drafts via the Webflow MCP.
Publishing is a separate, explicit step. Don't edit the pages in Webflow: the next push from
the repo would overwrite the edit. Webflow item ids: privacy `6ab56fd7d03958d70ceaf976`,
terms `6ab56fd7d03958d70ceaf978`, cookie-policy `6ab56fd7d03958d70ceaf97a`.

## DPIA

A DPIA is very likely required (UK GDPR Art. 35; ICO lists large-scale special-category
data and health apps among the triggers). The consent, minimisation, RLS and deletion work
above feeds it, but the DPIA itself has not been written. **Open.** The onboarding wizard adds
to it and should be covered before `ONBOARDING_ENABLED` goes on: pregnancy status, a medical
flag (diabetes with hypos risk, kidney disease, GLP-1), a disordered-eating proxy (wellbeing),
automated safety routing from them (Art. 22 not triggered, but record why), the outcomes-only
design, the under-age stop and automatic deletion, and plan reasons now syncing.

## Status

Build and test phase. Gravita Creative Ltd is the controller for now (decided 2026-09-24);
a separate company will be formed before public launch (see item 15). Closed-group testing
with the consent screen from 2026-09-27; the full app texts are published with that release.

While testing: anyone other than Benn using Tali with real data is still covered by GDPR.
Keep testers few, tell them it's a test build, and delete their data when testing ends.

## Open items (Benn)

Owed now (processing is happening whether or not the texts are live):

1. Pay the ICO data protection fee for Gravita Creative Ltd and add the number to `LEGAL`
   (the only fact still missing; the new company will need its own later).
2. Early access: every invite email needs a working unsubscribe, and the list must be deleted
   once people are invited (the privacy policy promises both). Webflow forms have no
   unsubscribe of their own.
3. Done: account deletion is the `delete-account` Edge Function (deployed); the old
   `delete_my_account()` SQL was never applied and is removed.
4. Accept the Supabase, Webflow and Bunny.net DPAs, confirm GitHub's and Cloudflare Turnstile's
   terms, and record them here.
5. Add https://www.tali.fit/legals/privacy and /legals/terms to the Google OAuth consent screen.
6. Have a solicitor review the privacy policy, terms and this register.

Should fix:

7. Write the DPIA.
8. If EU users are targeted, appoint an EU representative (Art. 27) and name them in the policy.
9. Confirm the Beat helpline number in the terms (0808 801 0677) against beateatingdisorders.org.uk.
10. Supabase edge function `send-supplement-reminders` returns supplement names in its
    response body, which may end up in function logs. Consider returning counts only.
11. Breach response: decide who checks for incidents and how the 72-hour ICO notice (Art. 33)
    would be made.
12. (Superseded 2026-09-27: consents are in the `consents` table; see "What's in the app".)
13. (Superseded 2026-09-27: "keep" now drops the consent log, so a new account answers the
    consent screen itself.)
14. (Superseded 2026-09-27: a missing ICO number now warns, it no longer blocks deploys.)
15. Moving Tali to its own company later changes the controller: update `LEGAL`, the three
    texts, bump `CONSENT_VERSION` so everyone consents to the new company, and tell the
    early-access list.

Added 2026-09-27 (consent release):

16. Interim website-only texts (`src/core/legal/website.ts`, `npm run legal:html -- --site`)
    were live from 2026-09-24. The full texts replace them with the consent release, which
    has the consent screen and account deletion on main.
17. Turnstile loads for every visitor to a page with the early-access form, not only people
    who submit it. Moving the form to its own page (or loading Turnstile only when someone
    starts typing) keeps it strictly necessary under PECR.
18. Early-access invites: the site says the email is used only for the invite. Removal is by
    email request; if an email service is used to send invites, add it as a processor first.
19. Push payload verified 2026-09-24 against the deployed `send-supplement-reminders` source
    (Supabase MCP): title, supplement name, tag, icon. Keep a copy of the function in the repo.
20. People who decline consent can ask by email for their account to be deleted (the consent
    screen says so); do it with the `delete-account` flow or the Supabase dashboard.
    Existing testers' data (9 accounts) was synced before consent existed. They see the consent
    screen on their next launch and nothing more syncs until they answer; if anyone declines,
    delete their account on request. Superseded by item 30(a): email the accounts with cloud data before 28 Oct.
21. Age: the texts, sign-up line and consent screen say 18+ (`MIN_AGE`). The onboarding plan's
    16+ with 16–17 safeguards needs those safeguards built first, and brings the ICO Children's
    Code into scope (DPIA and high-privacy defaults for under-18s). Benn to decide.
22. (Resolved 2026-09-27: withdrawal now keeps the whole log on the phone and deletes the
    account's copy.) Previously: it cleared weigh-ins, check-ins and body details, but kept food
    and workout logs, which the policy also calls health data. Get a view (solicitor or DPIA)
    on whether that is enough, or widen what withdrawal clears.
23. Open Food Facts: barcode lookups go from the phone, so OFF sees users' IP addresses
    (disclosed). Proxying them through an Edge Function would stop that.
24. Label photo scanning (Anthropic) is off. Before turning it on: Anthropic DPA, transfer
    mechanism and TIA, retention/zero retention, consent copy fix, withdrawal toggle, privacy
    policy section, DPIA update, and schedule the `ai_usage` 60-day clean-up.
25. Repo markers: `docs/migrations/2026-09-consents.sql`, `2026-09-owner-fks.sql` and the
    `delete-account` function say NOT APPLIED / NOT DEPLOYED but are live (checked 2026-09-27).

Added 2026-09-28 (server-side enforcement):

26. DECIDED (Benn, 28 Sept 2026): a pre-consent log with no yes is deleted from the account 30
    days after PURGE_FROM (the release) or account creation, whichever is later; the server
    can't see when someone was actually asked, by
    `docs/migrations/2026-09-28-unconsented-purge.sql`. They're offered consent again when they
    return, and a first yes uploads the whole log from the phone. It's also a backstop for a
    withdrawal whose clear didn't run (a no over a day old). Still worth a solicitor's view on
    whether the 30-day hold itself needs a basis.
27. On-phone processing while phone-only is still processing by Tali's code (CJEU C-25/17,
    C-210/16; Recital 18), so "phone-only" lowers risk but may not take it outside GDPR. Record
    this in the DPIA; it's also why withdrawal still clears weigh-ins, check-ins and body details.
28. `ai-read-label` has no server-side consent check (label-photo or health). Add one before it's
    deployed. The AI features row in Profile is hidden until an AI feature ships; bump
    `CONSENT_VERSIONS.ai` then.
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

32. Mostly done (re-checked 2026-09-28): Profile › Health data › Health check answers
    (`screens/profile/HealthAnswers.tsx`, `healthAnswerRows.ts`) shows what's stored and changes
    or clears pregnancy and conditions, clears the gentler start and changes food and weight;
    a clear or change re-runs routing and targets (and the plan). `NOTES.pregnancy` and
    `NOTES.medical` are now true. Privacy policy updated to name the screen and the exception.
    Done 2026-09-28 (Benn's wording): the copy now says "You can redo setup any time from
    Profile." and "You can update this by redoing setup.", the answers screen's lead is "Answers
    from your health check, and what each one changes.", and Profile › Redo setup (behind the
    flag) changes the lately baseline, motivations and daily movement. Privacy policy updated.
33. Done (re-checked 2026-09-28): the 12-week re-ask opens once on Today when due
    (`TodayScreen.tsx`, `pregnancyReaskDue`, only for a yes); "Still pregnant" or "Breastfeeding
    now" re-dates `askedAt`, "No longer" clears the flag and re-runs the plan, and "Ask me later"
    or closing sets `profile.pregnancy.snoozedAt` (back after 14 days). `snoozedAt` syncs with
    the profile and goes with the pregnancy object on withdrawal (`PROFILE_HEALTH`). The privacy
    policy now describes the re-ask and the date. Tests in `scripts/test-wizard.ts`.
34. Done (re-checked 2026-09-28): `COPY.ready.note` ("We keep a short note of what applies
    (like pregnancy), never a medical record.") matches `outcomes.readiness` plus
    `profile.pregnancy`; `COPY.wellbeing.why` and `NOTES.wellbeing.note` ("We keep your answer
    (yes, no or rather not say) ...") match `outcomes.wellbeing` (Yes and Sometimes stored as one).
35. Done (re-checked 2026-09-28): `withdraw()` and `applyHealthWithdrawal()` (a withdrawal
    pulled from another device) both call `clearDraft()`. Privacy and cookie texts say so.
36. Done (re-checked 2026-09-28): the comments in `supabase/functions/_shared/account.ts` and
    `delete-account/index.ts` record the security-data SAFE review and the v2 deploy (28 Sept).
37. Done, with residual risks (re-checked 2026-09-28): `underAgeNext` stops at once on a 403
    re-auth and after 6 backed-off tries; the device is then signed out and wiped (only its own
    or nobody's data: `underAgeWipesDevice`), `tali.pendingDelete` is kept, the sign-in screen
    shows "Please sign in again to finish removing your account." and that account's next
    sign-in finishes it (`runSync` checks the pending record before the consent gate). No uid:
    nothing is recorded or wiped. Texts updated (privacy "Age", cookie `tali.pendingDelete`).
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
