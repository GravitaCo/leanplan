# Label photo scanning and the shared product list

Status: phase 1 built (see "Phase 1 as built"); phases 2 and 3 are plans (Sept 2026). Builds on barcode scanning (live 25–26 Sept: `core/domain/barcode.ts`,
`screens/food/ScanView.tsx`, `ScanConfirmView.tsx`, `data/products.ts`).

**Principle (Benn):** the pack in the user's hand is the most accurate information we have. Any
difference should come only from reading it, e.g. a 7 read as a 1. Our job is to make the reading
reliable and to catch misreads before anything is saved.

---

## Part 1: Label photo scanning

### 1.1 Flow

1. **Entry points:**
   - "Scan the label" on the Add food sheet.
   - A "Photo of the label" button on the confirm view. This is used when Open Food Facts has no
     record, or its figures don't match the pack (the Walkers case: 490 kcal against 497).
2. **Guidance before capture.** Show one short screen the first time, then as a line over the
   camera:
   - "Find good light. Lay the pack flat. Fill the frame with the nutrition table. Avoid glare
     and creases."
3. **Live quality checks on the device, before the photo is used:**
   - **Blur:** variance of the Laplacian on a downscaled frame.
   - **Brightness:** mean luminance.
   - **Glare:** the share of clipped white pixels.
   - If a check fails, say which one in neutral words: "Too dark, try near a window", "Hold still",
     "Glare on the table, tilt the pack".
   - Capture only happens once all three pass, or the user taps to capture anyway.
4. **Read the panel** (1.2), then **check it** (1.3).
5. **Confirm view:** the same pack-style view as barcode scanning (per 100 g beside per serving).
   - The photo crop of each row sits beside its field.
   - Suspect fields are highlighted with a suggested fix (1.4).
   - Nothing is saved without Save.
6. **Save:**
   - The food is saved as a custom food with `src: 'label'`, plus `barcode` if one was scanned in
     the same session.
   - The photo is discarded. It's never stored or uploaded beyond the read.

### 1.2 Reading the panel

| Where | How | Offline | Cost |
|---|---|---|---|
| Native app (later) | Apple Vision / Google ML Kit text recognition on the device, then our own table parser in `core/` | Yes | Free |
| Web now | Supabase Edge Function `ai-read-label`: a vision model with a fixed prompt and a strict JSON schema. The only place the model key exists (see `ai-platform-plan.md`). | No: falls back to typing it in | about $0.005–0.02 a scan |

- **Schema:** for every UK label row (energy kJ and kcal, fat, saturates, carbohydrate, sugars,
  fibre, protein, salt), return both columns (per 100 g/ml, per serving) plus the serving size.
  Also return the reference-intake % column if it's printed.
  - Each value comes back as the literal text read, e.g. "0.64g".
  - Each value carries a per-value confidence.
- **The model only transcribes.** It never estimates, rounds or fills a gap. Missing means
  missing. Our code, not the model, parses the numbers.
