# Data Protection Impact Assessment: Tilo

UK GDPR Article 35 and Data Protection Act 2018

---

## Document control

| Field | Detail |
|---|---|
| Processing assessed | Tilo, a health and fitness application: the web app (app.tilo.fit), the iPhone app in internal testing, the website (www.tilo.fit) and AI label reading |
| Controller | Gravita Creative Ltd, a company registered in England and Wales, company number 08348225 |
| Registered office | 64 Carlton Lane, Rothwell, Leeds, LS26 0SX |
| Privacy contact | benn@gravita.co |
| ICO registration number | Not yet recorded (see D3) |
| Document owner | Benn, Director, Gravita Creative Ltd |
| Prepared by | Drafted by an AI assistant for the controller; to be reviewed and approved by the Director before signature. |
| Version | 1.0 |
| Date | 25 November 2026 |
| Status | Draft for approval |
| Facts stated as at | 24 November 2026, unless the text says otherwise |
| Next review date | [Review date pending] |
| Working record | A working record of this assessment, with its evidence, open questions and cross-references, is held separately; risk numbers (R1 to R32) and decision numbers (D1 to D15) are the same in both. |

**Approval history**

| Part | Status |
|---|---|
| Sections 1 to 7 (the main assessment) | Draft for approval |
| Annex A: Label photos and the shared product list | Approved by Benn for Gravita Creative Ltd, 11 October 2026 |
| Annex B, Part 1: Wellbeing Phase 1 (Mind) | Approved by Benn, 10 October 2026 |
| Annex B, Part 2: Wind-down routine and supplement names in reminders | Proposed, not approved |
| Annex B, Part 3: Reminders through Apple's push service | Proposed, not approved |
| Annex B, Part 4: Mind on for closed testing | Noted by Benn, 10 October 2026 |
| Annex C: Cycle | Draft addendum, not approved; out of scope of this approval |
| Annex D: Apple Health import | Placeholder; out of scope of this approval |

**Important notice.** This assessment is not legal advice. It was prepared with AI assistance and
has not been reviewed by a solicitor or privacy professional. The controller decided on
16 November 2026 not to seek legal advice at this stage (D15). Every legal judgement in this
document is therefore unreviewed by a qualified adviser, and is identified as a judgement where it
matters.

**Former name.** The product was called Tali (app.tali.fit and www.tali.fit) until 5 November 2026.
The change of name altered no controller, purpose, data category, processor or transfer.

---

## Summary

**The processing.** Tilo is a free health and fitness application operated by Gravita Creative Ltd
as controller. Users record food, body weight, workouts, supplements, sleep, mood and other
check-ins, and Tilo calculates ranges, plans and suggestions from those records. Almost all of this
is health data, a special category of personal data under UK GDPR Article 9. It is processed on the
basis of contract (Article 6(1)(b)) and explicit consent (Article 9(2)(a)). Data is held on the
user's device first and is copied to a cloud database in Ireland only after the user has given
explicit consent; the server itself refuses health data from an account without current consent.
Photographs of food labels are sent to an AI service to be read, with no identifier attached. No
data is sold, used for advertising or used for analytics.

**Who is affected.** The web app is used by a small closed group (11 accounts). As reported by the
development team, and to be confirmed by the controller, the iPhone app is in Apple's TestFlight
internal testing with two members of Gravita's core team.

**Residual risk after the measures in section 6.**
- Medium: R1 (breach of cloud health data), R3 (incorrect safety routing, once the clinical review
  in D1 is done), R4 (use by under-18s), R7 (international transfers, until processor contracts are
  recorded under D4), R10 (ICO fee, until the fee is confirmed paid; whether it has been is not
  recorded), R12 (consent as a condition of the service), R17 (signposting by nation, until
  nation-neutral signposting is settled everywhere; the Profile Support sheet still opens on England)
  and R31 (iPhone backups, pending D14).
- High, unless conditions are met: R3 if the onboarding wizard reaches anyone beyond closed testers
  without clinical review; R15 (Annex B) if the app becomes public before the Mind clinical review;
  R23 and R26 (Annex C, Cycle) for anyone beyond the two core team members.
- Low: all other risks.

**What approval of this document covers.** The processing described in sections 2 to 4 as it runs
at the date of this assessment, the measures in place in section 6, the recommended measures the
controller approves in section 6, the residual risks in section 7, and the view in section 7.3 that
prior consultation with the ICO is not required on the stated conditions.

**What it does not cover.** Cycle (Annex C), the Apple Health import (Annex D), supplement names in
reminders (Annex B, Part 2) and reminders through Apple's push service (Annex B, Part 3), each of
which requires its own approval; the iPhone app
beyond the core team; and public launch.

---

## 1. Need for a DPIA

A DPIA is required. Article 35(1) requires one where processing is likely to result in a high risk
to individuals. The ICO's list of processing likely to result in high risk, based on the European
Data Protection Board's guidelines (WP248 rev.01), includes "hardware/software offering
fitness/lifestyle/health monitoring" under the heading of tracking. The ICO indicates that a DPIA is
needed where an item on its list is combined with another screening criterion. Several apply.

| Screening criterion | Applies | Reason |
|---|---|---|
| Tracking: software offering fitness, lifestyle or health monitoring | Yes | This is the core of the product: food, weight, workouts, mood and hunger check-ins, supplements. |
| Sensitive data (special category, Article 9) | Yes | Health data throughout. A chosen diet pattern may reveal religious or philosophical belief. Food and workout records are treated as health data as a conservative position, consistent with recent Court of Justice case law on inferred special category data. |
| Data concerning vulnerable people | Possibly | A diet and weight application may be used by people with, or recovering from, an eating disorder, by pregnant or breastfeeding people and by people with conditions such as diabetes. |
| Evaluation or scoring, including on health aspects | Yes, in a limited form | The onboarding safety routing evaluates answers and makes suggestions more cautious (currently switched off). Check-ins are also used on the device to offer lighter sessions and weekly reviews. |
| Automated decision with legal or similarly significant effect | No | The routing only makes suggestions more cautious, denies nothing and can be changed by the user (section 4.7). |
| Innovative technology, including AI | Partly | A personalised training and nutrition engine running on the device; AI reading of food labels; further AI features are planned. The iPhone app's internal test screen tries an on-device language model, with nothing leaving the phone. |
| Large scale | Not at present | 11 accounts. Growth is expected at public launch or an App Store release. |
| Denial of service based on special category data | No | Under-18s are refused on age, not health. Declining health consent limits the service (D7). |
| Children | Not intended | The service is for adults aged 18 and over. Use by under-18s is risk R4. |

---

## 2. Description of the processing

### 2.1 Nature of the processing

**Surfaces.**
- **The web app** at app.tilo.fit: a progressive web application hosted on GitHub Pages. This is the
  main subject of this assessment.
- **The iPhone app**: a native application sharing the web app's core logic, consent gate, data
  synchronisation, server enforcement, withdrawal and deletion. It is described in section 2.5.
- **The website** at www.tilo.fit: built on Webflow and delivered through Cloudflare, with an
  early-access email form protected by Cloudflare Turnstile and a single Cloudflare security cookie.
  The website's processing is low risk and is included in this assessment for transfers (R7).

**Collection.** All data in the app is entered by the user: at sign-up, on the consent screen, in
the daily log, in Profile and, when switched on, in the onboarding wizard. The only data obtained
from third parties is the Google identity of users who choose Google sign-in, the Apple identity of
users who choose Sign in with Apple in the iPhone app, and product data from Open Food Facts when a
user scans a barcode. Open Food Facts is an independent controller; the device contacts it
directly, so it receives the barcode and the user's IP address.

**Storage on the device.** The app works offline first. The user's log, profile, settings and
consent records are held in the browser's local storage (or, in the iPhone app, the app's own
storage). Some items are kept on the device only and are never uploaded: the kitchen list, the
onboarding draft (outcomes only), private Unload notes, the reminder delivery log, the shared
product cache and the session token. The app does not encrypt local storage itself; it relies on the
device's own protection.

**Consent gate.** After sign-in, the consent screen presents three separate, unticked boxes: health
data, the terms of use, and confirmation that the user is 18 or over. Continuing records a health
consent at the current consent version. Until there is a current consent, nothing but the consent
record itself is uploaded. A user who already has data on the device may choose "Not now" and keep
it on the device only; a new user who chooses "Not now" is signed out (D7).

**Synchronisation.** With current consent, the device synchronises each record with the cloud
database (last write wins). Synchronised data covers the profile, the daily log, the user's own
foods, recipes, workouts and training plans (including the reasons Tilo gives for a plan), and push
reminder subscriptions. Consent records are kept in an append-only table. A daily count of label
reads is kept for 60 days. The reminder service keeps a record of the last day a reminder was sent.

**Server enforcement.** A database rule on every table holding health data refuses any upload from
an account whose latest health answer is not a yes. Each user can access only their own rows
(row-level security on every table). The public key embedded in the app reaches no data without a
signed-in session. The privileged service key is used only inside server functions and scheduled
database jobs.

**Server functions.**
- **Account deletion** verifies the user's session, requires a sign-in within the last five minutes
  (waived only for a new account being deleted under the under-age stop), ends every session,
  deletes the user's rows in every table holding user data, and then deletes the login.
