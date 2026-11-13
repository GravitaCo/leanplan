# Profile parity checklist (N10)

Web source: `src/screens/ProfileScreen.tsx`, `src/screens/profile/*`. Words: `src/copy/profile.ts`,
`pillars.ts`, `notify.ts`, `onboarding.ts` (Health check answers), `onboardingApp.ts` (Support).
Helpers: `src/screens/profile/profileModel.ts`, `profileTargets.ts`, `healthAnswerRows.ts`,
`supportRows.ts`, `src/screens/review/reviewModel.ts`.

Automated: `scripts/e2e-profile-parity.cjs` (header says how to run it). "Checked" below means that
script compares web and native for it; "Manual" means a phone check (the web render isn't the phone).

## Every state

| State | How it's covered |
|---|---|
| Light and dark | Checked: screenshots of both apps, closed and with Body and goal, Health data and the answers open |
| Gentle on and off | Checked: rows, suggestion, Display switch, "Include weight in reviews" disabled when gentle |
| Wellbeing Yes, Sometimes, pregnant Sometimes | Checked: kcal hidden or Food's range, no target to edit, the answer rows, where the range shows |
| Flags: WELLBEING_ENABLED, ONBOARDING_ENABLED (both values), SUPP_NAMES_ENABLED, SHARED_PRODUCTS_ENABLED | Checked for onboarding on and off; the others read the same `@/data` flags as the web (default values compared) |
| Health data on, paused, withdrawn | Checked: row value, Privacy text, Health data sheet words and buttons, Sign out sheet |
| Offline | Manual: nothing in Profile waits on the network; email change and delete need a connection as on the web |
| Small and large phones, Dynamic Type largest | Manual, after the move to N1's primitives |

## Rows

Identity card (name or "Add your name", goal · kcal a day, email or not syncing) · Body and goal
(value, Sex, Age, Height, Weight, Activity level, Save metrics, Main goal chips, suggested targets
with protein-everyday, floored and held-at-maintenance notes, "Use these targets") · Daily targets
(target or range, five fields, Save targets with floor and cap) · Training (days, opens Plan) ·
What do you want Tilo for? (three switches, last one locked, B1.8/B1.14 feet, B1.16 links) · How often
Tilo asks · Supplements (list, edit, delete, add) · Diet · Hand portions sheet · Accuracy · Display ·
Review day sheet · Include weight in reviews · Notifications (back-off notices, Check-in, Wind-down,
Plan check-in, Supplement reminders, names row, Weekly review reminder, Your times, feet) · Account ·
Health data (sheet: words by status, ticks, privacy notice, Health check answers, Redo setup or Set
up my plan, Support and helplines, agree, stop) · AI features (hidden, as on the web) · Back up and
restore (words by consent and sync, Export, Import with its confirm, earlier version) · Delete
account · Send feedback (every step) · About Tilo · Privacy (words, share products, legal links,
withdraw or turn back on, delete) · Sign out sheet (phone-only, unsynced, second tap) · wellness foot.

All checked by the script except: Feedback's steps and Hand portions (manual), Back up and restore
and Delete account (N2's flows; rows checked).

## Carried over from the web's e2e

- e2e-onboarding: ob7-1, ob7-1b, ob7-2 (and its two variants), Change conditions and food and
  weight, ob10 where your food range shows, ob10 Yes's range row, ob10 support list (whole UK,
  Scotland, Northern Ireland), the "fix" cases for Yes, Sometimes and pregnant Sometimes, health
  data off. ob7-3 and ob7-4 (the re-ask on Today) are N4's; the sheet is exported for it.
- e2e-wellbeing: wp9 (pillars, asks, at-risk links), wp17 settings side (times shown and saved).

## Known differences (agreed with the lead)

- Push is N12: until then every reminder switch shows the web's no-push state ("Not supported in this
  browser", disabled) and never changes the account. The words stay the web's for now.
- Behind N2 stubs: consent, withdraw, delete, export, import, the privacy notice.
- Waiting on N1: text fields, the select and time pickers (iOS-style, as Safari presents the web's),
  option rows, ticks, helpline rows, plain rows, the sign-out button, text presets.
