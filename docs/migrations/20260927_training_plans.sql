-- Workout plan Phase 5: weekly plans, one row each (like routines). Review: security-data.
-- Owner-only RLS in the same migration (as docs/security-rls.sql), anon revoked, a size cap on
-- the phases body, a foreign key to auth.users so deleting an account deletes its plans, and the
-- same set_updated_at trigger as the other synced tables.
-- Rows are never hard-deleted by the app: `state = 'archived'` hides a plan.
-- Apply BEFORE the app version that syncs plans is deployed (the client treats a missing table
-- as empty, but pushes would report errors until it exists).
-- Rollback: `drop table public.training_plans;` is only safe BEFORE the new client ships; after
-- that it destroys every saved plan. Safe to re-run: every step is guarded.
create table if not exists public.training_plans (
  id                uuid primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  source            text not null default 'custom' check (source in ('custom', 'recommended')),
  state             text not null default 'active' check (state in ('active', 'completed', 'archived', 'template')),
  phases            jsonb not null check (jsonb_typeof(phases) = 'array' and pg_column_size(phases) <= 65536),
  started_at        date,
  completed_at      timestamptz,
  reflection        jsonb check (reflection is null or (jsonb_typeof(reflection) = 'object' and pg_column_size(reflection) <= 8192)),
  base_template_id  text check (base_template_id is null or char_length(base_template_id) <= 64),
  cloned_from_id    uuid,
  updated_at        timestamptz not null default now()
);
create index if not exists training_plans_user_idx on public.training_plans (user_id);

revoke all on public.training_plans from anon;
revoke truncate, references, trigger on public.training_plans from authenticated;

alter table public.training_plans enable row level security;
drop policy if exists "owner_full_access" on public.training_plans;
create policy "owner_full_access" on public.training_plans
  for all to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);

drop trigger if exists training_plans_updated on public.training_plans;
create trigger training_plans_updated before update on public.training_plans
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
