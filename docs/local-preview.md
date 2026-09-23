# Previewing a change before it goes live

Tali has no staging site for now. Anything pushed to `main` goes straight to
https://app.tali.fit/, so check working branches on your own Mac first.

## One-time setup

1. Install Node.js 20 or newer from https://nodejs.org (the LTS installer).
2. Clone the repo: `git clone https://github.com/GravitaCo/leanplan.git`, then `cd leanplan`.

## Each time

1. Get the branch you want to check:
   `git fetch origin && git checkout <branch-name> && git pull`
2. Install packages (only needed when `package.json` changed, but it's harmless to repeat):
   `npm install`
3. Run it in one of two ways:
   - `npm run dev` gives a live-reloading dev server at http://localhost:5173/. This is the
     quickest way to click around.
   - `npm run preview:local` builds exactly what would ship and serves it at
     http://localhost:4173/. Use this for the final check before approving a merge.
4. To try it on your phone, use `npm run preview:local` and open the **Network** address it
   prints (for example `http://192.168.1.20:4173/`). Your phone must be on the same Wi-Fi as
   your Mac.

Press `Ctrl+C` in the terminal to stop the server.

## Things to know

- **Your real data is safe in guest mode.** localhost is a different site from app.tali.fit,
  so it starts with empty local data. Use "Continue without an account" to test.
- **Signing in uses the live database.** There is only one Supabase project, so signing in on a
  preview reads and writes your real account. Do that only for changes you trust.
- **Offline mode isn't testable over Wi-Fi.** The service worker only runs on https or
  localhost, so on the phone's Wi-Fi address the app works but won't install or cache for
  offline use. Offline behaviour can be tested on the Mac at localhost:4173.
- **Google sign-in and password-reset links may land on app.tali.fit instead of localhost.**
  Supabase only returns to addresses on its allowed redirect list and otherwise falls back to
  the live site. Add `http://localhost:4173` and `http://localhost:5173` to the list under
  Supabase > Authentication > URL Configuration if you need them. Email sign-in and guest mode
  aren't affected.
