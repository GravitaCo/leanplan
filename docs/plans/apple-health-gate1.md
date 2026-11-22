# Apple Health import (phase 2, W1): gate 1 design

Drafted 16 Nov 2026 by N9 with `compliance` and `security-data`; **revised 22 Nov to Benn's settled
decisions in `native-app-plan.md` §3.5**, which replace the 16 Nov device-only option (c). **Docs only:
nothing built, applied or published.** Order (Benn, 22 Nov): Cycle, then onboarding on, then this.

Verdicts on this revision: `compliance` pending; `security-data` pending. (On the 16 Nov device-only
draft: both APPROVED AS DRAFT; that draft is in git history at 747c7aa.)

## 0. What changed from the 16 Nov draft (from §3.5)

- Imported summaries **sync** on `day_logs` (§3.5 item 9), so they inherit consent, withdrawal, purge,
  export and deletion. They live in a **new `wearable` column**, never in `checkin.night`, so the
  person's own answer and the watch night sit side by side and gate 2 (an imported night is never a
  check-in and never replaces the person's own) holds by construction.
- A separate **`wearables` consent** (§3.5 item 8; replaces `health-import`), with a server check.
- HealthKit-derived data is **kept out of iPhone backups** (§3.5 item 9).
- The watch supplies the night's hours; the person enters hours only with no watch night; "How did
  you sleep?" stays the person's own answer, never prefilled, and alone drives hard day, low signals
  and the hard week. A watch-only short night never makes a hard day.
- Disagreement: the watch band shows with **"Not right?"**; changing it asks one confirmation and the
  person's choice wins for that night. Until they answer, a manual entry counts. Never added together.
- Sleep **shows in gentle mode** (hours band, own rating, weekly line). Hidden in gentle mode: stages,
  the 7 to 9 reference line, sleep-hunger lines, any food or weight link.
- **Background delivery on.**
- Weekly sleep line: the most common band from all nights (watch or own), from 3 nights.

## 1. Reads (read only; never writes to HealthKit)

- Sleep (`sleepAnalysis`): reduced in Swift to **one result per night**: asleep minutes, bed time (the
  in-bed start) and wake time (the end of the last asleep stretch). No spans (their gaps show each
  waking), no stage values. **Stages are not in W1**: the opt-in weekly rough split (§3.5 item 2) is a
  later board with its own review, and only then does Swift return per-night stage totals.
- Steps (`stepCount`): a daily sum per local day, plus the sum inside each counted walk. No samples, no sources.
- Walks (workouts, filtered to walking in Swift): Apple's workout id (for de-duplication, §2), start,
  duration, and pace computed in Swift for the brisk test (5.6 km/h, Compendium 17200). Distance
  itself never leaves Swift. `.strictStartDate` so a walk crossing a window is never counted twice.
- Never read: energy (§3.5: Apple's active energy never feeds any number), routes, heart rate,
  metadata, source or device.
- Background delivery: `HKObserverQuery` for the three types, with the background-delivery
  entitlement. A background read runs only when H1's conditions hold.

## 2. What syncs: `day_logs.wearable`

One nullable jsonb column per day, written only by the importer:

```
wearable: {
  src: 'healthkit',
  night?: { asleepMin, bedAt: 'HH:MM', wakeAt: 'HH:MM' },   // keyed to the wake-up day
  steps?: number,          // rounded to 100; a day under 1,000 is { notWorn: true } with no number
  stepsInWalks?: number,
  walks?: [{ key, type: 'walking', start: 'HH:MM', mins, brisk, session? }]
}
```

- `key`: a SHA-256 of Apple's workout id, truncated to 16 hex characters, so a walk is de-duplicated
  across phones without Apple's id leaving the phone. `session` is the Tilo session id once confirmed.
- No raw samples, route, heart rate, energy, distance or stages.
- A confirmed walk also becomes the person's own session (`modality 'cardio'`, title Walk or Brisk
  walk, `cardio.key`, `mins`, `at`, `src 'healthkit'`), which stays if wearables is withdrawn: it is
  their own entry (§3.5 item 8).
- Kept on the server like the rest of the day log; on the phone, the import window is 14 nights and
  56 days (reads older than that are not repeated).

### Why a column, and how it syncs without the race

