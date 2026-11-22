# Apple Health import (phase 2, W1): gate 1 design

Drafted 16 Nov 2026 by N9 with `compliance` and `security-data`; **revised 22 Nov to Benn's settled
decisions in `native-app-plan.md` §3.5**, which replace the 16 Nov device-only option (c). **Docs only:
nothing built, applied or published.** Order (Benn, 22 Nov): Cycle, then onboarding on, then this.

Verdicts on this revision: first pass 22 Nov, `compliance` and `security-data` both CHANGES NEEDED; their
fixes are written in below. Recheck: `compliance` APPROVE AS DRAFT (its three follow-ups written in);
`security-data` APPROVED AS DRAFT on its second recheck (aa65118), with the low build notes in §9. (The 16 Nov device-only draft, approved by both as a draft,
is in git history at 747c7aa.)

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
- **Not in W1:** stages (the opt-in weekly split, §3.5 item 2), wake-time regularity, the sleep-food
  education lines (item 3; they need the CAP 12.1 and 13 check and stay hidden in gentle mode), the
  steps-band suggestion (waits for the `STEPS_MULT` review, item 7). Each gets its own board and review.
  The Summary wearables callout follows `summary-callouts.md`.

## 1. Reads (read only; never writes to HealthKit)

- Sleep (`sleepAnalysis`): Swift reads the samples, stage values included, **only to add up hours
  asleep**, and returns one number per night (asleep minutes, keyed to the wake-up day). No spans
  (their gaps show each waking), no stage values, no bed or wake time leave Swift.
- Steps (`stepCount`): a daily sum per local day, plus the sum inside each counted walk. No samples, no sources.
- Walks (workouts, filtered to walking in Swift): Apple's workout id (only to make the walk key, §2),
  start, duration, and distance **only to work out pace** for the brisk test (about 5.6 km/h,
  Compendium 17200), then discarded. `.strictStartDate` so a walk crossing a window is never counted twice.
- **Never kept, sent or used:** stage values and distance (read on the phone as above). **Not read:**
  heart rate, energy (Swift never touches a workout's energy total; §3.5: Apple's active energy never
  feeds any number), routes, metadata, source or device.
- A read that fails or returns `errorDatabaseInaccessible` (the phone is locked) produces **no payload**:
  never 0, never "not worn". A day is written only from a complete read.
- Background delivery: `HKObserverQuery` for the three types, with the background-delivery
  entitlement. A background read runs only when `mayReadHealth` holds (§6 H1).

**Bed and wake times (minimisation, for Benn):** §3.5 item 9 lists them, but no W1 view uses them, and
they reveal a daily routine more than hours do. So W1 neither keeps nor syncs them; they join
`wearable.night` (validation keeps a later key by shape) when the wake-regularity board ships. Recorded
in the register.

## 2. What syncs: `day_logs.wearable`

One nullable jsonb column per day, written only through `merge_wearable` (§5):

```
wearable: {
  src: 'healthkit',
  night?: { asleepMin },        // keyed to the wake-up day
  steps?: number,               // rounded to 100; a day under 1,000 is { notWorn: true } with no number
  stepsInWalks?: number,
  walks?: [{ key, type: 'walking', start: 'HH:MM', mins, brisk }]
}
```

- `key`: SHA-256 of `uid + ':' + Apple's workout id`, truncated to 16 hex characters. It de-duplicates
  one person's walks across their phones without Apple's id leaving the phone, and never links two
  accounts importing the same Health data. To confirm on a device before relying on it: Apple's workout
  id is the same on two iPhones synced through iCloud Health.
- No raw samples, route, heart rate, energy, distance, stages, bed or wake time.
- A **confirmed walk** becomes the person's own session (`modality 'cardio'`, title Walk or Brisk walk,
  `cardio.key`, `mins`, `at`, `src 'healthkit'`, `srcKey: <walk key>`). A walk is confirmed when a
  session with its `srcKey` exists; `wearable` never records it. Confirmed walks stay if wearables is
  withdrawn: they are the person's own Train entries (§3.5 item 8), deletable in Train.
