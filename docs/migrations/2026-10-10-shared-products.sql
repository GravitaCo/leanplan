-- ============================================================================
-- Tali: the shared product list, ANONYMOUS (Benn, 10 Oct 2026: "Nothing should be tied to a
-- person; no personal data is associated with the upload"). NOT APPLIED: security-data review
-- first, then Benn applies it (deploy order in the PR / docs/compliance/shared-products-moderation.md).
--
-- Rules (Benn, final):
-- - Only label-photo reads are shared: name and figures read from the pack by `ai-read-label`
--   and confirmed unchanged by the user. Typed values or names never are; a barcode alone never is.
-- - Open Food Facts products, and barcodes Open Food Facts already has, are never added (ODbL):
--   the app only offers a product OFF answered "not found" for, and submit-product asks OFF again.
-- - No user id, hash or pseudonym anywhere, no per-user rows. Dates are first-of-month only.
--   The barcode travels in POST bodies (RPCs and the function), never in a URL or a log.
--
-- Design:
-- - products: one row per GTIN-14 and version (differing figures), with counters. No identity.
-- - product_quota: global per-day counters (new rows, reports), identity-free, to bound a flood.
-- - product_sigs_seen: SHA-256 of each accepted read's signature, so one signed read counts once.
--   Holds no barcode, value or time beyond the month; rows older than two months are purged.
-- - Writes: submit_product(), executable by service_role ONLY. The `submit-product` Edge Function
--   checks the JWT, the health and shared-products consents (shared_products_allowed(), as the
--   caller), an in-memory per-caller limit, the read's signature from ai-read-label (HMAC over
--   barcode and parsed values, no user id), the name rules and Open Food Facts, then calls it.
--   The RPC never receives who called.
-- - Reads: lookup_product(barcode), executable by service_role ONLY, through the `lookup-product`
--   Edge Function: Auth verifies the caller, then an in-memory per-caller limit (20 a minute, 200
--   an hour per instance), then the lookup. The barcode travels in a POST body, never a logged URL.
--   No table grant at all: no bulk read, no GET with a query string. Residual scraping risk: many
--   accounts, or many function instances, each under the limit, could still walk barcodes slowly.
--   What they'd get is per-100 figures and a name read from packs (no people); accepted.
-- - Reports: report_product(barcode, version, reason), service_role ONLY, through the
--   `report-product` Edge Function (Auth check, then 5 a minute and 20 an hour per caller, in
--   memory; nothing about the reporter is stored). A global daily cap; a version hides after
--   CAPS.reportsToHide reports of any reason, or CAPS.nameReportsToHide (2) name reports, so one
--   person can't hide a product alone. Takedown and review: docs/compliance/shared-products-moderation.md.
-- - Ids are random UUIDs, not a sequence: a sequential id beside product_quota's daily counts
--   would give away the day a product was added (dates are first-of-month only on purpose).
-- - kJ isn't kept: ai-read-label signs a read only when its per-100 kJ and kcal agree (kJ ÷ 4.184
--   within max(2.5%, 1 kcal) of kcal, valuesFromRead in shared-product.ts), so that rule is
--   checked where the read is. Here, the energy check refuses only kJ printed in the kcal row
--   (kcal 3.5 to 4.9 times what the macros give). Salt up to 100 g per 100 g is kept (seasonings,
--   stock) and over 10 g sets `flagged` for audit.
-- - "verified" is set only by a service-role audit (nutrition-accuracy), never by counts: with no
--   identity, agreement between submissions can't show independent people.
-- - Nothing here holds a person's rows: NOT in USER_TABLES, clear_log_after_withdrawal() or
--   purge_unconsented_logs(), and no require_health_consent trigger (the writer is the service
--   role). scripts/test-consent.ts allow-lists these tables (SHARED_TABLES in
--   supabase/functions/_shared/shared-product.ts). Keep the checks in step with that file.
--
-- Safe to re-run. Rollback (before any product is shared): drop the functions, then the tables,
-- and put the consents type check back without 'shared-products' (only once no such row exists).
-- ============================================================================

