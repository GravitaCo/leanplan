# Food (N5): parity checklist

The web is the spec: `src/screens/FoodScreen.tsx` and `src/screens/food/` (scanning aside, which is
N6). Every row is checked on native against the web for the same seeded data, light and dark,
unless it says otherwise. Words come from `src/copy/food.ts` (and `FOOD9` in `src/copy/onboardingApp.ts`);
logic from `src/screens/food/foodModel.ts` and `duplicateModel.ts`; numbers from `src/core`.

**How it's checked:** `apps/native/scripts/e2e-food-parity.cjs` (seeded account, in-memory Supabase
stand-in, never the real project). Columns: **Auto** = the script checks it; **Eye** = screenshots for
`design`, Benn and Sara; **Unit** = `npm test` (`scripts/test-food-model.ts`). Screen rebuild waits for
N1's primitives; the native column is ticked when the rebuilt screen passes.

The script finds native elements by these test IDs, which the rebuilt screens must carry:
`food-screen` (the Food tab's scroll view), `sheet` (each sheet's frame), `row-title` (a list row's
title). Rows that open a food carry the food's name as their accessibility label, as the web's.

## The Food tab

| # | State | Web source | Auto | Eye | Unit | Native |
|---|---|---|---|---|---|---|
| F1 | Header: day switcher "‹ Today · 14 Nov ›", connection pill, "Food", the add button (label "Add food"), the avatar with `WELLBEING_ENABLED` | FoodScreen `PageHeader`, `DayNav` | ✓ | ✓ | | |
| F2 | Day card, numbers: kcal eaten, "± N" opens About this estimate, the bar with the range band, "Range lo–hi" and the status word, protein/carbs/fat | FoodScreen | ✓ | ✓ | ✓ | |
| F3 | Day card, gentle (quiet numbers): the gentle status in words, the bar, the macros; no kcal on rows or meal headings | FoodScreen | ✓ | ✓ | ✓ | |
| F4 | Day card, Yes (ob9): "N meals logged", protein in words, or the empty line; no range before the yes (ob9-2) | FoodScreen `yes` | ✓ | ✓ | ✓ | |
| F5 | Day card, Yes after "Show a range" (ob9-4): the bar, "Roughly lo–hi kcal a day", the Yes range line | FoodScreen `fv.rangeOnFood` | ✓ | ✓ | | |
| F6 | Day card, Sometimes: kcal and ±, the bar, "Roughly lo–hi kcal a day" and the gentle status, protein as a range; never "kcal to go" | FoodScreen `some` | ✓ | ✓ | ✓ | |
| F7 | Your recipes (with recipes): up to four by use, "1 serving · adds to lunch", tap logs, "Manage" opens Recipes | FoodScreen | ✓ | ✓ | | |
| F8 | Meals: an empty meal is the dashed "+ Breakfast" button; a meal with items is its heading, kcal (not with noKcal), rows with portion and kcal ("≈" for estimates), "Add to breakfast" | FoodScreen | ✓ | ✓ | ✓ | |
| F9 | Other: entries logged before meals existed | FoodScreen | ✓ | ✓ | ✓ | |
| F10 | Quicker ways to log: Same as yesterday (one meal names it; several open a chooser), Your recipes (count), What can I make?, Quick estimate, Create a food, Save as recipe (one meal or a chooser) | FoodScreen | ✓ | ✓ | ✓ | |
| F11 | Foot: "Numbers marked ≈ are estimates…" | FoodScreen | ✓ | | | |
| F12 | Empty day | FoodScreen | ✓ | ✓ | | |
| F13 | Another day (day switcher): the same for that day | `DayNav` | | ✓ | | |

## Sheets

