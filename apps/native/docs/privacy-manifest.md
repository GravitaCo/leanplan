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

## What ships

`app.json` declares Tilo's own uses. Then, at `pod install`, React Native merges every linked pod's
`PrivacyInfo.xcprivacy` into the app's (the Podfile's `:privacy_file_aggregation_enabled`, on by
default; ship-critic, 13 Nov 2026). So the manifest in the app's bundle is the union of the two,
and that union is what Apple reads. `npm run test:extension` rebuilds it from Expo's autolinking
(release pods only) and React Native's manifests, and fails if it differs from this table.

| Category | Reasons that ship | Where they come from | Why they're true for Tilo |
|---|---|---|---|
| UserDefaults | CA92.1, 1C8F.1 | CA92.1: React Native, expo-constants, expo-notifications, expo-system-ui (and app.json). 1C8F.1: app.json, for ours: `modules/tilo-notify` and the notification extension | App-only defaults; the App Group `group.fit.tilo.app` shared only by the app and its extension |
| FileTimestamp | C617.1, 0A2A.1, 3B52.1 | C617.1: React Native, RCT-Folly, boost, glog, expo-application (and app.json). 0A2A.1 and 3B52.1: expo-file-system's own manifest, merged | C617.1: metadata of files in the app's container. 0A2A.1 is expo-file-system's (an SDK wrapping file APIs, used only when the app calls it); 3B52.1 covers files the person picks: true once N2's backup import uses a picker |
| SystemBootTime | 35F9.1 | React Native timing, boost (and app.json) | Elapsed time between events in the app, timers |
| DiskSpace | E174.1, 85F4.1 | expo-file-system's own manifest, merged | expo-file-system's own reasons: E174.1 (checking space before writing files) and 85F4.1 (showing disk space). Tilo calls expo-file-system only for N2's backup file (`lib/account/backupFile.ts` on `native/n2-account`); whether those calls check free space is N2's to confirm, and Tilo never shows disk space |

The extension has its own manifest (`plugins/withNotifyExtension.js`): UserDefaults 1C8F.1 only, no
tracking, nothing collected; pods aren't merged into it. Both manifests: no tracking, no tracking
domains.

### The judgement in this

Keeping aggregation on is deliberate: expo-file-system is linked (a dependency of `expo`) and N2
calls it, so its reasons describe code that runs in Tilo. Turning aggregation off would leave app.json
as the only source, but Apple would then likely flag DiskSpace (ITMS-91053), since the code stays in
the binary. Some merged reasons don't describe something Tilo does today: 85F4.1 (showing disk space),
E174.1 unless N2's backup writes check free space, and 3B52.1 until N2's import uses a document
picker. They're expo-file-system's description
of its own capabilities, merged by React Native's standard tooling, and are recorded here for
`compliance`. If they must go, the way is a small config plugin that removes them from the merged
file after `pod install`, not hand-editing.

Before store submission: confirm the merged `ios/Tilo/PrivacyInfo.xcprivacy` from a real `pod install`
or the EAS build log matches this table (precompiled Expo modules, `EXPO_USE_PRECOMPILED_MODULES`,
haven't been checked against the aggregator).

### Our own code

Our modules (`tilo-store`, `tilo-health`, `tilo-network`, `tilo-ai`, `tilo-notify`, and `tilo-camera`
on N6's branch) call no required-reason API besides the app-group UserDefaults: files are written and
removed, never inspected for dates or sizes; no disk-space or boot-time calls. The test scans our
Swift, Objective-C and C sources in `modules/` and `targets/`, against the app's manifest and, for
the extension, against the extension's own.

## Collected data (compliance, 13 Nov 2026; fill in before App Store submission)

`NSPrivacyCollectedDataTypes` is still Expo's empty default in the app's manifest. Before submission
it lists what leaves the phone and is kept, each linked to the person, not tracking, purpose App
Functionality only, and it must say the same as the App Store Connect privacy label and the privacy
policy (record the final list in `docs/compliance/README.md` with the store-launch items):

- Always: EmailAddress, Name, UserID, DeviceID (the APNs token), Health, Fitness, OtherUserContent,
  ProductInteraction (synced review and reminder stamps), OtherDataTypes (age, sex, height, goal,
  pace, time zone, consent records).
- Only once each ships on iPhone, on the same flags as the privacy policy: PhotosorVideos (label
  reading), SensitiveInfo (onboarding's pregnancy question), HealthKit data under Health and Fitness.
- To decide with the lead: SearchHistory, not linked (barcodes go to Open Food Facts).
- Not collected (stays on the phone): the Unload notes, the low-mood marker, the reminder delivery
  log, the extension's list, `tali-push` and the other local stores.
- Leave out: Diagnostics (no crash reporting or analytics; confirm no EAS Update or Expo crash
  reporting ships), Location, Contacts, Financial Info, Browsing History, Audio, Purchases.