-- 0. A new consent type: the opt-in to share new products (sp-1, Profile › Privacy toggle sp-5).
alter table public.consents drop constraint if exists consents_type_check;
alter table public.consents add constraint consents_type_check
  check (type in ('health', 'ai', 'label-photo', 'shared-products'));

-- 1. Barcode: EAN-8 / UPC-A / EAN-13 / GTIN-14, GS1 check digit, normalised to GTIN-14.
--    Restricted-circulation codes refused: in-store and variable weight (020-029, 200-299, EAN-8
--    starting 0 or 2), company-internal (040-049), coupons (050-059, 980+), GTIN-14 indicator 9.
--    030-039 (US pharmacy, real products) stay allowed. UPC-E: the app expands it first.
create or replace function public.gtin14(p text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  n integer;
  s integer := 0;
  d text;
  pre text;
begin
  if p is null or p !~ '^([0-9]{8}|[0-9]{12,14})$' then return null; end if;
  n := length(p);
  for i in 1..n - 1 loop
    s := s + substr(p, n - i, 1)::integer * (case when i % 2 = 1 then 3 else 1 end);
  end loop;
  if (10 - s % 10) % 10 <> substr(p, n, 1)::integer then return null; end if;
  if n = 8 and left(p, 1) in ('0', '2') then return null; end if;
  d := lpad(p, 14, '0');
  if left(d, 1) = '9' then return null; end if;
  pre := substr(d, 2, 3);
  if n > 8 and (pre between '020' and '029' or pre between '040' and '059'
                or pre between '200' and '299' or pre >= '980') then
    return null;
  end if;
  return d;
end;
$$;
revoke all on function public.gtin14(text) from public, anon, authenticated;

-- 2. Tables
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null check (barcode ~ '^[0-9]{14}$'),
  version smallint not null check (version between 1 and 5),
  name text not null check (char_length(name) between 1 and 80),
  k numeric(4,0) not null check (k between 0 and 900),
  p numeric(4,1) not null check (p between 0 and 100),
  c numeric(4,1) not null check (c between 0 and 110),
  f numeric(4,1) not null check (f between 0 and 100),
  fibre numeric(4,1) check (fibre between 0 and 100),
  sugars numeric(4,1) check (sugars between 0 and 110),
  sat numeric(4,1) check (sat between 0 and 100),
  salt numeric(5,2) check (salt between 0 and 100),
  ml boolean not null default false,
  serving_g numeric(6,1) check (serving_g > 0 and serving_g <= 5000),
  status text not null default 'unverified' check (status in ('unverified', 'verified', 'disputed')),
  is_current boolean not null default false,
  label_reads integer not null default 0 check (label_reads >= 0),  -- signed label reads counted
  month_count smallint not null default 0 check (month_count >= 0), -- counted this month (cap)
  reports integer not null default 0 check (reports >= 0),          -- reports since the last review
  name_reports integer not null default 0 check (name_reports >= 0), -- of which "the name"
  flagged boolean not null default false,                           -- worth a look at audit (salt > 10)
  hidden boolean not null default false,                            -- out of lookups until reviewed
  first_seen date not null check (extract(day from first_seen) = 1),
  last_confirmed date not null check (extract(day from last_confirmed) = 1),
  superseded_on date check (extract(day from superseded_on) = 1),
  audited_on date check (extract(day from audited_on) = 1),
  unique (barcode, version)
);
create unique index if not exists products_one_current on public.products (barcode) where is_current;

create table if not exists public.product_quota (
  day date primary key,
  new_rows integer not null default 0 check (new_rows >= 0),
  reports integer not null default 0 check (reports >= 0)
);

create table if not exists public.product_sigs_seen (
  h text primary key check (h ~ '^[0-9a-f]{64}$'),
  month date not null check (extract(day from month) = 1)
);

