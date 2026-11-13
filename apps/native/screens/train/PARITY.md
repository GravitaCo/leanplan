# Train (N7): parity checklist

The web app is the spec (native-build-brief §0.1). Each row is a web state the native app must
match, with how it is checked: **auto** = `scripts/e2e-train-parity.cjs` (visible words both ways and
saved data, web against native rendered with react-native-web, in-memory Supabase stand-in);
**unit** = `npm run test:train` or the web's `npm test`; **code** = read line by line against the web
source by a reviewer; **device** = needs the dev build (not yet run).

| Area | State | Check |
|---|---|---|
| Train tab | ordinary day, lighter options folded and open (wp8-ordinary-day) | auto, light + dark |
| | hard day: B3 tiles, effort note, "Resting today is fine too." (wp8-train-hard-day) | auto, light + dark |
| | rough night, own workout: steadier swaps, intervals left out (wp8-rough-night) | auto |
| | cardio day: 10-minute mobility, cardio effort note (wp8-cardio-day) | auto, light + dark |
| | in progress row after leaving; Done today; remove (two taps) | auto (in progress), code (remove) |
| | load note, Support sheet, welcome back, catch-up row | code |
| | gentle mode (no elapsed time, "You moved on two days") | code |
| Preview | ordinary, Shorter with aims, rough-night Shorter, chips wrap (flag on) | auto |
| | warm-up block (ONBOARDING=1) | auto with flag-on builds |
| | swap sheet, thumbs on generated workouts, cardio card, gentle swaps (walk, mobility) | code |
| Guided player | first set Done as planned, rest, skip rest, leave, saved session identical | auto |
| | Adjust with Stopped early and When to get help, Stopped sheet, menu, Finish with effort, minutes and note, saved session identical | auto |
| | holds over the clip and in the sheet, per side; Find your weight; How was that set?; swap with logged sets (extras); Do this later; discard with Undo | code |
| | warm-up player: skip a move, skip the block, session records it | auto (ONBOARDING=1) |
| | tempo count over the clip; Reduce Motion; clip fails to still then cue | code, device |
| Demo player | rep, phase, count, pace row; hold clips; grow from the library poster | code, device |
| Manual log | every shape; editing a logged session, saved identically | auto (weight-reps), code (others) |
| Sheets | Add something, Log a session (saved identically), library search and entry | auto |
| Native only | chime equals the web's synthesis | unit |
| | keep-awake while the player is open; rest alert in the background (via N12) | unit (alert), device |
| | session-open signal for N12 | unit |
| Known gaps | toasts (no host yet: "Push saved", discard Undo) | auto fails until N1's ToastHost |
| | primitives are a local stand-in until N1 merges | — |