- `brisk` is shown as "about 5.6 km/h, from your watch"; the method wording says it can't account for hills.
- `updated_at` on `day_logs` now also moves when an import is written (M1's compare-and-swap and
  `settleResume` must expect that).

### How it syncs without races

- **Import vs the day push.** The importer never dirties the day. Its pending days are in their own map
  `meta.wear[d]` (never on `meta.days` entries, which `pullAll`, `settleResume` and the consent
  re-upload replace). It pushes each day through `merge_wearable`, after the consents step, one call
  per day (never batched with other row shapes). `toServerDay`, `withoutHealth` and the held variant
  never send `wearable`, so a stale whole-day push from any phone, the web or an old build never
  overwrites or resurrects watch data.
- **Import vs import** (a second iPhone, a partial read while iCloud Health syncs): `merge_wearable`
  merges under its own lock: `night` set only when present, the larger step count kept, a number always
  beating "not worn", walks merged by `key` (each walk's key must be 16 hex characters, or the call is
  refused). The server keeps only the §2 fields, so the minimisation holds even against an old or
  modified build. A merge that changes nothing writes nothing. The app stores what `merge_wearable`
  returns (through `mayShowWearable`), so the phone holds the merged day. A deadlock (40P01) is retried
  once; a size refusal (23514, over 4 KB) is permanent: that day's flag is dropped and logged.
- **Walks deleted in Health** stay on the account until Disconnect; removing them is a W2 question.
- **Pull:** `fromServerDay` drops `wearable` from `leanplan.v1`; the pull writes it into the health
  store through `mayShowWearable` (§6): a day with a pending `meta.wear[d]` keeps the local copy;
  otherwise the server wins, null included (a withdrawal elsewhere clears it here). Rows with no content
  of their own (wearable only) never become empty days in `leanplan.v1` and never count in
  `accountRows` or `sameAccount`.
- **Confirmed walks** change `sessions`, so they go through M1's compare-and-swap (§6).
- **TL002** (the server refusing watch data without a current `wearables` yes) maps to its own consent
  error, counted as a whole-request refusal. The app runs `pullConsents`; only if the latest `wearables`
  answer is then a no does `applyWearablesWithdrawal` drop the pending flags, otherwise they wait for the
  next run. The wearable step is skipped in any run whose consents step didn't finish. No retry loop.

## 3. On the phone: kept out of iPhone backups

- `leanplan.v1` is included in iPhone backups (`apps/native/lib/platform/storage.ts`), so the phone's
  copy of `wearable` lives in its own `tilo-store` namespace `health` (key `tali.health`), excluded from
  backup (M2), owner-stamped and read through the §6 gates. Screens merge it with the day in memory.
- Retention on the phone: the health store keeps only the import window (14 nights, 56 days) and prunes
  the rest; older watch data stays on the account. Recorded in the register.
- **OPEN (Benn, §3.5 item 9):** a confirmed walk is a session in `leanplan.v1`, which is in backups.
  `compliance` recommends **excluding the whole store from iPhone backups**: everything is on the
  account (no guest mode), so a restore re-syncs; the only loss is edits not yet synced, which the
  policy would say. If Benn keeps the store in backups, the register records the judgement (the person
  confirmed the walk, so it is their own entry) as an App Review risk, not a settled point.

## 4. Consent: `wearables`

- New type `wearables` (version `2026-11-v1`), off by default, asked on the Connect screen before the
  iOS sheet, offered only with a current health yes. Records only on a change (the consent row cap is shared).
- **Withdrawal is as easy as giving it:** Disconnect is on the Connect screen and in Profile → Privacy,
  next to the health consent.
