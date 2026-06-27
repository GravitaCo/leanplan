-- ============================================================================
-- Tali — Row Level Security lockdown
-- Run this ONCE in the Supabase dashboard → SQL Editor → New query → Run.
--
-- Before this, the tables were readable/writable by anyone holding the public
-- anon key. After this, every row is private to the authenticated user it
-- belongs to: a request can only read or write rows where user_id matches the
-- signed-in user's id (auth.uid()). The service_role key used by server-side
-- jobs (e.g. the push-notification sender) bypasses RLS and is unaffected.
--
-- Safe to re-run: it drops and recreates the policies each time.
-- ============================================================================

-- 1) Remove any existing policies on these tables (e.g. old permissive ones)
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('settings','custom_foods','recipes','day_logs','push_subscriptions')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) Enable RLS and add an owner-only policy on each table.
--    user_id is compared as text so this works whether the column is uuid or text.
do $$
declare t text;
begin
  foreach t in array array['settings','custom_foods','recipes','day_logs','push_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner_full_access" on public.%I '
      || 'for all to authenticated '
      || 'using ((select auth.uid())::text = user_id::text) '
      || 'with check ((select auth.uid())::text = user_id::text)',
      t
    );
  end loop;
end $$;

-- 3) (Optional) Delete leftover rows from the old shared "local/guest" user id.
--    These were created before sign-in was enforced and are now unreachable.
--    Uncomment to remove them.
-- delete from public.settings           where user_id::text = '00000000-0000-0000-0000-000000000001';
-- delete from public.custom_foods       where user_id::text = '00000000-0000-0000-0000-000000000001';
-- delete from public.recipes            where user_id::text = '00000000-0000-0000-0000-000000000001';
-- delete from public.day_logs           where user_id::text = '00000000-0000-0000-0000-000000000001';
-- delete from public.push_subscriptions where user_id::text = '00000000-0000-0000-0000-000000000001';

-- 4) Verify (optional): should list one policy per table and rls = true
-- select tablename, rowsecurity from pg_tables where schemaname='public'
--   and tablename in ('settings','custom_foods','recipes','day_logs','push_subscriptions');
-- select tablename, policyname, roles, cmd from pg_policies where schemaname='public'
--   and tablename in ('settings','custom_foods','recipes','day_logs','push_subscriptions');
