# Train (N7): native improvements

The brief's rule (native-build-brief §0.2, §4): a native improvement is a proposal first, and is
built only after Benn's or Sara's approval. This file records each one, what it does and its state.

## 1. Keep the screen awake during a guided session — approved, built

- **What:** while the guided player is open (warm-up, exercises, rest, holds), the phone doesn't dim
  or lock by itself. Released when the player closes (finish, leave, discard); the system ends it when
  the app goes to the background.
- **Why:** rest and hold timers are read at arm's length; the web can't stop the screen sleeping, so a
  phone often locks mid-rest.
- **How:** `expo-keep-awake` (Expo first-party, allowed by the dependency policy), `useKeepAwake` in
  `GuidedPlayer.tsx`. Nothing visible changes; no new permission.
- **Approval:** Benn, 13 Nov 2026, relayed by the lead engineer (session message, 11:14 UTC). Not seen
  first-hand by this stream.

## 2. Rest that keeps running in the background — approved, built

- **What:** if the app goes to the background during rest, one notification arrives when rest ends:
  title "Rest over", body the line the web already announces ("Set 2 of 3, Barbell squat."). It is
  cancelled, and removed from the tray if it already arrived, when the app comes back, when rest is
  skipped or ends, and when the player closes. Rest always ran on the device clock, so the in-app
  countdown is right on return either way, and no second cue plays if rest ended while away.
- **How:** N12's `lib/platform/restTimer.ts` (`scheduleRestEnd`, `cancelRestEnd`): one at a time,
  outside the reminder budget, quiet hours and the delivery log; never asks for permission (no
  permission, no alert); a tap opens Train. Called from `session.ts`.
- **Words:** `REST_ALERT` in `src/copy/train.ts`, approved by `mental-performance` (13 Nov).
- **Open (N12):** the alert always uses the default sound; `mental-performance` asked that it be a
  silent banner when the player's Sound is off.
- **Approval:** Benn, 13 Nov 2026, relayed by the lead engineer (as above).

## Not built (candidates only)

- **A haptic on iPhone at rest end and "Switch sides".** The web vibrates through `navigator.vibrate`,
  which only Android browsers support, so native does the same (Android only). An iPhone haptic would
  be new behaviour: it needs a board and approval (N1 owns haptics).
