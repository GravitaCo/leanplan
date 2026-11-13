# Tilo native (iPhone and Android)

Expo (SDK 58) and React Native. Plans: `docs/plans/native-app-plan.md` (framework, phases),
`native-build-brief.md` (streams and approvals), `native-build-plan.md` (tasks, parity, spike
status). Project rules are the repo's `CLAUDE.md`; Expo-specific notes are in `AGENTS.md` here.

## How the shared code is wired

- The app runs the web app's `src/core`, `src/data` and `src/store` **unchanged**. Never copy domain
  logic into `apps/native`; change it once in `src/` with the web's tests passing.
- `metro.config.js` resolves `@/…` to the repo's `src/`, and every package imported from shared
  code to this app's `node_modules` (the web root has React 18). This folder is deliberately not an
  npm workspace: the web's lockfile and versions stay as they are.
- `lib/platform/install.ts` runs first (from `index.ts`) and gives the shared code what it expects
  from a browser: `localStorage` on MMKV (`lib/platform/storage.ts`; the Supabase session in an
  encrypted store with a Keychain key), `navigator.onLine` from NetInfo, `crypto.getRandomValues`.
- Where shared code must behave differently on a phone, it imports from `src/data/platform.ts`; the
  native twin `platform.native.ts` is picked by Metro and never seen by the web build.
- Reminders (N12): `src/data/push.native.ts` hands the store the phone's push registration (APNs device
  token in `push_subscriptions`, `lib/platform/push.ts`); `lib/platform/notifications.ts` handles
  arrivals, taps and the delivery log; the store asks for permission through `pushPermission()` and
  `askPushPermission()` (same names on the web). iPhone only for now. A Notification Service Extension
  (`targets/notify-extension`, added by `plugins/withNotifyExtension.js`, read through
  `modules/tilo-notify`) records each Mind reminder as it arrives, for the back-off.
- `import.meta.env.VITE_*` flags in shared code are filled at build time from `EXPO_PUBLIC_*`
  (`babel.config.js`), with the web's defaults when unset, so a flag is never on in one app only.
- Studio tokens: `lib/tokens.generated.ts` is generated from `src/styles/theme.css`
  (`npm run tokens`; `npm run check:tokens` in CI). Don't hand-edit colours.

## Commands (from apps/native)

```
npm install
npm run typecheck        # also typechecks every shared src/ file the app imports
npm run check:tokens
npm run bundle:ios       # full Metro bundle for iOS, the quickest "does it resolve" check
npx expo start --dev-client   # with a development build on a phone or simulator
```

Builds run on Expo's cloud (EAS) with `EXPO_TOKEN` set: `npx eas-cli@latest build --profile
development --platform ios` (a dev client) or `--profile spike` (an internal test build). A phone
must be registered once with `npx eas-cli@latest device:create`.

## Parity check

`scripts/e2e-summary-parity.cjs` opens the same seeded account in the web app and in this app's
code rendered for the web, and compares the Summary's figures and words in light and dark (see the
script's header for the two servers it needs). Every stream adds its screens' checks the same way.

## Engineering standards (Benn, 13 Nov 2026: foundations first, built to scale)

- **The design system comes first.** Every visual piece (sheets, rows, toggles, segmented controls,
  buttons, chips, banners, toasts, icons, charts, pickers) lives once in `lib/ui`, owned by the N1
  stream. Screens only compose those pieces; no stream builds its own.
- **Tokens only.** Colours, sizes, radii and type come from `lib/tokens.generated.ts` (generated from
  the web's `theme.css`) through `lib/theme.ts`. No hardcoded values in screens.
- **One copy of the logic.** Domain rules live in `src/core`, data in `src/data`, app behaviour in
  `src/store`, shared with the web. Native code never copies them; a change is made once in `src/`
  with the web's tests passing. Where a browser feature differs, add a `platform.ts` /
  `platform.native.ts` adapter behind the same names.
- **Typed and tested.** TypeScript strict, no `any`, typed props. Logic outside JSX (view models,
  player engines, adapters) has tests. Every screen has a parity checklist (`PARITY.md`) and a
  native-against-web check with seeded data.
- **Accessible.** Labels equal the web's aria labels, 44 pt targets, Dynamic Type at the largest size,
  light and dark, Reduce Motion.
- **Reviewed.** Each stream passes its specialist agents, `design` against the web, and `ship-critic`
  before the lead merges it into `claude/native-build`.

## Dependencies

Benn's policy (13 Nov 2026): Apple's frameworks through our own Swift modules where practical, Expo's
first-party modules otherwise, any outside library only with a written reason approved by the lead,
nothing paid without Benn. The audit and the approved exceptions: `docs/plans/native-dependencies.md`.
