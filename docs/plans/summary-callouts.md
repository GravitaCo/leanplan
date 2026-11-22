# Summary callouts: one designed card that points people to what helps them

Status: **idea from Benn, 16 Nov 2026; plan only, nothing built or designed.** Labels: **[E]**
checked in the code, **[I]** inference, **[G]** judgement call.

## 1. What Benn asked for

A designed card on Summary that points out key parts of the app a person hasn't seen or turned on
yet, where they would help their journey. The first example: connecting a wearable (Apple Watch
phase 2, `native-app-plan.md` §3.5). It sits apart from the check-in, which stays as it is.

## 2. What it is

- **One callout card on Summary at a time**, drawn from a short list of features (§3).
- A callout shows only when the feature is **relevant, not yet used, and not dismissed**.
- Each card says what the feature does for the person in one line, with one action ("Connect your
  watch") and a quiet "Not now".
- "Not now" hides that callout for a while (for example 30 days [G]); dismissing it twice hides it
  for good. Profile keeps a way back to every feature, so nothing depends on the card.
- Nothing is pre-ticked or turned on by the card: it opens the feature's own screen, where any
  consent is asked in the usual way.

## 3. First callouts (candidates; each needs `mental-performance` and Benn or Sara)

| Callout | Shows when | Opens |
|---|---|---|
| Connect your watch (native, iPhone) | Wearables off; health consent yes; not gentle-mode-only risk (§5) | The Connect screen (wearables consent there) |
| Recipes | No recipe saved after some logging days [G] | Recipes |
| Barcode or label scan | Never used; has logged packaged foods [I] | Add food › Scan |
| Reminders | Notifications never set | Notification settings |
| Mind skills (Reset, Wind down) | Never opened; Mind pillar on | The skill |
| Set up my plan | Onboarding not done (once onboarding is on) | Profile › Set up my plan |
| Cycle (later) | Eligible (§3 of `cycle.md`) and not set up | The Cycle offer |

Benn and Sara pick the first set; more can be added later in one place.

## 4. How it fits Summary's rules [E: `src/core/domain/asks.ts`]

Summary already has an **asks budget**: a fixed number of prompts a day (3 usually, 1 on a hard
day, a signpost day or with "Fewer prompts"), ranked so safety and time-sensitive asks come first,
and only the check-in and the one thing in the first two weeks. The callout card joins it as **one
new ask**, ranked last:

- never on a hard day, a low-mood or signpost day, or in the first 14 days;
- never more than one callout a day, and only when the budget has room after everything else;
- held, not dropped, when there's no room, like the other asks;
- not shown in care versions or safety weeks.

This keeps the promise in the wellbeing plan that Today stays uncluttered [E: `wellbeing-plan.md`
§10a].

## 5. Safety and tone

- Callouts are about what helps, never about doing more: no streaks, no "you haven't...", no
  urgency, no badges or counts of unused features.
- **Gentle mode:** no callouts that lead to numbers (scan, steps). The watch callout in gentle mode
  is for `mental-performance` to decide (sleep shows in gentle mode; steps don't).
- Food callouts are held on hard days like the other food prompts.

## 6. Compliance

- A callout that leads to a consent (wearables, Cycle) must not pressure: the consent screen stays
  neutral, "Not now" is as easy as yes, and the card never says the feature needs the data
  "to work properly" unless true (GDPR consent freely given; `compliance` to confirm).
- What a callout knows (which features someone has used) is already on the device; no new data is
  collected, nothing is sent anywhere, and dismissals stay on the device or in settings
  [I: `compliance` and `security-data` to confirm whether dismissals sync].
- Not marketing: callouts only point to features of the app the person already has; no offers,
  partners or paid features. If a paid tier ever exists, upsell copy is a separate decision
  (`monetisation-plan.md`, `mental-performance`).

## 7. Steps

1. Benn and Sara pick the first callouts (§3).
2. `mental-performance` sets the rules in §2, §4 and §5 (timings, gentle mode, wording).
3. Boards on the Design canvas, past `design`: the card (light and dark, native and web), "Not now",
   and where it sits on Summary beside the check-in and the other asks. A new card pattern, so it
   must show it makes the app clearer (CLAUDE.md, 8 Oct rule).
4. Build: a pure `callouts.ts` in `src/core/domain/` that picks today's callout from what is due,
   joined to `asks.ts` as one ask; unit tests (budget, hard day, early weeks, dismissal, gentle
   mode); the card in web and native.
5. `compliance` (§6), `ship-critic`.