- **Reminders** run on a schedule, skip anyone without current health consent, and send encrypted
  web push messages with fixed text.
- **Label reading and the shared product list** (Annex A).
- **Scheduled clean-up**: a daily deletion of logs held without a health consent answer (below) and
  a 60-day deletion of label-read counts.

**Withdrawal of consent.** Profile, then Privacy, then Withdraw. The device records a "no", clears
every health field and health-derived plan reason, deletes the onboarding draft and asks the server
to delete the account's copy of the log in a single transaction, which the server performs only while
the latest answer is "no". Each of the user's other devices applies the same clearance when it next
connects. Consent records and the account itself remain.

**Deletion.** "Delete account" deletes the account and all its cloud data and then clears the
device. "Sign out and remove this device's log" clears the device only.

**Deletion of pre-consent data.** Some accounts uploaded data before the consent screen existed. For
any account with no health consent answer, the cloud log is deleted 30 days after the later of
28 September 2026 and the account's creation. For existing accounts this took effect on
28 October 2026. The controller decided not to send notice emails (D2). The deletion job ran
successfully on 28 and 29 October 2026 and runs daily. No account now holds a cloud log without
current health consent. Consent records are never deleted by this job, and the device keeps its own
copy, which is uploaded again if the user later consents.

**Processors and other recipients.**

| Recipient | Role | Location | Data received |
|---|---|---|---|
| Supabase Inc. | Processor: database, authentication, account emails, server functions, scheduled jobs | Project hosted in the EU (Ireland); Supabase Inc. is a US company | All synchronised data, account email and password hash, request logs |
| GitHub Inc. (Pages) | Processor: app hosting | United States | IP address, user agent, request times |
| Webflow Inc., with Cloudflare and Amazon CloudFront | Processor: website and early-access form; delivery and bot protection | United States and global | Early-access email addresses, website request data, bot-check signals |
| BunnyWay d.o.o. (Bunny.net) | Processor: exercise demonstration videos and preview images | Slovenia (to be confirmed) | IP address and request data when a demonstration is shown |
| Anthropic Ireland, Limited (Commercial Terms) | Processor: reads food label photos (Annex A) | Processing likely in the United States | The photos only, with no identifier |
| Google (Workspace) | Processor: email for feedback and rights requests | United States and global | Emails sent to the privacy contact |
| Google (sign-in) | Independent controller | Global | Only for users who choose Google sign-in |
| Apple (Sign in with Apple) | Independent controller for the sign-in | United States | Only for iPhone app users who choose it |
| Apple, Google and Mozilla web push services | Deliver reminders | Global | An encrypted message with fixed text |
| Apple Push Notification service | Would deliver iPhone reminders; not in use | United States | Would receive the device token, timing and fixed text (Annex B, Part 3) |
| Apple (TestFlight, App Store Connect, device backups) | Platform; role and terms not yet recorded | United States | See section 2.5 |
| Open Food Facts | Independent controller | France | Barcode and IP address |

**Data flows.**
1. Device to local storage: everything the user enters.
2. Device to the cloud database (Ireland), over HTTPS, only with current health consent: the log,
   profile and plans.
3. Device to the cloud database: consent records, always, so the answer is known on the user's
   other devices.
4. Cloud database to device: the same data for the user's other devices.
5. Scheduled job to push service to device: reminders the user has turned on.
6. Device to Open Food Facts: a scanned barcode.
7. Device to the label-reading function to Anthropic: label photos the user takes (Annex A).
8. Device to GitHub Pages and Bunny.net: requests for app files and videos (technical data only).
9. The user's own mail application to Google Workspace: feedback and requests.
10. iPhone app: flows 1 to 7, plus Apple for sign-in, and the device's own backups (section 2.5).

### 2.2 Scope of the processing

**Categories of data.**
- **Account:** email address and password hash; for Google sign-in, email, name and avatar address;
  for Sign in with Apple, the email address or an Apple relay address and Apple's user identifier,
  with no name.
- **Profile:** name, sex (female, male or prefer not to say), age, height, weight, body fat,
  activity level, goal, pace, diet pattern, supplements, targets and ranges, display preferences
  (including Gentle mode), hand-portion sizes, if-then plans, and training preferences, including
  body areas to take care with and a free-text note about limitations.
- **Daily log:** foods and portions, supplements taken, body weight, workouts and sessions, and
  check-ins (mood, hunger, sleep, stress, energy, soreness, a note). The user's own foods, recipes,
  workouts and weekly plans.
- **Onboarding outcomes** (wizard currently switched off): a readiness outcome (clear or flagged,
  from questions on heart conditions, dizziness, pregnancy and recent surgery), a medical outcome
  (clear, flagged or no deficit, from questions on diabetes treated with medicines that can cause low
  blood sugar, kidney disease and weight-loss injections) and a baseline outcome (from sleep, stress
  and capacity for change). **Only the outcome is stored, never the individual condition, medicine or
  symptom.** This is tested automatically. A "flagged" medical outcome can suggest kidney disease
  (section 4.2).
- **Pregnancy:** a single flag (pregnant and breastfeeding are not distinguished), when it was asked
  and when the user deferred the twelve-weekly re-check.
- **The wellbeing answer** on how food and weight feel: yes, sometimes, no or prefer not to say, and
  the user's later answers to optional offers of a food range. This is a proxy for disordered eating
  and is the most sensitive single item.
- **Other onboarding answers:** motivations (chosen options or up to 60 characters of the user's own
  words), daily movement, whether a calorie deficit was chosen, and the time each answer was given.
- **Plan reasons:** short coded reasons attached to plans and workouts, some derived from health
  answers.
- **Derived but not stored:** a body mass index below 18.5 is used only to prevent a calorie deficit;
  it is never shown or stored.
- **Reminders:** push subscription details, supplement names and times.
- **Consent records:** type, version, answer and time.
- **Technical data:** IP address, user agent and request times in provider logs.
- **Website:** early-access email address; bot-check signals; the Cloudflare security cookie.
- **iPhone app only:** short-lived label photo files; a reminder delivery list kept on the device;
  an Apple push device token (not in use). The Cycle log is built but outside this approval
  (Annex C). Nothing from Apple Health is stored (Annex D).

**Volume (as at 24 November 2026, from counts only; no record content was read).** 11 accounts, of
which 9 have a Google identity and 2 an Apple identity; 4 accounts with any cloud log; 7 accounts
whose latest health answer is a yes; 4 accounts that have never answered the consent screen; no
account with a cloud log and no current consent; 4 accounts inactive for 60 days; 1 push
subscription; no entries on the shared product list. Not known: how much data is held on devices
only (by design the server cannot see it), the number of early-access emails held by Webflow, and
the expected number of users at public launch.

**Retention.**
- Account data: while the account exists; deleted from the live database at once on account
  deletion.
- Log, profile, settings and reminders: until withdrawal, the deletion of pre-consent data (where no
  answer is given) or account deletion.
- Consent records: until account deletion.
- Accounts: no end date at present (R11). The controller has decided on deletion after 12 months of
  inactivity, with notice (D6); this is not yet built.
- Database backups: expire on the provider's cycle. The backup window for the current plan is not
  yet recorded.
- Provider logs: each provider's own retention, not yet recorded for each provider.
- On the device: until the user deletes it, clears browser data or removes the app. In the iPhone app
  the data is also included in the device's backups (section 2.5, D14).
- Early-access emails: until the user is invited and early access ends, or on request.

### 2.3 Context of the processing

- **Users:** adults aged 18 and over who wish to track food, training and body measurements. At
  present a closed group of testers.
- **Relationship and control:** a direct consumer relationship with a free service. Users enter all
  data themselves and can view, edit, export and delete it within the app.
- **Expectations:** users of a health application reasonably expect their data to be private, not
  sold and not used for advertising. Tilo has no advertising, analytics or tracking, and the privacy
  policy says so. Users are likely to expect synchronisation across devices; they may not have
  expected that data logged before consent was requested had already been uploaded, which is why the
  deletion of pre-consent data was carried out.
- **Vulnerable people:** likely to include some. A diet and weight application attracts people with a
  difficult relationship with food; pregnant and breastfeeding people may use it; people with
  diabetes on insulin or sulfonylureas are at risk of low blood sugar if they eat less. The terms
  advise these groups to consult a GP and not to use Tilo to guide their eating. The onboarding
  wizard, when switched on, identifies some of them and makes Tilo more cautious.
- **Children:** not intended, but a diet application may appeal to teenagers (R4, D8).
- **State of the art:** health and fitness applications are an area of public concern about sharing
  with advertisers and data brokers; Tilo shares with neither. Offline-first storage, owner-only
  access controls and consent enforced on the server are above the norm for a small application.
  Below the state of the art: no client-side encryption of local data or exports, no multi-factor
  sign-in for users, and no independent security test yet.
- **Codes and guidance:** ICO guidance on special category data and on DPIAs; the ICO Age
  Appropriate Design Code (not applicable while under-18s are excluded and the service is not likely
  to be accessed by them: D8); MHRA guidance on software as a medical device; the CAP Code,
  sections 12 and 15, for marketing claims.
- **Apple:** the iPhone app reaches users through Apple, runs on Apple's platform and backups, and
  would use Apple's push service. Apple's App Store Review Guidelines (5.1.1 and 5.1.3) and privacy
  disclosure requirements add obligations of their own.
