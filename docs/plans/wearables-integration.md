# Wearables integration plan: sleep and body signals from Apple Watch, Fitbit, BetterMe and others

**Status:** Plan only. Nothing here is built.
**Owner:** Benn. Every phase needs `security-data` (health data is special-category data),
`mental-performance` (sleep and body signals shape how people feel about themselves) and
`ship-critic` before it goes live. Anything that touches calorie targets also needs
`nutrition-accuracy`.
**Product frame:** good mental performance → good nutrition → good fitness. Sleep and recovery
signals are the most direct input Tali can get for the first link in that chain, so this is the
main reason to integrate hardware at all. Tali stays general wellness guidance, never medical
advice (see `ai-platform-plan.md` §4).

Platform facts below were checked on 23 September 2026. They move fast; re-verify before starting
each phase.

---

## 0. Principles (non-negotiable)

1. **Opt-in, per metric, revocable.** Nothing is read until the user connects a source and picks
   which metrics Tali may use. Disconnecting stops reads and offers to delete what was imported.
2. **Least data.** Import daily summaries (total sleep, resting heart rate, steps), not raw
   minute-by-minute streams. Raw data never leaves the device in the native phases.
3. **Offline-first still holds.** Wearable data is a nice-to-have input. No launch, log or save path
   waits on a wearable, a phone health store or a vendor API. Imported values are cached in the day
   log like anything else.
4. **Signals inform, they don't judge.** No sleep scores, no "bad night" red, no streaks on sleep.
   Copy stays neutral and ranges-based, the same rules as eating. Gentle mode hides numbers here too.
5. **Device calories don't drive eating targets by default.** Wrist-worn energy expenditure is
   inaccurate (Shcherbina et al., 2017, J Pers Med: no tested device got energy expenditure within
   20% error). Steps and workouts may suggest an activity-level change; the user confirms it.
6. **The user's own input wins.** If a check-in says "slept badly" and the watch says 8 h, Tali
   shows both and trusts the person.
7. **Never rename `leanplan.v1` or existing Supabase tables/columns.** All data-model changes are
   additive.

## 1. Reality check: how each device can actually reach Tali

Tali is a PWA today. That decides most of this.

| Source | Where its data lives | Can the PWA read it? | Route |
|---|---|---|---|
| **Apple Watch** | Apple Health (HealthKit) on the iPhone | **No.** There is no HealthKit in Safari, no Apple Health REST API and no browser OAuth. | Native iOS app (Capacitor shell + HealthKit plugin). Optional stopgap: import the user's Apple Health export file (see §5, Phase 1b). |
| **Fitbit** | Fitbit / Google cloud | **Yes, via a server.** The legacy Fitbit Web API is being turned down this month (September 2026) and new Fitbit developer registrations are closed. The replacement is the **Google Health API** (Google OAuth 2.0, REST, webhooks). All its scopes are *Restricted*, so Google requires a privacy and security review before production access. | Supabase Edge Function does the Google OAuth and pulls daily summaries. Works in the PWA today, no native app needed. |
| **Google Pixel Watch** | Same Google Health API | Yes, via a server | Same as Fitbit, for free once Fitbit is done. |
| **BetterMe band** | The BetterMe app | **Not directly.** I found no public BetterMe developer API. BetterMe's help centre says its app works with Apple Health on iOS and Health Connect on Android (it dropped Google Fit in May 2024). **I don't know** whether the band's own sleep and heart-rate data is written out to Apple Health or Health Connect, or only kept in the BetterMe app. | Only via Apple Health / Health Connect in the native phase, and only if BetterMe writes the data there. Needs testing with a real band before we promise it. |
| **Android watches generally** (Samsung, Garmin via its app, Oura, Withings, etc.) | Health Connect on the phone, when their app writes to it | No. Health Connect is Android-native only. | Native Android app (Capacitor + Health Connect plugin). |
| **Garmin, Oura, Whoop, Withings, Polar** (direct) | Each vendor's cloud | Yes, via a server, each with its own partner programme | Out of scope for now. An aggregator (Terra, Junction, Sahha, Thryve and similar) could cover these through one API, but they still need their own native SDK for Apple Health, and I don't have their current pricing. Evaluate only if demand shows up. |

