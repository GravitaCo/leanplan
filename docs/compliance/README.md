# Tali compliance register

Owned by the `compliance` agent (`.claude/agents/compliance.md`). This is the working
record of how Tali meets UK GDPR / EU GDPR, PECR and related rules, and what is still open.
It is not legal advice. Before launch to the public, have a UK solicitor or privacy
professional review the legal texts and this register.

Last reviewed: 2026-09-23.

## What's in the app

| Requirement | Where |
|---|---|
| Privacy policy (Art. 13) | `src/core/legal/privacy.ts`, in-app from sign-in and Profile → Privacy, public at `https://tali.fit/?doc=privacy` |
| Terms of use | `src/core/legal/terms.ts`, same places, public at `https://tali.fit/?doc=terms` |
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
| Guest mode data | Run the app locally | Not processed by us: never leaves the device | Browser local storage | Until the user deletes it |

## Processors and transfers

| Provider | Role | Location | Action needed |
|---|---|---|---|
| Supabase Inc. | Processor: database, auth, edge functions | Project `exvblofwiwbvycomxvmj`, region eu-west-1 (Ireland) | Accept Supabase's DPA (dashboard or supabase.com/legal/dpa); note Supabase is US-based, so check its transfer terms and record them |
| GitHub Inc. (Pages) | Processor for hosting and request logs | US | Confirm GitHub's DPA covers Pages for your account type; record the transfer mechanism |
| Google | Independent controller for Google sign-in | Global | Add the privacy policy and terms URLs to the Google OAuth consent screen |
| Apple / Google / Mozilla push services | Deliver encrypted push payloads | Global | None beyond disclosure (payload is end-to-end encrypted, contains a supplement name) |

## DPIA

A DPIA is very likely required (UK GDPR Art. 35; ICO lists large-scale special-category
data and health apps among the triggers). The consent, minimisation, RLS and deletion work
above feeds it, but the DPIA itself has not been written. **Open.**

## Open items (Benn)

Blocking before the legal texts can go live:

1. Fill `LEGAL` in `src/core/legal/index.ts`: controller legal name, address, privacy
   contact email, ICO registration number, governing law, Supabase backup retention (check
   the project's plan: backup window and point-in-time recovery setting).
2. Pay the ICO data protection fee and register (ico.org.uk/fee). Processing health data
   as a business almost always requires it.
3. Apply `docs/compliance/delete-account.sql` in the Supabase SQL editor. Until then,
   Delete account shows an error and deletes nothing.
4. Accept the Supabase DPA and confirm GitHub's terms, and record both here.
5. Add `https://tali.fit/?doc=privacy` and `?doc=terms` to the Google OAuth consent screen.
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

Future changes that need the compliance agent first: any AI feature
(`docs/plans/ai-platform-plan.md`), analytics or error tracking, email marketing (PECR
opt-in), paid plans (consumer and subscription law), native app store release (Apple and
Google privacy labels), or any feature that could look like diagnosis or treatment
(MHRA medical device rules).
