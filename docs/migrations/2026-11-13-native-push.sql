-- ============================================================================
-- Tilo: reminders to the iPhone app (native-build-plan N12). WRITTEN 13 Nov 2026, NOT APPLIED:
-- the lead engineer ships it through ship-critic on main, with security-data and compliance
-- reviews, before the reminder function that reads it is deployed.
--
-- A phone registers in the same table as a browser, push_subscriptions, so everything that already
-- covers that table covers phones too, with no function to re-create:
--   * owner-only RLS (docs/migrations/2026-09-01-core-tables.sql, "owner_full_access");
--   * the health-consent trigger require_health_consent (2026-09-28-health-consent-server.sql): a
--     phone can't register without a current health yes;
--   * clear_log_after_withdrawal() and purge_unconsented_logs(): both delete the person's
--     push_subscriptions rows, phones included;
--   * account deletion (USER_TABLES in supabase/functions/_shared/account.ts) and the foreign key's
--     on delete cascade.
-- Plus one trigger for phones (push_token_one_account, below): a token belongs to one account.
--
-- What changes:
--   platform  'web' (a browser's Web Push subscription: endpoint URL plus p256dh and auth_key, as
--             now; the default, so the web app and the deployed function carry on unchanged),
--             'apns' or 'apns-sandbox' (a phone: `endpoint` holds its APNs device token as lower-case
--             hex, with no keys; sandbox for development builds only).
--   p256dh and auth_key may be null, but only on a phone's row (the check constraint).
-- Same kind of personal data as today (a delivery address for this device's reminders). Apple can
-- read an APNs alert (Web Push is end-to-end encrypted), so the privacy policy's iPhone text, gated
-- on its `native` option, says so, and the register and DPIA 8.8 record it (compliance, 13 Nov 2026).
--
-- Order: this first, then the function (send-supplement-reminders/index.ts with ../_shared/apns.ts
-- and the APNS_KEY_P8, APNS_KEY_ID and APNS_TEAM_ID secrets). The function also runs before this
-- (it reads every row as Web Push when the column isn't there). The deployed function from before
-- N12 would try a phone's row as Web Push and count it as failed, so no phone registers until the
-- new function is live (no native build ships before then).
--
-- No new table, so no new grants are needed; the existing ones are restated (as 2026-10-23-core-
-- grants.sql) so this file says what the table allows. A new column inherits the table's grants.
--
-- Rollback (only once no phone rows are wanted):
--   delete from public.push_subscriptions where platform <> 'web';
--   drop trigger if exists push_token_one_account on public.push_subscriptions;
--   drop function if exists public.push_token_one_account();
--   alter table public.push_subscriptions drop constraint if exists push_subscriptions_keys_by_platform;
--   alter table public.push_subscriptions alter column p256dh set not null, alter column auth_key set not null;
--   alter table public.push_subscriptions drop column platform;
-- Safe to re-run.
-- ============================================================================

alter table public.push_subscriptions add column if not exists platform text not null default 'web';

alter table public.push_subscriptions drop constraint if exists push_subscriptions_platform_check;
alter table public.push_subscriptions add constraint push_subscriptions_platform_check
  check (platform in ('web', 'apns', 'apns-sandbox'));

alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth_key drop not null;

alter table public.push_subscriptions drop constraint if exists push_subscriptions_keys_by_platform;
alter table public.push_subscriptions add constraint push_subscriptions_keys_by_platform check (
  (platform = 'web' and p256dh is not null and auth_key is not null)
  or (platform in ('apns', 'apns-sandbox') and p256dh is null and auth_key is null and endpoint ~ '^[0-9a-f]{64,200}$')
);

-- One device token, one account (security-data, 13 Nov 2026, finding 1). A phone's token stays the
-- same across sign-outs, and when the session is already gone (an account switch, signing out
-- offline) the phone can't delete its own row. Without this, the next account to turn reminders on
-- would sit beside the previous one under the same token, and the phone would get both accounts'
-- reminders. The newest registration wins: saving a phone row deletes any other account's row for
-- that token. SECURITY DEFINER because RLS hides other accounts' rows from the person saving;
-- it deletes nothing but phone rows with exactly this token. It runs in the same statement as the
-- consent check (require_health_consent), so a save refused for consent deletes nothing.
-- Only someone who already holds a phone's token could use it to move that phone's reminders.
create or replace function public.push_token_one_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.platform in ('apns', 'apns-sandbox') then
    delete from public.push_subscriptions p
      where p.endpoint = new.endpoint
        and p.platform in ('apns', 'apns-sandbox')
        and p.user_id <> new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.push_token_one_account() from public, anon, authenticated;

drop trigger if exists push_token_one_account on public.push_subscriptions;
create trigger push_token_one_account before insert or update of endpoint, platform, user_id on public.push_subscriptions
  for each row execute function public.push_token_one_account();

-- Grants, as they stand (unchanged): nothing for anon; signed-in owners read and change their own
-- rows through RLS; the reminder function and delete-account use the service role.
revoke all on public.push_subscriptions from anon;
revoke truncate, references, trigger on public.push_subscriptions from authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;

notify pgrst, 'reload schema';

-- Verify:
-- select column_name, is_nullable, column_default from information_schema.columns
--   where table_schema = 'public' and table_name = 'push_subscriptions' order by ordinal_position;
--   -- platform: NO, 'web'::text; p256dh and auth_key: YES
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.push_subscriptions'::regclass;
-- select platform, count(*) from public.push_subscriptions group by 1;   -- every existing row 'web'
-- select grantee, string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'push_subscriptions' and grantee in ('anon', 'authenticated', 'service_role') group by 1;
--   -- no anon; authenticated and service_role: DELETE, INSERT, SELECT, UPDATE
-- select tgname from pg_trigger where tgrelid = 'public.push_subscriptions'::regclass and not tgisinternal;
--   -- require_health_consent and push_token_one_account
-- One token, one account (inside a transaction, rolled back; <a> and <b> two test accounts, both with a health yes):
--   begin;
--   insert into public.push_subscriptions (user_id, endpoint, platform) values ('<a>', repeat('ab', 32), 'apns');
--   insert into public.push_subscriptions (user_id, endpoint, platform) values ('<b>', repeat('ab', 32), 'apns');
--   select user_id from public.push_subscriptions where endpoint = repeat('ab', 32);   -- only <b>
--   rollback;
-- After running: on the web, turn a reminder off and on again (the row is written as before, platform 'web').
