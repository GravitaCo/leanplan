# Health and Fitness PWA

_Started 2026-06-25 13:53 UTC_

---

## User

I have attached some design examples, I would like a design for a health & fitness app, which is gender neutral, it should be simple and not over complicate UI/UX, I have attached an example video for workouts. This will be a PWA. The app records body stats, tracks food for cal deficity and macros, builds meals out, has a workout schedule and plan, shows individual workouts and records the sessions has a login and profile with notification settings. it also tracks when I take suppliments.

## Assistant

Let me look at your uploaded reference images and the workout video first.

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

These references span four pretty different aesthetics — a dark minimal monospace fintech look, a dark image-forward card app, a bright rounded chart app, and a bold editorial warm-palette look. Before I build, let me lock down direction.

_[tool: image_metadata]_

_[tool: questions_v2]_

## User

Questions answered:
- aesthetic: 0
- mode: Both / system-adaptive
- accent: Warm (coral/amber)
- screens: All of them
- flagship: The video is for the working session as an example for that workout
- variations: 2 variations
- data_feel: Calm and minimal — numbers only when needed
- tone: Approachable and inclusive, it should feel simple and talk to the every person, no Gym Bro speak here, at the moment we have a working name of LeanPlan but I don't like this.

## Assistant

Got it — dark, calm, monospace-flavored fintech aesthetic with a warm coral accent, approachable inclusive copy, the workout video as the hero session, and a light-mode variation. I'll build all the screens on one pannable canvas with 2 variations of the session screen.

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: update_todos]_

Here's the full **Tend** fitness PWA — 15 screens on one pannable canvas, in the calm dark fintech direction (warm coral accent, monospace micro-labels, off-white "sheet" cards for key numbers). Coverage:

- **Onboarding** — Welcome, Sign in, and a private "set your baseline" step (goal + body stats, inclusive sex options)
- **Daily** — Today/home hub, Body stats with weight trend, Food log (calories + macros), Meal builder
- **Training** — Weekly plan, today's workout overview, and the active session in **2 variations**: A (dark, set-by-set tracker) and B (light, immersive single-set focus) — both using your Incline Dumbbell Press video as the live demo
- **Account** — Supplements (morning/evening, streak), Profile, Notifications & settings

The set checkmarks in Session A are tappable, and there's an **accent color tweak** (coral / amber / sage / slate) in the Tweaks panel.

Two things worth flagging:
- **Name** — I used "Tend" as a working name (warm, every-person, no gym-bro). Alternatives if it doesn't land: Baseline, Steady, Even, Tempo, Daily. Happy to swap throughout.
- All food/lifestyle imagery is placeholder tiles — drop in real photos when ready.

_[tool: ready_for_verification]_

