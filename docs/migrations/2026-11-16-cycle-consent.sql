-- ============================================================================
-- Tilo: the Cycle consent type (docs/plans/cycle.md §6). NOT APPLIED: `security-data` review
-- first, then Benn applies it. Never applied by an agent.
--
-- What it does: widens consents_type_check so the append-only `consents` table accepts the new
-- `cycle` type (src/data/consent.ts CONSENT_TYPES, CONSENT_VERSIONS.cycle = '2026-11-v1'). Nothing
-- else changes: no new table, column, grant, policy or trigger.
--
-- Why only this: the Cycle log is device-only in v1 (src/data/deviceOnly.ts `cycle`); the only
-- thing about Cycle that reaches the server is this consent record (kept to show consent was given,
-- Art. 7(1)). It is special-category data in itself (it shows the person chose a period log;
-- compliance, 16 Nov 2026), so it gets the same protection as every other consent row: owner-only
-- RLS and the insert-only column grant from 2026-09-consents.sql, unchanged here. Optional sync of
-- the log is later (cycle.md §8) and will need its own table, grants, RLS, the
-- require_health_consent trigger, a server cycle-consent check, lines in
-- clear_log_after_withdrawal() and purge_unconsented_logs(), and a place in USER_TABLES.
--
-- Deletion: consents rows already go with the account (delete-account, USER_TABLES). A health
-- withdrawal writes a cycle withdrawal on the device too (consent.ts withdraw), so the record shows
-- the cycle yes ended.
--
-- Until applied: an app build with Cycle on (VITE_CYCLE=1) records the cycle consent on the device;
-- pushConsents gets a check violation (23514) for that row, retries the batch one by one, and the
-- cycle row stays unsynced while the rest upload. Apply this before Benn or Sara turn Cycle on.
--
-- Safe to re-run. Rollback (only once no 'cycle' row exists):
--   alter table public.consents drop constraint if exists consents_type_check;
--   alter table public.consents add constraint consents_type_check
--     check (type in ('health', 'ai', 'label-photo', 'shared-products'));
-- ============================================================================

alter table public.consents drop constraint if exists consents_type_check;
alter table public.consents add constraint consents_type_check
  check (type in ('health', 'ai', 'label-photo', 'shared-products', 'cycle'));

-- Check after applying (as Benn, in the SQL editor):
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'consents_type_check';
--   → CHECK ((type = ANY (ARRAY['health'::text, 'ai'::text, 'label-photo'::text, 'shared-products'::text, 'cycle'::text])))