- **Change of controller:** a separate company is planned before public launch. This will require a
  new controller, new legal texts, fresh consent and a review of this assessment (R13).

### 2.4 Purposes

- To provide the service the user requested: store and synchronise their log, calculate targets,
  ranges and trends, suggest meals and workouts, build weekly plans and send reminders the user has
  turned on.
- To keep users safe within a general wellness service: make suggestions more cautious for users who
  say they are pregnant, have certain conditions, have a difficult relationship with food, or have
  little sleep or capacity for change, and signpost them to the GP, midwife, NHS 111, Beat and
  Samaritans.
- To demonstrate what users agreed to and when.
- To keep accounts and the service secure, respond to requests and meet legal obligations.
- To invite people on the early-access list (website).

The benefit to the user is a private, offline-capable log with suggestions that respect their health
situation. The benefit to the controller is a product it can launch. No purpose involves selling
data, advertising, research or profiling for any third party.

### 2.5 The iPhone app (internal testing)

**Status.** A native iPhone app has been built that reuses the web app's shared logic without change,
and so uses the same database, consent gate, synchronisation, server enforcement, withdrawal and
deletion. As reported by the development team, it is distributed through Apple's TestFlight internal
testing to two members of Gravita's core team, Benn and Sara, who are informed about how it
works. The date on which TestFlight distribution began is not recorded. Because the only testers are
the controller's own core team, the privacy policy text specific to the iPhone app (written, not yet
published) may wait until anyone else is given a build.

**Differences from the web app.**

| Area | Description | Position |
|---|---|---|
| Storage | The same data as the web app, held in the app's own storage, protected until the first unlock after a restart, and included in the device's backups so that a restored phone keeps records not yet synchronised. The session token is held in the device keychain, on that device only. | In use in testing. Backups are D14 and R31. |
| Sign in with Apple | Email only, no name. Apple is an independent controller for the sign-in. A user who chooses Apple's "Hide My Email" receives a separate account. Revoking Apple's sign-in token on account deletion (App Store Review Guideline 5.1.1(v)) has been written but not deployed; until it is, the user can remove the link in their Apple Account settings. No Tilo data remains either way. | In use in testing. Revocation required before anyone beyond the core team. |
| Reminders through Apple's push service | Written, not deployed. Apple's push service protects messages in transit but not end to end, so Apple could read the alert text and sees the device token and timing. | Not in use. Requires Annex B, Part 3 to be approved. |
| Notification extension | Records the identifier, type and time of each Mind reminder received (no text, at most 60 entries) in storage shared only by the app and its extension, for the on-device delivery log. Never synchronised. | Built; inactive until iPhone reminders are in use. |
| Label photos | The same label-reading path as the web app (Annex A). Photos are held only in a protected temporary folder, re-encoded without metadata before sending, and deleted once the read completes, when the screen closes or at the next launch. | In use in testing. No new risk beyond Annex A. |
| Export | The same unencrypted file as the web app, passed to the iPhone share sheet. | In use in testing (R1b). |
| Internal test screen | For the core team and the development team only. On request, it reads the previous night's sleep and the day's walking from Apple Health and displays them without keeping them; runs Apple's on-device language model on a typed meal (nothing leaves the phone); and, in test builds, shows recent error lines held in memory. The app carries Apple Health read access for this purpose. | Processing on the device only; nothing stored or sent. Must not reach anyone beyond the core team. |
| Cycle | Built behind a switch that is off by default (Annex C). It is not established whether any build distributed through TestFlight enables it. | Outside this approval. |

**Apple's roles.** Apple appears in four roles, none yet recorded in a contract review: (1)
independent controller for Sign in with Apple; (2) the push service, which would process the device
token, timing and alert text, under terms not yet recorded and requiring a transfer mechanism to the
United States (D4); (3) the distribution platform (TestFlight and App Store Connect), which can send
the developer crash reports and tester feedback; and (4) the device's own backups, where iCloud
Backup is a service Apple provides to the user under the user's own contract, not a processor for
Tilo, but into which Tilo's storage choice places health data (D14). App Store Review Guideline
5.1.3(ii) prohibits storing personal health information obtained from HealthKit in iCloud, which
Annex D must meet.

**Required before the iPhone app reaches anyone beyond the core team** (an external TestFlight group
or the App Store): the iPhone privacy text published; Sign in with Apple revocation deployed; D14
decided and implemented; the App Store privacy label and privacy manifest completed; Annex B, Part 3
approved before iPhone reminders go live; Apple's terms recorded (D4); the internal test screen and
diagnostics removed from that build; an 18+ age rating (D8); and unused Apple Health records access
removed.

### 2.6 Features built but outside this approval

The following are described for completeness. They are not approved by signing this document, and
each requires its own addendum and approval.
- **Cycle** (iPhone app only): menstrual cycle logging, kept on the device, with a separate explicit
  consent. Built and switched off by default. Draft addendum at Annex C.
- **Apple Health import** (iPhone app only): planned import of sleep, steps and walks. Not built.
  Placeholder at Annex D.
- **iPhone reminders through Apple's push service**: written, not deployed. Proposed addendum at
  Annex B, Part 3.

---

## 3. Consultation

**Consultation carried out.**
- Internal reviews of the consent synchronisation, the "Not now" option, server enforcement, the
  deletion of pre-consent data, the under-age stop and account deletion, from a data security
  perspective. The device-side under-age stop has not yet had a recorded security review.
- Reviews of the onboarding wording and safety routing, and of the training engine's wording, from a
  mental health and wellbeing perspective.
- Reviews of the onboarding targets and energy calculations from a nutrition accuracy perspective.
- Pre-release quality review of the onboarding build.
- Security, wellbeing, design and compliance reviews of the Cycle build; compliance and security
  approval, as a draft, of the Apple Health design; security and quality reviews of the iPhone app.
- The controller's own decisions, each recorded with its date in the working record, including the
  change of name, the Cycle and Apple Health decisions, and the decision not to seek legal advice at
  this stage (D15).

These reviews were carried out by AI agents working on the product. They are recorded and useful,
but they are not independent professional reviews.

**Consultation not yet carried out.**
- **A clinician** on the wellbeing question, the readiness and medical questions and the safety
  routing (D1), required before wider launch.
- **A solicitor or privacy professional** on the legal texts and this assessment, in particular on
  consent as a condition of service (D7), the legal basis for consent records (D10), the Article 22
  analysis (section 4.7), the prior consultation view (section 7.3) and the Cycle offer under the
  Equality Act 2010. Not sought, by the controller's decision (D15); scope of that decision:
  [Decision D15 pending]. To be reconsidered before public launch, an App Store listing, the change
  of controller or any paid tier, and before Cycle goes beyond Benn and Sara if the Cycle residuals
  stay high.
- **Apple's terms** for the push service, TestFlight and Sign in with Apple, read for their data
  protection provisions (D4).
- **Users.** No users outside the product team have been consulted. Before public launch, a short
  test with a small number of people (including, if possible, someone with lived experience of an
  eating disorder, reached through a charity such as Beat rather than by recruiting patients) on the
  clarity and acceptability of the consent screen and the health questions is recommended. Article
  35(9) asks for the views of data subjects "where appropriate"; the decision is recorded in
  section 7.
- **Processors:** confirmation of their data processing agreements and security terms (D4).
- **A Data Protection Officer:** none appointed (D12).

---

## 4. Necessity and proportionality

### 4.1 Lawful basis

| Data | Article 6 basis | Article 9 condition | Notes |
|---|---|---|---|
| Account (email, password hash, Google or Apple identity) | 6(1)(b) contract | Not required | Google and Apple are independent controllers for their sign-in. |
| Profile, log, own foods, recipes, workouts, plans and plan reasons | 6(1)(b) | 9(2)(a) explicit consent | Food and workout records treated as health data as a conservative position. |
| Onboarding outcomes, pregnancy, wellbeing, motivations, movement | 6(1)(b) | 9(2)(a); each question optional, with a notice on its screen | Asked only after health consent has been given on the device. |
| Reminders (push subscription, supplement names) | 6(1)(b) | 9(2)(a) | The server checks consent before sending. |
| Consent records | 6(1)(c) legal obligation (Article 7(1)) | 9(2)(f), to the extent a record is special category | D10. |
| Pre-consent log held for the 30-day transition | Unclear | None identified | A time-limited risk accepted by the controller on 28 September 2026. Ended with the deletion on 28 October 2026. No legal view was sought (D15). |
| Security and request logs | 6(1)(f) legitimate interests | Not required | |
| Feedback emails | 6(1)(f) | 9(2)(a) at most, if a user volunteers health details; users are asked not to | |
| Early-access email (website) | 6(1)(a) consent | Not required | |
| Cycle log and Cycle consent record | 6(1)(b); records 6(1)(c) | 9(2)(a), separate Cycle consent; records 9(2)(f) | Annex C; outside this approval. |
| Apple Health summaries (planned) | 6(1)(b) | 9(2)(a), separate consent | Annex D; not processing. |

