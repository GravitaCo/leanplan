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
--   -1 when today's cap is reached, or -2 when the caller's latest label-photo consent isn't a yes
--   (needs public.consents, docs/migrations/2026-09-consents.sql, which is live). The limit lives here, not in the caller, so calling the
--   function directly can only use up the caller's own allowance.
-- - A global cap per task and day (500 label reads across all users) bounds total spend. It's a
--   read-then-write, so concurrent calls can overshoot it by a few; that's accepted (spend is
--   also capped on the Anthropic account). The per-user cap is exact (a guarded upsert).
-- - The Edge Function calls it with the user's own JWT (no service role on AI paths). With the
--   gateway's verify_jwt off, this call is the gate: no valid session, no model call.
-- ============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  task text not null,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, task, day)
);

-- the global cap sums one task's day
create index if not exists ai_usage_task_day on public.ai_usage (task, day);

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
  global_cap integer;
  today date := (now() at time zone 'utc')::date;
  n integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  -- one cap per task; unknown tasks are refused
  cap := case p_task when 'read-label' then 30 else null end;
  global_cap := case p_task when 'read-label' then 500 else null end;
  if cap is null then
    raise exception 'unknown task' using errcode = '22023';
  end if;

  -- the caller's latest label-photo choice must be a yes, checked here so a direct call to the
  -- function can't skip the app's consent step (compliance register #28). Same ordering as
  -- health_consent_current. A refusal takes no scan.
  if not coalesce((
    select c.granted from public.consents c
    where c.user_id = uid and c.type = 'label-photo'
    order by least(c.recorded_at, c.created_at) desc, c.created_at desc
    limit 1), false) then
    return -2;
  end if;

  -- everyone's reads today (a small overshoot under concurrency is fine; see above)
  if (select coalesce(sum(a.count), 0) from public.ai_usage a where a.task = p_task and a.day = today) >= global_cap then
    return -1;
  end if;

  insert into public.ai_usage as u (user_id, task, day, count)
  values (uid, p_task, today, 1)
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