**Consequence:** the single biggest unlock (Apple Watch, and probably BetterMe) needs a native app.
The CLAUDE.md architecture already expects one ("native-ready", `core/` framework-agnostic), so
this plan leans on that rather than working around it.

## 2. Which metrics, and what Tali does with them

Only metrics with a clear use in the product frame. Everything else stays out.

| Metric | Why Tali wants it | Where it shows | What Tali never does with it |
|---|---|---|---|
| **Sleep duration** (+ bed/wake times) | The first link in the chain: short sleep predicts higher hunger and harder training days | Today, next to the check-in; weekly trends in `insights.ts` | Score it, rank it, or colour it as good/bad |
| **Sleep stages** (deep/REM/light/awake) | Low. Consumer stage estimates are noisy | Not shown in v1. Stored only if the user opts in, for later | Build advice on stages |
| **Resting heart rate** (daily) | Slow trend of recovery and fitness; rising RHR over several days is a "take it easier" hint | Train screen and weekly trend | Diagnose anything, or alert on a single day |
| **HRV** (daily summary where provided) | Recovery trend alongside RHR | Weekly trend only, once we trust the source | Show single-day HRV (it swings a lot and invites worry) |
| **Steps** | Grounds `activityLevel` in reality instead of a guess at onboarding | Suggests an activity-level change in Profile ("You've averaged about 9,000 steps for 3 weeks. Update activity to Moderate?") | Change targets silently |
| **Workouts** (type, duration, avg HR) | Pre-fill a cardio session in Train so it isn't logged twice | Train, as a "Found on your watch: 32 min run. Add it?" card | Auto-log without a tap |
| **Active energy** | Shown for context only, clearly labelled as a device estimate with a wide ± | Behind a disclosure, if at all | Add to the day's calorie target by default (principle 5) |
| **Weight / body fat** (smart scales via Health) | Saves typing | Pre-fills the weight sheet | Overwrite a value the user typed |

Out of scope on purpose: SpO2, skin temperature, blood glucose, ECG, menstrual cycle data. These
sit closer to medical use, carry more privacy risk, and aren't needed for v1. Cycle data might be
worth a separate, carefully reviewed plan later.

### How the signals feed guidance (examples, copy to be reviewed by `mental-performance`)

- **Short sleep + planned heavy Legs day:** "You slept about 5 h. A lighter session or fewer sets
  still counts today." Offered, never forced.
- **Short sleep + evening hunger pattern:** links into the existing if–then plans: "Tired days have
  lined up with bigger evenings. Want a plan for that?"
- **RHR up for 4+ days:** a soft recovery hint on Train. Never a health warning.
- **Weekly reflection** (AI phase C in `ai-platform-plan.md`) gains sleep as an input, under the
  same "AI explains, doesn't invent" rules.

### Known risk: sleep-tracker anxiety

Close attention to sleep numbers can make sleep worse for some people (described in the research
literature as "orthosomnia"). Mitigations: no scores, no daily sleep push notifications, trends over
single nights, a "Hide sleep numbers" option (gentle mode covers it), and the check-in's subjective
answer is always shown first.

## 3. Architecture

Fits the existing layering: pure logic in `core/`, IO in `data/`, React only in `screens/`/`ui/`.

```
Sources                          Adapters (src/data/health/)            Core (pure TS)
───────────────────────────────  ─────────────────────────────────────  ─────────────────────────
Google Health API (cloud)  ──▶   google.ts  (via Edge Function)    ─┐
Apple HealthKit (iOS native) ─▶  healthkit.ts (Capacitor plugin)    ├─▶ core/domain/bio.ts
Health Connect (Android)   ──▶   healthconnect.ts (Capacitor)       │   normalise, dedupe by
Apple Health export file   ──▶   appleExport.ts (local parse)       │   source priority, daily
Manual check-in            ──▶   (existing CheckinSheet)           ─┘   rollup, trends
                                                                          │
                                                        store.ts ◀────────┘  writes DayLog.bio
                                                                          │
                                                        sync.ts (existing day_logs path)
```

### 3.1 Data model (additive)