**Validity of explicit consent.** The consent is explicit (a separate, unticked box for health
data), specific, and not bundled with marketing (there is none). It appears on the same screen as the
terms and the age confirmation, but in separate boxes. It is as easy to withdraw as to give
(Profile, then Privacy). It is informed: the published privacy policy describes what the live app
does (as checked on 30 September 2026 and republished under the Tilo name; not re-checked for this
version). The onboarding sections of the policy are written but not published, which is correct while
the wizard is switched off; they must be published with the release that switches it on. The open
question is whether consent is freely given when it is a condition of using the service (D7, R12).

### 4.2 Data minimisation

- **Outcomes-only storage** for the readiness, medical and baseline questions: Tilo stores the
  outcome, never the condition, medicine or symptom. This is the most important minimisation measure
  and is tested automatically. Residual inference: a "flagged" medical outcome arises from a kidney
  disease answer, or from an answer given before the medical outcome was divided, and so can suggest
  kidney disease. It is needed to set the protein figure (storing the figure would reveal the same),
  it is treated as health data, and the question notice and privacy policy say so.
- Pregnancy and breastfeeding are stored as a single flag.
- Body mass index is calculated for a safety check and never stored.
- The kitchen list and the onboarding draft never leave the device.
- All onboarding questions are optional except age and goal; a skipped answer leads to cautious
  defaults, not a further prompt.
- After withdrawal, only name, age, legacy sex, units, goal, Gentle mode and the onboarding date are
  kept, on the device only. Gentle mode being on may hint at the wellbeing answer; it remains only on
  the user's own devices.
- Tilo does not collect location, contacts, device identifiers or analytics.
- The wellbeing answer is stored as given because the user can view and edit it in Profile and the
  routing depends on it. This is justified, and is to be included in the clinical review (D1).

### 4.3 Accuracy

Users enter and correct their own data; most fields, including health answers, can be edited in the
app. Nutrition values cite a source and show a margin of error. Where a user has several devices,
answers carry a timestamp so that an older answer does not overwrite a newer one. The pregnancy flag
is re-checked every twelve weeks so that it does not become out of date. Returning the sex answer to
"prefer not to say" requires an email request.

### 4.4 Retention

Retention is set out in section 2.2. Withdrawal and the deletion of pre-consent data remove the
cloud copy automatically. Gaps: no end date for inactive accounts (R11, D6); the backup window and
provider log retention are not yet recorded.

### 4.5 Transparency

The privacy policy, terms of use and cookie policy are published on the website and linked from
sign-up, the consent screen and Profile. The consent screen, each health question and the withdrawal
prompt explain in context what will happen. Publication is blocked automatically if the texts
contain unfilled placeholders. The privacy policy describes the safety routing.

### 4.6 Individual rights

- Access and portability: export of all data as a file, at any time.
- Rectification: in the app, otherwise by email.
- Erasure: account deletion, or removal of the device's log.
- Withdrawal of consent: Profile, then Privacy.
- Restriction and objection: by email.
- Requests by email to the privacy contact are answered within one month.

Gap: there is no written internal procedure for handling email requests or verifying identity.

### 4.7 Automated decision-making (Article 22)

The onboarding safety routing is automated processing of health data that changes what the user is
offered: a gentler start, no calorie deficit, no calorie number, Gentle mode and signposting. In the
assessor's view it is not a decision "based solely on automated processing … which produces legal
effects concerning him or her or similarly significantly affects him or her", because it only ever
makes Tilo more cautious, refuses no service, product or price, and is driven by answers the user can
see, change or clear in Profile. The privacy policy states that it has no legal or similarly
significant effect. In any event it relies on explicit consent under Article 9(2)(a), which would
also satisfy Article 22(4) if a different view were taken. This analysis has not been reviewed by a
lawyer (D15).

### 4.8 Medical device boundary

The routing does not diagnose, predict disease or adjust medication; it withholds a calorie deficit
and signposts. This keeps Tilo within general wellness, as the terms state. Whether the MHRA would
agree for this specific design is not known; a short qualification note against the MHRA's guidance
on software and AI as a medical device before public launch would settle it. Any future feature that
interprets symptoms, flags a condition or suggests medication changes requires a fresh assessment.

Where a user indicates kidney disease, Tilo withholds higher protein targets and shows the general
adult reference amount (0.75 g per kg of body weight); it does not set a condition-specific intake
and names no condition or guideline beside the figure. For diabetes or a weight-loss injection, the
protein range is presented as Tilo's ordinary range, never as one for the medicine.

Cycle (Annex C) and the planned Apple Health import (Annex D) each carry their own statement of
intended purpose (general wellness; no forecasting, fertility, contraception or diagnosis of a sleep
or menstrual disorder). An optional MHRA borderline enquiry before public launch would cover them
together with the onboarding routing.

### 4.9 Processors and international transfers

The database is hosted in Ireland, but Supabase Inc. is a US company and may access it from the
United States. GitHub, Webflow, Cloudflare and Google operate in the United States or globally;
Apple Inc. is in the United States. The privacy policy relies on the UK International Data Transfer
Agreement or UK Addendum, the EU Standard Contractual Clauses, or the UK-US and EU-US Data Privacy
Framework.

The data processing agreements with Supabase, Webflow, Bunny.net, Google Workspace, GitHub and
Cloudflare, and the transfer mechanism for each US provider, are not yet recorded (D4). The Anthropic
agreement and mechanism are recorded (Annex A). Apple's terms are not recorded. A transfer risk
assessment is required wherever the IDTA or UK Addendum is relied on, and will be completed once the
mechanisms are known.

---

## 5. Risk assessment

Scoring follows the ICO template. Likelihood is remote, possible or probable; severity is minimal,
significant or severe; the combination gives an overall risk of low, medium or high. Scores in this
section are inherent risks, before the measures in section 6. Risks R14 to R18 and R30 are assessed
in Annex B, R19 to R22 in Annex A, and R23 to R29 in Annex C.

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R1 | **Breach of, or unauthorised access to, health data in the cloud** through an access control error, a leaked service key, a flaw in a server function, a compromised administrator account or a stolen user session, exposing logs, pregnancy status or the wellbeing answer. The app's public key is public by design, so access control is the only barrier for database access. | Possible | Severe | High |
| R1b | **Exposure on the device or in exports**: a shared or lost device, or an unencrypted export file left in downloads or shared by mistake, reveals the log. | Possible | Significant | Medium |
| R2 | **Health data reaching the cloud without consent** through a defect, an old app version or a device that has not yet received a withdrawal; and data uploaded before the consent screen existed held without an Article 9 condition. | Possible (it has occurred in the past) | Significant | Medium |
| R3 | **Incorrect safety routing or advice harms someone**: a person with an eating disorder is given a deficit or a weight focus; a pregnant person or someone on insulin or sulfonylureas is steered to eat less; someone treats Tilo as medical advice. The routing depends on self-report and on the wizard being switched on; it is currently off, so the app relies on the warning in the terms. | Possible | Severe | High |
| R4 | **An under-18 uses Tilo**: diet and weight features are used by a child, whose data then requires the protections of the Age Appropriate Design Code. | Possible | Significant | Medium |
| R5 | **Loss of data**: data held only on a device (after "Not now", withdrawal or before synchronisation) is lost with the device; the deletion of pre-consent data removed cloud copies without notice emails (devices kept their own copy); there is no user-level restore from backups. | Possible | Significant | Medium |
| R6 | **Withdrawal not fully honoured**: other devices keep health fields until they next connect; database backups keep deleted rows until they expire; export files and a temporary copy on the device keep data; some fields are kept by design. | Possible | Significant | Medium |
| R7 | **Transfers to US processors** without a recorded mechanism or processing agreement, leaving data exposed to access under laws with weaker protection and without enforceable contractual terms. | Possible | Significant | Medium |
| R8 | **Function creep, including AI**: planned AI features send health data to an AI provider, or data is reused for purposes users did not agree to. Label reading (pack photos only) is in use (Annex A); the iPhone internal test screen tries an on-device model. | Possible | Significant | Medium |
| R9 | **Processing on the device treated as outside data protection law**: Tilo's software processes data on the device even when nothing is uploaded, so device-only processing still needs a lawful basis, transparency and rights. If it were treated as out of scope, those protections could be missed. | Possible | Minimal | Low |
| R10 | **ICO data protection fee not paid**: a legal requirement on the controller; not a direct harm to individuals, but an indicator of weak governance and a regulatory exposure. | Probable | Minimal | Medium (compliance) |
| R11 | **Inactive accounts kept without an end date**: email addresses and consent records, which reveal use of a health application, are kept indefinitely after a user stops using Tilo. | Probable | Minimal | Low |
| R12 | **Consent not freely given**: new users can use Tilo only if they consent (D7), which a regulator could regard as conditional consent. | Possible | Significant | Medium |
| R13 | **Change of controller**: when the planned new company takes over, consents given to Gravita Creative Ltd do not transfer automatically and data could be moved without a lawful basis. | Probable (planned) | Significant | Medium |
| R31 | **iPhone backups contain the whole log**: the iPhone app's data (the log, Unload notes and, once used, the Cycle log) is copied into the device's iCloud or computer backups, where it survives withdrawal, account deletion and removal of the app until the backup is replaced, and is exposed if the backup account or computer is compromised. | Possible | Significant | Medium |
| R32 | **Sign in with Apple not revoked on account deletion**: until revocation is deployed, a deleted account leaves Tilo listed in the user's Apple Account sign-in settings until the user removes it. No Tilo data remains. | Probable (as deployed) | Minimal | Low |

