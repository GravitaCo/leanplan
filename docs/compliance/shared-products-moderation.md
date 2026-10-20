# Shared products: reports and takedowns

Tali's shared product list (`public.products`, docs/migrations/2026-10-10-shared-products.sql)
holds product names and per-100 figures read from pack labels by Tali users. Every name is shown to
everyone who scans that barcode, so we act on reports quickly. Nothing in the list says who added a
product, so a takedown never involves contacting or identifying a user.

## What hides a product automatically

The Report sheet in the app (board sp-6) calls the `report-product` Edge Function, which checks
the caller is signed in, limits each caller to 5 reports a minute and 20 an hour (in memory only),
then calls `report_product()`. Nothing records the reporter.

- **"Offensive or personal details in the name"**: the version is hidden from lookups after
  **2** such reports, so one person can't hide a product alone.
- **Any reason**: the version is hidden after **3** reports in all.
- Reports are capped at 500 a day across everyone, so a flood can't hide the whole list.

Names with links, `@`, markup, seven or more digits in a row, zero-width or bidi control
characters, or free-from and allergen claims ("gluten free", "nut free", "free from", and similar)
are refused before they're ever stored. Salt over 10 g per 100 g is kept (seasonings, stock) but
marks the row `flagged` for the next audit.

## Review (weekly, or within 2 working days of a name report)

Run in the Supabase SQL editor as the service role:

```sql
-- hidden or reported versions, newest first
select id, barcode, version, name, k, p, c, f, salt, reports, name_reports, flagged, hidden, status, label_reads, last_confirmed
from public.products
where hidden or reports > 0 or flagged
order by hidden desc, reports desc, last_confirmed desc;
```

For each row, decide:

1. **Personal data, abuse, or anything unlawful in the name** (a person's name, contact details,
   slurs, threats): delete the row at once, and any other version with the same text.
   ```sql
   delete from public.products where id = <id>;
   ```
   Note the takedown in the compliance register (date, barcode, reason; never the name's text if
   it contained personal data).
2. **Wrong product or figures that don't match the pack**: if a correct version of the barcode
   exists, delete the wrong one. If unsure, leave it hidden and ask `nutrition-accuracy` to check
   the pack.
3. **Nothing wrong** (a mistaken or malicious report): restore it.
   ```sql
   update public.products set hidden = false, reports = 0, name_reports = 0 where id = <id>;
   ```

A product a user saved to their own foods before the takedown stays in their own log (it's their
copy); only the shared list changes.

## Requests from outside Tali

A brand or person asking for a product or name to be removed: check the row, and if the request
is about personal data, the name, or a trademark used misleadingly, delete it as in step 1. We
can't tell anyone who added a product: that information doesn't exist.

## Audits ("Checked by Tali")

`verified` is set only by a nutrition-accuracy audit against the pack (never by counts):

```sql
update public.products
set audited_on = date_trunc('month', now())::date, status = 'verified'
where id = <id> and is_current;
```

## Housekeeping

`submit_product()` clears replay hashes older than two months itself. The daily counters in
`public.product_quota` can be trimmed at any time:

```sql
delete from public.product_quota where day < current_date - 90;
```
