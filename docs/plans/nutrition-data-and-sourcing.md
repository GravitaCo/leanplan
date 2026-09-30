# Nutrition data, sourcing, barcode/OCR & unit-typing — plan

Status: PLAN, written 2026-06-29. Owner: nutrition-db specialist. For: Benn.
Much of it has since shipped, sometimes in a different form: see the "As built" notes in §4, §5
and §7. §1 is the June 2026 snapshot the plan started from.

This plan covers: expanding the food library, a build-vs-buy decision on 3rd-party
food data (with costs), barcode + back-of-packet OCR scanning, and cleaning up the
ml-vs-grams unit model — all while honouring the hard constraints (never rename the
`leanplan.v1` localStorage key or any Supabase table/column; keep `src/core` and
`src/data` framework-agnostic).

---

## 1. Current-state analysis

### How foods work today
- **Built-in DB**: `src/core/data/foods.ts` — a flat `Food[]` of **336 items**, grouped by
  convention (all chicken together, etc.), values **per 100g / per 100ml**. Built-in foods
  carry **no `id`**.
- **`Food` shape** (`src/core/types.ts`): `n` name, `k` kcal, `p/c/f` macros, `g` default
  serving, `ml?: boolean` for liquids, plus sync metadata (`id`, `_u`, `_dirty`) on **custom
  foods only**.
- **Custom foods**: created in `food/AddFoodSheet.tsx` → `store.addCustomFood`. Stored in
  `AppState.customFoods`, get a uuid via `uuid('f')`, marked `_dirty`, synced to Supabase
  `custom_foods`.
- **Logging**: `store.logFood` calls `scaleFood` (per-100 → absolute) and writes a
  `LoggedFood` with absolute macros. Meals (`MealsSheet.tsx`) snapshot items as `RecipeItem[]`
  — **editing the DB never retro-updates logged entries or saved meals.** (By design; respect it.)
- **Search**: `AddFoodSheet` concatenates `FOODS` + `customFoods`, simple `includes()` substring
  match, cap 60 results. No fuzzy match, no synonyms, no category/locale facets.

### How the ml/g distinction works today (and where it's broken)
The unit concept is represented **three different ways**, inconsistently:

| Type | Field | Notes |
|---|---|---|
| `Food` | `ml?: boolean` | built-in liquids set `ml: true` (39 of 336 items) |
| `RecipeItem` | `ml?: boolean` | mirrors Food |
| `LoggedFood` | `unit?: 'g' \| 'ml'` | set by `store.logFood`: `if (food.ml) entry.unit = 'ml'` |

Two concrete problems:
1. **Custom foods can't be liquids.** `AddFoodSheet`'s create form is grams-only — no ml toggle.
   So a user-created drink is always logged as grams.
2. **`ml` is silently dropped on sync.** `sync.ts` `toServerFood` / `fromServerFood` map only
   `id, name, kcal, protein, carbs, fat, grams`. The Supabase `custom_foods` table has **no
   `ml`/`unit` column**. So even if we set `ml: true` on a custom food locally, a sync round-trip
   (pull on another device, or after cache clear) **loses the flag** and the food reverts to grams.
   This is a latent data-fidelity bug we should fix as part of the unit work.

### How sync works today
Offline-first sync, tables and RLS are described in `CLAUDE.md` ("Architecture", "Backend & data").
The point that matters here: the built-in `FOODS` array is **shipped in the bundle**, not in the DB.

### Gaps this plan addresses
- Library is small (336) and UK-staple-skewed; no branded/long-tail coverage.
- No way to add a food without manual macro entry (no barcode, no label scan).
- Unit typing is inconsistent and lossy across sync.
- No locale/region tagging — can't distinguish a UK product from a US one.
- Search is naive; will not scale to thousands of items in-bundle.

---

## 2. Build-vs-buy: 3rd-party data sources

The decision gates how much manual entry is worthwhile, so settle it first. Survey below;
prices are indicative (verify current pricing at implementation time — vendors change tiers).

### Option survey