---

## 6. Measures to reduce risk

"In place" means implemented at the date of this assessment. "Recommended" means not yet
implemented. The Status column records which applies; the controller records approval of each
recommended measure in the Approved column.

| Risk | Measures | Effect on risk | Residual risk | Status | Approved |
|---|---|---|---|---|---|
| R1 | **In place:** owner-only access control on every table, with narrower rules for consent records and usage counts; the public key reaches no data without a session; the service key is confined to server functions and scheduled jobs; account deletion verifies the session, requires a recent sign-in and ends all sessions first; the reminder job checks a secret in constant time; server functions log counts only, never identifiers or content; outcomes-only storage limits what a breach could reveal; leaked-password protection is on; HTTPS throughout. The provider's security adviser reports two low-level warnings, one of which is intended. | Reduces likelihood to remote. Severity cannot fall below severe for this data. | Medium | In place |  |
| R1 | **Recommended:** a written breach procedure with a named owner (D11); multi-factor authentication on every administrator account (database, code hosting, website, email); an independent security test of access controls and server functions before public launch; offer multi-factor sign-in or passkeys to users later; move a database extension out of the public schema. | Reduces likelihood further and improves response. | Medium | Recommended | [Section 6 decision pending] |
| R1b | **In place:** device data is confined to the app; "Sign out and remove this device's log"; a different account signing in on the same device cannot see the previous user's data. | Reduces severity and likelihood. | Low | In place |  |
| R1b | **Recommended:** a line on the export screen stating that the file contains health data and should be kept private (a wording change requiring design approval). | Reduces likelihood of accidental sharing. | Low | Recommended | [Section 6 decision pending] |
| R2 | **In place:** unticked consent boxes; nothing but consent records is uploaded without current consent; the server refuses health data without current consent; reminders skip anyone without consent; health questions are shown and saved only after consent on the device; pre-consent cloud data is deleted automatically and the deletion has run. | Reduces likelihood to remote. | Low | In place |  |
| R2 | **Recommended:** keep the deletion job running for new accounts that never answer, and check its run history at each review. | Maintains the position. | Low | Recommended | [Section 6 decision pending] |
| R3 | **In place:** the terms state that Tilo is not medical advice and list who should consult a GP and not use Tilo to guide their eating; the routing only ever makes Tilo more cautious; skipped answers give cautious defaults; pregnancy holds food at maintenance with no calorie number; the medical outcome removes the deficit and adds a GP note, with protein limited as described in section 4.8; a "yes" to the wellbeing question turns on Gentle mode (no calorie target, totals in words, a maintenance range only if requested), a "sometimes" gives a maintenance range only; both remove the weight figure from the home screen, stop automatic training increases and signpost Beat, NHS 111, Samaritans and emergency services; a body mass index below 18.5 prevents a deficit; targets are ranges with neutral wording; internal wellbeing and nutrition reviews; the pregnancy flag is re-checked every twelve weeks. | Reduces likelihood and severity. | Medium with D1 done; high without D1 beyond closed testers | In place |  |
| R3 | **Required or recommended:** clinical review before the wizard reaches anyone beyond closed testers (D1); correct the wording that says weight is hidden while two screens still show it, before the wizard is switched on at all; publish the onboarding policy text with that release; decide what the live app, which has no screener while the wizard is off, shows new users about these groups; a short MHRA qualification note (section 4.8); keep marketing free of health claims (CAP Code sections 12 and 15). Switching the wizard on for closed testers before D1: [Decision pending: onboarding for closed testers]. Enforcement of closed testing: sign-up is technically open to anyone with the link, whether new sign-ups are disabled in the database provider's authentication settings has not been verified, and one account was created on 16 November 2026; [Decision D13 pending]. | Reduces likelihood; D1 reduces the residual from high to medium. | As above | Recommended | [Section 6 decision pending] |
| R4 | **In place:** 18+ in the terms and privacy policy; a required age confirmation on the consent screen; in the wizard, an age question that stops under-18s, clears the device and deletes the new account; the privacy policy explains how to report use by a child. | Reduces likelihood. | Medium; low once the wizard's age stop is live | In place |  |
| R4 | **Recommended:** a written assessment of whether the service is likely to be accessed by children (D8); mark or remove an under-age account that never signs in again; a security review of the device-side under-age stop. | Reduces likelihood and closes a gap. | Low once done | Recommended | [Section 6 decision pending] |
| R5 | **In place:** export at any time; the terms and cookie policy warn that device-only data is lost with the device or browser data; the "Not now" and withdrawal screens say where the data is and offer an export first; the pre-consent deletion kept the device's copy, which is uploaded again on later consent; "Start fresh" needs a second confirmation with an export option beside it. | Reduces likelihood. | Low | In place |  |
| R5 | **Recommended:** record the database backup window. | Improves transparency. | Low | Recommended | [Section 6 decision pending] |
| R6 | **In place:** the device clears all health fields, health-derived plan reasons and its temporary copy at once; the cloud copy is deleted in one transaction; each other device clears on next connection; the server refuses uploads after a "no", so an out-of-date device cannot restore data; the daily deletion removes any log left more than a day after a "no"; the privacy policy states exactly what remains. | Reduces likelihood to remote. | Low | In place |  |
| R6 | **Recommended:** record the backup window and state it in the privacy policy if it is long; state in the policy that export files are the user's own copy. | Improves transparency. | Low | Recommended | [Section 6 decision pending] |
| R7 | **In place:** the database is hosted in Ireland; web push messages are encrypted end to end; the privacy policy names each provider and the safeguards relied on. | Limits exposure. | Medium until D4 is complete | In place |  |
| R7 | **Required:** accept each processing agreement and record the transfer mechanism for each provider, Apple included (D4). **Optional:** route Open Food Facts lookups through a server function so the user's IP address no longer reaches it. | Provides enforceable terms; reduces likelihood. | Low once D4 is complete | Recommended | [Section 6 decision pending] |
| R8 | **In place:** label reading is assessed in Annex A (photos only, no identifiers); other AI features remain switched off; the label-reading function checks the user's acknowledgement on the server and logs no content; the on-device model keeps everything on the phone; purposes are listed and there is no secondary use; AI, analytics, error tracking, email marketing and paid tiers are recorded as changes requiring compliance review first. | Reduces likelihood. | Low | In place |  |
| R8 | **Recommended:** update this assessment before any further AI feature is enabled, covering the provider's processing agreement, data retention, the transfer and its risk assessment, disclosure to users that they are dealing with AI (EU AI Act Article 50) and the absence of solely automated decisions. | Prevents unassessed creep. | Low | Recommended | [Section 6 decision pending] |
| R9 | **In place:** the privacy and cookie policies describe device-only data and how long it is kept; the same consent gate applies to health questions on the device; withdrawal clears health fields on the device; export and deletion cover the device. **Recommended:** treat any new device-only store as a policy change. | Ensures device processing is covered. | Low | In place and recommended | [Section 6 decision pending] |
| R10 | **In place:** the pre-release legal check warns while the ICO registration number is not recorded. **Required:** pay the fee and record the number (D3); the new company will need its own registration. | Removes the exposure once paid. | Medium until paid; low after | In place and recommended | [Section 6 decision pending] |
| R11 | **In place:** none for accounts (the pre-consent deletion removes the log, not the account). **Decided, not built:** deletion after 12 months of inactivity, with notice (D6). This requires a means of sending notices (a new processor), a scheduled job, privacy text and a register entry. | Sets an end date. | Low | Decided, not built | [Section 6 decision pending] |
| R12 | **In place:** separate unticked boxes; no marketing bundled; withdrawal is easy and leaves food and workout logging usable on the device; existing users can choose "Not now" without losing data. **Recommended:** obtain a legal view on D7 when legal advice is reconsidered (D15); consider allowing a new user who declines to keep a device-only log, as a user who withdraws can. | Reduces the risk that consent is found not freely given. | Medium, accepted without a legal view | In place and recommended | [Section 6 decision pending] |
| R13 | **In place:** the change of controller is planned: update the controller details and texts, ask everyone to consent afresh to the new company, and inform the early-access list. **Recommended:** review this assessment at that point; an agreement between the two companies; a new ICO registration; new processing agreements in the new company's name. | Ensures a lawful handover. | Low if the plan is followed | In place and recommended | [Section 6 decision pending] |
| R31 | **In place:** the store is protected until the first unlock after a restart; the session token is held on the device only, so a restored backup does not sign anyone in; label photos are kept outside the store. **Recommended:** exclude the whole store from iPhone backups (all data is held in the account, so a restore synchronises again; unsynchronised edits would be lost on restore), or keep it in backups and say so in the iPhone privacy text. Either before anyone beyond the core team. Apple Health data is kept out of backups in any case (Annex D). Controller's choice: [Decision D14 pending]. | Removes or discloses the exposure. | Low if excluded; medium until decided, limited to the core team's devices | In place and recommended | [Decision D14 pending] |
| R32 | **In place:** the revocation step is written and reviewed; deletion of Tilo's data never depends on Apple's response. **Recommended:** configure and deploy revocation before anyone beyond the core team (App Store Review Guideline 5.1.1(v)). | Completes deletion at Apple. | Low | In place and recommended | [Section 6 decision pending] |