-- 3. RLS and grants: no client reads or writes any of them directly (no policies at all; only the
--    definer functions below and the service role touch them)
alter table public.products enable row level security;
alter table public.product_quota enable row level security;
alter table public.product_sigs_seen enable row level security;
revoke all on public.products, public.product_quota, public.product_sigs_seen from public, anon, authenticated;

-- 4. Lookup: the barcode's visible versions, current first, with only what the app shows (no
--    counters it doesn't need, no report counts). Service role only: the lookup-product function
--    (signed-in callers, limited per caller) is the only way in.
create or replace function public.lookup_product(p_barcode text)
returns table (
  version smallint, name text, k numeric, p numeric, c numeric, f numeric, fibre numeric,
  sugars numeric, sat numeric, salt numeric, ml boolean, serving_g numeric, status text,
  is_current boolean, label_reads integer, audited_on date
)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.version, pr.name, pr.k, pr.p, pr.c, pr.f, pr.fibre, pr.sugars, pr.sat, pr.salt, pr.ml,
         pr.serving_g, pr.status, pr.is_current, pr.label_reads, pr.audited_on
  from public.products pr
  where not pr.hidden and pr.barcode = public.gtin14(p_barcode)
  order by pr.is_current desc, pr.label_reads desc, pr.version desc
  limit 5
$$;
revoke all on function public.lookup_product(text) from public, anon, authenticated;
grant execute on function public.lookup_product(text) to service_role;

