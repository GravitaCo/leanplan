# AI platform plan — capabilities, costs, architecture, safety

**Status:** Plan only. Nothing here is built except the local groundwork in `ai-recipe-capture.md` §6.
**Owner:** Benn. Security review (`security-data`) and a pre-ship gate (`ship-critic`) are required for
every phase. Nutrition features also go through `nutrition-accuracy`; wellbeing features through
`mental-performance`.
**Priorities, in order:** safety and security, then accuracy, then friction, then cost.
**Product frame:** good mental performance → good nutrition → good fitness. AI earns a place only
where it removes friction or improves one of those without adding risk.

Prices below were checked in September 2026 and change often. Re-verify before committing budget.

---

## 0. Principles (non-negotiable)

1. **AI routes and explains; it never invents nutrition numbers.** Calories and macros always come
   from Tali's verified food data (`core/data`, later CoFID / USDA / Open Food Facts). The model maps
   words and photos to foods, and chooses which question to ask. The arithmetic stays in `core/`.
2. **Wellness, not medicine.** Tali gives general wellness guidance. It does not diagnose, treat,
   provide therapy or give medical advice. That keeps it outside medical-device regulation and
   outside the "high-risk" category in Anthropic's usage policy (see §4.1).
3. **The user confirms before anything is saved.** The AI proposes a log entry or recipe, and a tap
   commits it. There are no autonomous writes.
4. **Least data, server-side keys.** Only the minimum text or image for the task leaves the device,
   through our own server function. No model keys ever ship in the web bundle or the native app.
5. **Same psychological-safety rules as the rest of the app.** Neutral language, ranges not limits,
   no shame, gentle mode respected, safe calorie floors, and crisis signposting.

## 1. Where AI helps, ranked by value and risk

| # | Capability | Friction removed | Risk | Phase |
|---|---|---|---|---|
| A | **Say or type the meal** ("two eggs and toast"): parse into foods, match to the database, confirm | Search and portion picking | Low (structured, confirmed) | 1 |
| B | **Build a recipe by conversation** (at most 3 questions, oil always asked) | Typing ingredients | Low–medium | 2 |
| C | **Weekly reflection**: a plain-English summary of the week, patterns (e.g. skipped lunch → big evenings), one suggestion | Interpreting charts | Medium (tone) | 2 |
| D | **Photo of a plate or menu**: identify the items, then ask about portion and oil | Search | Medium (accuracy; must show ±) | 3 |
| E | **Wellbeing coach chat** (sleep, stress, focus, motivation, habits) inside strict wellness scope | Knowing what to do next | **High** (mental health adjacency) | 4, only after evals and legal review |
| F | **Audio**: voice logging (speech to text); spoken coaching tracks (text to speech) | Typing; screen time | Medium | 3 (voice in), 4 (audio out) |
| G | **Video**: exercise demos, guided sessions | Finding trustworthy content | **High** (injury, likeness, labelling) | 5 |

## 2. Architecture

```
Web PWA / native app
   │  (Supabase auth JWT)
   ▼
Supabase Edge Function  ai-<task>          ← the only place a model key exists
   ├─ verify JWT, check consent flag, per-user rate limit + monthly spend cap
   ├─ minimise input (strip names/emails; send meal text or image only)
   ├─ call the model with a fixed system prompt, structured output schema
   ├─ validate output against the schema; reject anything malformed
   └─ return candidates only (no DB writes)
   ▼
core/ (pure TS, shared by web + native)
   ├─ match candidates to verified foods (findRecipe, food search)
   ├─ compute macros + ± margin (estimate.ts)
   └─ UI shows the proposal → user confirms → normal store action logs it
```

- **One Edge Function per task** (`ai-parse-meal`, `ai-recipe-chat`, `ai-weekly-summary`,
  `ai-photo`), each with its own prompt, schema, token caps and rate limits. That keeps blast radius
  small and makes evals per task.
- **Structured outputs** (`output_config.format` with a JSON schema, or strict tools) for every
  parsing task, so the app never scrapes free text.
- **Prompt caching** on the fixed system prompt and food-matching instructions. Cache reads cost
  roughly a tenth of normal input.
