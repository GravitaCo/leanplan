# Recipe sharing: send a recipe as a link, open it in Tilo, add it

Status: **plan, 9 Nov 2026, for Benn and Sara.** Nothing is built. Decided so far: a confirm tap
with an acceptance clause (§4.2), and recipes and ingredients online, private unless shared, in
the native app (§11) (Benn, 9 Nov).
Labels: **[E]** checked (in the code or a spec), **[I]** inference, **[G]** judgement call,
**[V]** to verify on real phones before the boards are drawn.

## 1. What it does

Someone opens one of their recipes, taps Share, picks WhatsApp (or Messages, email, anything the
phone offers) and sends a link. The person who gets it taps the link, Tilo opens and shows the
recipe, and one tap adds it to their own recipes. From then on it is theirs: they can edit it and
log a serving like any recipe they built.

## 2. Recommended approach: the recipe travels inside the link

A recipe is small and self-contained. Each item already carries its name and its kcal, protein,
carbs and fat per 100 g (or ml, or per item) [E: `RecipeItem`, `src/core/types.ts`], so nothing
has to be looked up on a server to rebuild it.

- The link is `https://app.tilo.fit/#r=<data>`, where `<data>` is the recipe as JSON, compressed
  and URL-safe encoded. A curry with rice and 8 ingredients comes to about **420 characters**
  [E: measured with deflate and base64url], which WhatsApp and every messenger handle.
- **Nothing is stored anywhere.** No new table, no server function, no short-link service. The
  part after `#` is never sent to a server by a browser [E: RFC 3986 §3.5], so neither GitHub
  Pages nor WhatsApp's link-preview fetch sees the recipe.
- **Works offline.** The sender can build the link with no connection, and the receiver's app
  reads it from the address without the network, in line with the offline-first rule.

Rejected for v1 [G]: storing shared recipes on the server behind a short id. It gives shorter
links and a preview card with the recipe name, but it adds a public table, abuse handling,
retention rules, a privacy-policy change and a `security-data` review, for little gain at alpha
size. It stays an option for later (§8).

## 3. Sending

- A **Share** action on a saved recipe (in Recipes, `food/MealsSheet.tsx`).
- It opens the phone's own share sheet (Web Share API) with a short message and the link, for
  example "Chicken curry with rice, from my Tilo recipes" plus the link. Where the share sheet
  isn't available, it copies the link and says so.
- WhatsApp's preview card shows Tilo's general card, not the recipe name, because the name lives
  after `#` [I]. The message text carries the name instead.
- Only the recipe name, servings and items are shared: never the sender's name, logs, targets or
  anything else from their account [G].

## 4. Receiving

1. The app reads `#r=` on launch, removes it from the address at once (the app already tidies the
   address this way for query parameters, `App.tsx`), and checks it (§5).
2. A sheet shows the recipe: name, servings, per-serving kcal and macros with the usual ± margin,
   and the ingredient list. **One tap, "Add to my recipes", saves it**, and the confirm tap is
   required (Benn, 9 Nov 2026), so a link can never put something in someone's account without
   them seeing it.
   - **Acceptance clause (Benn, 9 Nov 2026):** adding the recipe includes accepting the
     nutritional information it brings. A line sits directly above the button, for example:
     "Some of these numbers come from the person who shared this recipe, not from Tilo. By adding
     it, you accept them as they are. You can edit any ingredient after." Final wording is for
     `compliance` and `mental-performance` (§7). Tapping Add is the acceptance; no separate
     checkbox, and nothing pre-ticked [G].
   - The clause names only what it covers: ingredients re-matched to Tilo's own foods (§5) use
     Tilo's sourced values, so the line is about the sender's values. If every ingredient matched,
     the line can say the numbers are Tilo's own [G].
3. It is saved as a new recipe with a new id and syncs like any other.
4. **Same name already saved:** recipe names must be unique per person [E: `MealsSheet.tsx`], so
   the sheet offers "Add as Chicken curry with rice (2)" or "Replace mine" [G].
5. **Not signed in** (or a new device): sign in first, then the sheet appears. The link is kept on
   the device only until then.
6. **Someone without a Tilo account:** the link opens the sign-in screen. While Tilo is an invited
   alpha, the sheet needs a line saying Tilo is invite-only for now [G; wording for the boards].

## 5. Accuracy and safety of the numbers

The numbers in a link come from the sender's phone and can be edited by anyone who edits the link,
so the receiving app never trusts them blindly.

