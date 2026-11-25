# Tilo DPIA: decisions for Benn

Prepared 25 November 2026 for Benn, director of Gravita Creative Ltd, the controller for Tilo. It goes with the formal DPIA you are signing and asks only for the decisions that document needs from you. It was drafted with AI help and is not legal advice. Where something is not known, it says so.

## 1. Two facts to confirm

The assessment rests on two things nobody has checked from the records. First, that the iPhone app is in TestFlight with you and Sara only, and nobody else has a build. Second, whether any test build has the Cycle feature switched on. Cycle is built but meant to be off, and it is not covered by this sign-off; if a build has it on, period data is already being processed without its own approval and Cycle needs either switching off in that build or its own sign-off first.

Your answer (iPhone app, who has it):

Your answer (Cycle on in any build: yes, no or don't know):

## 2. Is closed testing really closed?

Anyone with the link can create an account on the web app's sign-up screen. Whether new sign-ups are blocked in Supabase (the setting "Allow new users to sign up") could not be checked. One account was created after 30 September, on 16 November; whether that is someone you know was not checked.

Why it matters: several approvals in the DPIA only hold for "closed testers", people known to Gravita and told it is a test. That includes switching on the onboarding questions before a clinician has reviewed them, and the Mind and Cycle conditions. If sign-up is open in practice, none of those conditions is met.

Options: (A) turn off open sign-up in Supabase and add testers by invitation, before onboarding goes on. **Recommended**, because it makes every "closed" condition true rather than assumed. (B) Leave sign-up open and treat every "closed testers" condition as not met, which means onboarding waits for the clinician review.

Your answer:

## 3. iPhone backups

The iPhone app keeps the whole log, and the Cycle log once used, in storage that the phone includes in its backups. So a copy of the person's health data goes wherever their backups go, usually iCloud or a computer. Today that is only your and Sara's phones.

Options: (A) exclude the app's data from phone backups. **Recommended**: everything is already in the person's account, so a restored phone simply syncs again, and only edits not yet synced would be lost. (B) Keep it in backups and say so plainly in the iPhone app's privacy text. Either way, this has to be settled before anyone beyond you and Sara gets the app. Apple's rules already keep Apple Health data out of iCloud whatever you choose.

Your answer:

## 4. How far does "no lawyer" reach?

On 16 November you said "We do not need lawyer at this time", in the discussion about Cycle. The draft applies it to all legal review for now. Several judgements in the DPIA are legal ones made with AI help and checked by nobody qualified: chiefly, that asking new users for health consent as a condition of using Tilo is acceptable, that Tilo makes no automated decisions with legal or similar effect, that the ICO need not be consulted in advance, and whether offering Cycle to women only is lawful under the Equality Act.

Why it matters: if one of those judgements is wrong, nobody catches it before a regulator or a user does. Signing accepts that risk knowingly.

Options: (A) the statement covers Cycle only, so the other legal judgements need advice before you sign them. (B) It covers all legal review for the closed test, to be reconsidered before public launch, an App Store listing, the new company, any paid tier, or Cycle going beyond you and Sara. **Recommended**, as proportionate for a small known group, provided those triggers are kept.

Your answer:

## 5. Recommended measures

Each of these lowers a risk the DPIA scores. Owners and dates are suggestions. Mark each approve, change or reject.

| Measure | Risk it addresses | Suggested owner | Suggested date | Approve / change / reject |
|---|---|---|---|---|
| Two-step sign-in on every Supabase, GitHub, Webflow and Google admin account (not known whether it is on) | A breach of cloud health data | Benn | Now | |
| A one-page breach procedure, with you named as responsible, covering the Apple developer account too | A breach handled late or badly | Benn, with compliance help | Before public launch | |
| An independent security test of the database rules and server functions, plus a small database tidy-up | A breach of cloud health data | Benn to commission | Before public launch | |
| Fix the onboarding copy that says weight is hidden while two screens still show it | Harm to people at risk with food or weight | Lead engineer | Before onboarding goes on | |
| Decide what the live app tells new users about who should not use Tilo to guide eating (today only the terms say it); write a short note on why Tilo is not a medical device; keep marketing free of health claims | Wrong advice or routing; medical device rules; advertising rules | Benn and Sara, lead engineer | Before onboarding goes beyond closed testers | |
| A line on the Export screen saying the file holds health data (a copy change, so it needs your approval) | Exported files shared carelessly | Lead engineer, Benn to approve | Next release | |
| A written assessment of whether children are likely to use Tilo; fix under-age accounts being left on the server; a security review of the under-age stop | Under-18s using the app | Lead engineer | Before public launch or an App Store listing | |
| Find out how long Supabase keeps backups and say so in the policy if it is long; say that exported files are the person's own copy | Data kept after deletion or withdrawal | Lead engineer | Before public launch | |
| Delete accounts after 12 months of inactivity, with notice (you decided this on 1 October; not built; needs an email service, which is a new processor) | Accounts kept with no end date | Lead engineer | Before public launch | |
| Revoke the Sign in with Apple link when an account is deleted (written, not deployed) | Apple's rules; a link left after deletion | Lead engineer | Before anyone beyond you and Sara gets the iPhone app | |
| Update the DPIA before any further AI feature goes on | New uses of health data | Compliance review | Before each AI feature | |
| On the move to the new company: review the DPIA, a data agreement between the two companies, a new ICO registration, new contracts | Controller change | Benn | When the new company exists | |
| Consider letting a new user who says no to health consent keep a phone-only log; seek a legal view on the consent design when advice is reconsidered | Consent that is a condition of use | Benn and Sara | Before public launch | |
| Optional: route barcode lookups through Tilo's server so the person's IP address no longer reaches Open Food Facts | Data sent to a third party | Lead engineer | No date | |

## 6. Switching on onboarding for closed testers

The first-run questions (including the wellbeing, readiness and medical questions and where they send people) are off. Your signature can approve switching them on for closed testers only, once sign-up is closed (decision 2), the weight copy is fixed, the matching privacy and terms text is published and the release passes its usual check. A clinician's review stays a condition before they reach anyone else; without it that risk stays high and the ICO would have to be consulted first.

Options: (A) approve on for closed testers only, on those conditions, with the clinician review still required before anyone else. **Recommended.** (B) Keep onboarding off until the clinician review is done.

Your answer:

## 7. When to review the DPIA

No review date is set. The suggestion is before public launch or an App Store listing, and in any case within a year (by 25 November 2027 at the latest). It must also be reviewed earlier if onboarding goes beyond closed testers, a new AI feature, processor or data field is added, the iPhone app or Cycle goes beyond you and Sara, the new company takes over, paid tiers start, or there is a breach or complaint.

Your answer (review date):

## 8. Owed whatever you decide

**ICO fee.** Gravita Creative Ltd must pay the ICO data protection fee. The records hold no registration number, so either it is unpaid or it was paid and not recorded; which is unknown. If paid, send the number. Tilo should also be listed as a trading name.

**Processor contracts.** Contracts that bind each provider to protect the data, and the legal basis for sending data to US companies, are not recorded for Supabase (which holds the health data), Webflow, Bunny.net, Google Workspace, GitHub and Cloudflare. Apple's terms are also unrecorded for its notification service, Sign in with Apple and TestFlight. Most providers offer standard terms to accept or confirm; the contract with Anthropic is already done.

ICO fee done by:

Processor contracts done by:

---

To answer, reply to the lead engineer in your own words; your answers are recorded word for word with the date.