- **Batch API** (50% cheaper, asynchronous) for weekly summaries and any content generation that
  doesn't need to be instant.
- **Refusals and fallbacks:** always check `stop_reason` (including `refusal`) before using output.
  On refusal or error, fall back to the non-AI path (search, recipe builder). Never show a raw model
  error.
- **Native later:** the same Edge Functions serve iOS and Android. `core/` is reused unchanged.
  Consider **on-device models** (Apple Foundation Models on iOS, on-device speech recognition) for
  simple parsing and voice input. They cost nothing per call, work offline and keep data on the
  phone, with the server path as a fallback.

## 3. Costs

### 3.1 Model pricing (Anthropic first-party, per million tokens, September 2026)

| Model | ID | Input | Output | Typical fit |
|---|---|---|---|---|
| Claude Opus 5 | `claude-opus-5` | $5 | $25 | Quality benchmark; coaching and recipe conversation |
| Claude Sonnet 5 | `claude-sonnet-5` | $2 | $10 | Candidate for parsing, summaries and photos if evals show it holds quality |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | Candidate for high-volume meal parsing if evals show it holds quality |

Batch API: 50% off. Cache reads: about 0.1× input; cache writes about 1.25× input.
**Model choice per task is a decision for Benn after evals** (§6). The plan starts every task on
Opus 5 as the quality baseline and measures whether a cheaper model matches it.

### 3.2 Per-call estimates (approximate)

| Task | Tokens (in / out) | Opus 5 | Sonnet 5 | Haiku 4.5 |
|---|---|---|---|---|
| A. Parse one meal | ~1,500 / 300 | ~$0.015 | ~$0.006 | ~$0.003 |
| B. Recipe conversation (3 turns) | ~6,000 / 900 | ~$0.05 | ~$0.02 | ~$0.01 |
| C. Weekly summary (batch) | ~8,000 / 800 | ~$0.03 | ~$0.012 | ~$0.006 |
| D. Photo (image ≈ 1,500 tokens) | ~3,000 / 400 | ~$0.025 | ~$0.01 | ~$0.005 |
| E. Coach turn (with cached context) | ~6,000 / 400 | ~$0.02–0.04 | ~$0.01–0.015 | n/a (not recommended) |

### 3.3 Per active user per month (illustrative heavy user)

Assumes 5 AI-parsed meals a day (150/month), 2 new recipes, 4 weekly summaries, 10 photos and
20 coach turns.

| Mix | Approximate cost / user / month |
|---|---|
| All on Opus 5 | ~$3.50–4.00 |
| Parsing and summaries on Sonnet 5, coach on Opus 5 | ~$1.80–2.20 |
| Parsing on Haiku 4.5, summaries and photos on Sonnet 5, coach on Opus 5 | ~$1.20–1.60 |

Most users will be well below this. **Repeat meals cost nothing:** they resolve locally by name
(`findRecipe`) without a model call, which is the single biggest cost lever and also the best UX.

### 3.4 Audio, video and infrastructure

| Item | Price (Sep 2026) | Implication |
|---|---|---|
| Speech to text (e.g. Deepgram, OpenAI transcribe) | ~$0.003–0.008 per minute | Voice logging ≈ $0.10–0.20 per user per month; on-device recognition on native is free |
| Text to speech (ElevenLabs API) | $0.05–0.10 per 1,000 characters | ~$0.10–0.20 per minute of audio. **Generate once per catalogue track**, never per user |
| Video generation (Google Veo 3.1) | ~$0.12–0.40 per second at 1080p | A 60-second clip costs ~$7–24 before retakes. Library content only, with human review |
| Supabase Edge Functions | Pro $25/month includes 2M invocations, then $2 per million | Negligible at our scale |

**Content rule:** AI audio and video are produced as a reviewed library (a fixed cost per item)
and personalised with text, not rendered per user. That keeps costs flat and makes review possible.

## 4. Safety and guardrails

### 4.1 Regulatory positioning

