# Previewing a change before it goes live

Tali has no staging site for now. Anything pushed to `main` goes straight to
https://app.tali.fit/, so check working branches on your own Mac first.

## First time (once)

Open Terminal and paste:

```
git clone https://github.com/GravitaCo/leanplan.git ~/leanplan
```

## Each time

```
cd ~/leanplan && bash scripts/preview.sh <branch-name>
```

Leave out `<branch-name>` to preview the branch you're already on. The script installs Node.js
if it's missing (via Homebrew, or it opens nodejs.org), switches to the branch, installs
packages, builds exactly what would ship, and opens http://localhost:4173/ in your browser.
It won't switch branches if the folder has uncommitted changes.

To try it on your phone, open the **Network** address the script prints (for example
`http://192.168.1.20:4173/`) while your phone is on the same Wi-Fi as your Mac. Press
`Ctrl+C` in Terminal to stop.

For live-reloading while editing code, `npm run dev` serves http://localhost:5173/ instead.

## Things to know

- **Testing needs an account, and it's the live database.** There is no guest mode, and there
  is only one Supabase project, so signing in on a preview reads and writes that account's real
  data. Use a separate test account (a second email address) for anything you don't trust yet.
  localhost is a different site from app.tali.fit, so the preview starts with empty local data.
- **Offline mode isn't testable over Wi-Fi.** The service worker only runs on https or
  localhost, so on the phone's Wi-Fi address the app works but won't install or cache for
  offline use. Offline behaviour can be tested on the Mac at localhost:4173.
- **Google sign-in and password-reset links may land on app.tali.fit instead of localhost.**
  Supabase only returns to addresses on its allowed redirect list and otherwise falls back to
  the live site. Add `http://localhost:4173` and `http://localhost:5173` to the list under
  Supabase > Authentication > URL Configuration if you need them. Email sign-in isn't affected.
