# "What can I make?" and meal planning — plan

**Status:** plan only. Nothing is built. For Benn to decide scope before any build.
**Builds on:**
- recipes (`Recipe`, `recipesByUse`, `recipeServing`);
- the sourced food database and guardrails (`food-data-offline.md`);
- the AI platform plan (`ai-platform-plan.md`: numbers always from `core/`, AI only routes and suggests);
- the offline-first rule.

## 0. The user problems

1. **"I don't have a plan. What should I eat?"** They need a suggestion that fits their day
   (protein left to hit, calorie range, how much time they have).
2. **"I only have what's in the fridge and cupboard. What can I make?"** Suggestions must use
   what they have, and list anything missing.
3. **"Plan my week."** A light plan, a shopping list, and cooking once to eat twice. It should be
   flexible, not a rigid diet.

Principles, from the rest of Tali:
- **Effort matches the value:** a suggestion takes one tap to accept and log.
- **Numbers are computed by the app from sourced ingredients:** never estimated by AI.
- **Works offline:** suggestions from recipes stored on the phone need no connection.
- **Psychologically safe:** no "you should eat", no shaming, gentle mode respected, easy options
  on tired or stressed days (from the check-in).

## 1. The biggest risk: keeping track of what's in the kitchen

Pantry apps fail because people stop updating them. So Tali should never ask for quantities
and never make the kitchen list a chore.

- **"I have…" chips:** tap the ingredients you have right now. Tali pre-suggests from recent logs,
  recipes and last week's shopping list. It's a snapshot for tonight, not stock control.
- **Staples assumed:** salt, pepper, oil, common spices and stock cubes are ticked by default,
  and the user unticks what they don't have.
- **Learned over time:** items bought on the shopping list are added; items logged in a meal are
  marked as probably used. Nothing is ever asked for twice.
- **Later:**
  - "say what's in the fridge" (voice or text via the AI parser);
  - a photo of the fridge or a receipt (AI, online, with the user confirming the items).

## 2. Where suggestions come from

| Source | Offline | Accuracy | Notes |
|---|---|---|---|
| **The user's own recipes** | Yes | Exact (their ingredients) | Already built; ranked first |
| **Tali recipe library** (curated, ~100–200 simple UK home-cooking recipes built from sourced database ingredients) | Yes (ships in the app or a food pack) | Exact to the database | New content; written once, reviewed by `nutrition-accuracy` and `mental-performance` for tone |
| **AI-generated idea** from the user's ingredients | Online only | Ingredients matched to the database; numbers computed by the app | Phase 2; always shown as "an idea", editable before saving as a recipe |

**Matching and ranking** is a pure `core/` function, deterministic and testable:
1. **Cover what they have:** the most ingredients owned, and missing ingredients listed ("missing: 1 onion").
2. **Fit the day:** protein still to go and the calorie range left today. Neutral wording, and no calories in gentle mode.
3. **Fit the moment:** time needed (≤15 / 30 / 60 min), equipment, and on low-energy check-in days, the easy options first.
4. **Hard filters that never bend:** allergies and dietary choices (vegetarian, vegan, halal and so on) from the profile.
   Allergen data is needed per ingredient; the Greggs allergen guide shows chains publish it.
5. **Variety:** don't suggest last night's dinner again unless it's a "usual".

## 3. Meal planning (Phase 3)

- **Plan a few days, not a rigid week:** pick 3–5 dinners from the suggestions. Lunches can be
  "leftovers from…" (cook once, eat twice, which the recipe servings already support).
- **Shopping list** = the plan's ingredients minus what's ticked in the kitchen, grouped by shop aisle
  and shareable. Ticking an item marks it as in the kitchen.
- **Plans bend:** skipping or swapping a meal is one tap and never framed as failing. The weekly
  reflection can note "planned meals were easier on busy days" (mental performance → nutrition).
- **Targets:** a plan shows its protein and calorie range across the days, not per-meal perfection.

## 4. Data (all additive; `leanplan.v1` untouched; any new Supabase table needs `security-data` review)

| Thing | Shape | Where |
|---|---|---|
| Kitchen snapshot | `{ have: foodName[], updated }` | Local; synced as part of settings |
| Library recipe | `Recipe` + `{ time, tags, equipment, steps? }`, ingredients by food name | Bundled (`core/data/recipes/`) or a food pack |
| Plan | `{ days: { date, meal, recipeId }[] }` | Local + sync (new table, later) |
| Shopping list | derived from plan − kitchen; ticks stored | Local |
| Diet and allergies | profile fields | Local + settings sync |

Library recipes go through the same guardrails:
- every ingredient must exist in the database with a source;
- totals are computed, not stored;
- `npm run check:foods` gets a `check:recipes` sibling.

## 5. Phases

| Phase | What | AI? | Rough effort |
|---|---|---|---|
| 1 | **"What can I make?"** from the user's recipes + kitchen chips + ranking. Easy, offline. | No | Small |
| 2 | **Tali recipe library** (start with 50 simple UK meals), time/diet tags and allergy filters | No | Medium (mostly content and review) |
| 3 | **AI "ideas"** from the ingredients the user has (online; parse → match to the database → app computes the numbers), and saving an idea as a recipe | Yes | Medium; about $0.01–0.05 per idea (see `ai-platform-plan.md` §3) |
| 4 | **Plan a few days + shopping list** | No | Medium |
| 5 | **Voice or photo of fridge/receipt** to fill the kitchen list | Yes | Later |

## 6. Decisions for Benn
1. **Where to start:** Phase 1 (fast, uses what exists), or straight into the recipe library? Proposed: 1 then 2.
2. **Who writes the library recipes:** you or a recipe writer, with Tali building the nutrition. Or AI drafts that a person reviews?
3. **Allergens:** allergy filtering is a safety feature. Should it wait until allergen data exists per ingredient, rather than being partial?
4. **AI ideas:** free, or part of a paid tier (same question as the AI plan)?