- Withdrawing it: stops reading, deletes imported records on the phone and on the account
  (`clear_wearables_after_withdrawal()`, with a daily server backstop, §5), and keeps the person's own
  entries. The Disconnect sheet says so: "Walks you confirmed stay in your Train log as your own
  entries; you can delete them there."
- Turning Tilo off in the Health app stops new reads but deletes nothing, and Tilo can't tell it
  happened. The policy and the Disconnect copy say: "Turning Tilo off in the Health app stops new
  reads; to delete what Tilo has already imported, use Disconnect."
- A health withdrawal also records a `wearables` withdrawal (only when the latest is a yes), so a
  later health yes never resumes imports. Health withdrawal already deletes the whole log on the server.

## 5. Server (one migration, `security-data`, Benn applies before any build records `wearables`)

Written after `2026-11-16-cycle-consent.sql`; the consent type list keeps `cycle`.

1. `consents_type_check` gains `'wearables'` (keeping every type, `cycle` included).
2. `day_logs.wearable jsonb`, null or an object, at most 4 KB. Existing table grants cover the column;
   RLS is per row, unchanged.
3. `wearables_consent_current(uid)`: health consent current and the latest `wearables` record a yes.
4. Trigger `require_wearables_consent` (BEFORE INSERT OR UPDATE on `day_logs`): a new or changed
   non-null `wearable` is refused (`TL002`) unless `wearables_consent_current`. It runs after
   `require_health_consent` (alphabetical), takes the same shared lock, passes the service role, and
   passes old builds whose upserts don't send the column.
5. `merge_wearable(d date, patch jsonb)`: security invoker; a merge-only lock first, then the
   `tali-log` lock shared (so it never deadlocks against the consent triggers of M1's PATCH, and still
   waits for the clear functions); validates, allow-lists and merges the day's `wearable` (rules in §2);
   the triggers still fire.
6. `clear_wearables_after_withdrawal()`: security invoker, exclusive lock; returns `cleared:false` while
   `wearables` is current, and `cleared:false, reason:'health'` while health isn't (then
   `clear_log_after_withdrawal` owns the deletion, and the UPDATE would be refused by
   `require_health_consent` anyway). The app marks `wearablesCleared` on `cleared:true` or reason
   `health`, so a call made before the withdrawal reached the server retries, and nothing retries forever.
7. **Backstop:** `purge_withdrawn_wearables()`, scheduled daily with `cron.schedule` (as
   `purge_unconsented_logs` is; cron runs it as postgres, no API role may call it), nulls `wearable` for
   up to 200 accounts a run whose latest `wearables` answer is a no older than a day (the due test in the
   query, so only due accounts are locked; re-checked under the lock), so watch data never outlives a
   withdrawal from a phone that is never opened again.
8. Unchanged and already covering the column: `clear_log_after_withdrawal()`,
   `purge_unconsented_logs()` and delete-account (`USER_TABLES`) delete whole rows; export reads rows.
9. The client never sends `wearable` while `wearables` isn't current.

## 6. Security design

- **H1 `mayReadHealth` (reading HealthKit, foreground and background).** The consent belongs to the
  account; the iOS permission to the phone. A device connection record `{ owner: uid, at, consentId }`
  in the health store, written only by this phone's Connect. Reads need: the record's owner is the
  signed-in uid; the latest `wearables` record is a yes with id `consentId`; health consent current on
  the device (`hasCurrentConsent('health')`, `consentLetsSync`, not `healthSyncPaused`); signed in, no
  owner question pending.
- **`mayShowWearable` (showing synced watch data, on any phone):** signed in, no owner question pending,
  the store's stamp equals `_meta.owner`, health consent current, the latest `wearables` record a yes.
  It needs no connection record, so a phone that never connected can still show the account's synced data.
