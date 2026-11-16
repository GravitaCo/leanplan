-- ============================================================================
-- Tali: health consent enforced on the server (Benn's decision, 28 Sept 2026)
--
-- Food and workout logs are treated as health data (UK/EU GDPR Art. 9; see
-- docs/compliance/README.md). Without a current "yes" to health data, nothing of a person's log
-- may be written to their account, and a withdrawal deletes the account's copy of it. The app
-- already works this way; this makes the server enforce it, so a second phone that hasn't heard
-- about a withdrawal, an old cached app version, or a race between phones can't put data back.
--
-- 1. health_consent_current(uid): the person's latest health consent record is a yes.
-- 2. A guard on every log table: an insert or update by a signed-in person is refused (TL001,
--    'tali: health consent required') unless their latest health answer is a yes. The service
--    role (server jobs, account deletion) isn't a person's upload and passes.
-- 3. clear_log_after_withdrawal(): in one transaction, only while the latest health answer is a
--    no, deletes the person's rows from every log table (not their consent records). The app
--    calls it after a withdrawal. Serialised with the guard through a per-person advisory lock,
--    so no upload can land between the check and the delete.
--
-- Applied to production 2026-09-28 after security-data review. Safe to re-run. Rollback: drop the triggers, then
-- the three functions (the app then can't clear after a withdrawal: don't ship it without them).
-- ============================================================================

-- 1. Latest health answer. A record counts from the earlier of the phone's time and its arrival
--    (created_at, set by the server), so a phone clock running fast (recorded_at may be up to a
--    day ahead) can't put a yes after a later withdrawal. Ties: the later arrival wins.
create or replace function public.health_consent_current(uid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select c.granted from public.consents c
    where c.user_id = uid and c.type = 'health'
    order by least(c.recorded_at, c.created_at) desc, c.created_at desc
    limit 1
  ), false)
$$;

revoke all on function public.health_consent_current(uuid) from public, anon;
grant execute on function public.health_consent_current(uuid) to authenticated, service_role;

-- 2. The guard on the log tables
create or replace function public.require_health_consent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  -- server-side jobs (service role, no user) aren't a person's upload; an app role without a
  -- user (anon) never writes the log
  if uid is null then
    if current_user in ('anon', 'authenticated') then
      raise exception 'tali: health consent required' using errcode = 'TL001';
    end if;
    return new;
  end if;
  -- shares the lock clear_log_after_withdrawal takes exclusively: a clear and an upload for the
  -- same person never interleave
  perform pg_advisory_xact_lock_shared(hashtextextended('tali-log:' || uid::text, 0));
  if not public.health_consent_current(uid) then
    raise exception 'tali: health consent required' using errcode = 'TL001';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['day_logs','custom_foods','recipes','routines','training_plans','settings','push_subscriptions']
  loop
    execute format('drop trigger if exists require_health_consent on public.%I', t);
    execute format(
      'create trigger require_health_consent before insert or update on public.%I '
      || 'for each row execute function public.require_health_consent()', t);
  end loop;
end $$;

-- 3. Clearing the account's copy after a withdrawal
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
  delete from public.settings where user_id = uid;           get diagnostics c = row_count; n := n + c;
  return jsonb_build_object('cleared', true, 'rows', n, 'at', now());
end;
$$;

revoke all on function public.clear_log_after_withdrawal() from public, anon;
grant execute on function public.clear_log_after_withdrawal() to authenticated;

-- Verify (optional):
-- select tgname, tgrelid::regclass from pg_trigger where tgname = 'require_health_consent';
-- select proname, prosecdef from pg_proc where proname in ('health_consent_current','require_health_consent','clear_log_after_withdrawal');