```ts
// core/types.ts
export type BioSource = 'manual' | 'google' | 'healthkit' | 'healthconnect' | 'apple-export'

export interface DayBio {
  sleep?: { mins: number; bed?: string; wake?: string; src: BioSource }
  rhr?: { bpm: number; src: BioSource }
  hrv?: { ms: number; src: BioSource }
  steps?: { n: number; src: BioSource }
  /** device estimate; context only, never added to targets by default */
  activeKcal?: { k: number; src: BioSource }
  /** ISO time of last import, for "updated 2 h ago" */
  t?: string
}

export interface DayLog { /* existing fields */ bio?: DayBio | null }

export interface CheckIn { /* existing */ sleep?: number /* 1–5, subjective */ }

export interface HealthLink {            // lives in Profile, synced with settings
  source: Exclude<BioSource, 'manual'>
  metrics: ('sleep' | 'rhr' | 'hrv' | 'steps' | 'workouts' | 'weight' | 'activeKcal')[]
  connectedAt: string
  lastSync?: string
}
// Profile.health?: { links: HealthLink[]; hideSleepNumbers?: boolean }
```

Workouts found on a device become a *suggestion* object, not a `Workout`, until the user taps Add.

### 3.2 Storage and sync

- **Local:** `DayLog.bio` rides the existing `leanplan.v1` state. No migration: the field is optional.
- **Cloud:** follow the pattern `sync.ts` already uses for the check-in (carried inside the `supps`
  jsonb under a reserved key such as `_bio`). No table or column changes, RLS unchanged.
  Alternative if the data grows: a new `health_daily` table (`user_id`, `log_date`, `source`,
  `metric`, `value`) with the same owner-only RLS policy as `docs/security-rls.sql`. Decide at
  Phase 2 with `security-data`.
- **Guest mode:** native reads (HealthKit, Health Connect, export file) work locally for guests,
  since nothing leaves the device. The Google route needs a server-held token, so it requires an
  account.
- **Conflict rule:** per metric per day, the highest-priority connected source wins
  (user-set order; default `manual` > `healthkit`/`healthconnect` > `google` > `apple-export`).
  A manual value is never overwritten by an import.

### 3.3 Google Health API (server side)

- New Edge Functions: `health-google-auth` (OAuth start/callback, stores refresh token encrypted,
  server-side only) and `health-google-pull` (daily summaries for a date range).
- Token table `health_tokens` (service-role only; no client read policy at all).
- Webhooks: Google Health API sends notify-only webhooks, then we fetch. Start with pull on app
  open plus a daily scheduled pull; add webhooks later if needed.
- The client never sees the Google token. The Edge Function returns only the daily summary numbers.

### 3.4 Native (Capacitor)

- Wrap the existing Vite build in a Capacitor shell for iOS and Android. `core/` and most of
  `src/` ship unchanged; this is the first real test of the "native-ready" architecture.
- Health plugins: evaluate `@capawesome/capacitor-health` (HealthKit + Health Connect, Capacitor 8+)
  and `@capgo/capacitor-health`. Pick one at Phase 2 after checking maintenance, sleep-type support
  and background read support.
- `data/health/` adapters behind one interface so the web build compiles without them:

```ts
interface HealthAdapter {
  available(): Promise<boolean>
  request(metrics: HealthLink['metrics']): Promise<HealthLink['metrics']> // granted subset
  readDaily(from: string, to: string): Promise<Record<string, DayBio>>
}
```

- Reads happen on app open and on a pull-to-refresh, not continuously.
- App Store: HealthKit entitlement, purpose strings, a privacy policy that covers health data, and
  no use of HealthKit data for advertising or sale. Google Play: Health Connect permissions
  declaration.

## 4. Consent, privacy and legal

- Health data is **special-category data** under UK GDPR. We need explicit consent, a DPIA before
  Phase 1, a privacy-policy update, and a clear delete path. `security-data` owns this review.
  I'm not a lawyer; this needs a proper legal check before launch.
- Consent screen per source: what is read, why (in one line per metric), where it's stored,
  how to disconnect. Default: sleep and steps on, everything else off.
- **Disconnect = stop + offer delete.** Deleting removes `bio` fields from that source locally and
  in the cloud, and revokes the Google token.
