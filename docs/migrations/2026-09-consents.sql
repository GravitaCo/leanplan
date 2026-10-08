-- ============================================================================
-- Tali: consent history (onboarding plan docs/plans/first-run-onboarding.md §8; launch blocker)
--
-- Applied after `security-data` review (live since 27 Sept 2026; re-checked 1 Oct 2026: the table
-- exists). Run before deploying the app version that syncs consents (src/data/consent.ts) and
-- before the delete-account Edge Function. Safe to re-run: every step is guarded.
--
-- Design:
-- - Append-only history. One row per act (grant or withdrawal); a withdrawal is a new row with
--   granted = false. The current state of a type is its row with the latest recorded_at.
-- - id is the device's own UUID for the act, so a re-sent row is a no-op (the app inserts with
--   ON CONFLICT DO NOTHING) and an offline act uploads exactly once.
-- - recorded_at is when the person acted (the device's clock, offline-first); created_at is when
--   the server received it and can't be set by a client (no column grant). A recorded_at more
--   than a day past created_at is refused, so a skewed or hostile clock can't make one row win
--   forever.
-- - Owner-only RLS: SELECT and INSERT own rows only. No UPDATE or DELETE policy and no UPDATE,
--   DELETE or TRUNCATE grant, so no client can rewrite or erase history. The delete-account
--   function (service role, server side only) and the auth.users cascade remove a deleted
--   account's rows.
-- - NOT part of the `owner_full_access` loop in docs/security-rls.sql: that policy is FOR ALL and
--   would allow updates and deletes. Never add this table to that loop.
-- - A per-account row cap (500) stops the table being used as free storage.
--
-- Rollback: `drop table public.consents cascade;` is only safe BEFORE a client that syncs consents
-- ships (it treats a missing table as "not yet" and keeps its records on the device); after
-- that it destroys the record of what people agreed to.
-- ============================================================================

create table if not exists public.consents (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type         text not null check (type in ('health', 'ai', 'label-photo')),
  version      text not null check (version ~ '^[a-z0-9.-]{1,32}$'),
  granted      boolean not null,
  recorded_at  timestamptz not null check (recorded_at >= '2026-01-01'),
  created_at   timestamptz not null default now(),
  constraint consents_recorded_not_future check (recorded_at <= created_at + interval '1 day')
);

-- latest row per type for one account
create index if not exists consents_user_type_at on public.consents (user_id, type, recorded_at desc);

alter table public.consents enable row level security;

drop policy if exists "owner_read" on public.consents;
create policy "owner_read" on public.consents
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "owner_insert" on public.consents;
create policy "owner_insert" on public.consents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Grants: read own rows; insert only the columns a client may set (created_at stays the server's).
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
grant insert (id, user_id, type, version, granted, recorded_at) on public.consents to authenticated;

-- Row cap per account. SECURITY INVOKER: it counts the caller's own rows, which RLS lets it see.
create or replace function public.consents_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.consents c where c.user_id = new.user_id) >= 500 then
    raise exception 'too many consent records' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function public.consents_cap() from public, anon, authenticated;

drop trigger if exists consents_cap on public.consents;
create trigger consents_cap before insert on public.consents
  for each row execute function public.consents_cap();

notify pgrst, 'reload schema';

-- Verify (expect rls = true; two policies, SELECT and INSERT; no UPDATE/DELETE grant):
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'consents';
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'consents';
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'consents' and grantee in ('anon', 'authenticated');
-- RLS test (as two different users, e.g. with `set local role authenticated; set local
-- request.jwt.claims = '{"sub":"<uid>"}'`): A's insert with B's user_id fails the check; A's select
-- returns only A's rows; A's update or delete of its own row is refused (permission denied).