| Source | Cost | Barcode | Country/region | Licence | Data quality | Notes |
|---|---|---|---|---|---|---|
| **USDA FoodData Central** | **Free** (API key, ~1,000 req/hr/key) | No | **US** generic + branded | **Public domain** | High for generic/whole foods (Foundation, SR Legacy); branded is label-declared | Best free source for *generic* staples. US portions/fortification differ from UK. |
| **Open Food Facts (OFF)** | **Free / open** | **Yes** (huge barcode DB) | **Global incl. strong UK/EU**; per-product `countries` tags | **ODbL** (open database licence — attribution + share-alike on the DB) | Crowdsourced → variable; many products incomplete or unverified; per-100g + per-serving | Best free source for **branded + barcode + long-tail**. Can self-host / bulk-download the full dump. |
| **McCance & Widdowson / UK CoFID** | **Free** (gov dataset download) | No | **UK** generic | Open Government Licence | High, authoritative for UK generic foods | Not an API — a dataset to curate from. Ideal sourcing basis for our own UK staples. |
| **Nutritionix** | Free dev tier; paid plans roughly **$100s–$1,000s/mo** at scale | Yes | US-centric, some intl | Commercial, **no redistribution / caching limits** | High, curated branded + restaurant | Strong NLP ("2 eggs and toast"). Licence forbids building a permanent local copy. |
| **Edamam** | Free tier (small); paid from low **$ hundreds/mo** | Limited | Intl | Commercial, attribution, caching limits | Good; recipe/NLP focus | Splits into Food DB / Nutrition Analysis / Recipe APIs, each metered. |
| **FatSecret Platform** | Free basic tier; **premier paid** (region packs) | Yes | **Localised regional DBs incl. UK** | Commercial, no redistribution | High, strong branded + regional | Best *paid* fit for UK branded if we ever buy; premier tier needed for full barcode/region. |

### Key constraints that drive the decision
- **Redistribution/caching**: the paid APIs (Nutritionix, Edamam, FatSecret) generally **forbid
  building our own permanent copy** of their data. They are "rent, don't own" — exactly what
  Benn wants to avoid. OFF (ODbL) and USDA/CoFID (open/public domain) **let us keep the data**,
  which is the whole point of "build our own library where possible".
- **Barcode**: only OFF gives us a free, ownable barcode→product map. Paid APIs have barcode but
  with the caching restrictions above.

### Recommendation
**Build our own curated library for staples; use Open Food Facts (free/open) for barcode +
long-tail; do not pay for an API in the foreseeable roadmap.**

Concretely:
1. **Own curated DB** for generic whole foods and top UK branded staples, sourced from **UK CoFID
   (McCance & Widdowson)** + **USDA FoodData Central** + manufacturer packs. This is what we
   already do in `foods.ts`; we scale it up with a disciplined pipeline (section 3).
2. **Open Food Facts** for barcode lookup and the long tail of branded products. ODbL-clean: we
   may cache OFF results we fetch into a user's custom foods (the data stays open). If we ever
   ship an OFF-derived bundle, we add the ODbL attribution + keep that derived dataset open.
3. **Paid APIs: deferred.** Only revisit if (a) OFF barcode hit-rate on real UK shopping is poor,
   or (b) we want NLP free-text logging ("chicken and rice") — FatSecret (UK region pack) would
   be the candidate then. Note the trade-off explicitly: paying means we **stop owning** the data.

### Rough cost projection
- **Phase 1–3 (recommended path): £0 in data licensing.** Costs are engineering time + a small
  amount of compute/storage if we self-host an OFF mirror (optional; a few £/mo on object storage
  for a periodic dump, or £0 if we hit the public OFF API directly with caching + rate-limit
  respect).
- **OCR (label scanning)**: on-device options are £0 (see section 4); a cloud OCR fallback is
  usage-priced (~£1–1.50 per 1,000 images on the major cloud vision APIs) — only if we add a
  fallback, and easily capped.
- **If we ever buy** (not recommended now): budget on the order of **low-to-mid £ hundreds/month**
  for a regional paid tier (FatSecret/Edamam), scaling with request volume — and accept losing
  data ownership.

---

## 3. Own-library strategy (curate at scale)

### Sourcing standards
The source priority, the `src` citation on every food and the build gate now live in
`food-data-offline.md` §1–2 (and `CLAUDE.md`, "Food data & offline"). This plan's first idea, a
sourcing sheet kept outside the bundle, was superseded by `src` on each food. What this plan adds:
- **Sanity gate**: `k ≈ 4·p + 4·c + 9·f` within ~10–15% (fibre/alcohol/rounding), plus duplicate
  names and missing fields, checked by `scripts/check-foods.ts` (`npm run check:foods`).
