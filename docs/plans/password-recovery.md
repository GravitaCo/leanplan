# Password recovery: "Set a new password" (12 Nov 2026)

**Status:** bug confirmed; fix proposed; boards drafted on the Design canvas for Benn or Sara.
Not built yet: no design change ships without their approval (CLAUDE.md).

## The bug, traced

1. "Forgot?" (`src/screens/AuthScreen.tsx`, mode `forgot`) calls
   `supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() })`, where `redirect()` is the app's
   own URL. "Send it again" does the same.
2. `src/data/supabase.ts` creates the client with defaults: `flowType: 'implicit'`,
   `detectSessionInUrl: true` (auth-js 2.108.2). Opening the email's link loads the app with
   `#access_token=…&type=recovery`. During the client's `_initialize()` it saves that session and, in a
   `setTimeout(0)`, emits `PASSWORD_RECOVERY` (GoTrueClient.js, around line 378).
3. `initAuth` in `src/store/store.ts` registers `onAuthStateChange((event, session) => …)`, which never
   reads `event` except for `SIGNED_OUT`: any event with a session goes to `live(session)`, which sets
   `signedIn`/`authed` and opens the app. `getSession()` then returns the same recovery session.
4. Nothing in `src/` calls `supabase.auth.updateUser({ password })`; the only `updateUser` is the email
   change (`store.ts`, around line 1535).

Result: the reset link signs the person in with no way to set a password. They are in this time, but the
next sign-in with a password still fails. A Google-only account can't add a password either. Supabase's
recovery should work for a Google sign-up too (it has an email in `auth.users`), so the same fix covers
it; not yet checked against the live project.

A timing detail: `initAuth` runs from a React effect after the first render, while auth-js fires
`PASSWORD_RECOVERY` once its URL check finishes (one network call to fetch the user). The listener is
usually first, but not guaranteed, and auth-js removes the hash from the URL before the event fires.

## The fix (to build once the boards are approved)

- `src/data/supabase.ts`: before `createClient`, read `window.location.hash` synchronously and export
  `urlAuth = { recovery: boolean, expired: boolean }` (`type=recovery`; `error_code=otp_expired` or
  `error=access_denied`). This removes the race above.
- `src/store/store.ts`: a `recovery: boolean` flag, set from `urlAuth.recovery` at the start of
  `initAuth` and from a `PASSWORD_RECOVERY` event; cleared on sign-out. A `setPassword(pw)` action calls
  `supabase.auth.updateUser({ password: pw })` with the existing `withTimeout` and offline checks, clears
  the flag on success and shows the "Password saved." toast; maps Supabase's `same_password` and
  `weak_password` codes to plain words. Not persisted: a reload mid-step drops back into the app,
  signed in, as today (no worse than now; Pending if Benn or Sara want it to persist).
- `src/App.tsx`: render the set-password step when `recovery` is set, before the owner check and the
  sign-in screen. The owner check still runs as usual once the step is done or skipped.
- `src/screens/AuthScreen.tsx`: a `SetPasswordScreen` in the same `auth2` layout (two fields, same rules
  and wording as sign-up: 8+ characters, matching), both `type="password"` `autocomplete="new-password"`,
  plus a visually hidden read-only email input with `autocomplete="username"` so password managers save
  the new password against the right account.
- Expired or used link: the URL doesn't say whether it was a sign-up or a reset link, so the notice goes
  on the Sign in screen in neutral words ("That link has expired or was already used. Sign in, or ask
  for a new one."), through the existing `authNotice` banner. If the person is already signed in, nothing
  shows. A recovery session that has timed out when they save goes the same way.
- Server errors (wording on the boards for approval): `same_password` "That's your current password.
  Choose a new one."; `weak_password` "Choose a longer or less common password."; offline "Saving a new
  password needs a connection. Try again when you're online."
- The foot links on the auth screens are 31 px tall; bring them to 44 px with padding (no visible change).
- Sync: the recovery session is a normal session for the same user, so sync and consent behave as
  after any sign-in. `security-data` to confirm, plus: no password ever stored or logged; Supabase's
  "Secure password change" setting (needs a recent sign-in; a recovery session counts) and the project's
  minimum length (must not exceed 8, or the app's rule must change to match).
- Tests: an e2e script on the same Supabase stand-in the other `scripts/e2e-*.cjs` use: open the app
  at `/#access_token=…&type=recovery`, see the step, try mismatch, short, offline, then save and assert
  one `PUT /auth/v1/user` with the password and the app opening; plus the expired-link URL.

## Note for the native lead (apps/native, branch claude/native-build)

The native app runs `src/store` unchanged, so it gets the `recovery` flag and `setPassword` for free,
but it needs its own pieces:

- The reset email's `redirectTo` must be the app's deep link (scheme in `app.json`), added to Supabase's
  allowed redirect URLs, and `resetPasswordForEmail` must pass it on native (a `platform.native.ts`
  value, not the web origin).
- React Native has no `window.location`: set `detectSessionInUrl: false`, handle the incoming URL with
  `expo-linking`, call `supabase.auth.setSession` from its tokens (or `exchangeCodeForSession` if native
  uses PKCE), and set the store's `recovery` flag when `type=recovery`. The synchronous hash read in
  `supabase.ts` must be skipped there.
- A native `SetPasswordScreen` in `lib/` from the same approved boards, with a parity check like
  `scripts/e2e-summary-parity.cjs`.