- **Anthropic usage policy:** healthcare, medical guidance, therapy and mental-health treatment are
  "high-risk" use cases. They require a qualified professional to review output before it reaches
  the user, plus AI disclosure. **General wellness guidance (sleep, stress, nutrition, exercise) is
  explicitly excluded.** Tali stays in wellness scope. Any future clinical feature needs a
  professional-in-the-loop design and a fresh legal review.
- **MHRA (UK):** a product's regulatory status follows its **intended purpose** and functionality.
  Wellbeing and lifestyle tools can fall outside device regulation. AI chatbots that contribute to
  diagnosis or treatment can be Class IIa or higher. Copy, onboarding and prompts must never claim
  to diagnose, treat or manage a condition. The MHRA AI-specific framework is expected in 2026; track it.
- **EU AI Act, Article 50** (in force since 2 August 2026, relevant for EU users): disclose AI
  interaction at first contact, and mark AI-generated content. There is a transitional deadline of
  2 December 2026 for marking content from generative systems already on the market.
- **Anthropic usage policy on chatbots:** disclose that users are talking to AI at the start of each
  session. It also prohibits content that promotes disordered eating or compulsive exercise.

### 4.2 Product guardrails

1. **Disclosure:** every AI surface is labelled ("Suggested by AI, check before saving"). Every coach
   session opens with a one-line AI notice. Generated audio and video carry visible and embedded labels.
2. **Scope limits in the system prompt, and enforced in code:** no diagnosis, no medication or
   supplement dosing beyond label guidance, no medical claims. A clearly clinical question gets a
   short, kind redirect to a GP or NHS 111.
3. **Eating-disorder and self-harm safety:**
   - Prompts and output checks block encouragement of restriction below the calorie floor,
     compensatory exercise, or weight-loss pacing beyond the safe band.
   - Risk-language detection (self-harm, purging, extreme restriction) switches to a supportive
     script with UK signposting: Samaritans 116 123, the Beat eating-disorder helpline, NHS 111, and
     999 in an emergency. Verify all numbers at launch.
   - It also offers gentle mode.
   - A validated screener (e.g. IOI-S) in onboarding can route higher-risk users to the gentle
     experience. This needs clinical sign-off before use.
4. **Numbers stay honest:** the model cannot emit calorie or macro values into the log. Only
   `core/` computes them. Photo and quick estimates always show their ± margin. Published photo
   estimates are about 35% off and run low on big portions (`nutrition-accuracy-research.md` §1.3),
   so photo entries start at about ±35% and always get a portion question.
5. **Gentle mode is respected by AI:** in gentle mode, prompts forbid calorie numbers and weight
   talk, and output is checked for digits followed by "kcal".
6. **Confirmation before writes:** AI output is a proposal. Prompt injection in user text can at
   worst change a proposal the user then sees, never the database.
7. **Age:** AI features are 18+ at launch (confirm policy for 16–17). Anthropic's policy has extra
   requirements for minors.
8. **Tone:** neutral and encouraging, gender-neutral, no gym-bro language, and no moralising about
   food. The same copy rules as the app.

### 4.3 AI video and audio (later phases)

- **Every generated exercise video is reviewed** by a qualified coach (and the `fitness-workouts`
  agent) for form and safety before publishing. Nothing is auto-published.
- **No real-person likeness or voice cloning** without written consent and a licence. No deepfakes.
- **Label all synthetic media** (EU AI Act marking; C2PA content credentials where the provider supports them).
- **Accessibility:** captions for every video, and transcripts for every audio track.

## 5. Security and privacy

- **UK GDPR:** food, weight, mood and fitness logs are **health data (special category)**. That means:
  - **explicit, separate consent** for AI processing, which users can withdraw, with a non-AI path
    that still works in full;
  - a **DPIA before phase 1** (the ICO expects one for innovative technology plus special category
    data);
  - an updated privacy notice naming the AI provider and what is sent.
- **Data minimisation:** send the meal text or image only, never name, email, weight history or
  mood. Coaching context is summarised and pseudonymised server-side.
- **Provider terms:**
  - Anthropic API data isn't used for training by default.
  - Request **zero data retention** where available. Some newest models require 30-day retention, so
    check per model.
  - Use `inference_geo` if data residency is required.
  - Put a DPA and a UK international data transfer agreement (IDTA) in place.
