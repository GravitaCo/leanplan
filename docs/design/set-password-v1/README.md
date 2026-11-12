# Set a new password v1 boards (DRAFT, not approved)

**Status: draft for Benn's or Sara's review, 12 Nov 2026, revised after a design review the same day. Not approved: don't build from these.** Per CLAUDE.md, no design ships without Benn's or Sara's approval; when one of them approves or changes these boards, this folder is updated to match.

- Why: the reset link from "Forgot?" signs the person straight in with a recovery session. The app never handles Supabase's `PASSWORD_RECOVERY` event or calls `updateUser({ password })`, so nobody can set a new password, and an account that only uses Google can't add one. This adds one step.
- Built on the existing sign-in frame (`src/screens/AuthScreen.tsx`, the `auth2` styles in `src/styles/theme.css`), so it adds no new pattern.
- Live boards, with notes and both modes side by side: the claude.ai Design canvas, page "Set a new password (draft for Benn/Sara)": https://claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb (only people the canvas is shared with can open it)
- These PNGs are 390 px exports of the same boards, light and dark, drawn at an iPhone's 390 × 844 with its top and bottom safe areas. Board 5 is taller (980) because that screen scrolls. Dashed tags on a board mark items still pending (mauve) or notes (grey).

## Open decisions for Benn or Sara

1. The foot link on board 1. Both exits leave the person without a password they know, and there's no other place to set one. Recommended: "Not now", which keeps them signed in, since a reload during this step already does that. The alternative is "Cancel and sign out".
2. Board 4: whether to show the toast "Password saved" at all.
3. Board 5 is a new state: a link that has expired or was already used opens Sign in with the notice "That link has expired or was already used. Sign in, or ask for a new one." It's Sign in, not Reset, because an expired link's URL doesn't say whether it was a sign-up or a reset link. Someone already signed in who opens a used link sees nothing: they're already in.
4. Board 3 wording: "Needs a connection. Try again when you're online." (the brief said "You're offline. Connect to save your new password."; this one follows the app's other offline lines and fits on one line).
5. Server error wording (no boards; same red line under the fields as boards 2 and 3):
   - Same as the current password: "That's your current password. Choose a new one."
   - Weak password: "Choose a longer or less common password."
   - Session timed out, or the server needs a recent sign-in: back to Sign in with the board 5 notice.
   - Too short: reuses "Password must be at least 8 characters."
   - While saving: the button reads "Please wait…", as on sign-in.

## Notes for the build

- Board 1 has no visible email field; the email is in the subtitle. Add a read-only email input with `autocomplete="username"`, visually hidden (not `display: none`), so password managers save the new password against the right account. Both fields are `type="password"` with `autocomplete="new-password"`.
- The foot link is drawn 44 px tall (padding only, no visible change). The live app's foot links are about 31 px today, which is an existing issue to fix as well.
- After saving, the person goes wherever a sign-in goes: the consent screen or the "another log" screen are possible, so not always Today.
- On iPhone the email link opens in Safari, not the installed app, so this whole step happens there.
- Board 4 is the real Today screen captured from the app, with the app's own toast. It's scrolled so the toast covers no text, and the tab bar is drawn opaque to stand in for its blur (headless screenshots don't render the blur).

## Boards

**1 Set a new password: two fields, "Save password", "Not now"** ([dark](spw-1-set-dark.png))

<img src="spw-1-set-light.png" width="300" alt="Set a new password: the sign-in photo and mark, the title Set a new password, the line For sam@example.com. You'll use it next time you sign in., New password and Confirm password fields, a black Save password button with an arrow, and a Not now link">

**2 The passwords don't match** ([dark](spw-2-mismatch-dark.png))

<img src="spw-2-mismatch-light.png" width="300" alt="The same screen with both password fields filled and the red line Passwords do not match. under the fields">

**3 Offline: the button stays enabled** ([dark](spw-3-offline-dark.png))

<img src="spw-3-offline-light.png" width="300" alt="The same screen with both password fields filled and the red line Needs a connection. Try again when you're online.">

**4 Saved: the toast "Password saved", then wherever a sign-in lands** ([dark](spw-4-saved-dark.png))

<img src="spw-4-saved-light.png" width="300" alt="The Today Summary screen scrolled to the Food, Move, Weight and This week cards, with the toast Password saved just above the tab bar">

**5 The link has expired or was already used: Sign in with a notice** ([dark](spw-5-expired-dark.png))

<img src="spw-5-expired-light.png" width="300" alt="The Welcome back sign-in screen with a notice at the top: That link has expired or was already used. Sign in, or ask for a new one. Below it the email and password fields, Sign in, Continue with Google and Create an account">
