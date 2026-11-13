# Sign in with Apple on native: proposal and technical plan (draft)

Drafted 13 Nov 2026 by the N2 sub-engineer for the lead engineer. **Status: approved by Benn
(13 Nov: "I would like that option enabled"; no board, `design` reviews the screen), being built on
`native/n2-account`:** `modules/tilo-auth` (AuthenticationServices, our own Swift, not
expo-apple-authentication: dependency policy rule 1), `lib/account/oauth.ts` appleSignIn, the
button on the sign-in screen, Apple re-confirmation before deletion. Still to do as separate reviewed
increments: token revocation on deletion, and the privacy policy naming Apple. Labels:
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

## What Benn does (13 Nov 2026)

Three one-off steps in Apple's and Supabase's consoles. Labels are as they read when this was
written [I: Apple and Supabase rename menu items now and then; the destination is what matters].
No key or secret goes into the repo or a chat: secrets go only into Supabase's settings.

**1. The capability on the App ID** (EAS usually turns it on itself on the next build, because the
app now has the `com.apple.developer.applesignin` entitlement; do this only if the build log says the
capability is missing, or to be sure):
1. developer.apple.com, Account, Certificates, Identifiers & Profiles, Identifiers.
2. Open `fit.tilo.app`.
3. In Capabilities, tick **Sign In with Apple** (leave it as a primary App ID, no server endpoint).
4. Save, then Confirm. Existing provisioning profiles become invalid; EAS makes new ones on the next build.

**2. The Apple provider in Supabase** (native sign-in only, so no Services ID and no secret key):
1. Supabase dashboard, the Tilo project, Authentication, Sign In / Providers, **Apple**.
2. Turn it on.
3. In **Client IDs**, enter `fit.tilo.app` (the bundle ID). Nothing else is needed for the iPhone app.
   Leave the Secret Key (for OAuth) empty: that's only for signing in on a website.
4. Save.

**3. A key for revoking Apple sign-ins when an account is deleted** (needed by the revocation
increment, not by sign-in itself; Apple asks apps to revoke on deletion):
1. Certificates, Identifiers & Profiles, **Keys**, then +.
2. Name it "Tilo Sign in with Apple", tick **Sign in with Apple**, Configure, choose `fit.tilo.app` as
   the primary App ID, Save, Continue, Register.
3. Download the `.p8` file (Apple lets you download it once) and note its **Key ID**. The Team ID is
   `M8R77TCYF8`.
4. Give them to the lead as Supabase Edge Function secrets, not in a message: `APPLE_TEAM_ID`,
   `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (the .p8 file's contents), `APPLE_CLIENT_ID` = `fit.tilo.app`.
   Supabase dashboard, Edge Functions, Secrets (or the lead sets them with the Supabase CLI).

## How revocation will work (increment (a), not built yet)

No Apple token is stored anywhere. Deleting an Apple account already asks the person to sign in
with Apple again (the server's re-auth rule), and that sign-in returns a fresh one-time
`authorizationCode`. The app sends it with the delete request; `delete-account` makes a client secret
(an ES256 JWT signed with the key above), exchanges the code at Apple's `/auth/token` for a refresh
token, calls `/auth/revoke` with it, and then deletes the account as now. If Apple can't be reached,
the deletion still goes ahead and the failure is logged without personal data [G: to agree with
`security-data` and `compliance`]. A server change, deployed through `main`.

## Data (for `compliance`)

Only the email scope is requested, not the name: the profile's name is what the person types, so
nothing more is collected. Apple may give a private relay address (Hide My Email), which becomes the
account's email. Apple's stable user id is kept by Supabase as the identity. The privacy policy and
register name Apple as a sign-in provider (increment (b)).
