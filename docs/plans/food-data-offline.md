# Food data you can trust, on the device — how Tali's database grows

**Status:** Foundations shipped (September 2026, see §6). Food packs (§3) are designed but not built.
**Owners:** `nutrition-db` (adds foods), `nutrition-accuracy` (audits them), `security-data` (any schema change).

## 0. Principles

1. **The device is the source of truth.** Tali opens, searches, logs and saves with no connection.
   Sync is a background extra, never a requirement.
2. **Every number is cited or marked.** Each food carries `src`, and the app shows it ("Source: UK CoFID 2021 · 18-323").
   A food without a source says "Source not yet checked"; we never imply checks we haven't done.
3. **Every food passes the same gate.** `validateFoods` (`src/core/data/validate.ts`) runs in
   `npm run check:foods` today and on device for downloaded packs later.
4. **Honest error.** Where a source is known to be loose, the entry's ± says so. For example,
   restaurant menu labels get at least ±20% (`sources.ts` → `err`, evidence in
   `nutrition-accuracy-research.md` §1.1).
5. **Keep it small.** Stored values keep one decimal; sources are short keys, not repeated text.

## 1. The food record

Values are per 100 g, per 100 ml when `ml` is set, or **per item** when `each` is set
(e.g. a chain's burger, exactly as the chain publishes it). Amounts are then counts.

| Field | Meaning |
|---|---|
| `n` | Name. Unique. Changing it disconnects "your usual" for that food, so treat names as stable IDs. |
| `k p c f` | kcal, protein, carbs, fat on the basis above |
| `g` | Default serving (g, ml, or number of items) |
| `ml` / `each` | Unit basis (never both) |
| `cat`, `cook` | Hand-portion default; cooking-fat question |
| `src` | `key` or `key:code` from `SOURCES`, e.g. `cofid:18-323`, `usda:170460`, `off:5000112552119`, `kfc-uk` |

### Source priority for UK users
1. **UK CoFID** (government composition data) for generic foods.
2. **The brand's or chain's own UK figures** for branded foods and restaurant items.
3. **The pack label** (directly, or via several agreeing Open Food Facts listings) for packaged products.
4. **USDA FoodData Central** only where CoFID has no match. Watch for US carbs, which include fibre.

## 2. Adding foods (the workflow)

1. If the source is new, add it to `src/core/data/sources.ts` (label, URL, licence, `err` if loose).
2. Add or edit rows in `src/core/data/foods.ts` with `src` set.
3. Run `npm run check:foods` (must pass) and `npm test`.
4. Have `nutrition-accuracy` review anything over ~20 rows; record audits in `docs/data/`.
5. Bump the SW `CACHE` in `public/sw.js` so installed apps pick up the new bundle.

### Chain menus (e.g. Greggs)
Each chain's own published nutrition file is imported by a script in `scripts/import/` that
writes a generated file in `src/core/data/chains/`. Nothing is typed by hand.
- **Greggs:** `python3 scripts/import/greggs.py <nutrition PDF>`. It parses deterministically,
  with no AI, and cross-checks every row (per-portion kcal = per-100 g × portion). It drops
  multi-item boxes, drinks' syrup and cream add-ons, decaf duplicates and hospital-shop items.
  It keeps existing Tali names so learned usuals still match.
- **Every refresh:** re-run when the chain publishes a new file, review the diff, then run
  `npm run check:foods`. Chains whose files are scanned images need an AI reading step instead
  (not built yet).

## 3. Growing past the bundle: food packs (designed, not built)

The bundled database is about 32 KB for 336 foods, so a few thousand foods can still ship in the app.
Beyond that (e.g. UK branded products):

- **Packs:** versioned JSON files (`/packs/uk-branded.v3.json`), each with a manifest `{id, version, count, sources}`.
- **Download when online, keep forever:** stored in **IndexedDB** (hundreds of MB available, unlike
  localStorage's ~5 MB), validated with `validateFoods` before use, and replaced atomically on a new version.
- **Search is local:** core + packs + custom foods, one in-memory index built at launch or on first search.
- **Barcode lookups** (future): a miss while online queries the source, then validates and caches the result
  in IndexedDB so the next scan works offline. A miss offline offers Quick estimate or Create a food.
- **Native:** the same JSON packs and `validateFoods` ship as-is; storage becomes SQLite. `core/` doesn't change.

## 4. Device storage budget (measured)

- **A typical day** (14 entries, check-in, supplements, weight) is **~1.9 KB**, about **0.7 MB a year**.
- **localStorage** is ~5 MB per site, so that's **7+ years of history**. The food database isn't stored there;
  it ships in the app bundle and is cached by the service worker.
- **If the browser refuses a save** (full or blocked), the user is told once, with the fix (export a backup),
  instead of losing entries silently.
- **Persistent storage:** Tali asks the browser (`navigator.storage.persist()`) to exempt its data from
  clean-up. Safari clears site data it thinks is unused, and a PWA added to the Home Screen is the safest home.
- **Next step, before logs reach ~3 MB:** move day history older than 90 days to IndexedDB. The
  `leanplan.v1` key stays as it is (never renamed) and holds recent days plus an index.

## 5. Offline behaviour

- **Service worker:**
  - caches the app shell and all its assets at install, so the app opens offline after one visit;
  - serves hashed assets from cache;
  - fetches the page network-first with a 3-second timeout, so a weak signal never stalls launch.
- **Launch never waits on the network:**
  - the device remembers guest or account (`tali.mode`);
  - guests go straight in;
  - an account opened offline uses its local data and resumes sync when the connection and session return;
  - session restore is capped at 4 seconds.
- **If a session has truly expired online**, the user signs in again, and local changes upload afterwards
  (dirty flags are kept).

## 6. Shipped in this round
- Per-item foods; chain items now use the chains' own UK figures (Subway, Burger King, Nando's, KFC).
- CoFID audit of all 336 foods (`docs/data/food-audit-2026-09.json`): 288 foods now cite a source and use
  its values; 48 are marked "not yet checked".
- Source shown on every food; menu-label foods carry ±20%.
- `validateFoods` + `npm run check:foods`, `npm test`.
- Service worker, launch and save changes from §4–5.

## 7. Still to do (ranked by impact)
1. **Raw versions** of meat, fish, rice and pasta for recipes (currently cooked only). Show them first in the recipe builder.
2. **The 48 unchecked foods**, including:
   - McDonald's items (their site blocks us: needs an official PDF);
   - Greggs, Domino's and Pot Noodle (made-up vs dry);
   - takeaway curries (CoFID has homemade only).
3. **Split one-row-many-products foods:** spread, soya milk, porridge (which milk), back vs streaky bacon, chapati.
4. **Vegetables flagged `cook` that hold raw values:** name the state or add cooked rows.
5. **Per-item custom foods:** needs an `each` column on `custom_foods` (additive migration, `security-data` review), so users can save "1 bar" from a label.