- **A column-only write.** The importer never dirties the whole day. It sets its own flag
  (`meta.days[d].wear`) and pushes `upsert day_logs (user_id, log_date, wearable)` with only those
  columns: PostgREST's upsert sets only the columns it sends (sync.ts notes this), so it can never
  overwrite food, a check-in or sessions written on another phone. A new row gets the table's
  defaults for every other column.
- **The day push never sends `wearable`.** `toServerDay` leaves it out, so a stale whole-day push from
  any phone (or the web) never overwrites or resurrects watch data.
- **Pull** reads `wearable` into the phone's health store (§3), not into `leanplan.v1`.
- A **confirmed walk** changes `sessions` too, so it goes through M1's compare-and-swap (§6).

## 3. On the phone: kept out of iPhone backups

- `leanplan.v1` is included in iPhone backups (`apps/native/lib/platform/storage.ts`), so the phone's
  copy of `wearable` lives in its own `tilo-store` namespace `health` (key `tali.health`), excluded from
  backup (M2), owner-stamped and read through the H3 gate. Screens merge it with the day in memory.
- **OPEN (Benn, §3.5 item 9):** a confirmed walk is a session in `leanplan.v1`, which is in backups.
  Excluding the whole store from backups settles it; otherwise confirmed walks need their `src`
  stripped from the backed-up copy or the judgement recorded.

## 4. Consent: `wearables`

- New type `wearables` (version `2026-11-v1`), off by default, asked on the Connect screen before the
  iOS sheet, offered only with a current health yes.
- Withdrawing it: stops reading, deletes imported records on the phone and on the server
  (`clear_wearables_after_withdrawal()`), keeps the person's own entries (confirmed walks included).
- A health withdrawal also records a `wearables` withdrawal (only when the latest is a yes), so a
  later health yes never resumes imports. Health withdrawal already deletes the whole log on the server.
- Records only on a change (the 500-row consent cap is shared).

## 5. Server (one migration, `security-data`, Benn applies before any build records `wearables`)

1. `consents_type_check` gains `'wearables'`.
2. `alter table public.day_logs add column if not exists wearable jsonb`, with a check that it is null
   or an object. Existing grants cover the new column; RLS is per row, unchanged.
3. `wearables_consent_current(uid)`: the latest `wearables` record is a yes and health consent is current.
4. A `BEFORE INSERT OR UPDATE` trigger on `day_logs`: when `new.wearable` is not null and differs from
   the old value, refuse (`TL002`) unless `wearables_consent_current`. Shares the per-user advisory
   lock with the clear functions, as `require_health_consent` does. So a stale phone can never upload
   watch data after a withdrawal.
5. `clear_wearables_after_withdrawal()`: security invoker, takes the per-user lock, and only while the
   latest `wearables` record is a no: `update day_logs set wearable = null where user_id = auth.uid()`.
6. Unchanged and already covering the column: `clear_log_after_withdrawal()` and
   `purge_unconsented_logs()` delete whole rows; delete-account removes `day_logs` (`USER_TABLES`); the
   export reads whole rows.
7. The client strips `wearable` from every upload while `wearables` isn't current (as `withoutHealth`),
   so a row is never refused for it.

## 6. Security design (from `security-data`, carried over and updated)

- **H1 Shared phone.** The consent belongs to the account; the iOS permission to the phone. A device
  connection record `{ owner: uid, at, consentId }` in the health store, written only by this phone's
  Connect. `mayReadHealth(s, ctx)` (in `src/data/`) gates every read, foreground and background:
  the record's owner is the signed-in uid; the latest `wearables` record is a yes with id
  `consentId`; health consent is current on the device (`hasCurrentConsent('health')`,
  `consentLetsSync`, not `healthSyncPaused`); signed in, no owner question pending.
- **H2 Withdrawals from anywhere.** A platform hook `onHealthDataCleared` inside `clearHealthData`
  (consent.ts; its three callers covered) wipes the health store and stops reads.
  `applyWearablesWithdrawal(s, meta)` runs after every `pullConsents` (next to the two
  `applyHealthWithdrawal` calls in `store.ts`), once per record id (`wearablesCleared`), and wipes the
  store and calls `clear_wearables_after_withdrawal()`. The shared `withdraw('health')` records the
  `wearables` withdrawal.
- **H3 Every read fails closed.** The health store returns empty, and clears, unless signed in, no
  owner question pending, the stamp equals `_meta.owner`, health consent is current, and the latest
  `wearables` record is a yes with id `consentId`. The hooks only tidy up.
