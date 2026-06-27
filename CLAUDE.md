# Tali — project brief for Claude Code

Tali is a personal **health & fitness PWA** — tracking fitness, diet/nutrition, body
stats, workouts and supplements in one place. "Health" here means fitness + diet +
nutrition (not medical/wellbeing). Tone: simple, approachable, gender-neutral, no
gym-bro language.

- **Live:** https://gravitaco.github.io/leanplan/ (the repo is named `leanplan` for
  historical reasons; the app is **Tali**). Previous vanilla app is parked at `/leanplan/legacy/`.
- **Repo:** GravitaCo/leanplan, default branch `main`.

## Run / build / deploy

```
npm install
npm run dev        # Vite dev server → http://localhost:5173/leanplan/
npm run build      # tsc -b && vite build → dist/
npm run typecheck
```

- **Deploy = push to `main`.** A GitHub Actions workflow (`.github/workflows/deploy.yml`)
  builds and publishes to GitHub Pages. Pages source is **GitHub Actions** (build_type
  `workflow`) — do NOT switch it back to "deploy from a branch" or it serves raw source
  and the page goes blank.
- Vite `base` is `/leanplan/` (see `vite.config.ts`). Reference public assets with
  **relative** paths so they resolve under that base. Don't commit `dist/`.
- Bump the service-worker `CACHE` name in `public/sw.js` whenever you change shipped
  assets, so existing installs refresh.

## Architecture (scalable, native-ready)

The core is deliberately **UI-framework-agnostic** so a future React Native / Capacitor
build can reuse it. Keep React/DOM out of `core/` and `data/`.

- `src/core/` — pure TS, no React: `types.ts`; `domain/` (nutrition, workout, date math,
  TDEE); `data/` (the ~336-item food DB, Push/Pull/Legs workouts, constants).
- `src/data/` — `supabase.ts` (client + REST + session), `persistence.ts` (localStorage +
  migrations), `sync.ts` (offline-first, per-record dirty flags, last-write-wins),
  `push.ts` (Web Push), `backup.ts` (JSON export/import).
- `src/store/store.ts` — Zustand + Immer store; wires core/data to React; owns the
  debounced sync loop.
- `src/ui/` — design-system primitives (Card/Button/Pill via theme classes, `Toggle`,
  `Accordion`, `BottomNav`, `WeekStrip`, icons).
- `src/screens/` — Today, Food (+ `food/AddFoodSheet`, `food/MealsSheet`), Train, Plan,
  Profile, AuthScreen, `body/WeightSheet`.

## Design system

Tokens live in `src/styles/theme.css` (`:root` CSS variables). Use these, don't hardcode:

- Surfaces: `--bg #0c0c0e`, `--card #16161a`, `--card-2 #1c1c21`, `--cream #f4f2ed`.
- Accent: `--accent #e8835e` (coral). Macro hues: `--protein #6b9fe8`, `--carbs #e8a34d`,
  `--fat #c98ad6`. Status: `--good`, `--warn`, `--over`.
- Type: `--font-sans` Hanken Grotesk, `--font-mono` IBM Plex Mono (mono = small uppercase
  micro-labels, the Tali signature). Radius `--radius 22px`.
- Shared classes: `.card`, `.card.cream`, `.btn`/`.btn.ghost`/`.btn.sm`, `.pill`,
  `.field`, `.row`, `.section-label`, `.mono`, `.toast`.
- App icon source: `Tali-App.svg` (mauve `#cd7fae` mark on black). PWA PNGs in `public/`
  are generated from it.

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