---

## 7. Sign-off and outcomes

### 7.1 Sign-off

| Item | Name, signature and date | Notes |
|---|---|---|
| Assessment (sections 1 to 7) approved by | | Approves what the summary lists under "What approval of this document covers", and nothing under "What it does not cover". |
| Measures approved by | | Integrate approved measures into the project plan, with owners and completion dates. Approval of each recommended measure is recorded in section 6. |
| Residual risks approved by | | If accepting any residual high risk, consult the ICO before going ahead (section 7.3). |
| Onboarding wizard for closed testers | | [Decision pending: onboarding for closed testers]. D1 remains a condition for anyone beyond closed testers. |
| Closed testing enforced (D13) | | [Decision D13 pending] |
| iPhone backups (D14) | | [Decision D14 pending] |
| DPO advice | Not applicable: no Data Protection Officer is appointed (D12) | |
| Legal advice | | Not sought, by the controller's decision of 16 November 2026 (D15). Scope: [Decision D15 pending]. By signing, the controller accepts that the legal judgements in this assessment (D7, D10, section 4.7, section 7.3 and Annex C) are unreviewed by a qualified adviser. To be reconsidered before public launch, an App Store listing, the change of controller or any paid tier, and before Cycle goes beyond Benn and Sara if the Cycle residuals stay high. |
| Clinical advice | | Summary of the clinical review (D1), when carried out. Not yet carried out. |
| ICO prior consultation view | | Reasoned view in section 7.3. Record whether the controller agrees that prior consultation is not required. |
| Consultation responses (users) | | Whether users were consulted and, if not, why (section 3). |
| Review date | | [Review date pending] |
| This DPIA will be kept under review by | | |

### 7.2 Outcomes

- Processing may continue for the closed test group, and the iPhone app in internal testing for the
  core team, with the measures in place, provided D3 (ICO fee) and D4 (processing agreements and
  transfer mechanisms) are completed promptly. Both are owed now.
- The deletion of pre-consent data is complete.
- Before the onboarding wizard is switched on for closed testers: this assessment approved, the
  weight wording corrected, the onboarding policy text published with the release, and pre-release
  review passed. Closed testing should be enforced first: [Decision D13 pending].
- Before the wizard reaches anyone beyond closed testers: clinical review (D1) and an update of this
  assessment confirming the routing as reviewed.
- Before the iPhone app reaches anyone beyond the core team: the items listed in section 2.5,
  including D14 and approval of Annex B, Part 3.
- Before Cycle reaches anyone beyond the core team: Annex C completed and approved, with its
  conditions.
- Before any Apple Health data is stored, including in testing: Annex D completed and approved.
- Before public launch: D6, D8, D11 and D12 resolved, an independent security test, the Mind
  clinical review, legal advice reconsidered (D15), and the change of controller if the new company
  exists by then.
- Before any further AI feature: the R8 recommendations.

**Consolidated residual risk.**

| # | Risk (short title) | Residual | Where assessed |
|---|---|---|---|
| R1 | Cloud breach | Medium | Section 6 |
| R1b | Device and exports | Low | Section 6 |
| R2 | Cloud without consent | Low | Section 6 |
| R3 | Incorrect safety routing | Medium with D1; high without D1 beyond closed testers | Section 6 |
| R4 | Under-18 use | Medium; low once the age stop is live | Section 6 |
| R5 | Data loss | Low | Section 6 |
| R6 | Withdrawal not fully honoured | Low | Section 6 |
| R7 | US transfers | Medium until D4; low after | Section 6 |
| R8 | Function creep and AI | Low | Section 6 |
| R9 | Device processing treated as out of scope | Low | Section 6 |
| R10 | ICO fee | Medium until paid; low after | Section 6 |
| R11 | Inactive accounts | Low | Section 6 |
| R12 | Conditional consent | Medium | Section 6 |
| R13 | Change of controller | Low if the plan is followed | Section 6 |
| R14 | Unload notes exposed | Low | Annex B, Part 1 (approved) |
| R15 | Tilo treated as a crisis service | Medium only while access stays non-public; high otherwise | Annex B, Parts 1 and 4 |
| R16 | Reminders reveal Mind use | Low | Annex B, Part 1 (approved) |
| R17 | Signposting by nation | Low for the Mind context; medium until settled everywhere | Annex B, Parts 1 and 4 |
| R18 | Supplement name on the lock screen | Proposed low | Annex B, Part 2 (not approved) |
| R19 | Label photos kept or reused | Low | Annex A (approved) |
| R20 | Contribution traced to a person | Low | Annex A (approved) |
| R21 | Abusive text in a shared product name | Low | Annex A (approved) |
| R22 | Wrong figures on the shared list | Low | Annex A (approved) |
| R23 to R29 | Cycle | Draft only; R23 and R26 high | Annex C (outside this approval) |
| R30 | Reminder text readable by Apple | To be confirmed in the addendum | Annex B, Part 3 (not approved) |
| R31 | iPhone backups | Low if excluded; medium until D14 | Section 6 |
| R32 | Apple sign-in not revoked | Low | Section 6 |

### 7.3 ICO prior consultation: reasoned view

Article 36(1) requires prior consultation only where the DPIA indicates that the processing would
result in a high risk in the absence of measures taken by the controller to mitigate it, that is,
where a high residual risk remains after mitigation. On this assessment:

- R1 has severe severity, but with access controls, server enforcement, outcomes-only storage and the
  recommended breach procedure and administrator multi-factor authentication, its likelihood is
  remote: residual medium.
- R3 remains high only if the wizard's safety routing reaches anyone beyond closed testers without
  clinical review. With D1 done it is medium.
- R15 is medium only while access stays non-public. R23 and R26 (Cycle) are high for anyone beyond
  the core team, who are the controller's own people.
- R31 is medium and limited to the core team's devices.
- No other risk is high after the measures.

The assessor's view is that **prior consultation is not required for the processing as it runs at
the date of this assessment**, on condition that D1 is completed before the wizard reaches anyone
beyond closed testers, that closed testing is enforced in practice ([Decision D13 pending]), that
Cycle remains with the core team until Annex C's conditions are met, and that the R1 and R7
recommendations are in place before public launch. If D1 is not carried out, or a future feature
introduces a residual high risk, the ICO should be consulted first. This is a judgement, not a
certainty, and it has not been reviewed by a lawyer (D15).

### 7.4 Review

Review date: [Review date pending]. This assessment will be reviewed earlier if any of the following
occurs:
- the onboarding wizard is switched on for anyone beyond closed testers;
- any further AI feature is enabled;
- public launch, or a marked change in the number of users;
- the new company becomes controller;
- a new processor, software library, font service, analytics or error tracking tool; a new data
  field or table; a change to what is synchronised;
- the iPhone app reaches anyone beyond the core team, iPhone reminders go live, or Cycle or the Apple
  Health import goes beyond its current state;
- paid tiers are introduced;
- a personal data breach or a complaint;
- a change in the law or ICO guidance on health applications or AI.

### 7.5 Decisions referenced in this assessment

| # | Decision | Position |
|---|---|---|
| D1 | Clinical review of the wellbeing question and safety routing before the wizard reaches anyone beyond closed testers | Not yet carried out. Condition of wider use. |
| D2 | Notice emails before the deletion of pre-consent data | Closed: the controller decided not to send them. The deletion has run. |
| D3 | ICO data protection fee | Owed. Registration number not yet recorded. |
| D4 | Processing agreements (Article 28) and transfer mechanisms for each processor, including Apple | Open, except Anthropic (Annex A). Owed now. |
| D5 | Label-reading function deployed while label reading was off | Superseded by Annex A. |
| D6 | Inactive accounts | Decided: deletion after 12 months of inactivity, with notice. Not yet built; required before public launch. |
| D7 | Health consent as a condition of using the service | Design retained; residual risk accepted without a legal view. |
| D8 | Age assurance by self-declaration; assessment of likely access by children | Open. Required before public launch (and before an App Store listing). |
| D9 | ICO prior consultation | Reasoned view in section 7.3; controller's view recorded in section 7.1. |
| D10 | Legal basis for consent records: Article 6(1)(c) and, where special category, Article 9(2)(f) | Retained, without a legal view. |
| D11 | Breach response: named owner and written procedure | Open. Required before public launch. |
| D12 | EU representative (Article 27) and Data Protection Officer (Article 37) | Open. Required before public launch (and before an App Store listing in EU storefronts). No DPO at present. |
| D13 | Enforcement of closed testing (sign-up is technically open to anyone with the link) | Whether new sign-ups are disabled in the database provider's authentication settings has not been verified; one account was created on 16 November 2026. [Decision D13 pending] |
| D14 | iPhone backups | [Decision D14 pending] |
| D15 | Legal advice | Not sought, by the controller's decision of 16 November 2026. Scope: [Decision D15 pending]. |

---

## Annex A: Label photos and the shared product list

Reproduced as signed on 11 October 2026; technical identifiers refer to the system as built at that date.

At that date the product was called Tali (see Document control). The text below is the signed record and is not reworded. Its section, risk and decision numbers (sections 2.1 and 9.1 to 9.7, R19 to R22, D5) are those of the working record, and match this document's numbering.