| # | Sheet and states | Web source | Auto | Eye | Unit | Native |
|---|---|---|---|---|---|---|
| S1 | About this estimate: ± margin, the four paragraphs, the biggest source | MarginSheet | ✓ | ✓ | | |
| S2 | Edit entry: kcal (gentle: the amount), amount and protein, the slider 0.25–3, steps ×0.5…×2 with "As logged", capture and ± line, "bigger uncertainties" when flagged, meal picker, Looks right, Delete entry, Done saves | EditEntrySheet | ✓ | ✓ | ✓ | |
| S3 | Add food, nothing typed: search field (placeholder with the food count), scan button, meal picker, Your recipes (row → servings, + logs your usual serving), Your usual for the meal (one tap), Recent, My foods with delete (confirm) and the dup-3 row, else Common; the bottom list (Quick estimate, Scan barcode, Scan the label or its offline note, Create a food) | AddFoodSheet `SearchView` | ✓ | ✓ | ✓ | |
| S4 | Add food, typed: recipes holding every word, Foods (top 50 by rank, "Mine" tag), or "Nothing matches…" | AddFoodSheet | ✓ (16 queries, in order) | | ✓ | |
| S5 | Add food offline: the connection pill in the header, scan-barcode offline line, Scan the label off with its note | AddFoodSheet | ✓ | | | |
| S6 | Portion: headline per 100 g / per item, source link or "Source not yet checked", meal picker, mode (Servings/Grams/Hands, Millilitres for drinks, none for per-item), serving scale, raw-weight note, one-serving note, hands chips and stepper with the calibration note, grams field and slider with "Your usual is…  Use it", the cooking-fat question and its foot, the preview card (kcal ± margin, macros, capture and fat line; gentle: protein first), Add / "Add to Lunch" | PortionView | ✓ | ✓ | ✓ | |
| S7 | Quick estimate: intro with ± 30%, five fields, meal; "Enter the calories" without kcal | QuickEstimateView | ✓ | ✓ | ✓ | |
| S8 | Create a food: barcode note (from N6), label photo button (online only), intro, g/ml, name and serving, per 100, checks with fix, one warning nudge, Save through the duplicate checks | CreateFoodView | ✓ | ✓ | | |
| S9 | Recipes: intro, list with Log and Edit, empty card, New recipe | MealsSheet | ✓ | ✓ | | |
| S10 | Recipe builder: name, servings, ingredients with amount field and remove, cooked-weight note, totals (gentle: protein per serving), checks, ingredient search (ingredients first, 30), Delete recipe; Save as recipe from a meal opens it straight away | MealsSheet | ✓ | ✓ | ✓ | |
| S11 | Log a recipe: meal, serving scale (with an odd remembered count), makes-N note, preview, Add | RecipeLogView | | ✓ | ✓ | |
| S12 | What can I make?: no recipes card; I have… chips (diet-safe), add something else, assumed foot, results with missing and swaps, ranked foot | SuggestSheet | ✓ | ✓ | ✓ | |
| S13 | Same as yesterday and Save as recipe choosers | FoodScreen | | ✓ | | |

## Duplicate foods (boards dup-1 to dup-4)

| # | Flow | Web source | Auto | Eye | Unit | Native |
|---|---|---|---|---|---|---|
| D1 | dup-1 same barcode: what changes, old → new, the no-change line, Update it / Keep mine (reached from a scan: N6) | DuplicateViews | | ✓ | ✓ | |
| D2 | dup-2 looks like a saved food: names, the table, Keep yours / Use the new one / Save as new | DuplicateViews | ✓ (typed) | ✓ | ✓ | |
| D3 | dup-3 the quiet row in My foods and its foot | DuplicateViews, AddFoodSheet | ✓ | ✓ | ✓ | |
| D4 | dup-4 pick the one to keep: default by logs, what happens, the barcode toggle, Keep this one / They're different; stored data equal after each | DuplicateViews | ✓ | ✓ | ✓ | |

## Numbers through the logging path

| # | Check | Auto | Unit |
|---|---|---|---|
| N1 | One serving logged through each app's screens stores the same entry (name, kcal, macros, grams, unit, capture, meal, servings) | ✓ (sample of chain and generic foods; `FOOD_ALL=1` every chain food) | |
| N2 | A chain food's serving equals its published figure | ✓ | ✓ (npm test, every chain food) |
| N3 | Cooking fat logs as its own entry | | ✓ |

## Across the screen

| # | Check | Auto | Eye |
|---|---|---|---|
| X1 | Light and dark follow the system | | ✓ (screenshots both) |
| X2 | Offline: search and logging work, nothing waits on the network | ✓ | |
| X3 | Flags read as on the web: `WELLBEING_ENABLED` (avatar), `LABEL_SCAN_ENABLED` (scan-the-label row, label photo), `SHARED_PRODUCTS_ENABLED` (share row: N6) | | ✓ |
| X4 | Accessibility labels equal the web's aria labels (they come from `src/copy/food.ts`) | | |
| X5 | Dynamic Type at the largest size, 44 pt targets, Reduce Motion (the sheet's slide) | | ✓ |
| X6 | No page errors in either app | ✓ | |

## Native-only decisions to bring to the lead (visible differences are proposals)

- The browser's range input becomes N1's slider; the delete-food confirm becomes the system alert.
- The web's screen-reader-only "Food to keep" legend becomes the radio group's accessibility label.