-- 5. Whether the caller may share: signed in, the latest health answer a yes and the latest
--    shared-products answer a yes. SECURITY INVOKER (reads the caller's own consents through RLS).
--    submit-product calls it with the caller's JWT, which also verifies that JWT.
create or replace function public.shared_products_allowed()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() is not null
    and public.health_consent_current(auth.uid())
    and coalesce((
      select c.granted from public.consents c
      where c.user_id = auth.uid() and c.type = 'shared-products'
      order by least(c.recorded_at, c.created_at) desc, c.created_at desc
      limit 1), false)
$$;
revoke all on function public.shared_products_allowed() from public, anon;
grant execute on function public.shared_products_allowed() to authenticated;

-- 6. Number reader: absent/null -> null; otherwise a JSON number in [lo, hi].
create or replace function public.product_num(j jsonb, k text, lo numeric, hi numeric)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if not (j ? k) or jsonb_typeof(j -> k) = 'null' then return null; end if;
  if jsonb_typeof(j -> k) <> 'number' or (j ->> k)::numeric not between lo and hi then
    raise exception 'bad value: %', k using errcode = '22023';
  end if;
  return (j ->> k)::numeric;
end;
$$;
revoke all on function public.product_num(jsonb, text, numeric, numeric) from public, anon, authenticated;

-- 7. A name the list refuses (it's shown to everyone): too long, links, markup, contact details,
--    long digit runs, free-from and allergen claims, zero-width and bidi controls (U+200B-U+200F,
--    U+202A-U+202E, U+2066-U+2069). Mirrors nameProblem() in shared-product.ts.
create or replace function public.product_name_refused(n text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select n is null or char_length(n) not between 1 and 80
    or n ~ '[[:cntrl:]]'
    or n ~ '[\u200B-\u200F\u202A-\u202E\u2066-\u2069]'
    or n ~* '(https?:|://|www\.|\m[a-z0-9-]+\.(com|net|org|uk|io|co|me|info|app|shop|biz|xyz|ly|gg|tv)\M)'
    or n ~ '[<>{}@]'
    or n ~ '([0-9][ .-]?){6}[0-9]'
    or n ~* '\m(free[[:space:]-]*from|allerg(en|y|ies)[[:space:]-]*(free|safe|friendly)|(gluten|wheat|nut|peanut|tree[[:space:]-]*nut|dairy|milk|lactose|egg|soy|soya|sesame|celery|mustard|lupin|sulphites?|sulfites?|fish|shellfish|crustaceans?|molluscs?|casein|coeliac|celiac)[[:space:]-]*(free|safe))\M'
$$;
revoke all on function public.product_name_refused(text) from public, anon, authenticated;

-- 8. The only write path. Service role only (the submit-product function, after it has checked
--    the read's signature); takes no identity. p_sig_hash: SHA-256 (hex) of the signature, so the
--    same signed read counts once.
create or replace function public.submit_product(p_barcode text, p_values jsonb, p_sig_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', now() at time zone 'utc')::date;
  v_today date := (now() at time zone 'utc')::date;
  gtin text := public.gtin14(p_barcode);
  v_name text; v_ml boolean;
  v_k numeric; v_p numeric; v_c numeric; v_f numeric; v_fibre numeric; v_sugars numeric;
  v_sat numeric; v_salt numeric; v_serv numeric; mk numeric;
  pid uuid;
  nver integer;
  counted boolean;
  v_lead record;
begin
  if gtin is null then return jsonb_build_object('error', 'barcode'); end if;
  if p_sig_hash is null or p_sig_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error', 'sig'); end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' or octet_length(p_values::text) > 1024
     or exists (select 1 from jsonb_object_keys(p_values) x where x not in
       ('name','k','p','c','f','fibre','sugars','sat','salt','ml','serving_g')) then
    return jsonb_build_object('error', 'values');
  end if;
  if jsonb_typeof(p_values -> 'name') <> 'string' then return jsonb_build_object('error', 'name'); end if;
  v_name := p_values ->> 'name';
  if v_name <> btrim(regexp_replace(v_name, '\s+', ' ', 'g')) or public.product_name_refused(v_name) then
    return jsonb_build_object('error', 'name');
  end if;
  begin
    v_k := public.product_num(p_values, 'k', 0, 900);
    v_p := public.product_num(p_values, 'p', 0, 100);
    v_c := public.product_num(p_values, 'c', 0, 110);
    v_f := public.product_num(p_values, 'f', 0, 100);
    v_fibre := public.product_num(p_values, 'fibre', 0, 100);
    v_sugars := public.product_num(p_values, 'sugars', 0, 110);
    v_sat := public.product_num(p_values, 'sat', 0, 100);
    v_salt := public.product_num(p_values, 'salt', 0, 100);
    v_serv := public.product_num(p_values, 'serving_g', 0.1, 5000);
  exception when sqlstate '22023' or invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('error', 'values');
  end;
  if jsonb_typeof(p_values -> 'ml') <> 'boolean' then return jsonb_build_object('error', 'values'); end if;
  v_ml := (p_values ->> 'ml')::boolean;
  -- values arrive at the list's precision (roundShared): anything finer was not signed by us
  if v_k <> round(v_k, 0) or v_p <> round(v_p, 1) or v_c <> round(v_c, 1) or v_f <> round(v_f, 1)
     or v_fibre <> round(v_fibre, 1) or v_sugars <> round(v_sugars, 1) or v_sat <> round(v_sat, 1)
     or v_salt <> round(v_salt, 2) or v_serv <> round(v_serv, 1) then
    return jsonb_build_object('error', 'values');
  end if;
  -- hard limits (valuesProblem() in shared-product.ts; checks.ts checkPer100 at its warning level)
  if v_k is null or v_p is null or v_c is null or v_f is null
     or v_p + v_c + v_f > (case when v_ml then 140 else 110 end)
     or v_sat > v_f or v_sugars > v_c then
    return jsonb_build_object('error', 'values');
  end if;
  -- only kJ printed in the kcal row is refused (about 4.184 times the macros' energy)
  mk := 4 * v_p + 4 * v_c + 9 * v_f + 2 * coalesce(v_fibre, 0);
  if mk >= 20 and v_k / mk between 3.5 and 4.9 then
    return jsonb_build_object('error', 'values');
  end if;

  -- one writer per barcode: concurrent first reads serialise (no unique-violation race), and the
  -- replay check below can't race itself (the signature covers the barcode)
  perform pg_advisory_xact_lock(hashtextextended('tali-product:' || gtin, 0));

  if exists (select 1 from public.product_sigs_seen s where s.h = p_sig_hash) then
    return jsonb_build_object('error', 'replay');
  end if;

  -- the same figures (to the label's precision) and serving are the same version
  select id into pid from public.products
    where barcode = gtin and ml = v_ml and k = v_k and p = v_p and c = v_c and f = v_f
      and fibre is not distinct from v_fibre and sugars is not distinct from v_sugars
      and sat is not distinct from v_sat and salt is not distinct from v_salt
      and serving_g is not distinct from v_serv
    order by version limit 1;

  if pid is null then
    select coalesce(max(version), 0) + 1 into nver from public.products where barcode = gtin;
    if nver > 5 then return jsonb_build_object('error', 'versions'); end if;
    -- global cap on new rows per day (exact: a guarded upsert; no row touched = cap reached)
    insert into public.product_quota as t (day, new_rows) values (v_today, 1)
      on conflict (day) do update set new_rows = t.new_rows + 1 where t.new_rows < 300;
    if not found then
      return jsonb_build_object('error', 'busy');
    end if;
    insert into public.products (barcode, version, name, k, p, c, f, fibre, sugars, sat, salt,
                                 ml, serving_g, flagged, first_seen, last_confirmed)
      values (gtin, nver, v_name, v_k, v_p, v_c, v_f, v_fibre, v_sugars, v_sat, v_salt,
              v_ml, v_serv, coalesce(v_salt > 10, false), v_month, v_month)
      returning id into pid;
  end if;

  -- per-version cap per month (10): a flood from one person can't pump a count past it
  update public.products set
    month_count = case when last_confirmed = v_month then month_count + 1 else 1 end,
    label_reads = label_reads + 1,
    last_confirmed = v_month
  where id = pid and (last_confirmed <> v_month or month_count < 10)
  returning true into counted;

  insert into public.product_sigs_seen (h, month) values (p_sig_hash, v_month);
  delete from public.product_sigs_seen s where s.month < (v_month - interval '2 months')::date;

  -- current = most label reads among visible versions, then newest. A rival with as many reads
  -- as the current one marks both disputed (for audit). Audited rows keep 'verified' unless a
  -- rival overtakes them.
  select * into v_lead from public.products where barcode = gtin and not hidden
    order by label_reads desc, version desc limit 1;
  if v_lead.id is not null then
    update public.products set
      superseded_on = case when status = 'verified' then v_month else superseded_on end,
      is_current = false
    where barcode = gtin and is_current and id <> v_lead.id;
    update public.products pr set
      is_current = (pr.id = v_lead.id),
      status = case
        when not pr.hidden and exists (select 1 from public.products o where o.barcode = gtin and o.id <> pr.id
                       and not o.hidden and o.label_reads = v_lead.label_reads
                       and (pr.id = v_lead.id or pr.label_reads = v_lead.label_reads))
          then 'disputed'
        when pr.id = v_lead.id and pr.audited_on is not null then 'verified'
        else 'unverified' end
    where pr.barcode = gtin;
  end if;

  return jsonb_build_object('ok', true, 'counted', coalesce(counted, false));
end;
$$;
revoke all on function public.submit_product(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_product(text, jsonb, text) to service_role;

-- 9. Reports (sp-6): anonymous. Service role only: the report-product function (signed-in
--    callers, limited per caller in memory) is the only way in. Nothing about the reporter is
--    kept. A global daily cap (500), identity-free. A version hides from lookups after 3 reports,
--    or 2 for "Offensive or personal details in the name". The same per-barcode lock as
--    submit_product, so a report and a submission can't interleave on one barcode.
--    Returns true when the report was taken (false: unknown product, or today's cap reached).
create or replace function public.report_product(p_barcode text, p_version integer, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  gtin text := public.gtin14(p_barcode);
  pid uuid;
begin
  if gtin is null or p_version is null or p_reason is null or p_reason not in ('figures', 'wrong', 'name', 'other') then
    raise exception 'bad report' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tali-product:' || gtin, 0));
  select id into pid from public.products where barcode = gtin and version = p_version;
  if pid is null then return false; end if;
  insert into public.product_quota as t (day, reports) values (v_today, 1)
    on conflict (day) do update set reports = t.reports + 1 where t.reports < 500;
  if not found then
    return false;
  end if;
  update public.products set
    reports = reports + 1,
    name_reports = name_reports + (p_reason = 'name')::integer,
    hidden = hidden or reports + 1 >= 3 or name_reports + (p_reason = 'name')::integer >= 2,
    is_current = case when reports + 1 >= 3 or name_reports + (p_reason = 'name')::integer >= 2
                      then false else is_current end
  where id = pid;
  return true;
end;
$$;
revoke all on function public.report_product(text, integer, text) from public, anon, authenticated;
grant execute on function public.report_product(text, integer, text) to service_role;

-- 10. Housekeeping the plan describes (compliance register item 24): ai_usage (one count per
--     person, task and day for the label-read cap) keeps 60 days, then goes. Daily at 03:41 UTC
--     through pg_cron, like tali-purge-unconsented. Not callable by any API role.
create or replace function public.ai_usage_cleanup()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.ai_usage where day < (now() at time zone 'utc')::date - 60 returning 1
  )
  select count(*)::integer from gone
$$;
revoke all on function public.ai_usage_cleanup() from public, anon, authenticated, service_role;
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tali-ai-usage-cleanup') then
    perform cron.schedule('tali-ai-usage-cleanup', '41 3 * * *', 'select public.ai_usage_cleanup()');
  end if;
end $$;

notify pgrst, 'reload schema';

-- Audit (nutrition-accuracy, service role, by hand), month only:
--   update public.products set audited_on = date_trunc('month', now())::date, status = 'verified'
--     where id = … and is_current;
-- Review a hidden version (moderation procedure): restore with
--   update public.products set hidden = false, reports = 0, name_reports = 0 where id = …;
-- or take it down for good with: delete from public.products where id = …;
--
-- Verify (expect rls = true and no policies on the three tables; no table grants to anon or
-- authenticated; submit_product executable by service_role only):
-- select tablename, rowsecurity from pg_tables where schemaname = 'public'
--   and tablename in ('products', 'product_quota', 'product_sigs_seen');
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name in ('products', 'product_quota', 'product_sigs_seen')
--   and grantee in ('anon', 'authenticated');
-- select p.proname, r.rolname from pg_proc p cross join pg_roles r
--   where p.proname in ('submit_product', 'lookup_product', 'report_product', 'shared_products_allowed')
--   and has_function_privilege(r.oid, p.oid, 'execute') and r.rolname in ('anon', 'authenticated', 'service_role');
-- Tests (as authenticated with request.jwt.claims set): select from products is refused;
-- submit_product, lookup_product and report_product are refused (permission denied).
-- Flagged for audit (salt over 10 g per 100 g): select id, barcode, name, salt from public.products where flagged;
--
-- Rollback (before any product is shared):
--   select cron.unschedule('tali-ai-usage-cleanup');
--   drop function public.ai_usage_cleanup();
--   drop function public.submit_product(text, jsonb, text), public.lookup_product(text),
--     public.report_product(text, integer, text), public.shared_products_allowed(),
--     public.product_name_refused(text), public.product_num(jsonb, text, numeric, numeric), public.gtin14(text);
--   drop table public.product_sigs_seen, public.product_quota, public.products;
--   (the consents check keeps 'shared-products': records of people's answers must stay)
