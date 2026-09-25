-- Barcode scanning: custom foods carry fields the named columns don't hold (per-item `each`,
-- source `src` such as 'off:<barcode>', published `ref`, category `cat`, `cook`, `barcode`).
-- They travel in ONE additive, nullable jsonb column: { each, src, ref, cat, cook, barcode }.
-- No table or column is renamed; existing rows keep meta = null and read as before.
-- RLS is table-level (owner_full_access on custom_foods, see docs/security-rls.sql) and there are
-- no column grants, so the new column is covered with no policy change.
--
-- Order: apply this, THEN flip CUSTOM_FOOD_META to true in src/data/sync.ts and deploy. Until the
-- column exists PostgREST rejects upserts naming it, so the flag stays false before then (the
-- fields persist on each device meanwhile, and pulls keep them).
-- Rollback: `alter table public.custom_foods drop column meta;` is safe only while
-- CUSTOM_FOOD_META is false in the deployed app. Safe to re-run: every step is guarded.
alter table public.custom_foods add column if not exists meta jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'custom_foods_meta_is_object' and conrelid = 'public.custom_foods'::regclass) then
    alter table public.custom_foods add constraint custom_foods_meta_is_object
      check (meta is null or jsonb_typeof(meta) = 'object');
  end if;
end $$;
notify pgrst, 'reload schema';
