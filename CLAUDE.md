# Tali — project brief for Claude Code

Tali is a personal **health & fitness PWA** — tracking fitness, diet/nutrition, body
stats, workouts and supplements in one place. Tone: simple, approachable, gender-neutral,
no gym-bro language.

**Product frame:** good mental performance → good nutrition → good fitness. Sleep, stress,
mood and motivation come first because they decide whether someone can eat well and train
consistently. Tali offers **general wellness guidance, never medical advice or therapy**:
see `docs/plans/ai-platform-plan.md` §4 and the `mental-performance` agent.

- **Live:** https://app.tali.fit/ (GitHub Pages custom domain; the marketing site is Webflow
  on www.tali.fit; the repo is named `leanplan` for historical reasons; the app is **Tali**).
  Previous vanilla app is parked at `/legacy/`.
- **Repo:** GravitaCo/leanplan, default branch `main`.

## Run / build / deploy

```
npm install
npm run dev        # Vite dev server → http://localhost:5173/
npm run build      # tsc -b && vite build → dist/
bash scripts/preview.sh [branch]  # switch branch, build, serve on your Mac and Wi-Fi (docs/local-preview.md)
npm run typecheck
npm test           # core unit tests (checks, unit maths)
npm run check:foods  # validates every built-in food; must pass before shipping food data
npm run check:exercises  # validates the exercise library; ids are never removed or renamed
```