- **App stores:** Apple's guidelines (updated June 2026) require apps to **disclose sharing
  personal data with third-party AI and get explicit permission**, with specific rather than generic
  explanations. Design the consent screen to meet that from day one. Google Play has similar
  data-safety disclosures.
- **Keys and abuse:**
  - Keys live only in Edge Function secrets.
  - Per-user rate limits (e.g. 60 parse calls a day) and a hard monthly spend cap per user and
    globally, with alerts.
  - Reject oversized inputs.
- **RLS unchanged:** AI functions run as the calling user (JWT), so existing `auth.uid()` policies
  still apply. No service-role access from AI paths.
- **Logging:** metadata only (task, model, tokens, latency, outcome). No meal text or images in
  logs. Keep short-lived redacted samples only with consent, for evals.
- **Native:** tokens in the Keychain or Android Keystore, TLS pinning for the API host, and
  on-device models where possible.

## 6. Quality gates (before each phase ships)

1. **Eval set per task**, built from real, consented examples: parsing accuracy against weighed
   meals, recipe completeness, photo identification rate, and tone and safety checks for coaching.
2. **Model selection by eval:** start on Opus 5, test Sonnet 5 and Haiku 4.5, and pick the cheapest
   model that meets the bar. Benn signs off.
3. **Red-team pass:** eating-disorder prompts, self-harm, medical questions, prompt injection,
   gentle-mode leaks, and minors.
4. `nutrition-accuracy` (numbers), `mental-performance` (wellbeing framing), `security-data`
   (privacy) and `ship-critic` (go / no-go) all sign off.

## 7. Roadmap

| Phase | Scope | Main risk to retire |
|---|---|---|
| 0 | DPIA, consent screen, privacy notice, Edge Function skeleton with rate limits and spend caps, eval harness | Legal and privacy basics |
| 1 | A: type the meal → parse → confirm. Text only. | Parsing accuracy; cost per call |
| 2 | B: recipe by conversation. C: weekly reflection (batch). | Tone; question quality |
| 3 | D: photo logging with ±. F: voice input (on-device first on native). | Portion error honesty |
| 4 | E: wellbeing coach (wellness scope only). F: spoken audio library. | Mental-health adjacency |
| 5 | G: reviewed AI video library | Safety review, likeness, labelling |

## 8. Decisions for Benn

- Provider: Anthropic for text and vision is assumed. Choose speech and video vendors at phases 3–5.
- Are AI features free (they are the accuracy product) or part of a paid tier?
- Minimum age for AI features (proposal: 18+).
- Whether to commission a regulatory opinion before phase 4 (the coach).
- Budget ceiling per user per month (proposal: hard cap at $2 with graceful fallback).

## Sources

- Anthropic model pricing: Claude API skill reference (cached June 2026).
- Anthropic Usage Policy: https://www.anthropic.com/legal/aup
- ElevenLabs API pricing: https://elevenlabs.io/pricing/api
- Veo 3.1 pricing: https://costgoat.com/pricing/google-veo
- Supabase Edge Functions pricing: https://supabase.com/docs/guides/functions/pricing
- Speech-to-text pricing: https://deepgram.com/learn/best-speech-to-text-apis-2026 · https://diyai.io/ai-tools/speech-to-text/openai-whisper-api-pricing-2026/
- MHRA digital mental health: https://www.digitalhealth.net/2026/01/mhra-issues-guidance-for-people-using-mental-health-apps/ · https://www.mpo-mag.com/exclusives/when-software-becomes-care-mhra-regulation-and-the-rise-of-digital-mental-health/
- EU AI Act Article 50: https://artificialintelligenceact.eu/transparency-rules-article-50/ · https://www.cooley.com/news/insight/2026/2026-08-03-eu-ai-act-transparency-obligations-take-effect-2-august-2026
- Apple App Review Guidelines (AI data sharing): https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai · https://developer.apple.com/news/?id=ey6d8onl
- ICO special category data and DPIAs: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/ · https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/
