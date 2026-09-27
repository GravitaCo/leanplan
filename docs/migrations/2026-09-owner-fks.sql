-- ============================================================================
-- Tali: owner foreign keys on the four original synced tables (security review, 27 Sept 2026)
--
-- NOT APPLIED. Apply BEFORE deploying the delete-account Edge Function. Safe to re-run: each
-- constraint is added only when missing, and VALIDATE is a no-op once it's valid.
--
-- Why: settings, day_logs, custom_foods and recipes had no FK to auth.users (routines,
-- training_plans and push_subscriptions do). Without one, a row written with a still-valid JWT
-- after the login is deleted, or a login deleted from the dashboard, leaves orphan rows that
-- nothing can reach or remove. With ON DELETE CASCADE, deleting the login removes them too;
-- delete-account still deletes each table's rows explicitly first.
--
-- Pre-checked on the live DB (27 Sept 2026): all four user_id columns are uuid, 0 orphan rows.
-- Run the orphan counts below first anyway: VALIDATE fails (and changes nothing) if any exist.
-- NOT VALID then VALIDATE: the add takes only a brief lock; the validate scans without blocking
-- writes. No table or column is renamed.
--
-- Rollback: `alter table public.<t> drop constraint <t>_user_id_fkey;` (safe at any time).
-- ============================================================================

-- 0) Orphan counts (expect 0 for each; resolve any before running the rest):
-- select 'settings' t, count(*) from public.settings x where not exists (select 1 from auth.users u where u.id = x.user_id)
-- union all select 'day_logs', count(*) from public.day_logs x where not exists (select 1 from auth.users u where u.id = x.user_id)
-- union all select 'custom_foods', count(*) from public.custom_foods x where not exists (select 1 from auth.users u where u.id = x.user_id)
-- union all select 'recipes', count(*) from public.recipes x where not exists (select 1 from auth.users u where u.id = x.user_id);

do $$
declare t text;
begin
  foreach t in array array['settings', 'day_logs', 'custom_foods', 'recipes']
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = t || '_user_id_fkey' and conrelid = format('public.%I', t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (user_id) references auth.users (id) on delete cascade not valid',
        t, t || '_user_id_fkey');
    end if;
  end loop;
end $$;

alter table public.settings     validate constraint settings_user_id_fkey;
alter table public.day_logs     validate constraint day_logs_user_id_fkey;
alter table public.custom_foods validate constraint custom_foods_user_id_fkey;
alter table public.recipes      validate constraint recipes_user_id_fkey;

-- No new indexes: each table already has one leading with user_id (settings_pkey,
-- day_logs_user_id_log_date_key, custom_foods_user_name_idx, recipes_user_name_idx), which the
-- cascade uses. Adding more would only duplicate them.

-- Verify (expect four rows, convalidated = true, confdeltype = 'c'):
-- select conrelid::regclass, conname, convalidated, confdeltype from pg_constraint
--   where conname in ('settings_user_id_fkey', 'day_logs_user_id_fkey', 'custom_foods_user_id_fkey', 'recipes_user_id_fkey');