- **Built-in foods are re-matched by name.** Food names are stable ids [E: CLAUDE.md], so an item
  whose name matches a built-in food takes the receiver's own database values and source. A stale
  or edited figure can't come in that way.
- **Other items** (the sender's saved foods, label scans, shared products) keep the sender's
  values and are marked as coming from a shared recipe, with their own margin. The source key and
  the margin are for `nutrition-accuracy` to set; nothing here picks a number.
- **Checks before the sheet shows:** a version number, a cap on items (for example 60) and on name
  length, every value a finite number in a sane range (the same style of checks as
  `validateFoods`), and the existing recipe checks (`checkRecipe`). A link that fails shows "This
  link doesn't contain a recipe Tilo can read" and nothing is saved.
- Text from the link is shown as plain text only, never as HTML.
- Gentle mode and the food display settings apply to the sheet as they do to any recipe.

## 6. The hard part: links and an installed web app [V]

This is the biggest risk, and it decides how good the feature feels.

- **iPhone:** a web app added to the Home Screen does not open from links [I, widely documented;
  V]. Tapping the link in WhatsApp opens WhatsApp's own browser or Safari, and on iPhone the Home
  Screen app keeps its storage apart from Safari [I; V]. So the person lands in a Tilo page that
  isn't signed in, even if they use Tilo every day.
- **Android:** an installed web app can take over links to its own address in Chrome [I; V], but
  WhatsApp may still open them in its own browser [V].

Options for iPhone, to choose from once tested:

- **(a) Add in the browser, sync to the app.** The person signs in on that page, taps Add, and the
  recipe syncs to their account, so it appears in the Home Screen app on its next sync. It works
  with today's code; the cost is a sign-in in Safari. It needs a connection, which a link from
  WhatsApp implies anyway.
- **(b) Copy and paste.** The page offers "Copy recipe" and tells them to open Tilo; Tilo's add
  recipe screen notices a recipe link on paste and shows the same sheet. No sign-in, but more
  steps.
- **(c) The native app.** Universal links (iOS) and app links (Android) open the app directly.
  That waits for `native-app-plan.md`, so it's later.

Recommendation [G]: build (a) with (b) as the fallback on the same page, and test both on an
iPhone and an Android phone before the boards are finalised.

## 7. Privacy and compliance

- Tilo stores nothing new and sends nothing to a new service. Sharing is the sender's own act
  through the messenger they choose. The received recipe is saved like any recipe they create.
- Still a `compliance` question before the build: whether the privacy policy and terms should say
  that shared recipes travel in the link and what Tilo does with a received one, and whether a
  recipe can count as health data (for example, a recipe a person shares can hint at a diet). A
  short line in the policy is likely [I].
- `security-data` reviews the parsing of untrusted input (§5) and the "kept until sign-in"
  storage (§4.5).
- **The acceptance clause (§4.2)** needs `compliance` to word it and to add the matching paragraph
  to the terms (`src/core/legal/terms.ts`, published with `npm run legal:html`). Under UK consumer
  law a clause like this can't take away rights a person has by law, and an unfair term doesn't
  bind them (Consumer Rights Act 2015, Part 2) [I: for `compliance` and later the solicitor to
  confirm], so it works as a clear notice of where the numbers come from rather than a waiver.
  `mental-performance` checks the tone so it reads as information, not a warning.
- Whether to keep a record that someone accepted (for example the time, on the saved recipe) is a
  `compliance` question; nothing is recorded by default [G].

## 8. Not in v1

- Public recipe pages, a recipe library or feed, likes or comments.
- Short links or a server copy (§2), and a preview card with the recipe name.
- Photos, method steps or cooking times (recipes don't hold these today).
- Knowing who opened a link, or how many times: no tracking.
- Sharing workouts or plans the same way (a natural follow-on, same pattern).

## 9. Build order

1. **Phone test** of §6 on a real iPhone and Android phone: a throwaway link that only shows
   what opened (browser or app) and whether the person is signed in. No user data.
2. **Boards** on the Design canvas for Benn or Sara, past the `design` agent: the Share action,
   the receive sheet with the acceptance line (normal, name clash, invalid link, gentle mode), the signed-out landing with
   the iPhone fallback, light and dark.
3. **Reviews before code:** `nutrition-accuracy` (§5 source key and margin), `compliance` (§7),
   `security-data` (§5, §4.5), `mental-performance` (sheet and share copy).
4. **Build:** encode and decode in `src/core/` (no React, so the native app can reuse it) with
   unit tests (round trip, size cap, bad input, re-matching by name); the Share action; the
   receive sheet; e2e in a headless browser; bump the service worker `CACHE`.
5. **`ship-critic`**, then `main`.

## 10. Decisions for Benn and Sara

1. Decided (9 Nov): a confirm tap, with a clause that adding accepts the nutritional information
   (§4.2). Still open: the exact wording (after `compliance`), and whether the acceptance is recorded.
2. Name clash: "(2)" suffix and "Replace mine", or something else?
3. iPhone route: (a), (b) or both, after the phone test.
4. Where it sits on the roadmap: it is not yet placed. It touches food data, so it can run inside
   the food clean-up stream or after it.
5. Decided (9 Nov): recipes and ingredients kept online, private unless shared, existing
   ingredients reused silently, sharing in the native app (§11). Open: does the web app get
   sharing before the native app; does adding a new ingredient say so; the "Not backed up yet"
   state (§11.2).

## 11. Recipes and their ingredients on the server (Benn, 9 Nov 2026)

Benn's direction: every person's recipes and ingredients are kept online, so changing or resetting
a phone loses nothing; adding a recipe reuses ingredients the person already has, silently;
recipes stay private unless shared; sharing is a feature of the native app.

### 11.1 What is already true [E: checked in the code, 9 Nov]

- **Recipes are already stored on the server, per person.** Each recipe is a row in the
  `recipes` table, and its ingredients travel inside it (the `items` column holds each
  ingredient's name, figures and amount: `toServerRecipe` in `src/data/sync.ts`).
- **Saved foods are already stored on the server** (`custom_foods`), including the per-item
  setting in `meta`.
- **A new or reset phone gets them back:** signing in pulls recipes, saved foods, days, workouts
  and plans from the account (`pullAll`, `sync.ts`). Sync already runs when a connection returns.
- **They are already private:** row-level security keeps every row to its owner
  (`docs/security-rls.sql`).
- The built-in food database ships inside the app, so it never needs storing per person.

### 11.2 Where data can still be lost today

1. **Changes made offline and not yet synced** when the phone is lost or wiped. They live only on
   the phone until the next sync. Possible fix [G]: a quiet "Not backed up yet" state on the
   existing connection indicator when unsynced changes are older than a day; a visible change, so
   boards first.
2. **Nothing uploads until the health consent yes is on the server** (`sync.ts`, by design: GDPR
   Art. 9). Someone who never said yes has nothing in the account. That stays.
3. **Unload notes are kept on the phone only, by design** (`src/data/deviceOnly.ts`,
   security-data H1), and are lost with the phone unless exported. That stays unless Benn or Sara
   and `security-data` reopen it.
4. **A health consent withdrawal clears the account's copy** (`clear_log_after_withdrawal()`),
   by design.

### 11.3 Checking ingredients when a recipe is added

When a recipe is added (built by the person, saved from a meal, or received through a link), each
ingredient is checked against what the person already has, in this order:

1. **A built-in food with the same name:** used as is. Nothing new is saved.
2. **One of their saved foods that matches:** reused, using the duplicate-food rule already in the
   app (`likelySaved` and `figuresMatch` in `src/core/domain/duplicates.ts`, set by
   `nutrition-accuracy` in Oct 2026). Nothing new is saved.
3. **Otherwise:** saved as a new saved food (synced through `custom_foods`), so it can be searched,
   logged and reused in the next recipe.

The person isn't told about steps 1 and 2 (Benn, 9 Nov). Whether step 3 says anything (for
example "2 new ingredients added to your foods" on the receive sheet) is open.

Each recipe ingredient keeps its own copy of the figures, as today, so logging a recipe never
changes because a saved food was edited later. It also gains an optional link to the food it was
matched to; this is a new field inside the existing `items` column, so no migration [I:
`security-data` to confirm]. Old recipes are checked the same way the next time they are edited,
never in the background [G].

`nutrition-accuracy` signs off the match order (step 1 matches by name only) and what happens when
a shared ingredient's figures differ from the person's matching saved food.

### 11.4 Private unless shared

A shared link carries a copy of the recipe. It never gives anyone access to the sender's account
or to the recipe in it, and changes on either side don't reach the other. There is no public
recipe page (§8).

### 11.5 Native app

Recipe sharing is part of the native app (`native-app-plan.md`). There, universal links (iPhone)
and app links (Android) open the app straight from WhatsApp, which removes the problem in §6, and
the app's own share sheet sends the link. Open: whether the web app also gets sharing now (with
the §6 fallbacks), or it waits for the native app. The ingredient check (§11.3) does not depend on
native and can be built in the web app first.
