-- Workout plan Phase 4: the user's own workouts, one row each (like recipes). Reviewed by security-data
-- (APPROVE WITH CHANGES; its changes are in: size cap, FK with cascade, anon revoked).
-- New table, owner-only RLS in the same migration (copied from docs/security-rls.sql), the same
-- set_updated_at trigger as the other synced tables so the server alone stamps updated_at.
-- Rows are never hard-deleted by the app: `archived` hides a workout so logged history and
-- plans that point at it stay intact. No name index: two workouts may share a name.
-- MUST be applied before the app version that syncs workouts is deployed: until then the pull
-- and the sign-in ownership check read a table that doesn't exist and sync stops.
-- Rollback: `drop table public.routines;` is only safe BEFORE the new client ships; after that
-- it destroys every saved workout. Safe to re-run: every step is guarded.
create table if not exists public.routines (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- account deletion removes them
  name        text not null check (char_length(name) between 1 and 120),
  modality    text not null check (modality in ('strength', 'calisthenics', 'cardio', 'yoga', 'pilates', 'mobility')),
  effort      text not null default 'hard' check (effort in ('light', 'hard')),
  source      text not null default 'custom' check (source in ('custom', 'recommended')),
  base_id     text check (base_id is null or char_length(base_id) <= 64),
  blocks      jsonb not null check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) <= 65536),  -- ~100x a real workout
  est_mins    integer check (est_mins is null or est_mins between 0 and 1440),
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);
create index if not exists routines_user_idx on public.routines (user_id);

-- the app never talks to the database signed out; RLS already returns nothing to anon, this is
-- defence in depth against the schema's default grants
revoke all on public.routines from anon;
revoke truncate, references, trigger on public.routines from authenticated;

alter table public.routines enable row level security;
drop policy if exists "owner_full_access" on public.routines;
create policy "owner_full_access" on public.routines
  for all to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);

drop trigger if exists routines_updated on public.routines;
create trigger routines_updated before update on public.routines
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