### 9. Addendum: label photos (Anthropic) and the shared product list

**Drafted 10 October 2026 by compliance; approved by Benn (Gravita Creative Ltd, controller) on
11 October 2026.** Covers `origin/shared-products` at
`e8ac601`, which turns on label scanning (`LABEL_SCAN_ENABLED`) and with it the shared product
list (`SHARED_PRODUCTS_ENABLED`). Register items 24 and 46 hold the detail and the open points.
This section supersedes D5 and the Anthropic row in section 2.1 once signed.

#### 9.1 Processing

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

#### 9.2 Lawful basis

- **Label photos:** Art. 6(1)(b). The person asks Tali to read a label; a pack photo is not health
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

#### 9.3 Why the stored list is anonymous, and the rule that keeps it so

The test is whether a person is identifiable by means reasonably likely to be used, by Tali or
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
- **The one route back is a join Tali must never make.** A person's own `custom_foods` row holds
  the same barcode, name and figures (it's their copy). Matching `products` against
  `custom_foods` would suggest who probably added a product. **Rule: Tali never joins `products`
  (or `product_sigs_seen`) with `custom_foods` or any other user table, by barcode, name, figures
  or time, in SQL, scripts, analytics or support work.** Even if someone did, it would tell them
  only that a person has that food in their log, which Tali already holds with their consent:
  the list adds nothing new about them. That is why the residual risk is low, not why the join
  is allowed.
- **Closed (register item 46).** `products.id` was a sequential identity that, with
  `product_quota.new_rows` per day, could give the day a version was added. It is now a random
  UUID, so "month only" is true in full.

Consequences: account deletion, health withdrawal and the purge don't touch the list (by design;
not in `USER_TABLES`, `clear_log_after_withdrawal()` or `purge_unconsented_logs()`); withdrawing
`shared-products` stops future sharing and drops the outbox but can't recall what was added
(Art. 7(3) affects only processing of personal data); and rights requests about contributions
fall under Art. 11(2), since Tali can't identify whose they were. The opt-in copy and the
privacy policy say so. A version can still be taken down after a report.

#### 9.4 Transfer to Anthropic (short TIA)

- **What goes:** one or two downscaled photos of a food pack. No identifiers. Incidental content
  in the frame (a hand, a kitchen) is possible but not sought.
- **Who and where:** the `ANTHROPIC_API_KEY` in `ai-read-label` was created in the Anthropic
  Console, in a workspace called "Tali" in an API organisation, not a consumer Claude.ai account
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
  bridge) or the IDTA itself; Tali does not rely on them for Anthropic. Anthropic must give the
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

#### 9.5 New risks

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R19 | **Label photos kept or reused by the AI provider**, or incidental personal content in a photo exposed. | Remote | Minimal | Low |
| R20 | **A contribution traced back to a person** (a join with `custom_foods`, timing, logs). | Remote | Minimal | Low |
| R21 | **Personal or abusive text in a shared product name**, shown to every user who scans that barcode. | Possible | Significant | Medium |
| R22 | **Wrong figures on the shared list** lead someone to log the wrong amount (accuracy, not data protection; with `nutrition-accuracy`). | Possible | Minimal | Low |

#### 9.6 Measures

- **R19.** Photos only, no identifiers; DPA (SCCs with the UK Addendum) and no-training terms;
  30-day deletion; nothing stored by Tali. Residual: **low**.
- **R20.** The design in 9.3, the no-join rule, the random send delay; to do: the `security-data`
  fix in item 46. Residual: **low**.
- **R21.** Name rules refuse links, `@`, markup, long digit runs and claims before storage; a name
  report hides a version at once; review within 2 working days; deletion of personal data at
  once (`shared-products-moderation.md`); terms forbid false or abusive entries. Residual:
  **low**.
- **R22.** Only signed label reads, unchanged; tiers and margins on screen; three reports hide a
  version; "verified" only by an audit. Residual: **low**.

#### 9.7 Sign-off

| Item | Name and date | Notes |
|---|---|---|
| Section 9 approved by | Benn, Gravita Creative Ltd, 11 Oct 2026 | Approves label photo scanning and the shared product list. Before `LABEL_SCAN_ENABLED` reaches `main`. |
| Anthropic DPA and transfer mechanism recorded | Compliance, 11 Oct 2026 (API organisation confirmed by Benn the same day) | EU SCCs Module Two/Three with the UK Addendum (DPA s. I, Sch. 3); see 9.4. Register item 24. |
| `security-data` fix for day-level ordering | | Register item 46; should fix, not a gate. |

*Note outside the signed record:* the iPhone app uses the same label-reading path; its temporary photo handling is described in
section 2.5 and adds no new risk.

---

## Annex B: Wellbeing (Mind) and reminders

### Part 1: Wellbeing Phase 1 (Mind)

Reproduced as signed on 10 October 2026; technical identifiers refer to the system as built at that date.

At that date the product was called Tali (see Document control). The text below is the signed record and is not reworded; references to sections 4.1, 4.8, 5 and 7.3 and to D1 match this document's numbering. Notes added to the sign-off table after signature are not reproduced.

#### 8. Addendum: wellbeing Phase 1 (Mind)

**Signed off by Benn, 10 October 2026**, with the risk scores in 8.4 as proposed. Drafted 9 October 2026 from the compliance close-out of
`claude/confident-maxwell-ihd64e` at `b7df11c`. The Mind features are built but off
(`WELLBEING_ENABLED` in `src/data/wellbeingFlag.ts`; the skill screens and the signpost also sit
behind `MIND_REVIEWED`). Benn signs this section before the flag goes on. The register row
"Wellbeing Phase 1" and items 42 to 44 hold the detail; plan: `docs/plans/wellbeing-plan.md` §9.

##### 8.1 Processing

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

##### 8.2 Lawful basis

Art. 6(1)(b) with Art. 9(2)(a) explicit consent, as for the rest of the log (section 4.1). No
re-consent is needed: the consent wording already names sleep, stress and mood
(`ConsentScreen.tsx:40`), and no `CONSENT_VERSION` bump is required. Reminders and the server
record only run with a current health yes. The time zone is not health data and stays on the
phones after a withdrawal; the account copy goes with `settings`.

##### 8.3 Minimisation

- No free text is synced: skills, the one thing, sleep bands and plan kinds are keys, checked by
  shape on load and on every pull (`validCheckin`, `validMindPrefs`, `validPlanKind`).
- Unload notes stay on the phone: never synced, never sent to an AI service, never shown in a
  notification.
- Push text is fixed, with no mood or sleep word in any payload (`_shared/reminders.ts`).
- The low-mood check runs on the phone and tells no one.

##### 8.4 New risks

Scores using the scale in section 5, confirmed by Benn at sign-off (10 October 2026).

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R14 | **Unload notes exposed** on a shared or lost phone, or in an export file. | Possible | Significant | Medium |
| R15 | **People treat Tali as a crisis service**, and rely on it when they need urgent help. | Possible | Severe | High |
| R16 | **Which reminders someone gets reveals Mind use**, for example on a lock screen or through the server record. | Possible | Minimal | Low |
| R17 | **Inaccurate signposting by nation**: a person in Northern Ireland is told to call NHS 111, which doesn't run there (register item 44). | Probable (as built) | Significant | Medium |

##### 8.5 Measures

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

##### 8.6 Medical device boundary

The skills are general wellness (breathing, journalling, wind-down). Tali shows no diagnosis,
score or risk prediction, and the low-mood rule only signposts (most mood answers Low or Rough
over two weeks, at least five answers, at most once a month on each phone; `lowMoodDue` in
`src/core/domain/mind.ts`). This view stays subject to the clinician review (the Mind analogue of
D1), as in section 4.8.

##### 8.7 Sign-off

| Item | Name and date | Notes |
|---|---|---|
| Section 8 approved by | Benn, 10 October 2026 | Scores in 8.4 confirmed as proposed. The flag still waits on the rows below. |
| Clinician advice (Mind) | | Before `MIND_REVIEWED` goes on. |
| Register item 42 deployed | | Before or with the flag. `notify_sent` table and `notify_claim()` applied 10 October 2026; the withdrawal clear and the 30-day purge still to update. |
| Register item 44 decided | | Benn with mental-performance. |


### Part 2: Wind-down routine and supplement names in reminders (proposed 10 October 2026; not approved)

Part 1 is as approved and is not changed by this part. It records two later settings, both within
the Mind features.

- **Wind-down routine:** keys from a fixed list, never text. Health data by inference (sleep
  behaviour). Same basis as section 8.2 in Part 1 and the same measures as the wake and wind-down times: not saved
  without current health consent, cleared on withdrawal, checked for shape. No new risk; covered by
  section 8.3.
- **"Show supplement names in reminders":** off by default. When the user turns it on, supplement
  reminders carry the names due, which can reveal a condition or medicine. This qualifies two
  approved statements: section 8.3 "Push text is fixed" and R16 "push text is generic" hold unless the user
  has turned names on.

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R18 | **A supplement name on the lock screen reveals health information**, for example a prescription medicine a user has added as a supplement, to anyone who can see the device. | Possible (only for users who turn it on) | Significant | Medium |