- **No duplicates**: normalise-and-compare names before adding; keep category grouping/order.
- **en-GB names**: "aubergine", "courgette", "rocket", "coriander", etc.; gender-neutral, no
  gym-bro tone.
- **Realistic default servings** (`g`): a portion someone would actually log.

### Dedupe & identity
- Treat lowercased, punctuation-stripped `n` as the dedupe key for built-ins.
- For barcode/OFF imports, key on **barcode (EAN/UPC)** when present (new optional field —
  section 5/6) so the same product isn't added twice.

### Country/locale tagging
See §6 (optional `loc` on `Food`; untagged means locale-neutral).

### Proposed first expansion batch (PLAN ONLY — do not bulk-insert yet)
Settle build-vs-buy first; then add roughly **+250–350 curated UK-relevant items** across:

| Category | Rough count | Source basis |
|---|---|---|
| Proteins (more cuts, fish, plant proteins, tofu/tempeh/seitan) | ~50 | CoFID/USDA |
| Carbs/grains (rices, pastas, breads, oats, noodles) | ~40 | CoFID |
| Vegetables & fruit (fresh + frozen + tinned) | ~60 | CoFID |
| Dairy & alternatives (yoghurts, cheeses, milks incl. plant milks — ml) | ~40 | CoFID/manufacturer |
| Fats, nuts, seeds, oils (oils = ml) | ~25 | CoFID/USDA |
| UK branded staples (top supermarket own-brand + big national brands) | ~60 | Manufacturer packs |
| Drinks (juices, soft drinks, sports/protein drinks — ml) | ~30 | Manufacturer |
| Snacks / ready meals / takeaway approximations | ~30 | Manufacturer/CoFID |

Delivered in reviewable sub-batches (~40–60 each), lint-passed, with a per-batch sourcing note.
**Do not add hundreds of entries in this task** — propose, don't insert.

### Bundle-size watch
At ~336 items the shipped `foods.ts` is fine. Past ~1,000–1,500 items we should consider moving
the built-in DB to a **lazy-loaded JSON asset** (still framework-agnostic, still bundled — just
fetched on first food-search rather than parsed at boot) and adding a lightweight index for search.
Flag for a later phase, not now.

---

## 4. Barcode + label-scanning design

> **As built (Sept 2026):** both shipped. Barcode decoding uses `BarcodeDetector` with the ZXing
> WASM polyfill (`screens/food/barcodeDecoder.ts`) and a live Open Food Facts lookup
> (`data/products.ts`). Label reading went a different way from §4b: an AI read through the
> `ai-read-label` Edge Function, with on-device checks in `core/domain/label.ts`. That design and
> Benn's decisions on it are in `label-scan-and-shared-products.md`, which is canonical for
> scanning. The rest of this section is the original plan.

Two distinct features, both camera-based, both PWA-constrained.

### Shared PWA constraints
- Camera needs **HTTPS** (we have it: app.tali.fit) + a user-gesture `getUserMedia` permission prompt.
- iOS Safari/standalone PWA: camera in `getUserMedia` works in recent iOS; test on installed PWA.
- Prefer **on-device** processing for privacy + offline + £0 marginal cost; cloud only as fallback.
- New screen/sheet `food/ScanSheet.tsx` (UI layer); keep parsing/lookup logic in
  `src/core/domain/` (framework-agnostic) and network calls in `src/data/`.

### 4a. Barcode scan → lookup
- **Decode on-device** from the camera stream. Candidate libraries:
  - **`@zxing/browser`** (ZXing port) — mature, MIT, decodes EAN-13/UPC from `<video>`. Good default.
  - **Native `BarcodeDetector` API** where available (Android Chrome) — zero-dependency fast path;
    fall back to ZXing elsewhere (notably iOS).
- **Lookup chain** on the decoded EAN/UPC:
  1. Local: match against built-in + custom foods by `barcode`.
  2. **Open Food Facts** product API by barcode (free). Map OFF nutriments (per-100g/ml,
     `nutriments.energy-kcal_100g`, `proteins_100g`, etc.) → our `Food`. Read OFF `countries`/
     `serving_size`, and `quantity` units to infer ml vs g.
  3. Miss → offer manual create / label scan.
- **Result UX**: pre-fill the custom-food form with OFF data; user confirms/edits, then it saves
  as a custom food (with `barcode` + `loc`). Sanity-lint the OFF macros before accepting (OFF is
  crowdsourced — flag entries failing the kcal identity).
