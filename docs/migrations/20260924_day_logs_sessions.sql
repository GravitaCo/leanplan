-- Workout plan Phase 2: several sessions a day. Reviewed by security-data (APPROVE WITH CHANGES).
-- Additive and nullable: existing rows keep sessions = null and are read through the app's legacy
-- `workout` path; nothing is backfilled or rewritten. RLS is table-level (owner_full_access on
-- day_logs, see docs/security-rls.sql) and there are no column grants, so the new column is
-- covered with no policy change.
-- MUST be applied before the app version that writes `sessions` is deployed: until then
-- PostgREST rejects upserts naming an unknown column and signed-in devices stop syncing.
-- Rollback: `alter table public.day_logs drop column sessions;` is only safe BEFORE the new client
-- ships. After that it destroys every day's session list (the workout mirror keeps at most one)
-- and breaks new-client sync again.
alter table public.day_logs add column if not exists sessions jsonb;
alter table public.day_logs add constraint day_logs_sessions_is_array
  check (sessions is null or jsonb_typeof(sessions) = 'array');
notify pgrst, 'reload schema';