Proposed measures, all built: off by default (Article 25(2)); the user's own choice, with wording
under the setting that anyone who can see the screen may read the name, even when locked; the
privacy policy says the same; with the setting off, names are not read and never reach the message;
the web push message is encrypted end to end; the function logs counts only; names are limited to 60
characters and at most six. Proposed residual: **low**. Open: whether the wording should also say
that a name can reveal something about the user's health (a wording change requiring design
approval). The setting remains hidden until this part is approved.

| Item | Name and date | Notes |
|---|---|---|
| Part 2 approved by | | Before supplement names in reminders are enabled. |

### Part 3: Reminders through Apple's push service (proposed 13 November 2026; not approved)

The iPhone app would receive its reminders through Apple's push service, where the message is
protected in transit but not end to end, so Apple can read it. The Part 2 measure "the web push
message is encrypted end to end" therefore holds for the web app only. This risk was originally
drafted as R19; because Annex A already uses R19, it is numbered R30.

| # | Risk to individuals | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R30 | **Through Apple's push service, the reminder text** (and supplement names, if sent) **and its timing are readable by Apple**, which can link them to the user's Apple ID. The wind-down reminder's timing indicates something about the user's sleep routine. | Remote | Significant | Low to medium |

Proposed measures, all built: fixed wording only, identical to the web app's and checked
automatically; supplement names are never sent to Apple unless a server setting is enabled, which
waits for this part to be approved and for the setting's wording to say that in the iPhone app
Apple's push service can read the names; undelivered reminders expire after one hour (what Apple
logs is governed by its own terms); the function logs status codes only; the iPhone privacy text
says Apple can read iPhone reminders. Open: Apple's role and data terms for the push service under
the Apple Developer Program License Agreement, and the transfer mechanism (Apple Inc., United
States). An alternative that would remove R30 is an encrypted message decrypted on the device by the
notification extension (noted only). The notification extension as built hands the message back
unchanged and so does not affect R30. iPhone reminders are not in use and supplement names in
reminders remain off.

| Item | Name and date | Notes |
|---|---|---|
| Part 3 approved by | | Before the iPhone app reaches anyone outside Gravita's core team, and before supplement names are sent through Apple's push service. |

### Part 4: Mind on, then skills on for testing (noted by Benn)

Reproduced as signed on 10 October 2026; technical identifiers refer to the system as built at that date.

At that date the product was called Tali and the app's address was app.tali.fit (see Document control). The text below is the record Benn noted and is not reworded; its references to sections 7.3 and 8.1 to 8.7 match this document's numbering (sections 8.1 to 8.7 are Part 1 above). The question it records about who can create an account is now Decision D13: [Decision D13 pending].

##### 8.9 Mind on, then skills on for testing (compliance, 10 October 2026; approved by Benn the same day)

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
  group of known testers who have been told Tali isn't a crisis service, which lowers the
  likelihood to unlikely. That reasoning holds only if sign-up is not open to the public in
  practice; Benn to confirm who can create an account at app.tali.fit today. If anyone can, the
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
| 8.9 noted by | Benn, 10 October 2026 (in the build conversation) | Benn's words: "switch on once live then update the DPIA and when we have the money a clinician will review. again no public access yet". Benn rates R15 medium while access stays non-public. Recorded fact: sign-up at app.tali.fit is technically open to anyone with the link (`src/screens/AuthScreen.tsx`, plain sign-up); the app isn't publicised. Recommended, not done: turn off "Allow new users to sign up" in Supabase Auth and add testers by invite, so "non-public" is enforced rather than relied on. If the app is publicised or sign-ups from unknown people appear before the clinician review, R15 is high and 7.3 applies. |


---

## Annex C: Cycle (addendum placeholder; outside this approval)

**Status: draft addendum, not approved. Nothing in this annex is approved by signing sections 1 to
7.** A full addendum will be completed and approved separately, by Benn or Sara, before Cycle reaches
anyone beyond the two of them. It is not legal or medical advice.

**Scope.** Cycle is a menstrual cycle log in the iPhone app only. It is offered quietly in Profile to
adults with current health consent whose sex answer is female, and can be turned on by any adult
with current health consent from a setting in Profile. It is off unless the user turns it on, and is
built behind a switch that is off by default and intended for the core team's builds only. It is not
established whether any build distributed through TestFlight enables it. The web app has no Cycle
screens.

**Processing as designed.** The log is kept on the device only: one setup answer from six fixed
options with its dated history, daily flow, pain and symptom choices from fixed lists, which safety
prompts were shown, and a pause flag during pregnancy or breastfeeding. There is no free text. The
only server record is a separate Cycle consent record, which the database cannot yet accept; until it
can, a Cycle answer stays on the device and a withdrawal does not reach the user's other devices.
Processing on the device includes the day of a period, the timing of a check-in prompt, a pain signal
to the lighter-session offer, a weigh-in note, four signposting prompts and a hold on calorie deficit
suggestions where a missing period would be prompted. Both exports include the Cycle log,
unencrypted.

**Lawful basis as proposed.** Article 6(1)(b) with Article 9(2)(a) explicit consent, through a
separate Cycle consent requiring current health consent; the data is treated as possibly concerning
sex life as well as health. Not reviewed by a lawyer (D15).

**Risks as drafted** (scores proposed, not confirmed):

| # | Risk to individuals | Proposed overall | Proposed residual |
|---|---|---|---|
| R23 | Exposure on a shared device or to a coercive partner or family member | High | High until an on-screen warning is accepted as sufficient |
| R24 | Unencrypted exports kept or shared by mistake | Medium | Medium |
| R25 | The setup answer or log reveals reproductive or sex-life facts | Medium | Low once the dated setup history is removed; medium until then |
| R26 | Safety harm from the prompts and holds (including disordered eating and severe period pain) | High | High until clinical review |
| R27 | Provisional prompt thresholds without clinical review | Medium | Medium for core team testing; low after clinical sign-off |
| R28 | Withdrawal not fully honoured across devices | Medium | Medium until the consent record can reach the server; low after |
| R29 | Treated as a medical device or a contraception aid | Medium | Low |

**Prior consultation.** For the core team only, not required: they are the controller's own people,
informed, and can stop at any time. For wider testers or the public, to be determined in the
addendum: if R23 and R26 remain high, the ICO should be consulted first, or Cycle not released.

| Item | Name and date | Notes |
|---|---|---|
| Annex C addendum approved by | | Benn or Sara. Before Cycle reaches anyone beyond the two of them. |

---

## Annex D: Apple Health import (addendum placeholder; outside this approval)

**Status: placeholder. Not built and not processing. Nothing in this annex is approved by signing
sections 1 to 7.** A full addendum will be written and approved before any imported data is stored,
including in testing.

**What exists.** No import is built. The iPhone app holds Apple Health read access used only by the
internal test screen, which reads the previous night's sleep and the day's walking on request,
displays them and keeps nothing. The database has no field for imported data and no consent type for
it. The permission wording shown to the user will be rewritten before any import, as it would
otherwise become inaccurate.

**What is planned (design only).** Read-only access to sleep (summarised on the device as minutes
asleep per night), daily steps and walking workouts; no heart rate, energy, routes or device
information. Summaries would synchronise to the existing daily log through a single server function,
so that they inherit consent, withdrawal, the pre-consent deletion, export and deletion. A separate
consent, off by default and checked on the server; disconnecting would be as easy as connecting and
would delete imported records. The device copy would be excluded from iPhone backups, so that
HealthKit-derived data stays out of iCloud (App Store Review Guideline 5.1.3(ii)). No new processor.
The user's own sleep answer, not the imported figure, would drive Tilo's suggestions; no step
targets, rings or streaks.

**The addendum must cover:** the synchronised summaries and background reads, an intended-purpose
statement (general wellness; not diagnosing or monitoring sleep disorders), and the risks of worry
from watch sleep figures, compulsive step counting, a shared device and imports outliving a
withdrawal; Apple's HealthKit terms (D4); the database change; the privacy and cookie policy text;
the register entries; and the App Store privacy label. It depends on D14 ([Decision D14 pending]).

| Item | Name and date | Notes |
|---|---|---|
| Annex D addendum written and approved by | | Before any imported data is stored, including in testing. |

---

## Annex E: Placeholders awaiting decision

The following placeholders mark answers to be filled from the controller's decision sheet. None has
been assumed.

| Placeholder | Decision | Where it appears |
|---|---|---|
| [Decision D13 pending] | Whether closed testing is enforced (open sign-up switched off and testers invited) | Sections 6 (R3), 7.1, 7.2, 7.3, 7.5; Annex B, Part 4 (introductory note) |
| [Decision D14 pending] | iPhone backups: exclude the whole store, or keep it in backups and disclose it | Section 6 (R31, twice), 7.1, 7.5; Annex D |
| [Decision D15 pending] | Scope of the decision not to seek legal advice (all legal review, or narrower) | Sections 3, 7.1, 7.5 |
| [Section 6 decision pending] | Approval of each recommended measure in section 6 | Section 6, Approved column (one per recommended row) |
| [Decision pending: onboarding for closed testers] | Whether the onboarding wizard may be switched on for closed testers before the clinical review (D1) | Sections 6 (R3), 7.1 |
| [Review date pending] | Date of the next review of this assessment | Document control; sections 7.1, 7.4 |
