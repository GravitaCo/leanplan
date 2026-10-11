# Tali roadmap overview: every planned phase, its status and what gates it

Compiled 11 Oct 2026 from the 15 plans in `docs/plans/`, the compliance register
(`docs/compliance/README.md`), two draft plans on unmerged branches, and the code on `main`
(8988ecd). Status is what the docs state or the code shows; "unclear" means neither settles it.
No plan sets target dates or effort estimates, except the native spike ("about 2 weeks"). The
**Target** columns are blank for Benn to fill.

## Flags on `main` today

| Flag | Value | Gates |
|---|---|---|
| `WELLBEING_ENABLED` | on | Mind tab, wellbeing Phase 1 |
| `MIND_REVIEWED` | on | Mind skills and low-mood signpost (clinician review before public launch) |
| `SUPP_NAMES_ENABLED` | off | Supplement names (waits on DPIA 8.8) |
| `ONBOARDING_ENABLED` | off | First-run wizard, training engine E1, warm-ups, Redo setup |
| `LABEL_SCAN_ENABLED` | off | AI label reading |
| `AI_FEATURES_LIVE` | false | AI rows in Profile |

## Fixed external dates

| Date | What | Source |
|---|---|---|
| 28 Oct 2026 | `UNCONSENTED_DELETION`: the purge of logs with no health consent starts | compliance register |
| 2 Dec 2026 | EU AI Act Art. 50 transitional marking deadline (labelling AI output, AI voices) | ai-platform-plan |
| Jan 2027 | DMCC subscription regime; pause and a non-renewing annual pass must exist before any paid launch | monetisation-plan |

## Status by stream

### 1. Workouts (`workouts-customization-and-library.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| P1 | Wellbeing-first training: check-in signals, planned / shorter / swap, neutral burn copy, plans slide | Done | |
| P1.5 | Activity-level suggestion | Done | |
| P2 | Log any movement, several a day (`day_logs.sessions`) | Done | |
| P3 | Exercise library and logging shapes | Done | |
| P4 | Build your own workout (`routines`) | Done | |
| P5 | Plans as your week (`training_plans`) | Done | |
| After P5 | Builders per kind (yoga, pilates, mobility, cardio), visuals | Not started; not designed in depth | |
| P6 | Tailored plans | Replaced by the training engine | |
| P7 | Per-muscle volume readout | Not started | |
| M | Media: hold and flow players, more clips, guided whole sessions last | Partly built (Bunny move and hold clips done; flow mode not built) | |

Open for Benn: no endurance plan, no heavy low-rep strength plan, mobility and walk are swaps only
(not plannable).

### 2. Training engine (`personalised-training-engine.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| E1 | Day-1 plan generation, "find your weight", Starter week, "why" | Built, behind `ONBOARDING_ENABLED` (off) | |
| E2 | Person model, per-exercise `nextTargets`, likes, "Why this?" on every card | Partly (likes and person model exist; `nextTargets` not built) | |
| E3 | `reviewWeek`: volume, schedule reshaping, lighter weeks, guardrails | Not started | |
| E4 | Walk-to-run stages, optional AI wording of the "why" | Not started | |

### 3. First-run onboarding (`first-run-onboarding.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | Foundations: consents, deletion, privacy notice, DPIA, connection pill, library attributes | Done except DPIA §§1–7 (unsigned) | |
| 2 | Design boards | Approved | |
| 3 | Questionnaire and safety routing, per-field merge sync | Built, flag off | |
| 4 | Engine day 1 (E1) | Built, flag off | |
| 5 | Nutrition ranges, units, sex-split floors | Built (food ranges live with flag off); full status unclear | |
| 6 | Learning loop | Partly (`suggestRateAdjustment` built via the maintenance loop; the rest is E2/E3) | |
| 7 | Three new plans as generator fixtures | Unclear | |
| 8 | Optional AI wording | Not started | |
| | Server-side `under_age_requests` record | Proposal, not built | |

To turn the flag on: DPIA signed, register item 34 fixes (pregnant plus Yes sees calories,
"weight hidden" copy, "Why we ask" copy), onboarding legal text version published. Wider launch
beyond an invited beta needs a UK lawyer and a clinician (Benn, 27 Sept).

