# Native app: dependency policy and audit

Policy set by Benn, 13 Nov 2026. Audit by the lead engineer, same day. Applies to `apps/native`
(the iPhone and Android app). The web app is unchanged by this document.

## Policy

1. Apple's own frameworks through our own Swift modules wherever it's practical.
2. Expo's own first-party modules otherwise.
3. Any outside library only with a written reason (what it does, why Apple or Expo can't, cost,
   maintenance risk, how to replace it), approved by the lead engineer.
4. No paid libraries without Benn's approval.
5. Every current outside library audited against this, with what to replace with our own code.

**How "practical" is read here (for Benn to confirm):** an own Swift module is iPhone only; Android
then needs its own Kotlin twin, where Expo's modules already cover both. So rule 1 is applied where it
removes an outside library, is needed to match the web, or is a small module; Expo's first-party
modules stay where they already wrap Apple's frameworks well and work on both platforms.

## Audit

No library in the app is paid (rule 4 holds). Licences are MIT or OFL (the font).

### Replace with our own Swift modules (rule 1)

| Library | What it does for us | Replacement | Owner |
|---|---|---|---|
| ~~`@kingstinct/react-native-healthkit`~~ (+ ~~`react-native-nitro-modules`~~) **replaced 13 Nov** | Asks for HealthKit access; reads sleep, steps, walking workouts | `modules/tilo-health` on HealthKit: authorisation, a sleep category query, step statistics, workout query; later background delivery (phase 2). Our use is small and fully known. Its own config plugin (`modules/tilo-health/app.plugin.js`) adds the HealthKit entitlement and the read-only usage string | Lead (N0) |
| ~~`react-native-mmkv`~~ **replaced 13 Nov** | Synchronous storage under the web's `localStorage` keys; the encrypted session store; N3's reminder log | `modules/tilo-store`: synchronous get, set, remove and keys over atomic file writes in Application Support with iOS Data Protection; the Supabase session in the Keychain (Security framework, this device only). Same `Storage` interface, so shared code doesn't change. Test installs re-sign-in once (their data is synced) | Lead (N0) |
| ~~`@react-native-community/netinfo`~~ **replaced 13 Nov** | Online and offline for `navigator.onLine` | `modules/tilo-network` on Apple's `NWPathMonitor` (satisfied or not, as a browser means online). Also guarantees no reachability request to any third party | Lead (N0) |
| `expo-camera` (on N6's branch) | Camera, barcodes | `modules/tilo-camera` on AVFoundation and Vision (Benn, 13 Nov) | N6 |
| `expo-image-picker`, `expo-image-manipulator` (N6's branch) | Choose a photo; resize label photos | Fold into `tilo-camera`: PHPickerViewController for the library, ImageIO/Core Graphics for the 1600/1024 px and 1.5 MB rules | N6 |
| `@react-native-community/datetimepicker` (proposed, not added) | The web's date and time inputs | `modules/tilo-pickers` on UIDatePicker in the wheel style iOS Safari shows for those inputs | N1 |
| `@expo-google-fonts/geist` | Ships the Geist font files | Bundle the OFL font files from `apps/native/assets/fonts` directly; no package | N1 |

With HealthKit and MMKV gone, `react-native-nitro-modules` is gone too.

### Keep, with the written reason (rule 3, approved by the lead)

| Library | What it does | Why not Apple or Expo | Cost and maintenance risk | How to replace if needed |
|---|---|---|---|---|
| `react`, `react-native` | The framework the app is built in | It is the platform Expo runs on | Free; maintained by Meta with Expo | Not applicable |
| `@supabase/supabase-js`, `zustand`, `immer` | Auth and data client; the store; immutable updates | Shared unchanged with the web app; replacing them on native alone would fork the shared store and sync code | Free; widely used, actively maintained; versions pinned with the web's majors | On both apps together, never native alone |
| `react-native-svg` | Draws the rings, week bars, sparklines and every icon, matching the web's SVG | No Expo or Apple equivalent reachable from React Native without rewriting every chart and icon as native views | Free; one of the most used React Native libraries, kept compatible by Expo's SDK | Own Swift views on Core Graphics per chart: high cost, only if it ever blocks us |
| `react-native-reanimated` (+ `react-native-worklets`, which Expo's own core already depends on) | Motion on the UI thread, Reduce Motion (the KcalBar fill, Mind's pacer) | Expo's recommended animation library; React Native's built-in `Animated` can't drive widths natively | Free; Software Mansion, version pinned by Expo's SDK | React Native's built-in `Animated` with transforms (`scaleX`) and the native driver |
| `react-native-screens`, `react-native-safe-area-context` | Native screens and safe areas | Required by Expo Router, Expo's own navigation | Free; pinned by Expo's SDK | Only by leaving Expo Router |
| `react-native-web`, `react-dom` | Render the native code in a browser for the side-by-side parity checks | Test-only; not in the iPhone app. Moved to devDependencies 13 Nov | Free | Not needed |
| `react-native-url-polyfill` | A standards-correct `URL` and `URLSearchParams` (WHATWG URL) | Checked 13 Nov: React Native 0.88's own `URL` is regex-based. `hostname` and `pathname` only match http(s) (so `tilo://auth-callback` parses wrong), only `search` can be set, and `hash` stops at the first `/`. supabase-js and the Google sign-in return both rely on correct parsing | Free, MIT; small and stable, wraps the reference `whatwg-url` | Drop it when React Native ships a spec URL (Hermes is adding one); check with the sign-in return and a Supabase call on a device |

### Expo first-party (rule 2): fine as they are

`expo`, `expo-router`, `expo-constants`, `expo-crypto`, `expo-dev-client`, `expo-font`, `expo-haptics`,
`expo-linking`, `expo-status-bar`, `expo-system-ui`, `expo-web-browser`, `expo-build-properties`,
`babel-preset-expo`; on stream branches `expo-file-system`, `expo-sharing`, `expo-document-picker` (N2),
`expo-video` (N7), `expo-notifications`, `expo-application` (N12), and the proposed `expo-audio` (N7's
chime) and `expo-clipboard` (N10). `expo-secure-store` removed 13 Nov: `tilo-store` holds the session in the Keychain itself.

## How new dependencies are added from now on

A stream that wants anything outside Apple's frameworks and Expo's first-party modules writes the five
answers (what, why not Apple or Expo, cost, maintenance risk, how to replace) into this file under a
new heading and asks the lead; nothing is installed before the lead approves it. Anything paid goes to
Benn.

## Android

Each own module above needs a Kotlin twin in the Android phase (Health Connect, CameraX with ML Kit or
a platform decoder, ConnectivityManager, files and the Keystore, the platform date picker). That work
is listed in the Android phase, not done now.

## Decisions

- **Android (Benn, 13 Nov):** the costs are accepted for when the Android project starts; the approach
  (own Kotlin twins, or Expo's first-party modules on Android behind the same interfaces) is decided
  then, with both options costed by `cfo`.