- **Only the cropped panel is sent,** after consent the first time ("Your photo is read once to
  fill in the numbers, then deleted"). Nothing is logged server-side beyond counts.
- Browser OCR (Tesseract.js) was considered and rejected. It's unreliable on nutrition tables,
  with small type, columns and curved packs.

### 1.3 Misread checks (pure TS in `core/domain/label.ts`, unit-tested)

A UK label prints the same facts several ways, so one misread digit almost always breaks a
relationship:

1. **kJ ↔ kcal:** kJ ÷ 4.184 ≈ kcal, within 2.5% or 1 kcal, whichever is larger, in both columns (widened from 2% in the nutrition-accuracy review).
2. **Per 100 ↔ per serving:** every row's per-serving value ≈ per-100 × serving ÷ 100, within
   rounding. This check is the strongest, because the two columns are read separately.
3. **Energy ↔ macros:** 4P + 4C + 9F + 2 fibre (+ 7 × alcohol) ≈ kcal (the existing
   `checkPer100` / `checkLabel`).
4. **Reference intake %:** when printed, kcal ÷ 2000 and fat ÷ 70 etc. should equal the %.
5. **Structure:**
   - sugars ≤ carbs;
   - saturates ≤ fat;
   - the parts sum to ≤ 100 g per 100 g;
   - salt < 10 g per 100 g for anything but seasonings.
6. **Format:** a decimal point missing or doubled ("064" for 0.64), or units in the wrong column.

### 1.4 Suggesting the fix

When a check fails:
- Search single-character substitutions over the flagged fields, using a table of common OCR
  confusions: 1↔7, 5↔6, 6↔8, 3↔8, 0↔8, 0↔O, 1↔l, and a missing or extra decimal point.
- Find the one substitution that makes **every** check pass.
- If exactly one exists, show it:
  - "Did you mean **7.1 g**? The per-serving column says 2.1 g for 30 g."
  - The photo crop sits beside it, and the user taps to accept.
- If none or several exist, highlight the field ("Check this against the pack") and don't guess.

Low per-value confidence from the reader also highlights a field, even if every check passes.

### 1.5 Margin

A confirmed label gets the same margin as a typed label: the capture error + 0.03, with
`sourceErr` 0 (Benn's decision, 26 Sept). The label's own legal tolerance isn't added; the pack
is taken as the truth.

---

## Part 2: The shared product list

**Goal:** when anyone scans a product, it's added once. Later scans by other users add their
confirmation to it instead of creating a copy. After independent users agree, the product is
verified for everyone, and it's looked up before Open Food Facts.

### 2.1 Data (new tables; the existing per-user tables and RLS are unchanged)

- `products`: one row per barcode and version.
  - Fields: `barcode`, `version`, name, per-100 kcal/P/C/F (+ fibre, sugars, saturates, salt),
    `ml`, serving g, pack g, `eat`, `cat`, `status` ('unverified' | 'verified' | 'disputed'),
    `confirmations` (count), `first_seen`, `last_confirmed`.
  - It holds no user ids.
- `product_confirmations`: `product_id`, `user_id`, the submitted values, `created_at`.
  - One row per user per product. It never holds what anyone ate, or when.

**RLS:**
- `products` can be read by any signed-in user.
- No client can write either table directly. All writes go through one security-definer RPC,
  `confirm_product()`.
- Users can read only their own `product_confirmations` rows.
- This adds a shared catalogue. It does not loosen the private user data (`docs/security-rls.sql`).
- `security-data` reviews it before anything is applied.

### 2.2 `confirm_product(barcode, values)`: runs when the user taps Save on a scanned product

1. The server re-runs the checks from 1.3 and rejects anything that fails.
2. **No product yet:** create it as `unverified` with this submission.
3. **Product exists and the values match** (kcal within 1, macros within 0.1 g, serving the same):
   add the confirmation. From **2 independent users** agreeing, it becomes `verified`.
4. **Product exists and the values differ:**
   - Store the submission as a candidate version.
   - The version most users confirm wins.
   - If the newer one wins, the old version is kept with its dates (a recipe change), and the
     product is marked "Recipe changed Sept 2026".
   - A tie is `disputed`, and the app then asks the user to check against their pack.
5. **Limits:** one confirmation per user per product, rate-limited per user per day. A single
   user's submission never counts as verified.

### 2.3 Lookup order after this

1. Your own saved foods (offline).
2. The shared list, cached on the device after each lookup (offline once seen).
3. Open Food Facts.
4. Label photo.
5. Typing it in.

The confirm view says where the figures came from:
- "Checked by 3 Tali users, Sept 2026";
- "Added by 1 Tali user: check against your pack";
- or the Open Food Facts line.

### 2.4 Quality

- `nutrition-accuracy` spot-audits verified products each month (a sample against photos of the
  pack).
- A user's "doesn't match my pack" on a verified product feeds `disputed`.

---

## Phases

1. **Label photo on the web:** guidance, quality checks, `ai-read-label`, the misread checks and
   the suggested-fix search, reusing the confirm view.
2. **Shared product list:** tables, RPC, lookup order, labels in the confirm view, audits.
3. **Native:** on-device reading, free and offline.

### Phase 1 as built (on `main`; `ai-read-label` deployed 28 Sept with the server consent check; `LABEL_SCAN_ENABLED` still false)

- Code: `supabase/functions/ai-read-label/` (Edge Function), `supabase/functions/_shared/label-read.ts`
  (schema + validator, shared with the app), `src/core/domain/label.ts` (parsing, checks, the
  one-fix search, draft), `src/core/domain/labelQuality.ts`, `src/data/labelReader.ts`,
  `src/screens/food/LabelCaptureView.tsx` (lazy-loaded), `ScanConfirmView.tsx` (label mode).
- Cap: `docs/migrations/2026-09-ai-usage.sql` (30 reads per user and 500 in total per UTC day,
  counts only; the total can overshoot by a few under concurrency).
- Off by default: `LABEL_SCAN_ENABLED` in `src/data/labelReader.ts` hides every entry point until
  the deployed function is smoke-tested (a `VITE_LABEL_SCAN=1` build turns it on locally).
- The gateway's `verify_jwt` is off; the function rejects a missing or malformed token (401), and
  the `ai_usage_take` RPC, called with the user's JWT before any model call, is the gate.
- A confirmed label whose per-serving column agrees is saved with the pack's per-serving line as
  `ref`, so one serving logs exactly what the pack prints (`scaleFood`).
- Not in phase 1: the photo crop beside each field (the reader returns no positions yet).
- The server checks consent too: `ai_usage_take` returns -2 (the function answers 403 `consent`)
  unless the caller's latest `label-photo` consent is a yes (compliance register #28); the app
  sends unsynced consents (`flushConsents`) just before a read.
- Deploy steps (reviews, migration and function done 28 Sept; still to do before launch: confirm the spend limit, smoke-test, flip the flag): reviews; run the migration in the SQL editor; `supabase secrets set
  ANTHROPIC_API_KEY=…` (optional `LABEL_MODEL`, default claude-sonnet-5, and `LABEL_EFFORT`); the
  RPC's apikey comes from the platform (`SUPABASE_PUBLISHABLE_KEYS` default, else the legacy
  `SUPABASE_ANON_KEY`); `supabase functions deploy ai-read-label`; set a monthly
  spend limit on the Anthropic account; smoke-test; then flip `LABEL_SCAN_ENABLED` and merge.
- E2E: `scripts/e2e-label-scan.cjs` (fake camera, mocked function; never calls the API).

Each phase goes through the usual reviews before merging:
- `nutrition-accuracy` for the checks and thresholds;
- `security-data` for the Edge Function, tables, RLS and RPC;
- `mental-performance` for the capture and suggested-fix copy;
- `ship-critic`.

## Decisions (Benn, 26 Sept 2026)

1. **Label reading is free for everyone for now.** With few users we absorb the cost. Set a
   monthly spend limit on the API account.
2. **Scanned products are added to the shared list automatically,** with no duplicates.
3. **Two independent users verify a product.**
4. **Seed from barcodes already confirmed,** with each user's consent.

### Names and duplicates

- **The barcode is the product's identity.** Names never decide what is a duplicate.
  - Both flows start with, or ask for, the barcode.
  - A label photo taken after a barcode scan attaches to that barcode.
  - One barcode means one product (with versions for recipe changes).
- **The name of a new product:**
  1. Open Food Facts' name, if it has one.
  2. Otherwise the same `ai-read-label` call can read an optional **photo of the front of the
     pack** (brand, product, flavour, size).
  3. Otherwise the user types it, with a hint: "Brand, product and flavour, e.g. Walkers Sensations
     Roasted Chicken & Thyme".
- **Later scanners see the existing name.** They can suggest a better one. Names are compared
  after normalising (case, punctuation, "&"/"and", word order, sizes removed). The name most
  confirmers keep wins, and the first stays until another has more votes. A user's own saved copy
  can always carry their own name locally.
- **A label photo with no barcode** (loose or relabelled items) saves privately only. It isn't
  added to the shared list, because there's nothing reliable to match it on. The app suggests:
  "Scan the barcode too so it's there for everyone next time".
