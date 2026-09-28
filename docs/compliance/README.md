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
| Withdrawal (Art. 7(3)) | Profile → Privacy → Withdraw consent for health data (offers a backup first; clears weigh-ins, check-ins, weight, body fat, limitations on every device). "Give consent again" there afterwards |
| Access and portability (Art. 15, 20) | Profile → Back up and restore → Export |
| Erasure (Art. 17) | Profile → Privacy → Delete account → `delete-account` Edge Function (deployed; recent sign-in required; `USER_TABLES` in `supabase/functions/_shared/account.ts`), then the device is wiped |
| Rectification (Art. 16) | Every field is editable in the app |
| Links from the app | Sign-up line, consent screen and Profile → Privacy open the website pages (`screens/legal/LegalDoc.tsx`); old `app.tali.fit/?doc=…` links redirect there |
| Storage and PECR | Only strictly necessary local storage (see `cookies.ts`). No cookies, analytics, ads or trackers in the app |
| Release gate | `npm run check:legal` (in the deploy workflow) fails on any placeholder the texts print; a missing ICO number only warns |

## Record of processing (Art. 30)

| Data | Purpose | Lawful basis | Where | Kept |
|---|---|---|---|---|
| Email, password hash, Google identity (email, name, avatar URL) | Account and sign-in | 6(1)(b) contract | Supabase Auth, eu-west-1 | Until account deletion |
| Profile: name, sex, age, height, weight, body fat, activity, goal, pace, training prefs, injuries/limitations and note, supplements, targets, prefs, hand sizes, if-then plans | Run the service, calculate targets | 6(1)(b) + 9(2)(a) explicit consent | `settings` table (profile jsonb) | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Day logs: foods, weight, workout, supplements taken, mood/hunger check-in and note | Run the service | 6(1)(b) + 9(2)(a) | `day_logs` (check-in rides in `supps._checkin`) | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Custom foods, recipes, workouts you create (`routines`), weekly plans (`training_plans`) | Run the service | 6(1)(b) + 9(2)(a) (treated as health data) | `custom_foods`, `recipes`, `routines`, `training_plans` | Until health consent is withdrawn (account copy cleared) or the account is deleted |
| Push subscription (endpoint, keys) + supplement names/times | Reminders the user turned on | 6(1)(b) + 9(2)(a) | `push_subscriptions`; read by edge function `send-supplement-reminders` with the service role | Until turned off, health consent is withdrawn, or account deletion; dead endpoints (404/410) are removed by the function |
| Consent records (type, version, yes or no, time) | Show what was agreed and when (Art. 7(1), 5(2)) | 6(1)(c); 9(2)(f) if treated as special category | `consents` (append-only) and the device | Until account deletion |
| Pre-consent log already in the account, with no answer yet ("Not now", or not opened since) | None active: kept unused, not read or updated | No Art. 9(2) condition identified. Held unread and unchanged for a fixed 30-day transition so the person can agree or have it deleted (Art. 5(1)(e)); a time-limited risk Benn accepted on 2026-09-28; solicitor's view pending (item 26) | Account tables | Until 30 days after PURGE_FROM (28 Oct 2026) or account creation, whichever is later; then deleted by `purge_unconsented_logs()` (daily pg_cron job `tali-purge-unconsented`, 03:17 UTC). Backups expire on Supabase's cycle (window unknown, item 30) |
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
above feeds it, but the DPIA itself has not been written. **Open.**

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

Future changes that need the compliance agent first: any AI feature
(`docs/plans/ai-platform-plan.md`), analytics or error tracking, email marketing (PECR
opt-in), paid plans (consumer and subscription law), native app store release (Apple and
Google privacy labels), or any feature that could look like diagnosis or treatment
(MHRA medical device rules).