### 4. Wellbeing / Mind (`wellbeing-plan.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | Asks budget, hard-day dial-down, weekly reflection, support, skills, the one thing, sleep tier 1, notification budget | Built and on (`WELLBEING_ENABLED`); supplement names off | |
| 2 | A few guided audio tracks (Reset, Wind down), AI voices labelled | Not started; draft scripts on branch `claude/wellbeing-phase2` | |
| 3 | Wearable sleep (HealthKit, Health Connect) | Not started; needs the native app | |
| 4 | AI coach | Not started; same as AI capability E | |

Phase 2 needs the DPIA "likely accessed by children" assessment first. Phase 4 needs evals, a
red-team pass, a regulatory opinion and an ICO prior-consultation decision. Public launch of the
skills and signpost needs a clinician review (unfunded).

### 5. Maintenance loop (`maintenance-loop.md`)

| Step | Scope | Status | Target |
|---|---|---|---|
| 1–3 | Weekly review, 4-week weigh-in check, adaptive maintenance, "Keep it steady" goal, screens | Merged to `main`, no flag found | |
| 4 | Weekly review push reminder | Function deployed 10 Oct; judgement calls (C16) to confirm | |

Safety tiers are pending clinical review. Thresholds in `loopThresholds.ts` are placeholders until
`nutrition-accuracy` and `mental-performance` set them.

### 6. Food data (`food-data-offline.md`, `nutrition-data-and-sourcing.md`, `nutrition-accuracy-research.md`)

