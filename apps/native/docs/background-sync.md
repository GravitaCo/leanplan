# Background sync on native: proposal (parked)

Stream N3, 13 Nov 2026. Parked by the lead engineer: it is not parity, and the foundation comes
first. It needs `security-data`'s review after parity, and `compliance` for the wording question at
the end. Nothing here is built.

## What it would do

Changes saved on the phone would upload, and the account's newer rows would come down, while the
app isn't open. A day logged on the phone would then reach the web without the phone being opened
again. Nothing visible changes, so no board is needed (native-build-brief §4).

## How

- `expo-background-task` (SDK 58 docs: WorkManager on Android, BGTaskScheduler on iOS). Registrations
  persist across restarts. `minimumInterval` is a minimum, not a schedule: Android's floor is 15
  minutes, iOS gives no number and often runs tasks overnight. It is unavailable on the iOS
  simulator. Prebuild adds the `processing` background mode and the permitted task identifier.
- One task, defined at module scope, with a 60-minute interval. The handler runs only the store's own
  path: `initAuth` (with the same owner check, the 18+ stop and the consent rules), then `runSync`. It
  has a hard timeout well inside the system's budget, and `addExpirationListener` stops it cleanly.
- The task is registered only while someone is signed in with a current health yes. It is
  unregistered on sign-out, withdrawal, wipe and deletion. `consentLetsSync` stays the one rule, so
  nothing uploads before the yes.

## Questions for security-data

1. **The session in the background.** The session store's key is
   `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so a background run can read it once the phone has been
   unlocked after a restart. Is it acceptable to use the session there, including a token refresh
   while nobody is looking at the phone?
2. **A cold launch with no screen.** A headless launch runs `initAuth` with no UI, so it can't show
   the owner question or the 18+ stop. The task must stop at either one: `authed` stays false, which
   the store already ensures. Is that enough?
3. **Two copies writing at once.** If the app comes to the front during a run, iOS runs both in one
   JS runtime and the store's `syncing` guard puts them in order. On Android a headless run is a
   separate runtime over the same MMKV file, so two writers could race on `leanplan.v1`, and the
   last save would win locally. The options are push-only in the background (it writes nothing but
   the dirty flags) or a lock key. The proposal: push-only, with dirty flags cleared under a lock.

## Compliance, cost and effort

- **Compliance:** no new data, field or processor; Apple, Google and Expo are already the platform.
  App review needs the background mode justified. `compliance` to check whether the privacy
  policy's wording on when sync happens needs a line.
- **Cost:** battery only, and the OS decides when the task runs.
- **Effort:** about a day, plus a test on Benn's phone. That needs a development build, because
  `triggerTaskWorkerForTestingAsync` works only in debug builds.