- **Cost**: £0 (on-device decode + free OFF API). Respect OFF rate limits; cache responses.

### 4b. Back-of-packet OCR → parse nutrition panel
- **Capture** a still of the nutrition table; OCR to text; parse the panel.
- **OCR engine**:
  - On-device: **Tesseract.js** (WASM, MIT, £0, offline). Heavier bundle/CPU; acceptable as the
    parse target is a small numeric table.
  - Optional cloud fallback for poor captures: a cloud Vision OCR (cost in §2),
    capped and behind a setting. Only if Tesseract accuracy proves insufficient.
- **Parsing** (framework-agnostic, `src/core/domain/labelParse.ts`): extract per-100g/ml columns
  for Energy (kcal — convert from kJ if only kJ present, 1 kcal = 4.184 kJ), Protein, Carbohydrate,
  Fat. Detect "per 100ml" vs "per 100g" in the header text to set the unit. Handle UK label
  conventions (kJ/kcal dual energy, "of which sugars", "of which saturates" — we only need top-line
  carbs/fat). Run the kcal sanity check; surface low-confidence fields for the user to confirm.
- **Result UX**: same confirm-and-save-as-custom-food flow as barcode.
- **Cost**: £0 on-device default.

### Recommended scanning MVP
Barcode → OFF lookup first (highest hit-rate, cleanest data, £0). Add label-OCR as the fallback
for products OFF doesn't have. Both feed the same "confirm custom food" sheet.

---

## 5. ml-vs-g data model

> **As built:** `unitOf` is in `nutrition.ts` (it also returns `'item'` for per-item `each`
> foods), the create form has a Grams / Millilitres toggle (`CreateFoodView.tsx`), and `ml`
> round-trips through `toServerFood` / `fromServerFood`. The other custom-food fields (`each`,
> `src`, `ref`, `cat`, `cook`, `barcode`, `eat`) travel in one additive `custom_foods.meta` jsonb
> column (`docs/migrations/2026-09-custom-foods-meta.sql`) rather than one column each.

### Problem recap
See §1: three representations, dropped on sync, no ml option when creating a food.

### Recommendation: keep `ml?: boolean` as the stored truth; add a derived `unit` helper. Do NOT
rename or drop `ml`.

Rationale: `ml?: boolean` is already persisted in `leanplan.v1` (built-ins ship it; custom foods
may carry it) and is the minimal, migration-safe representation. Switching the *stored* field to
`unit: 'g' | 'ml'` would touch persisted data and the meaning of every stored object — riskier for
zero functional gain. Instead, make the **code-level** ergonomics clean with a single helper and
make the flag **round-trip through sync**.

Proposed (additive) changes:

```ts
// src/core/types.ts — additive, no renames
export type FoodUnit = 'g' | 'ml'

export interface Food {
  // ...existing fields unchanged...
  ml?: boolean        // STORED truth — never renamed/removed
  barcode?: string    // NEW, optional — EAN/UPC for dedupe + scan
  loc?: string        // NEW, optional — ISO region tag e.g. 'GB' (section 6)
}
```

```ts
// src/core/domain/nutrition.ts — one canonical accessor used everywhere
export function unitOf(f: { ml?: boolean }): FoodUnit {
  return f.ml ? 'ml' : 'g'
}
```

