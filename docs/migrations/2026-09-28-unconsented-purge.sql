-- ============================================================================
-- Tali: delete an account's log after 30 days without a yes (Benn's decision, 28 Sept 2026)
--
-- Needs 2026-09-28-health-consent-server.sql first (health_consent_current).
--
-- Someone who used Tali before consent was asked may say "Not now" (the log stays on their
-- phone), or may not open the app at all. Either way, the copy already in their account is
-- kept, unused, for 30 days and then deleted: no Art. 9(2) condition covers storing it longer
-- (Art. 5(1)(e)). The phone keeps its own copy. If they come back, the app asks again, and a yes
-- uploads the whole log from the phone (grantHealth in src/data/consent.ts).
--
-- purge_unconsented_logs() deletes the log rows (day_logs, custom_foods, recipes, routines,
-- training_plans, push_subscriptions, settings; never consents) of anyone whose latest health
-- answer isn't a yes, when:
--   * there's no health answer at all, and 30 days have passed since the later of PURGE_FROM
--     (the day this ships, when existing users are first asked) and the account's creation; or
--   * the latest answer is a no more than a day old (a backstop: the app clears the account's
--     copy straight after a withdrawal, through clear_log_after_withdrawal).
-- Each person is locked (the same advisory lock as the upload guard) and re-checked before the
-- delete, so a yes arriving meanwhile wins. Returns counts only.
--
-- Runs daily at 03:17 UTC through pg_cron. Service only: no app user can call it.
-- PURGE_FROM is the release day, or the day the notice emails go out if later, so everyone gets the
-- full 30 days; the app names the resulting date (UNCONSENTED_DELETION in src/core/legal/index.ts,
-- npm test checks they agree). Safe to re-run.
-- Rollback: select cron.unschedule('tali-purge-unconsented'); drop function public.purge_unconsented_logs();
-- ============================================================================

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
  for uid in
    select u.id from auth.users u
    where exists (select 1 from public.day_logs x where x.user_id = u.id)
       or exists (select 1 from public.custom_foods x where x.user_id = u.id)
       or exists (select 1 from public.recipes x where x.user_id = u.id)
       or exists (select 1 from public.routines x where x.user_id = u.id)
       or exists (select 1 from public.training_plans x where x.user_id = u.id)
       or exists (select 1 from public.push_subscriptions x where x.user_id = u.id)
       or exists (select 1 from public.settings x where x.user_id = u.id)
  loop
    perform pg_advisory_xact_lock(hashtextextended('tali-log:' || uid::text, 0));
    if public.health_consent_current(uid) then continue; end if;
    if not (
      (not exists (select 1 from public.consents k where k.user_id = uid and k.type = 'health')
        and now() > greatest(purge_from, (select u.created_at from auth.users u where u.id = uid)) + interval '30 days')
      or exists (
        select 1 from (
          select k.granted, least(k.recorded_at, k.created_at) as at from public.consents k
          where k.user_id = uid and k.type = 'health'
          order by least(k.recorded_at, k.created_at) desc, k.created_at desc limit 1
        ) l where not l.granted and l.at < now() - interval '1 day')
    ) then continue; end if;
    delete from public.day_logs where user_id = uid;           get diagnostics c = row_count; n := n + c;
    delete from public.custom_foods where user_id = uid;       get diagnostics c = row_count; n := n + c;
    delete from public.recipes where user_id = uid;            get diagnostics c = row_count; n := n + c;
    delete from public.routines where user_id = uid;           get diagnostics c = row_count; n := n + c;
    delete from public.training_plans where user_id = uid;     get diagnostics c = row_count; n := n + c;
    delete from public.push_subscriptions where user_id = uid; get diagnostics c = row_count; n := n + c;
    delete from public.settings where user_id = uid;           get diagnostics c = row_count; n := n + c;
    people := people + 1;
  end loop;
  return jsonb_build_object('people', people, 'rows', n, 'at', now());
end;
$$;

revoke all on function public.purge_unconsented_logs() from public, anon, authenticated;

select cron.schedule('tali-purge-unconsented', '17 3 * * *', 'select public.purge_unconsented_logs()');

-- Verify (optional):
-- select jobname, schedule, command from cron.job where jobname = 'tali-purge-unconsented';
-- Who it would clear, and when (read-only):
-- select u.id, greatest(timestamptz '2026-09-28', u.created_at) + interval '30 days' as due
-- from auth.users u where not public.health_consent_current(u.id);
