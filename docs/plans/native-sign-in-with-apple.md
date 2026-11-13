# Sign in with Apple on native: proposal and technical plan (draft)

Drafted 13 Nov 2026 by the N2 sub-engineer for the lead engineer. **Status: proposal. Nothing is
built.** It adds a button the web app doesn't have, so it needs a board on the Design canvas, the
`design` agent, and Benn's or Sara's approval first (CLAUDE.md; native-build-brief §0.2). Labels:
**[E]** checked in a source today, **[I]** to confirm, **[G]** judgement call.

## Why

- With "Continue with Google" in the iOS app, App Store guideline 4.8 asks for an equivalent
  privacy-focused login, which Sign in with Apple meets (security-data, 12 Nov; native-build-plan §4
  N2 "store blocker"). Without it the iOS build is likely to be rejected at review [I: the guideline
  allows other equivalents; Apple's own is the common route].
- Android doesn't need it, and `expo-apple-authentication` is iOS only [E: Expo SDK 58 docs].

## What the person sees (for the board)

- Sign-in and Create account (AuthScreen): a third button under "Continue with Google", drawn by
  Apple's own `AppleAuthenticationButton` (Apple's rules: its own colours, `BLACK` in light mode and
  `WHITE` in dark, height 54 and corner radius 27 to sit with the other two) [G]. Label "Continue with
  Apple" (`buttonType` CONTINUE) to match "Continue with Google".
- iOS only, and only where `isAvailableAsync()` is true. The web app is unchanged: this is a native
  addition, so the board should show it as such.
- Account deletion's re-confirm step: for an account that signed in with Apple, "Sign in with Apple
  again", as Google has "Sign in with Google again".
- Board question for Benn or Sara: order of the two buttons (Apple's guidance is that it is at least
  as prominent as other third-party buttons [I]).

## Technical plan

1. `npx expo install expo-apple-authentication`; `ios.usesAppleSignIn: true` in app.json (adds the
   `com.apple.developer.applesignin` entitlement; needs the capability on the `fit.tilo.app` App ID,
   which EAS can sync [I]). A new dev build.
2. Supabase: enable the Apple provider, with the bundle ID `fit.tilo.app` as an authorised client ID
   for native ID-token sign-in [I: Supabase dashboard; the lead or Benn changes project settings, never
   this stream]. No redirect URL is needed for the native flow.
3. Sign-in (`lib/account/oauth.ts`, beside `googleSignIn`): make a random raw nonce, pass its SHA-256
   to `AppleAuthentication.signInAsync({ requestedScopes: [EMAIL, FULL_NAME], nonce })`, then
   `supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: raw })`
   [I: Supabase's documented pattern; check the current docs when building]. The session reaches the
   store through `onAuthStateChange` like Google's. `ERR_REQUEST_CANCELED` is a quiet cancel.
4. Re-auth before deletion (`lib/account/Delete.tsx`): the same call; then the same check as Google's
   that the session's user is the account being deleted. `authProvider` will read `apple`, so the
   confirm step offers Apple, not a password.
5. Account deletion: Apple requires apps with Sign in with Apple to revoke the user's Apple token when
   the account is deleted [I: Apple's account-deletion guidance]. That means the `delete-account`
   function (or Supabase) calling Apple's `/auth/revoke` with the app's client secret: a server change
   that goes through `security-data` and `compliance`.
6. Privacy: "Hide my email" gives a relay address; the privacy policy and register name Apple as a
   sign-in provider, as they do Google [I: check `src/core/legal/privacy.ts`]. `compliance` reviews.
7. Tests: the parity script can't drive Apple's sheet; a unit check of the nonce and a device test on
   Benn's iPhone.

## Effort

About half a day of code once the board is approved and the Supabase provider is set up; the server
revocation (5) and the policy update (6) are separate reviewed changes.