- Backups (`backup.ts`) include `bio`, so export/import keeps working. Say so on the consent screen.
- No health data goes to AI features unless the user has separately opted into AI and the feature
  needs it (least data, `ai-platform-plan.md` §0.4).

## 5. Phases

| Phase | What | Covers | Needs native? | Main risks / gates |
|---|---|---|---|---|
| **0** | **Manual sleep in the check-in.** Add a 1–5 "How did you sleep?" and optional hours to `CheckinSheet`. Add sleep to weekly trends. | Everyone, no hardware | No | Validates whether sleep guidance is useful before paying for integrations. `mental-performance` review of copy. |
| **1a** | **Google Health API** for Fitbit and Pixel Watch: sleep, RHR, steps, workouts. | Fitbit, Pixel | No (PWA) | Google restricted-scope privacy and security review: timeline and cost unknown, start the application early. DPIA. |
| **1b** (optional) | **Apple Health export import**: user exports from the Health app and picks the zip; parse sleep/RHR/steps locally in a worker. | Apple Watch users, before native exists | No | Clunky, one-off, large files (often hundreds of MB). Only worth it if Phase 2 is far off. |
| **2** | **Capacitor native apps** with HealthKit (iOS) and Health Connect (Android). | Apple Watch, BetterMe (if it writes to Health), Samsung, Garmin, Oura, Withings via their apps | Yes | App Store / Play review, a second release pipeline, native signing. Test BetterMe band with a real device first. |
| **3** | **Guidance using signals**: sleep-aware Train suggestions, activity-level suggestion from steps, workout pre-fill, weekly reflection input. | Anyone with data from 0–2 | No | `mental-performance` + `nutrition-accuracy` (activity level feeds targets). |
| **Later** | Aggregator or direct Garmin/Oura/Whoop, HRV trends, cycle-aware guidance | Demand-led | Depends | Separate plans. |

Phases 0 and 3's copy can start now; 1a and 2 can run in parallel if there's capacity.

## 6. Open questions for Benn

1. **Native app timing.** Apple Watch needs it. Is a Capacitor app on the roadmap anyway, or is
   this the reason to start it?
2. **BetterMe.** Is there a specific user need? We'd need a band to test whether its data reaches
   Apple Health / Health Connect. If it doesn't, BetterMe can't be supported without a partnership.
3. **Google review.** OK to start the Google Health API restricted-scope application (needs a
   privacy policy URL, verified domain and likely a security assessment)?
4. **Cloud storage.** Keep `bio` inside `day_logs.supps` (no schema change) or add a `health_daily`
   table?
5. **Activity level.** Comfortable with steps *suggesting* an activity-level change (which moves
   the calorie target), with the user confirming?

## 7. Testing

- `core/domain/bio.ts` unit tests in `npm test`: normalisation, source priority, manual-wins rule,
  day boundaries (sleep that crosses midnight belongs to the wake-up day), time zones.
- Adapter contract tests with recorded fixtures per source (no live calls in CI).
- Offline test: with all sources failing or slow, the app opens, logs and saves exactly as today.
- Real-device checks per phase: at least one Fitbit, one Apple Watch, one Android watch.

## Sources

- Google Health API overview: https://developers.google.com/health/about
- Fitbit Web API turndown: https://openwearables.io/blog/fitbit-web-api-shutdown-2026-migration-guide ,
  https://community.fitbit.com/t5/Web-API-Development/Introducing-the-next-phase-of-the-Fitbit-Web-API/td-p/5821061
- No HealthKit on the web: https://sahha.ai/blog/can-a-web-app-read-apple-health/ ,
  https://capawesome.io/docs/sdks/capacitor/health/
- BetterMe integrations: https://bettermesupport.zendesk.com/hc/en-us/articles/7979870992413-How-to-sync-BetterMe-with-Google-Fit ,
  https://bettermesupport.zendesk.com/hc/en-us/articles/7982333633565-How-to-sync-BetterMe-with-the-Apple-Health-app
- Wearable energy expenditure accuracy: Shcherbina A. et al. (2017), "Accuracy in Wrist-Worn,
  Sensor-Based Measurements of Heart Rate and Energy Expenditure in a Diverse Cohort", J Pers Med 7(2):3.