- **H2 Withdrawals from anywhere.** A platform hook `onHealthDataCleared` inside `clearHealthData`
  (consent.ts; its three callers covered) wipes the health store and stops reads.
  `applyWearablesWithdrawal(s, meta)` runs after every `pullConsents` (next to the two
  `applyHealthWithdrawal` calls in `store.ts`), once per record id (`wearablesCleared`, set on
  `cleared:true` or reason `health`): it wipes the store, drops `meta.wear`, and calls `clear_wearables_after_withdrawal()`.
  The shared `withdraw('health')` records the `wearables` withdrawal.
- **H3 Every read fails closed.** The health store returns empty, and clears, unless `mayShowWearable`
  holds; the hooks only tidy up.
- **M1 Confirmed walks** (they change `sessions`): compare-and-swap at push, only for a day that was
  synced and clean when the walk was confirmed; any other edit clears `base` and `ops` and the day goes
  back to the plain upsert. `PATCH day_logs?user_id=eq.<uid>&log_date=eq.<d>&updated_at=eq.<base>`
  (`base` is the server's `updated_at` exactly as received, URL-encoded), `Prefer:
  return=representation`; no row: fetch, rebase the session operations by id, retry; no `base`: insert
  with `resolution=ignore-duplicates`, empty reply means rebase; at most 3 attempts, then `failed`.
  Bodies are shaped as `pushDirty`'s days step shapes them, after the consents step. Imports now move
  `updated_at` too, so rebases are expected.
- **M2 The store.** Namespace `health`; `isExcludedFromBackup` on the namespace folder at every open,
  read back in a native test; exclusion and protection from a Swift allow-list. Background delivery
  reads while the phone may be locked, so the class is `completeUntilFirstUserAuthentication`, and
  `loaded()` must throw (not cache an empty store) if read before first unlock.
- **M3 Sentinel test** (`scripts/wellbeing/data-device.ts`): plant distinctive values; run `pushDirty`,
  the wearable push and the serialisers over every table. Assert:
  `healthkit` appears only at `day_logs[*].wearable.src` and `day_logs[*].sessions[*].src`; `wearable`
  keys are exactly those in §2; no Apple workout id, distance, energy, stage, span, bed or wake time
  anywhere; no `checkin.night` with a source other than `self`; no `wearable` in any upload while
  `wearables` isn't current; the day push never carries `wearable`; the saved `leanplan.v1` JSON has no
  `wearable` and no `healthkit` except `sessions[*].src`; `fromServerDay` drops `wearable`; TL002 drops
  the pending flags without a loop; a pull keeps a pending `meta.wear` day; a restore drops `wearable`.
  Import boundary: only the health store and the importer import `modules/tilo-health`.
- **M4 Swift** returns only §1's fields; `value` is removed from `SleepSample`.
- **L** The migration before any build records `wearables` (a test that the newest
  `consents_type_check` equals `CONSENT_TYPES`); `cleanGuided` keeps `src` only if
  `^[a-z][a-z0-9-]{0,31}$` and `srcKey` only if exactly 16 hex characters; validation keeps `wearable` by shape.
- **Backup file.** `exportBackup` merges `wearable` in from the health store on purpose (access right);
  the web's export has none, so the account-level export reads the server copy. A restore **always**
  drops `wearable` and never sets `meta.wear` (the file can be hand-edited; HealthKit and the server
  re-supply it).

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
- `healthDataSummary` (consent.ts) counts check-ins from `checkin` only; it gains a separate "watch
  days" count for the withdrawal and export summaries.

## 8. Text changes (gated on a new `watch` flag with `native`)

- **In-app `wearables` consent copy** (version `2026-11-v1`), for `compliance` and Benn or Sara: what is
  read (sleep, steps, walks), that summaries save to the account, that reading happens in the background
  while the app is closed, that the person's own answer always counts, how to withdraw, and that
  confirmed walks are kept.
- **Purpose string**, rewritten (the spike's "next to your check-in" and "Nothing is shared unless you
  choose to" become untrue): it names the account and background reading too (5.1.1). Wording past
  `compliance` and Benn or Sara.
- **Privacy policy:** what syncs (hours asleep per night; daily steps; walks: type, start, length, brisk
  or not); what is read on the phone and never kept or sent (sleep stages, to add up hours; distance, to
  tell whether a walk was brisk); what isn't read (heart rate, energy, routes); kept out of iPhone
  backups; background reading; a separate consent; the person's own answer always counts; how to stop
  (Disconnect, in the Connect screen and Profile → Privacy, deletes imported records on the phone and
  the account; confirmed walks stay as Train entries); the Health app switch stops reads but deletes
  nothing; Apple Health is not a processor. If the whole store leaves backups (§3), edits not yet synced
  are lost on a restore.
- **Privacy policy, "How long we keep it"** (`privacy.ts`): a wearables line: "If you disconnect Apple
  Health, we delete imported watch data from your account straight away (or as soon as your phone next
  connects)", and that reason added to the backup-expiry sentence (today only the health and unconsented
  cases). Art. 13(2)(a).
- **Cookie and storage policy:** the `tali.health` entry (the phone's copy, excluded from backup, the
  last 14 nights and 56 days).
- **Register:** a processing row (day logs gain `wearable`; Art. 6(1)(b) and 9(2)(a) with the
  `wearables` consent; bed and wake times deliberately not kept; phone retention; confirmed walks keep `src` and `srcKey`,
  which sit in `leanplan.v1` and so fall under §3's backup decision); consent types; the
  Wellbeing row's sentence that `checkin.night` device fields are "reserved for a later wearable build"
  rewritten (never written there; the sentinel asserts it); open items (Apple's HealthKit licence terms,
  §3's backup decision, the Health app path on iOS 27, pilot measures by asking, not telemetry; the
  planned new controller means re-consent, `wearables` included).
- **DPIA §10 addendum,** signed before any imported data is stored, TestFlight included: synced
  summaries, background reads, gentle-mode display, risks (worry from watch sleep, orthosomnia,
  compulsive stepping, a shared phone, imports outliving a withdrawal), the intended-purpose statement
  (general wellness, not diagnosing or monitoring sleep disorders), no new processor.
- **App Store:** privacy label Health and Fitness (separate types), linked, app functionality; never
  tracking, ads, analytics, marketing or data mining; the description names Apple Health (2.5.1);
  method wording ("Your watch estimated...", the brisk test's limits) for 1.4.1.

## 9. Before anything ships

The migration (Benn applies first, after the Cycle one); consent types and versions; consent copy,
purpose string and gated texts with `check:legal` passing and Webflow drafts only; register and DPIA
§10 signed; Swift minimisation, backup exclusion and its native test; the walk-key check on a device;
the sentinel test; boards approved (Connect, sleep views, walk confirmation, "Not right?", Disconnect
in both places); label, manifest, App Store description; `ship-critic`. OPEN for Benn: §3.5 item 9
(exclude the whole store from backups) and item 7 (`STEPS_MULT`); bed and wake times deferred (§1).

**Build notes from `security-data` (fold in before the build, no re-review):** an empty merge
(`merged - 'src' = '{}'`) returns without writing; `merge_wearable` checks values, not just names
(`type = 'walking'`, `start` HH:MM, `mins` and `asleepMin` 0 to 1440, steps 0 to 200,000, `brisk`
boolean, else 22023); the purge wraps each person in an `exception when deadlock_detected` block and
finds distinct users before calling the consent functions; the retry-once on 40P01 also covers
`clear_wearables_after_withdrawal` and M1's PATCH; a night's `asleepMin` keeps the larger value (as
steps), so a partial read while iCloud Health syncs never shrinks it.

## Migration draft (not applied; for `docs/migrations/`, after `2026-11-16-cycle-consent.sql`)

```sql
-- Tilo: wearables consent and day_logs.wearable (Apple Health import W1, synced summaries).
-- NOT APPLIED: security-data review, then Benn applies it AFTER 2026-11-16-cycle-consent.sql and
-- BEFORE any native build that records a 'wearables' consent or calls merge_wearable ships.
-- Widening: every existing row passes the new checks; the column is nullable. Existing table grants
-- cover the column; RLS is per row and unchanged. clear_log_after_withdrawal, purge_unconsented_logs
-- and delete-account delete whole day_logs rows, so they already cover it.
-- Rollback: select cron.unschedule('tali-purge-wearables'); drop the trigger and functions. Never delete
-- consent history; to narrow the type check, re-run the cycle migration's step only if
-- (select count(*) from public.consents where type = 'wearables') = 0. The column can be dropped once
-- no client reads it (or left, unused).
begin;

alter table public.consents drop constraint if exists consents_type_check;
alter table public.consents add constraint consents_type_check
  check (type in ('health', 'ai', 'label-photo', 'shared-products', 'cycle', 'wearables'));

alter table public.day_logs add column if not exists wearable jsonb;
alter table public.day_logs drop constraint if exists day_logs_wearable_shape;
alter table public.day_logs add constraint day_logs_wearable_shape
  check (wearable is null or (jsonb_typeof(wearable) = 'object' and pg_column_size(wearable) <= 4096));

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

-- the importer's only write: merges one day's watch summary. Lock order: a merge-only key first (merges
-- queue behind each other), then 'tali-log' SHARED, so a merge never deadlocks against the consent
-- triggers of a plain UPDATE (M1's PATCH) and still waits for the clear functions' exclusive lock.
-- Server-side allow-list: night keeps only asleepMin; each walk keeps only key, type, start, mins, brisk.
create or replace function public.merge_wearable(d date, patch jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); found_row boolean; cur jsonb; merged jsonb; walks jsonb; k text;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if patch is null or jsonb_typeof(patch) <> 'object' then
    raise exception 'tali: bad wearable' using errcode = '22023';
  end if;
  if patch ? 'walks' and (jsonb_typeof(patch->'walks') <> 'array' or exists (
       select 1 from jsonb_array_elements(patch->'walks') w
       where jsonb_typeof(w) <> 'object' or coalesce(w->>'key', '') !~ '^[0-9a-f]{16}$')) then
    raise exception 'tali: bad wearable walk' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tali-wear:' || uid::text, 0));
  perform pg_advisory_xact_lock_shared(hashtextextended('tali-log:' || uid::text, 0));
  select true, wearable into found_row, cur from public.day_logs where user_id = uid and log_date = d;
  cur := coalesce(cur, '{}'::jsonb);
  merged := cur || jsonb_build_object('src', 'healthkit');
  if jsonb_typeof(patch->'night') = 'object' and jsonb_typeof(patch->'night'->'asleepMin') = 'number' then
    merged := merged || jsonb_build_object('night', jsonb_build_object('asleepMin', patch->'night'->'asleepMin'));
  end if;
  -- steps and stepsInWalks: a number always beats { notWorn: true }; the larger number wins;
  -- notWorn only fills a day that has no number (a partial or locked read never wipes a count)
  foreach k in array array['steps', 'stepsInWalks'] loop
    if jsonb_typeof(patch->k) = 'number' then
      merged := merged || jsonb_build_object(k, case when jsonb_typeof(cur->k) = 'number'
        then to_jsonb(greatest((cur->>k)::numeric, (patch->>k)::numeric)) else patch->k end);
    elsif patch->k = '{"notWorn": true}'::jsonb and jsonb_typeof(cur->k) is distinct from 'number' then
      merged := merged || jsonb_build_object(k, '{"notWorn": true}'::jsonb);
    end if;
  end loop;
  if patch ? 'walks' then
    -- walks merged by key (the patch's version wins); a walk deleted in Health stays until Disconnect (W2)
    select coalesce(jsonb_agg(w order by w->>'start'), '[]'::jsonb) into walks from (
      select distinct on (w->>'key') w from (
        select jsonb_strip_nulls(jsonb_build_object('key', w->'key', 'type', w->'type', 'start', w->'start',
                 'mins', w->'mins', 'brisk', w->'brisk')) as w, 1 as pri
          from jsonb_array_elements(patch->'walks') w
        union all
        select w, 2 from jsonb_array_elements(coalesce(cur->'walks', '[]'::jsonb)) w
      ) x order by w->>'key', pri
    ) y;
    merged := merged || jsonb_build_object('walks', walks);
  end if;
  -- nothing changed: no write, so updated_at doesn't move and M1 needn't rebase
  if found_row and merged = cur then return merged; end if;
  insert into public.day_logs (user_id, log_date, wearable) values (uid, d, merged)
    on conflict (user_id, log_date) do update set wearable = excluded.wearable;
  return merged;
end $$;
revoke all on function public.merge_wearable(date, jsonb) from public, anon;
grant execute on function public.merge_wearable(date, jsonb) to authenticated;

create or replace function public.clear_wearables_after_withdrawal()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tali-log:' || uid::text, 0));
  -- nothing to do while wearables is current; and with health withdrawn, clear_log_after_withdrawal
  -- removes the rows (this UPDATE would be refused by require_health_consent)
  if not public.health_consent_current(uid) then
    return jsonb_build_object('cleared', false, 'reason', 'health', 'at', now());
  end if;
  if public.wearables_consent_current(uid) then
    return jsonb_build_object('cleared', false, 'at', now());
  end if;
  update public.day_logs set wearable = null where user_id = uid and wearable is not null;
  get diagnostics n = row_count;
  return jsonb_build_object('cleared', true, 'rows', n, 'at', now());
end $$;
revoke all on function public.clear_wearables_after_withdrawal() from public, anon;
grant execute on function public.clear_wearables_after_withdrawal() to authenticated;

-- backstop: daily (cron, as postgres) nulls watch data for accounts whose latest wearables answer is
-- a no older than a day. The due test is in the query, so only due accounts are locked; 200 a run.
-- The re-check also clears when health isn't current (the safe direction: no yes, no watch data).
create or replace function public.purge_withdrawn_wearables()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r record; people integer := 0; total integer := 0; n integer;
begin
  for r in
    select distinct d.user_id from public.day_logs d
    where d.wearable is not null
      and not public.wearables_consent_current(d.user_id)
      and (select least(c.recorded_at, c.created_at) from public.consents c
           where c.user_id = d.user_id and c.type = 'wearables' and not c.granted
           order by least(c.recorded_at, c.created_at) desc, c.created_at desc limit 1)
          < now() - interval '1 day'
    limit 200
  loop
    perform pg_advisory_xact_lock(hashtextextended('tali-log:' || r.user_id::text, 0));
    -- again under the lock: a yes may have arrived since
    if not public.wearables_consent_current(r.user_id) then
      update public.day_logs set wearable = null where user_id = r.user_id and wearable is not null;
      get diagnostics n = row_count; total := total + n; people := people + 1;
    end if;
  end loop;
  return jsonb_build_object('people', people, 'rows', total, 'at', now());
end $$;
-- cron runs it as postgres; no API role may call it
revoke all on function public.purge_withdrawn_wearables() from public, anon, authenticated, service_role;
select cron.schedule('tali-purge-wearables', '23 3 * * *', 'select public.purge_withdrawn_wearables()');

notify pgrst, 'reload schema';
commit;
-- Verify:
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.consents'::regclass and conname = 'consents_type_check';
-- select column_name from information_schema.columns where table_name = 'day_logs' and column_name = 'wearable';
-- select jobname, schedule, command from cron.job where jobname = 'tali-purge-wearables';
```