Then:
- Replace ad-hoc `f.ml ? 'ml' : 'g'` (in `AddFoodSheet`, `MealsSheet`, store) with `unitOf(...)`.
- `LoggedFood.unit` stays as-is (it's already `'g' | 'ml'`); keep `store.logFood` setting it from
  `unitOf(food)` so logged history is self-describing even if the source food changes.
- **Custom-food create UI**: add a **g / ml toggle** to `AddFoodSheet`'s create form; set
  `ml: true` when ml is chosen. Labels ("Amount (g)", "per 100g") become unit-aware via `unitOf`.

### Sync fidelity fix (the real bug) — migration-safe
- Add a **new nullable `ml boolean` column** to Supabase `custom_foods` (additive ALTER; does not
  rename anything; safe for existing rows which default null/false).
- Update `sync.ts` `toServerFood` to send `ml: !!f.ml` and `fromServerFood` to read
  `ml: !!r.ml`. (Also carry `barcode`, `loc` once those columns exist.)
- Old clients ignore the new column; new clients tolerate null. No `leanplan.v1` key change, no
  column renames — constraint honoured.

### Display/logging flow after change
search/list → `unitOf` drives "per 100g/ml" labels → portion entry labelled in the right unit →
`logFood` writes absolute macros + `unit` → Today/diary shows `grams` with the stored `unit`.
Liquids and solids now consistent end-to-end, and custom liquids survive sync.

---

## 6. Country-specific data

- Add optional **`loc?: string`** (ISO 3166-1 alpha-2, e.g. `'GB'`, `'US'`) to `Food`. Absent = generic.
- **Sourcing interaction**: CoFID-sourced staples → `loc: 'GB'`; USDA generic → `loc: 'US'` or
  left generic where the food is locale-neutral (a raw egg is a raw egg); OFF imports inherit the
  product's `countries` tag → `loc`.
- **Search/UX**: default to the user's locale (UK for now) — show `GB` + generic first, de-prioritise
  foreign-locale duplicates. A simple per-user "region" preference (default GB) can live in
  `profile` later; not required for MVP.
- **Sync**: `loc` rides along on `custom_foods` via the same additive-column approach as `ml`.
- Migration-safe: optional and additive everywhere.

---

## 7. Phased roadmap (each phase ship-critic reviewable before go-live)

**Phase 0 — Foundations & unit clean-up (no new data)** *(shipped, see §5 "As built" and
`npm run check:foods`)*. Smallest, highest-value, de-risked everything after.

**Phase 1 — Curated library expansion (decision-gated)**
- After Benn confirms build-vs-buy. Add first sub-batches (~40–60 at a time) per section 3, each
  lint-passed with a sourcing note. Optionally add `loc` tagging.
- Ship-critic review per batch.

**Phase 2 — Barcode scanning (MVP scan feature)** *(shipped as `ScanView` / `ScanConfirmView`;
`barcode` travels in `custom_foods.meta`, not its own column)*
- `ScanSheet` + on-device decode (BarcodeDetector → ZXing fallback) → OFF lookup → confirm &
  save custom food (with `barcode`, `loc`). Add `barcode` column (additive). Cache + rate-limit OFF.
- Ship-critic review.

**Phase 3 — Label OCR fallback** *(shipped as an AI read instead of Tesseract, see §4 "As built")*
- Tesseract.js capture → `labelParse` → confirm flow. kJ→kcal, per-100g/ml detection, sanity gate.
- Optional capped cloud-OCR fallback behind a setting (only if accuracy needs it).
- Ship-critic review.

**Phase 4 — Scale & search (only if DB outgrows the bundle)**
- Move built-in DB to lazy-loaded JSON + lightweight search index past ~1k–1.5k items.
- Locale preference in profile; possible NLP free-text logging (reassess paid API then).
- Ship-critic review.

---

## 8. Open questions / decisions for Benn

1. **Build-vs-buy sign-off**: confirm the recommended path — own curated DB + free Open Food Facts,
   no paid API now. (This gates Phase 1's manual-entry scope.) *What shipped follows it: own DB +
   Open Food Facts, no paid food-data API.*
2. **OFF usage**: hit the public OFF API live (simplest) vs self-host a periodic OFF dump (more
   reliable/offline, small storage cost)? Recommend live API + caching to start. *Shipped: live
   API (`data/products.ts`); a confirmed product is kept as a custom food.*
3. **Scan MVP order**: barcode-first then OCR fallback (recommended) — agreed? *Shipped in that
   order.*
4. **Cloud-OCR fallback**: acceptable to add a capped paid Vision fallback if on-device Tesseract
   accuracy is poor, or strictly on-device only? *Overtaken: the shipped label read is a cloud AI
   call, free for now with a spend limit (Benn, 26 Sept 2026, `label-scan-and-shared-products.md`).*
5. **Locale scope**: UK-only for now (default `loc: 'GB'`), or design the region preference UI in
   this round? Recommend UK-only data, region field plumbed but UI deferred.
6. **Library target size**: comfortable with ~+250–350 curated items as the first expansion goal,
   delivered in reviewable sub-batches?
7. **Sanity-failed OFF data**: when OFF macros fail the kcal identity, block the save or allow with
   a warning? Recommend warn-and-confirm (user owns their custom foods). *Shipped as
   warn-and-confirm: `ScanConfirmView` only blocks Save on missing fields.*
