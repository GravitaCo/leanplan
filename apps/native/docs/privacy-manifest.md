# iOS privacy manifests (required-reason APIs)

Written 13 Nov 2026 (N12, store-launch item). Apple rejects an upload whose code uses a
"required reason" API without declaring why. Two manifests ship: the app's, from
`ios.privacyManifests` in `app.json` (Expo writes `ios/Tilo/PrivacyInfo.xcprivacy`), and the
notification extension's, written by `plugins/withNotifyExtension.js`
(`ios/TiloNotifyExtension/PrivacyInfo.xcprivacy`, in that target's bundle). `npm run
test:extension` checks both, checks every reason is one of Apple's for its category, and fails if
our own Swift starts calling a required-reason API whose category isn't declared.

Apple's reasons: developer.apple.com, Bundle Resources, NSPrivacyAccessedAPITypeReasons (read
13 Nov 2026). Apple updates the list; re-check before each store submission.

## What's declared, and why

| Category | Reason | Who uses it | Why this reason fits |
|---|---|---|---|
| UserDefaults | CA92.1 | React Native, expo-constants, expo-notifications, expo-system-ui (each declares CA92.1 in its own manifest) | Read and write information only the app can access |
| UserDefaults | 1C8F.1 | Ours: `modules/tilo-notify` (app) and the notification extension | The App Group `group.fit.tilo.app` shared only by the app and its extension |
| FileTimestamp | C617.1 | React Native, RCT-Folly, boost, glog, expo-application (each declares C617.1) | Metadata of files inside the app's own container |
| SystemBootTime | 35F9.1 | React Native timing, boost (each declares 35F9.1) | Elapsed time between events in the app, timers |

The extension declares UserDefaults 1C8F.1 only. Both manifests: no tracking, no tracking domains.

Expo's guidance: Apple doesn't reliably read the manifests inside statically linked pods (Expo SDK
packages and React Native), so the app's manifest repeats their reasons.

## What's deliberately not declared

- **expo-file-system** (installed as a dependency of `expo`) declares DiskSpace (E174.1, 85F4.1) and
  FileTimestamp (0A2A.1, 3B52.1). Nothing in the app calls it (no import in `app`, `lib`, `modules`
  or the shared `src`), and those reasons describe things Tilo doesn't do (showing disk space,
  changing behaviour on low space, files the person picked); 0A2A.1 is reserved for SDKs. If App
  Store Connect's email after upload names DiskSpace, the choice is to declare a reason that is
  true at that point or to keep expo-file-system out of the build: a decision for the lead and
  `compliance`, not a code default.
- **Our other modules** (`tilo-store`, `tilo-health`, `tilo-network`, `tilo-ai`, and `tilo-camera` on
  N6's branch) call no required-reason API: files are written and removed, never inspected for
  dates or sizes; no disk-space or boot-time calls.

## Open for compliance

`NSPrivacyCollectedDataTypes` is empty in the app's manifest (Expo's default). Apple builds the
app's privacy report from it, alongside the App Store Connect privacy label; what to list (Health &
Fitness, email, user id, device id for reminders) is `compliance`'s call before submission.
