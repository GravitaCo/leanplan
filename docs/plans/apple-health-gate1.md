# Apple Health import (phase 2, W1): gate 1 draft

Drafted 16 Nov 2026 by N9 with `compliance` and `security-data`. **Draft only: nothing edited, applied
or published.** Decisions are in `native-build-plan.md` §11.1.

Verdicts: `compliance` APPROVE AS DRAFT for option (c), device only, with a separate `health-import`
consent (CHANGES NEEDED for (a) or (b)). `security-data` CHANGES NEEDED: agrees with (c), wanted H1 to H3
and M1 to M5 written into the design: they are in §7, recheck pending.

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

## 7. Design amendments from security-data (written in 16 Nov)

### H1. Reading needs this phone's own connection (shared phones)

The `health-import` consent belongs to the account and syncs (`pullConsents`); the iOS HealthKit
permission belongs to the app on this phone. So the store keeps a **device connection record**
`{ owner: uid, at, consentId }`, written only by this phone's own Connect, after the consent record and
before the iOS sheet. HealthKit is read (not just shown) only when all of these hold, checked in one
shared function `mayReadHealth(s, ctx)` in `src/data/` that the importer calls before every read:

1. the connection record exists and its `owner` is the signed-in uid;
2. the account's latest `health-import` record is a yes and its id equals the connection record's
   `consentId` (so a yes made later on another phone never restarts reads on a phone whose wipe was lost);
3. health consent is current on the device (`hasCurrentConsent('health')`, `consentLetsSync`, and not
   `healthSyncPaused`);
4. signed in, and no owner question pending (`ownerCheck` neither 'ask' nor 'verify').

A yes recorded on another device never starts reads here: this phone needs its own Connect. If (1)
fails for a different uid the store is wiped (H3).

### H2. Withdrawals from anywhere wipe this phone

- **One hook in `clearHealthData`** (consent.ts): a registered platform hook `onHealthDataCleared` (its
  own name; `clearDeviceHealth` in `deviceOnly.ts` already clears the Unload notes) wipes the store and
  stops reads. `clearHealthData` has three callers (the local `withdraw`, the pulled
  `applyHealthWithdrawal`, and the store's own call), so the one hook covers all three.
- **health-import withdrawal pulled from another device** (a Disconnect on a second iPhone):
  `applyHealthImportWithdrawal(s, meta)`, applied once per record id (`importCleared`, stored next to
  `healthCleared`), runs the same wipe. It runs after every `pullConsents`, next to the two
  `applyHealthWithdrawal` calls in `store.ts`.
- **The shared `withdraw('health')`** also records a `health-import` withdrawal when the account's latest
  `health-import` is a yes, so the web records it too and a later health yes never resumes imports.
- Disconnect on this phone: records the `health-import` withdrawal, then wipes, offline too; the record
  uploads on the next sync.
- `healthCleared` and `importCleared` live in `leanplan.v1` and the store in `tali.health`, which are
  written separately, so a guard can be saved while a wipe is lost. H3's read-time consent check makes
  that safe: the hooks only tidy up.

### H3. An owner check on every read, failing closed

The store's accessors copy the Unload gate (`unloadNotes` and `NotesContext` in `src/data/deviceOnly.ts`):
every read returns empty, and clears the store, unless signed in, no owner question pending, and the
store's stamp equals `_meta.owner`, health consent is current on the device, and the account's latest
`health-import` record is a yes whose id equals the connection record's `consentId`. No recorded owner
means empty. The wipe hooks in §4 then only tidy
up; a crash between writing `tali.health` and `leanplan.v1`, or a pending owner question, can never show
one account's watch data to another.

### M1. The sync race: compare-and-swap at push, saving offline as normal

Saving never waits on the network. The compare-and-swap path is only for a day that was **synced and
clean** when the importer changed it (confirming or, if P2-4 says so, removing a walk). The day then
records `meta.days[d].base`, the server's `updated_at` string **exactly as received** (microseconds and
offset; never re-formatted through `Date`, never taken from `u`, which local edits and `clearHealthData`
set to `nowIso()`), and the session operations made (`{ add: [ids], remove: [ids] }`). **Any other edit
to that day clears `base` and `ops`**, and the day goes back to today's plain upsert, so the rebase can
never drop an unpushed manual edit.

At push, the path runs inside `pushDirty`'s days step, after the consents step and the "health consent
not uploaded yet" stop, and its bodies are built exactly as that step builds them:
`withoutHealth(toServerDay(...))` when health is declined, the held-check-in form when paused, else
`toServerDay`. For each such day:

1. `PATCH day_logs?user_id=eq.<uid>&log_date=eq.<d>&updated_at=eq.<encodeURIComponent(base)>` with
   `Prefer: return=representation` (`updated_at` is set by the `set_updated_at` trigger, so this is a
   true conditional write; the `+` in `+00:00` must be encoded or it decodes to a space).
