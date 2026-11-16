-- Generated plans' reasons (personalised-training-engine.md §3.6): `TrainingPlan.why`, a list of
-- WhyCode plus small data (field, exercise id, value), never rendered text. Review: security-data.
--
-- Additive and nullable: existing rows and older clients are unaffected (they never send it). The
-- client sends it only once `PLAN_WHY_SYNC` in src/data/sync.ts is turned on, which must happen
-- AFTER this is applied (a PostgREST upsert with an unknown column is refused with 400, which would
-- stop every plan from syncing). Until then a pull keeps the device's own copy (fromServerPlan).
-- Slot and workout reasons already travel inside `routines.blocks` and need nothing here.
--
-- Owner-only RLS on training_plans (20260927_training_plans.sql) covers the new column as is: no
-- policy change. The size cap matches the reflection column's order of magnitude; a day-1 plan's
-- reasons are well under 4 KB.
-- Rollback: `alter table public.training_plans drop column why;` is safe only while PLAN_WHY_SYNC is
-- off in every shipped build (turn it off and deploy first). Safe to re-run: every step is guarded.
alter table public.training_plans add column if not exists why jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'training_plans_why_shape') then
    alter table public.training_plans add constraint training_plans_why_shape
      check (why is null or (jsonb_typeof(why) = 'array' and pg_column_size(why) <= 16384));
  end if;
end $$;

notify pgrst, 'reload schema';
