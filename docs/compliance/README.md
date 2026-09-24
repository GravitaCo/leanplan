# Tali compliance register

Owned by the `compliance` agent (`.claude/agents/compliance.md`). This is the working
record of how Tali meets UK GDPR / EU GDPR, PECR and related rules, and what is still open.
It is not legal advice. Before launch to the public, have a UK solicitor or privacy
professional review the legal texts and this register.

Last reviewed: 2026-09-24. Controller: Gravita Creative Ltd (company 08348225), trading as Tali.

## What's in the app

| Requirement | Where |
|---|---|
| Privacy policy (Art. 13), app and website | `src/core/legal/privacy.ts` → https://www.tali.fit/legals/privacy |
| Terms and conditions | `src/core/legal/terms.ts` → https://www.tali.fit/legals/terms |
| Cookie policy (PECR reg. 6) | `src/core/legal/cookies.ts` → https://www.tali.fit/legals/cookie-policy |
| Links from the app | Sign-in footer, consent screen and Profile → Privacy open the website pages (`screens/legal/LegalDoc.tsx`); old `app.tali.fit/?doc=…` links redirect there |
| Explicit consent for health data (Art. 9(2)(a)), terms, 18+ | `src/screens/legal/ConsentScreen.tsx`: three separate unticked boxes, shown before the app opens. Recorded on the device (`tali.consent`) and in the account's Supabase user metadata (`tali_consent`, with version, time and user id). Consent is per person: it is cleared on sign-out, and a guest's consent (worded for on-device only) is asked again when they sign in. Bumping `CONSENT_VERSION` asks everyone again. |
| Nothing reaches the cloud before consent | `runSync` in `src/store/store.ts` returns early without a consent record |
| Right of access and portability (Art. 15, 20) | Profile → Data & backup → Export (JSON of everything logged) |
| Right to erasure and withdrawal of consent (Art. 17, 7(3)) | Profile → Privacy → Delete account (pauses sync, calls `delete_my_account()`, then wipes the device; needs a connection), Only remove from this device, or for guests Delete data on this device |
| Rectification (Art. 16) | Every field is editable in the app |
| Storage and PECR | Only strictly necessary local storage (log, session, mode, consent). No cookies, analytics, ads or trackers, so no cookie banner is needed |
| Release gate | `npm run check:legal` fails while any fact in `LEGAL` is unset |

## Record of processing (Art. 30)

| Data | Purpose | Lawful basis | Where | Kept |
|---|---|---|---|---|
| Email, password hash, Google identity (email, name, avatar URL) | Account and sign-in | 6(1)(b) contract | Supabase Auth, eu-west-1 | Until account deletion |
| Profile: name, sex, age, height, weight, body fat, activity, goal, pace, training prefs, injuries/limitations and note, supplements, targets, prefs, hand sizes, if-then plans | Run the service, calculate targets | 6(1)(b) + 9(2)(a) explicit consent | `settings` table (profile jsonb) | Until account deletion |
| Day logs: foods, weight, workout, supplements taken, mood/hunger check-in and note | Run the service | 6(1)(b) + 9(2)(a) | `day_logs` (check-in rides in `supps._checkin`) | Until account deletion |
| Custom foods, recipes | Run the service | 6(1)(b) | `custom_foods`, `recipes` | Until account deletion |
| Push subscription (endpoint, keys) + supplement names/times | Reminders the user turned on | 6(1)(b) + 9(2)(a) | `push_subscriptions`; read by edge function `send-supplement-reminders` with the service role | Until turned off or account deletion; dead endpoints (404/410) are removed by the function |
| IP address, user agent, request logs | Deliver the site, security | 6(1)(f) legitimate interests | GitHub Pages, Supabase logs | Provider's log retention |
| Early access email (website form) | Invite people to try Tali | 6(1)(a) consent | Webflow form submissions | Until invited after launch, or unsubscribed |
| Turnstile signals | Stop bots on the form | 6(1)(f) | Cloudflare | Cloudflare's retention |
| Guest mode data | Run the app locally | Not processed by us: never leaves the device | Browser local storage | Until the user deletes it |

## Processors and transfers

| Provider | Role | Location | Action needed |
|---|---|---|---|
| Supabase Inc. | Processor: database, auth, edge functions | Project `exvblofwiwbvycomxvmj`, region eu-west-1 (Ireland) | Accept Supabase's DPA (dashboard or supabase.com/legal/dpa); note Supabase is US-based, so check its transfer terms and record them |
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
a separate company will be formed before public launch (see item 15). This branch stays off
`main` until the ICO fee is paid, because `check:legal` (run by the deploy workflow) fails
without the number.

While testing: anyone other than Benn using Tali with real data is still covered by GDPR.
Keep testers few, tell them it's a test build, and delete their data when testing ends.

## Open items (Benn)

Blocking before the legal texts can go live:

1. Pay the ICO data protection fee for Gravita Creative Ltd and add the number to `LEGAL`
   (the only fact still missing; the new company will need its own later).
2. Early access: every invite email needs a working unsubscribe, and the list must be deleted
   once people are invited (the privacy policy promises both). Webflow forms have no
   unsubscribe of their own.
3. Apply `docs/compliance/delete-account.sql` in the Supabase SQL editor. Until then,
   Delete account shows an error and deletes nothing.
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
12. A consent record is written to user metadata fire-and-forget. If an account never
    reconnects after consenting, the only record is on the device. Acceptable, but know it.
13. Consent given while an account is open offline (no live session) isn't tied to the
    account id, so the person is asked once more when they're back online. Harmless.
14. The deploy workflow runs `npm run check:legal`, so main will not deploy until item 1 is done.
16. Exception, 2026-09-24: interim website-only texts (`src/core/legal/website.ts`,
    `npm run legal:html -- --site`) are published at the same URLs, since they describe only
    the website and the early-access form. The full texts replace them at go-live.
    Also: the full pages can only be published once the app on `main` has the consent screen
    and deletion (this branch) and `delete_my_account()` is applied (checked 2026-09-24: not
    in the database). Until then they would describe safeguards the live app doesn't have.
17. Turnstile loads for every visitor to a page with the early-access form, not only people
    who submit it. Moving the form to its own page (or loading Turnstile only when someone
    starts typing) keeps it strictly necessary under PECR.
18. Early-access invites: the site says the email is used only for the invite. Removal is by
    email request; if an email service is used to send invites, add it as a processor first.
19. Push payload verified 2026-09-24 against the deployed `send-supplement-reminders` source
    (Supabase MCP): title, supplement name, tag, icon. Keep a copy of the function in the repo.
15. Moving Tali to its own company later changes the controller: update `LEGAL`, the three
    texts, bump `CONSENT_VERSION` so everyone consents to the new company, and tell the
    early-access list.

Future changes that need the compliance agent first: any AI feature
(`docs/plans/ai-platform-plan.md`), analytics or error tracking, email marketing (PECR
opt-in), paid plans (consumer and subscription law), native app store release (Apple and
Google privacy labels), or any feature that could look like diagnosis or treatment
(MHRA medical device rules).
