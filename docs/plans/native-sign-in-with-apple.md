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
- Android doesn't need it, and Apple's framework is iOS only.

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

1. `modules/tilo-auth` (built): our own Swift on AuthenticationServices (ASAuthorizationController
   and the system ASAuthorizationAppleIDButton), with a config plugin adding the
   `com.apple.developer.applesignin` entitlement (in app.json's plugins). The capability on the
   `fit.tilo.app` App ID: EAS can sync it [I]. Needs a new dev build.
2. Supabase: enable the Apple provider, with the bundle ID `fit.tilo.app` as an authorised client ID
   for native ID-token sign-in [I: Supabase dashboard; the lead or Benn changes project settings, never
   this stream]. No redirect URL is needed for the native flow.
3. Sign-in (`lib/account/oauth.ts` appleSignIn, built): a 32-byte random raw nonce (expo-crypto),
   its SHA-256 (hex) to Apple's sheet through `modules/tilo-auth` (`requestedScopes: [.email]` only),
   then `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce: raw })`
   (Supabase's documented pattern). The session reaches the store through `onAuthStateChange` like
   Google's. A closed sheet is a quiet cancel.
4. Re-auth before deletion (`lib/account/Delete.tsx`, built): an account with Apple among its
   providers (`app_metadata.providers`, not just the first) signs in with Apple again on **every**
   deletion, even with a fresh session, because that sign-in gives the one-time code revocation needs
   (security-data and compliance, 13 Nov). The account that comes back must be this phone's owner
   (`rules.ts reauthMatches`). The under-18 deletion needs the same when revocation lands.
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

## Accounts and linking (security-data, 13 Nov)

- Same email as an existing confirmed account: Supabase links Apple to it (one user id), so the
  owner check passes and the account has both providers.
- Hide My Email: a relay address is a different email, so Apple makes a separate account. The owner
  question then asks whose data is on the phone (safe), but the person has two accounts. Worth a line
  in the help copy before launch (new words: a board or Benn's or Sara's OK).
- A different Apple ID picked when re-confirming before a deletion is refused; it does quietly create
  an empty account with no consent and no sync, as a different Google account does. That account
  keeps an email nobody meant to sign up with: decide with increment (a) whether to remove it there
  (ship-critic, 13 Nov).
- An Apple-only account on Android or the web, signed in more than 5 minutes ago, is asked for a
  password it doesn't have before a deletion. Narrow (Android can't sign in with Apple); test it and
  give it a way through before Android ships.

## How revocation will work (increment (a), not built yet)

No Apple token is stored anywhere. Deleting an Apple account already asks the person to sign in
with Apple again (the server's re-auth rule), and that sign-in returns a fresh one-time
`authorizationCode`. The app sends it with the delete request; `delete-account` makes a client secret
(an ES256 JWT signed with the key above), exchanges the code at Apple's `/auth/token` for a refresh
token, calls `/auth/revoke` with it, and then deletes the account as now. If Apple can't be reached,
the deletion still goes ahead (erasure comes first), the failure is logged without personal data,
and the person is told they can remove Tilo in Settings, Apple ID, Sign in with Apple (agreed by
`security-data` and `compliance`, 13 Nov). Before revoking, the server checks that the `sub` in
Apple's `/auth/token` reply is this user's Apple identity. The code is never logged. A server change,
deployed through `main`; it must ship before any build goes to App Store review.

## Data (for `compliance`)

Only the email scope is requested, not the name: the profile's name is what the person types, so
nothing more is collected. Apple may give a private relay address (Hide My Email), which becomes the
account's email. Apple's stable user id is kept by Supabase as the identity. Increment (b) is done:
the privacy policy (gated on `native`, like the iPhone push text) and the register name Apple as an
independent controller for sign-in, with the relay and revocation notes. The policy's `updated` date
moves when `native` is turned on (the web's published text doesn't change until then). App Store
privacy label: Email Address and User ID, linked, App Functionality. Before launch: register the
sending domains with Apple's Private Email Relay (register).
