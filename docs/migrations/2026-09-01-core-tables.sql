-- ============================================================================
-- Tali: the five original synced tables, as they stand on the live database (read 23 Oct 2026).
--
-- RECORD ONLY on the live project: these tables were made in the dashboard before the repo kept
-- migrations, and they already exist there. This file lets a new project, a preview branch or a
-- reset be rebuilt from the repo. Run it FIRST in a rebuild, then the other files in
-- docs/migrations/ by date (docs/security-rls.sql is not needed; if run, run it last, as it also
-- covers routines and training_plans). Safe to re-run: every step is guarded.
--
-- Grants: from 30 Oct 2026 Supabase stops granting new public tables to anon, authenticated and
-- service_role by default, so the grants are written out here. Signed-in users get the four row
-- verbs (RLS still limits them to their own rows); the service role gets the same for the edge
-- functions (reminders, delete-account); anon gets nothing, because the app never reads or writes
-- these tables signed out. The live tables still carry the old defaults (anon included);
-- 2026-10-23-core-grants.sql brought them in line (applied 23 Oct 2026).
--
-- Differences from live, on purpose:
--   - user_id has no default. Live still defaults it to the retired guest id
--     00000000-0000-0000-0000-000000000001; a rebuild has no guest mode, so no default.
--   - day_logs_user_date_idx is left out: it duplicates the unique (user_id, log_date) index.
-- The owner foreign keys (2026-09-owner-fks.sql), custom_foods.meta (2026-09-custom-foods-meta.sql)
-- and day_logs.sessions (20260924_day_logs_sessions.sql) are included here; those files then no-op.
-- The require_health_consent triggers come from 2026-09-28-health-consent-server.sql.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists public.settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  target      jsonb not null default '{"c": 175, "f": 60, "p": 150, "kcal": 1850}'::jsonb,
  schedule    jsonb not null default '{"0": "Rest", "1": "Legs", "2": "Cardio", "3": "Push", "4": "Cardio", "5": "Pull", "6": "Cardio"}'::jsonb,
  profile     jsonb default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.day_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  foods       jsonb not null default '[]'::jsonb,
  supps       jsonb not null default '{}'::jsonb,
  weight      double precision,
  workout     jsonb,
  sessions    jsonb constraint day_logs_sessions_is_array check (sessions is null or jsonb_typeof(sessions) = 'array'),
  updated_at  timestamptz not null default now(),
  constraint day_logs_user_id_log_date_key unique (user_id, log_date)
);

create table if not exists public.custom_foods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kcal        double precision not null default 0,
  protein     double precision not null default 0,
  carbs       double precision not null default 0,
  fat         double precision not null default 0,
  grams       double precision not null default 100,
  ml          boolean not null default false,
  meta        jsonb constraint custom_foods_meta_is_object check (meta is null or jsonb_typeof(meta) = 'object')
                    constraint custom_foods_meta_size check (meta is null or pg_column_size(meta) <= 2048),
  updated_at  timestamptz not null default now()
);
create unique index if not exists custom_foods_user_name_idx on public.custom_foods (user_id, lower(name));

create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  items       jsonb not null default '[]'::jsonb,
  servings    double precision not null default 1,
  updated_at  timestamptz not null default now()
);
create unique index if not exists recipes_user_name_idx on public.recipes (user_id, lower(name));

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz default now(),
  constraint push_subscriptions_user_id_endpoint_key unique (user_id, endpoint)
);

-- Grants (explicit; see the header)
revoke all on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions from anon;
revoke truncate, references, trigger on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions from authenticated;
grant select, insert, update, delete on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions to authenticated, service_role;
-- PostgreSQL 17 adds MAINTAIN (vacuum, analyze, reindex, lock) to the old defaults; signed-in users don't need it
do $$ begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on public.settings, public.day_logs, public.custom_foods, public.recipes, public.push_subscriptions from authenticated';
  end if;
end $$;

-- Owner-only RLS (the same policy docs/security-rls.sql sets)
do $$
declare t text;
begin
  foreach t in array array['settings','day_logs','custom_foods','recipes','push_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_full_access" on public.%I', t);
    execute format(
      'create policy "owner_full_access" on public.%I for all to authenticated '
      || 'using ((select auth.uid())::text = user_id::text) '
      || 'with check ((select auth.uid())::text = user_id::text)', t);
  end loop;
end $$;

-- The server alone stamps updated_at (push_subscriptions has no updated_at)
do $$
declare t text;
begin
  foreach t in array array['settings','day_logs','custom_foods','recipes']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Verify (expect authenticated and service_role with DELETE, INSERT, SELECT, UPDATE; no anon rows):
-- select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
--   from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
--     and table_name in ('settings','day_logs','custom_foods','recipes','push_subscriptions')
--   group by 1, 2 order by 1, 2;
