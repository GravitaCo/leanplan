-- ============================================================================
-- Tali: self-service account deletion (UK/EU GDPR Art. 17, right to erasure)
-- Run ONCE in the Supabase dashboard -> SQL Editor. Safe to re-run.
--
-- The app calls supabase.rpc('delete_my_account') from Profile -> Privacy.
-- It deletes every row the signed-in user owns, then the auth user itself
-- (which removes their sessions and Google identity link). It only ever acts
-- on auth.uid(), so a user can delete themselves and nobody else.
--
-- SECURITY DEFINER is needed because auth.users is not writable by the
-- `authenticated` role. search_path is pinned to '' so the function can't be
-- hijacked by objects in another schema; every name below is fully qualified.
-- Until this is applied, the Delete account button shows an error and deletes
-- nothing (the app never wipes the device unless the server confirmed).
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  delete from public.push_subscriptions where user_id::text = uid::text;
  delete from public.day_logs           where user_id::text = uid::text;
  delete from public.custom_foods       where user_id::text = uid::text;
  delete from public.recipes            where user_id::text = uid::text;
  delete from public.settings           where user_id::text = uid::text;
  delete from auth.users                where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Verify (optional):
-- select proname, prosecdef, proconfig from pg_proc where proname = 'delete_my_account';
-- Any NEW table holding user data must be added to the delete list above in the
-- same change that creates it (the compliance agent checks this).
