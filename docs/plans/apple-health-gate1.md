# Apple Health import (phase 2, W1): gate 1 draft

Drafted 16 Nov 2026 by N9 with `compliance` and `security-data`. **Draft only: nothing edited, applied
or published.** Decisions are in `native-build-plan.md` §11.1.

Verdicts: `compliance` APPROVE AS DRAFT for option (c), device only, with a separate `health-import`
consent (CHANGES NEEDED for (a) or (b)). `security-data` CHANGES NEEDED: agrees with (c), wants H1 to H3
and M1 to M5 (§7) written into the design; the amendments have not been rechecked yet.

## 1. Reads (read only; never writes to HealthKit)

- Sleep (sleepAnalysis): asleep and in-bed samples, reduced in Swift to one result per night; stage
  values never reach JS.
- Steps (stepCount): a daily sum per local day, plus the sum inside each counted walk. No samples, no sources.
- Walks (workouts filtered to walking in Swift): start, duration, pace. The iOS permission covers all
  workout types; the filter is in the query. `totalDistance` is deprecated from iOS 18; the alternative
  adds a fourth read type (distanceWalkingRunning).
- Never read: energy, routes, heart rate, metadata, source or device. Bed time is read only to frame the night.

## 2. Stores (on the iPhone only)

- Night, keyed to the wake-up day: the five self-report bands and wake time "HH:MM". Not stored:
  minutes, stages, score, bed time, sample ids. Kept 14 nights.
- Day steps: steps and steps inside walks, rounded to 100; a day under 1,000 is kept as "not worn" with
  no number. Kept 56 days.
- Walk: start, minutes, brisk (pace at 4.8 MET or more), confirmed. Kept 56 days.
- Ledger: Apple workout id to session id, confirmed walks only, so a re-import changes nothing. Pruned at 56 days.
- A confirmed walk becomes the person's own synced session (`modality 'cardio'`, title Walk or Brisk walk,
  minutes, time, `src 'healthkit'`), with no distance and no energy.

## 3. Where it lives

- (a) A device field in the synced day log: needs a new consent anyway, no server path on disconnect,
  last-write-wins can bring data back, and it sits in `leanplan.v1`, which is in iCloud backups.
- (b) A new table: the full migration, RLS and grants, consent trigger, purge, `USER_TABLES`, a sync
  path, while no feature needs a server copy.
- **(c) Recommended:** its own `tilo-store` namespace `health` (key `tali.health`), excluded from backup
  and owner-stamped. Only confirmed walks sync.
- Consent: a new type `health-import` (version `2026-11-v1`), recorded on Connect before the iOS sheet,
  offered only with a current health yes; a health withdrawal also records a health-import withdrawal.
- Background delivery isn't needed under (c).

## 4. Text changes (gated on a new `watch` flag with `native`)

- Privacy policy: what is read and kept, that it stays on the iPhone and out of iCloud backup, that
  connecting is a separate choice, that the person's own check-in always counts, the steps suggestion's
  rules, retention (2 weeks sleep, 8 weeks steps and walks), how to stop, Apple Health not a processor.
- Cookie and storage policy: a `tali.health` entry.
- Register: a new processing row; confirmed walks in the day logs row; the wearable line replaced; the
  consent types; open items (Apple's HealthKit licence terms unread, the 5.1.3(ii) iCloud question, the
  pilot measures, the Health app path on iOS 27).
- DPIA §10: both consents (Art. 9(2)(a)); minimisation, no reads in gentle mode, while wellbeing is
  flagged, in care versions or safety weeks; risks (worry from watch sleep, compulsive stepping, a lost
  phone, imports outliving a disconnect); the steps-up-mood-down concern signal is not approved.
- App Store label: Health unchanged; Fitness gains confirmed walks; never tracking, ads or analytics.
- Permission wording: the spike's "Nothing is shared unless you choose to" must not ship with W1.
- Disconnect: wipes the store (offline too), stops reads, records a withdrawal, removes the watch lines
  and any open suggestion, tells the person the Health app path. The same wipe runs on health
  withdrawal, account deletion, sign-out, start fresh or keep, and an owner change.

## 5. From gate 2

Cross-device race on whole-day last-write-wins (M1); `healthDataSummary` is correct under (c) because no
imported night reaches the check-in, pinned by the sentinel test; the legacy Mind row and MindCard
disagree (older than gate 2, to align when the import UI lands); an end-to-end test once the importer exists.

## 6. Before anything ships (compliance)

The migration (Benn applies it first), consent types and versions, the gated texts with `check:legal`
passing and Webflow drafts only, the register and DPIA §10 signed, the permission wording chosen, the
Swift minimisation and backup exclusion, the sentinel test, the W4 board approved, label, manifest and
App Store description, `ship-critic`.

## 7. security-data amendments (not yet rechecked)

- H1 Shared phone: a device connection record, owner-stamped; read only when it exists for this
  account, the latest health-import is a yes, health consent is current, and no owner question is pending.
- H2 Withdrawals from other devices wipe the store; a pull-side health-import withdrawal; the shared
  health withdrawal records the health-import one.
- H3 An owner check on every read; fail closed.
- M1 The sync race: compare-and-swap on importer-touched days at push, rebasing session adds and removes by id.
- M2 The store: namespace `health`, backup exclusion set at every open and tested, a fixed protection class.
- M3 A sentinel test that planted watch values never leave the phone except the allowed walk fields.
- M4 Swift returns one result per night (not merged spans, which reveal wakings); walks return id,
  start, duration and pace.
- M5 iCloud backups (decision P2-13).
- L1 to L5: migration first; the shared consent row cap; `src` validation; ledger pruning; `tali.health`
  left out of the backup export.

Migration draft (not applied):

```sql
begin;
alter table public.consents drop constraint if exists consents_type_check;
alter table public.consents add constraint consents_type_check
  check (type in ('health', 'ai', 'label-photo', 'shared-products', 'health-import'));
commit;
```
