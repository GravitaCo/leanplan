# N2 parity checklist: account, consent and legal

Native code: `apps/native/lib/account/` (logic: gate model, backup file, Google sign-in sheet, rules),
`lib/gate.tsx`, `app/auth-callback.tsx`, `src/data/backup.native.ts`, `src/data/platform.native.ts`.

**State (13 Nov, evening):** the screens below were built and passed every check on a stand-in kit
(commit 27ae9d6: parity 29 of 29, compliance, security-data, design APPROVED, ship-critic SHIP). The
lead doesn't merge stand-in screens, so they're off the branch head and being rebuilt on `lib/ui`
(N1); until then the gate shows the spike's plain messages in the right order. The ✓ marks below
are from that run, and are re-checked when the port lands. Web sources: `src/screens/AuthScreen.tsx`,
`src/screens/legal/`, `src/screens/onboarding/AgeStop.tsx`, `src/screens/profile/AccountData.tsx`,
Profile's account rows in `src/screens/ProfileScreen.tsx`, `src/App.tsx` (gate order).

Checks: **E2E** = `scripts/e2e-account-parity.cjs` (native code rendered for the web, in-memory
Supabase stand-in; "words" = the screen's text equals the web's for the same state);
**U** = `npm run test:account`; **S** = side-by-side screenshot, light and dark, reviewed by `design`;
**Phone** = only checkable on a device build. State on 13 Nov 2026.

## Gate (App.tsx order)

| State | Native | Check |
|---|---|---|
| Loading until auth is ready | ✓ | by reading |
| Owner choice before anything when another account's log is here | ✓ | E2E words, S |
| Sign-in when signed out | ✓ | E2E |
| Wizard's pending under-18 deletion (flag on), for this account only | ✓ | by reading (N11 builds the wizard) |
| 18+ stop before consent; sync off | ✓ | E2E |
| Redo wizard's own stop (flag on, redo open) | n/a: native shows the app's stop in every case until N11 (fails closed, compliance) | |
| Consent from Profile (someone who never agreed on it) | ✓ | E2E |
| Consent until answered; once more 2 weeks after Not now | ✓ | E2E |

## Sign-in (AuthScreen)

| Item | Native | Check |
|---|---|---|
| Sign in, Create account, Reset password, Check your email: words | ✓ | E2E words, S (light, dark) |
| Hero photo: height per mode, cover crop at 50% 30%, shade, white mark | ✓ | U, S |
| Checks: empty fields, passwords match, 8 characters, server error shown | ✓ | E2E |
| Sign-up and reset emails, "send it again" repeats the right one, rate-limit message | ✓ | E2E (rate limit by reading) |
| Email links come back to the app (tilo://auth-callback, PKCE) | ✓ | U (code parsing), Phone |
| Continue with Google (system sign-in sheet) | ✓ | Phone (worked in the spike) |
| Reset link signs in with no "set a new password" step | as web (web gap, separate task) | |
| Banner (signed out elsewhere, guest gone) | ✓ | by reading |
| Sign in with Apple | not built: proposal in docs/plans/native-sign-in-with-apple.md, needs a board | |

## Consent

| Item | Native | Check |
|---|---|---|
| Three unticked boxes, Continue needs all three, never pre-ticked | ✓ | E2E |
| Only consent syncs before the answer; consent before data after | ✓ | E2E |
| New account: Not now signs out | ✓ | E2E |
| Existing user: Not now keeps it on the phone, the deletion-date line, Sign out | ✓ | E2E words |
| Asked once more after 2 weeks, "We won't ask again" | ✓ | E2E |
| Links to the privacy policy and terms (website) | ✓ | E2E (by name), Phone |
| Regrant after a withdrawal: one unticked box | ✓ | E2E |

## Profile account rows (stand-in until N10)

| Item | Native | Check |
|---|---|---|
| Account: signed in as | ✓ | by reading |
| Health data row and status (On, Paused, Off, Not asked yet) | ✓ | E2E |
| Health data sheet: words per status, ticks, privacy sheet, support sheet | ✓ | S, by reading |
| Health answers and Redo setup rows (flag on) | waiting for N10/N11 (props are there) | |
| Withdraw: copy offered first, summary line, Remove, server clear | ✓ | E2E, S |
| "Downloaded" after the copy | differs: the label stays "Download a copy" (the share sheet can't say it was saved; compliance) | |
| Back up and restore: export and import, the confirm step, bad file | ✓ | E2E (web render: browser download and file chooser), Phone (share sheet, Files) |
| Backup with an under-18 age refused, the stop | ✓ | E2E |
| Privacy: date agreed, the three legal documents, withdraw, delete | ✓ | E2E |
| "Share new products I scan" toggle (flag off by default) | waiting for N6 | |
| AI features row (hidden on web too) | n/a | |
| Sign out sheet: keep, remove, the second tap, export first when phone-only | ✓ | by reading |
| Toasts ("Health data removed", "Backup loaded", "That isn't a valid backup file") | waiting for N1's toast | |

## Delete account

| Item | Native | Check |
|---|---|---|
| Delete your account view, what goes, copy first | ✓ | S |
| Needs a connection: button off offline, the note | ✓ | E2E |
| Typed DELETE; wrong words keep it off | ✓ | E2E, U |
| Old sign-in: password first; wrong password says nothing was deleted | ✓ | E2E |
| Google account: sign in with Google again in the system sheet (stays on the confirm) | ✓ | Phone |
| Deleted: device wiped, sign-in shown | ✓ | E2E |

## 18+ stop

| Item | Native | Check |
|---|---|---|
| App's stop: words, Childline, Beat (each nation), Emergency, tap to call | ✓ | E2E words, S, Phone (calls) |
| Launch with a stored age; backend unreachable; sync pull | ✓ | E2E |
| "I typed my age wrong" clears a stored age | ✓ | E2E (lands on Summary until N10's Profile) |
| Close and delete: the usual deletion, Cancel back to the stop, re-auth kept | ✓ | E2E |
| From Profile's age field | waiting for N10 | |
| Wizard's stop | waiting for N11 | |

## Every state still to check on a phone

Dynamic Type at the largest size, VoiceOver labels and order, small phone (iPhone SE), keyboard over
the sign-in fields and the delete confirm, the share sheet and Files, the document picker, Google's
sheet, tilo:// links from Mail, Android back gesture on each sheet.
