-- Workout plan Phase 2: several sessions a day.
-- Additive and nullable: existing rows keep sessions = null and are read through the app's legacy
-- `workout` path; nothing is backfilled or rewritten. RLS is table-level (owner_full_access on
-- day_logs, see docs/security-rls.sql), so the new column is covered with no policy change.
-- MUST be applied before the app version that writes `sessions` is deployed: until then
-- PostgREST would reject upserts that name an unknown column.
-- Reversible: alter table public.day_logs drop column sessions;
alter table public.day_logs add column if not exists sessions jsonb;