- **M1 Confirmed walks** (they change `sessions`): compare-and-swap at push, only for a day that was
  synced and clean when the walk was confirmed; any other edit clears `base` and `ops` and the day goes
  back to the plain upsert. `PATCH day_logs?user_id=eq.<uid>&log_date=eq.<d>&updated_at=eq.<base>`
  (`base` is the server's `updated_at` exactly as received, URL-encoded), `Prefer:
  return=representation`; no row: fetch, rebase the session operations by id, retry; no `base`: insert
  with `resolution=ignore-duplicates`, empty reply means rebase; at most 3 attempts, then `failed`.
  Bodies are shaped as `pushDirty`'s days step shapes them, after the consents step.
- **M2 The store.** Namespace `health`; `isExcludedFromBackup` on the namespace folder at every open,
  read back in a native test; exclusion and protection from a Swift allow-list. Background delivery
  reads while the phone may be locked, so the class is `completeUntilFirstUserAuthentication`, and
  `loaded()` must throw (not cache an empty store) if read before first unlock.
- **M3 Sentinel test** (`scripts/wellbeing/data-device.ts`): plant distinctive values; run `pushDirty`
  and the wearable push over all tables and serialisers; assert `healthkit` appears only at
  `day_logs[*].wearable.src` and `day_logs[*].sessions[*].src`; `wearable` keys are exactly those in §2;
  no Apple workout id, distance, energy, stage or span anywhere; no `checkin.night` with a source other
  than `self`; no `wearable` in any upload while `wearables` isn't current; the day push never carries
  `wearable`. Import boundary: only the health store and the importer import `modules/tilo-health`.
- **M4 Swift** returns only §1's fields; `value` is removed from `SleepSample`.
- **L** The migration before any build records `wearables` (a test that the newest
  `consents_type_check` equals `CONSENT_TYPES`); `cleanGuided` keeps `src` only if
  `^[a-z][a-z0-9-]{0,31}$`; validation keeps `wearable` by shape; the JSON backup export includes
  `wearable` (access right) and a restore drops it unless `wearables` is current (HealthKit re-reads it).

## 7. App logic changes W1 needs (shared core)

- `nightFor` takes the person's own night and the wearable night: the watch supplies hours; the
  person's own band (from "Not right?" or hand entry) wins for that night. Rating is always the
  person's own.
- Gate 2 stays: an imported night is never a check-in (`hasCheckinContent`, `mindOf`, `checkinOn`,
  `summary.ts` `checkedIn`, `maintenanceLoop` active days) and never replaces the person's own night.
  It now also never reaches `checkin` at all.
- The weekly sleep line counts all nights (watch or own) from 3; pattern lines and the observation read
  the person's own answers only (today's `ownNightView` in `mind.ts` splits accordingly).
- Hard day, low signals and the hard week read the rating only.
- `healthDataSummary` (consent.ts) counts check-ins from `checkin` only, so imported days don't
  inflate it; it gains a separate "watch days" count for the withdrawal and export summaries.
- Steps: the daily-movement band suggestion waits for the `STEPS_MULT` review (§3.5 item 7, OPEN).

## 8. Text changes (gated on a new `watch` flag with `native`)

- Privacy policy: what is read (sleep: hours asleep, bed and wake time; daily steps; walks: type,
  start, length, brisk or not), what syncs (those summaries, on the account, like the rest of the log),
  what never is read (stages in W1, heart rate, energy, routes), kept out of iPhone backups, a separate
  consent, the person's own answer always counts, how to stop (Disconnect, which deletes imported
  records on the phone and the account and keeps the person's own entries; and the Health app path),
  Apple Health not a processor, background reading while the app is closed.
- Cookie and storage policy: the `tali.health` entry (the phone's copy, excluded from backup).
- Register: a processing row (day logs gain `wearable`; lawful basis Art. 6(1)(b) and 9(2)(a) with
  the `wearables` consent); consent types; open items (Apple's HealthKit licence terms, the 5.1.3(ii)
  question for the rest of the store, the Health app path on iOS 27, pilot measures by asking, not
  telemetry).
- DPIA §10 addendum, signed before any imported data is stored, TestFlight included: synced summaries,
  background reads, gentle-mode display, risks (worry from watch sleep, orthosomnia, compulsive
  stepping, a shared phone, imports outliving a withdrawal), the intended-purpose statement (general
  wellness, not diagnosing or monitoring sleep disorders), no new processor.
- App Store: privacy label Health & Fitness, linked, app functionality; never tracking, ads or
  analytics; the description names Apple Health (2.5.1); method wording ("Your watch estimated...")
  for 1.4.1.
- Purpose string: rewritten (the spike's "next to your check-in" and "Nothing is shared unless you
  choose to" become untrue); wording past `compliance` and Benn or Sara.

## 9. Before anything ships

The migration (Benn applies first); consent types and versions; the gated texts with `check:legal`
passing and Webflow drafts only; register and DPIA §10 signed; purpose string chosen; Swift
minimisation, backup exclusion and its native test; the sentinel test; boards approved (Connect,
sleep views, walk confirmation, "Not right?", Disconnect); label, manifest, App Store description;
`ship-critic`. OPEN for Benn: §3.5 item 9 (exclude the whole store from backups) and item 7
(`STEPS_MULT`).

## Migration draft (not applied; for `docs/migrations/`, following `2026-09-28-health-consent-server.sql`)

```sql
-- Tilo: wearables consent and day_logs.wearable (Apple Health import W1, synced summaries).
-- NOT APPLIED: security-data review, then Benn applies it BEFORE any native build that records a
-- 'wearables' consent or uploads 'wearable' ships.
-- Widening: every existing row passes the new check; the column is nullable. Existing table grants
-- cover the column; RLS is per row and unchanged. clear_log_after_withdrawal, purge_unconsented_logs
-- and delete-account delete whole day_logs rows, so they already cover it.
-- Rollback: never delete consent history. Drop the trigger and functions; the column can be dropped
-- only after confirming no client reads it (or left, unused).
begin;

alter table public.consents drop constraint if exists consents_type_check;
alter table public.consents add constraint consents_type_check
  check (type in ('health', 'ai', 'label-photo', 'shared-products', 'wearables'));

alter table public.day_logs add column if not exists wearable jsonb;
alter table public.day_logs drop constraint if exists day_logs_wearable_is_object;
alter table public.day_logs add constraint day_logs_wearable_is_object
  check (wearable is null or jsonb_typeof(wearable) = 'object');

create or replace function public.wearables_consent_current(uid uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select public.health_consent_current(uid) and coalesce((
    select c.granted from public.consents c
    where c.user_id = uid and c.type = 'wearables'
    order by least(c.recorded_at, c.created_at) desc, c.created_at desc limit 1), false)
$$;
revoke all on function public.wearables_consent_current(uuid) from public, anon;
grant execute on function public.wearables_consent_current(uuid) to authenticated, service_role;

create or replace function public.require_wearables_consent()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if new.wearable is null then return new; end if;
  if tg_op = 'UPDATE' and new.wearable is not distinct from old.wearable then return new; end if;
  if uid is null then
    if current_user in ('anon', 'authenticated') then
      raise exception 'tali: wearables consent required' using errcode = 'TL002';
    end if;
    return new;
  end if;
  perform pg_advisory_xact_lock_shared(hashtextextended('tali-log:' || uid::text, 0));
  if not public.wearables_consent_current(uid) then
    raise exception 'tali: wearables consent required' using errcode = 'TL002';
  end if;
  return new;
end $$;
drop trigger if exists require_wearables_consent on public.day_logs;
create trigger require_wearables_consent before insert or update on public.day_logs
  for each row execute function public.require_wearables_consent();

create or replace function public.clear_wearables_after_withdrawal()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tali-log:' || uid::text, 0));
  if public.wearables_consent_current(uid) then
    return jsonb_build_object('cleared', false, 'at', now());
  end if;
  update public.day_logs set wearable = null where user_id = uid and wearable is not null;
  get diagnostics n = row_count;
  return jsonb_build_object('cleared', true, 'rows', n, 'at', now());
end $$;
revoke all on function public.clear_wearables_after_withdrawal() from public, anon;
grant execute on function public.clear_wearables_after_withdrawal() to authenticated;

commit;
-- Verify:
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.consents'::regclass and conname = 'consents_type_check';
-- select column_name from information_schema.columns where table_name = 'day_logs' and column_name = 'wearable';
```