2. No row back: fetch the server day (as `serverDays` does). If it exists, take it onto the phone,
   reapply the session operations by id (an add whose id is there already, or a remove whose id is gone,
   is a no-op), set `base` to its `updated_at` and retry. If it doesn't exist, go to 3.
3. **No `base` known** (the phone never had the row; it may still exist): `POST
   day_logs?on_conflict=user_id,log_date` with `Prefer: resolution=ignore-duplicates,return=representation`.
   An empty array back means the row already existed: fetch it and rebase as in 2.
4. Success: `meta.days[d] = { u: <returned updated_at>, dirty: false }`, and `base` and `ops` cleared.
5. At most 3 attempts per sync; after the third failure the day stays dirty and is reported in `failed`,
   as other steps are.

Other days keep today's path. This narrows, not removes, whole-day last-write-wins for manual edits,
which is an existing risk and out of scope.

### M2. The store (`modules/tilo-store`)

- Namespace `health` (the `^[a-z0-9-]+$` rule), key `tali.health`.
- Backup exclusion: `isExcludedFromBackup` set through `URLResourceValues` on the namespace folder at
  every open (per file would be lost, since each atomic write replaces the file).
- Exclusion and the protection class come from a Swift allow-list per namespace, never a flag from JS.
- Protection class: `.complete` only once `loaded()` stops caching an empty store when read while the
  phone is locked (it must throw, not cache); until then `completeUntilFirstUserAuthentication`, as
  `leanplan.v1`.
- A native test reads the backup flag back.

### M3. The sentinel test

In `scripts/wellbeing/data-device.ts`, beside the Unload sentinel, with the same fake server and spy:

- Plant distinctive values in the store: 98700 steps, wake 04:17, a ledger workout id, `notWorn`,
  `stepsInWalks`, an unconfirmed brisk walk; and one confirmed walk.
- Run `pushDirty` over all 7 tables, plus `toServerDay`, `toServerFood`, `toServerPlan` and the settings row.
- Walk the parsed JSON: `healthkit` appears only at `day_logs[*].sessions[*].src`; such a session's keys
  are within {id, modality, title, cardio.key, mins, at, src}; no `checkin.night` has a source other
  than `self`; no `asleepMin`, `bedAt`, `ext` or planted value appears anywhere.
- An import boundary like `boundaryIssues`: only the health store and the importer may import
  `modules/tilo-health` or the store's accessors; `sync`, `backup`, `labelReader`, `push` and `consent`
  must not. Calling the registered `onHealthDataCleared` hook (H2) is not an import and is allowed.

### M4. Swift returns as little as possible (`modules/tilo-health`)

- Sleep: one result per night from Swift: asleep minutes, the end of the last asleep stretch, and the
  in-bed start only if P2-2 keeps bed time. No spans (their gaps show each waking), no `value`.
- `value` is removed from `SleepSample` in `src/TiloHealthModule.ts`, and the "Raw samples go to JS"
  header is rewritten.
- Walks: workout id (for the ledger), start, duration and pace; never distance itself.
- Queries use `.strictStartDate`, so a walk crossing a window boundary is never counted twice.

### M5. iCloud backups

A confirmed walk lives in `leanplan.v1`, which is in iPhone iCloud backups (`TiloStoreModule.swift`).
Decision P2-13 must be made before W1 ships, not only before App Store submission.

### L1 to L5

- L1: the migration goes in before any build records `health-import` (otherwise refused with 23514 and
  retried every sync); a test that the newest `consents_type_check` in `docs/migrations/` equals
  `CONSENT_TYPES`.
- L2: the 500-row consent cap is shared: record `health-import` only when its state changes; consider
  exempting `type = 'health'` from the cap.
- L3: `cleanGuided` (persistence.ts) keeps `src` only if it matches `^[a-z][a-z0-9-]{0,31}$`.
- L4: ledger entries older than 56 days are pruned.
- L5: `tali.health` is left out of the backup export.

Migration draft (not applied; for `docs/migrations/`, following `2026-10-10-shared-products.sql`):

```sql
-- Tilo: consent type 'health-import' (Apple Health import W1, option (c), device only).
-- NOT APPLIED: security-data review, then Benn applies it BEFORE any native build that records a
-- 'health-import' consent ships (until then those rows are refused with 23514 and stay dirty).
-- Widening only: every existing row passes. No server function reads this type (all filter
-- type = 'health'); delete-account already removes every consents row. No table, grant or policy change.
-- Rollback: consents is append-only history, so never delete 'health-import' rows to narrow the
-- check. Only if no build ever recorded the type
-- (select count(*) from public.consents where type = 'health-import') = 0, re-run the
-- shared-products step with the four types. Safe to re-run.
begin;
alter table public.consents drop constraint if exists consents_type_check;
alter table public.consents add constraint consents_type_check
  check (type in ('health', 'ai', 'label-photo', 'shared-products', 'health-import'));
commit;
-- Verify:
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.consents'::regclass and conname = 'consents_type_check';
```
