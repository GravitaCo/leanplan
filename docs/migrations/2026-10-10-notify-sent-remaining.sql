-- The part of 2026-10-09-notify-sent.sql not yet on the live database (10 Oct 2026): the withdrawal
-- clear and the 30-day purge, with notify_sent added. Paste into the Supabase SQL editor and run.

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

