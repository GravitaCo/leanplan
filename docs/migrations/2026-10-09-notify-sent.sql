-- ============================================================================
-- Tali: the server's daily cap for Mind reminders (wellbeing Phase 1, build plan WP16;
-- security-data H4). WRITTEN, NOT APPLIED. Benn is asked before this touches the live database
-- (his answer to build plan C15); security-data and compliance review it first.
--
-- Needs 2026-09-28-health-consent-server.sql and 2026-09-28-unconsented-purge.sql first: this
-- re-creates clear_log_after_withdrawal() and purge_unconsented_logs() from their current
-- definitions there, with notify_sent added. Safe to re-run.
--
-- notify_sent: one row per person, written only by the reminder function (service role):
--   last_on  the person's local day the last check-in or plan check-in reminder was sent: at most
--            one of those a day (null until one has gone)
--   by_kind  {"checkin": "2026-10-09", ...}: the last day per type, for the halving rule (a type
--            the person stopped opening goes every other day) and for the wind-down reminder, which
--            sits outside the cap (Benn, 10 Oct 2026) but still goes at most once a day
-- Health data by inference (which Mind reminders someone gets), 6(1)(b) + 9(2)(a): kept until a
-- withdrawal (cleared with the log) or account deletion (cascade, and USER_TABLES).
--
-- notify_claim(uid, day, kind): atomic. For a check-in or plan check-in it claims `day` for that
-- person (last_on) and records `kind`, and returns true only if neither was claimed for that day
-- yet. For the wind-down reminder it claims only by_kind's 'wind-down' day and leaves last_on alone,
-- so it never uses up the day's check-in or plan reminder. The function claims first and sends only
-- on true, so two runs, two subscriptions or a retry never send two.
--
-- Rollback (only with the function back on index.ts, which doesn't use it):
--   drop function public.notify_claim(uuid, date, text); drop table public.notify_sent;
--   then re-run 2026-09-28-health-consent-server.sql §3 and 2026-09-28-unconsented-purge.sql
--   (without its cron.schedule line) to restore the two functions without notify_sent.
-- ============================================================================

create table if not exists public.notify_sent (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_on date,
  by_kind jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- last_on is null for someone who has only had a wind-down reminder (outside the cap); a re-run
-- over an earlier draft of this table relaxes it
alter table public.notify_sent alter column last_on drop not null;

-- RLS on: the person can read their own row (data access requests) and delete it (only so
-- clear_log_after_withdrawal(), SECURITY INVOKER and so run as `authenticated`, can clear it);
-- nobody but the service role inserts or updates it. Listed in docs/security-rls.sql §6 (never
-- add it to the FOR ALL loops there).
alter table public.notify_sent enable row level security;
drop policy if exists notify_sent_select_own on public.notify_sent;
create policy notify_sent_select_own on public.notify_sent
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.notify_sent from anon, authenticated;
grant select, delete on public.notify_sent to authenticated;
drop policy if exists notify_sent_delete_own on public.notify_sent;
create policy notify_sent_delete_own on public.notify_sent for delete to authenticated using (user_id = (select auth.uid()));

-- the upload guard, as on every log table (a signed-in person can't write here anyway; the
-- service role passes)
drop trigger if exists require_health_consent on public.notify_sent;
create trigger require_health_consent before insert or update on public.notify_sent
  for each row execute function public.require_health_consent();

-- The claim. Service role only.
create or replace function public.notify_claim(uid uuid, day date, kind text)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  ok boolean;
begin
  if kind is null or kind not in ('checkin', 'wind-down', 'plan') then
    raise exception 'notify_claim: unknown kind' using errcode = '22023';
  end if;
  -- the same per-person lock as the upload guard and the withdrawal clear: a claim can't race a
  -- withdrawal, and a person without a current yes gets no Mind reminder
  perform pg_advisory_xact_lock_shared(hashtextextended('tali-log:' || uid::text, 0));
  if not public.health_consent_current(uid) then return false; end if;
  if kind = 'wind-down' then
    -- outside the daily cap: its own day only, last_on untouched
    insert into public.notify_sent as n (user_id, last_on, by_kind)
    values (uid, null, jsonb_build_object(kind, day))
    on conflict (user_id) do update
      set by_kind = n.by_kind || excluded.by_kind,
          updated_at = now()
      where n.by_kind ->> 'wind-down' is null or (n.by_kind ->> 'wind-down')::date < day
    returning true into ok;
    return coalesce(ok, false);
  end if;
  insert into public.notify_sent as n (user_id, last_on, by_kind)
  values (uid, day, jsonb_build_object(kind, day))
  on conflict (user_id) do update
    set last_on = excluded.last_on,
        by_kind = n.by_kind || jsonb_build_object(kind, excluded.last_on),
        updated_at = now()
    where n.last_on is null or n.last_on < excluded.last_on
  returning true into ok;
  return coalesce(ok, false);
end;
$$;

revoke execute on function public.notify_claim(uuid, date, text) from public, anon, authenticated;
grant execute on function public.notify_claim(uuid, date, text) to service_role;

-- Clearing the account's copy after a withdrawal (2026-09-28-health-consent-server.sql §3), with
-- notify_sent added
create or replace function public.clear_log_after_withdrawal()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n integer := 0;
  c integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tali-log:' || uid::text, 0));
  -- only while the latest answer is a no (another phone may have said yes since)
  if not exists (select 1 from public.consents where user_id = uid and type = 'health')
     or public.health_consent_current(uid) then
    return jsonb_build_object('cleared', false, 'at', now());
  end if;
  delete from public.day_logs where user_id = uid;           get diagnostics c = row_count; n := n + c;
  delete from public.custom_foods where user_id = uid;       get diagnostics c = row_count; n := n + c;
  delete from public.recipes where user_id = uid;            get diagnostics c = row_count; n := n + c;
  delete from public.routines where user_id = uid;           get diagnostics c = row_count; n := n + c;
  delete from public.training_plans where user_id = uid;     get diagnostics c = row_count; n := n + c;
  delete from public.push_subscriptions where user_id = uid; get diagnostics c = row_count; n := n + c;
  delete from public.notify_sent where user_id = uid;        get diagnostics c = row_count; n := n + c;
  delete from public.settings where user_id = uid;           get diagnostics c = row_count; n := n + c;
  return jsonb_build_object('cleared', true, 'rows', n, 'at', now());
end;
$$;

revoke all on function public.clear_log_after_withdrawal() from public, anon;
grant execute on function public.clear_log_after_withdrawal() to authenticated;

-- The 30-day purge (2026-09-28-unconsented-purge.sql), with notify_sent added to the has-rows
-- check and the deletes. Its cron job is already scheduled: not scheduled again here.
create or replace function public.purge_unconsented_logs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  purge_from constant timestamptz := timestamptz '2026-09-28 00:00:00+00'; -- PURGE_FROM
  people integer := 0;
  n integer := 0;
  c integer;
  uid uuid;
begin
  -- only people due now, at most 200 a run: each holds a lock until the run commits, so a
  -- backlog clears over the following days rather than in one long transaction
  for uid in
    select u.id from auth.users u
    where (exists (select 1 from public.day_logs x where x.user_id = u.id)
       or exists (select 1 from public.custom_foods x where x.user_id = u.id)
       or exists (select 1 from public.recipes x where x.user_id = u.id)
       or exists (select 1 from public.routines x where x.user_id = u.id)
       or exists (select 1 from public.training_plans x where x.user_id = u.id)
       or exists (select 1 from public.push_subscriptions x where x.user_id = u.id)
       or exists (select 1 from public.notify_sent x where x.user_id = u.id)
       or exists (select 1 from public.settings x where x.user_id = u.id))
      and public.unconsented_log_due(u.id, purge_from)
    limit 200
  loop
    perform pg_advisory_xact_lock(hashtextextended('tali-log:' || uid::text, 0));
    -- again under the lock: a yes may have arrived since
    if not public.unconsented_log_due(uid, purge_from) then continue; end if;
    delete from public.day_logs where user_id = uid;           get diagnostics c = row_count; n := n + c;
    delete from public.custom_foods where user_id = uid;       get diagnostics c = row_count; n := n + c;
    delete from public.recipes where user_id = uid;            get diagnostics c = row_count; n := n + c;
    delete from public.routines where user_id = uid;           get diagnostics c = row_count; n := n + c;
    delete from public.training_plans where user_id = uid;     get diagnostics c = row_count; n := n + c;
    delete from public.push_subscriptions where user_id = uid; get diagnostics c = row_count; n := n + c;
    delete from public.notify_sent where user_id = uid;        get diagnostics c = row_count; n := n + c;
    delete from public.settings where user_id = uid;           get diagnostics c = row_count; n := n + c;
    people := people + 1;
  end loop;
  return jsonb_build_object('people', people, 'rows', n, 'at', now());
end;
$$;

-- cron runs it as postgres; no API role may call it
revoke all on function public.purge_unconsented_logs() from public, anon, authenticated, service_role;

-- Verify (optional):
-- select relrowsecurity from pg_class where oid = 'public.notify_sent'::regclass;
-- select polname, polcmd from pg_policy where polrelid = 'public.notify_sent'::regclass;
-- select proname, proacl from pg_proc where proname in ('notify_claim','clear_log_after_withdrawal','purge_unconsented_logs');
-- select tgname from pg_trigger where tgrelid = 'public.notify_sent'::regclass;
-- The claim, as service role, on a test user whose latest health answer is a yes. Run it inside
-- begin; ... rollback; as below: without the rollback it writes a real notify_sent row.
-- check-in and plan share the one-a-day cap (last_on); wind-down records only by_kind['wind-down'],
-- leaves last_on alone, and goes once a day whatever the check-in claim did.
--   begin;
--   select public.notify_claim('<uid>', '2026-10-09', 'checkin');   -- true
--   select public.notify_claim('<uid>', '2026-10-09', 'plan');      -- false (the cap: one check-in or plan a day)
--   select public.notify_claim('<uid>', '2026-10-09', 'wind-down'); -- true (outside the cap)
--   select public.notify_claim('<uid>', '2026-10-09', 'wind-down'); -- false (once a day)
--   select public.notify_claim('<uid>', '2026-10-10', 'plan');      -- true (next day)
--   rollback;
-- Withdrawal clear (clear_log_after_withdrawal() is SECURITY INVOKER, so it needs the owner's
-- DELETE on notify_sent). With a test user who has a notify_sent row and whose latest health
-- answer is a no:
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<test uid>","role":"authenticated"}', true);
--   select public.clear_log_after_withdrawal();   -- succeeds: {"cleared": true, "rows": n, ...}
--   select count(*) from public.notify_sent;      -- 0
--   rollback;                                     -- or commit, on a throwaway test user
