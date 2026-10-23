-- ============================================================================
-- Tali: tighten the live grants on the five original synced tables (23 Oct 2026).
--
-- APPLIED 23 Oct 2026 (Benn's go-ahead; verified after: no anon grants, authenticated DELETE, INSERT,
-- SELECT, UPDATE only). Safe to re-run.
--
-- Why: read from the live database on 23 Oct 2026, settings, day_logs, custom_foods, recipes and
-- push_subscriptions still carry Supabase's old automatic grants: anon and authenticated hold every
-- table privilege, TRUNCATE included. RLS keeps every row private (anon has no policy, so it sees
-- and changes nothing), and PostgREST never sends TRUNCATE, so nothing is exposed today. This is
-- defence in depth, matching what routines and training_plans already do: the app never touches
-- these tables signed out (the `authed` flag gates all sync), so anon needs no grant at all.
--
-- What keeps working: signed-in sync (authenticated keeps select, insert, update, delete), the
-- edge functions (service_role keeps its grants), delete-account and the consent functions.
-- Rollback: `grant select, insert, update, delete on <table> to anon;` (not expected to be needed).
-- ============================================================================

revoke all on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions from anon;
revoke truncate, references, trigger on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions from authenticated;
grant select, insert, update, delete on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions to authenticated, service_role;
-- PostgreSQL 17 adds MAINTAIN (vacuum, analyze, reindex, lock) to the old defaults; signed-in users don't need it
do $$ begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions from authenticated';
  end if;
end $$;

-- Verify: the same query as at the end of 2026-09-01-core-tables.sql (expect no anon rows).
-- Expect authenticated with DELETE, INSERT, SELECT, UPDATE only. Reviewed by security-data 23 Oct 2026
-- (APPROVE WITH CHANGES, all in): no app or function path uses anon on these tables; an anon read
-- now gets a 401 instead of an empty 200, which the sync and push code already ignore.
-- After running: on a phone, sign in and sync, turn a reminder on (push subscribe), then sign out
-- and sign in as a different account.