| Item | Status | Target |
|---|---|---|
| Sourced food record, guardrails, offline launch | Done | |
| Barcode scanning (Open Food Facts) | Done | |
| Curated library expansion (+250–350 foods) | Unclear (database grew 336 → 547, mostly chains and ingredients) | |
| 48 unchecked foods (McDonald's needs an official PDF) | Not started | |
| Split one-row-many-products foods | Not started | |
| `cook`-flagged vegetables holding raw values | Not started | |
| Per-item custom foods in the create screen | Partly (syncs; UI offers g/ml only) | |
| Food packs in IndexedDB, local search index | Not started (designed) | |
| History older than 90 days to IndexedDB (before ~3 MB) | Not started | |
| Scale and search past ~1–1.5k foods | Not started; only if needed | |
| Accuracy research round 2 | Not started; needs a local session or allowed domains | |

Open for Benn: locale scope (UK-only?) and target library size.

### 7. Label scan and shared products (`label-scan-and-shared-products.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | AI label photo reading | Built and deployed, flag off | |
| 2 | Shared product list, 2-user verification | Not started | |
| 3 | On-device reading in the native app | Not started | |

To turn Phase 1 on: register item 24 (Anthropic DPA, transfer mechanism and TIA, retention,
consent copy, withdrawal toggle, privacy section, DPIA update, `ai_usage` 60-day cleanup), confirm
the spend limit, smoke-test.

### 8. Meals (`meal-suggestions-and-planning.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 1 | "What can I make?" from own recipes | Done | |
| 2 | Tali recipe library (50 UK meals), tags, allergy filters, `check:recipes` | Not started | |
| 3 | AI ideas from ingredients | Not started | |
| 4 | Plan a few days plus a shopping list | Not started | |
| 5 | Voice or photo of fridge/receipt | Not started | |

Open for Benn: who writes library recipes; whether allergy filtering waits for allergen data;
AI ideas free or paid.

### 9. Nutrition targets (`personalized-nutrition-targets.md`)

Engine and capture are done. The adjustment loop is built in a newer form by the maintenance loop.
Open refinements (lean-mass protein cap, sex-split body-fat fallback, recomp, ft/in and lb entry)
are not started. Open for Benn: anchor protein to lean mass when body fat is high; whether the
weekly suggestion also sends a push.

### 10. AI platform (`ai-platform-plan.md`, `ai-recipe-capture.md`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 0 | DPIA, consent, privacy section, Edge Function pattern, spend caps, eval harness | Partly (consents, function pattern, daily cap done; DPIA, privacy section, eval harness open) | |
| 1 | A: type the meal, parse, confirm (recipe capture steps 1–2) | Not started | |
| 2 | B: recipe by conversation; C: AI weekly reflection | Not started | |
| 3 | D: photo logging with ±; F: voice input | Not started | |
| 4 | E: wellbeing coach; spoken audio library | Not started | |
| 5 | G: reviewed AI video library | Not started | |

Every phase passes the quality gates: eval set, model chosen by eval, red-team, four agent
sign-offs. Open for Benn: speech and video vendors, regulatory opinion before Phase 4, per-user
budget cap (proposal $2 a month).

### 11. Monetisation (`monetisation-plan.md`)

| Step | Scope | Status | Target |
|---|---|---|---|
| 1 | Supporter payment, R&D tax relief claim | Not started | |
| 2 | Tali Plus with the first AI feature, founding price, referrals, "On your side" pilot | Not started; waits on AI Phase 1 | |
| 3 | Pause and non-renewing annual pass | Not started; must exist before Jan 2027 if paid | |
| 4 | Pay-what-you-can, hardship places, gifts (after 3 months of sales) | Not started | |
| 5 | AI credit top-ups | Not started | |
| 6 | Coach plan for PTs (after 3 months of Plus data) | Not started | |
| | Incremental-pull sync fix (do before growth) | Not done (`pullAll` fetches every row) | |

Open for Benn: 11 decisions in the plan's summary, starting with the free/paid line, legal entity
and VAT, Stripe or a merchant of record, Supabase Pro.

### 12. Native app (`native-app-plan.md`, draft on branch `claude/maintenance-loop-build`, not on `main`)

| Phase | Scope | Status | Target |
|---|---|---|---|
| 0 | Spike: Expo app reusing `src/core/`, sign-in, Summary, one HealthKit read, one animation, one on-device AI call (about 2 weeks) | Not started | |
| 1 | Parity with the web app; TestFlight and Play internal testing | Not started | |
| 2 | Apple Watch (sleep and walking first) | Not started | |
| 3 | Store launch | Not started | |
| 4 | Fitbit, Health Connect | Not started | |
| 5 | AI features, on-device first | Not started | |

Open for Benn: store name, test devices, whether the web app stays, budget.

### 13. Compliance gates (`docs/compliance/README.md`)

| Item | Status | Blocks | Target |
|---|---|---|---|
| #1 ICO fee | Owed now | Nothing in the build; a legal duty | |
| #43 Republish the privacy page on Webflow | Owed now (several versions behind) | Accuracy of the live policy | |
| #7 DPIA §§1–7 and D1–D12, 8.8 | Unsigned | Onboarding flag, label scan, supplement names, AI Phase 0 | |
| #4 Processor DPAs (Supabase, Webflow, Bunny) | Open | Public launch | |
| #24 Label-scan prerequisites | Open | Label scan flag | |
| #34 Onboarding copy fixes | Open | Onboarding flag | |
| #6 Solicitor review | Open | Public launch, any paid feature | |
| #44 Clinician review | Open, unfunded | Public launch of Mind and loop safety tiers | |
| #21 Under-18 auto-delete and DPIA assessment | Open | Wellbeing Phase 2, public launch | |
| #30c Dormant-account deletion | Decided, not built | | |
| #2, #5, #8, #11, #15, #23 | Open | Public launch | |

## Dependency chain (what has to happen before what)

1. **DPIA sign-off** unlocks the onboarding flag (with item 34), label scan (with item 24),
   supplement names (8.8) and AI Phase 0.
2. **Onboarding flag on** brings E1 to users; E2 and E3 build on it.
3. **AI Phase 0 complete** (eval harness, privacy section) unlocks AI Phase 1 (meal parsing).
4. **AI Phase 1** is the launch point for Tali Plus, so paid plans wait on it. Any paid launch also
   needs the solicitor, VAT/entity decision and DMCC features (before Jan 2027).
5. **Native spike** unlocks wearables (wellbeing Phase 3, native phases 2 and 4) and on-device
   label reading.
6. **Public launch** (no date set anywhere) needs: solicitor, clinician, DPAs, DPIA, ICO fee,
   under-18 items. Until then the app is an invited beta.
7. **AI coach** (AI Phase 4 = wellbeing Phase 4) is last: evals, red-team, regulatory opinion, ICO
   decision.

## Decisions needed to set the schedule

1. A public launch date, or confirmation that the invited beta is the target for now.
2. Whether a paid tier launches before Jan 2027 (if so, DMCC features are on the critical path).
3. Budget and timing for the solicitor and clinician reviews (both gate public launch).
4. Order of the next two build streams after the DPIA: onboarding on, AI Phase 1, native spike,
   or food data clean-up.
