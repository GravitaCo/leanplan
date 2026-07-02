# Personalized nutrition targets — onboarding-driven design

**Status:** Spec / design doc. No code, no commits.
**Owner:** Nutrition specialist. Co-owned inputs flagged for de-dupe with the fitness specialist and Benn's canonical questionnaire.
**Supersedes:** the hardcoded `maint - 500` deficit in `suggestedTargets()` (`src/core/domain/nutrition.ts`).

---

## 0. Summary of the decision (from Benn, sports-science-backed)

The calorie target is a **personalized deduction from TDEE**, not a fixed 500 kcal cut.

- Deficit is expressed as a **percentage of TDEE (10–25%)**, scaled to **body-fat %**, **activity level**, and **goal**.
- **Goal drives direction and band**: `lose-fat` → deficit; `build-muscle` → lean surplus; `increase-strength` / `increase-endurance` → ~maintenance.
- **BMI is explicitly rejected** as a basis for anything here. Body composition (BF%, when known) and activity drive aggressiveness.
- A **dynamic-adjustment loop** watches the real rate of loss (from Tali's weight log) against a safe **0.5–1.0 %BW/week** band and **suggests** (never silently applies) a deficit tweak to counter metabolic adaptation.

Onboarding is the driver. Every downstream number must trace to a captured answer. This doc specs the **nutrition slice** of the questionnaire and the engine it feeds.

---

## 1. Nutrition onboarding inputs

Legend for **Ownership**:
- **SHARED** — the fitness domain also consumes this; the canonical definition is de-duped by Benn. Do not redesign alone.
- **NUTRITION** — nutrition-only input; nutrition owns it.
- **CONSUMED** — nutrition does not define the values (fitness owns them); nutrition reads the answer.

| # | Question (label) | Answer type + options | Populates (`Profile` field) | Ownership | Drives downstream |
|---|---|---|---|---|---|
| 1 | "What's your biological sex?" *(used only for the metabolic estimate)* | Single-select: Male / Female | `sex: 'M' \| 'F'` | SHARED | BMR constant in Mifflin–St Jeor (+5 vs −161); default BF% fallback (see #7) |
| 2 | "How old are you?" | Number (years) | `age: number` | SHARED | BMR term (−5 × age) |
| 3 | "How tall are you?" | Number (cm) — allow ft/in entry, store cm | `height: number` | SHARED | BMR term (6.25 × height) |
| 4 | "What do you weigh right now?" | Number (kg) — allow lb entry, store kg | `weight` + seeds today's weight log | SHARED | BMR (10 × weight); protein g/kg; rate-of-loss %BW math |
| 5 | "How active are you day-to-day?" | Single-select: Sedentary / Lightly active / Moderately active / Very active | `activityLevel: ActivityLevel` | SHARED | TDEE multiplier (`ACTIVITY.mult`, 1.2–1.725); nudges deficit aggressiveness within the goal band |
| 6 | "What's your main goal?" | Single-select: Lose fat / Build muscle / Increase strength / Increase endurance | `goal: Goal` | **CONSUMED** (fitness owns canonical values) | **Direction + deficit/surplus band** — the top-level switch of the engine |
| 7 | "Do you know your body-fat %? *(optional — skip if unsure)*" | Number (%), **optional**, with a short "how to estimate" helper | `bodyFat?: number` | NUTRITION | Selects **where in the goal band** the deficit sits (high BF% → aggressive; lean → conservative). **Absent → documented 15% fallback (assumption A1).** |
| 8 | "How fast do you want to go?" | Single-select: Steady / Standard / Aggressive *(default Standard)* | `targetRate?: TargetRate` | NUTRITION | Caps/shifts the deficit within the band **and** sets the rate-of-loss target the dynamic loop checks against |

Notes:
- **#1–#6 are SHARED** and must not be finalised here alone. The fitness questionnaire also needs sex/age/height/weight/activity/goal. Benn de-dupes into one canonical block; this table is the nutrition view of the same questions plus the "drives downstream" column so the merge is loss-less.
- **#7 and #8 are nutrition-only** and can be owned/shipped entirely by this domain.
- Body metrics already exist on `Profile` (name/sex/age/height/weight/activityLevel). Onboarding is a **new capture surface** for fields that are mostly already modelled — the additive fields are only `goal`, `bodyFat`, `targetRate` (see §4).

### Assumption A1 — body-fat fallback (Benn to confirm)
When BF% is not provided, the engine assumes **15%** for the aggressiveness calculation. Rationale: 15% is a moderate, non-lean value that keeps the deficit in the **middle** of the goal band — conservative enough not to over-cut a lean user who skipped the question, aggressive enough to be useful for an average user. It is deliberately *not* sex-split to keep the fallback predictable; if Benn prefers, we can fall back to **15% (M) / 24% (F)** to reflect typical essential+storage fat differences. **Flagged for confirmation.**

---

## 2. The redesigned target engine

Lives in `src/core/domain/nutrition.ts`, framework-agnostic. Additive: keep the existing `suggestedTargets` signature working (see §4 migration) but drive it through the new goal-aware core.

### 2.1 Step 1 — TDEE (unchanged basis, keep Mifflin–St Jeor)

```
BMR = 10·weight(kg) + 6.25·height(cm) − 5·age  + s     // s = +5 (M), −161 (F)
TDEE = BMR × activityMultiplier                          // 1.2 … 1.725 from ACTIVITY
```

Mifflin–St Jeor is the current validated estimator in the app and stays. TDEE = `maint` in today's return shape.

### 2.2 Step 2 — goal → direction + band

`goal` is the top-level switch. All four canonical values are handled:

| goal | Direction | Band (adjustment to TDEE) | Why (plain-English science) |
|---|---|---|---|
| `lose-fat` | **Deficit** | −10 % … −25 % of TDEE | Fat loss requires an energy deficit. 10–25% is the evidence-based sweet spot: enough to lose ~0.5–1%BW/wk, shallow enough to spare muscle and adherence. Depth chosen by BF% + activity (§2.3). |
| `build-muscle` | **Lean surplus** | **+5 % … +10 %** of TDEE | Muscle gain needs a modest energy surplus. A *lean* surplus (~+5–10%, ≈ +150–350 kcal) maximises the muscle:fat gain ratio; larger surpluses just add fat. Leaner users / novices skew to the top; higher BF% users skew to the bottom (or 0% recomp). |
| `increase-strength` | **~Maintenance** | −5 % … +5 % of TDEE | Strength is largely neural + skill; it does not require a surplus. Default maintenance (±0). Slight surplus if lean and wanting size support; slight deficit acceptable if higher BF%. |
| `increase-endurance` | **~Maintenance → small deficit** | −10 % … +0 % of TDEE | Endurance work has high energy turnover; fuelling matters more than deficit. Hold ~maintenance by default; allow up to −10% only if the user *also* wants to lose fat (high BF%). Never a surplus. |

Direction and band are **fully determined by `goal`**. BF% and activity only move the dial *within* the band.

### 2.3 Step 3 — BF% + activity + rate select the exact percentage

Within a `lose-fat` band of −10%…−25%, the deficit percentage is chosen so that **higher body fat → deeper cut** (more reserve to draw on, more metabolically tolerant), and **more activity → slightly deeper allowed** (bigger absolute burn, easier to preserve muscle).

Plain-English model (implementation is a clamped interpolation, not a lookup soup):

```
// lose-fat example
base = interpolate(bodyFat):
   BF ≤ 12%  → 10%      (very lean: protect muscle, go slow)
   BF 12–20% → 12–16%
   BF 20–28% → 16–20%
   BF ≥ 28%  → 20–25%   (ample reserve: can afford aggressive)

activityBump = { sedentary: −1%, light: 0, moderate: +1%, active: +2% }
rateShift    = { steady: −3%, standard: 0, aggressive: +4% }   // from targetRate

deficitPct = clamp(base + activityBump + rateShift, 10%, 25%)
target     = round( TDEE × (1 − deficitPct) )
```

For `build-muscle` the same shape runs on the surplus band (leaner → larger surplus). For strength/endurance the band is narrow, so BF% mostly decides whether to sit at 0, slightly under, or slightly over.

**When `bodyFat` is absent:** substitute the A1 fallback (15%) → lands `base` at ~13–14%, a moderate cut. Surface a gentle "add your body-fat % for a more tailored target" prompt.

### 2.4 Step 4 — safety floors

```
floor = max( BMR, 1200 )         // never prescribe below resting metabolic rate, hard floor 1200
target = max( target, floor )
```

- Never below **BMR** — a target under resting expenditure is unsafe and unsustainable.
- Absolute hard floor **1200 kcal** (retains today's behaviour) as a backstop for very small users where BMR itself is low.
- If the floor bites, flag it in the UI ("we've capped your target at a safe minimum") so the number isn't silently wrong.

### 2.5 Step 5 — macro split

Protein first (anchored to bodyweight, the evidence-based lever), then fat as a floor, carbs fill the remainder.

```
protein_g = weight × proteinPerKg(goal)
   lose-fat            → 2.0 g/kg   (higher, to preserve lean mass in a deficit)
   build-muscle        → 1.8 g/kg
   increase-strength   → 1.8 g/kg
   increase-endurance  → 1.6 g/kg
   // If bodyFat known and high (>30%), cap protein target on lean mass estimate
   // (weight × (1−BF%) × ~2.2) to avoid over-prescribing for larger users. (assumption A2)

fat_g   = max( 0.8 g/kg × weight, 25% of target kcal / 9 )   // hormonal/essential-fat floor
carbs_g = ( target − protein_g×4 − fat_g×9 ) / 4             // remainder, clamped ≥ 0
```

Why: protein 1.6–2.2 g/kg is the consensus range; the deficit case sits at the top to protect muscle. Fat has a lower-bound (hormone/vitamin needs) rather than a fixed %. Carbs take the rest — they fuel training and are the lever we flex, not protein.

Today's split (protein `weight×1.8`, carbs `40%`, fat = remainder) is replaced by this goal-aware version. The return shape (`{ maint, kcal, p, c, f }`) is preserved.

### Assumption A2 — lean-mass protein cap
For users with known high BF% (>30%), anchoring protein to total bodyweight over-prescribes. Proposal: cap on estimated lean mass (`weight × (1−BF%) × 2.2`). Only active when BF% is known. **Flagged for confirmation** (adds slight complexity; Benn may prefer to keep it simple and always use total bodyweight).

---

## 3. Dynamic-adjustment loop (its own phase)

Goal: catch metabolic adaptation and mis-set targets by comparing **actual** weekly weight change to the **intended** rate, and **suggest** (never auto-apply) a deficit tweak.

### 3.1 Inputs (all already in Tali)
- Weight log entries (`DayLog.weight` across days) — the existing body-stat capture.
- Current target (`AppState.target.kcal`) and its underlying TDEE.
- `targetRate` → intended rate band (§3.2).
- `goal` — only `lose-fat` (and optionally endurance-with-cut) runs the loss check; `build-muscle` runs a mirror gain check.

### 3.2 Intended rate band (from `targetRate`)
Safe range for fat loss is **0.5–1.0 %BW/week**.
```
steady     → target ~0.5 %BW/wk
standard   → target ~0.75 %BW/wk
aggressive → target ~1.0 %BW/wk   (never above 1.0%; that's the hard ceiling)
```

### 3.3 The calculation (pure function, framework-agnostic)
```
// Smooth noise: use a trailing average, not two spot weigh-ins.
avgThisWeek  = mean(weights in last 7 days)
avgPrevWeek  = mean(weights in the 7 days before that)
weeklyDeltaKg = avgPrevWeek − avgThisWeek          // positive = losing
weeklyPctBW   = weeklyDeltaKg / avgPrevWeek × 100
```
Require a **minimum data threshold** (≥ ~4 weigh-ins across the two-week window, ≥ 14 days of history) before suggesting anything — otherwise return "not enough data yet".

### 3.4 The suggestion logic
```
intended = rate band from targetRate (e.g. standard = 0.75%)
tolerance = ±0.2 %BW/wk

if weeklyPctBW < intended − tolerance:   // losing too slowly / stalled → adaptation likely
    suggest: deepen deficit by ~5% of TDEE (≈100–150 kcal), still clamped ≤ 25%
if weeklyPctBW > intended + tolerance OR weeklyPctBW > 1.0:  // too fast → muscle-loss risk
    suggest: shrink deficit by ~5% of TDEE
else:
    on track → no change
```

### 3.5 Delivery — suggest, don't apply
- Emit a **suggestion object** (`{ current, suggested, reasonPlain, weeklyPctBW }`), surfaced as a dismissible card ("Your loss has slowed to 0.3%/wk — want to drop your target by ~120 kcal?").
- The user taps **Apply** (writes the new target) or **Dismiss**. Never mutate the target silently.
- Re-evaluate at most **weekly**; debounce so it doesn't nag daily.
- This is a pure `core/domain` function (`suggestRateAdjustment(...)`) with no side effects; the store/UI decides when to show it.

---

## 4. Data model + migration

### 4.1 Additive `Profile` fields (no renames)
```ts
// src/core/types.ts — additive, all optional so existing profiles remain valid
export type Goal = 'lose-fat' | 'build-muscle' | 'increase-strength' | 'increase-endurance'
                                              // ↑ CANONICAL DEF OWNED BY FITNESS — consume, don't redefine
export type TargetRate = 'steady' | 'standard' | 'aggressive'

export interface Profile {
  // ...existing fields unchanged...
  goal?: Goal            // SHARED — fitness owns canonical values
  bodyFat?: number       // NUTRITION — optional %, fallback 15% (A1)
  targetRate?: TargetRate // NUTRITION — default 'standard'
}
```
- **All new fields optional** → no migration needed for existing localStorage `leanplan.v1` or Supabase rows. Absent `goal` → **no fallback direction** (Benn's locked decision #2): the engine returns a distinguishable "goal needed" result and the UI prompts for a goal before showing any suggested target — it never defaults into a deficit.
- **No renames** of `leanplan.v1` or any Supabase table/column. If `goal`/`bodyFat`/`targetRate` need to sync, they ride on the existing profile record — additive columns only, defined jointly with fitness (`goal` especially must be a single shared column, not two).

### 4.2 The live `maint − 500` is superseded *(updated to match what shipped)*
- `suggestedTargets(profile, weight)` keeps its parameter signature, and the success shape still carries `{ maint, kcal, p, c, f }` plus new metadata (`goal`, `adjustPct`, `floored`, `bodyFatAssumed`). The return type is now a **union**: `SuggestedTargets | GoalNeeded | null` — `null` when body metrics are missing (as before), `GoalNeeded` (`{ goalNeeded: true, maint }`) when metrics are complete but no goal is chosen. The Profile screen consumer was updated alongside.
- Its body is replaced by the §2 engine. **Unset `goal` does NOT fall back to `lose-fat`** — Benn's locked decision #2 overrides this doc's earlier recommendation: the engine never produces a deficit-by-assumption; it returns `GoalNeeded` and the UI shows an inline goal picker in place of the suggestion. `bodyFat` absent → 15% fallback (A1, confirmed as single non-sex-split value); `targetRate` absent → `'standard'` (confirmed). Existing users therefore see their maintenance number plus a goal prompt — not a silently changed deficit.
- Rollout implication: this changes the *suggested* number only. Users' **saved** `target` is not retro-changed (targets are stored snapshots, like meals). The new suggestion appears next time they open the target editor / finish onboarding. Call this out in release notes.

---

## 5. Phasing (each ship-critic-reviewable)

**Phase 1 — Engine core (nutrition-only, no UI dependency).**
Replace `suggestedTargets` internals with the goal-aware TDEE × (1 − deficitPct) engine (§2), including floors and the new macro split. Add `Goal`/`TargetRate` types and optional `Profile` fields. Graceful fallback when new fields absent. Pure functions, unit-testable. `npm run typecheck` green. *Ships without any onboarding UI — behaves like a better default immediately.*

**Phase 2 — Onboarding capture (needs shared questionnaire merged).**
Wire questions #6–#8 (goal / bodyFat / targetRate) into the onboarding flow and Profile editor. Persist to profile + sync. Goal question is the shared one — land after Benn de-dupes the canonical block with fitness. Surface the "add body-fat % for a better target" nudge.

**Phase 3 — Dynamic-adjustment loop.**
Add `suggestRateAdjustment(...)` pure function (§3) + the weekly suggestion card UI (apply/dismiss). Depends on Phase 1 (engine) and existing weight log. Independently reviewable.

**Phase 4 (optional) — Refinements.**
Lean-mass protein cap (A2), sex-split BF fallback (A1 variant), recomp handling for high-BF `build-muscle` users, ft/in + lb entry helpers.

---

## 6. Decisions & open questions

**Resolved (locked by Benn, 2026-07 — implemented in Phases 1+2):**
- **A1 — BF% fallback:** single conservative 15% for v1 (sex-split deferred).
- **Pre-onboarding default:** `goal` unset → `GoalNeeded`, never a silent deficit; UI prompts a goal pick.
- **`targetRate` default:** "standard" (~0.75 %BW/wk).
- **Shared `goal` column:** one top-level `Profile.goal` written by both domains (de-dupe ruling 1).
- **Endurance direction:** maintenance-only band (−10…0%), never a surplus — per the shared goal contract.

**Still open:**
1. **A2 — protein cap:** anchor protein to lean mass when BF% is high? (The Phase-2 reconciliation scales protein to fit the calorie budget, which covers the acute case; the lean-mass anchor remains a refinement.) (§2.5)
2. **Adjustment cadence & tone:** weekly suggestion card — is a dismissible in-app card the right surface, or should it also fire a push notification? (Dynamic-loop phase.)
