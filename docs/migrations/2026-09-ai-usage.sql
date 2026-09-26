-- ============================================================================
-- Tali — per-user daily cap for AI features (first user: label photo reading)
-- Plan: docs/plans/label-scan-and-shared-products.md §1.2, ai-platform-plan.md §5.
--
-- NOT APPLIED. Review with `security-data`, then run once in the Supabase dashboard
-- (SQL Editor) before deploying the ai-read-label Edge Function. Safe to re-run.
--
-- Design (the smallest safe mechanism):
-- - ai_usage holds one counter per user, task and UTC day. No content, no values: counts only.
-- - RLS on, owner-only SELECT. No INSERT/UPDATE/DELETE policy and no table grants for writes, so
--   no client can change a count directly.
-- - The only write path is ai_usage_take(task), SECURITY DEFINER, which takes one unit for
--   auth.uid() atomically (a single upsert guarded by the limit) and returns how many are left,
--   or -1 when today's cap is reached. The limit lives here, not in the caller, so calling the
--   function directly can only use up the caller's own allowance.
-- - The Edge Function calls it with the user's own JWT (no service role on AI paths).
-- ============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  task text not null,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, task, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "owner_read" on public.ai_usage;
create policy "owner_read" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

create or replace function public.ai_usage_take(p_task text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cap integer;
  n integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  -- one cap per task; unknown tasks are refused
  cap := case p_task when 'read-label' then 30 else null end;
  if cap is null then
    raise exception 'unknown task' using errcode = '22023';
  end if;

  insert into public.ai_usage as u (user_id, task, day, count)
  values (uid, p_task, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, task, day)
    do update set count = u.count + 1
    where u.count < cap
  returning u.count into n;

  if n is null then
    return -1; -- today's cap reached; nothing changed
  end if;
  return cap - n;
end;
$$;

revoke all on function public.ai_usage_take(text) from public, anon;
grant execute on function public.ai_usage_take(text) to authenticated;

-- Optional housekeeping (keeps the table tiny): delete rows older than 60 days.
-- delete from public.ai_usage where day < (now() at time zone 'utc')::date - 60;

-- Verify:
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'ai_usage';
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'ai_usage';