- **Preview before live = local** (Benn's choice for now; no staging host). Check a working
  branch with `bash scripts/preview.sh <branch>` as described in `docs/local-preview.md`.
- **Deploy = push to `main`.** A GitHub Actions workflow (`.github/workflows/deploy.yml`)
  builds and publishes to GitHub Pages. Pages source is **GitHub Actions** (build_type
  `workflow`) — do NOT switch it back to "deploy from a branch" or it serves raw source
  and the page goes blank.
- Vite `base` is `/` (see `vite.config.ts`) since the app serves from the `app.tali.fit` root.
  Reference public assets with **relative** paths. `public/CNAME` (`app.tali.fit`) is copied
  into `dist/` on every build so the custom domain survives each Pages deploy — don't
  remove it. Don't commit `dist/`.
- Bump the service-worker `CACHE` name in `public/sw.js` whenever you change shipped
  assets, so existing installs refresh.

## Architecture (scalable, native-ready)

The core is deliberately **UI-framework-agnostic** so a future React Native / Capacitor
build can reuse it. Keep React/DOM out of `core/` and `data/`.

- `src/core/` — pure TS, no React: `types.ts`; `domain/` (nutrition, workout, date math,
  TDEE, `library.ts` for swaps and "last time"); `data/` (the ~336-item food DB, the exercise
  library `exercises.ts` with its committed id list `docs/data/exercise-ids.json`,
  Push/Pull/Legs workouts, constants).
- `src/data/` — `supabase.ts` (client + REST + session), `persistence.ts` (localStorage +
  migrations), `sync.ts` (offline-first, per-record dirty flags, last-write-wins),
  `push.ts` (Web Push), `backup.ts` (JSON export/import).
- `src/store/store.ts` — Zustand + Immer store; wires core/data to React; owns the
  debounced sync loop.
- `src/ui/` — design-system primitives: `primitives.tsx` (`Sheet`, `Seg`, `Toggle`,
  `Disclosure`, `Tile`, `CatHead`, `PageHeader`, `pressable`), `charts.tsx` (`Rings`,
  `RangeBar`, `MacroCol`, `Sparkline`, `WeekBars`), `WeekStrip` + `DayNav`, `BottomNav`, `icons`.
- `src/screens/` — Today (Summary), Food (+ `food/AddFoodSheet` → Portion / RecipeLog /
  QuickEstimate / CreateFood views, `food/EditEntrySheet`, `food/MealsSheet`, `food/MarginSheet`),
  Train, Plan (+ `plan/PlanSheets`), Profile, AuthScreen, `body/WeightSheet`, `today/CheckinSheet`.
- Logging model: `core/domain/estimate.ts` gives every entry a capture method + typical
  error (days show a ± margin; the cooking-fat question only for foods flagged `cook`);
  `core/domain/insights.ts` holds ranges, neutral status copy, usuals and weekly trends.

## Design system

Tokens live in `src/styles/theme.css` (`:root` CSS variables). Use these, don't hardcode:

Apple Health / Fitbit-inspired (replaced the earlier dark coral / Hanken Grotesk look in
Sept 2026, at Benn's request). Light or dark always follows the device's appearance
setting (`prefers-color-scheme`); there is no in-app override.

- Surfaces & labels follow iOS system colours: `--bg`, `--card`, `--elev`, `--sheet`,
  `--fill`/`--fill2`/`--fill3`, `--label`/`--label2`/`--label3`, `--sep`. Interactive: `--tint`.
- One category colour per data type, each with a contrast-safe `-ink` text variant:
  `--energy`, `--activity`, `--protein`, `--carbs`, `--fat`, `--body`, `--supps`, `--mind`.
  No status red/amber for eating — targets are ranges and copy stays neutral.
- Type: system font (`--font-sans`, SF Pro on iOS); numbers use `.num` (SF Pro Rounded,
  tabular). iOS scale: 34 large titles, 22 section titles, 17 body, 13 footnotes.
- Shared classes: `.card`, `.list`/`.li` (inset grouped rows), `.grp-h`, `.sec-t`, `.lbl`,
  `.foot`, `.btn` (+ `.tinted`/`.gray`/`.danger`/`.sm`), `.seg`, `.chip`, `.scale`,
  `.frow` (form rows), `.tile`, `.banner`, `.toast`.
- Legacy token names (`--accent`, `--muted`, `--line`, `--card-2`, …) remain as aliases
  so older markup (AuthScreen) keeps rendering; prefer the new names in new code.
- App icon source: `Tali-App.svg` (mauve `#cd7fae` mark on black). PWA PNGs in `public/`
  are generated from it.

## Food data & offline (important)

- **Offline-first:** Tali must open, search, log and save with no connection. Never add a
  launch or save path that waits on the network. See `docs/plans/food-data-offline.md`.
- Every food cites its source (`src`, keys in `src/core/data/sources.ts`); foods are per 100 g,
  per 100 ml (`ml`) or per item (`each`). Prefer UK CoFID, then the brand's own UK figures, then
  the pack label; USDA only as a fallback. Never invent values: leave a food unsourced instead.
- Food names are stable IDs (learned usuals match by name): don't rename casually.
- **What the user sees must equal the source.** Where a source publishes per-portion figures
  (chains), those are the truth: keep portions exact and derive per-100 values from them. Check
  every item through the app's logging path (one serving in the app = the published figure), not
  just the stored per-100 values. Importers assert this; `npm test` checks chain servings.
- **Food data changes need `nutrition-accuracy` sign-off as well as `ship-critic`** before merging.

## Exercise demo videos

- Generation prompts (Seedance) and clip tips: `docs/exercise-video-prompts.md`.
- Clips live in `public/videos/` (vertical 540×960 H.264, no audio, `+faststart`, ~0.6 MB each)
  with a poster JPG, and are attached to an exercise via `video` in `core/data/workouts.ts`
  (data in `core/data/media.ts`). `VIDEO_BASE` there is the one switch for moving them to
  Bunny CDN (the plan in `docs/plans/workouts-customization-and-library.md`).
- Each clip carries a **tempo timeline measured from the footage**; the Train screen's
  "Watch example" full-screen player shows phase, rep and a 1-2-3 count from it. Re-time it whenever a clip
  changes; `npm test` checks the files exist and the timeline is ordered.
- The service worker leaves `/videos/` to the network (Safari streams video with Range
  requests), so clips need a connection; logging never does.

## Backend & data (important)

- Supabase. The anon key in `supabase.ts` is public by design; **RLS is locked** so every
  row is private to `auth.uid()` (see `docs/security-rls.sql`). Don't loosen it.
- **Never rename the localStorage key `leanplan.v1`** or the Supabase table/column names —
  doing so orphans existing user data.
- Guest mode is **local-only**: the `authed` flag gates all cloud sync, so we never hit the
  DB without a real session.

## Working agreement: Figma → code

The user designs in **Figma**; Claude implements. Run the **local** Figma Dev Mode MCP
(`claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp`) — it's only
reachable from a Claude Code running on the user's machine, not from a cloud session.

Per screen/flow: read the frame → reconcile its styles against the tokens above (flag, don't
silently diverge) → build with existing primitives (extract a new shared component when a
pattern repeats) → wire to the store → verify in a headless browser → push to deploy.
Where a design has gaps, implement the obvious case and call out the decisions made.

## Conventions

- TypeScript strict; no unused locals. Match surrounding style.
- Commit/push only when asked. Keep commits focused.
- **Nothing goes live without `ship-critic` approval.** Even when Benn says "push live" or
  "merge", run `ship-critic` on the change first and merge to `main` only on SHIP (or SHIP WITH
  FIXES once those fixes are in and re-checked). If it hasn't approved, push to the working
  branch and report its verdict instead. This keeps accountability for what reaches users.
