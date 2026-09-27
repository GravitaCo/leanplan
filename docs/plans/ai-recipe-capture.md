# AI recipe capture — "tell me how you made it", then just say its name

**Status:** Spec / design doc. Groundwork shipped (see §6); the conversational AI itself is not built.
**Owner:** Nutrition. Security review required before any model call leaves the device (see §5).
**Builds on:** `core/domain/estimate.ts` (capture methods + error), `core/domain/insights.ts`
(`findRecipe`, `recipeItemsFrom`, `recipesByUse`, `recipeServing`), recipes in `Recipe` / `recipes` table.

---

## 0. The problem this solves

Home cooking is where food logs are least accurate and most tedious. A finished-plate photo is the worst
moment to measure: mixed dish, hidden oil, unknown volume. But the person who cooked it **knows exactly
what went in**. Today Tali makes them type every ingredient into the recipe builder before they get any
benefit, which is friction at the moment they're least likely to tolerate it.

The fix, in two halves:

1. **First time:** the user describes the meal in their own words and the app asks only the few questions
   that change the numbers, then saves it as a recipe.
2. **Every time after:** the user says the name ("my curry") and it's logged. No ingredients, no search.

This is the product principle — *effort proportional to uncertainty* — applied to the meal type where it
pays off most.

## 1. User flow

### First time: build by conversation

> **User:** I made a chicken curry, about four portions. 600 g chicken thighs, a tin of coconut milk,
> an onion, two tablespoons of oil and a jar of curry paste.
>
> **Tali:** Got it. One question: which curry paste, and roughly how much of the jar went in?
>
> **User:** Patak's tikka masala, about half.
>
> **Tali:** Saved as **Chicken curry** (4 servings, about 520 kcal each). Want to log a serving now?

Rules for the questions:

- **Ask only what moves the total.** "A tin" of coconut milk is standard (400 ml): don't ask. A jar of paste
  is vague and high-impact: ask. Oil, butter and cream are the classic hidden fats: always confirm the amount
  if it wasn't stated; never assume zero, never invent a big number.
- **One question at a time, at most three per recipe.** If more are uncertain, save with a wider ± margin
  and let the recipe improve next time rather than interrogating.
- **Close with the result, not a form.** The user sees name, servings and per-serving estimate, and can
  correct any line with a slider (same as `EditEntrySheet`), never by retyping.

### After: the name is enough

- Search already ranks the user's recipes first and resolves filler words ("a bowl of my curry" →
  *Chicken curry*) via `findRecipe` / `queryWords`.
- Logging defaults to the servings they had last time (`recipeServing`).
- The conversational entry point becomes a single text/voice field on Food: "had my curry" → confirm chip →
  logged. If the name is ambiguous, show the top two recipes as chips. If it matches nothing, fall into the
  first-time flow above.

### Recipes from meals already logged (shipped)

If the user already logged a meal item by item, **Save as recipe** on that meal turns those entries —
cooking fat included — into a recipe (`recipeItemsFrom`). No retyping. The AI flow should offer the same
thing proactively: "You've logged these four things together three times. Save as a recipe?"

## 2. How the model is used (and not used)

- **The model is a router, not a source of numbers.** It parses the description into
  `{ingredient phrase, quantity, unit}` items and maps each phrase to a food in Tali's verified database
  (`core/data/foods.ts` today; Open Food Facts / USDA later per `nutrition-data-and-sourcing.md`).
  Macros always come from the database, never from model output.
- **Unmatched ingredients** become a clarifying question ("Is 'curry paste' closest to *tikka masala paste*
  or *korma paste*?"), or a user-supplied custom food. Never a guessed number.
- **Uncertainty is carried, not hidden.** Each item gets a capture method (`g`, `serv`, `hand`, `quick`)
  and the recipe's per-serving margin comes from the same root-sum-square model as day totals.
- **Questions are chosen by impact:** rank candidate questions by `kcal × error` of the item they'd resolve
  (the same measure as `flaggedEntries`) and ask the top one only if it clears the user's accuracy-mode
  threshold (`ACCURACY[mode].flag`). Relaxed mode asks nothing.

## 3. Data model (all additive, no renames)

`Recipe` gains optional fields, riding the existing `recipes` table's JSON `items` and a new nullable
column only if needed (security-data sign-off):

| Field | Type | Why |
|---|---|---|
| `aliases?` | `string[]` | Names the user actually says ("curry", "Tuesday curry"), learned from successful lookups |
| `source?` | `'builder' \| 'meal' \| 'conversation'` | Where it came from, for trust + analytics |
| `items[].how?` / `items[].err?` | capture method + error | Per-ingredient margin, same model as `LoggedFood` |
| `lastConfirmed?` | ISO date | When the user last checked it; prompt a quick review after changes ("same as last time?") |

`findRecipe` should check `aliases` before substring matching.

## 4. Psychological safety

- Works in **gentle mode**: the conversation never states calories; confirmation shows servings and protein.
- No judgement in copy ("that's a lot of oil" is banned). Oil is asked about because it's the part logs
  miss, not because it's bad.
- The user can always skip a question; skipping widens the margin and never adds made-up food.

## 5. Architecture & security

- **No model keys in the client.** Calls go through a Supabase Edge Function (auth required; RLS-scoped
  to `auth.uid()`), which forwards only the meal text, never the user's history or profile.
- The Edge Function returns structured JSON (items + candidate questions). Matching to the food database
  and all arithmetic stay in `core/` (pure TS), so the same logic serves a future native client.
- Offline use gets the non-AI path: search, Save as recipe, recipe builder. (There is no guest mode; it was retired in Sept 2026.)
- Cost control: one short call per new recipe; repeat meals are resolved locally by `findRecipe` with no
  model call at all.

## 6. What's already in place

- Recipes ranked first in search and on the Food screen, one-tap log at the usual serving.
- `findRecipe(state, text)` + `queryWords` for name-based lookup ("my curry").
- `recipeServing` — servings remembered per recipe.
- `recipeItemsFrom(entries)` + **Save as recipe** on any logged meal (cooking fat included).
- Capture-method error model and impact ranking (`estimate.ts`) the question-picker will reuse.

## 7. Phasing (each ship-critic reviewable)

1. **Text field on Food** that resolves names locally via `findRecipe` (no AI). Proves the "just say the
   name" loop.
2. **Edge Function parse + DB matching** for first-time recipes, with at most one clarifying question.
3. **Impact-ranked questions** (up to three), aliases learning, and the "save these as a recipe?" nudge.
4. **Voice input** on iOS via the Web Speech API, feeding the same text path.

## 8. Open questions for Benn

- Model provider and data-retention terms for meal text.
- Whether AI capture is free (it's the accuracy product) or part of a paid tier.
- How many clarifying questions feel acceptable before it becomes nagging (proposal: three).
